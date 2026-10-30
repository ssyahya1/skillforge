
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as exerciseRepository from "../src/modules/exercises/exerciseRepository.js";

import {
  createExerciseService,
  getExerciseByIdService,
  getExercisesByLessonService,
  updateExerciseService,
  reorderExercisesService,
  publishExerciseService,
  archiveExerciseService,
  deleteExerciseService,
} from "../src/modules/exercises/exerciseService.js";

vi.mock("../src/modules/exercises/exerciseRepository.js", () => ({
  findLessonById: vi.fn(),
  findExerciseById: vi.fn(),
  createExercise: vi.fn(),
  getExercisesByLesson: vi.fn(),
  updateExercise: vi.fn(),
  reorderExercises: vi.fn(),
  getExerciseLanguages: vi.fn(),
  countVisibleTestCases: vi.fn(),
  countHiddenTestCases: vi.fn(),
  updateExerciseStatus: vi.fn(),
  deleteExercise: vi.fn(),
}));

const lessonId = "lesson-uuid";
const exerciseId = "exercise-uuid";

const mockLesson = {
  id: lessonId,
  status: "published",
  deleted_at: null,
};

const mockExercise = {
  id: exerciseId,
  lesson_id: lessonId,
  title: "JavaScript Basics",
  slug: "javascript-basics",
  instructions: "Solve the challenge.",
  status: "draft",
};

const mockExerciseData = {
  title: "JavaScript Basics",
  slug: "javascript-basics",
  instructions: "Solve the challenge.",
  difficulty: "beginner",
  position: 0,
};

const mockLanguages = [
  {
    language: "javascript",
    runtime_version: "22",
    starter_code: "function solution() {}",
    execution_mode: "function",
  },
];

const mockReorderData = [
  {
    exerciseId,
    position: 0,
  },
];

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

beforeEach(() => {
  vi.resetAllMocks();
});

// CREATE EXERCISE

