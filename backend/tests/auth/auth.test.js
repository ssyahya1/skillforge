import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  signupUser: vi.fn(),
  loginUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  logoutUser: vi.fn(),
  refreshSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("../../src/modules/auth/authService.js", () => ({
  signupUser: mocks.signupUser,
  loginUser: mocks.loginUser,
  requestPasswordReset: mocks.requestPasswordReset,
  updatePassword: mocks.updatePassword,
  logoutUser: mocks.logoutUser,
  refreshSession: mocks.refreshSession,
}));

vi.mock("../../src/config/supabase.js", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

import app from "../../src/app.js";

const validSignup = {
  email: "student@example.com",
  password: "StrongPass123",
  display_name: "Student One",
};

const testUser = {
  id: "test-user-123",
  email: "student@example.com",
};

const testSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
};

function getCookies(response) {
  const cookies = response.headers["set-cookie"] ?? [];
  return Array.isArray(cookies) ? cookies : [cookies];
}

function findCookie(cookies, name) {
  return cookies.find((cookie) => cookie.startsWith(`${name}=`));
}

function expectAuthCookies(response) {
  const cookies = getCookies(response);

  const accessCookie = findCookie(cookies, "skillforge_access_token");
  const refreshCookie = findCookie(cookies, "skillforge_refresh_token");

  for (const cookie of [accessCookie, refreshCookie]) {
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  }
}

function expectClearedAuthCookies(response) {
  const cookies = getCookies(response);

  expect(
    cookies.some((cookie) => cookie.startsWith("skillforge_access_token=;")),
  ).toBe(true);

  expect(
    cookies.some((cookie) => cookie.startsWith("skillforge_refresh_token=;")),
  ).toBe(true);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();

  mocks.signupUser.mockResolvedValue({
    user: testUser,
    session: testSession,
  });

  mocks.loginUser.mockResolvedValue({
    user: testUser,
    session: testSession,
  });

  mocks.requestPasswordReset.mockResolvedValue({});
  mocks.updatePassword.mockResolvedValue({ user: testUser });
  mocks.logoutUser.mockResolvedValue({});

  mocks.refreshSession.mockResolvedValue({
    user: testUser,
    session: testSession,
  });

  mocks.getUser.mockResolvedValue({
    data: { user: testUser },
    error: null,
  });
});

describe("POST /api/auth/signup", () => {
  it("creates an account and sets authentication cookies", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignup);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Account created successfully.");
    expect(response.body.user).toEqual(testUser);
    expect(response.body.requiresEmailConfirmation).toBe(false);

    expect(mocks.signupUser).toHaveBeenCalledWith(validSignup);
    expectAuthCookies(response);
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        ...validSignup,
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.signupUser).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied role", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        ...validSignup,
        role: "admin",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.signupUser).not.toHaveBeenCalled();
  });

  it("handles signup when email confirmation is required", async () => {
    mocks.signupUser.mockResolvedValue({
      user: testUser,
      session: null,
    });

    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignup);

    expect(response.status).toBe(201);
    expect(response.body.requiresEmailConfirmation).toBe(true);
    expect(getCookies(response)).toHaveLength(0);
  });

  it("returns an error if signup does not provide a user", async () => {
    mocks.signupUser.mockResolvedValue({
      user: null,
      session: null,
    });

    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignup);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("SIGNUP_FAILED");
  });
});

describe("POST /api/auth/login", () => {
  it("sets Secure on authentication cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: validSignup.email,
        password: validSignup.password,
      });

    expect(response.status).toBe(200);

    const cookies = getCookies(response);

    for (const name of [
      "skillforge_access_token",
      "skillforge_refresh_token",
    ]) {
      const cookie = findCookie(cookies, name);

      expect(cookie).toBeDefined();
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
    }
  });

  it("logs in and sets authentication cookies", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: validSignup.email,
      password: validSignup.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful.");
    expect(response.body.user).toEqual(testUser);
    expectAuthCookies(response);
  });

  it("rejects invalid login input", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "invalid-email",
      password: "password",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.loginUser).not.toHaveBeenCalled();
  });

  it("rejects a login without a valid session", async () => {
    mocks.loginUser.mockResolvedValue({
      user: null,
      session: null,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: validSignup.email,
      password: validSignup.password,
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("LOGIN_FAILED");
  });
  it("does not expose raw Supabase errors", async () => {
    mocks.loginUser.mockRejectedValue(
      Object.assign(new Error("Internal Supabase database details"), {
        status: 400,
        code: "unexpected_internal_error",
      }),
    );

    const response = await request(app).post("/api/auth/login").send({
      email: validSignup.email,
      password: validSignup.password,
    });

    expect(response.status).not.toBe(500);
    expect(response.text).not.toContain("Internal Supabase database details");
  });
});

describe("POST /api/auth/reset-password", () => {
  it("accepts a valid reset request", async () => {
    const response = await request(app).post("/api/auth/reset-password").send({
      email: validSignup.email,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("If an account exists");

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
      email: validSignup.email,
    });
  });

  it("rejects an invalid reset email", async () => {
    const response = await request(app).post("/api/auth/reset-password").send({
      email: "bad-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current authenticated user", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "skillforge_access_token=test-access-token");

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(testUser);

    expect(mocks.getUser).toHaveBeenCalledWith("test-access-token");
  });

  it("rejects a request without an access cookie", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("UNAUTHORIZED");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid access token", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid token"),
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "skillforge_access_token=invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_SESSION");
  });

  it("rejects an expired access token", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("JWT expired"),
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "skillforge_access_token=expired-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_SESSION");
  });

  it("rejects a revoked access token", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Session revoked"),
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "skillforge_access_token=revoked-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_SESSION");
  });
});

