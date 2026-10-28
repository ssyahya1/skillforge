import express from "express";
import {requireAuth} from "../../middleware/requireAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import {validateRequest} from "../../middleware/validateRequest.js";
import {validateQuery} from "../../middleware/validateQuery.js";
import { validateParams } from "../../middleware/validateParams.js";
import { createCourseController,getCoursesController,getCourseByIdController,
    updateCourseController,publishCourseController,archiveCourseController,softDeleteCourseController,restoreCourseController} from "./courseController.js";
import { createCourseSchema } from "./courseValidation.js";
import { courseQuerySchema } from "./courseValidation.js";
import { courseParamsSchema,updateCourseSchema } from "./courseValidation.js";


const router = express.Router();

router.get("/",
    requireAuth,
    requireAdmin,
    validateQuery(courseQuerySchema),
    getCoursesController
);

router.post("/",
     requireAuth,
      requireAdmin,
       validateRequest(createCourseSchema),
        createCourseController
    );
router.get(
  "/:courseId",
  requireAuth,
  requireAdmin,
  validateParams(courseParamsSchema),
  getCourseByIdController
);

router.patch(
  "/:courseId",
  requireAuth,
  requireAdmin,
  validateParams(courseParamsSchema),
  validateRequest(updateCourseSchema),
  updateCourseController
);
router.post(
  "/:courseId/publish",
  requireAuth,
    requireAdmin,
    validateParams(courseParamsSchema),
    publishCourseController
);
router.post(
  "/:courseId/archive",
  requireAuth,
    requireAdmin,
    validateParams(courseParamsSchema),
    archiveCourseController
);
router.delete(
  "/:courseId",
  requireAuth,
    requireAdmin,
    validateParams(courseParamsSchema),
    softDeleteCourseController
);
router.post(
  "/:courseId/restore",
  requireAuth,
  requireAdmin,
  validateParams(courseParamsSchema),
  restoreCourseController
);

export default router;
