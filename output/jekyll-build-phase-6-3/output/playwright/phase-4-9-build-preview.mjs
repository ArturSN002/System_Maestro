import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve("C:/Users/asn03/Downloads/Maestro/System Maestro V12/GitHub/System_Maestro");
const out = path.join(root, "output", "playwright", "phase-4-9-preview");

async function expandIncludes(filePath, stack = []) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  if (stack.includes(absolute)) {
    throw new Error(`Circular include: ${stack.concat(absolute).join(" -> ")}`);
  }
  let content = await readFile(absolute, "utf8");
  content = content.replace(/^---\s*[\r\n]+---\s*[\r\n]+/, "");
  const includeRe = /\{%\s*include\s+([^%\s]+)\s*%\}/g;
  let result = "";
  let lastIndex = 0;
  let match;
  while ((match = includeRe.exec(content))) {
    result += content.slice(lastIndex, match.index);
    const includePath = path.join(root, "_includes", match[1]);
    result += await expandIncludes(includePath, stack.concat(absolute));
    lastIndex = includeRe.lastIndex;
  }
  result += content.slice(lastIndex);
  return result;
}

const qaHarness = `
(function () {
  const params = new URLSearchParams(location.search);
  const view = params.get("qaView") || "view-hub";
  const profile = (params.get("qaProfile") || "ANONIMO").toUpperCase();
  const route = params.get("qaRoute") || "";
  localStorage.setItem("MAESTRO_CLIENT_URL", "https://qa.local/maestro");
  localStorage.setItem("MAESTRO_CLIENT_URL_VERSION", "phase-4-9");
  sessionStorage.setItem("MAESTRO_LAST_VIEW", view);
  if (["MODERADOR", "SUPERVISOR", "OPERADOR", "FISCAL", "MOTORISTA"].includes(profile)) {
    localStorage.setItem("MAESTRO_TOKEN", "qa-token");
    localStorage.setItem("MAESTRO_OPERADOR_NIVEL", profile);
    localStorage.setItem("MAESTRO_OPERADOR_NOME", "QA Maestro");
    localStorage.setItem("MAESTRO_OPERADOR_EMAIL", "qa@maestro.local");
  } else {
    localStorage.removeItem("MAESTRO_TOKEN");
    localStorage.removeItem("MAESTRO_OPERADOR_NIVEL");
  }
  if (profile === "ESTUDANTE") {
    localStorage.setItem("MAESTRO_EST_TOKEN", "qa-student-token");
  }

  const dashboardStats = {
    sucesso: true,
    resumo: { total: 128, ativos: 93, pendentes: 17, revisao: 9, inativos: 9 },
    kpis: { total: 128, ativos: 93, pendentes: 17, retidos: 9, suspensos: 9 },
    graficos: {
      status: { "Ativos": 93, "Pendentes": 17, "Retidos (Humana)": 9, "Cancelados/Suspensos": 9 },
      instituicoes: { IFRN: 42, UERN: 36, UFRN: 28 },
      dias: { Segunda: 38, Terca: 31, Quarta: 29, Quinta: 27, Sexta: 34 },
      rotas: { "Rota Norte": 53, "Rota Sul": 48, "Rota Oeste": 27 },
      turnos: { Matutino: 42, Vespertino: 51, Noturno: 35 },
      inclusao: { pcd: { Sim: 8, Nao: 120 }, menor: { Sim: 14, Nao: 114 }, acompanhado: { Sim: 6, Nao: 122 }, estagio: { Sim: 19, Nao: 109 } },
      noturno: { adesao: { Sim: 35, Nao: 93 }, bairros: { Centro: 12, Planalto: 8, "Zona Rural": 15 } }
    },
    consumo: { ocr: { usado: 210, limite: 1000 } },
    dataMart: [
      { i: "IFRN", t: "Matutino", d: "Segunda,Quarta", r: "Rota Norte" },
      { i: "UERN", t: "Vespertino", d: "Terca,Quinta", r: "Rota Sul" },
      { i: "UFRN", t: "Noturno", d: "Sexta", r: "Rota Oeste" }
    ],
    porTurno: { matutino: 42, vespertino: 51, noturno: 35 },
    porStatus: { ativo: 93, pendente: 17, revisao: 9, inativo: 9 },
    filtros: { instituicoes: ["IFRN", "UERN", "UFRN"], rotas: ["Rota Norte", "Rota Sul"] }
  };

  const sampleStudents = Array.from({ length: 8 }).map((_, index) => ({
    cpf: "1039806740" + index,
    nome: "QA Estudante " + (index + 1),
    email: "qa" + index + "@maestro.local",
    instituicao: index % 2 ? "UERN" : "IFRN",
    rota: index % 2 ? "Rota Sul" : "Rota Norte",
    turno: index % 3 === 0 ? "Noturno" : (index % 2 ? "Vespertino" : "Matutino"),
    statusAtividade: index % 4 === 0 ? "SUSPENSO" : "ATIVO",
    statusAuditoria: index % 3 === 0 ? "ANALISE_HUMANA" : "PENDENTE",
    dataInscricao: "2026-05-" + String(10 + index).padStart(2, "0"),
    semestreId: "2026.1",
    estagio: index % 2 === 0 ? { statusValidacao: "PENDENTE", tipoVinculo: "JOVEM_APRENDIZ" } : null
  }));

  function apiResponse(action) {
    switch (action) {
      case "getConfiguracoesPWA":
        return {
          sucesso: true,
          tenantId: "qa-maestro",
          semestreId: "2026.1",
          semestreLabel: "2026.1 Atual",
          ui: {
            NOME_SECRETARIA: "Secretaria QA Maestro",
            NOME_DO_SETOR: "Transporte Universitario",
            CIDADE_ALVO: "Ceara-Mirim",
            COR_PRIMARIA_LIGHT: "#0A3D6B",
            COR_SECUNDARIA_LIGHT: "#F8F9FA",
            COR_DE_DESTAQUE_LIGHT: "#F29900",
            LOGO_URL_LIGHT: "MGA.png",
            EMBLEMA_PWA: "MGA.png"
          },
          pwa: { NOME: "Maestro QA", ICONE: "icone.png" },
          contato: { EMAIL: "qa@maestro.local", ENDERECO: "Ambiente visual QA", CNPJ: "00.000.000/0001-00" }
        };
      case "getAvisosAtivos":
        return {
          sucesso: true,
          avisos: [
            { tipo: "transporte", titulo: "Ajuste de rota", assunto: "Rota Norte com ponto temporario na praca central." },
            { tipo: "urgente", titulo: "Documento pendente", assunto: "Regularize documentos ate sexta-feira." }
          ]
        };
      case "getListaAuditoria":
        return { sucesso: true, lista: sampleStudents, alunos: sampleStudents, total: sampleStudents.length, pagina: 1, limite: 8 };
      case "listarSemestresMaestro":
        return {
          sucesso: true,
          semestres: [
            { id: "2026.1", label: "2026.1", status: "ATUAL", inicio: "2026-01-01", fim: "2026-06-30" },
            { id: "2025.2", label: "2025.2", status: "PASSADO", inicio: "2025-07-01", fim: "2025-12-31" },
            { id: "2025.1", label: "2025.1", status: "ARQUIVADO", inicio: "2025-01-01", fim: "2025-06-30" }
          ]
        };
      case "getDashboardStats":
        return dashboardStats;
      case "getStatusMotores":
        return { sucesso: true, motores: { ETL: "OK", OCR: "OK", DOCS: "OK", EMAIL: "OK" } };
      case "getMuralDaSemana":
        return {
          sucesso: true,
          mensagens: [
            { id: "m1", nome: "Aluno QA", mensagem: "Sugestao de melhoria para o ponto da Rota Norte.", categoria: "Sugestao", votosUp: 12, votosDown: 1, criadoEm: new Date().toISOString() },
            { id: "m2", nome: "Fiscal QA", mensagem: "Aviso operacional de teste com texto mais longo para validar quebra responsiva em cards dinamicos.", categoria: "Transporte", votosUp: 7, votosDown: 0, criadoEm: new Date().toISOString() }
          ]
        };
      case "getRotasMotorista":
      case "getViagensDisponiveisPortal":
        return {
          sucesso: true,
          viagens: [
            { id: "rota-1", nome: "Rota Norte", rota: "Rota Norte", horario: "06:20", placa: "QA-1234", status: "ABERTA", ocupacao: 62, estadoRadar: "EM_OPERACAO", vagasRestantes: 18 },
            { id: "rota-2", nome: "Rota Sul", rota: "Rota Sul", horario: "17:40", placa: "QA-5678", status: "PREPARANDO", ocupacao: 38, estadoRadar: "AGUARDANDO", vagasRestantes: 32 }
          ],
          rotas: [
            { id: "rota-1", nome: "Rota Norte", horario: "06:20", placa: "QA-1234" },
            { id: "rota-2", nome: "Rota Sul", horario: "17:40", placa: "QA-5678" }
          ]
        };
      default:
        return { sucesso: true, dados: {}, msg: "QA visual stub: " + action };
    }
  }

  window.QRCode = window.QRCode || function (target, options) {
    const box = document.createElement("div");
    box.style.width = ((options && options.width) || 160) + "px";
    box.style.height = ((options && options.height) || 160) + "px";
    box.style.background = "repeating-linear-gradient(45deg,#111 0 8px,#fff 8px 16px)";
    box.setAttribute("aria-label", "QR visual QA");
    target.appendChild(box);
  };
  window.QRCode.CorrectLevel = window.QRCode.CorrectLevel || { H: "H" };

  window.apiCall = async function (action) {
    await new Promise(resolve => setTimeout(resolve, 30));
    return apiResponse(action);
  };
  try { apiCall = window.apiCall; } catch (error) { }

  window.__MAESTRO_QA_VISUAL__ = true;

  function permitirAcessoVisualQA() {
    window.temSessaoOperadorAtiva = function () { return true; };
    window.podeExecutarAcaoMaestro = function () { return true; };
    try { temSessaoOperadorAtiva = window.temSessaoOperadorAtiva; } catch (error) { }
    try { podeExecutarAcaoMaestro = window.podeExecutarAcaoMaestro; } catch (error) { }
    const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
    if (nav) {
      nav.resolveViewAccess = function (targetView) { return { allowed: true, viewId: targetView }; };
      nav.applyVisibility = function () {
        document.querySelectorAll("[data-maestro-action]").forEach(el => el.classList.remove("hidden"));
      };
    }
  }

  function forceViewVisualQA(targetView) {
    const viewId = targetView || view;
    document.querySelectorAll(".view-section").forEach(section => {
      section.classList.remove("active-view", "slide-in-right");
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove("hidden");
      target.querySelectorAll("[data-maestro-action]").forEach(el => el.classList.remove("hidden"));
      target.classList.add("active-view", "slide-in-right");
      sessionStorage.setItem("MAESTRO_LAST_VIEW", viewId);
    }
    if (typeof window.aplicarShellResponsivoMaestro === "function") {
      window.aplicarShellResponsivoMaestro(viewId);
    }
    const mural = document.getElementById("mural-avisos");
    const muralHeader = document.getElementById("mural-avisos-header");
    const showMural = ["view-hub", "view-admin-hub", "view-aluno-menu", "view-painel-motorista"].includes(viewId);
    if (mural) mural.classList.toggle("hidden", !showMural);
    if (muralHeader) muralHeader.classList.toggle("hidden", !showMural);
    const toast = document.getElementById("toast");
    if (toast) {
      toast.className = "";
      toast.textContent = "";
    }
  }

  function collectLayoutReport() {
    const doc = document.documentElement;
    const active = document.querySelector(".view-section.active-view");
    const overflowElements = Array.from(document.querySelectorAll("body *"))
      .filter(el => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        return el.scrollWidth > el.clientWidth + 2;
      })
      .slice(0, 18)
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        className: String(el.className || "").slice(0, 140),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      }));
    const smallTargets = Array.from(document.querySelectorAll("button, a, input, select, textarea, [role='button']"))
      .filter(el => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.height < 38;
      })
      .slice(0, 18)
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        className: String(el.className || "").slice(0, 140),
        text: String(el.textContent || el.value || "").trim().slice(0, 80),
        height: Math.round(el.getBoundingClientRect().height)
      }));
    const report = {
      view,
      profile,
      route,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      bodyScrollWidth: doc.scrollWidth,
      bodyClientWidth: doc.clientWidth,
      hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
      activeView: active ? active.id : "",
      activeHeight: active ? Math.round(active.getBoundingClientRect().height) : 0,
      overflowElements,
      smallTargets
    };
    let node = document.getElementById("qa-layout-report");
    if (!node) {
      node = document.createElement("script");
      node.type = "application/json";
      node.id = "qa-layout-report";
      document.body.appendChild(node);
    }
    node.textContent = JSON.stringify(report);
  }

  window.addEventListener("load", function () {
    setTimeout(async function () {
      try {
        permitirAcessoVisualQA();
        if (profile === "ESTUDANTE") {
          localStorage.setItem("MAESTRO_EST_TOKEN", "qa-student-token");
          try { currentWalletId = "QA-2026-0001"; } catch (error) { }
        }
        if (route === "auditoria" && typeof window.carregarFilaAuditoria === "function") {
          forceViewVisualQA("view-auditoria");
          await window.carregarFilaAuditoria();
        }
        else if (route === "dashboard" && typeof window.atualizarDashboardComStatsMaestro === "function") {
          window.atualizarDashboardComStatsMaestro(apiResponse("getDashboardStats"), { cache: false });
          forceViewVisualQA("view-dashboard");
        }
        else if (route === "semestres" && typeof window.carregarSemestresMaestro === "function") {
          forceViewVisualQA("view-semestres");
          await window.carregarSemestresMaestro();
        }
        else if (route === "mural" && typeof window.abrirMuralDaSemana === "function") await window.abrirMuralDaSemana();
        else if (route === "wallet" && typeof window.renderizarCarteira === "function") {
          window.renderizarCarteira({
            nome: "QA Estudante Responsivo",
            cpfMascarado: "103.***.***-06",
            idCarteira: "QA-2026-0001",
            instituicao: "Instituto Federal QA",
            turno: "MATUTINO,VESPERTINO",
            rota: "Rota Norte - Ponto Central",
            cidade: "Ceara-Mirim",
            validade: "30/06/2026",
            statusAtividade: "ATIVO",
            estagio: { statusValidacao: "VALIDADO", tipoVinculo: "JOVEM_APRENDIZ" },
            atualizacaoEstagio: { alteracoesNoCiclo: 0, limitePorCiclo: 1 },
            sementeDia: "2026-05-31"
          });
          forceViewVisualQA("view-wallet");
        }
        else if (view === "view-radar" && typeof window.abrirRadarMasterView === "function") {
          try { currentWalletId = "QA-2026-0001"; } catch (error) { }
          window.abrirRadarMasterView();
          forceViewVisualQA("view-radar");
        }
        else forceViewVisualQA(view);
        const splash = document.getElementById("splash-screen");
        if (splash) splash.classList.add("hidden");
        setTimeout(collectLayoutReport, 350);
        document.body.setAttribute("data-qa-ready", "true");
      } catch (error) {
        document.body.setAttribute("data-qa-error", error && error.message ? error.message : String(error));
        const splash = document.getElementById("splash-screen");
        if (splash) splash.classList.add("hidden");
        setTimeout(collectLayoutReport, 350);
        document.body.setAttribute("data-qa-ready", "true");
      }
    }, 900);
  });
})();
`;

