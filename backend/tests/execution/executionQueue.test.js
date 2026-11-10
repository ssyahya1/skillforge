import { beforeEach, describe, expect, it, vi } from "vitest";

const { add, close, quit, Queue, IORedis } = vi.hoisted(() => {
  process.env.REDIS_URL = "redis://127.0.0.1:6380";

  const add = vi.fn();
  const close = vi.fn();
  const quit = vi.fn();

  const Queue = vi.fn(function () {
    this.add = add;
    this.close = close;
  });

  const IORedis = vi.fn(function () {
    this.quit = quit;
  });

  return {
    add,
    close,
    quit,
    Queue,
    IORedis,
  };
});

vi.mock("bullmq", () => ({
  Queue,
}));

vi.mock("ioredis", () => ({
  default: IORedis,
}));

let addExecutionJob;
let closeExecutionQueue;
let executionQueue;
let redisConnection;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  const executionModule =
    await import("../../src/modules/execution/executionQueue.js");

  addExecutionJob = executionModule.addExecutionJob;
  closeExecutionQueue = executionModule.closeExecutionQueue;
  executionQueue = executionModule.executionQueue;
  redisConnection = executionModule.redisConnection;
});

describe("executionQueue", () => {
  it("should create a Redis connection", () => {
    expect(IORedis).toHaveBeenCalledWith(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    expect(redisConnection).toBeDefined();
  });

  it("should create the execution queue", () => {
    expect(Queue).toHaveBeenCalledWith(
      "skillforge-execution",
      expect.objectContaining({
        connection: redisConnection,
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }),
      }),
    );

    expect(executionQueue).toBeDefined();
  });

  it("should add an execution job", async () => {
    const job = {
      id: "submission-test-id",
    };

    add.mockResolvedValue(job);

    const result = await addExecutionJob({
      submissionId: "test-id",
    });

    expect(add).toHaveBeenCalledWith(
      "execute-submission",
      {
        submissionId: "test-id",
      },
      {
        jobId: "submission-test-id",
      },
    );

    expect(result).toEqual(job);
  });

  it("should propagate queue errors", async () => {
    add.mockRejectedValue(new Error("Redis unavailable"));

    await expect(
      addExecutionJob({
        submissionId: "test-id",
      }),
    ).rejects.toThrow("Redis unavailable");
  });

  it("should close the queue and Redis connection", async () => {
    await closeExecutionQueue();

    expect(close).toHaveBeenCalledOnce();
    expect(quit).toHaveBeenCalledOnce();
  });

  it("should close Redis even if closing the queue fails", async () => {
    close.mockRejectedValueOnce(new Error("Queue close failed"));

    await expect(closeExecutionQueue()).rejects.toThrow("Queue close failed");

    expect(close).toHaveBeenCalledOnce();
    expect(quit).toHaveBeenCalledOnce();
  });
});
