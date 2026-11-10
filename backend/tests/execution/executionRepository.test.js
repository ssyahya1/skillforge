import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, connect, clientQuery, release } = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));
vi.mock("../../src/database/pool.js", () => ({
  pool: {
    query,
    connect,
  },
}));

import * as executionRepository from "../../src/modules/execution/executionRepository.js";

describe("Execution Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    connect.mockResolvedValue({
      query: clientQuery,
      release,
    });
  });

  describe("findSubmissionById", () => {
    it("should return a submission by ID", async () => {
      const submission = {
        id: "submission-1",
        status: "queued",
      };

      query.mockResolvedValue({
        rows: [submission],
      });

      const result =
        await executionRepository.findSubmissionById("submission-1");

      expect(result).toEqual(submission);
      expect(query).toHaveBeenCalledOnce();
    });

    it("should return null when submission does not exist", async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await executionRepository.findSubmissionById("unknown-id");

      expect(result).toBeNull();
    });
  });

  describe("findUserSubmissionById", () => {
    it("should return a submission scoped to its owner", async () => {
      const submission = {
        id: "submission-1",
        user_id: "user-1",
        status: "queued",
      };

      query.mockResolvedValue({ rows: [submission] });

      const result = await executionRepository.findUserSubmissionById(
        "submission-1",
        "user-1",
      );

      expect(result).toEqual(submission);
      expect(query.mock.calls[0][0]).toContain("user_id = $2");
      expect(query.mock.calls[0][1]).toEqual(["submission-1", "user-1"]);
    });

    it("should return null when the submission does not belong to the user", async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await executionRepository.findUserSubmissionById(
        "submission-1",
        "another-user",
      );

      expect(result).toBeNull();
    });
  });

  describe("isSubmissionEligibleForExecution", () => {
    it("requires ownership, active enrollment, and completed lesson content", async () => {
      query.mockResolvedValue({ rows: [{ eligible: true }] });

      const result =
        await executionRepository.isSubmissionEligibleForExecution(
          "submission-1",
          "user-1",
        );

      expect(result).toBe(true);
      expect(query.mock.calls[0][0]).toContain("s.user_id = $2");
      expect(query.mock.calls[0][0]).toContain("ce.status = 'active'");
      expect(query.mock.calls[0][0]).toContain(
        "lp.content_completed_at IS NOT NULL",
      );
      expect(query.mock.calls[0][1]).toEqual(["submission-1", "user-1"]);
    });

    it("returns false when the student is not eligible", async () => {
      query.mockResolvedValue({ rows: [{ eligible: false }] });

      const result =
        await executionRepository.isSubmissionEligibleForExecution(
          "submission-1",
          "user-1",
        );

      expect(result).toBe(false);
    });
  });

  describe("findQueuedSubmission", () => {
    it("should return a queued submission", async () => {
      const submission = {
        id: "submission-1",
        status: "queued",
      };

      query.mockResolvedValue({
        rows: [submission],
      });

      const result =
        await executionRepository.findQueuedSubmission("submission-1");

      expect(result).toEqual(submission);
      expect(query.mock.calls[0][0]).toContain("status = 'queued'");
    });

    it("should return null for a non-queued submission", async () => {
      query.mockResolvedValue({ rows: [] });

      const result =
        await executionRepository.findQueuedSubmission("submission-1");

      expect(result).toBeNull();
    });
  });

  describe("claimSubmission", () => {
    it("should claim an eligible queued submission inside a transaction", async () => {
      const submission = {
        id: "submission-1",
        user_id: "user-1",
        exercise_id: "exercise-1",
        language_id: "language-1",
        status: "queued",
      };

      const claimed = {
        ...submission,
        status: "processing",
      };

      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [submission] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "enrollment-1" }] })
        .mockResolvedValueOnce({ rows: [claimed] })
        .mockResolvedValueOnce({ rows: [] });

      const result =
        await executionRepository.claimSubmission("submission-1");

      expect(result).toEqual({
        ...claimed,
        previous_status: "queued",
      });
      expect(clientQuery.mock.calls[0][0]).toBe("BEGIN");
      expect(clientQuery.mock.calls[1][0]).toContain("FOR UPDATE");
      expect(clientQuery.mock.calls[2][0]).toContain(
        "submission_execution_checkpoints",
      );
      expect(clientQuery.mock.calls[3][0]).toContain("FOR UPDATE OF ce");
      expect(clientQuery.mock.calls[4][0]).toContain(
        "SET status = 'processing'",
      );
      expect(clientQuery.mock.calls[5][0]).toBe("COMMIT");
      expect(release).toHaveBeenCalledOnce();
    });

    it("should mark an ineligible queued submission as internal_error", async () => {
      const submission = {
        id: "submission-1",
        user_id: "user-1",
        exercise_id: "exercise-1",
        language_id: "language-1",
        status: "queued",
      };

      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [submission] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ ...submission, status: "internal_error" }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result =
        await executionRepository.claimSubmission("submission-1");

      expect(result).toMatchObject({
        id: "submission-1",
        status: "internal_error",
        ineligible: true,
      });
      expect(result.error_message).toContain("Enrollment is no longer active");
      expect(clientQuery.mock.calls[4][0]).toContain(
        "status = 'internal_error'",
      );
      expect(clientQuery.mock.calls[5][0]).toBe("COMMIT");
      expect(release).toHaveBeenCalledOnce();
    });

    describe("acquireSubmissionExecutionLock", () => {
      it("holds a PostgreSQL advisory lock for one worker execution", async () => {
        clientQuery
          .mockResolvedValueOnce({ rows: [{ acquired: true }] })
          .mockResolvedValueOnce({ rows: [{ pg_advisory_unlock: true }] });

        const releaseLock =
          await executionRepository.acquireSubmissionExecutionLock("submission-1");

        expect(releaseLock).toBeTypeOf("function");
        expect(clientQuery.mock.calls[0][0]).toContain("pg_try_advisory_lock");
        await releaseLock();
        expect(clientQuery.mock.calls[1][0]).toContain("pg_advisory_unlock");
        expect(release).toHaveBeenCalledOnce();
      });

      it("releases the connection when another worker owns the lock", async () => {
        clientQuery.mockResolvedValueOnce({ rows: [{ acquired: false }] });

        const releaseLock =
          await executionRepository.acquireSubmissionExecutionLock("submission-1");

        expect(releaseLock).toBeNull();
        expect(release).toHaveBeenCalledOnce();
      });
    });

    describe("markSubmissionExecutionFailure", () => {
      it.each([
        ["queued", false],
        ["internal_error", true],
      ])("sets retry status to %s for terminal=%s", async (status, terminal) => {
        query.mockResolvedValue({ rows: [{ status }] });

        const result =
          await executionRepository.markSubmissionExecutionFailure(
            "submission-1",
            "worker failed",
            terminal,
          );

        expect(result.status).toBe(status);
        expect(query.mock.calls[0][0]).toContain("status = 'processing'");
        expect(query.mock.calls[0][1]).toEqual([
          "submission-1",
          status,
          "worker failed",
        ]);
      });
    });

    it("should return null if another worker already claimed it", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await executionRepository.claimSubmission("submission-1");

      expect(result).toBeNull();
      expect(clientQuery.mock.calls[0][0]).toBe("BEGIN");
      expect(clientQuery.mock.calls[2][0]).toBe("COMMIT");
      expect(release).toHaveBeenCalledOnce();
    });
  });

  describe("submission execution checkpoints", () => {
    it("returns a checkpoint for a submission test case", async () => {
      const checkpoint = {
        state: "submitted",
        judge0_token: "remote-token",
      };
      query.mockResolvedValue({ rows: [checkpoint] });

      const result =
        await executionRepository.getSubmissionTestExecutionCheckpoint(
          "submission-1",
          "test-1",
        );

      expect(result).toEqual(checkpoint);
      expect(query.mock.calls[0][1]).toEqual(["submission-1", "test-1"]);
    });

    it("creates a submitting checkpoint before a Judge0 POST", async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ state: "submitting" }] });

      const result = await executionRepository.beginSubmissionTestExecution({
        submissionId: "submission-1",
        testCaseId: "test-1",
        displayOrder: 0,
      });

      expect(query.mock.calls[0][0]).toContain(
        "ON CONFLICT (submission_id, test_case_id) DO NOTHING",
      );
      expect(query.mock.calls[0][1]).toEqual(["submission-1", "test-1", 0]);
      expect(result).toEqual({ state: "submitting" });
    });

    it("persists the remote token and completion result", async () => {
      query
        .mockResolvedValueOnce({ rows: [{ submission_id: "submission-1" }] })
        .mockResolvedValueOnce({ rows: [{ submission_id: "submission-1" }] });

      await executionRepository.saveJudge0SubmissionToken(
        "submission-1",
        "test-1",
        "remote-token",
      );
      await executionRepository.completeSubmissionTestExecution(
        "submission-1",
        "test-1",
        { token: "remote-token", status: { id: 3 } },
      );

      expect(query.mock.calls[0][0]).toContain("state = 'submitted'");
      expect(query.mock.calls[1][0]).toContain("state = 'completed'");
      expect(query.mock.calls[1][1][2]).toBe(
        JSON.stringify({ token: "remote-token", status: { id: 3 } }),
      );
    });

    it("marks an untracked remote outcome as ambiguous", async () => {
      query.mockResolvedValue({ rows: [] });

      await executionRepository.markSubmissionTestExecutionAmbiguous(
        "submission-1",
        "test-1",
        0,
        "outcome unknown",
      );

      expect(query.mock.calls[0][0]).toContain("state = 'ambiguous'");
      expect(query.mock.calls[0][0]).toContain(
        "WHERE checkpoint.state IN ('submitting', 'submitted')",
      );

      expect(query.mock.calls[0][1]).toEqual([
        "submission-1",
        "test-1",
        0,
        "outcome unknown",
      ]);
    });
  });

  describe("getExecutionTestCases", () => {
    it("should return test cases ordered by display order", async () => {
      const testCases = [
        { id: "test-1", display_order: 0 },
        { id: "test-2", display_order: 1 },
      ];

      query.mockResolvedValue({
        rows: testCases,
      });

      const result =
        await executionRepository.getExecutionTestCases("exercise-1");

      expect(result).toEqual(testCases);
      expect(query.mock.calls[0][0]).toContain("ORDER BY display_order ASC");
    });

    it("should return an empty array when no test cases exist", async () => {
      query.mockResolvedValue({ rows: [] });

      const result =
        await executionRepository.getExecutionTestCases("exercise-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateSubmissionStatus", () => {
    it("should update submission status", async () => {
      const updated = {
        id: "submission-1",
        status: "processing",
      };

      query.mockResolvedValue({
        rows: [updated],
      });

      const result = await executionRepository.updateSubmissionStatus(
        "submission-1",
        "processing",
      );

      expect(result).toEqual(updated);
    });

    it("should return null when submission does not exist", async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await executionRepository.updateSubmissionStatus(
        "unknown-id",
        "internal_error",
      );

      expect(result).toBeNull();
    });
  });

  describe("saveSubmissionExecution", () => {
    it("should save final execution metrics", async () => {
      const execution = {
        id: "submission-1",
        status: "accepted",
        execution_time_ms: 120,
        memory_used_kb: 2048,
      };

      query.mockResolvedValue({
        rows: [execution],
      });

      const result = await executionRepository.saveSubmissionExecution(
        "submission-1",
        {
          status: "accepted",
          executionTimeMs: 120,
          memoryUsedKb: 2048,
        },
      );

      expect(result).toEqual(execution);
    });
  });

  describe("saveTestResults", () => {
    it("should save test results inside a transaction", async () => {
      clientQuery.mockResolvedValue({ rows: [] });

      const testResults = [
        {
          testCaseId: "test-1",
          displayOrder: 0,
          status: "passed",
          executionTimeMs: 50,
          actualOutput: { result: 10 },
        },
      ];

      const result = await executionRepository.saveTestResults(
        "submission-1",
        testResults,
      );

      expect(result).toBe(1);
      expect(clientQuery).toHaveBeenCalledWith("BEGIN");
      expect(clientQuery).toHaveBeenCalledWith("COMMIT");
      expect(release).toHaveBeenCalledOnce();
    });

    it("should rollback when inserting test results fails", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("Database error"));

      await expect(
        executionRepository.saveTestResults("submission-1", [
          {
            testCaseId: "test-1",
            displayOrder: 0,
            status: "passed",
          },
        ]),
      ).rejects.toThrow("Database error");

      expect(clientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(release).toHaveBeenCalledOnce();
    });
  });

  describe("getSubmissionTestResults", () => {
    it("should return all test results", async () => {
      const results = [
        { id: "result-1", status: "passed" },
        { id: "result-2", status: "failed" },
      ];

      query.mockResolvedValue({ rows: results });

      const result =
        await executionRepository.getSubmissionTestResults("submission-1");

      expect(result).toEqual(results);
    });
  });

  describe("getPublicSubmissionTestResults", () => {
    it("should retrieve only public test results", async () => {
      query.mockResolvedValue({
        rows: [{ id: "result-1", status: "passed" }],
      });

      const result =
        await executionRepository.getPublicSubmissionTestResults(
          "submission-1",
        );

      expect(result).toHaveLength(1);
      expect(query.mock.calls[0][0]).toContain(
        "test_case.visibility = 'public'",
      );
    });
  });

  describe("finalizeSubmissionWithProgress", () => {
    const finalization = {
      submissionId: "submission-1",
      userId: "user-1",
      exerciseId: "exercise-1",
      overallStatus: "accepted",
      executionTimeMs: 120,
      memoryUsedKb: 2048,
      errorMessage: null,
      testResults: [
        {
          testCaseId: "test-1",
          displayOrder: 0,
          status: "passed",
          executionTimeMs: 120,
          actualOutput: null,
          errorMessage: null,
        },
      ],
    };

    it("rejects accepted status unless at least one test case passed", async () => {
      await expect(
        executionRepository.finalizeSubmissionWithProgress({
          ...finalization,
          testResults: [],
        }),
      ).rejects.toThrow("Accepted submissions require all test cases to pass.");

      expect(connect).not.toHaveBeenCalled();
    });

    it("persists accepted status and idempotent progress in one transaction", async () => {
      const submission = {
        id: "submission-1",
        user_id: "user-1",
        exercise_id: "exercise-1",
        status: "accepted",
      };
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ ...submission, status: "processing" }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [submission] })
        .mockResolvedValueOnce({
          rows: [{ enrollment_id: "enrollment-1", lesson_id: "lesson-1" }],
        })
        .mockResolvedValueOnce({ rows: [{ submission_id: "submission-1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "lesson-progress-1" }] })
        .mockResolvedValueOnce({ rows: [{ id: "enrollment-1" }] })
        .mockResolvedValueOnce({ rows: [] });

      const result =
        await executionRepository.finalizeSubmissionWithProgress(finalization);

      expect(result).toEqual(submission);
      expect(clientQuery.mock.calls[0][0]).toBe("BEGIN");
      expect(clientQuery.mock.calls[1][0]).toContain("FOR UPDATE");
      expect(clientQuery.mock.calls[4][0]).toContain(
        "status = 'processing'",
      );
      expect(clientQuery.mock.calls[6][0]).toContain(
        "ON CONFLICT (submission_id) DO NOTHING",
      );
      expect(clientQuery.mock.calls[7][0]).toContain(
        "INSERT INTO public.exercise_progress",
      );
      expect(clientQuery.mock.calls[10][0]).toContain(
        "DELETE FROM public.submission_execution_checkpoints",
      );
      expect(clientQuery.mock.calls[11][0]).toBe("COMMIT");
      expect(release).toHaveBeenCalledOnce();
    });

    it.each(["internal_error", "cancelled"])(
      "does not record %s as a student attempt",
      async (status) => {
        const submission = {
          id: "submission-1",
          user_id: "user-1",
          exercise_id: "exercise-1",
          status,
        };
        clientQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{ ...submission, status: "processing" }],
          })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [submission] })
          .mockResolvedValueOnce({ rows: [] });

        await executionRepository.finalizeSubmissionWithProgress({
          ...finalization,
          overallStatus: status,
          testResults: [],
        });

        expect(
          clientQuery.mock.calls.some(([sql]) =>
            sql.includes("exercise_progress_attempts"),
          ),
        ).toBe(false);
        expect(clientQuery.mock.calls.at(-1)[0]).toBe("COMMIT");
      },
    );

    it("counts a failed submission as an attempt without completing the lesson", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "processing",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "wrong_answer",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ enrollment_id: "enrollment-1", lesson_id: "lesson-1" }],
        })
        .mockResolvedValueOnce({ rows: [{ submission_id: "submission-1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await executionRepository.finalizeSubmissionWithProgress({
        ...finalization,
        overallStatus: "wrong_answer",
        testResults: [
          {
            testCaseId: "test-1",
            displayOrder: 0,
            status: "failed",
            executionTimeMs: 120,
            actualOutput: null,
            errorMessage: "Wrong answer",
          },
        ],
      });

      expect(clientQuery.mock.calls[6][1]).toEqual([
        "submission-1",
        "enrollment-1",
        "exercise-1",
        "wrong_answer",
      ]);
      expect(
        clientQuery.mock.calls.some(([sql]) =>
          sql.includes("UPDATE public.lesson_progress"),
        ),
      ).toBe(false);
    });

    it("does not mutate progress when no active enrollment exists", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "processing",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "accepted",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await executionRepository.finalizeSubmissionWithProgress(finalization);

      expect(
        clientQuery.mock.calls.some(([sql]) =>
          sql.includes("exercise_progress_attempts"),
        ),
      ).toBe(false);
      expect(
        clientQuery.mock.calls.some(([sql]) =>
          sql.includes("INSERT INTO public.exercise_progress ("),
        ),
      ).toBe(false);
    });

    it("does not increment attempts when the submission already has an idempotency record", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "processing",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "accepted",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ enrollment_id: "enrollment-1", lesson_id: "lesson-1" }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await executionRepository.finalizeSubmissionWithProgress(finalization);

      expect(
        clientQuery.mock.calls.some(([sql]) =>
          sql.includes("INSERT INTO public.exercise_progress ("),
        ),
      ).toBe(false);
      expect(
        clientQuery.mock.calls.some(([sql]) =>
          sql.includes("UPDATE public.lesson_progress"),
        ),
      ).toBe(false);
    });

    it("rejects mismatched submission ownership and rolls back", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "another-user",
              exercise_id: "exercise-1",
              status: "processing",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        executionRepository.finalizeSubmissionWithProgress(finalization),
      ).rejects.toThrow("Submission identity does not match the execution job.");

      expect(clientQuery.mock.calls.at(-1)[0]).toBe("ROLLBACK");
    });

    it("does not rewrite an already-finalized submission on duplicate finalization", async () => {
      const submission = {
        id: "submission-1",
        user_id: "user-1",
        exercise_id: "exercise-1",
        status: "accepted",
      };
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [submission] })
        .mockResolvedValueOnce({ rows: [] });

      const result =
        await executionRepository.finalizeSubmissionWithProgress(finalization);

      expect(result).toEqual(submission);
      expect(clientQuery).toHaveBeenCalledTimes(3);
      expect(clientQuery.mock.calls[2][0]).toBe("COMMIT");
    });

    it("rolls back progress when a transactional write fails", async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "processing",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "submission-1",
              user_id: "user-1",
              exercise_id: "exercise-1",
              status: "accepted",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ enrollment_id: "enrollment-1", lesson_id: "lesson-1" }],
        })
        .mockRejectedValueOnce(new Error("attempt insert failed"))
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        executionRepository.finalizeSubmissionWithProgress(finalization),
      ).rejects.toThrow("attempt insert failed");

      expect(clientQuery.mock.calls.at(-1)[0]).toBe("ROLLBACK");
      expect(release).toHaveBeenCalledOnce();
    });
  });
});
