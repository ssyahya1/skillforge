export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if(!result.success) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            details: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    req.validateQuery = result.data;
    return next();
  }
};
