import { beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  createEnrollment,
  getStudentEnrollments,
  getEnrollment,
  getEnrollmentByCourse,
  cancelEnrollment,
  completeEnrollment,
  updateEnrollmentActivity,
} from "../../src/modules/student-learning/enrollmentController.js";

describe("Enrollment Controller", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const courseId = "650e8400-e29b-41d4-a716-446655440000";
  const enrollmentId = "750e8400-e29b-41d4-a716-446655440000";

  const mockEnrollment = {
    id: enrollmentId,
    user_id: userId,
    course_id: courseId,
    status: "active",
  };

  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: userId },
      params: {},
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe("createEnrollment", () => {
    it("should create an enrollment", async () => {
      req.body = { courseId };

      enrollmentService.createEnrollmentService.mockResolvedValueOnce(
        mockEnrollment,
      );

      await createEnrollment(req, res, next);

      expect(enrollmentService.createEnrollmentService).toHaveBeenCalledWith(
        userId,
        courseId,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockEnrollment);
      expect(next).not.toHaveBeenCalled();
    });

    it("should use validated request body when available", async () => {
      req.body = { courseId: "invalid" };
      req.validateBody = { courseId };

      enrollmentService.createEnrollmentService.mockResolvedValueOnce(
        mockEnrollment,
      );

      await createEnrollment(req, res, next);

      expect(enrollmentService.createEnrollmentService).toHaveBeenCalledWith(
        userId,
        courseId,
      );
    });

    it("should pass errors to next", async () => {
      const error = new Error("Enrollment failed");

      req.body = { courseId };

      enrollmentService.createEnrollmentService.mockRejectedValueOnce(error);

      await createEnrollment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getStudentEnrollments", () => {
    it("should return student enrollments", async () => {
      const enrollments = [mockEnrollment];

      enrollmentService.getStudentEnrollmentsService.mockResolvedValueOnce(
        enrollments,
      );

      await getStudentEnrollments(req, res, next);

      expect(
        enrollmentService.getStudentEnrollmentsService,
      ).toHaveBeenCalledWith(userId);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(enrollments);
    });

    it("should pass errors to next", async () => {
      const error = new Error("Database error");

      enrollmentService.getStudentEnrollmentsService.mockRejectedValueOnce(
        error,
      );

      await getStudentEnrollments(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getEnrollment", () => {
    it("should return enrollment details", async () => {
      req.params = { enrollmentId };

      enrollmentService.getEnrollmentService.mockResolvedValueOnce(
        mockEnrollment,
      );

      await getEnrollment(req, res, next);

      expect(enrollmentService.getEnrollmentService).toHaveBeenCalledWith(
        enrollmentId,
        userId,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEnrollment);
    });

    it("should pass errors to next", async () => {
      const error = new Error("Enrollment not found");

      req.params = { enrollmentId };

      enrollmentService.getEnrollmentService.mockRejectedValueOnce(error);

      await getEnrollment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getEnrollmentByCourse", () => {
    it("should return enrollment for a course", async () => {
      req.params = { courseId };

      enrollmentService.getEnrollmentByCourseService.mockResolvedValueOnce(
        mockEnrollment,
      );

      await getEnrollmentByCourse(req, res, next);

      expect(
        enrollmentService.getEnrollmentByCourseService,
      ).toHaveBeenCalledWith(courseId, userId);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEnrollment);
    });

    it("should pass errors to next", async () => {
      const error = new Error("Enrollment not found");

      req.params = { courseId };

      enrollmentService.getEnrollmentByCourseService.mockRejectedValueOnce(
        error,
      );

      await getEnrollmentByCourse(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("cancelEnrollment", () => {
    it("should cancel an enrollment", async () => {
      const cancelled = {
        ...mockEnrollment,
        status: "cancelled",
      };

      req.params = { enrollmentId };

      enrollmentService.cancelEnrollmentService.mockResolvedValueOnce(
        cancelled,
      );

      await cancelEnrollment(req, res, next);

      expect(enrollmentService.cancelEnrollmentService).toHaveBeenCalledWith(
        enrollmentId,
        userId,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(cancelled);
    });

    it("should pass errors to next", async () => {
      const error = new Error("Cannot cancel enrollment");

      req.params = { enrollmentId };

      enrollmentService.cancelEnrollmentService.mockRejectedValueOnce(error);

      await cancelEnrollment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("completeEnrollment", () => {
    it("should return completed enrollment", async () => {
      const completed = {
        ...mockEnrollment,
        status: "completed",
      };

      req.params = { enrollmentId };

      enrollmentService.completeEnrollmentService.mockResolvedValueOnce(
        completed,
      );

      await completeEnrollment(req, res, next);

      expect(enrollmentService.completeEnrollmentService).toHaveBeenCalledWith(
        enrollmentId,
        userId,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(completed);
    });

    it("should pass errors to next", async () => {
      const error = new Error(
        "Course completion must be verified through student progress.",
      );

      req.params = { enrollmentId };

      enrollmentService.completeEnrollmentService.mockRejectedValueOnce(error);

      await completeEnrollment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateEnrollmentActivity", () => {
    it("should update enrollment activity", async () => {
      const updated = {
        ...mockEnrollment,
        last_accessed_at: new Date().toISOString(),
      };

      req.params = { enrollmentId };

      enrollmentService.updateEnrollmentActivityService.mockResolvedValueOnce(
        updated,
      );

      await updateEnrollmentActivity(req, res, next);

      expect(
        enrollmentService.updateEnrollmentActivityService,
      ).toHaveBeenCalledWith(enrollmentId, userId);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("should pass errors to next", async () => {
      const error = new Error("Enrollment not found");

      req.params = { enrollmentId };

      enrollmentService.updateEnrollmentActivityService.mockRejectedValueOnce(
        error,
      );

      await updateEnrollmentActivity(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
