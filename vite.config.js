import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

// Executes the Vercel-style serverless functions in /api during `vite dev`,
// mimicking Vercel's req/res helpers (req.query, req.body, res.status().json()).
function vercelApiDev() {
  return {
    name: "vercel-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");
        const match = url.pathname.match(/^\/api\/([\w-]+)\/?$/);
        if (!match) return next();

        const file = path.resolve(process.cwd(), "api", `${match[1]}.js`);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Not found" }));
        }

        try {
          // Cache-bust so edits to api files take effect without restarting.
          const mod = await import(`${pathToFileURL(file).href}?t=${fs.statSync(file).mtimeMs}`);

          req.query = Object.fromEntries(url.searchParams);

          if (req.method !== "GET" && req.method !== "HEAD") {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString("utf8");
            const type = req.headers["content-type"] || "";
            req.body = type.includes("application/json") && raw ? JSON.parse(raw) : raw;
          }

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (obj) => {
            if (!res.getHeader("content-type")) {
              res.setHeader("Content-Type", "application/json; charset=utf-8");
            }
            res.end(JSON.stringify(obj));
            return res;
          };
          res.send = (body) => {
            if (typeof body === "object" && !Buffer.isBuffer(body)) return res.json(body);
            res.end(body);
            return res;
          };
          res.redirect = (codeOrUrl, maybeUrl) => {
            const code = typeof codeOrUrl === "number" ? codeOrUrl : 302;
            const location = typeof codeOrUrl === "number" ? maybeUrl : codeOrUrl;
            res.statusCode = code;
            res.setHeader("Location", location);
            res.end();
            return res;
          };

          await mod.default(req, res);
        } catch (err) {
          console.error(`[api] ${url.pathname} failed:`, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Make .env/.env.local vars (GEMINI_API_KEY, GOOGLE_MAPS_API_KEY) visible to
  // the /api handlers, which read process.env like they do on Vercel.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), vercelApiDev()]
  };
});
