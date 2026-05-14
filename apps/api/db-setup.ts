import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL tidak ditemukan di .env");
    process.exit(1);
  }

  const sql = postgres(url);

  console.log("⏳ Menghubungkan langsung ke Supabase...");

  try {
    await sql.begin(async (sql) => {
      console.log("⏳ Membuat tabel 'user'...");
      await sql`
        CREATE TABLE IF NOT EXISTS "user" (
          "id" text PRIMARY KEY NOT NULL,
          "name" text NOT NULL,
          "email" text NOT NULL UNIQUE,
          "email_verified" boolean DEFAULT false NOT NULL,
          "image" text,
          "role" text DEFAULT 'staff' NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `;
      
      console.log("⏳ Membuat tabel 'session'...");
      await sql`
        CREATE TABLE IF NOT EXISTS "session" (
          "id" text PRIMARY KEY NOT NULL,
          "expires_at" timestamp NOT NULL,
          "token" text NOT NULL UNIQUE,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          "ip_address" text,
          "user_agent" text,
          "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
        )
      `;
    });

    console.log("✅ Database Supabase BERHASIL disiapkan!");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Gagal total!");
    console.error("Alasan dari Supabase:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setup();
