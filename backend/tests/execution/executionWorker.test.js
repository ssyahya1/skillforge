import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  acquireSubmissionExecutionLock,
  claimSubmission,
  findSubmissionById,
  getExecutionTestCases,
  saveSubmissionExecution,
  saveTestResults,
  updateSubmissionStatus,
  markSubmissionExecutionFailure,
  finalizeSubmissionWithProgress,
  submitToJudge0,
  parseJudge0Status,
  Worker,
} = vi.hoisted(() => ({
  acquireSubmissionExecutionLock: vi.fn(),
  claimSubmission: vi.fn(),
  findSubmissionById: vi.fn(),
  getExecutionTestCases: vi.fn(),
  saveSubmissionExecution: vi.fn(),
  saveTestResults: vi.fn(),
  updateSubmissionStatus: vi.fn(),
  markSubmissionExecutionFailure: vi.fn(),
  finalizeSubmissionWithProgress: vi.fn().mockResolvedValue({}),
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
  acquireSubmissionExecutionLock,
  claimSubmission,
  findSubmissionById,
  getExecutionTestCases,
  saveSubmissionExecution,
  saveTestResults,
  updateSubmissionStatus,
  markSubmissionExecutionFailure,
  finalizeSubmissionWithProgress,
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
    acquireSubmissionExecutionLock.mockResolvedValue(vi.fn());
  });

  describe("determineOverallStatus", () => {
    it("should return internal_error when internal error exists", () => {
      expect(determineOverallStatus([], null, "Judge0 failure")).toBe(
        "internal_error",
      );
    });

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

    it("should not treat empty or unknown test results as accepted", () => {
      expect(determineOverallStatus([])).toBe("internal_error");
      expect(determineOverallStatus([{ status: "pending" }])).toBe(
        "internal_error",
      );
    });
  });

  describe("processExecutionJob", () => {
    const job = { data: { submissionId: "sub-123" } };
    const mockSubmission = {
      id: "sub-123",
      user_id: "user-456",
      exercise_id: "ex-456",
      source_code: "print('hello')",
      language: "python",
      status: "processing",
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

    it("should skip duplicate jobs while another worker holds the submission lock", async () => {
      acquireSubmissionExecutionLock.mockResolvedValue(null);

      const result = await processExecutionJob(job);

      expect(result).toEqual({
        skipped: true,
        reason: "Submission is already being executed.",
      });
      expect(claimSubmission).not.toHaveBeenCalled();
    });

    it("should skip if submission is cancelled", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockResolvedValue({
        ...mockSubmission,
        status: "cancelled",
      });

      const result = await processExecutionJob(job);

      expect(result).toEqual({
        skipped: true,
        reason: "Submission cancelled.",
      });
      expect(finalizeSubmissionWithProgress).not.toHaveBeenCalled();
    });

    it("should reject zero-test exercises with internal_error", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockResolvedValue(mockSubmission);
      getExecutionTestCases.mockResolvedValue([]);

      const result = await processExecutionJob(job);

      expect(finalizeSubmissionWithProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: "sub-123",
          userId: "user-456",
          exerciseId: "ex-456",
          overallStatus: "internal_error",
          errorMessage: "No test cases configured for this exercise",
        }),
      );

      expect(result).toEqual({
        submissionId: "sub-123",
        status: "internal_error",
        errorMessage: "No test cases configured for this exercise",
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
      expect(finalizeSubmissionWithProgress).toHaveBeenCalledWith({
        submissionId: "sub-123",
        userId: "user-456",
        exerciseId: "ex-456",
        overallStatus: "accepted",
        executionTimeMs: 80,
        memoryUsedKb: 2048,
        errorMessage: null,
        testResults: [
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
        ],
      });

      expect(result.status).toBe("accepted");
    });

    it("should handle Judge0 internal errors by setting overall status to internal_error", async () => {
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockResolvedValue(mockSubmission);

      const testCases = [
        { id: "tc-1", input_data: "1", expected_output: "2", display_order: 0 },
      ];
      getExecutionTestCases.mockResolvedValue(testCases);

      submitToJudge0.mockResolvedValueOnce({
        time: "0.01",
        memory: 0,
        message: "Judge0 sandbox failed to spawn process",
      });

      parseJudge0Status.mockReturnValueOnce("internal_error");

      const result = await processExecutionJob(job);

      expect(finalizeSubmissionWithProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: "sub-123",
          overallStatus: "internal_error",
          errorMessage: "Judge0 sandbox failed to spawn process",
        }),
      );

      expect(result.status).toBe("internal_error");
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
      expect(finalizeSubmissionWithProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: "sub-123",
          overallStatus: "compilation_error",
          executionTimeMs: 10,
          memoryUsedKb: 512,
          errorMessage: "SyntaxError: Unexpected token",
        }),
      );

      expect(result.status).toBe("compilation_error");
    });

    it("should make a transient failure retryable without finalizing it as a student attempt", async () => {
      const retryJob = {
        ...job,
        opts: { attempts: 3 },
        attemptsMade: 0,
      };
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockRejectedValue(new Error("DB connection lost"));

      await expect(processExecutionJob(retryJob)).rejects.toThrow(
        "DB connection lost",
      );

      expect(markSubmissionExecutionFailure).toHaveBeenCalledWith(
        "sub-123",
        "DB connection lost",
        false,
      );
      expect(finalizeSubmissionWithProgress).not.toHaveBeenCalled();
    });

    it("marks the last transient worker failure as internal_error", async () => {
      const finalRetryJob = {
        ...job,
        opts: { attempts: 3 },
        attemptsMade: 2,
      };
      claimSubmission.mockResolvedValue({
        id: "sub-123",
        exercise_id: "ex-456",
      });
      findSubmissionById.mockRejectedValue(new Error("DB connection lost"));

      await expect(processExecutionJob(finalRetryJob)).rejects.toThrow(
        "DB connection lost",
      );

      expect(markSubmissionExecutionFailure).toHaveBeenCalledWith(
        "sub-123",
        "DB connection lost",
        true,
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
