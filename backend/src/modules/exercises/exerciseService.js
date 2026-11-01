import * as exerciseRepository from "./exerciseRepository.js";

export const createExerciseService = async (lessonId, exerciseData) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);

  if (!lesson) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }

  if (lesson.deleted_at) {
    const error = new Error("Cannot create an exercise for a deleted lesson.");
    error.statusCode = 409;
    throw error;
  }

  if (lesson.status === "archived") {
    const error = new Error("Lesson is archived.");
    error.statusCode = 409;
    throw error;
  }

  return exerciseRepository.createExercise(lessonId, exerciseData);
};
export const getExerciseByIdService = async (lessonId, exerciseId) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);
  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }
  const exercise = await exerciseRepository.findExerciseById(exerciseId);
  if (!exercise || exercise.lesson_id !== lessonId) {
    const error = new Error("Exercise not found.");
    error.statusCode = 404;
    throw error;
  }
  return exercise;
};
export const getExercisesByLessonService = async (lessonId) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);
  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }
  const exercises = await exerciseRepository.getExercisesByLesson(lessonId);
  return exercises;
};
export const updateExerciseService = async (
  exerciseId,
  lessonId,
  exerciseData,
) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);
  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }
  const exercise = await exerciseRepository.findExerciseById(exerciseId);
  if (!exercise || exercise.lesson_id !== lessonId) {
    const error = new Error("Exercise not found.");
    error.statusCode = 404;
    throw error;
  }
  if (exercise.status === "archived") {
    const error = new Error("Exercise is archived.");
    error.statusCode = 409;
    throw error;
  }

  const updatedExercise = await exerciseRepository.updateExercise(
    exerciseId,
    exerciseData,
  );

  if (!updatedExercise) {
    const error = new Error("Exercise could not be updated.");
    error.statusCode = 404;
    throw error;
  }

  return updatedExercise;
};
export const reorderExercisesService = async (lessonId, exercises) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);

  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingExercises =
    await exerciseRepository.getExercisesByLesson(lessonId);

  const invalidExercise = exercises.some(
    (item) =>
      !existingExercises.some((existing) => existing.id === item.exerciseId),
  );

  const exerciseIds = exercises.map((item) => item.exerciseId);
  const positions = exercises.map((item) => item.position);

  const uniqueIds = new Set(exerciseIds);
  const uniquePositions = new Set(positions);

  const validPositions = positions.every(
    (position) =>
      Number.isInteger(position) &&
      position >= 0 &&
      position < exercises.length,
  );

  if (
    invalidExercise ||
    exercises.length !== existingExercises.length ||
    uniqueIds.size !== exerciseIds.length ||
    uniquePositions.size !== positions.length ||
    !validPositions
  ) {
    const error = new Error(
      "Invalid exercise order. Ensure all exercises belong to this lesson, every exercise is included exactly once, and positions are unique and consecutive starting from 0.",
    );
    error.statusCode = 400;
    throw error;
  }

  const reorderedExercises = await exerciseRepository.reorderExercises(
    lessonId,
    exercises,
  );

  if (!reorderedExercises) {
    const error = new Error("Exercise could not be reordered.");
    error.statusCode = 500;
    throw error;
  }

  return reorderedExercises;
};
export const publishExerciseService = async (lessonId, exerciseId) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);

  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }
  if (lesson.status === "archived") {
    const error = new Error("Archived exercises cannot be published.");
    error.statusCode = 409;
    throw error;
  }
  const exercise = await exerciseRepository.findExerciseById(exerciseId);

  if (!exercise || exercise.lesson_id !== lessonId) {
    const error = new Error("Exercise not found.");
    error.statusCode = 404;
    throw error;
  }
  if (exercise.status === "published") {
    const error = new Error("Exercise is already published.");
    error.statusCode = 409;
    throw error;
  }
  if (exercise.status === "archived") {
    const error = new Error("Archived exercises cannot be published.");
    error.statusCode = 409;
    throw error;
  }
  if (
    !exercise.title?.trim() ||
    !exercise.slug?.trim() ||
    !exercise.instructions?.trim()
  ) {
    const error = new Error(
      "Exercise title, slug, and instructions are required.",
    );
    error.statusCode = 400;
    throw error;
  }
  const languages = await exerciseRepository.getExerciseLanguages(exerciseId);
  const allowedLanguages = ["javascript", "python", "cpp"];

  const invalidLanguage = languages.some(
    (item) => !allowedLanguages.includes(item.language),
  );
  if (invalidLanguage) {
    const error = new Error("One or more programming languages are invalid.");
    error.statusCode = 400;
    throw error;
  }
  if (!languages.length) {
    const error = new Error("At least one programming language is required.");
    error.statusCode = 400;
    throw error;
  }
  const invalidConfig = languages.some(
    (item) =>
      !item.runtime_version?.trim() ||
      !item.starter_code?.trim() ||
      !["function", "stdin"].includes(item.execution_mode),
  );
  if (invalidConfig) {
    const error = new Error(
      "Each language must have a valid runtime version, starter code, and execution mode.",
    );
    error.statusCode = 400;
    throw error;
  }
  const visibleTestCases =
    await exerciseRepository.countVisibleTestCases(exerciseId);
  if (visibleTestCases < 1) {
    const error = new Error("At least one visible test case is required.");
    error.statusCode = 400;
    throw error;
  }
  const hiddenTestCases =
    await exerciseRepository.countHiddenTestCases(exerciseId);
  if (hiddenTestCases < 1) {
    const error = new Error("At least one hidden test case is required.");
    error.statusCode = 400;
    throw error;
  }
  const publishedExercise = await exerciseRepository.updateExerciseStatus(
    exerciseId,
    "published",
  );

  if (!publishedExercise) {
    const error = new Error("Failed to publish exercise.");
    error.statusCode = 500;
    throw error;
  }

  return publishedExercise;
};
export const archiveExerciseService = async (lessonId, exerciseId) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);

  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }

  const exercise = await exerciseRepository.findExerciseById(exerciseId);

  if (!exercise || exercise.lesson_id !== lessonId) {
    const error = new Error("Exercise not found.");
    error.statusCode = 404;
    throw error;
  }

  if (exercise.status === "archived") {
    const error = new Error("Exercise is already archived.");
    error.statusCode = 409;
    throw error;
  }

  const archivedExercise = await exerciseRepository.updateExerciseStatus(
    exerciseId,
    "archived",
  );

  if (!archivedExercise) {
    const error = new Error("Exercise could not be archived.");
    error.statusCode = 500;
    throw error;
  }

  return archivedExercise;
};
export const deleteExerciseService = async (lessonId, exerciseId) => {
  const lesson = await exerciseRepository.findLessonById(lessonId);

  if (!lesson || lesson.deleted_at) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }

  const exercise = await exerciseRepository.findExerciseById(exerciseId);

  if (!exercise || exercise.lesson_id !== lessonId) {
    const error = new Error("Exercise not found.");
    error.statusCode = 404;
    throw error;
  }

  if (exercise.status !== "draft") {
    const error = new Error("Only draft exercises can be deleted.");
    error.statusCode = 409;
    throw error;
  }

  const deletedExercise = await exerciseRepository.deleteExercise(exerciseId);

  if (!deletedExercise) {
    const error = new Error("Exercise could not be deleted.");
    error.statusCode = 500;
    throw error;
  }

  return deletedExercise;
};
export const createExerciseLanguageService = async (
  lessonId,
  exerciseId,
  languageData,
) => {
  const exercise = await getExerciseByIdService(lessonId, exerciseId);
  if (exercise.status !== "draft") {
    const error = new Error(
      "Language configurations can only be added to draft exercises.",
    );
    error.statusCode = 409;
    throw error;
  }
  const languageConfig = await exerciseRepository.createExerciseLanguage(
    exerciseId,
    languageData,
  );
  return languageConfig;
};
export const getExerciseLanguagesService = async (lessonId, exerciseId) => {
  await getExerciseByIdService(lessonId, exerciseId);
  const languages = await exerciseRepository.getExerciseLanguages(exerciseId);
  return languages;
};
export const getExerciseLanguageByIdService = async (
  lessonId,
  exerciseId,
  languageId,
) => {
  await getExerciseByIdService(lessonId, exerciseId);
  const language = await exerciseRepository.findExerciseLanguageById(
    exerciseId,
    languageId,
  );
  if (!language) {
    const error = new Error("Exercise language configuration not found.");
    error.statusCode = 404;
    throw error;
  }
  return language;
};
export const updateExerciseLanguageService = async (
  lessonId,
  exerciseId,
  languageId,
  languageData,
) => {
  const exercise = await getExerciseByIdService(lessonId, exerciseId);
  if (exercise.status !== "draft") {
    const error = new Error(
      "Language configurations can only be updated on draft exercises.",
    );
    error.statusCode = 409;
    throw error;
  }
  const language = await exerciseRepository.updateExerciseLanguageById(
    exerciseId,
    languageId,
    languageData,
  );
  if (!language) {
    const error = new Error("Exercise language configuration not found.");
    error.statusCode = 404;
    throw error;
  }
  return language;
};
export const deleteExerciseLanguageService = async (
  lessonId,
  exerciseId,
  languageId,
) => {
  const exercise = await getExerciseByIdService(lessonId, exerciseId);
  if (exercise.status !== "draft") {
    const error = new Error(
      "Language configurations can only be deleted from draft exercises.",
    );
    error.statusCode = 409;
    throw error;
  }
  const deletedLanguage = await exerciseRepository.deleteExerciseLanguageById(
    exerciseId,
    languageId,
  );
  if (!deletedLanguage) {
    const error = new Error("Exercise language configuration not found.");
    error.statusCode = 404;
    throw error;
  }
  return deletedLanguage;
};
