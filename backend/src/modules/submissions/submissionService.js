import * as submissionRepository from "./submissionRepository.js";
import * as exerciseRepository from "../exercises/exerciseRepository.js";

export const createSubmissionService = async (
  userId,
  exerciseId,
  submissionData,
) => {
  const { languageId, sourceCode, idempotencyKey } = submissionData;

  const exercise = await exerciseRepository.findExerciseById(exerciseId);

  if (!exercise) {
    throw new Error("Exercise not found");
  }

  if (exercise.status !== "published") {
    throw new Error("Exercise is not published");
  }

  const language = await exerciseRepository.findExerciseLanguageById(
    exerciseId,
    languageId,
  );

  if (!language) {
    throw new Error("Language not found");
  }

  if (idempotencyKey) {
    const existingSubmission =
      await submissionRepository.findSubmissionByIdempotencyKey(
        userId,
        idempotencyKey,
      );

    if (existingSubmission) {
      const isSameRequest =
        existingSubmission.exercise_id === exerciseId &&
        existingSubmission.language_id === languageId &&
        existingSubmission.source_code === sourceCode;

      if (!isSameRequest) {
        const conflictError = new Error(
          "Idempotency key was already used for a different submission.",
        );
        conflictError.status = 409;
        throw conflictError;
      }

      return existingSubmission;
    }
  }

  const trustedSubmissionData = {
    exerciseId,
    languageId,
    idempotencyKey,
    sourceCode,
    language: language.language,
    runtimeVersion: language.runtime_version,
    executionMode: language.execution_mode,
    entryPoint: language.entry_point,
  };

  try {
    const submission = await submissionRepository.createSubmission(
      userId,
      trustedSubmissionData,
    );
    if (!submission) {
      const error = new Error(
        "You must be actively enrolled and complete the lesson content before submitting an exercise.",
      );
      error.status = 403;
      throw error;
    }

    return submission;
  } catch (error) {
    const isIdempotencyConflict =
      error.code === "23505" &&
      error.constraint === "submissions_user_idempotency_unique";

    if (!isIdempotencyConflict || !idempotencyKey) {
      throw error;
    }

    const existingSubmission =
      await submissionRepository.findSubmissionByIdempotencyKey(
        userId,
        idempotencyKey,
      );

    if (!existingSubmission) {
      throw error;
    }

    const isSameRequest =
      existingSubmission.exercise_id === exerciseId &&
      existingSubmission.language_id === languageId &&
      existingSubmission.source_code === sourceCode;

    if (!isSameRequest) {
      const conflictError = new Error(
        "Idempotency key was already used for a different submission.",
      );
      conflictError.status = 409;
      throw conflictError;
    }

    return existingSubmission;
  }
};
export const getSubmissionHistoryService = async (
  userId,
  exerciseId,
  pagination,
) => {
  const { page = 1, limit = 10 } = pagination;

  const exercise = await exerciseRepository.findExerciseById(exerciseId);

  if (!exercise) {
    throw new Error("Exercise not found.");
  }
  if (exercise.status !== "published") {
    throw new Error("Exercise is not published.");
  }
  const submissions = await submissionRepository.getUserSubmissions(
    userId,
    exerciseId,
    page,
    limit,
  );
  const totalSubmissions = await submissionRepository.countUserSubmissions(
    userId,
    exerciseId,
  );
  const totalPages = Math.ceil(totalSubmissions / limit);
  return {
    submissions,
    pagination: {
      page,
      limit,
      totalSubmissions,
      totalPages,
    },
  };
};
export const getSubmissionDetailsService = async (userId, submissionId) => {
  const submission =
    await submissionRepository.findSubmissionDetailsById(userId, submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }
  if (submission.user_id !== userId) {
    throw new Error("You do not have permission to view this submission.");
  }
  const testResults =
    await submissionRepository.getPublicSubmissionTestResults(submissionId);
  const sanitizedTestResults = testResults.map((result) => ({
    id: result.id,
    display_order: result.display_order,
    status: result.status,
    execution_time_ms: result.execution_time_ms,
    error_message: result.error_message,
  }));
  return {
    ...submission,
    testResults: sanitizedTestResults,
  };
};
export const revealSolutionService = async (userId, exerciseId, languageId) => {
  const exercise = await exerciseRepository.findExerciseById(exerciseId);

  if (!exercise) {
    throw new Error("Exercise not found.");
  }
  if (exercise.status !== "published") {
    throw new Error("Exercise is not published.");
  }
  const language = await exerciseRepository.findExerciseLanguageById(
    exerciseId,
    languageId,
  );
  if (!language) {
    throw new Error("Language not found.");
  }
  const hasRevealedSolution =
    await submissionRepository.hasUserRevealedSolution(
      userId,
      exerciseId,
      languageId,
    );
  if (!hasRevealedSolution) {
    const failedSubmissionsCount =
      await submissionRepository.countUserFailedSubmissions(
        userId,
        exerciseId,
        languageId,
      );

    if (failedSubmissionsCount < 2) {
      throw new Error(
        "You must have at least 2 failed submissions before revealing the solution.",
      );
    }
  }

  const solution = await exerciseRepository.getExerciseSolution(
    exerciseId,
    languageId,
  );
  if (!solution) {
    throw new Error("Solution not found.");
  }
  if (!hasRevealedSolution) {
    await submissionRepository.createSolutionReveal(
      userId,
      exerciseId,
      languageId,
    );
  }
  return {
    solution,
  };
};
