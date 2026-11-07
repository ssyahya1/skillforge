import { describe, it, expect } from "vitest";

import {
  courseIdSchema,
  lessonIdSchema,
  exerciseIdSchema,
  courseParamsSchema,
  courseLessonsParamsSchema,
  courseLessonParamsSchema,
  lessonParamsSchema,
  lessonExercisesParamsSchema,
  lessonExerciseParamsSchema,
  exerciseParamsSchema,
  studentCourseQuerySchema,
  studentLessonQuerySchema,
  studentExerciseQuerySchema,
} from "../../src/modules/student-learning/studentLearningValidation.js";

const validCourseId = "550e8400-e29b-41d4-a716-446655440000";
const validLessonId = "550e8400-e29b-41d4-a716-446655440001";
const validExerciseId = "550e8400-e29b-41d4-a716-446655440002";

const invalidUUID = "invalid-uuid";

describe("Student Learning UUID Schemas", () => {
  it("should accept a valid course UUID", () => {
    expect(courseIdSchema.safeParse(validCourseId).success).toBe(true);
  });

  it("should accept a valid lesson UUID", () => {
    expect(lessonIdSchema.safeParse(validLessonId).success).toBe(true);
  });

  it("should accept a valid exercise UUID", () => {
    expect(exerciseIdSchema.safeParse(validExerciseId).success).toBe(true);
  });

  it("should reject an invalid course UUID", () => {
    expect(courseIdSchema.safeParse(invalidUUID).success).toBe(false);
  });

  it("should reject an invalid lesson UUID", () => {
    expect(lessonIdSchema.safeParse(invalidUUID).success).toBe(false);
  });

  it("should reject an invalid exercise UUID", () => {
    expect(exerciseIdSchema.safeParse(invalidUUID).success).toBe(false);
  });

  it("should reject an empty UUID", () => {
    expect(courseIdSchema.safeParse("").success).toBe(false);
  });

  it("should reject a missing UUID", () => {
    expect(courseIdSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("Course Parameter Schemas", () => {
  it("should accept valid course parameters", () => {
    const result = courseParamsSchema.safeParse({
      courseId: validCourseId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid course parameters", () => {
    const result = courseParamsSchema.safeParse({
      courseId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing courseId", () => {
    const result = courseParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should reject unexpected course parameters", () => {
    const result = courseParamsSchema.safeParse({
      courseId: validCourseId,
      status: "published",
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid course lessons parameters", () => {
    const result = courseLessonsParamsSchema.safeParse({
      courseId: validCourseId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid course lessons parameters", () => {
    const result = courseLessonsParamsSchema.safeParse({
      courseId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid course and lesson parameters", () => {
    const result = courseLessonParamsSchema.safeParse({
      courseId: validCourseId,
      lessonId: validLessonId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid lessonId in course lesson parameters", () => {
    const result = courseLessonParamsSchema.safeParse({
      courseId: validCourseId,
      lessonId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing lessonId", () => {
    const result = courseLessonParamsSchema.safeParse({
      courseId: validCourseId,
    });

    expect(result.success).toBe(false);
  });

  it("should reject unexpected fields in course lesson parameters", () => {
    const result = courseLessonParamsSchema.safeParse({
      courseId: validCourseId,
      lessonId: validLessonId,
      deleted_at: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("Lesson Parameter Schemas", () => {
  it("should accept valid lesson parameters", () => {
    const result = lessonParamsSchema.safeParse({
      lessonId: validLessonId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid lesson parameters", () => {
    const result = lessonParamsSchema.safeParse({
      lessonId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing lessonId", () => {
    const result = lessonParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should reject unexpected lesson parameters", () => {
    const result = lessonParamsSchema.safeParse({
      lessonId: validLessonId,
      status: "published",
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid lesson exercises parameters", () => {
    const result = lessonExercisesParamsSchema.safeParse({
      lessonId: validLessonId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid lesson exercises parameters", () => {
    const result = lessonExercisesParamsSchema.safeParse({
      lessonId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });
});

describe("Exercise Parameter Schemas", () => {
  it("should accept valid exercise parameters", () => {
    const result = exerciseParamsSchema.safeParse({
      exerciseId: validExerciseId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid exercise parameters", () => {
    const result = exerciseParamsSchema.safeParse({
      exerciseId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing exerciseId", () => {
    const result = exerciseParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should reject unexpected exercise parameters", () => {
    const result = exerciseParamsSchema.safeParse({
      exerciseId: validExerciseId,
      status: "published",
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid lesson and exercise parameters", () => {
    const result = lessonExerciseParamsSchema.safeParse({
      lessonId: validLessonId,
      exerciseId: validExerciseId,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid lessonId", () => {
    const result = lessonExerciseParamsSchema.safeParse({
      lessonId: invalidUUID,
      exerciseId: validExerciseId,
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid exerciseId", () => {
    const result = lessonExerciseParamsSchema.safeParse({
      lessonId: validLessonId,
      exerciseId: invalidUUID,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing exerciseId", () => {
    const result = lessonExerciseParamsSchema.safeParse({
      lessonId: validLessonId,
    });

    expect(result.success).toBe(false);
  });

  it("should reject unexpected fields in lesson exercise parameters", () => {
    const result = lessonExerciseParamsSchema.safeParse({
      lessonId: validLessonId,
      exerciseId: validExerciseId,
      status: "published",
    });

    expect(result.success).toBe(false);
  });
});

describe("Student Course Query Schema", () => {
  it("should apply default pagination values", () => {
    const result = studentCourseQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      page: 1,
      limit: 10,
    });
  });

  it("should accept valid pagination values", () => {
    const result = studentCourseQuerySchema.safeParse({
      page: "2",
      limit: "25",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      page: 2,
      limit: 25,
    });
  });

  it("should accept the maximum course limit", () => {
    const result = studentCourseQuerySchema.safeParse({
      limit: "50",
    });

    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(50);
  });

  it("should reject a course limit greater than 50", () => {
    const result = studentCourseQuerySchema.safeParse({
      limit: "51",
    });

    expect(result.success).toBe(false);
  });

  it("should reject a zero page", () => {
    const result = studentCourseQuerySchema.safeParse({
      page: "0",
    });

    expect(result.success).toBe(false);
  });

  it("should reject a negative page", () => {
    const result = studentCourseQuerySchema.safeParse({
      page: "-1",
    });

    expect(result.success).toBe(false);
  });

  it("should reject a negative limit", () => {
    const result = studentCourseQuerySchema.safeParse({
      limit: "-5",
    });

    expect(result.success).toBe(false);
  });

  it("should reject decimal pagination values", () => {
    const result = studentCourseQuerySchema.safeParse({
      page: "1.5",
    });

    expect(result.success).toBe(false);
  });

  it("should reject non-numeric pagination values", () => {
    const result = studentCourseQuerySchema.safeParse({
      limit: "abc",
    });

    expect(result.success).toBe(false);
  });

  it("should accept javascript as a language filter", () => {
    const result = studentCourseQuerySchema.safeParse({
      language: "javascript",
    });

    expect(result.success).toBe(true);
  });

  it("should accept python as a language filter", () => {
    const result = studentCourseQuerySchema.safeParse({
      language: "python",
    });

    expect(result.success).toBe(true);
  });

  it("should accept cpp as a language filter", () => {
    const result = studentCourseQuerySchema.safeParse({
      language: "cpp",
    });

    expect(result.success).toBe(true);
  });

  it("should reject an unsupported language", () => {
    const result = studentCourseQuerySchema.safeParse({
      language: "java",
    });

    expect(result.success).toBe(false);
  });

  it("should accept beginner difficulty", () => {
    const result = studentCourseQuerySchema.safeParse({
      difficulty: "beginner",
    });

    expect(result.success).toBe(true);
  });

  it("should accept intermediate difficulty", () => {
    const result = studentCourseQuerySchema.safeParse({
      difficulty: "intermediate",
    });

    expect(result.success).toBe(true);
  });

  it("should accept advanced difficulty", () => {
    const result = studentCourseQuerySchema.safeParse({
      difficulty: "advanced",
    });

    expect(result.success).toBe(true);
  });

  it("should reject an unsupported difficulty", () => {
    const result = studentCourseQuerySchema.safeParse({
      difficulty: "expert",
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid language and difficulty filters together", () => {
    const result = studentCourseQuerySchema.safeParse({
      language: "javascript",
      difficulty: "beginner",
      page: "2",
      limit: "20",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      language: "javascript",
      difficulty: "beginner",
      page: 2,
      limit: 20,
    });
  });

  it("should reject a status filter", () => {
    const result = studentCourseQuerySchema.safeParse({
      status: "draft",
    });

    expect(result.success).toBe(false);
  });

  it("should reject deleted_at filter", () => {
    const result = studentCourseQuerySchema.safeParse({
      deleted_at: "null",
    });

    expect(result.success).toBe(false);
  });

  it("should reject unexpected course query fields", () => {
    const result = studentCourseQuerySchema.safeParse({
      page: "1",
      limit: "10",
      isAdmin: "true",
    });

    expect(result.success).toBe(false);
  });
});

describe("Student Lesson Query Schema", () => {
  it("should apply default pagination values", () => {
    const result = studentLessonQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it("should accept valid pagination values", () => {
    const result = studentLessonQuerySchema.safeParse({
      page: "3",
      limit: "50",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      page: 3,
      limit: 50,
    });
  });

  it("should accept the maximum lesson limit", () => {
    const result = studentLessonQuerySchema.safeParse({
      limit: "100",
    });

    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(100);
  });

  it("should reject a lesson limit greater than 100", () => {
    const result = studentLessonQuerySchema.safeParse({
      limit: "101",
    });

    expect(result.success).toBe(false);
  });

  it("should reject a zero page", () => {
    const result = studentLessonQuerySchema.safeParse({
      page: "0",
    });

    expect(result.success).toBe(false);
  });

  it("should reject negative pagination values", () => {
    const result = studentLessonQuerySchema.safeParse({
      page: "-1",
      limit: "-10",
    });

    expect(result.success).toBe(false);
  });

  it("should reject decimal pagination values", () => {
    const result = studentLessonQuerySchema.safeParse({
      limit: "10.5",
    });

    expect(result.success).toBe(false);
  });

  it("should reject unexpected lesson query fields", () => {
    const result = studentLessonQuerySchema.safeParse({
      page: "1",
      limit: "20",
      status: "published",
    });

    expect(result.success).toBe(false);
  });
});

describe("Student Exercise Query Schema", () => {
  it("should apply default pagination values", () => {
    const result = studentExerciseQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it("should accept valid pagination values", () => {
    const result = studentExerciseQuerySchema.safeParse({
      page: "2",
      limit: "30",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      page: 2,
      limit: 30,
    });
  });

  it("should accept the maximum exercise limit", () => {
    const result = studentExerciseQuerySchema.safeParse({
      limit: "100",
    });

    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(100);
  });

  it("should reject an exercise limit greater than 100", () => {
    const result = studentExerciseQuerySchema.safeParse({
      limit: "101",
    });

    expect(result.success).toBe(false);
  });

  it("should reject zero and negative pagination values", () => {
    const result = studentExerciseQuerySchema.safeParse({
      page: "0",
      limit: "-1",
    });

    expect(result.success).toBe(false);
  });

  it("should reject decimal pagination values", () => {
    const result = studentExerciseQuerySchema.safeParse({
      page: "1.5",
    });

    expect(result.success).toBe(false);
  });

  it("should reject non-numeric pagination values", () => {
    const result = studentExerciseQuerySchema.safeParse({
      page: "abc",
    });

    expect(result.success).toBe(false);
  });

  it("should reject unexpected exercise query fields", () => {
    const result = studentExerciseQuerySchema.safeParse({
      page: "1",
      limit: "20",
      status: "published",
    });

    expect(result.success).toBe(false);
  });
});
