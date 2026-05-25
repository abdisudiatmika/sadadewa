import { db } from "./src/db/index.js";
import { students, studentClasses, academicYears, classes, grades } from "./src/db/schema.js";
import { and, eq, sql } from "drizzle-orm";

async function run() {
  try {
    // 1. Clean up existing test data
    await db.delete(studentClasses);
    await db.delete(students);
    await db.delete(classes);
    await db.delete(grades);
    await db.delete(academicYears);

    console.log("Cleared database tables.");

    // 2. Insert two academic years: 2025/2026 (inactive) and 2026/2027 (active)
    const [ayOld] = await db.insert(academicYears).values({
      name: "2025/2026",
      startDate: "2025-07-01",
      endDate: "2026-06-30",
      isActive: false
    }).returning();

    const [ayActive] = await db.insert(academicYears).values({
      name: "2026/2027",
      startDate: "2026-07-01",
      endDate: "2027-06-30",
      isActive: true
    }).returning();

    const [g10] = await db.insert(grades).values({ name: "10", level: 10 }).returning();
    const [c1] = await db.insert(classes).values({
      gradeId: g10.id,
      academicYearId: ayActive.id,
      name: "X PPLG 1"
    }).returning();

    // Insert 10 students
    const studentPromises = Array.from({ length: 10 }).map((_, i) => {
      return db.insert(students).values({
        studentCode: `STD-00${i}`,
        nisn: `000000000${i}`,
        fullName: `Student Number ${i}`,
        status: "active"
      }).returning();
    });
    const inserted = await Promise.all(studentPromises);
    const studentIds = inserted.map(s => s[0].id);

    console.log("Inserted 10 students.");

    // 4 students are linked to active class in active academic year
    for (let i = 0; i < 4; i++) {
      await db.insert(studentClasses).values({
        studentId: studentIds[i],
        classId: c1.id,
        academicYearId: ayActive.id,
        status: "active"
      });
    }

    // 6 students are linked to class in inactive academic year
    for (let i = 4; i < 10; i++) {
      await db.insert(studentClasses).values({
        studentId: studentIds[i],
        classId: c1.id,
        academicYearId: ayOld.id,
        status: "active"
      });
    }

    console.log("Linked 4 students to active year, 6 students to inactive year.");

    // 3. Execute count query
    const countRes = await db
      .select({ count: sql`count(*)` })
      .from(students)
      .leftJoin(studentClasses, and(
        eq(studentClasses.studentId, students.id),
        eq(studentClasses.status, "active")
      ))
      .leftJoin(academicYears, and(
        eq(studentClasses.academicYearId, academicYears.id),
        eq(academicYears.isActive, true)
      ));

    console.log("Count query result:", countRes[0]);

    // 4. Execute data query
    const dataRes = await db
      .select()
      .from(students)
      .leftJoin(studentClasses, and(
        eq(studentClasses.studentId, students.id),
        eq(studentClasses.status, "active")
      ))
      .leftJoin(academicYears, and(
        eq(studentClasses.academicYearId, academicYears.id),
        eq(academicYears.isActive, true)
      ))
      .leftJoin(classes, eq(studentClasses.classId, classes.id))
      .leftJoin(grades, eq(classes.gradeId, grades.id));

    console.log("Data query length:", dataRes.length);
    console.log("Data mapping check:");
    console.log(dataRes.map(row => ({
      name: row.students.fullName,
      class: row.classes ? row.classes.name : null,
      academicYear: row.academic_years ? row.academic_years.name : null
    })));

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
