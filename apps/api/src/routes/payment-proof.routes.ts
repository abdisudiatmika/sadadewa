import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { paymentProofs } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Semua rute ini butuh login admin/staff
router.use(requireAuth, requireRole("admin", "staff", "superadmin"));

// GET /api/payment-proofs - List semua bukti transfer
router.get("/", async (req: Request, res: Response) => {
  try {
    const data = await db.query.paymentProofs.findMany({
      orderBy: [desc(paymentProofs.createdAt)],
      with: {
        verifier: true
      }
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/payment-proofs/:id/status - Update status (verified/rejected)
router.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body; // 'verified' atau 'rejected'
    
    if (!["verified", "rejected"].includes(status)) {
      res.status(400).json({ success: false, error: "Status tidak valid" });
      return;
    }

    const [updated] = await db.update(paymentProofs)
      .set({
        status,
        verifiedBy: req.user!.id,
        verifiedAt: new Date()
      })
      .where(eq(paymentProofs.id, req.params.id as string))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: "Bukti transfer tidak ditemukan" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
