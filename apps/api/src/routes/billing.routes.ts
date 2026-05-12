import { Router } from "express";
import type { Request, Response } from "express";
import { billingService } from "../services/billing.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All billing routes require auth + admin/staff role
router.use(requireAuth, requireRole("admin", "staff"));

// GET /api/billing - List billing items with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await billingService.list({
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
      studentId: req.query.studentId as string,
      status: req.query.status as string,
      month: req.query.month ? Number(req.query.month) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/billing/student/:studentId - All billing items for a student
router.get("/student/:studentId", async (req: Request, res: Response) => {
  try {
    const data = await billingService.getStudentBilling(
      req.params.studentId as string,
      req.query.academicYearId as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/billing/:id/status - Manually update billing item status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res
        .status(400)
        .json({ success: false, error: "Status is required" });
      return;
    }

    const updated = await billingService.updateStatus(req.params.id as string, status);
    if (!updated) {
      res
        .status(404)
        .json({ success: false, error: "Billing item not found" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
