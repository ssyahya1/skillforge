import { describe, it, expect, vi, beforeEach } from "vitest";

import * as exerciseService from "../src/modules/exercises/exerciseService.js";

import {
  createExerciseController,
  getExerciseByIdController,
  getExercisesByLessonController,
  updateExerciseController,
  reorderExercisesController,
  publishExerciseController,
  archiveExerciseController,
  deleteExerciseController,
  createExerciseLanguageController,
  getExerciseLanguageController,
  getExerciseLanguageByIdController,
  updateExerciseLanguageController,
  deleteExerciseLanguageController,
} from "../src/modules/exercises/exerciseController.js";

vi.mock("../src/modules/exercises/exerciseService.js", () => ({
  createExerciseService: vi.fn(),
  getExerciseByIdService: vi.fn(),
  getExercisesByLessonService: vi.fn(),
  updateExerciseService: vi.fn(),
  reorderExercisesService: vi.fn(),
  publishExerciseService: vi.fn(),
  archiveExerciseService: vi.fn(),
  deleteExerciseService: vi.fn(),

  createExerciseLanguageService: vi.fn(),
  getExerciseLanguagesService: vi.fn(),
  getExerciseLanguageByIdService: vi.fn(),
  updateExerciseLanguageService: vi.fn(),
  deleteExerciseLanguageService: vi.fn(),
}));

