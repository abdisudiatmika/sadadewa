import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { paymentProofs } from "../db/schema.js";

const router = Router();

// Configure multer for file storage
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan!"));
    }
  },
});

// POST /api/public/upload-proof
router.post(
  "/upload-proof",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "File gambar bukti transfer wajib diunggah" });
        return;
      }

      const { studentName, className, accountOwner, amount, notes, destinationBank } = req.body;

      if (!studentName || !className || !accountOwner || !amount || !destinationBank) {
        res.status(400).json({ success: false, error: "Semua kolom (kecuali keterangan) wajib diisi" });
        return;
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const [proof] = await db
        .insert(paymentProofs)
        .values({
          studentName,
          className,
          accountOwner,
          amount: parseInt(amount, 10),
          destinationBank,
          notes: notes || null,
          fileUrl,
        })
        .returning();

      res.status(201).json({ success: true, data: proof });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
