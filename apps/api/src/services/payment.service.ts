import { db } from "../db/index.js";
import {
  billingItems,
  transactions,
  transactionItems,
  discountCodes,
} from "../db/schema.js";
import { eq, and, inArray, sql, gte } from "drizzle-orm";

export class PaymentService {
  /**
   * Process a checkout from the POS terminal.
   * Creates a transaction, marks billing items as paid.
   */
  async checkout(params: {
    studentId: string;
    billingItemIds: string[];
    discountCode?: string;
    paymentMethod: "cash" | "transfer" | "qris";
    cashierId: string;
    notes?: string;
  }) {
    return await db.transaction(async (tx) => {
      // 1. Fetch billing items and validate ownership + status
      const items = await tx.query.billingItems.findMany({
        where: and(
          inArray(billingItems.id, params.billingItemIds),
          eq(billingItems.studentId, params.studentId)
        ),
        with: { feeTemplate: true },
      });

      if (items.length !== params.billingItemIds.length) {
        throw new Error(
          "Some billing items not found or do not belong to this student"
        );
      }

      const unpayable = items.filter(
        (i) => i.status !== "unpaid" && i.status !== "overdue"
      );
      if (unpayable.length > 0) {
        throw new Error("Some billing items are already paid or not billable");
      }

      // 2. Calculate subtotal
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

      // 3. Apply discount if provided
      let discountAmount = 0;
      if (params.discountCode) {
        const [discount] = await tx
          .select()
          .from(discountCodes)
          .where(
            and(
              eq(discountCodes.code, params.discountCode.toUpperCase()),
              eq(discountCodes.isActive, true)
            )
          );

        if (!discount) {
          throw new Error("Invalid or expired discount code");
        }

        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
          throw new Error("Discount code has reached maximum uses");
        }

        if (discount.type === "percentage") {
          discountAmount = Math.floor(subtotal * (discount.value / 100));
        } else {
          discountAmount = Math.min(discount.value, subtotal);
        }

        // Increment usage counter
        await tx
          .update(discountCodes)
          .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
          .where(eq(discountCodes.id, discount.id));
      }

      // 4. Calculate late fees (Rp 25,000 per overdue item)
      const overdueItems = items.filter((i) => i.status === "overdue");
      const lateFee = overdueItems.length * 25000;

      // 5. Calculate total
      const total = subtotal - discountAmount + lateFee;

      // 6. Generate transaction code (DDMMYY-NN format)
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const dateStr = `${dd}${mm}${yy}`;

      // Get count of transactions for today to get sequential number
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [todayCountResult] = await tx
        .select({ val: sql<number>`count(*)` })
        .from(transactions)
        .where(gte(transactions.createdAt, startOfDay));

      const sequence = (Number(todayCountResult?.val || 0) + 1)
        .toString()
        .padStart(2, "0");
      const transactionCode = `${dateStr}-${sequence}`;

      // 7. Create transaction
      const [transaction] = await tx
        .insert(transactions)
        .values({
          transactionCode,
          studentId: params.studentId,
          cashierId: params.cashierId,
          subtotal,
          discountCode: params.discountCode?.toUpperCase() || null,
          discountAmount,
          lateFee,
          total,
          paymentMethod: params.paymentMethod,
          notes: params.notes,
        })
        .returning();

      // 8. Create transaction items
      await tx.insert(transactionItems).values(
        items.map((item) => ({
          transactionId: transaction.id,
          billingItemId: item.id,
          amount: item.amount,
        }))
      );

      // 9. Update billing items to paid
      await tx
        .update(billingItems)
        .set({
          status: "paid",
          paidAt: now,
          updatedAt: now,
        })
        .where(inArray(billingItems.id, params.billingItemIds));

      return {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        subtotal,
        discountAmount,
        lateFee,
        total,
        itemCount: items.length,
        paidAt: now.toISOString(),
      };
    });
  }

  /**
   * List transactions with pagination.
   */
  async listTransactions(params: { 
    page?: number; 
    perPage?: number; 
    studentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const offset = (page - 1) * perPage;

    const conditions = [];
    if (params.studentId) {
      conditions.push(eq(transactions.studentId, params.studentId));
    }
    
    if (params.startDate) {
      conditions.push(sql`${transactions.createdAt} >= ${params.startDate}`);
    }
    
    if (params.endDate) {
      // Add one day to end date to include the entire day if it's just a date string
      conditions.push(sql`${transactions.createdAt} <= ${params.endDate} || ' 23:59:59'`);
    }

    const data = await db.query.transactions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        student: true,
        cashier: true,
        items: { 
          with: { 
            billingItem: {
              with: { feeTemplate: true }
            } 
          } 
        },
      },
      limit: perPage,
      offset,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    return data;
  }

  /**
   * Get a single transaction by ID with full details.
   */
  async getTransactionById(id: string) {
    return db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: {
        student: true,
        cashier: true,
        items: {
          with: {
            billingItem: {
              with: { feeTemplate: true },
            },
          },
        },
      },
    });
  }

  /**
   * Validate a discount code without applying it.
   */
  async validateDiscount(code: string) {
    const [discount] = await db
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.code, code.toUpperCase()),
          eq(discountCodes.isActive, true)
        )
      );

    if (!discount) {
      return { valid: false, error: "Invalid or expired discount code" };
    }

    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return { valid: false, error: "Discount code has reached maximum uses" };
    }

    return {
      valid: true,
      discount: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description,
      },
    };
  }
}

export const paymentService = new PaymentService();
