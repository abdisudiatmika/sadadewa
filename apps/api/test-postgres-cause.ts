import "dotenv/config";
import { db } from "./src/db/index.js";
import { students } from "./src/db/schema.js";

async function main() {
  try {
    await db.insert(students).values({
      studentCode: "STD-99-00004",
      nisn: "9999999999", // duplicate
      fullName: "Test Dup 3",
      status: "active",
    }).returning();
  } catch (err: any) {
    if (err.cause) {
      console.log("Cause name:", err.cause.name);
      console.log("Cause code:", err.cause.code);
      console.log("Cause constraint:", err.cause.constraint_name);
      console.log("Cause detail:", err.cause.detail);
      console.log("Cause message:", err.cause.message);
    }
  }
}
main();
