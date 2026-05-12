import { Router } from "express";
import type { Request, Response } from "express";
import { reportService } from "../services/report.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All report routes require auth + admin/staff role
router.use(requireAuth, requireRole("admin", "staff"));

// GET /api/reports/summary - KPI cards (total revenue, collection rate, outstanding)
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const summary = await reportService.getSummary({
      academicYearId: req.query.academicYearId as string,
      gradeId: req.query.gradeId as string,
    });
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/revenue-trends - Monthly revenue for bar chart
router.get("/revenue-trends", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getRevenueTrends(
      req.query.academicYearId as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/revenue-by-component - Donut chart data
router.get("/revenue-by-component", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getRevenueByComponent(
      req.query.academicYearId as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/delinquency - Students with outstanding balances
router.get("/delinquency", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getDelinquency({
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reports/send-reminder - Send payment reminder
router.post("/send-reminder", async (req: Request, res: Response) => {
  try {
    const { studentId, channel, message } = req.body;
    if (!studentId || !channel) {
      res.status(400).json({
        success: false,
        error: "studentId and channel are required",
      });
      return;
    }

    const reminder = await reportService.sendReminder({
      studentId,
      sentBy: req.user!.id,
      channel,
      message,
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ---- Dashboard-specific endpoints ----

// GET /api/reports/dashboard/stats - Overview stat cards
router.get("/dashboard/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await reportService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/dashboard/top-arrears - Top arrears with limit
router.get("/dashboard/top-arrears", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getTopArrears(
      Number(req.query.limit) || 5
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- New Comprehensive Reports ----

// GET /api/reports/income/daily
router.get("/income/daily", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getDailyIncome(req.query.date as string);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/income/monthly
router.get("/income/monthly", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getMonthlyIncome({
      month: Number(req.query.month),
      year: Number(req.query.year),
      paymentMethod: req.query.paymentMethod as string,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/delinquency/detailed
router.get("/delinquency/detailed", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getDetailedDelinquency({
      classId: req.query.classId as string,
      gradeId: req.query.gradeId as string,
      feeTemplateId: req.query.feeTemplateId as string,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/student/ledger/:studentId
router.get("/student/ledger/:studentId", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getStudentLedger(req.params.studentId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/class/summary/:classId
router.get("/class/summary/:classId", async (req: Request, res: Response) => {
  try {
    const data = await reportService.getClassSummary(req.params.classId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
