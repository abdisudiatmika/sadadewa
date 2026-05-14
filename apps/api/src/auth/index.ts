import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "staff",
        input: true,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  // Biarkan Better-Auth mendeteksi URL secara otomatis di Vercel
  advanced: {
    cookie: {
      sameSite: "none",
      secure: true,
      path: "/", // SANGAT PENTING: Agar kunci login bisa dipakai di semua folder API
    },
  },
  trustedOrigins: [
    process.env.CORS_ORIGIN || "http://localhost:5173",
    "https://sadadewa-dashboard.vercel.app",
    "https://sadadewa-api.vercel.app"
  ],
});
