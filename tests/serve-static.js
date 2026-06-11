const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const port = Number(process.argv[2] || 4000);
const root = path.resolve(process.argv[3] || "_site");
const basePath = String(process.argv[4] || "/").replace(/\/$/, "") || "/";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);

  if (basePath !== "/") {
    if (pathname === "/") {
      res.writeHead(302, { Location: `${basePath}/` });
      res.end();
      return;
    }
    if (!pathname.startsWith(`${basePath}/`) && pathname !== basePath) {
      send(res, 404, "Not found");
      return;
    }
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname.endsWith("/")) pathname += "index.html";

  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, data, contentTypes[path.extname(target).toLowerCase()] || "application/octet-stream");
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}${basePath}/`);
});
