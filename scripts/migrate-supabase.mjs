import { readdir, readFile } from "node:fs/promises";
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

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const sql = postgres(url, { ssl: "require", max: 1, idle_timeout: 10 });
try {
  await sql`create table if not exists public.codkan_migrations (name text primary key, applied_at timestamptz not null default now())`;
  let applied = 0;
  for (const file of migrationFiles) {
    const name = file.replace(/\.sql$/, "");
    const [existing] = await sql`select name from public.codkan_migrations where name=${name}`;
    if (existing) continue;
    const migration = await readFile(new URL(file, migrationsDirectory), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      await tx`insert into public.codkan_migrations(name) values(${name})`;
    });
    applied += 1;
  }
  const [result] = await sql`select count(*)::int as table_count from information_schema.tables where table_schema='public' and table_name in ('profiles','listings','offers','deals')`;
  if (result.table_count !== 4) throw new Error("Core schema verification failed");
  await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true)`;
    await tx.unsafe("set local role authenticated");
    await tx`select id from public.listings limit 1`;
  });
  console.log(applied === 0 ? "Supabase schema already current." : `${applied} Supabase migration(s) applied and verified.`);
} finally {
  await sql.end();
}
