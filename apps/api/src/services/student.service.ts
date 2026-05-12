import { db } from "../db/index.js";
import { students, classes, grades } from "../db/schema.js";
import { eq, ilike, and, or, sql, count } from "drizzle-orm";
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
      conditions.push(eq(students.status, params.status as any));
    }

    if (params.classId) {
      conditions.push(eq(students.classId, params.classId));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(grades, eq(classes.gradeId, grades.id))
        .where(whereClause)
        .limit(perPage)
        .offset(offset)
        .orderBy(students.fullName),
      db
        .select({ count: count() })
        .from(students)
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
    const result = await db.query.students.findFirst({
      where: eq(students.id, id),
      with: {
        class: {
          with: {
            grade: true,
          },
        },
      },
    });

    return result || null;
  }

  /**
   * Search students for POS autocomplete (NISN, name, or grade).
   */
  async search(query: string, limit = 10) {
    const results = await db
      .select()
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
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
        classId: data.classId || null,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        guardianEmail: data.guardianEmail,
        status: (data.status as any) || "active",
        enrolledAt: data.enrolledAt,
      })
      .returning();

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
    const [updated] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(students.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Soft-delete a student by setting status to inactive.
   */
  async delete(id: string) {
    const [updated] = await db
      .update(students)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Bulk create students from parsed spreadsheet data.
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
    }>
  ) {
    if (records.length === 0) return [];

    const results = [];
    for (const r of records) {
      try {
        const student = await this.create(r);
        results.push(student);
      } catch (err) {
        console.error(`Failed to create student ${r.fullName}:`, err);
      }
    }

    return results;
  }
}

export const studentService = new StudentService();
