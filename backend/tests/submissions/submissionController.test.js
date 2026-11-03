
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as submissionService from "../../src/modules/submissions/submissionService.js";
import {
  createSubmissionController,
  getSubmissionDetailsController,
  getSubmissionsHistoryController,
  revealSolutionController,
} from "../../src/modules/submissions/submissionController.js";

vi.mock("../../src/modules/submissions/submissionService.js", () => ({
  createSubmissionService: vi.fn(),
  getSubmissionDetailsService: vi.fn(),
  getSubmissionHistoryService: vi.fn(),
  revealSolutionService: vi.fn(),
}));

describe("Submission Controller", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: "user-123" },
      validatedParams: {},
      validatedQuery: {},
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe("createSubmissionController", () => {
    it("should create a submission and return 201", async () => {
      const submissionData = {
        languageId: "language-123",
        sourceCode: "console.log('Hello');",
      };

      const submission = { id: "submission-123", status: "queued" };

      req.validatedParams.exerciseId = "exercise-123";
      req.body = submissionData;

      submissionService.createSubmissionService.mockResolvedValue(submission);

      await createSubmissionController(req, res, next);

      expect(submissionService.createSubmissionService).toHaveBeenCalledWith(
        "user-123",
        "exercise-123",
        submissionData,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(submission);
      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Submission failed");

      req.validatedParams.exerciseId = "exercise-123";
      submissionService.createSubmissionService.mockRejectedValue(error);

      await createSubmissionController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getSubmissionDetailsController", () => {
    it("should return submission details with status 200", async () => {
      const submission = {
        id: "submission-123",
        status: "accepted",
        testResults: [],
      };

      req.validatedParams.submissionId = "submission-123";

      submissionService.getSubmissionDetailsService.mockResolvedValue(
        submission,
      );

      await getSubmissionDetailsController(req, res, next);

      expect(submissionService.getSubmissionDetailsService).toHaveBeenCalledWith(
        "user-123",
        "submission-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(submission);
      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Submission not found");

      req.validatedParams.submissionId = "submission-123";
      submissionService.getSubmissionDetailsService.mockRejectedValue(error);

      await getSubmissionDetailsController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getSubmissionsHistoryController", () => {
    it("should return submission history with status 200", async () => {
      const pagination = { page: 1, limit: 10 };
      const history = {
        submissions: [{ id: "submission-123", status: "accepted" }],
        pagination: {
          page: 1,
          limit: 10,
          totalSubmissions: 1,
          totalPages: 1,
        },
      };

      req.validatedParams.exerciseId = "exercise-123";
      req.validatedQuery = pagination;

      submissionService.getSubmissionHistoryService.mockResolvedValue(history);

      await getSubmissionsHistoryController(req, res, next);

      expect(submissionService.getSubmissionHistoryService).toHaveBeenCalledWith(
        "user-123",
        "exercise-123",
        pagination,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(history);
      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Exercise not found");

      req.validatedParams.exerciseId = "exercise-123";
      req.validatedQuery = { page: 1, limit: 10 };

      submissionService.getSubmissionHistoryService.mockRejectedValue(error);

      await getSubmissionsHistoryController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("revealSolutionController", () => {
    it("should reveal a solution and return status 200", async () => {
      const solution = {
        solution: "console.log('Solution');",
      };

      req.validatedParams.exerciseId = "exercise-123";
      req.body = { languageId: "language-123" };

      submissionService.revealSolutionService.mockResolvedValue(solution);

      await revealSolutionController(req, res, next);

      expect(submissionService.revealSolutionService).toHaveBeenCalledWith(
        "user-123",
        "exercise-123",
        "language-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(solution);
      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Not enough failed attempts");

      req.validatedParams.exerciseId = "exercise-123";
      req.body = { languageId: "language-123" };

      submissionService.revealSolutionService.mockRejectedValue(error);

      await revealSolutionController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

