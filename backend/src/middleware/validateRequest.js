export const validateRequest = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if(!result.success) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            details: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    req.body = result.data;
    return next();
  }
};
