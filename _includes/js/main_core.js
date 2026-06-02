// ========================================================================
// 1. MOTOR PWA & ARRANQUE DINÂMICO (BOOTSTRAP)
// ========================================================================

let deferredPrompt;
const MAESTRO_PWA_VERSION = "12.38.0";
window.MAESTRO_PWA_VERSION = MAESTRO_PWA_VERSION;
window.MAESTRO_MANIFEST_URL = null;

// Promessa global de prontidão do Firebase — consumidores aguardam esta promessa
window.firebaseReady = null;

// Privacidade: câmera desligada por padrão até ação explícita do utilizador
window.cameraAtiva = false;

// Idempotência: garante que useServiceWorker() é chamado apenas uma vez por sessão
window.isSwInjected = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function sincronizarContextsMaestroDoBoot(configPWA) {
  if (!configPWA || !window.MaestroData || !window.MaestroData.contexts) return null;

  const contexts = window.MaestroData.contexts;
  const themeConfig = contexts.theme.set(configPWA);
  const tenantId = configPWA.tenantId || configPWA.tenantID || configPWA.tenant_id ||
    (configPWA.config && (configPWA.config.tenantId || configPWA.config.tenantID || configPWA.config.tenant_id)) ||
    "";
  const clientUrl = localStorage.getItem("MAESTRO_CLIENT_URL") || GAS_URL || "";

  contexts.tenant.set({
    tenantId: tenantId,
    clientUrl: clientUrl,
    cidade: themeConfig && themeConfig.brand ? themeConfig.brand.cidade : "",
    cepsValidos: themeConfig && themeConfig.rules ? themeConfig.rules.cepsValidos : [],
    source: "bootSystem"
  });

  contexts.semester.set({
    semestreId: configPWA.semestreId || configPWA.semestreAtual ||
      (configPWA.config && (configPWA.config.semestreId || configPWA.config.semestreAtual || configPWA.config.SEMESTRE_ATIVO)) ||
      "",
    label: configPWA.semestreLabel || configPWA.semestreNome ||
      (configPWA.config && (configPWA.config.semestreLabel || configPWA.config.semestreNome)) ||
      "",
    docsValidityMonths: themeConfig && themeConfig.rules ? themeConfig.rules.docsValidityMonths : null,
    lgpdRetentionMonths: themeConfig && themeConfig.rules ? themeConfig.rules.lgpdRetentionMonths : null,
    source: "bootSystem"
  });

  if (window.MaestroTheme && typeof window.MaestroTheme.apply === "function") {
    window.MaestroTheme.apply(themeConfig, {
      dark: localStorage.getItem('MAESTRO_DARK_MODE') === 'true'
    });
  }

  return themeConfig;
}

function sanitizarUrlPWAMaestro(valor, fallback) {
  const fallbackSeguro = fallback || "icone.png";
  if (!valor) return fallbackSeguro;
  if (window.MaestroData && window.MaestroData.safeRender && typeof window.MaestroData.safeRender.url === "function") {
    return window.MaestroData.safeRender.url(valor) || fallbackSeguro;
  }
  return String(valor || fallbackSeguro);
}

function atualizarIdentidadePublicaMaestro(themeConfig) {
  const config = themeConfig && themeConfig.brand
    ? themeConfig
    : (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.theme
      ? window.MaestroData.contexts.theme.get()
      : {});
  const brand = config.brand || {};
  const contact = config.contact || {};
  const pwa = config.pwa || {};
  const logos = config.logos || {};
  const nomePortal = pwa.name || brand.secretaria || window.PWA_NOME || "Portal Maestro";
  const setor = brand.setor || "Acesso estudantil e mobilidade escolar";
  const cidade = brand.cidade || "";
  const contato = contact.email || "";
  const logo = sanitizarUrlPWAMaestro(logos.emblem || logos.light || logos.appIcon || window.PWA_ICONE || "MGA.png", "MGA.png");

  const setText = (id, value, hideWhenEmpty = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    const text = String(value || "").trim();
    if (text) {
      el.innerText = text;
      el.classList.remove("hidden");
    } else if (hideWhenEmpty) {
      el.classList.add("hidden");
    }
  };

  setText("ui-gateway-nome", nomePortal);
  setText("ui-gateway-setor", setor);
  setText("ui-gateway-cidade", cidade, true);
  setText("ui-gateway-contato", contato ? "Contato: " + contato : "", true);
  setText("ui-hub-brand-name", nomePortal);
  setText("ui-public-footer-brand", nomePortal);

  const gatewayLogo = document.getElementById("ui-gateway-logo");
  if (gatewayLogo) {
    gatewayLogo.classList.remove("hidden");
    gatewayLogo.src = logo;
  }
}

function obterPreferenciaLocalEstagioMaestro() {
  try {
    const valor = localStorage.getItem("MAESTRO_ESTAGIO_VISIVEL");
    if (valor === "true") return true;
    if (valor === "false") return false;
  } catch (error) { }
  return null;
}

function maestroEstagioVisivel() {
  const preferenciaLocal = obterPreferenciaLocalEstagioMaestro();
  if (preferenciaLocal !== null) return preferenciaLocal;

  try {
    const theme = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.theme
      ? window.MaestroData.contexts.theme.get()
      : {};
    const rules = theme && theme.rules ? theme.rules : {};
    if (rules.estagioVisible === true || rules.estagioVisible === false) return rules.estagioVisible;
  } catch (error) { }

  return true;
}

function aplicarPoliticaEstagioMaestro() {
  const visivel = maestroEstagioVisivel();
  if (!document.body) return visivel;
  document.body.setAttribute("data-maestro-estagio", visivel ? "visible" : "hidden");

  document.querySelectorAll("[data-maestro-estagio-feature]").forEach(elemento => {
    elemento.classList.toggle("maestro-estagio-hidden", !visivel);
    elemento.setAttribute("aria-hidden", visivel ? "false" : "true");
  });

  const toggle = document.getElementById("toggle-estagio-visivel");
  if (toggle) toggle.checked = visivel;

  if (!visivel) {
    const radioNao = document.querySelector('input[name="insc-estagio"][value="N\u00e3o"], input[name="insc-estagio"][value="Nao"]');
    if (radioNao) radioNao.checked = true;
    if (typeof toggleCondField === "function") toggleCondField("cond-estagio", false);

    const chkResgate = document.getElementById("chk-resgate-estagio");
    if (chkResgate) chkResgate.checked = false;
    const boxResgate = document.getElementById("box-resgate-ESTAGIO");
    if (boxResgate) boxResgate.classList.add("hidden");
  }

  return visivel;
}

function alterarVisibilidadeEstagioMaestro(visivel) {
  try {
    localStorage.setItem("MAESTRO_ESTAGIO_VISIVEL", visivel ? "true" : "false");
  } catch (error) { }
  aplicarPoliticaEstagioMaestro();
  if (typeof showToast === "function") {
    showToast(visivel ? "Conteudos de estagio visiveis neste dispositivo." : "Conteudos de estagio ocultos neste dispositivo.", "info");
  }
  return visivel;
}

window.maestroEstagioVisivel = maestroEstagioVisivel;
window.aplicarPoliticaEstagioMaestro = aplicarPoliticaEstagioMaestro;
window.alterarVisibilidadeEstagioMaestro = alterarVisibilidadeEstagioMaestro;

function atualizarManifestDinamicoMaestro(themeConfig) {
  const theme = themeConfig || {};
  const brand = theme.brand || {};
  const pwa = theme.pwa || {};
  const logos = theme.logos || {};
  const colors = theme.colors || {};
  const light = colors.light || {};
  const nome = pwa.name || brand.secretaria || window.PWA_NOME || "Portal Maestro";
  const shortName = brand.abreviacao || nome.slice(0, 12);
  const icon = sanitizarUrlPWAMaestro(pwa.icon || logos.appIcon || window.PWA_ICONE, "icone.png");
  const themeColor = light.primary || (window.THEME_LIGHT && window.THEME_LIGHT.primary) || "#0A3D6B";
  const backgroundColor = light.secondary || (window.THEME_LIGHT && window.THEME_LIGHT.secondary) || "#F8F9FA";
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const appBaseUrl = new URL("./", window.location.href).href;

  if (!manifestLink || typeof Blob === "undefined" || !window.URL || typeof window.URL.createObjectURL !== "function") return null;

  const manifest = {
    id: appBaseUrl,
    name: nome,
    short_name: shortName,
    description: "Portal Oficial de Mobilidade",
    start_url: appBaseUrl,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: backgroundColor,
    theme_color: themeColor,
    lang: "pt-BR",
    categories: ["education", "utilities", "productivity"],
    icons: [
      {
        src: icon,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: icon,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      }
    ]
  };

  if (window.MAESTRO_MANIFEST_URL) {
    try { window.URL.revokeObjectURL(window.MAESTRO_MANIFEST_URL); } catch (e) { }
  }

  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/manifest+json" });
  window.MAESTRO_MANIFEST_URL = window.URL.createObjectURL(blob);
  manifestLink.setAttribute("href", window.MAESTRO_MANIFEST_URL);
  return manifest;
}

