import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const SITE_URL = "http://artursn002.github.io/System_Maestro";
const OUT_DIR = "C:/Users/asn03/Downloads/Maestro/System Maestro V12/GitHub/System_Maestro/output/playwright";

const OPERATOR_LOGIN = process.env.MAESTRO_QA_OPERATOR_LOGIN || "";
const OPERATOR_PASSWORD = process.env.MAESTRO_QA_OPERATOR_PASSWORD || "";
const OPERATOR_PASSWORD_ALT = process.env.MAESTRO_QA_OPERATOR_PASSWORD_ALT || "";
const STUDENT_CPF = (process.env.MAESTRO_QA_STUDENT_CPF || "").replace(/\D/g, "");
const STUDENT_PIN = STUDENT_CPF.slice(-4);

function redact(value) {
  return String(value || "")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/Euamomeugato250[.,]?/g, "[SENHA]");
}

function shortText(value, max = 900) {
  const text = redact(String(value || "").replace(/\s+/g, " ").trim());
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function pushCheck(report, name, status, details = "") {
  report.checks.push({
    name,
    status,
    details: shortText(details, 1200)
  });
}

async function saveShot(page, name, report, options = {}) {
  const path = `${OUT_DIR}/${name}.png`;
  await writeFile(path, await page.screenshot({ fullPage: !!options.fullPage }));
  report.screenshots[name] = path;
}

function attachObservers(page, report, label) {
  page.on("console", msg => {
    const type = msg.type();
    if (type === "error" || type === "warning" || type === "warn") {
      report.console.push({ label, type, text: shortText(msg.text(), 1000) });
    }
  });
  page.on("pageerror", err => {
    report.pageErrors.push({ label, text: shortText(err.message, 1000) });
  });
  page.on("response", response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && /System_Maestro|script\.google|googleapis|firebase|manifest|sw\.js/i.test(url)) {
      report.network.push({ label, status, url: redact(url).slice(0, 500) });
    }
  });
}

async function launchBrowser() {
  const errors = [];
  for (const option of [
    { channel: "msedge" },
    { channel: "chrome" },
    {}
  ]) {
    try {
      return await chromium.launch({ headless: true, ...option });
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.join("\n---\n"));
}

async function appReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  await page.waitForFunction(() => !!document.querySelector("#view-hub, #view-gateway, #view-login-fiscal"), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function ensureClientConfigured(page, report, label) {
  const gatewayVisible = await safeVisible(page, "#view-gateway");
  const gasReadyBefore = await page.evaluate(() => !!localStorage.getItem("MAESTRO_CLIENT_URL")).catch(() => false);
  if (!gatewayVisible && gasReadyBefore) return;

  const selected = await page.evaluate(() => {
    const select = document.querySelector("#client-select");
    if (!select) return { ok: false, reason: "client-select missing" };
    if (!select.value && select.options.length > 0) {
      let index = 0;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value) {
          index = i;
          break;
        }
      }
      select.selectedIndex = index;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const button = document.querySelector("#view-gateway button");
    if (button) button.click();
    return { ok: true, value: select.value, text: select.options[select.selectedIndex]?.text || "" };
  });

  await page.waitForTimeout(2500);
  const hubVisible = await safeVisible(page, "#view-hub");
  const gasReadyAfter = await page.evaluate(() => !!localStorage.getItem("MAESTRO_CLIENT_URL")).catch(() => false);
  pushCheck(
    report,
    `${label} client config`,
    hubVisible && gasReadyAfter ? "pass" : "warn",
    JSON.stringify({ selected, hubVisible, gasReadyAfter })
  );
}

async function safeVisible(page, selector) {
  return await page.locator(selector).isVisible().catch(() => false);
}

async function safeText(page, selector) {
  return await page.locator(selector).innerText({ timeout: 3000 }).catch(() => "");
}

async function clickIfVisible(page, selector) {
  const locator = page.locator(selector);
  if (await locator.count().catch(() => 0)) {
    const visible = await locator.first().isVisible().catch(() => false);
    if (visible) {
      await locator.first().click();
      return true;
    }
  }
  return false;
}

async function inspectPwa(page, report) {
  const pwa = await page.evaluate(async () => {
    const manifestLink = document.querySelector('link[rel="manifest"]')?.href || "";
    let manifest = null;
    let manifestError = "";
    try {
      manifest = await fetch(manifestLink).then(r => r.json());
    } catch (error) {
      manifestError = error.message;
    }
    let sw = { supported: "serviceWorker" in navigator, controllers: 0, registrations: [] };
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      sw.controllers = regs.length;
      sw.registrations = regs.map(reg => ({
        scope: reg.scope,
        active: !!reg.active,
        installing: !!reg.installing,
        waiting: !!reg.waiting
      }));
    }
    return { manifestLink, manifest, manifestError, sw };
  });

  report.pwa = pwa;
  if (!pwa.manifest) {
    pushCheck(report, "PWA manifest", "fail", pwa.manifestError || "Manifest unavailable");
  } else {
    const scope = pwa.manifest.scope || "";
    const startUrl = pwa.manifest.start_url || "";
    const scopeLooksInvalid = /^https?:\/\//.test(scope) && !scope.includes("/System_Maestro");
    pushCheck(
      report,
      "PWA manifest",
      scopeLooksInvalid ? "warn" : "pass",
      `name=${pwa.manifest.name || ""}; scope=${scope}; start_url=${startUrl}`
    );
  }

  pushCheck(
    report,
    "Service worker",
    pwa.sw.supported && pwa.sw.controllers > 0 ? "pass" : "warn",
    JSON.stringify(pwa.sw)
  );
}

