import { db } from "../db/index.js";
import { billingItems, feeTemplates, academicYears, students } from "../db/schema.js";
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

  /**
   * Bulk upload arrears from Excel.
   */
  async bulkUploadArrears(records: { nisn: string; amount: number; billName: string }[]) {
    // 1. Dapatkan academic year yang aktif
    let activeYear = await db.query.academicYears.findFirst({
      where: eq(academicYears.isActive, true),
    });

    if (!activeYear) {
      const currentYear = new Date().getFullYear();
      const [newYear] = await db
        .insert(academicYears)
        .values({
          name: `${currentYear}/${currentYear + 1}`,
          startDate: `${currentYear}-07-01`,
          endDate: `${currentYear + 1}-06-30`,
          isActive: true,
        })
        .returning();
      activeYear = newYear;
    }

    const currentYearId = activeYear.id;
    let importedCount = 0;

    // Cache template fee yang sudah dibuat agar tidak berulang kali insert
    const templateCache = new Map<string, string>();

    // Ambil semua template yang ada di tahun ajaran aktif
    const existingTemplates = await db.query.feeTemplates.findMany({
      where: and(
        eq(feeTemplates.academicYearId, currentYearId),
        eq(feeTemplates.category, "incidental")
      ),
    });

    for (const tmpl of existingTemplates) {
      templateCache.set(tmpl.name.toLowerCase(), tmpl.id);
    }

    for (const record of records) {
      // 2. Cari siswa berdasarkan NISN
      const student = await db.query.students.findFirst({
        where: eq(students.nisn, record.nisn),
      });

      if (!student) {
        console.warn(`Siswa dengan NISN ${record.nisn} tidak ditemukan, melewati...`);
        continue;
      }

      // 3. Pastikan feeTemplate untuk nama tagihan ini ada
      const billNameKey = record.billName.toLowerCase();
      let templateId = templateCache.get(billNameKey);

      if (!templateId) {
        // Buat kode unik untuk template
        const code = `ARR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const [newTemplate] = await db
          .insert(feeTemplates)
          .values({
            code,
            name: record.billName,
            category: "incidental",
            frequency: "once",
            amount: 0, // Amount default 0 karena tagihan spesifik siswa beda-beda
            academicYearId: currentYearId,
          })
          .returning();
        templateId = newTemplate.id;
        templateCache.set(billNameKey, templateId);
      }

      // 4. Masukkan ke billingItems
      await db.insert(billingItems).values({
        studentId: student.id,
        feeTemplateId: templateId,
        academicYearId: currentYearId,
        billingYear: new Date().getFullYear(),
        amount: record.amount,
        status: "unpaid",
      });

      importedCount++;
    }

    return { imported: importedCount };
  }
}

export const billingService = new BillingService();
