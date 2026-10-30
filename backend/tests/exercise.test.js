
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  authMode: "admin",
  exerciseService: {
    createExerciseService: vi.fn(),
    getExerciseByIdService: vi.fn(),
    getExercisesByLessonService: vi.fn(),
    updateExerciseService: vi.fn(),
    reorderExercisesService: vi.fn(),
    publishExerciseService: vi.fn(),
    archiveExerciseService: vi.fn(),
    deleteExerciseService: vi.fn(),
  },
}));

// Mock authentication middleware.
vi.mock("../src/middleware/requireAuth.js", () => ({
  requireAuth: (req, res, next) => {
    if (mocks.authMode === "unauthenticated") {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    req.user = {
      id: "test-admin-123",
      email: "admin@example.com",
    };

    next();
  },
}));

// Mock admin authorization middleware.
vi.mock("../src/middleware/requireAdmin.js", () => ({
  requireAdmin: (req, res, next) => {
    if (mocks.authMode === "non-admin") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Admin access required.",
      });
    }

    next();
  },
}));

vi.mock("../src/modules/exercises/exerciseService.js", () => ({
  ...mocks.exerciseService,
}));

import app from "../src/app.js";

const lessonId = "550e8400-e29b-41d4-a716-446655440000";
const exerciseId = "550e8400-e29b-41d4-a716-446655440001";

const baseUrl = `/api/admin/lessons/${lessonId}/exercises`;

const validExercise = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  instructions: "Learn how to declare variables.",
  difficulty: "beginner",
  position: 0,
};

const exerciseResponse = {
  id: exerciseId,
  lesson_id: lessonId,
  ...validExercise,
  status: "draft",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authMode = "admin";
});

