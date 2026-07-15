import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString!);

async function main() {
  try {
    const res = await sql`
      SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'students'
    `;
    console.log("Students Schema:");
    console.table(res);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
main();
