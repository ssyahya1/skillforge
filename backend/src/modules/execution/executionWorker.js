import { Worker } from "bullmq";
import { redisConnection } from "./executionQueue.js";
import * as executionRepository from "./executionRepository.js";
import * as judge0Client from "./judge0Client.js";

const STALLED_JOB_FAILURE = "job stalled more than allowable limit";

export function determineOverallStatus(
  testResults,
  compilationError = null,
  internalError = null,
) {
  if (internalError) {
    return "internal_error";
  }

  if (compilationError) {
    return "compilation_error";
  }

  const hasInternalError = testResults.some(
    (t) => t.isInternalError || t.status === "internal_error",
  );
  if (hasInternalError) return "internal_error";

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

  return "internal_error";
}

async function terminalizeAmbiguousExecution(
  submissionId,
  testCase,
  errorMessage,
) {
  let persistenceFailed = false;
  let submission = null;

  try {
    await executionRepository.markSubmissionTestExecutionAmbiguous(
      submissionId,
      testCase.id,
      testCase.display_order ?? 0,
      errorMessage,
    );
  } catch (error) {
    persistenceFailed = true;
    console.error(
      `[ExecutionWorker] Could not persist ambiguous Judge0 checkpoint for submission ${submissionId}:`,
      error.message,
    );
  }

  try {
    submission = await executionRepository.markSubmissionExecutionFailure(
      submissionId,
      errorMessage,
      true,
    );
  } catch (error) {
    persistenceFailed = true;
    console.error(
      `[ExecutionWorker] Could not persist ambiguous execution status for submission ${submissionId}:`,
      error.message,
    );
  }

  return {
    submissionId,
    status: submission?.status ?? "unknown",
    ambiguous: true,
    ...(persistenceFailed ? { persistenceFailed: true } : {}),
  };
}

