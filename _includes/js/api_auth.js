// ========================================================================
// 0. CONFIGURAÇÕES DA API V11.1 (SALA DAS MÁQUINAS E RBAC)
// ========================================================================

let GAS_URL = "";

const IAM_STATE = {
  login: "",
  senhaTemporaria: "",
  tipo: "",
  origem: "",
  dados: null
};

const CLIENT_DIRECTORY = {
  "Ceará-Mirim": "https://script.google.com/macros/s/AKfycbzIkeQR3cjMjJn1sJ0sdDyYh6EbrIBU1bUEY_1MjItYquAkrAcApvJTizctuIYbgBN_zA/exec",
};

const MAESTRO_CLIENT_DIRECTORY_VERSION = "2026-05-26-cache-reset";
const MAESTRO_CLIENT_URL_VERSION_KEY = "MAESTRO_CLIENT_URL_VERSION";

const CLIENT_DIRECTORY_METADATA = {
  "https://script.google.com/macros/s/AKfycbzTkmRs-j9Z7cf6V9CUt-CA3XWNxFYaAa1SMVesemGji80rCNxKQ0fVgkMX6ITarALrvw/exec": {
    tenantId: "CEARA_MIRIM",
    label: "Ceara-Mirim"
  }
};

function obterTenantIdPorUrlClienteMaestro(url) {
  const alvo = String(url || "").trim();
  if (!alvo) return "";
  const meta = CLIENT_DIRECTORY_METADATA[alvo];
  if (meta && meta.tenantId) return meta.tenantId;
  return "";
}

function atualizarTenantContextoMaestro(contexto) {
  const source = contexto || {};
  const clientUrl = source.clientUrl || source.url || localStorage.getItem("MAESTRO_CLIENT_URL") || GAS_URL || "";
  const tenantId = source.tenantId || source.tenantID || source.tenant_id || obterTenantIdPorUrlClienteMaestro(clientUrl);
  if (!tenantId && !clientUrl) return null;

  if (tenantId) localStorage.setItem("MAESTRO_TENANT_ID", tenantId);
  if (clientUrl) localStorage.setItem("MAESTRO_CLIENT_URL", clientUrl);

  if (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.tenant) {
    return window.MaestroData.contexts.tenant.set({
      tenantId: tenantId,
      clientUrl: clientUrl,
      source: source.source || "runtime"
    });
  }

  return { tenantId: tenantId, clientUrl: clientUrl };
}

function setAuthElementVisibilityMaestro(element, visible, active = false) {
  if (!element) return;
  if (element.classList.contains("view-section")) {
    if (visible) element.classList.remove("hidden");
    element.classList.toggle("active-view", Boolean(visible && active));
    return;
  }
  element.classList.toggle("hidden", !visible);
  element.classList.toggle("active-view", Boolean(visible && active));
}

function showSplashAuthMaestro(splash) {
  if (!splash) return;
  splash.classList.remove("hidden", "is-exiting");
}

function hideSplashAuthMaestro(splash, delay = 300) {
  if (!splash) return;
  splash.classList.add("is-exiting");
  setTimeout(() => splash.classList.add("hidden"), delay);
}

function atualizarBotaoSenhaIAM(btn, habilitado) {
  if (!btn) return;
  btn.classList.add("auth-password-action");
  btn.disabled = !habilitado;
  btn.classList.toggle("is-disabled", !habilitado);
}

function obterUrlPadraoClienteMaestro() {
  const urls = Object.values(CLIENT_DIRECTORY).filter(Boolean);
  return urls.length === 1 ? urls[0] : "";
}

function urlPertenceAoDiretorioMaestro(url) {
  return Object.values(CLIENT_DIRECTORY).indexOf(String(url || "")) !== -1;
}

function resolverUrlClienteSalvaMaestro(savedUrl) {
  const atual = String(savedUrl || "").trim();
  if (!atual) return "";
  if (urlPertenceAoDiretorioMaestro(atual)) return atual;
  return obterUrlPadraoClienteMaestro() || atual;
}

async function removerCachesLocaisDeBackendMaestro() {
  if (window.MaestroData && window.MaestroData.storage && typeof window.MaestroData.storage.clearDomains === "function") {
    await window.MaestroData.storage.clearDomains(
      ["theme", "wallet", "dashboard", "lists", "audit", "communication", "mobility", "session"],
      {
        includeLegacy: true,
        includeCustom: true,
        includeSensitive: true,
        includeIndexedDB: true
      }
    ).catch(() => null);
  }

  [
    "MAESTRO_TOKEN",
    "MAESTRO_EST_TOKEN",
    "MAESTRO_OPERADOR_NOME",
    "MAESTRO_OPERADOR_EMAIL",
    "MAESTRO_OPERADOR_NIVEL",
    "MAESTRO_TENANT_ID",
    "MAESTRO_SEMESTRE_ID",
    "MAESTRO_WALLET_CACHE",
    "MAESTRO_OFFLINE_WALLET",
    "MAESTRO_DASH_STATS",
    "MAESTRO_THEME_CONFIG",
    "MAESTRO_TENANT_CONTEXT",
    "MAESTRO_SEMESTER_CONTEXT",
    "MAESTRO_THEME_CACHE",
    "MAESTRO_CACHE_META",
    "MAESTRO_LISTS_CACHE_INSCRICAO",
    "MAESTRO_COMMUNICATION_CACHE_AVISOS",
    "MAESTRO_COMMUNICATION_CACHE_MURAL",
    "MAESTRO_WALLET_CREDS",
    "MAESTRO_FCM_TOKEN",
    "MAESTRO_FCM_TOKEN_TEMP",
    "FCM_SYNCED_ID"
  ].forEach((key) => {
    try { localStorage.removeItem(key); } catch (error) { }
  });
}

async function limparCachesNavegadorMaestro() {
  if (typeof caches !== "undefined") {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => {
      return /^maestro-/i.test(cacheName) ? caches.delete(cacheName) : Promise.resolve(false);
    }));
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => {
      if (registration.active) {
        try { registration.active.postMessage({ type: "CLEAR_ALL_MAESTRO_CACHES" }); } catch (error) { }
      }
      return registration.scope && registration.scope.indexOf("/System_Maestro/") !== -1
        ? registration.unregister()
        : Promise.resolve(false);
    }));
  }
}

