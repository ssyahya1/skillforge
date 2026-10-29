
import "dotenv/config";
import app from "./app.js";
import { startCoursePurgeJob } from "./jobs/coursePurgeJob.js";
import { startLessonPurgeJob } from "./jobs/lessonPurgeJob.js";

const port = Number(process.env.PORT) || 5000;
let lessonPurgeTask;

const server = app.listen(port, () => {
  console.log(`SkillForge API running on port ${port}`);

  startCoursePurgeJob();
  lessonPurgeTask = startLessonPurgeJob();
});

server.on("close", () => {
  if (lessonPurgeTask) {
    Promise.resolve(lessonPurgeTask.destroy()).catch((error) => {
      console.error("[Lesson Purge] Failed to stop scheduled job:", error);
    });
  }
});
