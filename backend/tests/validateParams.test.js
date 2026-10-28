
import { describe, it, expect, vi } from "vitest";
import { validateParams } from "../src/middleware/validateParams.js";
import { courseParamsSchema } from "../src/modules/courses/courseValidation.js";

describe("validateParams middleware", () => {
  const validParams = {
    courseId: "550e8400-e29b-41d4-a716-446655440000",
  };

  const createMocks = (params) => {
    const req = { params };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    return { req, res, next };
  };

  it("should store validated parameters and call next for a valid UUID", () => {
    const { req, res, next } = createMocks(validParams);

    validateParams(courseParamsSchema)(req, res, next);

    expect(req.validatedParams).toEqual(validParams);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should return 400 for an invalid UUID", () => {
    const { req, res, next } = createMocks({
      courseId: "not-a-uuid",
    });

    validateParams(courseParamsSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "courseId",
            message: expect.any(String),
          }),
        ]),
      })
    );
    expect(next).not.toHaveBeenCalled();
    expect(req.validatedParams).toBeUndefined();
  });

  it("should reject unexpected route parameters", () => {
    const { req, res, next } = createMocks({
      ...validParams,
      extra: "unexpected",
    });

    validateParams(courseParamsSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({
    error: "VALIDATION_ERROR",
    details: expect.arrayContaining([
      expect.objectContaining({
        field: "",
        message: 'Unrecognized key: "extra"',
      }),
    ]),
  })
);

    expect(next).not.toHaveBeenCalled();
  });
});