async function aplicarTrocaBackendMaestro(previousUrl, nextUrl, options = {}) {
  const anterior = String(previousUrl || "").trim();
  const proxima = String(nextUrl || "").trim();
  if (!proxima || anterior === proxima) {
    localStorage.setItem(MAESTRO_CLIENT_URL_VERSION_KEY, MAESTRO_CLIENT_DIRECTORY_VERSION);
    return false;
  }

  localStorage.setItem("MAESTRO_CLIENT_URL_PREVIOUS", anterior);
  localStorage.setItem("MAESTRO_CLIENT_URL", proxima);
  localStorage.setItem(MAESTRO_CLIENT_URL_VERSION_KEY, MAESTRO_CLIENT_DIRECTORY_VERSION);
  await removerCachesLocaisDeBackendMaestro();

  try {
    await limparCachesNavegadorMaestro();
  } catch (error) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Nao foi possivel limpar todos os caches antigos do Maestro.", error);
    else console.warn("Nao foi possivel limpar todos os caches antigos do Maestro.");
  }

  if (options.reload === false) return false;

  const reloadKey = "MAESTRO_BACKEND_RESET_" + btoa(proxima).replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
  if (sessionStorage.getItem(reloadKey) === "done") return false;
  sessionStorage.setItem(reloadKey, "done");

  const url = new URL(window.location.href);
  url.searchParams.set("maestroBackendReset", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

async function checkClientGateway() {
  let savedUrl = localStorage.getItem("MAESTRO_CLIENT_URL");
  const resolvedSavedUrl = resolverUrlClienteSalvaMaestro(savedUrl);
  if (savedUrl && resolvedSavedUrl && resolvedSavedUrl !== savedUrl) {
    const recarregando = await aplicarTrocaBackendMaestro(savedUrl, resolvedSavedUrl);
    if (recarregando) return true;
    savedUrl = resolvedSavedUrl;
  } else if (savedUrl) {
    localStorage.setItem(MAESTRO_CLIENT_URL_VERSION_KEY, MAESTRO_CLIENT_DIRECTORY_VERSION);
  }

  const splash = document.getElementById("splash-screen");
  const gateway = document.getElementById("view-gateway");

  if (savedUrl) {
    showSplashAuthMaestro(splash);
    setAuthElementVisibilityMaestro(gateway, false);
    GAS_URL = savedUrl;
    atualizarTenantContextoMaestro({ clientUrl: savedUrl, source: "clientGateway" });
    if (typeof bootSystem === "function") await bootSystem();
    return true;
  } else {
    hideSplashAuthMaestro(splash);

    document.querySelectorAll(".view-section").forEach(sec => {
      setAuthElementVisibilityMaestro(sec, false);
    });

    setAuthElementVisibilityMaestro(gateway, true);
    setTimeout(() => setAuthElementVisibilityMaestro(gateway, true, true), 10);

    const select = document.getElementById("client-select");
    if (select) {
      select.innerHTML = "";
      for (const client in CLIENT_DIRECTORY) {
        const option = document.createElement("option");
        option.value = CLIENT_DIRECTORY[client];
        option.textContent = client;
        select.appendChild(option);
      }
    }
    return false;
  }
}

async function salvarCliente() {
  const select = document.getElementById("client-select");
  if (!select) return;
  const selectedUrl = select.value;
  if (!selectedUrl) return;

  const previousUrl = localStorage.getItem("MAESTRO_CLIENT_URL") || "";
  if (previousUrl && previousUrl !== selectedUrl) {
    const recarregando = await aplicarTrocaBackendMaestro(previousUrl, selectedUrl);
    if (recarregando) return;
  }

  localStorage.setItem("MAESTRO_CLIENT_URL", selectedUrl);
  localStorage.setItem(MAESTRO_CLIENT_URL_VERSION_KEY, MAESTRO_CLIENT_DIRECTORY_VERSION);
  GAS_URL = selectedUrl;
  atualizarTenantContextoMaestro({ clientUrl: selectedUrl, source: "clientGateway" });

  const gateway = document.getElementById("view-gateway");
  setAuthElementVisibilityMaestro(gateway, false);

  const splash = document.getElementById("splash-screen");
  showSplashAuthMaestro(splash);

  sessionStorage.setItem("MAESTRO_LAST_VIEW", "view-hub");

  if (typeof bootSystem === "function") {
    await bootSystem({ forceView: "view-hub" });
  } else if (typeof switchView === "function") {
    switchView("view-hub");
  }
}

function normalizarRespostaApiIAM(data) {
  if (!data) return { sucesso: false, erro: "Resposta vazia do servidor." };
  if (Array.isArray(data)) {
    return data.length === 0
      ? { sucesso: false, erro: "Resposta inválida do servidor." }
      : { sucesso: true, dados: data };
  }
  if (typeof data !== "object") return { sucesso: false, erro: String(data) };
  return data;
}

function obterSemestrePayloadApiMaestro(payload) {
  if (payload && (payload.semestreId || payload.semestre_id || payload.semestreAlvo || payload.semestre)) {
    return payload.semestreId || payload.semestre_id || payload.semestreAlvo || payload.semestre;
  }

  try {
    const semesterContext = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester
      ? window.MaestroData.contexts.semester.get()
      : {};
    return semesterContext.semestreId || semesterContext.semestreAtual || semesterContext.activeSemesterId || "";
  } catch (e) {
    return "";
  }
}

function obterTenantPayloadApiMaestro(payload) {
  if (payload && (payload.tenantId || payload.tenantID || payload.tenant_id)) {
    return payload.tenantId || payload.tenantID || payload.tenant_id;
  }

  try {
    const tenantContext = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.tenant
      ? window.MaestroData.contexts.tenant.get()
      : {};
    const fromContext = tenantContext.tenantId || tenantContext.tenantID || tenantContext.tenant_id || "";
    if (fromContext) return fromContext;
  } catch (e) {
  }

  try {
    const storedSession = JSON.parse(localStorage.getItem("MAESTRO_OPERATOR_SESSION") || "{}");
    if (storedSession.tenantId || storedSession.tenantID || storedSession.tenant_id) {
      return storedSession.tenantId || storedSession.tenantID || storedSession.tenant_id;
    }
  } catch (e) {
  }

  return localStorage.getItem("MAESTRO_TENANT_ID") ||
    obterTenantIdPorUrlClienteMaestro(localStorage.getItem("MAESTRO_CLIENT_URL") || GAS_URL) ||
    "";
}

function acaoApiUsaSemestreMaestro(action) {
  return [
    "verificarDuplicidadeCPF",
    "verificarCpfRenovacao",
    "submeterInscricaoNativa",
    "validarDocumentoPublico",
    "consultarStatusCPF",
    "registrarPushToken",
    "getViagensDisponiveisPortal",
    "realizarCheckInOnibus",
    "solicitarCargoGuia",
    "abdicarCargoGuia",
    "atualizarGPSOnibus",
    "statusRadarOnibus",
    "sincronizarCacheFiscal",
    "consultarEstudantePorId",
    "getFotoEstudanteBase64",
    "declararEmergenciaOnibus",
    "encerrarRotaManual",
    "getFiltrosPush",
    "dispararPushLoteManual",
    "publicarAvisoNotificacao",
    "getListaAuditoria",
    "verFicheiroBase64",
    "atualizarStatusAluno",
    "enviarParecerOperador",
    "getDashboardStats",
    "getStatusMotores",
    "alterarEstadoMotor",
    "forcarExecucaoMotor",
    "healthcheckMaestro",
    "corrigirSemestresTenantFirestore",
    "atualizarEstagioCarteira"
  ].indexOf(String(action || "")) !== -1;
}

function acaoApiExigeTenantMaestro(action) {
  return [
    "getListaAuditoria",
    "verFicheiroBase64",
    "atualizarStatusAluno",
    "enviarParecerOperador",
    "getDashboardStats",
    "getStatusMotores",
    "alterarEstadoMotor",
    "forcarExecucaoMotor",
    "healthcheckMaestro",
    "corrigirSemestresTenantFirestore",
    "listarSemestresMaestro",
    "salvarSemestreMaestro",
    "definirSemestreAtualMaestro",
    "marcarSemestrePassadoMaestro",
    "arquivarSemestreMaestro",
    "excluirSemestreMaestro",
    "getFiltrosPush",
    "dispararPushLoteManual",
    "publicarAvisoNotificacao",
    "sincronizarCacheFiscal",
    "consultarEstudantePorId",
    "getFotoEstudanteBase64",
    "declararEmergenciaOnibus",
    "encerrarRotaManual",
    "getRotasMotorista"
  ].indexOf(String(action || "")) !== -1;
}

function acaoApiExigeSemestreMaestro(action) {
  return [
    "getListaAuditoria",
    "verFicheiroBase64",
    "atualizarStatusAluno",
    "enviarParecerOperador",
    "getDashboardStats",
    "getStatusMotores",
    "alterarEstadoMotor",
    "forcarExecucaoMotor",
    "healthcheckMaestro",
    "corrigirSemestresTenantFirestore"
  ].indexOf(String(action || "")) !== -1;
}

function validarContextoPayloadApiMaestro(action, payload, options) {
  const permitirParcial = options && options.allowMissingContext === true ||
    payload && (payload.permitirContextoParcial === true || payload.permitirTenantFallback === true);
  if (permitirParcial) return { ok: true };

  const precisaTenant = acaoApiExigeTenantMaestro(action);
  const precisaSemestre = acaoApiExigeSemestreMaestro(action);
  if (!precisaTenant && !precisaSemestre) return { ok: true };

  if (precisaTenant && !payload.tenantId) {
    return {
      ok: false,
      resposta: {
        sucesso: false,
        erro: "Contexto Maestro incompleto: tenantId ausente.",
        detalhes: "Selecione o cliente novamente ou atualize o portal antes de executar esta acao.",
        codigo: "TENANT_CONTEXT_MISSING",
        status: 409,
        action: action
      }
    };
  }

  if (precisaSemestre && !payload.semestreId) {
    return {
      ok: false,
      resposta: {
        sucesso: false,
        erro: "Contexto Maestro incompleto: semestreId ausente.",
        detalhes: "Defina o semestre atual ou recarregue as configuracoes antes de executar esta acao.",
        codigo: "SEMESTER_CONTEXT_MISSING",
        status: 409,
        action: action
      }
    };
  }

  return { ok: true };
}

function prepararPayloadApiMaestro(action, payload) {
  const base = payload && typeof payload === "object" && !Array.isArray(payload)
    ? Object.assign({}, payload)
    : {};
  const semestreId = obterSemestrePayloadApiMaestro(base);
  const tenantId = obterTenantPayloadApiMaestro(base);

  if (acaoApiUsaSemestreMaestro(action) && semestreId && !base.semestreId) {
    base.semestreId = semestreId;
  }

  if (tenantId && !base.tenantId) {
    base.tenantId = tenantId;
  }

  return base;
}

function obterTimeoutApiMaestro(action, options) {
  if (options && Number(options.timeoutMs) > 0) return Number(options.timeoutMs);
  const acao = String(action || "");
  if (acao === "getListaAuditoria") return 90000;
  if (acao === "submeterInscricaoNativa" || acao === "atualizarEstagioCarteira") return 120000;
  if (acao === "forcarExecucaoMotor") return 180000;
  if (acao === "getStatusMotores" || acao === "alterarEstadoMotor") return 45000;
  if (acao === "healthcheckMaestro" || acao === "corrigirSemestresTenantFirestore") return 120000;
  if (acao === "dispararPushLoteManual" || acao === "publicarAvisoNotificacao") return 120000;
  if (acao === "getDashboardStats") return 45000;
  return 30000;
}

function normalizarErroBackendMaestro(data, action) {
  if (!data || data.sucesso !== false) return data;

  const detalhes = String(data.detalhes || data.erro || "");
  if (/function .* is not defined|is not defined/i.test(detalhes)) {
    data.codigo = data.codigo || "GAS_DEPLOY_DESATUALIZADO";
    data.erro = "Backend publicado desatualizado. Atualize a biblioteca GAS e tente novamente.";
  } else if (/FIRESTORE_INDEX_REQUIRED|requires an index|create_composite|FAILED_PRECONDITION/i.test(detalhes)) {
    data.codigo = data.codigo || "FIRESTORE_INDEX_REQUIRED";
    data.erro = "Indice Firestore ausente para esta consulta. Crie o indice indicado no console Firebase.";
  } else if (/quota|429/i.test(detalhes)) {
    data.codigo = data.codigo || "QUOTA_LIMIT";
    data.erro = data.erro && !/erro interno no servidor/i.test(data.erro)
      ? data.erro
      : "Limite temporario do servidor atingido. Tente novamente em alguns minutos.";
  }

  data.action = data.action || action;
  return data;
}

async function apiCall(action, payload = {}, options = {}) {
  let token = localStorage.getItem("MAESTRO_TOKEN") || localStorage.getItem("MAESTRO_EST_TOKEN");

  if (!GAS_URL) return { sucesso: false, erro: "Cliente Maestro não configurado." };

  if (token === "undefined" || token === "null") {
    token = null;
    localStorage.removeItem("MAESTRO_TOKEN");
    localStorage.removeItem("MAESTRO_EST_TOKEN");
  }

  const payloadFinal = prepararPayloadApiMaestro(action, payload);
  const contextoValido = validarContextoPayloadApiMaestro(action, payloadFinal, options);
  if (!contextoValido.ok) return contextoValido.resposta;

  const body = {
    action: action,
    token: token,
    payload: payloadFinal
  };
  const timeoutMs = obterTimeoutApiMaestro(action, options);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutDisparado = false;
  const timeoutId = controller ? setTimeout(() => {
    timeoutDisparado = true;
    controller.abort();
  }, timeoutMs) : null;

  try {
    const fetchOptions = {
      method: 'POST',
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    };
    if (controller) fetchOptions.signal = controller.signal;

    const response = await fetch(GAS_URL, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);

    let data;
    try {
      data = normalizarRespostaApiIAM(await response.json());
    } catch (parseError) {
      return {
        sucesso: false,
        erro: "Resposta invalida do backend.",
        detalhes: parseError.message,
        status: response.status || 502,
        action: action
      };
    }
    data = normalizarErroBackendMaestro(data, action);

    if (data.status === 401 && action !== "invalidarTokenSessao") {
      if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "401 Unauthorized na rota.", { action: action });
      else console.warn("401 Unauthorized na rota.");
      localStorage.removeItem("MAESTRO_TOKEN");
      localStorage.removeItem("MAESTRO_EST_TOKEN");
      if (typeof limparContextsSessaoMaestro === "function") limparContextsSessaoMaestro();
      if (typeof showToast === "function") {
        showToast("Sessão encerrada. Por favor, entre novamente.", "error");
      }
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      return { sucesso: false, erro: "Sessão expirada" };
    }

    return data;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro na chamada API.", { action: action, error: error });
    else console.error("Erro na chamada API.");
    const abortado = error && error.name === "AbortError";
    return {
      sucesso: false,
      erro: abortado
        ? "Tempo limite excedido ao comunicar com o backend."
        : "Falha na ligacao ao servidor.",
      detalhes: abortado && timeoutDisparado
        ? `A chamada ${action} excedeu ${Math.round(timeoutMs / 1000)}s. Tente novamente ou verifique indices/execucao no GAS.`
        : (error && error.message ? error.message : String(error)),
      status: abortado ? 408 : 0,
      codigo: abortado ? "API_TIMEOUT" : "NETWORK_ERROR",
      action: action
    };
  }
}

