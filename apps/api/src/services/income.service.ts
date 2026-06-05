import { db } from "../db/index.js";
import { incomes, user } from "../db/schema.js";
import { eq, ilike, and, or, sql, count, desc } from "drizzle-orm";

export class IncomeService {
  /**
   * List incomes with pagination and search
   */
  async list(params: {
    page?: number;
    perPage?: number;
    search?: string;
    category?: string;
  }) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const offset = (page - 1) * perPage;

    const conditions = [];

    if (params.search) {
      conditions.push(
        or(
          ilike(incomes.incomeCode, `%${params.search}%`),
          ilike(incomes.source, `%${params.search}%`),
          ilike(incomes.description, `%${params.search}%`)
        )
      );
    }

    if (params.category) {
      conditions.push(eq(incomes.category, params.category));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(incomes)
        .leftJoin(user, eq(incomes.recordedBy, user.id))
        .where(whereClause)
        .limit(perPage)
        .offset(offset)
        .orderBy(desc(incomes.date)),
      db
        .select({ count: count() })
        .from(incomes)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: data.map((row) => ({
        ...row.incomes,
        recordedByAdmin: row.user,
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
   * Get single income detail
   */
  async getById(id: string) {
    const result = await db
      .select()
      .from(incomes)
      .leftJoin(user, eq(incomes.recordedBy, user.id))
      .where(eq(incomes.id, id));

    if (!result || result.length === 0) return null;
    const row = result[0];
    return {
      ...row.incomes,
      recordedByAdmin: row.user,
    };
  }

  /**
   * Generate income code e.g. INC-2405-0001
   */
  async generateIncomeCode() {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    const prefix = `INC-${day}${month}${year}-`;

    const latest = await db
      .select({ code: incomes.incomeCode })
      .from(incomes)
      .where(ilike(incomes.incomeCode, `${prefix}%`))
      .orderBy(desc(incomes.incomeCode))
      .limit(1);

    if (latest.length > 0 && latest[0].code) {
      const parts = latest[0].code.split("-");
      const lastNum = parseInt(parts[2]);
      const newNum = (lastNum + 1).toString().padStart(4, "0");
      return `${prefix}${newNum}`;
    }

    return `${prefix}0001`;
  }

  /**
   * Create new income
   */
  async create(data: {
    amount: number;
    category: string;
    source: string;
    description?: string;
    paymentMethod: "cash" | "transfer" | "qris";
    recordedBy: string;
  }) {
    const code = await this.generateIncomeCode();

    const [income] = await db
      .insert(incomes)
      .values({
        incomeCode: code,
        amount: data.amount,
        category: data.category,
        source: data.source,
        description: data.description,
        paymentMethod: data.paymentMethod,
        recordedBy: data.recordedBy,
        date: new Date(),
      })
      .returning();

    return income;
  }
}

export const incomeService = new IncomeService();
