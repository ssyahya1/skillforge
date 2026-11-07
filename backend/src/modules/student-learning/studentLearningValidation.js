import { z } from "zod";

const uuidSchema = z.string().uuid();

const pageSchema = z.coerce.number().int().min(1).default(1);

const courseLimitSchema = z.coerce.number().int().min(1).max(50).default(10);

const contentLimitSchema = z.coerce.number().int().min(1).max(100).default(20);

export const courseIdSchema = uuidSchema;

export const lessonIdSchema = uuidSchema;

export const exerciseIdSchema = uuidSchema;

export const courseParamsSchema = z.strictObject({
  courseId: courseIdSchema,
});

export const courseLessonsParamsSchema = z.strictObject({
  courseId: courseIdSchema,
});

export const courseLessonParamsSchema = z.strictObject({
  courseId: courseIdSchema,
  lessonId: lessonIdSchema,
});

export const lessonParamsSchema = z.strictObject({
  lessonId: lessonIdSchema,
});

export const lessonExercisesParamsSchema = z.strictObject({
  lessonId: lessonIdSchema,
});

export const lessonExerciseParamsSchema = z.strictObject({
  lessonId: lessonIdSchema,
  exerciseId: exerciseIdSchema,
});

export const exerciseParamsSchema = z.strictObject({
  exerciseId: exerciseIdSchema,
});

export const studentCourseQuerySchema = z.strictObject({
  page: pageSchema,
  limit: courseLimitSchema,

  language: z.enum(["javascript", "python", "cpp"]).optional(),

  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const studentLessonQuerySchema = z.strictObject({
  page: pageSchema,
  limit: contentLimitSchema,
});

export const studentExerciseQuerySchema = z.strictObject({
  page: pageSchema,
  limit: contentLimitSchema,
});
