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

function authApiPlugin() {
  const handler = async (req: any, res: any, next: any) => {
    if (req.url === "/api/auth/login" && req.method === "POST") {
      const { email = "", password = "" } = await readJsonBody(req);
      if (!email || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Wrong email or password" }));
        return;
      }

      try {
        const result = await loginWithPostgres(email, password);
        res.statusCode = result.success ? 200 : 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown database error";
        const isTimeout =
          /CONNECT_TIMEOUT|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message);
        const isAuth =
          /SASL|password authentication|Tenant or user not found|no such user/i.test(
            message,
          );
        res.statusCode = isTimeout || isAuth ? 503 : 500;
        res.setHeader("Content-Type", "application/json");
        let hint = message;
        if (isTimeout) {
          hint = `${message} — Use Transaction pooler (port 6543) from Supabase Dashboard → Connect (IPv4-friendly).`;
        } else if (isAuth) {
          hint = `${message} — Copy the URI from Dashboard → Connect, and reset Database password in Project Settings if needed.`;
        }
        res.end(JSON.stringify({ success: false, error: hint }));
      }
      return;
    }

    if (req.url === "/api/auth/logout" && req.method === "POST") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (req.url === "/api/auth/profile" && req.method === "POST") {
      const { id = "", email = "" } = await readJsonBody(req);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          user: {
            id: id || "",
            email: email || "",
            full_name: "TindaPamilya User",
            role: "Seller",
          },
        }),
      );
      return;
    }

    next();
  };

  return {
    name: "auth-api-plugin",
    configureServer(server: any) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(handler);
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
  plugins: [tailwindcss(), authApiPlugin(), copyPagesComponentsPlugin()],
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
