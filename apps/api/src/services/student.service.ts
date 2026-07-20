import { db } from "../db/index.js";
import { students, classes, grades, studentClasses, academicYears, user, incomes } from "../db/schema.js";
import { eq, ilike, and, or, sql, count, inArray, desc, ne } from "drizzle-orm";
import { userService } from "./user.service.js";

export class StudentService {
  /**
   * List students with pagination, search, and filters.
   */
  async list(params: {
    page?: number;
    perPage?: number;
    search?: string;
    gradeId?: string;
    classId?: string;
    status?: string;
  }) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const offset = (page - 1) * perPage;

    const conditions = [];

    if (params.search) {
      conditions.push(
        or(
          ilike(students.fullName, `%${params.search}%`),
          ilike(students.studentCode, `%${params.search}%`),
          ilike(students.nisn, `%${params.search}%`)
        )
      );
    }

    if (params.status) {
      if (params.status === "active,inactive,suspended") {
        conditions.push(inArray(students.status, ["active", "inactive", "suspended"]));
      } else {
        conditions.push(eq(students.status, params.status as any));
      }
    } else {
      // Exclude graduated by default
      conditions.push(ne(students.status, "graduated"));
    }

    if (params.classId) {
      // Because we use leftJoin, we need to filter on the joined table
      conditions.push(eq(studentClasses.classId, params.classId));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
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
        .leftJoin(grades, eq(classes.gradeId, grades.id))
        .where(whereClause)
        .limit(perPage)
        .offset(offset)
        .orderBy(students.fullName),
      db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentClasses, and(
          eq(studentClasses.studentId, students.id),
          eq(studentClasses.status, "active")
        ))
        .leftJoin(academicYears, and(
          eq(studentClasses.academicYearId, academicYears.id),
          eq(academicYears.isActive, true)
        ))
        .where(whereClause),
    ]);

    // Filter by gradeId at query level via class join
    const total = totalResult[0]?.count || 0;

    return {
      data: data.map((row) => ({
        ...row.students,
        class: row.classes,
        grade: row.grades,
      })),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Get a single student by ID with class/grade info.
   */
  async getById(id: string) {
    const result = await db
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
      .leftJoin(grades, eq(classes.gradeId, grades.id))
      .where(eq(students.id, id))
      .limit(1);

    if (!result || result.length === 0) return null;
    const row = result[0];
    return {
      ...row.students,
      class: row.classes,
      grade: row.grades,
    };
  }

  /**
   * Search students for POS autocomplete (NISN, name, or grade).
   */
  async search(query: string, limit = 10) {
    const results = await db
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
      .leftJoin(grades, eq(classes.gradeId, grades.id))
      .where(
        or(
          ilike(students.fullName, `%${query}%`),
          ilike(students.nisn, `%${query}%`),
          ilike(students.studentCode, `%${query}%`)
        )
      )
      .limit(limit);

    return results.map((row) => ({
      ...row.students,
      class: row.classes,
      grade: row.grades,
    }));
  }

  /**
   * Get all classes with their grades for the frontend dropdown.
   */
  async getClasses() {
    const results = await db
      .select()
      .from(classes)
      .leftJoin(grades, eq(classes.gradeId, grades.id))
      .orderBy(grades.level, classes.name);

    return results.map((row) => ({
      ...row.classes,
      grade: row.grades,
    }));
  }

  /**
   * Automatically generate a student code (NIS) in format: STD-YY-XXXXX
   */
  async generateStudentCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `STD-${year}-`;
    
    // Find the highest existing code with this prefix
    const latest = await db
      .select({ code: students.studentCode })
      .from(students)
      .where(ilike(students.studentCode, `${prefix}%`))
      .orderBy(sql`${students.studentCode} DESC`)
      .limit(1);

    if (latest.length > 0 && latest[0].code) {
      const parts = latest[0].code.split("-");
      const lastNum = parseInt(parts[2]);
      const newNum = (lastNum + 1).toString().padStart(5, "0");
      return `${prefix}${newNum}`;
    }

    return `${prefix}00001`;
  }

  /**
   * Create a new student.
   */
  async create(data: {
    studentCode?: string;
    nisn: string;
    fullName: string;
    classId?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    status?: string;
    enrolledAt?: string;
  }) {
    // 1. Generate code if not provided
    const finalStudentCode = data.studentCode || (await this.generateStudentCode());

    // 2. Create the student record
    const [student] = await db
      .insert(students)
      .values({
        studentCode: finalStudentCode,
        nisn: data.nisn,
        fullName: data.fullName,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        guardianEmail: data.guardianEmail,
        status: (data.status as any) || "active",
        enrolledAt: data.enrolledAt,
      })
      .returning();

    // 2.5 Assign to class in active academic year
    if (data.classId) {
      const activeYear = await db.query.academicYears.findFirst({
        where: eq(academicYears.isActive, true),
      });

      if (activeYear) {
        await db.insert(studentClasses).values({
          studentId: student.id,
          classId: data.classId,
          academicYearId: activeYear.id,
          status: "active",
        });
      }
    }

    // 3. Automatically create a user account for the student
    try {
      const user = await userService.createUser({
        email: `${data.nisn}@student.edupay.pro`, // Login using NISN
        password: data.nisn, // Default password is NISN
        name: data.fullName,
        role: "student",
      });

      // 4. Link the user account back to the student
      if (user) {
        await db
          .update(students)
          .set({ userId: user.id })
          .where(eq(students.id, student.id));
      }
    } catch (err) {
      console.error("Failed to create student user account:", err);
    }

    return student;
  }

  /**
   * Update student balance directly (for corrections)
   */
  async updateBalance(id: string, newBalance: number) {
    const [updated] = await db
      .update(students)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();

    if (!updated) {
      throw new Error("Student not found");
    }

    return updated;
  }

  /**
   * Update an existing student.
   */
  async update(
    id: string,
    data: Partial<{
      fullName: string;
      classId: string;
      guardianName: string;
      guardianPhone: string;
      guardianEmail: string;
      status: string;
      avatarUrl: string;
    }>
  ) {
    // Pisahkan classId karena classId sekarang masuk ke riwayat studentClasses
    const { classId, ...updateData } = data;

    const [updated] = await db
      .update(students)
      .set({ ...updateData, updatedAt: new Date() } as any)
      .where(eq(students.id, id))
      .returning();

    // Update kelas aktif (hanya mengubah riwayat kelas aktif tahun ini)
    if (classId) {
      const activeYear = await db.query.academicYears.findFirst({
        where: eq(academicYears.isActive, true),
      });

      if (activeYear) {
        // Cek apakah sudah ada riwayat di tahun aktif
        const existingClass = await db.query.studentClasses.findFirst({
          where: and(
            eq(studentClasses.studentId, id),
            eq(studentClasses.academicYearId, activeYear.id)
          )
        });

        if (existingClass) {
          await db
            .update(studentClasses)
            .set({ classId, updatedAt: new Date() })
            .where(eq(studentClasses.id, existingClass.id));
        } else {
          await db.insert(studentClasses).values({
            studentId: id,
            classId,
            academicYearId: activeYear.id,
            status: "active",
          });
        }
      }
    }

    return updated || null;
  }

  /**
   * Hard-delete a student by removing the record.
   */
  async delete(id: string) {
    const student = await db.query.students.findFirst({
      where: eq(students.id, id),
    });
    
    if (student && student.userId) {
      try {
        await db.delete(user).where(eq(user.id, student.userId));
      } catch (err) {
        console.error(`Failed to delete linked user ${student.userId}:`, err);
      }
    }

    const [deleted] = await db
      .delete(students)
      .where(eq(students.id, id))
      .returning();

    return deleted || null;
  }

  /**
   * Bulk create students from parsed spreadsheet data (inserts or updates existing).
   */
  async bulkCreate(
    records: Array<{
      studentCode?: string;
      nisn: string;
      fullName: string;
      classId?: string;
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      status?: string;
    }>
  ) {
    if (records.length === 0) return [];

    const results = [];
    for (const r of records) {
      try {
        // Cari siswa yang sudah ada berdasarkan NISN atau kode siswa
        const conditions = [eq(students.nisn, r.nisn)];
        if (r.studentCode) {
          conditions.push(eq(students.studentCode, r.studentCode));
        }

        const existing = await db.query.students.findFirst({
          where: or(...conditions),
        });

        if (existing) {
          // Jika siswa sudah ada, update kelas dan data lainnya
          const student = await this.update(existing.id, r);
          if (student) {
            results.push(student);
          }
        } else {
          // Jika siswa belum ada, buat baru
          const student = await this.create(r);
          results.push(student);
        }
      } catch (err) {
        console.error(`Failed to process student ${r.fullName}:`, err);
      }
    }

    return results;
  }

  /**
   * Promote students to a new class for a new academic year.
   */
  async promoteStudents(data: {
    studentIds: string[];
    newClassId: string;
    newAcademicYearId: string;
  }) {
    if (data.studentIds.length === 0) return 0;

    // Update existing active class records to inactive for these students
    await db
      .update(studentClasses)
      .set({ status: "inactive" })
      .where(
        and(
          inArray(studentClasses.studentId, data.studentIds),
          eq(studentClasses.status, "active")
        )
      );

    const values = data.studentIds.map(studentId => ({
      studentId,
      classId: data.newClassId,
      academicYearId: data.newAcademicYearId,
      status: "active" as const,
    }));

    const inserted = await db.insert(studentClasses).values(values).returning();
    return inserted.length;
  }

  /**
   * Bulk hard-delete students.
   */
  async bulkDelete(ids: string[]) {
    if (ids.length === 0) return 0;

    const selectedStudents = await db
      .select({ userId: students.userId })
      .from(students)
      .where(inArray(students.id, ids));

    const userIds = selectedStudents.map(s => s.userId).filter(Boolean) as string[];

    if (userIds.length > 0) {
      try {
        await db.delete(user).where(inArray(user.id, userIds));
      } catch (err) {
        console.error("Failed to delete linked users in bulk:", err);
      }
    }

    const result = await db
      .delete(students)
      .where(inArray(students.id, ids))
      .returning();

    return result.length;
  }

  /**
   * Top up student balance manually.
   */
  async topUpBalance(
    studentId: string,
    data: {
      amount: number;
      paymentMethod: string;
      notes?: string;
      recordedBy: string;
    }
  ) {
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) throw new Error("Siswa tidak ditemukan");

    return db.transaction(async (tx) => {
      // 1. Update balance
      await tx
        .update(students)
        .set({ balance: sql`${students.balance} + ${data.amount}` })
        .where(eq(students.id, studentId));

      // 2. Generate income code
      const date = new Date();
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString().slice(-2);
      const prefix = `INC-${day}${month}${year}-`;

      const latest = await tx
        .select({ code: incomes.incomeCode })
        .from(incomes)
        .where(ilike(incomes.incomeCode, `${prefix}%`))
        .orderBy(desc(incomes.incomeCode))
        .limit(1);

      let code = `${prefix}0001`;
      if (latest.length > 0 && latest[0].code) {
        const parts = latest[0].code.split("-");
        const lastNum = parseInt(parts[2]);
        if (!isNaN(lastNum)) {
          const newNum = (lastNum + 1).toString().padStart(4, "0");
          code = `${prefix}${newNum}`;
        }
      }

      // 3. Create income record
      const [income] = await tx
        .insert(incomes)
        .values({
          incomeCode: code,
          amount: data.amount,
          category: "Titipan Saldo",
          source: student.fullName,
          description: data.notes || `Top up saldo manual`,
          paymentMethod: data.paymentMethod as any,
          recordedBy: data.recordedBy,
          date: new Date(),
        })
        .returning();

      return income;
    });
  }

  /**
   * Bulk graduate students.
   */
  async bulkGraduate(ids: string[]) {
    if (ids.length === 0) return 0;

    // Update students status to graduated
    await db
      .update(students)
      .set({ status: "graduated" })
      .where(inArray(students.id, ids));

    // Update existing active class records to inactive for these students
    await db
      .update(studentClasses)
      .set({ status: "inactive" })
      .where(
        and(
          inArray(studentClasses.studentId, ids),
          eq(studentClasses.status, "active")
        )
      );

    return ids.length;
  }
}

export const studentService = new StudentService();
