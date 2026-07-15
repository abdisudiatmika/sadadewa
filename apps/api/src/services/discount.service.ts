import { db } from "../db/index.js";
import { discountCodes } from "../db/schema.js";
import { eq, ilike, count } from "drizzle-orm";

export class DiscountService {
  async list(params: { page?: number; perPage?: number; search?: string }) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const offset = (page - 1) * perPage;
    
    let whereClause = undefined;
    if (params.search) {
      whereClause = ilike(discountCodes.code, `%${params.search}%`);
    }

    const data = await db
      .select()
      .from(discountCodes)
      .where(whereClause)
      .limit(perPage)
      .offset(offset)
      .orderBy(discountCodes.createdAt);

    const [total] = await db
      .select({ count: count() })
      .from(discountCodes)
      .where(whereClause);

    return {
      data,
      meta: {
        total: total.count,
        page,
        perPage,
        totalPages: Math.ceil(total.count / perPage),
      },
    };
  }

  async get(id: string) {
    const [result] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    if (!result) throw new Error("Discount code not found");
    return result;
  }

  async create(data: {
    code: string;
    description?: string;
    type: "percentage" | "fixed_amount";
    value: number;
    maxUses?: number;
    validFrom?: string;
    validUntil?: string;
    isActive?: boolean;
  }) {
    // Validate code uniqueness
    const [existing] = await db.select().from(discountCodes).where(eq(discountCodes.code, data.code.toUpperCase()));
    if (existing) {
      throw new Error("Discount code already exists");
    }

    const [result] = await db.insert(discountCodes).values({
      ...data,
      code: data.code.toUpperCase(),
      validFrom: data.validFrom || null,
      validUntil: data.validUntil || null,
    } as any).returning();

    return result;
  }

  async update(id: string, data: Partial<{
    description: string;
    type: "percentage" | "fixed_amount";
    value: number;
    maxUses: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
  }>) {
    const [result] = await db.update(discountCodes).set({
      ...data,
      validFrom: data.validFrom || null,
      validUntil: data.validUntil || null,
    } as any).where(eq(discountCodes.id, id)).returning();

    if (!result) throw new Error("Discount code not found");
    return result;
  }

  async delete(id: string) {
    const [result] = await db.delete(discountCodes).where(eq(discountCodes.id, id)).returning();
    if (!result) throw new Error("Discount code not found");
    return result;
  }
}

export const discountService = new DiscountService();
