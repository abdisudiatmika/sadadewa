import { Router } from "express";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth/index.js";

const router = Router();

/**
 * Better Auth handles all /api/auth/* routes automatically.
 * This includes:
 *   POST /api/auth/sign-in/credential
 *   POST /api/auth/sign-up/credential
 *   POST /api/auth/sign-out
 *   GET  /api/auth/session
 */
router.all("/*splat", toNodeHandler(auth) as any);

export default router;