function restaurarPWAOfflineMaestro() {
  const storedTheme = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.theme
    ? window.MaestroData.contexts.theme.get()
    : {};
  const themeConfig = storedTheme && Object.keys(storedTheme).length ? storedTheme : {};
  const brand = themeConfig.brand || {};
  const pwa = themeConfig.pwa || {};
  const logos = themeConfig.logos || {};
  const colors = themeConfig.colors || {};
  const light = colors.light || {};
  const dark = colors.dark || {};

  window.PWA_NOME = pwa.name || brand.secretaria || "Portal Maestro";
  window.PWA_ICONE = pwa.icon || logos.appIcon || "icone.png";
  window.THEME_LIGHT = {
    primary: light.primary || "#0A3D6B",
    secondary: light.secondary || "#F8F9FA",
    accent: light.accent || "#F29900",
    logo: logos.light || logos.emblem || "MGA.png"
  };
  window.THEME_DARK = {
    primary: dark.primary || "#8AB4F8",
    secondary: dark.secondary || "#121212",
    accent: dark.accent || "#F29900",
    logo: logos.dark || logos.emblem || window.THEME_LIGHT.logo
  };

  document.title = window.PWA_NOME;
  const elNome = document.getElementById('ui-nome-sistema');
  if (elNome) elNome.innerText = window.PWA_NOME.toUpperCase();
  const elSetor = document.getElementById('ui-nome-setor');
  if (elSetor) elSetor.innerText = brand.setor || "Acesso Estudantil";
  atualizarIdentidadePublicaMaestro(themeConfig);
  aplicarPoliticaEstagioMaestro();
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute("content", window.PWA_NOME);
  const appName = document.querySelector('meta[name="application-name"]');
  if (appName) appName.setAttribute("content", window.PWA_NOME);
  const appleIcon = document.getElementById("apple-touch-icon");
  if (appleIcon) appleIcon.setAttribute("href", sanitizarUrlPWAMaestro(window.PWA_ICONE, "icone.png"));
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.setAttribute("href", sanitizarUrlPWAMaestro(window.PWA_ICONE, "icone.png"));
  const metaThemeColor = document.getElementById("meta-theme-color");
  if (metaThemeColor) metaThemeColor.setAttribute("content", light.primary || "#0A3D6B");

  atualizarManifestDinamicoMaestro(themeConfig);
  if (typeof aplicarTemaAtual === 'function') aplicarTemaAtual();
  initPWA();
  return true;
}

function obterViewAtivaMaestro() {
  return Array.from(document.querySelectorAll('.view-section')).find(section => {
    const style = window.getComputedStyle(section);
    return section.classList.contains('active-view') &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      section.offsetParent !== null;
  });
}

function garantirViewInicialMaestro() {
  const ativa = obterViewAtivaMaestro();

  if (!ativa && typeof switchView === "function") {
    switchView("view-hub");
    return true;
  }

  return !!ativa;
}

function obterPerfilAtualMaestro() {
  const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
  if (nav && typeof nav.getCurrentProfile === "function") {
    return String(nav.getCurrentProfile() || "ANONIMO").toUpperCase();
  }

  const nivelOperador = localStorage.getItem("MAESTRO_OPERADOR_NIVEL");
  const tokenOperador = localStorage.getItem("MAESTRO_TOKEN");
  if (tokenOperador && nivelOperador) return String(nivelOperador).toUpperCase();

  const tokenEstudante = localStorage.getItem("MAESTRO_EST_TOKEN");
  return tokenEstudante ? "ESTUDANTE" : "ANONIMO";
}

function obterContextoAdminVisualMaestro() {
  let operador = {};
  let semestre = {};

  try {
    operador = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.operator
      ? window.MaestroData.contexts.operator.get()
      : {};
  } catch (error) {
    operador = {};
  }

  try {
    semestre = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester
      ? window.MaestroData.contexts.semester.get()
      : {};
  } catch (error) {
    semestre = {};
  }

  const perfil = String(
    operador.nivel ||
    operador.perfil ||
    localStorage.getItem("MAESTRO_OPERADOR_NIVEL") ||
    obterPerfilAtualMaestro() ||
    "ANONIMO"
  ).toUpperCase();

  return {
    perfil: perfil,
    nome: operador.nome || localStorage.getItem("MAESTRO_OPERADOR_NOME") || "",
    email: operador.email || localStorage.getItem("MAESTRO_OPERADOR_EMAIL") || "",
    semestreId: semestre.semestreId || semestre.semestreAtual || "",
    semestreLabel: semestre.label || semestre.nome || semestre.semestreId || semestre.semestreAtual || ""
  };
}

function atualizarContextoAdminVisualMaestro() {
  const contexto = obterContextoAdminVisualMaestro();
  const profileChip = document.getElementById("admin-hub-profile-chip");
  const semesterChip = document.getElementById("admin-hub-semester-chip");

  if (profileChip) {
    const nome = contexto.nome ? " - " + contexto.nome : "";
    profileChip.textContent = "Perfil: " + contexto.perfil + nome;
  }

  if (semesterChip) {
    const semestreTexto = contexto.semestreLabel || contexto.semestreId || "nao definido";
    semesterChip.textContent = "Semestre: " + semestreTexto;
    semesterChip.classList.toggle("admin-context-chip-warning", !contexto.semestreId && !contexto.semestreLabel);
  }

  return contexto;
}

if (typeof window !== "undefined") {
  window.atualizarContextoAdminVisualMaestro = atualizarContextoAdminVisualMaestro;
}

function resolverShellResponsivoMaestro(viewId, perfil) {
  const view = String(viewId || "");
  const profile = String(perfil || "ANONIMO").toUpperCase();
  const adminViews = ["view-admin-hub", "view-auditoria", "view-dashboard", "view-semestres", "view-moderador", "view-notificacoes"];
  const studentViews = ["view-aluno-menu", "view-inscricao", "view-consult", "view-resgate", "view-login", "view-wallet", "view-nova-senha"];

  if (view === "view-radar") return "radar";
  if (profile === "MOTORISTA" || view === "view-painel-motorista") return "driver";
  if (profile === "FISCAL" || view === "view-fiscal") return "field";
  if (["MODERADOR", "SUPERVISOR", "OPERADOR"].includes(profile) || adminViews.includes(view)) return "admin";
  if (profile === "ESTUDANTE" || studentViews.includes(view)) return "student";
  return "public";
}

function aplicarShellResponsivoMaestro(viewId) {
  const body = document.body;
  if (!body) return;

  const perfil = obterPerfilAtualMaestro();
  const shell = resolverShellResponsivoMaestro(viewId, perfil);
  const shellElement = document.getElementById("app-shell") || document.querySelector(".app-wrapper");
  const header = document.getElementById("global-header");

  body.setAttribute("data-maestro-profile", perfil.toLowerCase());
  body.setAttribute("data-maestro-view", String(viewId || ""));
  body.setAttribute("data-maestro-shell", shell);

  if (shellElement) {
    shellElement.setAttribute("data-maestro-profile", perfil.toLowerCase());
    shellElement.setAttribute("data-maestro-shell", shell);
  }

  if (header) {
    header.setAttribute("data-maestro-shell", shell);
  }
}

async function bootSystem(options = {}) {
  try {
    const res = await apiCall("getConfiguracoesPWA");

    if (res.sucesso) {
      const themeConfig = sincronizarContextsMaestroDoBoot(res) ||
        (window.MaestroData && window.MaestroData.adapters ? window.MaestroData.adapters.themeConfig(res) : null) ||
        {};
      const brandConfig = themeConfig.brand || {};
      const pwaConfig = themeConfig.pwa || {};
      const colorConfig = themeConfig.colors || {};
      const logoConfig = themeConfig.logos || {};
      const lightColors = colorConfig.light || {};
      const darkColors = colorConfig.dark || {};

      window.PWA_NOME = pwaConfig.name || (res.pwa && res.pwa.NOME) || brandConfig.secretaria || "Portal Maestro";
      window.PWA_ICONE = pwaConfig.icon || (res.pwa && res.pwa.ICONE) || logoConfig.appIcon || "icone.png";

      window.THEME_LIGHT = {
        primary: lightColors.primary || (res.ui && res.ui.COR_PRIMARIA_LIGHT),
        secondary: lightColors.secondary || (res.ui && res.ui.COR_SECUNDARIA_LIGHT),
        accent: lightColors.accent || (res.ui && res.ui.COR_DE_DESTAQUE_LIGHT),
        logo: logoConfig.light || (res.ui && (res.ui.LOGO_URL_LIGHT || res.ui.LOGO_LIGHT))
      };
      window.THEME_DARK = {
        primary: darkColors.primary || (res.ui && res.ui.COR_PRIMARIA_DARK),
        secondary: darkColors.secondary || (res.ui && res.ui.COR_SECUNDARIA_DARK),
        accent: darkColors.accent || (res.ui && res.ui.COR_DE_DESTAQUE_DARK),
        logo: logoConfig.dark || (res.ui && (res.ui.LOGO_URL_DARK || res.ui.LOGO_DARK))
      };
      atualizarManifestDinamicoMaestro(themeConfig);

      if (res.firebase) {
        window.FIREBASE_CONFIG = {
          apiKey: res.firebase.API_KEY,
          authDomain: res.firebase.AUTH_DOMAIN,
          projectId: res.firebase.PROJECT_ID,
          storageBucket: res.firebase.STORAGE_BUCKET,
          messagingSenderId: res.firebase.MESSAGING_SENDER_ID,
          appId: res.firebase.APP_ID
        };
        window.FIREBASE_VAPID_KEY = res.firebase.VAPID_KEY;

        // Inicialização imediata do Firebase — resolve a promessa global
        if (typeof firebase !== 'undefined' && (!firebase.apps || firebase.apps.length === 0)) {
          window.firebaseReady = new Promise((resolve) => {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("info", "Firebase inicializado no bootSystem.");
            resolve();
          });
        } else {
          window.firebaseReady = Promise.resolve();
        }
      }

      document.title = window.PWA_NOME;
      if (typeof aplicarTemaAtual === 'function') aplicarTemaAtual();

      const elNome = document.getElementById('ui-nome-sistema');
      if (elNome) elNome.innerText = window.PWA_NOME.toUpperCase();
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle) appleTitle.setAttribute("content", window.PWA_NOME);
      const appName = document.querySelector('meta[name="application-name"]');
      if (appName) appName.setAttribute("content", window.PWA_NOME);
      const appleIcon = document.getElementById("apple-touch-icon");
      if (appleIcon) appleIcon.setAttribute("href", sanitizarUrlPWAMaestro(window.PWA_ICONE, "icone.png"));
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.setAttribute("href", sanitizarUrlPWAMaestro(window.PWA_ICONE, "icone.png"));

      const elSetor = document.getElementById('ui-nome-setor');
      if (elSetor) elSetor.innerText = brandConfig.setor || (res.ui && res.ui.NOME_SISTEMA) || "";

      // Captura e renderiza o emblema dinâmico (Fallback para LOGO_LIGHT se necessário)
      const urlEmblema = logoConfig.emblem ||
                         (res.pwa && res.pwa.EMBLEMA_PWA) ||
                         (res.ui && res.ui.EMBLEMA_PWA) ||
                         (res.config && res.config.EMBLEMA_PWA) ||
                         logoConfig.light ||
                         (res.ui && (res.ui.LOGO_URL_LIGHT || res.ui.LOGO_LIGHT));
      if (urlEmblema) {
        document.querySelectorAll('img[src*="MGA.png"], .app-emblem, #splash-logo').forEach(img => {
          img.src = urlEmblema;
          img.classList.remove('hidden');
        });
      }

      const contatoConfig = res.contato || {};
      const elEnd = document.getElementById('ui-endereco');
      if (elEnd && (contatoConfig.ENDERECO || themeConfig.contact && themeConfig.contact.endereco)) {
        elEnd.innerText = contatoConfig.ENDERECO || themeConfig.contact.endereco;
        elEnd.classList.remove('hidden');
      }

      const elEmail = document.getElementById('ui-email');
      if (elEmail && (contatoConfig.EMAIL || themeConfig.contact && themeConfig.contact.email)) {
        elEmail.innerText = contatoConfig.EMAIL || themeConfig.contact.email;
        elEmail.classList.remove('hidden');
      }

      const elCnpj = document.getElementById('ui-cnpj');
      if (elCnpj && (contatoConfig.CNPJ || themeConfig.contact && themeConfig.contact.cnpj)) {
        elCnpj.innerText = "CNPJ: " + (contatoConfig.CNPJ || themeConfig.contact.cnpj);
        elCnpj.classList.remove('hidden');
      }

      atualizarIdentidadePublicaMaestro(themeConfig);
      aplicarPoliticaEstagioMaestro();
      atualizarContextoAdminVisualMaestro();

      initPWA();
    } else {
      restaurarPWAOfflineMaestro();
    }
  } catch (e) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "A arrancar em modo offline persistente.");
    else console.warn("A arrancar em modo offline persistente.");
    restaurarPWAOfflineMaestro();
  }

  const lastView = options.forceView || sessionStorage.getItem('MAESTRO_LAST_VIEW') || 'view-hub';
  switchView(lastView);

  carregarAvisosSMEB();
  verificarSessaoAtiva();
  restaurarSessaoEstudante();
  garantirViewInicialMaestro();

  ocultarSplashScreen();
  if (typeof window.atualizarContadorNotificacoes === 'function') window.atualizarContadorNotificacoes();
  aplicarPoliticaEstagioMaestro();
  atualizarContextoAdminVisualMaestro();
  if (
    window.MaestroData &&
    window.MaestroData.storage &&
    window.MaestroData.storage.offlineDB &&
    typeof window.MaestroData.storage.offlineDB.pruneExpired === "function"
  ) {
    window.MaestroData.storage.offlineDB.pruneExpired().catch(() => null);
  }
}

function ocultarSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('is-exiting');
    setTimeout(() => { splash.classList.add('hidden'); }, 500);
  }
}

function solicitarPrecachePWAMaestro() {
  if (!('serviceWorker' in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage({
      type: "PREFETCH_APP_SHELL",
      version: MAESTRO_PWA_VERSION,
      storageSchemaVersion: window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage.schemaVersion : ""
    });
  }
}

function tratarMensagemServiceWorkerMaestro(event) {
  const data = event && event.data ? event.data : {};
  if (data.source !== "maestro-sw") return;

  if (data.type === "MAESTRO_SW_ACTIVATED" || data.type === "MAESTRO_SW_VERSION") {
    try {
      localStorage.setItem("MAESTRO_ACTIVE_SW_VERSION", data.version || "");
      localStorage.setItem("MAESTRO_ACTIVE_SW_CACHE", data.cacheName || "");
    } catch (error) { }
  }

  if (data.type === "MAESTRO_CACHES_CLEARED") {
    try {
      if (window.MaestroData && window.MaestroData.storage) {
        ["dashboard", "lists", "audit", "communication", "mobility"].forEach(domain => {
          window.MaestroData.storage.invalidateDomain(domain);
        });
      }
    } catch (error) { }
  }
}

function sincronizarServiceWorkerMaestro(registration) {
  if (!registration) return;

  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (registration.active) {
    registration.active.postMessage({
      type: "PREFETCH_APP_SHELL",
      version: MAESTRO_PWA_VERSION
    });
    registration.active.postMessage({ type: "PING_VERSION" });
  }

  registration.addEventListener('updatefound', () => {
    const novoWorker = registration.installing;
    if (!novoWorker) return;
    novoWorker.addEventListener('statechange', () => {
      if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
        novoWorker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });
}

function initPWA() {
  if (!window.PWA_NOME) return;

  if ('serviceWorker' in navigator) {
    if (!window.__maestroSwMessageListenerStarted) {
      window.__maestroSwMessageListenerStarted = true;
      navigator.serviceWorker.addEventListener("message", tratarMensagemServiceWorkerMaestro);
    }

    const versionParam = `v=${encodeURIComponent(MAESTRO_PWA_VERSION)}`;
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      const swUrl = `./sw.js?${versionParam}&apiKey=${encodeURIComponent(window.FIREBASE_CONFIG.apiKey)}&projectId=${encodeURIComponent(window.FIREBASE_CONFIG.projectId || "")}&senderId=${encodeURIComponent(window.FIREBASE_CONFIG.messagingSenderId || "")}&appId=${encodeURIComponent(window.FIREBASE_CONFIG.appId || "")}`;

      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          sincronizarServiceWorkerMaestro(registration);
          if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("info", "SW registado com chaves dinamicas.", { scope: registration.scope });
        })
        .catch(err => {
          if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Falha ao registar SW.", err);
          else console.warn("Falha ao registar SW.");
        });

    } else {
      navigator.serviceWorker.register(`./sw.js?${versionParam}`)
        .then((registration) => {
          sincronizarServiceWorkerMaestro(registration);
          if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("info", "SW registado em modo apenas-offline.");
        });
    }
  }
}

function instalarPWA() {
  if (!deferredPrompt) {
    showToast("Não é possível instalar neste dispositivo ou já está instalado.", "info");
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('hidden');
      showToast("App instalada! Procure o ícone no seu ecrã principal.", "success");
    }
    deferredPrompt = null;
  });
}

// ... (Código do Bootstrap e PWA mantido) ...

function resolverViewPorPerfilMaestro(viewId) {
  const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
  if (!nav || typeof nav.resolveViewAccess !== "function") {
    const viewsOperador = [
      'view-admin-hub', 'view-dashboard', 'view-auditoria', 'view-moderador',
      'view-fiscal', 'view-notificacoes', 'view-painel-motorista'
    ];

    if (viewsOperador.indexOf(viewId) !== -1 && typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) {
      sessionStorage.setItem('MAESTRO_LAST_VIEW', 'view-hub');
      return 'view-hub';
    }
    return viewId;
  }

  const decision = nav.resolveViewAccess(viewId);
  if (decision.allowed) return viewId;

  const fallback = decision.fallback || 'view-hub';
  sessionStorage.setItem('MAESTRO_LAST_VIEW', fallback);
  if (viewId !== fallback && typeof showToast === 'function') {
    showToast("Seu perfil nao possui acesso a esta area.", "warning");
  }
  return fallback;
}

function switchView(viewId) {
  // Salvaguarda de hardware: qualquer troca de tela encerra a câmera da inscrição.
  if (typeof finalizarInscricaoLimparHardware === 'function') {
    finalizarInscricaoLimparHardware();
  }

  closeAllSidebars();

  viewId = resolverViewPorPerfilMaestro(viewId);

  const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
  if (nav && typeof nav.applyVisibility === "function") {
    nav.applyVisibility();
  }

  let target = document.getElementById(viewId);
  if (!target) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "View nao encontrada. Redirecionando para view-gateway.", { viewId: viewId });
    else console.warn("View nao encontrada. Redirecionando para view-gateway.");
    viewId = 'view-gateway';
    target = document.getElementById(viewId);
  }

  const views = document.querySelectorAll('.view-section');
  views.forEach(v => {
    v.classList.remove('active-view');
    v.classList.remove('slide-in-right');
    v.setAttribute('aria-hidden', 'true');
  });

  if (target) {
    target.setAttribute('aria-hidden', 'false');
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    window.requestAnimationFrame(() => {
      target.classList.add('active-view');
      target.classList.add('slide-in-right');
      try { target.focus({ preventScroll: true }); } catch (error) { }
    });
    sessionStorage.setItem('MAESTRO_LAST_VIEW', viewId);
  }

  aplicarAcessibilidadeBaseMaestro(target || document);
  aplicarShellResponsivoMaestro(viewId);
  atualizarContextoAdminVisualMaestro();

  window.scrollTo(0, 0);

  // CONTROLO DO BOTÃO DE CONFIGURAÇÕES (ENGRENAGEM) ULTRA-RESILIENTE
  const btnConfig = document.getElementById('btn-config');
  if (btnConfig) {
    // Força a remoção de qualquer classe 'hidden' que possa ter ficado presa no HTML
    btnConfig.classList.remove('hidden');

    // Se for ecrã de município ou login, oculta. Se não, força a exibição absoluta!
    if (viewId === 'view-gateway' || viewId === 'view-login-fiscal' || viewId === 'view-login') {
      btnConfig.classList.add('view-action-hidden');
    } else {
      btnConfig.classList.remove('view-action-hidden');
    }
  }

  // Mural de Avisos (Visibilidade Inteligente)
  const mural = document.getElementById('mural-avisos');
  const muralHeader = document.getElementById('mural-avisos-header');

  if (mural && mural.innerHTML.trim() !== '') {
    if (viewId === 'view-hub' || viewId === 'view-admin-hub' || viewId === 'view-aluno-menu' || viewId === 'view-painel-motorista') {
      mural.classList.remove('hidden');
      if (muralHeader) muralHeader.classList.remove('hidden');
    } else {
      mural.classList.add('hidden');
      if (muralHeader) muralHeader.classList.add('hidden');
    }
  }
}

