import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validateParams } from "../../middleware/validateParams.js";
import { executionParamsSchema } from "./executionValidation.js";
import {
  queueSubmissionController,
  getSubmissionResultsController,
} from "./executionController.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/:submissionId/execute",
  validateParams(executionParamsSchema),
  queueSubmissionController,
);

router.get(
  "/:submissionId/results",
  validateParams(executionParamsSchema),
  getSubmissionResultsController,
);

export default router;
