
import { describe, it, expect } from "vitest";

import {
  lessonIdSchema,
  exerciseIdSchema,
  languageIdSchema,
  testCaseIdSchema,
  lessonExercisesParamsSchema,
  exerciseParamsSchema,
  exerciseLanguageParamsSchema,
  createExerciseSchema,
  updateExerciseSchema,
  createExerciseLanguageSchema,
  updateExerciseLanguageSchema,
  createTestCaseSchema,
  updateTestCaseSchema,
  reorderExercisesSchema,
} from "../src/modules/exercises/exerciseValidation.js";

const validLessonId = "550e8400-e29b-41d4-a716-446655440000";
const validExerciseId = "550e8400-e29b-41d4-a716-446655440001";
const validLanguageId = "550e8400-e29b-41d4-a716-446655440002";
const validTestCaseId = "550e8400-e29b-41d4-a716-446655440003";

const validExercise = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  instructions: "Learn how to declare variables.",
  difficulty: "beginner",
  position: 0,
};

const validExerciseLanguage = {
  language: "javascript",
  runtimeVersion: "24.0.0",
  executionMode: "function",
  starterCode: "function solution() {}",
  entryPoint: "solution",
};

const validTestCase = {
  inputData: { value: 5 },
  expectedOutput: { result: 10 },
  visibility: "visible",
  displayOrder: 0,
};

