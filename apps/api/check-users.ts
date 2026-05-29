import "dotenv/config";
import { db } from "./src/db/index.js";
import { user } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  const users = await db.select().from(user);
  console.log("All Users:");
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | ${u.role}`);
  });
  process.exit(0);
}
main().catch(console.error);
