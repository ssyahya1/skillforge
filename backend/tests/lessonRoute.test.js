
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLessonController: vi.fn(),
  listLessonsController: vi.fn(),
  getLessonByIdController: vi.fn(),
  updateLessonController: vi.fn(),
  publishLessonController: vi.fn(),
  unpublishLessonController: vi.fn(),
  softDeleteLessonController: vi.fn(),
  restoreLessonController: vi.fn(),
}));

vi.mock("../src/middleware/requireAuth.js", () => ({
  requireAuth: (_req, _res, next) => next(),
}));

vi.mock("../src/middleware/requireAdmin.js", () => ({
  requireAdmin: (_req, _res, next) => next(),
}));

vi.mock("../src/modules/lessons/lessonController.js", () => mocks);

import lessonRoutes from "../src/modules/lessons/lessonRoutes.js";

const courseId = "11111111-1111-4111-8111-111111111111";
const lessonId = "22222222-2222-4222-8222-222222222222";

const basePath = `/api/admin/courses/${courseId}/lessons`;

const validLesson = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn how variables work.",
  position: 0,
};

function controllerResponse(name) {
  return (req, res) => {
    res.status(200).json({ controller: name });
  };
}

function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api/admin/courses", lessonRoutes);

  return app;
}

let app;

beforeEach(() => {
  vi.clearAllMocks();

  mocks.createLessonController.mockImplementation(
    controllerResponse("createLessonController")
  );
  mocks.listLessonsController.mockImplementation(
    controllerResponse("listLessonsController")
  );
  mocks.getLessonByIdController.mockImplementation(
    controllerResponse("getLessonByIdController")
  );
  mocks.updateLessonController.mockImplementation(
    controllerResponse("updateLessonController")
  );
  mocks.publishLessonController.mockImplementation(
    controllerResponse("publishLessonController")
  );
  mocks.unpublishLessonController.mockImplementation(
    controllerResponse("unpublishLessonController")
  );
  mocks.softDeleteLessonController.mockImplementation(
    controllerResponse("softDeleteLessonController")
  );
  mocks.restoreLessonController.mockImplementation(
    controllerResponse("restoreLessonController")
  );

  app = createApp();
});

describe("Lesson routes", () => {
  it("routes POST requests to the create controller", async () => {
    const response = await request(app)
      .post(basePath)
      .send(validLesson);

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("createLessonController");
    expect(mocks.createLessonController).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid lesson creation data", async () => {
    const response = await request(app)
      .post(basePath)
      .send({
        title: "A",
        slug: "Invalid Slug",
        position: -1,
      });

    expect(response.status).toBe(400);
    expect(mocks.createLessonController).not.toHaveBeenCalled();
  });

  it("rejects unknown fields when creating a lesson", async () => {
    const response = await request(app)
      .post(basePath)
      .send({
        ...validLesson,
        status: "published",
      });

    expect(response.status).toBe(400);
    expect(mocks.createLessonController).not.toHaveBeenCalled();
  });

  it("routes GET requests to the list controller", async () => {
    const response = await request(app).get(basePath);

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("listLessonsController");
    expect(mocks.listLessonsController).toHaveBeenCalledTimes(1);
  });

  it("accepts valid lesson-list query parameters", async () => {
    const response = await request(app)
      .get(basePath)
      .query({
        page: "2",
        limit: "10",
        status: "published",
      });

    expect(response.status).toBe(200);
    expect(mocks.listLessonsController).toHaveBeenCalledTimes(1);
  });

  it("rejects an unsupported lesson status filter", async () => {
    const response = await request(app)
      .get(basePath)
      .query({ status: "archived" });

    expect(response.status).toBe(400);
    expect(mocks.listLessonsController).not.toHaveBeenCalled();
  });

  it("rejects invalid pagination parameters", async () => {
    const response = await request(app)
      .get(basePath)
      .query({ page: "0", limit: "101" });

    expect(response.status).toBe(400);
    expect(mocks.listLessonsController).not.toHaveBeenCalled();
  });

  it("routes GET requests for a specific lesson", async () => {
    const response = await request(app).get(
      `${basePath}/${lessonId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("getLessonByIdController");
    expect(mocks.getLessonByIdController).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid course UUID", async () => {
    const response = await request(app).get(
      "/api/admin/courses/not-a-uuid/lessons"
    );

    expect(response.status).toBe(400);
    expect(mocks.listLessonsController).not.toHaveBeenCalled();
  });

  it("rejects an invalid lesson UUID", async () => {
    const response = await request(app).get(
      `${basePath}/not-a-uuid`
    );

    expect(response.status).toBe(400);
    expect(mocks.getLessonByIdController).not.toHaveBeenCalled();
  });

  it("routes PATCH requests to the update controller", async () => {
    const response = await request(app)
      .patch(`${basePath}/${lessonId}`)
      .send({ title: "Updated Lesson" });

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("updateLessonController");
    expect(mocks.updateLessonController).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty lesson update", async () => {
    const response = await request(app)
      .patch(`${basePath}/${lessonId}`)
      .send({});

    expect(response.status).toBe(400);
    expect(mocks.updateLessonController).not.toHaveBeenCalled();
  });

  it("rejects unknown fields when updating a lesson", async () => {
    const response = await request(app)
      .patch(`${basePath}/${lessonId}`)
      .send({ status: "published" });

    expect(response.status).toBe(400);
    expect(mocks.updateLessonController).not.toHaveBeenCalled();
  });

  it("routes lesson publishing requests", async () => {
    const response = await request(app).patch(
      `${basePath}/${lessonId}/publish`
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("publishLessonController");
    expect(mocks.publishLessonController).toHaveBeenCalledTimes(1);
  });

  it("routes lesson unpublishing requests", async () => {
    const response = await request(app).patch(
      `${basePath}/${lessonId}/unpublish`
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("unpublishLessonController");
    expect(mocks.unpublishLessonController).toHaveBeenCalledTimes(1);
  });

  it("routes DELETE requests to the soft-delete controller", async () => {
    const response = await request(app).delete(
      `${basePath}/${lessonId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("softDeleteLessonController");
    expect(mocks.softDeleteLessonController).toHaveBeenCalledTimes(1);
  });

  it("routes lesson restoration requests", async () => {
    const response = await request(app).patch(
      `${basePath}/${lessonId}/restore`
    );

    expect(response.status).toBe(200);
    expect(response.body.controller).toBe("restoreLessonController");
    expect(mocks.restoreLessonController).toHaveBeenCalledTimes(1);
  });

  it("does not match unsupported HTTP methods", async () => {
    const response = await request(app).put(
      `${basePath}/${lessonId}/publish`
    );

    expect(response.status).toBe(404);
  });

  it("does not match unknown lesson subroutes", async () => {
    const response = await request(app).get(
      `${basePath}/${lessonId}/unknown`
    );

    expect(response.status).toBe(404);
  });
});
