import "../server/load-env.js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("FAIL: DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: "require",
  max: 1,
  connect_timeout: 20,
  prepare: false,
});

try {
  const rows = await sql`select 1 as ok`;
  console.log("OK", rows);
} catch (err) {
  console.error("FAIL", err?.message ?? err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 3 });
}
