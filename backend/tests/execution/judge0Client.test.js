import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveLanguageId,
  parseJudge0Status,
  buildHeaders,
  submitToJudge0,
  pollSubmission,
  getJudge0Config,
  LANGUAGE_MAP,
} from "../../src/modules/execution/judge0Client.js";

describe("judge0Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveLanguageId", () => {
    it("should resolve valid language names", () => {
      expect(resolveLanguageId("javascript")).toBe(63);
      expect(resolveLanguageId("python")).toBe(71);
      expect(resolveLanguageId("cpp")).toBe(54);
    });

    it("should accept case-insensitive language names with whitespace", () => {
      expect(resolveLanguageId("  JavaScript  ")).toBe(63);
      expect(resolveLanguageId("PYTHON")).toBe(71);
    });

    it("should accept numeric language IDs directly", () => {
      expect(resolveLanguageId(93)).toBe(93);
      expect(resolveLanguageId(102)).toBe(102);
    });

    it("should throw for unsupported languages", () => {
      expect(() => resolveLanguageId("ruby")).toThrow(
        "Unsupported execution language: ruby",
      );
      expect(() => resolveLanguageId("")).toThrow();
    });
  });

  describe("parseJudge0Status", () => {
    it("should map accepted status to passed", () => {
      expect(parseJudge0Status({ status: { id: 3 } })).toBe("passed");
    });

    it("should map wrong answer to failed", () => {
      expect(parseJudge0Status({ status: { id: 4 } })).toBe("failed");
    });

    it("should map time limit exceeded", () => {
      expect(parseJudge0Status({ status: { id: 5 } })).toBe(
        "time_limit_exceeded",
      );
    });

    it("should map compilation error", () => {
      expect(parseJudge0Status({ status: { id: 6 } })).toBe(
        "compilation_error",
      );
    });

    it("should map runtime errors (ids 7 to 11)", () => {
      expect(parseJudge0Status({ status: { id: 7 } })).toBe("runtime_error");
      expect(parseJudge0Status({ status: { id: 11 } })).toBe("runtime_error");
    });

    it("should map id 12 to memory_limit_exceeded if message contains memory", () => {
      expect(
        parseJudge0Status({
          status: { id: 12 },
          message: "Out of memory",
        }),
      ).toBe("memory_limit_exceeded");

      expect(
        parseJudge0Status({
          status: { id: 12 },
          stderr: "Fatal error: memory limit reached",
        }),
      ).toBe("memory_limit_exceeded");
    });

    it("should map id 12 to runtime_error if no memory indication", () => {
      expect(
        parseJudge0Status({
          status: { id: 12 },
          message: "Exited with code 1",
        }),
      ).toBe("runtime_error");
    });

    it("should map unknown/internal status to internal_error", () => {
      expect(parseJudge0Status({ status: { id: 13 } })).toBe("internal_error");
      expect(parseJudge0Status(null)).toBe("internal_error");
    });
  });

  describe("buildHeaders", () => {
    it("should return content-type and auth header", () => {
      const config = {
        authToken: "test-token",
        authHeader: "X-Auth-Token",
      };
      const headers = buildHeaders(config);
      expect(headers).toEqual({
        "Content-Type": "application/json",
        "X-Auth-Token": "test-token",
      });
    });

    it("should omit auth header when token is null", () => {
      const config = {
        authToken: null,
        authHeader: "X-Auth-Token",
      };
      const headers = buildHeaders(config);
      expect(headers).toEqual({
        "Content-Type": "application/json",
      });
    });
  });

  describe("submitToJudge0", () => {
    it("should submit code and return completed result immediately when status > 2", async () => {
      const mockResult = {
        token: "job-123",
        status: { id: 3, description: "Accepted" },
        stdout: "Hello\n",
        time: "0.012",
        memory: 1024,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const result = await submitToJudge0({
        sourceCode: "console.log('Hello');",
        language: "javascript",
        stdin: "input",
        expectedOutput: "Hello\n",
        cpuTimeLimit: 2,
        memoryLimit: 128000,
      });

      expect(result).toEqual(mockResult);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/submissions?base64_encoded=false&wait=true"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            source_code: "console.log('Hello');",
            language_id: 63,
            stdin: "input",
            expected_output: "Hello\n",
            cpu_time_limit: 2,
            memory_limit: 128000,
          }),
        }),
      );
    });

    it("should poll when submission response status is <= 2 (processing)", async () => {
      const pendingResult = {
        token: "job-456",
        status: { id: 2, description: "Processing" },
      };

      const finalResult = {
        token: "job-456",
        status: { id: 3, description: "Accepted" },
        stdout: "Done",
      };

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => pendingResult,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => finalResult,
        });

      const result = await submitToJudge0({
        sourceCode: "print('Done')",
        language: "python",
      });

      expect(result).toEqual(finalResult);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw when API returns an error response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Sandbox failure",
      });

      await expect(
        submitToJudge0({
          sourceCode: "code",
          language: "cpp",
        }),
      ).rejects.toThrow(
        "Judge0 submission failed with HTTP 500: Sandbox failure",
      );
    });
  });

  describe("pollSubmission", () => {
    it("should poll until status is completed", async () => {
      const finalResult = {
        token: "poll-123",
        status: { id: 3, description: "Accepted" },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => finalResult,
      });

      const result = await pollSubmission("poll-123", getJudge0Config(), 3, 10);
      expect(result).toEqual(finalResult);
    });

    it("should throw if polling exceeds max attempts", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "poll-timeout",
          status: { id: 1, description: "In Queue" },
        }),
      });

      await expect(
        pollSubmission("poll-timeout", getJudge0Config(), 2, 10),
      ).rejects.toThrow("Judge0 submission timed out");
    });
  });
});