describe("Exercise Controller", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      validatedParams: {
        lessonId: "lesson-123",
        exerciseId: "exercise-123",
        languageId: "language-123",
      },
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe("createExerciseController", () => {
    it("should create an exercise successfully", async () => {
      const exerciseData = {
        title: "JavaScript Variables",
        slug: "javascript-variables",
        instructions: "Learn about variables.",
        difficulty: "beginner",
        position: 0,
      };

      const createdExercise = {
        id: "exercise-123",
        ...exerciseData,
      };

      req.body = exerciseData;

      exerciseService.createExerciseService.mockResolvedValue(createdExercise);

      await createExerciseController(req, res, next);

      expect(exerciseService.createExerciseService).toHaveBeenCalledWith(
        "lesson-123",
        exerciseData,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdExercise);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Creation failed");

      exerciseService.createExerciseService.mockRejectedValue(error);

      await createExerciseController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getExerciseByIdController", () => {
    it("should return an exercise successfully", async () => {
      const exercise = {
        id: "exercise-123",
        title: "JavaScript Variables",
      };

      exerciseService.getExerciseByIdService.mockResolvedValue(exercise);

      await getExerciseByIdController(req, res, next);

      expect(exerciseService.getExerciseByIdService).toHaveBeenCalledWith(
        "lesson-123",
        "exercise-123",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(exercise);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Exercise not found");

      exerciseService.getExerciseByIdService.mockRejectedValue(error);

      await getExerciseByIdController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getExercisesByLessonController", () => {
    it("should return exercises for a lesson", async () => {
      const exercises = [
        { id: "exercise-1", title: "Variables" },
        { id: "exercise-2", title: "Functions" },
      ];

      exerciseService.getExercisesByLessonService.mockResolvedValue(exercises);

      await getExercisesByLessonController(req, res, next);

      expect(exerciseService.getExercisesByLessonService).toHaveBeenCalledWith(
        "lesson-123",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(exercises);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Failed to fetch exercises");

      exerciseService.getExercisesByLessonService.mockRejectedValue(error);

      await getExercisesByLessonController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateExerciseController", () => {
    it("should update an exercise successfully", async () => {
      const exerciseData = {
        title: "Updated JavaScript Variables",
      };

      const updatedExercise = {
        id: "exercise-123",
        ...exerciseData,
      };

      req.body = exerciseData;

      exerciseService.updateExerciseService.mockResolvedValue(updatedExercise);

      await updateExerciseController(req, res, next);

      expect(exerciseService.updateExerciseService).toHaveBeenCalledWith(
        "exercise-123",
        "lesson-123",
        exerciseData,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedExercise);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Update failed");

      exerciseService.updateExerciseService.mockRejectedValue(error);

      await updateExerciseController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("reorderExercisesController", () => {
    it("should reorder exercises successfully", async () => {
      const exercises = [
        { exerciseId: "exercise-123", position: 1 },
        { exerciseId: "exercise-456", position: 0 },
      ];

      req.body = { exercises };

      exerciseService.reorderExercisesService.mockResolvedValue(exercises);

      await reorderExercisesController(req, res, next);

      expect(exerciseService.reorderExercisesService).toHaveBeenCalledWith(
        "lesson-123",
        exercises,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(exercises);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Reordering failed");

      exerciseService.reorderExercisesService.mockRejectedValue(error);

      await reorderExercisesController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("publishExerciseController", () => {
    it("should publish an exercise successfully", async () => {
      const publishedExercise = {
        id: "exercise-123",
        status: "published",
      };

      exerciseService.publishExerciseService.mockResolvedValue(
        publishedExercise,
      );

      await publishExerciseController(req, res, next);

      expect(exerciseService.publishExerciseService).toHaveBeenCalledWith(
        "lesson-123",
        "exercise-123",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(publishedExercise);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Publishing failed");

      exerciseService.publishExerciseService.mockRejectedValue(error);

      await publishExerciseController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("archiveExerciseController", () => {
    it("should archive an exercise successfully", async () => {
      const archivedExercise = {
        id: "exercise-123",
        status: "archived",
      };

      exerciseService.archiveExerciseService.mockResolvedValue(
        archivedExercise,
      );

      await archiveExerciseController(req, res, next);

      expect(exerciseService.archiveExerciseService).toHaveBeenCalledWith(
        "lesson-123",
        "exercise-123",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(archivedExercise);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Archiving failed");

      exerciseService.archiveExerciseService.mockRejectedValue(error);

      await archiveExerciseController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteExerciseController", () => {
    it("should delete an exercise successfully", async () => {
      exerciseService.deleteExerciseService.mockResolvedValue(undefined);

      await deleteExerciseController(req, res, next);

      expect(exerciseService.deleteExerciseService).toHaveBeenCalledWith(
        "lesson-123",
        "exercise-123",
      );

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Deletion failed");

      exerciseService.deleteExerciseService.mockRejectedValue(error);

      await deleteExerciseController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  const validLanguageData = {
    language: "javascript",
    runtimeVersion: "22.x",
    executionMode: "function",
    starterCode: "function solution() {\n  // Write your code here\n}",
    entryPoint: "solution",
  };

  const languageResponse = {
    id: "language-123",
    exercise_id: "exercise-123",
    language: "javascript",
    runtime_version: "22.x",
    execution_mode: "function",
    starter_code: "function solution() {\n  // Write your code here\n}",
    entry_point: "solution",
  };

  describe("createExerciseLanguageController", () => {
    it("should create a language configuration successfully", async () => {
      req.body = validLanguageData;

      exerciseService.createExerciseLanguageService.mockResolvedValue(
        languageResponse,
      );

      await createExerciseLanguageController(req, res, next);

      expect(
        exerciseService.createExerciseLanguageService,
      ).toHaveBeenCalledWith("lesson-123", "exercise-123", validLanguageData);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(languageResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Language configuration creation failed");

      exerciseService.createExerciseLanguageService.mockRejectedValue(error);

      await createExerciseLanguageController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getExerciseLanguageController", () => {
    it("should return all language configurations successfully", async () => {
      const languages = [
        languageResponse,
        {
          ...languageResponse,
          id: "language-456",
          language: "python",
        },
      ];

      exerciseService.getExerciseLanguagesService.mockResolvedValue(languages);

      await getExerciseLanguageController(req, res, next);

      expect(exerciseService.getExerciseLanguagesService).toHaveBeenCalledWith(
        "lesson-123",
        "exercise-123",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(languages);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Failed to fetch language configurations");

      exerciseService.getExerciseLanguagesService.mockRejectedValue(error);

      await getExerciseLanguageController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getExerciseLanguageByIdController", () => {
    it("should return a language configuration successfully", async () => {
      exerciseService.getExerciseLanguageByIdService.mockResolvedValue(
        languageResponse,
      );

      await getExerciseLanguageByIdController(req, res, next);

      expect(
        exerciseService.getExerciseLanguageByIdService,
      ).toHaveBeenCalledWith("lesson-123", "exercise-123", "language-123");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(languageResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Language configuration not found");

      exerciseService.getExerciseLanguageByIdService.mockRejectedValue(error);

      await getExerciseLanguageByIdController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateExerciseLanguageController", () => {
    it("should update a language configuration successfully", async () => {
      const updateData = {
        runtimeVersion: "23.x",
        starterCode: "function solution() {\n  return 0;\n}",
      };

      const updatedLanguage = {
        ...languageResponse,
        runtime_version: updateData.runtimeVersion,
        starter_code: updateData.starterCode,
      };

      req.body = updateData;

      exerciseService.updateExerciseLanguageService.mockResolvedValue(
        updatedLanguage,
      );

      await updateExerciseLanguageController(req, res, next);

      expect(
        exerciseService.updateExerciseLanguageService,
      ).toHaveBeenCalledWith(
        "lesson-123",
        "exercise-123",
        "language-123",
        updateData,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedLanguage);
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Language configuration update failed");

      exerciseService.updateExerciseLanguageService.mockRejectedValue(error);

      await updateExerciseLanguageController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteExerciseLanguageController", () => {
    it("should delete a language configuration successfully", async () => {
      exerciseService.deleteExerciseLanguageService.mockResolvedValue({
        id: "language-123",
      });

      await deleteExerciseLanguageController(req, res, next);

      expect(
        exerciseService.deleteExerciseLanguageService,
      ).toHaveBeenCalledWith("lesson-123", "exercise-123", "language-123");

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should pass errors to next middleware", async () => {
      const error = new Error("Language configuration deletion failed");

      exerciseService.deleteExerciseLanguageService.mockRejectedValue(error);

      await deleteExerciseLanguageController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
