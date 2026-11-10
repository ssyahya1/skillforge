const DEFAULT_API_URL = "http://127.0.0.1:2358";
const DEFAULT_AUTH_HEADER = "X-Judge0-Token";
export const JUDGE0_REQUEST_TIMEOUT_MS = 15_000;

function createRequestTimeoutError(method, timeoutMs) {
  const error = new Error(
    `Judge0 ${method} request timed out after ${timeoutMs}ms.`,
  );
  error.code =
    method === "POST" ? "JUDGE0_POST_TIMEOUT" : "JUDGE0_GET_TIMEOUT";
  return error;
}

async function fetchWithTimeout(url, options, method, timeoutMs) {
  const controller = new AbortController();
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(createRequestTimeoutError(method, timeoutMs));
    }, timeoutMs);
  });

  const requestPromise = (async () => {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (method === "GET") {
        throw new Error(
          `Failed to fetch Judge0 submission: HTTP ${response.status}`,
        );
      }

      const errorBody = await response.text();
      throw new Error(
        `Judge0 submission failed with HTTP ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    return response.json();
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    if (controller.signal.aborted && error?.code !== "JUDGE0_POST_TIMEOUT") {
      throw createRequestTimeoutError(method, timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const LANGUAGE_MAP = {
  javascript: Number(process.env.JUDGE0_JAVASCRIPT_LANGUAGE_ID) || 63,
  python: Number(process.env.JUDGE0_PYTHON_LANGUAGE_ID) || 71,
  cpp: Number(process.env.JUDGE0_CPP_LANGUAGE_ID) || 54,
};

export function getJudge0Config() {
  const authToken = process.env.JUDGE0_AUTH_TOKEN?.trim();

  if (!authToken) {
    throw new Error("JUDGE0_AUTH_TOKEN is required");
  }

  return {
    apiUrl: process.env.JUDGE0_API_URL || DEFAULT_API_URL,
    authToken,
    authHeader: process.env.JUDGE0_AUTH_HEADER || DEFAULT_AUTH_HEADER,
  };
}

export function resolveLanguageId(language) {
  if (
    typeof language === "number" &&
    Number.isInteger(language) &&
    language > 0
  ) {
    return language;
  }

  if (typeof language === "string") {
    const normalized = language.trim().toLowerCase();
    const resolved = LANGUAGE_MAP[normalized];
    if (resolved) {
      return resolved;
    }
  }

  throw new Error(`Unsupported execution language: ${language}`);
}

export function parseJudge0Status(result) {
  const statusId = result?.status?.id;

  switch (statusId) {
    case 3:
      return "passed";
    case 4:
      return "failed";
    case 5:
      return "time_limit_exceeded";
    case 6:
      return "compilation_error";
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
      return "runtime_error";
    case 12:
      if (
        result?.message?.toLowerCase().includes("memory") ||
        result?.stderr?.toLowerCase().includes("memory")
      ) {
        return "memory_limit_exceeded";
      }
      return "runtime_error";
    default:
      return "internal_error";
  }
}

export function buildHeaders(config = getJudge0Config()) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (config.authToken) {
    headers[config.authHeader] = config.authToken;
  }

  return headers;
}

export async function submitToJudge0({
  sourceCode,
  language,
  stdin,
  expectedOutput,
  onSubmissionToken,
  cpuTimeLimit,
  memoryLimit,
}) {
  const config = getJudge0Config();
  const languageId = resolveLanguageId(language);

  const payload = {
    source_code: sourceCode,
    language_id: languageId,
  };

  if (stdin !== undefined && stdin !== null) {
    payload.stdin =
      typeof stdin === "object" ? JSON.stringify(stdin) : String(stdin);
  }

  if (expectedOutput !== undefined && expectedOutput !== null) {
    payload.expected_output =
      typeof expectedOutput === "object"
        ? JSON.stringify(expectedOutput)
        : String(expectedOutput);
  }

  if (cpuTimeLimit) {
    payload.cpu_time_limit = cpuTimeLimit;
  }

  if (memoryLimit) {
    payload.memory_limit = memoryLimit;
  }

  const result = await fetchWithTimeout(
    `${config.apiUrl}/submissions?base64_encoded=false&wait=true`,
    {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(payload),
    },
    "POST",
    JUDGE0_REQUEST_TIMEOUT_MS,
  );

  if (result.token && onSubmissionToken) {
    await onSubmissionToken(result.token);
  }

  if (result.status && result.status.id <= 2) {
    if (!result.token) {
      throw Object.assign(
        new Error("Judge0 accepted the submission without returning a token."),
        { code: "JUDGE0_POST_AMBIGUOUS" },
      );
    }

    return await pollSubmission(result.token, config);
  }

  return result;
}

export async function pollSubmission(
  token,
  config = getJudge0Config(),
  maxAttempts = 10,
  intervalMs = 500,
  timeoutMs = JUDGE0_REQUEST_TIMEOUT_MS,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const data = await fetchWithTimeout(
      `${config.apiUrl}/submissions/${token}?base64_encoded=false`,
      {
        method: "GET",
        headers: buildHeaders(config),
      },
      "GET",
      timeoutMs,
    );

    if (data.status && data.status.id > 2) {
      return data;
    }
  }

  throw new Error("Judge0 submission timed out while waiting for result.");
}
