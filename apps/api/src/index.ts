import { webcrypto } from "node:crypto";
// Polyfill for Node.js < 20 (Better Auth requires globalThis.crypto)
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

import "dotenv/config";
import express from "express";
import cors from "cors";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import feeRoutes from "./routes/fee.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import reportRoutes from "./routes/report.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import masterRoutes from "./routes/master.routes.js";
import userRoutes from "./routes/user.routes.js";
import academicYearRoutes from "./routes/academic-year.routes.js";
import publicRoutes from "./routes/public.routes.js";
import paymentProofRoutes from "./routes/payment-proof.routes.js";
import incomeRoutes from "./routes/income.routes.js";
import discountRoutes from "./routes/discount.routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// SANGAT PENTING untuk Vercel agar bisa membaca header https dengan benar
app.set("trust proxy", true);

// ---- Global Middleware ----

const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost",
  "http://localhost:5173",
  "https://sadadewa-dashboard.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Routes ----

// Better Auth handles all /api/auth/* routes
app.use("/api/auth", authRoutes);

// Application API routes
app.use("/api/students", studentRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/users", userRoutes);
app.use("/api/academic-years", academicYearRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payment-proofs", paymentProofRoutes);
app.use("/api/incomes", incomeRoutes);
app.use("/api/discounts", discountRoutes);

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
);

// ---- Start Server ----

import { sql } from "drizzle-orm";
import { db } from "./db/index.js";

async function runStartupTasks() {
  try {
    console.log("Checking and migrating database schema...");
    try {
      await db.execute(sql.raw(`ALTER TABLE transactions ALTER COLUMN discount_code TYPE TEXT`));
    } catch (e: any) {
      console.log("Schema migration skipped (harmless if already applied):", e.message);
    }
    
    console.log("Checking and migrating database enums...");
    const enumsToAdd = ['transfer_bri', 'transfer_bukopin', 'transfer_other', 'qris'];
    for (const val of enumsToAdd) {
      await db.execute(sql.raw(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS '${val}'`));
    }
    
    // Fix discount_type enum: add 'fixed_amount' if it was previously just 'fixed'
    try {
      await db.execute(sql.raw(`ALTER TYPE discount_type ADD VALUE IF NOT EXISTS 'fixed_amount'`));
      await db.execute(sql.raw(`UPDATE discount_codes SET type = 'fixed_amount'::discount_type WHERE type::text = 'fixed'`));
      console.log("discount_type enum migration successful!");
    } catch (e: any) {
      console.log("discount_type enum migration skipped:", e.message);
    }
    
    console.log("Enum migration successful!");
  } catch (err: any) {
    // Ignore error if type doesn't exist yet (first run) or other harmless errors
    console.log("Enum migration skipped or failed (harmless if first run):", err.message);
  }
}

app.listen(PORT, async () => {
  await runStartupTasks();
  console.log(`🚀 EduPay Pro API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
