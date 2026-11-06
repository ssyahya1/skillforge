import { z } from "zod";

export const submissionIdSchema = z
  .string()
  .uuid("A valid submission UUID is required.");

export const executionParamsSchema = z.strictObject({
  submissionId: submissionIdSchema,
});
