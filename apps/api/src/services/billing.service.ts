import { db } from "../db/index.js";
import { billingItems, feeTemplates } from "../db/schema.js";
import { eq, and, count } from "drizzle-orm";

export class BillingService {
  /**
   * Get all billing items for a student within an academic year.
   * Used by the POS 12-month grid and Student Dashboard timeline.
   */
  async getStudentBilling(studentId: string, academicYearId?: string) {
    const conditions = [eq(billingItems.studentId, studentId)];

    if (academicYearId) {
      conditions.push(eq(billingItems.academicYearId, academicYearId));
    }

    const items = await db.query.billingItems.findMany({
      where: and(...conditions),
      with: {
        feeTemplate: true,
      },
      orderBy: (bi, { asc }) => [asc(bi.billingYear), asc(bi.billingMonth)],
    });

    return items;
  }

  /**
   * List billing items with filters and pagination.
   */
  async list(params: {
    page?: number;
    perPage?: number;
    studentId?: string;
    status?: string;
    month?: number;
    year?: number;
  }) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const offset = (page - 1) * perPage;

    const conditions = [];

    if (params.studentId) {
      conditions.push(eq(billingItems.studentId, params.studentId));
    }
    if (params.status) {
      conditions.push(eq(billingItems.status, params.status as any));
    }
    if (params.month) {
      conditions.push(eq(billingItems.billingMonth, params.month));
    }
    if (params.year) {
      conditions.push(eq(billingItems.billingYear, params.year));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db.query.billingItems.findMany({
        where: whereClause,
        with: {
          student: true,
          feeTemplate: true,
        },
        limit: perPage,
        offset,
        orderBy: (bi, { desc }) => [desc(bi.createdAt)],
      }),
      db.select({ count: count() }).from(billingItems).where(whereClause),
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
   * Manually update the status of a billing item (admin override).
   */
  async updateStatus(id: string, status: string) {
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    const [updated] = await db
      .update(billingItems)
      .set(updateData as any)
      .where(eq(billingItems.id, id))
      .returning();

    return updated || null;
  }
}

export const billingService = new BillingService();
