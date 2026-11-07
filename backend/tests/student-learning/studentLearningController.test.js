import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/student-learning/studentLearningService.js", () => ({
  getCoursesService: vi.fn(),
  getCourseByIdService: vi.fn(),
  getLessonsByCourseIdService: vi.fn(),
  getLessonByIdService: vi.fn(),
  getExercisesByLessonService: vi.fn(),
  getExerciseByIdService: vi.fn(),
  getExerciseLanguagesService: vi.fn(),
  getVisibleTestCasesService: vi.fn(),
}));

import * as studentLearningService from "../../src/modules/student-learning/studentLearningService.js";

import {
  getCourses,
  getCourseById,
  getLessonsByCourseId,
  getLessonById,
  getExercisesByLesson,
  getExerciseById,
  getExerciseLanguages,
  getVisibleTestCases,
} from "../../src/modules/student-learning/studentLearningController.js";

describe("Student Learning Controller", () => {
  const courseId = "550e8400-e29b-41d4-a716-446655440000";
  const lessonId = "650e8400-e29b-41d4-a716-446655440000";
  const exerciseId = "750e8400-e29b-41d4-a716-446655440000";

  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      params: {},
      query: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe("getCourses", () => {
    it("should return published courses", async () => {
      const filters = {
        page: 1,
        limit: 10,
        language: "javascript",
      };

      const mockCourses = [{ id: courseId, title: "JavaScript Fundamentals" }];

      req.query = filters;

      studentLearningService.getCoursesService.mockResolvedValueOnce(
        mockCourses,
      );

      await getCourses(req, res, next);

      expect(studentLearningService.getCoursesService).toHaveBeenCalledWith(
        filters,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCourses);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Database connection failed");

      studentLearningService.getCoursesService.mockRejectedValueOnce(error);

      await getCourses(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getCourseById", () => {
    it("should return a course by ID", async () => {
      const mockCourse = { id: courseId, title: "JavaScript Fundamentals" };

      req.params = { courseId };

      studentLearningService.getCourseByIdService.mockResolvedValueOnce(
        mockCourse,
      );

      await getCourseById(req, res, next);

      expect(studentLearningService.getCourseByIdService).toHaveBeenCalledWith(
        courseId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCourse);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Course not found");

      studentLearningService.getCourseByIdService.mockRejectedValueOnce(error);

      req.params = { courseId };

      await getCourseById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getLessonsByCourseId", () => {
    it("should return lessons for a course", async () => {
      const filters = { page: 1, limit: 20 };
      const mockLessons = [{ id: lessonId, title: "Introduction" }];

      req.params = { courseId };
      req.query = filters;

      studentLearningService.getLessonsByCourseIdService.mockResolvedValueOnce(
        mockLessons,
      );

      await getLessonsByCourseId(req, res, next);

      expect(
        studentLearningService.getLessonsByCourseIdService,
      ).toHaveBeenCalledWith(courseId, filters);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockLessons);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Course not found");

      req.params = { courseId };

      studentLearningService.getLessonsByCourseIdService.mockRejectedValueOnce(
        error,
      );

      await getLessonsByCourseId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getLessonById", () => {
    it("should return a lesson by ID", async () => {
      const mockLesson = {
        id: lessonId,
        course_id: courseId,
        title: "Introduction",
      };

      req.params = { courseId, lessonId };

      studentLearningService.getLessonByIdService.mockResolvedValueOnce(
        mockLesson,
      );

      await getLessonById(req, res, next);

      expect(studentLearningService.getLessonByIdService).toHaveBeenCalledWith(
        courseId,
        lessonId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockLesson);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Lesson not found");

      req.params = { courseId, lessonId };

      studentLearningService.getLessonByIdService.mockRejectedValueOnce(error);

      await getLessonById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getExercisesByLesson", () => {
    it("should return exercises for a lesson", async () => {
      const filters = { page: 1, limit: 20 };
      const mockExercises = [{ id: exerciseId, title: "Variables Challenge" }];

      req.params = { lessonId };
      req.query = filters;

      studentLearningService.getExercisesByLessonService.mockResolvedValueOnce(
        mockExercises,
      );

      await getExercisesByLesson(req, res, next);

      expect(
        studentLearningService.getExercisesByLessonService,
      ).toHaveBeenCalledWith(lessonId, filters);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockExercises);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Lesson not found");

      req.params = { lessonId };

      studentLearningService.getExercisesByLessonService.mockRejectedValueOnce(
        error,
      );

      await getExercisesByLesson(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getExerciseById", () => {
    it("should return an exercise by ID", async () => {
      const mockExercise = {
        id: exerciseId,
        lesson_id: lessonId,
        title: "Variables Challenge",
      };

      req.params = { lessonId, exerciseId };

      studentLearningService.getExerciseByIdService.mockResolvedValueOnce(
        mockExercise,
      );

      await getExerciseById(req, res, next);

      expect(
        studentLearningService.getExerciseByIdService,
      ).toHaveBeenCalledWith(lessonId, exerciseId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockExercise);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Exercise not found");

      req.params = { lessonId, exerciseId };

      studentLearningService.getExerciseByIdService.mockRejectedValueOnce(
        error,
      );

      await getExerciseById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getExerciseLanguages", () => {
    it("should return configured languages for an exercise", async () => {
      const mockLanguages = [
        { language: "javascript", runtime_version: "Node.js 24" },
        { language: "python", runtime_version: "Python 3.12" },
      ];

      req.params = { exerciseId };

      studentLearningService.getExerciseLanguagesService.mockResolvedValueOnce(
        mockLanguages,
      );

      await getExerciseLanguages(req, res, next);

      expect(
        studentLearningService.getExerciseLanguagesService,
      ).toHaveBeenCalledWith(exerciseId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockLanguages);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Exercise not found");

      req.params = { exerciseId };

      studentLearningService.getExerciseLanguagesService.mockRejectedValueOnce(
        error,
      );

      await getExerciseLanguages(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getVisibleTestCases", () => {
    it("should return visible test cases for an exercise", async () => {
      const mockTestCases = [
        {
          id: "a50e8400-e29b-41d4-a716-446655440000",
          input_data: { value: 5 },
          expected_output: { result: 5 },
          visibility: "visible",
        },
      ];

      req.params = { exerciseId };

      studentLearningService.getVisibleTestCasesService.mockResolvedValueOnce(
        mockTestCases,
      );

      await getVisibleTestCases(req, res, next);

      expect(
        studentLearningService.getVisibleTestCasesService,
      ).toHaveBeenCalledWith(exerciseId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTestCases);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next", async () => {
      const error = new Error("Exercise not found");

      req.params = { exerciseId };

      studentLearningService.getVisibleTestCasesService.mockRejectedValueOnce(
        error,
      );

      await getVisibleTestCases(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
