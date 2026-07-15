import "dotenv/config";
import { db } from "./src/db/index.js";
import { students } from "./src/db/schema.js";

async function main() {
  try {
    const [student] = await db.insert(students).values({
      studentCode: "STD-99-00001",
      nisn: "9999999999",
      fullName: "Test Drizzle",
      guardianName: "Test Guardian",
      guardianPhone: "08123456789",
      guardianEmail: "test@example.com",
      status: "active",
      enrolledAt: undefined,
    }).returning();
    console.log("Success:", student);
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}
main();