describe("PATCH /api/auth/password", () => {
  it("changes the password for an authenticated user", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", "skillforge_access_token=test-access-token")
      .send({
        password: "NewStrongPass123",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password updated successfully.");

    expect(mocks.updatePassword).toHaveBeenCalledWith({
      accessToken: "test-access-token",
      password: "NewStrongPass123",
    });
  });

  it("rejects a password that is too short", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", "skillforge_access_token=test-access-token")
      .send({
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects a request without authentication", async () => {
    const response = await request(app).patch("/api/auth/password").send({
      password: "NewStrongPass123",
    });

    expect(response.status).toBe(401);
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the session and clears both cookies", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set(
        "Cookie",
        "skillforge_access_token=test-access-token; skillforge_refresh_token=test-refresh-token",
      );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Logged out successfully.");

    expect(mocks.logoutUser).toHaveBeenCalledWith("test-access-token");

    expectClearedAuthCookies(response);
  });

  it("clears cookies even if no access cookie is supplied", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(mocks.logoutUser).not.toHaveBeenCalled();

    expectClearedAuthCookies(response);
  });

  it("revokes a refresh-backed session when the access cookie is missing", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "skillforge_refresh_token=test-refresh-token");

    expect(response.status).toBe(200);
    expect(mocks.refreshSession).toHaveBeenCalledWith("test-refresh-token");
    expect(mocks.logoutUser).toHaveBeenCalledWith(testSession.access_token);
    expectClearedAuthCookies(response);
  });

  it("clears cookies when the refresh token is already invalid", async () => {
    mocks.refreshSession.mockRejectedValue(
      Object.assign(new Error("Invalid refresh token"), {
        status: 400,
        code: "refresh_token_not_found",
      }),
    );

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "skillforge_refresh_token=invalid-refresh-token");

    expect(response.status).toBe(200);
    expect(mocks.logoutUser).not.toHaveBeenCalled();
    expectClearedAuthCookies(response);
  });

  it("does not report logout success when refresh service is unavailable", async () => {
    mocks.refreshSession.mockRejectedValue(
      new Error("Internal Supabase details"),
    );

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "skillforge_refresh_token=test-refresh-token");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
    expect(response.text).not.toContain("Internal Supabase details");
    expectClearedAuthCookies(response);
  });

  it("does not report success when session revocation fails", async () => {
    mocks.logoutUser.mockRejectedValue(
      new Error("Internal Supabase details"),
    );

    const response = await request(app)
      .post("/api/auth/logout")
      .set(
        "Cookie",
        "skillforge_access_token=test-access-token; skillforge_refresh_token=test-refresh-token",
      );

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
    expect(response.body.message).toBe("An unexpected error occurred.");
    expect(response.text).not.toContain("Internal Supabase details");
    expectClearedAuthCookies(response);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rotates tokens and sets updated authentication cookies", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "skillforge_refresh_token=test-refresh-token");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Session refreshed successfully.");
    expect(response.body.user).toEqual(testUser);

    expect(mocks.refreshSession).toHaveBeenCalledWith("test-refresh-token");

    expectAuthCookies(response);
  });

  it("rejects a request without a refresh cookie", async () => {
    const response = await request(app).post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("UNAUTHORIZED");
    expect(mocks.refreshSession).not.toHaveBeenCalled();

    expectClearedAuthCookies(response);
  });

  it("rejects a refresh response without a user or session", async () => {
    mocks.refreshSession.mockResolvedValue({
      user: null,
      session: null,
    });

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "skillforge_refresh_token=invalid-refresh-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_SESSION");

    expectClearedAuthCookies(response);
  });

  it("clears both cookies when the refresh token is invalid", async () => {
    mocks.refreshSession.mockRejectedValue(
      Object.assign(new Error("Invalid refresh token"), {
        status: 400,
        code: "refresh_token_not_found",
      }),
    );

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "skillforge_refresh_token=invalid-refresh-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_SESSION");

    expectClearedAuthCookies(response);
  });

  it("returns a server error when the auth service is unavailable", async () => {
    mocks.refreshSession.mockRejectedValue(
      Object.assign(new Error("Unable to reach the authentication service."), {
        code: "AUTH_SERVICE_UNAVAILABLE",
      }),
    );

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "skillforge_refresh_token=test-refresh-token");

    expect(response.status).toBe(500);
    expect(response.text).not.toContain(
      "Unable to reach the authentication service.",
    );
    expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
    expect(response.body.message).toBe("An unexpected error occurred.");

    expect(getCookies(response)).toHaveLength(0);
  });
  it("handles concurrent refresh requests without exposing internal errors", async () => {
    mocks.refreshSession.mockResolvedValue({
      user: testUser,
      session: {
        access_token: "rotated-access-token",
        refresh_token: "rotated-refresh-token",
        expires_in: 3600,
      },
    });

    const responses = await Promise.all([
      request(app)
        .post("/api/auth/refresh")
        .set("Cookie", "skillforge_refresh_token=test-refresh-token"),

      request(app)
        .post("/api/auth/refresh")
        .set("Cookie", "skillforge_refresh_token=test-refresh-token"),
    ]);

    expect(responses).toHaveLength(2);

    for (const response of responses) {
      expect([200, 401, 500]).toContain(response.status);
      expect(response.text).not.toContain("Internal Supabase");
    }

    expect(mocks.refreshSession).toHaveBeenCalledTimes(2);
  });
});
