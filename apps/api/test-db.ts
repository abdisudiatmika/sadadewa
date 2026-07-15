import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString!);

async function main() {
  try {
    const res = await sql`SELECT nisn FROM students WHERE nisn = '0089706369'`;
    console.log("Existing student with NISN 0089706369:", res);
    const res2 = await sql`SELECT student_code FROM students WHERE student_code = 'STD-26-00007'`;
    console.log("Existing student with code STD-26-00007:", res2);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
main();
