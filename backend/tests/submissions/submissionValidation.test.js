
import { describe, it, expect } from "vitest";

import {
  submissionParamsSchema,
  submissionDetailsParamsSchema,
  solutionRevealParamsSchema,
  createSubmissionSchema,
  submissionHistoryQuerySchema,
  revealSolutionSchema,
} from "../../src/modules/submissions/submissionValidation.js";

const validExerciseId = "550e8400-e29b-41d4-a716-446655440000";
const validSubmissionId = "550e8400-e29b-41d4-a716-446655440001";
const validLanguageId = "550e8400-e29b-41d4-a716-446655440002";
const validIdempotencyKey = "550e8400-e29b-41d4-a716-446655440003";

describe("Submission Validation", () => {
  describe("submissionParamsSchema", () => {
    it("should accept a valid exercise UUID", () => {
      const result = submissionParamsSchema.safeParse({
        exerciseId: validExerciseId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid exercise UUID", () => {
      const result = submissionParamsSchema.safeParse({
        exerciseId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });

    it("should reject unexpected parameters", () => {
      const result = submissionParamsSchema.safeParse({
        exerciseId: validExerciseId,
        userId: "unexpected",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("submissionDetailsParamsSchema", () => {
    it("should accept a valid submission UUID", () => {
      const result = submissionDetailsParamsSchema.safeParse({
        submissionId: validSubmissionId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid submission UUID", () => {
      const result = submissionDetailsParamsSchema.safeParse({
        submissionId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("solutionRevealParamsSchema", () => {
    it("should accept a valid exercise UUID", () => {
      const result = solutionRevealParamsSchema.safeParse({
        exerciseId: validExerciseId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid exercise UUID", () => {
      const result = solutionRevealParamsSchema.safeParse({
        exerciseId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createSubmissionSchema", () => {
    const validSubmission = {
      languageId: validLanguageId,
      sourceCode: "console.log('Hello World');",
      idempotencyKey: validIdempotencyKey,
    };

    it("should accept valid submission data", () => {
      const result = createSubmissionSchema.safeParse(validSubmission);

      expect(result.success).toBe(true);
    });

    it("should accept submission without an idempotency key", () => {
      const { idempotencyKey, ...submission } = validSubmission;

      const result = createSubmissionSchema.safeParse(submission);

      expect(result.success).toBe(true);
    });

    it("should reject an invalid language UUID", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        languageId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });

    it("should reject an invalid idempotency key", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        idempotencyKey: "invalid-key",
      });

      expect(result.success).toBe(false);
    });

    it("should reject empty source code", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        sourceCode: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject source code exceeding 100 KB", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        sourceCode: "a".repeat(100001),
      });

      expect(result.success).toBe(false);
    });

    it("should accept source code of exactly 100 KB", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        sourceCode: "a".repeat(100000),
      });

      expect(result.success).toBe(true);
    });

    it("should reject unexpected fields", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        userId: validExerciseId,
        status: "accepted",
        runtimeVersion: "22",
      });

      expect(result.success).toBe(false);
    });

    it("should preserve source code whitespace", () => {
      const sourceCode = "  console.log('Hello');\n  ";

      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        sourceCode,
      });

      expect(result.success).toBe(true);
      expect(result.data.sourceCode).toBe(sourceCode);
    });

    it("should reject source code exceeding 100 KB in UTF-8 bytes", () => {
      const result = createSubmissionSchema.safeParse({
        ...validSubmission,
        sourceCode: "😀".repeat(25001),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("submissionHistoryQuerySchema", () => {
    it("should apply default pagination values", () => {
      const result = submissionHistoryQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        page: 1,
        limit: 10,
      });
    });

    it("should convert query strings into numbers", () => {
      const result = submissionHistoryQuerySchema.safeParse({
        page: "2",
        limit: "20",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        page: 2,
        limit: 20,
      });
    });

    it("should reject page values below 1", () => {
      const result = submissionHistoryQuerySchema.safeParse({
        page: "0",
        limit: "10",
      });

      expect(result.success).toBe(false);
    });

    it("should reject limit values above 100", () => {
      const result = submissionHistoryQuerySchema.safeParse({
        page: "1",
        limit: "101",
      });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer pagination values", () => {
      const result = submissionHistoryQuerySchema.safeParse({
        page: "1.5",
        limit: "10",
      });

      expect(result.success).toBe(false);
    });

    it("should reject unexpected query fields", () => {
      const result = submissionHistoryQuerySchema.safeParse({
        page: "1",
        limit: "10",
        userId: validExerciseId,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("revealSolutionSchema", () => {
    it("should accept a valid language UUID", () => {
      const result = revealSolutionSchema.safeParse({
        languageId: validLanguageId,
      });

      expect(result.success).toBe(true);
    });

    it("should reject an invalid language UUID", () => {
      const result = revealSolutionSchema.safeParse({
        languageId: "invalid-id",
      });

      expect(result.success).toBe(false);
    });

    it("should reject unexpected fields", () => {
      const result = revealSolutionSchema.safeParse({
        languageId: validLanguageId,
        exerciseId: validExerciseId,
      });

      expect(result.success).toBe(false);
    });
  });
});

