import { db } from "./src/db/index.js";
import { students } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function check() {
  try {
    const res = await db.select().from(students);
    console.log("RESULT_START");
    console.log(JSON.stringify(res, null, 2));
    console.log("RESULT_END");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