function aplicarAcessibilidadeBaseMaestro(root) {
  const scope = root && root.querySelectorAll ? root : document;

  const toast = document.getElementById('toast');
  if (toast) {
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
  }

  [
    'mural-avisos',
    'mural-feed',
    'auditoria-fila-container',
    'semestres-lista-container',
    'dashboard-async-state',
    'wallet-container',
    'res-estudante',
    'cpf-feedback-box'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  });

  document.querySelectorAll('button[title]:not([aria-label])').forEach(button => {
    button.setAttribute('aria-label', button.getAttribute('title'));
  });

  const headerLabels = {
    'btn-header-config': 'Abrir configuracoes',
    'btn-header-back': 'Voltar para a tela anterior',
    'btn-config': 'Abrir configuracoes'
  };
  Object.keys(headerLabels).forEach(id => {
    const button = document.getElementById(id);
    if (button && !button.hasAttribute('aria-label')) button.setAttribute('aria-label', headerLabels[id]);
  });

  scope.querySelectorAll('label.input-label:not([for])').forEach(label => {
    let control = null;
    const parent = label.parentElement;
    if (parent) control = parent.querySelector('input[id], select[id], textarea[id]');
    if (!control) {
      let next = label.nextElementSibling;
      while (next && !control) {
        if (next.matches && next.matches('input[id], select[id], textarea[id]')) control = next;
        else if (next.querySelector) control = next.querySelector('input[id], select[id], textarea[id]');
        next = next.nextElementSibling;
      }
    }
    if (control && control.id) label.setAttribute('for', control.id);
  });

  scope.querySelectorAll('input[id]:not([aria-label]), select[id]:not([aria-label]), textarea[id]:not([aria-label])').forEach(control => {
    const label = document.querySelector(`label[for="${control.id}"]`);
    if (!label && control.placeholder) control.setAttribute('aria-label', control.placeholder);
  });

  const stepper = document.getElementById('stepper-progress');
  if (stepper) {
    stepper.setAttribute('role', 'list');
    stepper.setAttribute('aria-label', 'Progresso da inscricao');
    stepper.querySelectorAll('.step-dot').forEach((dot, index) => {
      dot.setAttribute('role', 'listitem');
      dot.setAttribute('aria-label', `Etapa ${index + 1}`);
    });
  }
}

function renderizarAvisosAtivosMaestro(avisosNormalizados, opcoes) {
  const container = document.getElementById('mural-avisos');
  const header = document.getElementById('mural-avisos-header');
  const avisos = (avisosNormalizados && avisosNormalizados.avisos) || [];

  if (!avisos.length) {
    if (container) container.classList.add('hidden');
    if (header) header.classList.add('hidden');
    return false;
  }

  let html = '';
  avisos.forEach(function (aviso) {
    let classeTipo = 'aviso-geral';
    const tipoNormalizado = String(aviso.tipo || "").toLowerCase().trim();
    const tipoSeguro = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(aviso.tipo) : String(aviso.tipo || "");
    const tituloSeguro = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(aviso.titulo) : String(aviso.titulo || "");
    const assuntoSeguro = typeof safeLinesMaestro === 'function' ? safeLinesMaestro(aviso.assunto) : String(aviso.assunto || "");
    const imagemSegura = typeof safeUrlAttrMaestro === 'function' ? safeUrlAttrMaestro(aviso.imagem) : String(aviso.imagem || "");
    const anexoSeguro = typeof safeUrlAttrMaestro === 'function' ? safeUrlAttrMaestro(aviso.anexo) : String(aviso.anexo || "");
    if (tipoNormalizado === 'urgente') classeTipo = 'aviso-urgente';
    if (tipoNormalizado === 'transporte') classeTipo = 'aviso-transporte';

    html += `<div class="aviso-card ${classeTipo}">`;
    if (imagemSegura) html += `<img src="${imagemSegura}" class="aviso-imagem" alt="Aviso">`;
    html += `<span class="aviso-tag">${tipoSeguro}</span>`;
    html += `<h4 class="aviso-titulo">${tituloSeguro}</h4>`;
    if (assuntoSeguro) html += `<p class="aviso-texto">${assuntoSeguro}</p>`;
    if (anexoSeguro) html += `<a href="${anexoSeguro}" target="_blank" rel="noopener noreferrer" class="aviso-btn-anexo">Documento</a>`;
    html += `</div>`;
  });

  if (opcoes && opcoes.cache === true && typeof renderAsyncStateMaestro === "function") {
    html += renderAsyncStateMaestro(opcoes.expired ? "offline" : "stale", {
      message: opcoes.expired ? "Avisos exibidos do cache local." : "Avisos atualizados em segundo plano.",
      className: "avisos-cache-state"
    });
  }

  if (container) {
    container.innerHTML = html;
    container.classList.remove('hidden');
  }
  if (header) header.classList.remove('hidden');
  return true;
}

function obterCacheAvisosAtivosMaestro(permitirExpirado) {
  const storage = window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;
  if (!storage || typeof storage.getDomainCache !== "function") return null;
  const cache = storage.getDomainCache("communication", {
    key: "MAESTRO_COMMUNICATION_CACHE_AVISOS",
    allowExpired: permitirExpirado === true
  });
  return cache && cache.hit && cache.data ? cache : null;
}

function salvarCacheAvisosAtivosMaestro(avisosNormalizados) {
  const storage = window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;
  if (!storage || typeof storage.setDomainCache !== "function") return;
  const ttlMs = typeof storage.getDomainTtlMs === "function"
    ? storage.getDomainTtlMs("communication")
    : 1000 * 60 * 10;
  storage.setDomainCache("communication", avisosNormalizados, {
    key: "MAESTRO_COMMUNICATION_CACHE_AVISOS",
    source: "getAvisosAtivos",
    ttlMs: ttlMs
  });
}

async function carregarAvisosSMEB() {
  const cacheInicial = obterCacheAvisosAtivosMaestro(typeof navigator !== "undefined" && navigator.onLine === false);
  if (cacheInicial) {
    renderizarAvisosAtivosMaestro(cacheInicial.data, { cache: cacheInicial.stale || cacheInicial.expired, expired: cacheInicial.expired });
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  }

  try {
    const res = await apiCall("getAvisosAtivos");
    const container = document.getElementById('mural-avisos');
    const header = document.getElementById('mural-avisos-header');
    const adapterAvisos = window.MaestroData &&
      window.MaestroData.adapters &&
      typeof window.MaestroData.adapters.avisosAtivos === "function"
      ? window.MaestroData.adapters.avisosAtivos
      : null;
    const avisosNormalizados = adapterAvisos
      ? adapterAvisos(res)
      : { avisos: (res && Array.isArray(res.avisos)) ? res.avisos : [] };
    const avisos = avisosNormalizados.avisos || [];
    salvarCacheAvisosAtivosMaestro(avisosNormalizados);

    if (!avisos.length) {
      if (container) container.classList.add('hidden');
      if (header) header.classList.add('hidden');
      return;
    }

    let html = '';
    avisos.forEach(function (aviso) {
      let classeTipo = 'aviso-geral';
      const tipoNormalizado = String(aviso.tipo || "").toLowerCase().trim();
      const tipoSeguro = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(aviso.tipo) : String(aviso.tipo || "");
      const tituloSeguro = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(aviso.titulo) : String(aviso.titulo || "");
      const assuntoSeguro = typeof safeLinesMaestro === 'function' ? safeLinesMaestro(aviso.assunto) : String(aviso.assunto || "");
      const imagemSegura = typeof safeUrlAttrMaestro === 'function' ? safeUrlAttrMaestro(aviso.imagem) : String(aviso.imagem || "");
      const anexoSeguro = typeof safeUrlAttrMaestro === 'function' ? safeUrlAttrMaestro(aviso.anexo) : String(aviso.anexo || "");
      if (tipoNormalizado === 'urgente') classeTipo = 'aviso-urgente';
      if (tipoNormalizado === 'transporte') classeTipo = 'aviso-transporte';

      html += `<div class="aviso-card ${classeTipo}">`;
      if (imagemSegura) html += `<img src="${imagemSegura}" class="aviso-imagem" alt="Aviso">`;
      html += `<span class="aviso-tag">${tipoSeguro}</span>`;
      html += `<h4 class="aviso-titulo">${tituloSeguro}</h4>`;
      if (assuntoSeguro) html += `<p class="aviso-texto">${assuntoSeguro}</p>`;
      if (anexoSeguro) html += `<a href="${anexoSeguro}" target="_blank" rel="noopener noreferrer" class="aviso-btn-anexo">📄 Baixar Documento</a>`;
      html += `</div>`;
    });

    if (container) {
      container.innerHTML = html;
      container.classList.remove('hidden');
    }
    if (header) header.classList.remove('hidden');
  } catch (e) {
    const cacheFallback = obterCacheAvisosAtivosMaestro(true);
    if (cacheFallback) renderizarAvisosAtivosMaestro(cacheFallback.data, { cache: true, expired: true });
  }
}

// ========================================================================
// 12. UTILITÁRIOS GLOBAIS
// ========================================================================

let toastTimeout;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const tiposToast = ['toast-success', 'toast-error', 'toast-warning', 'toast-loading', 'toast-info'];
  const tipoSeguro = ['success', 'error', 'warning', 'loading', 'info'].includes(type) ? type : 'info';

  toast.innerText = typeof safeMessageMaestro === 'function' ? safeMessageMaestro(msg, "") : msg;
  toast.classList.remove(...tiposToast);
  toast.classList.add(`toast-${tipoSeguro}`, 'is-visible');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.classList.remove('is-visible'); }, 3500);
}

