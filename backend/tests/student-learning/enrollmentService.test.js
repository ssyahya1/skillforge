import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/modules/student-learning/enrollmentRepository.js", () => ({
  createEnrollment: vi.fn(),
  getEnrollmentByCourseIdAndUser: vi.fn(),
  reactivateEnrollment: vi.fn(),
  updateEnrollmentActivity: vi.fn(),

  getEnrollmentsByUserId: vi.fn(),
  getEnrollmentWithCourseDetails: vi.fn(),
  updateEnrollmentStatus: vi.fn(),
  getPublishedLessonsByCourse: vi.fn(),
}));

vi.mock("../../src/modules/student-learning/studentLearningService.js", () => ({
  getCourseByIdService: vi.fn(),
}));

import * as enrollmentRepository from "../../src/modules/student-learning/enrollmentRepository.js";
import { getCourseByIdService } from "../../src/modules/student-learning/studentLearningService.js";

import {
  createEnrollmentService,
  getEnrollmentService,
  getStudentEnrollmentsService,
  cancelEnrollmentService,
  completeEnrollmentService,
  updateEnrollmentActivityService,
  getEnrollmentByCourseService,
} from "../../src/modules/student-learning/enrollmentService.js";

const userId = "user-123";
const courseId = "course-123";
const enrollmentId = "enrollment-123";

const activeEnrollment = {
  id: enrollmentId,
  user_id: userId,
  course_id: courseId,
  status: "active",
};

const cancelledEnrollment = {
  ...activeEnrollment,
  status: "cancelled",
};

const completedEnrollment = {
  ...activeEnrollment,
  status: "completed",
};

const courseDetails = {
  ...activeEnrollment,
  title: "JavaScript Fundamentals",
  description: "Learn JavaScript",
  language: "javascript",
  difficulty: "beginner",
  access_tier: "free",
};

const queryResult = (rows) => ({
  rows,
  rowCount: rows.length,
});

const makeError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createEnrollmentService", () => {
  it("should create a new enrollment", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([]),
    );
    enrollmentRepository.createEnrollment.mockResolvedValue(
      queryResult([activeEnrollment]),
    );

    const result = await createEnrollmentService(userId, courseId);

    expect(getCourseByIdService).toHaveBeenCalledWith(courseId);
    expect(
      enrollmentRepository.getEnrollmentByCourseIdAndUser,
    ).toHaveBeenCalledWith(courseId, userId);
    expect(enrollmentRepository.createEnrollment).toHaveBeenCalledWith(
      userId,
      courseId,
    );
    expect(result).toEqual(activeEnrollment);
  });

  it("should return an existing active enrollment", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([activeEnrollment]),
    );

    const result = await createEnrollmentService(userId, courseId);

    expect(result).toEqual(activeEnrollment);
    expect(enrollmentRepository.createEnrollment).not.toHaveBeenCalled();
    expect(enrollmentRepository.reactivateEnrollment).not.toHaveBeenCalled();
  });

  it("should reactivate a cancelled enrollment", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([cancelledEnrollment]),
    );
    enrollmentRepository.reactivateEnrollment.mockResolvedValue(
      queryResult([activeEnrollment]),
    );

    const result = await createEnrollmentService(userId, courseId);

    expect(enrollmentRepository.reactivateEnrollment).toHaveBeenCalledWith(
      enrollmentId,
      userId,
    );
    expect(result).toEqual(activeEnrollment);
  });

  it("should reject an already completed enrollment", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([completedEnrollment]),
    );

    await expect(
      createEnrollmentService(userId, courseId),
    ).rejects.toMatchObject({ status: 409 });

    expect(enrollmentRepository.createEnrollment).not.toHaveBeenCalled();
  });

  it("should propagate course validation errors", async () => {
    getCourseByIdService.mockRejectedValue(makeError("Course not found", 404));

    await expect(
      createEnrollmentService(userId, courseId),
    ).rejects.toMatchObject({ status: 404 });

    expect(
      enrollmentRepository.getEnrollmentByCourseIdAndUser,
    ).not.toHaveBeenCalled();
  });

  it("should propagate non-unique database errors", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([]),
    );

    const databaseError = new Error("Database unavailable");
    databaseError.code = "08006";

    enrollmentRepository.createEnrollment.mockRejectedValue(databaseError);

    await expect(createEnrollmentService(userId, courseId)).rejects.toBe(
      databaseError,
    );
  });

  it("should retrieve the existing enrollment after a unique conflict", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([activeEnrollment]));

    const conflictError = new Error("Duplicate enrollment");
    conflictError.code = "23505";

    enrollmentRepository.createEnrollment.mockRejectedValue(conflictError);

    const result = await createEnrollmentService(userId, courseId);

    expect(
      enrollmentRepository.getEnrollmentByCourseIdAndUser,
    ).toHaveBeenCalledTimes(2);
    expect(result).toEqual(activeEnrollment);
  });

  it("should reactivate a cancelled enrollment after a unique conflict", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([cancelledEnrollment]));

    const conflictError = new Error("Duplicate enrollment");
    conflictError.code = "23505";

    enrollmentRepository.createEnrollment.mockRejectedValue(conflictError);

    enrollmentRepository.reactivateEnrollment.mockResolvedValue(
      queryResult([activeEnrollment]),
    );

    const result = await createEnrollmentService(userId, courseId);

    expect(enrollmentRepository.reactivateEnrollment).toHaveBeenCalledWith(
      enrollmentId,
      userId,
    );
    expect(result).toEqual(activeEnrollment);
  });

  it("should reject a completed enrollment after a unique conflict", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([completedEnrollment]));

    const conflictError = new Error("Duplicate enrollment");
    conflictError.code = "23505";

    enrollmentRepository.createEnrollment.mockRejectedValue(conflictError);

    await expect(
      createEnrollmentService(userId, courseId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("should rethrow the original error if no enrollment is found after a unique conflict", async () => {
    getCourseByIdService.mockResolvedValue({});
    enrollmentRepository.getEnrollmentByCourseIdAndUser
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]));

    const conflictError = new Error("Duplicate enrollment");
    conflictError.code = "23505";

    enrollmentRepository.createEnrollment.mockRejectedValue(conflictError);

    await expect(createEnrollmentService(userId, courseId)).rejects.toBe(
      conflictError,
    );
  });
});

