import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  claimSubmission,
  findSubmissionById,
  getExecutionTestCases,
  saveSubmissionExecution,
  saveTestResults,
  updateSubmissionStatus,
  submitToJudge0,
  parseJudge0Status,
  Worker,
} = vi.hoisted(() => ({
  claimSubmission: vi.fn(),
  findSubmissionById: vi.fn(),
  getExecutionTestCases: vi.fn(),
  saveSubmissionExecution: vi.fn(),
  saveTestResults: vi.fn(),
  updateSubmissionStatus: vi.fn(),
  submitToJudge0: vi.fn(),
  parseJudge0Status: vi.fn(),
  Worker: vi.fn(function (queueName, processor, opts) {
    this.queueName = queueName;
    this.processor = processor;
    this.opts = opts;
    this.on = vi.fn();
    this.close = vi.fn().mockResolvedValue(undefined);
  }),
}));

vi.mock("../../src/modules/execution/executionRepository.js", () => ({
  claimSubmission,
  findSubmissionById,
  getExecutionTestCases,
  saveSubmissionExecution,
  saveTestResults,
  updateSubmissionStatus,
}));

vi.mock("../../src/modules/execution/judge0Client.js", () => ({
  submitToJudge0,
  parseJudge0Status,
}));

vi.mock("bullmq", () => ({
  Worker,
}));

vi.mock("../../src/modules/execution/executionQueue.js", () => ({
  redisConnection: { quit: vi.fn() },
}));

import {
  determineOverallStatus,
  processExecutionJob,
  createExecutionWorker,
  closeExecutionWorker,
} from "../../src/modules/execution/executionWorker.js";

describe("executionWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("determineOverallStatus", () => {
    it("should return compilation_error when compilation error exists", () => {
      expect(determineOverallStatus([], "Syntax error")).toBe(
        "compilation_error",
      );
    });

    it("should prioritize time_limit_exceeded", () => {
      const results = [{ status: "passed" }, { status: "time_limit_exceeded" }];
      expect(determineOverallStatus(results)).toBe("time_limit_exceeded");
    });

    it("should return memory_limit_exceeded when present", () => {
      const results = [
        { status: "passed" },
        { status: "memory_limit_exceeded" },
      ];
      expect(determineOverallStatus(results)).toBe("memory_limit_exceeded");
    });

    it("should return runtime_error when present", () => {
      const results = [{ status: "passed" }, { status: "runtime_error" }];
      expect(determineOverallStatus(results)).toBe("runtime_error");
    });

    it("should return wrong_answer when a test case failed", () => {
      const results = [{ status: "passed" }, { status: "failed" }];
      expect(determineOverallStatus(results)).toBe("wrong_answer");
    });

    it("should return accepted when all test cases passed", () => {
      const results = [{ status: "passed" }, { status: "passed" }];
      expect(determineOverallStatus(results)).toBe("accepted");
    });
  });

  describe("processExecutionJob", () => {
    const job = { data: { submissionId: "sub-123" } };
    const mockSubmission = {
      id: "sub-123",
      exercise_id: "ex-456",
      source_code: "print('hello')",
      language: "python",
    };

    it("should skip if submission cannot be claimed", async () => {
      claimSubmission.mockResolvedValue(null);

      const result = await processExecutionJob(job);

      expect(claimSubmission).toHaveBeenCalledWith("sub-123");
      expect(result).toEqual({
        skipped: true,
        reason: "Submission already processed or not queued.",
      });
      expect(findSubmissionById).not.toHaveBeenCalled();
    });

    it("should accept submission immediately if exercise has no test cases", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockResolvedValue(mockSubmission);
      getExecutionTestCases.mockResolvedValue([]);

      const result = await processExecutionJob(job);

      expect(saveSubmissionExecution).toHaveBeenCalledWith("sub-123", {
        status: "accepted",
        executionTimeMs: 0,
        memoryUsedKb: 0,
        errorMessage: null,
      });

      expect(result).toEqual({
        submissionId: "sub-123",
        status: "accepted",
        testResultsCount: 0,
      });
    });

    it("should run all test cases and mark accepted when all pass", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockResolvedValue(mockSubmission);

      const testCases = [
        { id: "tc-1", input_data: "1", expected_output: "2", display_order: 0 },
        { id: "tc-2", input_data: "2", expected_output: "4", display_order: 1 },
      ];
      getExecutionTestCases.mockResolvedValue(testCases);

      submitToJudge0
        .mockResolvedValueOnce({
          time: "0.05",
          memory: 1024,
          stdout: "2",
        })
        .mockResolvedValueOnce({
          time: "0.08",
          memory: 2048,
          stdout: "4",
        });

      parseJudge0Status
        .mockReturnValueOnce("passed")
        .mockReturnValueOnce("passed");

      const result = await processExecutionJob(job);

      expect(submitToJudge0).toHaveBeenCalledTimes(2);
      expect(saveTestResults).toHaveBeenCalledWith("sub-123", [
        {
          testCaseId: "tc-1",
          displayOrder: 0,
          status: "passed",
          executionTimeMs: 50,
          actualOutput: { stdout: "2" },
          errorMessage: null,
        },
        {
          testCaseId: "tc-2",
          displayOrder: 1,
          status: "passed",
          executionTimeMs: 80,
          actualOutput: { stdout: "4" },
          errorMessage: null,
        },
      ]);

      expect(saveSubmissionExecution).toHaveBeenCalledWith("sub-123", {
        status: "accepted",
        executionTimeMs: 80,
        memoryUsedKb: 2048,
        errorMessage: null,
      });

      expect(result.status).toBe("accepted");
    });

    it("should handle compilation errors and break early", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockResolvedValue(mockSubmission);

      const testCases = [
        { id: "tc-1", input_data: "1", expected_output: "2", display_order: 0 },
        { id: "tc-2", input_data: "2", expected_output: "4", display_order: 1 },
      ];
      getExecutionTestCases.mockResolvedValue(testCases);

      submitToJudge0.mockResolvedValueOnce({
        time: "0.01",
        memory: 512,
        compile_output: "SyntaxError: Unexpected token",
      });

      parseJudge0Status.mockReturnValueOnce("compilation_error");

      const result = await processExecutionJob(job);

      expect(submitToJudge0).toHaveBeenCalledTimes(1);
      expect(saveSubmissionExecution).toHaveBeenCalledWith("sub-123", {
        status: "compilation_error",
        executionTimeMs: 10,
        memoryUsedKb: 512,
        errorMessage: "SyntaxError: Unexpected token",
      });

      expect(result.status).toBe("compilation_error");
    });

    it("should handle unexpected error by setting internal_error and rethrowing", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockRejectedValue(new Error("DB connection lost"));

      await expect(processExecutionJob(job)).rejects.toThrow(
        "DB connection lost",
      );

      expect(updateSubmissionStatus).toHaveBeenCalledWith(
        "sub-123",
        "internal_error",
        "DB connection lost",
      );
    });
  });

  describe("createExecutionWorker and closeExecutionWorker", () => {
    it("should instantiate worker with correct queue and connection", () => {
      const worker = createExecutionWorker({ concurrency: 5 });
      expect(Worker).toHaveBeenCalledWith(
        "skillforge-execution",
        processExecutionJob,
        expect.objectContaining({
          concurrency: 5,
        }),
      );
      expect(worker).toBeDefined();
    });

    it("should close worker gracefully", async () => {
      const mockWorker = { close: vi.fn().mockResolvedValue(undefined) };
      await closeExecutionWorker(mockWorker);
      expect(mockWorker.close).toHaveBeenCalledOnce();
    });
  });
});
