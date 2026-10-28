
import cron from "node-cron";
import { purgeExpiredCoursesService } from "../modules/courses/courseService.js";

let isRunning = false;

export const startCoursePurgeJob = () => {
  cron.schedule(
    "0 2 * * *",
    async () => {
      if (isRunning) {
        console.warn("[Course Purge] Previous job is still running. Skipping.");
        return;
      }

      isRunning = true;

      try {
        const result = await purgeExpiredCoursesService(100);

        console.info(
          `[Course Purge] Job completed. Purged ${result.purgedCount} course(s).`
        );
      } catch (error) {
        console.error("[Course Purge] Job failed:", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Karachi",
    }
  );

  console.info("[Course Purge] Scheduled daily at 2:00 AM Pakistan time.");
};