function temSessaoOperadorAtiva() {
  const tokenOperador = localStorage.getItem("MAESTRO_TOKEN");
  const nivelOperador = localStorage.getItem("MAESTRO_OPERADOR_NIVEL");

  return !!(
    tokenOperador &&
    nivelOperador &&
    tokenOperador !== "undefined" &&
    tokenOperador !== "null" &&
    nivelOperador !== "undefined" &&
    nivelOperador !== "null"
  );
}

function sincronizarOperatorSessionMaestro(res, login, tokenValido) {
  const tenantId = res && (res.tenantId || res.tenantID || res.tenant_id);
  if (tenantId) {
    atualizarTenantContextoMaestro({
      tenantId: tenantId,
      clientUrl: localStorage.getItem("MAESTRO_CLIENT_URL") || GAS_URL || "",
      source: "operatorLogin"
    });
  }
  if (!window.MaestroData || !window.MaestroData.contexts || !window.MaestroData.contexts.operator) return null;

  return window.MaestroData.contexts.operator.set({
    token: tokenValido || (res && (res.token || res.tokenSessao || res.hashAcesso || res.sessionToken)) || localStorage.getItem("MAESTRO_TOKEN"),
    nome: (res && res.nome) || localStorage.getItem("MAESTRO_OPERADOR_NOME") || "Operador",
    email: (res && (res.email || res.identificador)) || login || localStorage.getItem("MAESTRO_OPERADOR_EMAIL") || "",
    nivel: String((res && res.nivel) || localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "OPERADOR").toUpperCase(),
    perfil: String((res && res.nivel) || localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "OPERADOR").toUpperCase(),
    tenantId: tenantId || localStorage.getItem("MAESTRO_TENANT_ID") || ""
  });
}

