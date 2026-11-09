import { z } from "zod";

export const enrollmentProgressParamsSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
});

export const lessonProgressParamsSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  lessonId: z.string().uuid("Invalid lesson ID"),
});

export const exerciseProgressParamsSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  exerciseId: z.string().uuid("Invalid exercise ID"),
});

export const exerciseLookupParamsSchema = z.object({
  exerciseId: z.string().uuid("Invalid exercise ID"),
});
