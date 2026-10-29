
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCourseById: vi.fn(),
  createLesson: vi.fn(),
  listLessonsByCourse: vi.fn(),
  findLessonById: vi.fn(),
  updateLesson: vi.fn(),
  updateLessonStatus: vi.fn(),
  softDeleteLesson: vi.fn(),
  restoreLesson: vi.fn(),
  purgeExpiredLessons: vi.fn(),
}));

vi.mock("../src/modules/lessons/lessonRepository.js", () => mocks);

import {
  createLessonService,
  getLessonByIdService,
  listLessonsService,
  updateLessonService,
  publishLessonService,
  unpublishLessonService,
  softDeleteLessonService,
  restoreLessonService,
  purgeExpiredLessonService,
} from "../src/modules/lessons/lessonService.js";

const courseId = "11111111-1111-4111-8111-111111111111";
const lessonId = "22222222-2222-4222-8222-222222222222";

const activeCourse = {
  id: courseId,
  status: "published",
  deleted_at: null,
};

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
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
  purge_after: null,
};

const validLessonData = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn how variables work.",
  position: 0,
};

function expectServiceError(promise, statusCode, message) {
  return expect(promise).rejects.toMatchObject({
    statusCode,
    message,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.findCourseById.mockResolvedValue(activeCourse);
  mocks.createLesson.mockResolvedValue(sampleLesson);
  mocks.listLessonsByCourse.mockResolvedValue({
    lessons: [sampleLesson],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  });
  mocks.findLessonById.mockResolvedValue(sampleLesson);
  mocks.updateLesson.mockResolvedValue({
    ...sampleLesson,
    title: "Updated Lesson",
  });
  mocks.updateLessonStatus.mockImplementation(
    async (_courseId, _lessonId, status) => ({
      ...sampleLesson,
      status,
    })
  );
  mocks.softDeleteLesson.mockResolvedValue({
    ...sampleLesson,
    deleted_at: "2026-01-02T00:00:00.000Z",
    purge_after: "2026-02-01T00:00:00.000Z",
  });
  mocks.restoreLesson.mockResolvedValue(sampleLesson);
  mocks.purgeExpiredLessons.mockResolvedValue([lessonId]);
});

describe("createLessonService", () => {
  it("creates a lesson for an existing active course", async () => {
    const result = await createLessonService(courseId, validLessonData);

    expect(result).toEqual(sampleLesson);
    expect(mocks.findCourseById).toHaveBeenCalledWith(courseId);
    expect(mocks.createLesson).toHaveBeenCalledWith(
      courseId,
      validLessonData
    );
  });

  it("rejects creation when the course does not exist", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expectServiceError(
      createLessonService(courseId, validLessonData),
      404,
      "Course not found."
    );

    expect(mocks.createLesson).not.toHaveBeenCalled();
  });

  it("rejects creation when the course is soft-deleted", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      deleted_at: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      createLessonService(courseId, validLessonData)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.createLesson).not.toHaveBeenCalled();
  });

  it("rejects creation for an archived course", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      status: "archived",
    });

    await expect(
      createLessonService(courseId, validLessonData)
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.createLesson).not.toHaveBeenCalled();
  });
});

