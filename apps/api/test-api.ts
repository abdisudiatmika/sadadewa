import "dotenv/config";
import { studentService } from "./src/services/student.service.js";

async function main() {
  try {
    const student = await studentService.create({
      nisn: "0089706369",
      fullName: "Ni Putu Dian Paramitha Pertiwi",
      classId: "some-uuid", // We will omit this to test just the insert
      guardianName: "I Nyoman Suka Artha Negara, SE",
      guardianPhone: "087780165776",
      guardianEmail: "dianparamitha78@gmail.com",
      status: "active",
      enrolledAt: "", // Empty string to simulate form
    } as any);
    console.log("Success:", student);
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}
main();
