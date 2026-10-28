import {
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "./authValidation.js";

import {
  signupUser,
  loginUser,
  requestPasswordReset,
  updatePassword,
  logoutUser,
  refreshSession,
} from "./authService.js";

export async function signup(req, res, next) {
  const validation = signupSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const { user, session } = await signupUser(validation.data);

    if (!user) {
      return res.status(400).json({
        error: "SIGNUP_FAILED",
        message: "Unable to create account.",
      });
    }

    if (!session) {
      return res.status(201).json({
        message: "Account created. Check your email to confirm your account.",
        user: {
          id: user.id,
          email: user.email,
        },
        requiresEmailConfirmation: true,
      });
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("skillforge_access_token", session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: session.expires_in * 1000,
    });

    res.cookie("skillforge_refresh_token", session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user.id,
        email: user.email,
      },
      requiresEmailConfirmation: false,
    });
  } catch (error) {
    return next(error);
  }
}


export async function login(req, res, next) {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const { user, session } = await loginUser(validation.data);

    if (!user || !session) {
      return res.status(401).json({
        error: "LOGIN_FAILED",
        message: "Invalid email or password.",
      });
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("skillforge_access_token", session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: session.expires_in * 1000,
    });

    res.cookie("skillforge_refresh_token", session.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
}



export async function resetPassword(req, res, next) {
  const validation = resetPasswordSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    await requestPasswordReset(validation.data);


    return res.status(200).json({
      message:
        "If an account exists for that email, password reset instructions will be sent.",
    });
  } catch (error) {
    return next(error);
  }
}



export async function changePassword(req, res, next) {
  const validation = updatePasswordSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const accessToken = req.cookies?.skillforge_access_token;

    if (!accessToken) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const result = await updatePassword({
      accessToken,
      password: validation.data.password,
    });

    return res.status(200).json({
      message: "Password updated successfully.",
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
}



export async function logout(req, res, next) {
  try {
    const accessToken = req.cookies?.skillforge_access_token;

    if (accessToken) {
      await logoutUser(accessToken);
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    res.clearCookie("skillforge_access_token", cookieOptions);
    res.clearCookie("skillforge_refresh_token", cookieOptions);

    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function refreshSessionController(req, res, next) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  const clearAuthCookies = () => {
    res.clearCookie("skillforge_access_token", cookieOptions);
    res.clearCookie("skillforge_refresh_token", cookieOptions);
  };

  const refreshToken = req.cookies?.skillforge_refresh_token;

  if (!refreshToken) {
    clearAuthCookies();

    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Refresh token is missing. Please log in again.",
    });
  }

  try {
    const { user, session } = await refreshSession(refreshToken);

    if (
      !user ||
      !session?.access_token ||
      !session?.refresh_token ||
      !session?.expires_in
    ) {
      clearAuthCookies();

      return res.status(401).json({
        error: "INVALID_SESSION",
        message: "Session is invalid. Please log in again.",
      });
    }

    res.cookie("skillforge_access_token", session.access_token, {
      ...cookieOptions,
      maxAge: session.expires_in * 1000,
    });

    res.cookie("skillforge_refresh_token", session.refresh_token, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Session refreshed successfully.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    const isInvalidRefreshToken =
      error.status === 400 &&
      (
        error.code === "refresh_token_not_found" ||
        error.code === "refresh_token_already_used" ||
        error.code === "invalid_grant" ||
        /refresh token.*(invalid|expired|used|not found)|invalid.*refresh token/i.test(
          error.message,
        )
      );

    if (isInvalidRefreshToken) {
      clearAuthCookies();

      return res.status(401).json({
        error: "INVALID_SESSION",
        message: "Session expired. Please log in again.",
      });
    }

    return next(error);
  }
}
