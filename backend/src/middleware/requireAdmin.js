
import { pool } from "../database/pool.js";

export async function requireAdmin(req, res, next) {
  try {
    // Authentication must run before this middleware.
    if (!req.user?.id) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    // Check the verified user's role in the private database table.
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT 1
        FROM private.user_roles
        WHERE user_id = $1
          AND role = 'admin'
      ) AS is_admin`,
      [req.user.id]
    );

    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Administrator access required.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
