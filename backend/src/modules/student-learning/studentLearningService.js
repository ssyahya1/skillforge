import * as studentLearningRepository from "./studentLearningRepository.js";

export async function getCoursesService(filters) {
  return await studentLearningRepository.getPublishedCourses(filters);
}

export async function getCourseByIdService(courseId) {
  const course =
    await studentLearningRepository.getPublishedCourseById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.status = 404;
    throw error;
  }
  return course;
}

export async function getLessonsByCourseIdService(courseId, filters) {
  const course =
    await studentLearningRepository.getPublishedCourseById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.status = 404;
    throw error;
  }
  const lessons =
    await studentLearningRepository.getPublishedLessonsByCourse(
      courseId,
      filters,
    );
  return lessons;
}

export async function getLessonByIdService(courseId, lessonId) {
  const lesson = await studentLearningRepository.getPublishedLessonById(
    courseId,
    lessonId,
  );
  if (!lesson) {
    const error = new Error("Lesson not found");
    error.status = 404;
    throw error;
  }
  return lesson;
}

export async function getExercisesByLessonService(lessonId, filters) {
  const lesson =
    await studentLearningRepository.getPublishedLessonByIdOnly(lessonId);

  if (!lesson) {
    const error = new Error("Lesson not found");
    error.status = 404;
    throw error;
  }

  const exercises =
    await studentLearningRepository.getPublishedExercisesByLesson(
      lessonId,
      filters,
    );

  return exercises;
}

export async function getExerciseByIdService(lessonId, exerciseId) {
  const exercise =
    await studentLearningRepository.getPublishedExerciseById(
      lessonId,
      exerciseId,
    );
  if (!exercise) {
    const error = new Error("Exercise not found");
    error.status = 404;
    throw error;
  }
  return exercise;
}

export async function getExerciseLanguagesService(exerciseId) {
  const exercise =
    await studentLearningRepository.getPublishedExerciseByIdOnly(exerciseId);
  if (!exercise) {
    const error = new Error("Exercise not found");
    error.status = 404;
    throw error;
  }
  const languages =
    await studentLearningRepository.getPublishedExerciseLanguages(exerciseId);
  return languages;
}

export async function getVisibleTestCasesService(exerciseId) {
  const exercise =
    await studentLearningRepository.getPublishedExerciseByIdOnly(exerciseId);
  if (!exercise) {
    const error = new Error("Exercise not found");
    error.status = 404;
    throw error;
  }
  const testCases =
    await studentLearningRepository.getVisibleTestCases(exerciseId);
  return testCases;
}