function sincronizarStudentIdentityMaestro(res, login) {
  if (!window.MaestroData || !window.MaestroData.contexts || !window.MaestroData.contexts.student) return null;

  const dados = Object.assign({}, res || {}, {
    idCarteira: (res && (res.idCarteira || res.identificador)) || login || "",
    identificador: (res && res.identificador) || login || "",
    token: (res && res.token) || localStorage.getItem("MAESTRO_EST_TOKEN") || ""
  });

  return window.MaestroData.contexts.student.set(dados);
}

function sincronizarSessoesMaestroDoStorage() {
  if (!window.MaestroData || !window.MaestroData.contexts) return;

  if (localStorage.getItem("MAESTRO_TOKEN")) {
    sincronizarOperatorSessionMaestro({}, localStorage.getItem("MAESTRO_OPERADOR_EMAIL") || "", localStorage.getItem("MAESTRO_TOKEN"));
  }

  if (localStorage.getItem("MAESTRO_EST_TOKEN")) {
    const cacheBruto = localStorage.getItem("MAESTRO_WALLET_CACHE") || localStorage.getItem("MAESTRO_OFFLINE_WALLET") || "{}";
    try {
      sincronizarStudentIdentityMaestro(JSON.parse(cacheBruto), "");
    } catch (erro) {
      if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Nao foi possivel sincronizar studentIdentity do cache local.", erro);
      else console.warn("Nao foi possivel sincronizar studentIdentity do cache local.");
    }
  }
}

function limparContextsSessaoMaestro(tipo) {
  if (!window.MaestroData || !window.MaestroData.contexts) return;

  if ((!tipo || tipo === "operator") && window.MaestroData.contexts.operator) {
    window.MaestroData.contexts.operator.clear();
  }

  if ((!tipo || tipo === "student") && window.MaestroData.contexts.student) {
    window.MaestroData.contexts.student.clear();
  }
}

// ========================================================================
// 1. AUTENTICAÇÃO DE OPERADORES (FISCAL / MOTORISTA / ADMIN)
// ========================================================================

