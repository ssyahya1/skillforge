import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createOriginValidationMiddleware } from "../../src/middleware/originValidation.js";

const createApp = () => {
  const app = express();

  app.use(
    createOriginValidationMiddleware(["http://localhost:3000"]),
  );

  app.post("/test", (req, res) => res.status(200).json({ status: "ok" }));
  app.get("/test", (req, res) => res.status(200).json({ status: "ok" }));

  return app;
};

describe("Origin validation middleware", () => {
  it("allows requests from an approved origin", async () => {
    const response = await request(createApp())
      .post("/test")
      .set("Origin", "http://localhost:3000");

    expect(response.status).toBe(200);
  });

  it("rejects requests from an unapproved origin", async () => {
    const response = await request(createApp())
      .post("/test")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
  });

  it("allows requests without an Origin header", async () => {
    const response = await request(createApp()).post("/test");

    expect(response.status).toBe(200);
  });

  it("does not restrict safe methods", async () => {
    const response = await request(createApp())
      .get("/test")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(200);
  });
});
