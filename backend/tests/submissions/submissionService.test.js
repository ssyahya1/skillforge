import { beforeEach, describe, expect, it, vi } from "vitest";

import * as submissionRepository from "../../src/modules/submissions/submissionRepository.js";
import * as exerciseRepository from "../../src/modules/exercises/exerciseRepository.js";

import {
  createSubmissionService,
  getSubmissionHistoryService,
  getSubmissionDetailsService,
  revealSolutionService,
} from "../../src/modules/submissions/submissionService.js";

vi.mock("../../src/modules/submissions/submissionRepository.js", () => ({
  createSubmission: vi.fn(),
  findSubmissionByIdempotencyKey: vi.fn(),
  getUserSubmissions: vi.fn(),
  countUserSubmissions: vi.fn(),
  findSubmissionDetailsById: vi.fn(),
  getSubmissionTestResults: vi.fn(),
  hasUserRevealedSolution: vi.fn(),
  countUserFailedSubmissions: vi.fn(),
  createSolutionReveal: vi.fn(),
}));

vi.mock("../../src/modules/exercises/exerciseRepository.js", () => ({
  findExerciseById: vi.fn(),
  findExerciseLanguageById: vi.fn(),
  getExerciseSolution: vi.fn(),
}));

const userId = "user-uuid-1234";
const exerciseId = "exercise-uuid-1234";
const languageId = "language-uuid-1234";
const submissionId = "submission-uuid-1234";
const idempotencyKey = "idempotency-uuid-1234";

const publishedExercise = {
  id: exerciseId,
  status: "published",
};

const languageConfig = {
  id: languageId,
  language: "javascript",
  runtime_version: "22",
  execution_mode: "function",
  entry_point: "main",
};

const existingSubmission = {
  id: submissionId,
  user_id: userId,
  exercise_id: exerciseId,
  language_id: languageId,
  source_code: "console.log('Hello');",
  status: "queued",
};

beforeEach(() => {
  vi.clearAllMocks();

  submissionRepository.createSubmission.mockResolvedValue(existingSubmission);

  submissionRepository.findSubmissionByIdempotencyKey.mockResolvedValue(null);

  submissionRepository.getUserSubmissions.mockResolvedValue([]);
  submissionRepository.countUserSubmissions.mockResolvedValue(0);

  submissionRepository.findSubmissionDetailsById.mockResolvedValue(null);
  submissionRepository.getSubmissionTestResults.mockResolvedValue([]);

  submissionRepository.hasUserRevealedSolution.mockResolvedValue(false);
  submissionRepository.countUserFailedSubmissions.mockResolvedValue(0);
  submissionRepository.createSolutionReveal.mockResolvedValue({});

  exerciseRepository.findExerciseById.mockResolvedValue(publishedExercise);

  exerciseRepository.findExerciseLanguageById.mockResolvedValue(languageConfig);

  exerciseRepository.getExerciseSolution.mockResolvedValue(
    "console.log('Solution');",
  );
});

