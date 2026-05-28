import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { incomeService } from "../services/income.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Require auth for all income routes
router.use(requireAuth);

// GET /api/incomes - List incomes (only admin/staff/bendahara)
router.get(
  "/",
  requireRole("admin", "superadmin", "staff", "bendahara_pemasukan"),
  async (req: Request, res: Response) => {
    try {
      const result = await incomeService.list({
        page: Number(req.query.page) || 1,
        perPage: Number(req.query.perPage) || 20,
        search: req.query.search as string,
        category: req.query.category as string,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/incomes/:id - Single income detail
router.get(
  "/:id",
  requireRole("admin", "superadmin", "staff", "bendahara_pemasukan"),
  async (req: Request, res: Response) => {
    try {
      const income = await incomeService.getById(req.params.id as string);
      if (!income) {
        res.status(404).json({ success: false, error: "Income not found" });
        return;
      }
      res.json({ success: true, data: income });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/incomes - Create new income
const createIncomeSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  source: z.string().min(1),
  description: z.string().optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris"]),
});

router.post(
  "/",
  requireRole("admin", "superadmin", "staff", "bendahara_pemasukan"),
  validate({ body: createIncomeSchema }),
  async (req: Request, res: Response) => {
    try {
      const income = await incomeService.create({
        ...req.body,
        recordedBy: req.user!.id,
      });
      res.status(201).json({ success: true, data: income });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

export default router;
