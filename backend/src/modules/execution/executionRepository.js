import { pool } from "../../database/pool.js";

export async function findSubmissionById(submissionId) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        exercise_id,
        language_id,
        source_code,
        language,
        runtime_version,
        execution_mode,
        entry_point,
        status,
        created_at,
        updated_at
      FROM public.submissions
      WHERE id = $1
      LIMIT 1
    `,
    [submissionId],
  );

  return result.rows[0] ?? null;
}

export async function findQueuedSubmission(submissionId) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        exercise_id,
        language_id,
        source_code,
        language,
        runtime_version,
        execution_mode,
        entry_point,
        status
      FROM public.submissions
      WHERE id = $1
        AND status = 'queued'
      LIMIT 1
    `,
    [submissionId],
  );

  return result.rows[0] ?? null;
}

export async function claimSubmission(submissionId) {
  const result = await pool.query(
    `
      UPDATE public.submissions
      SET
        status = 'processing',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'queued'
      RETURNING id, user_id, exercise_id, language_id, status
    `,
    [submissionId],
  );

  return result.rows[0] ?? null;
}

export async function getExecutionTestCases(exerciseId) {
  const result = await pool.query(
    `
      SELECT
        id,
        exercise_id,
        input_data,
        expected_output,
        visibility,
        display_order
      FROM public.exercise_test_cases
      WHERE exercise_id = $1
      ORDER BY display_order ASC, id ASC
    `,
    [exerciseId],
  );

  return result.rows;
}

export async function updateSubmissionStatus(
  submissionId,
  status,
  errorMessage = null,
) {
  const result = await pool.query(
    `
      UPDATE public.submissions
      SET
        status = $2,
        error_message = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, error_message, updated_at
    `,
    [submissionId, status, errorMessage],
  );

  return result.rows[0] ?? null;
}

export async function saveSubmissionExecution(
  submissionId,
  { status, executionTimeMs, memoryUsedKb, errorMessage = null },
) {
  const result = await pool.query(
    `
      UPDATE public.submissions
      SET
        status = $2,
        execution_time_ms = $3,
        memory_used_kb = $4,
        error_message = $5,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        status,
        execution_time_ms,
        memory_used_kb,
        error_message,
        updated_at
    `,
    [submissionId, status, executionTimeMs, memoryUsedKb, errorMessage],
  );

  return result.rows[0] ?? null;
}

export async function saveTestResults(submissionId, testResults) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        DELETE FROM public.submission_test_results
        WHERE submission_id = $1
      `,
      [submissionId],
    );

    if (testResults.length > 0) {
      const values = [];
      const placeholders = [];

      testResults.forEach((test, index) => {
        const offset = index * 7;

        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3},
            $${offset + 4}, $${offset + 5}, $${offset + 6},
            $${offset + 7})`,
        );

        values.push(
          submissionId,
          test.testCaseId ?? null,
          test.displayOrder,
          test.status,
          test.executionTimeMs ?? null,
          test.actualOutput == null ? null : JSON.stringify(test.actualOutput),
          test.errorMessage ?? null,
        );
      });

      await client.query(
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
          VALUES ${placeholders.join(", ")}
        `,
        values,
      );
    }

    await client.query("COMMIT");

    return testResults.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSubmissionTestResults(submissionId) {
  const result = await pool.query(
    `
      SELECT
        id,
        submission_id,
        test_case_id,
        display_order,
        status,
        execution_time_ms,
        actual_output,
        error_message,
        created_at
      FROM public.submission_test_results
      WHERE submission_id = $1
      ORDER BY display_order ASC
    `,
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
      LEFT JOIN public.exercise_test_cases AS test_case
        ON test_case.id = result.test_case_id
      WHERE result.submission_id = $1
        AND (
          test_case.visibility = 'public'
          OR test_case.id IS NULL
        )
      ORDER BY result.display_order ASC
    `,
    [submissionId],
  );

  return result.rows;
}
