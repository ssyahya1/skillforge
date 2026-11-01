import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(180, "Slug must not exceed 180 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and single hyphens.",
  );

const difficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

const languageSchema = z.enum(["javascript", "python", "cpp"]);

const executionModeSchema = z.enum(["function", "stdin"]);

const visibilitySchema = z.enum(["visible", "hidden"]);

const jsonSchema = z.json();

export const lessonIdSchema = z
  .string()
  .uuid("A valid lesson UUID is required.");

export const exerciseIdSchema = z
  .string()
  .uuid("A valid exercise UUID is required.");

export const languageIdSchema = z
  .string()
  .uuid("A valid language UUID is required.");

export const testCaseIdSchema = z
  .string()
  .uuid("A valid test case UUID is required.");
  export const lessonExercisesParamsSchema = z.strictObject({
  lessonId: lessonIdSchema,
});

export const exerciseParamsSchema = z.strictObject({
  lessonId: lessonIdSchema,
  exerciseId: exerciseIdSchema,
});
export const exerciseLanguageParamsSchema = z.strictObject({
  lessonId: lessonIdSchema,
  exerciseId: exerciseIdSchema,
  languageId: languageIdSchema,
});

export const createExerciseSchema = z.strictObject({
  title: z.string().trim().min(1).max(150),
  slug: slugSchema,
  instructions: z.string().trim().min(1),
  difficulty: difficultySchema,
  position: z.number().int().min(0),
});
export const updateExerciseSchema = createExerciseSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

export const createExerciseLanguageSchema = z.strictObject({
  language: languageSchema,
  runtimeVersion: z.string().trim().min(1),
  executionMode: executionModeSchema,
  starterCode: z.string().trim().min(1),
  entryPoint: z.string().trim().nullable().optional(),
});
export const updateExerciseLanguageSchema = z
  .strictObject({
    runtimeVersion: z.string().trim().min(1).optional(),
    executionMode: executionModeSchema.optional(),
    starterCode: z.string().trim().min(1).optional(),
    entryPoint: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

export const createTestCaseSchema = z.strictObject({
  inputData: jsonSchema,
  expectedOutput: jsonSchema,
  visibility: visibilitySchema,
  displayOrder: z.number().int().min(0),
});

export const updateTestCaseSchema = createTestCaseSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

export const reorderExercisesSchema = z.strictObject({
  exercises: z
    .array(
      z.strictObject({
        exerciseId: z.string().uuid(),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});
