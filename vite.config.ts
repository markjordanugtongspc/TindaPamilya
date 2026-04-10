import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { loginWithPostgres } from "./server/auth.server.js";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
  });
}

function apiPlugin() {
  return {
    name: "api-plugin",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url.startsWith("/api/")) return next();

        // 1. Resolve API file path (e.g., /api/auth/login -> ./api/auth/login.js)
        const urlPath = req.url.split("?")[0];
        const filePath = resolve(__dirname, "." + urlPath + ".js");

        if (!existsSync(filePath)) {
          // Fallback to auth server if it's missing but expected
          if (urlPath === "/api/auth/login") {
            const { email = "", password = "" } = await readJsonBody(req);
            const result = await loginWithPostgres(email, password);
            res.statusCode = result.success ? 200 : 401;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          }
          return next();
        }

        try {
          // 2. Load the API handler dynamically using Vite's SSR loader (enables HMR & Node support)
          const module = await server.ssrLoadModule(filePath);
          const handler = module.default;

          // 3. Shim Vercel-style response methods so the scripts work locally
          res.status = (code: number) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };

          // 4. Populate req.body for POST/PUT requests
          if (["POST", "PUT", "PATCH"].includes(req.method)) {
            req.body = await readJsonBody(req);
          }

          // 5. Execute the handler
          await handler(req, res);
        } catch (err: any) {
          console.error(`API Error (${urlPath}):`, err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
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
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        menu: resolve(__dirname, "pages/menu/index.html"),
        products: resolve(__dirname, "pages/products/index.html"),
      },
    },
  },
});