async function inicializarPushNotifications() {
  const desligarTogglePush = (mensagem) => {
    localStorage.setItem('MAESTRO_PREF_PUSH', 'false');
    const togglePush = document.getElementById('pref-push');
    if (togglePush) togglePush.checked = false;
    if (mensagem) showToast(mensagem, "error");
  };

  if (localStorage.getItem('MAESTRO_PREF_PUSH') === 'false') return;

  if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Chaves do Firebase nao configuradas na planilha.");
    else console.warn("Chaves do Firebase nao configuradas na planilha.");
    desligarTogglePush("Chaves do Firebase ausentes no sistema.");
    return;
  }

  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
  } catch (e) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Firebase Init falhou.", e);
    else console.warn("Firebase Init falhou.");
    desligarTogglePush("Erro ao iniciar Firebase. Verifique as chaves.");
    return;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof firebase === 'undefined') {
    desligarTogglePush("Notificações não suportadas neste navegador.");
    return;
  }

  try {
    const messaging = firebase.messaging();
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // Guarda de idempotência — evita erro 'use-sw-after-get-token' em SPA
      if (!window.isSwInjected) {
        const swRegistration = await navigator.serviceWorker.ready;
        messaging.useServiceWorker(swRegistration);
        window.isSwInjected = true;
      }

      messaging.onMessage((payload) => {
        const notificationObj = payload.notification || payload.data || {};
        const titulo = notificationObj.title || "Novo Aviso";
        const corpo = notificationObj.body || "Você tem uma nova mensagem.";
        showToast(`🔔 ${titulo}: ${corpo}`, "info");
      });

      const opcoesToken = window.FIREBASE_VAPID_KEY ? { vapidKey: window.FIREBASE_VAPID_KEY } : {};
      const token = await messaging.getToken(opcoesToken);

      if (token) {
        localStorage.setItem("MAESTRO_FCM_TOKEN_TEMP", token);
        localStorage.setItem('MAESTRO_PUSH_ATIVO', 'true');
        if (typeof currentWalletId !== 'undefined' && currentWalletId !== "") {
          if (typeof registrarTokenPush === 'function') await registrarTokenPush(token);
        }
        showToast("Notificações ativadas com sucesso!", "success");
      }
    } else {
      desligarTogglePush("Permissão negada no navegador.");
    }
  } catch (error) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Falha de Push.", error);
    else console.warn("Falha de Push.");
    desligarTogglePush("Falha ao gerar Token. Verifique as configurações do Firebase.");
  }
}

async function registrarTokenPush(token) {
  // Extrai o CPF real do cache offline (corrige o bug de identidade fantasma)
  const walletCacheSync = JSON.parse(localStorage.getItem("MAESTRO_OFFLINE_WALLET") || localStorage.getItem("MAESTRO_WALLET_CACHE") || "{}");
  const cpfParaSync = walletCacheSync.cpf || walletCacheSync.cpfAluno;
  const builderPushToken = window.MaestroData &&
    window.MaestroData.payloadBuilders &&
    typeof window.MaestroData.payloadBuilders.pushToken === "function"
    ? window.MaestroData.payloadBuilders.pushToken
    : null;

  if (!cpfParaSync) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "registrarTokenPush: identidade ausente no cache; registo abortado.");
    else console.warn("registrarTokenPush: identidade ausente no cache; registo abortado.");
    return;
  }

  try {
    const payloadPush = builderPushToken ? builderPushToken({
      idEstudante: cpfParaSync,
      pushToken: token,
      tokenDispositivo: token
    }) : {
      idEstudante: cpfParaSync,
      pushToken: token,
      tokenDispositivo: token
    };
    const res = await apiCall("registrarPushToken", payloadPush);

    if (res.sucesso) {
      localStorage.setItem("MAESTRO_FCM_TOKEN", token);
      localStorage.setItem("FCM_SYNCED_ID", cpfParaSync);
    }
  } catch (err) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao registrar token.", err);
    else console.error("Erro ao registrar token.");
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('MAESTRO_DARK_MODE', isDark ? 'true' : 'false');
  if (typeof aplicarTemaAtual === 'function') aplicarTemaAtual();
}

function safeCssThemeValueMaestro(value, fallback) {
  const text = String(value || fallback || "").trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(text)) return text;
  if (/^rgba?\([\d\s.,%]+\)$/.test(text)) return text;
  if (/^var\(--[A-Za-z0-9_-]+\)$/.test(text)) return text;
  return fallback;
}

function aplicarTemaLegacyCssMaestro(theme) {
  if (!theme || !document.head) return;
  let styleEl = document.getElementById('maestro-legacy-theme-vars');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'maestro-legacy-theme-vars';
    styleEl.setAttribute('data-owner', 'MaestroThemeLegacy');
    document.head.appendChild(styleEl);
  }

  const primary = safeCssThemeValueMaestro(theme.primary, '#0A3D6B');
  const secondary = safeCssThemeValueMaestro(theme.secondary, '#F8F9FA');
  const accent = safeCssThemeValueMaestro(theme.accent, '#0D9488');
  styleEl.textContent = `:root, body {
--primary: ${primary};
--secondary: ${secondary};
--accent: ${accent};
--font-main: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}`;
}

function aplicarTemaAtual() {
  const isDark = document.body.classList.contains('dark-theme');
  const legacyTheme = window.THEME_LIGHT && window.THEME_DARK
    ? (isDark ? window.THEME_DARK : window.THEME_LIGHT)
    : null;
  let theme = legacyTheme;
  let tokens = null;

  if (window.MaestroTheme && typeof window.MaestroTheme.apply === "function") {
    const storedTheme = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.theme
      ? window.MaestroData.contexts.theme.get()
      : {};
    tokens = window.MaestroTheme.apply(storedTheme, { dark: isDark });
    if (tokens && tokens.active) theme = tokens.active;
  }

  if (!theme) return;

  if (!tokens) aplicarTemaLegacyCssMaestro(theme);
  document.documentElement.setAttribute("data-maestro-theme", isDark ? "dark" : "light");
  document.body.setAttribute("data-maestro-theme", isDark ? "dark" : "light");

  window.THEME_COLOR = theme.primary;
  window.BG_COLOR = theme.secondary;

  const metaThemeColor = document.getElementById('meta-theme-color');
  if (metaThemeColor) metaThemeColor.content = theme.primary;

  const logoAtual = (tokens && tokens.assets && tokens.assets.logo) || (legacyTheme && legacyTheme.logo);
  const logoEl = document.getElementById('ui-logo');
  const splashLogo = document.getElementById('splash-logo');
  const gatewayLogo = document.getElementById('ui-gateway-logo');
  const sistemaNome = window.PWA_NOME || "SYSTEM MAESTRO";

  const configurarFallbackLogo = (imgEl, fallbackSrc, placeholderText) => {
    if (!imgEl) return;

    // Remove placeholder anterior se houver para evitar duplicatas
    const existingPlaceholder = imgEl.parentNode.querySelector('.logo-placeholder');
    if (existingPlaceholder) {
      existingPlaceholder.remove();
    }

    imgEl.classList.remove('hidden');

    imgEl.onerror = () => {
      const currentSrc = imgEl.src;
      const isAbsoluteFallback = currentSrc.endsWith(fallbackSrc) || currentSrc.includes('/' + fallbackSrc);
      if (!isAbsoluteFallback) {
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "[LogoFallback] Falha ao carregar logotipo remoto.", { fallbackSrc: fallbackSrc });
        else console.warn("[LogoFallback] Falha ao carregar logotipo remoto.");
        imgEl.src = fallbackSrc;
      } else {
        if (typeof logMaestroSafe === "function") logMaestroSafe("error", "[LogoFallback] Falha ao carregar fallback local de logotipo.", { fallbackSrc: fallbackSrc });
        else console.error("[LogoFallback] Falha ao carregar fallback local de logotipo.");
        imgEl.classList.add('hidden');

        let placeholder = imgEl.parentNode.querySelector('.logo-placeholder');
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'logo-placeholder';
          imgEl.parentNode.insertBefore(placeholder, imgEl.nextSibling);
        }
        placeholder.textContent = placeholderText;
      }
    };
  };

  if (logoAtual && logoAtual !== "") {
    if (logoEl) {
      configurarFallbackLogo(logoEl, "MGA.png", sistemaNome);
      logoEl.src = logoAtual;
    }
    if (splashLogo) {
      configurarFallbackLogo(splashLogo, "icone.png", sistemaNome);
      splashLogo.src = logoAtual;
    }
    if (gatewayLogo) {
      configurarFallbackLogo(gatewayLogo, "MGA.png", sistemaNome);
      gatewayLogo.src = logoAtual;
    }
  } else {
    if (logoEl) {
      configurarFallbackLogo(logoEl, "MGA.png", sistemaNome);
      logoEl.src = "MGA.png";
    }
    if (splashLogo) {
      configurarFallbackLogo(splashLogo, "icone.png", sistemaNome);
      splashLogo.src = "icone.png";
    }
    if (gatewayLogo) {
      configurarFallbackLogo(gatewayLogo, "MGA.png", sistemaNome);
      gatewayLogo.src = "MGA.png";
    }
  }
}

window.onload = async function () {
  if (localStorage.getItem('MAESTRO_DARK_MODE') === 'true') {
    document.body.classList.add('dark-theme');
  }

  if (typeof checkClientGateway === 'function') await checkClientGateway();

  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');
  const authParam = urlParams.get('auth');
  const validarParam = urlParams.get('validar');
  const resetInterceptado = interceptarMagicLinkRecuperacao(urlParams);

  if (resetInterceptado) {
    return;
  }

  if (validarParam) {
    setTimeout(() => {
      switchView('view-validador');
      const inputHash = document.getElementById('input-hash-validador');
      if (inputHash) inputHash.value = validarParam.toUpperCase();
      if (typeof verificarHashPublico === 'function') verificarHashPublico();
    }, 800);
  } else if (idParam || authParam === 'login') {
    setTimeout(() => {
      switchView('view-login');
      const loginId = document.getElementById('login-id');
      if (loginId && idParam) loginId.value = idParam;
    }, 500);
  }
};

// ========================================================================
// MENU DE CONFIGURAÇÕES E SIDEBARS (DUAL SIDEBAR V11)
// ========================================================================

