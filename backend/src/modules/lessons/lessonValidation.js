
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(180, "Slug must not exceed 180 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and single hyphens."
  );

const uuidSchema = z.string().uuid("A valid UUID is required.");

const codeExampleSchema = z.record(z.string(), z.unknown());

export const createLessonSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(3, "Title must contain at least 3 characters.")
    .max(150, "Title must not exceed 150 characters."),

  slug: slugSchema,

  content: z.string().default(""),

  video_url: z
    .union([
      z.string().url("Video URL must be a valid URL."),
      z.null(),
    ])
    .optional(),

  code_examples: z.array(codeExampleSchema).default([]),

  position: z
    .number()
    .int("Position must be an integer.")
    .min(0, "Position cannot be negative."),
});

export const updateLessonSchema = z
  .strictObject({
    title: z
      .string()
      .trim()
      .min(3, "Title must contain at least 3 characters.")
      .max(150, "Title must not exceed 150 characters.")
      .optional(),

    slug: slugSchema.optional(),

    content: z.string().optional(),

    video_url: z
      .union([
        z.string().url("Video URL must be a valid URL."),
        z.null(),
      ])
      .optional(),

    code_examples: z.array(codeExampleSchema).optional(),

    position: z
      .number()
      .int("Position must be an integer.")
      .min(0, "Position cannot be negative.")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided." }
  );

export const lessonParamsSchema = z.strictObject({
  courseId: uuidSchema,
  lessonId: uuidSchema,
});

export const courseLessonsParamsSchema = z.strictObject({
  courseId: uuidSchema,
});

export const lessonQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "published"]).optional(),
});
