
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => {
  // Set these before authService.js is imported.
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  return {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  };
});
vi.mock("../src/config/supabase.js", () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  },
}));

import {
  signupUser,
  loginUser,
  requestPasswordReset,
  updatePassword,
  logoutUser,
  refreshSession,
} from "../src/modules/auth/authService.js";

const testUser = {
  id: "test-user-123",
  email: "student@example.com",
};

const testSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
};

const mockFetchResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

  vi.stubGlobal("fetch", vi.fn());

  mocks.signUp.mockResolvedValue({
    data: {
      user: testUser,
      session: testSession,
    },
    error: null,
  });

  mocks.signInWithPassword.mockResolvedValue({
    data: {
      user: testUser,
      session: testSession,
    },
    error: null,
  });

  mocks.resetPasswordForEmail.mockResolvedValue({
    data: {},
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// SIGNUP SERVICE
describe("signupUser", () => {
  it("creates an account and returns user and session", async () => {
    const input = {
      email: testUser.email,
      password: "StrongPass123",
      display_name: "Student One",
    };

    const result = await signupUser(input);

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.display_name,
        },
      },
    });

    expect(result).toEqual({
      user: testUser,
      session: testSession,
    });
  });

  it("throws when Supabase rejects signup", async () => {
    const authError = new Error("Email already registered");

    mocks.signUp.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: authError,
    });

    await expect(
      signupUser({
        email: testUser.email,
        password: "StrongPass123",
        display_name: "Student One",
      }),
    ).rejects.toBe(authError);
  });
});

// LOGIN SERVICE
describe("loginUser", () => {
  it("returns the user and session after successful login", async () => {
    const result = await loginUser({
      email: testUser.email,
      password: "StrongPass123",
    });

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: testUser.email,
      password: "StrongPass123",
    });

    expect(result).toEqual({
      user: testUser,
      session: testSession,
    });
  });

  it("throws when credentials are rejected", async () => {
    const authError = new Error("Invalid login credentials");

    mocks.signInWithPassword.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: authError,
    });

    await expect(
      loginUser({
        email: testUser.email,
        password: "WrongPassword123",
      }),
    ).rejects.toBe(authError);
  });
});

// PASSWORD RESET SERVICE
describe("requestPasswordReset", () => {
  it("requests a password reset email", async () => {
    await requestPasswordReset({
      email: testUser.email,
    });

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      testUser.email,
    );
  });

  it("throws when Supabase rejects the reset request", async () => {
    const authError = new Error("Reset request failed");

    mocks.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: authError,
    });

    await expect(
      requestPasswordReset({
        email: testUser.email,
      }),
    ).rejects.toBe(authError);
  });
});

// UPDATE PASSWORD SERVICE
describe("updatePassword", () => {
  it("updates the password through the Supabase Auth API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse(testUser),
    );

    const result = await updatePassword({
      accessToken: "test-access-token",
      password: "NewStrongPass123",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/user",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          apikey: "test-publishable-key",
          Authorization: "Bearer test-access-token",
        }),
        body: JSON.stringify({
          password: "NewStrongPass123",
        }),
      }),
    );

    expect(result).toEqual({
      user: testUser,
    });
  });

  it("preserves the status and code when Supabase returns an error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse(
        {
          message: "Invalid JWT",
          code: "bad_jwt",
        },
        401,
      ),
    );

    await expect(
      updatePassword({
        accessToken: "invalid-token",
        password: "NewStrongPass123",
      }),
    ).rejects.toMatchObject({
      message: "Invalid JWT",
      status: 401,
      code: "bad_jwt",
    });
  });

  it("normalizes a network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    await expect(
      updatePassword({
        accessToken: "test-access-token",
        password: "NewStrongPass123",
      }),
    ).rejects.toMatchObject({
      message: "Unable to reach the authentication service.",
      code: "AUTH_SERVICE_UNAVAILABLE",
    });
  });
});

// LOGOUT SERVICE
describe("logoutUser", () => {
  it("sends a logout request with the access token", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({}),
    );

    await logoutUser("test-access-token");

    expect(fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
        }),
      }),
    );
  });

  it("throws when Supabase rejects logout", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse(
        {
          message: "Invalid JWT",
          code: "bad_jwt",
        },
        401,
      ),
    );

    await expect(
      logoutUser("invalid-token"),
    ).rejects.toMatchObject({
      message: "Invalid JWT",
      status: 401,
      code: "bad_jwt",
    });
  });
});

// REFRESH SESSION SERVICE
describe("refreshSession", () => {
  it("returns the user and rotated session tokens", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        user: testUser,
        ...testSession,
        access_token: "rotated-access-token",
        refresh_token: "rotated-refresh-token",
      }),
    );

    const result = await refreshSession("old-refresh-token");

    expect(fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "test-publishable-key",
        }),
        body: JSON.stringify({
          refresh_token: "old-refresh-token",
        }),
      }),
    );

    expect(result).toEqual({
      user: testUser,
      session: {
        user: testUser,
        access_token: "rotated-access-token",
        refresh_token: "rotated-refresh-token",
        expires_in: 3600,
      },
    });
  });

  it("preserves the Supabase error status and code", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse(
        {
          message: "Invalid refresh token",
          code: "refresh_token_not_found",
        },
        400,
      ),
    );

    await expect(
      refreshSession("invalid-refresh-token"),
    ).rejects.toMatchObject({
      message: "Invalid refresh token",
      status: 400,
      code: "refresh_token_not_found",
    });
  });

  it("normalizes a network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    await expect(
      refreshSession("test-refresh-token"),
    ).rejects.toMatchObject({
      message: "Unable to reach the authentication service.",
      code: "AUTH_SERVICE_UNAVAILABLE",
    });
  });

  it("rejects a malformed successful response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        user: testUser,
        access_token: "access-token",
      }),
    );

    await expect(
      refreshSession("test-refresh-token"),
    ).rejects.toMatchObject({
      message: "Invalid session response from authentication service.",
      code: "INVALID_AUTH_SERVICE_RESPONSE",
    });
  });
});
