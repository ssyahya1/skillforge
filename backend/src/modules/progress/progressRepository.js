import { pool } from "../../database/pool.js";

export async function getEnrollmentProgress(enrollmentId, userId) {
    const query = `
        SELECT
            ce.id AS enrollment_id,
            ce.status AS enrollment_status,
            c.id AS course_id,
            c.title AS course_title,
            COUNT(DISTINCT l.id) FILTER (
                WHERE l.status = 'published'
                  AND l.deleted_at IS NULL
            ) AS total_lessons,
            COUNT(DISTINCT lp.lesson_id) FILTER (
                WHERE lp.status = 'completed'
                  AND l.status = 'published'
                  AND l.deleted_at IS NULL
            ) AS completed_lessons
        FROM course_enrollments ce
        JOIN courses c ON c.id = ce.course_id
        LEFT JOIN lessons l ON l.course_id = c.id
        LEFT JOIN lesson_progress lp
            ON lp.enrollment_id = ce.id
            AND lp.lesson_id = l.id
        WHERE ce.id = $1
          AND ce.user_id = $2
        GROUP BY ce.id, c.id;
    `;

    return pool.query(query, [enrollmentId, userId]);
}

export async function getEnrollmentLessonProgress(enrollmentId) {
    const query = `
        SELECT
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.slug AS lesson_slug,
            l.position,
            COALESCE(lp.status, 'not_started') AS progress_status,
            lp.started_at,
            lp.content_completed_at,
            lp.completed_at,
            lp.last_accessed_at
        FROM lessons l
        LEFT JOIN lesson_progress lp
            ON lp.lesson_id = l.id
            AND lp.enrollment_id = $1
        WHERE l.course_id = (
            SELECT course_id
            FROM course_enrollments
            WHERE id = $1
        )
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        ORDER BY l.position ASC, l.created_at ASC;
    `;

    return pool.query(query, [enrollmentId]);
}

export async function getLessonExerciseProgress(enrollmentId, lessonId) {
    const query = `
        SELECT
            e.id AS exercise_id,
            e.title AS exercise_title,
            e.slug AS exercise_slug,
            e.position,
            e.difficulty,
            COALESCE(ep.status, 'not_started') AS progress_status,
            COALESCE(ep.attempts_count, 0) AS attempts_count,
            ep.completed_at,
            ep.last_attempt_at
        FROM exercises e
        LEFT JOIN exercise_progress ep
            ON ep.exercise_id = e.id
            AND ep.enrollment_id = $1
        WHERE e.lesson_id = $2
          AND e.status = 'published'
        ORDER BY e.position ASC, e.created_at ASC;
    `;

    return pool.query(query, [enrollmentId, lessonId]);
}

export async function getLessonProgress(enrollmentId, lessonId) {
    const query = `
        SELECT *
        FROM lesson_progress
        WHERE enrollment_id = $1
          AND lesson_id = $2
        LIMIT 1;
    `;

    return pool.query(query, [enrollmentId, lessonId]);
}

export async function startLesson(client, enrollmentId, lessonId) {
    const query = `
        INSERT INTO lesson_progress (
            enrollment_id,
            lesson_id,
            status,
            started_at,
            last_accessed_at
        )
        VALUES ($1, $2, 'in_progress', NOW(), NOW())
        ON CONFLICT (enrollment_id, lesson_id)
        DO UPDATE SET
            last_accessed_at = NOW(),
            started_at = COALESCE(
                lesson_progress.started_at,
                NOW()
            )
        RETURNING *;
    `;

    return client.query(query, [enrollmentId, lessonId]);
}

export async function completeLessonContent(
    client,
    enrollmentId,
    lessonId
) {
    const query = `
        UPDATE lesson_progress
        SET
            content_completed_at = COALESCE(
                content_completed_at,
                NOW()
            ),
            last_accessed_at = NOW(),
            status = 'in_progress'
        WHERE enrollment_id = $1
          AND lesson_id = $2
          AND completed_at IS NULL
        RETURNING *;
    `;

    return client.query(query, [enrollmentId, lessonId]);
}

export async function evaluateLessonAndCourseCompletion(
    client,
    enrollmentId,
    lessonId,
    courseId
) {
    const lessonResult = await completeLesson(client, enrollmentId, lessonId);
    let enrollmentResult = null;
    if (lessonResult.rows.length > 0) {
        enrollmentResult = await completeEnrollment(client, enrollmentId);
    }
    return {
        lessonCompleted: lessonResult.rows.length > 0,
        enrollmentCompleted: Boolean(enrollmentResult?.rows?.length > 0),
    };
}

