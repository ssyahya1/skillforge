import "dotenv/config";
import {
  createExecutionWorker,
  closeExecutionWorker,
} from "./executionWorker.js";
import { closeExecutionQueue } from "./executionQueue.js";

console.log("[Execution Worker] Starting SkillForge Execution Worker...");

const worker = createExecutionWorker();

console.log(
  "[Execution Worker] Listening for jobs on queue 'skillforge-execution'",
);

const shutdown = async (signal) => {
  console.log(
    `[Execution Worker] Received ${signal}. Shutting down gracefully...`,
  );
  try {
    await closeExecutionWorker(worker);
    await closeExecutionQueue();
    console.log("[Execution Worker] Shutdown complete.");
    process.exit(0);
  } catch (error) {
    console.error("[Execution Worker] Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
