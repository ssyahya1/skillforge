import { describe, it, expect, vi } from "vitest";
import router from "../../src/modules/submissions/submissionRoutes.js";

import { requireAuth } from "../../src/middleware/requireAuth.js";

import {
  createSubmissionController,
  getSubmissionDetailsController,
  getSubmissionsHistoryController,
  revealSolutionController,
} from "../../src/modules/submissions/submissionController.js";

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock("../../src/middleware/validateParams.js", () => ({
  validateParams: vi.fn(() => (req, res, next) => next()),
}));

vi.mock("../../src/middleware/validateQuery.js", () => ({
  validateQuery: vi.fn(() => (req, res, next) => next()),
}));

vi.mock("../../src/middleware/validateRequest.js", () => ({
  validateRequest: vi.fn(() => (req, res, next) => next()),
}));

vi.mock("../../src/modules/submissions/submissionController.js", () => ({
  createSubmissionController: vi.fn(),
  getSubmissionDetailsController: vi.fn(),
  getSubmissionsHistoryController: vi.fn(),
  revealSolutionController: vi.fn(),
}));

describe("Submission Routes", () => {
  const routes = router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      handlers: layer.route.stack.map((item) => item.handle),
    }));

  const findRoute = (path, method) =>
    routes.find((route) => route.path === path && route.methods[method]);

  it("should apply authentication middleware globally", () => {
    const authLayer = router.stack.find(
      (layer) => layer.handle === requireAuth,
    );

    expect(authLayer).toBeDefined();
  });

  it("should register the create submission route", () => {
    const route = findRoute("/exercises/:exerciseId/submissions", "post");

    expect(route).toBeDefined();
    expect(route.handlers).toHaveLength(3);
    expect(route.handlers[2]).toBe(createSubmissionController);
  });

  it("should register the submission history route", () => {
    const route = findRoute("/exercises/:exerciseId/submissions", "get");

    expect(route).toBeDefined();
    expect(route.handlers).toHaveLength(3);
    expect(route.handlers[2]).toBe(getSubmissionsHistoryController);
  });

  it("should register the submission details route", () => {
    const route = findRoute("/submissions/:submissionId", "get");

    expect(route).toBeDefined();
    expect(route.handlers).toHaveLength(2);
    expect(route.handlers[1]).toBe(getSubmissionDetailsController);
  });

  it("should register the solution reveal route", () => {
    const route = findRoute("/exercises/:exerciseId/solutions/reveal", "post");

    expect(route).toBeDefined();
    expect(route.handlers).toHaveLength(3);
    expect(route.handlers[2]).toBe(revealSolutionController);
  });

  it("should attach parameter validation to all four routes", () => {
    expect(
      findRoute("/exercises/:exerciseId/submissions", "post").handlers[0],
    ).toBeTypeOf("function");

    expect(
      findRoute("/exercises/:exerciseId/submissions", "get").handlers[0],
    ).toBeTypeOf("function");

    expect(
      findRoute("/submissions/:submissionId", "get").handlers[0],
    ).toBeTypeOf("function");

    expect(
      findRoute("/exercises/:exerciseId/solutions/reveal", "post").handlers[0],
    ).toBeTypeOf("function");
  });

  it("should attach body validation to both POST routes", () => {
    expect(
      findRoute("/exercises/:exerciseId/submissions", "post").handlers[1],
    ).toBeTypeOf("function");

    expect(
      findRoute("/exercises/:exerciseId/solutions/reveal", "post").handlers[1],
    ).toBeTypeOf("function");
  });

  it("should attach query validation to the submission history route", () => {
    expect(
      findRoute("/exercises/:exerciseId/submissions", "get").handlers[1],
    ).toBeTypeOf("function");
  });
});

