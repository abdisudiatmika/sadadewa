import { db } from "./apps/api/src/db/index.js";
import { billingItems } from "./apps/api/src/db/schema.js";

async function run() {
  const items = await db.query.billingItems.findMany({
    with: { feeTemplate: true },
    limit: 10,
    orderBy: (items, { desc }) => [desc(items.createdAt)]
  });
  console.log("Latest items:");
  console.log(items.map(i => ({ status: i.status, category: i.feeTemplate.category, name: i.feeTemplate.name })));
  process.exit(0);
}
run();
