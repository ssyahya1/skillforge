import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  release: vi.fn(),
  query: vi.fn().mockResolvedValue({ rows: [] }),
};

vi.mock("../../src/database/pool.js", () => ({
  pool: {
    connect: vi.fn(() => Promise.resolve(mockClient)),
  },
}));

vi.mock("../../src/modules/progress/progressService.js", () => ({
  getEnrollmentProgressService: vi.fn(),
  getLessonProgressService: vi.fn(),
  getLessonExerciseProgressService: vi.fn(),
  getExerciseProgressService: vi.fn(),
  startLessonService: vi.fn(),
  completeLessonContentService: vi.fn(),
}));

import { pool } from "../../src/database/pool.js";
import * as progressService from "../../src/modules/progress/progressService.js";
import {
  getEnrollmentProgressController,
  getLessonProgressController,
  getLessonExerciseProgressController,
  getExerciseProgressController,
  startLessonController,
  completeLessonContentController,
} from "../../src/modules/progress/progressController.js";

describe("Progress Controller", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const enrollmentId = "22222222-2222-4222-8222-222222222222";
  const lessonId = "33333333-3333-4333-8333-333333333333";
  const exerciseId = "44444444-4444-4444-8444-444444444444";

  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: userId },
      validatedParams: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  it("returns enrollment progress for the authenticated user", async () => {
    const progress = {
      enrollmentId,
      course: { id: "course-1", title: "JavaScript Fundamentals" },
      progress: { totalLessons: 5, completedLessons: 2, percentage: 40 },
      lessons: [],
    };

    req.validatedParams = { enrollmentId };
    progressService.getEnrollmentProgressService.mockResolvedValueOnce(progress);

    await getEnrollmentProgressController(req, res, next);

    expect(progressService.getEnrollmentProgressService).toHaveBeenCalledWith(
      enrollmentId,
      userId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(progress);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns a lesson progress record for the enrolled lesson", async () => {
    const lessonProgress = { id: "progress-1", status: "in_progress" };

    req.validatedParams = { enrollmentId, lessonId };
    progressService.getLessonProgressService.mockResolvedValueOnce(lessonProgress);

    await getLessonProgressController(req, res, next);

    expect(progressService.getLessonProgressService).toHaveBeenCalledWith(
      enrollmentId,
      lessonId,
      userId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(lessonProgress);
  });

  it("returns exercise rows for a lesson in the enrolled course", async () => {
    const lessonExercises = [{ exercise_id: exerciseId, progress_status: "completed" }];

    req.validatedParams = { enrollmentId, lessonId };
    progressService.getLessonExerciseProgressService.mockResolvedValueOnce(
      lessonExercises,
    );

    await getLessonExerciseProgressController(req, res, next);

    expect(progressService.getLessonExerciseProgressService).toHaveBeenCalledWith(
      enrollmentId,
      lessonId,
      userId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(lessonExercises);
  });

  it("returns exercise progress for the provided enrollment and exercise", async () => {
    const exerciseProgress = { id: "progress-2", status: "completed" };

    req.validatedParams = { enrollmentId, exerciseId };
    progressService.getExerciseProgressService.mockResolvedValueOnce(
      exerciseProgress,
    );

    await getExerciseProgressController(req, res, next);

    expect(progressService.getExerciseProgressService).toHaveBeenCalledWith(
      enrollmentId,
      exerciseId,
      userId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(exerciseProgress);
  });

  it("passes errors to next for enrollment progress requests", async () => {
    const error = new Error("Enrollment not found");
    error.status = 404;

    req.validatedParams = { enrollmentId };
    progressService.getEnrollmentProgressService.mockRejectedValueOnce(error);

    await getEnrollmentProgressController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it("locks progress mutations in a transaction and releases the client", async () => {
    req.validatedParams = { enrollmentId, lessonId };
    const progressRow = { id: "lesson-progress-1" };
    progressService.startLessonService.mockResolvedValueOnce(progressRow);

    await startLessonController(req, res, next);

    expect(progressService.startLessonService).toHaveBeenCalledWith(
      mockClient,
      enrollmentId,
      lessonId,
      userId,
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenLastCalledWith("COMMIT");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(progressRow);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back a failed progress mutation", async () => {
    const error = new Error("progress write failed");
    req.validatedParams = { enrollmentId, lessonId };
    progressService.startLessonService.mockRejectedValueOnce(error);

    await startLessonController(req, res, next);

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(next).toHaveBeenCalledWith(error);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
