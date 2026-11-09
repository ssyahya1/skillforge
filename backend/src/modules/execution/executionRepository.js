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

export async function acquireSubmissionExecutionLock(submissionId) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
        SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired
      `,
      [submissionId],
    );

    if (!result.rows[0]?.acquired) {
      client.release();
      return null;
    }

    return async () => {
      try {
        await client.query(
          `
            SELECT pg_advisory_unlock(hashtextextended($1, 0))
          `,
          [submissionId],
        );
      } finally {
        client.release();
      }
    };
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function claimSubmission(submissionId) {
  const result = await pool.query(
    `
      UPDATE public.submissions
      SET
        status = 'processing',
        updated_at = NOW()
      WHERE id = $1
        AND status IN ('queued', 'processing')
      RETURNING id, user_id, exercise_id, language_id, status
    `,
    [submissionId],
  );

  return result.rows[0] ?? null;
}

export async function markSubmissionExecutionFailure(
  submissionId,
  errorMessage,
  terminal,
) {
  const result = await pool.query(
    `
      UPDATE public.submissions
      SET
        status = $2,
        error_message = $3,
        updated_at = NOW()
      WHERE id = $1
        AND status = 'processing'
      RETURNING id, status, error_message, updated_at
    `,
    [submissionId, terminal ? "internal_error" : "queued", errorMessage],
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

const COUNTABLE_ATTEMPT_STATUSES = [
  "accepted",
  "wrong_answer",
  "runtime_error",
  "compilation_error",
  "time_limit_exceeded",
  "memory_limit_exceeded",
];

export async function finalizeSubmissionWithProgress({
  submissionId,
  userId,
  exerciseId,
  overallStatus,
  executionTimeMs,
  memoryUsedKb,
  errorMessage = null,
  testResults = [],
}) {
  if (!Array.isArray(testResults)) {
    throw new TypeError("Execution test results must be an array.");
  }

  if (
    overallStatus === "accepted" &&
    (testResults.length === 0 ||
      testResults.some((test) => test.status !== "passed"))
  ) {
    throw new Error("Accepted submissions require all test cases to pass.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
        SELECT id, user_id, exercise_id, status
        FROM public.submissions
        WHERE id = $1
        FOR UPDATE
      `,
      [submissionId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    if (current.user_id !== userId || current.exercise_id !== exerciseId) {
      throw new Error("Submission identity does not match the execution job.");
    }

    if (current.status === "cancelled" || current.status !== "processing") {
      await client.query("COMMIT");
      return current;
    }

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

    const submissionResult = await client.query(
      `
        UPDATE public.submissions
        SET
          status = $2,
          execution_time_ms = $3,
          memory_used_kb = $4,
          error_message = $5,
          updated_at = NOW()
        WHERE id = $1
          AND status = 'processing'
        RETURNING
          id,
          user_id,
          exercise_id,
          status,
          execution_time_ms,
          memory_used_kb,
          error_message,
          updated_at
      `,
      [submissionId, overallStatus, executionTimeMs, memoryUsedKb, errorMessage],
    );

    const submission = submissionResult.rows[0];
    if (!submission) {
      throw new Error(`Submission ${submissionId} is no longer processing.`);
    }

    if (COUNTABLE_ATTEMPT_STATUSES.includes(overallStatus)) {
      const enrollmentQuery = `
        SELECT
          ce.id AS enrollment_id,
          e.lesson_id
        FROM public.course_enrollments ce
        JOIN public.lessons l ON l.course_id = ce.course_id
        JOIN public.exercises e ON e.lesson_id = l.id
        WHERE ce.user_id = $1
          AND ce.status = 'active'
          AND e.id = $2
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE OF ce;
      `;

      const enrollmentResult = await client.query(enrollmentQuery, [
        userId,
        exerciseId,
      ]);

      if (enrollmentResult.rows.length > 0) {
        const enrollment = enrollmentResult.rows[0];
        const enrollmentId = enrollment.enrollment_id;
        const lessonId = enrollment.lesson_id;

        const attemptQuery = `
          INSERT INTO public.exercise_progress_attempts (
            submission_id,
            enrollment_id,
            exercise_id,
            final_status
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (submission_id) DO NOTHING
          RETURNING submission_id;
        `;

        const attemptResult = await client.query(attemptQuery, [
          submissionId,
          enrollmentId,
          exerciseId,
          overallStatus,
        ]);

        if (attemptResult.rows.length > 0) {
          const isAccepted = overallStatus === "accepted";
          const progressQuery = `
            INSERT INTO public.exercise_progress (
              enrollment_id,
              exercise_id,
              status,
              attempts_count,
              completed_at,
              last_attempt_at
            )
            VALUES (
              $1,
              $2,
              $3,
              CASE WHEN $5 THEN 1 ELSE 0 END,
              CASE WHEN $4 THEN NOW() ELSE NULL END,
              NOW()
            )
            ON CONFLICT (enrollment_id, exercise_id)
            DO UPDATE SET
              status = CASE
                WHEN exercise_progress.status = 'completed' THEN 'completed'
                WHEN $4 THEN 'completed'
                ELSE 'in_progress'
              END,
              attempts_count = CASE
                WHEN $5 THEN exercise_progress.attempts_count + 1
                ELSE exercise_progress.attempts_count
              END,
              completed_at = CASE
                WHEN exercise_progress.completed_at IS NOT NULL THEN exercise_progress.completed_at
                WHEN $4 THEN NOW()
                ELSE NULL
              END,
              last_attempt_at = NOW()
            RETURNING *;
          `;

          await client.query(progressQuery, [
            enrollmentId,
            exerciseId,
            isAccepted ? "completed" : "in_progress",
            isAccepted,
            true,
          ]);

          if (isAccepted) {
            const completeLessonQuery = `
              UPDATE public.lesson_progress lp
              SET
                status = 'completed',
                completed_at = COALESCE(lp.completed_at, NOW()),
                last_accessed_at = NOW()
              WHERE lp.enrollment_id = $1
                AND lp.lesson_id = $2
                AND lp.content_completed_at IS NOT NULL
                AND lp.completed_at IS NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.exercises e
                  LEFT JOIN public.exercise_progress ep
                    ON ep.exercise_id = e.id
                    AND ep.enrollment_id = lp.enrollment_id
                  WHERE e.lesson_id = lp.lesson_id
                    AND e.status = 'published'
                    AND (ep.id IS NULL OR ep.status <> 'completed')
                )
              RETURNING *;
            `;

            await client.query(completeLessonQuery, [enrollmentId, lessonId]);

            const completeEnrollmentQuery = `
              UPDATE public.course_enrollments ce
              SET
                status = 'completed',
                completed_at = COALESCE(ce.completed_at, NOW()),
                updated_at = NOW()
              WHERE ce.id = $1
                AND ce.status = 'active'
                AND EXISTS (
                  SELECT 1
                  FROM public.lessons l
                  WHERE l.course_id = ce.course_id
                    AND l.status = 'published'
                    AND l.deleted_at IS NULL
                )
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.lessons l
                  LEFT JOIN public.lesson_progress lp
                    ON lp.lesson_id = l.id
                    AND lp.enrollment_id = ce.id
                  WHERE l.course_id = ce.course_id
                    AND l.status = 'published'
                    AND l.deleted_at IS NULL
                    AND (lp.id IS NULL OR lp.status <> 'completed')
                )
              RETURNING *;
            `;

            await client.query(completeEnrollmentQuery, [enrollmentId]);
          }
        }
      }
    }

    await client.query("COMMIT");
    return submission;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Submission finalization failed and rollback could not be completed",
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
