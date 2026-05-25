import { db } from "./apps/api/src/db/index.js";
import { billingItems } from "./apps/api/src/db/schema.js";
import { eq } from "drizzle-orm";

async function run() {
  const items = await db.query.billingItems.findMany({
    where: eq(billingItems.status, 'overdue'),
    with: { feeTemplate: true }
  });
  console.log("Overdue items count:", items.length);
  if (items.length > 0) {
    console.log("Sample:", items[0]);
  }
  process.exit(0);
}
run();