async function testStudentBranch(page, report) {
  await page.evaluate(() => window.switchView && window.switchView("view-aluno-menu"));
  await page.waitForTimeout(500);
  await saveShot(page, "qa-2026-05-25-student-menu", report);
  pushCheck(report, "Aluno menu", await safeVisible(page, "#view-aluno-menu") ? "pass" : "fail");

  await page.evaluate(() => window.switchView && window.switchView("view-consult"));
  await page.locator("#id-estudante").fill(STUDENT_CPF);
  await page.locator("#btn-estudante").click();
  await page.waitForTimeout(7000);
  const statusText = await safeText(page, "#res-estudante");
  const statusVisible = await safeVisible(page, "#res-estudante");
  await saveShot(page, "qa-2026-05-25-student-status", report);
  pushCheck(report, "Aluno consulta CPF", statusVisible && !/erro|falha|nao encontrado|não encontrado/i.test(statusText) ? "pass" : "warn", statusText);

  await page.evaluate(() => window.switchView && window.switchView("view-login"));
  await page.locator("#login-id").fill(STUDENT_CPF);
  await page.locator("#login-senha").fill(STUDENT_PIN);
  await page.locator("#btn-login").click();
  await page.waitForTimeout(7000);
  const walletVisible = await safeVisible(page, "#view-wallet");
  const firstAccessVisible = await safeVisible(page, "#view-nova-senha");
  const loginError = await safeText(page, "#res-login");
  await saveShot(page, "qa-2026-05-25-student-wallet-attempt", report);
  pushCheck(
    report,
    "Aluno carteira digital",
    walletVisible ? "pass" : (firstAccessVisible ? "warn" : "fail"),
    walletVisible ? "Wallet opened" : (firstAccessVisible ? "Primeiro acesso solicitado; fluxo nao foi concluido para evitar alteracao de senha." : loginError)
  );
}

async function operatorLogin(page, report) {
  await page.evaluate(() => window.switchView && window.switchView("view-login-fiscal"));
  await page.locator("#fiscal-email").fill(OPERATOR_LOGIN);
  await page.locator("#fiscal-senha").fill(OPERATOR_PASSWORD);
  await page.locator("#btn-login-fiscal").click();
  await page.waitForTimeout(8000);

  let adminVisible = await safeVisible(page, "#view-admin-hub");
  let loginError = await safeText(page, "#res-login-fiscal");
  let usedAlt = false;

  if (!adminVisible && OPERATOR_PASSWORD_ALT) {
    await page.locator("#fiscal-senha").fill(OPERATOR_PASSWORD_ALT);
    await page.locator("#btn-login-fiscal").click();
    await page.waitForTimeout(8000);
    adminVisible = await safeVisible(page, "#view-admin-hub");
    loginError = await safeText(page, "#res-login-fiscal");
    usedAlt = adminVisible;
  }

  const session = await page.evaluate(() => ({
    nivel: localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "",
    hasToken: !!localStorage.getItem("MAESTRO_TOKEN"),
    actions: Array.from(document.querySelectorAll("[data-maestro-action]"))
      .filter(el => getComputedStyle(el).display !== "none" && !el.classList.contains("hidden"))
      .map(el => el.getAttribute("data-maestro-action"))
  }));

  await saveShot(page, "qa-2026-05-25-operator-hub", report);
  pushCheck(
    report,
    "Operador login",
    adminVisible && session.hasToken ? "pass" : "fail",
    adminVisible ? `nivel=${session.nivel}; altCredential=${usedAlt}` : loginError
  );
  report.operatorSession = session;
  return adminVisible;
}

