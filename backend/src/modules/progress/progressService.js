import * as progressRepository from "./progressRepository.js";

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureEnrollmentAccess(enrollmentId, userId) {
  const enrollmentResult = await progressRepository.getEnrollmentProgress(
    enrollmentId,
    userId,
  );

  if (enrollmentResult.rows.length === 0) {
    throw createError("Enrollment not found", 404);
  }

  return enrollmentResult.rows[0];
}

async function ensureActiveEnrollmentLocked(client, enrollmentId, userId) {
  const lockedResult = await progressRepository.lockEnrollment(
    client,
    enrollmentId,
    userId,
  );

  if (lockedResult.rows.length === 0) {
    throw createError("Enrollment not found", 404);
  }

  const enrollment = lockedResult.rows[0];
  if (enrollment.status !== "active") {
    throw createError("Enrollment is not active", 400);
  }

  return enrollment;
}

async function ensureLessonAccess(enrollmentId, lessonId, userId) {
  const lessonResult = await progressRepository.getEnrolledPublishedLesson(
    enrollmentId,
    lessonId,
    userId,
  );

  if (lessonResult.rows.length === 0) {
    throw createError("Lesson not found", 404);
  }

  return lessonResult.rows[0];
}

async function ensureExerciseAccess(enrollmentId, exerciseId, userId) {
  const exerciseResult = await progressRepository.getEnrolledPublishedExercise(
    enrollmentId,
    exerciseId,
    userId,
  );

  if (exerciseResult.rows.length === 0) {
    throw createError("Exercise not found", 404);
  }

  return exerciseResult.rows[0];
}

async function ensurePreviousLessonComplete(enrollmentId, lessonId) {
  const previousLessonResult =
    await progressRepository.getPreviousPublishedLesson(enrollmentId, lessonId);

  if (
    previousLessonResult.rows.length > 0 &&
    previousLessonResult.rows[0].progress_status !== "completed"
  ) {
    throw createError(
      "Previous lesson must be completed before starting this lesson",
      400,
    );
  }
}

export async function getEnrollmentProgressService(enrollmentId, userId) {
  const enrollment = await ensureEnrollmentAccess(enrollmentId, userId);

  const lessonsResult =
    await progressRepository.getEnrollmentLessonProgress(enrollmentId);

  const totalLessons = Number(enrollment.total_lessons);
  const completedLessons = Number(enrollment.completed_lessons);

  return {
    enrollmentId: enrollment.enrollment_id,
    enrollmentStatus: enrollment.enrollment_status,
    course: {
      id: enrollment.course_id,
      title: enrollment.course_title,
    },
    progress: {
      totalLessons,
      completedLessons,
      percentage:
        totalLessons > 0
          ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
          : 0,
    },
    lessons: lessonsResult.rows,
  };
}

export async function getLessonProgressService(enrollmentId, lessonId, userId) {
  await ensureLessonAccess(enrollmentId, lessonId, userId);

  const lessonProgress = await progressRepository.getLessonProgress(
    enrollmentId,
    lessonId,
  );

  return lessonProgress.rows[0] ?? null;
}

export async function getLessonExerciseProgressService(
  enrollmentId,
  lessonId,
  userId,
) {
  await ensureLessonAccess(enrollmentId, lessonId, userId);

  const exercises = await progressRepository.getLessonExerciseProgress(
    enrollmentId,
    lessonId,
  );

  return exercises.rows;
}

export async function getExerciseProgressService(
  enrollmentId,
  exerciseId,
  userId,
) {
  await ensureExerciseAccess(enrollmentId, exerciseId, userId);

  const exerciseProgress = await progressRepository.getExerciseProgress(
    enrollmentId,
    exerciseId,
  );

  return exerciseProgress.rows[0] ?? null;
}

export async function startLessonService(
  client,
  enrollmentId,
  lessonId,
  userId,
) {
  await ensureActiveEnrollmentLocked(client, enrollmentId, userId);
  await ensureLessonAccess(enrollmentId, lessonId, userId);
  await ensurePreviousLessonComplete(enrollmentId, lessonId);

  const result = await progressRepository.startLesson(
    client,
    enrollmentId,
    lessonId,
  );

  return result.rows[0] ?? null;
}

export async function completeLessonContentService(
  client,
  enrollmentId,
  lessonId,
  userId,
) {
  await ensureActiveEnrollmentLocked(client, enrollmentId, userId);
  const lesson = await ensureLessonAccess(enrollmentId, lessonId, userId);
  await ensurePreviousLessonComplete(enrollmentId, lessonId);

  const result = await progressRepository.completeLessonContent(
    client,
    enrollmentId,
    lessonId,
  );

  await progressRepository.evaluateLessonAndCourseCompletion(
    client,
    enrollmentId,
    lessonId,
    lesson.course_id,
  );

  return result.rows[0] ?? null;
}

export async function getPreviousPublishedLessonService(
  enrollmentId,
  lessonId,
  userId,
) {
  await ensureLessonAccess(enrollmentId, lessonId, userId);

  const result = await progressRepository.getPreviousPublishedLesson(
    enrollmentId,
    lessonId,
  );

  return result.rows[0] ?? null;
}

export async function getActiveEnrollmentForExerciseService(userId, exerciseId) {
  const result = await progressRepository.getActiveEnrollmentForExercise(
    userId,
    exerciseId,
  );

  if (result.rows.length === 0) {
    throw createError("Enrollment not found", 404);
  }

  return result.rows[0];
}
