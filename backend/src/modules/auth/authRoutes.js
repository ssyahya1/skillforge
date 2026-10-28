
import { Router } from "express";

import {
  signup,
  login,
  resetPassword,
  changePassword,
  logout,
  refreshSessionController,
} from "./authController.js";

import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.post("/refresh", refreshSessionController);
router.post("/signup", signup);
router.post("/login", login);
router.post("/reset-password", resetPassword);


router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

router.patch("/password", requireAuth, changePassword);



router.post("/logout", logout);

export default router;
