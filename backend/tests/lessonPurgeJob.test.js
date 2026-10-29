import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  purgeExpiredLessonService: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: mocks.schedule,
  },
}));

vi.mock("../src/modules/lessons/lessonService.js", () => ({
  purgeExpiredLessonService: mocks.purgeExpiredLessonService,
}));

import { startLessonPurgeJob } from "../src/jobs/lessonPurgeJob.js";

describe("lesson purge job", () => {
  let scheduledCallback;
  let scheduledTask;
  let info;
  let warn;
  let error;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduledTask = { destroy: vi.fn() };
    mocks.schedule.mockImplementation((expression, callback, options) => {
      scheduledCallback = callback;
      return scheduledTask;
    });
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("registers the daily schedule in Pakistan time and returns its task", () => {
    const task = startLessonPurgeJob();

    expect(mocks.schedule).toHaveBeenCalledWith(
      "30 2 * * *",
      expect.any(Function),
      { timezone: "Asia/Karachi" }
    );
    expect(task).toBe(scheduledTask);
    expect(info).toHaveBeenCalledWith(
      "[Lesson Purge] Scheduled daily at 2:30 AM Pakistan time."
    );
  });

  it("purges one bounded batch and logs success", async () => {
    mocks.purgeExpiredLessonService.mockResolvedValueOnce({
      purgedCount: 4,
      purgedLessonIds: ["lesson-1", "lesson-2", "lesson-3", "lesson-4"],
    });
    startLessonPurgeJob();

    await scheduledCallback();

    expect(mocks.purgeExpiredLessonService).toHaveBeenCalledWith(100);
    expect(info).toHaveBeenCalledWith(
      "[Lesson Purge] Job completed. Purged 4 lesson(s)."
    );
  });

  it("releases the running guard after a successful execution", async () => {
    mocks.purgeExpiredLessonService.mockResolvedValue({
      purgedCount: 0,
      purgedLessonIds: [],
    });
    startLessonPurgeJob();

    await scheduledCallback();
    await scheduledCallback();

    expect(mocks.purgeExpiredLessonService).toHaveBeenCalledTimes(2);
  });

  it("handles service failures and releases the running guard for a later run", async () => {
    const purgeError = new Error("Database unavailable");
    mocks.purgeExpiredLessonService
      .mockRejectedValueOnce(purgeError)
      .mockResolvedValueOnce({ purgedCount: 1, purgedLessonIds: ["lesson-1"] });
    startLessonPurgeJob();

    await expect(scheduledCallback()).resolves.toBeUndefined();
    await expect(scheduledCallback()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      "[Lesson Purge] Job failed:",
      purgeError
    );
    expect(mocks.purgeExpiredLessonService).toHaveBeenCalledTimes(2);
  });

  it("skips an overlapping execution in the same process", async () => {
    let resolvePurge;
    mocks.purgeExpiredLessonService.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePurge = resolve;
        })
    );
    startLessonPurgeJob();

    const firstExecution = scheduledCallback();
    const overlappingExecution = scheduledCallback();

    await expect(overlappingExecution).resolves.toBeUndefined();
    expect(mocks.purgeExpiredLessonService).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[Lesson Purge] Previous job is still running. Skipping."
    );

    resolvePurge({ purgedCount: 0, purgedLessonIds: [] });
    await firstExecution;
  });

  it("exposes scheduler cleanup through the returned task", async () => {
    const task = startLessonPurgeJob();

    await task.destroy();

    expect(scheduledTask.destroy).toHaveBeenCalledOnce();
  });
});
