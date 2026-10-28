
import { describe, it, expect } from "vitest";
import { signupSchema } from "../src/modules/auth/authValidation.js";

describe("signupSchema", () => {
  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse({
      email: "student@example.com",
      password: "StrongPass123",
      display_name: "Student One",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "StrongPass123",
      display_name: "Student One",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a client-supplied role", () => {
    const result = signupSchema.safeParse({
      email: "student@example.com",
      password: "StrongPass123",
      display_name: "Student One",
      role: "admin",
    });

    expect(result.success).toBe(false);
  });
});
