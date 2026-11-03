import { z } from "zod";

export const exerciseIdSchema = z
  .string()
  .uuid("A valid exercise UUID is required.");

export const languageIdSchema = z
  .string()
  .uuid("A valid language UUID is required.");

export const submissionIdSchema = z
  .string()
  .uuid("A valid submission UUID is required.");

export const submissionParamsSchema = z.strictObject({
  exerciseId: exerciseIdSchema,
});

export const submissionDetailsParamsSchema = z.strictObject({
  submissionId: submissionIdSchema,
});

export const solutionRevealParamsSchema = z.strictObject({
  exerciseId: exerciseIdSchema,
});

const sourceCodeSchema = z
  .string()
  .min(1, "Source code is required.")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 100000,
    "Source code must not exceed 100 KB.",
  );

export const createSubmissionSchema = z.strictObject({
  languageId: languageIdSchema,
  sourceCode: sourceCodeSchema,
  idempotencyKey: z
    .string()
    .uuid("A valid idempotency UUID is required.")
    .optional(),
});

export const submissionHistoryQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const revealSolutionSchema = z.strictObject({
  languageId: languageIdSchema,
});
