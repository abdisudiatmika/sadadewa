import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Migrating payment_method enum...");
    await db.execute(sql`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer_bri'`);
    await db.execute(sql`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer_bukopin'`);
    await db.execute(sql`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer_other'`);
    await db.execute(sql`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'qris'`);
    console.log("Enum migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("Error migrating enum:", error);
    process.exit(1);
  }
}
run();
