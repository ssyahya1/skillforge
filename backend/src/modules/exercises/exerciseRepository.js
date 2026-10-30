import { pool } from "../../database/pool.js";

const exerciseColumn = `
  id,
  lesson_id,
  title,
  slug,
  instructions,
  difficulty,
  position,
  status,
  created_at,
  updated_at
`;

const languageColumn = `
  id,
  exercise_id,
  language,
  runtime_version,
  execution_mode,
  starter_code,
  entry_point,
  created_at,
  updated_at
`;

const testCaseColumn = `
  id,
  exercise_id,
  input_data,
  expected_output,
  visibility,
  display_order,
  created_at,
  updated_at
`;

export async function findLessonById(lessonId) {
  const result = await pool.query(
    `
      SELECT id, status, deleted_at
      FROM public.lessons
      WHERE id = $1
      LIMIT 1
    `,
    [lessonId],
  );

  return result.rows[0] ?? null;
}

export async function findExerciseById(exerciseId) {
  const result = await pool.query(
    `
      SELECT ${exerciseColumn}
      FROM public.exercises
      WHERE id = $1
      LIMIT 1
    `,
    [exerciseId],
  );

  return result.rows[0] ?? null;
}

export async function createExercise(lessonId, exerciseData) {
  const { title, slug, instructions, difficulty, position } = exerciseData;

  const result = await pool.query(
    `
      INSERT INTO public.exercises (
        lesson_id,
        title,
        slug,
        instructions,
        difficulty,
        position
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${exerciseColumn}
    `,
    [lessonId, title, slug, instructions, difficulty, position],
  );

  return result.rows[0];
}

const allowedExerciseFields = [
  "title",
  "slug",
  "instructions",
  "difficulty",
  "position",
];

