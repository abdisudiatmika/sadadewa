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

import * as xlsx from "xlsx";

// GET /api/billing/template-arrears - Download Arrears Template
router.get("/template-arrears", (req: Request, res: Response) => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet([
    {
      NISN: "1234567890",
      "Nama Tagihan": "Sisa SPP Semester 1",
      Nominal: 500000,
    },
    {
      NISN: "0987654321",
      "Nama Tagihan": "Tunggakan DSP",
      Nominal: 1500000,
    },
  ]);

  ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }];

  xlsx.utils.book_append_sheet(wb, ws, "Template Tunggakan");
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", "attachment; filename=Template_Tunggakan_Siswa.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// POST /api/billing/bulk-arrears - Import arrears from Excel
router.post("/bulk-arrears", async (req: Request, res: Response) => {
  try {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ success: false, error: "Invalid records format" });
      return;
    }
    const result = await billingService.bulkUploadArrears(records);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
