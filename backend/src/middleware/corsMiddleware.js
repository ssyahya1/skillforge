import cors from "cors";

export const createCorsMiddleware = (allowedOrigins) =>
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  });
