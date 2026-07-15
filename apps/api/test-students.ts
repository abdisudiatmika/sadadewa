import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString!);

async function main() {
  try {
    const res = await sql`SELECT nisn, full_name, created_at FROM students ORDER BY created_at DESC LIMIT 5`;
    console.table(res);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
main();
