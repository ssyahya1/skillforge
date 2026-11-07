import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock("../../src/middleware/validateParams.js", () => ({
  validateParams: vi.fn((schema) => {
    const middleware = (req, res, next) => next();
    middleware.schema = schema;
    return middleware;
  }),
}));

vi.mock("../../src/middleware/validateQuery.js", () => ({
  validateQuery: vi.fn((schema) => {
    const middleware = (req, res, next) => next();
    middleware.schema = schema;
    return middleware;
  }),
}));

vi.mock(
  "../../src/modules/student-learning/studentLearningController.js",
  () => ({
    getCourses: vi.fn(),
    getCourseById: vi.fn(),
    getLessonsByCourseId: vi.fn(),
    getLessonById: vi.fn(),
    getExercisesByLesson: vi.fn(),
    getExerciseById: vi.fn(),
    getExerciseLanguages: vi.fn(),
    getVisibleTestCases: vi.fn(),
  }),
);

import { requireAuth } from "../../src/middleware/requireAuth.js";

import {
  courseParamsSchema,
  courseLessonsParamsSchema,
  courseLessonParamsSchema,
  lessonExercisesParamsSchema,
  lessonExerciseParamsSchema,
  exerciseParamsSchema,
  studentCourseQuerySchema,
  studentLessonQuerySchema,
  studentExerciseQuerySchema,
} from "../../src/modules/student-learning/studentLearningValidation.js";

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

import studentLearningRoutes from "../../src/modules/student-learning/studentLearningRoutes.js";

describe("Student Learning Routes", () => {
  const getRegisteredRoutes = () =>
    studentLearningRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: layer.route.methods,
        handlers: layer.route.stack.map((item) => item.handle),
      }));

  const findRoute = (path) =>
    getRegisteredRoutes().find((route) => route.path === path);

  const expectRoute = (path, controller, schemas = {}) => {
    const route = findRoute(path);

    expect(route).toBeDefined();
    expect(route.methods.get).toBe(true);
    expect(route.handlers.at(-1)).toBe(controller);

    if (schemas.params) {
      expect(
        route.handlers.some((handler) => handler.schema === schemas.params),
      ).toBe(true);
    }

    if (schemas.query) {
      expect(
        route.handlers.some((handler) => handler.schema === schemas.query),
      ).toBe(true);
    }
  };

  describe("Authentication", () => {
    it("should apply requireAuth middleware to the router", () => {
      const authLayer = studentLearningRoutes.stack.find(
        (layer) => layer.handle === requireAuth,
      );

      expect(authLayer).toBeDefined();
      expect(authLayer.route).toBeUndefined();
    });

    it("should register eight authenticated routes", () => {
      expect(getRegisteredRoutes()).toHaveLength(8);
    });
  });

  describe("Course routes", () => {
    it("should register GET /courses with query validation", () => {
      expectRoute("/courses", getCourses, {
        query: studentCourseQuerySchema,
      });
    });

    it("should register GET /courses/:courseId with parameter validation", () => {
      expectRoute("/courses/:courseId", getCourseById, {
        params: courseParamsSchema,
      });
    });
  });

  describe("Lesson routes", () => {
    it("should register GET /courses/:courseId/lessons", () => {
      expectRoute("/courses/:courseId/lessons", getLessonsByCourseId, {
        params: courseLessonsParamsSchema,
        query: studentLessonQuerySchema,
      });
    });

    it("should register GET /courses/:courseId/lessons/:lessonId", () => {
      expectRoute("/courses/:courseId/lessons/:lessonId", getLessonById, {
        params: courseLessonParamsSchema,
      });
    });
  });

  describe("Exercise routes", () => {
    it("should register GET /lessons/:lessonId/exercises", () => {
      expectRoute("/lessons/:lessonId/exercises", getExercisesByLesson, {
        params: lessonExercisesParamsSchema,
        query: studentExerciseQuerySchema,
      });
    });

    it("should register GET /lessons/:lessonId/exercises/:exerciseId", () => {
      expectRoute("/lessons/:lessonId/exercises/:exerciseId", getExerciseById, {
        params: lessonExerciseParamsSchema,
      });
    });
  });

  describe("Exercise configuration routes", () => {
    it("should register GET /exercises/:exerciseId/languages", () => {
      expectRoute("/exercises/:exerciseId/languages", getExerciseLanguages, {
        params: exerciseParamsSchema,
      });
    });

    it("should register GET /exercises/:exerciseId/test-cases", () => {
      expectRoute("/exercises/:exerciseId/test-cases", getVisibleTestCases, {
        params: exerciseParamsSchema,
      });
    });
  });

  describe("Route count", () => {
    it("should register exactly eight GET endpoints", () => {
      const routes = getRegisteredRoutes();

      expect(routes).toHaveLength(8);

      for (const route of routes) {
        expect(route.methods.get).toBe(true);
      }
    });
  });
});
