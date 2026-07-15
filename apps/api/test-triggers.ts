import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString!);

async function main() {
  try {
    const res = await sql`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'students'
    `;
    console.log("Triggers:");
    console.table(res);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
main();
