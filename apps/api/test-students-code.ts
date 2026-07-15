import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString!);

async function main() {
  try {
    const res = await sql`SELECT student_code, full_name FROM students ORDER BY student_code DESC LIMIT 10`;
    console.table(res);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
main();
