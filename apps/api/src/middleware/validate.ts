import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";

/**
 * Middleware factory: validates request body, query, and/or params against Zod schemas.
 */
export function validate(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.body = result.error.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        );
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.query = result.error.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        );
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.params = result.error.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        );
      }
    }

    if (Object.keys(errors).length > 0) {
      res
        .status(400)
        .json({ success: false, error: "Validation failed", details: errors });
      return;
    }

    next();
  };
}
