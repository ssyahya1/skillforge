import { beforeEach, describe, expect, it, vi } from "vitest";
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../../src/database/pool.js", () => ({
  pool: {
    query: mockQuery,
  },
}));
import {
  createSubmission,
  findSubmissionById,
  findSubmissionByIdempotencyKey,
  findSubmissionDetailsById,
  getUserSubmissions,
  countUserSubmissions,
  updateSubmission,
  createSubmissionTestResult,
  getSubmissionTestResults,
  countUserFailedSubmissions,
  createSolutionReveal,
  hasUserRevealedSolution,
} from "../../src/modules/submissions/submissionRepository.js";

describe("Submission Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSubmission", () => {
    it("should create a submission and return it", async () => {
      const submissionData = {
        exerciseId: "exercise-1",
        languageId: "language-1",
        idempotencyKey: "key-1",
        sourceCode: "console.log('Hello')",
        language: "javascript",
        runtimeVersion: "22",
        executionMode: "stdin",
        entryPoint: null,
      };

      const mockSubmission = {
        id: "submission-1",
        user_id: "user-1",
        exercise_id: "exercise-1",
        status: "queued",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockSubmission],
      });

      const result = await createSubmission("user-1", submissionData);

      expect(result).toEqual(mockSubmission);
      expect(mockQuery).toHaveBeenCalledOnce();
      expect(mockQuery.mock.calls[0][1]).toEqual([
        "user-1",
        "exercise-1",
        "language-1",
        "key-1",
        "console.log('Hello')",
        "javascript",
        "22",
        "stdin",
        null,
      ]);
    });
  });

  describe("findSubmissionById", () => {
    it("should return a submission when found", async () => {
      const mockSubmission = { id: "submission-1" };

      mockQuery.mockResolvedValueOnce({
        rows: [mockSubmission],
      });

      const result = await findSubmissionById("submission-1");

      expect(result).toEqual(mockSubmission);
    });

    it("should return null when submission does not exist", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findSubmissionById("unknown-id");

      expect(result).toBeNull();
    });
  });
  describe("findSubmissionByIdempotencyKey", () => {
    it("should return a submission when the key exists", async () => {
      const mockSubmission = {
        id: "submission-1",
        user_id: "user-1",
        idempotency_key: "key-1",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockSubmission],
      });

      const result = await findSubmissionByIdempotencyKey("user-1", "key-1");

      expect(result).toEqual(mockSubmission);
      expect(mockQuery.mock.calls[0][1]).toEqual(["user-1", "key-1"]);
    });

    it("should return null when the key does not exist", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findSubmissionByIdempotencyKey(
        "user-1",
        "unknown-key",
      );

      expect(result).toBeNull();
    });
  });
  describe("findSubmissionDetailsById", () => {
    it("should return submission details including source code", async () => {
      const mockSubmission = {
        id: "submission-1",
        source_code: "console.log('Hello')",
        status: "accepted",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockSubmission],
      });

      const result = await findSubmissionDetailsById("submission-1");

      expect(result).toEqual(mockSubmission);
      expect(mockQuery.mock.calls[0][1]).toEqual(["submission-1"]);
    });

    it("should return null when submission details do not exist", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findSubmissionDetailsById("unknown-id");

      expect(result).toBeNull();
    });
  });
  describe("getUserSubmissions", () => {
    it("should return paginated submissions", async () => {
      const mockSubmissions = [{ id: "submission-1" }, { id: "submission-2" }];

      mockQuery.mockResolvedValueOnce({
        rows: mockSubmissions,
      });

      const result = await getUserSubmissions("user-1", "exercise-1", 2, 10);

      expect(result).toEqual(mockSubmissions);
      expect(mockQuery.mock.calls[0][1]).toEqual([
        "user-1",
        "exercise-1",
        10,
        10,
      ]);
    });
  });

  describe("countUserSubmissions", () => {
    it("should return the total submission count", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: "15" }],
      });

      const result = await countUserSubmissions("user-1", "exercise-1");

      expect(result).toBe(15);
    });
  });

  describe("updateSubmission", () => {
    it("should update submission fields", async () => {
      const updatedSubmission = {
        id: "submission-1",
        status: "accepted",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedSubmission],
      });

      const result = await updateSubmission("submission-1", {
        status: "accepted",
        executionTimeMs: 120,
      });

      expect(result).toEqual(updatedSubmission);
      expect(mockQuery).toHaveBeenCalledOnce();
    });

    it("should reject an update containing no valid fields", async () => {
      await expect(
        updateSubmission("submission-1", {
          invalidField: "value",
        }),
      ).rejects.toThrow("No valid fields provided for update.");
    });
  });

  describe("createSubmissionTestResult", () => {
    it("should insert and return a test result", async () => {
      const testResult = {
        testCaseId: "test-1",
        displayOrder: 1,
        status: "passed",
        executionTimeMs: 50,
        actualOutput: { result: 10 },
        errorMessage: null,
      };

      const mockResult = {
        id: "result-1",
        submission_id: "submission-1",
        status: "passed",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockResult],
      });

      const result = await createSubmissionTestResult(
        "submission-1",
        testResult,
      );

      expect(result).toEqual(mockResult);
      expect(mockQuery).toHaveBeenCalledOnce();
    });
  });

  describe("getSubmissionTestResults", () => {
    it("should return test results in display order", async () => {
      const mockResults = [
        { display_order: 1, status: "passed" },
        { display_order: 2, status: "failed" },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockResults,
      });

      const result = await getSubmissionTestResults("submission-1");

      expect(result).toEqual(mockResults);
    });
  });

  describe("countUserFailedSubmissions", () => {
    it("should return the failed submission count", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: "2" }],
      });

      const result = await countUserFailedSubmissions(
        "user-1",
        "exercise-1",
        "language-1",
      );

      expect(result).toBe(2);
      expect(mockQuery.mock.calls[0][1]).toEqual([
        "user-1",
        "exercise-1",
        "language-1",
      ]);
    });
  });

  describe("createSolutionReveal", () => {
    it("should record a solution reveal", async () => {
      const mockReveal = {
        id: "reveal-1",
        user_id: "user-1",
        exercise_id: "exercise-1",
        language_id: "language-1",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockReveal],
      });

      const result = await createSolutionReveal(
        "user-1",
        "exercise-1",
        "language-1",
      );

      expect(result).toEqual(mockReveal);
    });
  });

  describe("hasUserRevealedSolution", () => {
    it("should return true when a solution was revealed", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ revealed: true }],
      });

      const result = await hasUserRevealedSolution(
        "user-1",
        "exercise-1",
        "language-1",
      );

      expect(result).toBe(true);
    });

    it("should return false when no solution was revealed", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ revealed: false }],
      });

      const result = await hasUserRevealedSolution(
        "user-1",
        "exercise-1",
        "language-1",
      );

      expect(result).toBe(false);
    });
  });
});

