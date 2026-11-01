import { Router } from "express";

import * as exerciseController from "./exerciseController.js";
import * as exerciseValidation from "./exerciseValidation.js";

import { requireAuth } from "../../middleware/requireAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { validateParams } from "../../middleware/validateParams.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.post(
  "/:lessonId/exercises",
  validateParams(exerciseValidation.lessonExercisesParamsSchema),
  validateRequest(exerciseValidation.createExerciseSchema),
  exerciseController.createExerciseController,
);

router.get(
  "/:lessonId/exercises",
  validateParams(exerciseValidation.lessonExercisesParamsSchema),
  exerciseController.getExercisesByLessonController,
);

router.patch(
  "/:lessonId/exercises/reorder",
  validateParams(exerciseValidation.lessonExercisesParamsSchema),
  validateRequest(exerciseValidation.reorderExercisesSchema),
  exerciseController.reorderExercisesController,
);

router.post(
  "/:lessonId/exercises/:exerciseId/languages",
  validateParams(exerciseValidation.exerciseParamsSchema),
  validateRequest(exerciseValidation.createExerciseLanguageSchema),
  exerciseController.createExerciseLanguageController,
);

router.get(
  "/:lessonId/exercises/:exerciseId/languages",
  validateParams(exerciseValidation.exerciseParamsSchema),
  exerciseController.getExerciseLanguageController,
);

router.get(
  "/:lessonId/exercises/:exerciseId/languages/:languageId",
  validateParams(exerciseValidation.exerciseLanguageParamsSchema),
  exerciseController.getExerciseLanguageByIdController,
);

router.patch(
  "/:lessonId/exercises/:exerciseId/languages/:languageId",
  validateParams(exerciseValidation.exerciseLanguageParamsSchema),
  validateRequest(exerciseValidation.updateExerciseLanguageSchema),
  exerciseController.updateExerciseLanguageController,
);

router.delete(
  "/:lessonId/exercises/:exerciseId/languages/:languageId",
  validateParams(exerciseValidation.exerciseLanguageParamsSchema),
  exerciseController.deleteExerciseLanguageController,
);

router.get(
  "/:lessonId/exercises/:exerciseId",
  validateParams(exerciseValidation.exerciseParamsSchema),
  exerciseController.getExerciseByIdController,
);

router.patch(
  "/:lessonId/exercises/:exerciseId",
  validateParams(exerciseValidation.exerciseParamsSchema),
  validateRequest(exerciseValidation.updateExerciseSchema),
  exerciseController.updateExerciseController,
);

router.patch(
  "/:lessonId/exercises/:exerciseId/publish",
  validateParams(exerciseValidation.exerciseParamsSchema),
  exerciseController.publishExerciseController,
);

router.patch(
  "/:lessonId/exercises/:exerciseId/archive",
  validateParams(exerciseValidation.exerciseParamsSchema),
  exerciseController.archiveExerciseController,
);

router.delete(
  "/:lessonId/exercises/:exerciseId",
  validateParams(exerciseValidation.exerciseParamsSchema),
  exerciseController.deleteExerciseController,
);

export default router;
