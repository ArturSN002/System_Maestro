const { test, expect } = require("@playwright/test");

const CLIENT_URL = "https://script.google.com/macros/s/AKfycbwLet-wBQWEOmhnyXroWSIjPHoex3GjQkbrJJIiJzntBmndTL74UI0eGmnt2cw7YWiBxA/exec";

const forbiddenActions = new Set([
  "registrarPushToken",
  "dispararPushLoteManual",
  "publicarAvisoNotificacao",
  "solicitarRecuperacao",
  "recuperarSenhaOperador",
  "validarPinERedefinir",
  "definirSenhaPrimeiroAcesso",
  "alterarEstadoMotor",
  "enviarParecerOperador",
  "atualizarStatusAluno",
  "submeterInscricaoNativa",
  "submeterResgateDocumental",
  "publicarMensagemMural",
  "declararEmergenciaOnibus",
  "encerrarRotaManual",
  "gerarParecerIA",
  "resetarSenhaEstudanteAdmin"
]);

function parseApiRequest(request) {
  const body = request.postData();
  if (!body) return { action: "", payload: {} };
  try {
    const json = JSON.parse(body);
    const payload = json.payload && typeof json.payload === "object" ? json.payload : json;
    return {
      action: json.action || json.acao || payload.action || payload.acao || "",
      payload
    };
  } catch (error) {
    return { action: "", payload: {} };
  }
}

function mockApiResponse(action, payload) {
  if (action === "getConfiguracoesPWA") {
    return {
      sucesso: true,
      ui: {},
      pwa: {},
      contato: {},
      firebase: {},
      httpV1Ready: false,
      semestreId: "2026_1",
      semestreAtual: "2026_1",
      semestreLabel: "QA 2026.1",
      tenantId: "CEARA_MIRIM"
    };
  }
  if (action === "getAvisosAtivos") return { sucesso: true, avisos: [] };
  if (action === "getListaAuditoria") {
    return {
      sucesso: true,
      total: 1133,
      lista: [],
      limite: payload.limite || 2000,
      truncado: false,
      semestreAlvo: payload.semestreId || "2026_1",
      origem: "FIRESTORE"
    };
  }
  if (action === "getDashboardStats") {
    const stats = {
      kpis: { total: 1133, ativos: 0, pendentes: 1126, retidos: 7, suspensos: 0 },
      dataMart: [],
      origem: "firestore",
      semestreId: payload.semestreId || "2026_1",
      fonte: { universo: "auditStudent", totalFonte: 1133, incluiRootFallback: true },
      cache: { hit: false, source: "getDashboardStats", version: "F11_UNIVERSO_AUDITORIA_V1" }
    };
    return {
      sucesso: true,
      ...stats,
      estatisticas: stats
    };
  }
  if (action === "forcarExecucaoMotor") {
    const motor = String(payload.motorId || "").toUpperCase();
    const dryRunProfundo = payload.dryRunProfundo === true || /profundo|deep/i.test(String(payload.modo || ""));
    if (motor !== "OCR" || !dryRunProfundo || payload.suprimirNotificacoes !== true) {
      return { sucesso: false, erro: "Mock QA aceita apenas dryRunProfundo OCR sem notificacoes." };
    }
    return {
      sucesso: true,
      codigo: "DRY_RUN_PROFUNDO",
      statusMotor: "OK",
      dryRunProfundo: true,
      suprimirNotificacoes: true,
      pendentes: 1133,
      elegiveis: 900,
      processados: 900
    };
  }
  return { sucesso: true };
}

test.describe("Portal restrito Maestro - Fase 1.1", () => {
  test("mesa, dashboard e dry-run OCR usam contrato seguro e consistente", async ({ page }) => {
    const apiCalls = [];
    const blocked = [];

    await page.route("**/*", async (route) => {
      const request = route.request();
      if (request.url().includes("script.google.com")) {
        if (request.method() === "OPTIONS") {
          await route.fulfill({
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
          });
          return;
        }
        const parsed = parseApiRequest(request);
        apiCalls.push(parsed.action);
        if (forbiddenActions.has(parsed.action)) {
          blocked.push(parsed.action);
          await route.fulfill({
            status: 451,
            contentType: "application/json",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({ sucesso: false, erro: "Acao proibida no QA." })
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
          },
          body: JSON.stringify(mockApiResponse(parsed.action, parsed.payload))
        });
        return;
      }
      await route.continue();
    });

    await page.goto("about:blank");

    const resultado = await page.evaluate(async (clientUrl) => {
      async function postMaestro(action, payload) {
        const response = await fetch(clientUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, token: "qa-token", payload })
        });
        return response.json();
      }

      const base = { tenantId: "CEARA_MIRIM", semestreId: "2026_1", usuarioLogadoId: "qa@maestro.local" };
      const auditoria = await postMaestro("getListaAuditoria", {
        ...base,
        incluirTodos: true,
        statusFiltro: "TODOS",
        limite: 2000
      });
      const dashboard = await postMaestro("getDashboardStats", base);
      const dashboardStats = dashboard.estatisticas || dashboard.dashboardStats || dashboard.stats || dashboard;
      const dashboardKpis = dashboardStats.kpis || dashboard.kpis || {};
      const dashboardFonte = dashboardStats.fonte || dashboard.fonte || {};
      const dryRun = await postMaestro("forcarExecucaoMotor", {
        ...base,
        motorId: "OCR",
        modo: "dryrun-profundo",
        dryRunProfundo: true,
        suprimirNotificacoes: true
      });
      return {
        auditoriaTotal: auditoria.total,
        dashboardTotal: dashboardKpis.total,
        dashboardFonte,
        dryRun
      };
    }, CLIENT_URL);

    expect(resultado.auditoriaTotal).toBe(1133);
    expect(resultado.dashboardTotal).toBe(1133);
    expect(resultado.dashboardFonte.universo).toBe("auditStudent");
    expect(resultado.dryRun.codigo).toBe("DRY_RUN_PROFUNDO");
    expect(resultado.dryRun.suprimirNotificacoes).toBe(true);
    expect(blocked).toEqual([]);
    expect(apiCalls).not.toContain("dispararPushLoteManual");
    expect(apiCalls).not.toContain("publicarAvisoNotificacao");
    expect(apiCalls).not.toContain("enviarParecerOperador");
  });
});
