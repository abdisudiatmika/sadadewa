import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString!);

async function main() {
  try {
    const res = await sql`
      insert into "students" (
        "student_code", "nisn", "full_name", "guardian_name", "guardian_phone", "guardian_email", "status"
      ) values (
        'STD-26-00007', '0089706369', 'Ni Putu Dian Paramitha Pertiwi', 'I Nyoman Suka Artha Negara, SE', '087780165776', 'dianparamitha78@gmail.com', 'active'
      ) returning *
    `;
    console.log("Insert success:", res);
  } catch (err: any) {
    console.error("Insert failed:", err.message, err);
  } finally {
    await sql.end();
  }
}
main();
