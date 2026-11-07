import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/database/pool.js", () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = {
      id: "150e8400-e29b-41d4-a716-446655440000",
      role: "student",
    };

    next();
  },
}));

import app from "../../src/app.js";
import { pool } from "../../src/database/pool.js";

describe("Student Learning API Integration", () => {
  const courseId = "550e8400-e29b-41d4-a716-446655440000";
  const lessonId = "650e8400-e29b-41d4-a716-446655440000";
  const exerciseId = "750e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/student/courses", () => {
    it("should return published courses", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: courseId,
              title: "JavaScript Fundamentals",
              language: "javascript",
              difficulty: "beginner",
              status: "published",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "1" }],
        });

      const response = await request(app)
        .get("/api/student/courses")
        .expect(200);

      expect(response.body).toBeDefined();
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it("should support course filters and pagination", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: courseId,
              title: "JavaScript Fundamentals",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "1" }],
        });

      await request(app)
        .get(
          "/api/student/courses?page=1&limit=10&language=javascript&difficulty=beginner",
        )
        .expect(200);

      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it("should reject invalid course query parameters", async () => {
      await request(app).get("/api/student/courses?page=0").expect(400);

      expect(pool.query).not.toHaveBeenCalled();
    });

    it("should return an empty result when no courses exist", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "0" }],
        });

      const response = await request(app)
        .get("/api/student/courses")
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("GET /api/student/courses/:courseId", () => {
    it("should return a published course", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: courseId,
            title: "JavaScript Fundamentals",
            status: "published",
          },
        ],
      });

      const response = await request(app)
        .get(`/api/student/courses/${courseId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it("should reject an invalid course ID", async () => {
      await request(app).get("/api/student/courses/invalid-id").expect(400);

      expect(pool.query).not.toHaveBeenCalled();
    });

    it("should return 404 when the course is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app).get(`/api/student/courses/${courseId}`).expect(404);
    });
  });

  describe("GET /api/student/courses/:courseId/lessons", () => {
    it("should return published lessons for a course", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: courseId,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: lessonId,
              course_id: courseId,
              title: "Introduction",
              status: "published",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "1" }],
        });

      const response = await request(app)
        .get(`/api/student/courses/${courseId}/lessons`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it("should reject invalid pagination parameters", async () => {
      await request(app)
        .get(`/api/student/courses/${courseId}/lessons?page=0`)
        .expect(400);

      expect(pool.query).not.toHaveBeenCalled();
    });

    it("should return 404 when the course is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app)
        .get(`/api/student/courses/${courseId}/lessons`)
        .expect(404);

      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/student/courses/:courseId/lessons/:lessonId", () => {
    it("should return a published lesson belonging to the course", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: lessonId,
            course_id: courseId,
            title: "Introduction",
            status: "published",
          },
        ],
      });

      const response = await request(app)
        .get(`/api/student/courses/${courseId}/lessons/${lessonId}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should reject invalid lesson IDs", async () => {
      await request(app)
        .get(`/api/student/courses/${courseId}/lessons/invalid-id`)
        .expect(400);

      expect(pool.query).not.toHaveBeenCalled();
    });

    it("should return 404 when the lesson does not belong to the course", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app)
        .get(`/api/student/courses/${courseId}/lessons/${lessonId}`)
        .expect(404);
    });
  });

  describe("GET /api/student/lessons/:lessonId/exercises", () => {
    it("should return published exercises for an accessible lesson", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: lessonId,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: exerciseId,
              lesson_id: lessonId,
              title: "Variables Challenge",
              status: "published",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ total: "1" }],
        });

      const response = await request(app)
        .get(`/api/student/lessons/${lessonId}/exercises`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it("should return 404 when the lesson is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app)
        .get(`/api/student/lessons/${lessonId}/exercises`)
        .expect(404);
    });
  });

  describe("GET /api/student/lessons/:lessonId/exercises/:exerciseId", () => {
    it("should return a published exercise belonging to the lesson", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: exerciseId,
            lesson_id: lessonId,
            title: "Variables Challenge",
            status: "published",
          },
        ],
      });

      const response = await request(app)
        .get(`/api/student/lessons/${lessonId}/exercises/${exerciseId}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should return 404 when the exercise is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app)
        .get(`/api/student/lessons/${lessonId}/exercises/${exerciseId}`)
        .expect(404);
    });
  });

  describe("GET /api/student/exercises/:exerciseId/languages", () => {
    it("should return configured languages for a published exercise", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: exerciseId,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
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
          ],
        });

      const response = await request(app)
        .get(`/api/student/exercises/${exerciseId}/languages`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it("should return 404 when the exercise is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app)
        .get(`/api/student/exercises/${exerciseId}/languages`)
        .expect(404);
    });
  });

  describe("GET /api/student/exercises/:exerciseId/test-cases", () => {
    it("should return only visible test cases", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: exerciseId,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "a50e8400-e29b-41d4-a716-446655440000",
              input_data: { value: 5 },
              expected_output: { result: 5 },
              visibility: "visible",
            },
          ],
        });

      const response = await request(app)
        .get(`/api/student/exercises/${exerciseId}/test-cases`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].visibility).toBe("visible");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it("should return 404 when the exercise is inaccessible", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      await request(app)
        .get(`/api/student/exercises/${exerciseId}/test-cases`)
        .expect(404);
    });
  });

  describe("Database error handling", () => {
    it("should pass database errors to the global error handler", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app).get(
        `/api/student/courses/${courseId}`,
      );

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});
