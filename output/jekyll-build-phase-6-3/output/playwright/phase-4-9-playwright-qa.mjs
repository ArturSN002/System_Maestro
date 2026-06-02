import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createReadStream, existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve("C:/Users/asn03/Downloads/Maestro/System Maestro V12/GitHub/System_Maestro");
const out = path.join(root, "output", "playwright", "phase-4-9");
const previewRoot = path.join(root, "output", "playwright", "phase-4-9-preview");
let base = "http://127.0.0.1:4179/";
const require = createRequire(path.join(root, "output", "playwright", ".qa-node", "package.json"));
const { chromium } = require("playwright");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

const viewports = {
  mobile: { width: 390, height: 844, isMobile: true },
  tablet: { width: 820, height: 1180, isMobile: false },
  desktop: { width: 1366, height: 900, isMobile: false }
};

const cases = [
  { name: "mobile-public-hub", viewport: "mobile", view: "view-hub", profile: "ANONIMO" },
  { name: "tablet-public-mural", viewport: "tablet", view: "view-mural", profile: "ANONIMO", route: "mural" },
  { name: "mobile-student-hub", viewport: "mobile", view: "view-aluno-menu", profile: "ESTUDANTE" },
  { name: "tablet-student-inscricao", viewport: "tablet", view: "view-inscricao", profile: "ESTUDANTE" },
  { name: "mobile-student-wallet", viewport: "mobile", view: "view-wallet", profile: "ESTUDANTE", route: "wallet" },
  { name: "desktop-admin-hub", viewport: "desktop", view: "view-admin-hub", profile: "MODERADOR" },
  { name: "desktop-admin-auditoria", viewport: "desktop", view: "view-auditoria", profile: "MODERADOR", route: "auditoria" },
  { name: "tablet-admin-auditoria", viewport: "tablet", view: "view-auditoria", profile: "MODERADOR", route: "auditoria" },
  { name: "mobile-admin-semestres", viewport: "mobile", view: "view-semestres", profile: "SUPERVISOR", route: "semestres" },
  { name: "desktop-admin-dashboard", viewport: "desktop", view: "view-dashboard", profile: "MODERADOR", route: "dashboard" },
  { name: "mobile-fiscal-panel", viewport: "mobile", view: "view-fiscal", profile: "FISCAL" },
  { name: "mobile-driver-panel", viewport: "mobile", view: "view-painel-motorista", profile: "MOTORISTA" },
  { name: "mobile-radar", viewport: "mobile", view: "view-radar", profile: "ESTUDANTE" },
  { name: "desktop-radar", viewport: "desktop", view: "view-radar", profile: "ESTUDANTE" }
];

function urlFor(testCase) {
  const url = new URL(base);
  url.searchParams.set("qaView", testCase.view);
  url.searchParams.set("qaProfile", testCase.profile);
  if (testCase.route) url.searchParams.set("qaRoute", testCase.route);
  url.searchParams.set("qaCase", testCase.name);
  return url.toString();
}

function startPreviewServer() {
  const server = http.createServer((req, res) => {
    const rawPath = decodeURIComponent(String(req.url || "/").split("?")[0]).replace(/^\/+/, "") || "index.html";
    const absolute = path.resolve(previewRoot, rawPath);
    const file = absolute.startsWith(previewRoot) && existsSync(absolute)
      ? absolute
      : path.join(previewRoot, "index.html");
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      base = `http://127.0.0.1:${address.port}/`;
      resolve(server);
    });
  });
}

async function launchBrowser() {
  const errors = [];
  for (const option of [
    { channel: "chrome" },
    { channel: "msedge" },
    {}
  ]) {
    try {
      return await chromium.launch({
        headless: true,
        ...option,
        args: ["--disable-gpu", "--disable-dev-shm-usage"]
      });
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.join("\\n---\\n"));
}

function summarizeConsole(messages) {
  return messages
    .filter(item => ["error", "warning", "warn"].includes(item.type))
    .slice(0, 12);
}

await mkdir(out, { recursive: true });
const server = await startPreviewServer();
const browser = await launchBrowser();
const results = [];

for (const testCase of cases) {
  const viewport = viewports[testCase.viewport];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", message => {
    consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
  });
  page.on("pageerror", error => {
    pageErrors.push(error.message.slice(0, 500));
  });

  const url = urlFor(testCase);
  let layout = {};
  let bodyState = {};
  let status = "pass";
  let error = "";

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForFunction(() => document.body && document.body.dataset.qaReady === "true", null, { timeout: 12000 });
    await page.waitForTimeout(700);
    layout = await page.evaluate(() => JSON.parse(document.getElementById("qa-layout-report")?.textContent || "{}"));
    bodyState = await page.evaluate(() => ({
      shell: document.body.dataset.maestroShell || "",
      profile: document.body.dataset.maestroProfile || "",
      view: document.body.dataset.maestroView || "",
      qaError: document.body.dataset.qaError || ""
    }));
    if (layout.activeView && layout.activeView !== testCase.view) status = "warn";
    if (layout.activeView === testCase.view && Number(layout.activeHeight || 0) < 20) status = "warn";
    if (layout.hasHorizontalOverflow || (layout.overflowElements && layout.overflowElements.length)) status = "warn";
    if (bodyState.qaError) status = "warn";
  } catch (caught) {
    status = "fail";
    error = caught.message;
  }

  const screenshot = path.join(out, `${testCase.name}.png`);
  try {
    await page.screenshot({ path: screenshot, fullPage: true });
  } catch (caught) {
    status = "fail";
    error = error || caught.message;
  }

  results.push({
    name: testCase.name,
    viewport: testCase.viewport,
    view: testCase.view,
    profile: testCase.profile,
    route: testCase.route || "",
    status,
    error,
    bodyState,
    layout,
    console: summarizeConsole(consoleMessages),
    pageErrors,
    screenshot
  });
  await context.close();
}

await browser.close();
await new Promise(resolve => server.close(resolve));
const failures = results.filter(item => item.status !== "pass");
await writeFile(path.join(out, "phase-4-9-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results, failures }, null, 2), "utf8");
console.log(JSON.stringify({ out, total: results.length, failures: failures.length }, null, 2));
