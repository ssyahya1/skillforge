import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/database/pool.js", () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from "../../src/database/pool.js";

import {
  getPublishedCourses,
  getPublishedCourseById,
  getPublishedLessonsByCourse,
  getPublishedLessonById,
  getPublishedExercisesByLesson,
  getPublishedExerciseById,
  getPublishedExerciseLanguages,
  getVisibleTestCases,
  getPublishedLessonByIdOnly,
  getPublishedExerciseByIdOnly,
} from "../../src/modules/student-learning/studentLearningRepository.js";

describe("Student Learning Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublishedCourses", () => {
    it("should return published courses with pagination", async () => {
      const courses = [{ id: "course-1", title: "JavaScript Fundamentals" }];

      pool.query
        .mockResolvedValueOnce({ rows: courses })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const result = await getPublishedCourses({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: courses,
        total: 1,
      });

      expect(pool.query).toHaveBeenCalledTimes(2);

      const [dataQuery, dataValues] = pool.query.mock.calls[0];
      const [countQuery, countValues] = pool.query.mock.calls[1];

      expect(dataQuery).toContain("c.status = 'published'");
      expect(dataQuery).toContain("c.deleted_at IS NULL");
      expect(dataQuery).toContain("LIMIT $1");
      expect(dataQuery).toContain("OFFSET $2");

      expect(dataValues).toEqual([10, 0]);

      expect(countQuery).toContain("COUNT(*)");
      expect(countValues).toEqual([]);
    });

    it("should filter courses by language", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      await getPublishedCourses({
        page: 1,
        limit: 10,
        language: "javascript",
      });

      const [dataQuery, dataValues] = pool.query.mock.calls[0];

      expect(dataQuery).toContain("c.language = $1");
      expect(dataValues).toEqual(["javascript", 10, 0]);
    });

    it("should filter courses by difficulty", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      await getPublishedCourses({
        page: 1,
        limit: 10,
        difficulty: "beginner",
      });

      const [dataQuery, dataValues] = pool.query.mock.calls[0];

      expect(dataQuery).toContain("c.difficulty = $1");
      expect(dataValues).toEqual(["beginner", 10, 0]);
    });

    it("should filter courses by language and difficulty", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      await getPublishedCourses({
        page: 2,
        limit: 5,
        language: "python",
        difficulty: "intermediate",
      });

      const [dataQuery, dataValues] = pool.query.mock.calls[0];
      const [countQuery, countValues] = pool.query.mock.calls[1];

      expect(dataQuery).toContain("c.language = $1");
      expect(dataQuery).toContain("c.difficulty = $2");

      expect(dataValues).toEqual(["python", "intermediate", 5, 5]);

      expect(countValues).toEqual(["python", "intermediate"]);

      expect(countQuery).toContain("c.deleted_at IS NULL");
    });

    it("should return an empty result when no courses exist", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      const result = await getPublishedCourses({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });

    it("should propagate database errors", async () => {
      const error = new Error("Database error");

      pool.query.mockRejectedValueOnce(error);

      await expect(getPublishedCourses({ page: 1, limit: 10 })).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getPublishedCourseById", () => {
    it("should return a published course by ID", async () => {
      const course = {
        id: "course-1",
        title: "JavaScript Fundamentals",
      };

      pool.query.mockResolvedValueOnce({
        rows: [course],
      });

      const result = await getPublishedCourseById("course-1");

      expect(result).toEqual(course);
      expect(pool.query).toHaveBeenCalledTimes(1);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");
      expect(values).toEqual(["course-1"]);
    });

    it("should return null when the course does not exist or is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getPublishedCourseById("course-1");

      expect(result).toBeNull();
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(getPublishedCourseById("course-1")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getPublishedLessonsByCourse", () => {
    it("should return published lessons with pagination", async () => {
      const lessons = [{ id: "lesson-1", title: "Variables" }];

      pool.query
        .mockResolvedValueOnce({ rows: lessons })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const result = await getPublishedLessonsByCourse("course-1", {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: lessons,
        total: 1,
      });

      expect(pool.query).toHaveBeenCalledTimes(2);

      const [dataQuery, dataValues] = pool.query.mock.calls[0];
      const [countQuery, countValues] = pool.query.mock.calls[1];

      expect(dataQuery).toContain("l.status = 'published'");
      expect(dataQuery).toContain("l.deleted_at IS NULL");
      expect(dataQuery).toContain("c.status = 'published'");
      expect(dataQuery).toContain("c.deleted_at IS NULL");
      expect(dataQuery).toContain("ORDER BY l.position ASC");

      expect(dataValues).toEqual(["course-1", 20, 0]);
      expect(countValues).toEqual(["course-1"]);

      expect(countQuery).toContain("COUNT(*)");
    });

    it("should calculate the correct offset for later pages", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      await getPublishedLessonsByCourse("course-1", { page: 3, limit: 10 });

      const [, values] = pool.query.mock.calls[0];

      expect(values).toEqual(["course-1", 10, 20]);
    });

    it("should return an empty result when no published lessons exist", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      const result = await getPublishedLessonsByCourse("course-1", {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(getPublishedLessonsByCourse("course-1")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getPublishedLessonById", () => {
    it("should return a published lesson belonging to a published course", async () => {
      const lesson = {
        id: "lesson-1",
        course_id: "course-1",
        title: "Variables",
      };

      pool.query.mockResolvedValueOnce({
        rows: [lesson],
      });

      const result = await getPublishedLessonById("course-1", "lesson-1");

      expect(result).toEqual(lesson);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("l.status = 'published'");
      expect(query).toContain("l.deleted_at IS NULL");
      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");

      expect(values).toEqual(["course-1", "lesson-1"]);
    });

    it("should return null when the lesson does not belong to the requested course", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getPublishedLessonById("course-1", "lesson-2");

      expect(result).toBeNull();
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        getPublishedLessonById("course-1", "lesson-1"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("getPublishedExercisesByLesson", () => {
    it("should return published exercises with pagination", async () => {
      const exercises = [{ id: "exercise-1", title: "Reverse a String" }];

      pool.query
        .mockResolvedValueOnce({ rows: exercises })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const result = await getPublishedExercisesByLesson("lesson-1", {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: exercises,
        total: 1,
      });

      expect(pool.query).toHaveBeenCalledTimes(2);

      const [dataQuery, dataValues] = pool.query.mock.calls[0];
      const [countQuery, countValues] = pool.query.mock.calls[1];

      expect(dataQuery).toContain("e.status = 'published'");
      expect(dataQuery).toContain("l.status = 'published'");
      expect(dataQuery).toContain("l.deleted_at IS NULL");
      expect(dataQuery).toContain("c.status = 'published'");
      expect(dataQuery).toContain("c.deleted_at IS NULL");
      expect(dataQuery).toContain("ORDER BY e.position ASC");

      expect(dataValues).toEqual(["lesson-1", 20, 0]);
      expect(countValues).toEqual(["lesson-1"]);

      expect(countQuery).toContain("COUNT(*)");
    });

    it("should calculate the correct offset for later pages", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      await getPublishedExercisesByLesson("lesson-1", { page: 2, limit: 15 });

      const [, values] = pool.query.mock.calls[0];

      expect(values).toEqual(["lesson-1", 15, 15]);
    });

    it("should return an empty result when no published exercises exist", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: "0" }] });

      const result = await getPublishedExercisesByLesson("lesson-1");

      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(getPublishedExercisesByLesson("lesson-1")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getPublishedExerciseById", () => {
    it("should return a published exercise belonging to an accessible lesson", async () => {
      const exercise = {
        id: "exercise-1",
        lesson_id: "lesson-1",
        title: "Reverse a String",
      };

      pool.query.mockResolvedValueOnce({
        rows: [exercise],
      });

      const result = await getPublishedExerciseById("lesson-1", "exercise-1");

      expect(result).toEqual(exercise);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("e.status = 'published'");
      expect(query).toContain("l.status = 'published'");
      expect(query).toContain("l.deleted_at IS NULL");
      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");

      expect(values).toEqual(["lesson-1", "exercise-1"]);
    });

    it("should return null when the exercise does not belong to the requested lesson", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getPublishedExerciseById("lesson-1", "exercise-2");

      expect(result).toBeNull();
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        getPublishedExerciseById("lesson-1", "exercise-1"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("getPublishedExerciseLanguages", () => {
    it("should return configured languages for a published exercise", async () => {
      const languages = [
        {
          id: "language-1",
          exercise_id: "exercise-1",
          language: "javascript",
          runtime_version: "24",
        },
        {
          id: "language-2",
          exercise_id: "exercise-1",
          language: "python",
          runtime_version: "3.12",
        },
      ];

      pool.query.mockResolvedValueOnce({
        rows: languages,
      });

      const result = await getPublishedExerciseLanguages("exercise-1");

      expect(result).toEqual(languages);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("FROM public.exercise_languages el");
      expect(query).toContain("e.status = 'published'");
      expect(query).toContain("l.status = 'published'");
      expect(query).toContain("l.deleted_at IS NULL");
      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");
      expect(query).toContain("ORDER BY el.language ASC");

      expect(query).not.toContain("private.exercise_language_solutions");

      expect(values).toEqual(["exercise-1"]);
    });

    it("should return an empty array when no languages are configured", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getPublishedExerciseLanguages("exercise-1");

      expect(result).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(getPublishedExerciseLanguages("exercise-1")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getVisibleTestCases", () => {
    it("should return only visible test cases for a published exercise", async () => {
      const testCases = [
        {
          id: "test-case-1",
          exercise_id: "exercise-1",
          input_data: { value: "hello" },
          expected_output: { result: "olleh" },
          display_order: 1,
        },
      ];

      pool.query.mockResolvedValueOnce({
        rows: testCases,
      });

      const result = await getVisibleTestCases("exercise-1");

      expect(result).toEqual(testCases);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("tc.visibility = 'visible'");
      expect(query).toContain("e.status = 'published'");
      expect(query).toContain("l.status = 'published'");
      expect(query).toContain("l.deleted_at IS NULL");
      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");
      expect(query).toContain("ORDER BY tc.display_order ASC");

      expect(query).not.toContain("private.exercise_language_solutions");

      expect(values).toEqual(["exercise-1"]);
    });

    it("should return an empty array when no visible test cases exist", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getVisibleTestCases("exercise-1");

      expect(result).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(getVisibleTestCases("exercise-1")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getPublishedLessonByIdOnly", () => {
    const lessonId = "11111111-1111-4111-8111-111111111111";

    it("should return a published lesson when the lesson and course are accessible", async () => {
      const mockLesson = {
        id: lessonId,
        course_id: "22222222-2222-4222-8222-222222222222",
        title: "JavaScript Basics",
        slug: "javascript-basics",
        status: "published",
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockLesson],
      });

      const result = await getPublishedLessonByIdOnly(lessonId);

      expect(result).toEqual(mockLesson);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("l.status = 'published'");
      expect(query).toContain("l.deleted_at IS NULL");
      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");
      expect(values).toEqual([lessonId]);
    });

    it("should return null when the lesson is not found or accessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getPublishedLessonByIdOnly(lessonId);

      expect(result).toBeNull();
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(getPublishedLessonByIdOnly(lessonId)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("getPublishedExerciseByIdOnly", () => {
    const exerciseId = "33333333-3333-4333-8333-333333333333";

    it("should return a published exercise when its hierarchy is accessible", async () => {
      const mockExercise = {
        id: exerciseId,
        lesson_id: "11111111-1111-4111-8111-111111111111",
        title: "Variables Challenge",
        instructions: "Complete the challenge.",
        difficulty: "beginner",
        status: "published",
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockExercise],
      });

      const result = await getPublishedExerciseByIdOnly(exerciseId);

      expect(result).toEqual(mockExercise);

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("e.status = 'published'");
      expect(query).toContain("l.status = 'published'");
      expect(query).toContain("l.deleted_at IS NULL");
      expect(query).toContain("c.status = 'published'");
      expect(query).toContain("c.deleted_at IS NULL");
      expect(values).toEqual([exerciseId]);
    });

    it("should return null when the exercise is not found or accessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getPublishedExerciseByIdOnly(exerciseId);

      expect(result).toBeNull();
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(getPublishedExerciseByIdOnly(exerciseId)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });
});
