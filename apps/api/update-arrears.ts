import { db } from "./src/db/index.js";
import { billingItems, feeTemplates } from "./src/db/schema.js";

async function run() {
  console.log("Fixing uploaded arrears...");
  
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
