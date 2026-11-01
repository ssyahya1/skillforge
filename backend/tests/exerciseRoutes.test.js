
import { describe, it, expect, vi } from "vitest";

vi.mock("../src/modules/exercises/exerciseController.js", () => ({
  createExerciseController: vi.fn(),
  getExerciseByIdController: vi.fn(),
  getExercisesByLessonController: vi.fn(),
  updateExerciseController: vi.fn(),
  reorderExercisesController: vi.fn(),
  publishExerciseController: vi.fn(),
  archiveExerciseController: vi.fn(),
  deleteExerciseController: vi.fn(),

  createExerciseLanguageController: vi.fn(),
  getExerciseLanguageController: vi.fn(),
  getExerciseLanguageByIdController: vi.fn(),
  updateExerciseLanguageController: vi.fn(),
  deleteExerciseLanguageController: vi.fn(),
}));

vi.mock("../src/middleware/requireAuth.js", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../src/middleware/requireAdmin.js", () => ({
  requireAdmin: vi.fn(),
}));

import router from "../src/modules/exercises/exerciseRoutes.js";
import * as exerciseController from "../src/modules/exercises/exerciseController.js";

describe("Exercise Routes", () => {
  const routes = router.stack.filter((layer) => layer.route);

  const findRoute = (method, path) =>
    routes.find(
      (layer) =>
        layer.route.path === path &&
        layer.route.methods[method.toLowerCase()]
    );

  const expectRoute = (method, path, controller, middlewareCount) => {
    const route = findRoute(method, path);

    expect(route).toBeDefined();
    expect(route.route.stack).toHaveLength(middlewareCount);
    expect(route.route.stack.at(-1).handle).toBe(controller);
  };

  it("should register authentication and admin middleware globally", () => {
    const middlewareLayer = router.stack.find((layer) => !layer.route);

    expect(middlewareLayer).toBeDefined();
    expect(middlewareLayer.handle).toBeDefined();
  });

  it("should register all thirteen routes", () => {
    expect(routes).toHaveLength(13);
  });

  describe("Exercise routes", () => {
    it("should register the create exercise route with validation", () => {
      expectRoute(
        "POST",
        "/:lessonId/exercises",
        exerciseController.createExerciseController,
        3
      );
    });

    it("should register the list exercises route with parameter validation", () => {
      expectRoute(
        "GET",
        "/:lessonId/exercises",
        exerciseController.getExercisesByLessonController,
        2
      );
    });

    it("should register the reorder exercises route with validation", () => {
      expectRoute(
        "PATCH",
        "/:lessonId/exercises/reorder",
        exerciseController.reorderExercisesController,
        3
      );
    });

    it("should register the get exercise by ID route", () => {
      expectRoute(
        "GET",
        "/:lessonId/exercises/:exerciseId",
        exerciseController.getExerciseByIdController,
        2
      );
    });

    it("should register the update exercise route with validation", () => {
      expectRoute(
        "PATCH",
        "/:lessonId/exercises/:exerciseId",
        exerciseController.updateExerciseController,
        3
      );
    });

    it("should register the publish exercise route", () => {
      expectRoute(
        "PATCH",
        "/:lessonId/exercises/:exerciseId/publish",
        exerciseController.publishExerciseController,
        2
      );
    });

    it("should register the archive exercise route", () => {
      expectRoute(
        "PATCH",
        "/:lessonId/exercises/:exerciseId/archive",
        exerciseController.archiveExerciseController,
        2
      );
    });

    it("should register the delete exercise route", () => {
      expectRoute(
        "DELETE",
        "/:lessonId/exercises/:exerciseId",
        exerciseController.deleteExerciseController,
        2
      );
    });
  });

  describe("Exercise language configuration routes", () => {
    it("should register the create language configuration route with validation", () => {
      expectRoute(
        "POST",
        "/:lessonId/exercises/:exerciseId/languages",
        exerciseController.createExerciseLanguageController,
        3
      );
    });

    it("should register the list language configurations route with parameter validation", () => {
      expectRoute(
        "GET",
        "/:lessonId/exercises/:exerciseId/languages",
        exerciseController.getExerciseLanguageController,
        2
      );
    });

    it("should register the get language configuration by ID route", () => {
      expectRoute(
        "GET",
        "/:lessonId/exercises/:exerciseId/languages/:languageId",
        exerciseController.getExerciseLanguageByIdController,
        2
      );
    });

    it("should register the update language configuration route with validation", () => {
      expectRoute(
        "PATCH",
        "/:lessonId/exercises/:exerciseId/languages/:languageId",
        exerciseController.updateExerciseLanguageController,
        3
      );
    });

    it("should register the delete language configuration route", () => {
      expectRoute(
        "DELETE",
        "/:lessonId/exercises/:exerciseId/languages/:languageId",
        exerciseController.deleteExerciseLanguageController,
        2
      );
    });
  });
});
