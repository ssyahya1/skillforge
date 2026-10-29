import {pool} from "../../database/pool.js";
const lessonColumns = `
  id,
  course_id,
  title,
  slug,
  content,
  video_url,
  code_examples,
  position,
  status,
  created_at,
  updated_at,
  deleted_at,
  purge_after
`;

export async function findCourseById(courseId) {
  const result = await pool.query(
    `
      SELECT id, status, deleted_at
      FROM public.courses
      WHERE id = $1
      LIMIT 1
    `,
    [courseId]
  );

  return result.rows[0] ?? null;
}

export async function createLesson(courseId, lessonData) {
  const {
    title,
    slug,
    content = "",
    video_url = null,
    code_examples = [],
    position,
  } = lessonData;

  const result = await pool.query(
    `
      INSERT INTO public.lessons (
        course_id,
        title,
        slug,
        content,
        video_url,
        code_examples,
        position
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING ${lessonColumns}
    `,
    [
      courseId,
      title,
      slug,
      content,
      video_url,
      JSON.stringify(code_examples),
      position,
    ]
  );

  return result.rows[0];
}

export async function listLessonsByCourse(
  courseId,
  { page = 1, limit = 20, status } = {}
) {
  const offset = (page - 1) * limit;
  const values = [courseId];
  let statusFilter = "";

  if (status) {
    values.push(status);
    statusFilter = `AND status = $${values.length}`;
  }

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.lessons
      WHERE course_id = $1
      AND deleted_at IS NULL
      ${statusFilter}
    `,
    [...values]
  );

  const total = countResult.rows[0].total;

  values.push(limit, offset);

  const result = await pool.query(
    `
      SELECT ${lessonColumns}
      FROM public.lessons
      WHERE course_id = $1
      AND deleted_at IS NULL
      ${statusFilter}
      ORDER BY position ASC, created_at ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );

  return {
    lessons: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function findLessonById(courseId, lessonId) {
  const result = await pool.query(
    `
      SELECT ${lessonColumns}
      FROM public.lessons
      WHERE course_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [courseId, lessonId]
  );

  return result.rows[0] ?? null;
}

export async function updateLesson(courseId, lessonId, lessonData) {
  const allowedFields = [
    "title",
    "slug",
    "content",
    "video_url",
    "code_examples",
    "position",
  ];

  const entries = allowedFields
    .filter((field) => Object.hasOwn(lessonData, field))
    .map((field) => [field, lessonData[field]]);

  if (entries.length === 0) {
    return null;
  }

  const values = [courseId, lessonId];
  const assignments = entries.map(([field, value]) => {
    values.push(
      field === "code_examples" ? JSON.stringify(value) : value
    );

    const placeholder = `$${values.length}`;

    return field === "code_examples"
      ? `${field} = ${placeholder}::jsonb`
      : `${field} = ${placeholder}`;
  });

  assignments.push("updated_at = NOW()");

  const result = await pool.query(
    `
      UPDATE public.lessons
      SET ${assignments.join(", ")}
      WHERE course_id = $1
        AND id = $2
        AND deleted_at IS NULL
      RETURNING ${lessonColumns}
    `,
    values
  );

  return result.rows[0] ?? null;
}

export async function updateLessonStatus(courseId, lessonId, status) {
  const result = await pool.query(
    `
      UPDATE public.lessons
      SET status = $3,
          updated_at = NOW()
      WHERE course_id = $1
        AND id = $2
        AND deleted_at IS NULL
      RETURNING ${lessonColumns}
    `,
    [courseId, lessonId, status]
  );

  return result.rows[0] ?? null;
}
export async function softDeleteLesson(courseId,lessonId) {
  const result = await pool.query(
    `UPDATE public.lessons
        SET deleted_at = NOW(),
            updated_at = NOW(),
            purge_after = NOW() + INTERVAL '30 days'
        WHERE course_id = $1
        AND id = $2
          AND deleted_at IS NULL
        RETURNING ${lessonColumns}`,
    [courseId,lessonId]
  );
  return result.rows[0] ?? null;
}
export async function  restoreLesson(courseId,lessonId){
  const result = await pool.query(
    `UPDATE public.lessons
        SET deleted_at = NULL,
            updated_at = NOW(),
            purge_after = NULL
        WHERE course_id = $1
        AND id = $2
          AND deleted_at IS NOT NULL
          AND purge_after > NOW()
        RETURNING ${lessonColumns}`,
    [courseId,lessonId]
  );
  return result.rows[0] ?? null;
}
export async function purgeExpiredLessons(batchSize = 100) {
  const result = await pool.query(
    `
      WITH expired_lessons AS (
        SELECT id
        FROM public.lessons
        WHERE deleted_at IS NOT NULL
          AND purge_after <= NOW()
        ORDER BY purge_after ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM public.lessons AS lessons
      USING expired_lessons
      WHERE lessons.id = expired_lessons.id
      RETURNING lessons.id
    `,
    [batchSize]
  );

  return result.rows.map((row) => row.id);
}