describe("createExerciseService", () => {
  it("should create an exercise successfully", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.createExercise.mockResolvedValue(mockExercise);

    const result = await createExerciseService(
      lessonId,
      mockExerciseData,
    );

    expect(result).toEqual(mockExercise);
    expect(exerciseRepository.createExercise).toHaveBeenCalledWith(
      lessonId,
      mockExerciseData,
    );
  });

  it("should throw 404 when lesson does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(null);

    await expect(
      createExerciseService(lessonId, mockExerciseData),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(exerciseRepository.createExercise).not.toHaveBeenCalled();
  });

  it("should reject a deleted lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue({
      ...mockLesson,
      deleted_at: new Date(),
    });

    await expect(
      createExerciseService(lessonId, mockExerciseData),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should reject an archived lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue({
      ...mockLesson,
      status: "archived",
    });

    await expect(
      createExerciseService(lessonId, mockExerciseData),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// GET EXERCISE BY ID

describe("getExerciseByIdService", () => {
  it("should return an exercise successfully", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);

    const result = await getExerciseByIdService(
      lessonId,
      exerciseId,
    );

    expect(result).toEqual(mockExercise);
  });

  it("should throw 404 when lesson does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(null);

    await expect(
      getExerciseByIdService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 404 when exercise does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(null);

    await expect(
      getExerciseByIdService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should reject an exercise belonging to another lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      lesson_id: "another-lesson",
    });

    await expect(
      getExerciseByIdService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// GET EXERCISES BY LESSON

describe("getExercisesByLessonService", () => {
  it("should return exercises for a lesson", async () => {
    const exercises = [mockExercise];

    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue(exercises);

    const result = await getExercisesByLessonService(lessonId);

    expect(result).toEqual(exercises);
  });

  it("should throw 404 when lesson does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(null);

    await expect(
      getExercisesByLessonService(lessonId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should return an empty array when lesson has no exercises", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([]);

    const result = await getExercisesByLessonService(lessonId);

    expect(result).toEqual([]);
  });
});

// UPDATE EXERCISE

describe("updateExerciseService", () => {
  it("should update an exercise successfully", async () => {
    const updatedExercise = {
      ...mockExercise,
      title: "Updated Title",
    };

    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.updateExercise.mockResolvedValue(updatedExercise);

    const result = await updateExerciseService(
      exerciseId,
      lessonId,
      { title: "Updated Title" },
    );

    expect(result).toEqual(updatedExercise);
  });

  it("should throw 404 when lesson does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(null);

    await expect(
      updateExerciseService(exerciseId, lessonId, { title: "Updated" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 404 when exercise does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(null);

    await expect(
      updateExerciseService(exerciseId, lessonId, { title: "Updated" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should reject an exercise belonging to another lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      lesson_id: "another-lesson",
    });

    await expect(
      updateExerciseService(exerciseId, lessonId, { title: "Updated" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should reject updates to archived exercises", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      status: "archived",
    });

    await expect(
      updateExerciseService(exerciseId, lessonId, { title: "Updated" }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw when repository cannot update the exercise", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.updateExercise.mockResolvedValue(null);

    await expect(
      updateExerciseService(exerciseId, lessonId, { title: "Updated" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// REORDER EXERCISES

describe("reorderExercisesService", () => {
  it("should reorder exercises successfully", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
    ]);
    exerciseRepository.reorderExercises.mockResolvedValue([
      { ...mockExercise, position: 0 },
    ]);

    const result = await reorderExercisesService(
      lessonId,
      mockReorderData,
    );

    expect(result).toHaveLength(1);
    expect(exerciseRepository.reorderExercises).toHaveBeenCalledWith(
      lessonId,
      mockReorderData,
    );
  });

  it("should reject an exercise that does not belong to the lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
    ]);

    await expect(
      reorderExercisesService(lessonId, [
        { exerciseId: "invalid-id", position: 0 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject duplicate exercise IDs", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
      { ...mockExercise, id: "exercise-2" },
    ]);

    await expect(
      reorderExercisesService(lessonId, [
        { exerciseId, position: 0 },
        { exerciseId, position: 1 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject duplicate positions", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
      { ...mockExercise, id: "exercise-2" },
    ]);

    await expect(
      reorderExercisesService(lessonId, [
        { exerciseId, position: 0 },
        { exerciseId: "exercise-2", position: 0 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject non-consecutive positions", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
      { ...mockExercise, id: "exercise-2" },
    ]);

    await expect(
      reorderExercisesService(lessonId, [
        { exerciseId, position: 0 },
        { exerciseId: "exercise-2", position: 2 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject when not all exercises are included", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
      { ...mockExercise, id: "exercise-2" },
    ]);

    await expect(
      reorderExercisesService(lessonId, [
        { exerciseId, position: 0 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw when repository cannot reorder exercises", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.getExercisesByLesson.mockResolvedValue([
      mockExercise,
    ]);
    exerciseRepository.reorderExercises.mockResolvedValue(null);

    await expect(
      reorderExercisesService(lessonId, mockReorderData),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

// PUBLISH EXERCISE

describe("publishExerciseService", () => {
  const preparePublishMocks = () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.getExerciseLanguages.mockResolvedValue(mockLanguages);
    exerciseRepository.countVisibleTestCases.mockResolvedValue(1);
    exerciseRepository.countHiddenTestCases.mockResolvedValue(1);
    exerciseRepository.updateExerciseStatus.mockResolvedValue({
      ...mockExercise,
      status: "published",
    });
  };

  it("should publish a valid exercise", async () => {
    preparePublishMocks();

    const result = await publishExerciseService(lessonId, exerciseId);

    expect(result.status).toBe("published");
    expect(exerciseRepository.updateExerciseStatus).toHaveBeenCalledWith(
      exerciseId,
      "published",
    );
  });

  it("should reject an archived lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue({
      ...mockLesson,
      status: "archived",
    });

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should reject an exercise that belongs to another lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      lesson_id: "another-lesson",
    });

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should reject an already published exercise", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      status: "published",
    });

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should reject an archived exercise", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      status: "archived",
    });

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should reject an exercise with missing content", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      title: " ",
    });

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject when no language is configured", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.getExerciseLanguages.mockResolvedValue([]);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject an unsupported language", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.getExerciseLanguages.mockResolvedValue([
      { ...mockLanguages[0], language: "ruby" },
    ]);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject an invalid runtime configuration", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.getExerciseLanguages.mockResolvedValue([
      { ...mockLanguages[0], runtime_version: " " },
    ]);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject an invalid starter code", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.getExerciseLanguages.mockResolvedValue([
      { ...mockLanguages[0], starter_code: " " },
    ]);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should reject an invalid execution mode", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.getExerciseLanguages.mockResolvedValue([
      { ...mockLanguages[0], execution_mode: "invalid" },
    ]);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should require at least one visible test case", async () => {
    preparePublishMocks();
    exerciseRepository.countVisibleTestCases.mockResolvedValue(0);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should require at least one hidden test case", async () => {
    preparePublishMocks();
    exerciseRepository.countHiddenTestCases.mockResolvedValue(0);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw when publishing fails", async () => {
    preparePublishMocks();
    exerciseRepository.updateExerciseStatus.mockResolvedValue(null);

    await expect(
      publishExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

// ARCHIVE EXERCISE

describe("archiveExerciseService", () => {
  it("should archive an exercise successfully", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.updateExerciseStatus.mockResolvedValue({
      ...mockExercise,
      status: "archived",
    });

    const result = await archiveExerciseService(lessonId, exerciseId);

    expect(result.status).toBe("archived");
    expect(exerciseRepository.updateExerciseStatus).toHaveBeenCalledWith(
      exerciseId,
      "archived",
    );
  });

  it("should reject an already archived exercise", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      status: "archived",
    });

    await expect(
      archiveExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should reject an exercise belonging to another lesson", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      lesson_id: "another-lesson",
    });

    await expect(
      archiveExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw when archiving fails", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.updateExerciseStatus.mockResolvedValue(null);

    await expect(
      archiveExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

// DELETE EXERCISE

describe("deleteExerciseService", () => {
  it("should delete a draft exercise successfully", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.deleteExercise.mockResolvedValue(mockExercise);

    const result = await deleteExerciseService(lessonId, exerciseId);

    expect(result).toEqual(mockExercise);
    expect(exerciseRepository.deleteExercise).toHaveBeenCalledWith(
      exerciseId,
    );
  });

  it("should reject deletion of a published exercise", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      status: "published",
    });

    await expect(
      deleteExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should reject deletion of an archived exercise", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue({
      ...mockExercise,
      status: "archived",
    });

    await expect(
      deleteExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 404 when exercise does not exist", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(null);

    await expect(
      deleteExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw when deletion fails", async () => {
    exerciseRepository.findLessonById.mockResolvedValue(mockLesson);
    exerciseRepository.findExerciseById.mockResolvedValue(mockExercise);
    exerciseRepository.deleteExercise.mockResolvedValue(null);

    await expect(
      deleteExerciseService(lessonId, exerciseId),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
