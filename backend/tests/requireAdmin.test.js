import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../src/database/pool.js", () => ({
  pool: { query },
}));

import { requireAdmin } from "../src/middleware/requireAdmin.js";



describe("requireAdmin middleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = { user: { id: "test-user-123" } };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  // The admin test belongs here.
  it("allows an admin to continue", async () => {
    query.mockResolvedValueOnce({
      rows: [{ is_admin: true }],
    });

    await requireAdmin(req, res, next);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("private.user_roles"),
      ["test-user-123"],
    );

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

it("denies a student", async () => {
  query.mockResolvedValueOnce({
    rows: [{ is_admin: false }],
  });

  await requireAdmin(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({
    error: "FORBIDDEN",
    message: "Administrator access required.",
  });
  expect(next).not.toHaveBeenCalled();
});

it("rejects a request without an authenticated user", async () => {
  req.user = undefined;

  await requireAdmin(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(query).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

it("passes database errors to Express error handling", async () => {
  const databaseError = new Error("Database unavailable");
  query.mockRejectedValueOnce(databaseError);

  await requireAdmin(req, res, next);

  expect(next).toHaveBeenCalledWith(databaseError);
  expect(res.status).not.toHaveBeenCalled();
});
});