async function fazerLoginOperador() {
  const email = document.getElementById('fiscal-email').value.trim();
  const senha = document.getElementById('fiscal-senha').value.trim();
  const btn = document.getElementById('btn-login-fiscal');
  const resBox = document.getElementById('res-login-fiscal');

  if (!email || !senha) {
    showToast("Preencha todos os campos.", "error");
    return;
  }

  btn.innerText = "A AUTENTICAR...";
  btn.disabled = true;
  resBox.classList.add('hidden');

  try {
    const res = await apiCall("autenticarOperadorIAM", { login: email, identificador: email, email, senha });

    if (res.status === "PRIMEIRO_ACESSO") {
      prepararPrimeiroAcessoIAM(email, senha, res, "OPERADOR");
      return;
    }

    if (res.sucesso) {
      if (String(res.tipo || "OPERADOR").toUpperCase() !== "OPERADOR") {
        resBox.innerText = "Este acesso pertence a estudante. Use o Cofre Digital.";
        resBox.classList.remove('hidden');
        return;
      }

      const tokenValido = res.token || res.tokenSessao || res.hashAcesso || res.sessionToken;

      if (!tokenValido) {
        showToast("Erro Crítico: O servidor não gerou o token.", "error");
        resBox.innerText = "Falha de comunicação com o autorizador. Token ausente.";
        resBox.classList.remove('hidden');
        btn.innerText = "AUTENTICAR";
        btn.disabled = false;
        return;
      }

      localStorage.setItem("MAESTRO_TOKEN", tokenValido);
      localStorage.setItem("MAESTRO_OPERADOR_NOME", res.nome || "Operador");
      localStorage.setItem("MAESTRO_OPERADOR_NIVEL", String(res.nivel || "OPERADOR").toUpperCase());
      localStorage.setItem("MAESTRO_OPERADOR_EMAIL", res.email || email);
      sincronizarOperatorSessionMaestro(res, email, tokenValido);

      const elNome = document.getElementById('nome-operador-logado');
      if (elNome) elNome.innerText = res.nome || "Operador";

      configurarInterfacePorNivel(String(res.nivel || "OPERADOR").toUpperCase());
      showToast("Acesso concedido!", "success");
    } else {
      resBox.innerText = res.erro || "Login Inválido.";
      resBox.classList.remove('hidden');
    }
  } catch (e) {
    showToast("Erro de ligação.", "error");
  } finally {
    btn.innerText = "AUTENTICAR";
    btn.disabled = false;
  }
}

function finalizarLoginOperadorIAM(res, login, resBox) {
  const tokenValido = res.token || res.tokenSessao || res.hashAcesso || res.sessionToken;

  if (!tokenValido) {
    showToast("Erro Crítico: O servidor não gerou o token.", "error");
    if (resBox) {
      resBox.innerText = "Falha de comunicação com o autorizador. Token ausente.";
      resBox.classList.remove('hidden');
    }
    return false;
  }

  localStorage.setItem("MAESTRO_TOKEN", tokenValido);
  localStorage.setItem("MAESTRO_OPERADOR_NOME", res.nome || "Operador");
  localStorage.setItem("MAESTRO_OPERADOR_NIVEL", String(res.nivel || "OPERADOR").toUpperCase());
  localStorage.setItem("MAESTRO_OPERADOR_EMAIL", res.email || login);
  sincronizarOperatorSessionMaestro(res, login, tokenValido);

  const elNome = document.getElementById('nome-operador-logado');
  if (elNome) elNome.innerText = res.nome || "Operador";

  configurarInterfacePorNivel(String(res.nivel || "OPERADOR").toUpperCase());
  showToast("Acesso concedido!", "success");
  return true;
}

function inicializarValidadorSenhaIAM() {
  const novaSenha = document.getElementById('nova-senha');
  const confirmarSenha = document.getElementById('confirmar-nova-senha');
  const btnSalvar = document.getElementById('btn-salvar-nova-senha');

  if (!novaSenha || !confirmarSenha || !btnSalvar) return;

  const atualizarEstado = () => {
    const resultado = validarRegrasSenha(novaSenha.value);
    const senhasConferem = novaSenha.value !== "" && novaSenha.value === confirmarSenha.value;
    atualizarBotaoSenhaIAM(btnSalvar, resultado.valida && senhasConferem);
  };

  if (novaSenha.dataset.iamValidatorBound !== "true") {
    novaSenha.addEventListener('input', atualizarEstado);
    confirmarSenha.addEventListener('input', atualizarEstado);
    novaSenha.dataset.iamValidatorBound = "true";
  }

  atualizarEstado();
}

function validarRegrasSenha(valor) {
  const senha = String(valor || "");
  const regras = {
    tam: senha.length >= 8,
    mai: /[A-Z]/.test(senha),
    min: /[a-z]/.test(senha),
    num: /[0-9]/.test(senha),
    esp: /[^A-Za-z0-9]/.test(senha)
  };

  atualizarItemRegraSenhaIAM('regra-tam', regras.tam, 'Mínimo de 8 caracteres');
  atualizarItemRegraSenhaIAM('regra-mai', regras.mai, 'Pelo menos uma letra maiúscula');
  atualizarItemRegraSenhaIAM('regra-min', regras.min, 'Pelo menos uma letra minúscula');
  atualizarItemRegraSenhaIAM('regra-num', regras.num, 'Pelo menos um número');
  atualizarItemRegraSenhaIAM('regra-esp', regras.esp, 'Pelo menos um caractere especial');

  return { ...regras, valida: regras.tam && regras.mai && regras.min && regras.num && regras.esp };
}