async function collectOperatorApiDiagnostics(page, report) {
  const diagnostics = await page.evaluate(async () => {
    if (typeof window.apiCall !== "function") {
      return { erro: "apiCall unavailable" };
    }
    const calls = [
      ["getDashboardStats", {}],
      ["getListaAuditoria", { pesquisa: "", limite: 5 }],
      ["listarSemestresMaestro", {}],
      ["getFiltrosPush", {}],
      ["getRotasMotorista", {}]
    ];
    const output = {};
    for (const [action, payload] of calls) {
      try {
        const res = await window.apiCall(action, payload);
        output[action] = {
          sucesso: !!res.sucesso,
          erro: res.erro || "",
          detalhes: res.detalhes || "",
          status: res.status || "",
          total: res.total || (Array.isArray(res.lista) ? res.lista.length : undefined),
          semestreId: res.semestreId || res.semestreAlvo || (res.semestreAtual && (res.semestreAtual.id || res.semestreAtual.semestreId)) || "",
          keys: Object.keys(res || {}).slice(0, 15)
        };
      } catch (error) {
        output[action] = { sucesso: false, erro: error.message };
      }
    }
    return output;
  });
  report.operatorApiDiagnostics = diagnostics;
  pushCheck(report, "Operador API diagnostico", diagnostics.erro ? "warn" : "pass", JSON.stringify(diagnostics));
}

async function testOperatorBranch(page, report) {
  const logged = await operatorLogin(page, report);
  if (!logged) return;
  await collectOperatorApiDiagnostics(page, report);

  if (await page.evaluate(() => typeof window.carregarDashboard === "function")) {
    await page.evaluate(() => window.carregarDashboard());
    await page.waitForTimeout(10000);
    const dashboardVisible = await safeVisible(page, "#view-dashboard");
    const dashboardText = await safeText(page, "#view-dashboard");
    await saveShot(page, "qa-2026-05-25-operator-dashboard", report);
    pushCheck(
      report,
      "Operador dashboard",
      dashboardVisible && !/falha|erro|indispon/i.test(dashboardText) ? "pass" : "warn",
      dashboardText
    );
  } else {
    pushCheck(report, "Operador dashboard", "fail", "carregarDashboard nao existe");
  }

  if (await page.evaluate(() => typeof window.abrirMesaAuditoria === "function")) {
    await page.evaluate(() => window.abrirMesaAuditoria());
    await page.waitForTimeout(10000);
    const auditVisible = await safeVisible(page, "#view-auditoria");
    const auditText = await safeText(page, "#auditoria-fila-container");
    await saveShot(page, "qa-2026-05-25-operator-auditoria", report);
    pushCheck(
      report,
      "Operador auditoria",
      auditVisible && !/falha|erro/i.test(auditText) ? "pass" : "warn",
      auditText
    );
  } else {
    pushCheck(report, "Operador auditoria", "fail", "abrirMesaAuditoria nao existe");
  }

  const hasSemesters = await page.evaluate(() => typeof window.abrirGestaoSemestres === "function" && !!document.querySelector('[data-maestro-action="semestres"]'));
  if (hasSemesters) {
    await page.evaluate(() => window.abrirGestaoSemestres());
    await page.waitForTimeout(7000);
    const semesterText = await safeText(page, "#view-semestres");
    await saveShot(page, "qa-2026-05-25-operator-semestres", report);
    pushCheck(report, "Operador gestao de semestres", /semestre/i.test(semesterText) && !/erro|falha/i.test(semesterText) ? "pass" : "warn", semesterText);
  } else {
    pushCheck(report, "Operador gestao de semestres", "warn", "Funcao/menu nao presente no build publicado.");
  }

  if (await page.evaluate(() => typeof window.abrirModalAvisosFiscal === "function")) {
    await page.evaluate(() => window.switchView && window.switchView("view-admin-hub"));
    await page.evaluate(() => window.abrirModalAvisosFiscal());
    await page.waitForTimeout(4000);
    const modalVisible = await safeVisible(page, "#modal-novo-aviso-fiscal:not(.hidden), #modal-avisos-fiscal:not(.hidden), #modal-push:not(.hidden)");
    const modalText = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
    await saveShot(page, "qa-2026-05-25-operator-comunicacao-modal", report);
    pushCheck(report, "Operador comunicacao modal", modalVisible ? "pass" : "warn", modalText);
    await page.keyboard.press("Escape").catch(() => {});
  }

  if (await page.evaluate(() => typeof window.abrirModoFiscalizacaoGlobal === "function")) {
    await page.evaluate(() => window.abrirModoFiscalizacaoGlobal());
    await page.waitForTimeout(2500);
    const fiscalVisible = await safeVisible(page, "#view-fiscal");
    await saveShot(page, "qa-2026-05-25-operator-fiscalizacao", report);
    pushCheck(report, "Operador modo fiscalizacao", fiscalVisible ? "pass" : "warn", await safeText(page, "#view-fiscal"));
  }

  if (await page.evaluate(() => typeof window.abrirPainelModerador === "function")) {
    await page.evaluate(() => window.abrirPainelModerador());
    await page.waitForTimeout(6000);
    const machineVisible = await safeVisible(page, "#view-moderador");
    const machineText = await safeText(page, "#view-moderador");
    await saveShot(page, "qa-2026-05-25-operator-sala-maquinas", report);
    pushCheck(report, "Moderador sala das maquinas", machineVisible && !/Acesso Negado|erro|falha/i.test(machineText) ? "pass" : "warn", machineText);
  }
}

