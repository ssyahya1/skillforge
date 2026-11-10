import "dotenv/config";
import {
  createExecutionWorker,
  closeExecutionWorker,
} from "./executionWorker.js";
import { closeExecutionQueue } from "./executionQueue.js";
import { pool } from "../../database/pool.js";
import { createWorkerRunnerShutdown } from "./workerRunnerShutdown.js";

console.log("[Execution Worker] Starting SkillForge Execution Worker...");

const worker = createExecutionWorker();

console.log(
  "[Execution Worker] Listening for jobs on queue 'skillforge-execution'",
);

const shutdown = createWorkerRunnerShutdown({
  worker,
  closeWorker: closeExecutionWorker,
  closeQueue: closeExecutionQueue,
  closePool: () => pool.end(),
  exit: (code) => process.exit(code),
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
