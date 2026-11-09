import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { MemoryStore } from "express-rate-limit";
import { createRateLimiter } from "../../src/middleware/rateLimiter.js";

const createTestLimiter = (limit, message) =>
  createRateLimiter({
    limit,
    prefix: `test:${limit}:`,
    message,
    store: new MemoryStore(),
  });

describe("Rate limiter middleware", () => {
  it("should allow requests within the global limit", async () => {
    const app = express();

    app.use(
      createTestLimiter(300, "Too many requests. Please try again later."),
    );
    app.get("/test", (req, res) => res.status(200).json({ status: "ok" }));

    const response = await request(app).get("/test");

    expect(response.status).toBe(200);
    expect(response.headers["ratelimit"]).toBeDefined();
  });

  it("should return 429 when the request limit is exceeded", async () => {
    const app = express();

    app.use(createTestLimiter(1, "Too many requests."));
    app.get("/test", (req, res) => res.status(200).json({ status: "ok" }));

    const firstResponse = await request(app).get("/test");
    const secondResponse = await request(app).get("/test");

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.body).toEqual({
      error: "TOO_MANY_REQUESTS",
      message: "Too many requests.",
    });
  });

  it("should return the authentication-specific limit message", async () => {
    const app = express();

    app.use(createTestLimiter(1, "Too many authentication attempts."));
    app.get("/test", (req, res) => res.status(200).json({ status: "ok" }));

    await request(app).get("/test");
    const response = await request(app).get("/test");

    expect(response.status).toBe(429);
    expect(response.body.message).toBe(
      "Too many authentication attempts.",
    );
  });
});
