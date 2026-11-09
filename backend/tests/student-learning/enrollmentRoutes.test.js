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

vi.mock("../../src/modules/student-learning/enrollmentController.js", () => ({
  createEnrollment: vi.fn(),
  getStudentEnrollments: vi.fn(),
  getEnrollment: vi.fn(),
  getEnrollmentByCourse: vi.fn(),
  cancelEnrollment: vi.fn(),
  completeEnrollment: vi.fn(),
  updateEnrollmentActivity: vi.fn(),
}));

import { requireAuth } from "../../src/middleware/requireAuth.js";

import {
  enrollmentParamsSchema,
  courseEnrollmentParamsSchema,
} from "../../src/modules/student-learning/enrollmentValidation.js";

import {
  createEnrollment,
  getStudentEnrollments,
  getEnrollment,
  getEnrollmentByCourse,
  cancelEnrollment,
  completeEnrollment,
  updateEnrollmentActivity,
} from "../../src/modules/student-learning/enrollmentController.js";

import enrollmentRoutes from "../../src/modules/student-learning/enrollmentRoutes.js";

describe("Enrollment Routes", () => {
  const getRegisteredRoutes = () =>
    enrollmentRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: layer.route.methods,
        handlers: layer.route.stack.map((item) => item.handle),
      }));
  const findRoute = (path, method) =>
    getRegisteredRoutes().find(
      (route) => route.path === path && route.methods[method],
    );

  const expectRoute = (path, method, controller, schema) => {
    const route = findRoute(path, method);

    expect(route).toBeDefined();
    expect(route.methods[method]).toBe(true);
    expect(route.handlers.at(-1)).toBe(controller);

    if (schema) {
      expect(route.handlers.some((handler) => handler.schema === schema)).toBe(
        true,
      );
    }
  };

  describe("Authentication", () => {
    it("should apply requireAuth middleware to the router", () => {
      const authLayer = enrollmentRoutes.stack.find(
        (layer) => layer.handle === requireAuth,
      );

      expect(authLayer).toBeDefined();
      expect(authLayer.route).toBeUndefined();
    });

    it("should register seven authenticated routes", () => {
      expect(getRegisteredRoutes()).toHaveLength(7);
    });
  });

  describe("Enrollment creation and retrieval", () => {
    it("should register POST /enrollments", () => {
      expectRoute("/enrollments", "post", createEnrollment);
    });

    it("should register GET /enrollments", () => {
      expectRoute("/enrollments", "get", getStudentEnrollments);
    });

    it("should register GET /enrollments/:enrollmentId with parameter validation", () => {
      expectRoute(
        "/enrollments/:enrollmentId",
        "get",
        getEnrollment,
        enrollmentParamsSchema,
      );
    });

    it("should register GET /courses/:courseId/enrollment with parameter validation", () => {
      expectRoute(
        "/courses/:courseId/enrollment",
        "get",
        getEnrollmentByCourse,
        courseEnrollmentParamsSchema,
      );
    });
  });

  describe("Enrollment lifecycle", () => {
    it("should register PATCH /enrollments/:enrollmentId/cancel", () => {
      expectRoute(
        "/enrollments/:enrollmentId/cancel",
        "patch",
        cancelEnrollment,
        enrollmentParamsSchema,
      );
    });

    it("should register PATCH /enrollments/:enrollmentId/complete", () => {
      expectRoute(
        "/enrollments/:enrollmentId/complete",
        "patch",
        completeEnrollment,
        enrollmentParamsSchema,
      );
    });

    it("should register PATCH /enrollments/:enrollmentId/activity", () => {
      expectRoute(
        "/enrollments/:enrollmentId/activity",
        "patch",
        updateEnrollmentActivity,
        enrollmentParamsSchema,
      );
    });
  });

  describe("Route count", () => {
    it("should register exactly seven endpoints", () => {
      const routes = getRegisteredRoutes();

      expect(routes).toHaveLength(7);
    });
  });
});