function atualizarItemRegraSenhaIAM(id, valido, texto) {
  const itens = document.querySelectorAll('[id="' + id + '"]');
  if (!itens || itens.length === 0) return;

  itens.forEach(item => {
    if (item) {
      const textoSeguro = typeof escapeHTMLMaestro === "function"
        ? escapeHTMLMaestro(texto)
        : String(texto || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      item.innerHTML = `<span data-maestro-icon-slot="${valido ? "check" : "close"}" aria-hidden="true"></span> ${textoSeguro}`;
      if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(item);
      item.classList.add("password-rule-state");
      item.classList.toggle("is-valid", valido);
      item.classList.toggle("is-invalid", !valido);
    }
  });
}

function prepararPrimeiroAcessoIAM(login, senhaTemporaria, res, origem) {
  IAM_STATE.login = String(login || "").trim();
  IAM_STATE.senhaTemporaria = String(senhaTemporaria || "");
  IAM_STATE.tipo = String(res.tipo || origem || "").toUpperCase();
  IAM_STATE.origem = String(IAM_STATE.tipo || origem || "").toUpperCase();
  IAM_STATE.dados = res || null;

  sessionStorage.setItem("MAESTRO_IAM_TEMP_LOGIN", IAM_STATE.login);
  sessionStorage.setItem("MAESTRO_IAM_TEMP_SENHA", IAM_STATE.senhaTemporaria);
  sessionStorage.setItem("MAESTRO_IAM_TEMP_TIPO", IAM_STATE.tipo);
  sessionStorage.setItem("MAESTRO_IAM_TEMP_ORIGEM", IAM_STATE.origem);

  const novaSenha = document.getElementById('nova-senha');
  const confirmarSenha = document.getElementById('confirmar-nova-senha');
  if (novaSenha) novaSenha.value = "";
  if (confirmarSenha) confirmarSenha.value = "";

  validarRegrasSenha("");
  inicializarValidadorSenhaIAM();
  switchView('view-nova-senha');
  showToast("Primeiro acesso confirmado. Defina uma senha forte.", "info");
}

async function loginCarteiraIAM() {
  const login = document.getElementById('login-id').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const btn = document.getElementById('btn-login');
  const resBox = document.getElementById('res-login');

  if (!login || !senha) {
    resBox.innerText = "Preencha o login e a senha.";
    resBox.classList.remove('hidden');
    return;
  }

  btn.innerText = "A AUTENTICAR...";
  btn.disabled = true;
  resBox.classList.add('hidden');

  try {
    let res = await apiCall("autenticarEstudanteIAM", {
      login,
      identificador: login,
      senha,
      canal: "carteira",
      origemCarteira: true
    });

    if (!res.sucesso && String(login || "").replace(/\D/g, "").length === 11) {
      const fallbackCarteira = await apiCall("autenticarCarteiraDigital", {
        login,
        identificador: login,
        senha,
        senhaDigitada: senha
      });
      if (fallbackCarteira && (fallbackCarteira.sucesso || fallbackCarteira.status === "PRIMEIRO_ACESSO" || fallbackCarteira.erro)) {
        res = fallbackCarteira;
      }
    }

    if (res.status === "PRIMEIRO_ACESSO") {
      prepararPrimeiroAcessoIAM(login, senha, res, "ESTUDANTE");
      return;
    }

    if (!res.sucesso) {
      resBox.innerText = res.erro || "Login inválido.";
      const cpfLogin = String(login || "").replace(/\D/g, "");
      if (cpfLogin.length === 11 && /acesso negado|senha incorreta/i.test(resBox.innerText)) {
        try {
          const statusCpf = await apiCall("consultarStatusCPF", { cpf: cpfLogin });
          if (statusCpf && statusCpf.encontrado) {
            resBox.innerText = "Carteira digital nao liberada com este PIN. Acompanhe a inscricao pelo CPF ou entre com o ID/e-mail e a senha ja definida.";
          }
        } catch (statusError) {
          if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Nao foi possivel consultar o status do CPF apos falha de carteira.", statusError);
          else console.warn("Nao foi possivel consultar o status do CPF apos falha de carteira.");
        }
      }
      resBox.classList.remove('hidden');
      return;
    }

    if (String(res.tipo || "ESTUDANTE").toUpperCase() === "OPERADOR") {
      finalizarLoginOperadorIAM(res, login, resBox);
      return;
    }

    finalizarLoginEstudanteIAM(login, senha, res);
  } catch (err) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Falha no login IAM da carteira.", err);
    else console.warn("Falha no login IAM da carteira.");
    resBox.innerText = "Falha de ligação. Necessita de internet.";
    resBox.classList.remove('hidden');
  } finally {
    btn.innerText = "ENTRAR NO COFRE";
    btn.disabled = false;
  }
}

function finalizarLoginEstudanteIAM(login, senha, res) {
  currentWalletId = res.idCarteira || res.identificador || login;
  currentWalletSenha = senha;
  currentStudentName = res.nome;

  if (res.token) localStorage.setItem("MAESTRO_EST_TOKEN", res.token);
  localStorage.setItem("MAESTRO_WALLET_CACHE", JSON.stringify(res));
  localStorage.setItem("MAESTRO_WALLET_CREDS", JSON.stringify({ id: login, senha }));
  sincronizarStudentIdentityMaestro(res, login);
  if (typeof marcarCacheCarteiraMaestro === "function") marcarCacheCarteiraMaestro(res, "autenticarEstudanteIAM");

  renderizarCarteira(res);
  switchView('view-wallet');

  const loginId = document.getElementById('login-id');
  const loginSenha = document.getElementById('login-senha');
  if (loginId) loginId.value = "";
  if (loginSenha) loginSenha.value = "";

  if (typeof armarRelogioSessaoEstudante === 'function') armarRelogioSessaoEstudante();

  if (localStorage.getItem('MAESTRO_PREF_PUSH') === 'true') {
    const tokenTemp = localStorage.getItem("MAESTRO_FCM_TOKEN_TEMP");
    if (tokenTemp && typeof registrarTokenPush === 'function') {
      registrarTokenPush(tokenTemp);
    } else if (typeof inicializarPushNotifications === 'function') {
      setTimeout(inicializarPushNotifications, 2000);
    }
  }
}