describe("createSubmissionService", () => {
  const submissionData = {
    languageId,
    sourceCode: "console.log('Hello');",
    idempotencyKey,
  };

  it("should create a submission successfully", async () => {
    const result = await createSubmissionService(
      userId,
      exerciseId,
      submissionData,
    );

    expect(result).toEqual(existingSubmission);

    expect(submissionRepository.createSubmission).toHaveBeenCalledWith(userId, {
      exerciseId,
      languageId,
      idempotencyKey,
      sourceCode: submissionData.sourceCode,
      language: "javascript",
      runtimeVersion: "22",
      executionMode: "function",
      entryPoint: "main",
    });
  });

  it("should throw an error if the exercise does not exist", async () => {
    exerciseRepository.findExerciseById.mockResolvedValue(null);

    await expect(
      createSubmissionService(userId, exerciseId, submissionData),
    ).rejects.toThrow("Exercise not found");

    expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
  });

  it("should throw an error if the exercise is not published", async () => {
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...publishedExercise,
      status: "draft",
    });

    await expect(
      createSubmissionService(userId, exerciseId, submissionData),
    ).rejects.toThrow("Exercise is not published");

    expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
  });

  it("should throw an error if the language does not belong to the exercise", async () => {
    exerciseRepository.findExerciseLanguageById.mockResolvedValue(null);

    await expect(
      createSubmissionService(userId, exerciseId, submissionData),
    ).rejects.toThrow("Language not found");

    expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
  });

  it("should return an existing submission for an identical idempotent request", async () => {
    submissionRepository.findSubmissionByIdempotencyKey.mockResolvedValue(
      existingSubmission,
    );

    const result = await createSubmissionService(
      userId,
      exerciseId,
      submissionData,
    );

    expect(result).toEqual(existingSubmission);
    expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
  });

  it("should reject reuse of an idempotency key for different submission data", async () => {
    submissionRepository.findSubmissionByIdempotencyKey.mockResolvedValue({
      ...existingSubmission,
      source_code: "different source code",
    });

    await expect(
      createSubmissionService(userId, exerciseId, submissionData),
    ).rejects.toThrow(
      "Idempotency key was already used for a different submission.",
    );

    expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
  });

  it("should recover when a concurrent request violates the idempotency unique constraint", async () => {
    const uniqueError = new Error("Duplicate key");
    uniqueError.code = "23505";
    uniqueError.constraint = "submissions_user_idempotency_unique";

    submissionRepository.findSubmissionByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingSubmission);

    submissionRepository.createSubmission.mockRejectedValue(uniqueError);

    const result = await createSubmissionService(
      userId,
      exerciseId,
      submissionData,
    );

    expect(result).toEqual(existingSubmission);
    expect(
      submissionRepository.findSubmissionByIdempotencyKey,
    ).toHaveBeenCalledTimes(2);
  });

  it("should rethrow unrelated database errors", async () => {
    const databaseError = new Error("Database connection failed");
    databaseError.code = "23505";
    databaseError.constraint = "some_other_constraint";

    submissionRepository.createSubmission.mockRejectedValue(databaseError);

    await expect(
      createSubmissionService(userId, exerciseId, submissionData),
    ).rejects.toBe(databaseError);
  });
});

describe("getSubmissionHistoryService", () => {
  it("should return submission history with pagination metadata", async () => {
    const submissions = [
      { id: "submission-1", status: "accepted" },
      { id: "submission-2", status: "wrong_answer" },
    ];

    submissionRepository.getUserSubmissions.mockResolvedValue(submissions);
    submissionRepository.countUserSubmissions.mockResolvedValue(25);

    const result = await getSubmissionHistoryService(userId, exerciseId, {
      page: 1,
      limit: 10,
    });

    expect(result).toEqual({
      submissions,
      pagination: {
        page: 1,
        limit: 10,
        totalSubmissions: 25,
        totalPages: 3,
      },
    });

    expect(submissionRepository.getUserSubmissions).toHaveBeenCalledWith(
      userId,
      exerciseId,
      1,
      10,
    );
  });

  it("should use default pagination values when not provided", async () => {
    await getSubmissionHistoryService(userId, exerciseId, {});

    expect(submissionRepository.getUserSubmissions).toHaveBeenCalledWith(
      userId,
      exerciseId,
      1,
      10,
    );
  });

  it("should throw an error if the exercise does not exist", async () => {
    exerciseRepository.findExerciseById.mockResolvedValue(null);

    await expect(
      getSubmissionHistoryService(userId, exerciseId, {
        page: 1,
        limit: 10,
      }),
    ).rejects.toThrow("Exercise not found");

    expect(submissionRepository.getUserSubmissions).not.toHaveBeenCalled();
  });

  it("should throw an error if the exercise is not published", async () => {
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...publishedExercise,
      status: "draft",
    });

    await expect(
      getSubmissionHistoryService(userId, exerciseId, {
        page: 1,
        limit: 10,
      }),
    ).rejects.toThrow("Exercise is not published");
  });
});

