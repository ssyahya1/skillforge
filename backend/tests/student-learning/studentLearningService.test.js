import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../src/modules/student-learning/studentLearningRepository.js",
  () => ({
    getPublishedCourses: vi.fn(),
    getPublishedCourseById: vi.fn(),
    getPublishedLessonsByCourse: vi.fn(),
    getPublishedLessonById: vi.fn(),
    getPublishedLessonByIdOnly: vi.fn(),
    getPublishedExercisesByLesson: vi.fn(),
    getPublishedExerciseById: vi.fn(),
    getPublishedExerciseByIdOnly: vi.fn(),
    getPublishedExerciseLanguages: vi.fn(),
    getVisibleTestCases: vi.fn(),
  }),
);

import * as studentLearningRepository from "../../src/modules/student-learning/studentLearningRepository.js";

import {
  getCoursesService,
  getCourseByIdService,
  getLessonsByCourseIdService,
  getLessonByIdService,
  getExercisesByLessonService,
  getExerciseByIdService,
  getExerciseLanguagesService,
  getVisibleTestCasesService,
} from "../../src/modules/student-learning/studentLearningService.js";

describe("Student Learning Service", () => {
  const courseId = "550e8400-e29b-41d4-a716-446655440000";
  const lessonId = "650e8400-e29b-41d4-a716-446655440000";
  const exerciseId = "750e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCoursesService", () => {
    it("should return published courses", async () => {
      const filters = {
        page: 1,
        limit: 10,
        language: "javascript",
        difficulty: "beginner",
      };

      const mockCourses = [{ id: courseId, title: "JavaScript Fundamentals" }];

      studentLearningRepository.getPublishedCourses.mockResolvedValueOnce(
        mockCourses,
      );

      const result = await getCoursesService(filters);

      expect(result).toEqual(mockCourses);
      expect(
        studentLearningRepository.getPublishedCourses,
      ).toHaveBeenCalledWith(filters);
    });

    it("should return an empty array when no courses exist", async () => {
      studentLearningRepository.getPublishedCourses.mockResolvedValueOnce([]);

      const result = await getCoursesService({ page: 1, limit: 10 });

      expect(result).toEqual([]);
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedCourses.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(getCoursesService({ page: 1, limit: 10 })).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("getCourseByIdService", () => {
    it("should return a published course", async () => {
      const mockCourse = {
        id: courseId,
        title: "JavaScript Fundamentals",
      };

      studentLearningRepository.getPublishedCourseById.mockResolvedValueOnce(
        mockCourse,
      );

      const result = await getCourseByIdService(courseId);

      expect(result).toEqual(mockCourse);
      expect(
        studentLearningRepository.getPublishedCourseById,
      ).toHaveBeenCalledWith(courseId);
    });

    it("should throw an error when the course is not found or accessible", async () => {
      studentLearningRepository.getPublishedCourseById.mockResolvedValueOnce(
        null,
      );

      await expect(getCourseByIdService(courseId)).rejects.toThrow(
        "Course not found",
      );
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedCourseById.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(getCourseByIdService(courseId)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("getLessonsByCourseIdService", () => {
    it("should return published lessons for an accessible course", async () => {
      const filters = { page: 1, limit: 20 };

      const mockCourse = {
        id: courseId,
        title: "JavaScript Fundamentals",
      };

      const mockLessons = [
        { id: lessonId, title: "Introduction to JavaScript" },
      ];

      studentLearningRepository.getPublishedCourseById.mockResolvedValueOnce(
        mockCourse,
      );

      studentLearningRepository.getPublishedLessonsByCourse.mockResolvedValueOnce(
        mockLessons,
      );

      const result = await getLessonsByCourseIdService(courseId, filters);

      expect(result).toEqual(mockLessons);

      expect(
        studentLearningRepository.getPublishedCourseById,
      ).toHaveBeenCalledWith(courseId);

      expect(
        studentLearningRepository.getPublishedLessonsByCourse,
      ).toHaveBeenCalledWith(courseId, filters);
    });

    it("should throw an error when the course is not found or accessible", async () => {
      studentLearningRepository.getPublishedCourseById.mockResolvedValueOnce(
        null,
      );

      await expect(
        getLessonsByCourseIdService(courseId, { page: 1, limit: 20 }),
      ).rejects.toThrow("Course not found");

      expect(
        studentLearningRepository.getPublishedLessonsByCourse,
      ).not.toHaveBeenCalled();
    });

    it("should return an empty array when the course has no published lessons", async () => {
      studentLearningRepository.getPublishedCourseById.mockResolvedValueOnce({
        id: courseId,
      });

      studentLearningRepository.getPublishedLessonsByCourse.mockResolvedValueOnce(
        [],
      );

      const result = await getLessonsByCourseIdService(courseId, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual([]);
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedCourseById.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(
        getLessonsByCourseIdService(courseId, { page: 1, limit: 20 }),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("getLessonByIdService", () => {
    it("should return a published lesson belonging to the course", async () => {
      const mockLesson = {
        id: lessonId,
        course_id: courseId,
        title: "Introduction to JavaScript",
      };

      studentLearningRepository.getPublishedLessonById.mockResolvedValueOnce(
        mockLesson,
      );

      const result = await getLessonByIdService(courseId, lessonId);

      expect(result).toEqual(mockLesson);

      expect(
        studentLearningRepository.getPublishedLessonById,
      ).toHaveBeenCalledWith(courseId, lessonId);
    });

    it("should throw an error when the lesson is not found or accessible", async () => {
      studentLearningRepository.getPublishedLessonById.mockResolvedValueOnce(
        null,
      );

      await expect(getLessonByIdService(courseId, lessonId)).rejects.toThrow(
        "Lesson not found",
      );
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedLessonById.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(getLessonByIdService(courseId, lessonId)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("getExercisesByLessonService", () => {
    it("should return published exercises for an accessible lesson", async () => {
      const filters = { page: 1, limit: 20 };

      const mockLesson = {
        id: lessonId,
        title: "Introduction to JavaScript",
      };

      const mockExercises = [{ id: exerciseId, title: "Variables Challenge" }];

      studentLearningRepository.getPublishedLessonByIdOnly.mockResolvedValueOnce(
        mockLesson,
      );

      studentLearningRepository.getPublishedExercisesByLesson.mockResolvedValueOnce(
        mockExercises,
      );

      const result = await getExercisesByLessonService(lessonId, filters);

      expect(result).toEqual(mockExercises);

      expect(
        studentLearningRepository.getPublishedLessonByIdOnly,
      ).toHaveBeenCalledWith(lessonId);

      expect(
        studentLearningRepository.getPublishedExercisesByLesson,
      ).toHaveBeenCalledWith(lessonId, filters);
    });

    it("should throw an error when the lesson is not found or accessible", async () => {
      studentLearningRepository.getPublishedLessonByIdOnly.mockResolvedValueOnce(
        null,
      );

      await expect(
        getExercisesByLessonService(lessonId, { page: 1, limit: 20 }),
      ).rejects.toThrow("Lesson not found");

      expect(
        studentLearningRepository.getPublishedExercisesByLesson,
      ).not.toHaveBeenCalled();
    });

    it("should return an empty array when no published exercises exist", async () => {
      studentLearningRepository.getPublishedLessonByIdOnly.mockResolvedValueOnce(
        {
          id: lessonId,
        },
      );

      studentLearningRepository.getPublishedExercisesByLesson.mockResolvedValueOnce(
        [],
      );

      const result = await getExercisesByLessonService(lessonId, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual([]);
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedLessonByIdOnly.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(
        getExercisesByLessonService(lessonId, { page: 1, limit: 20 }),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("getExerciseByIdService", () => {
    it("should return a published exercise belonging to the lesson", async () => {
      const mockExercise = {
        id: exerciseId,
        lesson_id: lessonId,
        title: "Variables Challenge",
      };

      studentLearningRepository.getPublishedExerciseById.mockResolvedValueOnce(
        mockExercise,
      );

      const result = await getExerciseByIdService(lessonId, exerciseId);

      expect(result).toEqual(mockExercise);

      expect(
        studentLearningRepository.getPublishedExerciseById,
      ).toHaveBeenCalledWith(lessonId, exerciseId);
    });

    it("should throw an error when the exercise is not found or accessible", async () => {
      studentLearningRepository.getPublishedExerciseById.mockResolvedValueOnce(
        null,
      );

      await expect(
        getExerciseByIdService(lessonId, exerciseId),
      ).rejects.toThrow("Exercise not found");
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedExerciseById.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(
        getExerciseByIdService(lessonId, exerciseId),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("getExerciseLanguagesService", () => {
    it("should return languages for an accessible published exercise", async () => {
      const mockExercise = {
        id: exerciseId,
        title: "Variables Challenge",
      };

      const mockLanguages = [
        {
          id: "850e8400-e29b-41d4-a716-446655440000",
          language: "javascript",
          runtime_version: "Node.js 24",
        },
        {
          id: "950e8400-e29b-41d4-a716-446655440000",
          language: "python",
          runtime_version: "Python 3.12",
        },
      ];

      studentLearningRepository.getPublishedExerciseByIdOnly.mockResolvedValueOnce(
        mockExercise,
      );

      studentLearningRepository.getPublishedExerciseLanguages.mockResolvedValueOnce(
        mockLanguages,
      );

      const result = await getExerciseLanguagesService(exerciseId);

      expect(result).toEqual(mockLanguages);

      expect(
        studentLearningRepository.getPublishedExerciseByIdOnly,
      ).toHaveBeenCalledWith(exerciseId);

      expect(
        studentLearningRepository.getPublishedExerciseLanguages,
      ).toHaveBeenCalledWith(exerciseId);
    });

    it("should throw an error when the exercise is not found or accessible", async () => {
      studentLearningRepository.getPublishedExerciseByIdOnly.mockResolvedValueOnce(
        null,
      );

      await expect(getExerciseLanguagesService(exerciseId)).rejects.toThrow(
        "Exercise not found",
      );

      expect(
        studentLearningRepository.getPublishedExerciseLanguages,
      ).not.toHaveBeenCalled();
    });

    it("should return an empty array when no languages are configured", async () => {
      studentLearningRepository.getPublishedExerciseByIdOnly.mockResolvedValueOnce(
        {
          id: exerciseId,
        },
      );

      studentLearningRepository.getPublishedExerciseLanguages.mockResolvedValueOnce(
        [],
      );

      const result = await getExerciseLanguagesService(exerciseId);

      expect(result).toEqual([]);
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedExerciseByIdOnly.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(getExerciseLanguagesService(exerciseId)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("getVisibleTestCasesService", () => {
    it("should return visible test cases for an accessible published exercise", async () => {
      const mockExercise = {
        id: exerciseId,
        title: "Variables Challenge",
      };

      const mockTestCases = [
        {
          id: "a50e8400-e29b-41d4-a716-446655440000",
          input_data: { value: 5 },
          expected_output: { result: 5 },
          visibility: "visible",
        },
      ];

      studentLearningRepository.getPublishedExerciseByIdOnly.mockResolvedValueOnce(
        mockExercise,
      );

      studentLearningRepository.getVisibleTestCases.mockResolvedValueOnce(
        mockTestCases,
      );

      const result = await getVisibleTestCasesService(exerciseId);

      expect(result).toEqual(mockTestCases);

      expect(
        studentLearningRepository.getPublishedExerciseByIdOnly,
      ).toHaveBeenCalledWith(exerciseId);

      expect(
        studentLearningRepository.getVisibleTestCases,
      ).toHaveBeenCalledWith(exerciseId);
    });

    it("should throw an error when the exercise is not found or accessible", async () => {
      studentLearningRepository.getPublishedExerciseByIdOnly.mockResolvedValueOnce(
        null,
      );

      await expect(getVisibleTestCasesService(exerciseId)).rejects.toThrow(
        "Exercise not found",
      );

      expect(
        studentLearningRepository.getVisibleTestCases,
      ).not.toHaveBeenCalled();
    });

    it("should return an empty array when no visible test cases exist", async () => {
      studentLearningRepository.getPublishedExerciseByIdOnly.mockResolvedValueOnce(
        {
          id: exerciseId,
        },
      );

      studentLearningRepository.getVisibleTestCases.mockResolvedValueOnce([]);

      const result = await getVisibleTestCasesService(exerciseId);

      expect(result).toEqual([]);
    });

    it("should propagate repository errors", async () => {
      studentLearningRepository.getPublishedExerciseByIdOnly.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(getVisibleTestCasesService(exerciseId)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });
});