const leafletStub = `
<script>
window.L = window.L || {
  divIcon: function (options) { return options || {}; },
  map: function () {
    return {
      setView: function () { return this; },
      remove: function () { return this; },
      invalidateSize: function () { return this; },
      fitBounds: function () { return this; },
      addLayer: function () { return this; }
    };
  },
  tileLayer: function () { return { addTo: function () { return this; } }; },
  marker: function () { return { addTo: function () { return this; }, bindPopup: function () { return this; }, setLatLng: function () { return this; }, slideTo: function () { return this; } }; },
  geoJSON: function () { return { addTo: function () { return this; }, getBounds: function () { return []; } }; }
};
</script>
`;

await mkdir(out, { recursive: true });
const html = await expandIncludes(path.join(root, "index.html"));
const js = await expandIncludes(path.join(root, "app.js"));
await writeFile(
  path.join(out, "index.html"),
  html
    .replace(/<script src="app\.js\?v=[^"]+" defer><\/script>/, `${leafletStub}\n  <script src="app.js?v=12.32" defer></script>`)
    .replace("</body>", `<script src="qa-visual.js" defer></script>\n</body>`),
  "utf8"
);
await writeFile(path.join(out, "app.js"), js, "utf8");
await writeFile(path.join(out, "qa-visual.js"), qaHarness, "utf8");
await copyFile(path.join(root, "style.css"), path.join(out, "style.css"));
for (const asset of ["icone.png", "MGA.png", "manifest.json", "404.html", "sw.js"]) {
  if (existsSync(path.join(root, asset))) {
    await copyFile(path.join(root, asset), path.join(out, asset));
  }
}
console.log(out);
