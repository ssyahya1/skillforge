import "dotenv/config";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6380";

export const rateLimitRedis = new IORedis(redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
});

rateLimitRedis.on("error", (error) => {
  console.error("[Rate Limiter Redis]", error.message);
});

const createRedisStore = (prefix) =>
  new RedisStore({
    prefix,
    sendCommand: async (command, ...args) => {
      if (rateLimitRedis.status === "wait") {
        await rateLimitRedis.connect();
      }

      return rateLimitRedis.call(command, ...args);
    },
  });

export const createRateLimiter = ({
  limit,
  prefix,
  message,
  store,
  skip,
}) => {
  const options = {
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip,
    handler: (req, res) => {
      res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message,
      });
    },
  };

  if (store) {
    options.store = store;
  } else if (process.env.NODE_ENV !== "test") {
    options.store = createRedisStore(prefix);
  }

  return rateLimit(options);
};
export const globalRateLimiter = createRateLimiter({
  limit: 300,
  prefix: "skillforge:rl:global:",
  message: "Too many requests. Please try again later.",
  skip: () => process.env.NODE_ENV === "test",
});

export const authRateLimiter = createRateLimiter({
  limit: 10,
  prefix: "skillforge:rl:auth:",
  message: "Too many authentication attempts. Please try again later.",
  skip: () => process.env.NODE_ENV === "test",
});