export async function completeLesson(
    client,
    enrollmentId,
    lessonId
) {
    const query = `
        UPDATE lesson_progress lp
        SET
            status = 'completed',
            completed_at = COALESCE(lp.completed_at, NOW()),
            last_accessed_at = NOW()
        WHERE lp.enrollment_id = $1
          AND lp.lesson_id = $2
          AND lp.content_completed_at IS NOT NULL
          AND lp.completed_at IS NULL
          AND EXISTS (
              SELECT 1
              FROM course_enrollments ce
              JOIN lessons l ON l.course_id = ce.course_id
              WHERE ce.id = lp.enrollment_id
                AND ce.status = 'active'
                AND l.id = lp.lesson_id
                AND l.status = 'published'
                AND l.deleted_at IS NULL
          )
          AND NOT EXISTS (
              SELECT 1
              FROM exercises e
              LEFT JOIN exercise_progress ep
                  ON ep.exercise_id = e.id
                  AND ep.enrollment_id = lp.enrollment_id
              WHERE e.lesson_id = lp.lesson_id
                AND e.status = 'published'
                AND (
                    ep.id IS NULL
                    OR ep.status <> 'completed'
                )
          )
        RETURNING *;
    `;

    return client.query(query, [enrollmentId, lessonId]);
}

export async function completeEnrollment(client, enrollmentId) {
    const query = `
        UPDATE course_enrollments ce
        SET
            status = 'completed',
            completed_at = COALESCE(ce.completed_at, NOW()),
            updated_at = NOW()
        WHERE ce.id = $1
          AND ce.status = 'active'
          AND EXISTS (
              SELECT 1
              FROM lessons l
              WHERE l.course_id = ce.course_id
                AND l.status = 'published'
                AND l.deleted_at IS NULL
          )
          AND NOT EXISTS (
              SELECT 1
              FROM lessons l
              LEFT JOIN lesson_progress lp
                  ON lp.lesson_id = l.id
                  AND lp.enrollment_id = ce.id
              WHERE l.course_id = ce.course_id
                AND l.status = 'published'
                AND l.deleted_at IS NULL
                AND (
                    lp.id IS NULL
                    OR lp.status <> 'completed'
                )
          )
        RETURNING *;
    `;

    return client.query(query, [enrollmentId]);
}

export async function lockEnrollment(client, enrollmentId, userId) {
    const query = `
        SELECT *
        FROM course_enrollments
        WHERE id = $1
          AND user_id = $2
          AND status = 'active'
        FOR UPDATE;
    `;

    return client.query(query, [enrollmentId, userId]);
}

export async function getEnrolledPublishedLesson(
    enrollmentId,
    lessonId,
    userId
) {
    const query = `
        SELECT
            l.*,
            ce.id AS enrollment_id
        FROM lessons l
        JOIN course_enrollments ce
            ON ce.course_id = l.course_id
        WHERE ce.id = $1
          AND ce.user_id = $3
          AND ce.status = 'active'
          AND l.id = $2
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
    `;

    return pool.query(query, [enrollmentId, lessonId, userId]);
}

export async function getEnrolledPublishedExercise(
    enrollmentId,
    exerciseId,
    userId
) {
    const query = `
        SELECT
            e.*,
            l.course_id,
            ce.id AS enrollment_id
        FROM exercises e
        JOIN lessons l ON l.id = e.lesson_id
        JOIN course_enrollments ce
            ON ce.course_id = l.course_id
        WHERE ce.id = $1
          AND ce.user_id = $3
          AND ce.status = 'active'
          AND e.id = $2
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
    `;

    return pool.query(query, [enrollmentId, exerciseId, userId]);
}

export async function getPreviousPublishedLesson(
    enrollmentId,
    lessonId
) {
    const query = `
        SELECT
            previous_lesson.id,
            previous_lesson.position,
            lp.status AS progress_status
        FROM course_enrollments ce
        JOIN lessons current_lesson
            ON current_lesson.course_id = ce.course_id
        JOIN lessons previous_lesson
            ON previous_lesson.course_id = ce.course_id
        LEFT JOIN lesson_progress lp
            ON lp.lesson_id = previous_lesson.id
            AND lp.enrollment_id = ce.id
        WHERE ce.id = $1
          AND current_lesson.id = $2
          AND current_lesson.status = 'published'
          AND current_lesson.deleted_at IS NULL
          AND previous_lesson.status = 'published'
          AND previous_lesson.deleted_at IS NULL
          AND (
              previous_lesson.position < current_lesson.position
              OR (
                  previous_lesson.position = current_lesson.position
                  AND previous_lesson.created_at < current_lesson.created_at
              )
          )
        ORDER BY
            previous_lesson.position DESC,
            previous_lesson.created_at DESC
        LIMIT 1;
    `;

    return pool.query(query, [enrollmentId, lessonId]);
}

export async function getExerciseProgress(
    enrollmentId,
    exerciseId
) {
    const query = `
        SELECT *
        FROM exercise_progress
        WHERE enrollment_id = $1
          AND exercise_id = $2
        LIMIT 1;
    `;

    return pool.query(query, [enrollmentId, exerciseId]);
}

export async function getActiveEnrollmentForExercise(
    userId,
    exerciseId
) {
    const query = `
        SELECT
            ce.*,
            e.id AS exercise_id,
            e.lesson_id,
            l.course_id
        FROM course_enrollments ce
        JOIN lessons l ON l.course_id = ce.course_id
        JOIN exercises e ON e.lesson_id = l.id
        WHERE ce.user_id = $1
          AND ce.status = 'active'
          AND e.id = $2
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
    `;

    return pool.query(query, [userId, exerciseId]);
}