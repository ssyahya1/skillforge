import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/progress/progressRepository.js", () => ({
  getEnrollmentProgress: vi.fn(),
  getEnrollmentLessonProgress: vi.fn(),
  getLessonExerciseProgress: vi.fn(),
  getLessonProgress: vi.fn(),
  getEnrolledPublishedLesson: vi.fn(),
  getEnrolledPublishedExercise: vi.fn(),
  getPreviousPublishedLesson: vi.fn(),
  getExerciseProgress: vi.fn(),
  getActiveEnrollmentForExercise: vi.fn(),
  startLesson: vi.fn(),
  completeLessonContent: vi.fn(),
  evaluateLessonAndCourseCompletion: vi.fn(),
  lockEnrollment: vi.fn(),
}));

import * as progressRepository from "../../src/modules/progress/progressRepository.js";
import * as progressService from "../../src/modules/progress/progressService.js";

describe("progressService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    progressRepository.lockEnrollment.mockResolvedValue({
      rows: [{ id: "enrollment-1", status: "active" }],
    });
    progressRepository.getPreviousPublishedLesson.mockResolvedValue({
      rows: [],
    });
    progressRepository.evaluateLessonAndCourseCompletion.mockResolvedValue({
      lessonCompleted: false,
      enrollmentCompleted: false,
    });
  });

  it("calculates a zero percentage when there are no published lessons", async () => {
    progressRepository.getEnrollmentProgress.mockResolvedValue({
      rows: [
        {
          enrollment_id: "enrollment-1",
          enrollment_status: "active",
          course_id: "course-1",
          course_title: "Course",
          total_lessons: "0",
          completed_lessons: "0",
        },
      ],
    });
    progressRepository.getEnrollmentLessonProgress.mockResolvedValue({
      rows: [],
    });

    const result = await progressService.getEnrollmentProgressService(
      "enrollment-1",
      "user-1",
    );

    expect(result.progress).toEqual({
      totalLessons: 0,
      completedLessons: 0,
      percentage: 0,
    });
  });

  it("caps the progress percentage at 100", async () => {
    progressRepository.getEnrollmentProgress.mockResolvedValue({
      rows: [
        {
          enrollment_id: "enrollment-1",
          enrollment_status: "active",
          course_id: "course-1",
          course_title: "Course",
          total_lessons: "1",
          completed_lessons: "2",
        },
      ],
    });
    progressRepository.getEnrollmentLessonProgress.mockResolvedValue({
      rows: [],
    });

    const result = await progressService.getEnrollmentProgressService(
      "enrollment-1",
      "user-1",
    );

    expect(result.progress.percentage).toBe(100);
  });

  it("does not return another student's enrollment progress", async () => {
    progressRepository.getEnrollmentProgress.mockResolvedValue({ rows: [] });

    await expect(
      progressService.getEnrollmentProgressService("enrollment-1", "user-1"),
    ).rejects.toMatchObject({
      message: "Enrollment not found",
      status: 404,
    });
    expect(progressRepository.getEnrollmentLessonProgress).not.toHaveBeenCalled();
  });

  it("starts the first published lesson for an active enrollment", async () => {
    const client = { query: vi.fn() };
    progressRepository.getEnrolledPublishedLesson.mockResolvedValue({
      rows: [{ id: "lesson-1" }],
    });
    progressRepository.startLesson.mockResolvedValue({
      rows: [{ id: "lesson-progress-1", status: "in_progress" }],
    });

    const result = await progressService.startLessonService(
      client,
      "enrollment-1",
      "lesson-1",
      "user-1",
    );

    expect(result).toEqual({
      id: "lesson-progress-1",
      status: "in_progress",
    });
    expect(progressRepository.lockEnrollment).toHaveBeenCalledWith(
      client,
      "enrollment-1",
      "user-1",
    );
    expect(progressRepository.startLesson).toHaveBeenCalledWith(
      client,
      "enrollment-1",
      "lesson-1",
    );
  });

  it("blocks starting the next lesson until the previous published lesson is complete", async () => {
    const client = { query: vi.fn() };
    progressRepository.getEnrolledPublishedLesson.mockResolvedValue({
      rows: [{ id: "lesson-2" }],
    });
    progressRepository.getPreviousPublishedLesson.mockResolvedValue({
      rows: [{ id: "lesson-1", progress_status: "in_progress" }],
    });

    await expect(
      progressService.startLessonService(
        client,
        "enrollment-1",
        "lesson-2",
        "user-1",
      ),
    ).rejects.toMatchObject({
      message: "Previous lesson must be completed before starting this lesson",
      status: 400,
    });
    expect(progressRepository.startLesson).not.toHaveBeenCalled();
  });

  it("rejects progress mutations when the enrollment is not active", async () => {
    const client = { query: vi.fn() };
    progressRepository.lockEnrollment.mockResolvedValue({ rows: [] });

    await expect(
      progressService.startLessonService(
        client,
        "enrollment-1",
        "lesson-1",
        "user-1",
      ),
    ).rejects.toMatchObject({
      message: "Enrollment not found",
      status: 404,
    });
    expect(progressRepository.startLesson).not.toHaveBeenCalled();
  });

  it("checks sequential unlocking before recording lesson content completion", async () => {
    const client = { query: vi.fn() };
    progressRepository.getEnrolledPublishedLesson.mockResolvedValue({
      rows: [{ id: "lesson-2", course_id: "course-1" }],
    });
    progressRepository.getPreviousPublishedLesson.mockResolvedValue({
      rows: [{ id: "lesson-1", progress_status: "in_progress" }],
    });

    await expect(
      progressService.completeLessonContentService(
        client,
        "enrollment-1",
        "lesson-2",
        "user-1",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(progressRepository.completeLessonContent).not.toHaveBeenCalled();
    expect(
      progressRepository.evaluateLessonAndCourseCompletion,
    ).not.toHaveBeenCalled();
  });

  it("evaluates automatic lesson and course completion after content completion", async () => {
    const client = { query: vi.fn() };
    progressRepository.getEnrolledPublishedLesson.mockResolvedValue({
      rows: [{ id: "lesson-1", course_id: "course-1" }],
    });
    progressRepository.completeLessonContent.mockResolvedValue({
      rows: [{ content_completed_at: "2026-11-09" }],
    });

    const result = await progressService.completeLessonContentService(
      client,
      "enrollment-1",
      "lesson-1",
      "user-1",
    );

    expect(result).toEqual({ content_completed_at: "2026-11-09" });
    expect(
      progressRepository.evaluateLessonAndCourseCompletion,
    ).toHaveBeenCalledWith(client, "enrollment-1", "lesson-1", "course-1");
  });

  it("does not expose services for student-supplied exercise or course completion", () => {
    expect(progressService.upsertExerciseProgressService).toBeUndefined();
    expect(progressService.recordProgressAttemptService).toBeUndefined();
    expect(progressService.completeLessonService).toBeUndefined();
    expect(progressService.completeEnrollmentService).toBeUndefined();
  });
});
