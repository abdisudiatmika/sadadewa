import postgres from "postgres";

async function run() {
  const url = "postgresql://postgres:rahasia123@localhost:5433/edupay";
  console.log("Connecting to local db on port 5433...");
  const sql = postgres(url);
  try {
    const studentsCount = await sql`SELECT COUNT(*) FROM students`;
    console.log("Local 5433 students count:", studentsCount[0].count);

    const activeCount = await sql`SELECT COUNT(*) FROM students WHERE status = 'active'`;
    console.log("Active students count:", activeCount[0].count);

    const sample = await sql`SELECT id, full_name, status FROM students LIMIT 5`;
    console.log("Sample:", sample);
  } catch (err: any) {
    console.error("Failed to connect:", err.message);
  } finally {
    await sql.end();
  }
}

run();
