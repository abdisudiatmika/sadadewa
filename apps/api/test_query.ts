import postgres from "postgres";
import "dotenv/config";

async function run() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting to:", connectionString?.split("@")[1]); // print only the host for security

  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("Tables in public schema:", tables.map(t => t.table_name));

    const studentsCount = await sql`SELECT COUNT(*) FROM students`;
    console.log("Raw students count:", studentsCount[0].count);

    const studentClassesCount = await sql`SELECT COUNT(*) FROM student_classes`;
    console.log("Raw student_classes count:", studentClassesCount[0].count);

    const classesCount = await sql`SELECT COUNT(*) FROM classes`;
    console.log("Raw classes count:", classesCount[0].count);

    const academicYearsCount = await sql`SELECT COUNT(*) FROM academic_years`;
    console.log("Raw academic_years count:", academicYearsCount[0].count);

    // Let's print some sample students
    const sampleStudents = await sql`SELECT id, full_name, status FROM students LIMIT 5`;
    console.log("Sample students:", sampleStudents);

  } catch (err) {
    console.error("Database query error:", err);
  } finally {
    await sql.end();
  }
}

run();
