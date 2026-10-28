
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../src/config/supabase.js", () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}));

vi.mock("../src/database/pool.js", () => ({
  pool: { query: mocks.query },
}));

import app from "../src/app.js";

const testUser = {
  id: "test-admin-123",
  email: "admin@example.com",
};

const accessToken = "test-access-token";
const courseId = "550e8400-e29b-41d4-a716-446655440000";

const validCourse = {
  title: "JavaScript Fundamentals",
  slug: "javascript-fundamentals",
  description: "Learn the fundamentals of JavaScript programming.",
  language: "javascript",
  difficulty: "beginner",
  access_tier: "free",
};

const courseDetails = {
  id: courseId,
  ...validCourse,
  status: "draft",
  created_by: testUser.id,
};

const createdCourse = {
  id: "course-123",
  ...validCourse,
  status: "draft",
  created_by: testUser.id,
};

const cookie = `skillforge_access_token=${accessToken}`;

const authenticatedAdmin = () => {
  mocks.getUser.mockResolvedValueOnce({
    data: { user: testUser },
    error: null,
  });

  // First database query checks the admin role.
  mocks.query.mockResolvedValueOnce({
    rows: [{ is_admin: true }],
  });
};

const authenticatedNonAdmin = () => {
  mocks.getUser.mockResolvedValueOnce({
    data: { user: testUser },
    error: null,
  });

  mocks.query.mockResolvedValueOnce({
    rows: [{ is_admin: false }],
  });
};

const withAuth = (req) => req.set("Cookie", cookie);

beforeEach(() => {
  vi.clearAllMocks();
});

// --------------------------------------------------
// CREATE COURSE
// POST /api/admin/courses
// --------------------------------------------------

describe("POST /api/admin/courses", () => {

it("returns 409 when the course slug already exists", async () => {
  authenticatedAdmin();

  mocks.query.mockRejectedValueOnce({
    code: "23505",
    constraint: "courses_slug_key",
  });

  const res = await withAuth(
    request(app).post("/api/admin/courses"),
  ).send(validCourse);

  expect(res.status).toBe(409);
  expect(res.body).toEqual({
    error: "CONFLICT",
    message: "A course with this slug already exists.",
  });

  expect(mocks.query).toHaveBeenCalledTimes(2);
});

  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .post("/api/admin/courses")
      .send(validCourse);

    expect(res.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(
      request(app).post("/api/admin/courses"),
    ).send(validCourse);

    expect(res.status).toBe(403);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid course data", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).post("/api/admin/courses"),
    ).send({ ...validCourse, language: "ruby" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("creates a course successfully", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [createdCourse] });

    const res = await withAuth(
      request(app).post("/api/admin/courses"),
    ).send(validCourse);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(createdCourse);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.query.mock.calls[1][0]).toContain(
      "INSERT INTO public.courses",
    );
    expect(mocks.query.mock.calls[1][1]).toEqual([
      validCourse.title,
      validCourse.slug,
      validCourse.description,
      validCourse.language,
      validCourse.difficulty,
      validCourse.access_tier,
      testUser.id,
    ]);
  });

  it("returns 500 when creation fails", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(new Error("Database unavailable"));

    const res = await withAuth(
      request(app).post("/api/admin/courses"),
    ).send(validCourse);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("INTERNAL_SERVER_ERROR");
  });
});

// --------------------------------------------------
// LIST COURSES
// GET /api/admin/courses
// --------------------------------------------------

describe("GET /api/admin/courses", () => {
  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/admin/courses");

    expect(res.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(
      request(app).get("/api/admin/courses"),
    );

    expect(res.status).toBe(403);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid query parameters", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).get("/api/admin/courses?limit=100"),
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("returns courses and pagination metadata", async () => {
    authenticatedAdmin();

    const rows = [courseDetails];

    mocks.query.mockResolvedValueOnce({ rows });
    mocks.query.mockResolvedValueOnce({ rows: [{ count: "1" }] });

    const res = await withAuth(
      request(app).get(
        "/api/admin/courses?page=1&limit=10&language=javascript&status=draft",
      ),
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: rows,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(mocks.query.mock.calls[1][0]).toContain(
      "SELECT * FROM public.courses",
    );
    expect(mocks.query.mock.calls[1][0]).toContain("language = $1");
    expect(mocks.query.mock.calls[1][0]).toContain("status = $2");
    expect(mocks.query.mock.calls[1][1]).toEqual([
      "javascript",
      "draft",
      10,
      0,
    ]);
  });

  it("returns 500 when fetching courses fails", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(new Error("Database unavailable"));

    const res = await withAuth(
      request(app).get("/api/admin/courses"),
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("INTERNAL_SERVER_ERROR");
  });
});

// --------------------------------------------------
// COURSE DETAILS
// GET /api/admin/courses/:courseId
// --------------------------------------------------

describe("GET /api/admin/courses/:courseId", () => {
  it("returns 401 without authentication", async () => {
    const res = await request(app).get(
      `/api/admin/courses/${courseId}`,
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(
      request(app).get(`/api/admin/courses/${courseId}`),
    );

    expect(res.status).toBe(403);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("returns course details", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [courseDetails] });

    const res = await withAuth(
      request(app).get(`/api/admin/courses/${courseId}`),
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(courseDetails);
    expect(mocks.query.mock.calls[1][0]).toContain(
      "SELECT * FROM public.courses",
    );
    expect(mocks.query.mock.calls[1][1]).toEqual([courseId]);
  });

  it("returns 400 for an invalid course ID", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).get("/api/admin/courses/not-a-uuid"),
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the course does not exist", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const res = await withAuth(
      request(app).get(`/api/admin/courses/${courseId}`),
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "NOT_FOUND",
      message: "Course not found.",
    });
  });

  it("returns 500 when the database query fails", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(new Error("Database unavailable"));

    const res = await withAuth(
      request(app).get(`/api/admin/courses/${courseId}`),
    );

    expect(res.status).toBe(500);
  });
});

