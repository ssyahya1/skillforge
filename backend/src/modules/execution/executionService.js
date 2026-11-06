import * as executionRepository from "./executionRepository.js";
import * as executionQueue from "./executionQueue.js";

export const queueSubmission = async (submissionId, userId) => {
  const submission = await executionRepository.findSubmissionById(submissionId);

  if (!submission) {
    const error = new Error("Submission not found.");
    error.status = 404;
    throw error;
  }

  if (submission.user_id !== userId) {
    const error = new Error(
      "You are not authorized to execute this submission.",
    );
    error.status = 403;
    throw error;
  }

  if (submission.status !== "queued") {
    const error = new Error(
      "Only queued submissions can be sent for execution.",
    );
    error.status = 409;
    throw error;
  }

  try {
    const job = await executionQueue.addExecutionJob({
      submissionId: submission.id,
    });

    return {
      submissionId: submission.id,
      jobId: job.id,
      status: submission.status,
      message: "Submission added to the execution queue.",
    };
  } catch (err) {
    const error = new Error("Failed to queue submission for execution.");
    error.status = 503;
    throw error;
  }
};

export const getSubmissionResults = async (submissionId, userId) => {
  const submission = await executionRepository.findSubmissionById(submissionId);

  if (!submission) {
    const error = new Error("Submission not found.");
    error.status = 404;
    throw error;
  }

  if (submission.user_id !== userId) {
    const error = new Error("You are not authorized to view this submission.");
    error.status = 403;
    throw error;
  }

  const testResults =
    await executionRepository.getSubmissionTestResults(submissionId);

  return {
    submission,
    testResults,
  };
};
