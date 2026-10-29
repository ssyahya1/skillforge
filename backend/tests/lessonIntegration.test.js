
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLessonService: vi.fn(),
  getLessonByIdService: vi.fn(),
  listLessonsService: vi.fn(),
  updateLessonService: vi.fn(),
  publishLessonService: vi.fn(),
  unpublishLessonService: vi.fn(),
  softDeleteLessonService: vi.fn(),
  restoreLessonService: vi.fn(),
}));

vi.mock("../src/middleware/requireAuth.js", () => ({
  requireAuth: (_req, _res, next) => next(),
}));

vi.mock("../src/middleware/requireAdmin.js", () => ({
  requireAdmin: (_req, _res, next) => next(),
}));

// Keep unrelated route modules out of these focused lesson tests.
vi.mock("../src/modules/auth/authRoutes.js", () => ({
  default: express.Router(),
}));

vi.mock("../src/modules/admin/adminRoutes.js", () => ({
  default: express.Router(),
}));

vi.mock("../src/modules/courses/courseRoutes.js", () => ({
  default: express.Router(),
}));

vi.mock("../src/modules/lessons/lessonService.js", () => mocks);

import app from "../src/app.js";

const courseId = "11111111-1111-4111-8111-111111111111";
const lessonId = "22222222-2222-4222-8222-222222222222";

const lessonsPath = `/api/admin/courses/${courseId}/lessons`;

const sampleLesson = {
  id: lessonId,
  course_id: courseId,
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn how variables work.",
  video_url: null,
  code_examples: [],
  position: 0,
  status: "draft",
  deleted_at: null,
  purge_after: null,
};

const validLessonData = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn how variables work.",
  position: 0,
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.createLessonService.mockResolvedValue(sampleLesson);
  mocks.getLessonByIdService.mockResolvedValue(sampleLesson);

  mocks.listLessonsService.mockResolvedValue({
    lessons: [sampleLesson],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  });

  mocks.updateLessonService.mockResolvedValue({
    ...sampleLesson,
    title: "Updated Lesson",
  });

  mocks.publishLessonService.mockResolvedValue({
    ...sampleLesson,
    status: "published",
  });

  mocks.unpublishLessonService.mockResolvedValue(sampleLesson);

  mocks.softDeleteLessonService.mockResolvedValue({
    ...sampleLesson,
    deleted_at: "2026-01-02T00:00:00.000Z",
    purge_after: "2026-02-01T00:00:00.000Z",
  });

  mocks.restoreLessonService.mockResolvedValue(sampleLesson);
});

describe("Lesson API integration", () => {
  it("creates a lesson through the mounted API", async () => {
    const response = await request(app)
      .post(lessonsPath)
      .send(validLessonData);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(sampleLesson);

    expect(mocks.createLessonService).toHaveBeenCalledWith(
      courseId,
      {
        ...validLessonData,
        code_examples: [],
      }
    );
  });

  it("lists lessons with pagination", async () => {
    const response = await request(app)
      .get(lessonsPath)
      .query({ page: "1", limit: "20" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [sampleLesson],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(mocks.listLessonsService).toHaveBeenCalledWith(
      courseId,
      expect.objectContaining({
        page: 1,
        limit: 20,
      })
    );
  });

  it("gets a lesson by course ID and lesson ID", async () => {
    const response = await request(app).get(
      `${lessonsPath}/${lessonId}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(sampleLesson);

    expect(mocks.getLessonByIdService).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("updates a lesson through PATCH", async () => {
    const response = await request(app)
      .patch(`${lessonsPath}/${lessonId}`)
      .send({ title: "Updated Lesson" });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Updated Lesson");

    expect(mocks.updateLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId,
      { title: "Updated Lesson" }
    );
  });

  it("publishes a lesson through the lifecycle endpoint", async () => {
    const response = await request(app).patch(
      `${lessonsPath}/${lessonId}/publish`
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("published");

    expect(mocks.publishLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("unpublishes a lesson through the lifecycle endpoint", async () => {
    const response = await request(app).patch(
      `${lessonsPath}/${lessonId}/unpublish`
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("draft");

    expect(mocks.unpublishLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("soft-deletes a lesson through DELETE", async () => {
    const response = await request(app).delete(
      `${lessonsPath}/${lessonId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.deleted_at).toBeTruthy();

    expect(mocks.softDeleteLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("restores a lesson through the restore endpoint", async () => {
    const response = await request(app).patch(
      `${lessonsPath}/${lessonId}/restore`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(sampleLesson);

    expect(mocks.restoreLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("rejects an invalid UUID before reaching the controller", async () => {
    const response = await request(app).get(
      "/api/admin/courses/not-a-uuid/lessons"
    );

    expect(response.status).toBe(400);
    expect(mocks.listLessonsService).not.toHaveBeenCalled();
  });

  it("rejects invalid lesson data before reaching the service", async () => {
    const response = await request(app)
      .post(lessonsPath)
      .send({
        title: "A",
        slug: "Not A Valid Slug",
        position: -1,
      });

    expect(response.status).toBe(400);
    expect(mocks.createLessonService).not.toHaveBeenCalled();
  });

  it("returns a safe server error when a service fails unexpectedly", async () => {
    mocks.getLessonByIdService.mockRejectedValue(
      new Error("Database unavailable")
    );

    const response = await request(app).get(
      `${lessonsPath}/${lessonId}`
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    });
  });

  it("returns a client error when the service reports a missing lesson", async () => {
    const error = Object.assign(new Error("Lesson not found."), {
      statusCode: 404,
    });

    mocks.getLessonByIdService.mockRejectedValue(error);

    const response = await request(app).get(
      `${lessonsPath}/${lessonId}`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "REQUEST_ERROR",
      message: "Lesson not found.",
    });
  });

  it("maps the published-content database constraint to a client error", async () => {
    mocks.updateLessonService.mockRejectedValue(
      Object.assign(new Error("Database constraint violation."), {
        code: "23514",
        constraint: "lessons_published_content_nonempty_check",
      })
    );

    const response = await request(app)
      .patch(`${lessonsPath}/${lessonId}`)
      .send({ content: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "REQUEST_ERROR",
      message: "Lesson content cannot be empty.",
    });
  });

  it("maps a lesson slug uniqueness violation to a conflict", async () => {
    mocks.createLessonService.mockRejectedValue(
      Object.assign(new Error("Unique constraint violation."), {
        code: "23505",
        constraint: "lessons_course_slug_unique",
      })
    );

    const response = await request(app)
      .post(lessonsPath)
      .send(validLessonData);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "CONFLICT",
      message: "A lesson with this slug already exists in this course.",
    });
  });
});
