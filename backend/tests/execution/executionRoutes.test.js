import { describe, it, expect, vi } from "vitest";
import router from "../../src/modules/execution/executionRoutes.js";
import { requireAuth } from "../../src/middleware/requireAuth.js";
import {
  queueSubmissionController,
  getSubmissionResultsController,
} from "../../src/modules/execution/executionController.js";

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock("../../src/middleware/validateParams.js", () => ({
  validateParams: vi.fn(() => (req, res, next) => next()),
}));

vi.mock("../../src/modules/execution/executionController.js", () => ({
  queueSubmissionController: vi.fn(),
  getSubmissionResultsController: vi.fn(),
}));

describe("Execution Routes", () => {
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

  it("should register POST /:submissionId/execute", () => {
    const route = findRoute("/:submissionId/execute", "post");

    expect(route).toBeDefined();
    expect(route.handlers).toHaveLength(2);
    expect(route.handlers).toContain(queueSubmissionController);
  });

  it("should register GET /:submissionId/results", () => {
    const route = findRoute("/:submissionId/results", "get");

    expect(route).toBeDefined();
    expect(route.handlers).toHaveLength(2);
    expect(route.handlers).toContain(getSubmissionResultsController);
  });
});