describe("getEnrollmentService", () => {
  it("should return enrollment with course details", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([courseDetails]),
    );

    const result = await getEnrollmentService(enrollmentId, userId);

    expect(
      enrollmentRepository.getEnrollmentWithCourseDetails,
    ).toHaveBeenCalledWith(enrollmentId, userId);
    expect(result).toEqual(courseDetails);
  });

  it("should throw 404 if enrollment does not exist", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([]),
    );

    await expect(
      getEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("should propagate repository errors", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(getEnrollmentService(enrollmentId, userId)).rejects.toThrow(
      "Database error",
    );
  });
});

describe("getStudentEnrollmentsService", () => {
  it("should return all student enrollments", async () => {
    enrollmentRepository.getEnrollmentsByUserId.mockResolvedValue(
      queryResult([activeEnrollment, completedEnrollment]),
    );

    const result = await getStudentEnrollmentsService(userId);

    expect(enrollmentRepository.getEnrollmentsByUserId).toHaveBeenCalledWith(
      userId,
    );
    expect(result).toEqual([activeEnrollment, completedEnrollment]);
  });

  it("should return an empty array when the student has no enrollments", async () => {
    enrollmentRepository.getEnrollmentsByUserId.mockResolvedValue(
      queryResult([]),
    );

    const result = await getStudentEnrollmentsService(userId);

    expect(result).toEqual([]);
  });

  it("should propagate repository errors", async () => {
    enrollmentRepository.getEnrollmentsByUserId.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(getStudentEnrollmentsService(userId)).rejects.toThrow(
      "Database error",
    );
  });
});