describe("getSubmissionDetailsService", () => {
  it("should return submission details with sanitized test results", async () => {
    const submission = {
      ...existingSubmission,
      source_code: "console.log('Hello');",
    };

    const testResults = [
      {
        id: "result-1",
        display_order: 1,
        status: "passed",
        execution_time_ms: 15,
        error_message: null,
        actual_output: "secret output",
      },
    ];

    submissionRepository.findSubmissionDetailsById.mockResolvedValue(
      submission,
    );

    submissionRepository.getSubmissionTestResults.mockResolvedValue(
      testResults,
    );

    const result = await getSubmissionDetailsService(userId, submissionId);

    expect(result).toEqual({
      ...submission,
      testResults: [
        {
          id: "result-1",
          display_order: 1,
          status: "passed",
          execution_time_ms: 15,
          error_message: null,
        },
      ],
    });

    expect(result.testResults[0]).not.toHaveProperty("actual_output");
  });

  it("should throw an error if the submission does not exist", async () => {
    submissionRepository.findSubmissionDetailsById.mockResolvedValue(null);

    await expect(
      getSubmissionDetailsService(userId, submissionId),
    ).rejects.toThrow("Submission not found.");
  });

  it("should reject access when the submission belongs to another user", async () => {
    submissionRepository.findSubmissionDetailsById.mockResolvedValue({
      ...existingSubmission,
      user_id: "another-user-id",
    });

    await expect(
      getSubmissionDetailsService(userId, submissionId),
    ).rejects.toThrow("You do not have permission to view this submission.");

    expect(
      submissionRepository.getSubmissionTestResults,
    ).not.toHaveBeenCalled();
  });
});

describe("revealSolutionService", () => {
  it("should reveal the solution after at least two failed submissions", async () => {
    submissionRepository.countUserFailedSubmissions.mockResolvedValue(2);

    const result = await revealSolutionService(userId, exerciseId, languageId);

    expect(result).toEqual({
      solution: "console.log('Solution');",
    });

    expect(submissionRepository.createSolutionReveal).toHaveBeenCalledWith(
      userId,
      exerciseId,
      languageId,
    );
  });

  it("should throw an error if the exercise does not exist", async () => {
    exerciseRepository.findExerciseById.mockResolvedValue(null);

    await expect(
      revealSolutionService(userId, exerciseId, languageId),
    ).rejects.toThrow("Exercise not found.");

    expect(submissionRepository.createSolutionReveal).not.toHaveBeenCalled();
  });

  it("should throw an error if the exercise is not published", async () => {
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...publishedExercise,
      status: "draft",
    });

    await expect(
      revealSolutionService(userId, exerciseId, languageId),
    ).rejects.toThrow("Exercise is not published.");
  });

  it("should throw an error if the language does not belong to the exercise", async () => {
    exerciseRepository.findExerciseLanguageById.mockResolvedValue(null);

    await expect(
      revealSolutionService(userId, exerciseId, languageId),
    ).rejects.toThrow("Language not found.");
  });

  it("should reject solution reveal when the learner has fewer than two failed submissions", async () => {
    submissionRepository.countUserFailedSubmissions.mockResolvedValue(1);

    await expect(
      revealSolutionService(userId, exerciseId, languageId),
    ).rejects.toThrow(
      "You must have at least 2 failed submissions before revealing the solution.",
    );

    expect(submissionRepository.createSolutionReveal).not.toHaveBeenCalled();
  });

  it("should return an already revealed solution without creating another reveal record", async () => {
    submissionRepository.hasUserRevealedSolution.mockResolvedValue(true);

    const result = await revealSolutionService(userId, exerciseId, languageId);

    expect(result).toEqual({
      solution: "console.log('Solution');",
    });

    expect(
      submissionRepository.countUserFailedSubmissions,
    ).not.toHaveBeenCalled();

    expect(submissionRepository.createSolutionReveal).not.toHaveBeenCalled();
  });

  it("should not record a reveal if the solution does not exist", async () => {
    submissionRepository.countUserFailedSubmissions.mockResolvedValue(2);
    exerciseRepository.getExerciseSolution.mockResolvedValue(null);

    await expect(
      revealSolutionService(userId, exerciseId, languageId),
    ).rejects.toThrow("Solution not found.");

    expect(submissionRepository.createSolutionReveal).not.toHaveBeenCalled();
  });
});

