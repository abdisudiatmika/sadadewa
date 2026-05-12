import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Connection pool for queries
const queryClient = postgres(connectionString);

// Drizzle instance with full schema for relational queries
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
