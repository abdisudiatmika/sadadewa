import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { masterService } from "../services/master.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Only admin and staff can manage master data
router.use(requireAuth, requireRole("admin", "staff"));

// ==========================================
// GRADES
// ==========================================

router.get("/grades", async (req: Request, res: Response) => {
  try {
    const data = await masterService.getGrades();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const gradeSchema = z.object({
  name: z.string().min(1).max(20),
  level: z.number().int().min(1).max(20),
});

router.post("/grades", validate({ body: gradeSchema }), async (req: Request, res: Response) => {
  try {
    const grade = await masterService.createGrade(req.body);
    res.status(201).json({ success: true, data: grade });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/grades/:id", async (req: Request, res: Response) => {
  try {
    const grade = await masterService.updateGrade(req.params.id, req.body);
    if (!grade) {
      res.status(404).json({ success: false, error: "Grade not found" });
      return;
    }
    res.json({ success: true, data: grade });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/grades/:id", async (req: Request, res: Response) => {
  try {
    const grade = await masterService.deleteGrade(req.params.id);
    if (!grade) {
      res.status(404).json({ success: false, error: "Grade not found" });
      return;
    }
    res.json({ success: true, data: grade });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CLASSES
// ==========================================

router.get("/classes", async (req: Request, res: Response) => {
  try {
    const data = await masterService.getClasses();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/teachers", async (req: Request, res: Response) => {
  try {
    const data = await masterService.getTeachers();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const classSchema = z.object({
  name: z.string().min(1).max(50),
  gradeId: z.string().uuid(),
  homeroomTeacher: z.string().max(100).optional().or(z.literal("")),
  homeroomTeacherId: z.string().optional().or(z.literal("")),
});

router.post("/classes", validate({ body: classSchema }), async (req: Request, res: Response) => {
  try {
    const newClass = await masterService.createClass(req.body);
    res.status(201).json({ success: true, data: newClass });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/classes/:id", async (req: Request, res: Response) => {
  try {
    const updatedClass = await masterService.updateClass(req.params.id, req.body);
    if (!updatedClass) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    res.json({ success: true, data: updatedClass });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/classes/:id", async (req: Request, res: Response) => {
  try {
    const deletedClass = await masterService.deleteClass(req.params.id);
    if (!deletedClass) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    res.json({ success: true, data: deletedClass });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/classes/copy", async (req: Request, res: Response) => {
  try {
    const { sourceAcademicYearId, targetAcademicYearId } = req.body;
    if (!sourceAcademicYearId || !targetAcademicYearId) {
      res.status(400).json({ success: false, error: "Missing source or target academic year" });
      return;
    }
    const result = await masterService.copyClasses(sourceAcademicYearId, targetAcademicYearId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
