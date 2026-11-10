import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import {
  createGracefulShutdown,
  registerShutdownSignals,
} from "../src/serverShutdown.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API graceful shutdown", () => {
  it("stops requests, schedules, worker, both Redis connections, and pool once for repeated signals", async () => {
    const order = [];
    const signalSource = new EventEmitter();
    const server = {
      listening: true,
      close: vi.fn((callback) => {
        order.push("server");
        server.listening = false;
        callback();
      }),
    };
    const courseTask = {
      destroy: vi.fn(async () => order.push("course-task")),
    };
    const lessonTask = {
      destroy: vi.fn(async () => order.push("lesson-task")),
    };
    const worker = {};
    const closeWorker = vi.fn(async () => order.push("worker"));
    const closeQueue = vi.fn(async () => order.push("queue"));
    const closeRateLimitRedis = vi.fn(async () =>
      order.push("rate-limit-redis"),
    );
    const closePool = vi.fn(async () => order.push("pool"));
    const shutdown = createGracefulShutdown({
      server,
      getScheduledTasks: () => [courseTask, lessonTask],
      getWorker: () => worker,
      closeWorker,
      closeQueue,
      closeRateLimitRedis,
      closePool,
    });

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    registerShutdownSignals(shutdown, signalSource);

    signalSource.emit("SIGTERM");
    signalSource.emit("SIGINT");

    await vi.waitFor(() => {
      expect(closePool).toHaveBeenCalledOnce();
    });

    expect(order).toEqual([
      "server",
      "course-task",
      "lesson-task",
      "worker",
      "queue",
      "rate-limit-redis",
      "pool",
    ]);
    expect(server.close).toHaveBeenCalledOnce();
    expect(courseTask.destroy).toHaveBeenCalledOnce();
    expect(lessonTask.destroy).toHaveBeenCalledOnce();
    expect(closeWorker).toHaveBeenCalledOnce();
    expect(closeWorker).toHaveBeenCalledWith(worker);
    expect(closeQueue).toHaveBeenCalledOnce();
    expect(closeRateLimitRedis).toHaveBeenCalledOnce();
    expect(closePool).toHaveBeenCalledOnce();
  });

  it("continues cleanup when earlier shutdown steps fail", async () => {
    const order = [];
    const serverError = new Error("HTTP server close failed");
    const rateLimitRedisError = new Error("Rate limiter Redis close failed");
    const poolError = new Error("database pool close failed");
    const server = {
      listening: true,
      close: vi.fn((callback) => callback(serverError)),
    };
    const task = {
      destroy: vi.fn(async () => order.push("task")),
    };
    const closeWorker = vi.fn(async () => order.push("worker"));
    const closeQueue = vi.fn(async () => order.push("queue"));
    const closeRateLimitRedis = vi.fn(async () => {
      order.push("rate-limit-redis");
      throw rateLimitRedisError;
    });
    const closePool = vi.fn(async () => {
      order.push("pool");
      throw poolError;
    });
    const shutdown = createGracefulShutdown({
      server,
      getScheduledTasks: () => [task],
      getWorker: () => ({}),
      closeWorker,
      closeQueue,
      closeRateLimitRedis,
      closePool,
    });

    await expect(shutdown("SIGTERM")).rejects.toMatchObject({
      message: "Shutdown failed after SIGTERM.",
      errors: [serverError, rateLimitRedisError, poolError],
    });

    expect(order).toEqual([
      "task",
      "worker",
      "queue",
      "rate-limit-redis",
      "pool",
    ]);
    expect(closePool).toHaveBeenCalledOnce();
  });

  it("closes the pool and reports worker and queue cleanup failures", async () => {
    const order = [];
    const workerError = new Error("worker close failed");
    const queueError = new Error("queue close failed");
    const closeWorker = vi.fn(async () => {
      order.push("worker");
      throw workerError;
    });
    const closeQueue = vi.fn(async () => {
      order.push("queue");
      throw queueError;
    });
    const closeRateLimitRedis = vi.fn(async () =>
      order.push("rate-limit-redis"),
    );
    const closePool = vi.fn(async () => order.push("pool"));
    const shutdown = createGracefulShutdown({
      server: { listening: false },
      getScheduledTasks: () => [],
      getWorker: () => ({}),
      closeWorker,
      closeQueue,
      closeRateLimitRedis,
      closePool,
    });

    await expect(shutdown("SIGTERM")).rejects.toMatchObject({
      message: "Shutdown failed after SIGTERM.",
      errors: [workerError, queueError],
    });

    expect(order).toEqual([
      "worker",
      "queue",
      "rate-limit-redis",
      "pool",
    ]);
    expect(closeRateLimitRedis).toHaveBeenCalledOnce();
    expect(closePool).toHaveBeenCalledOnce();
  });
});
