// BrainRot local dev server — serves the site AND the /api/generate endpoint,
// so you can drop files and build real quests on your own machine (no Vercel needed).
//
// It reuses the exact same generator as production (api/generate.mjs).
// Provide your Anthropic API key one of two ways:
//   1) create a file next to this one called ".dev-key" containing just the key, or
//   2) run with:  ANTHROPIC_API_KEY=sk-ant-... node dev-server.mjs
// The key is never committed (.dev-key is gitignored) and never printed.

import http from "http";
import { readFile } from "fs/promises";
import { extname, join, normalize } from "path";
import handler from "./api/generate.mjs";

const ROOT = new URL(".", import.meta.url).pathname;
const PORT = process.env.PORT || 4193;
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript",
  ".css":"text/css", ".png":"image/png", ".svg":"image/svg+xml", ".txt":"text/plain",
  ".xml":"application/xml", ".json":"application/json", ".ico":"image/x-icon" };

// load key from .dev-key if not already in the environment
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const k = (await readFile(join(ROOT, ".dev-key"), "utf8")).trim();
    if (k) process.env.ANTHROPIC_API_KEY = k;
  } catch {}
}
const KEY_OK = !!process.env.ANTHROPIC_API_KEY;

// adapt Node's (req,res) to the Vercel-style handler the generator expects
function vercelRes(nodeRes) {
  let code = 200; const headers = {};
  const api = {
    setHeader(k, v) { headers[k] = v; return api; },
    status(c) { code = c; return api; },
    json(o) { nodeRes.writeHead(code, { ...headers, "content-type": "application/json" }); nodeRes.end(JSON.stringify(o)); return api; },
    end(b) { nodeRes.writeHead(code, headers); nodeRes.end(b || ""); return api; }
  };
  return api;
}

http.createServer(async (req, res) => {
  const path = decodeURIComponent((req.url || "/").split("?")[0]);

  if (path === "/api/generate") {
    let body = "";
    req.on("data", c => (body += c));
    await new Promise(r => req.on("end", r));
    try { req.body = JSON.parse(body || "{}"); } catch { req.body = {}; }
    return handler(req, vercelRes(res));
  }

  // static files
  let p = path === "/" ? "/index.html" : path;
  const file = normalize(join(ROOT, p));
  if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); res.end("forbidden"); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(PORT, () => {
  console.log(`BrainRot dev server → http://localhost:${PORT}`);
  console.log(KEY_OK ? "✅ Anthropic API key loaded — quests will build for real." : "⚠️  No API key found (.dev-key or ANTHROPIC_API_KEY) — file-drop will return a 'not configured' error until you add one.");
});
