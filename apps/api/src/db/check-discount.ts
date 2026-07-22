import { db } from "./index.js";
import { discountCodes } from "./schema.js";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const discounts = await db.select().from(discountCodes).where(eq(discountCodes.code, 'S10'));
    console.log(discounts);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