export async function updateExercise(exerciseId, exerciseData) {
  const fields = Object.keys(exerciseData).filter((key) =>
    allowedExerciseFields.includes(key),
  );

  if (fields.length === 0) {
    return null;
  }

  const values = [];

  const setClauses = fields.map((field, index) => {
    values.push(exerciseData[field]);
    return `${field} = $${index + 1}`;
  });

  values.push(exerciseId);

  const result = await pool.query(
    `
      UPDATE public.exercises
      SET ${setClauses.join(", ")},
          updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING ${exerciseColumn}
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function getExercisesByLesson(lessonId) {
  const result = await pool.query(
    `
      SELECT ${exerciseColumn}
      FROM public.exercises
      WHERE lesson_id = $1
      ORDER BY position ASC, created_at ASC
    `,
    [lessonId],
  );

  return result.rows;
}

export async function updateExerciseStatus(exerciseId, status) {
  const result = await pool.query(
    `
      UPDATE public.exercises
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING ${exerciseColumn}
    `,
    [status, exerciseId],
  );

  return result.rows[0] ?? null;
}

export async function deleteExercise(exerciseId) {
  const result = await pool.query(
    `
      DELETE FROM public.exercises
      WHERE id = $1
        AND status = 'draft'
      RETURNING id
    `,
    [exerciseId],
  );

  return result.rows[0] ?? null;
}

export async function reorderExercises(lessonId, exercises) {
  const client = await pool.connect();

  try {
    const exerciseIds = exercises.map((exercise) => exercise.exerciseId);

    const positions = exercises.map((exercise) => exercise.position);

    if (
      new Set(exerciseIds).size !== exerciseIds.length ||
      new Set(positions).size !== positions.length
    ) {
      throw new Error("Duplicate exercise IDs or positions.");
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT id, position
        FROM public.exercises
        WHERE lesson_id = $1
        FOR UPDATE
      `,
      [lessonId],
    );

    const existingIds = existingResult.rows
      .map((exercise) => exercise.id)
      .sort();

    const requestedIds = [...exerciseIds].sort();

    if (
      existingIds.length !== requestedIds.length ||
      !existingIds.every((id, index) => id === requestedIds[index])
    ) {
      throw new Error(
        "The reorder request must include every exercise in the lesson.",
      );
    }

    const maxPosition = existingResult.rows.reduce(
      (max, exercise) => Math.max(max, exercise.position),
      0,
    );

    const offset = maxPosition + exercises.length + 1;

    await client.query(
      `
        UPDATE public.exercises
        SET position = position + $2
        WHERE lesson_id = $1
      `,
      [lessonId, offset],
    );

    for (const exercise of exercises) {
      await client.query(
        `
          UPDATE public.exercises
          SET position = $1,
              updated_at = NOW()
          WHERE id = $2
            AND lesson_id = $3
        `,
        [exercise.position, exercise.exerciseId, lessonId],
      );
    }

    const result = await client.query(
      `
        SELECT ${exerciseColumn}
        FROM public.exercises
        WHERE lesson_id = $1
        ORDER BY position ASC
      `,
      [lessonId],
    );

    await client.query("COMMIT");

    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createExerciseLanguage(exerciseId, languageData) {
  const { language, runtimeVersion, executionMode, starterCode, entryPoint } =
    languageData;

  const result = await pool.query(
    `
      INSERT INTO public.exercise_languages (
        exercise_id,
        language,
        runtime_version,
        execution_mode,
        starter_code,
        entry_point
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${languageColumn}
    `,
    [
      exerciseId,
      language,
      runtimeVersion,
      executionMode,
      starterCode,
      entryPoint ?? null,
    ],
  );

  return result.rows[0];
}

export async function findLanguageById(languageId) {
  const result = await pool.query(
    `
      SELECT ${languageColumn}
      FROM public.exercise_languages
      WHERE id = $1
      LIMIT 1
    `,
    [languageId],
  );

  return result.rows[0] ?? null;
}

export async function getExerciseLanguages(exerciseId) {
  const result = await pool.query(
    `
      SELECT ${languageColumn}
      FROM public.exercise_languages
      WHERE exercise_id = $1
      ORDER BY language ASC
    `,
    [exerciseId],
  );

  return result.rows;
}

const languageColumnMap = {
  runtimeVersion: "runtime_version",
  executionMode: "execution_mode",
  starterCode: "starter_code",
  entryPoint: "entry_point",
};

export async function updateExerciseLanguage(languageId, languageData) {
  const fields = Object.keys(languageData).filter((key) =>
    Object.hasOwn(languageColumnMap, key),
  );

  if (fields.length === 0) {
    return null;
  }

  const values = [];

  const setClauses = fields.map((field, index) => {
    values.push(languageData[field]);

    return `${languageColumnMap[field]} = $${index + 1}`;
  });

  values.push(languageId);

  const result = await pool.query(
    `
      UPDATE public.exercise_languages
      SET ${setClauses.join(", ")},
          updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING ${languageColumn}
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function deleteExerciseLanguage(languageId) {
  const result = await pool.query(
    `
      DELETE FROM public.exercise_languages
      WHERE id = $1
      RETURNING id
    `,
    [languageId],
  );

  return result.rows[0] ?? null;
}

export async function createTestCase(exerciseId, testCaseData) {
  const { inputData, expectedOutput, visibility, displayOrder } = testCaseData;

  const result = await pool.query(
    `
      INSERT INTO public.exercise_test_cases (
        exercise_id,
        input_data,
        expected_output,
        visibility,
        display_order
      )
      VALUES ($1, $2::jsonb, $3::jsonb, $4, $5)
      RETURNING ${testCaseColumn}
    `,
    [
      exerciseId,
      JSON.stringify(inputData),
      JSON.stringify(expectedOutput),
      visibility,
      displayOrder,
    ],
  );

  return result.rows[0];
}

export async function findTestCaseById(testCaseId) {
  const result = await pool.query(
    `
      SELECT ${testCaseColumn}
      FROM public.exercise_test_cases
      WHERE id = $1
      LIMIT 1
    `,
    [testCaseId],
  );

  return result.rows[0] ?? null;
}

export async function getTestCasesByExercise(exerciseId) {
  const result = await pool.query(
    `
      SELECT ${testCaseColumn}
      FROM public.exercise_test_cases
      WHERE exercise_id = $1
      ORDER BY display_order ASC
    `,
    [exerciseId],
  );

  return result.rows;
}

const testCaseColumnMap = {
  inputData: "input_data",
  expectedOutput: "expected_output",
  visibility: "visibility",
  displayOrder: "display_order",
};

export async function updateTestCase(testCaseId, testCaseData) {
  const fields = Object.keys(testCaseData).filter((key) =>
    Object.hasOwn(testCaseColumnMap, key),
  );

  if (fields.length === 0) {
    return null;
  }

  const values = [];

  const setClauses = fields.map((field, index) => {
    const value = testCaseData[field];

    values.push(
      field === "inputData" || field === "expectedOutput"
        ? JSON.stringify(value)
        : value,
    );

    const cast =
      field === "inputData" || field === "expectedOutput" ? "::jsonb" : "";

    return `${testCaseColumnMap[field]} = $${index + 1}${cast}`;
  });

  values.push(testCaseId);

  const result = await pool.query(
    `
      UPDATE public.exercise_test_cases
      SET ${setClauses.join(", ")},
          updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING ${testCaseColumn}
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function deleteTestCase(testCaseId) {
  const result = await pool.query(
    `
      DELETE FROM public.exercise_test_cases
      WHERE id = $1
      RETURNING id
    `,
    [testCaseId],
  );

  return result.rows[0] ?? null;
}

export async function countExerciseLanguages(exerciseId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM public.exercise_languages
      WHERE exercise_id = $1
    `,
    [exerciseId],
  );

  return result.rows[0].count;
}

export async function countVisibleTestCases(exerciseId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM public.exercise_test_cases
      WHERE exercise_id = $1
        AND visibility = 'visible'
    `,
    [exerciseId],
  );

  return result.rows[0].count;
}

export async function countHiddenTestCases(exerciseId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM public.exercise_test_cases
      WHERE exercise_id = $1
        AND visibility = 'hidden'
    `,
    [exerciseId],
  );

  return result.rows[0].count;
}

export async function saveLanguageSolution(languageId, solutionCode) {
  const result = await pool.query(
    `
      INSERT INTO private.exercise_language_solutions (
        language_id,
        solution_code
      )
      VALUES ($1, $2)
      ON CONFLICT (language_id)
      DO UPDATE SET
        solution_code = EXCLUDED.solution_code,
        updated_at = NOW()
      RETURNING language_id
    `,
    [languageId, solutionCode],
  );

  return result.rows[0];
}

export async function getLanguageSolution(languageId) {
  const result = await pool.query(
    `
      SELECT language_id, solution_code
      FROM private.exercise_language_solutions
      WHERE language_id = $1
      LIMIT 1
    `,
    [languageId],
  );

  return result.rows[0] ?? null;
}

export async function getPublishedExercisesByLesson(lessonId) {
  const result = await pool.query(
    `
      SELECT ${exerciseColumn}
      FROM public.exercises
      WHERE lesson_id = $1
        AND status = 'published'
      ORDER BY position ASC
    `,
    [lessonId],
  );

  return result.rows;
}

export async function getStudentExerciseDetails(exerciseId) {
  const result = await pool.query(
    `
      SELECT ${exerciseColumn}
      FROM public.exercises
      WHERE id = $1
        AND status = 'published'
      LIMIT 1
    `,
    [exerciseId],
  );

  return result.rows[0] ?? null;
}

export async function getStudentExerciseLanguages(exerciseId) {
  const result = await pool.query(
    `
      SELECT
        language.id,
        language.exercise_id,
        language.language,
        language.runtime_version,
        language.execution_mode,
        language.starter_code,
        language.entry_point,
        language.created_at,
        language.updated_at
      FROM public.exercise_languages AS language
      INNER JOIN public.exercises AS exercise
        ON exercise.id = language.exercise_id
      WHERE exercise.id = $1
        AND exercise.status = 'published'
      ORDER BY language.language ASC
    `,
    [exerciseId],
  );

  return result.rows;
}

export async function getVisibleTestCases(exerciseId) {
  const result = await pool.query(
    `
      SELECT
        test_case.id,
        test_case.exercise_id,
        test_case.input_data,
        test_case.expected_output,
        test_case.display_order
      FROM public.exercise_test_cases AS test_case
      INNER JOIN public.exercises AS exercise
        ON exercise.id = test_case.exercise_id
      WHERE exercise.id = $1
        AND exercise.status = 'published'
        AND test_case.visibility = 'visible'
      ORDER BY test_case.display_order ASC
    `,
    [exerciseId],
  );

  return result.rows;
}
