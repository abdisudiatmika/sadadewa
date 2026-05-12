import { Router } from "express";
import type { Request, Response } from "express";
import { settingsService } from "../services/settings.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// All settings routes require auth (any role can access their own settings)
router.use(requireAuth);

// GET /api/settings - Get all settings for the current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getUserSettings(req.user!.id);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/settings - Bulk upsert settings
router.put("/", async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.updateSettings(
      req.user!.id,
      req.body
    );
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/settings/reset - Reset to defaults
router.post("/reset", async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.resetToDefaults(req.user!.id);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/settings/profile - Update user profile
router.put("/profile", async (req: Request, res: Response) => {
  try {
    const { name, image } = req.body;
    const updated = await settingsService.updateProfile(req.user!.id, {
      name,
      image,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
