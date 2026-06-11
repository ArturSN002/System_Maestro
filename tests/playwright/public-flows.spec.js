const path = require("node:path");
const { test, expect } = require("@playwright/test");

const CLIENT_URL = "https://script.google.com/macros/s/AKfycbwLet-wBQWEOmhnyXroWSIjPHoex3GjQkbrJJIiJzntBmndTL74UI0eGmnt2cw7YWiBxA/exec";

function parseApiAction(request) {
  const body = request.postData();
  if (!body) return "";
  try {
    const json = JSON.parse(body);
    return json.action || json.acao || (json.payload && (json.payload.action || json.payload.acao)) || "";
  } catch (error) {
    return "";
  }
}

function mockApiResponse(action) {
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
      semestreLabel: "QA 2026.1"
    };
  }
  if (action === "getAvisosAtivos") return { sucesso: true, avisos: [] };
  if (action === "getMuralDaSemana") return { sucesso: true, posts: [] };
  if (action === "getListsInscricao") {
    return {
      sucesso: true,
      instituicoes: ["Instituicao QA"],
      rotas: ["Rota QA"],
      bairros23h: ["Centro"],
      linkDeclaracaoMenor: ""
    };
  }
  return { sucesso: false, erro: "Mock QA bloqueou chamada real.", encontrado: false };
}

async function abrirPortalPublico(page, apiCalls) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.url().includes("script.google.com")) {
      const action = parseApiAction(request);
      apiCalls.push(action);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockApiResponse(action))
      });
      return;
    }
    await route.continue();
  });

  await page.addInitScript((clientUrl) => {
    localStorage.setItem("MAESTRO_CLIENT_URL", clientUrl);
    localStorage.setItem("MAESTRO_TENANT_ID", "CEARA_MIRIM");
    localStorage.setItem("MAESTRO_PREF_PUSH", "false");
    localStorage.setItem("MAESTRO_CLIENT_URL_VERSION", "2026-05-26-cache-reset");
  }, CLIENT_URL);

  await page.goto("/");
  await page.waitForFunction(() =>
    typeof window.switchView === "function" &&
    typeof window.verificarHashPublico === "function" &&
    typeof window.validarCPFMaestro === "function"
  );
}

test.describe("Portal publico Maestro - Fase 01", () => {
  test("validador vazio e invalido exibe erro persistente sem request de validacao", async ({ page }) => {
    const apiCalls = [];
    await abrirPortalPublico(page, apiCalls);
    await page.evaluate(() => window.switchView("view-validador"));
    apiCalls.length = 0;

    await page.locator("#view-validador button", { hasText: "Validar Documento" }).click();
    await expect(page.locator("#res-validador")).toContainText(/Informe o codigo/i);
    expect(apiCalls).not.toContain("validarDocumentoPublico");

    await page.fill("#input-hash-validador", "abc");
    await page.locator("#view-validador button", { hasText: "Validar Documento" }).click();
    await expect(page.locator("#res-validador")).toContainText(/muito curto/i);
    expect(apiCalls).not.toContain("validarDocumentoPublico");
  });

  test("CPF 000.000.000-00 e bloqueado na inscricao sem request", async ({ page }) => {
    const apiCalls = [];
    await abrirPortalPublico(page, apiCalls);
    await page.evaluate(() => window.switchView("view-inscricao"));
    apiCalls.length = 0;

    await page.fill("#insc-cpf", "00000000000");
    await page.click("#btn-insc-verificar");

    await expect(page.locator("#cpf-feedback-box")).toContainText(/CPF invalido|Sequencias/i);
    expect(apiCalls).not.toContain("verificarDuplicidadeCPF");
    expect(apiCalls).not.toContain("verificarCpfRenovacao");
  });

  test("CPF curto e bloqueado na inscricao sem request", async ({ page }) => {
    const apiCalls = [];
    await abrirPortalPublico(page, apiCalls);
    await page.evaluate(() => window.switchView("view-inscricao"));
    apiCalls.length = 0;

    await page.fill("#insc-cpf", "123");
    await page.click("#btn-insc-verificar");

    await expect(page.locator("#cpf-feedback-box")).toContainText(/11 digitos|CPF invalido/i);
    expect(apiCalls).not.toContain("verificarDuplicidadeCPF");
    expect(apiCalls).not.toContain("verificarCpfRenovacao");
  });

  test("upload .txt e rejeitado em campo PDF de resgate", async ({ page }) => {
    const apiCalls = [];
    await abrirPortalPublico(page, apiCalls);
    await page.evaluate(() => {
      window.switchView("view-resgate");
      document.getElementById("id-estudante").value = "103.980.674-06";
    });
    apiCalls.length = 0;

    await page.check("#chk-resgate-vinculo");
    await page.setInputFiles(
      "#file-resgate-VINCULO",
      path.join(__dirname, "../fixtures/maestro-invalid-upload.txt")
    );

    await expect(page.locator("#status-resgate-VINCULO")).toContainText(/Formato invalido|PDF/i);
    await expect(page.locator("#btn-enviar-resgate")).toBeDisabled();
    expect(apiCalls).not.toContain("submeterResgateDocumental");
  });

  test("resgate sem CPF permanece bloqueado mesmo com PDF valido", async ({ page }) => {
    const apiCalls = [];
    await abrirPortalPublico(page, apiCalls);
    await page.evaluate(() => {
      window.switchView("view-resgate");
      document.getElementById("id-estudante").value = "";
    });
    apiCalls.length = 0;

    await page.check("#chk-resgate-vinculo");
    await page.setInputFiles(
      "#file-resgate-VINCULO",
      path.join(__dirname, "../fixtures/maestro-valid-upload.pdf")
    );

    await expect(page.locator("#resgate-feedback")).toContainText(/CPF valido|CPF necessario/i);
    await expect(page.locator("#btn-enviar-resgate")).toBeDisabled();
    expect(apiCalls).not.toContain("submeterResgateDocumental");
  });
});
