
import { beforeEach, describe, expect, it, vi } from "vitest";


const {
  createCourseMock,
  getCoursesMock,
  getCourseByIdMock,
  updateCourseMock,
  purgeExpiredCoursesMock,
  publishCourseMock,
  archiveCourseMock,
  softDeleteCourseMock,
  restoreCourseMock,
} = vi.hoisted(() => ({
  createCourseMock: vi.fn(),
  getCoursesMock: vi.fn(),
  getCourseByIdMock: vi.fn(),
  updateCourseMock: vi.fn(),
  purgeExpiredCoursesMock: vi.fn(),
  publishCourseMock: vi.fn(),
  archiveCourseMock: vi.fn(),
  softDeleteCourseMock: vi.fn(),
  restoreCourseMock: vi.fn(),
}));

vi.mock("../src/modules/courses/courseRepository.js", () => ({
  createCourse: createCourseMock,
  getCourses: getCoursesMock,
  getCourseById: getCourseByIdMock,
  updateCourse: updateCourseMock,
  purgeExpiredCourses: purgeExpiredCoursesMock,
  publishCourse: publishCourseMock,
  archiveCourse: archiveCourseMock,
  softDeleteCourse: softDeleteCourseMock,
  restoreCourse: restoreCourseMock,
}));

import {
  createCourseService,
  getCoursesService,
  updateCourseService,
  purgeExpiredCoursesService,
  publishCourseService,
  archiveCourseService,
  softDeleteCourseService,
  restoreCourseService,
} from "../src/modules/courses/courseService.js";


const adminId = "test-admin-123";

const courseData = {
  title: "JavaScript Fundamentals",
  slug: "javascript-fundamentals",
  description: "Learn JavaScript fundamentals from scratch.",
  language: "javascript",
  difficulty: "beginner",
  access_tier: "free",
};

const createdCourse = {
  id: "course-123",
  ...courseData,
  status: "draft",
  created_by: adminId,
};

const filters = {
  page: 1,
  limit: 10,
  language: "javascript",
  status: "draft",
};

const coursesResult = {
  courses: [
    {
      id: "course-123",
      title: "JavaScript Fundamentals",
      language: "javascript",
      status: "draft",
    },
  ],
  total: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCourseService", () => {
  it("calls the repository with course data and admin ID", async () => {
    createCourseMock.mockResolvedValueOnce(createdCourse);

    await createCourseService(courseData, adminId);

    expect(createCourseMock).toHaveBeenCalledTimes(1);
    expect(createCourseMock).toHaveBeenCalledWith(courseData, adminId);
  });

  it("returns the created course from the repository", async () => {
    createCourseMock.mockResolvedValueOnce(createdCourse);

    const result = await createCourseService(courseData, adminId);

    expect(result).toEqual(createdCourse);
  });

  it("propagates repository errors", async () => {
    createCourseMock.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    await expect(
      createCourseService(courseData, adminId),
    ).rejects.toThrow("Database connection failed");
  });
});

