import { pool } from "../../database/pool.js";

const courseColumns = `
    c.id,
    c.title,
    c.slug,
    c.description,
    c.language,
    c.difficulty,
    c.status,
    c.access_tier,
    c.created_at,
    c.updated_at
`;

const lessonColumns = `
    l.id,
    l.course_id,
    l.title,
    l.slug,
    l.content,
    l.video_url,
    l.code_examples,
    l.position,
    l.status,
    l.created_at,
    l.updated_at
`;

const exerciseColumns = `
    e.id,
    e.lesson_id,
    e.title,
    e.slug,
    e.instructions,
    e.difficulty,
    e.position,
    e.status,
    e.created_at,
    e.updated_at
`;

const languageColumns = `
    el.id,
    el.exercise_id,
    el.language,
    el.runtime_version,
    el.execution_mode,
    el.starter_code,
    el.entry_point
`;

const visibleTestCaseColumns = `
    tc.id,
    tc.exercise_id,
    tc.input_data,
    tc.expected_output,
    tc.display_order
`;

export const getPublishedCourses = async ({
  page = 1,
  limit = 10,
  language,
  difficulty,
}) => {
  const values = [];
  const conditions = ["c.status = 'published'", "c.deleted_at IS NULL"];

  if (language) {
    values.push(language);
    conditions.push(`c.language = $${values.length}`);
  }

  if (difficulty) {
    values.push(difficulty);
    conditions.push(`c.difficulty = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const dataQuery = `
        SELECT ${courseColumns}
        FROM public.courses c
        WHERE ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${dataValues.length - 1}
        OFFSET $${dataValues.length}
    `;

  const countQuery = `
        SELECT COUNT(*) AS total
        FROM public.courses c
        WHERE ${whereClause}
    `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataValues),
    pool.query(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0].total),
  };
};

export const getPublishedCourseById = async (courseId) => {
  const query = `
        SELECT ${courseColumns}
        FROM public.courses c
        WHERE c.id = $1
          AND c.status = 'published'
          AND c.deleted_at IS NULL
        LIMIT 1
    `;

  const result = await pool.query(query, [courseId]);

  return result.rows[0] || null;
};

export const getPublishedLessonsByCourse = async (
  courseId,
  { page = 1, limit = 20 } = {},
) => {
  const values = [courseId];
  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const dataQuery = `
        SELECT
            l.id,
            l.course_id,
            l.title,
            l.slug,
            l.content,
            l.video_url,
            l.code_examples,
            l.position,
            l.created_at,
            l.updated_at
        FROM public.lessons l
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE l.course_id = $1
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
        ORDER BY l.position ASC
        LIMIT $2
        OFFSET $3
    `;

  const countQuery = `
        SELECT COUNT(*) AS total
        FROM public.lessons l
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE l.course_id = $1
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
    `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataValues),
    pool.query(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0].total),
  };
};

export const getPublishedLessonById = async (courseId, lessonId) => {
  const query = `
        SELECT
            l.id,
            l.course_id,
            l.title,
            l.slug,
            l.content,
            l.video_url,
            l.code_examples,
            l.position,
            l.created_at,
            l.updated_at
        FROM public.lessons l
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE c.id = $1
          AND l.id = $2
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
        LIMIT 1
    `;

  const result = await pool.query(query, [courseId, lessonId]);

  return result.rows[0] || null;
};

export const getPublishedExercisesByLesson = async (
  lessonId,
  { page = 1, limit = 20 } = {},
) => {
  const values = [lessonId];
  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const dataQuery = `
        SELECT
            e.id,
            e.lesson_id,
            e.title,
            e.slug,
            e.instructions,
            e.difficulty,
            e.position,
            e.created_at,
            e.updated_at
        FROM public.exercises e
        INNER JOIN public.lessons l
            ON l.id = e.lesson_id
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE e.lesson_id = $1
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
        ORDER BY e.position ASC
        LIMIT $2
        OFFSET $3
    `;

  const countQuery = `
        SELECT COUNT(*) AS total
        FROM public.exercises e
        INNER JOIN public.lessons l
            ON l.id = e.lesson_id
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE e.lesson_id = $1
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
    `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataValues),
    pool.query(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0].total),
  };
};

export const getPublishedExerciseById = async (lessonId, exerciseId) => {
  const query = `
        SELECT
            e.id,
            e.lesson_id,
            e.title,
            e.slug,
            e.instructions,
            e.difficulty,
            e.position,
            e.created_at,
            e.updated_at
        FROM public.exercises e
        INNER JOIN public.lessons l
            ON l.id = e.lesson_id
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE l.id = $1
          AND e.id = $2
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
        LIMIT 1
    `;

  const result = await pool.query(query, [lessonId, exerciseId]);

  return result.rows[0] || null;
};

export const getPublishedExerciseLanguages = async (exerciseId) => {
  const query = `
        SELECT
            el.id,
            el.exercise_id,
            el.language,
            el.runtime_version,
            el.execution_mode,
            el.starter_code,
            el.entry_point,
            el.created_at,
            el.updated_at
        FROM public.exercise_languages el
        INNER JOIN public.exercises e
            ON e.id = el.exercise_id
        INNER JOIN public.lessons l
            ON l.id = e.lesson_id
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE e.id = $1
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
        ORDER BY el.language ASC
    `;

  const result = await pool.query(query, [exerciseId]);

  return result.rows;
};

export const getVisibleTestCases = async (exerciseId) => {
  const query = `
        SELECT
            tc.id,
            tc.exercise_id,
            tc.input_data,
            tc.expected_output,
            tc.display_order
        FROM public.exercise_test_cases tc
        INNER JOIN public.exercises e
            ON e.id = tc.exercise_id
        INNER JOIN public.lessons l
            ON l.id = e.lesson_id
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE e.id = $1
          AND e.status = 'published'
          AND l.status = 'published'
          AND l.deleted_at IS NULL
          AND c.status = 'published'
          AND c.deleted_at IS NULL
          AND tc.visibility = 'visible'
        ORDER BY tc.display_order ASC
    `;

  const result = await pool.query(query, [exerciseId]);

  return result.rows;
};
export async function getPublishedLessonByIdOnly(lessonId) {
  const query = `
        SELECT
            l.id,
            l.course_id,
            l.title,
            l.slug,
            l.content,
            l.video_url,
            l.code_examples,
            l.position,
            l.status,
            l.created_at,
            l.updated_at
        FROM public.lessons l
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE l.id = $1
            AND l.status = 'published'
            AND l.deleted_at IS NULL
            AND c.status = 'published'
            AND c.deleted_at IS NULL
    `;

  const { rows } = await pool.query(query, [lessonId]);

  return rows[0] || null;
}
export async function getPublishedExerciseByIdOnly(exerciseId) {
  const query = `
        SELECT
            e.id,
            e.lesson_id,
            e.title,
            e.instructions,
            e.difficulty,
            e.position,
            e.slug,
            e.status,
            e.created_at,
            e.updated_at
        FROM public.exercises e
        INNER JOIN public.lessons l
            ON l.id = e.lesson_id
        INNER JOIN public.courses c
            ON c.id = l.course_id
        WHERE e.id = $1
            AND e.status = 'published'
            AND l.status = 'published'
            AND l.deleted_at IS NULL
            AND c.status = 'published'
            AND c.deleted_at IS NULL
    `;

  const { rows } = await pool.query(query, [exerciseId]);

  return rows[0] || null;
}
