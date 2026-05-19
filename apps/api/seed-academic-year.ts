import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./src/db/index.js";
import { academicYears } from "./src/db/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function run() {
  console.log("⏳ Sedang membuat Tahun Ajaran Default...");
  try {
    const newYear = await db
      .insert(academicYears)
      .values({
        name: "2026/2027",
        startDate: "2026-07-01",
        endDate: "2027-06-30",
        isActive: true,
      })
      .returning();
      
    console.log("✅ BERHASIL! Tahun Ajaran dibuat:", newYear[0]);
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Gagal membuat Tahun Ajaran:", error.message || error);
    process.exit(1);
  }
}

run();
