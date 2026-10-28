
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createCourseServiceMock,
  getCoursesServiceMock,
  getCourseByIdServiceMock,
  updateCourseServiceMock,
  publishCourseServiceMock,
  archiveCourseServiceMock,
  softDeleteCourseServiceMock,
  restoreCourseServiceMock,
} = vi.hoisted(() => ({
  createCourseServiceMock: vi.fn(),
  getCoursesServiceMock: vi.fn(),
  getCourseByIdServiceMock: vi.fn(),
  updateCourseServiceMock: vi.fn(),
  publishCourseServiceMock: vi.fn(),
  archiveCourseServiceMock: vi.fn(),
  softDeleteCourseServiceMock: vi.fn(),
  restoreCourseServiceMock: vi.fn(),
}));

vi.mock("../src/modules/courses/courseService.js", () => ({
  createCourseService: createCourseServiceMock,
  getCoursesService: getCoursesServiceMock,
  getCourseByIdService: getCourseByIdServiceMock,
  updateCourseService: updateCourseServiceMock,
  publishCourseService: publishCourseServiceMock,
  archiveCourseService: archiveCourseServiceMock,
  softDeleteCourseService: softDeleteCourseServiceMock,
  restoreCourseService: restoreCourseServiceMock,
}));

import {
  createCourseController,
  getCoursesController,
  getCourseByIdController,
  updateCourseController,
  publishCourseController,
  archiveCourseController,
  softDeleteCourseController,
  restoreCourseController,
} from "../src/modules/courses/courseController.js";

const adminId = "test-admin-123";
const courseId = "course-123";

const courseData = {
  title: "JavaScript Fundamentals",
  slug: "javascript-fundamentals",
  description: "Learn JavaScript fundamentals from scratch.",
  language: "javascript",
  difficulty: "beginner",
  access_tier: "free",
};

const createdCourse = {
  id: courseId,
  ...courseData,
  status: "draft",
  created_by: adminId,
};

