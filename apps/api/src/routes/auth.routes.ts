import { Router } from "express";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth/index.js";

const router = Router();

// Kembali ke handler Node agar server menyala lagi
router.all("/*", toNodeHandler(auth) as any);

export default router;
