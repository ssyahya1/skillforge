import "dotenv/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6380";

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const executionQueue = new Queue("skillforge-execution", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400,
      count: 1000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

export const addExecutionJob = async ({ submissionId }) => {
  return executionQueue.add(
    "execute-submission",
    { submissionId },
    {
      jobId: `submission-${submissionId}`,
    },
  );
};

export const closeExecutionQueue = async () => {
  await executionQueue.close();
  await redisConnection.quit();
};
