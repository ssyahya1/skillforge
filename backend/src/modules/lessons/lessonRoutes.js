import { Router } from "express";

import {
  createLessonController,
  listLessonsController,
  getLessonByIdController,
  updateLessonController,
  publishLessonController,
  unpublishLessonController,
  softDeleteLessonController,
  restoreLessonController,
} from "./lessonController.js";

import {
  createLessonSchema,
  updateLessonSchema,
  lessonParamsSchema,
  courseLessonsParamsSchema,
  lessonQuerySchema,
} from "./lessonValidation.js";

import { requireAuth } from "../../middleware/requireAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { validateQuery } from "../../middleware/validateQuery.js";
import { validateParams } from "../../middleware/validateParams.js";

const router = Router();


router.use(requireAuth, requireAdmin);


router.post(
  "/:courseId/lessons",
  validateParams(courseLessonsParamsSchema),
  validateRequest(createLessonSchema),
  createLessonController
);


router.get(
  "/:courseId/lessons",
  validateParams(courseLessonsParamsSchema),
  validateQuery(lessonQuerySchema),
  listLessonsController
);


router.get(
  "/:courseId/lessons/:lessonId",
  validateParams(lessonParamsSchema),
  getLessonByIdController
);


router.patch(
  "/:courseId/lessons/:lessonId",
  validateParams(lessonParamsSchema),
  validateRequest(updateLessonSchema),
  updateLessonController
);


router.patch(
  "/:courseId/lessons/:lessonId/publish",
  validateParams(lessonParamsSchema),
  publishLessonController
);


router.patch(
  "/:courseId/lessons/:lessonId/unpublish",
  validateParams(lessonParamsSchema),
  unpublishLessonController
);


router.delete(
  "/:courseId/lessons/:lessonId",
  validateParams(lessonParamsSchema),
  softDeleteLessonController
);


router.patch(
  "/:courseId/lessons/:lessonId/restore",
  validateParams(lessonParamsSchema),
  restoreLessonController
);

export default router;
