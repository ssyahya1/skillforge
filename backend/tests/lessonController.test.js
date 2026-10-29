
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

vi.mock("../src/modules/lessons/lessonService.js", () => mocks);

import {
  createLessonController,
  listLessonsController,
  getLessonByIdController,
  updateLessonController,
  publishLessonController,
  unpublishLessonController,
  softDeleteLessonController,
  restoreLessonController,
} from "../src/modules/lessons/lessonController.js";

const courseId = "11111111-1111-4111-8111-111111111111";
const lessonId = "22222222-2222-4222-8222-222222222222";

const sampleLesson = {
  id: lessonId,
  course_id: courseId,
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn how variables work.",
  position: 0,
  status: "draft",
};

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function createRequest(overrides = {}) {
  return {
    validatedParams: {
      courseId,
      lessonId,
    },
    body: {},
    validateQuery: {
      page: 1,
      limit: 20,
    },
    ...overrides,
  };
}

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
  });

  mocks.restoreLessonService.mockResolvedValue(sampleLesson);
});

describe("createLessonController", () => {
  it("creates a lesson and responds with HTTP 201", async () => {
    const req = createRequest({
      body: {
        title: "JavaScript Variables",
        slug: "javascript-variables",
        content: "Learn how variables work.",
        position: 0,
      },
    });
    const res = createResponse();
    const next = vi.fn();

    await createLessonController(req, res, next);

    expect(mocks.createLessonService).toHaveBeenCalledWith(
      courseId,
      req.body,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(sampleLesson);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Course not found.");
    mocks.createLessonService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await createLessonController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("listLessonsController", () => {
  it("returns lessons and pagination with HTTP 200", async () => {
    const queryOptions = {
      page: 2,
      limit: 10,
      status: "published",
    };

    const req = createRequest({
      validateQuery: queryOptions,
    });
    const res = createResponse();
    const next = vi.fn();

    await listLessonsController(req, res, next);

    expect(mocks.listLessonsService).toHaveBeenCalledWith(
      courseId,
      queryOptions,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [sampleLesson],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Unable to list lessons.");
    mocks.listLessonsService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await listLessonsController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("getLessonByIdController", () => {
  it("returns the requested lesson with HTTP 200", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await getLessonByIdController(req, res, next);

    expect(mocks.getLessonByIdService).toHaveBeenCalledWith(
      courseId,
      lessonId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(sampleLesson);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Lesson not found.");
    mocks.getLessonByIdService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await getLessonByIdController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("updateLessonController", () => {
  it("updates a lesson and responds with HTTP 200", async () => {
    const updateData = {
      title: "Updated Lesson",
    };

    const req = createRequest({
      body: updateData,
    });
    const res = createResponse();
    const next = vi.fn();

    await updateLessonController(req, res, next);

    expect(mocks.updateLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId,
      updateData,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...sampleLesson,
      title: "Updated Lesson",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Lesson not found.");
    mocks.updateLessonService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await updateLessonController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("publishLessonController", () => {
  it("publishes a lesson and responds with HTTP 200", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await publishLessonController(req, res, next);

    expect(mocks.publishLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...sampleLesson,
      status: "published",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Lesson cannot be published.");
    mocks.publishLessonService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await publishLessonController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("unpublishLessonController", () => {
  it("unpublishes a lesson and responds with HTTP 200", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await unpublishLessonController(req, res, next);

    expect(mocks.unpublishLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(sampleLesson);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Lesson cannot be unpublished.");
    mocks.unpublishLessonService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await unpublishLessonController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("softDeleteLessonController", () => {
  it("soft-deletes a lesson and responds with HTTP 200", async () => {
    const deletedLesson = {
      ...sampleLesson,
      deleted_at: "2026-01-02T00:00:00.000Z",
    };

    mocks.softDeleteLessonService.mockResolvedValue(deletedLesson);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await softDeleteLessonController(req, res, next);

    expect(mocks.softDeleteLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(deletedLesson);
    expect(next).not.toHaveBeenCalled();
  });

  it("awaits the service before sending the response", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await softDeleteLessonController(req, res, next);

    expect(mocks.softDeleteLessonService).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: lessonId }),
    );
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Lesson not found.");
    mocks.softDeleteLessonService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await softDeleteLessonController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("restoreLessonController", () => {
  it("restores a lesson and responds with HTTP 200", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await restoreLessonController(req, res, next);

    expect(mocks.restoreLessonService).toHaveBeenCalledWith(
      courseId,
      lessonId,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(sampleLesson);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("Lesson cannot be restored.");
    mocks.restoreLessonService.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await restoreLessonController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
