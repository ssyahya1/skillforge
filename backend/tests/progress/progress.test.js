import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnrollmentProgress: vi.fn(),
  getEnrollmentLessonProgress: vi.fn(),
  getLessonExerciseProgress: vi.fn(),
  getLessonProgress: vi.fn(),
  getEnrolledPublishedLesson: vi.fn(),
  getEnrolledPublishedExercise: vi.fn(),
  getPreviousPublishedLesson: vi.fn(),
  getExerciseProgress: vi.fn(),
  getActiveEnrollmentForExercise: vi.fn(),
  startLesson: vi.fn(),
  completeLessonContent: vi.fn(),
  lockEnrollment: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
    next();
  },
}));

vi.mock("../../src/database/pool.js", () => ({
  pool: { connect: mocks.connect },
}));

vi.mock("../../src/modules/progress/progressRepository.js", () => ({
  getEnrollmentProgress: mocks.getEnrollmentProgress,
  getEnrollmentLessonProgress: mocks.getEnrollmentLessonProgress,
  getLessonExerciseProgress: mocks.getLessonExerciseProgress,
  getLessonProgress: mocks.getLessonProgress,
  getEnrolledPublishedLesson: mocks.getEnrolledPublishedLesson,
  getEnrolledPublishedExercise: mocks.getEnrolledPublishedExercise,
  getPreviousPublishedLesson: mocks.getPreviousPublishedLesson,
  getExerciseProgress: mocks.getExerciseProgress,
  getActiveEnrollmentForExercise: mocks.getActiveEnrollmentForExercise,
  startLesson: mocks.startLesson,
  completeLessonContent: mocks.completeLessonContent,
  lockEnrollment: mocks.lockEnrollment,
}));

import progressRoutes from "../../src/modules/progress/progressRoutes.js";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const enrollmentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const lessonId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const exerciseId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/student", progressRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message });
  });
  return app;
}

describe("Progress API integration", () => {
  let app;
  let client;

  beforeEach(() => {
    vi.resetAllMocks();

    client = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
    mocks.connect.mockResolvedValue(client);
    mocks.getEnrollmentProgress.mockResolvedValue({
      rows: [
        {
          enrollment_id: enrollmentId,
          enrollment_status: "active",
          course_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          course_title: "JavaScript",
          total_lessons: "2",
          completed_lessons: "1",
        },
      ],
    });
    mocks.getEnrollmentLessonProgress.mockResolvedValue({
      rows: [{ lesson_id: lessonId, progress_status: "completed" }],
    });
    mocks.getEnrolledPublishedLesson.mockResolvedValue({
      rows: [{ id: lessonId }],
    });
    mocks.getEnrolledPublishedExercise.mockResolvedValue({
      rows: [{ id: exerciseId }],
    });
    mocks.getLessonProgress.mockResolvedValue({ rows: [] });
    mocks.getLessonExerciseProgress.mockResolvedValue({ rows: [] });
    mocks.getExerciseProgress.mockResolvedValue({ rows: [] });
    mocks.getPreviousPublishedLesson.mockResolvedValue({ rows: [] });
    mocks.getActiveEnrollmentForExercise.mockResolvedValue({
      rows: [{ id: enrollmentId }],
    });
    mocks.startLesson.mockResolvedValue({
      rows: [{ id: "lesson-progress-1", status: "in_progress" }],
    });
    mocks.completeLessonContent.mockResolvedValue({ rows: [] });
    mocks.lockEnrollment.mockResolvedValue({
      rows: [{ id: enrollmentId, status: "active" }],
    });

    app = createApp();
  });

  it("returns enrollment progress through the route, controller, and service", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/progress`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      enrollmentId,
      enrollmentStatus: "active",
      course: {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        title: "JavaScript",
      },
      progress: { totalLessons: 2, completedLessons: 1, percentage: 50 },
      lessons: [{ lesson_id: lessonId, progress_status: "completed" }],
    });
    expect(mocks.getEnrollmentProgress).toHaveBeenCalledWith(
      enrollmentId,
      userId,
    );
  });

  it("returns 404 when the requested enrollment is not owned by the user", async () => {
    mocks.getEnrollmentProgress.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/progress`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Enrollment not found" });
    expect(mocks.getEnrollmentLessonProgress).not.toHaveBeenCalled();
  });

  it("returns lesson progress only after confirming enrollment access", async () => {
    mocks.getLessonProgress.mockResolvedValueOnce({
      rows: [{ id: "lesson-progress-1", status: "in_progress" }],
    });

    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/progress`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "lesson-progress-1",
      status: "in_progress",
    });
    expect(mocks.getEnrolledPublishedLesson).toHaveBeenCalledWith(
      enrollmentId,
      lessonId,
      userId,
    );
  });

  it("starts a lesson through a connected client and releases it", async () => {
    const response = await request(app).post(
      `/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/progress/start`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "lesson-progress-1",
      status: "in_progress",
    });
    expect(mocks.startLesson).toHaveBeenCalledWith(
      client,
      enrollmentId,
      lessonId,
    );
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("does not expose a public exercise completion mutation", async () => {
    const response = await request(app)
      .post(
        `/api/student/enrollments/${enrollmentId}/exercises/${exerciseId}/progress`,
      )
      .send({ finalStatus: "accepted" });

    expect(response.status).toBe(404);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("does not expose a public exercise attempt mutation", async () => {
    const response = await request(app)
      .post(
        `/api/student/enrollments/${enrollmentId}/exercises/${exerciseId}/attempts`,
      )
      .send({
        submissionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        finalStatus: "wrong_answer",
      });

    expect(response.status).toBe(404);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("rejects invalid route IDs before invoking repository operations", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/lessons/invalid/progress`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.getEnrolledPublishedLesson).not.toHaveBeenCalled();
  });
});
