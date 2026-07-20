import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import * as XLSX from "xlsx";
import path from "path";
import os from "os";
import fs from "fs";
import { studentService } from "../services/student.service.js";
import { billingService } from "../services/billing.service.js";
import { db } from "../db/index.js";
import { students, incomes, studentClasses } from "../db/schema.js";
import { eq, desc, ilike, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// All student routes require auth + appropriate roles
router.use(requireAuth, requireRole("admin", "staff", "superadmin", "bendahara_pemasukan", "teacher"));

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

const topUpSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "transfer", "transfer_bri", "transfer_bukopin", "transfer_other", "qris", "balance"]),
  notes: z.string().optional(),
});

// GET /api/students/:id/incomes - Get incomes (Pemasukan Lain/Top Up) for a student
router.get("/:id/incomes", async (req: Request, res: Response) => {
  try {
    const student = await db.query.students.findFirst({ where: eq(students.id, req.params.id as string) });
    if (!student) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }

    const data = await db.query.incomes.findMany({
      where: ilike(incomes.source, `%${student.fullName}%`),
      orderBy: (inc, { desc }) => [desc(inc.date)],
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students/:id/topup - Top up student balance manually
router.post(
  "/:id/topup",
  requireRole("admin", "superadmin", "staff", "bendahara_pemasukan"),
  validate({ body: topUpSchema }),
  async (req: Request, res: Response) => {
    try {
      const income = await studentService.topUpBalance(req.params.id as string, {
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
        recordedBy: req.user!.id,
      });
      res.json({ success: true, data: income });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

const updateBalanceSchema = z.object({
  balance: z.number().min(0),
});

// PUT /api/students/:id/balance - Edit student balance directly
router.put(
  "/:id/balance",
  requireAuth,
  requireRole("admin", "superadmin", "staff", "bendahara_pemasukan"),
  validate({ body: updateBalanceSchema }),
  async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const { balance } = req.body;
      const student = await studentService.updateBalance(studentId, balance);
      res.json({ success: true, data: student });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// POST /api/students - Create a new student
const createStudentSchema = z.object({
  studentCode: z.string().max(20).optional().or(z.literal("")),
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
      if (error.cause && error.cause.code === '23505') {
        const constraint = error.cause.constraint_name || '';
        if (constraint.includes('nisn')) {
          res.status(400).json({ success: false, error: 'NISN sudah terdaftar di sistem. Silakan gunakan NISN lain.' });
          return;
        }
        if (constraint.includes('student_code')) {
          res.status(400).json({ success: false, error: 'Kode Siswa sudah terdaftar di sistem.' });
          return;
        }
      }
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
    if (error.cause && error.cause.code === '23505') {
      const constraint = error.cause.constraint_name || '';
      if (constraint.includes('nisn')) {
        res.status(400).json({ success: false, error: 'NISN sudah terdaftar di sistem. Silakan gunakan NISN lain.' });
        return;
      }
      if (constraint.includes('student_code')) {
        res.status(400).json({ success: false, error: 'Kode Siswa sudah terdaftar di sistem.' });
        return;
      }
    }
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

// POST /api/students/bulk-delete - Bulk delete students (sets status to inactive)
router.post("/bulk-delete", async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ success: false, error: "No student IDs provided" });
      return;
    }
    
    const count = await studentService.bulkDelete(studentIds);
    res.json({ success: true, data: { deleted: count } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students/bulk-graduate - Bulk graduate students (sets status to graduated and studentClasses to inactive)
router.post("/bulk-graduate", async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ success: false, error: "studentIds array is required" });
      return;
    }

    const count = await studentService.bulkGraduate(studentIds);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/fix-data/classes - One-time script to fix students with multiple active classes
router.get("/fix-data/classes", async (req: Request, res: Response) => {
  try {
    const allActiveClasses = await db.query.studentClasses.findMany({
      where: eq(studentClasses.status, "active"),
      orderBy: [desc(studentClasses.createdAt)]
    });

    const studentToClasses = new Map<string, any[]>();
    for (const c of allActiveClasses) {
      if (!studentToClasses.has(c.studentId)) {
        studentToClasses.set(c.studentId, []);
      }
      studentToClasses.get(c.studentId)!.push(c);
    }

    let fixedCount = 0;
    for (const [studentId, classes] of studentToClasses.entries()) {
      if (classes.length > 1) {
        // Keep the first one (most recent), deactivate the rest
        const toDeactivate = classes.slice(1).map(c => c.id);
        if (toDeactivate.length > 0) {
          await db.update(studentClasses)
            .set({ status: "inactive" })
            .where(inArray(studentClasses.id, toDeactivate));
          fixedCount += toDeactivate.length;
        }
      }
    }

    res.json({ success: true, message: `Fixed ${fixedCount} duplicate active class records.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
