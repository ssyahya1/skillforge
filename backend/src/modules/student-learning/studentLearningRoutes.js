import { Router } from "express";

import { requireAuth } from "../../middleware/requireAuth.js";
import { validateParams } from "../../middleware/validateParams.js";
import { validateQuery } from "../../middleware/validateQuery.js";

import {
  courseParamsSchema,
  courseLessonsParamsSchema,
  courseLessonParamsSchema,
  lessonParamsSchema,
  lessonExercisesParamsSchema,
  lessonExerciseParamsSchema,
  exerciseParamsSchema,
  studentCourseQuerySchema,
  studentLessonQuerySchema,
  studentExerciseQuerySchema,
} from "./studentLearningValidation.js";

import {
  getCourses,
  getCourseById,
  getLessonsByCourseId,
  getLessonById,
  getExercisesByLesson,
  getExerciseById,
  getExerciseLanguages,
  getVisibleTestCases,
} from "./studentLearningController.js";

const router = Router();

router.use(requireAuth);

router.get("/courses", validateQuery(studentCourseQuerySchema), getCourses);

router.get(
  "/courses/:courseId",
  validateParams(courseParamsSchema),
  getCourseById,
);

router.get(
  "/courses/:courseId/lessons",
  validateParams(courseLessonsParamsSchema),
  validateQuery(studentLessonQuerySchema),
  getLessonsByCourseId,
);

router.get(
  "/courses/:courseId/lessons/:lessonId",
  validateParams(courseLessonParamsSchema),
  getLessonById,
);

router.get(
  "/lessons/:lessonId/exercises",
  validateParams(lessonExercisesParamsSchema),
  validateQuery(studentExerciseQuerySchema),
  getExercisesByLesson,
);

router.get(
  "/lessons/:lessonId/exercises/:exerciseId",
  validateParams(lessonExerciseParamsSchema),
  getExerciseById,
);

router.get(
  "/exercises/:exerciseId/languages",
  validateParams(exerciseParamsSchema),
  getExerciseLanguages,
);

router.get(
  "/exercises/:exerciseId/test-cases",
  validateParams(exerciseParamsSchema),
  getVisibleTestCases,
);

export default router;
