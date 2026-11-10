import { pool } from "../../database/pool.js";

export const createEnrollment = async (userId, courseId) => {
  const query = `
        INSERT INTO course_enrollments (user_id, course_id)
        VALUES ($1, $2)
        RETURNING *;`;
  return await pool.query(query, [userId, courseId]);
};
export const getEnrollmentByCourseIdAndUser = async (courseId, userId) => {
  const query = `
        SELECT * FROM course_enrollments
        WHERE course_id = $1 AND user_id = $2
        LIMIT 1;`;
  return await pool.query(query, [courseId, userId]);
};
export const reactivateEnrollment = async (enrollmentId, userId) => {
  const query = `
        UPDATE course_enrollments
        SET status = 'active'
        WHERE id = $1
        AND user_id = $2
        AND status = 'cancelled'
        RETURNING *;`;
  return await pool.query(query, [enrollmentId, userId]);
};
export const updateEnrollmentActivity = async (enrollmentId, userId) => {
  const query = `
        UPDATE course_enrollments
        SET last_accessed_at = NOW()
        WHERE id = $1
        AND user_id = $2
        AND status = 'active'
        RETURNING *;`;
  return await pool.query(query, [enrollmentId, userId]);
};
export const getEnrollmentsByUserId = async (userId) => {
  const query = `
        SELECT * FROM course_enrollments
        WHERE user_id = $1
        ORDER BY enrolled_at DESC;`;
  return await pool.query(query, [userId]);
};
export const getEnrollmentWithCourseDetails = async (enrollmentId, userId) => {
  const query = `
        SELECT
            ce.*,
            c.title,
            c.description,
            c.language,
            c.difficulty,
            c.access_tier
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.id = $1
        AND ce.user_id = $2;
    `;

  return await pool.query(query, [enrollmentId, userId]);
};
export const updateEnrollmentStatus = async (
  enrollmentId,
  userId,
  status,
  expectedStatus = null,
) => {
  const query = `
        UPDATE course_enrollments
        SET
            status = $3,
            completed_at = CASE
                WHEN $3 = 'completed' THEN NOW()
                ELSE NULL
            END
        WHERE id = $1
        AND user_id = $2
        AND ($4::text IS NULL OR status = $4)
        RETURNING *;
    `;

  return await pool.query(query, [
    enrollmentId,
    userId,
    status,
    expectedStatus,
  ]);
};
