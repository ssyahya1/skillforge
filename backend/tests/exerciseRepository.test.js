import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/database/pool.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { pool } from "../src/database/pool.js";
import {
  findLessonById,
  findExerciseById,
  createExercise,
  updateExercise,
  getExercisesByLesson,
  updateExerciseStatus,
  deleteExercise,
  createExerciseLanguage,
  findExerciseLanguageById,
  getExerciseLanguages,
  updateExerciseLanguageById,
  deleteExerciseLanguageById,
  createTestCase,
  findTestCaseById,
  getTestCasesByExercise,
  updateTestCase,
  deleteTestCase,
  countExerciseLanguages,
  countVisibleTestCases,
  countHiddenTestCases,
  saveLanguageSolution,
  getLanguageSolution,
  getPublishedExercisesByLesson,
  getStudentExerciseDetails,
  getStudentExerciseLanguages,
  getVisibleTestCases,
  reorderExercises,
} from "../src/modules/exercises/exerciseRepository.js";

describe("Exercise Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findLessonById", () => {
    it("should return a lesson when found", async () => {
      const lesson = { id: "lesson-1", status: "published" };

      pool.query.mockResolvedValueOnce({
        rows: [lesson],
      });

      const result = await findLessonById("lesson-1");

      expect(result).toEqual(lesson);
      expect(pool.query).toHaveBeenCalledOnce();
    });

    it("should return null when lesson does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await findLessonById("lesson-1");

      expect(result).toBeNull();
    });
  });

  describe("findExerciseById", () => {
    it("should return an exercise when found", async () => {
      const exercise = { id: "exercise-1" };

      pool.query.mockResolvedValueOnce({
        rows: [exercise],
      });

      const result = await findExerciseById("exercise-1");

      expect(result).toEqual(exercise);
    });

    it("should return null when exercise does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await findExerciseById("exercise-1");

      expect(result).toBeNull();
    });
  });

  describe("createExercise", () => {
    it("should create an exercise", async () => {
      const exerciseData = {
        title: "JavaScript Arrays",
        slug: "javascript-arrays",
        instructions: "Learn arrays",
        difficulty: "beginner",
        position: 0,
      };

      const createdExercise = {
        id: "exercise-1",
        ...exerciseData,
        lesson_id: "lesson-1",
      };

      pool.query.mockResolvedValueOnce({
        rows: [createdExercise],
      });

      const result = await createExercise("lesson-1", exerciseData);

      expect(result).toEqual(createdExercise);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO public.exercises"),
        [
          "lesson-1",
          "JavaScript Arrays",
          "javascript-arrays",
          "Learn arrays",
          "beginner",
          0,
        ],
      );
    });
  });

  describe("updateExercise", () => {
    it("should update allowed exercise fields", async () => {
      const updatedExercise = {
        id: "exercise-1",
        title: "Updated title",
      };

      pool.query.mockResolvedValueOnce({
        rows: [updatedExercise],
      });

      const result = await updateExercise("exercise-1", {
        title: "Updated title",
      });

      expect(result).toEqual(updatedExercise);
      expect(pool.query).toHaveBeenCalledOnce();
    });

    it("should reject fields that are not in the allowlist", async () => {
      const result = await updateExercise("exercise-1", {
        status: "published",
      });

      expect(result).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("should return null when exercise does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateExercise("exercise-1", {
        title: "Updated title",
      });

      expect(result).toBeNull();
    });
  });

  describe("getExercisesByLesson", () => {
    it("should return all exercises for a lesson", async () => {
      const exercises = [
        { id: "exercise-1", position: 0 },
        { id: "exercise-2", position: 1 },
      ];

      pool.query.mockResolvedValueOnce({
        rows: exercises,
      });

      const result = await getExercisesByLesson("lesson-1");

      expect(result).toEqual(exercises);
      expect(result).toHaveLength(2);
    });

    it("should return an empty array when no exercises exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getExercisesByLesson("lesson-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateExerciseStatus", () => {
    it("should update exercise status", async () => {
      const exercise = {
        id: "exercise-1",
        status: "archived",
      };

      pool.query.mockResolvedValueOnce({
        rows: [exercise],
      });

      const result = await updateExerciseStatus("exercise-1", "archived");

      expect(result).toEqual(exercise);
    });
  });

  describe("deleteExercise", () => {
    it("should delete a draft exercise", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: "exercise-1" }],
      });

      const result = await deleteExercise("exercise-1");

      expect(result).toEqual({ id: "exercise-1" });

      expect(pool.query.mock.calls[0][0]).toContain("status = 'draft'");
    });

    it("should return null when no draft exercise is deleted", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteExercise("exercise-1");

      expect(result).toBeNull();
    });
  });

  describe("createExerciseLanguage", () => {
    it("should create a language configuration", async () => {
      const languageData = {
        language: "javascript",
        runtimeVersion: "24",
        executionMode: "stdin",
        starterCode: "console.log('Hello')",
      };

      const language = {
        id: "language-1",
        exercise_id: "exercise-1",
        language: "javascript",
        runtime_version: "24",
        execution_mode: "stdin",
        starter_code: "console.log('Hello')",
        entry_point: null,
      };

      pool.query.mockResolvedValueOnce({
        rows: [language],
      });

      const result = await createExerciseLanguage("exercise-1", languageData);

      expect(result).toEqual(language);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO public.exercise_languages"),
        [
          "exercise-1",
          "javascript",
          "24",
          "stdin",
          "console.log('Hello')",
          null,
        ],
      );
    });

    it("should pass the configured entry point when provided", async () => {
      const languageData = {
        language: "javascript",
        runtimeVersion: "24",
        executionMode: "function",
        starterCode: "function solution() {}",
        entryPoint: "solution",
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ id: "language-1" }],
      });

      await createExerciseLanguage("exercise-1", languageData);

      expect(pool.query.mock.calls[0][1]).toEqual([
        "exercise-1",
        "javascript",
        "24",
        "function",
        "function solution() {}",
        "solution",
      ]);
    });
  });

  describe("findExerciseLanguageById", () => {
    it("should return a language configuration scoped to its exercise", async () => {
      const language = {
        id: "language-1",
        exercise_id: "exercise-1",
        language: "javascript",
      };

      pool.query.mockResolvedValueOnce({
        rows: [language],
      });

      const result = await findExerciseLanguageById("exercise-1", "language-1");

      expect(result).toEqual(language);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("exercise_id"),
        ["exercise-1", "language-1"],
      );
    });

    it("should return null when the language configuration does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await findExerciseLanguageById("exercise-1", "language-1");

      expect(result).toBeNull();
    });
  });

  describe("getExerciseLanguages", () => {
    it("should return all language configurations for an exercise", async () => {
      const languages = [
        { id: "language-1", language: "javascript" },
        { id: "language-2", language: "python" },
      ];

      pool.query.mockResolvedValueOnce({
        rows: languages,
      });

      const result = await getExerciseLanguages("exercise-1");

      expect(result).toEqual(languages);
      expect(result).toHaveLength(2);
      expect(pool.query.mock.calls[0][1]).toEqual(["exercise-1"]);
    });

    it("should return an empty array when an exercise has no language configurations", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getExerciseLanguages("exercise-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateExerciseLanguageById", () => {
    it("should update allowed language configuration fields", async () => {
      const updatedLanguage = {
        id: "language-1",
        exercise_id: "exercise-1",
        runtime_version: "24",
      };

      pool.query.mockResolvedValueOnce({
        rows: [updatedLanguage],
      });

      const result = await updateExerciseLanguageById(
        "exercise-1",
        "language-1",
        { runtimeVersion: "24" },
      );

      expect(result).toEqual(updatedLanguage);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE public.exercise_languages"),
        ["24", "exercise-1", "language-1"],
      );
    });

    it("should update multiple allowed fields", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: "language-1" }],
      });

      await updateExerciseLanguageById("exercise-1", "language-1", {
        runtimeVersion: "24",
        entryPoint: "solution",
      });

      expect(pool.query).toHaveBeenCalledOnce();

      const [query, values] = pool.query.mock.calls[0];

      expect(query).toContain("runtime_version");
      expect(query).toContain("entry_point");
      expect(values).toEqual(["24", "solution", "exercise-1", "language-1"]);
    });

    it("should reject fields outside the allowlist", async () => {
      const result = await updateExerciseLanguageById(
        "exercise-1",
        "language-1",
        { language: "python" },
      );

      expect(result).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("should return null when the language configuration does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateExerciseLanguageById(
        "exercise-1",
        "language-1",
        { runtimeVersion: "24" },
      );

      expect(result).toBeNull();
    });
  });

  describe("deleteExerciseLanguageById", () => {
    it("should delete a language configuration scoped to its exercise", async () => {
      const deletedLanguage = { id: "language-1" };

      pool.query.mockResolvedValueOnce({
        rows: [deletedLanguage],
      });

      const result = await deleteExerciseLanguageById(
        "exercise-1",
        "language-1",
      );

      expect(result).toEqual(deletedLanguage);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM public.exercise_languages"),
        ["exercise-1", "language-1"],
      );
    });

    it("should return null when the language configuration does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteExerciseLanguageById(
        "exercise-1",
        "language-1",
      );

      expect(result).toBeNull();
    });
  });

  describe("createTestCase", () => {
    it("should create a test case", async () => {
      const testCaseData = {
        inputData: { numbers: [1, 2] },
        expectedOutput: { result: 3 },
        visibility: "visible",
        displayOrder: 0,
      };

      const testCase = { id: "test-1" };

      pool.query.mockResolvedValueOnce({
        rows: [testCase],
      });

      const result = await createTestCase("exercise-1", testCaseData);

      expect(result).toEqual(testCase);

      expect(pool.query.mock.calls[0][1]).toEqual([
        "exercise-1",
        '{"numbers":[1,2]}',
        '{"result":3}',
        "visible",
        0,
      ]);
    });
  });

  describe("findTestCaseById", () => {
    it("should return a test case", async () => {
      const testCase = { id: "test-1" };

      pool.query.mockResolvedValueOnce({
        rows: [testCase],
      });

      const result = await findTestCaseById("test-1");

      expect(result).toEqual(testCase);
    });
  });

  describe("getTestCasesByExercise", () => {
    it("should return all admin test cases", async () => {
      const testCases = [
        { id: "test-1", visibility: "visible" },
        { id: "test-2", visibility: "hidden" },
      ];

      pool.query.mockResolvedValueOnce({
        rows: testCases,
      });

      const result = await getTestCasesByExercise("exercise-1");

      expect(result).toEqual(testCases);
      expect(result).toHaveLength(2);
    });
  });

  describe("updateTestCase", () => {
    it("should update test case fields", async () => {
      const testCase = { id: "test-1" };

      pool.query.mockResolvedValueOnce({
        rows: [testCase],
      });

      const result = await updateTestCase("test-1", {
        visibility: "hidden",
      });

      expect(result).toEqual(testCase);
    });

    it("should reject fields outside the allowlist", async () => {
      const result = await updateTestCase("test-1", {
        exerciseId: "exercise-2",
      });

      expect(result).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("deleteTestCase", () => {
    it("should delete a test case", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: "test-1" }],
      });

      const result = await deleteTestCase("test-1");

      expect(result).toEqual({ id: "test-1" });
    });
  });

  describe("publishing requirement counts", () => {
    it("should count exercise languages", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ count: 2 }],
      });

      const result = await countExerciseLanguages("exercise-1");

      expect(result).toBe(2);
    });

    it("should count visible test cases", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ count: 3 }],
      });

      const result = await countVisibleTestCases("exercise-1");

      expect(result).toBe(3);
    });

    it("should count hidden test cases", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ count: 5 }],
      });

      const result = await countHiddenTestCases("exercise-1");

      expect(result).toBe(5);
    });
  });

  describe("saveLanguageSolution", () => {
    it("should save a private language solution", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ language_id: "language-1" }],
      });

      const result = await saveLanguageSolution(
        "language-1",
        "console.log('solution')",
      );

      expect(result).toEqual({
        language_id: "language-1",
      });
    });
  });

  describe("getLanguageSolution", () => {
    it("should return a private solution", async () => {
      const solution = {
        language_id: "language-1",
        solution_code: "return a + b;",
      };

      pool.query.mockResolvedValueOnce({
        rows: [solution],
      });

      const result = await getLanguageSolution("language-1");

      expect(result).toEqual(solution);
    });
  });

  describe("getPublishedExercisesByLesson", () => {
    it("should return published exercises only", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: "exercise-1", status: "published" }],
      });

      const result = await getPublishedExercisesByLesson("lesson-1");

      expect(result).toHaveLength(1);
      expect(pool.query.mock.calls[0][0]).toContain("status = 'published'");
    });
  });

  describe("getStudentExerciseDetails", () => {
    it("should return a published exercise", async () => {
      const exercise = {
        id: "exercise-1",
        status: "published",
      };

      pool.query.mockResolvedValueOnce({
        rows: [exercise],
      });

      const result = await getStudentExerciseDetails("exercise-1");

      expect(result).toEqual(exercise);
    });

    it("should return null when exercise is not published", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getStudentExerciseDetails("exercise-1");

      expect(result).toBeNull();
    });
  });

  describe("getStudentExerciseLanguages", () => {
    it("should retrieve language configurations for published exercises", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ language: "javascript" }],
      });

      const result = await getStudentExerciseLanguages("exercise-1");

      expect(result).toHaveLength(1);
      expect(pool.query.mock.calls[0][0]).toContain("status = 'published'");
    });
  });

  describe("getVisibleTestCases", () => {
    it("should return visible test cases only", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: "test-1", visibility: "visible" }],
      });

      const result = await getVisibleTestCases("exercise-1");

      expect(result).toHaveLength(1);

      expect(pool.query.mock.calls[0][0]).toContain("visibility = 'visible'");

      expect(pool.query.mock.calls[0][0]).not.toContain("solution_code");
    });
  });

  describe("reorderExercises", () => {
    it("should reorder exercises in a transaction", async () => {
      const client = {
        query: vi.fn(),
        release: vi.fn(),
      };

      pool.connect.mockResolvedValueOnce(client);

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: "exercise-1", position: 0 },
            { id: "exercise-2", position: 1 },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: "exercise-2", position: 0 },
            { id: "exercise-1", position: 1 },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await reorderExercises("lesson-1", [
        { exerciseId: "exercise-2", position: 0 },
        { exerciseId: "exercise-1", position: 1 },
      ]);

      expect(result).toHaveLength(2);
      expect(client.query).toHaveBeenCalledWith("BEGIN");
      expect(client.query).toHaveBeenCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalledOnce();
    });

    it("should reject duplicate exercise IDs", async () => {
      const client = {
        query: vi.fn(),
        release: vi.fn(),
      };

      pool.connect.mockResolvedValueOnce(client);

      await expect(
        reorderExercises("lesson-1", [
          { exerciseId: "exercise-1", position: 0 },
          { exerciseId: "exercise-1", position: 1 },
        ]),
      ).rejects.toThrow("Duplicate exercise IDs or positions.");

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalledOnce();
    });

    it("should rollback if the requested exercises do not match the lesson", async () => {
      const client = {
        query: vi.fn(),
        release: vi.fn(),
      };

      pool.connect.mockResolvedValueOnce(client);

      client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [{ id: "exercise-1", position: 0 }],
      });

      await expect(
        reorderExercises("lesson-1", [
          { exerciseId: "exercise-2", position: 0 },
        ]),
      ).rejects.toThrow(
        "The reorder request must include every exercise in the lesson.",
      );

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalledOnce();
    });
  });
});
