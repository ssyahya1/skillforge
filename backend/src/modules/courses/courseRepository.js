import {pool} from "../../database/pool.js";

export const createCourse = async(courseData,adminId) => {
    const result = await pool.query(
        `INSERT INTO public.courses(
        title,
        slug,
        description,
        language,
        difficulty,
        access_tier,
        created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            courseData.title,
            courseData.slug,
            courseData.description,
            courseData.language,
            courseData.difficulty,
            courseData.access_tier ?? "free",
            adminId
        ]
    );

    return result.rows[0];
}
export const getCourses = async(filter) => {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 10;
    const offset = (page - 1) * limit;

    const conditions = ["deleted_at IS NULL"];
    const values = [];

    if (filter.language) {
        conditions.push(`language = $${values.length + 1}`);
        values.push(filter.language);
    }
    if (filter.difficulty) {
        conditions.push(`difficulty = $${values.length + 1}`);
        values.push(filter.difficulty);
    }
    if (filter.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(filter.status);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
        `SELECT * FROM public.courses ${whereClause} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
    );

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM public.courses ${whereClause}`,
        values
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);
    return { courses: result.rows,total: totalCount };
}
export const getCourseById = async(courseId) => {
    const result = await pool.query(
        `SELECT * FROM public.courses WHERE id = $1 And deleted_at IS NULL`,
        [courseId]
    );
    return result.rows[0] ?? null;
};
const editableCourseFields = [
  "title",
  "slug",
  "description",
  "language",
  "difficulty",
  "access_tier",
];
export const updateCourse = async (courseId, courseData) => {
  const fields = Object.keys(courseData).filter((field) =>
    editableCourseFields.includes(field)
  );

  if (fields.length === 0) {
    throw new Error("No valid course fields provided for update.");
  }

  const values = fields.map((field) => courseData[field]);

  const setClauses = fields.map(
    (field, index) => `${field} = $${index + 1}`
  );

  setClauses.push("updated_at = NOW()");

  values.push(courseId);

  const result = await pool.query(
    `UPDATE public.courses
     SET ${setClauses.join(", ")}
     WHERE id = $${values.length}
     AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
};
export const publishCourse = async (courseId) => {
  const result = await pool.query(
    `UPDATE public.courses
     SET status = 'published',
         updated_at = NOW()
     WHERE id = $1
        And deleted_at IS NULL
       AND status IN ('draft', 'archived')
     RETURNING *`,
     [courseId]
  );

  return result.rows[0] ?? null;
};
export const archiveCourse = async (courseId) => {
  const result = await pool.query(
    `UPDATE public.courses
        SET status = 'archived',
            updated_at = NOW()
        WHERE id = $1
          AND deleted_at IS NULL
          AND status = 'published'
        RETURNING *`,
    [courseId]
  );
    return result.rows[0] ?? null;
};
export const softDeleteCourse = async (courseId) => {
  const result = await pool.query(
    `UPDATE public.courses
        SET deleted_at = NOW(),
            updated_at = NOW(),
            purge_after = NOW() + INTERVAL '30 days'
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *`,
    [courseId]
  );
  return result.rows[0] ?? null;
}
export const restoreCourse = async (courseId) => {
  const result = await pool.query(
    `UPDATE public.courses
        SET deleted_at = NULL,
            updated_at = NOW(),
            purge_after = NULL
        WHERE id = $1
          AND deleted_at IS NOT NULL
          AND purge_after > NOW()
        RETURNING *`,
    [courseId]
  );
  return result.rows[0] ?? null;
}

export const purgeExpiredCourses = async (batchSize = 100) => {
  const result = await pool.query(
    `WITH expired_courses AS (
       SELECT id
       FROM public.courses
       WHERE deleted_at IS NOT NULL
         AND purge_after <= NOW()
       ORDER BY purge_after ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     DELETE FROM public.courses AS courses
     USING expired_courses
     WHERE courses.id = expired_courses.id
     RETURNING courses.id`,
    [batchSize]
  );

  return result.rows.map((row) => row.id);
};
