import "dotenv/config";
import { db } from "./src/db/index.js";
import { students } from "./src/db/schema.js";

async function main() {
  try {
    await db.insert(students).values({
      studentCode: "STD-99-00003",
      nisn: "9999999999", // duplicate
      fullName: "Test Dup 2",
      status: "active",
    }).returning();
  } catch (err: any) {
    console.log("Error object properties:", Object.keys(err));
    console.log("err.code:", err.code);
    console.log("err.constraint_name:", err.constraint_name);
    console.log("err.detail:", err.detail);
    console.log("err.message:", err.message);
  }
}
main();
