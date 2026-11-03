import { Router } from "express";

import { requireAuth } from "../../middleware/requireAuth.js";

import { validateParams } from "../../middleware/validateParams.js";
import { validateQuery } from "../../middleware/validateQuery.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
  submissionParamsSchema,
  submissionDetailsParamsSchema,
  solutionRevealParamsSchema,
  createSubmissionSchema,
  submissionHistoryQuerySchema,
  revealSolutionSchema,
} from "./submissionValidation.js";

import {
  createSubmissionController,
  getSubmissionDetailsController,
  getSubmissionsHistoryController,
  revealSolutionController,
} from "./submissionController.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/exercises/:exerciseId/submissions",
  validateParams(submissionParamsSchema),
  validateRequest(createSubmissionSchema),
  createSubmissionController,
);

router.get(
  "/exercises/:exerciseId/submissions",
  validateParams(submissionParamsSchema),
  validateQuery(submissionHistoryQuerySchema),
  getSubmissionsHistoryController,
);

router.get(
  "/submissions/:submissionId",
  validateParams(submissionDetailsParamsSchema),
  getSubmissionDetailsController,
);

router.post(
  "/exercises/:exerciseId/solutions/reveal",
  validateParams(solutionRevealParamsSchema),
  validateRequest(revealSolutionSchema),
  revealSolutionController,
);

export default router;
