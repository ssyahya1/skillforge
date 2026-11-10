import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUserSubmissionById,
  isSubmissionEligibleForExecution,
  getPublicSubmissionTestResults,
  addExecutionJob,
} = vi.hoisted(() => ({
    findUserSubmissionById: vi.fn(),
    isSubmissionEligibleForExecution: vi.fn(),
    getPublicSubmissionTestResults: vi.fn(),
    addExecutionJob: vi.fn(),
  }));

vi.mock("../../src/modules/execution/executionRepository.js", () => ({
  findUserSubmissionById,
  isSubmissionEligibleForExecution,
  getPublicSubmissionTestResults,
}));

vi.mock("../../src/modules/execution/executionQueue.js", () => ({
  addExecutionJob,
}));

import {
  queueSubmission,
  getSubmissionResults,
} from "../../src/modules/execution/executionService.js";

describe("executionService", () => {
  const submissionId = "submission-123";
  const userId = "user-123";

  const submission = {
    id: submissionId,
    user_id: userId,
    status: "queued",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isSubmissionEligibleForExecution.mockResolvedValue(true);
  });

  describe("queueSubmission", () => {
    it("should successfully queue a submission", async () => {
      findUserSubmissionById.mockResolvedValue(submission);

      addExecutionJob.mockResolvedValue({
        id: `submission-${submissionId}`,
      });

      const result = await queueSubmission(submissionId, userId);

      expect(findUserSubmissionById).toHaveBeenCalledWith(submissionId, userId);
      expect(isSubmissionEligibleForExecution).toHaveBeenCalledWith(
        submissionId,
        userId,
      );

      expect(addExecutionJob).toHaveBeenCalledWith({
        submissionId,
      });

      expect(result).toEqual({
        submissionId,
        jobId: `submission-${submissionId}`,
        status: "queued",
        message: "Submission added to the execution queue.",
      });
    });

    it("should reject when submission does not exist", async () => {
      findUserSubmissionById.mockResolvedValue(null);

      await expect(queueSubmission(submissionId, userId)).rejects.toMatchObject(
        {
          message: "Submission not found.",
          status: 404,
        },
      );

      expect(addExecutionJob).not.toHaveBeenCalled();
    });

    it("should reject queued submissions without completed lesson content", async () => {
      findUserSubmissionById.mockResolvedValue(submission);
      isSubmissionEligibleForExecution.mockResolvedValue(false);

      await expect(queueSubmission(submissionId, userId)).rejects.toMatchObject(
        {
          status: 403,
          message: expect.stringContaining("complete the lesson content"),
        },
      );

      expect(addExecutionJob).not.toHaveBeenCalled();
    });

    it("should reject unauthorized users", async () => {
      findUserSubmissionById.mockResolvedValue({
        ...submission,
        user_id: "another-user",
      });

      await expect(queueSubmission(submissionId, userId)).rejects.toMatchObject(
        {
          status: 403,
        },
      );

      expect(addExecutionJob).not.toHaveBeenCalled();
    });

    it("should reject submissions that are not queued", async () => {
      findUserSubmissionById.mockResolvedValue({
        ...submission,
        status: "processing",
      });

      await expect(queueSubmission(submissionId, userId)).rejects.toMatchObject(
        {
          status: 409,
        },
      );

      expect(addExecutionJob).not.toHaveBeenCalled();
    });

    it("should handle queue failures", async () => {
      findUserSubmissionById.mockResolvedValue(submission);

      addExecutionJob.mockRejectedValue(new Error("Redis unavailable"));

      await expect(queueSubmission(submissionId, userId)).rejects.toMatchObject(
        {
          message: "Failed to queue submission for execution.",
          status: 503,
        },
      );
    });
  });

  describe("getSubmissionResults", () => {
    it("should return submission and test results", async () => {
      const testResults = [
        {
          id: "result-1",
          submission_id: submissionId,
          status: "passed",
        },
      ];

      findUserSubmissionById.mockResolvedValue(submission);
      getPublicSubmissionTestResults.mockResolvedValue(testResults);

      const result = await getSubmissionResults(submissionId, userId);

      expect(findUserSubmissionById).toHaveBeenCalledWith(submissionId, userId);

      expect(getPublicSubmissionTestResults).toHaveBeenCalledWith(
        submissionId,
      );

      expect(result).toEqual({
        submission,
        testResults,
      });
    });

    it("should reject when submission does not exist", async () => {
      findUserSubmissionById.mockResolvedValue(null);

      await expect(
        getSubmissionResults(submissionId, userId),
      ).rejects.toMatchObject({
        status: 404,
      });

      expect(getPublicSubmissionTestResults).not.toHaveBeenCalled();
    });

    it("should reject unauthorized users", async () => {
      findUserSubmissionById.mockResolvedValue({
        ...submission,
        user_id: "another-user",
      });

      await expect(
        getSubmissionResults(submissionId, userId),
      ).rejects.toMatchObject({
        status: 403,
      });

      expect(getPublicSubmissionTestResults).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      findUserSubmissionById.mockResolvedValue(submission);

      getPublicSubmissionTestResults.mockRejectedValue(
        new Error("Database unavailable"),
      );

      await expect(getSubmissionResults(submissionId, userId)).rejects.toThrow(
        "Database unavailable",
      );
    });
  });
});
