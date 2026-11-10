import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

afterEach(() => {
  vi.doUnmock("../src/database/pool.js");
  vi.doUnmock("../src/middleware/rateLimiter.js");
  vi.doUnmock("../src/modules/execution/executionQueue.js");
  vi.unstubAllEnvs();
  vi.resetModules();
});

const mockReadinessDependencies = ({
  databaseQuery = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
  rateLimitRedisStatus = "ready",
  queueRedisStatus = "ready",
  runWorker = "true",
} = {}) => {
  vi.stubEnv("RUN_WORKER", runWorker);
  const pool = { query: databaseQuery };
  const rateLimitRedis = { status: rateLimitRedisStatus };
  const redisConnection = { status: queueRedisStatus };

  vi.doMock("../src/database/pool.js", () => ({ pool }));
  vi.doMock("../src/middleware/rateLimiter.js", () => ({
    globalRateLimiter: (req, res, next) => next(),
    authRateLimiter: (req, res, next) => next(),
    rateLimitRedis,
  }));
  vi.doMock("../src/modules/execution/executionQueue.js", () => ({
    redisConnection,
    addExecutionJob: vi.fn(),
  }));

  return { databaseQuery };
};

const importAppWithWorkerReadiness = async (workerReady = true) => {
  const { default: app } = await import("../src/app.js");
  app.locals.executionWorkerReady = workerReady;
  return app;
};

describe("Debug cookies endpoint", () => {
  it("is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("../src/middleware/rateLimiter.js", () => ({ globalRateLimiter: (req, res, next) => next(), authRateLimiter: (req, res, next) => next() }));

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

describe("Readiness endpoints", () => {
  it("reports ready when PostgreSQL and both Redis connections are available", async () => {
    const { databaseQuery } = mockReadinessDependencies();
    const app = await importAppWithWorkerReadiness();

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
    expect(databaseQuery).toHaveBeenCalledWith("SELECT 1");
  });

  it.each([
    ["rate-limit Redis", "end", "ready"],
    ["execution Redis", "ready", "reconnecting"],
  ])(
    "reports not ready when %s is unavailable",
    async (_name, rateStatus, queueStatus) => {
      const { databaseQuery } = mockReadinessDependencies({
        rateLimitRedisStatus: rateStatus,
        queueRedisStatus: queueStatus,
      });
      const app = await importAppWithWorkerReadiness();

      const response = await request(app).get("/api/ready");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: "not_ready" });
      expect(databaseQuery).not.toHaveBeenCalled();
    },
  );

  it("reports not ready when the database check fails", async () => {
    const databaseQuery = vi.fn().mockRejectedValue(
      Object.assign(new Error("database unavailable"), { code: "ECONNREFUSED" }),
    );
    mockReadinessDependencies({ databaseQuery });
    const app = await importAppWithWorkerReadiness();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
    expect(console.error).toHaveBeenCalledWith(
      "[Readiness] Database check failed.",
      "ECONNREFUSED",
    );
  });

  it("keeps the existing liveness endpoint independent of dependency readiness", async () => {
    mockReadinessDependencies({
      rateLimitRedisStatus: "end",
      queueRedisStatus: "end",
    });
    const app = await importAppWithWorkerReadiness(false);

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("reports not ready when the API-hosted execution worker failed to start", async () => {
    const { databaseQuery } = mockReadinessDependencies();
    const app = await importAppWithWorkerReadiness(false);

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
    expect(databaseQuery).not.toHaveBeenCalled();
  });

  it("does not require a local worker when an external worker is configured", async () => {
    const { databaseQuery } = mockReadinessDependencies({
      runWorker: "false",
    });
    const app = await importAppWithWorkerReadiness(false);

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
    expect(databaseQuery).toHaveBeenCalledWith("SELECT 1");
  });
});
