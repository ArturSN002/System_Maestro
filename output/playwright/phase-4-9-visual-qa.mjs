import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve("C:/Users/asn03/Downloads/Maestro/System Maestro V12/GitHub/System_Maestro");
const out = path.join(root, "output", "playwright", "phase-4-9");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = "http://127.0.0.1:4179/";

const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1366, height: 900 }
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

await mkdir(out, { recursive: true });
const results = [];

for (const testCase of cases) {
  const viewport = viewports[testCase.viewport];
  const userDataDir = path.join(out, "profile-shot-" + testCase.name);
  await rm(userDataDir, { recursive: true, force: true });
  const screenshot = path.join(out, `${testCase.name}.png`);
  const result = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-sync",
    "--disable-default-apps",
    "--disable-background-networking",
    "--disable-component-update",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--window-size=${viewport.width},${viewport.height}`,
    `--user-data-dir=${userDataDir}`,
    "--virtual-time-budget=4500",
    `--screenshot=${screenshot}`,
    urlFor(testCase)
  ], { encoding: "utf8", timeout: 20000 });

  results.push({
    name: testCase.name,
    viewport: testCase.viewport,
    view: testCase.view,
    profile: testCase.profile,
    route: testCase.route || "",
    screenshot,
    status: result.status,
    signal: result.signal,
    stderr: String(result.stderr || "").split("\n").slice(0, 5).join("\n")
  });
}

await writeFile(path.join(out, "phase-4-9-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), "utf8");
console.log(JSON.stringify({ out, total: results.length, failed: results.filter(item => item.status !== 0).length }, null, 2));