export async function processExecutionJob(job) {
  const { submissionId } = job.data;

  const releaseExecutionLock =
    await executionRepository.acquireSubmissionExecutionLock(submissionId);
  if (!releaseExecutionLock) {
    return {
      skipped: true,
      reason: "Submission is already being executed.",
    };
  }

  let claimed = null;
  let activeTestCase = null;
  try {
    claimed = await executionRepository.claimSubmission(submissionId);
    if (!claimed) {
      return {
        skipped: true,
        reason: "Submission already processed or not queued.",
      };
    }

    if (claimed.ineligible) {
      return {
        skipped: true,
        reason: claimed.error_message,
      };
    }

    const submission =
      await executionRepository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    if (submission.status === "cancelled") {
      return {
        skipped: true,
        reason: "Submission cancelled.",
      };
    }

    const testCases = await executionRepository.getExecutionTestCases(
      claimed.exercise_id,
    );

    if (testCases.length === 0) {
      const errorMessage = "No test cases configured for this exercise";
      const finalized =
        await executionRepository.finalizeSubmissionWithProgress({
          submissionId,
          userId: submission.user_id,
          exerciseId: claimed.exercise_id,
          overallStatus: "internal_error",
          executionTimeMs: 0,
          memoryUsedKb: 0,
          errorMessage,
          testResults: [],
        });

      return {
        submissionId,
        status: finalized?.status ?? "internal_error",
        errorMessage,
        testResultsCount: 0,
      };
    }

    const testResults = [];
    let compilationError = null;
    let internalError = null;
    let maxExecutionTimeMs = 0;
    let maxMemoryUsedKb = 0;
    let hasCompletedCheckpoint = false;

    for (const testCase of testCases) {
      activeTestCase = testCase;
      let checkpoint =
        await executionRepository.getSubmissionTestExecutionCheckpoint(
          submissionId,
          testCase.id,
        );
      let judgeResult;

      if (!checkpoint) {
        if (
          claimed.previous_status === "processing" &&
          !hasCompletedCheckpoint
        ) {
          return await terminalizeAmbiguousExecution(
            submissionId,
            testCase,
            "Execution restarted without a durable Judge0 checkpoint; the remote outcome is unknown.",
          );
        }

        checkpoint =
          await executionRepository.beginSubmissionTestExecution({
            submissionId,
            testCaseId: testCase.id,
            displayOrder: testCase.display_order ?? 0,
          });
        if (!checkpoint) {
          throw new Error("Could not create the Judge0 execution checkpoint.");
        }

        judgeResult = await judge0Client.submitToJudge0({
          sourceCode: submission.source_code,
          language: submission.language,
          stdin: testCase.input_data,
          expectedOutput: testCase.expected_output,
          onSubmissionToken: (token) =>
            executionRepository.saveJudge0SubmissionToken(
              submissionId,
              testCase.id,
              token,
            ),
        });

        await executionRepository.completeSubmissionTestExecution(
          submissionId,
          testCase.id,
          judgeResult,
        );
      } else if (checkpoint.state === "completed" && checkpoint.result) {
        judgeResult = checkpoint.result;
      } else if (
        checkpoint.state === "submitted" &&
        checkpoint.judge0_token
      ) {
        judgeResult = await judge0Client.pollSubmission(
          checkpoint.judge0_token,
        );
        await executionRepository.completeSubmissionTestExecution(
          submissionId,
          testCase.id,
          judgeResult,
        );
      } else {
        return await terminalizeAmbiguousExecution(
          submissionId,
          testCase,
          "Execution restarted after Judge0 may have accepted the submission; the remote outcome is unknown.",
        );
      }

      hasCompletedCheckpoint = true;

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

      if (parsedStatus === "internal_error") {
        internalError =
          judgeResult?.message ||
          judgeResult?.stderr ||
          "Internal execution error occurred.";

        testResults.push({
          testCaseId: testCase.id,
          displayOrder: testCase.display_order ?? 0,
          status: "failed",
          isInternalError: true,
          executionTimeMs,
          actualOutput: judgeResult?.stdout
            ? { stdout: judgeResult.stdout }
            : null,
          errorMessage: internalError,
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
        status: parsedStatus,
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

    const overallStatus = determineOverallStatus(
      testResults,
      compilationError,
      internalError,
    );

    const finalErrorMessage =
      compilationError ||
      internalError ||
      (overallStatus !== "accepted"
        ? testResults[testResults.length - 1]?.errorMessage
        : null);

    const finalized =
      await executionRepository.finalizeSubmissionWithProgress({
        submissionId,
        userId: submission.user_id,
        exerciseId: claimed.exercise_id,
        overallStatus,
        executionTimeMs: maxExecutionTimeMs,
        memoryUsedKb: maxMemoryUsedKb,
        errorMessage: finalErrorMessage,
        testResults,
      });

    return {
      submissionId,
      status: finalized?.status ?? overallStatus,
      testResultsCount: testResults.length,
    };
  } catch (error) {
    if (claimed) {
      if (
        error.code === "JUDGE0_POST_TIMEOUT" ||
        error.code === "JUDGE0_POST_AMBIGUOUS"
      ) {
        const errorMessage =
          error.code === "JUDGE0_POST_TIMEOUT"
            ? "Judge0 timed out after submission; execution outcome is unknown."
            : "Judge0 accepted the submission without a usable token; execution outcome is unknown.";

        return await terminalizeAmbiguousExecution(
          submissionId,
          activeTestCase,
          errorMessage,
        );
      }

      const attempts = Number(job.opts?.attempts ?? 1);
      const attemptsMade = Number(job.attemptsMade ?? 0);

      try {
        await executionRepository.markSubmissionExecutionFailure(
          submissionId,
          error.message,
          attemptsMade + 1 >= attempts,
        );
      } catch (failureError) {
        throw new AggregateError(
          [error, failureError],
          "Execution failed and submission retry state could not be saved",
        );
      }
    }

    throw error;
  } finally {
    await releaseExecutionLock();
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

    if (err.message !== STALLED_JOB_FAILURE) {
      return;
    }

    const submissionId = job?.data?.submissionId;
    if (!submissionId) {
      console.error(
        "[ExecutionWorker] Stalled execution job has no submission ID.",
      );
      return;
    }

    executionRepository
      .markSubmissionExecutionFailure(
        submissionId,
        "Execution worker stopped before the submission completed.",
        true,
      )
      .catch((error) => {
        console.error(
          `[ExecutionWorker] Could not persist terminal stalled state for submission ${submissionId}:`,
          error.message,
        );
      });
  });

  return worker;
}

export async function closeExecutionWorker(worker) {
  if (worker) {
    await worker.close();
  }
}
