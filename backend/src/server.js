import "dotenv/config";
import app from "./app.js";
import { startCoursePurgeJob } from "./jobs/coursePurgeJob.js";
import { startLessonPurgeJob } from "./jobs/lessonPurgeJob.js";
import {
  createExecutionWorker,
  closeExecutionWorker,
} from "./modules/execution/executionWorker.js";
import { closeExecutionQueue } from "./modules/execution/executionQueue.js";
import { rateLimitRedis } from "./middleware/rateLimiter.js";
import { pool } from "./database/pool.js";
import {
  createGracefulShutdown,
  registerShutdownSignals,
} from "./serverShutdown.js";

const port = Number(process.env.PORT) || 5000;
let coursePurgeTask;
let lessonPurgeTask;
let executionWorker;

const server = app.listen(port, () => {
  console.log(`SkillForge API running on port ${port}`);

  coursePurgeTask = startCoursePurgeJob();
  lessonPurgeTask = startLessonPurgeJob();

  if (process.env.RUN_WORKER !== "false") {
    try {
      executionWorker = createExecutionWorker();
      app.locals.executionWorkerReady = true;
      console.log(
        "[Execution Worker] Worker started listening to skillforge-execution queue",
      );
    } catch (error) {
      app.locals.executionWorkerReady = false;
      console.error(
        "[Execution Worker] Failed to start execution worker:",
        error.message,
      );
    }
  }
});

const shutdown = createGracefulShutdown({
  server,
  getScheduledTasks: () => [coursePurgeTask, lessonPurgeTask],
  getWorker: () => executionWorker,
  closeWorker: closeExecutionWorker,
  closeQueue: closeExecutionQueue,
  closeRateLimitRedis: () => rateLimitRedis.disconnect(),
  closePool: () => pool.end(),
});

registerShutdownSignals(shutdown);
