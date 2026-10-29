
import { describe, expect, it } from "vitest";

import {
  createLessonSchema,
  updateLessonSchema,
  lessonParamsSchema,
  courseLessonsParamsSchema,
  lessonQuerySchema,
} from "../src/modules/lessons/lessonValidation.js";

const courseId = "550e8400-e29b-41d4-a716-446655440000";
const lessonId = "650e8400-e29b-41d4-a716-446655440000";

const validLesson = {
  title: "JavaScript Variables",
  slug: "javascript-variables",
  content: "Learn about variables.",
  video_url: "https://example.com/lesson",
  code_examples: [
    {
      language: "javascript",
      code: "let count = 1;",
    },
  ],
  position: 0,
};

describe("createLessonSchema", () => {
  it("accepts valid lesson data", () => {
    const result = createLessonSchema.safeParse(validLesson);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual(validLesson);
    }
  });

  it("applies defaults for content, video URL, and code examples", () => {
    const result = createLessonSchema.safeParse({
      title: "JavaScript Variables",
      slug: "javascript-variables",
      position: 0,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.content).toBe("");
      expect(result.data.video_url).toBeUndefined();
      expect(result.data.code_examples).toEqual([]);
    }
  });

  it("accepts a null video URL", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      video_url: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const { title, ...data } = validLesson;

    const result = createLessonSchema.safeParse(data);

    expect(result.success).toBe(false);
  });

  it("rejects a title shorter than three characters", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      title: "JS",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 150 characters", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      title: "A".repeat(151),
    });

    expect(result.success).toBe(false);
  });

  it("trims whitespace around the title", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      title: "  JavaScript Variables  ",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.title).toBe("JavaScript Variables");
    }
  });

  it("rejects a missing slug", () => {
    const { slug, ...data } = validLesson;

    const result = createLessonSchema.safeParse(data);

    expect(result.success).toBe(false);
  });

  it.each([
    "JavaScript-Variables",
    "javascript variables",
    "javascript--variables",
    "-javascript",
    "javascript-",
    "javascript_variables",
  ])("rejects an invalid slug: %s", (slug) => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      slug,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a slug containing lowercase letters and numbers", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      slug: "lesson-2-variables",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a slug longer than 180 characters", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      slug: "a".repeat(181),
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid video URL", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      video_url: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-array code_examples value", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      code_examples: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects code examples that are not objects", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      code_examples: ["let count = 1;"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a negative position", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      position: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a decimal position", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      position: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing position", () => {
    const { position, ...data } = validLesson;

    const result = createLessonSchema.safeParse(data);

    expect(result.success).toBe(false);
  });

  it("rejects unexpected fields", () => {
    const result = createLessonSchema.safeParse({
      ...validLesson,
      status: "published",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateLessonSchema", () => {
  it("accepts a partial update", () => {
    const result = updateLessonSchema.safeParse({
      title: "Updated Variables Lesson",
    });

    expect(result.success).toBe(true);
  });

  it("accepts multiple updated fields", () => {
    const result = updateLessonSchema.safeParse({
      title: "Updated Variables Lesson",
      content: "Updated lesson content.",
      position: 2,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty update", () => {
    const result = updateLessonSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects an invalid title", () => {
    const result = updateLessonSchema.safeParse({
      title: "JS",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    const result = updateLessonSchema.safeParse({
      slug: "Invalid Slug",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a negative position", () => {
    const result = updateLessonSchema.safeParse({
      position: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid video URL", () => {
    const result = updateLessonSchema.safeParse({
      video_url: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("accepts null to clear the video URL", () => {
    const result = updateLessonSchema.safeParse({
      video_url: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects unexpected fields", () => {
    const result = updateLessonSchema.safeParse({
      status: "published",
    });

    expect(result.success).toBe(false);
  });
});

describe("lessonParamsSchema", () => {
  it("accepts valid course and lesson UUIDs", () => {
    const result = lessonParamsSchema.safeParse({
      courseId,
      lessonId,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid course UUID", () => {
    const result = lessonParamsSchema.safeParse({
      courseId: "invalid-course-id",
      lessonId,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid lesson UUID", () => {
    const result = lessonParamsSchema.safeParse({
      courseId,
      lessonId: "invalid-lesson-id",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing route parameters", () => {
    const result = lessonParamsSchema.safeParse({
      courseId,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected route parameters", () => {
    const result = lessonParamsSchema.safeParse({
      courseId,
      lessonId,
      extra: "unexpected",
    });

    expect(result.success).toBe(false);
  });
});

describe("courseLessonsParamsSchema", () => {
  it("accepts a valid course UUID", () => {
    const result = courseLessonsParamsSchema.safeParse({
      courseId,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid course UUID", () => {
    const result = courseLessonsParamsSchema.safeParse({
      courseId: "invalid-course-id",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected parameters", () => {
    const result = courseLessonsParamsSchema.safeParse({
      courseId,
      lessonId,
    });

    expect(result.success).toBe(false);
  });
});

describe("lessonQuerySchema", () => {
  it("applies default pagination values", () => {
    const result = lessonQuerySchema.safeParse({});

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 20,
      });
    }
  });

  it("coerces string pagination values into numbers", () => {
    const result = lessonQuerySchema.safeParse({
      page: "2",
      limit: "50",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("accepts valid lesson status filters", () => {
    for (const status of ["draft", "published"]) {
      const result = lessonQuerySchema.safeParse({ status });

      expect(result.success).toBe(true);
    }
  });

  it("rejects unsupported lesson status filters", () => {
    const result = lessonQuerySchema.safeParse({
      status: "archived",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a page below one", () => {
    const result = lessonQuerySchema.safeParse({
      page: "0",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a negative page", () => {
    const result = lessonQuerySchema.safeParse({
      page: "-1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a zero limit", () => {
    const result = lessonQuerySchema.safeParse({
      limit: "0",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a limit greater than 100", () => {
    const result = lessonQuerySchema.safeParse({
      limit: "101",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a decimal page", () => {
    const result = lessonQuerySchema.safeParse({
      page: "1.5",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected query parameters", () => {
    const result = lessonQuerySchema.safeParse({
      unexpected: "value",
    });

    expect(result.success).toBe(false);
  });
});
