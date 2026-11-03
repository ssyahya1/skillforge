import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

import { requireAuth } from "../../src/middleware/requireAuth.js";

vi.mock("../../src/middleware/requireAuth.js", () => ({
  requireAuth: vi.fn((req, res, next) => {
    if (req.headers.authorization === "Bearer test-token") {
      req.user = { id: "11111111-1111-4111-8111-111111111111" };
      return next();
    }

    return res.status(401).json({
      message: "Unauthorized",
    });
  }),
}));

vi.mock("../../src/modules/submissions/submissionService.js", () => ({
  createSubmissionService: vi.fn(),
  getSubmissionDetailsService: vi.fn(),
  getSubmissionHistoryService: vi.fn(),
  revealSolutionService: vi.fn(),
}));

import * as submissionService from "../../src/modules/submissions/submissionService.js";

const exerciseId = "22222222-2222-4222-8222-222222222222";
const submissionId = "33333333-3333-4333-8333-333333333333";
const languageId = "44444444-4444-4444-8444-444444444444";

const authHeader = {
  Authorization: "Bearer test-token",
};

describe("Submission API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated submission requests", async () => {
      const response = await request(app)
        .post(`/api/submissions/exercises/${exerciseId}/submissions`)
        .send({
          languageId,
          sourceCode: "console.log('Hello');",
        });

      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated submission history requests", async () => {
      const response = await request(app).get(
        `/api/submissions/exercises/${exerciseId}/submissions`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Create Submission", () => {
    it("should create a submission for an authenticated learner", async () => {
      submissionService.createSubmissionService.mockResolvedValue({
        id: submissionId,
        exercise_id: exerciseId,
        language_id: languageId,
        status: "queued",
      });

      const response = await request(app)
        .post(`/api/submissions/exercises/${exerciseId}/submissions`)
        .set(authHeader)
        .send({
          languageId,
          sourceCode: "console.log('Hello');",
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(submissionId);
      expect(response.body.status).toBe("queued");
    });

    it("should reject an invalid submission body", async () => {
      const response = await request(app)
        .post(`/api/submissions/exercises/${exerciseId}/submissions`)
        .set(authHeader)
        .send({
          languageId: "invalid-id",
          sourceCode: "",
        });

      expect(response.status).toBe(400);
    });

    it("should reject an invalid exercise ID", async () => {
      const response = await request(app)
        .post("/api/submissions/exercises/invalid-id/submissions")
        .set(authHeader)
        .send({
          languageId,
          sourceCode: "console.log('Hello');",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("Submission History", () => {
    it("should return submission history", async () => {
      submissionService.getSubmissionHistoryService.mockResolvedValue({
        submissions: [],
        pagination: {
          page: 1,
          limit: 10,
          totalSubmissions: 0,
          totalPages: 0,
        },
      });

      const response = await request(app)
        .get(`/api/submissions/exercises/${exerciseId}/submissions`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toEqual([]);
      expect(response.body.pagination.page).toBe(1);
    });
  });

  describe("Submission Details", () => {
    it("should return submission details", async () => {
      submissionService.getSubmissionDetailsService.mockResolvedValue({
        id: submissionId,
        status: "accepted",
        testResults: [],
      });

      const response = await request(app)
        .get(`/api/submissions/submissions/${submissionId}`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(submissionId);
      expect(response.body.status).toBe("accepted");
    });
  });

  describe("Solution Reveal", () => {
    it("should reveal a solution", async () => {
      submissionService.revealSolutionService.mockResolvedValue({
        solution: "console.log('Solution');",
      });

      const response = await request(app)
        .post(`/api/submissions/exercises/${exerciseId}/solutions/reveal`)
        .set(authHeader)
        .send({ languageId });

      expect(response.status).toBe(200);
      expect(response.body.solution).toBe("console.log('Solution');");
    });
  });
});