function toggleSidebar(side) {
  const overlay = document.getElementById('ui-overlay');
  const sidebarLeft = document.getElementById('sidebar-left');
  const sidebarRight = document.getElementById('sidebar-right');

  if (!overlay || !sidebarLeft || !sidebarRight) return;

  // Se já está aberto esse lado, fecha tudo
  if (side === 'left' && sidebarLeft.classList.contains('active')) {
    closeAllSidebars();
    return;
  }
  if (side === 'right' && sidebarRight.classList.contains('active')) {
    closeAllSidebars();
    return;
  }

  // Fecha todos primeiro
  sidebarLeft.classList.remove('active');
  sidebarRight.classList.remove('active');

  // Abre o desejado
  if (side === 'left') {
    sidebarLeft.classList.add('active');
    
    // Atualiza os toggles de configurações
    document.getElementById('pref-dark').checked = document.body.classList.contains('dark-theme');
    // Sincroniza o toggle Push com o estado persistido E a permissão real do navegador
    const pushPersistido = localStorage.getItem('MAESTRO_PUSH_ATIVO') === 'true';
    const pushPermitido = ('Notification' in window) && (Notification.permission === 'granted');
    const chkPush = document.getElementById('pref-push');
    if (chkPush) {
      if (pushPersistido && pushPermitido) {
        chkPush.checked = true;
      } else {
        chkPush.checked = false;
        // Autocorreção: limpa estado desincronizado
        if (!pushPermitido) localStorage.removeItem('MAESTRO_PUSH_ATIVO');
      }
    }
    document.getElementById('pref-gps').checked = localStorage.getItem('MAESTRO_PREF_GPS') === 'true';
    document.getElementById('pref-camera').checked = localStorage.getItem('MAESTRO_PREF_CAMERA') === 'true';
    document.getElementById('pref-offline').checked = localStorage.getItem('MAESTRO_PREF_OFFLINE') === 'true';
  } else if (side === 'right') {
    sidebarRight.classList.add('active');
    if (typeof abrirInbox === 'function') {
      abrirInbox();
    }
  }

  overlay.classList.add('active');
}

