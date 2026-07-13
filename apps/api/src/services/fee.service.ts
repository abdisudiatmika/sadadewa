import { db } from "../db/index.js";
import {
  feeTemplates,
  grades,
  academicYears,
  billingItems,
  students,
  studentClasses,
  classes,
} from "../db/schema.js";
import { eq, ilike, and, count, sql, or, ne } from "drizzle-orm";

export class FeeService {
  /**
   * List fee templates with pagination and search.
   */
  async list(params: { page?: number; perPage?: number; search?: string }) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const offset = (page - 1) * perPage;

    const whereClause = params.search
      ? ilike(feeTemplates.name, `%${params.search}%`)
      : undefined;

    const [data, totalResult] = await Promise.all([
      db.query.feeTemplates.findMany({
        where: whereClause,
        with: {
          targetGrade: true,
          academicYear: true,
        },
        limit: perPage,
        offset,
        orderBy: (ft, { desc }) => [desc(ft.createdAt)],
      }),
      db.select({ count: count() }).from(feeTemplates).where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Get summary stats for the Fee Master dashboard cards.
   */
  async getSummary() {
    const [activeCount] = await db
      .select({ count: count() })
      .from(feeTemplates)
      .where(eq(feeTemplates.status, "active"));

    const [recurringRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${feeTemplates.amount}), 0)`,
      })
      .from(feeTemplates)
      .where(
        and(
          eq(feeTemplates.status, "active"),
          eq(feeTemplates.category, "recurring")
        )
      );

    const [oneTimeCount] = await db
      .select({ count: count() })
      .from(feeTemplates)
      .where(
        and(
          eq(feeTemplates.status, "active"),
          eq(feeTemplates.category, "one_time")
        )
      );

    return {
      activeFees: activeCount?.count || 0,
      estimatedMonthlyRevenue: recurringRevenue?.total || 0,
      oneTimeFees: oneTimeCount?.count || 0,
    };
  }

  /**
   * Get a single fee template by ID.
   */
  async getById(id: string) {
    return db.query.feeTemplates.findFirst({
      where: eq(feeTemplates.id, id),
      with: { targetGrade: true, academicYear: true },
    });
  }

  /**
   * Create a new fee template.
   */
  async create(data: {
    code: string;
    name: string;
    category: "recurring" | "one_time";
    frequency: "monthly" | "yearly" | "once";
    amount: number;
    targetDescription?: string;
    targetGradeId?: string;
  }) {
    // Cari academic year yang aktif
    const activeYear = await db.query.academicYears.findFirst({
      where: eq(academicYears.isActive, true),
    });

    if (!activeYear) {
      throw new Error("No active academic year found");
    }

    const [fee] = await db
      .insert(feeTemplates)
      .values({
        code: data.code,
        name: data.name,
        category: data.category,
        frequency: data.frequency,
        amount: data.amount,
        targetDescription: data.targetDescription,
        targetGradeId: data.targetGradeId || null,
        academicYearId: activeYear.id,
        status: "active",
      })
      .returning();

    return fee;
  }

  /**
   * Update a fee template.
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      frequency: string;
      amount: number;
      targetDescription: string;
      targetGradeId: string;
      status: string;
    }>
  ) {
    const [updated] = await db
      .update(feeTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(feeTemplates.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Duplicate a fee template with a new code.
   */
  async duplicate(id: string) {
    const original = await this.getById(id);
    if (!original) return null;

    const [duplicated] = await db
      .insert(feeTemplates)
      .values({
        code: `${original.code}-COPY`,
        name: `${original.name} (Copy)`,
        category: original.category,
        frequency: original.frequency,
        amount: original.amount,
        targetDescription: original.targetDescription,
        targetGradeId: original.targetGradeId,
        academicYearId: original.academicYearId,
        status: "inactive",
      })
      .returning();

    return duplicated;
  }

  /**
   * Delete a fee template. Prevents deletion if there are already paid bills.
   */
  async delete(id: string) {
    // Check if there are any paid bills associated with this template
    const [paidBillsCount] = await db
      .select({ count: count() })
      .from(billingItems)
      .where(and(
        eq(billingItems.feeTemplateId, id),
        eq(billingItems.status, "paid")
      ));

    if (paidBillsCount && paidBillsCount.count > 0) {
      throw new Error(`Tidak bisa menghapus master biaya ini karena sudah ada ${paidBillsCount.count} tagihan yang dibayar oleh siswa.`);
    }

    const [deleted] = await db
      .delete(feeTemplates)
      .where(eq(feeTemplates.id, id))
      .returning();

    return deleted || null;
  }

  /**
   * Generate billing items for targeted students (by class, grade, or specific student).
   */
  async generateBills(feeTemplateId: string, target?: { classId?: string; studentId?: string }) {
    const template = await this.getById(feeTemplateId);
    if (!template) throw new Error("Fee template not found");

    // Find targeted students based on grade filter or explicit class filter
    let studentConditions = [
      eq(studentClasses.academicYearId, template.academicYearId),
      eq(studentClasses.status, "active")
    ];

    if (target?.studentId) {
      studentConditions.push(eq(studentClasses.studentId, target.studentId));
    } else if (target?.classId) {
      studentConditions.push(eq(studentClasses.classId, target.classId));
    } else if (template.targetGradeId) {
      const targetClasses = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.gradeId, template.targetGradeId));

      const classIds = targetClasses.map((c) => c.id);
      if (classIds.length === 0) return { generated: 0 };

      studentConditions.push(sql`${studentClasses.classId} = ANY(${classIds})`);
    }

    const targetStudents = await db
      .select({ id: studentClasses.studentId })
      .from(studentClasses)
      .innerJoin(students, eq(studentClasses.studentId, students.id))
      .where(and(...studentConditions, ne(students.status, "graduated")));

    if (targetStudents.length === 0) return { generated: 0 };

    // Get academic year details to determine the actual calendar years
    const [academicYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, template.academicYearId));
      
    if (!academicYear) throw new Error("Academic year not found");
    
    // Parse the start year from startDate (e.g. "2026-07-01" -> 2026)
    const startYear = new Date(academicYear.startDate).getFullYear();
    const endYear = startYear + 1;

    // Determine billing periods
    const periods: Array<{ month: number | null; year: number }> = [];

    if (template.frequency === "monthly") {
      // Generate for months 7-12 (Jul to Dec) using startYear
      for (let m = 7; m <= 12; m++) periods.push({ month: m, year: startYear });
      // Generate for months 1-6 (Jan to Jun) using endYear
      for (let m = 1; m <= 6; m++) periods.push({ month: m, year: endYear });
    } else {
      periods.push({ month: null, year: startYear });
    }

    const values = targetStudents.flatMap((student) =>
      periods.map((period) => ({
        studentId: student.id,
        feeTemplateId: template.id,
        academicYearId: template.academicYearId,
        billingMonth: period.month,
        billingYear: period.year,
        amount: template.amount,
        status: "unpaid" as const,
        dueDate: period.month
          ? `${period.year}-${String(period.month).padStart(2, "0")}-10`
          : `${period.year}-08-01`,
      }))
    );

    const inserted = await db
      .insert(billingItems)
      .values(values)
      .returning();

    return { generated: inserted.length };
  }

  /**
   * Delete only UNPAID or OVERDUE bills for a specific fee template
   */
  async deleteUnpaidBills(feeTemplateId: string) {
    const deleted = await db
      .delete(billingItems)
      .where(and(
        eq(billingItems.feeTemplateId, feeTemplateId),
        or(eq(billingItems.status, "unpaid"), eq(billingItems.status, "overdue"))
      ))
      .returning();

    return { deletedBills: deleted.length };
  }
}

export const feeService = new FeeService();
