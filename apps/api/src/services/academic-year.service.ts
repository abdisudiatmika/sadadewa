import { db } from "../db/index.js";
import { academicYears } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export class AcademicYearService {
  async getAll() {
    return await db
      .select()
      .from(academicYears)
      .orderBy(desc(academicYears.startDate));
  }

  async create(data: {
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }) {
    // Jika diset aktif, matikan yang lain dulu
    if (data.isActive) {
      await db
        .update(academicYears)
        .set({ isActive: false })
        .where(eq(academicYears.isActive, true));
    }

    const [newYear] = await db
      .insert(academicYears)
      .values(data)
      .returning();
      
    return newYear;
  }

  async update(
    id: string,
    data: { name?: string; startDate?: string; endDate?: string; isActive?: boolean }
  ) {
    if (data.isActive === true) {
      // Matikan yang lain dulu
      await db
        .update(academicYears)
        .set({ isActive: false })
        .where(eq(academicYears.isActive, true));
    }

    const [updated] = await db
      .update(academicYears)
      .set(data)
      .where(eq(academicYears.id, id))
      .returning();
      
    return updated || null;
  }

  async setActive(id: string) {
    // 1. Matikan semua
    await db
      .update(academicYears)
      .set({ isActive: false })
      .where(eq(academicYears.isActive, true));
      
    // 2. Aktifkan yang dipilih
    const [updated] = await db
      .update(academicYears)
      .set({ isActive: true })
      .where(eq(academicYears.id, id))
      .returning();
      
    return updated || null;
  }

  async delete(id: string) {
    // Cek apakah ini sedang aktif? Sebaiknya yang aktif tidak boleh dihapus
    const year = await db.query.academicYears.findFirst({
      where: eq(academicYears.id, id)
    });
    
    if (year?.isActive) {
      throw new Error("Cannot delete active academic year");
    }

    const [deleted] = await db
      .delete(academicYears)
      .where(eq(academicYears.id, id))
      .returning();
      
    return deleted || null;
  }
}

export const academicYearService = new AcademicYearService();
