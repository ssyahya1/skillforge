import { describe, expect, it } from "vitest";
import {
  submissionIdSchema,
  executionParamsSchema,
} from "../../src/modules/execution/executionValidation.js";

describe("executionValidation", () => {
  describe("submissionIdSchema", () => {
    it("should accept valid UUIDs", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(submissionIdSchema.safeParse(validUuid).success).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(submissionIdSchema.safeParse("not-a-uuid").success).toBe(false);
      expect(submissionIdSchema.safeParse("").success).toBe(false);
      expect(submissionIdSchema.safeParse(12345).success).toBe(false);
    });
  });

  describe("executionParamsSchema", () => {
    it("should validate params containing submissionId", () => {
      const params = { submissionId: "123e4567-e89b-12d3-a456-426614174000" };
      const result = executionParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(params);
    });

    it("should reject extra properties in strictObject", () => {
      const params = {
        submissionId: "123e4567-e89b-12d3-a456-426614174000",
        unexpected: "value",
      };
      const result = executionParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });
});
