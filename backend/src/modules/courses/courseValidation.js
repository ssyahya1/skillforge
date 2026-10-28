import {z} from "zod";

export const createCourseSchema = z.strictObject({
  title: z.string().trim().min(3).max(150),
  slug: z.string().trim().min(3).max(180).regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and single hyphens."
    ),

  description: z.string().trim().min(10),
  language: z.enum(["javascript", "python", "cpp"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  access_tier: z.enum(["free", "premium"]).default("free"),
});
export const courseQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).min(1).default(10),
  language: z.enum(["javascript", "python", "cpp"]).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});
export const courseParamsSchema = z.strictObject({
  courseId: z.string().uuid(),
});
export const updateCourseSchema = z.strictObject({
  title: z.string().trim().min(3).max(150).optional(),
  slug: z.string().trim().min(3).max(180).regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and single hyphens."
  ).optional(),
  description: z.string().trim().min(10).optional(),
  language: z.enum(["javascript", "python", "cpp"]).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  access_tier: z.enum(["free", "premium"]).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