async function salvarNovaSenhaPrimeiroAcesso() {
  const novaSenha = document.getElementById('nova-senha').value.trim();
  const confirmarSenha = document.getElementById('confirmar-nova-senha').value.trim();
  const btn = document.getElementById('btn-salvar-nova-senha');
  const resultado = validarRegrasSenha(novaSenha);

  if (!resultado.valida || novaSenha !== confirmarSenha) {
    showToast("A senha ainda não atende aos requisitos ou não confere.", "error");
    return;
  }

  const login = IAM_STATE.login || sessionStorage.getItem("MAESTRO_IAM_TEMP_LOGIN") || localStorage.getItem("MAESTRO_RESET_EMAIL") || "";
  const senhaTemporaria = IAM_STATE.senhaTemporaria || sessionStorage.getItem("MAESTRO_IAM_TEMP_SENHA") || "";
  const pin = sessionStorage.getItem("MAESTRO_IAM_TEMP_PIN") || "";
  const origem = IAM_STATE.origem || sessionStorage.getItem("MAESTRO_IAM_TEMP_ORIGEM") || "ESTUDANTE";

  if (!login) {
    showToast("Sessão temporária expirada. Faça login novamente.", "error");
    switchView('view-login');
    return;
  }

  btn.innerText = "A SALVAR...";
  btn.disabled = true;

  try {
    const action = pin ? "validarPinERedefinir" : "definirSenhaPrimeiroAcesso";
    const payload = pin
      ? { email: login, pin, novaSenha }
      : { login, senhaTemporaria, novaSenha };
    const res = await apiCall(action, payload);

    if (!res.sucesso) {
      showToast(res.erro || "Não foi possível salvar a nova senha.", "error");
      return;
    }

    sessionStorage.removeItem("MAESTRO_IAM_TEMP_LOGIN");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_SENHA");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_TIPO");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_ORIGEM");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_PIN");

    showToast("Senha definida com sucesso. Entrando...", "success");

    if (origem === "OPERADOR") {
      const auth = await apiCall("autenticarOperadorIAM", { login, identificador: login, senha: novaSenha });
      if (auth.sucesso) {
        localStorage.setItem("MAESTRO_TOKEN", auth.token);
        localStorage.setItem("MAESTRO_OPERADOR_NOME", auth.nome || "Operador");
        localStorage.setItem("MAESTRO_OPERADOR_NIVEL", String(auth.nivel || "OPERADOR").toUpperCase());
        localStorage.setItem("MAESTRO_OPERADOR_EMAIL", auth.email || login);
        sincronizarOperatorSessionMaestro(auth, login, auth.token);
        configurarInterfacePorNivel(String(auth.nivel || "OPERADOR").toUpperCase());
      } else {
        switchView('view-login-fiscal');
      }
      return;
    }

    const auth = await apiCall("autenticarEstudanteIAM", { login, identificador: login, senha: novaSenha });
    if (auth.sucesso) {
      finalizarLoginEstudanteIAM(login, novaSenha, auth);
    } else {
      switchView('view-login');
    }
  } catch (e) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao salvar senha de primeiro acesso.", e);
    else console.error("Erro ao salvar senha de primeiro acesso.");
    showToast("Erro de ligação ao salvar a senha.", "error");
  } finally {
    btn.innerText = "Salvar e Entrar";
    inicializarValidadorSenhaIAM();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarValidadorSenhaIAM();
  sincronizarSessoesMaestroDoStorage();
  window.loginCarteira = loginCarteiraIAM;
});

function configurarInterfacePorNivel(nivel) {
  if (!temSessaoOperadorAtiva()) return;

  const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
  if (nav && typeof nav.applyVisibility === "function") {
    const perfil = nav.normalizeProfile ? nav.normalizeProfile(nivel) : String(nivel || "OPERADOR").toUpperCase();
    nav.applyVisibility(perfil);
    switchView(nav.getDefaultView ? nav.getDefaultView(perfil) : 'view-admin-hub');
    if (perfil === "MOTORISTA" && typeof popularSelectFrotaMotorista === 'function') {
      popularSelectFrotaMotorista();
    }
    return;
  }

  const mCampo = document.getElementById('menu-grupo-campo');
  const mSecretaria = document.getElementById('menu-grupo-secretaria');
  const mModerador = document.getElementById('menu-grupo-moderador');

  if (mCampo) mCampo.classList.add('hidden');
  if (mSecretaria) mSecretaria.classList.add('hidden');
  if (mModerador) mModerador.classList.add('hidden');

  if (nivel === "MOTORISTA") {
    switchView('view-painel-motorista');
    if (typeof popularSelectFrotaMotorista === 'function') popularSelectFrotaMotorista();
  }
  else if (nivel === "FISCAL") {
    switchView('view-admin-hub');
    if (mCampo) mCampo.classList.remove('hidden');
  }
  else if (nivel === "OPERADOR" || nivel === "SUPERVISOR") {
    switchView('view-admin-hub');
    if (mCampo) mCampo.classList.remove('hidden');
    if (mSecretaria) mSecretaria.classList.remove('hidden');
  }
  else if (nivel === "MODERADOR") {
    switchView('view-admin-hub');
    if (mCampo) mCampo.classList.remove('hidden');
    if (mSecretaria) mSecretaria.classList.remove('hidden');
    if (mModerador) mModerador.classList.remove('hidden');
  }
}

function verificarSessaoAtiva() {
  const token = localStorage.getItem("MAESTRO_TOKEN");
  const nivel = localStorage.getItem("MAESTRO_OPERADOR_NIVEL");
  const nome = localStorage.getItem("MAESTRO_OPERADOR_NOME");

  if (token && nivel && token !== "undefined" && token !== "null") {
    sincronizarOperatorSessionMaestro({}, localStorage.getItem("MAESTRO_OPERADOR_EMAIL") || "", token);
    const elNome = document.getElementById('nome-operador-logado');
    if (elNome) elNome.innerText = nome || "Operador";
    configurarInterfacePorNivel(nivel);
  } else {
    localStorage.removeItem("MAESTRO_TOKEN");
    limparContextsSessaoMaestro("operator");
  }
}

function encerrarSessaoOperador() {
  localStorage.removeItem("MAESTRO_TOKEN");
  localStorage.removeItem("MAESTRO_OPERADOR_NOME");
  localStorage.removeItem("MAESTRO_OPERADOR_NIVEL");
  localStorage.removeItem("MAESTRO_OPERADOR_EMAIL");
  limparContextsSessaoMaestro("operator");

  // CRITICAL FIX: Destroy the view memory to prevent the session loop
  sessionStorage.removeItem('MAESTRO_LAST_VIEW');

  window.location.reload();
}

// ========================================================================
// 2. RECUPERAÇÃO DE SENHA
// ========================================================================

function abrirRecuperacaoSenha() {
  switchView('view-recuperar-senha');
}

async function solicitarRecuperacaoSenha() {
  const email = document.getElementById('recuperar-email').value.trim();
  const btn = document.getElementById('btn-solicitar-recuperacao');

  if (!email) { showToast("Insira o seu e-mail.", "error"); return; }

  btn.innerText = "A ENVIAR...";
  btn.disabled = true;

  try {
    const res = await apiCall("solicitarRecuperacao", { email });
    if (res.sucesso) {
      showToast("PIN enviado para o seu e-mail!", "success");
      localStorage.setItem("MAESTRO_RESET_EMAIL", email);
      switchView('view-redefinir-senha');
    } else {
      showToast(res.erro, "error");
    }
  } catch (e) {
    showToast("Erro de ligação.", "error");
  } finally {
    btn.innerText = "ENVIAR CÓDIGO PIN";
    btn.disabled = false;
  }
}

