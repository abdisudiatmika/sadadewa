import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { academicYearService } from "../services/academic-year.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Only admin/superadmin can manage academic years
router.use(requireAuth, requireRole("admin", "superadmin"));

router.get("/", async (req: Request, res: Response) => {
  try {
    const data = await academicYearService.getAll();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const createSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  isActive: z.boolean().default(false),
});

router.post("/", validate({ body: createSchema }), async (req: Request, res: Response) => {
  try {
    const year = await academicYearService.create(req.body);
    res.status(201).json({ success: true, data: year });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

router.put("/:id", validate({ body: updateSchema }), async (req: Request, res: Response) => {
  try {
    const year = await academicYearService.update(req.params.id, req.body);
    if (!year) {
      res.status(404).json({ success: false, error: "Academic year not found" });
      return;
    }
    res.json({ success: true, data: year });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id/activate", async (req: Request, res: Response) => {
  try {
    const year = await academicYearService.setActive(req.params.id);
    if (!year) {
      res.status(404).json({ success: false, error: "Academic year not found" });
      return;
    }
    res.json({ success: true, data: year });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const year = await academicYearService.delete(req.params.id);
    if (!year) {
      res.status(404).json({ success: false, error: "Academic year not found" });
      return;
    }
    res.json({ success: true, data: year });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
