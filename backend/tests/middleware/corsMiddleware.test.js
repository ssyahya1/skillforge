import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createCorsMiddleware } from "../../src/middleware/corsMiddleware.js";

describe("CORS middleware", () => {
  const allowedOrigins = ["http://localhost:3000"];
  const createApp = () => {
    const app = express();
    app.use(createCorsMiddleware(allowedOrigins));
    app.get("/test", (req, res) => {
      res.status(200).json({ status: "ok" });
    });
    return app;
  };

  it("allows configured origins", async () => {
    const response = await request(createApp())
      .get("/test")
      .set("Origin", "http://localhost:3000");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"])
      .toBe("http://localhost:3000");
    expect(response.headers["access-control-allow-credentials"])
      .toBe("true");
  });

  it("does not grant CORS access to unapproved origins", async () => {
    const response = await request(createApp())
      .get("/test")
      .set("Origin", "https://malicious.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows requests without an Origin header", async () => {
    const response = await request(createApp()).get("/test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
