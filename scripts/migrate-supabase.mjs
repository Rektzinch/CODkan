import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import postgres from "postgres";

try { loadEnvFile(".env.local"); } catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
if (process.env.SKIP_DB_MIGRATION === "1") {
  console.log("Skipping remote migration for local validation.");
  process.exit(0);
}
const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error("POSTGRES_URL_NON_POOLING is not configured");

const migration = await readFile(new URL("../supabase/migrations/20260810150000_codkan_initial_schema.sql", import.meta.url), "utf8");
const sql = postgres(url, { ssl: "require", max: 1, idle_timeout: 10 });
try {
  await sql`create table if not exists public.codkan_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const [existing] = await sql`select name from public.codkan_migrations where name='20260810150000_codkan_initial_schema'`;
  if (!existing) {
    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      await tx`insert into public.codkan_migrations(name) values('20260810150000_codkan_initial_schema')`;
    });
  }
  const [result] = await sql`select count(*)::int as table_count from information_schema.tables where table_schema='public' and table_name in ('profiles','listings','offers','deals')`;
  if (result.table_count !== 4) throw new Error("Core schema verification failed");
  console.log(existing ? "Supabase schema already current." : "Supabase schema applied and verified.");
} finally {
  await sql.end();
}
