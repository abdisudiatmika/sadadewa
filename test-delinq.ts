import { db } from "./apps/api/src/db/index.js";
import { reportService } from "./apps/api/src/services/report.service.js";

async function run() {
  try {
    const res = await reportService.getDetailedDelinquency({});
    console.log("Success! Found:", res.length);
  } catch (e) {
    console.error("ERROR:");
    console.error(e);
  }
  process.exit(0);
}
run();
