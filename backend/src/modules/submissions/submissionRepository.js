import { pool } from "../../database/pool.js";

const submissionColumn = `
  id,
  user_id,
  exercise_id,
  language_id,
  idempotency_key,
  language,
  runtime_version,
  execution_mode,
  entry_point,
  status,
  execution_time_ms,
  memory_used_kb,
  error_message,
  created_at,
  updated_at
`;
const submissionTestResultColumn = `
  id,
  submission_id,
  test_case_id,
  display_order,
  status,
  execution_time_ms,
  actual_output,
  error_message,
  created_at
`;
const submissionFieldMap = {
  status: "status",
  executionTimeMs: "execution_time_ms",
  memoryUsedKb: "memory_used_kb",
  errorMessage: "error_message",
};
export async function createSubmission(userId, submissionData) {
  const {
    exerciseId,
    languageId,
    idempotencyKey,
    sourceCode,
    language,
    runtimeVersion,
    executionMode,
    entryPoint,
  } = submissionData;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const enrollment = await client.query(
      `
        SELECT ce.id
        FROM public.course_enrollments ce
        JOIN public.lessons l
          ON l.course_id = ce.course_id
        JOIN public.exercises e
          ON e.lesson_id = l.id
        JOIN public.lesson_progress lp
          ON lp.enrollment_id = ce.id
          AND lp.lesson_id = l.id
        WHERE ce.user_id = $1
          AND ce.status = 'active'
          AND e.id = $2
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND lp.content_completed_at IS NOT NULL
        FOR UPDATE OF ce
      `,
      [userId, exerciseId],
    );

    if (enrollment.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const result = await client.query(
      `
      INSERT INTO public.submissions (
        user_id,
        exercise_id,
        language_id,
        idempotency_key,
        source_code,
        language,
        runtime_version,
        execution_mode,
        entry_point
    )
        
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${submissionColumn}`,
      [
        userId,
        exerciseId,
        languageId,
        idempotencyKey ?? null,
        sourceCode,
        language,
        runtimeVersion,
        executionMode,
        entryPoint ?? null,
      ],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Submission creation failed and rollback could not be completed",
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
export async function findSubmissionById(submissionId) {
  const result = await pool.query(
    `SELECT ${submissionColumn} FROM public.submissions WHERE id = $1`,
    [submissionId],
  );
  return result.rows[0] ?? null;
}
export async function getUserSubmissions(
  userId,
  exerciseId,
  page = 1,
  limit = 10,
) {
  const offset = (page - 1) * limit;
  const result = await pool.query(
    `SELECT ${submissionColumn} FROM public.submissions 
    WHERE user_id = $1
     AND exercise_id = $2
      ORDER BY created_at DESC,id DESC
      LIMIT $3 OFFSET $4`,
    [userId, exerciseId, limit, offset],
  );

  return result.rows;
}
export async function countUserSubmissions(userId, exerciseId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS total FROM public.submissions 
    WHERE user_id = $1 
    AND exercise_id = $2`,
    [userId, exerciseId],
  );
  return parseInt(result.rows[0].total, 10);
}
export async function updateSubmission(submissionId, updateData) {
  const fields = Object.keys(updateData).filter((field) =>
    Object.hasOwn(submissionFieldMap, field),
  );

  if (fields.length === 0) {
    throw new Error("No valid fields provided for update.");
  }

  const setClause = fields
    .map((field, index) => `${submissionFieldMap[field]} = $${index + 2}`)
    .join(", ");

  const values = fields.map((field) => updateData[field]);

  const result = await pool.query(
    `
      UPDATE public.submissions
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING ${submissionColumn}
    `,
    [submissionId, ...values],
  );

  return result.rows[0] ?? null;
}
export async function createSubmissionTestResult(submissionId, testResult) {
  const {
    testCaseId,
    displayOrder,
    status,
    executionTimeMs,
    actualOutput,
    errorMessage,
  } = testResult;

  const result = await pool.query(
    `
      INSERT INTO public.submission_test_results (
        submission_id,
        test_case_id,
        display_order,
        status,
        execution_time_ms,
        actual_output,
        error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${submissionTestResultColumn}`,
    [
      submissionId,
      testCaseId,
      displayOrder,
      status,
      executionTimeMs ?? null,
      actualOutput ?? null,
      errorMessage ?? null,
    ],
  );

  return result.rows[0];
}
export async function getSubmissionTestResults(submissionId) {
  const result = await pool.query(
    `SELECT ${submissionTestResultColumn} FROM public.submission_test_results WHERE submission_id = $1 ORDER BY display_order ASC`,
    [submissionId],
  );
  return result.rows;
}
export async function getPublicSubmissionTestResults(submissionId) {
  const result = await pool.query(
    `
      SELECT
        result.id,
        result.submission_id,
        result.test_case_id,
        result.display_order,
        result.status,
        result.execution_time_ms,
        result.actual_output,
        result.error_message,
        result.created_at
      FROM public.submission_test_results AS result
      JOIN public.exercise_test_cases AS test_case
        ON test_case.id = result.test_case_id
      WHERE result.submission_id = $1
        AND test_case.visibility = 'public'
      ORDER BY result.display_order ASC
    `,
    [submissionId],
  );

  return result.rows;
}
export async function countUserFailedSubmissions(
  userId,
  exerciseId,
  languageId,
) {
  const result = await pool.query(
    `SELECT COUNT(*) AS total FROM public.submissions
     WHERE user_id = $1
      AND exercise_id = $2
       AND language_id = $3
        AND status IN (
  'wrong_answer',
  'runtime_error',
  'compilation_error',
  'time_limit_exceeded',
  'memory_limit_exceeded'
)`,
    [userId, exerciseId, languageId],
  );
  return parseInt(result.rows[0].total, 10);
};
export async function createSolutionReveal(userId, exerciseId, languageId) {
    const result = await pool.query(
        `INSERT INTO public.solution_reveals (user_id, exercise_id, language_id) 
        VALUES ($1, $2, $3) RETURNING *`,
        [userId, exerciseId, languageId],
    );
    return result.rows[0];
};
export async function hasUserRevealedSolution(userId, exerciseId, languageId) {
    const result = await pool.query(
        `SELECT EXISTS(
            SELECT 1 FROM public.solution_reveals 
            WHERE user_id = $1 AND exercise_id = $2 AND language_id = $3
        ) AS revealed`,
        [userId, exerciseId, languageId],
    );
    return result.rows[0].revealed;
};
export async function findSubmissionByIdempotencyKey(
  userId,
  idempotencyKey,
) {
  const result = await pool.query(
    `
      SELECT ${submissionColumn}
      FROM public.submissions
      WHERE user_id = $1
        AND idempotency_key = $2
      LIMIT 1
    `,
    [userId, idempotencyKey],
  );

  return result.rows[0] ?? null;
};
export async function findSubmissionDetailsById(userId, submissionId) {
  const result = await pool.query(
    `
      SELECT ${submissionColumn}, source_code
      FROM public.submissions
      WHERE id = $2 AND user_id = $1
      LIMIT 1
    `,
    [userId, submissionId],
  );

  return result.rows[0] ?? null;
}