function closeAllSidebars() {
  const overlay = document.getElementById('ui-overlay');
  const sidebarLeft = document.getElementById('sidebar-left');
  const sidebarRight = document.getElementById('sidebar-right');

  if (sidebarLeft) sidebarLeft.classList.remove('active');
  if (sidebarRight) sidebarRight.classList.remove('active');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

async function togglePref(tipo, elemento) {
  const isLigado = elemento.checked;

  if (tipo === 'push') {
    if (isLigado) {
      const tokenAdmin = localStorage.getItem('MAESTRO_TOKEN');
      const tokenEstudante = localStorage.getItem('MAESTRO_EST_TOKEN');

      // Condição C: nenhum token — redireciona para identificação
      if (!tokenAdmin && !tokenEstudante) {
        elemento.checked = false;
        closeAllSidebars();
        showToast("Para ativar notificações, identifique-se com o seu CPF primeiro.", "warning");
        switchView('view-consult');
        return;
      }

      // Condição A: estudante logado na Wallet — regista via CPF sem redirecionar
      if (tokenEstudante && typeof currentWalletId !== 'undefined' && currentWalletId) {
        // Extrai o CPF real do cache offline (nunca enviar o ID da carteira como CPF)
        const walletCache = JSON.parse(localStorage.getItem("MAESTRO_OFFLINE_WALLET") || localStorage.getItem("MAESTRO_WALLET_CACHE") || "{}");
        const studentCpf = walletCache.cpf || walletCache.cpfAluno;

        if (!studentCpf) {
          showToast("Erro: CPF não encontrado na sessão. Faça login novamente.", "error");
          elemento.checked = false;
          return;
        }

        localStorage.setItem('MAESTRO_PREF_PUSH', 'true');
        showToast("A pedir permissão...", "loading");
        solicitarConsentimentoPushAnonimo(studentCpf);
        return;
      }

      // Condição B: operador/admin — fluxo normal
      localStorage.setItem('MAESTRO_PREF_PUSH', 'true');
      showToast("A pedir permissão...", "loading");
      if (typeof inicializarPushNotifications === 'function') inicializarPushNotifications();
    } else {
      localStorage.setItem('MAESTRO_PREF_PUSH', 'false');
      showToast("Notificações silenciadas.", "info");

      const tokenLocal = localStorage.getItem("MAESTRO_FCM_TOKEN");
      if (tokenLocal && typeof currentWalletId !== 'undefined' && currentWalletId) {
        // Extrai o CPF real para a desativação de push (mesmo padrão da ativação)
        const walletCacheOff = JSON.parse(localStorage.getItem("MAESTRO_OFFLINE_WALLET") || localStorage.getItem("MAESTRO_WALLET_CACHE") || "{}");
        const cpfParaDesativar = walletCacheOff.cpf || walletCacheOff.cpfAluno || "";
        if (cpfParaDesativar) {
          try { await apiCall("registrarPushToken", { idEstudante: cpfParaDesativar, pushToken: "" }); } catch (e) { }
        }
      }
      localStorage.removeItem("MAESTRO_FCM_TOKEN");
      localStorage.removeItem("FCM_SYNCED_ID");
      localStorage.removeItem('MAESTRO_PUSH_ATIVO');
    }
  }
  else if (tipo === 'gps') {
    localStorage.setItem('MAESTRO_PREF_GPS', isLigado ? 'true' : 'false');
    if (!isLigado && typeof abdicarSerGuia === 'function') abdicarSerGuia();
    showToast(isLigado ? "GPS permitido na viagem." : "Partilha de GPS bloqueada.", "info");
  }
  else if (tipo === 'camera') {
    localStorage.setItem('MAESTRO_PREF_CAMERA', isLigado ? 'true' : 'false');
    showToast(isLigado ? "Acesso à câmara ativo." : "Câmera desativada (Usará upload).", "info");
  }
  else if (tipo === 'offline') {
    localStorage.setItem('MAESTRO_PREF_OFFLINE', isLigado ? 'true' : 'false');
    showToast(isLigado ? "Modo Offline Forçado ativo." : "Modo Online restaurado.", "warning");
    if (isLigado) solicitarPrecachePWAMaestro();
    if (isLigado && typeof abrirTelaCofreOuEntrarDireto === 'function') {
      closeAllSidebars();
      abrirTelaCofreOuEntrarDireto();
    }
  }
}

function navegarPeloMenu(viewId) {
  closeAllSidebars();
  setTimeout(() => {
    switchView(viewId);
  }, 300);
}

/**
 * ============================================================================
 * MÓDULO LOGÍSTICA: NÓ MESTRE (MOTORISTA) - PWA ONLY (Wake Lock)
 * ============================================================================
 */

let watchIdMotorista = null;
let wakeLockMotorista = null;
let ultimaTransmissaoMestre = 0;

async function btnIniciarRotaMotorista(idOnibus) {
  if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

  const emailMotorista = localStorage.getItem("MAESTRO_OPERADOR_EMAIL") || "motorista@desconhecido.com";

  const res = await apiCall("iniciarRotaMotorista", {
    idOnibus: idOnibus,
    usuarioLogadoId: emailMotorista
  });

  if (res.sucesso) {
    showToast("Rota iniciada! Modo Viagem ativado.", "success");
    await ativarModoViagemPWA(idOnibus, emailMotorista);
  } else {
    showToast("Erro ao iniciar rota: " + res.erro, "error");
  }
}

async function btnFinalizarRotaMotorista(idOnibus) {
  if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

  const res = await apiCall("encerrarRotaManual", {
    idOnibus: idOnibus
  });

  if (res.sucesso) {
    showToast("Rota encerrada com sucesso.", "info");
    desativarModoViagemPWA();
  } else {
    showToast("Erro ao finalizar rota: " + res.erro, "error");
  }
}

async function ativarModoViagemPWA(idOnibus, emailMotorista) {
  document.body.classList.add('modo-viagem-ativo');

  try {
    if ('wakeLock' in navigator) {
      wakeLockMotorista = await navigator.wakeLock.request('screen');
      if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("debug", "Wake Lock ativado.");
      document.addEventListener('visibilitychange', lidarComMudancaVisibilidade);
    }
  } catch (err) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Wake Lock nao suportado ou falhou.", err);
    else console.warn("Wake Lock nao suportado ou falhou.");
    showToast("Atenção: O ecrã poderá apagar-se neste dispositivo.", "warning");
  }

  if (navigator.geolocation) {
    watchIdMotorista = navigator.geolocation.watchPosition(
      (pos) => {
        const agora = Date.now();
        if (agora - ultimaTransmissaoMestre > 10000) {
          apiCall("atualizarGPSOnibus", {
            idOnibus: idOnibus,
            usuarioLogadoId: emailMotorista,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          ultimaTransmissaoMestre = agora;

          const indicador = document.getElementById('indicador-gps-mestre');
          if (indicador) indicador.classList.toggle('is-muted');
        }
      },
      (err) => {
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Erro no GPS do Mestre.", err);
        else console.warn("Erro no GPS do Mestre.");
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  } else {
    showToast("Geolocalização não suportada neste navegador.", "error");
  }
}

function desativarModoViagemPWA() {
  document.body.classList.remove('modo-viagem-ativo');

  if (watchIdMotorista !== null) {
    navigator.geolocation.clearWatch(watchIdMotorista);
    watchIdMotorista = null;
  }

  if (wakeLockMotorista !== null) {
    wakeLockMotorista.release().then(() => {
      wakeLockMotorista = null;
      if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("debug", "Wake Lock libertado.");
    });
  }
  document.removeEventListener('visibilitychange', lidarComMudancaVisibilidade);
}

async function lidarComMudancaVisibilidade() {
  if (wakeLockMotorista === null && document.visibilityState === 'visible' && document.body.classList.contains('modo-viagem-ativo')) {
    try {
      wakeLockMotorista = await navigator.wakeLock.request('screen');
      if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("debug", "Wake Lock restaurado.");
    } catch (err) {
      if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Falha ao restaurar Wake Lock.", err);
      else console.warn("Falha ao restaurar Wake Lock.");
    }
  }
}

// ========================================================================
// CAIXA DE NOTIFICAÇÕES PUSH (IndexedDB / Service Worker)
// ========================================================================
(() => {
  const INBOX_DB_NAME = 'MaestroOfflineDB';
  const INBOX_DB_VERSION = 2;
  const INBOX_STORE_NAME = 'notifications';
  const CACHE_STORE_NAME = 'cacheEntries';

  function abrirBancoInbox() {
    if (
      window.MaestroData &&
      window.MaestroData.storage &&
      window.MaestroData.storage.offlineDB &&
      typeof window.MaestroData.storage.offlineDB.open === "function"
    ) {
      return window.MaestroData.storage.offlineDB.open();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INBOX_DB_NAME, INBOX_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(INBOX_STORE_NAME)) {
          db.createObjectStore(INBOX_STORE_NAME, { keyPath: 'timestamp' });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          const cacheStore = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
          cacheStore.createIndex("domain", "domain", { unique: false });
          cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
          cacheStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Banco de notificações bloqueado por outra aba."));
    });
  }

  function executarRequestInbox(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function obterContainersInbox() {
    const containers = new Set();
    const listaPrincipal = document.getElementById('inbox-list');
    if (listaPrincipal) containers.add(listaPrincipal);
    document.querySelectorAll('.inbox-container').forEach(container => containers.add(container));
    return Array.from(containers);
  }

  function escaparHTML(valor) {
    return String(valor || "").replace(/[&<>"']/g, caractere => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[caractere]);
  }

  function formatarDataNotificacao(timestamp) {
    const data = new Date(timestamp);
    if (isNaN(data.getTime())) return "";

    const diaMes = data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
    const horaMinuto = data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${diaMes} às ${horaMinuto}`;
  }

  async function atualizarContadorNotificacoes() {
    try {
      if (!('indexedDB' in window)) return;

      const db = await abrirBancoInbox();
      const transaction = db.transaction(INBOX_STORE_NAME, 'readonly');
      const store = transaction.objectStore(INBOX_STORE_NAME);
      const notificacoes = await executarRequestInbox(store.getAll());
      const totalNaoLidas = notificacoes.filter(item => item.status === 'unread').length;

      document.querySelectorAll('.badge-notificacao').forEach(badge => {
        if (totalNaoLidas > 0) {
          badge.textContent = totalNaoLidas > 99 ? '99+' : String(totalNaoLidas);
          badge.classList.add('is-visible');
          badge.setAttribute('aria-label', `${totalNaoLidas} notificações não lidas`);
          badge.title = `${totalNaoLidas} notificações não lidas`;
        } else {
          badge.textContent = '';
          badge.classList.remove('is-visible');
          badge.removeAttribute('aria-label');
          badge.removeAttribute('title');
        }
      });

      db.close();
    } catch (erro) {
      if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Erro ao atualizar contador de notificacoes.", erro);
      else console.warn("Erro ao atualizar contador de notificacoes.");
    }
  }

  async function abrirInboxIndexedDB() {
    const containers = obterContainersInbox();
    if (containers.length === 0) return;

    containers.forEach(container => {
      container.innerHTML = typeof renderAsyncStateMaestro === "function"
        ? renderAsyncStateMaestro("loading", { message: "A carregar notificacoes locais...", className: "inbox-loading-state" })
        : '<div class="dynamic-state-box dynamic-loading-state inbox-loading-state"><div class="loader loader-center"></div></div>';
    });

    try {
      const db = await abrirBancoInbox();
      const transaction = db.transaction(INBOX_STORE_NAME, 'readonly');
      const store = transaction.objectStore(INBOX_STORE_NAME);
      const notificacoes = await executarRequestInbox(store.getAll());

      notificacoes.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

      if (notificacoes.length === 0) {
        containers.forEach(container => {
          container.innerHTML = typeof renderAsyncStateMaestro === "function"
            ? renderAsyncStateMaestro("empty", { message: "Nenhuma notificacao recente.", className: "inbox-empty-state" })
            : '<div class="inbox-empty-state dynamic-state-box dynamic-empty-state"><p class="inbox-empty-text">Nenhuma notificacao recente.</p></div>';
        });
        db.close();
        await atualizarContadorNotificacoes();
        return;
      }

      const html = notificacoes.map(item => {
        const titulo = escaparHTML(item.title || "Notificação");
        const corpo = escaparHTML(item.body || "");
        const dataFormatada = formatarDataNotificacao(item.timestamp);
        const naoLida = item.status === 'unread';
        const timestampSeguro = escaparHTML(item.timestamp);
        const classeNaoLida = naoLida ? ' is-unread' : '';
        const marcadorNaoLida = naoLida ? '<span class="inbox-unread-dot" title="Nao lida"></span>' : '';
        const botaoMarcarLida = naoLida ? `<button type="button" class="btn-text inbox-mark-read" data-marcar-lida="${timestampSeguro}">Marcar como lida</button>` : '';

        return `
          <div class="form-card inbox-card inbox-card-local dynamic-card dynamic-inbox-card${classeNaoLida}">
            <div class="inbox-header">
              <div class="inbox-title-row">
                ${marcadorNaoLida}
                <strong class="inbox-title">${titulo}</strong>
              </div>
              <span class="inbox-time">${dataFormatada}</span>
            </div>
            <p class="inbox-body">${corpo}</p>
            ${botaoMarcarLida}
          </div>`;
      }).join('');

      containers.forEach(container => {
        container.innerHTML = html;
      });

      document.querySelectorAll('[data-marcar-lida]').forEach(botao => {
        botao.addEventListener('click', () => marcarNotificacaoComoLida(botao.dataset.marcarLida));
      });

      await atualizarContadorNotificacoes();
      db.close();
    } catch (erro) {
      if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao carregar notificacoes locais.", erro);
      else console.error("Erro ao carregar notificacoes locais.");
      containers.forEach(container => {
        container.innerHTML = typeof renderAsyncStateMaestro === "function"
          ? renderAsyncStateMaestro("error", { message: "Erro ao carregar notificacoes locais.", className: "error-box" })
          : '<div class="error-box dynamic-state-box dynamic-error-state">Erro ao carregar notificações locais.</div>';
      });
    }
  }

  async function marcarNotificacaoComoLida(timestamp) {
    try {
      const chaveNumerica = Number(timestamp);
      const chave = Number.isNaN(chaveNumerica) ? timestamp : chaveNumerica;
      const db = await abrirBancoInbox();
      const transaction = db.transaction(INBOX_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(INBOX_STORE_NAME);
      let notificacao = await executarRequestInbox(store.get(chave));

      if (!notificacao && chave !== String(timestamp)) {
        notificacao = await executarRequestInbox(store.get(String(timestamp)));
      }

      if (!notificacao) {
        db.close();
        showToast("Notificação não encontrada.", "error");
        return;
      }

      notificacao.status = 'read';
      await executarRequestInbox(store.put(notificacao));
      db.close();

      await abrirInboxIndexedDB();
      await atualizarContadorNotificacoes();
    } catch (erro) {
      if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao marcar notificacao como lida.", erro);
      else console.error("Erro ao marcar notificacao como lida.");
      showToast("Erro ao atualizar notificação.", "error");
    }
  }

  async function limparInboxIndexedDB() {
    try {
      const db = await abrirBancoInbox();
      const transaction = db.transaction(INBOX_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(INBOX_STORE_NAME);
      await executarRequestInbox(store.clear());
      db.close();

      await abrirInboxIndexedDB();
      await atualizarContadorNotificacoes();
      showToast("Notificações apagadas", "success");
    } catch (erro) {
      if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao apagar notificacoes locais.", erro);
      else console.error("Erro ao apagar notificacoes locais.");
      showToast("Erro ao apagar notificações", "error");
    }
  }

  window.abrirInbox = abrirInboxIndexedDB;
  window.limparInbox = limparInboxIndexedDB;
  window.abrirInboxIndexedDB = abrirInboxIndexedDB;
  window.limparInboxIndexedDB = limparInboxIndexedDB;
  window.atualizarContadorNotificacoes = atualizarContadorNotificacoes;
  window.marcarNotificacaoComoLida = marcarNotificacaoComoLida;

  window.addEventListener('load', () => {
    window.abrirInbox = abrirInboxIndexedDB;
    window.limparInbox = limparInboxIndexedDB;
    window.abrirInboxIndexedDB = abrirInboxIndexedDB;
    window.limparInboxIndexedDB = limparInboxIndexedDB;
    window.atualizarContadorNotificacoes = atualizarContadorNotificacoes;
    window.marcarNotificacaoComoLida = marcarNotificacaoComoLida;
    atualizarContadorNotificacoes();
  });

  window.addEventListener('focus', () => {
    atualizarContadorNotificacoes();
  });
})();

function obterChavesStorageMaestro(storage) {
  const keys = [];
  if (!storage) return keys;
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && (/^MAESTRO_/i.test(key) || /^FCM_/i.test(key))) keys.push(key);
  }
  return keys;
}

function limparStorageMaestroSeletivo() {
  const preservarLocal = {
    MAESTRO_CLIENT_URL: localStorage.getItem("MAESTRO_CLIENT_URL") || "",
    MAESTRO_CLIENT_URL_PREVIOUS: localStorage.getItem("MAESTRO_CLIENT_URL_PREVIOUS") || ""
  };

  obterChavesStorageMaestro(localStorage).forEach(key => {
    try { localStorage.removeItem(key); } catch (error) { }
  });
  obterChavesStorageMaestro(sessionStorage).forEach(key => {
    try { sessionStorage.removeItem(key); } catch (error) { }
  });

  Object.keys(preservarLocal).forEach(key => {
    if (preservarLocal[key]) {
      try { localStorage.setItem(key, preservarLocal[key]); } catch (error) { }
    }
  });
}

async function limparIndexedDBMaestroSeletivo(options = {}) {
  const opts = options || {};
  if (
    window.MaestroData &&
    window.MaestroData.storage &&
    typeof window.MaestroData.storage.clearDomains === "function" &&
    opts.full !== true
  ) {
    await window.MaestroData.storage.clearDomains(opts.domains || ["dashboard", "lists", "audit", "communication", "mobility"], {
      includeLegacy: true,
      includeCustom: true,
      includeSensitive: false,
      includeIndexedDB: true
    });
    return;
  }

  if (
    window.MaestroData &&
    window.MaestroData.storage &&
    window.MaestroData.storage.offlineDB &&
    typeof window.MaestroData.storage.offlineDB.clearStore === "function"
  ) {
    const stores = window.MaestroData.storage.offlineDB.stores || {};
    await Promise.all(Object.keys(stores).map(key => window.MaestroData.storage.offlineDB.clearStore(stores[key]).catch(() => false)));
    return;
  }

  await Promise.all(["MaestroOfflineDB", "MaestroDB"].map(dbName => new Promise(resolve => {
    if (!window.indexedDB) {
      resolve(false);
      return;
    }
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
  })));
}

async function limparCachesMaestroSeletivo() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try { navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL_MAESTRO_CACHES" }); } catch (error) { }
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => /^maestro-/i.test(key) ? caches.delete(key) : Promise.resolve(false)));
  }
}

window.limparStorageMaestroSeletivo = limparStorageMaestroSeletivo;
window.limparIndexedDBMaestroSeletivo = limparIndexedDBMaestroSeletivo;
window.limparCachesMaestroSeletivo = limparCachesMaestroSeletivo;

window.hardResetPWA = async function() {
  const confirmacao = window.confirm("Atenção: Isto irá apagar a sua carteira salva, histórico offline e forçar a atualização do sistema. Precisará de internet para entrar novamente.\n\nDeseja continuar?");
  
  if (!confirmacao) return;

  showToast("A limpar sistema...", "loading");

  try {
    // 1. Limpar dados Maestro preservando a URL do backend configurada.
    limparStorageMaestroSeletivo();

    // 2. Destruir Service Workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) {
        await reg.unregister();
      }
    }

    // 3. Limpar Cache API (Ficheiros Estáticos)
    await limparCachesMaestroSeletivo();

    // 4. Destruir IndexedDB (Notificações Offline)
    await limparIndexedDBMaestroSeletivo({ full: true });

    // 5. Hard Reload
    showToast("Sistema limpo. A reiniciar...", "success");
    setTimeout(() => {
      window.location.href = window.location.pathname; // Reload limpo na raiz
    }, 1500);

  } catch (err) {
    if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao limpar PWA.", err);
    else console.error("Erro ao limpar PWA.");
    alert("Falha parcial ao limpar os dados. Por favor, reinicie o navegador.");
    window.location.reload(true);
  }
};

function interceptarMagicLinkRecuperacao(urlParams) {
  if (!urlParams || !urlParams.has('reset')) return false;

  const pin = String(urlParams.get('reset') || "").trim();
  const email = String(urlParams.get('email') || "").trim();

  if (pin) {
    sessionStorage.setItem("MAESTRO_IAM_TEMP_PIN", pin);
  }

  if (email) {
    localStorage.setItem("MAESTRO_RESET_EMAIL", email);
  }

  setTimeout(() => {
    const inputPin = document.getElementById('redefinir-pin');
    const inputEmail = document.getElementById('recuperar-email');

    if (inputPin && pin) inputPin.value = pin;
    if (inputEmail && email) inputEmail.value = email;

    switchView('view-redefinir-senha');
    showToast("PIN de recuperação carregado. Informe sua nova senha.", "info");
  }, 700);

  const urlLimpa = new URL(window.location.href);
  urlLimpa.searchParams.delete('reset');
  urlLimpa.searchParams.delete('email');
  history.replaceState({}, document.title, urlLimpa.pathname + urlLimpa.search + urlLimpa.hash);

  if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("debug", "Magic link de recuperacao interceptado com sucesso.");
  return true;
}

/* =========================================================================
   UX/UI PHASE 7 - SCRIPTS (HEADER, FOOTER, SOBRE MODAL)
   ========================================================================= */

// Modal Sobre O Maestro
function abrirModalSobre() {
  const modal = document.getElementById('modal-sobre');
  if (modal) modal.classList.remove('hidden');
}

function fecharModalSobre() {
  const modal = document.getElementById('modal-sobre');
  if (modal) modal.classList.add('hidden');
}

var maestroModalLastFocus = null;

function isModalMaestroVisivel(modal) {
  if (!modal || modal.classList.contains("hidden")) return false;
  if (modal.classList.contains("bottom-sheet-overlay")) {
    return modal.classList.contains("active") || !modal.classList.contains("hidden");
  }
  return true;
}

function obterPainelModalMaestro(modal) {
  if (!modal) return null;
  return modal.querySelector(".maestro-modal-panel, .form-card-modal, .bottom-sheet-content, .raio-x-container");
}

function obterElementoFocavelModalMaestro(modal, panel) {
  const selectorPreferido = modal ? modal.getAttribute("data-modal-initial-focus") : "";
  if (selectorPreferido) {
    const preferido = modal.querySelector(selectorPreferido);
    if (preferido && typeof preferido.focus === "function" && !preferido.disabled) return preferido;
  }

  const seletorFocavel = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  return panel ? panel.querySelector(seletorFocavel) : null;
}

function focarModalMaestro(modal) {
  if (!isModalMaestroVisivel(modal)) return;
  const panel = obterPainelModalMaestro(modal);
  if (!panel) return;

  if (!panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }

  setTimeout(function () {
    if (!isModalMaestroVisivel(modal)) return;
    const alvo = obterElementoFocavelModalMaestro(modal, panel) || panel;
    try {
      alvo.focus({ preventScroll: true });
    } catch (error) {
      try { alvo.focus(); } catch (innerError) { }
    }
  }, 40);
}

function atualizarEstadoModaisMaestro() {
  const modais = document.querySelectorAll(".maestro-modal-overlay, .route-modal-overlay");
  let modalAberto = null;

  modais.forEach(function (modal) {
    const visivel = isModalMaestroVisivel(modal);
    modal.setAttribute("aria-hidden", visivel ? "false" : "true");
    if (visivel && !modalAberto) modalAberto = modal;
  });

  document.body.classList.toggle("maestro-modal-open", !!modalAberto);

  if (modalAberto) {
    const focoAtual = document.activeElement;
    if (!modalAberto.contains(focoAtual)) {
      maestroModalLastFocus = focoAtual;
      focarModalMaestro(modalAberto);
    }
    return;
  }

  if (maestroModalLastFocus && typeof maestroModalLastFocus.focus === "function") {
    try { maestroModalLastFocus.focus({ preventScroll: true }); } catch (error) { }
  }
  maestroModalLastFocus = null;
}

function iniciarGestorModaisMaestro() {
  const modais = document.querySelectorAll(".maestro-modal-overlay, .route-modal-overlay");
  if (!modais.length) return;
  if (window.__maestroModalManagerStarted) {
    atualizarEstadoModaisMaestro();
    return;
  }
  window.__maestroModalManagerStarted = true;

  modais.forEach(function (modal) {
    const panel = obterPainelModalMaestro(modal);
    if (panel && !panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }
    modal.setAttribute("aria-hidden", isModalMaestroVisivel(modal) ? "false" : "true");
  });

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(function (mutations) {
      const mudouModal = mutations.some(function (mutation) {
        return mutation.type === "attributes" && mutation.attributeName === "class";
      });
      if (mudouModal) atualizarEstadoModaisMaestro();
    });

    modais.forEach(function (modal) {
      observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
    });
  }

  atualizarEstadoModaisMaestro();
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarGestorModaisMaestro();
  aplicarAcessibilidadeBaseMaestro(document);
  aplicarPoliticaEstagioMaestro();
});
setTimeout(iniciarGestorModaisMaestro, 1200);

// Botão Voltar (Global)
function voltarNavegacao() {
  const viewVoltar = sessionStorage.getItem('MAESTRO_LAST_VIEW') === 'view-login-fiscal' ? 'view-login-fiscal' : 'view-hub';
  switchView(viewVoltar);
}

// Event Listener: Scroll para Sticky Header (Glassmorphism)
window.addEventListener('scroll', function() {
  const header = document.getElementById('global-header');
  if (!header) return;
  if (window.scrollY > 20) {
    header.classList.add('header-scrolled');
  } else {
    header.classList.remove('header-scrolled');
  }
});

// Event Listener: Status Offline (Footer)
function atualizarStatusRodape() {
  const statusText = document.getElementById('footer-status-text');
  const statusDot = document.getElementById('footer-status-dot');
  if (!statusText || !statusDot) return;
  
  if (navigator.onLine) {
    statusText.innerText = "Sistema Online";
    statusDot.classList.remove('offline');
  } else {
    statusText.innerText = "Operando Offline";
    statusDot.classList.add('offline');
  }
}

window.addEventListener('online', atualizarStatusRodape);
window.addEventListener('offline', atualizarStatusRodape);
document.addEventListener('DOMContentLoaded', atualizarStatusRodape);
setTimeout(atualizarStatusRodape, 1000); // garante carregamento async

// Intercepta o switchView para gerenciar o botão Voltar
const originalSwitchViewPhase7 = window.switchView;
window.switchView = function(viewId) {
  if (typeof originalSwitchViewPhase7 === 'function') {
      originalSwitchViewPhase7(viewId);
  }
  
  const btnConfig = document.getElementById('btn-header-config');
  const btnBack = document.getElementById('btn-header-back');
  
  if (!btnConfig || !btnBack) return;

  if (viewId === 'view-hub' || viewId === 'view-login' || viewId === 'view-login-fiscal') {
     btnBack.classList.add('hidden');
     btnConfig.classList.remove('hidden');
  } else {
     btnConfig.classList.add('hidden');
     btnBack.classList.remove('hidden');
  }
};
