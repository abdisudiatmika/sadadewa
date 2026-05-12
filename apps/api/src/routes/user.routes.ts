import { Router } from "express";
import type { Request, Response } from "express";
import { userService } from "../services/user.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";

const router = Router();

// Only superadmin and admin can manage users
router.use(requireAuth, requireRole("superadmin", "admin"));

router.get("/", async (req: Request, res: Response) => {
  try {
    const data = await userService.getUsers();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "superadmin", "staff", "bendahara_pemasukan", "bendahara_pengeluaran", "teacher"]),
});

router.post("/", validate({ body: createUserSchema }), async (req: Request, res: Response) => {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: newUser });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await userService.deleteUser(req.params.id);
    res.json({ success: true, data: deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
