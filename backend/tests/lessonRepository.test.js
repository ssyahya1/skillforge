
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../src/database/pool.js", () => ({
  pool: {
    query: queryMock,
  },
}));

import {
  findCourseById,
  createLesson,
  listLessonsByCourse,
  findLessonById,
  updateLesson,
  updateLessonStatus,
  softDeleteLesson,
  restoreLesson,
  purgeExpiredLessons,
} from "../src/modules/lessons/lessonRepository.js";

const courseId = "550e8400-e29b-41d4-a716-446655440000";
const lessonId = "650e8400-e29b-41d4-a716-446655440000";

const lessonData = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn about variables.",
  video_url: null,
  code_examples: [{ language: "javascript", code: "let count = 1;" }],
  position: 0,
};

const sampleLesson = {
  id: lessonId,
  course_id: courseId,
  ...lessonData,
  status: "draft",
  created_at: "2026-10-29T00:00:00.000Z",
  updated_at: "2026-10-29T00:00:00.000Z",
  deleted_at: null,
  purge_after: null,
};

beforeEach(() => {
  queryMock.mockReset();
});

describe("findCourseById", () => {
  it("returns the course when it exists", async () => {
    const course = {
      id: courseId,
      status: "draft",
      deleted_at: null,
    };

    queryMock.mockResolvedValueOnce({ rows: [course] });

    const result = await findCourseById(courseId);

    expect(result).toEqual(course);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1"),
      [courseId],
    );
  });

  it("returns null when the course does not exist", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(findCourseById(courseId)).resolves.toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(findCourseById(courseId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("createLesson", () => {
  it("inserts a lesson using parameterized SQL", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleLesson] });

    await createLesson(courseId, lessonData);

    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("INSERT INTO public.lessons");
    expect(sql).toContain("RETURNING");
    expect(sql).toContain("$1");
    expect(sql).toContain("$7");

    expect(parameters).toEqual([
      courseId,
      lessonData.title,
      lessonData.slug,
      lessonData.content,
      lessonData.video_url,
      JSON.stringify(lessonData.code_examples),
      lessonData.position,
    ]);
  });

  it("returns the created lesson", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleLesson] });

    await expect(createLesson(courseId, lessonData)).resolves.toEqual(
      sampleLesson,
    );
  });

  it("uses defaults for omitted optional fields", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleLesson] });

    await createLesson(courseId, {
      title: lessonData.title,
      slug: lessonData.slug,
      position: 0,
    });

    const [, parameters] = queryMock.mock.calls[0];

    expect(parameters).toEqual([
      courseId,
      lessonData.title,
      lessonData.slug,
      "",
      null,
      "[]",
      0,
    ]);
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(createLesson(courseId, lessonData)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("listLessonsByCourse", () => {
  it("returns lessons and pagination metadata", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [sampleLesson] });

    const result = await listLessonsByCourse(courseId, {
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      lessons: [sampleLesson],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("filters deleted lessons and applies pagination", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await listLessonsByCourse(courseId, {
      page: 2,
      limit: 10,
    });

    const [countSql, countParameters] = queryMock.mock.calls[0];

    expect(countSql).toContain("deleted_at IS NULL");
    expect(countSql).toContain("COUNT(*)");
    expect(countParameters).toEqual([courseId]);

    const [listSql, listParameters] = queryMock.mock.calls[1];

    expect(listSql).toContain("deleted_at IS NULL");
    expect(listSql).toContain("ORDER BY position ASC");
    expect(listSql).toContain("LIMIT $2");
    expect(listSql).toContain("OFFSET $3");
    expect(listParameters).toEqual([courseId, 10, 10]);
  });

  it("applies the optional status filter", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [sampleLesson] });

    await listLessonsByCourse(courseId, {
      page: 1,
      limit: 20,
      status: "draft",
    });

    const [countSql, countParameters] = queryMock.mock.calls[0];
    const [listSql, listParameters] = queryMock.mock.calls[1];

    expect(countSql).toContain("AND status = $2");
    expect(countParameters).toEqual([courseId, "draft"]);

    expect(listSql).toContain("AND status = $2");
    expect(listParameters).toEqual([courseId, "draft", 20, 0]);
  });

  it("returns zero total pages when no lessons exist", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await listLessonsByCourse(courseId, {
      page: 1,
      limit: 20,
    });

    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.lessons).toEqual([]);
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(
      listLessonsByCourse(courseId, {}),
    ).rejects.toThrow("Database unavailable");
  });
});

