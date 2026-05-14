import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { webcrypto } from "node:crypto";

// Polyfill crypto untuk Node.js 18
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

// Pastikan file .env dibaca SEBELUM yang lain
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function run() {
  // Import auth secara dinamis SETELAH env terbaca
  const { auth } = await import("./src/auth/index.js");

  console.log("⏳ Sedang mendaftarkan admin ke database...");
  try {
    const user = await auth.api.signUpEmail({
      body: {
        email: "sudiatmika.abdi@pnb.ac.id",
        password: "Admin123!",
        name: "Admin Abdi",
        role: "superadmin",
      },
    });
    console.log("✅ BERHASIL! Admin terdaftar:", user.user.email);
    console.log("👉 Sekarang silakan Login di website Vercel Anda.");
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("ℹ️ Admin sudah pernah terdaftar sebelumnya.");
    } else {
      console.error("❌ Gagal mendaftarkan admin:", error.message || error);
    }
    process.exit(1);
  }
}

run();
