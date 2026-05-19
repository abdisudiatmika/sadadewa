import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import * as XLSX from "xlsx";
import path from "path";
import os from "os";
import fs from "fs";
import { studentService } from "../services/student.service.js";
import { billingService } from "../services/billing.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// All student routes require auth + admin/staff role
router.use(requireAuth, requireRole("admin", "staff"));

// GET /api/students - List with pagination and filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await studentService.list({
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
      search: req.query.search as string,
      gradeId: req.query.gradeId as string,
      classId: req.query.classId as string,
      status: req.query.status as string,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/meta/classes - Get all classes for dropdowns
router.get("/meta/classes", async (req: Request, res: Response) => {
  try {
    const data = await studentService.getClasses();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/search - Autocomplete search for POS
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const data = await studentService.search(query);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/template - Download Excel template
router.get("/template", async (req: Request, res: Response) => {
  try {
    const headers = ['studentCode', 'nisn', 'fullName', 'gradeAndClass', 'guardianName', 'guardianPhone', 'guardianEmail', 'status'];
    const sampleRow = ['STD-EXAMPLE', '0011223344', 'Siswa Contoh', '10 BD 1', 'Bapak Contoh', '+62811223344', 'contoh@email.com', 'active'];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Save to temp file and use res.download
    const tempFilePath = path.join(os.tmpdir(), 'student_import_template.xlsx');
    fs.writeFileSync(tempFilePath, excelBuffer);
    
    res.download(tempFilePath, 'student_import_template.xlsx', (err) => {
      // Optional: cleanup after download
      if (!err) {
        fs.unlinkSync(tempFilePath);
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students/bulk-upload - Import from Excel/CSV
router.post("/bulk-upload", async (req: Request, res: Response) => {
  try {
    const records = req.body.records;

    if (!Array.isArray(records) || records.length === 0) {
      res
        .status(400)
        .json({ success: false, error: "No records provided" });
      return;
    }

    const inserted = await studentService.bulkCreate(records);
    res.status(201).json({
      success: true,
      data: { imported: inserted.length },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/:id - Single student detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const student = await studentService.getById(req.params.id as string);
    if (!student) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }
    res.json({ success: true, data: student });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/:id/billing - Billing items for a student
router.get("/:id/billing", async (req: Request, res: Response) => {
  try {
    const data = await billingService.getStudentBilling(
      req.params.id as string,
      req.query.academicYearId as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students - Create a new student
const createStudentSchema = z.object({
  studentCode: z.string().min(1).max(20),
  nisn: z.string().min(1).max(20),
  fullName: z.string().min(1).max(150),
  classId: z.string().uuid().optional().or(z.literal("")),
  guardianName: z.string().max(150).optional().or(z.literal("")),
  guardianPhone: z.string().max(20).optional().or(z.literal("")),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "suspended", "graduated"]).optional(),
  enrolledAt: z.string().optional(),
}).transform((data) => ({
  ...data,
  classId: data.classId || undefined,
  guardianName: data.guardianName || undefined,
  guardianPhone: data.guardianPhone || undefined,
  guardianEmail: data.guardianEmail || undefined,
}));

router.post(
  "/",
  validate({ body: createStudentSchema }),
  async (req: Request, res: Response) => {
    try {
      const student = await studentService.create(req.body);
      res.status(201).json({ success: true, data: student });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/students/:id - Update a student
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const student = await studentService.update(req.params.id as string, req.body);
    if (!student) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }
    res.json({ success: true, data: student });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/students/:id - Soft-delete a student
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const student = await studentService.delete(req.params.id as string);
    if (!student) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }
    res.json({ success: true, data: student });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students/promote - Promote students to a new class
router.post("/promote", async (req: Request, res: Response) => {
  try {
    const { studentIds, newClassId, newAcademicYearId } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || !newClassId || !newAcademicYearId) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }
    
    const count = await studentService.promoteStudents({
      studentIds,
      newClassId,
      newAcademicYearId
    });
    
    res.json({ success: true, data: { promoted: count } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