describe("findLessonById", () => {
  it("returns a lesson belonging to the requested course", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleLesson] });

    const result = await findLessonById(courseId, lessonId);

    expect(result).toEqual(sampleLesson);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("course_id = $1");
    expect(sql).toContain("id = $2");
    expect(sql).toContain("deleted_at IS NULL");
    expect(parameters).toEqual([courseId, lessonId]);
  });

  it("returns null when the lesson does not exist", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(findLessonById(courseId, lessonId)).resolves.toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(findLessonById(courseId, lessonId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("updateLesson", () => {
  it("updates only the supplied fields", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ ...sampleLesson, title: "Updated Variables" }],
    });

    const result = await updateLesson(courseId, lessonId, {
      title: "Updated Variables",
    });

    expect(result.title).toBe("Updated Variables");

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.lessons");
    expect(sql).toContain("title = $3");
    expect(sql).toContain("updated_at = NOW()");
    expect(sql).toContain("deleted_at IS NULL");
    expect(parameters).toEqual([
      courseId,
      lessonId,
      "Updated Variables",
    ]);
  });

  it("serializes code examples as JSON", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleLesson] });

    await updateLesson(courseId, lessonId, {
      code_examples: lessonData.code_examples,
    });

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("code_examples = $3::jsonb");
    expect(parameters[2]).toBe(
      JSON.stringify(lessonData.code_examples),
    );
  });

  it("returns null when the lesson cannot be updated", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await updateLesson(courseId, lessonId, {
      title: "Updated Variables",
    });

    expect(result).toBeNull();
  });

  it("does not query the database for an empty update", async () => {
    const result = await updateLesson(courseId, lessonId, {});

    expect(result).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(
      updateLesson(courseId, lessonId, {
        title: "Updated Variables",
      }),
    ).rejects.toThrow("Database unavailable");
  });
});

describe("updateLessonStatus", () => {
  it("updates the lesson status", async () => {
    const publishedLesson = {
      ...sampleLesson,
      status: "published",
    };

    queryMock.mockResolvedValueOnce({ rows: [publishedLesson] });

    const result = await updateLessonStatus(
      courseId,
      lessonId,
      "published",
    );

    expect(result).toEqual(publishedLesson);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.lessons");
    expect(sql).toContain("status = $3");
    expect(sql).toContain("updated_at = NOW()");
    expect(sql).toContain("deleted_at IS NULL");
    expect(parameters).toEqual([
      courseId,
      lessonId,
      "published",
    ]);
  });

  it("returns null when no lesson matches", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(
      updateLessonStatus(courseId, lessonId, "draft"),
    ).resolves.toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(
      updateLessonStatus(courseId, lessonId, "draft"),
    ).rejects.toThrow("Database unavailable");
  });
});

describe("softDeleteLesson", () => {
  it("sets the deletion timestamp and 30-day purge deadline", async () => {
    const deletedLesson = {
      ...sampleLesson,
      deleted_at: "2026-10-29T00:00:00.000Z",
      purge_after: "2026-11-28T00:00:00.000Z",
    };

    queryMock.mockResolvedValueOnce({ rows: [deletedLesson] });

    const result = await softDeleteLesson(courseId, lessonId);

    expect(result).toEqual(deletedLesson);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.lessons");
    expect(sql).toContain("deleted_at = NOW()");
    expect(sql).toContain("purge_after = NOW() + INTERVAL '30 days'");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("RETURNING");
    expect(parameters).toEqual([courseId, lessonId]);
  });

  it("returns null if the lesson is missing or already deleted", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(
      softDeleteLesson(courseId, lessonId),
    ).resolves.toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(softDeleteLesson(courseId, lessonId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("restoreLesson", () => {
  it("restores a lesson before its purge deadline", async () => {
    const restoredLesson = {
      ...sampleLesson,
      deleted_at: null,
      purge_after: null,
    };

    queryMock.mockResolvedValueOnce({ rows: [restoredLesson] });

    const result = await restoreLesson(courseId, lessonId);

    expect(result).toEqual(restoredLesson);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.lessons");
    expect(sql).toContain("deleted_at = NULL");
    expect(sql).toContain("purge_after = NULL");
    expect(sql).toContain("deleted_at IS NOT NULL");
    expect(sql).toContain("purge_after > NOW()");
    expect(parameters).toEqual([courseId, lessonId]);
  });

  it("returns null when the lesson cannot be restored", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(
      restoreLesson(courseId, lessonId),
    ).resolves.toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(restoreLesson(courseId, lessonId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("purgeExpiredLessons", () => {
  it("permanently deletes expired lessons in a limited batch", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "lesson-123" }, { id: "lesson-456" }],
    });

    const result = await purgeExpiredLessons(2);

    expect(result).toEqual(["lesson-123", "lesson-456"]);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("DELETE FROM public.lessons");
    expect(sql).toContain("deleted_at IS NOT NULL");
    expect(sql).toContain("purge_after <= NOW()");
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).toContain("LIMIT $1");
    expect(parameters).toEqual([2]);
  });

  it("returns an empty array when no lessons have expired", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(purgeExpiredLessons()).resolves.toEqual([]);
  });

  it("uses the default batch size of 100", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await purgeExpiredLessons();

    const [, parameters] = queryMock.mock.calls[0];

    expect(parameters).toEqual([100]);
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(purgeExpiredLessons()).rejects.toThrow(
      "Database unavailable",
    );
  });
});
