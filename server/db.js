import "./load-env.js";
import postgres from "postgres";

// Prefer Transaction pooler URI (port 6543) from Supabase Dashboard → Connect — works on IPv4.
// Direct db.*:5432 is IPv6-only unless you use the IPv4 add-on.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Add it to .env (pooler host, port 6543).",
  );
}

const sql = postgres(connectionString, {
  ssl: "require",
  max: 1,
  connect_timeout: 20,
  // Required for Supabase transaction pooler (port 6543)
  prepare: false,
});

export default sql;
