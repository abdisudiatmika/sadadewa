import "dotenv/config";
import { db } from "./src/db/index.js";
import { students } from "./src/db/schema.js";

async function main() {
  try {
    const [student] = await db.insert(students).values({
      studentCode: "STD-99-00002",
      nisn: "9999999999", // duplicate
      fullName: "Test Dup",
      status: "active",
    }).returning();
    console.log("Success:", student);
  } catch (err: any) {
    console.log("Error Name:", err.name);
    console.log("Error Message:", err.message);
  }
}
main();
