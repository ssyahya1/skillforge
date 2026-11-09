import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnrollmentProgressController: vi.fn(),
  getLessonProgressController: vi.fn(),
  getLessonExerciseProgressController: vi.fn(),
  getExerciseProgressController: vi.fn(),
  startLessonController: vi.fn(),
  completeLessonContentController: vi.fn(),
  getPreviousPublishedLessonController: vi.fn(),
  getActiveEnrollmentForExerciseController: vi.fn(),
}));

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: "11111111-1111-4111-8111-111111111111" };
    next();
  },
}));

vi.mock("../../src/modules/progress/progressController.js", () => mocks);

import progressRoutes from "../../src/modules/progress/progressRoutes.js";

const userId = "11111111-1111-4111-8111-111111111111";
const enrollmentId = "22222222-2222-4222-8222-222222222222";
const lessonId = "33333333-3333-4333-8333-333333333333";
const exerciseId = "44444444-4444-4444-8444-444444444444";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/student", progressRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message });
  });
  return app;
}

describe("Progress routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getEnrollmentProgressController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "getEnrollmentProgressController" });
    });
    mocks.getLessonProgressController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "getLessonProgressController" });
    });
    mocks.getLessonExerciseProgressController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "getLessonExerciseProgressController" });
    });
    mocks.getExerciseProgressController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "getExerciseProgressController" });
    });
    mocks.startLessonController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "startLessonController" });
    });
    mocks.completeLessonContentController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "completeLessonContentController" });
    });
    mocks.getPreviousPublishedLessonController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "getPreviousPublishedLessonController" });
    });
    mocks.getActiveEnrollmentForExerciseController.mockImplementation((req, res) => {
      res.status(200).json({ controller: "getActiveEnrollmentForExerciseController" });
    });

    app = createApp();
  });

  it("routes GET /api/student/enrollments/:enrollmentId/progress", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/progress`,
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("getEnrollmentProgressController");
    expect(mocks.getEnrollmentProgressController).toHaveBeenCalledTimes(1);
  });

  it("routes GET /api/student/enrollments/:enrollmentId/lessons/:lessonId/progress", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/progress`,
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("getLessonProgressController");
    expect(mocks.getLessonProgressController).toHaveBeenCalledTimes(1);
  });

  it("routes GET /api/student/enrollments/:enrollmentId/lessons/:lessonId/exercises", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/exercises`,
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("getLessonExerciseProgressController");
    expect(mocks.getLessonExerciseProgressController).toHaveBeenCalledTimes(1);
  });

  it("routes GET /api/student/enrollments/:enrollmentId/exercises/:exerciseId/progress", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/exercises/${exerciseId}/progress`,
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("getExerciseProgressController");
    expect(mocks.getExerciseProgressController).toHaveBeenCalledTimes(1);
  });

  it("routes a lesson progress start action", async () => {
    const response = await request(app)
      .post(`/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/progress/start`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("startLessonController");
    expect(mocks.startLessonController).toHaveBeenCalledTimes(1);
  });

  it("does not expose manual lesson completion", async () => {
    const response = await request(app)
      .patch(`/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/progress/complete`)
      .send({});

    expect(response.status).toBe(404);
  });

  it("does not expose public exercise progress mutations", async () => {
    const response = await request(app)
      .post(`/api/student/enrollments/${enrollmentId}/exercises/${exerciseId}/progress`)
      .send({
        submissionId: "55555555-5555-4555-8555-555555555555",
        finalStatus: "accepted",
      });

    expect(response.status).toBe(404);
  });

  it("routes a previous published lesson lookup", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/lessons/${lessonId}/previous`,
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("getPreviousPublishedLessonController");
    expect(mocks.getPreviousPublishedLessonController).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid enrollment UUIDs", async () => {
    const response = await request(app).get(
      "/api/student/enrollments/not-a-uuid/progress",
    );

    expect(response.status).toBe(400);
    expect(mocks.getEnrollmentProgressController).not.toHaveBeenCalled();
  });

  it("rejects invalid lesson UUIDs on lesson progress routes", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/lessons/not-a-uuid/progress`,
    );

    expect(response.status).toBe(400);
    expect(mocks.getLessonProgressController).not.toHaveBeenCalled();
  });

  it("rejects invalid exercise UUIDs on exercise progress routes", async () => {
    const response = await request(app).get(
      `/api/student/enrollments/${enrollmentId}/exercises/not-a-uuid/progress`,
    );

    expect(response.status).toBe(400);
    expect(mocks.getExerciseProgressController).not.toHaveBeenCalled();
  });
});