const createMocks = () => {
  const req = {
    body: { ...courseData },
    user: { id: adminId },
    validatedParams: { courseId },
    validateQuery: {
      page: 1,
      limit: 10,
      language: "javascript",
      status: "draft",
    },
  };

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  const next = vi.fn();

  return { req, res, next };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// CREATE COURSE
describe("createCourseController", () => {
  it("calls the service with course data and admin ID", async () => {
    createCourseServiceMock.mockResolvedValueOnce(createdCourse);
    const { req, res, next } = createMocks();

    await createCourseController(req, res, next);

    expect(createCourseServiceMock).toHaveBeenCalledWith(
      courseData,
      adminId,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 201 with the created course", async () => {
    createCourseServiceMock.mockResolvedValueOnce(createdCourse);
    const { req, res, next } = createMocks();

    await createCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdCourse);
  });

  it("passes service errors to next", async () => {
    const error = new Error("Course creation failed");
    createCourseServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await createCourseController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// LIST COURSES
describe("getCoursesController", () => {
  it("calls the service with validated query filters", async () => {
    getCoursesServiceMock.mockResolvedValueOnce({
      courses: [],
      total: 0,
    });
    const { req, res, next } = createMocks();

    await getCoursesController(req, res, next);

    expect(getCoursesServiceMock).toHaveBeenCalledWith(req.validateQuery);
  });

  it("returns courses with pagination metadata", async () => {
    const courses = [
      { id: courseId, title: courseData.title },
    ];

    getCoursesServiceMock.mockResolvedValueOnce({
      courses,
      total: 21,
    });

    const { req, res, next } = createMocks();

    await getCoursesController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: courses,
      pagination: {
        page: 1,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });
  });

  it("passes service errors to next", async () => {
    const error = new Error("Course listing failed");
    getCoursesServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await getCoursesController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// GET COURSE DETAILS
describe("getCourseByIdController", () => {
  it("calls the service with the validated course ID", async () => {
    getCourseByIdServiceMock.mockResolvedValueOnce(createdCourse);
    const { req, res, next } = createMocks();

    await getCourseByIdController(req, res, next);

    expect(getCourseByIdServiceMock).toHaveBeenCalledWith(courseId);
  });

  it("returns 200 with the course", async () => {
    getCourseByIdServiceMock.mockResolvedValueOnce(createdCourse);
    const { req, res, next } = createMocks();

    await getCourseByIdController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(createdCourse);
  });

  it("returns 404 when the course does not exist", async () => {
    getCourseByIdServiceMock.mockResolvedValueOnce(null);
    const { req, res, next } = createMocks();

    await getCourseByIdController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "NOT_FOUND",
      message: "Course not found.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes service errors to next", async () => {
    const error = new Error("Course lookup failed");
    getCourseByIdServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await getCourseByIdController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// UPDATE COURSE
describe("updateCourseController", () => {
  it("calls the service with course ID and update data", async () => {
    const updateData = { title: "Advanced JavaScript" };
    updateCourseServiceMock.mockResolvedValueOnce({
      id: courseId,
      ...updateData,
    });

    const { req, res, next } = createMocks();
    req.body = updateData;

    await updateCourseController(req, res, next);

    expect(updateCourseServiceMock).toHaveBeenCalledWith(
      courseId,
      updateData,
    );
  });

  it("returns 200 with the updated course", async () => {
    const updatedCourse = {
      id: courseId,
      title: "Advanced JavaScript",
    };
    updateCourseServiceMock.mockResolvedValueOnce(updatedCourse);
    const { req, res, next } = createMocks();

    await updateCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedCourse);
  });

  it("returns 404 when the course is not found", async () => {
    updateCourseServiceMock.mockResolvedValueOnce(null);
    const { req, res, next } = createMocks();

    await updateCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "NOT_FOUND",
      message: "Course not found.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes service errors to next", async () => {
    const error = new Error("Course update failed");
    updateCourseServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await updateCourseController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// PUBLISH COURSE
describe("publishCourseController", () => {
  it("calls the service with the course ID", async () => {
    publishCourseServiceMock.mockResolvedValueOnce({
      id: courseId,
      status: "published",
    });
    const { req, res, next } = createMocks();

    await publishCourseController(req, res, next);

    expect(publishCourseServiceMock).toHaveBeenCalledWith(courseId);
  });

  it("returns 200 with the published course", async () => {
    const course = { id: courseId, status: "published" };
    publishCourseServiceMock.mockResolvedValueOnce(course);
    const { req, res, next } = createMocks();

    await publishCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(course);
  });

  it("passes service errors to next", async () => {
    const error = new Error("Publishing failed");
    publishCourseServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await publishCourseController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ARCHIVE COURSE
describe("archiveCourseController", () => {
  it("calls the service with the course ID", async () => {
    archiveCourseServiceMock.mockResolvedValueOnce({
      id: courseId,
      status: "archived",
    });
    const { req, res, next } = createMocks();

    await archiveCourseController(req, res, next);

    expect(archiveCourseServiceMock).toHaveBeenCalledWith(courseId);
  });

  it("returns 200 with the archived course", async () => {
    const course = { id: courseId, status: "archived" };
    archiveCourseServiceMock.mockResolvedValueOnce(course);
    const { req, res, next } = createMocks();

    await archiveCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(course);
  });

  it("passes service errors to next", async () => {
    const error = new Error("Archiving failed");
    archiveCourseServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await archiveCourseController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// SOFT-DELETE COURSE
describe("softDeleteCourseController", () => {
  it("calls the service with the course ID", async () => {
    softDeleteCourseServiceMock.mockResolvedValueOnce({
      id: courseId,
      deleted_at: "2026-10-28T00:00:00Z",
      purge_after: "2026-11-27T00:00:00Z",
    });
    const { req, res, next } = createMocks();

    await softDeleteCourseController(req, res, next);

    expect(softDeleteCourseServiceMock).toHaveBeenCalledWith(courseId);
  });

  it("returns 200 with the soft-deleted course", async () => {
    const course = {
      id: courseId,
      deleted_at: "2026-10-28T00:00:00Z",
      purge_after: "2026-11-27T00:00:00Z",
    };
    softDeleteCourseServiceMock.mockResolvedValueOnce(course);
    const { req, res, next } = createMocks();

    await softDeleteCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(course);
  });

  it("passes service errors to next", async () => {
    const error = new Error("Deletion failed");
    softDeleteCourseServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await softDeleteCourseController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// RESTORE COURSE
describe("restoreCourseController", () => {
  it("calls the service with the course ID", async () => {
    restoreCourseServiceMock.mockResolvedValueOnce({
      id: courseId,
      deleted_at: null,
      purge_after: null,
    });
    const { req, res, next } = createMocks();

    await restoreCourseController(req, res, next);

    expect(restoreCourseServiceMock).toHaveBeenCalledWith(courseId);
  });

  it("returns 200 with the restored course", async () => {
    const course = {
      id: courseId,
      deleted_at: null,
      purge_after: null,
    };
    restoreCourseServiceMock.mockResolvedValueOnce(course);
    const { req, res, next } = createMocks();

    await restoreCourseController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(course);
  });

  it("passes service errors to next", async () => {
    const error = new Error("Restoration failed");
    restoreCourseServiceMock.mockRejectedValueOnce(error);
    const { req, res, next } = createMocks();

    await restoreCourseController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
