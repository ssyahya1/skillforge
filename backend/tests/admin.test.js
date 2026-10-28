
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../src/config/supabase.js", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

vi.mock("../src/database/pool.js", () => ({
  pool: {
    query: mocks.query,
  },
}));

import app from "../src/app.js";

const testUser = {
  id: "test-user-123",
  email: "admin@example.com",
};

const accessToken = "test-access-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/me", () => {
  it("returns 401 when no access cookie is provided", async () => {
    const response = await request(app).get("/api/admin/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("UNAUTHORIZED");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns 401 when the access token is invalid", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Invalid token"),
    });

    const response = await request(app)
      .get("/api/admin/me")
      .set("Cookie", `skillforge_access_token=${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_SESSION");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns 403 when an authenticated user is not an admin", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: testUser },
      error: null,
    });

    mocks.query.mockResolvedValueOnce({
      rows: [{ is_admin: false }],
    });

    const response = await request(app)
      .get("/api/admin/me")
      .set("Cookie", `skillforge_access_token=${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("private.user_roles"),
      [testUser.id],
    );
  });

  it("returns 200 for an authenticated admin", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: testUser },
      error: null,
    });

    mocks.query.mockResolvedValueOnce({
      rows: [{ is_admin: true }],
    });

    const response = await request(app)
      .get("/api/admin/me")
      .set("Cookie", `skillforge_access_token=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Admin profile retrieved successfully.",
      user: {
        id: testUser.id,
        email: testUser.email,
      },
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("private.user_roles"),
      [testUser.id],
    );
  });

  it("returns 500 when the database role lookup fails", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: testUser },
      error: null,
    });

    mocks.query.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .get("/api/admin/me")
      .set("Cookie", `skillforge_access_token=${accessToken}`);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
  });
});
