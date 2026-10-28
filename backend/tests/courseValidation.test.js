
import { describe, expect, it } from "vitest";
import { createCourseSchema } from "../src/modules/courses/courseValidation.js";

const validCourse = {
  title: "JavaScript Fundamentals",
  slug: "javascript-fundamentals",
  description: "Learn JavaScript fundamentals from scratch.",
  language: "javascript",
  difficulty: "beginner",
};

describe("createCourseSchema", () => {
  it("accepts a valid course", () => {
    const result = createCourseSchema.safeParse(validCourse);

    expect(result.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const { title, ...course } = validCourse;

    const result = createCourseSchema.safeParse(course);

    expect(result.success).toBe(false);
  });

  it("rejects an unsupported programming language", () => {
    const result = createCourseSchema.safeParse({
      ...validCourse,
      language: "java",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    const result = createCourseSchema.safeParse({
      ...validCourse,
      slug: "JavaScript Fundamentals!",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected fields such as created_by", () => {
    const result = createCourseSchema.safeParse({
      ...validCourse,
      created_by: "some-user-id",
    });

    expect(result.success).toBe(false);
  });

  it("defaults access_tier to free", () => {
    const result = createCourseSchema.safeParse(validCourse);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.access_tier).toBe("free");
    }
  });

  it("rejects a description that is too short", () => {
    const result = createCourseSchema.safeParse({
      ...validCourse,
      description: "Short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid difficulty", () => {
    const result = createCourseSchema.safeParse({
      ...validCourse,
      difficulty: "expert",
    });

    expect(result.success).toBe(false);
  });

  it("trims whitespace from the title", () => {
    const result = createCourseSchema.safeParse({
      ...validCourse,
      title: "  JavaScript Fundamentals  ",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.title).toBe("JavaScript Fundamentals");
    }
  });
});
