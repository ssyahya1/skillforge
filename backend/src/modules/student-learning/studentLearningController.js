import * as studentLearningService from "./studentLearningService.js";

export async function getCourses(req, res, next) {
  try {
    const result = await studentLearningService.getCoursesService(
      req.validateQuery || req.query,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCourseById(req, res, next) {
  try {
    const result = await studentLearningService.getCourseByIdService(
      req.params.courseId,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getLessonsByCourseId(req, res, next) {
  try {
    const result = await studentLearningService.getLessonsByCourseIdService(
      req.params.courseId,
      req.validateQuery || req.query,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getLessonById(req, res, next) {
  try {
    const result = await studentLearningService.getLessonByIdService(
      req.params.courseId,
      req.params.lessonId,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getExercisesByLesson(req, res, next) {
  try {
    const result = await studentLearningService.getExercisesByLessonService(
      req.params.lessonId,
      req.validateQuery || req.query,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getExerciseById(req, res, next) {
  try {
    const result = await studentLearningService.getExerciseByIdService(
      req.params.lessonId,
      req.params.exerciseId,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getExerciseLanguages(req, res, next) {
  try {
    const result = await studentLearningService.getExerciseLanguagesService(
      req.params.exerciseId,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getVisibleTestCases(req, res, next) {
  try {
    const result = await studentLearningService.getVisibleTestCasesService(
      req.params.exerciseId,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
