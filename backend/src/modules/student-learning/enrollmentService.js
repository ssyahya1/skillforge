import * as enrollmentRepository from "./enrollmentRepository.js";
import { getCourseByIdService } from "./studentLearningService.js";

export async function createEnrollmentService(userId, courseId) {
  await getCourseByIdService(courseId);

  const existingEnrollment =
    await enrollmentRepository.getEnrollmentByCourseIdAndUser(courseId, userId);

  if (existingEnrollment.rows.length > 0) {
    const enrollment = existingEnrollment.rows[0];

    if (enrollment.status === "active") {
      return enrollment;
    }

    if (enrollment.status === "cancelled") {
      const result = await enrollmentRepository.reactivateEnrollment(
        enrollment.id,
      );

      return result.rows[0];
    }

    if (enrollment.status === "completed") {
      const error = new Error("You have already completed this course");
      error.status = 409;
      throw error;
    }
  }

  try {
    const newEnrollment = await enrollmentRepository.createEnrollment(
      userId,
      courseId,
    );

    return newEnrollment.rows[0];
  } catch (error) {
    if (error.code !== "23505") {
      throw error;
    }

    const retry = await enrollmentRepository.getEnrollmentByCourseIdAndUser(
      courseId,
      userId,
    );

    if (retry.rows.length === 0) {
      throw error;
    }

    const enrollment = retry.rows[0];

    if (enrollment.status === "active") {
      return enrollment;
    }

    if (enrollment.status === "cancelled") {
      const result = await enrollmentRepository.reactivateEnrollment(
        enrollment.id,
      );

      return result.rows[0];
    }

    const conflict = new Error("You have already completed this course");
    conflict.status = 409;
    throw conflict;
  }
}
export async function getEnrollmentService(enrollmentId, userId) {
  const enrollment = await enrollmentRepository.getEnrollmentWithCourseDetails(
    enrollmentId,
    userId,
  );
  if (enrollment.rows.length === 0) {
    const error = new Error("Enrollment not found");
    error.status = 404;
    throw error;
  }
  return enrollment.rows[0];
}
export async function getStudentEnrollmentsService(userId) {
  const enrollments = await enrollmentRepository.getEnrollmentsByUserId(userId);
  return enrollments.rows;
}

export async function cancelEnrollmentService(enrollmentId, userId) {
  const result = await enrollmentRepository.getEnrollmentWithCourseDetails(
    enrollmentId,
    userId,
  );

  if (!result.rows[0]) {
    const error = new Error("Enrollment not found");
    error.status = 404;
    throw error;
  }

  const enrollment = result.rows[0];

  if (enrollment.status === "completed") {
    const error = new Error("Completed enrollment cannot be cancelled.");
    error.status = 409;
    throw error;
  }

  if (enrollment.status === "cancelled") {
    const error = new Error("Enrollment is already cancelled.");
    error.status = 409;
    throw error;
  }

  const updatedEnrollment = await enrollmentRepository.updateEnrollmentStatus(
    enrollmentId,
    "cancelled",
  );

  return updatedEnrollment.rows[0];
}
export async function completeEnrollmentService(enrollmentId, userId) {
  const result = await enrollmentRepository.getEnrollmentWithCourseDetails(
    enrollmentId,
    userId,
  );

  if (!result.rows[0]) {
    const error = new Error("Enrollment not found");
    error.status = 404;
    throw error;
  }

  const enrollment = result.rows[0];

  if (enrollment.status === "completed") {
    return enrollment;
  }

  if (enrollment.status !== "active") {
    const error = new Error("Only active enrollments can be completed.");
    error.status = 409;
    throw error;
  }

  const error = new Error(
    "Course completion must be verified through student progress.",
  );
  error.status = 409;
  throw error;
}
export async function updateEnrollmentActivityService(enrollmentId, userId) {
  const result = await enrollmentRepository.getEnrollmentWithCourseDetails(
    enrollmentId,
    userId,
  );

  if (!result.rows[0]) {
    const error = new Error("Enrollment not found");
    error.status = 404;
    throw error;
  }

  const enrollment = result.rows[0];

  if (enrollment.status !== "active") {
    const error = new Error("Only active enrollments can be updated.");
    error.status = 409;
    throw error;
  }

  const updatedEnrollment =
    await enrollmentRepository.updateEnrollmentActivity(enrollmentId);

  return updatedEnrollment.rows[0];
}
export async function getEnrollmentByCourseService(courseId, userId) {
  const enrollment = await enrollmentRepository.getEnrollmentByCourseIdAndUser(
    courseId,
    userId,
  );
  if (enrollment.rows.length === 0) {
    const error = new Error("Enrollment not found");
    error.status = 404;
    throw error;
  }
  return enrollment.rows[0];
}