describe("cancelEnrollmentService", () => {
  it("should cancel an active enrollment", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([courseDetails]),
    );
    enrollmentRepository.updateEnrollmentStatus.mockResolvedValue(
      queryResult([{ ...activeEnrollment, status: "cancelled" }]),
    );

    const result = await cancelEnrollmentService(enrollmentId, userId);

    expect(
      enrollmentRepository.getEnrollmentWithCourseDetails,
    ).toHaveBeenCalledWith(enrollmentId, userId);
    expect(enrollmentRepository.updateEnrollmentStatus).toHaveBeenCalledWith(
      enrollmentId,
      userId,
      "cancelled",
      "active",
    );
    expect(result.status).toBe("cancelled");
  });

  it("does not cancel an enrollment completed concurrently by progress finalization", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails
      .mockResolvedValueOnce(queryResult([courseDetails]))
      .mockResolvedValueOnce(queryResult([completedEnrollment]));
    enrollmentRepository.updateEnrollmentStatus.mockResolvedValue(
      queryResult([]),
    );

    await expect(
      cancelEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({
      message: "Completed enrollment cannot be cancelled.",
      status: 409,
    });

    expect(enrollmentRepository.updateEnrollmentStatus).toHaveBeenCalledWith(
      enrollmentId,
      userId,
      "cancelled",
      "active",
    );
  });

  it("should throw 404 if enrollment does not exist", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([]),
    );

    await expect(
      cancelEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 404 });

    expect(enrollmentRepository.updateEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("should reject cancellation of completed enrollment", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([completedEnrollment]),
    );

    await expect(
      cancelEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 409 });

    expect(enrollmentRepository.updateEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("should reject cancellation of an already cancelled enrollment", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([cancelledEnrollment]),
    );

    await expect(
      cancelEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 409 });

    expect(enrollmentRepository.updateEnrollmentStatus).not.toHaveBeenCalled();
  });
});

describe("completeEnrollmentService", () => {
  it("should return an already completed enrollment", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([completedEnrollment]),
    );

    const result = await completeEnrollmentService(enrollmentId, userId);

    expect(result).toEqual(completedEnrollment);
    expect(enrollmentRepository.updateEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("should throw 404 if enrollment does not exist", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([]),
    );

    await expect(
      completeEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("should reject completion of a cancelled enrollment", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([cancelledEnrollment]),
    );

    await expect(
      completeEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 409 });

    expect(enrollmentRepository.updateEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("should defer completion until student progress is verified", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([courseDetails]),
    );

    await expect(
      completeEnrollmentService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 409 });

    expect(enrollmentRepository.updateEnrollmentStatus).not.toHaveBeenCalled();
  });
});

describe("updateEnrollmentActivityService", () => {
  it("should update activity for an active enrollment", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([courseDetails]),
    );
    enrollmentRepository.updateEnrollmentActivity.mockResolvedValue(
      queryResult([
        {
          ...activeEnrollment,
          last_accessed_at: "2026-11-09T00:00:00.000Z",
        },
      ]),
    );

    const result = await updateEnrollmentActivityService(enrollmentId, userId);

    expect(enrollmentRepository.updateEnrollmentActivity).toHaveBeenCalledWith(
      enrollmentId,
      userId,
    );
    expect(result.last_accessed_at).toBeDefined();
  });

  it("should throw 404 if enrollment does not exist", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([]),
    );

    await expect(
      updateEnrollmentActivityService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 404 });

    expect(
      enrollmentRepository.updateEnrollmentActivity,
    ).not.toHaveBeenCalled();
  });

  it("should reject activity updates for cancelled enrollments", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([cancelledEnrollment]),
    );

    await expect(
      updateEnrollmentActivityService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 409 });

    expect(
      enrollmentRepository.updateEnrollmentActivity,
    ).not.toHaveBeenCalled();
  });

  it("should reject activity updates for completed enrollments", async () => {
    enrollmentRepository.getEnrollmentWithCourseDetails.mockResolvedValue(
      queryResult([completedEnrollment]),
    );

    await expect(
      updateEnrollmentActivityService(enrollmentId, userId),
    ).rejects.toMatchObject({ status: 409 });

    expect(
      enrollmentRepository.updateEnrollmentActivity,
    ).not.toHaveBeenCalled();
  });
});

describe("getEnrollmentByCourseService", () => {
  it("should return enrollment for the specified course and student", async () => {
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([activeEnrollment]),
    );

    const result = await getEnrollmentByCourseService(courseId, userId);

    expect(
      enrollmentRepository.getEnrollmentByCourseIdAndUser,
    ).toHaveBeenCalledWith(courseId, userId);
    expect(result).toEqual(activeEnrollment);
  });

  it("should throw 404 if enrollment does not exist", async () => {
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockResolvedValue(
      queryResult([]),
    );

    await expect(
      getEnrollmentByCourseService(courseId, userId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("should propagate repository errors", async () => {
    enrollmentRepository.getEnrollmentByCourseIdAndUser.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(
      getEnrollmentByCourseService(courseId, userId),
    ).rejects.toThrow("Database error");
  });
});
