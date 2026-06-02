import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve("C:/Users/asn03/Downloads/Maestro/System Maestro V12/GitHub/System_Maestro/output/playwright/phase-4-9-preview");
const port = Number(process.env.MAESTRO_QA_PORT || 4179);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function resolveFile(urlPath) {
  const safe = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const requested = safe || "index.html";
  const absolute = path.resolve(root, requested);
  if (!absolute.startsWith(root)) return null;
  if (existsSync(absolute)) return absolute;
  return path.join(root, "index.html");
}

http.createServer((req, res) => {
  const file = resolveFile(req.url || "/");
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Maestro QA preview: http://127.0.0.1:${port}/`);
});
