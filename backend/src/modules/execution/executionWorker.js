import { Worker } from "bullmq";
import { redisConnection } from "./executionQueue.js";
import * as executionRepository from "./executionRepository.js";
import * as judge0Client from "./judge0Client.js";

export function determineOverallStatus(testResults, compilationError = null) {
  if (compilationError) {
    return "compilation_error";
  }

  const hasTle = testResults.some((t) => t.status === "time_limit_exceeded");
  if (hasTle) return "time_limit_exceeded";

  const hasMle = testResults.some((t) => t.status === "memory_limit_exceeded");
  if (hasMle) return "memory_limit_exceeded";

  const hasRuntimeError = testResults.some((t) => t.status === "runtime_error");
  if (hasRuntimeError) return "runtime_error";

  const hasWrongAnswer = testResults.some((t) => t.status === "failed");
  if (hasWrongAnswer) return "wrong_answer";

  const allPassed =
    testResults.length > 0 && testResults.every((t) => t.status === "passed");
  if (allPassed) return "accepted";

  return "accepted";
}

export async function processExecutionJob(job) {
  const { submissionId } = job.data;

  const claimed = await executionRepository.claimSubmission(submissionId);
  if (!claimed) {
    return {
      skipped: true,
      reason: "Submission already processed or not queued.",
    };
  }

  try {
    const submission =
      await executionRepository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    const testCases = await executionRepository.getExecutionTestCases(
      claimed.exercise_id,
    );

    if (testCases.length === 0) {
      await executionRepository.saveSubmissionExecution(submissionId, {
        status: "accepted",
        executionTimeMs: 0,
        memoryUsedKb: 0,
        errorMessage: null,
      });

      return {
        submissionId,
        status: "accepted",
        testResultsCount: 0,
      };
    }

    const testResults = [];
    let compilationError = null;
    let maxExecutionTimeMs = 0;
    let maxMemoryUsedKb = 0;

    for (const testCase of testCases) {
      const judgeResult = await judge0Client.submitToJudge0({
        sourceCode: submission.source_code,
        language: submission.language,
        stdin: testCase.input_data,
        expectedOutput: testCase.expected_output,
      });

      const parsedStatus = judge0Client.parseJudge0Status(judgeResult);
      const executionTimeMs = Math.round(
        parseFloat(judgeResult?.time || 0) * 1000,
      );
      const memoryUsedKb = judgeResult?.memory || 0;

      if (executionTimeMs > maxExecutionTimeMs) {
        maxExecutionTimeMs = executionTimeMs;
      }
      if (memoryUsedKb > maxMemoryUsedKb) {
        maxMemoryUsedKb = memoryUsedKb;
      }

      if (parsedStatus === "compilation_error") {
        compilationError =
          judgeResult?.compile_output ||
          judgeResult?.stderr ||
          "Compilation failed.";

        testResults.push({
          testCaseId: testCase.id,
          displayOrder: testCase.display_order ?? 0,
          status: "failed",
          executionTimeMs,
          actualOutput: judgeResult?.stdout
            ? { stdout: judgeResult.stdout }
            : null,
          errorMessage: compilationError,
        });

        break;
      }

      const errorMessage =
        parsedStatus === "passed"
          ? null
          : judgeResult?.stderr ||
            judgeResult?.compile_output ||
            judgeResult?.message;

      testResults.push({
        testCaseId: testCase.id,
        displayOrder: testCase.display_order ?? 0,
        status: parsedStatus === "internal_error" ? "failed" : parsedStatus,
        executionTimeMs,
        actualOutput: judgeResult?.stdout
          ? { stdout: judgeResult.stdout }
          : null,
        errorMessage: errorMessage || null,
      });

      if (parsedStatus !== "passed") {
        break;
      }
    }

    const overallStatus = determineOverallStatus(testResults, compilationError);

    await executionRepository.saveTestResults(submissionId, testResults);

    await executionRepository.saveSubmissionExecution(submissionId, {
      status: overallStatus,
      executionTimeMs: maxExecutionTimeMs,
      memoryUsedKb: maxMemoryUsedKb,
      errorMessage:
        compilationError ||
        (overallStatus !== "accepted"
          ? testResults[testResults.length - 1]?.errorMessage
          : null),
    });

    return {
      submissionId,
      status: overallStatus,
      testResultsCount: testResults.length,
    };
  } catch (error) {
    await executionRepository.updateSubmissionStatus(
      submissionId,
      "internal_error",
      error.message,
    );
    throw error;
  }
}

export function createExecutionWorker(options = {}) {
  const worker = new Worker("skillforge-execution", processExecutionJob, {
    connection: redisConnection,
    concurrency: options.concurrency || 2,
    ...options,
  });

  worker.on("failed", (job, err) => {
    console.error(`[ExecutionWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function closeExecutionWorker(worker) {
  if (worker) {
    await worker.close();
  }
}
