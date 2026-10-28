
import { supabase } from "../../config/supabase.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;


export async function authenticatedAuthRequest({
  path,
  method = "POST",
  accessToken,
  body,
}) {
  if (!supabaseUrl || !supabaseKey) {
    const error = new Error(
      "Authentication service configuration is missing.",
    );
    error.code = "AUTH_SERVICE_MISCONFIGURED";
    throw error;
  }

  let response;

  try {
    response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/${path}`,
      {
        method,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined
          ? {}
          : { body: JSON.stringify(body) }),
      },
    );
  } catch (cause) {
    const error = new Error(
      "Unable to reach the authentication service.",
    );
    error.code = "AUTH_SERVICE_UNAVAILABLE";
    error.cause = cause;
    throw error;
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.msg ||
        data?.message ||
        data?.error_description ||
        data?.error ||
        "Supabase Auth request failed.",
    );

    error.status = response.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}


export async function signupUser({ email, password, display_name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name },
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    session: data.session,
  };
}


export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    session: data.session,
  };
}


export async function requestPasswordReset({ email }) {
  const { data, error } =
    await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw error;
  }

  return data;
}


export async function updatePassword({ accessToken, password }) {
  const user = await authenticatedAuthRequest({
    path: "user",
    method: "PUT",
    accessToken,
    body: { password },
  });

  return { user };
}


export async function logoutUser(accessToken) {
  return authenticatedAuthRequest({
    path: "logout",
    method: "POST",
    accessToken,
  });
}

export async function refreshSession(refreshToken) {
  let response;

  try {
    response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      },
    );
  } catch (cause) {
    const error = new Error("Unable to reach the authentication service.");
    error.code = "AUTH_SERVICE_UNAVAILABLE";
    error.cause = cause;
    throw error;
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.msg ||
        data?.message ||
        data?.error_description ||
        data?.error ||
        "Unable to refresh session.",
    );

    error.status = response.status;
    error.code = data?.code;
    error.authError = data;

    throw error;
  }

  if (!data?.user || !data?.access_token || !data?.refresh_token) {
    const error = new Error("Invalid session response from authentication service.");
    error.code = "INVALID_AUTH_SERVICE_RESPONSE";
    throw error;
  }

  return {
    user: data.user,
    session: data,
  };
}
