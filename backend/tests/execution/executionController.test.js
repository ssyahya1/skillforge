import { describe, it, expect, vi, beforeEach } from "vitest";
import * as executionService from "../../src/modules/execution/executionService.js";
import {
  queueSubmissionController,
  getSubmissionResultsController,
} from "../../src/modules/execution/executionController.js";

vi.mock("../../src/modules/execution/executionService.js", () => ({
  queueSubmission: vi.fn(),
  getSubmissionResults: vi.fn(),
}));

describe("Execution Controller", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: "user-123" },
      validatedParams: { submissionId: "submission-123" },
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe("queueSubmissionController", () => {
    it("should queue a submission and return 202", async () => {
      const queueResult = {
        submissionId: "submission-123",
        jobId: "submission-submission-123",
        status: "queued",
        message: "Submission added to the execution queue.",
      };

      executionService.queueSubmission.mockResolvedValue(queueResult);

      await queueSubmissionController(req, res, next);

      expect(executionService.queueSubmission).toHaveBeenCalledWith(
        "submission-123",
        "user-123",
      );
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(queueResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Failed to queue submission for execution.");
      error.status = 503;

      executionService.queueSubmission.mockRejectedValue(error);

      await queueSubmissionController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getSubmissionResultsController", () => {
    it("should return submission and test results with status 200", async () => {
      const results = {
        submission: { id: "submission-123", status: "accepted" },
        testResults: [{ id: "tr-1", status: "passed", execution_time_ms: 25 }],
      };

      executionService.getSubmissionResults.mockResolvedValue(results);

      await getSubmissionResultsController(req, res, next);

      expect(executionService.getSubmissionResults).toHaveBeenCalledWith(
        "submission-123",
        "user-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(results);
      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Submission not found.");
      error.status = 404;

      executionService.getSubmissionResults.mockRejectedValue(error);

      await getSubmissionResultsController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