describe("getCoursesService", () => {
  it("calls getCourses with the supplied filters", async () => {
    getCoursesMock.mockResolvedValueOnce(coursesResult);

    await getCoursesService(filters);

    expect(getCoursesMock).toHaveBeenCalledTimes(1);
    expect(getCoursesMock).toHaveBeenCalledWith(filters);
  });

  it("returns courses and total count from the repository", async () => {
    getCoursesMock.mockResolvedValueOnce(coursesResult);

    const result = await getCoursesService(filters);

    expect(result).toEqual(coursesResult);
    expect(result.courses).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("propagates repository errors", async () => {
    getCoursesMock.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    await expect(
      getCoursesService(filters),
    ).rejects.toThrow("Database connection failed");
  });
});

describe("purgeExpiredCoursesService", () => {
  it("uses the default batch size of 100", async () => {
    purgeExpiredCoursesMock.mockResolvedValueOnce([]);

    await purgeExpiredCoursesService();

    expect(purgeExpiredCoursesMock).toHaveBeenCalledWith(100);
  });

  it("returns the purged count and course IDs", async () => {
    const purgedIds = ["course-123", "course-456"];
    purgeExpiredCoursesMock.mockResolvedValueOnce(purgedIds);

    const result = await purgeExpiredCoursesService(2);

    expect(purgeExpiredCoursesMock).toHaveBeenCalledWith(2);
    expect(result).toEqual({
      purgedCount: 2,
      purgedCourseIds: purgedIds,
    });
  });

  it("returns a zero count when no courses are expired", async () => {
    purgeExpiredCoursesMock.mockResolvedValueOnce([]);

    const result = await purgeExpiredCoursesService();

    expect(result).toEqual({
      purgedCount: 0,
      purgedCourseIds: [],
    });
  });

  it("propagates repository errors", async () => {
    purgeExpiredCoursesMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(
      purgeExpiredCoursesService(),
    ).rejects.toThrow("Database unavailable");
  });
});

describe("updateCourseService", () => {
  it("passes the course ID and update data to the repository", async () => {
    const updateData = { title: "Advanced JavaScript" };
    const updatedCourse = { id: "course-123", ...updateData };

    updateCourseMock.mockResolvedValueOnce(updatedCourse);

    const result = await updateCourseService("course-123", updateData);

    expect(updateCourseMock).toHaveBeenCalledWith("course-123", updateData);
    expect(result).toEqual(updatedCourse);
  });

  it("propagates repository errors", async () => {
    updateCourseMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(
      updateCourseService("course-123", { title: "Updated" }),
    ).rejects.toThrow("Database unavailable");
  });
});

describe("publishCourseService", () => {
  it("returns the published course", async () => {
    const course = { id: "course-123", status: "published" };
    publishCourseMock.mockResolvedValueOnce(course);

    await expect(publishCourseService("course-123")).resolves.toEqual(course);
    expect(publishCourseMock).toHaveBeenCalledWith("course-123");
    expect(getCourseByIdMock).not.toHaveBeenCalled();
  });

  it("throws 404 when the course does not exist", async () => {
    publishCourseMock.mockResolvedValueOnce(null);
    getCourseByIdMock.mockResolvedValueOnce(null);

    await expect(publishCourseService("missing-id")).rejects.toMatchObject({
      message: "Course not found.",
      statusCode: 404,
    });
  });

  it("throws 409 when publishing an already published course", async () => {
    publishCourseMock.mockResolvedValueOnce(null);
    getCourseByIdMock.mockResolvedValueOnce({
      id: "course-123",
      status: "published",
    });

    await expect(publishCourseService("course-123")).rejects.toMatchObject({
      message: "Course is already published.",
      statusCode: 409,
    });
  });

  it("propagates repository errors", async () => {
    publishCourseMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(publishCourseService("course-123")).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("archiveCourseService", () => {
  it("returns the archived course", async () => {
    const course = { id: "course-123", status: "archived" };
    archiveCourseMock.mockResolvedValueOnce(course);

    await expect(archiveCourseService("course-123")).resolves.toEqual(course);
    expect(archiveCourseMock).toHaveBeenCalledWith("course-123");
  });

  it("throws 404 when the course does not exist", async () => {
    archiveCourseMock.mockResolvedValueOnce(null);
    getCourseByIdMock.mockResolvedValueOnce(null);

    await expect(archiveCourseService("missing-id")).rejects.toMatchObject({
      message: "Course not found.",
      statusCode: 404,
    });
  });

  it("throws 409 when archiving is not allowed for the existing course", async () => {
    archiveCourseMock.mockResolvedValueOnce(null);
    getCourseByIdMock.mockResolvedValueOnce({
      id: "course-123",
      status: "archived",
    });

    await expect(archiveCourseService("course-123")).rejects.toMatchObject({
      message: "Course is already archived.",
      statusCode: 409,
    });
  });

it("throws 409 when archiving a draft course", async () => {
  archiveCourseMock.mockResolvedValueOnce(null);
  getCourseByIdMock.mockResolvedValueOnce({
    id: "course-123",
    status: "draft",
  });

  await expect(archiveCourseService("course-123")).rejects.toMatchObject({
    message: "Cannot archive a course with status 'draft'.",
    statusCode: 409,
  });
});


  it("propagates repository errors", async () => {
    archiveCourseMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(archiveCourseService("course-123")).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("softDeleteCourseService", () => {
  it("returns the soft-deleted course", async () => {
    const course = {
      id: "course-123",
      deleted_at: "2026-10-28T00:00:00Z",
      purge_after: "2026-11-27T00:00:00Z",
    };

    softDeleteCourseMock.mockResolvedValueOnce(course);

    await expect(softDeleteCourseService("course-123")).resolves.toEqual(course);
    expect(softDeleteCourseMock).toHaveBeenCalledWith("course-123");
  });

  it("throws 404 when the course cannot be soft-deleted", async () => {
    softDeleteCourseMock.mockResolvedValueOnce(null);

    await expect(softDeleteCourseService("missing-id")).rejects.toMatchObject({
      message: "Course not found.",
      statusCode: 404,
    });
  });

  it("propagates repository errors", async () => {
    softDeleteCourseMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(softDeleteCourseService("course-123")).rejects.toThrow(
      "Database unavailable",
    );
  });
});


describe("restoreCourseService", () => {
  it("returns the restored course", async () => {
    const course = {
      id: "course-123",
      deleted_at: null,
      purge_after: null,
    };

    restoreCourseMock.mockResolvedValueOnce(course);

    await expect(restoreCourseService("course-123")).resolves.toEqual(course);
    expect(restoreCourseMock).toHaveBeenCalledWith("course-123");
  });

  it("throws 404 when the course cannot be restored", async () => {
    restoreCourseMock.mockResolvedValueOnce(null);

    await expect(restoreCourseService("course-123")).rejects.toMatchObject({
      message: "Course not found or cannot be restored.",
      statusCode: 404,
    });
  });

  it("propagates repository errors", async () => {
    restoreCourseMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(restoreCourseService("course-123")).rejects.toThrow(
      "Database unavailable",
    );
  });
});
