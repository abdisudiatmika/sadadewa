import "dotenv/config";
import { db } from "./index.js";
import {
  academicYears,
  grades,
  classes,
  students,
} from "./schema.js";
import { eq } from "drizzle-orm";

async function seedSMKTI() {
  console.log("🏫 Seeding SMKTI Bali Global Jimbaran Classes...");

  // 1. Dapatkan Academic Year aktif
  const activeYear = await db.query.academicYears.findFirst({
    where: eq(academicYears.isActive, true),
  });

  if (!activeYear) {
    console.error("❌ No active academic year found!");
    process.exit(1);
  }

  // 2. Dapatkan Master Grades (10, 11, 12)
  const allGrades = await db.select().from(grades);
  const grade10 = allGrades.find(g => g.level === 10);
  const grade11 = allGrades.find(g => g.level === 11);
  const grade12 = allGrades.find(g => g.level === 12);

  if (!grade10 || !grade11 || !grade12) {
    console.error("❌ Basic grades (10, 11, 12) not found in DB!");
    process.exit(1);
  }

  // Jurusan yang ada di SMKTI Bali Global Jimbaran
  // Asumsi setiap jurusan punya 2 kelas untuk Kelas 10, dan 1 kelas untuk Kelas 11 & 12
  const smkClasses = [
    // --- Bisnis Digital (BD) ---
    { gradeId: grade10.id, name: "BD 1" },
    { gradeId: grade10.id, name: "BD 2" },
    { gradeId: grade11.id, name: "BD" },
    { gradeId: grade12.id, name: "BD" },

    // --- Akuntansi (AK) ---
    { gradeId: grade10.id, name: "AK 1" },
    { gradeId: grade11.id, name: "AK" },
    { gradeId: grade12.id, name: "AK" },

    // --- Teknik Komputer Jaringan (TKJ) ---
    { gradeId: grade10.id, name: "TKJ 1" },
    { gradeId: grade10.id, name: "TKJ 2" },
    { gradeId: grade11.id, name: "TKJ 1" },
    { gradeId: grade11.id, name: "TKJ 2" },
    { gradeId: grade12.id, name: "TKJ" },

    // --- Program Pengembangan Perangkat Lunak & Gim (PPLG / RPL) ---
    { gradeId: grade10.id, name: "PPLG 1" },
    { gradeId: grade10.id, name: "PPLG 2" },
    { gradeId: grade11.id, name: "RPL 1" },
    { gradeId: grade12.id, name: "RPL 1" },

    // --- Design Komunikasi Visual (DKV) ---
    { gradeId: grade10.id, name: "DKV 1" },
    { gradeId: grade10.id, name: "DKV 2" },
    { gradeId: grade11.id, name: "DKV 1" },
    { gradeId: grade12.id, name: "DKV 1" },
  ];

  // Tambahkan kelas baru
  console.log("Menambahkan kelas SMKTI...");
  const insertedClasses = await db
    .insert(classes)
    .values(
      smkClasses.map(c => ({
        gradeId: c.gradeId,
        academicYearId: activeYear.id,
        name: c.name,
      }))
    )
    .returning();

  console.log(`✅ Berhasil menambahkan ${insertedClasses.length} kelas untuk SMKTI Bali Global Jimbaran.`);
  process.exit(0);
}

seedSMKTI().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
