import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkerRunnerShutdown } from "../../src/modules/execution/workerRunnerShutdown.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("worker runner shutdown", () => {
  it("runs cleanup once when signals overlap", async () => {
    let finishWorkerClose;
    const workerClosePending = new Promise((resolve) => {
      finishWorkerClose = resolve;
    });
    const worker = {};
    const closeWorker = vi.fn(() => workerClosePending);
    const closeQueue = vi.fn().mockResolvedValue(undefined);
    const closePool = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const shutdown = createWorkerRunnerShutdown({
      worker,
      closeWorker,
      closeQueue,
      closePool,
      exit,
    });

    const termShutdown = shutdown("SIGTERM");
    const intShutdown = shutdown("SIGINT");

    expect(intShutdown).toBe(termShutdown);
    expect(closeWorker).toHaveBeenCalledOnce();
    finishWorkerClose();
    await termShutdown;

    expect(closeWorker).toHaveBeenCalledWith(worker);
    expect(closeQueue).toHaveBeenCalledOnce();
    expect(closePool).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("continues cleanup and reports failures without retrying cleanup", async () => {
    const worker = {};
    const workerError = new Error("worker close failed");
    const queueError = new Error("queue close failed");
    const poolError = new Error("pool close failed");
    const closeWorker = vi.fn().mockRejectedValue(workerError);
    const closeQueue = vi.fn().mockRejectedValue(queueError);
    const closePool = vi.fn().mockRejectedValue(poolError);
    const exit = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const shutdown = createWorkerRunnerShutdown({
      worker,
      closeWorker,
      closeQueue,
      closePool,
      exit,
    });

    await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);

    expect(closeWorker).toHaveBeenCalledOnce();
    expect(closeQueue).toHaveBeenCalledOnce();
    expect(closePool).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith(
      "[Execution Worker] Error during shutdown:",
      expect.objectContaining({
        errors: [workerError, queueError, poolError],
      }),
    );
    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits with failure when only pool cleanup fails", async () => {
    const closeWorker = vi.fn().mockResolvedValue(undefined);
    const closeQueue = vi.fn().mockResolvedValue(undefined);
    const poolError = new Error("pool close failed");
    const closePool = vi.fn().mockRejectedValue(poolError);
    const exit = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const shutdown = createWorkerRunnerShutdown({
      worker: {},
      closeWorker,
      closeQueue,
      closePool,
      exit,
    });

    await shutdown("SIGTERM");

    expect(closeWorker).toHaveBeenCalledOnce();
    expect(closeQueue).toHaveBeenCalledOnce();
    expect(closePool).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith(
      "[Execution Worker] Error during shutdown:",
      expect.objectContaining({ errors: [poolError] }),
    );
    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
