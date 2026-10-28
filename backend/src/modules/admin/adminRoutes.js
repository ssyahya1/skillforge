import express from "express";
import {requireAuth} from "../../middleware/requireAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { getAdminProfile } from "./adminController.js";

const router = express.Router();

router.get("/me", requireAuth, requireAdmin, getAdminProfile);

export default router;
