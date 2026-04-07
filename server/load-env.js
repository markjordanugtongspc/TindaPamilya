import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const serverDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(serverDir, "..", ".env");

// override: true — a DATABASE_URL set in Windows / shell must not shadow project .env
dotenv.config({ path: envPath, override: true });