describe("getLessonByIdService", () => {
  it("returns a lesson belonging to the requested course", async () => {
    const result = await getLessonByIdService(courseId, lessonId);

    expect(result).toEqual(sampleLesson);
    expect(mocks.findLessonById).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("rejects when the parent course does not exist", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expect(
      getLessonByIdService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.findLessonById).not.toHaveBeenCalled();
  });

  it("rejects when the lesson does not exist", async () => {
    mocks.findLessonById.mockResolvedValue(null);

    await expect(
      getLessonByIdService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects when the parent course is soft-deleted", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      deleted_at: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      getLessonByIdService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.findLessonById).not.toHaveBeenCalled();
  });
});

describe("listLessonsService", () => {
  it("returns lessons and pagination for a valid course", async () => {
    const queryOptions = {
      page: 1,
      limit: 20,
      status: "draft",
    };

    const result = await listLessonsService(courseId, queryOptions);

    expect(result).toEqual({
      lessons: [sampleLesson],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(mocks.listLessonsByCourse).toHaveBeenCalledWith(
      courseId,
      queryOptions
    );
  });

  it("rejects listing lessons for a missing course", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expect(
      listLessonsService(courseId, { page: 1, limit: 20 })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.listLessonsByCourse).not.toHaveBeenCalled();
  });

  it("rejects listing lessons for a soft-deleted course", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      deleted_at: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      listLessonsService(courseId, { page: 1, limit: 20 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updateLessonService", () => {
  it("updates an existing lesson", async () => {
    const updateData = { title: "Updated Lesson" };

    const result = await updateLessonService(
      courseId,
      lessonId,
      updateData
    );

    expect(result.title).toBe("Updated Lesson");
    expect(mocks.updateLesson).toHaveBeenCalledWith(
      courseId,
      lessonId,
      updateData
    );
  });

  it("rejects empty content updates for published lessons before writing", async () => {
    mocks.findLessonById.mockResolvedValue({
      ...sampleLesson,
      status: "published",
    });

    await expect(
      updateLessonService(courseId, lessonId, { content: "   " })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Lesson content cannot be empty.",
    });

    expect(mocks.updateLesson).not.toHaveBeenCalled();
  });

  it("allows blank content updates for draft lessons", async () => {
    const updateData = { content: "   " };

    await updateLessonService(courseId, lessonId, updateData);

    expect(mocks.updateLesson).toHaveBeenCalledWith(
      courseId,
      lessonId,
      updateData
    );
  });

  it("allows unrelated updates to published lessons with existing content", async () => {
    mocks.findLessonById.mockResolvedValue({
      ...sampleLesson,
      status: "published",
    });
    const updateData = { title: "Updated Published Lesson" };

    await updateLessonService(courseId, lessonId, updateData);

    expect(mocks.updateLesson).toHaveBeenCalledWith(
      courseId,
      lessonId,
      updateData
    );
  });

  it("rejects updates when the course does not exist", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expect(
      updateLessonService(courseId, lessonId, {
        title: "Updated Lesson",
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.updateLesson).not.toHaveBeenCalled();
  });

  it("rejects updates for an archived course", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      status: "archived",
    });

    await expect(
      updateLessonService(courseId, lessonId, {
        title: "Updated Lesson",
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.updateLesson).not.toHaveBeenCalled();
  });

  it("rejects updates when the lesson does not exist", async () => {
    mocks.findLessonById.mockResolvedValue(null);

    await expect(
      updateLessonService(courseId, lessonId, {
        title: "Updated Lesson",
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.updateLesson).not.toHaveBeenCalled();
  });

  it("rejects updates when the parent course is soft-deleted", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      deleted_at: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      updateLessonService(courseId, lessonId, {
        title: "Updated Lesson",
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.updateLesson).not.toHaveBeenCalled();
  });

  it("rejects when the repository cannot update the lesson", async () => {
    mocks.updateLesson.mockResolvedValue(null);

    await expect(
      updateLessonService(courseId, lessonId, {
        title: "Updated Lesson",
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("publishLessonService", () => {
  it("publishes a valid draft lesson", async () => {
    const result = await publishLessonService(courseId, lessonId);

    expect(result.status).toBe("published");
    expect(mocks.updateLessonStatus).toHaveBeenCalledWith(
      courseId,
      lessonId,
      "published"
    );
  });

  it("rejects publishing when the course does not exist", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expect(
      publishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.updateLessonStatus).not.toHaveBeenCalled();
  });

  it("rejects publishing for an archived course", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      status: "archived",
    });

    await expect(
      publishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.updateLessonStatus).not.toHaveBeenCalled();
  });

  it("rejects publishing when the lesson does not exist", async () => {
    mocks.findLessonById.mockResolvedValue(null);

    await expect(
      publishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects publishing a lesson that is already published", async () => {
    mocks.findLessonById.mockResolvedValue({
      ...sampleLesson,
      status: "published",
    });

    await expect(
      publishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.updateLessonStatus).not.toHaveBeenCalled();
  });

  it("rejects publishing a lesson with empty content", async () => {
    mocks.findLessonById.mockResolvedValue({
      ...sampleLesson,
      content: "   ",
    });

    await expect(
      publishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mocks.updateLessonStatus).not.toHaveBeenCalled();
  });

  it("rejects when the repository cannot publish the lesson", async () => {
    mocks.updateLessonStatus.mockResolvedValue(null);

    await expect(
      publishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("unpublishLessonService", () => {
  it("returns a published lesson to draft status", async () => {
    mocks.findLessonById.mockResolvedValue({
      ...sampleLesson,
      status: "published",
    });

    const result = await unpublishLessonService(courseId, lessonId);

    expect(result.status).toBe("draft");
    expect(mocks.updateLessonStatus).toHaveBeenCalledWith(
      courseId,
      lessonId,
      "draft"
    );
  });

  it("rejects unpublishing a draft lesson", async () => {
    await expect(
      unpublishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.updateLessonStatus).not.toHaveBeenCalled();
  });

  it("rejects unpublishing when the lesson does not exist", async () => {
    mocks.findLessonById.mockResolvedValue(null);

    await expect(
      unpublishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects unpublishing for an archived course", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      status: "archived",
    });

    await expect(
      unpublishLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.updateLessonStatus).not.toHaveBeenCalled();
  });
});

describe("softDeleteLessonService", () => {
  it("soft-deletes an existing lesson", async () => {
    const result = await softDeleteLessonService(courseId, lessonId);

    expect(result.deleted_at).toBeTruthy();
    expect(result.purge_after).toBeTruthy();
    expect(mocks.softDeleteLesson).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("rejects deletion when the lesson does not exist", async () => {
    mocks.findLessonById.mockResolvedValue(null);

    await expect(
      softDeleteLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.softDeleteLesson).not.toHaveBeenCalled();
  });

  it("rejects deletion when the parent course does not exist", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expect(
      softDeleteLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.softDeleteLesson).not.toHaveBeenCalled();
  });

  it("rejects when the repository cannot soft-delete the lesson", async () => {
    mocks.softDeleteLesson.mockResolvedValue(null);

    await expect(
      softDeleteLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("restoreLessonService", () => {
  it("restores a soft-deleted lesson", async () => {
    const result = await restoreLessonService(courseId, lessonId);

    expect(result).toEqual(sampleLesson);
    expect(mocks.restoreLesson).toHaveBeenCalledWith(
      courseId,
      lessonId
    );
  });

  it("rejects restoration when the course does not exist", async () => {
    mocks.findCourseById.mockResolvedValue(null);

    await expect(
      restoreLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.restoreLesson).not.toHaveBeenCalled();
  });

  it("rejects restoration for a soft-deleted course", async () => {
    mocks.findCourseById.mockResolvedValue({
      ...activeCourse,
      deleted_at: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      restoreLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.restoreLesson).not.toHaveBeenCalled();
  });

  it("rejects restoration when the lesson is missing or expired", async () => {
    mocks.restoreLesson.mockResolvedValue(null);

    await expect(
      restoreLessonService(courseId, lessonId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("purgeExpiredLessonService", () => {
  it("purges expired lessons and returns their count", async () => {
    const result = await purgeExpiredLessonService(25);

    expect(result).toEqual({
      purgedCount: 1,
      purgedLessonIds: [lessonId],
    });
    expect(mocks.purgeExpiredLessons).toHaveBeenCalledWith(25);
  });

  it("uses the default batch size", async () => {
    await purgeExpiredLessonService();

    expect(mocks.purgeExpiredLessons).toHaveBeenCalledWith(100);
  });

  it.each([0, -1, 501, 1.5, "25"])(
    "rejects an invalid batch size: %s",
    async (batchSize) => {
      await expect(
        purgeExpiredLessonService(batchSize)
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(mocks.purgeExpiredLessons).not.toHaveBeenCalled();
    }
  );

  it("returns an empty result when no expired lessons exist", async () => {
    mocks.purgeExpiredLessons.mockResolvedValue([]);

    const result = await purgeExpiredLessonService(10);

    expect(result).toEqual({
      purgedCount: 0,
      purgedLessonIds: [],
    });
  });
});
