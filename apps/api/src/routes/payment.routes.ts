import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { paymentService } from "../services/payment.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// All payment routes require auth + admin/staff role
router.use(requireAuth, requireRole("admin", "staff"));

// POST /api/payments/checkout - Process a POS checkout
const checkoutSchema = z.object({
  studentId: z.string().uuid(),
  billingItemIds: z.array(z.string().uuid()).min(1),
  discountCode: z.string().optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris"]),
  notes: z.string().optional(),
});

router.post(
  "/checkout",
  validate({ body: checkoutSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await paymentService.checkout({
        ...req.body,
        cashierId: req.user!.id,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// GET /api/payments - List transactions
router.get("/", async (req: Request, res: Response) => {
  try {
    const data = await paymentService.listTransactions({
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
      studentId: req.query.studentId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/:id - Transaction detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const transaction = await paymentService.getTransactionById(
      req.params.id as string
    );
    if (!transaction) {
      res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
      return;
    }

    res.json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/validate-discount - Validate a discount code
router.post("/validate-discount", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      res
        .status(400)
        .json({ success: false, error: "Discount code is required" });
      return;
    }

    const result = await paymentService.validateDiscount(code);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
