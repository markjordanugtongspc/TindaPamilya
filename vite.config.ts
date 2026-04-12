import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { loginWithPostgres } from "./server/auth.server.js";
import { cpSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    // Handle error to prevent hanging
    req.on("error", () => resolve({}));
  });
}

function apiPlugin() {
  return {
    name: "api-plugin",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const urlPath = req.url.split("?")[0].replace(/\/+$/, ""); // Remove trailing slash
        
        // Resolve API file path (e.g., /api/auth/login -> ./api/auth/login.js)
        const filePath = join(__dirname, urlPath + ".js");

        if (!existsSync(filePath)) {
          console.warn(`[API] 404 - File not found: ${filePath} (URL: ${req.url})`);
          // Fallback to auth server if it's missing but expected
          if (urlPath === "/api/auth/login") {
            try {
              const { email = "", password = "" } = await readJsonBody(req);
              const result = await loginWithPostgres(email, password);
              res.statusCode = result.success ? 200 : 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            } catch (err) {
              console.error("[API] Login fallback error:", err);
            }
          }
          return next();
        }

        try {
          const module = await server.ssrLoadModule(filePath);
          const handler = module.default;

          if (!handler) {
             throw new Error(`The API module at ${relativePath} does not export a default function.`);
          }

          res.status = (code: number) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };

          if (["POST", "PUT", "PATCH"].includes(req.method)) {
            // Only read body if not already present
            if (!req.body) req.body = await readJsonBody(req);
          }

          await handler(req, res);
        } catch (err: any) {
          console.error(`[API] Error (${urlPath}):`, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message || "Internal Server Error" }));
          }
        }
      });
    },
  };
}

function copyPagesComponentsPlugin() {
  return {
    name: "copy-pages-components-plugin",
    closeBundle() {
      const src = resolve(__dirname, "pages/components");
      const dest = resolve(__dirname, "dist/pages/components");
      if (!existsSync(src)) return;
      cpSync(src, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), apiPlugin(), copyPagesComponentsPlugin()],
  server: {
    // Increase stability for local SSR loads
    hmr: { overlay: true },
    cors: true
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        menu: resolve(__dirname, "pages/menu/index.html"),
        products: resolve(__dirname, "pages/products/index.html"),
        sellers: resolve(__dirname, "pages/sellers/index.html"),
      },
    },
  },
});
