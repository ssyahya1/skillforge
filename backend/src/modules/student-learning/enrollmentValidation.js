import { z } from "zod";

export const createEnrollmentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

export const enrollmentParamsSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
});

export const courseEnrollmentParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});
