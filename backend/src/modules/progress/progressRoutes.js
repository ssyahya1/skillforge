import { Router } from "express";

import { requireAuth } from "../../middleware/requireAuth.js";
import { validateParams } from "../../middleware/validateParams.js";

import {
  enrollmentProgressParamsSchema,
  lessonProgressParamsSchema,
  exerciseProgressParamsSchema,
  exerciseLookupParamsSchema,
} from "./progressValidation.js";

import {
  getEnrollmentProgressController,
  getLessonProgressController,
  getLessonExerciseProgressController,
  getExerciseProgressController,
  startLessonController,
  completeLessonContentController,
  getPreviousPublishedLessonController,
  getActiveEnrollmentForExerciseController,
} from "./progressController.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/enrollments/:enrollmentId/progress",
  validateParams(enrollmentProgressParamsSchema),
  getEnrollmentProgressController,
);

router.get(
  "/enrollments/:enrollmentId/lessons/:lessonId/progress",
  validateParams(lessonProgressParamsSchema),
  getLessonProgressController,
);

router.get(
  "/enrollments/:enrollmentId/lessons/:lessonId/exercises",
  validateParams(lessonProgressParamsSchema),
  getLessonExerciseProgressController,
);

router.get(
  "/enrollments/:enrollmentId/lessons/:lessonId/previous",
  validateParams(lessonProgressParamsSchema),
  getPreviousPublishedLessonController,
);

router.post(
  "/enrollments/:enrollmentId/lessons/:lessonId/progress/start",
  validateParams(lessonProgressParamsSchema),
  startLessonController,
);

router.patch(
  "/enrollments/:enrollmentId/lessons/:lessonId/progress/content",
  validateParams(lessonProgressParamsSchema),
  completeLessonContentController,
);

router.get(
  "/enrollments/:enrollmentId/exercises/:exerciseId/progress",
  validateParams(exerciseProgressParamsSchema),
  getExerciseProgressController,
);

router.get(
  "/exercises/:exerciseId/enrollment",
  validateParams(exerciseLookupParamsSchema),
  getActiveEnrollmentForExerciseController,
);

export default router;
