import { Router } from "express";
import type { Request, Response } from "express";
import { expenseService } from "../services/expense.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "staff"));

router.get("/", async (req: Request, res: Response) => {
  try {
    const data = await expenseService.listExpenses({
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      category: req.query.category as string,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.createExpense({
      ...req.body,
      recordedBy: req.user!.id,
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
