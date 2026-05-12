import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { feeService } from "../services/fee.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// All fee routes require auth + admin role
router.use(requireAuth, requireRole("admin"));

// GET /api/fees - List fee templates
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await feeService.list({
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
      search: req.query.search as string,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/fees/summary - Aggregate stats for dashboard cards
router.get("/summary", async (_req: Request, res: Response) => {
  try {
    const summary = await feeService.getSummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/fees/:id - Single fee template
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const fee = await feeService.getById(req.params.id as string);
    if (!fee) {
      res.status(404).json({ success: false, error: "Fee template not found" });
      return;
    }
    res.json({ success: true, data: fee });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/fees - Create a new fee template
const createFeeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(150),
  category: z.enum(["recurring", "one_time"]),
  frequency: z.enum(["monthly", "yearly", "once"]),
  amount: z.number().positive(),
  targetDescription: z.string().max(150).optional(),
  targetGradeId: z.string().uuid().optional(),
});

router.post(
  "/",
  validate({ body: createFeeSchema }),
  async (req: Request, res: Response) => {
    try {
      const fee = await feeService.create(req.body);
      res.status(201).json({ success: true, data: fee });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/fees/:id - Update a fee template
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const fee = await feeService.update(req.params.id as string, req.body);
    if (!fee) {
      res.status(404).json({ success: false, error: "Fee template not found" });
      return;
    }
    res.json({ success: true, data: fee });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/fees/:id/duplicate - Duplicate a fee template
router.post("/:id/duplicate", async (req: Request, res: Response) => {
  try {
    const fee = await feeService.duplicate(req.params.id as string);
    if (!fee) {
      res.status(404).json({ success: false, error: "Fee template not found" });
      return;
    }
    res.status(201).json({ success: true, data: fee });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/fees/:id - Delete a fee template
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const fee = await feeService.delete(req.params.id as string);
    if (!fee) {
      res.status(404).json({ success: false, error: "Fee template not found" });
      return;
    }
    res.json({ success: true, data: fee });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/fees/:id/generate-bills - Generate billing items for targeted students
router.post("/:id/generate-bills", async (req: Request, res: Response) => {
  try {
    const { classId } = req.body;
    const result = await feeService.generateBills(req.params.id as string, classId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
