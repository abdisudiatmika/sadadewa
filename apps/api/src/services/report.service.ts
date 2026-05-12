import { db } from "../db/index.js";
import {
  billingItems,
  students,
  transactions,
  transactionItems,
  feeTemplates,
  classes,
  grades,
  reminders,
} from "../db/schema.js";
import { eq, and, sql, count, sum, ne, gte, lte, inArray, desc } from "drizzle-orm";

export class ReportService {
  /**
   * Get summary stats for the Reports dashboard KPI cards.
   */
  async getSummary(filters?: {
    academicYearId?: string;
    gradeId?: string;
  }) {
    const conditions = [];
    if (filters?.academicYearId) {
      conditions.push(
        eq(billingItems.academicYearId, filters.academicYearId)
      );
    }

    const baseWhere =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Total revenue (sum of paid billing items)
    const [revenueResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
      })
      .from(billingItems)
      .where(
        baseWhere
          ? and(baseWhere, eq(billingItems.status, "paid"))
          : eq(billingItems.status, "paid")
      );

    // Total outstanding (sum of overdue + unpaid billing items)
    const [outstandingResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
      })
      .from(billingItems)
      .where(
        baseWhere
          ? and(
              baseWhere,
              sql`${billingItems.status} IN ('overdue', 'unpaid')`
            )
          : sql`${billingItems.status} IN ('overdue', 'unpaid')`
      );

    // Total billed
    const totalBilled =
      (revenueResult?.total || 0) + (outstandingResult?.total || 0);

    // Collection rate
    const collectionRate =
      totalBilled > 0
        ? Math.round(((revenueResult?.total || 0) / totalBilled) * 1000) / 10
        : 0;

    return {
      totalRevenue: revenueResult?.total || 0,
      collectionRate,
      totalOutstanding: outstandingResult?.total || 0,
      revenueChangePercent: 12.5, // Placeholder - would compute vs prior period
      outstandingChangePercent: -2.1,
    };
  }

  /**
   * Get monthly revenue trends for the bar chart.
   */
  async getRevenueTrends(academicYearId?: string) {
    const conditions = [eq(billingItems.status, "paid")];
    if (academicYearId) {
      conditions.push(eq(billingItems.academicYearId, academicYearId));
    }

    const results = await db
      .select({
        month: billingItems.billingMonth,
        year: billingItems.billingYear,
        total: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
      })
      .from(billingItems)
      .where(and(...conditions))
      .groupBy(billingItems.billingMonth, billingItems.billingYear)
      .orderBy(billingItems.billingYear, billingItems.billingMonth);

    const monthNames = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return results.map((r) => ({
      month: r.month ? monthNames[r.month] : "N/A",
      year: r.year,
      amount: r.total,
    }));
  }

  /**
   * Get revenue breakdown by fee category for the donut chart.
   */
  async getRevenueByComponent(academicYearId?: string) {
    const conditions = [eq(billingItems.status, "paid")];
    if (academicYearId) {
      conditions.push(eq(billingItems.academicYearId, academicYearId));
    }

    const results = await db
      .select({
        category: feeTemplates.name,
        total: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
      })
      .from(billingItems)
      .innerJoin(
        feeTemplates,
        eq(billingItems.feeTemplateId, feeTemplates.id)
      )
      .where(and(...conditions))
      .groupBy(feeTemplates.name)
      .orderBy(sql`SUM(${billingItems.amount}) DESC`);

    const grandTotal = results.reduce((sum, r) => sum + r.total, 0);

    return results.map((r) => ({
      category: r.category,
      amount: r.total,
      percentage:
        grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
    }));
  }

  /**
   * Get delinquency list (students with outstanding balances).
   */
  async getDelinquency(params?: { limit?: number }) {
    const limit = params?.limit || 20;

    const results = await db
      .select({
        studentId: students.id,
        studentName: students.fullName,
        className: classes.name,
        gradeName: grades.name,
        totalArrears: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
        monthsOverdue: sql<number>`COUNT(DISTINCT ${billingItems.billingMonth})`,
      })
      .from(billingItems)
      .innerJoin(students, eq(billingItems.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(grades, eq(classes.gradeId, grades.id))
      .where(eq(billingItems.status, "overdue"))
      .groupBy(students.id, students.fullName, classes.name, grades.name)
      .orderBy(sql`SUM(${billingItems.amount}) DESC`)
      .limit(limit);

    return results.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      className: r.gradeName && r.className
        ? `${r.gradeName} ${r.className}`
        : r.className || "",
      monthsOverdue: r.monthsOverdue,
      totalArrears: r.totalArrears,
      initials: r.studentName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    }));
  }

  /**
   * Get dashboard overview stats.
   */
  async getDashboardStats() {
    const [activeStudents] = await db
      .select({ count: count() })
      .from(students)
      .where(eq(students.status, "active"));

    const [totalArrears] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
      })
      .from(billingItems)
      .where(eq(billingItems.status, "overdue"));

    const [unpaidThisMonth] = await db
      .select({ count: count() })
      .from(billingItems)
      .where(
        and(
          sql`${billingItems.status} IN ('unpaid', 'overdue')`,
          eq(billingItems.billingMonth, new Date().getMonth() + 1),
          eq(billingItems.billingYear, new Date().getFullYear())
        )
      );

    const [monthlyRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${billingItems.amount}), 0)`,
      })
      .from(billingItems)
      .where(
        and(
          eq(billingItems.status, "paid"),
          eq(billingItems.billingMonth, new Date().getMonth() + 1),
          eq(billingItems.billingYear, new Date().getFullYear())
        )
      );

    return {
      totalActiveStudents: activeStudents?.count || 0,
      totalArrears: totalArrears?.total || 0,
      unpaidThisMonth: unpaidThisMonth?.count || 0,
      monthlyRevenue: monthlyRevenue?.total || 0,
    };
  }

  /**
   * Get top arrears for the dashboard sidebar table.
   */
  async getTopArrears(limit = 5) {
    return this.getDelinquency({ limit });
  }

  /**
   * Send a payment reminder (records the action).
   */
  async sendReminder(params: {
    studentId: string;
    sentBy: string;
    channel: "whatsapp" | "email" | "sms";
    message?: string;
  }) {
    const [reminder] = await db
      .insert(reminders)
      .values({
        studentId: params.studentId,
        sentBy: params.sentBy,
        channel: params.channel,
        message:
          params.message ||
          "Yth. Orang Tua/Wali, mohon segera melunasi tunggakan pembayaran SPP. Terima kasih.",
      })
      .returning();

    return reminder;
  }

  /**
   * Laporan Pemasukan Harian
   */
  async getDailyIncome(date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return await db.query.transactions.findMany({
      where: and(gte(transactions.createdAt, start), lte(transactions.createdAt, end)),
      with: {
        student: true,
        items: { with: { billingItem: { with: { feeTemplate: true } } } },
      },
    });
  }

  /**
   * Laporan Pemasukan Bulanan
   */
  async getMonthlyIncome(params: { month: number; year: number; paymentMethod?: string }) {
    const conditions = [
      sql`EXTRACT(MONTH FROM ${transactions.createdAt}) = ${params.month}`,
      sql`EXTRACT(YEAR FROM ${transactions.createdAt}) = ${params.year}`,
    ];
    if (params.paymentMethod) {
      conditions.push(eq(transactions.paymentMethod, params.paymentMethod as any));
    }

    return await db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        student: true,
        items: { with: { billingItem: { with: { feeTemplate: true } } } },
      },
    });
  }

  /**
   * Laporan Tunggakan (Detailed)
   */
  async getDetailedDelinquency(params: { 
    classId?: string; 
    gradeId?: string; 
    feeTemplateId?: string;
  }) {
    const conditions = [eq(billingItems.status, "overdue")];
    
    if (params.feeTemplateId) {
      conditions.push(eq(billingItems.feeTemplateId, params.feeTemplateId));
    }

    const studentConditions = [];
    if (params.classId) studentConditions.push(eq(students.classId, params.classId));
    
    // For gradeId, we need to join through classes
    let results = await db.query.billingItems.findMany({
      where: and(...conditions),
      with: {
        feeTemplate: true,
        student: {
          with: { class: { with: { grade: true } } }
        }
      }
    });

    // Filter by grade if needed (since it's deep in relation)
    if (params.gradeId) {
      results = results.filter(r => r.student?.class?.gradeId === params.gradeId);
    }
    
    // Filter by class if needed (if studentConditions weren't applied directly)
    if (params.classId) {
      results = results.filter(r => r.student?.classId === params.classId);
    }

    return results;
  }

  /**
   * Laporan Rekap per Siswa (Student Ledger)
   */
  async getStudentLedger(studentId: string) {
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
      with: { class: { with: { grade: true } } },
    });

    const items = await db.query.billingItems.findMany({
      where: eq(billingItems.studentId, studentId),
      with: { feeTemplate: true },
      orderBy: [billingItems.billingYear, billingItems.billingMonth],
    });

    const paymentTransactions = await db.query.transactions.findMany({
      where: eq(transactions.studentId, studentId),
      with: { items: { with: { billingItem: { with: { feeTemplate: true } } } } },
      orderBy: [desc(transactions.createdAt)],
    });

    return { student, billingItems: items, transactions: paymentTransactions };
  }

  /**
   * Laporan Rekap per Kelas
   */
  async getClassSummary(classId: string) {
    const cls = await db.query.classes.findFirst({
      where: eq(classes.id, classId),
      with: { grade: true, students: true }
    });

    if (!cls) throw new Error("Class not found");

    const studentIds = cls.students.map(s => s.id);
    if (studentIds.length === 0) return { class: cls, stats: [] };

    const stats = await db
      .select({
        studentId: billingItems.studentId,
        totalBilled: sql<number>`SUM(${billingItems.amount})`,
        totalPaid: sql<number>`SUM(CASE WHEN ${billingItems.status} = 'paid' THEN ${billingItems.amount} ELSE 0 END)`,
        totalOutstanding: sql<number>`SUM(CASE WHEN ${billingItems.status} IN ('unpaid', 'overdue') THEN ${billingItems.amount} ELSE 0 END)`,
      })
      .from(billingItems)
      .where(inArray(billingItems.studentId, studentIds))
      .groupBy(billingItems.studentId);

    return { class: cls, stats };
  }
}

export const reportService = new ReportService();
