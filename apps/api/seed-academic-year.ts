import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./src/db/index.js";
import { academicYears, grades } from "./src/db/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function run() {
  console.log("⏳ Sedang membuat Tahun Ajaran dan Tingkat Default...");
  try {
    // 1. Insert Academic Year
    const [newYear] = await db
      .insert(academicYears)
      .values({
        name: "2026/2027",
        startDate: "2026-07-01",
        endDate: "2027-06-30",
        isActive: true,
      })
      .returning();
    console.log("✅ BERHASIL! Tahun Ajaran dibuat:", newYear);

    // 2. Insert Grades
    const insertedGrades = await db
      .insert(grades)
      .values([
        { name: "10", level: 10 },
        { name: "11", level: 11 },
        { name: "12", level: 12 },
      ])
      .returning();
    console.log("✅ BERHASIL! Tingkat dibuat:", insertedGrades);

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Gagal seeding:", error.message || error);
    process.exit(1);
  }
}

run();
