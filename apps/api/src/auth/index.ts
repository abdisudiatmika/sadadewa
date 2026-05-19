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
  advanced: {
    crossSite: true,
    cookie: {
      namePrefix: "edupay",
      sameSite: "none",
      secure: true,
      path: "/",
      httpOnly: true,
    },
  },
  trustedOrigins: [
    "http://localhost",
    "https://sadadewa-dashboard.vercel.app",
    "https://sadadewa-api.vercel.app"
  ],
});
