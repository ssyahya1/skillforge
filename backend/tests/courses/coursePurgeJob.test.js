import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  purgeExpiredCoursesService: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: mocks.schedule,
  },
}));

vi.mock("../../src/modules/courses/courseService.js", () => ({
  purgeExpiredCoursesService: mocks.purgeExpiredCoursesService,
}));

import { startCoursePurgeJob } from "../../src/jobs/coursePurgeJob.js";

describe("course purge job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("returns its scheduled task so the API can stop it during shutdown", () => {
    const scheduledTask = { destroy: vi.fn() };
    mocks.schedule.mockReturnValue(scheduledTask);

    expect(startCoursePurgeJob()).toBe(scheduledTask);
    expect(mocks.schedule).toHaveBeenCalledWith(
      "0 2 * * *",
      expect.any(Function),
      { timezone: "Asia/Karachi" },
    );
  });
});