describe("Exercise Management HTTP Integration", () => {
  describe("Authentication and authorization", () => {
    it("should reject unauthenticated requests", async () => {
      mocks.authMode = "unauthenticated";

      const response = await request(app).get(baseUrl);

      expect(response.status).toBe(401);
      expect(mocks.exerciseService.getExercisesByLessonService)
        .not.toHaveBeenCalled();
    });

    it("should reject authenticated non-admin users", async () => {
      mocks.authMode = "non-admin";

      const response = await request(app).get(baseUrl);

      expect(response.status).toBe(403);
      expect(mocks.exerciseService.getExercisesByLessonService)
        .not.toHaveBeenCalled();
    });
  });

  describe("Create exercise", () => {
    it("should create an exercise", async () => {
      mocks.exerciseService.createExerciseService.mockResolvedValue(
        exerciseResponse,
      );

      const response = await request(app)
        .post(baseUrl)
        .send(validExercise);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(exerciseResponse);

      expect(mocks.exerciseService.createExerciseService).toHaveBeenCalledWith(
        lessonId,
        validExercise,
      );
    });

    it("should reject an invalid exercise body", async () => {
      const response = await request(app)
        .post(baseUrl)
        .send({
          ...validExercise,
          title: "",
        });

      expect(response.status).toBe(400);
      expect(mocks.exerciseService.createExerciseService)
        .not.toHaveBeenCalled();
    });

    it("should reject unexpected fields", async () => {
      const response = await request(app)
        .post(baseUrl)
        .send({
          ...validExercise,
          extra: "unexpected",
        });

      expect(response.status).toBe(400);
      expect(mocks.exerciseService.createExerciseService)
        .not.toHaveBeenCalled();
    });
  });

  describe("List exercises", () => {
    it("should return exercises belonging to a lesson", async () => {
      mocks.exerciseService.getExercisesByLessonService.mockResolvedValue([
        exerciseResponse,
      ]);

      const response = await request(app).get(baseUrl);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([exerciseResponse]);

      expect(
        mocks.exerciseService.getExercisesByLessonService,
      ).toHaveBeenCalledWith(lessonId);
    });

    it("should reject an invalid lesson UUID", async () => {
      const response = await request(app).get(
        "/api/admin/lessons/invalid-id/exercises",
      );

      expect(response.status).toBe(400);
      expect(
        mocks.exerciseService.getExercisesByLessonService,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Get exercise details", () => {
    it("should return an exercise by ID", async () => {
      mocks.exerciseService.getExerciseByIdService.mockResolvedValue(
        exerciseResponse,
      );

      const response = await request(app).get(
        `${baseUrl}/${exerciseId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(exerciseResponse);

      expect(mocks.exerciseService.getExerciseByIdService).toHaveBeenCalledWith(
        lessonId,
        exerciseId,
      );
    });

    it("should reject an invalid exercise UUID", async () => {
      const response = await request(app).get(
        `${baseUrl}/invalid-id`,
      );

      expect(response.status).toBe(400);
      expect(mocks.exerciseService.getExerciseByIdService)
        .not.toHaveBeenCalled();
    });
  });

  describe("Update exercise", () => {
    it("should update an exercise", async () => {
      const updateData = {
        title: "Updated JavaScript Variables",
      };

      const updatedExercise = {
        ...exerciseResponse,
        ...updateData,
      };

      mocks.exerciseService.updateExerciseService.mockResolvedValue(
        updatedExercise,
      );

      const response = await request(app)
        .patch(`${baseUrl}/${exerciseId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedExercise);

      expect(mocks.exerciseService.updateExerciseService).toHaveBeenCalledWith(
        exerciseId,
        lessonId,
        updateData,
      );
    });

    it("should reject an empty update body", async () => {
      const response = await request(app)
        .patch(`${baseUrl}/${exerciseId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(mocks.exerciseService.updateExerciseService)
        .not.toHaveBeenCalled();
    });
  });

  describe("Reorder exercises", () => {
    it("should reorder exercises", async () => {
      const reorderData = {
        exercises: [
          {
            exerciseId,
            position: 0,
          },
        ],
      };

      mocks.exerciseService.reorderExercisesService.mockResolvedValue([
        exerciseResponse,
      ]);

      const response = await request(app)
        .patch(`${baseUrl}/reorder`)
        .send(reorderData);

      expect(response.status).toBe(200);

      expect(
        mocks.exerciseService.reorderExercisesService,
      ).toHaveBeenCalledWith(lessonId, reorderData.exercises);
    });

    it("should reject an empty reorder list", async () => {
      const response = await request(app)
        .patch(`${baseUrl}/reorder`)
        .send({
          exercises: [],
        });

      expect(response.status).toBe(400);
      expect(
        mocks.exerciseService.reorderExercisesService,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Publish exercise", () => {
    it("should publish an exercise", async () => {
      const publishedExercise = {
        ...exerciseResponse,
        status: "published",
      };

      mocks.exerciseService.publishExerciseService.mockResolvedValue(
        publishedExercise,
      );

      const response = await request(app).patch(
        `${baseUrl}/${exerciseId}/publish`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(publishedExercise);

      expect(mocks.exerciseService.publishExerciseService).toHaveBeenCalledWith(
        lessonId,
        exerciseId,
      );
    });
  });

  describe("Archive exercise", () => {
    it("should archive an exercise", async () => {
      const archivedExercise = {
        ...exerciseResponse,
        status: "archived",
      };

      mocks.exerciseService.archiveExerciseService.mockResolvedValue(
        archivedExercise,
      );

      const response = await request(app).patch(
        `${baseUrl}/${exerciseId}/archive`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(archivedExercise);

      expect(mocks.exerciseService.archiveExerciseService).toHaveBeenCalledWith(
        lessonId,
        exerciseId,
      );
    });
  });

  describe("Delete exercise", () => {
    it("should delete an exercise", async () => {
      mocks.exerciseService.deleteExerciseService.mockResolvedValue(undefined);

      const response = await request(app).delete(
        `${baseUrl}/${exerciseId}`,
      );

      expect(response.status).toBe(204);

      expect(mocks.exerciseService.deleteExerciseService).toHaveBeenCalledWith(
        lessonId,
        exerciseId,
      );
    });
  });

  describe("Error handling", () => {
    it("should forward service errors to the Express error handler", async () => {
      mocks.exerciseService.getExercisesByLessonService.mockRejectedValue(
        Object.assign(new Error("Lesson not found."), {
          status: 404,
        }),
      );

      const response = await request(app).get(baseUrl);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Lesson not found.");
    });

    it("should return 500 for unexpected service errors", async () => {
      mocks.exerciseService.getExercisesByLessonService.mockRejectedValue(
        new Error("Database connection failed."),
      );

      const response = await request(app).get(baseUrl);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
    });
  });
});
