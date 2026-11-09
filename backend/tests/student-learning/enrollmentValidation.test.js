import { describe, expect, it } from "vitest";

import {
  createEnrollmentSchema,
  enrollmentParamsSchema,
  courseEnrollmentParamsSchema,
} from "../../src/modules/student-learning/enrollmentValidation.js";

describe("Enrollment Validation", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  describe("createEnrollmentSchema", () => {
    it("should accept a valid course ID", () => {
      const result = createEnrollmentSchema.safeParse({
        courseId: validId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid course ID", () => {
      const result = createEnrollmentSchema.safeParse({
        courseId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });

    it("should reject a missing course ID", () => {
      const result = createEnrollmentSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject a non-string course ID", () => {
      const result = createEnrollmentSchema.safeParse({
        courseId: 123,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("enrollmentParamsSchema", () => {
    it("should accept a valid enrollment ID", () => {
      const result = enrollmentParamsSchema.safeParse({
        enrollmentId: validId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid enrollment ID", () => {
      const result = enrollmentParamsSchema.safeParse({
        enrollmentId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });

    it("should reject a missing enrollment ID", () => {
      const result = enrollmentParamsSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("courseEnrollmentParamsSchema", () => {
    it("should accept a valid course ID", () => {
      const result = courseEnrollmentParamsSchema.safeParse({
        courseId: validId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid course ID", () => {
      const result = courseEnrollmentParamsSchema.safeParse({
        courseId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });

    it("should reject a missing course ID", () => {
      const result = courseEnrollmentParamsSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});
