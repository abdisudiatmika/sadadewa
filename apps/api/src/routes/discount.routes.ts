import { Router, Request, Response } from "express";
import { discountService } from "../services/discount.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "superadmin", "bendahara_pemasukan", "staff"));

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await discountService.list({
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await discountService.get(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const result = await discountService.create(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const result = await discountService.update(req.params.id as string, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const result = await discountService.delete(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
