import { Router } from "express";
import type { Request, Response } from "express";
import { expressHandler } from "better-auth/express";
import { auth } from "../auth/index.js";

const router = Router();

// Gunakan handler khusus Express untuk kompatibilitas Vercel yang lebih baik
router.all("/*", expressHandler(auth));

export default router;
