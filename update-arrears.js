import { db } from "./apps/api/src/db/index.js";
import { billingItems, feeTemplates } from "./apps/api/src/db/schema.js";
import { eq, and } from "drizzle-orm";

async function run() {
  console.log("Fixing uploaded arrears...");
  
  // Update all unpaid billing items that are linked to one_time fee templates to 'overdue'
  const result = await db.execute(`
    UPDATE billing_items
    SET status = 'overdue'
    WHERE status = 'unpaid'
    AND fee_template_id IN (
      SELECT id FROM fee_templates WHERE category = 'one_time' AND frequency = 'once'
    )
  `);
  
  console.log("Fixed! Rows affected:", result);
  process.exit(0);
}
run();
