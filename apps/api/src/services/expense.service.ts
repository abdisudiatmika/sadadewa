import { db } from "../db/index.js";
import { expenses } from "../db/schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export class ExpenseService {
  async createExpense(data: {
    amount: number;
    category: string;
    description?: string;
    date?: string;
    recordedBy: string;
  }) {
    const [expense] = await db
      .insert(expenses)
      .values({
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
        recordedBy: data.recordedBy,
      })
      .returning();
    return expense;
  }

  async listExpenses(params: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }) {
    const conditions = [];
    if (params.startDate) conditions.push(gte(expenses.date, new Date(params.startDate)));
    if (params.endDate) conditions.push(lte(expenses.date, new Date(params.endDate + "T23:59:59")));
    if (params.category) conditions.push(eq(expenses.category, params.category));

    return await db.query.expenses.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: { user: true },
      orderBy: [desc(expenses.date)],
    });
  }

  async deleteExpense(id: string) {
    return await db.delete(expenses).where(eq(expenses.id, id));
  }
}

export const expenseService = new ExpenseService();
