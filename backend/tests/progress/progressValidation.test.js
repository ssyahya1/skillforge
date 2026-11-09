import { describe, expect, it } from "vitest";

import {
  enrollmentProgressParamsSchema,
  lessonProgressParamsSchema,
  exerciseProgressParamsSchema,
  exerciseLookupParamsSchema,
} from "../../src/modules/progress/progressValidation.js";

describe("progressValidation", () => {
  const enrollmentId = "11111111-1111-4111-8111-111111111111";
  const lessonId = "22222222-2222-4222-8222-222222222222";
  const exerciseId = "33333333-3333-4333-8333-333333333333";

  it("accepts a valid enrollment progress parameter", () => {
    expect(enrollmentProgressParamsSchema.safeParse({ enrollmentId }).success)
      .toBe(true);
  });

  it("rejects an invalid enrollment progress parameter", () => {
    expect(
      enrollmentProgressParamsSchema.safeParse({ enrollmentId: "invalid" })
        .success,
    ).toBe(false);
  });

  it("validates enrollment and lesson parameters together", () => {
    expect(
      lessonProgressParamsSchema.safeParse({ enrollmentId, lessonId }).success,
    ).toBe(true);
    expect(
      lessonProgressParamsSchema.safeParse({
        enrollmentId,
        lessonId: "invalid",
      }).success,
    ).toBe(false);
  });

  it("validates enrollment and exercise parameters together", () => {
    expect(
      exerciseProgressParamsSchema.safeParse({ enrollmentId, exerciseId })
        .success,
    ).toBe(true);
    expect(
      exerciseProgressParamsSchema.safeParse({
        enrollmentId: "invalid",
        exerciseId,
      }).success,
    ).toBe(false);
  });

  it("validates an exercise lookup parameter", () => {
    expect(exerciseLookupParamsSchema.safeParse({ exerciseId }).success).toBe(
      true,
    );
    expect(
      exerciseLookupParamsSchema.safeParse({ exerciseId: "invalid" }).success,
    ).toBe(false);
  });

});
