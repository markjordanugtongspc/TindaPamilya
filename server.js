import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// 1. Serve static files from the 'dist' directory (the built package)
app.use(express.static(path.join(__dirname, "dist")));

// 2. Production API Handler
// This routes /api/* requests to the corresponding file in the 'api' directory
app.all(/^\/api\/.*/, async (req, res) => {
  const urlPath = req.url.split("?")[0].replace(/\/$/, "");
  // Note: We use the source 'api' directory even in production, 
  // unless you choose to bundle the API as well.
  const filePath = path.join(__dirname, urlPath + ".js");

  if (!existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "API route not found" });
  }

  try {
    // Dynamic import of the API handler module
    const module = await import("file://" + filePath);
    const handler = module.default;

    if (typeof handler === "function") {
      // res.status and res.json are provided by Express, 
      // which matches the signature expected by your handlers.
      await handler(req, res);
    } else {
      res.status(500).json({ success: false, error: "API handler is not a function" });
    }
  } catch (err) {
    console.error(`[API ERROR] ${urlPath}:`, err);
    if (!res.writableEnded) {
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }
});

// 3. Fallback Routing for Page Folders
// This ensures that /pages/menu/ resolves to /pages/menu/index.html
app.get(/.*/, (req, res) => {
  const url = req.url.split("?")[0];
  
  // Try to find an index.html in the requested path
  const potentialFile = path.join(__dirname, "dist", url, "index.html");
  if (existsSync(potentialFile)) {
    return res.sendFile(potentialFile);
  }

  // Final fallback to the root index.html
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 TindaPamilya Production Server`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📂 Serving from: ${path.join(__dirname, "dist")}\n`);
});