async function testMobile(browser, report) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  attachObservers(page, report, "mobile");
  await page.goto(SITE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await appReady(page);
  await ensureClientConfigured(page, report, "mobile");
  await saveShot(page, "qa-2026-05-25-mobile-home", report);
  const mobileText = await safeText(page, "body");
  pushCheck(report, "Mobile home", /Acesso do Estudante|Selecione o seu perfil/i.test(mobileText) ? "pass" : "warn", mobileText);
  await page.evaluate(() => window.switchView && window.switchView("view-aluno-menu"));
  await page.waitForTimeout(500);
  await saveShot(page, "qa-2026-05-25-mobile-student-menu", report);
  pushCheck(report, "Mobile aluno menu", await safeVisible(page, "#view-aluno-menu") ? "pass" : "warn");
  await context.close();
}

async function testOffline(browser, report) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  attachObservers(page, report, "offline");
  await page.goto(SITE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await appReady(page);
  await ensureClientConfigured(page, report, "offline");
  await page.waitForTimeout(3000);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const bodyText = await safeText(page, "body");
  await saveShot(page, "qa-2026-05-25-offline-reload", report);
  pushCheck(report, "PWA offline reload", /Maestro|perfil|Estudante|Offline/i.test(bodyText) ? "pass" : "warn", bodyText);
  await context.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    site: SITE_URL,
    checks: [],
    console: [],
    pageErrors: [],
    network: [],
    pwa: null,
    operatorSession: null,
    screenshots: {}
  };

  const browser = await launchBrowser();
  const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await desktop.newPage();
  attachObservers(page, report, "desktop");

  await page.goto(SITE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await appReady(page);
  await ensureClientConfigured(page, report, "desktop");
  await inspectPwa(page, report);
  await saveShot(page, "qa-2026-05-25-desktop-home", report);
  const desktopBody = await safeText(page, "body");
  pushCheck(report, "Desktop home", /Acesso do Estudante|Selecione o seu perfil/i.test(desktopBody) ? "pass" : "warn", desktopBody);

  await testStudentBranch(page, report);
  await testOperatorBranch(page, report);
  await desktop.close();

  await testMobile(browser, report);
  await testOffline(browser, report);

  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(`${OUT_DIR}/qa-2026-05-25-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
