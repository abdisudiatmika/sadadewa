import { db } from "../db/index.js";
import { grades, classes, academicYears, user } from "../db/schema.js";
import { eq, asc, or } from "drizzle-orm";

export class MasterService {
  // ==========================================
  // GRADES (Tingkat)
  // ==========================================

  async getGrades() {
    return await db.select().from(grades).orderBy(asc(grades.level));
  }

  async createGrade(data: { name: string; level: number }) {
    const [grade] = await db
      .insert(grades)
      .values(data)
      .returning();
    return grade;
  }

  async updateGrade(id: string, data: { name?: string; level?: number }) {
    const [updated] = await db
      .update(grades)
      .set(data)
      .where(eq(grades.id, id))
      .returning();
    return updated || null;
  }

  async deleteGrade(id: string) {
    const [deleted] = await db
      .delete(grades)
      .where(eq(grades.id, id))
      .returning();
    return deleted || null;
  }

  // ==========================================
  // CLASSES (Jurusan / Ruang)
  // ==========================================

  async getClasses() {
    const results = await db
      .select()
      .from(classes)
      .leftJoin(grades, eq(classes.gradeId, grades.id))
      .leftJoin(user, eq(classes.homeroomTeacherId, user.id))
      .orderBy(asc(grades.level), asc(classes.name));

    return results.map((row) => ({
      ...row.classes,
      grade: row.grades,
      teacherAccount: row.user ? {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email
      } : null
    }));
  }

  async createClass(data: { name: string; gradeId: string; homeroomTeacher?: string; homeroomTeacherId?: string }) {
    // Cari academic year yang aktif
    const activeYear = await db.query.academicYears.findFirst({
      where: eq(academicYears.isActive, true),
    });

    if (!activeYear) {
      throw new Error("No active academic year found");
    }

    const [newClass] = await db
      .insert(classes)
      .values({
        name: data.name,
        gradeId: data.gradeId,
        homeroomTeacher: data.homeroomTeacher || null,
        homeroomTeacherId: data.homeroomTeacherId || null,
        academicYearId: activeYear.id,
      })
      .returning();

    return newClass;
  }

  async updateClass(id: string, data: { name?: string; gradeId?: string; homeroomTeacher?: string; homeroomTeacherId?: string }) {
    const [updated] = await db
      .update(classes)
      .set(data)
      .where(eq(classes.id, id))
      .returning();
    return updated || null;
  }

  async deleteClass(id: string) {
    const [deleted] = await db
      .delete(classes)
      .where(eq(classes.id, id))
      .returning();
    return deleted || null;
  }

  // ==========================================
  // USERS / TEACHERS
  // ==========================================

  async getTeachers() {
    return await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })
      .from(user)
      .where(or(eq(user.role, "teacher"), eq(user.role, "staff")))
      .orderBy(asc(user.name));
  }
}

export const masterService = new MasterService();
