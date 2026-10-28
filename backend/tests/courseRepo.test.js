
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
  createCourse,
  getCourses,
  getCourseById,
  purgeExpiredCourses,
  publishCourse,
  archiveCourse,
  softDeleteCourse,
  restoreCourse,
} from "../src/modules/courses/courseRepository.js";

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

const sampleCourses = [
  {
    id: "course-123",
    title: "JavaScript Fundamentals",
    slug: "javascript-fundamentals",
    language: "javascript",
    difficulty: "beginner",
    status: "draft",
    access_tier: "free",
  },
  {
    id: "course-456",
    title: "Python Fundamentals",
    slug: "python-fundamentals",
    language: "python",
    difficulty: "beginner",
    status: "published",
    access_tier: "free",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCourse", () => {
  it("inserts a course using parameterized SQL", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [createdCourse],
    });

    await createCourse(courseData, adminId);

    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("INSERT INTO public.courses");
    expect(sql).toContain("RETURNING *");
    expect(sql).toContain("$1");
    expect(sql).toContain("$7");

    expect(parameters).toEqual([
      courseData.title,
      courseData.slug,
      courseData.description,
      courseData.language,
      courseData.difficulty,
      courseData.access_tier,
      adminId,
    ]);
  });

  it("returns the newly created course", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [createdCourse],
    });

    const result = await createCourse(courseData, adminId);

    expect(result).toEqual(createdCourse);
  });

  it("uses the supplied admin ID as created_by", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [createdCourse],
    });

    await createCourse(courseData, adminId);

    const [, parameters] = queryMock.mock.calls[0];

    expect(parameters[6]).toBe(adminId);
  });

  it("defaults access_tier to free when omitted", async () => {
    const { access_tier, ...courseWithoutAccessTier } = courseData;

    queryMock.mockResolvedValueOnce({
      rows: [createdCourse],
    });

    await createCourse(courseWithoutAccessTier, adminId);

    const [, parameters] = queryMock.mock.calls[0];

    expect(parameters[5]).toBe("free");
  });

  it("propagates database errors", async () => {
    const databaseError = new Error("Database connection failed");

    queryMock.mockRejectedValueOnce(databaseError);

    await expect(
      createCourse(courseData, adminId),
    ).rejects.toThrow("Database connection failed");
  });
});

describe("getCourses", () => {
  it("returns courses and total count", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: sampleCourses,
      })
      .mockResolvedValueOnce({
        rows: [{ count: "25" }],
      });

    const result = await getCourses({});

    expect(result).toEqual({
      courses: sampleCourses,
      total: 25,
    });

    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("applies multiple filters using parameterized SQL", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [sampleCourses[0]],
      })
      .mockResolvedValueOnce({
        rows: [{ count: "1" }],
      });

    await getCourses({
      language: "javascript",
      difficulty: "beginner",
      status: "draft",
    });

    expect(queryMock).toHaveBeenCalledTimes(2);

    const [coursesSql, coursesParameters] =
      queryMock.mock.calls[0];

    expect(coursesSql).toContain("deleted_at IS NULL");
    expect(coursesSql).toContain("language = $1");
    expect(coursesSql).toContain("difficulty = $2");
    expect(coursesSql).toContain("status = $3");
    expect(coursesSql).toContain("ORDER BY created_at DESC");
    expect(coursesSql).toContain("LIMIT $4");
    expect(coursesSql).toContain("OFFSET $5");

    expect(coursesParameters).toEqual([
      "javascript",
      "beginner",
      "draft",
      10,
      0,
    ]);

    const [countSql, countParameters] =
      queryMock.mock.calls[1];

    expect(countSql).toContain("SELECT COUNT(*)");
    expect(countSql).toContain("deleted_at IS NULL");
    expect(countSql).toContain("language = $1");
    expect(countSql).toContain("difficulty = $2");
    expect(countSql).toContain("status = $3");

    expect(countParameters).toEqual([
      "javascript",
      "beginner",
      "draft",
    ]);
  });

  it("applies pagination correctly", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [],
      })
      .mockResolvedValueOnce({
        rows: [{ count: "30" }],
      });

    await getCourses({
      page: "3",
      limit: "10",
    });

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("LIMIT $1 OFFSET $2");
    expect(parameters).toEqual([10, 20]);
  });

  it("works without optional filters", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: sampleCourses,
      })
      .mockResolvedValueOnce({
        rows: [{ count: "2" }],
      });

    const result = await getCourses({});

    const [coursesSql, coursesParameters] =
      queryMock.mock.calls[0];

    expect(coursesSql).toContain("WHERE deleted_at IS NULL");
    expect(coursesSql).toContain("LIMIT $1 OFFSET $2");
    expect(coursesParameters).toEqual([10, 0]);

    const [countSql, countParameters] =
      queryMock.mock.calls[1];

    expect(countSql).toContain("WHERE deleted_at IS NULL");
    expect(countParameters).toEqual([]);

    expect(result.total).toBe(2);
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    await expect(getCourses({})).rejects.toThrow(
      "Database connection failed",
    );
  });
});

