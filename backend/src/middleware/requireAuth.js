
import { supabase } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  try {
    const accessToken = req.cookies?.skillforge_access_token;
    if (!accessToken) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return res.status(401).json({
        error: "INVALID_SESSION",
        message: "Invalid or expired session.",
      });
    }
    req.user = data.user;
    return next();
  } catch (error) {
    return next(error);
  }
}
