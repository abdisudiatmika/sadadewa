import "dotenv/config";
import { db } from "./src/db/index.js";
import { user, account } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const newPassword = "Password123!";
  const hashedPassword = await hashPassword(newPassword);

  const users = await db.select().from(user);
  let updatedCount = 0;

  for (const u of users) {
    const [updatedAccount] = await db.update(account)
      .set({ password: hashedPassword })
      .where(eq(account.userId, u.id))
      .returning();
      
    if (updatedAccount) {
      updatedCount++;
      console.log(`Reset password for: ${u.email}`);
    } else {
      console.log(`Skipped: ${u.email} (No account record found)`);
    }
  }

  console.log(`\nSuccessfully reset passwords for ${updatedCount} users.`);
  process.exit(0);
}

main().catch(console.error);
