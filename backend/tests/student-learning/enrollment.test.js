import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: "550e8400-e29b-41d4-a716-446655440000" };
    next();
  },
}));

vi.mock("../../src/modules/student-learning/enrollmentService.js", () => ({
  createEnrollmentService: vi.fn(),
  getStudentEnrollmentsService: vi.fn(),
  getEnrollmentService: vi.fn(),
  getEnrollmentByCourseService: vi.fn(),
  cancelEnrollmentService: vi.fn(),
  completeEnrollmentService: vi.fn(),
  updateEnrollmentActivityService: vi.fn(),
}));

import * as enrollmentService from "../../src/modules/student-learning/enrollmentService.js";
import enrollmentRoutes from "../../src/modules/student-learning/enrollmentRoutes.js";

describe("Enrollment API Integration", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const courseId = "650e8400-e29b-41d4-a716-446655440000";
  const enrollmentId = "750e8400-e29b-41d4-a716-446655440000";

  const mockEnrollment = {
    id: enrollmentId,
    user_id: userId,
    course_id: courseId,
    status: "active",
  };

  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();

    app.use(express.json());
    app.use(cookieParser());

    app.use("/api/student", enrollmentRoutes);

    app.use((error, req, res, next) => {
      res.status(error.status || 500).json({
        error: error.message,
      });
    });
  });

  describe("POST /api/student/enrollments", () => {
    it("should create an enrollment", async () => {
      enrollmentService.createEnrollmentService.mockResolvedValueOnce(
        mockEnrollment,
      );

      const response = await request(app)
        .post("/api/student/enrollments")
        .send({ courseId });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockEnrollment);

      expect(enrollmentService.createEnrollmentService).toHaveBeenCalledWith(
        userId,
        courseId,
      );
    });

    it("should reject an invalid course ID", async () => {
      const response = await request(app)
        .post("/api/student/enrollments")
        .send({ courseId: "invalid-id" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");

      expect(enrollmentService.createEnrollmentService).not.toHaveBeenCalled();
    });

    it("should reject a missing course ID", async () => {
      const response = await request(app)
        .post("/api/student/enrollments")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return a service error", async () => {
      enrollmentService.createEnrollmentService.mockRejectedValueOnce(
        Object.assign(new Error("Course not found"), {
          status: 404,
        }),
      );

      const response = await request(app)
        .post("/api/student/enrollments")
        .send({ courseId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Course not found");
    });
  });

  describe("GET /api/student/enrollments", () => {
    it("should return the student's enrollments", async () => {
      enrollmentService.getStudentEnrollmentsService.mockResolvedValueOnce([
        mockEnrollment,
      ]);

      const response = await request(app).get("/api/student/enrollments");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockEnrollment]);

      expect(
        enrollmentService.getStudentEnrollmentsService,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe("GET /api/student/enrollments/:enrollmentId", () => {
    it("should return enrollment details", async () => {
      enrollmentService.getEnrollmentService.mockResolvedValueOnce(
        mockEnrollment,
      );

      const response = await request(app).get(
        `/api/student/enrollments/${enrollmentId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEnrollment);

      expect(enrollmentService.getEnrollmentService).toHaveBeenCalledWith(
        enrollmentId,
        userId,
      );
    });

    it("should reject an invalid enrollment ID", async () => {
      const response = await request(app).get(
        "/api/student/enrollments/invalid-id",
      );

      expect(response.status).toBe(400);
      expect(enrollmentService.getEnrollmentService).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/student/courses/:courseId/enrollment", () => {
    it("should return enrollment for a course", async () => {
      enrollmentService.getEnrollmentByCourseService.mockResolvedValueOnce(
        mockEnrollment,
      );

      const response = await request(app).get(
        `/api/student/courses/${courseId}/enrollment`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEnrollment);

      expect(
        enrollmentService.getEnrollmentByCourseService,
      ).toHaveBeenCalledWith(courseId, userId);
    });

    it("should reject an invalid course ID", async () => {
      const response = await request(app).get(
        "/api/student/courses/invalid-id/enrollment",
      );

      expect(response.status).toBe(400);
      expect(
        enrollmentService.getEnrollmentByCourseService,
      ).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/student/enrollments/:enrollmentId/cancel", () => {
    it("should cancel an enrollment", async () => {
      const cancelledEnrollment = {
        ...mockEnrollment,
        status: "cancelled",
      };

      enrollmentService.cancelEnrollmentService.mockResolvedValueOnce(
        cancelledEnrollment,
      );

      const response = await request(app).patch(
        `/api/student/enrollments/${enrollmentId}/cancel`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("cancelled");

      expect(enrollmentService.cancelEnrollmentService).toHaveBeenCalledWith(
        enrollmentId,
        userId,
      );
    });
  });

  describe("PATCH /api/student/enrollments/:enrollmentId/complete", () => {
    it("should return a completion error when progress is not verified", async () => {
      enrollmentService.completeEnrollmentService.mockRejectedValueOnce(
        Object.assign(
          new Error(
            "Course completion must be verified through student progress.",
          ),
          { status: 409 },
        ),
      );

      const response = await request(app).patch(
        `/api/student/enrollments/${enrollmentId}/complete`,
      );

      expect(response.status).toBe(409);

      expect(enrollmentService.completeEnrollmentService).toHaveBeenCalledWith(
        enrollmentId,
        userId,
      );
    });
  });

  describe("PATCH /api/student/enrollments/:enrollmentId/activity", () => {
    it("should update enrollment activity", async () => {
      const updatedEnrollment = {
        ...mockEnrollment,
        last_accessed_at: new Date().toISOString(),
      };

      enrollmentService.updateEnrollmentActivityService.mockResolvedValueOnce(
        updatedEnrollment,
      );

      const response = await request(app).patch(
        `/api/student/enrollments/${enrollmentId}/activity`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedEnrollment);

      expect(
        enrollmentService.updateEnrollmentActivityService,
      ).toHaveBeenCalledWith(enrollmentId, userId);
    });
  });
});