// --------------------------------------------------
// UPDATE COURSE
// PATCH /api/admin/courses/:courseId
// --------------------------------------------------

describe("PATCH /api/admin/courses/:courseId", () => {
  it("updates a course successfully", async () => {
    authenticatedAdmin();

    const updated = {
      ...courseDetails,
      title: "Advanced JavaScript Fundamentals",
    };

    mocks.query.mockResolvedValueOnce({ rows: [updated] });

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({ title: updated.title });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ title: updated.title }),
    );
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .patch(`/api/admin/courses/${courseId}`)
      .send({ title: "Updated title" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({ title: "Updated title" });

    expect(res.status).toBe(403);
  });

  it("rejects an empty update body", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({});

    expect(res.status).toBe(400);
  });

  it("rejects an invalid course ID", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).patch("/api/admin/courses/not-a-uuid"),
    ).send({ title: "Updated title" });

    expect(res.status).toBe(400);
  });

  it("rejects invalid field values", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({ language: "ruby" });

    expect(res.status).toBe(400);
  });

  it("rejects unknown fields", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({ unexpectedField: "value" });

    expect(res.status).toBe(400);
  });

  it("returns 404 when the course does not exist", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({ title: "Updated title" });

    expect(res.status).toBe(404);
  });

  it("returns 500 when the update fails", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(
      new Error("Database update failed"),
    );

    const res = await withAuth(
      request(app).patch(`/api/admin/courses/${courseId}`),
    ).send({ title: "Updated title" });

    expect(res.status).toBe(500);
  });
});

// --------------------------------------------------
// PUBLISH COURSE
// POST /api/admin/courses/:courseId/publish
// --------------------------------------------------

describe("POST /api/admin/courses/:courseId/publish", () => {
  const endpoint = `/api/admin/courses/${courseId}/publish`;

  it("publishes a course successfully", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, status: "published" }],
    });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("published");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).post(endpoint);

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(403);
  });

  it("rejects an invalid course ID", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).post("/api/admin/courses/not-a-uuid/publish"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when the course does not exist", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(404);
  });

  it("returns 409 when the course is already published", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, status: "published" }],
    });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Course is already published.");
  });

  it("returns 500 when publishing fails due to a database error", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(500);
  });
});

// --------------------------------------------------
// ARCHIVE COURSE
// POST /api/admin/courses/:courseId/archive
// --------------------------------------------------

describe("POST /api/admin/courses/:courseId/archive", () => {
  const endpoint = `/api/admin/courses/${courseId}/archive`;

  it("archives a published course successfully", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, status: "archived" }],
    });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("archived");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).post(endpoint);

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(403);
  });

  it("rejects an invalid course ID", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).post("/api/admin/courses/not-a-uuid/archive"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when the course does not exist", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(404);
  });

  it("returns 409 when attempting to archive a draft course", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, status: "draft" }],
    });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "Cannot archive a course with status 'draft'.",
    );
  });

  it("returns 409 when the course is already archived", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, status: "archived" }],
    });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Course is already archived.");
  });

  it("returns 500 when archiving fails due to a database error", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(500);
  });
});

// --------------------------------------------------
// SOFT-DELETE COURSE
// DELETE /api/admin/courses/:courseId
// --------------------------------------------------

describe("DELETE /api/admin/courses/:courseId", () => {
  const endpoint = `/api/admin/courses/${courseId}`;

  it("soft-deletes a course successfully", async () => {
    authenticatedAdmin();

    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, deleted_at: new Date().toISOString() }],
    });

    const res = await withAuth(request(app).delete(endpoint));

    expect(res.status).toBe(200);
    expect(mocks.query.mock.calls[1][0]).toContain(
      "deleted_at = NOW()",
    );
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).delete(endpoint);

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(request(app).delete(endpoint));

    expect(res.status).toBe(403);
  });

  it("rejects an invalid course ID", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).delete("/api/admin/courses/not-a-uuid"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when the course does not exist", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const res = await withAuth(request(app).delete(endpoint));

    expect(res.status).toBe(404);
  });

  it("returns 500 when deletion fails due to a database error", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    const res = await withAuth(request(app).delete(endpoint));

    expect(res.status).toBe(500);
  });
});

// --------------------------------------------------
// RESTORE COURSE
// POST /api/admin/courses/:courseId/restore
// --------------------------------------------------

describe("POST /api/admin/courses/:courseId/restore", () => {
  const endpoint = `/api/admin/courses/${courseId}/restore`;

  it("restores a soft-deleted course successfully", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...courseDetails, deleted_at: null }],
    });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(200);
    expect(res.body.deleted_at).toBeNull();
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).post(endpoint);

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    authenticatedNonAdmin();

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(403);
  });

  it("rejects an invalid course ID", async () => {
    authenticatedAdmin();

    const res = await withAuth(
      request(app).post("/api/admin/courses/not-a-uuid/restore"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when the course cannot be restored", async () => {
    authenticatedAdmin();
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(404);
  });

  it("returns 500 when restoration fails due to a database error", async () => {
    authenticatedAdmin();
    mocks.query.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    const res = await withAuth(request(app).post(endpoint));

    expect(res.status).toBe(500);
  });
});
