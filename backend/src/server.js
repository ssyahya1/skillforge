import "dotenv/config";
import app from "./app.js";
import { startCoursePurgeJob } from "./jobs/coursePurgeJob.js";
import { startLessonPurgeJob } from "./jobs/lessonPurgeJob.js";
import {
  createExecutionWorker,
  closeExecutionWorker,
} from "./modules/execution/executionWorker.js";

const port = Number(process.env.PORT) || 5000;
let lessonPurgeTask;
let executionWorker;

const server = app.listen(port, () => {
  console.log(`SkillForge API running on port ${port}`);

  startCoursePurgeJob();
  lessonPurgeTask = startLessonPurgeJob();

  if (process.env.RUN_WORKER !== "false") {
    try {
      executionWorker = createExecutionWorker();
      console.log(
        "[Execution Worker] Worker started listening to skillforge-execution queue",
      );
    } catch (error) {
      console.error(
        "[Execution Worker] Failed to start execution worker:",
        error.message,
      );
    }
  }
});

server.on("close", () => {
  if (lessonPurgeTask) {
    Promise.resolve(lessonPurgeTask.destroy()).catch((error) => {
      console.error("[Lesson Purge] Failed to stop scheduled job:", error);
    });
  }

  if (executionWorker) {
    closeExecutionWorker(executionWorker).catch((error) => {
      console.error(
        "[Execution Worker] Failed to close execution worker:",
        error.message,
      );
    });
  }
});