async function confirmarRedefinicaoSenha() {
  const email = localStorage.getItem("MAESTRO_RESET_EMAIL");
  const pin = document.getElementById('redefinir-pin').value.trim();
  const novaSenha = document.getElementById('redefinir-nova-senha').value.trim();
  const confirma = document.getElementById('redefinir-confirmar-senha').value.trim();
  const btn = document.getElementById('btn-confirmar-redefinicao');

  if (!email) {
    showToast("Informe o e-mail antes de validar o PIN.", "error");
    switchView('view-recuperar-senha');
    return;
  }

  if (!pin || !novaSenha || novaSenha !== confirma) {
    showToast("Verifique os campos e a confirmação da senha.", "error");
    return;
  }

  if (!validarRegrasSenha(novaSenha).valida) {
    showToast("A nova senha deve atender aos requisitos de seguranÃ§a.", "error");
    return;
  }

  btn.innerText = "A PROCESSAR...";
  btn.disabled = true;

  try {
    const res = await apiCall("validarPinERedefinir", { email, pin, novaSenha });
    if (res.sucesso) {
      showToast("Senha alterada com sucesso! Faça login.", "success");
      localStorage.removeItem("MAESTRO_RESET_EMAIL");
      sessionStorage.removeItem("MAESTRO_IAM_TEMP_PIN");
      switchView('view-login-fiscal');
    } else {
      showToast(res.erro, "error");
    }
  } catch (e) {
    showToast("Erro de conexão.", "error");
  } finally {
    btn.innerText = "REDEFINIR SENHA";
    btn.disabled = false;
  }
}

// ========================================================================
// 3. PRIVACIDADE DO ESTUDANTE (LGPD)
// ========================================================================

function obterCpfPrivacidadeEstudante() {
  if (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.student) {
    const identity = window.MaestroData.contexts.student.get();
    if (identity && identity.cpf) return String(identity.cpf).replace(/\D/g, "");
  }

  const cacheBruto = localStorage.getItem("MAESTRO_WALLET_CACHE") || localStorage.getItem("MAESTRO_OFFLINE_WALLET") || "{}";

  try {
    const dados = JSON.parse(cacheBruto);
    return String(dados.cpf || dados.cpfAluno || "").replace(/\D/g, "");
  } catch (erro) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Nao foi possivel ler a identidade da carteira local.", erro);
    else console.warn("Nao foi possivel ler a identidade da carteira local.");
    return "";
  }
}

async function downloadDadosPessoais() {
  const cpf = obterCpfPrivacidadeEstudante();

  if (!cpf || cpf.length !== 11) {
    showToast("CPF não encontrado na sessão. Entre novamente no Cofre Digital.", "error");
    return;
  }

  showToast("Preparando seus dados pessoais...", "info");

  try {
    const res = await apiCall("exportarDadosEstudante", { cpf: cpf });

    if (!res || !res.sucesso) {
      showToast((res && res.erro) || "Não foi possível exportar seus dados.", "error");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.dados));
    const link = document.createElement("a");
    const dataArquivo = new Date().toISOString().slice(0, 10);

    link.setAttribute("href", dataStr);
    link.setAttribute("download", `dados_pessoais_maestro_${cpf}_${dataArquivo}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Arquivo JSON gerado com sucesso.", "success");
  } catch (erro) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao baixar dados pessoais.", erro);
    else console.error("Erro ao baixar dados pessoais.");
    showToast("Falha de conexão ao exportar seus dados.", "error");
  }
}

async function confirmarExclusaoConta() {
  const cpf = obterCpfPrivacidadeEstudante();

  if (!cpf || cpf.length !== 11) {
    showToast("CPF não encontrado na sessão. Entre novamente no Cofre Digital.", "error");
    return;
  }

  const primeiraConfirmacao = window.confirm(
    "A anonimização da conta é irreversível. Seus dados pessoais, documentos e acesso ao Cofre Digital serão removidos do cadastro, mantendo apenas dados estatísticos como rota, turno, instituição e data de inscrição.\n\nDeseja continuar?"
  );

  if (!primeiraConfirmacao) return;

  const segundaConfirmacao = window.confirm(
    "Confirma definitivamente a solicitação de exclusão de conta? Esta ação não poderá ser desfeita."
  );

  if (!segundaConfirmacao) return;

  showToast("Enviando solicitação de anonimização...", "warning");

  try {
    const res = await apiCall("solicitarAnonimizacaoEstudante", { cpf: cpf });

    if (!res || !res.sucesso) {
      showToast((res && res.erro) || "Não foi possível anonimizar sua conta.", "error");
      return;
    }

    limparCarteiraLocalAposAnonimizacao();
    showToast(res.mensagem || "Conta anonimizada com sucesso.", "success");

    setTimeout(() => {
      switchView("view-aluno-menu");
    }, 1200);
  } catch (erro) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao solicitar anonimizacao.", erro);
    else console.error("Erro ao solicitar anonimizacao.");
    showToast("Falha de conexão ao solicitar a exclusão da conta.", "error");
  }
}

function limparCarteiraLocalAposAnonimizacao() {
  localStorage.removeItem("MAESTRO_EST_TOKEN");
  localStorage.removeItem("MAESTRO_WALLET_CACHE");
  localStorage.removeItem("MAESTRO_OFFLINE_WALLET");
  localStorage.removeItem("MAESTRO_WALLET_CREDS");
  localStorage.removeItem("MAESTRO_FCM_TOKEN");
  localStorage.removeItem("MAESTRO_FCM_TOKEN_TEMP");
  localStorage.removeItem("FCM_SYNCED_ID");
  limparContextsSessaoMaestro("student");

  if (typeof currentWalletId !== "undefined") currentWalletId = "";
  if (typeof currentWalletSenha !== "undefined") currentWalletSenha = "";
  if (typeof currentStudentName !== "undefined") currentStudentName = "";

  const walletContainer = document.getElementById("wallet-container");
  if (walletContainer) walletContainer.innerHTML = "";

  const walletActions = document.getElementById("wallet-actions");
  if (walletActions) walletActions.classList.add("hidden");

  const painelMobilidade = document.getElementById("view-mobilidade");
  if (painelMobilidade) painelMobilidade.classList.add("hidden");
}
