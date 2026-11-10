import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/database/pool.js", () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from "../../src/database/pool.js";
import * as enrollmentRepository from "../../src/modules/student-learning/enrollmentRepository.js";

describe("Enrollment Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEnrollment", () => {
    it("should create a new enrollment", async () => {
      const mockResult = {
        rows: [{ id: "enrollment-1", status: "active" }],
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await enrollmentRepository.createEnrollment(
        "user-1",
        "course-1",
      );

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO course_enrollments"),
        ["user-1", "course-1"],
      );
    });

    it("should propagate database errors", async () => {
      const error = new Error("Database error");
      pool.query.mockRejectedValue(error);

      await expect(
        enrollmentRepository.createEnrollment("user-1", "course-1"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("getEnrollmentByCourseIdAndUser", () => {
    it("should retrieve an enrollment by course ID and user ID", async () => {
      const mockResult = {
        rows: [{ id: "enrollment-1" }],
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await enrollmentRepository.getEnrollmentByCourseIdAndUser(
        "course-1",
        "user-1",
      );

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE course_id = $1"),
        ["course-1", "user-1"],
      );
    });

    it("should return an empty result when enrollment does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await enrollmentRepository.getEnrollmentByCourseIdAndUser(
        "course-1",
        "user-1",
      );

      expect(result.rows).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database error"));

      await expect(
        enrollmentRepository.getEnrollmentByCourseIdAndUser(
          "course-1",
          "user-1",
        ),
      ).rejects.toThrow("Database error");
    });
  });

  describe("reactivateEnrollment", () => {
    it("should reactivate a cancelled enrollment", async () => {
      const mockResult = {
        rows: [{ id: "enrollment-1", status: "active" }],
      };

      pool.query.mockResolvedValue(mockResult);

      const result =
        await enrollmentRepository.reactivateEnrollment("enrollment-1", "user-1");

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'active'"),
        ["enrollment-1", "user-1"],
      );
    });

    it("should return an empty result when enrollment cannot be reactivated", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result =
        await enrollmentRepository.reactivateEnrollment("enrollment-1", "user-1");

      expect(result.rows).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database error"));

      await expect(
        enrollmentRepository.reactivateEnrollment("enrollment-1", "user-1"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("updateEnrollmentActivity", () => {
    it("should update last accessed time for an active enrollment", async () => {
      const mockResult = {
        rows: [{ id: "enrollment-1", status: "active" }],
      };

      pool.query.mockResolvedValue(mockResult);

      const result =
        await enrollmentRepository.updateEnrollmentActivity("enrollment-1", "user-1");

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("last_accessed_at = NOW()"),
        ["enrollment-1", "user-1"],
      );
    });

    it("should return an empty result when enrollment is not active", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result =
        await enrollmentRepository.updateEnrollmentActivity("enrollment-1", "user-1");

      expect(result.rows).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database error"));

      await expect(
        enrollmentRepository.updateEnrollmentActivity("enrollment-1", "user-1"),
      ).rejects.toThrow("Database error");
    });
  });


  describe("getEnrollmentsByUserId", () => {
    it("should retrieve all enrollments belonging to a user", async () => {
      const mockResult = {
        rows: [{ id: "enrollment-1" }, { id: "enrollment-2" }],
      };

      pool.query.mockResolvedValue(mockResult);

      const result =
        await enrollmentRepository.getEnrollmentsByUserId("user-1");

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = $1"),
        ["user-1"],
      );
      expect(pool.query.mock.calls[0][0]).toContain(
        "ORDER BY enrolled_at DESC",
      );
    });

    it("should return an empty array when the user has no enrollments", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result =
        await enrollmentRepository.getEnrollmentsByUserId("user-1");

      expect(result.rows).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database error"));

      await expect(
        enrollmentRepository.getEnrollmentsByUserId("user-1"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("getEnrollmentWithCourseDetails", () => {
    it("should retrieve enrollment with course details for its owner", async () => {
      const mockResult = {
        rows: [
          {
            id: "enrollment-1",
            user_id: "user-1",
            title: "JavaScript Fundamentals",
            language: "javascript",
          },
        ],
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await enrollmentRepository.getEnrollmentWithCourseDetails(
        "enrollment-1",
        "user-1",
      );

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN courses c"),
        ["enrollment-1", "user-1"],
      );
    });

    it("should return an empty result when enrollment does not belong to the user", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await enrollmentRepository.getEnrollmentWithCourseDetails(
        "enrollment-1",
        "user-2",
      );

      expect(result.rows).toEqual([]);
    });

    it("should not reference a nonexistent duration column", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await enrollmentRepository.getEnrollmentWithCourseDetails(
        "enrollment-1",
        "user-1",
      );

      const query = pool.query.mock.calls[0][0];

      expect(query).not.toMatch(/c\.duration\b/i);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database error"));

      await expect(
        enrollmentRepository.getEnrollmentWithCourseDetails(
          "enrollment-1",
          "user-1",
        ),
      ).rejects.toThrow("Database error");
    });
  });

  describe("updateEnrollmentStatus", () => {
    it("should update enrollment status to cancelled", async () => {
      const mockResult = {
        rows: [
          {
            id: "enrollment-1",
            status: "cancelled",
            completed_at: null,
          },
        ],
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await enrollmentRepository.updateEnrollmentStatus(
        "enrollment-1",
        "user-1",
        "cancelled",
      );

      expect(result).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("completed_at = CASE"),
        ["enrollment-1", "user-1", "cancelled", null],
      );
      expect(pool.query.mock.calls[0][0]).toContain(
        "AND ($4::text IS NULL OR status = $4)",
      );
    });

    it("should update completed_at when status becomes completed", async () => {
      const mockResult = {
        rows: [
          {
            id: "enrollment-1",
            status: "completed",
            completed_at: "2026-11-09T00:00:00.000Z",
          },
        ],
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await enrollmentRepository.updateEnrollmentStatus(
        "enrollment-1",
        "user-1","user-1","completed",
      );

      expect(result).toEqual(mockResult);

      const query = pool.query.mock.calls[0][0];

      expect(query).toContain("WHEN $3 = 'completed' THEN NOW()");
    });

    it("should clear completed_at when status is not completed", async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: "enrollment-1",
            status: "active",
            completed_at: null,
          },
        ],
      });

      await enrollmentRepository.updateEnrollmentStatus(
        "enrollment-1",
        "user-1","user-1","active",
      );

      const query = pool.query.mock.calls[0][0];

      expect(query).toContain("ELSE NULL");
    });

    it("should return an empty result when enrollment does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await enrollmentRepository.updateEnrollmentStatus(
        "enrollment-1",
        "user-1",
        "cancelled",
      );

      expect(result.rows).toEqual([]);
    });

    it("should propagate database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database error"));

      await expect(
        enrollmentRepository.updateEnrollmentStatus(
          "enrollment-1",
          "user-1","user-1","cancelled",
        ),
      ).rejects.toThrow("Database error");
    });
  });
});
