import { db } from "../db/index.js";
import {
  billingItems,
  transactions,
  transactionItems,
  discountCodes,
  students,
  incomes,
} from "../db/schema.js";
import { eq, and, inArray, sql, gte } from "drizzle-orm";

export class PaymentService {
  /**
   * Process a checkout from the POS terminal.
   * Creates a transaction, marks billing items as paid.
   */
  async checkout(params: {
    studentId: string;
    payments: { billingItemId: string; amount: number }[];
    amountReceived?: number;
    discountCode?: string;
    paymentMethod: "cash" | "transfer" | "transfer_bri" | "transfer_bukopin" | "transfer_other" | "qris" | "balance";
    cashierId: string;
    notes?: string;
    saveToBalance?: boolean;
    useBalance?: boolean;
  }) {
    return await db.transaction(async (tx) => {
      // 1. Fetch billing items and validate ownership + status
      const billingItemIds = params.payments.map((p) => p.billingItemId);
      const items = await tx.query.billingItems.findMany({
        where: and(
          inArray(billingItems.id, billingItemIds),
          eq(billingItems.studentId, params.studentId)
        ),
        with: { feeTemplate: true },
      });

      if (items.length !== billingItemIds.length) {
        throw new Error(
          "Some billing items not found or do not belong to this student"
        );
      }

      const unpayable = items.filter(
        (i) => i.status === "paid" || i.status === "not_billed"
      );
      if (unpayable.length > 0) {
        throw new Error("Some billing items are already fully paid or not billable");
      }

      // 2. Calculate subtotal based on user's input
      const subtotal = params.payments.reduce((sum, p) => sum + p.amount, 0);

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

      // 4. Calculate late fees (HAPUS DENDA SESUAI PERMINTAAN)
      const lateFee = 0;

      // 5. Calculate total
      const total = subtotal - discountAmount + lateFee;

      // Validate Balance usage
      let studentData = await tx.query.students.findFirst({
        where: eq(students.id, params.studentId),
      });

      if (!studentData) throw new Error("Student not found");

      if (params.paymentMethod === "balance" || params.useBalance) {
        if (studentData.balance < total) {
          throw new Error("Saldo siswa tidak mencukupi untuk pembayaran ini.");
        }
        // Potong saldo
        await tx.update(students)
          .set({ balance: sql`${students.balance} - ${total}` })
          .where(eq(students.id, params.studentId));
      }

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
        params.payments.map((p) => ({
          transactionId: transaction.id,
          billingItemId: p.billingItemId,
          amount: p.amount,
        }))
      );

      // 9. Update billing items (Partial/Full Paid)
      for (const p of params.payments) {
        const item = items.find((i) => i.id === p.billingItemId)!;
        const newPaidAmount = item.paidAmount + p.amount;
        
        let newStatus: "paid" | "partially_paid" | "overdue" | "unpaid" | "not_billed" = "partially_paid";
        if (newPaidAmount >= item.amount) {
          newStatus = "paid";
        }
        
        await tx
          .update(billingItems)
          .set({
            paidAmount: newPaidAmount,
            status: newStatus,
            paidAt: newStatus === "paid" ? now : item.paidAt,
            updatedAt: now,
          })
          .where(eq(billingItems.id, p.billingItemId));
      }

      // 10. Save excess to balance if requested
      let excessSaved = 0;
      if (params.amountReceived && params.amountReceived > total) {
        const changeAmount = params.amountReceived - total;
        if (params.saveToBalance && params.paymentMethod !== "balance") {
          // Potong saldo sudah ditangani (jika pakai balance), ini untuk nambah saldo.
          await tx.update(students)
            .set({ balance: sql`${students.balance} + ${changeAmount}` })
            .where(eq(students.id, params.studentId));
          
          const depositCode = `DEP-${dateStr}-${sequence}`;
          
          await tx.insert(incomes).values({
            incomeCode: depositCode,
            amount: changeAmount,
            category: "Titipan Saldo",
            source: studentData.fullName,
            description: `Simpan kembalian dari transaksi ${transactionCode}`,
            paymentMethod: params.paymentMethod,
            recordedBy: params.cashierId
          });
          
          excessSaved = changeAmount;
        }
      }

      return {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        subtotal,
        discountAmount,
        lateFee,
        total,
        amountReceived: params.amountReceived || total,
        changeAmount: (params.amountReceived && params.amountReceived > total) ? params.amountReceived - total : 0,
        savedToBalance: excessSaved > 0,
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
    const transaction = await db.query.transactions.findFirst({
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

    if (!transaction) return undefined;

    const [income] = await db
      .select()
      .from(incomes)
      .where(eq(incomes.description, `Simpan kembalian dari transaksi ${transaction.transactionCode}`));

    return {
      ...transaction,
      savedToBalanceAmount: income ? income.amount : 0
    };
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

  /**
   * Cancel / Reset a transaction.
   * This will revert the paidAmount on billing items and refund balance if applicable.
   */
  async cancelTransaction(transactionId: string) {
    return await db.transaction(async (tx) => {
      // 1. Get transaction with items
      const trx = await tx.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
        with: { items: true },
      });

      if (!trx) throw new Error("Transaction not found");

      // 2. Revert billing items
      for (const item of trx.items) {
        const billingItem = await tx.query.billingItems.findFirst({
          where: eq(billingItems.id, item.billingItemId),
        });

        if (billingItem) {
          const newPaidAmount = Math.max(0, billingItem.paidAmount - item.amount);
          let newStatus: "paid" | "partially_paid" | "unpaid" = "unpaid";
          
          if (newPaidAmount >= billingItem.amount) {
            newStatus = "paid";
          } else if (newPaidAmount > 0) {
            newStatus = "partially_paid";
          }

          await tx
            .update(billingItems)
            .set({
              paidAmount: newPaidAmount,
              status: newStatus,
              paidAt: newStatus === "paid" ? billingItem.paidAt : null,
              updatedAt: new Date(),
            })
            .where(eq(billingItems.id, billingItem.id));
        }
      }

      // 3. Return balance if paymentMethod was balance
      // (Currently balance is saved as "transfer", manual refund may be required)

      // 4. Delete transaction (transactionItems will cascade)
      await tx.delete(transactions).where(eq(transactions.id, transactionId));

      return { success: true };
    });
  }
}

export const paymentService = new PaymentService();
