import "dotenv/config";
import { db } from "./src/db/index.js";
import { user, account } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const email = "sudiatmika.abdi@pnb.ac.id";
  const newPassword = "Password123!"; // You can change this if you want
  
  // Find the user
  const [existingUser] = await db.select().from(user).where(eq(user.email, email));
  if (!existingUser) {
    console.error("User not found!");
    process.exit(1);
  }

  // Hash the new password
  const hashedPassword = await hashPassword(newPassword);

  // Update the account table where userId matches
  const [updatedAccount] = await db.update(account)
    .set({ password: hashedPassword })
    .where(eq(account.userId, existingUser.id))
    .returning();
    
  if (updatedAccount) {
    console.log(`Successfully reset password for ${email}.`);
    console.log(`New password is: ${newPassword}`);
  } else {
    console.error("Failed to update password. Account record might not exist.");
  }
  process.exit(0);
}

main().catch(console.error);
