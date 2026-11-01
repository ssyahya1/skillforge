import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/authRoutes.js";
import adminRoutes from "./modules/admin/adminRoutes.js";
import courseRoutes from "./modules/courses/courseRoutes.js";
import lessonRoutes from "./modules/lessons/lessonRoutes.js";
import exerciseRoutes from "./modules/exercises/exerciseRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/debug/cookies", (req, res) => {
  const cookies = res.getHeader("Set-Cookie");

  res.json({
    cookieHeadersPrepared: Array.isArray(cookies)
      ? cookies.length
      : cookies
        ? 1
        : 0,
    message: "This endpoint checks prepared response cookies only.",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/courses", courseRoutes);
app.use("/api/admin/courses", lessonRoutes);
app.use("/api/admin/lessons", exerciseRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  const errorStatus = err.status ?? err.statusCode;

  const status =
    Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus < 500
      ? errorStatus
      : 500;

  if (
    err.code === "23514" &&
    err.constraint === "lessons_published_content_nonempty_check"
  ) {
    return res.status(400).json({
      error: "REQUEST_ERROR",
      message: "Lesson content cannot be empty.",
    });
  }

  if (err.code === "23505") {
    const conflictMessages = {
      courses_slug_key: "A course with this slug already exists.",

      lessons_course_slug_unique:
        "A lesson with this slug already exists in this course.",

      lessons_course_position_unique:
        "Another lesson already uses this position in this course.",

      exercise_languages_exercise_language_unique:
        "This language is already configured for this exercise.",
    };

    const message = conflictMessages[err.constraint];

    if (message) {
      return res.status(409).json({
        error: "CONFLICT",
        message,
      });
    }
  }

  if (status === 500) {
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    });
  }

  return res.status(status).json({
    error: "REQUEST_ERROR",
    message: err.message || "The request could not be completed.",
  });
});

export default app;