describe("getCourseById", () => {
  const courseId = "550e8400-e29b-41d4-a716-446655440000";

  const mockCourse = {
    id: courseId,
    title: "JavaScript Fundamentals",
    slug: "javascript-fundamentals",
    description: "Learn the fundamentals of JavaScript.",
    language: "javascript",
    difficulty: "beginner",
    status: "draft",
    access_tier: "free",
  };

  it("returns the course when it exists", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [mockCourse],
    });

    const result = await getCourseById(courseId);

    expect(result).toEqual(mockCourse);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1"),
      [courseId],
    );
  });

  it("returns null when the course does not exist", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [],
    });

    const result = await getCourseById(courseId);

    expect(result).toBeNull();
  });

  it("uses a parameterized query for the course ID", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [mockCourse],
    });

    await getCourseById(courseId);

    const [query, values] = queryMock.mock.calls[0];

    expect(query).toContain("$1");
    expect(values).toEqual([courseId]);
    expect(query).not.toContain(courseId);
    expect(query).toContain("deleted_at IS NULL");
  });
});

describe("purgeExpiredCourses", () => {
  it("deletes expired soft-deleted courses in a limited batch", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "course-123" }, { id: "course-456" }],
    });

    const result = await purgeExpiredCourses(2);

    expect(result).toEqual(["course-123", "course-456"]);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, parameters] = queryMock.mock.calls[0];

    expect(sql).toContain("DELETE FROM public.courses");
    expect(sql).toContain("deleted_at IS NOT NULL");
    expect(sql).toContain("purge_after <= NOW()");
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).toContain("LIMIT $1");
    expect(parameters).toEqual([2]);
  });

  it("returns an empty array when no courses have expired", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await purgeExpiredCourses(100);

    expect(result).toEqual([]);
  });

  it("uses the default batch size of 100", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await purgeExpiredCourses();

    const [, parameters] = queryMock.mock.calls[0];

    expect(parameters).toEqual([100]);
  });

  it("propagates database errors", async () => {
    const databaseError = new Error("Database unavailable");

    queryMock.mockRejectedValueOnce(databaseError);

    await expect(purgeExpiredCourses()).rejects.toThrow(
      "Database unavailable"
    );
  });
});

describe("publishCourse", () => {
  const courseId = "course-123";

  it("publishes a draft or archived course", async () => {
    const publishedCourse = {
      id: courseId,
      status: "published",
    };

    queryMock.mockResolvedValueOnce({
      rows: [publishedCourse],
    });

    const result = await publishCourse(courseId);

    expect(result).toEqual(publishedCourse);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, values] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.courses");
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("status IN ('draft', 'archived')");
    expect(sql).toContain("updated_at = NOW()");
    expect(values).toEqual([courseId]);
  });

  it("returns null when the course cannot be published", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await publishCourse(courseId);

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(publishCourse(courseId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("archiveCourse", () => {
  const courseId = "course-123";

  it("archives a published course", async () => {
    const archivedCourse = {
      id: courseId,
      status: "archived",
    };

    queryMock.mockResolvedValueOnce({
      rows: [archivedCourse],
    });

    const result = await archiveCourse(courseId);

    expect(result).toEqual(archivedCourse);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, values] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.courses");
    expect(sql).toContain("status = 'archived'");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain("updated_at = NOW()");
    expect(values).toEqual([courseId]);
  });

  it("returns null when the course cannot be archived", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await archiveCourse(courseId);

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(archiveCourse(courseId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("softDeleteCourse", () => {
  const courseId = "course-123";

  it("soft-deletes a course and sets its purge deadline", async () => {
    const deletedCourse = {
      id: courseId,
      deleted_at: "2026-10-28T02:00:00.000Z",
      purge_after: "2026-11-27T02:00:00.000Z",
    };

    queryMock.mockResolvedValueOnce({
      rows: [deletedCourse],
    });

    const result = await softDeleteCourse(courseId);

    expect(result).toEqual(deletedCourse);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, values] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.courses");
    expect(sql).toContain("deleted_at = NOW()");
    expect(sql).toContain("purge_after = NOW() + INTERVAL '30 days'");
    expect(sql).toContain("updated_at = NOW()");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("RETURNING *");
    expect(values).toEqual([courseId]);
  });

  it("returns null when the course is missing or already deleted", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await softDeleteCourse(courseId);

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(softDeleteCourse(courseId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("restoreCourse", () => {
  const courseId = "course-123";

  it("restores a deleted course before its purge deadline", async () => {
    const restoredCourse = {
      id: courseId,
      deleted_at: null,
      purge_after: null,
    };

    queryMock.mockResolvedValueOnce({
      rows: [restoredCourse],
    });

    const result = await restoreCourse(courseId);

    expect(result).toEqual(restoredCourse);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, values] = queryMock.mock.calls[0];

    expect(sql).toContain("UPDATE public.courses");
    expect(sql).toContain("deleted_at = NULL");
    expect(sql).toContain("purge_after = NULL");
    expect(sql).toContain("updated_at = NOW()");
    expect(sql).toContain("deleted_at IS NOT NULL");
    expect(sql).toContain("purge_after > NOW()");
    expect(sql).toContain("RETURNING *");
    expect(values).toEqual([courseId]);
  });

  it("returns null when the course cannot be restored", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await restoreCourse(courseId);

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    await expect(restoreCourse(courseId)).rejects.toThrow(
      "Database unavailable",
    );
  });
});
