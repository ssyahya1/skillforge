import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/database/pool.js", () => ({
    pool: {
        query: vi.fn(),
    },
}));

import { pool } from "../../src/database/pool.js";

import {
    getEnrollmentProgress,
    getEnrollmentLessonProgress,
    getLessonExerciseProgress,
    getLessonProgress,
    startLesson,
    completeLessonContent,
    completeLesson,
    completeEnrollment,
    lockEnrollment,
    getEnrolledPublishedLesson,
    getEnrolledPublishedExercise,
    getPreviousPublishedLesson,
    getExerciseProgress,
    getActiveEnrollmentForExercise,
    evaluateLessonAndCourseCompletion,
} from "../../src/modules/progress/progressRepository.js";

describe("progressRepository", () => {
    let client;

    beforeEach(() => {
        vi.clearAllMocks();

        client = {
            query: vi.fn(),
        };
    });

    describe("read operations", () => {
        it("gets enrollment progress for the specified user", async () => {
            pool.query.mockResolvedValue({
                rows: [{ enrollment_id: "enrollment-1" }],
            });

            const result = await getEnrollmentProgress(
                "enrollment-1",
                "user-1"
            );

            expect(result.rows).toHaveLength(1);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("course_enrollments"),
                ["enrollment-1", "user-1"]
            );
            const query = pool.query.mock.calls[0][0];
            expect(query.match(/l\.status = 'published'/g)).toHaveLength(2);
            expect(query.match(/l\.deleted_at IS NULL/g)).toHaveLength(2);
        });

        it("gets published lesson progress for an enrollment", async () => {
            pool.query.mockResolvedValue({ rows: [] });

            await getEnrollmentLessonProgress("enrollment-1");

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("lesson_progress"),
                ["enrollment-1"]
            );
        });

        it("gets exercise progress for a lesson", async () => {
            pool.query.mockResolvedValue({ rows: [] });

            await getLessonExerciseProgress(
                "enrollment-1",
                "lesson-1"
            );

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("exercise_progress"),
                ["enrollment-1", "lesson-1"]
            );
        });

        it("gets a specific lesson progress record", async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: "progress-1" }],
            });

            const result = await getLessonProgress(
                "enrollment-1",
                "lesson-1"
            );

            expect(result.rows[0].id).toBe("progress-1");
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("lesson_progress"),
                ["enrollment-1", "lesson-1"]
            );
        });

        it("gets an enrolled published lesson", async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: "lesson-1" }],
            });

            const result = await getEnrolledPublishedLesson(
                "enrollment-1",
                "lesson-1",
                "user-1"
            );

            expect(result.rows[0].id).toBe("lesson-1");
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("course_enrollments"),
                ["enrollment-1", "lesson-1", "user-1"]
            );
        });

        it("gets an enrolled published exercise", async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: "exercise-1" }],
            });

            const result = await getEnrolledPublishedExercise(
                "enrollment-1",
                "exercise-1",
                "user-1"
            );

            expect(result.rows[0].id).toBe("exercise-1");
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("course_enrollments"),
                ["enrollment-1", "exercise-1", "user-1"]
            );
        });

        it("gets the previous published lesson", async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: "previous-lesson" }],
            });

            const result = await getPreviousPublishedLesson(
                "enrollment-1",
                "lesson-2"
            );

            expect(result.rows[0].id).toBe("previous-lesson");
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("previous_lesson"),
                ["enrollment-1", "lesson-2"]
            );
        });

        it("gets exercise progress", async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: "exercise-progress-1" }],
            });

            const result = await getExerciseProgress(
                "enrollment-1",
                "exercise-1"
            );

            expect(result.rows[0].id).toBe("exercise-progress-1");
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("exercise_progress"),
                ["enrollment-1", "exercise-1"]
            );
        });

        it("gets the active enrollment for an exercise", async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: "enrollment-1" }],
            });

            const result = await getActiveEnrollmentForExercise(
                "user-1",
                "exercise-1"
            );

            expect(result.rows[0].id).toBe("enrollment-1");
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("course_enrollments"),
                ["user-1", "exercise-1"]
            );
        });
    });

    describe("write operations", () => {
        it("starts a lesson using the supplied transaction client", async () => {
            client.query.mockResolvedValue({
                rows: [{ id: "lesson-progress-1" }],
            });

            const result = await startLesson(
                client,
                "enrollment-1",
                "lesson-1"
            );

            expect(result.rows[0].id).toBe("lesson-progress-1");
            expect(client.query).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO lesson_progress"),
                ["enrollment-1", "lesson-1"]
            );
            expect(pool.query).not.toHaveBeenCalled();
        });

        it("records lesson content completion using the transaction client", async () => {
            client.query.mockResolvedValue({
                rows: [{ content_completed_at: "2026-11-09" }],
            });

            const result = await completeLessonContent(
                client,
                "enrollment-1",
                "lesson-1"
            );

            expect(result.rows[0].content_completed_at).toBeTruthy();
            expect(client.query).toHaveBeenCalledWith(
                expect.stringContaining("content_completed_at"),
                ["enrollment-1", "lesson-1"]
            );
            expect(pool.query).not.toHaveBeenCalled();
        });

        it("completes a lesson when its completion conditions are met", async () => {
            client.query.mockResolvedValue({
                rows: [{ status: "completed" }],
            });

            const result = await completeLesson(
                client,
                "enrollment-1",
                "lesson-1"
            );

            expect(result.rows[0].status).toBe("completed");
            expect(client.query).toHaveBeenCalledWith(
                expect.stringContaining("content_completed_at IS NOT NULL"),
                ["enrollment-1", "lesson-1"]
            );
            expect(client.query.mock.calls[0][0]).toContain(
                "e.status = 'published'"
            );
            expect(client.query.mock.calls[0][0]).toContain(
                "l.deleted_at IS NULL"
            );
        });

        it("completes an enrollment when all published lessons are complete", async () => {
            client.query.mockResolvedValue({
                rows: [{ status: "completed" }],
            });

            const result = await completeEnrollment(
                client,
                "enrollment-1"
            );

            expect(result.rows[0].status).toBe("completed");
            expect(client.query).toHaveBeenCalledWith(
                expect.stringContaining("course_enrollments"),
                ["enrollment-1"]
            );
            expect(client.query.mock.calls[0][0]).toContain(
                "l.status = 'published'"
            );
            expect(client.query.mock.calls[0][0]).toContain(
                "l.deleted_at IS NULL"
            );
        });

        it("locks an active enrollment for the specified user", async () => {
            client.query.mockResolvedValue({
                rows: [{ id: "enrollment-1" }],
            });

            const result = await lockEnrollment(
                client,
                "enrollment-1",
                "user-1"
            );

            expect(result.rows[0].id).toBe("enrollment-1");
            expect(client.query).toHaveBeenCalledWith(
                expect.stringContaining("FOR UPDATE"),
                ["enrollment-1", "user-1"]
            );
        });

        it("evaluates lesson and course completion atomically", async () => {
            // First call for completeLesson, second for completeEnrollment
            client.query
                .mockResolvedValueOnce({ rows: [{ id: "lesson-1", status: "completed" }] })
                .mockResolvedValueOnce({ rows: [{ id: "enrollment-1", status: "completed" }] });

            const result = await evaluateLessonAndCourseCompletion(
                client,
                "enrollment-1",
                "lesson-1",
                "course-1"
            );

            expect(result).toEqual({
                lessonCompleted: true,
                enrollmentCompleted: true,
            });
        });
    });
});