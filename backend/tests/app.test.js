import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Debug cookies endpoint", () => {
  it("is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { default: app } = await import("../src/app.js");
    const response = await request(app).get("/api/debug/cookies");

    expect(response.status).toBe(404);
  });

  it("remains available outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const { default: app } = await import("../src/app.js");
    const response = await request(app).get("/api/debug/cookies");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "This endpoint checks prepared response cookies only.",
    );
  });
});
