const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const createOriginValidationMiddleware = (allowedOrigins) =>
  (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get("Origin");

    if (!origin) return next();

    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Request origin is not allowed.",
      });
    }

    return next();
  };
