import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/index.js";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request to carry session data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        image?: string | null;
      };
      session?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Middleware: Require a valid session. Attaches user and session to req.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      req.user = session.user as Request["user"];
      req.session = {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
      };

      next();
    } catch {
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  })();
}

/**
 * Middleware: Require specific role(s). Must be used after requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden: insufficient role" });
      return;
    }

    next();
  };
}
