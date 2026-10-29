import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  query: vi.fn(),
  getLessonByIdService: vi.fn(),
}));

vi.mock("../src/config/supabase.js", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

vi.mock("../src/database/pool.js", () => ({
  pool: {
    query: mocks.query,
  },
}));

vi.mock("../src/modules/lessons/lessonService.js", () => ({
  createLessonService: vi.fn(),
  getLessonByIdService: mocks.getLessonByIdService,
  listLessonsService: vi.fn(),
  updateLessonService: vi.fn(),
  publishLessonService: vi.fn(),
  unpublishLessonService: vi.fn(),
  softDeleteLessonService: vi.fn(),
  restoreLessonService: vi.fn(),
}));

import lessonRoutes from "../src/modules/lessons/lessonRoutes.js";

const courseId = "11111111-1111-4111-8111-111111111111";
const lessonId = "22222222-2222-4222-8222-222222222222";
const user = { id: "verified-user-id" };
const accessToken = "test-access-token";
const lesson = { id: lessonId, course_id: courseId };

function createApp() {
  const app = express();
  app.use(cookieParser());
  app.use("/api/admin/courses", lessonRoutes);
  return app;
}

describe("Lesson authorization middleware contract", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLessonByIdService.mockResolvedValue(lesson);
  });

  it("rejects unauthenticated requests before role lookup or lesson access", async () => {
    const response = await request(app).get(
      `/api/admin/courses/${courseId}/lessons/${lessonId}`
    );

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("UNAUTHORIZED");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.getLessonByIdService).not.toHaveBeenCalled();
  });

  it("rejects authenticated non-admins before lesson access", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user },
      error: null,
    });
    mocks.query.mockResolvedValueOnce({
      rows: [{ is_admin: false }],
    });

    const response = await request(app)
      .get(`/api/admin/courses/${courseId}/lessons/${lessonId}`)
      .set("Cookie", `skillforge_access_token=${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
    expect(mocks.getLessonByIdService).not.toHaveBeenCalled();
  });

  it("allows an authenticated admin to access the lesson route", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user },
      error: null,
    });
    mocks.query.mockResolvedValueOnce({
      rows: [{ is_admin: true }],
    });

    const response = await request(app)
      .get(`/api/admin/courses/${courseId}/lessons/${lessonId}`)
      .set("Cookie", `skillforge_access_token=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(lesson);
    expect(mocks.getLessonByIdService).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });
});