describe("Exercise Validation Schemas", () => {
  describe("UUID schemas", () => {
    it("should accept a valid lesson UUID", () => {
      expect(lessonIdSchema.safeParse(validLessonId).success).toBe(true);
    });

    it("should reject an invalid lesson UUID", () => {
      expect(lessonIdSchema.safeParse("invalid-id").success).toBe(false);
    });

    it("should accept a valid exercise UUID", () => {
      expect(exerciseIdSchema.safeParse(validExerciseId).success).toBe(true);
    });

    it("should reject an invalid exercise UUID", () => {
      expect(exerciseIdSchema.safeParse("invalid-id").success).toBe(false);
    });

    it("should accept a valid language UUID", () => {
      expect(languageIdSchema.safeParse(validLanguageId).success).toBe(true);
    });

    it("should reject an invalid language UUID", () => {
      expect(languageIdSchema.safeParse("invalid-id").success).toBe(false);
    });

    it("should accept a valid test case UUID", () => {
      expect(testCaseIdSchema.safeParse(validTestCaseId).success).toBe(true);
    });

    it("should reject an invalid test case UUID", () => {
      expect(testCaseIdSchema.safeParse("invalid-id").success).toBe(false);
    });
  });

  describe("Parameter schemas", () => {
    it("should accept valid lesson parameters", () => {
      expect(
        lessonExercisesParamsSchema.safeParse({
          lessonId: validLessonId,
        }).success,
      ).toBe(true);
    });

    it("should reject invalid lesson parameters", () => {
      expect(
        lessonExercisesParamsSchema.safeParse({
          lessonId: "invalid-id",
        }).success,
      ).toBe(false);
    });

    it("should reject additional lesson parameter fields", () => {
      expect(
        lessonExercisesParamsSchema.safeParse({
          lessonId: validLessonId,
          extra: "unexpected",
        }).success,
      ).toBe(false);
    });

    it("should accept valid exercise parameters", () => {
      expect(
        exerciseParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: validExerciseId,
        }).success,
      ).toBe(true);
    });

    it("should reject invalid exercise parameters", () => {
      expect(
        exerciseParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: "invalid-id",
        }).success,
      ).toBe(false);
    });

    it("should reject additional exercise parameter fields", () => {
      expect(
        exerciseParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: validExerciseId,
          extra: "unexpected",
        }).success,
      ).toBe(false);
    });
  });

  describe("Exercise language parameter schemas", () => {
    it("should accept valid exercise and language parameters", () => {
      expect(
        exerciseLanguageParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: validExerciseId,
          languageId: validLanguageId,
        }).success,
      ).toBe(true);
    });

    it("should reject an invalid lesson ID", () => {
      expect(
        exerciseLanguageParamsSchema.safeParse({
          lessonId: "invalid-id",
          exerciseId: validExerciseId,
          languageId: validLanguageId,
        }).success,
      ).toBe(false);
    });

    it("should reject an invalid exercise ID", () => {
      expect(
        exerciseLanguageParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: "invalid-id",
          languageId: validLanguageId,
        }).success,
      ).toBe(false);
    });

    it("should reject an invalid language ID", () => {
      expect(
        exerciseLanguageParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: validExerciseId,
          languageId: "invalid-id",
        }).success,
      ).toBe(false);
    });

    it("should reject additional parameter fields", () => {
      expect(
        exerciseLanguageParamsSchema.safeParse({
          lessonId: validLessonId,
          exerciseId: validExerciseId,
          languageId: validLanguageId,
          extra: "unexpected",
        }).success,
      ).toBe(false);
    });
  });

  describe("createExerciseSchema", () => {
    it("should accept valid exercise data", () => {
      expect(createExerciseSchema.safeParse(validExercise).success).toBe(true);
    });

    it("should reject an empty title", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          title: " ",
        }).success,
      ).toBe(false);
    });

    it("should reject a title longer than 150 characters", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          title: "A".repeat(151),
        }).success,
      ).toBe(false);
    });

    it("should reject an invalid slug format", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          slug: "JavaScript Variables",
        }).success,
      ).toBe(false);
    });

    it("should reject a slug containing consecutive hyphens", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          slug: "javascript--variables",
        }).success,
      ).toBe(false);
    });

    it("should reject a slug longer than 180 characters", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          slug: "a".repeat(181),
        }).success,
      ).toBe(false);
    });

    it("should reject empty instructions", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          instructions: " ",
        }).success,
      ).toBe(false);
    });

    it.each(["easy", "expert", "BEGINNER"])(
      "should reject invalid difficulty: %s",
      (difficulty) => {
        expect(
          createExerciseSchema.safeParse({
            ...validExercise,
            difficulty,
          }).success,
        ).toBe(false);
      },
    );

    it("should reject a negative position", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          position: -1,
        }).success,
      ).toBe(false);
    });

    it("should reject a decimal position", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          position: 1.5,
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected fields", () => {
      expect(
        createExerciseSchema.safeParse({
          ...validExercise,
          extra: "unexpected",
        }).success,
      ).toBe(false);
    });
  });

  describe("updateExerciseSchema", () => {
    it("should accept a partial exercise update", () => {
      expect(
        updateExerciseSchema.safeParse({
          title: "Updated Exercise Title",
        }).success,
      ).toBe(true);
    });

    it("should accept multiple updated fields", () => {
      expect(
        updateExerciseSchema.safeParse({
          title: "Updated Exercise",
          difficulty: "advanced",
        }).success,
      ).toBe(true);
    });

    it("should reject an empty update", () => {
      expect(updateExerciseSchema.safeParse({}).success).toBe(false);
    });

    it("should reject invalid fields in an update", () => {
      expect(
        updateExerciseSchema.safeParse({
          difficulty: "expert",
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected update fields", () => {
      expect(
        updateExerciseSchema.safeParse({
          title: "Updated Exercise",
          extra: true,
        }).success,
      ).toBe(false);
    });
  });

  describe("createExerciseLanguageSchema", () => {
    it("should accept valid language configuration", () => {
      expect(
        createExerciseLanguageSchema.safeParse(validExerciseLanguage).success,
      ).toBe(true);
    });

    it.each(["javascript", "python", "cpp"])(
      "should accept supported language: %s",
      (language) => {
        expect(
          createExerciseLanguageSchema.safeParse({
            ...validExerciseLanguage,
            language,
          }).success,
        ).toBe(true);
      },
    );

    it("should reject an unsupported language", () => {
      expect(
        createExerciseLanguageSchema.safeParse({
          ...validExerciseLanguage,
          language: "java",
        }).success,
      ).toBe(false);
    });

    it.each(["function", "stdin"])(
      "should accept execution mode: %s",
      (executionMode) => {
        expect(
          createExerciseLanguageSchema.safeParse({
            ...validExerciseLanguage,
            executionMode,
          }).success,
        ).toBe(true);
      },
    );

    it("should reject an invalid execution mode", () => {
      expect(
        createExerciseLanguageSchema.safeParse({
          ...validExerciseLanguage,
          executionMode: "unknown",
        }).success,
      ).toBe(false);
    });

    it("should allow a null entry point", () => {
      expect(
        createExerciseLanguageSchema.safeParse({
          ...validExerciseLanguage,
          entryPoint: null,
        }).success,
      ).toBe(true);
    });

    it("should allow an omitted entry point", () => {
      const { entryPoint, ...language } = validExerciseLanguage;

      expect(createExerciseLanguageSchema.safeParse(language).success).toBe(
        true,
      );
    });

    it("should reject an empty starter code", () => {
      expect(
        createExerciseLanguageSchema.safeParse({
          ...validExerciseLanguage,
          starterCode: " ",
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected fields", () => {
      expect(
        createExerciseLanguageSchema.safeParse({
          ...validExerciseLanguage,
          extra: true,
        }).success,
      ).toBe(false);
    });
  });

  describe("updateExerciseLanguageSchema", () => {
    it("should accept a partial language update", () => {
      expect(
        updateExerciseLanguageSchema.safeParse({
          runtimeVersion: "25.0.0",
        }).success,
      ).toBe(true);
    });

    it("should accept an update with a null entry point", () => {
      expect(
        updateExerciseLanguageSchema.safeParse({
          entryPoint: null,
        }).success,
      ).toBe(true);
    });

    it("should reject an empty update", () => {
      expect(updateExerciseLanguageSchema.safeParse({}).success).toBe(false);
    });

    it("should reject an invalid language update", () => {
      expect(
        updateExerciseLanguageSchema.safeParse({
          language: "java",
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected update fields", () => {
      expect(
        updateExerciseLanguageSchema.safeParse({
          runtimeVersion: "25.0.0",
          extra: true,
        }).success,
      ).toBe(false);
    });
  });

  describe("createTestCaseSchema", () => {
    it("should accept valid test case data", () => {
      expect(createTestCaseSchema.safeParse(validTestCase).success).toBe(true);
    });

    it("should accept JSON primitive values", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          inputData: "hello",
          expectedOutput: 42,
        }).success,
      ).toBe(true);
    });

    it("should accept null JSON values", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          inputData: null,
          expectedOutput: null,
        }).success,
      ).toBe(true);
    });

    it.each(["visible", "hidden"])(
      "should accept test case visibility: %s",
      (visibility) => {
        expect(
          createTestCaseSchema.safeParse({
            ...validTestCase,
            visibility,
          }).success,
        ).toBe(true);
      },
    );

    it("should reject invalid visibility", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          visibility: "private",
        }).success,
      ).toBe(false);
    });

    it("should reject a negative display order", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          displayOrder: -1,
        }).success,
      ).toBe(false);
    });

    it("should reject a decimal display order", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          displayOrder: 1.5,
        }).success,
      ).toBe(false);
    });

    it("should reject non-JSON input data", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          inputData: undefined,
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected fields", () => {
      expect(
        createTestCaseSchema.safeParse({
          ...validTestCase,
          extra: true,
        }).success,
      ).toBe(false);
    });
  });

  describe("updateTestCaseSchema", () => {
    it("should accept a partial test case update", () => {
      expect(
        updateTestCaseSchema.safeParse({
          visibility: "hidden",
        }).success,
      ).toBe(true);
    });

    it("should accept an expected output update", () => {
      expect(
        updateTestCaseSchema.safeParse({
          expectedOutput: { result: 20 },
        }).success,
      ).toBe(true);
    });

    it("should reject an empty update", () => {
      expect(updateTestCaseSchema.safeParse({}).success).toBe(false);
    });

    it("should reject invalid visibility in an update", () => {
      expect(
        updateTestCaseSchema.safeParse({
          visibility: "private",
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected update fields", () => {
      expect(
        updateTestCaseSchema.safeParse({
          visibility: "hidden",
          extra: true,
        }).success,
      ).toBe(false);
    });
  });

  describe("reorderExercisesSchema", () => {
    it("should accept valid exercise ordering data", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [
            {
              exerciseId: validExerciseId,
              position: 0,
            },
            {
              exerciseId: "550e8400-e29b-41d4-a716-446655440004",
              position: 1,
            },
          ],
        }).success,
      ).toBe(true);
    });

    it("should reject an empty exercises array", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [],
        }).success,
      ).toBe(false);
    });

    it("should reject an invalid exercise UUID", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [
            {
              exerciseId: "invalid-id",
              position: 0,
            },
          ],
        }).success,
      ).toBe(false);
    });

    it("should reject a negative position", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [
            {
              exerciseId: validExerciseId,
              position: -1,
            },
          ],
        }).success,
      ).toBe(false);
    });

    it("should reject a decimal position", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [
            {
              exerciseId: validExerciseId,
              position: 1.5,
            },
          ],
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected fields in an exercise item", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [
            {
              exerciseId: validExerciseId,
              position: 0,
              extra: true,
            },
          ],
        }).success,
      ).toBe(false);
    });

    it("should reject unexpected top-level fields", () => {
      expect(
        reorderExercisesSchema.safeParse({
          exercises: [
            {
              exerciseId: validExerciseId,
              position: 0,
            },
          ],
          extra: true,
        }).success,
      ).toBe(false);
    });
  });
});
