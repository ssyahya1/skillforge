import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, connect, clientQuery, release } = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));
vi.mock("../../src/database/pool.js", () => ({
  pool: {
    query,
    connect,
  },
}));

import * as executionRepository from "../../../src/modules/execution/executionRepository.js";

describe("Execution Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    connect.mockResolvedValue({
      query: clientQuery,
      release,
    });
  });

  describe("findSubmissionById", () => {
    it("should return a submission by ID", async () => {
      const submission = {
        id: "submission-1",
        status: "queued",
      };

      query.mockResolvedValue({
        rows: [submission],
      });

      const result =
        await executionRepository.findSubmissionById("submission-1");

      expect(result).toEqual(submission);
      expect(query).toHaveBeenCalledOnce();
    });

    it("should return null when submission does not exist", async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await executionRepository.findSubmissionById("unknown-id");

      expect(result).toBeNull();
    });
  });

  describe("findQueuedSubmission", () => {
    it("should return a queued submission", async () => {
      const submission = {
        id: "submission-1",
        status: "queued",
      };

      query.mockResolvedValue({
        rows: [submission],
      });

      const result =
        await executionRepository.findQueuedSubmission("submission-1");

      expect(result).toEqual(submission);
      expect(query.mock.calls[0][0]).toContain("status = 'queued'");
    });

    it("should return null for a non-queued submission", async () => {
      query.mockResolvedValue({ rows: [] });

      const result =
        await executionRepository.findQueuedSubmission("submission-1");

      expect(result).toBeNull();
    });
  });

  describe("claimSubmission", () => {
    it("should atomically claim a queued submission", async () => {
      const claimed = {
        id: "submission-1",
        status: "processing",
      };

      query.mockResolvedValue({
        rows: [claimed],
      });

      const result = await executionRepository.claimSubmission("submission-1");

      expect(result).toEqual(claimed);
      expect(query.mock.calls[0][0]).toContain("status = 'queued'");
    });

    it("should return null if another worker already claimed it", async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await executionRepository.claimSubmission("submission-1");

      expect(result).toBeNull();
    });
  });

  describe("getExecutionTestCases", () => {
    it("should return test cases ordered by display order", async () => {
      const testCases = [
        { id: "test-1", display_order: 0 },
        { id: "test-2", display_order: 1 },
      ];

      query.mockResolvedValue({
        rows: testCases,
      });

      const result =
        await executionRepository.getExecutionTestCases("exercise-1");

      expect(result).toEqual(testCases);
      expect(query.mock.calls[0][0]).toContain("ORDER BY display_order ASC");
    });

    it("should return an empty array when no test cases exist", async () => {
      query.mockResolvedValue({ rows: [] });

      const result =
        await executionRepository.getExecutionTestCases("exercise-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateSubmissionStatus", () => {
    it("should update submission status", async () => {
      const updated = {
        id: "submission-1",
        status: "processing",
      };

      query.mockResolvedValue({
        rows: [updated],
      });

      const result = await executionRepository.updateSubmissionStatus(
        "submission-1",
        "processing",
      );

      expect(result).toEqual(updated);
    });

    it("should return null when submission does not exist", async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await executionRepository.updateSubmissionStatus(
        "unknown-id",
        "internal_error",
      );

      expect(result).toBeNull();
    });
  });

  describe("saveSubmissionExecution", () => {
    it("should save final execution metrics", async () => {
      const execution = {
        id: "submission-1",
        status: "accepted",
        execution_time_ms: 120,
        memory_used_kb: 2048,
      };

      query.mockResolvedValue({
        rows: [execution],
      });

      const result = await executionRepository.saveSubmissionExecution(
        "submission-1",
        {
          status: "accepted",
          executionTimeMs: 120,
          memoryUsedKb: 2048,
        },
      );

      expect(result).toEqual(execution);
    });
  });

  describe("saveTestResults", () => {
    it("should save test results inside a transaction", async () => {
      clientQuery.mockResolvedValue({ rows: [] });

      const testResults = [
        {
          testCaseId: "test-1",
          displayOrder: 0,
          status: "passed",
          executionTimeMs: 50,
          actualOutput: { result: 10 },
        },
      ];

      const result = await executionRepository.saveTestResults(
        "submission-1",
        testResults,
      );

      expect(result).toBe(1);
      expect(clientQuery).toHaveBeenCalledWith("BEGIN");
      expect(clientQuery).toHaveBeenCalledWith("COMMIT");
      expect(release).toHaveBeenCalledOnce();
    });

    it("should rollback when inserting test results fails", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("Database error"));

      await expect(
        executionRepository.saveTestResults("submission-1", [
          {
            testCaseId: "test-1",
            displayOrder: 0,
            status: "passed",
          },
        ]),
      ).rejects.toThrow("Database error");

      expect(clientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(release).toHaveBeenCalledOnce();
    });
  });

  describe("getSubmissionTestResults", () => {
    it("should return all test results", async () => {
      const results = [
        { id: "result-1", status: "passed" },
        { id: "result-2", status: "failed" },
      ];

      query.mockResolvedValue({ rows: results });

      const result =
        await executionRepository.getSubmissionTestResults("submission-1");

      expect(result).toEqual(results);
    });
  });

  describe("getPublicSubmissionTestResults", () => {
    it("should retrieve only public test results", async () => {
      query.mockResolvedValue({
        rows: [{ id: "result-1", status: "passed" }],
      });

      const result =
        await executionRepository.getPublicSubmissionTestResults(
          "submission-1",
        );

      expect(result).toHaveLength(1);
      expect(query.mock.calls[0][0]).toContain(
        "test_case.visibility = 'public'",
      );
    });
  });
});
