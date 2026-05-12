import "dotenv/config";
import { db } from "./index.js";
import {
  academicYears,
  grades,
  classes,
  students,
  feeTemplates,
  billingItems,
  discountCodes,
} from "./schema.js";

/**
 * Seed the database with development data matching the frontend mockups.
 *
 * Usage: npm run db:seed (from apps/api or root)
 */
async function seed() {
  console.log("🌱 Seeding database...");

  // ---- Academic Years ----
  const [ay2324] = await db
    .insert(academicYears)
    .values({
      name: "2023/2024",
      startDate: "2023-07-01",
      endDate: "2024-06-30",
      isActive: true,
    })
    .returning();
  console.log("  ✓ Academic year:", ay2324.name);

  // ---- Grades ----
  const [grade10] = await db
    .insert(grades)
    .values({ name: "10", level: 10 })
    .returning();
  const [grade11] = await db
    .insert(grades)
    .values({ name: "11", level: 11 })
    .returning();
  const [grade12] = await db
    .insert(grades)
    .values({ name: "12", level: 12 })
    .returning();
  console.log("  ✓ Grades: 10, 11, 12");

  // ---- Classes ----
  const [class10A] = await db
    .insert(classes)
    .values({
      gradeId: grade10.id,
      academicYearId: ay2324.id,
      name: "IPA 1",
      homeroomTeacher: "Mrs. Smith",
    })
    .returning();
  const [class10B] = await db
    .insert(classes)
    .values({
      gradeId: grade10.id,
      academicYearId: ay2324.id,
      name: "IPS 1",
    })
    .returning();
  const [class11A] = await db
    .insert(classes)
    .values({
      gradeId: grade11.id,
      academicYearId: ay2324.id,
      name: "Science A",
      homeroomTeacher: "Mr. Johnson",
    })
    .returning();
  const [class11B] = await db
    .insert(classes)
    .values({
      gradeId: grade11.id,
      academicYearId: ay2324.id,
      name: "MIPA",
    })
    .returning();
  const [class12A] = await db
    .insert(classes)
    .values({
      gradeId: grade12.id,
      academicYearId: ay2324.id,
      name: "Commerce C",
    })
    .returning();
  console.log("  ✓ Classes: 5 created");

  // ---- Students (matching frontend mockups) ----
  const studentsData = [
    {
      studentCode: "STD-23001",
      nisn: "0098765432",
      fullName: "Ahmad Rifqi",
      classId: class10A.id,
      guardianPhone: "+62 812-3456-7890",
      status: "active" as const,
    },
    {
      studentCode: "STD-23002",
      nisn: "0098765433",
      fullName: "Alaric Jenson",
      classId: class11A.id,
      guardianPhone: "+62 812-3456-7890",
      status: "active" as const,
    },
    {
      studentCode: "STD-23003",
      nisn: "0098765434",
      fullName: "Blythe Monroe",
      classId: class10B.id,
      guardianPhone: "+62 811-9876-5432",
      status: "active" as const,
    },
    {
      studentCode: "STD-23004",
      nisn: "0098765435",
      fullName: "Caleb Wright",
      classId: class12A.id,
      guardianPhone: "+62 813-5555-1234",
      status: "suspended" as const,
    },
    {
      studentCode: "STD-23005",
      nisn: "0098765436",
      fullName: "Dahlia Peterson",
      classId: class11A.id,
      guardianPhone: "+62 852-1111-9999",
      status: "active" as const,
    },
    {
      studentCode: "STD-23006",
      nisn: "0098765437",
      fullName: "Elias Reed",
      classId: class10B.id,
      guardianPhone: "+62 819-8888-2222",
      status: "graduated" as const,
    },
    {
      studentCode: "STD-23007",
      nisn: "0098765438",
      fullName: "Ahmad Wijaya",
      classId: class12A.id,
      guardianPhone: "+62 821-4444-6666",
      status: "active" as const,
    },
    {
      studentCode: "STD-23008",
      nisn: "0098765439",
      fullName: "Siti Nurhaliza",
      classId: class11B.id,
      guardianPhone: "+62 831-7777-3333",
      status: "active" as const,
    },
    {
      studentCode: "STD-23009",
      nisn: "0098765440",
      fullName: "Budi Pratama",
      classId: class10A.id,
      guardianPhone: "+62 841-2222-8888",
      status: "active" as const,
    },
    {
      studentCode: "STD-23010",
      nisn: "0098765441",
      fullName: "Ahmad Rizki",
      classId: class10A.id,
      guardianPhone: "+62 812-1029-3847",
      status: "active" as const,
    },
  ];

  const insertedStudents = await db
    .insert(students)
    .values(studentsData)
    .returning();
  console.log(`  ✓ Students: ${insertedStudents.length} created`);

  // ---- Fee Templates (matching Fee Master page) ----
  const feesData = [
    {
      code: "SPP-10-24",
      name: "SPP Bulanan - Kelas 10",
      category: "recurring" as const,
      frequency: "monthly" as const,
      amount: 850000,
      targetDescription: "Kelas 10 (Semua)",
      targetGradeId: grade10.id,
      academicYearId: ay2324.id,
      status: "active" as const,
    },
    {
      code: "SPP-11-24",
      name: "SPP Bulanan - Kelas 11",
      category: "recurring" as const,
      frequency: "monthly" as const,
      amount: 900000,
      targetDescription: "Kelas 11 (Semua)",
      targetGradeId: grade11.id,
      academicYearId: ay2324.id,
      status: "active" as const,
    },
    {
      code: "DPP-01",
      name: "Uang Gedung / DPP",
      category: "one_time" as const,
      frequency: "once" as const,
      amount: 15000000,
      targetDescription: "Siswa Baru",
      academicYearId: ay2324.id,
      status: "active" as const,
    },
    {
      code: "SRG-PA-1",
      name: "Seragam Putih Abu-abu",
      category: "one_time" as const,
      frequency: "once" as const,
      amount: 450000,
      targetDescription: "Siswa Baru",
      academicYearId: ay2324.id,
      status: "inactive" as const,
    },
    {
      code: "PRK-IPA-11",
      name: "Biaya Praktikum IPA",
      category: "recurring" as const,
      frequency: "yearly" as const,
      amount: 1200000,
      targetDescription: "Kelas 11 (MIPA)",
      targetGradeId: grade11.id,
      academicYearId: ay2324.id,
      status: "active" as const,
    },
  ];

  const insertedFees = await db
    .insert(feeTemplates)
    .values(feesData)
    .returning();
  console.log(`  ✓ Fee templates: ${insertedFees.length} created`);

  // ---- Billing Items (for Ahmad Rifqi — matching POS page) ----
  const rifqi = insertedStudents[0]; // Ahmad Rifqi
  const spp10 = insertedFees[0]; // SPP-10-24

  const billingData = [];

  // July-Sept: Paid
  for (const month of [7, 8, 9]) {
    billingData.push({
      studentId: rifqi.id,
      feeTemplateId: spp10.id,
      academicYearId: ay2324.id,
      billingMonth: month,
      billingYear: 2023,
      amount: 450000,
      status: "paid" as const,
      dueDate: `2023-${String(month).padStart(2, "0")}-10`,
      paidAt: new Date(`2023-${String(month).padStart(2, "0")}-05`),
    });
  }

  // Oct-Nov: Overdue
  for (const month of [10, 11]) {
    billingData.push({
      studentId: rifqi.id,
      feeTemplateId: spp10.id,
      academicYearId: ay2324.id,
      billingMonth: month,
      billingYear: 2023,
      amount: 450000,
      status: "overdue" as const,
      dueDate: `2023-${String(month).padStart(2, "0")}-10`,
    });
  }

  // Dec: Unpaid
  billingData.push({
    studentId: rifqi.id,
    feeTemplateId: spp10.id,
    academicYearId: ay2324.id,
    billingMonth: 12,
    billingYear: 2023,
    amount: 450000,
    status: "unpaid" as const,
    dueDate: "2023-12-10",
  });

  // Jan-June: Not billed yet
  for (const month of [1, 2, 3, 4, 5, 6]) {
    billingData.push({
      studentId: rifqi.id,
      feeTemplateId: spp10.id,
      academicYearId: ay2324.id,
      billingMonth: month,
      billingYear: 2024,
      amount: 450000,
      status: "unpaid" as const,
      dueDate: `2024-${String(month).padStart(2, "0")}-10`,
    });
  }

  // Create billing items for other students (overdue for reports page)
  const wijaya = insertedStudents[6]; // Ahmad Wijaya
  const siti = insertedStudents[7]; // Siti Nurhaliza
  const budi = insertedStudents[8]; // Budi Pratama

  for (const month of [9, 10, 11]) {
    billingData.push({
      studentId: wijaya.id,
      feeTemplateId: spp10.id,
      academicYearId: ay2324.id,
      billingMonth: month,
      billingYear: 2023,
      amount: 500000,
      status: "overdue" as const,
      dueDate: `2023-${String(month).padStart(2, "0")}-10`,
    });
  }

  billingData.push({
    studentId: siti.id,
    feeTemplateId: insertedFees[1].id,
    academicYearId: ay2324.id,
    billingMonth: 11,
    billingYear: 2023,
    amount: 500000,
    status: "overdue" as const,
    dueDate: "2023-11-10",
  });

  for (const month of [8, 9, 10, 11]) {
    billingData.push({
      studentId: budi.id,
      feeTemplateId: spp10.id,
      academicYearId: ay2324.id,
      billingMonth: month,
      billingYear: 2023,
      amount: 500000,
      status: "overdue" as const,
      dueDate: `2023-${String(month).padStart(2, "0")}-10`,
    });
  }

  const insertedBilling = await db
    .insert(billingItems)
    .values(billingData)
    .returning();
  console.log(`  ✓ Billing items: ${insertedBilling.length} created`);

  // ---- Discount Codes ----
  await db.insert(discountCodes).values([
    {
      code: "BEASISWA",
      description: "Scholarship discount - 50%",
      type: "percentage",
      value: 50,
      isActive: true,
    },
    {
      code: "SIBLING10",
      description: "Sibling discount - 10%",
      type: "percentage",
      value: 10,
      maxUses: 100,
      isActive: true,
    },
    {
      code: "EARLYBIRD",
      description: "Early bird flat discount",
      type: "fixed",
      value: 100000,
      maxUses: 50,
      isActive: true,
    },
  ]);
  console.log("  ✓ Discount codes: 3 created");

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
