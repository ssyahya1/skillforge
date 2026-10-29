import cron from "node-cron";
import { purgeExpiredLessonService } from "../modules/lessons/lessonService.js";

let isRunning = false;

export const startLessonPurgeJob = () => {
  const task = cron.schedule(
    "30 2 * * *",
    async () => {
      if (isRunning) {
        console.warn("[Lesson Purge] Previous job is still running. Skipping.");
        return;
      }

      isRunning = true;

      try {
        const result = await purgeExpiredLessonService(100);

        console.info(
          `[Lesson Purge] Job completed. Purged ${result.purgedCount} lesson(s).`
        );
      } catch (error) {
        console.error("[Lesson Purge] Job failed:", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Karachi",
    }
  );

  console.info("[Lesson Purge] Scheduled daily at 2:30 AM Pakistan time.");

  return task;
};
