import { Router } from "express";

import { requireAuth } from "../../middleware/requireAuth.js";
import { validateParams } from "../../middleware/validateParams.js";

import {
  createEnrollmentSchema,
  enrollmentParamsSchema,
  courseEnrollmentParamsSchema,
} from "./enrollmentValidation.js";

import {
  createEnrollment,
  getStudentEnrollments,
  getEnrollment,
  getEnrollmentByCourse,
  cancelEnrollment,
  completeEnrollment,
  updateEnrollmentActivity,
} from "./enrollmentController.js";

const router = Router();

const validateBody = (schema) => {
  return (req, res, next) => {
    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.validateBody = validation.data;
    next();
  };
};

router.use(requireAuth);

router.post(
  "/enrollments",
  validateBody(createEnrollmentSchema),
  createEnrollment,
);

router.get("/enrollments", getStudentEnrollments);

router.get(
  "/enrollments/:enrollmentId",
  validateParams(enrollmentParamsSchema),
  getEnrollment,
);

router.get(
  "/courses/:courseId/enrollment",
  validateParams(courseEnrollmentParamsSchema),
  getEnrollmentByCourse,
);

router.patch(
  "/enrollments/:enrollmentId/cancel",
  validateParams(enrollmentParamsSchema),
  cancelEnrollment,
);

router.patch(
  "/enrollments/:enrollmentId/complete",
  validateParams(enrollmentParamsSchema),
  completeEnrollment,
);

router.patch(
  "/enrollments/:enrollmentId/activity",
  validateParams(enrollmentParamsSchema),
  updateEnrollmentActivity,
);

export default router;
