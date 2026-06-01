// =======================================================================
// MAESTRO PWA - BUNDLE PRINCIPAL (Compilado pelo Jekyll)
// =======================================================================

// 1. Core & Variáveis Globais
/**
 * ============================================================================
 * UTILITÁRIOS GERAIS DO SISTEMA (V9.1)
 * ============================================================================
 */

/**
 * Sistema de Notificações Visual (Toast)
 * @param {string} msg - Mensagem a exibir
 * @param {string} type - 'success', 'error', 'loading' ou 'info'
 */
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerText = msg;
  const tiposToast = ['toast-success', 'toast-error', 'toast-warning', 'toast-loading', 'toast-info'];
  const tipoSeguro = ['success', 'error', 'warning', 'loading', 'info'].includes(type) ? type : 'info';
  toast.classList.remove(...tiposToast);
  toast.classList.add(`toast-${tipoSeguro}`, 'is-visible');
  
  // Cores dinâmicas baseadas no tipo
  
  if (window.__maestroToastTimer) clearTimeout(window.__maestroToastTimer);

  if (tipoSeguro !== 'loading') {
    window.__maestroToastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 4000);
  }
}

/**
 * Máscara de Nome (Title Case Inteligente)
 * Formata nomes mal escritos para o padrão institucional.
 */
function formatarNome(nome) {
  if (!nome) return "";
  const excepcoes = ["da", "de", "do", "das", "dos", "e"];
  
  return nome.toLowerCase().split(' ').map((palavra, i) => {
    // Se for uma exceção E não for a primeira palavra, mantém minúscula
    if (excepcoes.includes(palavra) && i !== 0) return palavra;
    // Caso contrário, capitaliza a primeira letra
    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
  }).join(' ');
}

/**
 * Manipulador de Erros Global
 */
function handleError(err) {
  console.error("Erro no Sistema:", err);
  showToast("Erro: " + (err.message || err), "error");
}

// ========================================================================
// 1. MOTOR PWA & ARRANQUE DINÂMICO (BOOTSTRAP)
// ========================================================================

let deferredPrompt;
const MAESTRO_PWA_VERSION = "12.32.0";
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
            console.log('Firebase inicializado com sucesso no bootSystem.');
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

      initPWA();
    } else {
      restaurarPWAOfflineMaestro();
    }
  } catch (e) {
    console.warn("A arrancar em modo offline persistente.");
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
    const versionParam = `v=${encodeURIComponent(MAESTRO_PWA_VERSION)}`;
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      const swUrl = `./sw.js?${versionParam}&apiKey=${encodeURIComponent(window.FIREBASE_CONFIG.apiKey)}&projectId=${encodeURIComponent(window.FIREBASE_CONFIG.projectId || "")}&senderId=${encodeURIComponent(window.FIREBASE_CONFIG.messagingSenderId || "")}&appId=${encodeURIComponent(window.FIREBASE_CONFIG.appId || "")}`;

      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          sincronizarServiceWorkerMaestro(registration);
          console.log('SW registado com sucesso com chaves dinâmicas!', registration.scope);
        })
        .catch(err => {
          console.log('Falha ao registar SW:', err);
        });

    } else {
      navigator.serviceWorker.register(`./sw.js?${versionParam}`)
        .then((registration) => {
          sincronizarServiceWorkerMaestro(registration);
          console.log('SW registado em modo apenas-offline.');
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
    console.warn(`View não encontrada: ${viewId}. Redirecionando para 'view-gateway'.`);
    viewId = 'view-gateway';
    target = document.getElementById(viewId);
  }

  const views = document.querySelectorAll('.view-section');
  views.forEach(v => {
    v.classList.remove('active-view');
    v.classList.remove('slide-in-right');
  });

  if (target) {
    window.requestAnimationFrame(() => {
      target.classList.add('active-view');
      target.classList.add('slide-in-right');
    });
    sessionStorage.setItem('MAESTRO_LAST_VIEW', viewId);
  }

  aplicarShellResponsivoMaestro(viewId);

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

async function carregarAvisosSMEB() {
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
    // Silencia se offline
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
    console.warn("Chaves do Firebase não configuradas na planilha.");
    desligarTogglePush("Chaves do Firebase ausentes no sistema.");
    return;
  }

  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
  } catch (e) {
    console.warn("Firebase Init falhou:", e);
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
        console.log('Mensagem recebida em primeiro plano:', payload);
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
    console.warn("Falha de Push:", error);
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
    console.warn("registrarTokenPush: CPF ausente no cache — registo de push abortado.");
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
  } catch (err) { console.error("Erro ao registrar token", err); }
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
        console.warn(`[LogoFallback] Falha ao carregar logotipo remoto, tentando fallback local: ${fallbackSrc}`);
        imgEl.src = fallbackSrc;
      } else {
        console.error(`[LogoFallback] Falha ao carregar fallback local de logotipo: ${fallbackSrc}. Exibindo placeholder.`);
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
  } else {
    if (logoEl) {
      configurarFallbackLogo(logoEl, "MGA.png", sistemaNome);
      logoEl.src = "MGA.png";
    }
    if (splashLogo) {
      configurarFallbackLogo(splashLogo, "icone.png", sistemaNome);
      splashLogo.src = "icone.png";
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
      console.log("Wake Lock ativado: Ecrã permanecerá ligado.");
      document.addEventListener('visibilitychange', lidarComMudancaVisibilidade);
    }
  } catch (err) {
    console.warn("Wake Lock não suportado ou falhou:", err);
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
      (err) => console.error("Erro no GPS do Mestre:", err),
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
      console.log("Wake Lock libertado.");
    });
  }
  document.removeEventListener('visibilitychange', lidarComMudancaVisibilidade);
}

async function lidarComMudancaVisibilidade() {
  if (wakeLockMotorista === null && document.visibilityState === 'visible' && document.body.classList.contains('modo-viagem-ativo')) {
    try {
      wakeLockMotorista = await navigator.wakeLock.request('screen');
      console.log("Wake Lock restaurado.");
    } catch (err) {
      console.warn("Falha ao restaurar Wake Lock:", err);
    }
  }
}

// ========================================================================
// CAIXA DE NOTIFICAÇÕES PUSH (IndexedDB / Service Worker)
// ========================================================================
(() => {
  const INBOX_DB_NAME = 'MaestroOfflineDB';
  const INBOX_STORE_NAME = 'notifications';

  function abrirBancoInbox() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INBOX_DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(INBOX_STORE_NAME)) {
          db.createObjectStore(INBOX_STORE_NAME, { keyPath: 'timestamp' });
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
      console.error("Erro ao atualizar contador de notificações:", erro);
    }
  }

  async function abrirInboxIndexedDB() {
    const containers = obterContainersInbox();
    if (containers.length === 0) return;

    containers.forEach(container => {
      container.innerHTML = '<div class="dynamic-state-box dynamic-loading-state inbox-loading-state"><div class="loader loader-center"></div></div>';
    });

    try {
      const db = await abrirBancoInbox();
      const transaction = db.transaction(INBOX_STORE_NAME, 'readonly');
      const store = transaction.objectStore(INBOX_STORE_NAME);
      const notificacoes = await executarRequestInbox(store.getAll());

      notificacoes.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

      if (notificacoes.length === 0) {
        containers.forEach(container => {
          container.innerHTML = '<div class="inbox-empty-state dynamic-state-box dynamic-empty-state"><p class="inbox-empty-text">Nenhuma notificacao recente.</p></div>';
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
      console.error("Erro ao carregar notificações locais:", erro);
      containers.forEach(container => {
        container.innerHTML = '<div class="error-box dynamic-state-box dynamic-error-state">Erro ao carregar notificações locais.</div>';
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
      console.error("Erro ao marcar notificação como lida:", erro);
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
      console.error("Erro ao apagar notificações locais:", erro);
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

window.hardResetPWA = async function() {
  const confirmacao = window.confirm("Atenção: Isto irá apagar a sua carteira salva, histórico offline e forçar a atualização do sistema. Precisará de internet para entrar novamente.\n\nDeseja continuar?");
  
  if (!confirmacao) return;

  showToast("A limpar sistema...", "loading");

  try {
    // 1. Limpar Storage
    localStorage.clear();
    sessionStorage.clear();

    // 2. Destruir Service Workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) {
        await reg.unregister();
      }
    }

    // 3. Limpar Cache API (Ficheiros Estáticos)
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    // 4. Destruir IndexedDB (Notificações Offline)
    if (window.indexedDB) {
      indexedDB.deleteDatabase('MaestroOfflineDB');
    }

    // 5. Hard Reload
    showToast("Sistema limpo. A reiniciar...", "success");
    setTimeout(() => {
      window.location.href = window.location.pathname; // Reload limpo na raiz
    }, 1500);

  } catch (err) {
    console.error("Erro ao limpar PWA:", err);
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

  console.log("Magic link de recuperação interceptado com sucesso.");
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

document.addEventListener("DOMContentLoaded", iniciarGestorModaisMaestro);
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
  "Ceará-Mirim": "https://script.google.com/macros/s/AKfycbzCd37kAa5r-6hjAHOXvwSPRXdHUWiQzfHygKdS_HdUW60FOUZzr5KkR2x57nTJeBJ0PA/exec",
};

const MAESTRO_CLIENT_DIRECTORY_VERSION = "2026-05-26-cache-reset";
const MAESTRO_CLIENT_URL_VERSION_KEY = "MAESTRO_CLIENT_URL_VERSION";

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

function removerCachesLocaisDeBackendMaestro() {
  [
    "MAESTRO_TOKEN",
    "MAESTRO_EST_TOKEN",
    "MAESTRO_OPERADOR_NOME",
    "MAESTRO_OPERADOR_EMAIL",
    "MAESTRO_OPERADOR_NIVEL",
    "MAESTRO_WALLET_CACHE",
    "MAESTRO_OFFLINE_WALLET",
    "MAESTRO_DASH_STATS",
    "MAESTRO_THEME_CONFIG",
    "MAESTRO_TENANT_CONTEXT",
    "MAESTRO_SEMESTER_CONTEXT",
    "MAESTRO_THEME_CACHE",
    "MAESTRO_CACHE_META"
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
  removerCachesLocaisDeBackendMaestro();

  try {
    await limparCachesNavegadorMaestro();
  } catch (error) {
    console.warn("Nao foi possivel limpar todos os caches antigos do Maestro:", error);
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
    return tenantContext.tenantId || tenantContext.tenantID || tenantContext.tenant_id || "";
  } catch (e) {
    return "";
  }
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
    "getListaAuditoria",
    "verFicheiroBase64",
    "atualizarStatusAluno",
    "enviarParecerOperador",
    "getDashboardStats",
    "forcarExecucaoMotor",
    "healthcheckMaestro",
    "atualizarEstagioCarteira"
  ].indexOf(String(action || "")) !== -1;
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
  if (acao === "getListaAuditoria") return 10000;
  if (acao === "submeterInscricaoNativa" || acao === "atualizarEstagioCarteira") return 120000;
  if (acao === "forcarExecucaoMotor") return 180000;
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
  const body = {
    action: action,
    token: token,
    payload: payloadFinal
  };
  const timeoutMs = obterTimeoutApiMaestro(action, options);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

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
      console.error("401 Unauthorized na rota:", action);
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
    console.error("Erro na chamada API:", error);
    const abortado = error && error.name === "AbortError";
    return {
      sucesso: false,
      erro: abortado
        ? "Tempo limite excedido ao comunicar com o backend."
        : "Falha na ligacao ao servidor.",
      detalhes: error && error.message ? error.message : String(error),
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
  if (!window.MaestroData || !window.MaestroData.contexts || !window.MaestroData.contexts.operator) return null;

  return window.MaestroData.contexts.operator.set({
    token: tokenValido || (res && (res.token || res.tokenSessao || res.hashAcesso || res.sessionToken)) || localStorage.getItem("MAESTRO_TOKEN"),
    nome: (res && res.nome) || localStorage.getItem("MAESTRO_OPERADOR_NOME") || "Operador",
    email: (res && (res.email || res.identificador)) || login || localStorage.getItem("MAESTRO_OPERADOR_EMAIL") || "",
    nivel: String((res && res.nivel) || localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "OPERADOR").toUpperCase(),
    perfil: String((res && res.nivel) || localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "OPERADOR").toUpperCase(),
    tenantId: res && (res.tenantId || res.tenantID || res.tenant_id)
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
      console.warn("Nao foi possivel sincronizar studentIdentity do cache local:", erro);
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
      item.textContent = (valido ? "✅ " : "❌ ") + texto;
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
          console.warn("Nao foi possivel consultar o status do CPF apos falha de carteira:", statusError);
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
    console.warn("Falha no login IAM da carteira:", err);
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
    console.error("Erro ao salvar senha de primeiro acesso:", e);
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
    console.warn("Não foi possível ler o CPF da carteira local:", erro);
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
    console.error("Erro ao baixar dados pessoais:", erro);
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
    console.error("Erro ao solicitar anonimização:", erro);
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

// ========================================================================
// MAESTRO DATA LAYER V2.1
// Foundation for Firestore-compatible frontend contracts.
// This file is intentionally side-effect light: it exposes helpers without
// changing the current apiCall behavior or the current UI rendering.
// ========================================================================

(function initMaestroDataLayer(window) {
  "use strict";

  const DATA_LAYER_VERSION = "2.2.0";
  const CACHE_SCHEMA_VERSION = "maestro-data-schema-v1";
  const STORAGE_KEYS = {
    tenantContext: "MAESTRO_TENANT_CONTEXT",
    themeConfig: "MAESTRO_THEME_CONFIG",
    studentIdentity: "MAESTRO_STUDENT_IDENTITY",
    operatorSession: "MAESTRO_OPERATOR_SESSION",
    semesterContext: "MAESTRO_SEMESTER_CONTEXT",
    cacheSchemaVersion: "MAESTRO_CACHE_SCHEMA_VERSION",
    cacheMeta: "MAESTRO_CACHE_META"
  };

  const CACHE_DOMAINS = {
    theme: {
      version: "theme-v2",
      derivedKeys: [STORAGE_KEYS.themeConfig, STORAGE_KEYS.tenantContext, STORAGE_KEYS.semesterContext]
    },
    wallet: {
      version: "wallet-v1",
      derivedKeys: [STORAGE_KEYS.studentIdentity],
      legacyKeys: ["MAESTRO_WALLET_CACHE", "MAESTRO_OFFLINE_WALLET"]
    },
    dashboard: {
      version: "dashboard-v1",
      derivedKeys: ["MAESTRO_DASH_STATS"]
    },
    session: {
      version: "session-v1",
      derivedKeys: [STORAGE_KEYS.operatorSession],
      legacyKeys: ["MAESTRO_TOKEN"]
    }
  };

  const BUSINESS_RULES = {
    muralWeeklyPostLimit: 5,
    stageUpdateLimitPerCycle: 1,
    walletTurnWindows: {
      MATUTINO: { start: "05:00", end: "10:30" },
      VESPERTINO: { start: "11:00", end: "16:30" },
      NOTURNO: { start: "17:00", end: "21:30" }
    }
  };

  const VISUAL_TOKEN_DEFAULTS = {
    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    light: {
      primary: "#0A3D6B",
      secondary: "#F8F9FA",
      accent: "#F29900"
    },
    dark: {
      primary: "#8AB4F8",
      secondary: "#121212",
      accent: "#F29900"
    },
    status: {
      success: "#10B981",
      warning: "#F59E0B",
      danger: "#EF4444",
      info: "#2563EB"
    },
    text: {
      light: {
        main: "#1F2937",
        sub: "#4B5563",
        muted: "#5E6A75",
        inverse: "#FFFFFF"
      },
      dark: {
        main: "#F3F4F6",
        sub: "#94A3B8",
        muted: "#A0AEC0",
        inverse: "#FFFFFF"
      }
    },
    surface: {
      light: {
        page: "#F8F9FA",
        card: "#FFFFFF",
        elevated: "rgba(255, 255, 255, 0.88)",
        muted: "#F1F5F9",
        hover: "rgba(10, 61, 107, 0.06)",
        border: "#E5E7EB",
        overlay: "rgba(15, 23, 42, 0.45)"
      },
      dark: {
        page: "#121212",
        card: "#1E1E1E",
        elevated: "rgba(15, 23, 42, 0.88)",
        muted: "#0F172A",
        hover: "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.08)",
        overlay: "rgba(0, 0, 0, 0.65)"
      }
    },
    shadow: {
      soft: "0 10px 30px rgba(15, 23, 42, 0.10)",
      raised: "0 20px 40px rgba(15, 23, 42, 0.16)",
      focus: "0 0 0 3px rgba(10, 61, 107, 0.22)"
    }
  };

  const PUBLIC_NAVIGATION_VIEWS = [
    "view-gateway",
    "view-hub",
    "view-aluno-menu",
    "view-inscricao",
    "view-consult",
    "view-resgate",
    "view-login",
    "view-login-fiscal",
    "view-validador",
    "view-mural",
    "view-recuperar-senha",
    "view-redefinir-senha",
    "view-nova-senha"
  ];

  const STUDENT_NAVIGATION_VIEWS = PUBLIC_NAVIGATION_VIEWS.concat([
    "view-wallet",
    "view-radar"
  ]);

  const NAVIGATION_MATRIX = {
    ANONIMO: {
      label: "Anonimo",
      defaultView: "view-hub",
      views: PUBLIC_NAVIGATION_VIEWS,
      actions: ["publico"]
    },
    ESTUDANTE: {
      label: "Estudante",
      defaultView: "view-aluno-menu",
      views: STUDENT_NAVIGATION_VIEWS,
      actions: ["publico", "estudante", "radar"]
    },
    MOTORISTA: {
      label: "Motorista",
      defaultView: "view-painel-motorista",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-painel-motorista",
        "view-fiscal",
        "view-radar"
      ]),
      actions: ["publico", "fiscalizar", "motoristaRotas", "reportarSos", "radar"]
    },
    FISCAL: {
      label: "Fiscal",
      defaultView: "view-admin-hub",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-fiscal",
        "view-notificacoes",
        "view-radar"
      ]),
      actions: ["publico", "fiscalizar", "encerrarRota", "reportarSos", "radar"]
    },
    OPERADOR: {
      label: "Operador",
      defaultView: "view-admin-hub",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-auditoria",
        "view-dashboard",
        "view-notificacoes"
      ]),
      actions: ["publico", "auditoria", "dashboard"]
    },
    SUPERVISOR: {
      label: "Supervisor",
      defaultView: "view-admin-hub",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-fiscal",
        "view-auditoria",
        "view-dashboard",
        "view-semestres",
        "view-notificacoes",
        "view-radar"
      ]),
      actions: ["publico", "fiscalizar", "encerrarRota", "reportarSos", "gerirRotas", "auditoria", "comunicacao", "dashboard", "semestres", "radar"]
    },
    MODERADOR: {
      label: "Moderador",
      defaultView: "view-admin-hub",
      views: STUDENT_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-fiscal",
        "view-auditoria",
        "view-dashboard",
        "view-semestres",
        "view-notificacoes",
        "view-moderador",
        "view-painel-motorista"
      ]),
      actions: ["publico", "estudante", "fiscalizar", "encerrarRota", "reportarSos", "gerirRotas", "auditoria", "comunicacao", "dashboard", "semestres", "salaMaquinas", "motoristaRotas", "radar"]
    }
  };

  const NAVIGATION_MENU_GROUPS = {
    "menu-grupo-campo": ["fiscalizar", "encerrarRota", "reportarSos"],
    "menu-grupo-secretaria": ["gerirRotas", "auditoria", "comunicacao", "dashboard", "semestres"],
    "menu-grupo-moderador": ["salaMaquinas"]
  };

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function safeString(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  function escapeHTML(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeText(value, fallback) {
    const text = safeString(value).replace(/[\u0000-\u001F\u007F]/g, " ");
    return text || safeString(fallback);
  }

  function safeMessage(value, fallback) {
    const message = safeText(value, fallback || "Mensagem indisponivel.");
    return message.length > 700 ? message.slice(0, 697) + "..." : message;
  }

  function safeAttr(value) {
    return escapeHTML(safeText(value));
  }

  function safeUrl(value) {
    const raw = safeString(value);
    if (!raw) return "";
    try {
      const parsed = new URL(raw, window.location && window.location.href ? window.location.href : "https://maestro.local/");
      const protocol = parsed.protocol.toLowerCase();
      if (["http:", "https:", "mailto:", "tel:"].includes(protocol)) return parsed.href;
      if (protocol === "data:" && /^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,/i.test(raw)) return raw;
      if (protocol === "blob:") return raw;
      return "";
    } catch (err) {
      if (/^\.{0,2}\//.test(raw)) return raw;
      return "";
    }
  }

  function safeUrlAttr(value) {
    return safeAttr(safeUrl(value));
  }

  function safeLines(value) {
    return escapeHTML(String(value === undefined || value === null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " "))
      .replace(/\r?\n/g, "<br>");
  }

  function safeDomId(value) {
    const normalized = removeDiacritics(safeText(value, "item")).replace(/[^A-Za-z0-9_-]+/g, "_");
    return (normalized || "item").slice(0, 80);
  }

  function safeJsStringAttr(value) {
    return safeAttr(JSON.stringify(String(value === undefined || value === null ? "" : value)));
  }

  function setSafeText(elementOrId, value, fallback) {
    const element = typeof elementOrId === "string" ? window.document.getElementById(elementOrId) : elementOrId;
    if (!element) return false;
    element.textContent = safeText(value, fallback);
    return true;
  }

  function setSafeHTML(elementOrId, html) {
    const element = typeof elementOrId === "string" ? window.document.getElementById(elementOrId) : elementOrId;
    if (!element) return false;
    element.innerHTML = String(html || "");
    return true;
  }

  function pickFirst() {
    for (let i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (value !== undefined && value !== null && safeString(value) !== "") return value;
    }
    return "";
  }

  function pickPath(source, paths, fallback) {
    if (!source) return fallback;
    for (let i = 0; i < paths.length; i += 1) {
      const parts = String(paths[i]).split(".");
      let cursor = source;
      let found = true;
      for (let j = 0; j < parts.length; j += 1) {
        if (!isObject(cursor) && !Array.isArray(cursor)) {
          found = false;
          break;
        }
        if (!hasOwn(cursor, parts[j])) {
          found = false;
          break;
        }
        cursor = cursor[parts[j]];
      }
      if (found && cursor !== undefined && cursor !== null && safeString(cursor) !== "") return cursor;
    }
    return fallback;
  }

  function cleanCpf(value) {
    return safeString(value).replace(/\D/g, "");
  }

  function removeDiacritics(value) {
    const text = safeString(value);
    return typeof text.normalize === "function"
      ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : text;
  }

  function normalizeUpper(value) {
    return removeDiacritics(value).toUpperCase();
  }

  function normalizeSimNao(value) {
    if (value === true) return "Sim";
    if (value === false) return "Nao";
    const normalized = normalizeUpper(value);
    if (["SIM", "S", "TRUE", "1", "YES"].includes(normalized)) return "Sim";
    if (["NAO", "N", "FALSE", "0", "NO"].includes(normalized)) return "Nao";
    return safeString(value);
  }

  function normalizeAccessProfile(profile) {
    const normalized = normalizeUpper(profile);
    const aliases = {
      ADMIN: "MODERADOR",
      ADMINISTRADOR: "MODERADOR",
      GESTOR: "SUPERVISOR",
      GESTORA: "SUPERVISOR",
      SECRETARIA: "OPERADOR",
      ATENDENTE: "OPERADOR",
      ALUNO: "ESTUDANTE",
      ALUNA: "ESTUDANTE",
      ESTUDANTE: "ESTUDANTE",
      ANONIMO: "ANONIMO",
      ANONIMA: "ANONIMO"
    };
    const profileKey = aliases[normalized] || normalized;
    return NAVIGATION_MATRIX[profileKey] ? profileKey : "ANONIMO";
  }

  function normalizeTurno(value) {
    const normalized = normalizeUpper(value);
    if (["MATUTINO", "MANHA"].includes(normalized)) return "MATUTINO";
    if (["VESPERTINO", "TARDE"].includes(normalized)) return "VESPERTINO";
    if (["NOTURNO", "NOITE"].includes(normalized)) return "NOTURNO";
    return normalized;
  }

  function toArray(value) {
    if (Array.isArray(value)) return value.filter(item => safeString(item) !== "");
    if (value === undefined || value === null || value === "") return [];
    return String(value)
      .split(/[;,|]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function uniqueArray(values) {
    const seen = {};
    return toArray(values).filter(item => {
      const key = normalizeUpper(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function safeJsonParse(value, fallback) {
    try {
      if (!value) return fallback;
      return JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }

  function getLocal(key, fallback) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) || fallback : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function setLocal(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeLocal(key) {
    try {
      if (window.localStorage) window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  function getJson(key, fallback) {
    return safeJsonParse(getLocal(key, ""), fallback);
  }

  function setJson(key, value) {
    return setLocal(key, JSON.stringify(value));
  }

  function getCacheMetaRoot() {
    const meta = getJson(STORAGE_KEYS.cacheMeta, {});
    if (!isObject(meta.domains)) meta.domains = {};
    if (!meta.schemaVersion) meta.schemaVersion = getLocal(STORAGE_KEYS.cacheSchemaVersion, "") || CACHE_SCHEMA_VERSION;
    return meta;
  }

  function setCacheMetaRoot(meta) {
    const next = isObject(meta) ? meta : {};
    next.schemaVersion = CACHE_SCHEMA_VERSION;
    if (!isObject(next.domains)) next.domains = {};
    setLocal(STORAGE_KEYS.cacheSchemaVersion, CACHE_SCHEMA_VERSION);
    return setJson(STORAGE_KEYS.cacheMeta, next);
  }

  function markCacheDomain(domain, details) {
    const config = CACHE_DOMAINS[domain];
    if (!config) return null;
    const meta = getCacheMetaRoot();
    const payload = details || {};
    meta.domains[domain] = mergeDefined(meta.domains[domain] || {}, {
      version: config.version,
      updatedAt: new Date().toISOString(),
      schemaVersion: CACHE_SCHEMA_VERSION,
      tenantId: payload.tenantId,
      source: payload.source || "runtime",
      key: payload.key
    });
    setCacheMetaRoot(meta);
    return meta.domains[domain];
  }

  function getCacheDomainMeta(domain) {
    const meta = getCacheMetaRoot();
    return meta.domains[domain] || null;
  }

  function isCacheDomainFresh(domain, options) {
    const config = CACHE_DOMAINS[domain];
    if (!config) return false;
    const opts = options || {};
    const meta = getCacheDomainMeta(domain);
    if (!meta || meta.version !== config.version || meta.schemaVersion !== CACHE_SCHEMA_VERSION) {
      return Boolean(opts.allowLegacy);
    }
    if (opts.tenantId && meta.tenantId && meta.tenantId !== opts.tenantId) return false;
    if (opts.maxAgeMs && meta.updatedAt) {
      const updatedAt = new Date(meta.updatedAt).getTime();
      if (Number.isFinite(updatedAt) && Date.now() - updatedAt > opts.maxAgeMs) return false;
    }
    return true;
  }

  function invalidateCacheDomain(domain, options) {
    const config = CACHE_DOMAINS[domain];
    if (!config) return false;
    const opts = options || {};
    const keys = opts.includeLegacy
      ? (config.derivedKeys || []).concat(config.legacyKeys || [])
      : (config.derivedKeys || []);
    keys.forEach(removeLocal);
    const meta = getCacheMetaRoot();
    if (meta.domains) delete meta.domains[domain];
    setCacheMetaRoot(meta);
    return true;
  }

  function ensureStorageSchemaVersion() {
    const current = getLocal(STORAGE_KEYS.cacheSchemaVersion, "");
    const changed = current !== CACHE_SCHEMA_VERSION;
    if (changed && current) {
      ["theme", "dashboard", "session"].forEach(domain => invalidateCacheDomain(domain));
    }
    setLocal(STORAGE_KEYS.cacheSchemaVersion, CACHE_SCHEMA_VERSION);
    const meta = getCacheMetaRoot();
    meta.schemaVersion = CACHE_SCHEMA_VERSION;
    setCacheMetaRoot(meta);
    return { changed: changed, previous: current, current: CACHE_SCHEMA_VERSION };
  }

  function mergeDefined() {
    const result = {};
    for (let i = 0; i < arguments.length; i += 1) {
      const source = arguments[i] || {};
      Object.keys(source).forEach(key => {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") result[key] = value;
      });
    }
    return result;
  }

  function sanitizeCssColor(value, fallback) {
    const color = safeString(value);
    const safeFallback = safeString(fallback);
    if (!color) return safeFallback;
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color;
    if (/^rgba?\(\s*[\d\s.,%+-]+\)$/i.test(color)) return color;
    if (/^hsla?\(\s*[\d\s.,%+-]+\)$/i.test(color)) return color;
    if (/^[a-z]+$/i.test(color)) {
      try {
        if (window.CSS && typeof window.CSS.supports === "function" && window.CSS.supports("color", color)) {
          return color;
        }
      } catch (err) {
        return safeFallback;
      }
    }
    return safeFallback;
  }

  function isAdaptedThemeConfig(config) {
    return isObject(config) && (isObject(config.colors) || isObject(config.brand) || isObject(config.logos));
  }

  function resolveThemeMode(options) {
    if (options && hasOwn(options, "dark")) return options.dark ? "dark" : "light";
    if (options && options.mode) return options.mode === "dark" ? "dark" : "light";
    return window.document && window.document.body && window.document.body.classList.contains("dark-theme")
      ? "dark"
      : "light";
  }

  function buildVisualTokens(themeConfig, options) {
    const config = isAdaptedThemeConfig(themeConfig)
      ? themeConfig
      : adaptThemeConfig(themeConfig || getThemeConfig() || {});
    const colors = config.colors || {};
    const logos = config.logos || {};
    const brand = config.brand || {};
    const pwa = config.pwa || {};
    const mode = resolveThemeMode(options || {});

    const light = {
      primary: sanitizeCssColor(colors.light && colors.light.primary, VISUAL_TOKEN_DEFAULTS.light.primary),
      secondary: sanitizeCssColor(colors.light && colors.light.secondary, VISUAL_TOKEN_DEFAULTS.light.secondary),
      accent: sanitizeCssColor(colors.light && colors.light.accent, VISUAL_TOKEN_DEFAULTS.light.accent)
    };
    const dark = {
      primary: sanitizeCssColor(colors.dark && colors.dark.primary, light.primary || VISUAL_TOKEN_DEFAULTS.dark.primary),
      secondary: sanitizeCssColor(colors.dark && colors.dark.secondary, VISUAL_TOKEN_DEFAULTS.dark.secondary),
      accent: sanitizeCssColor(colors.dark && colors.dark.accent, light.accent || VISUAL_TOKEN_DEFAULTS.dark.accent)
    };
    const active = mode === "dark" ? dark : light;
    const text = VISUAL_TOKEN_DEFAULTS.text[mode] || VISUAL_TOKEN_DEFAULTS.text.light;
    const surfaceDefaults = VISUAL_TOKEN_DEFAULTS.surface[mode] || VISUAL_TOKEN_DEFAULTS.surface.light;
    const surface = {
      page: sanitizeCssColor(active.secondary, surfaceDefaults.page),
      card: surfaceDefaults.card,
      elevated: surfaceDefaults.elevated,
      muted: surfaceDefaults.muted,
      hover: surfaceDefaults.hover,
      border: sanitizeCssColor(surfaceDefaults.border, mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB"),
      overlay: surfaceDefaults.overlay
    };
    const logo = safeUrl(mode === "dark"
      ? pickFirst(logos.dark, logos.light, logos.emblem, pwa.icon)
      : pickFirst(logos.light, logos.emblem, logos.dark, pwa.icon));

    return {
      mode: mode,
      active: active,
      colors: { light: light, dark: dark },
      brand: brand,
      text: text,
      surface: surface,
      assets: {
        logo: logo,
        logoLight: safeUrl(logos.light),
        logoDark: safeUrl(logos.dark),
        emblem: safeUrl(logos.emblem),
        appIcon: safeUrl(logos.appIcon || pwa.icon)
      },
      typography: {
        fontFamily: VISUAL_TOKEN_DEFAULTS.fontFamily,
        baseFamily: "Poppins"
      },
      cssVars: {
        "--maestro-font-family": VISUAL_TOKEN_DEFAULTS.fontFamily,
        "--font-main": VISUAL_TOKEN_DEFAULTS.fontFamily,
        "--maestro-color-primary": active.primary,
        "--maestro-color-secondary": active.secondary,
        "--maestro-color-accent": active.accent,
        "--maestro-color-primary-light": light.primary,
        "--maestro-color-secondary-light": light.secondary,
        "--maestro-color-accent-light": light.accent,
        "--maestro-color-primary-dark": dark.primary,
        "--maestro-color-secondary-dark": dark.secondary,
        "--maestro-color-accent-dark": dark.accent,
        "--maestro-color-success": VISUAL_TOKEN_DEFAULTS.status.success,
        "--maestro-color-warning": VISUAL_TOKEN_DEFAULTS.status.warning,
        "--maestro-color-danger": VISUAL_TOKEN_DEFAULTS.status.danger,
        "--maestro-color-info": VISUAL_TOKEN_DEFAULTS.status.info,
        "--maestro-text-main": text.main,
        "--maestro-text-sub": text.sub,
        "--maestro-text-muted": text.muted,
        "--maestro-text-inverse": text.inverse,
        "--maestro-surface-page": surface.page,
        "--maestro-surface-card": surface.card,
        "--maestro-surface-elevated": surface.elevated,
        "--maestro-surface-muted": surface.muted,
        "--maestro-surface-hover": surface.hover,
        "--maestro-surface-overlay": surface.overlay,
        "--maestro-border-color": surface.border,
        "--maestro-state-success": VISUAL_TOKEN_DEFAULTS.status.success,
        "--maestro-state-warning": VISUAL_TOKEN_DEFAULTS.status.warning,
        "--maestro-state-danger": VISUAL_TOKEN_DEFAULTS.status.danger,
        "--maestro-state-info": VISUAL_TOKEN_DEFAULTS.status.info,
        "--maestro-space-1": "4px",
        "--maestro-space-2": "8px",
        "--maestro-space-3": "12px",
        "--maestro-space-4": "16px",
        "--maestro-space-5": "24px",
        "--maestro-space-6": "32px",
        "--maestro-radius-sm": "6px",
        "--maestro-radius-md": "8px",
        "--maestro-radius-lg": "12px",
        "--maestro-radius-xl": "20px",
        "--maestro-shadow-soft": VISUAL_TOKEN_DEFAULTS.shadow.soft,
        "--maestro-shadow-raised": VISUAL_TOKEN_DEFAULTS.shadow.raised,
        "--maestro-focus-ring": VISUAL_TOKEN_DEFAULTS.shadow.focus,
        "--primary": active.primary,
        "--secondary": active.secondary,
        "--accent": active.accent,
        "--success": VISUAL_TOKEN_DEFAULTS.status.success,
        "--warning": VISUAL_TOKEN_DEFAULTS.status.warning,
        "--danger": VISUAL_TOKEN_DEFAULTS.status.danger,
        "--info": VISUAL_TOKEN_DEFAULTS.status.info,
        "--text-main": text.main,
        "--text-sub": text.sub,
        "--text-muted": text.muted,
        "--text-light": text.inverse,
        "--bg-body": surface.page,
        "--bg-surface": surface.card,
        "--bg-hover": surface.hover,
        "--border": surface.border,
        "--form-bg": surface.card,
        "--bg-dark": VISUAL_TOKEN_DEFAULTS.surface.dark.page,
        "--card-dark": VISUAL_TOKEN_DEFAULTS.surface.dark.card,
        "--cor-voltar-alerta": VISUAL_TOKEN_DEFAULTS.status.danger
      }
    };
  }

  function safeCssVarName(name) {
    return /^--[A-Za-z0-9_-]+$/.test(String(name || ""));
  }

  function safeCssVarValue(value) {
    return String(value || "")
      .replace(/[{}<>;]/g, "")
      .trim();
  }

  function renderDynamicThemeCss(cssVars) {
    return Object.keys(cssVars || {})
      .filter(safeCssVarName)
      .map(name => `${name}: ${safeCssVarValue(cssVars[name])};`)
      .join("\n");
  }

  function ensureThemeStyleElement(doc) {
    let styleEl = doc.getElementById("maestro-dynamic-theme-vars");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "maestro-dynamic-theme-vars";
      styleEl.setAttribute("data-owner", "MaestroTheme");
      doc.head.appendChild(styleEl);
    }
    return styleEl;
  }

  function applyVisualTokens(themeConfig, options) {
    const tokens = buildVisualTokens(themeConfig, options || {});
    const doc = window.document;
    if (!doc) return tokens;

    const root = doc.documentElement;
    const cssVars = renderDynamicThemeCss(tokens.cssVars);
    if (cssVars) {
      const styleEl = ensureThemeStyleElement(doc);
      styleEl.textContent = `:root, body {\n${cssVars}\n}`;
    }

    if (root) {
      root.setAttribute("data-maestro-theme", tokens.mode);
    }

    if (doc.body) {
      doc.body.setAttribute("data-maestro-theme", tokens.mode);
      if (tokens.brand && tokens.brand.secretaria) {
        doc.body.setAttribute("data-maestro-secretaria", safeText(tokens.brand.secretaria).slice(0, 80));
      }
    }

    const metaThemeColor = doc.getElementById("meta-theme-color");
    if (metaThemeColor) metaThemeColor.content = tokens.active.primary;
    return tokens;
  }

  function getToken(kind) {
    if (kind === "operator") return getLocal("MAESTRO_TOKEN", "");
    if (kind === "student") return getLocal("MAESTRO_EST_TOKEN", "");
    return getLocal("MAESTRO_TOKEN", "") || getLocal("MAESTRO_EST_TOKEN", "");
  }

  function getTenantContext() {
    const stored = getJson(STORAGE_KEYS.tenantContext, {});
    return mergeDefined({
      tenantId: pickFirst(stored.tenantId, stored.tenantID, stored.tenant_id),
      clientUrl: pickFirst(stored.clientUrl, getLocal("MAESTRO_CLIENT_URL", ""), window.GAS_URL),
      cidade: pickFirst(stored.cidade, stored.cidadeAlvo),
      cepsValidos: toArray(stored.cepsValidos || stored.CEPS_VALIDOS),
      source: stored.source || "local"
    });
  }

  function setTenantContext(context) {
    const current = getTenantContext();
    const next = mergeDefined(current, {
      tenantId: pickFirst(context && context.tenantId, context && context.tenantID, context && context.tenant_id),
      clientUrl: pickFirst(context && context.clientUrl, context && context.url, context && context.LINK_PWA),
      cidade: pickFirst(context && context.cidade, context && context.CIDADE_ALVO),
      cepsValidos: toArray((context && (context.cepsValidos || context.CEPS_VALIDOS)) || current.cepsValidos),
      source: (context && context.source) || "runtime"
    });
    setJson(STORAGE_KEYS.tenantContext, next);
    return next;
  }

  function getSemesterContext() {
    const stored = getJson(STORAGE_KEYS.semesterContext, {});
    return mergeDefined({
      semestreId: pickFirst(stored.semestreId, stored.activeSemesterId, stored.semestreAtual),
      label: pickFirst(stored.label, stored.nome, stored.semestre),
      docsValidityMonths: toNumber(stored.docsValidityMonths, null),
      lgpdRetentionMonths: toNumber(stored.lgpdRetentionMonths, null),
      source: stored.source || "local"
    });
  }

  function setSemesterContext(context) {
    const next = adaptSemesterContext(context || {}, getSemesterContext());
    setJson(STORAGE_KEYS.semesterContext, next);
    return next;
  }

  function adaptSemesterContext(raw, fallback) {
    const source = raw || {};
    const current = fallback || {};
    return mergeDefined(current, {
      semestreId: pickFirst(source.semestreId, source.activeSemesterId, source.semestreAtual),
      label: pickFirst(source.label, source.nome, source.semestre),
      docsValidityMonths: toNumber(source.docsValidityMonths || source.MESES_VALIDADE_DOCS, current.docsValidityMonths),
      lgpdRetentionMonths: toNumber(source.lgpdRetentionMonths || source.MESES_RETENCAO_LGPD, current.lgpdRetentionMonths),
      source: source.source || "adapter"
    });
  }

  function getCurrentNavigationProfile() {
    const operatorToken = getLocal("MAESTRO_TOKEN", "");
    const operatorLevel = getLocal("MAESTRO_OPERADOR_NIVEL", "");
    if (
      operatorToken &&
      operatorToken !== "undefined" &&
      operatorToken !== "null" &&
      operatorLevel &&
      operatorLevel !== "undefined" &&
      operatorLevel !== "null"
    ) {
      return normalizeAccessProfile(operatorLevel);
    }

    const studentToken = getLocal("MAESTRO_EST_TOKEN", "");
    if (studentToken && studentToken !== "undefined" && studentToken !== "null") {
      return "ESTUDANTE";
    }

    return "ANONIMO";
  }

  function resolveNavigationProfile(profileOrSession) {
    if (!profileOrSession) return getCurrentNavigationProfile();
    if (typeof profileOrSession === "string") return normalizeAccessProfile(profileOrSession);
    return normalizeAccessProfile(pickFirst(
      profileOrSession.nivel,
      profileOrSession.perfil,
      profileOrSession.profile,
      profileOrSession.tipo,
      profileOrSession.role
    ));
  }

  function getNavigationConfig(profileOrSession) {
    const profile = resolveNavigationProfile(profileOrSession);
    return NAVIGATION_MATRIX[profile] || NAVIGATION_MATRIX.ANONIMO;
  }

  function uniqueNavigationList(values) {
    const seen = {};
    return (values || []).filter(item => {
      const key = safeString(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function getKnownNavigationViews() {
    let views = [];
    Object.keys(NAVIGATION_MATRIX).forEach(profile => {
      views = views.concat(NAVIGATION_MATRIX[profile].views || []);
    });
    return uniqueNavigationList(views);
  }

  function isKnownNavigationView(viewId) {
    return getKnownNavigationViews().includes(safeString(viewId));
  }

  function profileHasAction(profileOrSession, action) {
    const config = getNavigationConfig(profileOrSession);
    return (config.actions || []).includes(safeString(action));
  }

  function profileCanAccessView(profileOrSession, viewId) {
    const view = safeString(viewId);
    if (!view || !isKnownNavigationView(view)) return true;
    const config = getNavigationConfig(profileOrSession);
    return (config.views || []).includes(view);
  }

  function getDefaultViewForProfile(profileOrSession) {
    return getNavigationConfig(profileOrSession).defaultView || "view-hub";
  }

  function resolveViewAccess(viewId, profileOrSession) {
    const profile = resolveNavigationProfile(profileOrSession);
    const view = safeString(viewId);
    const allowed = profileCanAccessView(profile, view);
    return {
      allowed: allowed,
      profile: profile,
      viewId: view,
      fallback: allowed ? view : getDefaultViewForProfile(profile),
      reason: allowed ? "" : "Perfil sem acesso a view solicitada."
    };
  }

  function canExecuteNavigationAction(action, profileOrSession, options) {
    const allowed = profileHasAction(profileOrSession, action);
    if (!allowed && options && options.notify && typeof window.showToast === "function") {
      window.showToast("Seu perfil nao possui acesso a esta acao.", "warning");
    }
    return allowed;
  }

  function setNavigationElementVisible(element, visible) {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
    element.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible) {
      element.setAttribute("tabindex", "-1");
    } else if (element.getAttribute("tabindex") === "-1") {
      element.removeAttribute("tabindex");
    }
  }

  function applyNavigationVisibility(profileOrSession) {
    const profile = resolveNavigationProfile(profileOrSession);
    const config = getNavigationConfig(profile);
    const doc = window.document;
    if (!doc) return { profile: profile, visibleActions: config.actions || [], visibleViews: config.views || [] };

    doc.body.setAttribute("data-maestro-profile", profile.toLowerCase());

    Array.prototype.forEach.call(doc.querySelectorAll("[data-maestro-action]"), element => {
      const actions = safeString(element.getAttribute("data-maestro-action"))
        .split(/[,\s]+/)
        .filter(Boolean);
      const visible = actions.some(action => profileHasAction(profile, action));
      setNavigationElementVisible(element, visible);
    });

    Object.keys(NAVIGATION_MENU_GROUPS).forEach(groupId => {
      const group = doc.getElementById(groupId);
      if (!group) return;
      const actions = NAVIGATION_MENU_GROUPS[groupId] || [];
      const hasAction = actions.some(action => profileHasAction(profile, action));
      const hasVisibleChild = Array.prototype.some.call(
        group.querySelectorAll("[data-maestro-action]"),
        element => !element.classList.contains("hidden")
      );
      setNavigationElementVisible(group, hasAction && (hasVisibleChild || group.querySelectorAll("[data-maestro-action]").length === 0));
    });

    return {
      profile: profile,
      visibleActions: uniqueNavigationList(config.actions || []),
      visibleViews: uniqueNavigationList(config.views || [])
    };
  }

  function permissionsForProfile(profile) {
    const level = resolveNavigationProfile(profile || "ANONIMO");
    const isModerator = level === "MODERADOR";
    const isSupervisor = level === "SUPERVISOR";
    const isOperator = level === "OPERADOR";
    const isFiscal = level === "FISCAL";
    const isDriver = level === "MOTORISTA";
    return {
      canAccessAdmin: isModerator || isSupervisor || isOperator || isFiscal || isDriver,
      canAudit: profileHasAction(level, "auditoria"),
      canDashboard: profileHasAction(level, "dashboard"),
      canCommunicate: profileHasAction(level, "comunicacao"),
      canModerate: isModerator,
      canManageSemesters: profileHasAction(level, "semestres"),
      canUseMachineRoom: profileHasAction(level, "salaMaquinas"),
      canFiscalize: profileHasAction(level, "fiscalizar"),
      canDriveRoute: profileHasAction(level, "motoristaRotas"),
      canSuperviseMobility: profileHasAction(level, "gerirRotas") || profileHasAction(level, "encerrarRota"),
      profile: level
    };
  }

  function adaptOperatorSession(raw) {
    const source = raw || {};
    const nivel = normalizeUpper(pickFirst(
      source.nivel,
      source.nivelUsuario,
      source.perfil,
      getLocal("MAESTRO_OPERADOR_NIVEL", "")
    ));
    const session = mergeDefined({
      token: pickFirst(source.token, source.tokenSessao, getLocal("MAESTRO_TOKEN", "")),
      nome: pickFirst(source.nome, source.nomeOperador, getLocal("MAESTRO_OPERADOR_NOME", "")),
      email: pickFirst(source.email, source.identificador, getLocal("MAESTRO_OPERADOR_EMAIL", "")),
      perfil: nivel || "OPERADOR",
      nivel: nivel || "OPERADOR",
      tenantId: pickFirst(source.tenantId, getTenantContext().tenantId)
    });
    session.permissions = permissionsForProfile(session.nivel);
    return session;
  }

  function getOperatorSession() {
    const stored = getJson(STORAGE_KEYS.operatorSession, {});
    return adaptOperatorSession(stored);
  }

  function setOperatorSession(session) {
    const next = adaptOperatorSession(session || {});
    setJson(STORAGE_KEYS.operatorSession, next);
    markCacheDomain("session", { tenantId: next.tenantId, source: "operatorSession", key: STORAGE_KEYS.operatorSession });
    return next;
  }

  function adaptStudentIdentity(raw) {
    const source = raw || {};
    const cpf = cleanCpf(pickFirst(
      source.cpf,
      source.cpfAluno,
      source.CPF_ALUNO,
      source.documento,
      source.identidade && source.identidade.cpf
    ));
    const idCarteira = safeString(pickFirst(
      source.idCarteira,
      source.id_carteira,
      source.id,
      source.identificador,
      source.idAcesso,
      source.ID_CARTEIRA
    ));
    const turnos = uniqueArray(pickFirst(
      source.turnos,
      source.turno,
      source.TURNOS,
      source.TURNO,
      source.TURNOS_ALUNO,
      source.TURNO_ALUNO,
      source.dadosAcademicos && source.dadosAcademicos.turnos
    )).map(normalizeTurno).filter(Boolean);
    const estagioDetalhes = pickFirst(
      source.estagioDetalhes,
      source.estagio_detalhes,
      source.condicionais && source.condicionais.estagio_detalhes,
      {}
    );
    const estagioSource = mergeDefined(
      isObject(estagioDetalhes) ? estagioDetalhes : {},
      isObject(source.estagio) ? source.estagio : {}
    );
    const estagioFlag = isObject(source.estagio) ? "" : source.estagio;
    const estagioAtivo = estagioSource.ativo === true || normalizeSimNao(pickFirst(
      estagioSource.ativo,
      estagioSource.transporte,
      estagioFlag,
      source.estagioAtivo,
      source.ESTAGIO,
      source.transporteEstagio,
      source.ESTAGIO_ALUNO,
      source.TRANSPORTE_ESTAGIO,
      source.condicionais && source.condicionais.estagio,
      source.condicionais && source.condicionais.transporte_estagio
    )) === "Sim";

    return mergeDefined({
      cpf: cpf,
      cpfMascarado: pickFirst(source.cpfMascarado, source.cpf_mask, source.CPF_MASCARADO),
      idCarteira: idCarteira,
      firestoreId: pickFirst(source.firestoreId, source.docId, source.idFirestore),
      nome: pickFirst(source.nome, source.nomeAluno, source.NOME_ALUNO),
      email: pickFirst(source.email, source.EMAIL_ALUNO),
      turnos: turnos,
      instituicao: pickFirst(source.instituicao, source.INSTITUICAO, source.INSTITUICAO_ALUNO, source.INSTITUICAO_ENSINO),
      rota: pickFirst(source.rota, source.ROTA, source.ROTA_ALUNO),
      statusAtividade: pickFirst(source.statusAtividade, source.STATUS_ATIVIDADE),
      estagio: {
        ativo: estagioAtivo,
        tipoVinculo: pickFirst(estagioSource.tipoVinculo, estagioSource.tipo_vinculo, source.tipoVinculoEstagio, source.tipo_vinculo_estagio, source.TIPO_VINCULO_ESTAGIO, source.condicionais && source.condicionais.tipo_vinculo_estagio),
        inicio: pickFirst(estagioSource.inicio, source.inicioEstagio, source.inicio_estagio, source.INICIO_ESTAGIO, source.condicionais && source.condicionais.inicio_estagio),
        fim: pickFirst(estagioSource.fim, source.fimEstagio, source.fim_estagio, source.FIM_ESTAGIO, source.condicionais && source.condicionais.fim_estagio),
        empresaInstituicao: pickFirst(estagioSource.empresaInstituicao, estagioSource.empresa_instituicao, source.empresaInstituicaoEstagio, source.empresa_instituicao_estagio, source.EMPRESA_INSTITUICAO_ESTAGIO, source.EMPRESA_ESTAGIO, source.condicionais && source.condicionais.empresa_instituicao_estagio),
        transporte: normalizeSimNao(pickFirst(estagioSource.transporte, source.transporteEstagio, source.TRANSPORTE_ESTAGIO, source.condicionais && source.condicionais.transporte_estagio)),
        parada: pickFirst(estagioSource.parada, source.paradaEstagio, source.PARADA_ESTAGIO, source.rotaEstagio, source.ROTA_ESTAGIO, source.condicionais && source.condicionais.parada_estagio),
        turno: normalizeTurno(pickFirst(estagioSource.turno, source.turnoEstagio, source.TURNO_ESTAGIO, source.TURNO_ESTAGIO_ALUNO, source.condicionais && source.condicionais.turno_estagio)),
        declaracaoVinculo: pickFirst(estagioSource.declaracaoVinculo, estagioSource.declaracao_url, source.declaracaoVinculoEstagio, source.DECLARACAO_VINCULO_ESTAGIO, source.ANEXO_COMPROVANTE_ESTAGIO, source.anexos_drive && source.anexos_drive.declaracao_vinculo_estagio, source.anexos_drive && source.anexos_drive.comprovante_estagio),
        statusValidacao: pickFirst(estagioSource.statusValidacao, estagioSource.status_validacao, source.statusValidacaoEstagio, source.STATUS_VALIDACAO_ESTAGIO, source.condicionais && source.condicionais.status_validacao_estagio),
        alteracaoCiclo: pickFirst(estagioSource.alteracaoCiclo, estagioSource.alteracao_ciclo, source.alteracaoEstagioCiclo, source.ALTERACAO_ESTAGIO_CICLO, source.condicionais && source.condicionais.alteracao_estagio_ciclo, null)
      }
    });
  }

  function getStudentIdentity() {
    const stored = getJson(STORAGE_KEYS.studentIdentity, {});
    const wallet = getJson("MAESTRO_WALLET_CACHE", getJson("MAESTRO_OFFLINE_WALLET", {}));
    return adaptStudentIdentity(mergeDefined(wallet, stored));
  }

  function setStudentIdentity(identity) {
    const next = adaptStudentIdentity(identity || {});
    setJson(STORAGE_KEYS.studentIdentity, next);
    markCacheDomain("wallet", { source: "studentIdentity", key: STORAGE_KEYS.studentIdentity });
    return next;
  }

  function adaptThemeConfig(raw) {
    const source = raw || {};
    const ui = source.ui || source.UI || {};
    const pwa = source.pwa || source.PWA || {};
    const contato = source.contato || source.CONTATO || {};
    const config = source.config || source.CONFIG || {};

    const theme = {
      brand: {
        secretaria: pickFirst(ui.NOME_SECRETARIA, source.NOME_SECRETARIA),
        setor: pickFirst(ui.NOME_DO_SETOR, ui.NOME_SISTEMA, source.NOME_DO_SETOR),
        cidade: pickFirst(ui.CIDADE_ALVO, source.CIDADE_ALVO),
        abreviacao: pickFirst(ui.NOME_ABREV_SECRETARIA, source.NOME_ABREV_SECRETARIA),
        marcaDagua: pickFirst(ui.MARCA_DAGUA_SECRETARIA, source.MARCA_DAGUA_SECRETARIA),
        responsavel: pickFirst(ui.NOME_RESPONSAVEL, source.NOME_RESPONSAVEL),
        cpfResponsavel: cleanCpf(pickFirst(ui.CPF_RESPONSAVEL, source.CPF_RESPONSAVEL))
      },
      colors: {
        light: {
          primary: pickFirst(ui.COR_PRIMARIA_LIGHT, source.COR_PRIMARIA_LIGHT),
          secondary: pickFirst(ui.COR_SECUNDARIA_LIGHT, source.COR_SECUNDARIA_LIGHT),
          accent: pickFirst(ui.COR_DE_DESTAQUE_LIGHT, source.COR_DE_DESTAQUE_LIGHT)
        },
        dark: {
          primary: pickFirst(ui.COR_PRIMARIA_DARK, source.COR_PRIMARIA_DARK),
          secondary: pickFirst(ui.COR_SECUNDARIA_DARK, source.COR_SECUNDARIA_DARK),
          accent: pickFirst(ui.COR_DE_DESTAQUE_DARK, source.COR_DE_DESTAQUE_DARK)
        }
      },
      logos: {
        light: pickFirst(ui.LOGO_URL_LIGHT, ui.LOGO_LIGHT, source.LOGO_URL_LIGHT),
        dark: pickFirst(ui.LOGO_URL_DARK, ui.LOGO_DARK, source.LOGO_URL_DARK),
        emblem: pickFirst(pwa.EMBLEMA_PWA, ui.EMBLEMA_PWA, config.EMBLEMA_PWA, source.EMBLEMA_PWA),
        appIcon: pickFirst(pwa.ICONE_APP_PWA, pwa.ICONE, source.ICONE_APP_PWA)
      },
      pwa: {
        name: pickFirst(pwa.NOME_APP_PWA, pwa.NOME, source.NOME_APP_PWA),
        link: pickFirst(pwa.LINK_PWA, source.LINK_PWA),
        icon: pickFirst(pwa.ICONE_APP_PWA, pwa.ICONE, source.ICONE_APP_PWA)
      },
      contact: {
        email: pickFirst(contato.EMAIL_DE_CONTATO, contato.EMAIL, source.EMAIL_DE_CONTATO),
        endereco: pickFirst(contato["ENDERECO_FISICO"], contato["ENDERECO_F\u00cdSICO"], contato.ENDERECO, source["ENDERECO_F\u00cdSICO"]),
        cnpj: pickFirst(contato.CNPJ_SECRETARIA, contato.CNPJ, source.CNPJ_SECRETARIA)
      },
      rules: {
        cepsValidos: toArray(pickFirst(config.CEPS_VALIDOS, ui.CEPS_VALIDOS, source.CEPS_VALIDOS)),
        docsValidityMonths: toNumber(pickFirst(config.MESES_VALIDADE_DOCS, source.MESES_VALIDADE_DOCS), null),
        lgpdRetentionMonths: toNumber(pickFirst(config.MESES_RETENCAO_LGPD, source.MESES_RETENCAO_LGPD), null),
        muralWeeklyPostLimit: BUSINESS_RULES.muralWeeklyPostLimit,
        stageUpdateLimitPerCycle: BUSINESS_RULES.stageUpdateLimitPerCycle
      },
      firebase: source.firebase || source.FIREBASE || null,
      fuso: source.fuso || source.FUSO || null,
      raw: source
    };

    return theme;
  }

  function getThemeConfig() {
    return getJson(STORAGE_KEYS.themeConfig, {});
  }

  function setThemeConfig(config) {
    const next = adaptThemeConfig(config || {});
    setJson(STORAGE_KEYS.themeConfig, next);
    setTenantContext({
      cidade: next.brand && next.brand.cidade,
      cepsValidos: next.rules && next.rules.cepsValidos,
      source: "themeConfig"
    });
    setSemesterContext({
      docsValidityMonths: next.rules && next.rules.docsValidityMonths,
      lgpdRetentionMonths: next.rules && next.rules.lgpdRetentionMonths,
      source: "themeConfig"
    });
    markCacheDomain("theme", { tenantId: getTenantContext().tenantId, source: "themeConfig", key: STORAGE_KEYS.themeConfig });
    return next;
  }

  function adaptAuditStudent(raw) {
    const source = raw || {};
    const identity = adaptStudentIdentity(source);
    const documentosSource = source.documentos || source.anexos || source.anexos_drive || {};
    const documentos = mergeDefined(documentosSource, {
      FOTO: pickFirst(source.ANEXO_FOTO_3X4, documentosSource.foto_3x4, documentosSource.anexo_foto),
      DOCUMENTO: pickFirst(source.ANEXO_DOCUMENTO_FOTO, documentosSource.documento_foto),
      VINCULO: pickFirst(source.ANEXO_DECLARACAO_VINCULO, source.DECLARACAO_ALUNO, documentosSource.declaracao_vinculo, documentosSource.declaracao_aluno),
      RESIDENCIA: pickFirst(source.ANEXO_COMPROVANTE_RESIDENCIA, documentosSource.comprovante_residencia),
      ESTAGIO: pickFirst(identity.estagio && identity.estagio.declaracaoVinculo, source.ANEXO_COMPROVANTE_ESTAGIO, source.DECLARACAO_VINCULO_ESTAGIO, documentosSource.declaracao_vinculo_estagio, documentosSource.comprovante_estagio)
    });
    const turnosTexto = identity.turnos && identity.turnos.length
      ? identity.turnos.join(" + ")
      : pickFirst(source.turno, source.TURNOS_ALUNO, source.TURNO_ALUNO);
    const statusValidacao = pickFirst(source.statusAuditoria, source.statusValidacao, source.STATUS_VALIDACAO);

    return mergeDefined({
      id: pickFirst(source.id, source.firestoreId, source.docId, identity.cpf, identity.idCarteira),
      cpf: identity.cpf,
      cpfMascarado: pickFirst(source.cpfMascarado, identity.cpfMascarado),
      nome: identity.nome,
      email: identity.email,
      matricula: pickFirst(source.matricula, source.MATRICULA_ALUNO),
      instituicao: identity.instituicao,
      rota: identity.rota,
      turnos: identity.turnos,
      turno: turnosTexto,
      dias: pickFirst(source.dias, source.DIAS_ALUNO),
      semestreId: pickFirst(source.semestreId, source.semestreAtual, source.semestre),
      timestamp: pickFirst(source.timestamp, source.criadoEm, source.createdAt, source.metadados && source.metadados.criado_em, 0),
      statusAtividade: pickFirst(source.statusAtividade, source.STATUS_ATIVIDADE),
      statusDocs: pickFirst(source.statusDocs, source.STATUS_DOCS),
      statusOCR: pickFirst(source.statusOCR, source.STATUS_OCR),
      statusAuditoria: statusValidacao,
      statusValidacao: statusValidacao,
      observacoes: pickFirst(source.observacoes, source.obs, source.OBSERVACOES),
      documentos: documentos,
      estagio: identity.estagio,
      raw: source
    });
  }

  function normalizeCounterMap(value) {
    if (!value) return {};
    if (Array.isArray(value)) {
      return value.reduce((acc, item) => {
        if (Array.isArray(item) && item.length >= 2) {
          const key = safeString(item[0]);
          if (key) acc[key] = toNumber(item[1], 0);
          return acc;
        }
        if (isObject(item)) {
          const key = safeString(pickFirst(item.label, item.nome, item.name, item.key, item.valor));
          if (key) acc[key] = toNumber(pickFirst(item.value, item.total, item.count, item.quantidade, item.qtd), 0);
        }
        return acc;
      }, {});
    }
    return isObject(value) ? value : {};
  }

  function adaptDashboardDataMart(rawItems) {
    const items = Array.isArray(rawItems) ? rawItems : [];
    return items.map(item => {
      const source = item || {};
      return mergeDefined(source, {
        i: pickFirst(source.i, source.instituicao, source.INSTITUICAO_ALUNO, source.institution),
        t: pickFirst(source.t, source.turno, source.TURNOS_ALUNO, source.turnos),
        r: pickFirst(source.r, source.rota, source.ROTA_ALUNO),
        d: pickFirst(source.d, source.dias, source.DIAS_ALUNO)
      });
    });
  }

  function extractDashboardStatsSource(raw) {
    const source = raw || {};
    if (isObject(source.dashboardStats)) return source.dashboardStats;
    if (isObject(source.estatisticas)) return source.estatisticas;
    if (isObject(source.stats)) return source.stats;
    if (isObject(source.data) && (source.data.graficos || source.data.kpis || source.data.KPIS)) return source.data;
    return source;
  }

  function adaptDashboardStats(raw) {
    const envelope = raw || {};
    const stats = extractDashboardStatsSource(envelope);
    const graficos = stats.graficos || stats.charts || stats.GRAFICOS || {};
    const inclusao = graficos.inclusao || graficos.inclusaoSocial || {};
    const noturno = graficos.noturno || graficos.rotas23h || {};
    const kpis = stats.kpis || stats.KPIS || {};
    const consumo = stats.consumo || stats.quota || stats.quotas || {};

    return {
      sucesso: envelope.sucesso !== false,
      erro: envelope.erro || stats.erro || "",
      kpis: {
        total: toNumber(pickFirst(kpis.total, kpis.TOTAL), 0),
        ativos: toNumber(pickFirst(kpis.ativos, kpis.ATIVOS), 0),
        pendentes: toNumber(pickFirst(kpis.pendentes, kpis.PENDENTES), 0),
        retidos: toNumber(pickFirst(kpis.retidos, kpis.RETIDOS), 0),
        suspensos: toNumber(pickFirst(kpis.suspensos, kpis.inativos, kpis.SUSPENSOS, kpis.INATIVOS), 0)
      },
      graficos: {
        status: mergeDefined({
          "Ativos": 0,
          "Pendentes": 0,
          "Retidos (Humana)": 0,
          "Cancelados/Suspensos": 0
        }, normalizeCounterMap(graficos.status)),
        rotas: normalizeCounterMap(graficos.rotas),
        instituicoes: normalizeCounterMap(graficos.instituicoes || graficos.instituicao),
        dias: normalizeCounterMap(graficos.dias),
        turnos: normalizeCounterMap(graficos.turnos),
        inclusao: {
          pcd: normalizeCounterMap(inclusao.pcd),
          menor: normalizeCounterMap(inclusao.menor),
          acompanhado: normalizeCounterMap(inclusao.acompanhado),
          estagio: normalizeCounterMap(inclusao.estagio)
        },
        noturno: {
          adesao: normalizeCounterMap(noturno.adesao),
          bairros: normalizeCounterMap(noturno.bairros)
        }
      },
      consumo: consumo,
      dataMart: adaptDashboardDataMart(pickFirst(stats.dataMart, stats.datamart, stats.data_mart, stats.bi, [])),
      filtrosDisponiveis: stats.filtrosDisponiveis || stats.filtros || {},
      atualizadoEm: pickFirst(stats.atualizadoEm, stats.updatedAt, stats.ultimaAtualizacao, envelope.atualizadoEm),
      semestreId: pickFirst(stats.semestreId, stats.semestreAtual, stats.semestre, envelope.semestreId),
      origem: stats.origem || envelope.origem || "network",
      raw: stats
    };
  }

  function adaptDocumentFile(raw) {
    const source = raw || {};
    return mergeDefined({
      sucesso: source.sucesso !== false,
      mimeType: pickFirst(source.mimeType, source.tipoMime, "application/pdf"),
      fileName: pickFirst(source.fileName, source.arquivoNome, source.nome),
      base64: pickFirst(source.base64, source.arquivoBase64, source.fotoBase64),
      storageUrl: pickFirst(source.storageUrl, source.url, source.downloadUrl),
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptTrip(raw) {
    const source = raw || {};
    return mergeDefined({
      id: pickFirst(source.id, source.idViagem),
      idOnibus: pickFirst(source.idOnibus, source.onibusId, source.placa),
      rota: pickFirst(source.rota, source.nomeRota),
      horario: pickFirst(source.horario, source.hora),
      turno: normalizeUpper(pickFirst(source.turno, source.TURNO)),
      placa: pickFirst(source.placa, source.idOnibus),
      vagasRestantes: toNumber(source.vagasRestantes, null),
      statusOperacao: pickFirst(source.statusOperacao, source.status),
      estadoRadar: pickFirst(source.estadoRadar, source.radar),
      paradas: Array.isArray(source.paradas) ? source.paradas : [],
      geojsonUrl: pickFirst(source.geojson_url, source.geojsonUrl),
      guiaAtivo: source.guiaAtivo || null,
      atualizadoEm: pickFirst(source.atualizadoEm, source.updatedAt),
      raw: source
    });
  }

  function adaptMuralMessage(raw, currentStudentId) {
    const source = raw || {};
    const ups = Array.isArray(source.arrayUpsInfo) ? source.arrayUpsInfo : [];
    const downs = Array.isArray(source.arrayDownsInfo) ? source.arrayDownsInfo : [];
    const identity = getStudentIdentity();
    const actorIds = uniqueArray([currentStudentId, identity.idCarteira, identity.cpf].filter(Boolean));
    const upsNormalizados = ups.map(item => normalizeUpper(item));
    const downsNormalizados = downs.map(item => normalizeUpper(item));
    const votouUp = actorIds.some(id => upsNormalizados.includes(normalizeUpper(id)));
    const votouDown = actorIds.some(id => downsNormalizados.includes(normalizeUpper(id)));
    return mergeDefined({
      id: pickFirst(source.id, source.idMensagem),
      autorId: pickFirst(source.autorId, source.idEstudante),
      autorNome: pickFirst(source.autor, source.nomeEstudante, source.autorNome),
      categoria: pickFirst(source.categoria, "geral"),
      mensagem: pickFirst(source.mensagem, source.texto),
      votosUp: toNumber(source.votosUp, ups.length || 0),
      votosDown: toNumber(source.votosDown, downs.length || 0),
      pontuacao: toNumber(source.pontuacao, 0),
      meuVoto: votouUp ? "up" : votouDown ? "down" : "",
      statusModeracao: pickFirst(source.statusModeracao, source.status, "PUBLICADO"),
      criadoEm: pickFirst(source.tsMensagem, source.criadoEm, source.createdAt),
      raw: source
    });
  }

  function adaptMuralFeed(raw, currentStudentId) {
    const source = Array.isArray(raw) ? { sucesso: true, mensagens: raw } : (raw || {});
    const mensagensRaw = Array.isArray(source.mensagens)
      ? source.mensagens
      : (Array.isArray(source.data) ? source.data : []);
    const limiteSemanal = toNumber(pickFirst(
      source.limiteSemanal,
      source.limitePostagensSemanais,
      source.limite_semanal,
      BUSINESS_RULES.muralWeeklyPostLimit
    ), BUSINESS_RULES.muralWeeklyPostLimit);

    return mergeDefined({
      sucesso: source.sucesso !== false,
      mensagens: mensagensRaw.map(item => adaptMuralMessage(item, currentStudentId)),
      limiteSemanal: limiteSemanal,
      limitePostagensSemanais: limiteSemanal,
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptAvisoAtivo(raw) {
    const source = raw || {};
    const mensagem = pickFirst(source.assunto, source.mensagem, source.texto, source.ASSUNTO_PRINCIPAL);

    return mergeDefined({
      id: pickFirst(source.id, source.idAviso, source.ID_AVISO, source.titulo),
      tipo: safeText(pickFirst(source.tipo, source.tipoAviso, source.ASSUNTO_TIPO, "Geral"), "Geral"),
      titulo: safeText(pickFirst(source.titulo, source.ASSUNTO_TITULO), ""),
      assunto: safeText(mensagem, ""),
      mensagem: safeText(mensagem, ""),
      imagem: safeUrl(pickFirst(source.imagem, source.imagemUrl, source.ASSUNTO_IMAGEM)),
      anexo: safeUrl(pickFirst(source.anexo, source.anexoUrl, source.ASSUNTO_ANEXO)),
      validade: pickFirst(source.validade, source.validadeAviso, source.ASSUNTO_VALIDADE),
      statusPush: pickFirst(source.statusPush, source.ASSUNTO_STATUS_PUSH, source.STATUS_PUSH),
      raw: source
    });
  }

  function adaptAvisosAtivos(raw) {
    const source = Array.isArray(raw) ? { sucesso: true, avisos: raw } : (raw || {});
    const avisosRaw = Array.isArray(source.avisos)
      ? source.avisos
      : (Array.isArray(source.dados) ? source.dados : (Array.isArray(source.data) ? source.data : []));

    return mergeDefined({
      sucesso: source.sucesso !== false,
      avisos: avisosRaw.map(adaptAvisoAtivo).filter(aviso => aviso.titulo || aviso.assunto),
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptPushFilters(raw) {
    const source = raw || {};
    const filtros = source.filtros || source.data || source;

    return mergeDefined({
      sucesso: source.sucesso !== false,
      filtros: {
        rotas: uniqueArray(filtros.rotas || filtros.rotasDisponiveis || []),
        turnos: uniqueArray(filtros.turnos || filtros.turnosDisponiveis || []),
        instituicoes: uniqueArray(filtros.instituicoes || filtros.instituicoesDisponiveis || filtros.instituicoesEnsino || [])
      },
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptPushResult(raw) {
    const source = raw || {};
    const push = source.push || {};

    return mergeDefined({
      sucesso: source.sucesso !== false,
      enviados: toNumber(pickFirst(source.enviados, push.enviados, source.totalEnviados), 0),
      falhas: toNumber(pickFirst(source.falhas, push.falhas, source.totalFalhas), 0),
      msg: pickFirst(source.msg, source.mensagem, push.mensagem),
      erro: source.erro || push.erro || "",
      raw: source
    });
  }

  function minutesFromClock(value) {
    const parts = safeString(value).split(":");
    if (parts.length < 2) return null;
    const hours = toNumber(parts[0], null);
    const minutes = toNumber(parts[1], null);
    if (hours === null || minutes === null) return null;
    return (hours * 60) + minutes;
  }

  function getCurrentClockMinutes(now) {
    const date = now instanceof Date ? now : new Date();
    return (date.getHours() * 60) + date.getMinutes();
  }

  function activeTurnoForClock(clockMinutes) {
    const windows = BUSINESS_RULES.walletTurnWindows;
    return Object.keys(windows).find(turno => {
      const start = minutesFromClock(windows[turno].start);
      const end = minutesFromClock(windows[turno].end);
      return start !== null && end !== null && clockMinutes >= start && clockMinutes <= end;
    }) || "";
  }

  function adaptWalletVisualState(student, now, options) {
    const identity = adaptStudentIdentity(student || getStudentIdentity());
    const opts = options || {};
    const declaredTurnos = uniqueArray(identity.turnos).map(normalizeTurno).filter(Boolean);
    const activeTurno = activeTurnoForClock(getCurrentClockMinutes(now));
    const hasActiveTurno = activeTurno && declaredTurnos.includes(activeTurno);
    const status = normalizeUpper(identity.statusAtividade);
    const blocked = ["BLOQUEADO", "EXPIRADO", "INATIVO", "REPROVADO", "INDEFERIDO", "SUSPENSO", "CANCELADO"].includes(status);
    const pending = ["PENDENTE", "ANALISE", "ANALISE_HUMANA", "EM_ANALISE", "AGUARDANDO", "AGUARDANDO_EMISSAO"].includes(status);
    const estagio = identity.estagio || {};
    const isEstagioActive = estagio.ativo === true && (!estagio.statusValidacao || normalizeUpper(estagio.statusValidacao) !== "RECUSADO");
    const offline = opts.offline === true || opts.mode === "offline";

    let backgroundToken = "wallet.neutral";
    let badgeLabel = "Fora do horario do turno";
    let reason = "Carteira acessada fora das janelas declaradas.";
    let stateClass = "wallet-state-neutral";
    let qrLabel = "FORA DO HORARIO DO TURNO";
    let canEmbark = false;

    if (offline) {
      backgroundToken = "wallet.offline";
      badgeLabel = "Modo offline";
      reason = "Carteira exibida a partir do cache local.";
      stateClass = "wallet-state-offline";
      qrLabel = "ACESSO OFFLINE LIMITADO";
    } else if (blocked) {
      backgroundToken = "wallet.blocked";
      badgeLabel = "Carteira indisponivel";
      reason = "Status do estudante impede o uso normal da carteira.";
      stateClass = "wallet-state-blocked";
      qrLabel = "CARTEIRA INDISPONIVEL PARA EMBARQUE";
    } else if (pending) {
      backgroundToken = "wallet.pending";
      badgeLabel = "Cadastro em analise";
      reason = "Status do estudante requer validacao antes do uso pleno.";
      stateClass = "wallet-state-pending";
      qrLabel = "CADASTRO EM ANALISE";
    } else if (isEstagioActive) {
      backgroundToken = "wallet.estagio";
      badgeLabel = "Estagio ativo";
      reason = "Estudante possui vinculo de estagio ativo ou em analise.";
      stateClass = "wallet-state-estagio";
      qrLabel = "VALIDO PARA ESTAGIO";
      canEmbark = true;
    } else if (hasActiveTurno && declaredTurnos.length > 1) {
      backgroundToken = "wallet.multiTurno";
      badgeLabel = "Turno " + activeTurno.toLowerCase() + " ativo";
      reason = "Estudante possui multiplos turnos e esta em uma janela autorizada.";
      stateClass = "wallet-state-multi";
      qrLabel = "VALIDO PARA EMBARQUE AGORA";
      canEmbark = true;
    } else if (hasActiveTurno) {
      backgroundToken = "wallet." + activeTurno.toLowerCase();
      badgeLabel = "Turno " + activeTurno.toLowerCase() + " ativo";
      reason = "Carteira acessada dentro do horario declarado.";
      stateClass = "wallet-state-" + activeTurno.toLowerCase();
      qrLabel = "VALIDO PARA EMBARQUE AGORA";
      canEmbark = true;
    } else if (declaredTurnos.length > 1) {
      badgeLabel = "Fora dos turnos";
      reason = "Estudante possui mais de um turno, mas nenhum esta ativo agora.";
    }

    return {
      activeTurnos: hasActiveTurno ? [activeTurno] : [],
      declaredTurnos: declaredTurnos,
      currentTurno: activeTurno,
      isWithinDeclaredTurno: Boolean(hasActiveTurno),
      isEstagioActive: Boolean(isEstagioActive),
      isOffline: Boolean(offline),
      isBlocked: Boolean(blocked),
      isPending: Boolean(pending),
      canEmbark: Boolean(canEmbark),
      backgroundToken: opts.backgroundToken || backgroundToken,
      badgeLabel: badgeLabel,
      reason: reason,
      stateClass: opts.stateClass || stateClass,
      qrLabel: qrLabel,
      status: status || "ATIVO"
    };
  }

  function normalizeApiError(raw, action) {
    const status = toNumber(raw && raw.status, 0);
    const message = safeMessage((raw && (raw.erro || raw.error || raw.mensagem)) || "Erro desconhecido.");
    let code = "unknown_error";
    if (status === 401 || /sess/i.test(message)) code = "session_expired";
    else if (status === 403 || /permiss/i.test(message)) code = "forbidden";
    else if (/tenant/i.test(message)) code = "tenant_missing";
    else if (/payload|tamanho|large/i.test(message)) code = "payload_too_large";
    else if (/valid/i.test(message)) code = "validation_error";
    return {
      code: code,
      message: message,
      status: status || 500,
      action: action || "",
      raw: raw || null
    };
  }

  function normalizeApiResult(raw, action) {
    const defaultStatus = raw ? (raw.sucesso === false ? 500 : 200) : 500;
    const status = toNumber(raw && raw.status, defaultStatus);
    const ok = raw && raw.sucesso !== false && status < 400;
    if (!ok) {
      return {
        ok: false,
        data: null,
        error: normalizeApiError(raw, action),
        status: status || 500,
        raw: raw || null
      };
    }
    return {
      ok: true,
      data: raw && raw.dados !== undefined ? raw.dados : raw && raw.data !== undefined ? raw.data : raw,
      error: null,
      status: status || 200,
      raw: raw
    };
  }

  async function apiClientCall(action, payload, options) {
    const opts = options || {};
    const builder = typeof opts.builder === "function" ? opts.builder : null;
    const finalPayload = builder ? builder(payload || {}) : (payload || {});

    if (typeof window.apiCall !== "function") {
      return normalizeApiResult({
        sucesso: false,
        status: 500,
        erro: "apiCall nao esta disponivel no bundle atual."
      }, action);
    }

    try {
      const raw = await window.apiCall(action, finalPayload);
      const normalized = normalizeApiResult(raw, action);
      if (typeof opts.adapter === "function" && normalized.ok) {
        normalized.data = opts.adapter(normalized.data);
      }
      return normalized;
    } catch (err) {
      return normalizeApiResult({
        sucesso: false,
        status: 0,
        erro: err && err.message ? err.message : "Falha de rede."
      }, action);
    }
  }

  function buildBasePayload(payload) {
    const tenant = getTenantContext();
    return mergeDefined({
      tenantId: tenant.tenantId || ""
    }, payload || {});
  }

  function buildPublicPayload(payload) {
    return mergeDefined(buildBasePayload(payload), {
      origemFrontend: "PUBLICO"
    });
  }

  function buildStudentPayload(payload) {
    const identity = getStudentIdentity();
    return mergeDefined(buildBasePayload(payload), {
      cpf: (payload && payload.cpf) || identity.cpf,
      idCarteira: identity.idCarteira,
      idEstudante: (payload && payload.idEstudante) || identity.idCarteira || identity.cpf,
      estudante: identity
    });
  }

  function buildOperatorPayload(payload) {
    const session = getOperatorSession();
    return mergeDefined(buildBasePayload(payload), {
      usuarioLogadoId: (payload && payload.usuarioLogadoId) || session.email,
      nivelUsuario: session.nivel,
      tipoUsuario: "OPERADOR",
      operador: {
        nome: session.nome,
        email: session.email,
        nivel: session.nivel
      }
    });
  }

  function buildSemesterPayload(payload) {
    const semester = getSemesterContext();
    return mergeDefined(buildBasePayload(payload), {
      semestreId: (payload && payload.semestreId) || semester.semestreId
    });
  }

  function buildMobilityPayload(payload) {
    const identity = getStudentIdentity();
    const session = getOperatorSession();
    return mergeDefined(buildBasePayload(payload), {
      idEstudante: (payload && payload.idEstudante) || identity.idCarteira || identity.cpf,
      usuarioLogadoId: (payload && payload.usuarioLogadoId) || session.email || identity.idCarteira || identity.cpf
    });
  }

  function buildDocumentPayload(payload) {
    const identity = getStudentIdentity();
    const semester = getSemesterContext();
    return mergeDefined(buildBasePayload(payload), {
      cpf: cleanCpf((payload && payload.cpf) || identity.cpf),
      semestreId: (payload && payload.semestreId) || semester.semestreId
    });
  }

  function buildStageUpdatePayload(payload) {
    const identity = getStudentIdentity();
    const semester = getSemesterContext();
    const source = payload || {};
    return mergeDefined(buildBasePayload(source), {
      cpf: cleanCpf(source.cpf || identity.cpf),
      idCarteira: source.idCarteira || identity.idCarteira,
      semestreId: source.semestreId || semester.semestreId,
      tipoVinculoEstagio: source.tipoVinculoEstagio,
      inicioEstagio: source.inicioEstagio,
      fimEstagio: source.fimEstagio,
      empresaInstituicaoEstagio: source.empresaInstituicaoEstagio,
      transporteEstagio: source.transporteEstagio,
      paradaEstagio: source.paradaEstagio,
      turnoEstagio: source.turnoEstagio,
      declaracaoVinculoEstagio: source.declaracaoVinculoEstagio,
      estagio: mergeDefined({
        tipoVinculoEstagio: source.tipoVinculoEstagio,
        inicioEstagio: source.inicioEstagio,
        fimEstagio: source.fimEstagio,
        empresaInstituicaoEstagio: source.empresaInstituicaoEstagio,
        transporteEstagio: source.transporteEstagio,
        paradaEstagio: source.paradaEstagio,
        turnoEstagio: source.turnoEstagio,
        declaracaoVinculoEstagio: source.declaracaoVinculoEstagio
      }, source.estagio || {})
    });
  }

  function buildMuralPostPayload(payload) {
    const identity = getStudentIdentity();
    const source = payload || {};
    const idEstudante = safeText(source.cpf || identity.cpf || source.idEstudante || source.usuarioLogadoId || identity.idCarteira, "");
    const mensagem = safeText(source.mensagem, "").slice(0, 280);

    return mergeDefined(buildStudentPayload(source), {
      idEstudante: idEstudante,
      usuarioLogadoId: source.usuarioLogadoId || idEstudante,
      nomeEstudante: safeText(source.nomeEstudante || identity.nome, "Estudante"),
      categoria: safeText(source.categoria, "Duvida Geral"),
      mensagem: mensagem,
      limiteSemanal: BUSINESS_RULES.muralWeeklyPostLimit
    });
  }

  function buildMuralVotePayload(payload) {
    const identity = getStudentIdentity();
    const source = payload || {};
    const idEstudante = safeText(source.cpf || identity.cpf || source.idEstudante || source.usuarioLogadoId || identity.idCarteira, "");

    return mergeDefined(buildStudentPayload(source), {
      idEstudante: idEstudante,
      usuarioLogadoId: source.usuarioLogadoId || idEstudante,
      idMensagem: safeText(source.idMensagem, ""),
      tipoVoto: normalizeUpper(source.tipoVoto || source.voto)
    });
  }

  function buildPushTokenPayload(payload) {
    const identity = getStudentIdentity();
    const source = payload || {};
    const cpf = cleanCpf(source.cpf || source.idEstudante || source.idAluno || identity.cpf);
    const token = safeText(source.pushToken || source.tokenDispositivo || source.token, "");

    return mergeDefined(buildStudentPayload(source), {
      cpf: cpf,
      idEstudante: cpf || source.idEstudante || identity.idCarteira,
      pushToken: token,
      tokenDispositivo: token
    });
  }

  function buildAvisoPublicoPayload(payload) {
    const session = getOperatorSession();
    const source = payload || {};
    const validadeAviso = source.validadeAviso || source.validade || source.ASSUNTO_VALIDADE || "";

    return mergeDefined(buildOperatorPayload(source), {
      tipoAviso: safeText(source.tipoAviso || source.tipo, "Geral"),
      titulo: safeText(source.titulo, "").slice(0, 120),
      mensagem: safeText(source.mensagem, "").slice(0, 700),
      validade: validadeAviso,
      validadeAviso: validadeAviso,
      ASSUNTO_VALIDADE: validadeAviso,
      enviarPush: source.enviarPush !== false,
      operadorNome: safeText(source.operadorNome || session.nome, "Secretaria"),
      operadorCargo: safeText(source.operadorCargo || session.nivel, "Operador")
    });
  }

  function buildPushSegmentadoPayload(payload) {
    const session = getOperatorSession();
    const source = payload || {};

    return mergeDefined(buildOperatorPayload(source), {
      titulo: safeText(source.titulo, "").slice(0, 120),
      mensagem: safeText(source.mensagem, "").slice(0, 700),
      rota: safeText(source.rota, "TODAS"),
      turno: safeText(source.turno, "TODOS"),
      instituicao: safeText(source.instituicao, "TODAS"),
      operadorNome: safeText(source.operadorNome || session.nome, "Secretaria"),
      operadorCargo: safeText(source.operadorCargo || session.nivel, "Operador")
    });
  }

  const storage = {
    keys: STORAGE_KEYS,
    domains: CACHE_DOMAINS,
    schemaVersion: CACHE_SCHEMA_VERSION,
    getJson: getJson,
    setJson: setJson,
    remove: removeLocal,
    getMeta: getCacheMetaRoot,
    getDomainMeta: getCacheDomainMeta,
    markDomain: markCacheDomain,
    isDomainFresh: isCacheDomainFresh,
    invalidateDomain: invalidateCacheDomain,
    ensureSchemaVersion: ensureStorageSchemaVersion
  };

  const storageState = ensureStorageSchemaVersion();

  const safeRender = {
    escapeHTML: escapeHTML,
    text: safeText,
    message: safeMessage,
    attr: safeAttr,
    url: safeUrl,
    urlAttr: safeUrlAttr,
    lines: safeLines,
    domId: safeDomId,
    jsStringAttr: safeJsStringAttr,
    setText: setSafeText,
    setHTML: setSafeHTML
  };

  const themeTokens = {
    defaults: VISUAL_TOKEN_DEFAULTS,
    build: buildVisualTokens,
    apply: applyVisualTokens,
    sanitizeColor: sanitizeCssColor
  };

  const navigation = {
    matrix: NAVIGATION_MATRIX,
    menuGroups: NAVIGATION_MENU_GROUPS,
    normalizeProfile: normalizeAccessProfile,
    getCurrentProfile: getCurrentNavigationProfile,
    getConfig: getNavigationConfig,
    getDefaultView: getDefaultViewForProfile,
    getKnownViews: getKnownNavigationViews,
    isKnownView: isKnownNavigationView,
    canAccessView: profileCanAccessView,
    resolveViewAccess: resolveViewAccess,
    hasAction: profileHasAction,
    canExecuteAction: canExecuteNavigationAction,
    applyVisibility: applyNavigationVisibility,
    permissionsForProfile: permissionsForProfile
  };

  const adapters = {
    themeConfig: adaptThemeConfig,
    studentIdentity: adaptStudentIdentity,
    operatorSession: adaptOperatorSession,
    semesterContext: function adaptSemester(raw) { return adaptSemesterContext(raw || {}, {}); },
    auditStudent: adaptAuditStudent,
    dashboardStats: adaptDashboardStats,
    documentFile: adaptDocumentFile,
    trip: adaptTrip,
    muralMessage: adaptMuralMessage,
    muralFeed: adaptMuralFeed,
    avisoAtivo: adaptAvisoAtivo,
    avisosAtivos: adaptAvisosAtivos,
    pushFilters: adaptPushFilters,
    pushResult: adaptPushResult,
    walletVisualState: adaptWalletVisualState,
    apiResult: normalizeApiResult,
    apiError: normalizeApiError
  };

  const payloadBuilders = {
    base: buildBasePayload,
    publico: buildPublicPayload,
    estudante: buildStudentPayload,
    operador: buildOperatorPayload,
    semestre: buildSemesterPayload,
    mobilidade: buildMobilityPayload,
    documento: buildDocumentPayload,
    atualizacaoEstagio: buildStageUpdatePayload,
    muralPost: buildMuralPostPayload,
    muralVote: buildMuralVotePayload,
    pushToken: buildPushTokenPayload,
    avisoPublico: buildAvisoPublicoPayload,
    pushSegmentado: buildPushSegmentadoPayload
  };

  const contexts = {
    tenant: { get: getTenantContext, set: setTenantContext },
    theme: { get: getThemeConfig, set: setThemeConfig },
    student: { get: getStudentIdentity, set: setStudentIdentity, clear: function clearStudent() { removeLocal(STORAGE_KEYS.studentIdentity); invalidateCacheDomain("wallet"); return true; } },
    operator: { get: getOperatorSession, set: setOperatorSession, clear: function clearOperator() { removeLocal(STORAGE_KEYS.operatorSession); invalidateCacheDomain("session"); return true; } },
    semester: { get: getSemesterContext, set: setSemesterContext }
  };

  const apiClient = {
    call: apiClientCall,
    rawCall: function rawCall(action, payload) {
      if (typeof window.apiCall !== "function") {
        return Promise.resolve({ sucesso: false, erro: "apiCall nao esta disponivel no bundle atual." });
      }
      return window.apiCall(action, payload || {});
    },
    normalizeResult: normalizeApiResult,
    normalizeError: normalizeApiError,
    getToken: getToken
  };

  window.MaestroData = {
    version: DATA_LAYER_VERSION,
    rules: BUSINESS_RULES,
    apiClient: apiClient,
    contexts: contexts,
    payloadBuilders: payloadBuilders,
    adapters: adapters,
    safeRender: safeRender,
    themeTokens: themeTokens,
    navigation: navigation,
    storage: storage,
    storageState: storageState,
    utils: {
      cleanCpf: cleanCpf,
      escapeHTML: escapeHTML,
      safeText: safeText,
      safeMessage: safeMessage,
      safeAttr: safeAttr,
      safeUrl: safeUrl,
      sanitizeCssColor: sanitizeCssColor,
      normalizeAccessProfile: normalizeAccessProfile,
      normalizeTurno: normalizeTurno,
      normalizeUpper: normalizeUpper,
      normalizeSimNao: normalizeSimNao,
      toArray: toArray,
      pickFirst: pickFirst,
      pickPath: pickPath,
      mergeDefined: mergeDefined
    }
  };

  window.MaestroAPI = apiClient;
  window.MaestroSafeRender = safeRender;
  window.MaestroTheme = themeTokens;
  window.MaestroNavigation = navigation;
  window.aplicarTokensVisuaisMaestro = applyVisualTokens;
  window.aplicarNavegacaoMaestro = applyNavigationVisibility;
  window.podeAcessarViewMaestro = function podeAcessarViewMaestro(viewId, profile) {
    return profileCanAccessView(profile, viewId);
  };
  window.podeExecutarAcaoMaestro = function podeExecutarAcaoMaestro(action, options) {
    return canExecuteNavigationAction(action, null, options || {});
  };
  window.obterViewInicialMaestro = getDefaultViewForProfile;
  window.escapeHTMLMaestro = escapeHTML;
  window.safeTextMaestro = safeText;
  window.safeMessageMaestro = safeMessage;
  window.safeAttrMaestro = safeAttr;
  window.safeUrlMaestro = safeUrl;
  window.safeUrlAttrMaestro = safeUrlAttr;
  window.safeLinesMaestro = safeLines;
  window.safeDomIdMaestro = safeDomId;
  window.safeJsStringAttrMaestro = safeJsStringAttr;
})(window);


// 2. Módulos do Estudante
// ========================================================================
// 8. FLUXO DA CARTEIRA DIGITAL (COFRE OFFLINE-FIRST)
// ========================================================================
let currentWalletId = "";
let currentWalletSenha = "";
let currentStudentName = "";
let clockInterval = null;
let walletVisualInterval = null;
let timeoutSessaoEstudanteID = null;
let walletStageUpdateFile = null;
let walletStageUpdateSubmitting = false;

function triggerVibration(ms) {
    if ("vibrate" in navigator) {
        navigator.vibrate(ms);
    }
}

function restaurarSessaoEstudante() {
    const token = localStorage.getItem("MAESTRO_EST_TOKEN");
    const cachedDataRaw = localStorage.getItem("MAESTRO_OFFLINE_WALLET") || localStorage.getItem("MAESTRO_WALLET_CACHE");
    const credsRaw = localStorage.getItem("MAESTRO_WALLET_CREDS");

    if (token && cachedDataRaw && credsRaw) {
        try {
            const dados = JSON.parse(cachedDataRaw);
            const creds = JSON.parse(credsRaw);
            currentWalletId = dados.idCarteira;
            currentWalletSenha = creds.senha;
            currentStudentName = dados.nome;
            if (typeof sincronizarStudentIdentityMaestro === 'function') sincronizarStudentIdentityMaestro(dados, creds.id);
            armarRelogioSessaoEstudante();
            abrirTelaCofreOuEntrarDireto();
        } catch (e) {
            console.warn("Erro ao restaurar sessão de estudante na RAM.");
        }
    }
}

function abrirTelaCofreOuEntrarDireto() {
    if (currentWalletId && localStorage.getItem("MAESTRO_EST_TOKEN")) {
        const cachedDataRaw = localStorage.getItem("MAESTRO_OFFLINE_WALLET") || localStorage.getItem("MAESTRO_WALLET_CACHE");
        if (cachedDataRaw) {
            const dados = JSON.parse(cachedDataRaw);
            if (dados.themePrimary || localStorage.getItem('MAESTRO_PREF_OFFLINE') === 'true' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
                renderizarCarteiraOffline(dados);
            } else {
                renderizarCarteira(dados);
            }
            switchView('view-wallet');
            return;
        }
    }
    switchView('view-login');
}

document.addEventListener("DOMContentLoaded", () => {
    const btnCarteira = document.querySelector("button.menu-card.primary-card[onclick*='view-login']");
    if (btnCarteira) btnCarteira.onclick = abrirTelaCofreOuEntrarDireto;
});

function mostrarSkeletonWallet() {
    const container = document.getElementById('wallet-container');
    const actions = document.getElementById('wallet-actions');
    if (actions) actions.classList.add('hidden');

    container.innerHTML = `
    <div class="wallet-card">
        <div class="wallet-header skeleton-box wallet-skeleton-header">IDENTIDADE UNIVERSITARIA</div>
        <div class="wallet-body">
            <div class="wallet-photo skeleton-box"></div>
            <div class="wallet-info wallet-info-full">
                <div class="skeleton-box wallet-skeleton-line wallet-skeleton-w-60"></div>
                <div class="skeleton-box wallet-skeleton-line-title"></div>
                
                <div class="skeleton-box wallet-skeleton-line wallet-skeleton-w-40"></div>
                <div class="skeleton-box wallet-skeleton-line wallet-skeleton-w-70"></div>
                
                <div class="skeleton-box wallet-skeleton-line wallet-skeleton-w-50"></div>
                <div class="skeleton-box wallet-skeleton-line wallet-skeleton-w-60"></div>
            </div>
        </div>
        <div class="text-center wallet-qr-zone">
            <div class="skeleton-box wallet-skeleton-qr"></div>
        </div>
    </div>`;
}
async function loginCarteira() {
  const id = document.getElementById('login-id').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const btn = document.getElementById('btn-login');
  const resBox = document.getElementById('res-login');

  if (!id || !senha) {
    resBox.innerText = "Preencha o ID e a Senha.";
    resBox.classList.remove('hidden');
    return;
  }

  btn.innerText = "A AUTENTICAR...";
  btn.disabled = true;
  resBox.classList.add('hidden');

  try {
    const res = await apiCall("autenticarCarteiraDigital", { id: id, senha: senha });
    btn.innerText = "ENTRAR NO COFRE";
    btn.disabled = false;

    if (res.erro) {
      resBox.innerText = res.erro;
      resBox.classList.remove('hidden');
    } else if (res.sucesso) {
      currentWalletId = id;
      currentWalletSenha = senha;
      currentStudentName = res.nome;
      
      if (res.token) localStorage.setItem("MAESTRO_EST_TOKEN", res.token);
      localStorage.setItem("MAESTRO_WALLET_CACHE", JSON.stringify(res));
      localStorage.setItem("MAESTRO_WALLET_CREDS", JSON.stringify({id: id, senha: senha}));
      if (typeof sincronizarStudentIdentityMaestro === 'function') sincronizarStudentIdentityMaestro(res, id);

      renderizarCarteira(res);
      switchView('view-wallet');
      document.getElementById('login-id').value = '';
      document.getElementById('login-senha').value = '';
      
      armarRelogioSessaoEstudante(); 
      
      // NOVO: Verifica se o aluno permitiu as notificações nas configurações
      if (localStorage.getItem('MAESTRO_PREF_PUSH') === 'true') {
          const tokenTemp = localStorage.getItem("MAESTRO_FCM_TOKEN_TEMP");
          if (tokenTemp) {
              if (typeof registrarTokenPush === 'function') registrarTokenPush(tokenTemp);
          } else {
              setTimeout(inicializarPushNotifications, 2000); 
          }
      }
    }
  } catch(err) {
    btn.innerText = "ENTRAR NO COFRE";
    btn.disabled = false;
    
    const cachedData = localStorage.getItem("MAESTRO_WALLET_CACHE");
    const cachedCreds = localStorage.getItem("MAESTRO_WALLET_CREDS");
    
    if (cachedData && cachedCreds) {
       const creds = JSON.parse(cachedCreds);
       if (creds.id.toUpperCase() === id.toUpperCase() && creds.senha === senha) {
          currentWalletId = id;
          currentWalletSenha = senha;
          const resCached = JSON.parse(cachedData);
          currentStudentName = resCached.nome;
          if (typeof sincronizarStudentIdentityMaestro === 'function') sincronizarStudentIdentityMaestro(resCached, id);
          
          showToast("Modo Offline Ativado. Funções limitadas.", "warning");
          renderizarCarteira(resCached, { offline: true });
          switchView('view-wallet');
          armarRelogioSessaoEstudante();
          return;
       }
    }
    resBox.innerText = "Falha de ligação. Necessita de internet.";
    resBox.classList.remove('hidden');

  }
}
      
function armarRelogioSessaoEstudante() {
    if (timeoutSessaoEstudanteID) clearTimeout(timeoutSessaoEstudanteID);
    timeoutSessaoEstudanteID = setTimeout(() => {
        sairCarteira(true);
        showToast("Sessão expirada. Por favor, aceda novamente.", "info");
    }, 10800000);
}

function escapeWallet(valor) {
    if (typeof escapeHTMLMaestro === 'function') return escapeHTMLMaestro(valor);
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeWalletUrl(valor) {
    if (typeof safeUrlAttrMaestro === 'function') return safeUrlAttrMaestro(valor);
    return escapeWallet(valor);
}

function obterTurnosCarteiraTexto(dados, visualState) {
    const turnos = visualState && Array.isArray(visualState.declaredTurnos) ? visualState.declaredTurnos : [];
    if (turnos.length) return turnos.map(t => t.charAt(0) + t.slice(1).toLowerCase()).join(" + ");
    return dados.turno || dados.TURNO || dados.TURNOS_ALUNO || "Nao informado";
}

function obterStatusCarteiraVisual(dados, opcoes) {
    const options = opcoes || {};
    const adapter = window.MaestroData && window.MaestroData.adapters && window.MaestroData.adapters.walletVisualState;
    if (adapter) return adapter(dados, new Date(), { offline: options.offline === true });

    return {
        activeTurnos: [],
        declaredTurnos: [],
        currentTurno: "",
        isWithinDeclaredTurno: false,
        isEstagioActive: false,
        isOffline: options.offline === true,
        isBlocked: false,
        isPending: false,
        canEmbark: options.offline !== true,
        backgroundToken: options.offline ? "wallet.offline" : "wallet.neutral",
        badgeLabel: options.offline ? "Modo offline" : "Carteira digital",
        reason: options.offline ? "Carteira exibida a partir do cache local." : "Estado visual indisponivel.",
        stateClass: options.offline ? "wallet-state-offline" : "wallet-state-neutral",
        qrLabel: options.offline ? "ACESSO OFFLINE LIMITADO" : "VALIDO PARA EMBARQUE HOJE",
        status: dados.statusAtividade || dados.STATUS_ATIVIDADE || "ATIVO"
    };
}

function obterIdentidadeCarteiraMaestro(dados) {
    const adapter = window.MaestroData && window.MaestroData.adapters && window.MaestroData.adapters.studentIdentity;
    return adapter ? adapter(dados || {}) : { estagio: {} };
}

function obterControleAtualizacaoEstagioCarteira(dados) {
    const identidade = obterIdentidadeCarteiraMaestro(dados);
    const estagio = identidade.estagio || {};
    const controle = estagio.alteracaoCiclo || dados.ALTERACAO_ESTAGIO_CICLO || dados.alteracaoEstagioCiclo || {};
    const limite = Number(controle.limite || 1) || 1;
    const usadas = Number(controle.usadas || 0) || 0;
    const restantes = controle.restantes !== undefined ? Number(controle.restantes) : Math.max(limite - usadas, 0);

    return {
        limite: limite,
        usadas: usadas,
        restantes: Math.max(restantes || 0, 0),
        ciclo: controle.ciclo || dados.semestreId || dados.SEMESTRE_ATUAL || "",
        podeAtualizar: usadas < limite
    };
}

function obterResumoAtualizacaoEstagioCarteira(dados, offline) {
    if (offline) {
        return {
            podeAtualizar: false,
            textoBotao: "Atualizacao indisponivel offline",
            motivo: "Conecte-se a internet para enviar documentos de estagio."
        };
    }

    const controle = obterControleAtualizacaoEstagioCarteira(dados || {});
    if (!controle.podeAtualizar) {
        return {
            podeAtualizar: false,
            textoBotao: "Limite de estagio atingido",
            motivo: "Ja foi usada a alteracao permitida neste ciclo."
        };
    }

    return {
        podeAtualizar: true,
        textoBotao: "Atualizar dados de estagio",
        motivo: `Alteracoes restantes neste ciclo: ${controle.restantes}`,
        controle: controle
    };
}

function selecionarOpcaoCarteira(valor, esperado) {
    return String(valor || "").trim().toLowerCase() === String(esperado || "").trim().toLowerCase() ? "selected" : "";
}

function normalizarDataCarteira(valor) {
    const texto = String(valor || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return "";
    return data.toISOString().slice(0, 10);
}

function validarPeriodoEstagioCarteira(inicio, fim) {
    if (!inicio || !fim) return { sucesso: false, erro: "Informe inicio e fim do vinculo." };
    const dataInicio = new Date(`${inicio}T00:00:00`);
    const dataFim = new Date(`${fim}T00:00:00`);
    if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
        return { sucesso: false, erro: "Periodo de estagio invalido." };
    }
    if (dataFim < dataInicio) return { sucesso: false, erro: "A data final deve ser posterior ao inicio." };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataFim < hoje) return { sucesso: false, erro: "A data final do estagio deve estar vigente." };
    return { sucesso: true };
}

function carteiraEstaOffline(opcoes) {
    const options = opcoes || {};
    return options.offline === true ||
        localStorage.getItem('MAESTRO_PREF_OFFLINE') === 'true' ||
        (typeof navigator !== 'undefined' && navigator.onLine === false);
}

function obterFotoCarteiraHTML(dados, offline) {
    const foto = offline
        ? (dados.fotoBase64 || dados.fotoUrl || dados.fotoURL)
        : (dados.fotoUrl || dados.fotoURL || dados.fotoBase64);
    const fotoSegura = safeWalletUrl(foto);
    return fotoSegura
        ? `<img src="${fotoSegura}" class="wallet-photo" alt="Foto do estudante">`
        : `<div class="wallet-photo wallet-photo-empty">Sem Foto</div>`;
}

function atualizarEstadoVisualCarteiraDinamica() {
    const card = document.querySelector('.wallet-card.wallet-dynamic');
    if (!card || !window.MaestroWalletAtual) return;

    const dados = window.MaestroWalletAtual.dados || {};
    const offline = window.MaestroWalletAtual.offline === true;
    const visualState = obterStatusCarteiraVisual(dados, { offline: offline });
    const classesEstado = [
        "wallet-state-neutral",
        "wallet-state-matutino",
        "wallet-state-vespertino",
        "wallet-state-noturno",
        "wallet-state-multi",
        "wallet-state-estagio",
        "wallet-state-blocked",
        "wallet-state-pending",
        "wallet-state-offline"
    ];

    classesEstado.forEach(classe => card.classList.remove(classe));
    card.classList.add(visualState.stateClass || "wallet-state-neutral");
    card.dataset.walletState = visualState.backgroundToken || "wallet.neutral";

    const badge = document.getElementById('wallet-state-badge');
    if (badge) badge.textContent = visualState.badgeLabel || "Carteira digital";

    const reason = document.getElementById('wallet-state-reason');
    if (reason) reason.textContent = visualState.reason || "";

    const qrLabel = document.getElementById('wallet-qr-label');
    if (qrLabel) qrLabel.textContent = visualState.qrLabel || "VALIDO PARA EMBARQUE HOJE";
}

function renderizarCarteira(dados, opcoes = {}) {
    const container = document.getElementById('wallet-container');
    const actions = document.getElementById('wallet-actions');
    if (!container || !dados) return;

    const offline = carteiraEstaOffline(opcoes);
    const visualState = obterStatusCarteiraVisual(dados, { offline: offline });
    const nomeTratadoSeguro = escapeWallet(formatarNomeProprio(dados.nome || dados.nomeAluno || dados.NOME_ALUNO));
    const cpfMascarado = escapeWallet(dados.cpfMascarado || dados.cpf_mask || dados.CPF_MASCARADO || "***.***.***-**");
    const idCarteira = escapeWallet(dados.idCarteira || dados.id || dados.identificador || currentWalletId);
    const instituicao = escapeWallet(dados.instituicao || dados.INSTITUICAO || dados.INSTITUICAO_ALUNO || "Nao informado");
    const turnoTexto = escapeWallet(obterTurnosCarteiraTexto(dados, visualState));
    const rota = escapeWallet(dados.rota || dados.ROTA || dados.ROTA_ALUNO || "Nao informada");
    const cidade = escapeWallet(dados.cidade || dados.CIDADE_ALVO || "...");
    const validade = escapeWallet(dados.validade || dados.VALIDADE || "...");
    const statusTexto = escapeWallet(visualState.status || dados.statusAtividade || dados.STATUS_ATIVIDADE || "ATIVO");
    const badgeLabel = escapeWallet(visualState.badgeLabel || "Carteira digital");
    const reason = escapeWallet(visualState.reason || "");
    const qrLabel = escapeWallet(visualState.qrLabel || "VALIDO PARA EMBARQUE HOJE");
    const fotoDinamicaHTML = obterFotoCarteiraHTML(dados, offline);
    const classEstado = escapeWallet(visualState.stateClass || "wallet-state-neutral");
    const dataEstado = escapeWallet(visualState.backgroundToken || "wallet.neutral");
    const offlineClass = offline ? " wallet-mode-offline" : "";
    const documentoDisabled = offline ? "disabled" : "";
    const documentoClasses = offline ? "btn-solid dark-bg wallet-disabled-action" : "btn-solid dark-bg";
    const documentoLabel = offline ? "Documento indisponivel offline" : "Baixar Declaracao de Vinculo";
    const resumoEstagio = obterResumoAtualizacaoEstagioCarteira(dados, offline);
    const botaoEstagioClasses = resumoEstagio.podeAtualizar ? "btn-solid wallet-stage-update-button" : "btn-solid wallet-disabled-action";
    const botaoEstagioDisabled = resumoEstagio.podeAtualizar ? "" : "disabled";

    container.innerHTML = `
  <div class="wallet-card wallet-dynamic ${classEstado}${offlineClass}" data-wallet-state="${dataEstado}">
    <div class="wallet-header">IDENTIDADE UNIVERSITARIA</div>
    <div class="wallet-state-strip">
      <span id="wallet-state-badge" class="wallet-state-badge">${badgeLabel}</span>
      <span class="wallet-status-pill">${statusTexto}</span>
    </div>
    <p id="wallet-state-reason" class="wallet-state-reason">${reason}</p>
    <div class="wallet-body">
      ${fotoDinamicaHTML}
      <div class="wallet-info">
        <div class="w-group"><span>Estudante</span><span class="highlight">${nomeTratadoSeguro}</span></div>
        <div class="w-group"><span>CPF</span><span>${cpfMascarado}</span></div>
        <div class="w-group"><span>ID da Carteira</span><span class="wallet-mono-id">${idCarteira}</span></div>
      </div>
    </div>

    <div class="text-center wallet-qr-zone">
      <div class="wallet-qr-frame" onclick="toggleFullscreenQR('wallet-qrcode')">
         <div id="wallet-qrcode"></div>
      </div>
      <div id="wallet-qr-label" class="wallet-qr-label">${qrLabel}</div>
    </div>

    <div class="wallet-footer">
      <div class="w-row">
        <div class="w-group"><span>Instituicao</span><span class="wallet-strong-value">${instituicao}</span></div>
        <div class="w-group wallet-align-right"><span>Turno</span><span>${turnoTexto}</span></div>
      </div>
      <div class="w-row"><div class="w-group"><span>Rota de Transporte</span><span>${rota}</span></div></div>
      <div class="text-center wallet-validity-row">
         <span class="wallet-validity-note">Valido em ${cidade} ate <strong>${validade}</strong></span>
      </div>
      <div class="anti-print-bar wallet-clock-dynamic" id="wallet-clock">Relogio Seguro...</div>
    </div>
  </div>

  <div class="wallet-document-row">
      <button id="btn-dw-declaracao" class="${documentoClasses} wallet-document-button" onclick="baixarDocumento('DECLARACAO')" ${documentoDisabled}>${documentoLabel}</button>
  </div>`;

    window.MaestroWalletAtual = { dados: dados, offline: offline };

    if (actions) {
        actions.innerHTML = offline ? `
        <div class="wallet-offline-note">Funcoes online ficam bloqueadas ate a proxima sincronizacao.</div>
        <div class="wallet-action-close-row">
           <button class="btn-text text-danger wallet-close-button" onclick="sairCarteira()">Fechar Cofre Digital</button>
        </div>
      ` : `
        <div class="wallet-action-row">
           <button class="btn-solid wallet-action-button" onclick="abrirRadarMasterView()">Abrir Radar de Viagens</button>
           <button class="btn-solid dark-bg wallet-action-button" onclick="abrirMuralDaSemana()">Sugestoes / Forum</button>
        </div>
        <button id="btn-wallet-stage-update" class="${botaoEstagioClasses}" onclick="abrirFormularioAtualizacaoEstagioCarteira()" ${botaoEstagioDisabled}>${escapeWallet(resumoEstagio.textoBotao)}</button>
        <div class="wallet-stage-limit-note">${escapeWallet(resumoEstagio.motivo)}</div>
        <div id="wallet-stage-update-slot"></div>
        <div class="wallet-action-close-row">
           <button class="btn-text text-danger wallet-close-button" onclick="sairCarteira()">Fechar Cofre Digital</button>
        </div>
      `;
        actions.classList.remove('hidden');
    }

    iniciarRelogioAntiPrint('wallet-clock');
    atualizarEstadoVisualCarteiraDinamica();
    if (walletVisualInterval) clearInterval(walletVisualInterval);
    walletVisualInterval = setInterval(atualizarEstadoVisualCarteiraDinamica, 60000);

    const qrContainerDinamico = document.getElementById('wallet-qrcode');
    if (qrContainerDinamico) {
        qrContainerDinamico.innerHTML = "";
        const semente = dados.sementeDia || new Date().toISOString().split('T')[0];
        new QRCode(qrContainerDinamico, { text: `${dados.idCarteira || currentWalletId}|${semente}`, width: 160, height: 160, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    }

    return;
}

function renderizarCarteiraOffline(dados) {
    renderizarCarteira(dados, { offline: true });
    return;
}

function abrirFormularioAtualizacaoEstagioCarteira() {
    const slot = document.getElementById('wallet-stage-update-slot');
    const estado = window.MaestroWalletAtual || {};
    const dados = estado.dados || {};
    const resumo = obterResumoAtualizacaoEstagioCarteira(dados, estado.offline === true);
    if (!slot) return;

    if (!resumo.podeAtualizar) {
        showToast(resumo.motivo || "Atualizacao indisponivel.", "warning");
        return;
    }

    walletStageUpdateFile = null;
    const identidade = obterIdentidadeCarteiraMaestro(dados);
    const estagio = identidade.estagio || {};
    const tipoAtual = estagio.tipoVinculo || dados.TIPO_VINCULO_ESTAGIO || "";
    const turnoAtual = estagio.turno || dados.TURNO_ESTAGIO || dados.TURNO_ESTAGIO_ALUNO || "";
    const inicioAtual = normalizarDataCarteira(estagio.inicio || dados.INICIO_ESTAGIO);
    const fimAtual = normalizarDataCarteira(estagio.fim || dados.FIM_ESTAGIO);
    const empresaAtual = escapeWallet(estagio.empresaInstituicao || dados.EMPRESA_INSTITUICAO_ESTAGIO || "");
    const paradaAtual = escapeWallet(estagio.parada || dados.PARADA_ESTAGIO || dados.ROTA_ESTAGIO || "");

    slot.innerHTML = `
      <div class="wallet-stage-panel">
        <div class="wallet-stage-panel-header">
          <strong>Atualizacao de estagio</strong>
          <button type="button" class="wallet-stage-close" onclick="fecharFormularioAtualizacaoEstagioCarteira()" aria-label="Fechar formulario">x</button>
        </div>
        <div class="wallet-stage-grid">
          <label class="input-label">TIPO DE VINCULO</label>
          <select id="wallet-stage-tipo" class="input-field">
            <option value="">Selecione...</option>
            <option value="Estagio" ${selecionarOpcaoCarteira(tipoAtual, "Estagio")}>Estagio</option>
            <option value="Bolsa de estudos" ${selecionarOpcaoCarteira(tipoAtual, "Bolsa de estudos")}>Bolsa de estudos</option>
            <option value="Jovem aprendiz" ${selecionarOpcaoCarteira(tipoAtual, "Jovem aprendiz")}>Jovem aprendiz</option>
            <option value="Curso tecnico/profissionalizante" ${selecionarOpcaoCarteira(tipoAtual, "Curso tecnico/profissionalizante")}>Curso tecnico/profissionalizante</option>
            <option value="Projeto academico" ${selecionarOpcaoCarteira(tipoAtual, "Projeto academico")}>Projeto academico</option>
            <option value="Outro" ${selecionarOpcaoCarteira(tipoAtual, "Outro")}>Outro</option>
          </select>

          <div class="wallet-stage-two-cols">
            <div>
              <label class="input-label">INICIO</label>
              <input type="date" id="wallet-stage-inicio" class="input-field" value="${escapeWallet(inicioAtual)}">
            </div>
            <div>
              <label class="input-label">FIM</label>
              <input type="date" id="wallet-stage-fim" class="input-field" value="${escapeWallet(fimAtual)}">
            </div>
          </div>

          <label class="input-label">EMPRESA / INSTITUICAO</label>
          <input type="text" id="wallet-stage-empresa" class="input-field" value="${empresaAtual}" placeholder="Nome da empresa ou instituicao">

          <label class="input-label">PARADA DO ESTAGIO</label>
          <input type="text" id="wallet-stage-parada" class="input-field" value="${paradaAtual}" placeholder="Endereco ou ponto de referencia">

          <label class="input-label">TURNO DO ESTAGIO</label>
          <select id="wallet-stage-turno" class="input-field">
            <option value="">Selecione...</option>
            <option value="Matutino" ${selecionarOpcaoCarteira(turnoAtual, "Matutino")}>Matutino</option>
            <option value="Vespertino" ${selecionarOpcaoCarteira(turnoAtual, "Vespertino")}>Vespertino</option>
            <option value="Noturno" ${selecionarOpcaoCarteira(turnoAtual, "Noturno")}>Noturno</option>
            <option value="Integral" ${selecionarOpcaoCarteira(turnoAtual, "Integral")}>Integral</option>
          </select>

          <label class="input-label">DECLARACAO DE VINCULO</label>
          <input type="file" id="wallet-stage-file" class="input-field" accept="application/pdf, image/jpeg, image/png" onchange="processarArquivoAtualizacaoEstagioCarteira(this)">
          <span id="wallet-stage-file-status" class="wallet-stage-file-status">Nenhum arquivo selecionado</span>
        </div>
        <button id="btn-wallet-stage-submit" type="button" class="btn-solid wallet-stage-submit" onclick="enviarAtualizacaoEstagioCarteira()">Enviar atualizacao para auditoria</button>
      </div>
    `;
}

function fecharFormularioAtualizacaoEstagioCarteira() {
    walletStageUpdateFile = null;
    const slot = document.getElementById('wallet-stage-update-slot');
    if (slot) slot.innerHTML = "";
}

function processarArquivoAtualizacaoEstagioCarteira(inputElement) {
    const file = inputElement && inputElement.files ? inputElement.files[0] : null;
    const status = document.getElementById('wallet-stage-file-status');
    walletStageUpdateFile = null;

    if (!file) {
        if (status) {
            status.textContent = "Nenhum arquivo selecionado";
            status.classList.remove("is-success", "is-error");
        }
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Arquivo muito grande. O limite e 5MB.", "error");
        inputElement.value = "";
        if (status) {
            status.textContent = "Arquivo acima de 5MB.";
            status.classList.remove("is-success");
            status.classList.add("is-error");
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evento) {
        walletStageUpdateFile = {
            tipo: "estagio",
            nome: file.name,
            base64: evento.target.result
        };
        if (status) {
            status.textContent = "Arquivo anexado: " + file.name;
            status.classList.remove("is-error");
            status.classList.add("is-success");
        }
    };
    reader.onerror = function() {
        walletStageUpdateFile = null;
        inputElement.value = "";
        if (status) {
            status.textContent = "Falha ao ler o arquivo.";
            status.classList.remove("is-success");
            status.classList.add("is-error");
        }
        showToast("Falha na leitura do arquivo.", "error");
    };
    reader.readAsDataURL(file);
}

function obterValorCampoCarteira(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
}

async function enviarAtualizacaoEstagioCarteira() {
    const estado = window.MaestroWalletAtual || {};
    const dados = estado.dados || {};
    const resumo = obterResumoAtualizacaoEstagioCarteira(dados, estado.offline === true);
    const btn = document.getElementById('btn-wallet-stage-submit');

    if (walletStageUpdateSubmitting) {
        showToast("Atualizacao de estagio ja esta em envio.", "warning");
        return;
    }
    if (!resumo.podeAtualizar) {
        showToast(resumo.motivo || "Atualizacao indisponivel.", "warning");
        return;
    }

    const tipoVinculoEstagio = obterValorCampoCarteira('wallet-stage-tipo');
    const inicioEstagio = obterValorCampoCarteira('wallet-stage-inicio');
    const fimEstagio = obterValorCampoCarteira('wallet-stage-fim');
    const empresaInstituicaoEstagio = obterValorCampoCarteira('wallet-stage-empresa');
    const paradaEstagio = obterValorCampoCarteira('wallet-stage-parada');
    const turnoEstagio = obterValorCampoCarteira('wallet-stage-turno');
    const periodo = validarPeriodoEstagioCarteira(inicioEstagio, fimEstagio);

    if (!tipoVinculoEstagio || !inicioEstagio || !fimEstagio || !empresaInstituicaoEstagio || !paradaEstagio || !turnoEstagio) {
        showToast("Preencha todos os campos de estagio.", "error");
        return;
    }
    if (!periodo.sucesso) {
        showToast(periodo.erro, "error");
        return;
    }
    if (!walletStageUpdateFile || !walletStageUpdateFile.base64) {
        showToast("Anexe a declaracao de vinculo do estagio.", "error");
        return;
    }

    const basePayload = {
        idCarteira: dados.idCarteira || dados.identificador || currentWalletId,
        cpf: dados.cpf || dados.CPF_ALUNO || "",
        semestreId: dados.semestreId || dados.SEMESTRE_ATUAL || "",
        tipoVinculoEstagio,
        inicioEstagio,
        fimEstagio,
        empresaInstituicaoEstagio,
        transporteEstagio: "Sim",
        paradaEstagio,
        turnoEstagio,
        declaracaoVinculoEstagio: {
            nome: walletStageUpdateFile.nome,
            tipo: walletStageUpdateFile.tipo,
            anexada: true
        }
    };
    const builder = window.MaestroData && window.MaestroData.payloadBuilders && window.MaestroData.payloadBuilders.atualizacaoEstagio;
    const payload = Object.assign({}, builder ? builder(basePayload) : {}, basePayload, {
        arquivos: {
            estagio: walletStageUpdateFile
        }
    });

    walletStageUpdateSubmitting = true;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Enviando...";
    }

    try {
        const res = await apiCall("atualizarEstagioCarteira", payload);
        if (!res || !res.sucesso) {
            showToast((res && res.erro) || "Nao foi possivel atualizar o estagio.", "error");
            if (res && res.limiteAtingido && res.alteracaoEstagioCiclo) {
                const atualizado = Object.assign({}, dados, { ALTERACAO_ESTAGIO_CICLO: res.alteracaoEstagioCiclo });
                renderizarCarteira(atualizado);
            }
            return;
        }

        const tokenAtual = localStorage.getItem("MAESTRO_EST_TOKEN") || dados.token || "";
        const carteiraAtualizada = Object.assign({}, dados, res.carteira || {}, {
            token: (res.carteira && res.carteira.token) || tokenAtual,
            ALTERACAO_ESTAGIO_CICLO: res.alteracaoEstagioCiclo || dados.ALTERACAO_ESTAGIO_CICLO,
            declaracaoVinculoEstagio: res.declaracaoVinculoEstagio || dados.declaracaoVinculoEstagio
        });
        localStorage.setItem("MAESTRO_WALLET_CACHE", JSON.stringify(carteiraAtualizada));
        if (typeof sincronizarStudentIdentityMaestro === 'function') sincronizarStudentIdentityMaestro(carteiraAtualizada, currentWalletId);
        walletStageUpdateFile = null;
        showToast(res.msg || "Atualizacao enviada para auditoria.", "success");
        renderizarCarteira(carteiraAtualizada);
    } catch (erro) {
        console.error("Erro ao atualizar estagio pela carteira:", erro);
        showToast("Falha de conexao ao atualizar estagio.", "error");
    } finally {
        walletStageUpdateSubmitting = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Enviar atualizacao para auditoria";
        }
    }
}

let wakeLock = null;
async function toggleFullscreenQR(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.classList.toggle('qr-fullscreen');
    const isFullscreen = el.classList.contains('qr-fullscreen');

    if (isFullscreen) {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn("Wake Lock falhou:", err);
            }
        }
    } else {
        if (wakeLock !== null) {
            wakeLock.release().then(() => {
                wakeLock = null;
            });
        }
    }
}

function iniciarRelogioAntiPrint(elementId) {
    if (clockInterval) clearInterval(clockInterval);
    const clockDiv = document.getElementById(elementId);
    if (!clockDiv) return;
    const update = () => clockDiv.innerText = `⏳ Autenticado: ${new Date().toLocaleTimeString('pt-BR')}`;
    update();
    clockInterval = setInterval(update, 1000);
}

async function baixarDocumento(tipo, tentativa = 1) {
    const MAX_TENTATIVAS = 3;
    const btnId = tipo === 'CARTEIRA' ? 'btn-dw-carteira' : 'btn-dw-declaracao';
    const btn = document.getElementById(btnId);

    const textoOriginal = btn.getAttribute('data-original-text') || btn.innerHTML;
    if (tentativa === 1) btn.setAttribute('data-original-text', textoOriginal);

    btn.innerHTML = tentativa === 1 ? `⏳ A transferir...` : `🔄 Tentativa ${tentativa}/${MAX_TENTATIVAS}...`;
    btn.disabled = true;

    try {
        const res = await apiCall("baixarDocumentoSeguro", { id: currentWalletId, tipo: tipo });

        if (res.erro) {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            showToast(res.erro, "error");
        } else if (res.sucesso && res.arquivoBase64) {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${res.arquivoBase64}`;
            link.download = res.arquivoNome || `Documento_${tipo}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast(`Download de ${tipo} concluído!`, "success");
            btn.innerHTML = `⏳ Aguarde...`;
            setTimeout(() => { btn.innerHTML = textoOriginal; btn.disabled = false; }, 10000);
        }
    } catch (err) {
        if (tentativa < MAX_TENTATIVAS) {
            showToast(`Servidor ocupado. A tentar...`, "info");
            setTimeout(() => { baixarDocumento(tipo, tentativa + 1); }, tentativa * 2000);
        } else {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            showToast("Falha de conexão com a API.", "error");
        }
    }
}

function irParaCofreComId(idAcesso) {
    if (currentWalletId && localStorage.getItem("MAESTRO_EST_TOKEN") && currentWalletId.toUpperCase() === idAcesso.toUpperCase()) {
        switchView('view-wallet');
        return;
    }

    switchView('view-login');
    const inputId = document.getElementById('login-id');
    const inputSenha = document.getElementById('login-senha');

    if (inputId && idAcesso) inputId.value = idAcesso;
    if (inputSenha) setTimeout(() => { inputSenha.focus(); }, 100);
}

async function sairCarteira(expiracaoSilenciosa = false) {
    try { await apiCall("invalidarTokenSessao"); } catch (e) { }

    localStorage.removeItem("MAESTRO_EST_TOKEN");
    if (typeof limparContextsSessaoMaestro === 'function') limparContextsSessaoMaestro("student");

    if (clockInterval) clearInterval(clockInterval);
    if (walletVisualInterval) clearInterval(walletVisualInterval);
    if (timeoutSessaoEstudanteID) clearInterval(timeoutSessaoEstudanteID);
    walletVisualInterval = null;

    // --- Full map/GPS cleanup (layout-agnostic) ---
    if (typeof pararTransmissaoGpsE_Radar === 'function') {
        pararTransmissaoGpsE_Radar();
    }
    // Directly destroy map instance to guarantee no leaks on desktop or mobile
    if (typeof mapInstance !== 'undefined' && mapInstance !== null) {
        try { mapInstance.off(); mapInstance.remove(); } catch (e) { }
        mapInstance = null;
    }
    if (typeof busMarker !== 'undefined') busMarker = null;
    if (typeof onibusSelecionadoGPS !== 'undefined') onibusSelecionadoGPS = null;

    document.getElementById('wallet-container').innerHTML = '';
    const actions = document.getElementById('wallet-actions');
    if (actions) actions.classList.add('hidden');

    currentWalletId = "";
    currentWalletSenha = "";
    currentStudentName = "";
    window.MaestroWalletAtual = null;

    const painelMob = document.getElementById('view-mobilidade');
    if (painelMob) painelMob.classList.add('hidden');

    switchView('view-aluno-menu');
    if (!expiracaoSilenciosa) showToast("Cofre bloqueado com segurança.", "info");
}

// ========================================================================
// 6. FLUXO DE CONSULTA DO ESTUDANTE
// ========================================================================
async function consultarEstudante() {
    const alvo = document.getElementById('id-estudante').value.trim();
    if (!alvo) { showToast("Informe o CPF.", "error"); return; }

    const btn = document.getElementById('btn-estudante');
    const resBox = document.getElementById('res-estudante');
    const checkboxPush = document.getElementById('chk-notificacoes-cpf');

    btn.innerText = "A CONSULTAR...";
    btn.disabled = true;
    resBox.classList.add('hidden');

    try {
        const res = await apiCall("consultarStatusCPF", { cpf: alvo });

        if (!res.encontrado) {
            mostrarErroEstudante("Não Encontrado", "Verifique o CPF ou submissão.");
            return;
        }

        if (checkboxPush && checkboxPush.checked) {
            solicitarConsentimentoPushAnonimo(alvo);
        }

        renderizarTimelineEstudante(res, resBox);
    } catch (err) {
        mostrarErroEstudante("Erro na API", "Tente novamente mais tarde.");
    } finally {
        btn.innerText = "CONSULTAR STATUS";
        btn.disabled = false;
    }
}

async function solicitarConsentimentoPushAnonimo(cpf) {
    try {
        // Aguarda a inicialização do Firebase (promessa global definida no bootSystem)
        if (window.firebaseReady) await window.firebaseReady;

        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) { 
            console.warn("Firebase não disponível após aguardar inicialização."); 
            return; 
        }
        if (!firebase.messaging.isSupported()) return;
        const messaging = firebase.messaging();

        // Guarda de idempotência — evita erro 'use-sw-after-get-token' em SPA
        if (!window.isSwInjected) {
            const registration = await navigator.serviceWorker.ready;
            messaging.useServiceWorker(registration);
            window.isSwInjected = true;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await messaging.getToken({ vapidKey: window.FIREBASE_VAPID_KEY });
            if (token) {
                const cpfLimpo = cpf.replace(/\D/g, '');
                const builderPushToken = window.MaestroData &&
                    window.MaestroData.payloadBuilders &&
                    typeof window.MaestroData.payloadBuilders.pushToken === "function"
                    ? window.MaestroData.payloadBuilders.pushToken
                    : null;
                const payloadPush = builderPushToken
                    ? builderPushToken({ cpf: cpfLimpo, idEstudante: cpfLimpo, pushToken: token, tokenDispositivo: token })
                    : { idEstudante: cpfLimpo, pushToken: token };
                await apiCall("registrarPushToken", payloadPush);
                localStorage.setItem('MAESTRO_FCM_TOKEN', token);
                localStorage.setItem('MAESTRO_PUSH_ATIVO', 'true');
                showToast("Notificações ativadas com sucesso!", "success");
            }
        } else {
            showToast("Permissão de notificações negada pelo dispositivo.", "info");
        }
    } catch (error) {
        console.warn("Push anónimo falhou ou foi bloqueado.", error);
    }
}

function renderizarTimelineEstudante(dados, container) {
    const nomeLimpo = formatarNomeProprio(dados.nome).split(' ')[0];
    let html = `<h3 class="timeline-greeting">Ola, ${nomeLimpo}!</h3>`;
    html += `<div class="timeline timeline-result-container">`;

    html += `<div class="timeline-item active-blue">
             <strong class="timeline-title-primary">1. Formulario Recebido</strong><br>
             <span class="timeline-small-text">Os seus dados deram entrada no sistema.</span>
           </div>`;

    const sOCR = String(dados.statusOCR || "").trim().toUpperCase();
    const sDocs = String(dados.statusDocs || "").trim().toUpperCase();
    const sAtiv = String(dados.statusAtividade || "").trim().toUpperCase();

    const buildObsBox = (obs, variant) => {
        if (!obs || obs.trim() === "") return "";
        const obsSeguro = typeof safeLinesMaestro === 'function'
            ? safeLinesMaestro(obs)
            : String(obs).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
        const variantClass = {
            danger: "timeline-note-danger",
            warning: "timeline-note-warning",
            orange: "timeline-note-orange"
        }[variant] || "timeline-note-warning";
        return `
      <div class="timeline-note-box ${variantClass}">
        <strong>Mensagem do Setor:</strong>
        ${obsSeguro}
      </div>
    `;
    };

    if (sAtiv === "CANCELADO") {
        html += `<div class="timeline-item active-red"><strong class="timeline-title-danger">2. Emissao Interrompida</strong></div>`;
        html += `<div class="timeline-item active-red">
               <strong class="timeline-title-danger">3. Inscricao Cancelada</strong><br>
               <span class="timeline-small-strong timeline-danger-text">O acesso ao transporte foi cancelado.</span>
               ${buildObsBox(dados.obs, "danger")}
             </div>`;

    } else if (sAtiv === "SUSPENSO") {
        html += `<div class="timeline-item active-orange"><strong class="timeline-title-orange">2. Emissao Interrompida</strong></div>`;
        html += `<div class="timeline-item active-orange">
               <strong class="timeline-title-orange">3. Inscricao Suspensa</strong><br>
               <span class="timeline-small-strong timeline-orange-text">O acesso foi desativado temporariamente.</span>
               ${buildObsBox(dados.obs, "orange")}
               
               <button class="btn-solid timeline-action-button timeline-action-danger" onclick="abrirPortalResgate()">CORRIGIR DOCUMENTACAO</button>
             </div>`;

    } else {
        if (sOCR === "PENDENTE" || sOCR === "") {
            html += `<div class="timeline-item"><strong>2. Em Auditoria</strong><br><span class="timeline-small-text">A aguardar analise documental.</span></div>`;
            html += `<div class="timeline-item"><strong>3. Resultado</strong></div>`;

        } else if (sOCR === "ANALISE_HUMANA" || sOCR === "PENDENCIA") {
            html += `<div class="timeline-item active-yellow">
                 <strong class="timeline-title-warning">2. Pendencia Documental</strong><br>
                 <span class="timeline-small-strong timeline-warning-text">Acao necessaria para prosseguir.</span>
                 ${buildObsBox(dados.obs, "warning")}
                 
                 <button class="btn-solid timeline-action-button" onclick="abrirPortalResgate()">CORRIGIR DOCUMENTACAO</button>
               </div>`;
            html += `<div class="timeline-item"><strong>3. Resultado</strong></div>`;

        } else {
            html += `<div class="timeline-item active-green"><strong class="timeline-title-success">2. Documentos Validados</strong></div>`;

            if (sDocs === "EMITIDO" || sDocs === "EMITIDO_NOTIFICADO" || sDocs === "GERADO") {
                html += `<div class="timeline-item active-green"><strong class="timeline-title-success">3. Carteira Ativa!</strong><br><span class="timeline-small-text">A sua identidade estudantil ja pode ser utilizada.</span></div>`;

                if (dados.idAcesso) {
                    const idSeguro = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(dados.idAcesso) : String(dados.idAcesso || "");
                    html += `
           <div class="timeline-id-card">
             <span class="timeline-id-label">O seu ID de Acesso e:</span>
             <strong class="timeline-access-id">${idSeguro}</strong>
             <p class="timeline-id-help">Use este ID e os 4 ultimos digitos do seu CPF para abrir o cofre digital.</p>
             <button class="btn-solid timeline-action-button" onclick="irParaCofreComId('${idSeguro}')">IR PARA O COFRE</button>
           </div>`;
                }
            } else {
                html += `<div class="timeline-item active-blue"><strong class="timeline-title-primary">3. A Aguardar Emissao</strong><br><span class="timeline-small-text">A sua carteira digital esta em processamento.</span></div>`;
            }
        }
    }

    html += `</div>`;
    container.innerHTML = html;
    container.classList.add('timeline-result-container');
    container.classList.remove('hidden');
}
function mostrarErroEstudante(titulo, mensagem) {
    const resBox = document.getElementById('res-estudante');
    const tituloSeguro = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(titulo) : String(titulo || "");
    const mensagemSegura = typeof escapeHTMLMaestro === 'function' ? escapeHTMLMaestro(mensagem) : String(mensagem || "");
    resBox.innerHTML = `<div class="error-box"><strong>${tituloSeguro}</strong><br>${mensagemSegura}</div>`;
    resBox.classList.remove('hidden');
}

// ========================================================================
// 7. MÓDULO DE RESGATE DOCUMENTAL (V9.2)
// ========================================================================

let arquivosParaResgate = {};

function atualizarStatusResgateMaestro(statusSpan, texto, estado) {
    if (!statusSpan) return;
    statusSpan.innerText = texto;
    statusSpan.classList.remove("is-processing", "is-success", "is-error");
    if (estado) statusSpan.classList.add(estado);
}

function abrirPortalResgate() {
    switchView('view-resgate');
    arquivosParaResgate = {};
    document.querySelectorAll("input[type='checkbox'][id^='chk-resgate-']").forEach(chk => chk.checked = false);
    document.querySelectorAll("div[id^='box-resgate-']").forEach(box => box.classList.add('hidden'));
    document.querySelectorAll("input[type='file'][id^='file-resgate-']").forEach(f => f.value = "");
    document.querySelectorAll("span[id^='status-resgate-']").forEach(st => {
        atualizarStatusResgateMaestro(st, "A aguardar selecao...", "");
    });
    verificarBotaoResgate();
}

function cancelarResgate() {
    switchView('view-consult');
}

function toggleBoxResgate(tipoDoc) {
    const isChecked = document.getElementById(`chk-resgate-${tipoDoc.toLowerCase()}`).checked;
    const box = document.getElementById(`box-resgate-${tipoDoc}`);
    const fileInput = document.getElementById(`file-resgate-${tipoDoc}`);
    const statusSpan = document.getElementById(`status-resgate-${tipoDoc}`);

    if (isChecked) {
        box.classList.remove('hidden');
    } else {
        box.classList.add('hidden');
        fileInput.value = "";
        atualizarStatusResgateMaestro(statusSpan, "A aguardar selecao...", "");
        delete arquivosParaResgate[tipoDoc];
        verificarBotaoResgate();
    }
}

function processarArquivoResgate(inputElement, tipoDoc) {
    const file = inputElement.files[0];
    const statusSpan = document.getElementById(`status-resgate-${tipoDoc}`);

    if (!file) {
        delete arquivosParaResgate[tipoDoc];
        atualizarStatusResgateMaestro(statusSpan, "A aguardar selecao...", "");
        verificarBotaoResgate();
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("O arquivo e muito grande (Maximo 5MB).", "error");
        inputElement.value = "";
        delete arquivosParaResgate[tipoDoc];
        atualizarStatusResgateMaestro(statusSpan, "Erro: Arquivo demasiado pesado.", "is-error");
        verificarBotaoResgate();
        return;
    }

    atualizarStatusResgateMaestro(statusSpan, "A processar...", "is-processing");

    const reader = new FileReader();
    reader.onload = function (e) {
        arquivosParaResgate[tipoDoc] = {
            tipo: tipoDoc,
            nome: file.name,
            base64: e.target.result
        };
        atualizarStatusResgateMaestro(statusSpan, "Anexado e pronto a enviar!", "is-success");
        verificarBotaoResgate();
    };
    reader.onerror = function () {
        showToast("Falha na leitura do arquivo.", "error");
        inputElement.value = "";
        delete arquivosParaResgate[tipoDoc];
        atualizarStatusResgateMaestro(statusSpan, "Erro na leitura.", "is-error");
        verificarBotaoResgate();
    };
    reader.readAsDataURL(file);
}

function verificarBotaoResgate() {
    const btn = document.getElementById('btn-enviar-resgate');
    if (Object.keys(arquivosParaResgate).length > 0) {
        btn.disabled = false;
        btn.classList.remove("btn-soft-disabled");
    } else {
        btn.disabled = true;
        btn.classList.add("btn-soft-disabled");
    }
}
async function enviarArquivosResgate() {
    const cpf = document.getElementById('id-estudante').value.trim();
    if (!cpf) {
        showToast("Falha interna: CPF não localizado.", "error");
        return;
    }

    const payloadArquivos = Object.values(arquivosParaResgate);
    if (payloadArquivos.length === 0) {
        showToast("Nenhum arquivo anexado para envio.", "error");
        return;
    }

    const btn = document.getElementById('btn-enviar-resgate');
    btn.innerHTML = "A ENVIAR PARA A SECRETARIA... ⏳";
    btn.disabled = true;

    try {
        const res = await apiCall("submeterResgateDocumental", {
            cpf: cpf,
            arquivos: payloadArquivos
        });

        if (res.sucesso) {
            showToast(res.msg || "Documentos enviados com sucesso!", "success");
            switchView('view-consult');
            consultarEstudante();
        } else {
            showToast(res.erro || "Falha ao enviar os documentos.", "error");
        }
    } catch (e) {
        showToast("Erro de ligação com a Secretaria.", "error");
    } finally {
        if (!document.getElementById('view-resgate').classList.contains('hidden')) {
            btn.innerHTML = "TENTAR NOVAMENTE";
            btn.disabled = false;
        }
    }
}

// ========================================================================
// 9. MÓDULO SMART STEPPER — INSCRIÇÃO NATIVA (V10.1)
// ========================================================================

const STEPPER_LABELS = {
    1: 'Triagem',
    2: 'Rota Acadêmica',
    3: 'Condicionais',
    4: 'Cofre Digital'
};

let inscricaoArquivos = {};
let inscricaoFotoBase64 = null;
let cameraStream = null;

function atualizarFeedbackCPFInscricao(estado, mensagem) {
    const feedbackBox = document.getElementById('cpf-feedback-box');
    if (!feedbackBox) return false;
    feedbackBox.classList.remove('feedback-error', 'feedback-success', 'feedback-info', 'hidden');
    feedbackBox.classList.add(`feedback-${estado}`);
    if (typeof escapeHTMLMaestro === 'function') {
        feedbackBox.textContent = mensagem;
    } else {
        feedbackBox.innerHTML = mensagem;
    }
    return true;
}

function atualizarStatusArquivoInscricao(statusSpan, texto, estado = "idle") {
    if (!statusSpan) return;
    statusSpan.innerText = texto;
    statusSpan.classList.remove('is-success', 'is-error', 'is-idle');
    statusSpan.classList.add(`is-${estado}`);
}

// ----- Wrapper de Inicialização -----
function abrirNovaInscricao() {
    switchView('view-inscricao');
    carregarListasInscricao(); // Triggers the backend fetch immediately
}

// ----- Step Navigation -----

function atualizarStepperUI(stepAtual) {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot-${i}`);
        const conn = document.getElementById(`conn-${i}`);

        if (!dot) continue;

        dot.classList.remove('step-active', 'step-done');

        if (i < stepAtual) {
            dot.classList.add('step-done');
        } else if (i === stepAtual) {
            dot.classList.add('step-active');
        }

        if (conn) {
            conn.classList.remove('step-done');
            if (i < stepAtual) {
                conn.classList.add('step-done');
            }
        }
    }

    const label = document.getElementById('stepper-label');
    if (label) {
        label.innerHTML = `Etapa <strong>${stepAtual}</strong> de 4 — ${STEPPER_LABELS[stepAtual]}`;
    }
}

function stepperNext(current, next) {
    const stepCurrent = document.getElementById(`step-${current}`);
    const stepNext = document.getElementById(`step-${next}`);
    if (!stepCurrent || !stepNext) return;

    // ---- VALIDAÇÃO POR ETAPA ----
    if (current === 1) {
        const cpfRaw = document.getElementById('insc-cpf').value.replace(/\D/g, '');
        if (cpfRaw.length !== 11) {
            showToast("CPF inválido. Informe 11 dígitos.", "error");
            triggerVibration([50, 50]);
            return;
        }
    }

    if (current === 2) {
        const nome = document.getElementById('insc-nome').value.trim();
        const email = document.getElementById('insc-email').value.trim();
        const rg = document.getElementById('insc-rg').value.trim();
        const contato = document.getElementById('insc-contato').value.trim();
        const instSelect = document.getElementById('insc-instituicao').value;
        const instOutra = document.getElementById('insc-instituicao-outra').value.trim();
        const mat = document.getElementById('insc-matricula').value.trim();
        const rota = document.getElementById('insc-rota').value;
        const inicioSem = document.getElementById('insc-inicio-semestre').value;
        const fimSem = document.getElementById('insc-fim-semestre').value;

        const diasCheck = document.querySelectorAll('input[name="insc-dias"]:checked').length > 0;
        const turnosCheck = document.querySelectorAll('input[name="insc-turnos"]:checked').length > 0;

        let instOk = false;
        if (instSelect && instSelect !== "Outra (Não listada)") {
            instOk = true;
        } else if (instSelect === "Outra (Não listada)" && instOutra) {
            instOk = true;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("E-mail inválido.", "error");
            return;
        }

        if (!nome || !email || !contato || !instOk || !mat || !rota || !inicioSem || !fimSem || !diasCheck || !turnosCheck) {
            showToast("Preencha todos os campos obrigatórios da Rota Acadêmica.", "error");
            triggerVibration([50, 50]);
            return;
        }
    }

    if (current === 3) {
        if (!getRadioValue('insc-23h') || !getRadioValue('insc-estagio') || !getRadioValue('insc-pcd') || !getRadioValue('insc-menor') || !getRadioValue('insc-criancas')) { 
            showToast("Por favor, responda a todas as perguntas de Sim/Não.", "error"); 
            return; 
        }

        const condBairro = document.getElementById('cond-bairro');
        if (condBairro && condBairro.classList.contains('cond-visible')) {
            const bairro = document.getElementById('insc-bairro-23h').value;
            if (!bairro) {
                showToast("Selecione o bairro de desembarque (23h).", "error");
                return;
            }
        }

        const condEstagio = document.getElementById('cond-estagio');
        if (condEstagio && condEstagio.classList.contains('cond-visible')) {
            const tipoVinculo = getValorCampoInscricao('insc-tipo-vinculo-estagio');
            const inicioEstagio = getValorCampoInscricao('insc-inicio-estagio');
            const fimEstagio = getValorCampoInscricao('insc-fim-estagio');
            const empresaEstagio = getValorCampoInscricao('insc-empresa-estagio');
            const parada = getValorCampoInscricao('insc-parada-estagio');
            const turnoEst = getValorCampoInscricao('insc-turno-estagio');
            const periodo = validarPeriodoEstagioInscricao(inicioEstagio, fimEstagio);

            if (!tipoVinculo || !inicioEstagio || !fimEstagio || !empresaEstagio || !parada || !turnoEst) {
                showToast("Preencha todos os dados do estagio.", "error");
                return;
            }

            if (!periodo.sucesso) {
                showToast(periodo.erro, "error");
                return;
            }

            if (!declaracaoEstagioAnexadaInscricao()) {
                showToast("Anexe a declaracao de vinculo do estagio.", "error");
                return;
            }
        }

        const condCid = document.getElementById('cond-cid');
        if (condCid && condCid.classList.contains('cond-visible')) {
            const cid = document.getElementById('insc-cid').value.trim();
            if (!cid) {
                showToast("Informe o CID (classificação da deficiência).", "error");
                return;
            }
        }
    }

    // ---- TRANSIÇÃO ----
    stepCurrent.classList.remove('step-visible');
    stepNext.classList.remove('step-visible');

    // Force re-trigger animation
    void stepNext.offsetWidth;

    stepNext.classList.add('step-visible');
    atualizarStepperUI(next);

    // Scroll to top of form
    const formCard = stepNext.closest('.form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stepperPrev(current, prev) {
    const stepCurrent = document.getElementById(`step-${current}`);
    const stepPrev = document.getElementById(`step-${prev}`);
    if (!stepCurrent || !stepPrev) return;

    stepCurrent.classList.remove('step-visible');
    stepPrev.classList.remove('step-visible');

    void stepPrev.offsetWidth;

    stepPrev.classList.add('step-visible');
    atualizarStepperUI(prev);

    const formCard = stepPrev.closest('.form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ----- Step 1: CPF Triagem -----

function formatarCPFInput(valor) {
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return nums.slice(0, 3) + '.' + nums.slice(3);
    if (nums.length <= 9) return nums.slice(0, 3) + '.' + nums.slice(3, 6) + '.' + nums.slice(6);
    return nums.slice(0, 3) + '.' + nums.slice(3, 6) + '.' + nums.slice(6, 9) + '-' + nums.slice(9, 11);
}

document.addEventListener('DOMContentLoaded', () => {
    const cpfInput = document.getElementById('insc-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function () {
            const pos = this.selectionStart;
            const oldLen = this.value.length;
            this.value = formatarCPFInput(this.value);
            const newLen = this.value.length;
            this.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
        });
    }

    const contatoInput = document.getElementById('insc-contato');
    if (contatoInput) {
        contatoInput.addEventListener('input', function (e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }
});

function obterSemestreAtualInscricaoMaestro() {
    try {
        const semesterContext = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester
            ? window.MaestroData.contexts.semester.get()
            : {};
        return semesterContext.semestreId || semesterContext.semestreAtual || semesterContext.activeSemesterId || "";
    } catch (e) {
        return "";
    }
}

async function verificarCPFInscricao() {
    const cpfRaw = document.getElementById('insc-cpf').value.replace(/\D/g, '');
    const btn = document.getElementById('btn-insc-verificar');
    const semestreId = obterSemestreAtualInscricaoMaestro();

    if (cpfRaw.length !== 11) {
        showToast("CPF inválido. Informe 11 dígitos.", "error");
        triggerVibration([50, 50]);
        return;
    }

    btn.innerText = "A VERIFICAR...";
    btn.disabled = true;

    try {
        // 1. Verificar duplicidade por semestre via API
        const resDuplicidade = await apiCall("verificarDuplicidadeCPF", { cpf: cpfRaw, semestreId: semestreId });

        // Se a API não responder corretamente, tratamos como erro de rede
        if (!resDuplicidade) throw new Error("Sem resposta da verificacao de CPF");

        if (resDuplicidade.sucesso === false) {
            showToast(resDuplicidade.erro || "Nao foi possivel verificar o CPF.", "error");
            btn.innerText = "VERIFICAR CPF";
            btn.disabled = false;
            triggerVibration([100, 50, 100]);
            return;
        }

        if (resDuplicidade.duplicado) {
            const mensagemDuplicidade = resDuplicidade.mensagem || "Ja existe uma inscricao ativa para este CPF neste semestre.";
            const feedbackBox = document.getElementById('cpf-feedback-box');
            if (feedbackBox) {
                feedbackBox.classList.remove('feedback-success', 'feedback-info');
                feedbackBox.classList.add('feedback-error');
                if (typeof escapeHTMLMaestro === 'function') {
                    feedbackBox.textContent = "⚠️ " + mensagemDuplicidade;
                } else
                feedbackBox.innerHTML = `⚠️ ${mensagemDuplicidade}`;
                feedbackBox.classList.remove('hidden');
            } else {
                showToast(mensagemDuplicidade, "error");
            }
            triggerVibration([100, 50, 100]);
            btn.innerText = "VERIFICAR CPF";
            btn.disabled = false;
            return;
        }

        // Caminho livre: buscar dados do root Firestore para autofill de renovacao.
        const res = await apiCall("verificarCpfRenovacao", { cpf: cpfRaw, semestreId: semestreId });

        if (!res.sucesso) {
            showToast(res.erro || "Erro ao verificar CPF.", "error");
            btn.innerText = "VERIFICAR CPF";
            btn.disabled = false;
            return;
        }

        if (res.isRenovacao && res.dados) {
            // Auto-fill para renovação
            const d = res.dados;
            const elNome = document.getElementById('insc-nome');
            const elEmail = document.getElementById('insc-email');
            const elRg = document.getElementById('insc-rg');
            const elContato = document.getElementById('insc-contato');
            const elInst = document.getElementById('insc-instituicao');
            const elMat = document.getElementById('insc-matricula');
            const elRota = document.getElementById('insc-rota');

            if (elNome && d.nome) elNome.value = d.nome;
            if (elEmail && d.email) elEmail.value = d.email;
            if (elRg && d.rg) elRg.value = d.rg;
            if (elContato && d.contato) elContato.value = d.contato;
            if (elMat && d.matricula) elMat.value = d.matricula;

            if (elInst && d.instituicao) {
                _selecionarOpcaoSelect(elInst, d.instituicao);
            }
            if (elRota && d.rota) {
                _selecionarOpcaoSelect(elRota, d.rota);
            }

            if (d.estagio === 'Sim') {
                const radioEstagio = document.querySelector('input[name="insc-estagio"][value="Sim"]');
                if (radioEstagio) radioEstagio.checked = true;
                toggleCondField('cond-estagio', true);

                const elTipoEstagio = document.getElementById('insc-tipo-vinculo-estagio');
                const elTurnoEstagio = document.getElementById('insc-turno-estagio');
                const elInicioEstagio = document.getElementById('insc-inicio-estagio');
                const elFimEstagio = document.getElementById('insc-fim-estagio');
                const elEmpresaEstagio = document.getElementById('insc-empresa-estagio');
                const elParadaEstagio = document.getElementById('insc-parada-estagio');

                if (elTipoEstagio && d.tipoVinculoEstagio) _selecionarOpcaoSelect(elTipoEstagio, d.tipoVinculoEstagio);
                if (elTurnoEstagio && d.turnoEstagio) _selecionarOpcaoSelect(elTurnoEstagio, d.turnoEstagio);
                if (elInicioEstagio && d.inicioEstagio) elInicioEstagio.value = d.inicioEstagio;
                if (elFimEstagio && d.fimEstagio) elFimEstagio.value = d.fimEstagio;
                if (elEmpresaEstagio && d.empresaInstituicaoEstagio) elEmpresaEstagio.value = d.empresaInstituicaoEstagio;
                if (elParadaEstagio && d.paradaEstagio) elParadaEstagio.value = d.paradaEstagio;
            }

            const feedbackBox = document.getElementById('cpf-feedback-box');
            if (feedbackBox) {
                feedbackBox.classList.remove('feedback-error', 'feedback-info');
                feedbackBox.classList.add('feedback-success');
                feedbackBox.innerHTML = "✅ Inscrição anterior encontrada! Os seus dados foram importados. Verifique-os na próxima etapa.";
                feedbackBox.classList.remove('hidden');
            }
            triggerVibration(50);
            setTimeout(() => { stepperNext(1, 2); }, 2000);
        } else {
            const feedbackBox = document.getElementById('cpf-feedback-box');
            if (feedbackBox) {
                feedbackBox.classList.remove('feedback-error', 'feedback-success');
                feedbackBox.classList.add('feedback-info');
                feedbackBox.innerHTML = "✨ Novo Cadastro! Prossiga para preencher os seus dados.";
                feedbackBox.classList.remove('hidden');
            }
            triggerVibration(50);
            setTimeout(() => { stepperNext(1, 2); }, 1500);
        }

    } catch (err) {
        console.error("Erro na verificação de CPF:", err);
        showToast("Falha de conexão ao servidor. Tente novamente.", "error");
    } finally {
        btn.innerText = "VERIFICAR CPF";
        btn.disabled = false;
    }
}

/**
 * Tenta selecionar uma opção de um <select> pelo valor.
 * Se não encontrar match exato, mantém a opção padrão.
 */
function _selecionarOpcaoSelect(selectEl, valor) {
    const valorLimpo = String(valor).trim().toLowerCase();
    for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value.trim().toLowerCase() === valorLimpo ||
            selectEl.options[i].text.trim().toLowerCase() === valorLimpo) {
            selectEl.selectedIndex = i;
            return;
        }
    }
    // Se não encontrou, não altera (fica em "Selecione...")
}

// ----- Step 3: Conditional Fields -----

function toggleCondField(fieldId, show) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    if (show) {
        field.classList.add('cond-visible');
    } else {
        field.classList.remove('cond-visible');
        // Clear sub-inputs when hidden
        field.querySelectorAll('input, select').forEach(el => {
            if (el.type === 'text' || el.type === 'tel' || el.type === 'date') el.value = '';
            if (el.type === 'file') el.value = '';
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
        });
        if (fieldId === 'cond-estagio') limparArquivoInscricao('estagio');
    }
}

// ----- Step 4: File Upload Processing -----

function getLabelArquivoInscricao(tipoDoc) {
    const labelIds = {
        menorIdade: 'label-insc-menor'
    };
    return document.getElementById(labelIds[tipoDoc] || `label-insc-${tipoDoc}`);
}

function limparArquivoInscricao(tipoDoc) {
    delete inscricaoArquivos[tipoDoc];
    const inputIds = {
        menorIdade: 'insc-file-menor'
    };
    const statusSpan = document.getElementById(`status-insc-${tipoDoc}`);
    const labelUpload = getLabelArquivoInscricao(tipoDoc);
    const inputArquivo = document.getElementById(inputIds[tipoDoc] || `insc-file-${tipoDoc}`);

    if (inputArquivo) inputArquivo.value = "";
    if (statusSpan) {
        atualizarStatusArquivoInscricao(statusSpan, "Nenhum arquivo selecionado", "idle");
    }
    if (labelUpload) {
        labelUpload.classList.remove('file-attached');
        labelUpload.innerHTML = "Toque para selecionar o arquivo";
    }
}

function processarArquivoInscricao(inputElement, tipoDoc) {
    const file = inputElement.files[0];
    const statusSpan = document.getElementById(`status-insc-${tipoDoc}`);
    const labelUpload = getLabelArquivoInscricao(tipoDoc);

    if (!file) {
        limparArquivoInscricao(tipoDoc);
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Arquivo muito grande (Máximo 5MB).", "error");
        limparArquivoInscricao(tipoDoc);
        if (statusSpan) {
            atualizarStatusArquivoInscricao(statusSpan, "Erro: Arquivo demasiado pesado.", "error");
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        inscricaoArquivos[tipoDoc] = {
            tipo: tipoDoc,
            nome: file.name,
            base64: e.target.result
        };
        if (statusSpan) {
            statusSpan.innerText = `✅ ${file.name}`;
            statusSpan.classList.remove('is-error', 'is-idle');
            statusSpan.classList.add('is-success');
        }
        if (labelUpload) {
            labelUpload.classList.add('file-attached');
            labelUpload.innerHTML = "✅ Arquivo anexado";
        }
    };
    reader.onerror = function () {
        showToast("Falha na leitura do arquivo.", "error");
        limparArquivoInscricao(tipoDoc);
        if (statusSpan) {
            atualizarStatusArquivoInscricao(statusSpan, "Erro na leitura.", "error");
        }
    };
    reader.readAsDataURL(file);
}

// ----- Step 4: Hybrid Photo Toggle -----

function toggleModoFoto(modo) {
    const areaCamera = document.getElementById('camera-3x4-area');
    const areaUpload = document.getElementById('upload-3x4-area');
    const btnCamera = document.getElementById('btn-modo-camera');
    const btnUpload = document.getElementById('btn-modo-upload');

    if (modo === 'camera') {
        if (areaCamera) areaCamera.classList.remove('hidden');
        if (areaUpload) areaUpload.classList.add('hidden');
        if (btnCamera) { btnCamera.classList.add('btn-modo-ativo'); btnCamera.classList.remove('btn-modo-inativo'); }
        if (btnUpload) { btnUpload.classList.add('btn-modo-inativo'); btnUpload.classList.remove('btn-modo-ativo'); }
        iniciarCamera3x4();
    } else {
        pararCameraInscricao();
        if (areaCamera) areaCamera.classList.add('hidden');
        if (areaUpload) areaUpload.classList.remove('hidden');
        if (btnCamera) { btnCamera.classList.add('btn-modo-inativo'); btnCamera.classList.remove('btn-modo-ativo'); }
        if (btnUpload) { btnUpload.classList.add('btn-modo-ativo'); btnUpload.classList.remove('btn-modo-inativo'); }
    }
}

// ----- Step 4: Camera 3x4 -----

async function iniciarCamera3x4() {
    const viewfinder = document.getElementById('camera-viewfinder');
    const video = document.getElementById('camera-video');
    const btnCapturar = document.getElementById('btn-capturar-foto');
    const preview = document.getElementById('camera-preview');
    const btnRefazer = document.getElementById('btn-refazer-foto');

    if (!viewfinder || !video) return;

    // Hide preview, show viewfinder
    if (preview) preview.classList.add('hidden');
    if (btnRefazer) btnRefazer.classList.add('hidden');

    // Stop any existing stream
    pararCameraInscricao();

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 480 },
                height: { ideal: 640 }
            }
        });

        video.srcObject = cameraStream;
        viewfinder.classList.remove('hidden');
        if (btnCapturar) btnCapturar.classList.remove('hidden');

    } catch (err) {
        console.error("Câmara:", err);
        showToast("Não foi possível aceder à câmara. Verifique as permissões.", "error");
    }
}

function capturarFoto3x4() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const preview = document.getElementById('camera-preview');
    const btnRefazer = document.getElementById('btn-refazer-foto');

    if (!video || !canvas || !preview || !cameraStream) return;

    // Captura imediata dos pixels no formato 3x4 antes de qualquer processamento pesado.
    const largura = 300;
    const altura = 400;
    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext('2d');

    // Espelha horizontalmente, pois a câmera frontal já é espelhada no CSS.
    ctx.translate(largura, 0);
    ctx.scale(-1, 1);

    // Calcula o recorte central do vídeo.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const aspectTarget = largura / altura;
    const aspectVideo = vw / vh;

    let sx, sy, sw, sh;
    if (aspectVideo > aspectTarget) {
        sh = vh;
        sw = vh * aspectTarget;
        sx = (vw - sw) / 2;
        sy = 0;
    } else {
        sw = vw;
        sh = vw / aspectTarget;
        sx = 0;
        sy = (vh - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, largura, altura);

    // Prioridade máxima: desliga o hardware imediatamente após a captura do frame.
    finalizarInscricaoLimparHardware();

    inscricaoFotoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    preview.src = inscricaoFotoBase64;
    preview.classList.remove('hidden');
    if (btnRefazer) btnRefazer.classList.remove('hidden');

    showToast("Foto capturada com sucesso!", "success");
    triggerVibration(50);
}

function finalizarInscricaoLimparHardware() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch (err) {
                console.warn("[Inscrição] Falha ao encerrar faixa da câmera:", err);
            }
        });
        cameraStream = null;
        console.log("[Inscrição] Câmera fechada por segurança.");
    }

    const video = document.getElementById('camera-video');
    if (video) video.srcObject = null;

    const viewfinder = document.getElementById('camera-viewfinder');
    if (viewfinder) viewfinder.classList.add('hidden');

    const btnCapturar = document.getElementById('btn-capturar-foto');
    if (btnCapturar) btnCapturar.classList.add('hidden');
}

function pararCameraInscricao() {
    finalizarInscricaoLimparHardware();
}

// ----- Form Payload Assembly -----

function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : '';
}

function getRadioSimNao(name) {
    return getRadioValue(name) === 'Sim' ? 'Sim' : 'Não';
}

function getCheckboxValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}

function base64PreenchidoInscricao(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return false;
    const marcador = 'base64,';
    const idx = texto.indexOf(marcador);
    if (idx !== -1) {
        return texto.substring(idx + marcador.length).trim().length > 0;
    }
    return true;
}

function getValorCampoInscricao(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function validarPeriodoEstagioInscricao(inicio, fim) {
    if (!inicio || !fim) {
        return { sucesso: false, erro: "Informe inicio e fim do vinculo de estagio." };
    }

    const dataInicio = new Date(`${inicio}T00:00:00`);
    const dataFim = new Date(`${fim}T00:00:00`);
    if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
        return { sucesso: false, erro: "Periodo de estagio invalido." };
    }
    if (dataFim < dataInicio) {
        return { sucesso: false, erro: "A data final do estagio deve ser posterior ao inicio." };
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataFim < hoje) {
        return { sucesso: false, erro: "A data final do estagio deve estar vigente." };
    }

    return { sucesso: true };
}

function declaracaoEstagioAnexadaInscricao() {
    return !!(inscricaoArquivos.estagio && base64PreenchidoInscricao(inscricaoArquivos.estagio.base64));
}

function prepararEnvioNativo() {
    const btn = document.getElementById('btn-submeter-inscricao');

    // Basic validation
    const cpf = document.getElementById('insc-cpf').value.replace(/\D/g, '');
    const nome = document.getElementById('insc-nome').value.trim();

    if (!cpf || cpf.length !== 11) {
        showToast("CPF inválido. Volte à etapa 1.", "error");
        return;
    }

    if (!nome) {
        showToast("Nome completo é obrigatório. Volte à etapa 2.", "error");
        return;
    }

    // Validação do Documento com Foto (RG/CNH) — obrigatório
    if (!inscricaoArquivos['documento'] || !base64PreenchidoInscricao(inscricaoArquivos['documento'].base64)) {
        showToast("O Documento com Foto (RG ou CNH) é obrigatório.", "error");
        return;
    }

    // Validação de Menor Idade
    if (getRadioValue('insc-menor') === 'Sim' && (!inscricaoArquivos['menorIdade'] || !base64PreenchidoInscricao(inscricaoArquivos['menorIdade'].base64))) {
        showToast("A Declaração de Responsabilidade para menores é obrigatória.", "error");
        return;
    }

    // Validação da Foto 3x4: câmera OU arquivo
    const fotoFinal = inscricaoFotoBase64 || (inscricaoArquivos['foto3x4'] ? inscricaoArquivos['foto3x4'].base64 : null);
    if (!base64PreenchidoInscricao(fotoFinal)) {
        showToast("A Foto 3x4 é obrigatória. Use a câmera ou anexe um arquivo.", "error");
        return;
    }

    const estagio = getRadioSimNao('insc-estagio');
    const tipoVinculoEstagio = getValorCampoInscricao('insc-tipo-vinculo-estagio');
    const inicioEstagio = getValorCampoInscricao('insc-inicio-estagio');
    const fimEstagio = getValorCampoInscricao('insc-fim-estagio');
    const empresaInstituicaoEstagio = getValorCampoInscricao('insc-empresa-estagio');
    const paradaEstagio = getValorCampoInscricao('insc-parada-estagio');
    const turnoEstagio = getValorCampoInscricao('insc-turno-estagio');

    if (estagio === 'Sim') {
        const periodo = validarPeriodoEstagioInscricao(inicioEstagio, fimEstagio);
        if (!tipoVinculoEstagio || !empresaInstituicaoEstagio || !paradaEstagio || !turnoEstagio) {
            showToast("Preencha todos os dados do estagio. Volte a etapa 3.", "error");
            return;
        }
        if (!periodo.sucesso) {
            showToast(periodo.erro, "error");
            return;
        }
        if (!declaracaoEstagioAnexadaInscricao()) {
            showToast("A declaracao de vinculo do estagio e obrigatoria.", "error");
            return;
        }
    }

    const menorIdade = getRadioSimNao('insc-menor');
    const acompanhado = getRadioSimNao('insc-criancas');
    const arquivosPayload = Object.assign({}, inscricaoArquivos, { fotoBase64: fotoFinal });
    const semestreId = obterSemestreAtualInscricaoMaestro();

    const payloadNativo = {
        // Step 1
        cpf: cpf,
        semestreId: semestreId,
        semestreAlvo: semestreId,

        // Step 2
        nome: nome,
        email: document.getElementById('insc-email').value.trim(),
        rg: document.getElementById('insc-rg').value.trim(),
        contato: document.getElementById('insc-contato').value.trim(),
        instituicao: document.getElementById('insc-instituicao').value.trim(),
        instituicaoOutra: document.getElementById('insc-instituicao-outra').value.trim(),
        matricula: document.getElementById('insc-matricula').value.trim(),
        rota: document.getElementById('insc-rota').value.trim(),
        diasDeUso: getCheckboxValues('insc-dias'),
        turnos: getCheckboxValues('insc-turnos'),
        inicioSemestre: document.getElementById('insc-inicio-semestre').value,
        fimSemestre: document.getElementById('insc-fim-semestre').value,

        // Step 3
        transporte23h: getRadioValue('insc-23h'),
        bairro23h: document.getElementById('insc-bairro-23h').value,
        estagio: estagio,
        transporteEstagio: estagio,
        tipoVinculoEstagio: tipoVinculoEstagio,
        inicioEstagio: inicioEstagio,
        fimEstagio: fimEstagio,
        empresaInstituicaoEstagio: empresaInstituicaoEstagio,
        paradaEstagio: paradaEstagio,
        turnoEstagio: turnoEstagio,
        declaracaoVinculoEstagio: inscricaoArquivos.estagio ? {
            tipo: inscricaoArquivos.estagio.tipo,
            nome: inscricaoArquivos.estagio.nome,
            anexada: true
        } : null,
        estagioDetalhes: {
            ativo: estagio === 'Sim',
            tipoVinculo: tipoVinculoEstagio,
            inicio: inicioEstagio,
            fim: fimEstagio,
            empresaInstituicao: empresaInstituicaoEstagio,
            parada: paradaEstagio,
            turno: turnoEstagio,
            declaracaoAnexada: declaracaoEstagioAnexadaInscricao()
        },
        possuiDeficiencia: getRadioValue('insc-pcd'),
        cidDeficiencia: document.getElementById('insc-cid').value.trim(),
        acompanhado: acompanhado,
        acompanhadoCriancas: acompanhado,
        menorIdade: menorIdade,

        // Step 4
        arquivos: arquivosPayload,
        fotoBase64: fotoFinal,

        // Metadata
        timestampEnvio: new Date().toISOString(),
        origemEnvio: 'PWA_NATIVA'
    };

    console.log("========== PAYLOAD INSCRIÇÃO NATIVA ==========");
    console.log(payloadNativo);
    console.log("===============================================");

    // Feedback visual.
    btn.innerHTML = "📤 A ENVIAR... ⏳";
    btn.disabled = true;

    // Desliga o hardware imediatamente antes do envio final.
    finalizarInscricaoLimparHardware();
    if (typeof pararTransmissaoGpsE_Radar === 'function') { 
        pararTransmissaoGpsE_Radar(true); 
    }

    apiCall("submeterInscricaoNativa", payloadNativo)
        .then(res => {
            if (res.sucesso) {
                finalizarInscricaoLimparHardware();
                showToast(res.msg || "Inscrição recebida com sucesso!", "success");
                triggerVibration([50, 30, 50]);
                // Reset do formulário e volta ao menu do estudante sem recarregar o app
                setTimeout(() => {
                    sessionStorage.setItem('MAESTRO_LAST_VIEW', 'view-aluno-menu');
                    switchView('view-aluno-menu');
                    _resetarFormularioInscricao();
                }, 2000);
            } else {
                showToast(res.erro || "Erro ao submeter inscrição.", "error");
                triggerVibration([100, 50, 100]);
                btn.innerHTML = "📤 SUBMETER INSCRIÇÃO";
                btn.disabled = false;
            }
        })
        .catch(err => {
            console.error("Erro de rede na inscrição:", err);
            showToast("Falha de conexão. Verifique a internet e tente novamente.", "error");
            btn.innerHTML = "📤 SUBMETER INSCRIÇÃO";
            btn.disabled = false;
        });
}

function _resetarFormularioInscricao() {
    // Limpa todos os inputs de texto do formulário
    const textIds = [
        'insc-cpf', 'insc-nome', 'insc-email', 'insc-rg', 'insc-contato', 'insc-matricula',
        'insc-inicio-semestre', 'insc-fim-semestre',
        'insc-tipo-vinculo-estagio', 'insc-inicio-estagio', 'insc-fim-estagio',
        'insc-empresa-estagio', 'insc-parada-estagio', 'insc-cid'
    ];
    textIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    // Reset checkboxes e radios
    document.querySelectorAll('#view-inscricao input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#view-inscricao input[type="radio"]').forEach(rb => {
        rb.checked = rb.defaultChecked;
    });

    // Reset all selects (instituição, rota, bairro, turno estágio)
    document.querySelectorAll('#view-inscricao select').forEach(sel => sel.selectedIndex = 0);

    // Reset conditional fields
    document.querySelectorAll('.cond-field').forEach(cf => cf.classList.remove('cond-visible'));

    // Reset file inputs (inclui novos campos: documento e foto3x4)
    const fileIds = ['insc-file-documento', 'insc-file-residencia', 'insc-file-vinculo', 'insc-file-foto3x4', 'insc-file-menor', 'insc-file-estagio'];
    fileIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    const statusIds = ['status-insc-documento', 'status-insc-residencia', 'status-insc-vinculo', 'status-insc-foto3x4', 'status-insc-menorIdade', 'status-insc-estagio'];
    statusIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) atualizarStatusArquivoInscricao(el, 'Nenhum arquivo selecionado', 'idle');
    });

    ['documento', 'residencia', 'vinculo', 'foto3x4', 'menorIdade', 'estagio'].forEach(limparArquivoInscricao);

    // Reset da câmera sem deixar hardware ativo fora da tela de inscrição.
    finalizarInscricaoLimparHardware();
    const preview = document.getElementById('camera-preview');
    if (preview) preview.classList.add('hidden');
    const btnRefazer = document.getElementById('btn-refazer-foto');
    if (btnRefazer) btnRefazer.classList.add('hidden');
    const viewfinder = document.getElementById('camera-viewfinder');
    if (viewfinder) viewfinder.classList.add('hidden');

    const viewInscricao = document.getElementById('view-inscricao');
    const inscricaoVisivel = viewInscricao && (
        viewInscricao.classList.contains('active-view') ||
        viewInscricao.classList.contains('active-view')
    );

    // Redefine o modo de foto com base na política de privacidade.
    if (localStorage.getItem('MAESTRO_PREF_CAMERA') === 'false') {
        toggleModoFoto('upload');
        const btnCamera = document.getElementById('btn-modo-camera');
        if (btnCamera) btnCamera.classList.add('hidden'); // Esconde o botão se a câmera estiver proibida
    } else {
        const btnCamera = document.getElementById('btn-modo-camera');
        if (btnCamera) btnCamera.classList.remove('hidden');
        if (inscricaoVisivel) {
            toggleModoFoto('camera');
        } else {
            const areaCamera = document.getElementById('camera-3x4-area');
            const areaUpload = document.getElementById('upload-3x4-area');
            const btnUpload = document.getElementById('btn-modo-upload');

            if (areaCamera) areaCamera.classList.remove('hidden');
            if (areaUpload) areaUpload.classList.add('hidden');
            if (btnCamera) { btnCamera.classList.add('btn-modo-ativo'); btnCamera.classList.remove('btn-modo-inativo'); }
            if (btnUpload) { btnUpload.classList.add('btn-modo-inativo'); btnUpload.classList.remove('btn-modo-ativo'); }
        }
    }

    // Redefine o estado interno.
    inscricaoArquivos = {};
    inscricaoFotoBase64 = null;

    // Redefine o stepper para a etapa 1.
    document.querySelectorAll('.step-container').forEach(sc => sc.classList.remove('step-visible'));
    const step1 = document.getElementById('step-1');
    if (step1) step1.classList.add('step-visible');
    atualizarStepperUI(1);

    // Carrega listas dinâmicas para dropdowns
    carregarListasInscricao();
}

// ========================================================================
// 9.1. LISTAS DINÂMICAS — POPULAÇÃO DE DROPDOWNS (V10.1 - FASE 03)
// ========================================================================

/**
 * Busca Instituições, Rotas e Bairros 23h da aba Configurações via API
 * e popula os <select> do Smart Stepper. Mantém as opções estáticas
 * ("Selecione..." e "Outra/Outro") intactas.
 */
async function carregarListasInscricao() {
    try {
        const res = await apiCall("getListsInscricao");
        if (!res || !res.sucesso) {
            console.warn("[LISTAS] Falha ao carregar listas dinâmicas:", res ? res.erro : "sem resposta");
            return;
        }

        _popularSelect('insc-instituicao', res.instituicoes || [], 'Outra (Não listada)');
        _popularSelect('insc-rota', res.rotas || [], 'Outra (Não listada)');
        _popularSelect('insc-bairro-23h', res.bairros || [], 'Outro');

        if (res.linkDeclaracaoMenor) {
            const linkMenor = document.getElementById('link-declaracao-menor');
            if (linkMenor) linkMenor.href = res.linkDeclaracaoMenor;
        }

    } catch (err) {
        console.warn("[LISTAS] Erro de rede ao carregar listas:", err);
    }
}

/**
 * Popula um <select> com opções dinâmicas, preservando a primeira opção
 * ("Selecione...") e a última opção fixa (fallback ex: "Outra").
 * @param {string} selectId - ID do elemento <select>.
 * @param {string[]} items - Array de valores a inserir.
 * @param {string} labelFallback - Texto da opção fixa final.
 */
function _popularSelect(selectId, items, labelFallback) {
    const select = document.getElementById(selectId);
    if (!select || !items || !Array.isArray(items) || items.length === 0) return;

    // Preservar a primeira opção ("Selecione...")
    const primeiraOpcao = select.options[0];

    // Limpar tudo
    select.innerHTML = '';

    // Re-inserir placeholder
    select.appendChild(primeiraOpcao);

    // Inserir opções dinâmicas
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        select.appendChild(opt);
    });

    // Re-inserir opção fixa (fallback) no final
    const optFallback = document.createElement('option');
    optFallback.value = labelFallback;
    optFallback.textContent = labelFallback;
    select.appendChild(optFallback);

    // Garantir que "Selecione..." está ativo
    select.selectedIndex = 0;
}


// 3. Módulos Operacionais & Secretaria
// ========================================================================
// 8.1. MOTOR DE MOBILIDADE: RADAR E ETA 
// ========================================================================

// --- Central Layout Detector ---
// Uses matchMedia for reliable CSS-synced breakpoint detection.
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

let onibusSelecionadoGPS = null;
let idIntervaloGPS = null;
let idIntervaloRadar = null;
let wakeLockAtivo = null;

let busMarker = null;
const busIcon = L.divIcon({
    className: 'custom-bus-marker',
    html: '<div class="bus-marker-dot">🚌</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Default city coordinates (Ceará-Mirim)
const CIDADE_DEFAULT_LAT = -5.6322;
const CIDADE_DEFAULT_LNG = -35.4267;

function setRadarStatusMobilidade(estado, texto) {
    const statusBar = document.getElementById('radar-status-bar');
    const statusText = document.getElementById('radar-status-text');
    if (!statusBar || !statusText) return;
    statusBar.classList.remove('is-standby', 'is-preparing', 'is-live', 'is-offline');
    statusBar.classList.add(`is-${estado}`);
    statusText.textContent = texto;
}

function classeLotacaoMobilidade(percentual) {
    const pctSeguro = Math.max(0, Math.min(100, Number(percentual) || 0));
    const bucket = Math.round(pctSeguro / 10) * 10;
    const nivel = pctSeguro > 90 ? "is-high" : (pctSeguro > 50 ? "is-medium" : "is-low");
    return `${nivel} occupancy-w-${bucket}`;
}

function normalizarArrayMobilidade(obj) {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object') return [];

    const chaves = Object.keys(obj);
    if (chaves.length === 0) return [];

    const chavesNumericas = chaves.filter(k => /^\d+$/.test(k));
    if (chavesNumericas.length === chaves.length) {
        return chavesNumericas
            .sort((a, b) => Number(a) - Number(b))
            .map(k => obj[k])
            .filter(Boolean);
    }

    if (Array.isArray(obj.values)) return obj.values;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.lista)) return obj.lista;

    return [];
}

function normalizarCoordenadasRadar(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

    const lat = Number(obj.lat ?? obj.latitude ?? obj.LATITUDE);
    const lng = Number(obj.lng ?? obj.longitude ?? obj.LONGITUDE);
    const ts = Number(obj.ts ?? obj.timestamp ?? Date.now());

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng, ts: Number.isFinite(ts) ? ts : Date.now() };
}

function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calcularETA(distanciaKm) {
    const velMediaKmH = 25;
    const tempoHoras = distanciaKm / velMediaKmH;
    const tempoMinutos = Math.round(tempoHoras * 60);
    if (tempoMinutos <= 2) return "A chegar!";
    return `~ ${tempoMinutos} min`;
}

function abrirRadarMasterView() {
    switchView('view-radar');

    if (typeof carregarViagensDisponiveisEstudante === 'function') {
        carregarViagensDisponiveisEstudante();
    }

    // Desktop: proactively initialize the map canvas with general city view
    // so the right pane is never blank while the trip list loads.
    if (isDesktop()) {
        const mapaContainer = document.getElementById('radar-mapa-container');
        if (mapaContainer) {
            mapaContainer.classList.remove('hidden');
            void mapaContainer.offsetHeight; // Synchronous reflow trigger

            requestAnimationFrame(() => {
                _inicializarMapaDesktopStandby();
            });
        }
    }
}

/**
 * Initializes a lightweight standby map for desktop split-view.
 * Shows general city area until a specific trip is selected.
 */
function _inicializarMapaDesktopStandby() {
    const container = document.getElementById('mapa-paradas-container');
    if (!container) return;
    container.classList.remove('hidden');

    // If a map already exists, just recalculate size
    if (mapInstance !== null) {
        mapInstance.invalidateSize();
        return;
    }

    mapInstance = L.map('mapa-paradas-container', { zoomControl: false })
        .setView([CIDADE_DEFAULT_LAT, CIDADE_DEFAULT_LNG], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Status bar: standby
    const statusBar = document.getElementById('radar-status-bar');
    const statusText = document.getElementById('radar-status-text');
    if (statusBar && statusText) {
        statusBar.classList.remove('is-preparing', 'is-live', 'is-offline');
        statusBar.classList.add('is-standby');
        statusText.textContent = '🗺️ Selecione uma viagem na lista';
    }

    setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
    }, 200);
}

function abrirMapaDaViagem(idViagem) {
    if (!window.lastViagens) return;
    const tripData = window.lastViagens.find(v => v.id === idViagem);
    if (!tripData) return;
    tripData.paradas = normalizarArrayMobilidade(tripData.paradas);

    const desktopActive = isDesktop();

    if (desktopActive) {
        // Desktop: map canvas is already visible via CSS split-view.
        // Just load the route data into the existing map instance.
        requestAnimationFrame(() => {
            inicializarMapaMobilidade(tripData);
            setTimeout(() => {
                if (mapInstance) mapInstance.invalidateSize();
            }, 150);
        });
    } else {
        // Mobile: standard Master-Detail toggle
        document.getElementById('radar-lista-container').classList.add('hidden');
        const mapaContainer = document.getElementById('radar-mapa-container');
        mapaContainer.classList.remove('hidden');

        void mapaContainer.offsetHeight;

        requestAnimationFrame(() => {
            inicializarMapaMobilidade(tripData);
            setTimeout(() => {
                if (mapInstance) mapInstance.invalidateSize();
            }, 150);
        });
    }
}

function fecharMapaVoltarLista() {
    const desktopActive = isDesktop();

    if (desktopActive) {
        // Desktop: don't toggle views — clear active route markers
        // and reset to general standby map view.
        if (mapInstance !== null) {
            mapInstance.off();
            mapInstance.remove();
            mapInstance = null;
            busMarker = null;
        }
        // Re-initialize the standby map so the pane isn't blank
        _inicializarMapaDesktopStandby();
    } else {
        // Mobile: toggle visibility back to list
        document.getElementById('radar-mapa-container').classList.add('hidden');
        document.getElementById('radar-lista-container').classList.remove('hidden');

        // Destroy map instance to save mobile memory
        if (mapInstance !== null) {
            mapInstance.off();
            mapInstance.remove();
            mapInstance = null;
            busMarker = null;
        }
    }
}

async function carregarViagensDisponiveisEstudante() {
    if (typeof currentWalletId === 'undefined' || !currentWalletId) {
        showToast("Sessão inválida para aceder às viagens.", "error");
        return;
    }

    const painelMob = document.getElementById('view-mobilidade');
    const containerLista = document.getElementById('lista-viagens-cards');
    const painelSucesso = document.getElementById('painel-viagem-ativa');

    if (painelMob) painelMob.classList.remove('hidden');
    if (painelSucesso) painelSucesso.innerHTML = '';

    if (containerLista) {
        containerLista.innerHTML = `<div class="loader radar-list-loader"></div><p class="radar-list-loading-text">A procurar autocarros...</p>`;
        containerLista.classList.remove('hidden');
    }

    try {
        if (painelMob) painelMob.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const res = await apiCall("getViagensDisponiveisPortal", { idEstudante: currentWalletId });
        console.warn("🔍 [DEBUG PWA] Raw response from getViagensDisponiveisPortal:");
        console.dir(res);

        if (!res.sucesso) {
            if (containerLista) containerLista.innerHTML = `<p class="mobility-error-text">Erro: ${res.erro}</p>`;
            return;
        }

        if (res.emViagem) {
            if (containerLista) containerLista.classList.add('hidden');
            onibusSelecionadoGPS = res.dadosViagem.idOnibus;
            abrirPainelViagem();
            return;
        }

        const viagens = normalizarArrayMobilidade(res.viagens);

        if (viagens.length === 0) {
            if (busMarker && typeof mapInstance !== 'undefined' && mapInstance) {
                mapInstance.removeLayer(busMarker);
            }
            busMarker = null;

            let msgEmpty = "Nenhum embarque previsto para agora.";
            if (res.statusOperacao === "FORA_DE_HORARIO") {
                msgEmpty = "<b>Fora do Horário de Embarque.</b><br>Os autocarros só aparecem aqui minutos antes da hora de partida da sua rota.";
            } else if (res.statusOperacao === "SEM_FROTA") {
                msgEmpty = "Não há autocarros ativos associados à sua rota neste momento.";
            } else if (res.statusOperacao === "ESTUDANTE_INATIVO") {
                msgEmpty = "A sua carteira não está ativa para embarque neste semestre.";
            } else if (res.statusOperacao === "DOCUMENTOS_PENDENTES") {
                msgEmpty = "A sua documentação ainda não permite embarque neste semestre.";
            }
            if (containerLista) containerLista.innerHTML = `<div class="mobility-empty-warning">${msgEmpty}</div>`;
            return;
        }

        let html = `<p class="mobility-list-hint">Selecione o seu autocarro para garantir lugar:</p>`;

        // Armazenar na window para acesso no check-in
        window.lastViagens = viagens;

        viagens.forEach((v, index) => {
            let checkinArea = "";
            let statusVagas = "";

            if (v.estadoRadar === "EM_OPERACAO") {
                const labelLota = v.vagasRestantes > 0 ? `<span class="mobility-seats is-available">${v.vagasRestantes} vagas livres</span>` : `<span class="mobility-seats is-full">LOTADO</span>`;
                const btnDisable = v.vagasRestantes <= 0 ? "disabled" : "";
                const btnState = v.vagasRestantes <= 0 ? " is-disabled" : "";
                statusVagas = labelLota;
                checkinArea = `<button class="hide-on-desktop mobility-checkin-button${btnState}" ${btnDisable} onclick="confirmarEmbarque('${v.id}')">FAZER CHECK-IN</button>`;
            } else {
                statusVagas = `<span class="mobility-seats is-closed">Embarque fechado (Capacidade: ${v.vagasRestantes})</span>`;
                checkinArea = `<button class="hide-on-desktop mobility-checkin-button is-disabled" disabled>AGUARDE...</button>`;
            }

            const cardState = index === 0 ? " is-primary" : " is-secondary";

            html += `
<div class="mobility-trip-card${cardState}">
  <div class="mobility-trip-header">
     <strong class="mobility-trip-title">🚌 ${v.rota}</strong>
     <span class="mobility-trip-time">${v.horario}</span>
  </div>
  <div class="mobility-trip-status">${statusVagas}</div>
  <div class="mobility-trip-actions">
     <button class="btn-solid mobility-map-button" onclick="abrirMapaDaViagem('${v.id}')">VER MAPA 🗺️</button>
     ${checkinArea}
  </div>
</div>`;
        });

        if (containerLista) containerLista.innerHTML = html;

    } catch (e) {
        if (containerLista) containerLista.innerHTML = `<p class="mobility-error-text">Não foi possível atualizar a logística.</p>`;
    }
}

async function confirmarEmbarque(idOnibus) {
    showToast("A verificar localização (GPS)...", "loading");

    if (!navigator.geolocation) {
        showToast("O GPS é obrigatório e deve estar exato para embarcar.", "error");
        return;
    }

    try {
        const posicao = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            });
        });

        const lat = posicao.coords.latitude;
        const lng = posicao.coords.longitude;

        // Geofencing 150m check if state is EM_OPERACAO
        if (window.lastViagens) {
            const tripData = window.lastViagens.find(v => v.id === idOnibus);
            const paradas = normalizarArrayMobilidade(tripData && tripData.paradas);
            if (tripData && tripData.estadoRadar === "EM_OPERACAO" && paradas.length > 0) {
                let isNearStop = false;
                for (let i = 0; i < paradas.length; i++) {
                    const dist = calcularDistanciaHaversine(lat, lng, paradas[i].LATITUDE, paradas[i].LONGITUDE);
                    if (dist <= 0.150) { // 150 metros = 0.150 km
                        isNearStop = true;
                        break;
                    }
                }
                if (!isNearStop) {
                    showToast("Deve estar a menos de 150m de uma paragem para fazer check-in nesta fase.", "error");
                    return;
                }
            }
        }

        showToast("GPS adquirido. A processar lugar...", "loading");

        const res = await apiCall("realizarCheckInOnibus", {
            idOnibus: idOnibus,
            idEstudante: currentWalletId,
            lat: lat,
            lng: lng
        });

        if (res.sucesso) {
            showToast("Lugar Confirmado!", "success");
            onibusSelecionadoGPS = idOnibus;

            const desktopActive = isDesktop();

            // On mobile, hide the list; on desktop, keep both visible
            if (!desktopActive) {
                document.getElementById('radar-lista-container').classList.add('hidden');
            }
            const mapaContainer = document.getElementById('radar-mapa-container');
            mapaContainer.classList.remove('hidden');
            
            abrirPainelViagem();

            void mapaContainer.offsetHeight;

            requestAnimationFrame(() => {
                // Initialize the map for the confirmed trip
                if (window.lastViagens) {
                    const tripData = window.lastViagens.find(v => v.id === idOnibus);
                    if (tripData) {
                        inicializarMapaMobilidade(tripData);
                    }
                }

                // Force Leaflet to recalculate size
                setTimeout(() => {
                    if (mapInstance) mapInstance.invalidateSize();
                }, 150);
            });
        } else {
            showToast(res.erro || "Lotação atingida no momento do clique.", "error");
            carregarViagensDisponiveisEstudante();
        }
    } catch (e) {
        if (e instanceof GeolocationPositionError || (e && e.code)) {
            showToast("O GPS é obrigatório e deve estar exato para embarcar.", "error");
        } else {
            showToast("Erro ao processar reserva.", "error");
        }
    }
}

function abrirPainelViagem() {
    const painelSucesso = document.getElementById('painel-viagem-ativa');
    if (!painelSucesso) return;

    painelSucesso.innerHTML = `
      <div class="radar-trip-confirmed">
         <h3 class="radar-trip-title">✅ Check-in Confirmado</h3>
         <p class="radar-trip-text">O seu lugar está garantido. Acompanhe a viagem no radar abaixo.</p>
         <div id="radar-dinamico-conteudo" class="radar-dynamic-box">
            <div class="loader radar-inline-loader"></div>
            <p class="radar-inline-loading-text">A sincronizar radar...</p>
         </div>
      </div>
    `;
    painelSucesso.classList.remove('hidden');

    atualizarRadarDinamico();
    if (idIntervaloRadar) clearInterval(idIntervaloRadar);
    idIntervaloRadar = setInterval(atualizarRadarDinamico, 30000);
}

async function atualizarRadarDinamico() {
    if (!onibusSelecionadoGPS) return;
    const boxRadar = document.getElementById('radar-dinamico-conteudo');
    if (!boxRadar) return;

    try {
        const res = await apiCall("statusRadarOnibus", { idOnibus: onibusSelecionadoGPS, idEstudante: currentWalletId });
        const coordenadasRadar = normalizarCoordenadasRadar(res && res.coordenadas);

        if (coordenadasRadar) {
            atualizarPosicaoOnibusMapa(coordenadasRadar.lat, coordenadasRadar.lng);
        }

        // --- Injetar CSS de animação ---
        // --- UI do Guia (Transmissor Ativo) ---
        if (res.isGuia) {
            boxRadar.innerHTML = `
                <div class="radar-guide-card">
                   <div class="radar-guide-icon">📡</div>
                   <h4 class="radar-guide-title">Transmissão Ativa</h4>
                   <p class="radar-guide-text">O seu GPS está a guiar os seus colegas.</p>
                   <span class="radar-guide-count">${res.totalGuias || 1} guia(s) conectado(s)</span>
                   <button onclick="abdicarSerGuia()" class="btn-solid radar-stop-guide-button">Ajudando a comunidade (Parar)</button>
                </div>
            `;
        }
        // --- UI do Passageiro (com ETA Híbrido) ---
        else if (res.guiaAtivo && coordenadasRadar) {
            // Recruitment: Require explicit consent, auto-volunteer removed.

            boxRadar.innerHTML = `
                <div class="radar-live-card">
                   <div class="radar-live-header">
                      <strong class="radar-live-title"><span class="radar-live-pin">📍</span> Radar ao Vivo</strong>
                      <span class="radar-guide-badge">${res.totalGuias || 1} guia(s)</span>
                   </div>
                   <div id="radar-eta-slot" class="radar-eta-slot">
                      <div><div class="loader radar-eta-loader"></div><p class="radar-eta-loading-text">A calcular ETA...</p></div>
                   </div>
                   <button onclick="atualizarRadarDinamico()" class="btn-text radar-refresh-button">🔄 Atualizar Agora</button>
                </div>
            `;

            // Fetch posição do passageiro e chamar ETA Híbrido
            _buscarETAHibrido(coordenadasRadar);
        }
        // --- Radar Inativo (sem guias) ---
        else {
            // Recruitment: Require explicit consent, auto-volunteer removed.

            boxRadar.innerHTML = `
                <div class="radar-inactive-card">
                   <div class="radar-inactive-icon">📡</div>
                   <h4 class="radar-inactive-title">Radar Inativo</h4>
                   <p class="radar-inactive-text">A tentar ligar ao radar comunitário...</p>
                   <button onclick="solicitarSerGuia()" class="btn-solid radar-start-guide-button">Seja o Guia (Ligar GPS)</button>
                </div>
            `;
        }
    } catch (e) {
        // Silencioso
    }
}

/**
 * Busca posição do passageiro via Geolocation e chama calcularETAHibrido.
 * Renderiza o resultado no slot #radar-eta-slot com badge de método.
 */
function _buscarETAHibrido(coordenadasBus) {
    const etaSlot = document.getElementById('radar-eta-slot');
    if (!etaSlot) return;
    const coordsBus = normalizarCoordenadasRadar(coordenadasBus);
    if (!coordsBus) return;

    if (!navigator.geolocation) {
        _renderizarETAFallbackSemGPS(etaSlot, coordsBus);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (posPassageiro) {
            const latEst = posPassageiro.coords.latitude;
            const lngEst = posPassageiro.coords.longitude;

            apiCall("calcularETAHibrido", {
                latBus: coordsBus.lat,
                lngBus: coordsBus.lng,
                latEstudante: latEst,
                lngEstudante: lngEst
            }).then(function (resEta) {
                if (!resEta || !resEta.sucesso) {
                    // Fallback local se API falhar
                    const distLocal = calcularDistanciaHaversine(latEst, lngEst, coordsBus.lat, coordsBus.lng);
                    _renderizarETANoSlot(etaSlot, distLocal, calcularETA(distLocal), "HAVERSINE_FALLBACK", coordsBus.ts);
                    return;
                }
                const etaTexto = resEta.etaMinutos <= 2 ? "A chegar!" : `~ ${resEta.etaMinutos} min`;
                _renderizarETANoSlot(etaSlot, resEta.distanciaKm, etaTexto, resEta.metodo, coordsBus.ts);
            }).catch(function () {
                const distLocal = calcularDistanciaHaversine(latEst, lngEst, coordsBus.lat, coordsBus.lng);
                _renderizarETANoSlot(etaSlot, distLocal, calcularETA(distLocal), "HAVERSINE_FALLBACK", coordsBus.ts);
            });
        },
        function () {
            _renderizarETAFallbackSemGPS(etaSlot, coordsBus);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
}

/**
 * Renderiza ETA com badge de método no slot.
 */
function _renderizarETANoSlot(slot, distKm, etaTexto, metodo, tsBus) {
    const tempoAtras = calcularTempoRelativo(tsBus);
    let badgeHTML = '';
    if (metodo === 'MAPS_API' || metodo === 'MAPS_CACHE') {
        badgeHTML = '<span class="eta-method-badge is-google">⚡ Tempo Real (Google)</span>';
    } else {
        badgeHTML = '<span class="eta-method-badge is-math">📍 Estimativa Matemática</span>';
    }

    const distFormatada = typeof distKm === 'number' ? distKm.toFixed(1) : distKm;

    slot.innerHTML = `
        <div class="eta-box">
           <div class="eta-row eta-row-spaced">
              <span class="eta-label">Distância:</span>
              <strong class="eta-value">${distFormatada} km</strong>
           </div>
           <div class="eta-row eta-row-main">
              <span class="eta-label">Chega em:</span>
              <strong class="eta-value eta-value-accent">${etaTexto}</strong>
           </div>
           <div class="eta-row">
              ${badgeHTML}
              <span class="eta-updated">Atualizado: ${tempoAtras}</span>
           </div>
        </div>
    `;
}

/**
 * Fallback quando GPS do passageiro não está disponível.
 */
function _renderizarETAFallbackSemGPS(slot, coordenadasBus) {
    const coordsBus = normalizarCoordenadasRadar(coordenadasBus);
    if (!coordsBus) return;
    const tempoAtras = calcularTempoRelativo(coordsBus.ts);
    slot.innerHTML = `
        <div class="eta-fallback">
           <h4 class="eta-fallback-title">📍 Autocarro em Movimento</h4>
           <p class="eta-fallback-text">Ative a localização para ver distância e ETA.</p>
           <span class="eta-updated">Último sinal: ${tempoAtras}</span>
        </div>
    `;
}

async function solicitarSerGuia() {
    // GUARD: Desktop PCs should not attempt GPS guide broadcasting
    if (typeof isDesktop === 'function' && isDesktop()) {
        showToast('Funcionalidade de guia GPS disponível apenas em dispositivos móveis.', 'info');
        return;
    }

    // BLOQUEIO DE PRIVACIDADE: Aborta se o aluno desligou o GPS
    if (localStorage.getItem('MAESTRO_PREF_GPS') === 'false') return;

    showToast("A solicitar permissão ao servidor...", "loading");
    const boxRadar = document.getElementById('radar-dinamico-conteudo');
    if (boxRadar) boxRadar.innerHTML = `<div class="loader loader-center"></div>`;

    try {
        const res = await apiCall("solicitarCargoGuia", { idOnibus: onibusSelecionadoGPS, idEstudante: currentWalletId });
        if (res.sucesso) {
            iniciarTransmissaoGpsComoGuia();
        } else {
            showToast(res.erro, "warning");
            atualizarRadarDinamico();
        }
    } catch (e) {
        showToast("Erro ao contactar o servidor.", "error");
        atualizarRadarDinamico();
    }
}

async function iniciarTransmissaoGpsComoGuia() {
    if (!navigator.geolocation) {
        abdicarSerGuia();
        return;
    }

    // GUARD: On desktop with operator/admin profiles, bypass continuous
    // GPS telemetry to avoid console errors on hardware without GPS chips.
    if (isDesktop() && typeof currentPerfilOperador !== 'undefined' && currentPerfilOperador) {
        console.info('[Maestro] Desktop operator detected — GPS guide transmission bypassed.');
        showToast('GPS guia não disponível em modo desktop.', 'info');
        return;
    }

    // Evitar dupla inicialização
    if (idIntervaloGPS) return;

    try {
        if ('wakeLock' in navigator) {
            wakeLockAtivo = await navigator.wakeLock.request('screen');
        }

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                enviarCoordenadaSegura(pos.coords.latitude, pos.coords.longitude);

                if (idIntervaloGPS) clearInterval(idIntervaloGPS);
                idIntervaloGPS = setInterval(() => {
                    navigator.geolocation.getCurrentPosition(
                        p => enviarCoordenadaSegura(p.coords.latitude, p.coords.longitude),
                        e => console.warn("GPS falhou a leitura.")
                    );
                }, 120000);

                // Silencioso: atualiza radar sem toast
                atualizarRadarDinamico();
            },
            function (err) {
                // GPS negado silenciosamente — não prejudica UX do passageiro
                abdicarSerGuia();
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
    } catch (err) {
        abdicarSerGuia();
    }
}

function enviarCoordenadaSegura(lat, lng) {
    if (!onibusSelecionadoGPS || !currentWalletId) return;

    apiCall("atualizarGPSOnibus", {
        idOnibus: onibusSelecionadoGPS,
        idEstudante: currentWalletId,
        lat: lat,
        lng: lng
    }).then(res => {
        if (res && !res.sucesso) {
            console.warn("Servidor rejeitou o GPS (Timeout ou Roubo): " + res.erro);
            pararTransmissaoGpsE_Radar();
            atualizarRadarDinamico();
        }
    }).catch(e => {
        // Silencioso
    });
}

async function abdicarSerGuia() {
    pararTransmissaoGpsE_Radar(false);
    showToast("A libertar GPS...", "loading");
    try {
        await apiCall("abdicarCargoGuia", { idOnibus: onibusSelecionadoGPS, idEstudante: currentWalletId });
        showToast("Transmissão encerrada com segurança.", "info");
        atualizarRadarDinamico();
    } catch (e) {
        atualizarRadarDinamico();
    }
}

function pararTransmissaoGpsE_Radar(matarRadarTambem = true) {
    if (idIntervaloGPS) { clearInterval(idIntervaloGPS); idIntervaloGPS = null; }
    if (matarRadarTambem && idIntervaloRadar) { clearInterval(idIntervaloRadar); idIntervaloRadar = null; }
    if (wakeLockAtivo) { wakeLockAtivo.release().then(() => wakeLockAtivo = null); }
}

let mapInstance = null;

async function inicializarMapaMobilidade(dadosViagem) {
    const container = document.getElementById('mapa-paradas-container');
    if (!container) return;
    dadosViagem = dadosViagem || {};
    const paradasViagem = normalizarArrayMobilidade(dadosViagem.paradas);

    container.classList.remove('hidden');

    if (mapInstance !== null) {
        mapInstance.off();
        mapInstance.remove();
        mapInstance = null;
    }

    // Default coordinate for Ceará-Mirim or use the first stop's coordinates
    let centerLat = -5.6322;
    let centerLng = -35.4267;

    if (paradasViagem.length > 0) {
        centerLat = paradasViagem[0].LATITUDE;
        centerLng = paradasViagem[0].LONGITUDE;
    }

    mapInstance = L.map('mapa-paradas-container', { zoomControl: false }).setView([centerLat, centerLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Apply Progressive UI States
    const estado = dadosViagem.estadoRadar || "AGUARDANDO";
    const statusBar = document.getElementById('radar-status-bar');
    const statusText = document.getElementById('radar-status-text');

    if (statusBar && statusText) {
        if (estado === "AGUARDANDO") {
            statusBar.classList.remove('is-preparing', 'is-live', 'is-offline');
            statusBar.classList.add('is-standby');
            statusText.textContent = "🕒 Fase de Planeamento";
        } else if (estado === "PREPARANDO") {
            statusBar.classList.remove('is-standby', 'is-live', 'is-offline');
            statusBar.classList.add('is-preparing');
            statusText.textContent = "⚙️ Autocarros em Preparação";
        } else if (estado === "EM_OPERACAO") {
            statusBar.classList.remove('is-standby', 'is-preparing', 'is-offline');
            statusBar.classList.add('is-live');
            statusText.textContent = "🚌 Operação em Tempo Real";
        } else {
            statusBar.classList.remove('is-standby', 'is-preparing', 'is-live');
            statusBar.classList.add('is-offline');
            statusText.textContent = "Fora de Serviço";
        }
    }

    if (dadosViagem.geojson_url) {
        try {
            const response = await fetch(dadosViagem.geojson_url);
            if (response.ok) {
                const geojsonData = await response.json();
                const routeLayer = L.geoJSON(geojsonData, {
                    style: { color: '#0A3D6B', weight: 4 },
                    filter: function (feature) {
                        // Prevent Leaflet crash if export tool generated a null geometry
                        if (!feature.geometry || normalizarArrayMobilidade(feature.geometry.coordinates).length === 0) {
                            console.warn("🛡️ [PWA] Invalid GeoJSON feature ignored:", feature);
                            return false; // Skip this feature
                        }
                        // HOT FIX: Only allow LineString or MultiLineString, skip Points
                        if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
                            return false;
                        }
                        return true; // Keep valid features
                    }
                }).addTo(mapInstance);

                // Adjust map bounds to the route
                mapInstance.fitBounds(routeLayer.getBounds());
            }
        } catch (error) {
            console.error("Erro ao carregar GeoJSON da rota:", error);
        }
    }

    if (paradasViagem.length > 0) {
        paradasViagem.forEach(parada => {
            const tipoStr = String(parada.TIPO_PARADA || "Secundaria").toUpperCase().trim();
            let popupContent = `<b>${parada.NOME_PARADA}</b><br><span class="map-popup-type">${tipoStr}</span>`;

            if (estado === "EM_OPERACAO") {
                const maxCapacidade = 50; // Approximated default if unknown
                const lotacaoReal = (maxCapacidade - dadosViagem.vagasRestantes) > 0 ? (maxCapacidade - dadosViagem.vagasRestantes) : 0;
                const ocupacaoPct = Math.min(100, Math.round((lotacaoReal / maxCapacidade) * 100));
                const classeLotacao = classeLotacaoMobilidade(ocupacaoPct);

                popupContent += `
                    <br>Autocarro: ${dadosViagem.placa || ''}
                    <br><span class="map-popup-eta">ETA: (Calculando ao vivo)</span>
                    <div class="map-popup-occupancy">
                        <span class="map-popup-occupancy-label">Lotação: ${ocupacaoPct}%</span>
                        <div class="map-popup-occupancy-track">
                            <div class="map-popup-occupancy-fill ${classeLotacao}"></div>
                        </div>
                    </div>`;
            } else {
                popupContent += `<br><br><span class="map-popup-closed">Embarque ainda fechado.</span>`;
            }

            if (tipoStr === "PRINCIPAL") {
                L.marker([parada.LATITUDE, parada.LONGITUDE])
                    .addTo(mapInstance)
                    .bindPopup(popupContent);
            } else {
                const secondaryIcon = L.divIcon({
                    className: 'custom-sec-marker',
                    html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#fef08a" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="secondary-stop-icon">
                             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                             <circle cx="12" cy="10" r="3" fill="#ea580c"></circle>
                           </svg>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 20],
                    popupAnchor: [0, -18]
                });

                L.marker([parada.LATITUDE, parada.LONGITUDE], { icon: secondaryIcon })
                    .addTo(mapInstance)
                    .bindPopup(popupContent);
            }
        });
    }

    if (estado === "EM_OPERACAO") {
        // Create a visual indicator that bus is operating even if GPS hasn't caught up
        if (!busMarker && centerLat && centerLng) {
            atualizarPosicaoOnibusMapa(centerLat, centerLng);
        }
    } else {
        if (busMarker && mapInstance) {
            mapInstance.removeLayer(busMarker);
            busMarker = null;
        }
    }
}

function atualizarPosicaoOnibusMapa(lat, lng) {
    if (typeof mapInstance === 'undefined' || !mapInstance) return;
    const coords = normalizarCoordenadasRadar({ lat, lng });
    if (!coords) return;

    if (busMarker === null) {
        busMarker = L.marker([coords.lat, coords.lng], { icon: busIcon }).addTo(mapInstance);
    } else {
        if (busMarker.slideTo) {
            busMarker.slideTo([coords.lat, coords.lng], { duration: 2500, keepAtCenter: false });
        } else {
            busMarker.setLatLng([coords.lat, coords.lng]);
        }
    }
}

let userLocationMarker = null;

function centralizarMapaEmMim() {
    if (!navigator.geolocation) {
        showToast("O seu dispositivo não suporta geolocalização.", "error");
        return;
    }

    showToast("A obter a sua localização...", "loading");

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (mapInstance) {
                mapInstance.setView([lat, lng], 16);

                if (userLocationMarker === null) {
                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: '<div class="user-location-dot"></div>',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    });
                    userLocationMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstance);
                } else {
                    userLocationMarker.setLatLng([lat, lng]);
                }
            }
            showToast("Localização atualizada.", "success");
        },
        function (err) {
            showToast("Não foi possível obter a sua localização.", "error");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ========================================================================
// GLOBAL: Resize listener for Leaflet tile integrity on desktop
// Prevents tile tearing when the browser window is maximized/restored.
// ========================================================================
window.addEventListener('resize', () => {
    if (typeof mapInstance !== 'undefined' && mapInstance !== null) {
        mapInstance.invalidateSize();
    }
});

// ========================================================================
// 4. MESA DE AUDITORIA & GESTÃO DOCUMENTAL
// ========================================================================

let arrayAlunosAuditoria = [];
let arrayAlunosAuditoriaFiltrado = [];
let paginaAtualAuditoria = 1;     // NOVO: Guarda a página atual
const ITENS_POR_PAGINA = 10;      // NOVO: Exibe 10 alunos por bloco

function escapeHTMLAuditoria(valor) {
    if (typeof escapeHTMLMaestro === 'function') return escapeHTMLMaestro(valor);
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeDomIdAuditoria(valor) {
    if (typeof safeDomIdMaestro === 'function') return safeDomIdMaestro(valor);
    return String(valor || "item").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80);
}

function safeJsStringAttrAuditoria(valor) {
    if (typeof safeJsStringAttrMaestro === 'function') return safeJsStringAttrMaestro(valor);
    return escapeHTMLAuditoria(JSON.stringify(String(valor ?? "")));
}

function safeUrlAttrOperacao(valor, fallback = "") {
    const bruto = String(valor || "").trim();
    if (!bruto) return escapeHTMLAuditoria(fallback);
    if (typeof safeUrlAttrMaestro === 'function') return safeUrlAttrMaestro(bruto);
    try {
        const url = new URL(bruto, window.location.href);
        if (["http:", "https:", "mailto:"].includes(url.protocol) || bruto.startsWith("./") || bruto.startsWith("/") || bruto.startsWith("#")) {
            return escapeHTMLAuditoria(bruto);
        }
    } catch (e) {
        if (bruto.startsWith("./") || bruto.startsWith("/") || bruto.startsWith("#")) return escapeHTMLAuditoria(bruto);
    }
    return escapeHTMLAuditoria(fallback);
}

function cpfSeguroAuditoria(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function getSemestreRaioXAtual() {
    const input = document.getElementById('rx-linha-base');
    return input ? String(input.dataset.semestreId || "") : "";
}

function primeiroValorAuditoria(...valores) {
    for (const valor of valores) {
        if (valor !== undefined && valor !== null && String(valor).trim() !== "") return valor;
    }
    return "";
}

function toArrayAuditoria(valor) {
    if (Array.isArray(valor)) return valor.filter(item => String(item || "").trim() !== "");
    if (valor === undefined || valor === null || valor === "") return [];
    return String(valor).split(/[;,|+]/).map(item => item.trim()).filter(Boolean);
}

function textoTurnosAuditoria(turnos, fallback) {
    const lista = toArrayAuditoria(turnos);
    return lista.length ? lista.join(" + ") : String(fallback || "");
}

function adapterAuditStudentMaestro() {
    return window.MaestroData &&
        window.MaestroData.adapters &&
        typeof window.MaestroData.adapters.auditStudent === "function"
        ? window.MaestroData.adapters.auditStudent
        : null;
}

function adapterComunicacaoMaestro(nome) {
    return window.MaestroData &&
        window.MaestroData.adapters &&
        typeof window.MaestroData.adapters[nome] === "function"
        ? window.MaestroData.adapters[nome]
        : null;
}

function payloadComunicacaoMaestro(nome) {
    return window.MaestroData &&
        window.MaestroData.payloadBuilders &&
        typeof window.MaestroData.payloadBuilders[nome] === "function"
        ? window.MaestroData.payloadBuilders[nome]
        : null;
}

function limitePostagensMuralMaestro(resposta) {
    if (resposta && (resposta.limiteSemanal || resposta.limitePostagensSemanais)) {
        return Number(resposta.limiteSemanal || resposta.limitePostagensSemanais) || 4;
    }
    return window.MaestroData && window.MaestroData.rules
        ? Number(window.MaestroData.rules.muralWeeklyPostLimit || 4)
        : 4;
}

function renderizarOptionPushMaestro(valor) {
    const seguro = escapeHTMLAuditoria(valor);
    return `<option value="${seguro}">${seguro}</option>`;
}

function normalizarSimNaoAuditoria(valor) {
    const texto = String(valor || "").trim().toLowerCase();
    return ["sim", "s", "true", "1", "yes"].includes(texto);
}

function normalizarEstagioAuditoria(estagioAdaptado, origem) {
    const source = origem || {};
    const cond = source.condicionais || {};
    const anexos = source.anexos_drive || {};
    const detalhesRaw = source.estagioDetalhes || source.estagio_detalhes || cond.estagio_detalhes || {};
    const detalhes = detalhesRaw && typeof detalhesRaw === "object" && !Array.isArray(detalhesRaw) ? detalhesRaw : {};
    const estagioBase = estagioAdaptado && typeof estagioAdaptado === "object" && !Array.isArray(estagioAdaptado) ? estagioAdaptado : {};
    const estagio = Object.assign({}, detalhes, estagioBase);
    const ativo = estagio.ativo === true || normalizarSimNaoAuditoria(primeiroValorAuditoria(
        estagio.ativo,
        source.estagio,
        source.estagioAtivo,
        source.ESTAGIO,
        source.ESTAGIO_ALUNO,
        source.transporteEstagio,
        source.TRANSPORTE_ESTAGIO,
        cond.estagio,
        cond.transporte_estagio
    ));

    return {
        ativo: ativo,
        tipoVinculo: primeiroValorAuditoria(estagio.tipoVinculo, estagio.tipo_vinculo, source.tipoVinculoEstagio, source.TIPO_VINCULO_ESTAGIO, cond.tipo_vinculo_estagio),
        inicio: primeiroValorAuditoria(estagio.inicio, source.inicioEstagio, source.INICIO_ESTAGIO, cond.inicio_estagio),
        fim: primeiroValorAuditoria(estagio.fim, source.fimEstagio, source.FIM_ESTAGIO, cond.fim_estagio),
        empresaInstituicao: primeiroValorAuditoria(estagio.empresaInstituicao, estagio.empresa_instituicao, source.empresaInstituicaoEstagio, source.EMPRESA_INSTITUICAO_ESTAGIO, source.EMPRESA_ESTAGIO, cond.empresa_instituicao_estagio),
        transporte: primeiroValorAuditoria(estagio.transporte, source.transporteEstagio, source.TRANSPORTE_ESTAGIO, cond.transporte_estagio),
        parada: primeiroValorAuditoria(estagio.parada, source.paradaEstagio, source.PARADA_ESTAGIO, source.ROTA_ESTAGIO, cond.parada_estagio),
        turno: primeiroValorAuditoria(estagio.turno, source.turnoEstagio, source.TURNO_ESTAGIO, source.TURNO_ESTAGIO_ALUNO, cond.turno_estagio),
        declaracaoVinculo: primeiroValorAuditoria(estagio.declaracaoVinculo, estagio.declaracao_url, source.declaracaoVinculoEstagio, source.DECLARACAO_VINCULO_ESTAGIO, source.ANEXO_COMPROVANTE_ESTAGIO, anexos.declaracao_vinculo_estagio, anexos.comprovante_estagio),
        statusValidacao: primeiroValorAuditoria(estagio.statusValidacao, source.statusValidacaoEstagio, source.STATUS_VALIDACAO_ESTAGIO, cond.status_validacao_estagio),
        alteracaoCiclo: primeiroValorAuditoria(estagio.alteracaoCiclo, source.alteracaoEstagioCiclo, source.ALTERACAO_ESTAGIO_CICLO, cond.alteracao_estagio_ciclo, null)
    };
}

function normalizarAlunoAuditoria(raw) {
    const origem = raw || {};
    const adapter = adapterAuditStudentMaestro();
    const adaptado = adapter ? adapter(origem) : {};
    const cpf = cpfSeguroAuditoria(primeiroValorAuditoria(adaptado.cpf, origem.cpf, origem.CPF_ALUNO));
    const turnos = toArrayAuditoria(primeiroValorAuditoria(adaptado.turnos, origem.turnos, origem.TURNOS_ALUNO, origem.turno));
    const turnoTexto = textoTurnosAuditoria(turnos, primeiroValorAuditoria(adaptado.turno, origem.turno, origem.TURNOS_ALUNO));
    const statusAuditoria = String(primeiroValorAuditoria(adaptado.statusAuditoria, adaptado.statusValidacao, origem.statusAuditoria, origem.statusValidacao, origem.STATUS_VALIDACAO, origem.STATUS_OCR, "PENDENTE")).toUpperCase();
    const statusAtividade = String(primeiroValorAuditoria(adaptado.statusAtividade, origem.statusAtividade, origem.STATUS_ATIVIDADE, "PENDENTE")).toUpperCase();
    const statusDocs = String(primeiroValorAuditoria(adaptado.statusDocs, origem.statusDocs, origem.STATUS_DOCS, "")).toUpperCase();
    const estagio = normalizarEstagioAuditoria(adaptado.estagio, origem);

    return Object.assign({}, origem, adaptado, {
        id: primeiroValorAuditoria(adaptado.id, origem.id, cpf),
        cpf: cpf,
        CPF_ALUNO: cpf,
        nome: primeiroValorAuditoria(adaptado.nome, origem.nome, origem.NOME_ALUNO, "Desconhecido"),
        NOME_ALUNO: primeiroValorAuditoria(adaptado.nome, origem.NOME_ALUNO, origem.nome, "Desconhecido"),
        email: primeiroValorAuditoria(adaptado.email, origem.email, origem.EMAIL_ALUNO),
        EMAIL_ALUNO: primeiroValorAuditoria(adaptado.email, origem.EMAIL_ALUNO, origem.email),
        matricula: primeiroValorAuditoria(adaptado.matricula, origem.matricula, origem.MATRICULA_ALUNO),
        MATRICULA_ALUNO: primeiroValorAuditoria(adaptado.matricula, origem.MATRICULA_ALUNO, origem.matricula),
        instituicao: primeiroValorAuditoria(adaptado.instituicao, origem.instituicao, origem.INSTITUICAO_ALUNO),
        INSTITUICAO_ALUNO: primeiroValorAuditoria(adaptado.instituicao, origem.INSTITUICAO_ALUNO, origem.instituicao),
        rota: primeiroValorAuditoria(adaptado.rota, origem.rota, origem.ROTA_ALUNO),
        ROTA_ALUNO: primeiroValorAuditoria(adaptado.rota, origem.ROTA_ALUNO, origem.rota),
        turno: turnoTexto,
        TURNOS_ALUNO: turnoTexto,
        turnos: turnos,
        dias: primeiroValorAuditoria(adaptado.dias, origem.dias, origem.DIAS_ALUNO),
        semestreId: primeiroValorAuditoria(adaptado.semestreId, origem.semestreId, origem.semestreAtual, origem.semestre),
        semestreAtual: primeiroValorAuditoria(adaptado.semestreId, origem.semestreAtual, origem.semestreId, origem.semestre),
        timestamp: primeiroValorAuditoria(adaptado.timestamp, origem.timestamp, 0),
        statusAuditoria: statusAuditoria,
        statusValidacao: statusAuditoria,
        STATUS_VALIDACAO: statusAuditoria,
        statusAtividade: statusAtividade,
        STATUS_ATIVIDADE: statusAtividade,
        statusDocs: statusDocs,
        STATUS_DOCS: statusDocs,
        observacoes: primeiroValorAuditoria(adaptado.observacoes, origem.observacoes, origem.OBSERVACOES),
        documentos: adaptado.documentos || origem.documentos || origem.anexos || origem.anexos_drive || {},
        estagio: estagio
    });
}

function buscarAlunoAuditoria(cpf, semestreId = "") {
    const cpfLimpo = cpfSeguroAuditoria(cpf);
    const semestreSeguro = String(semestreId || "").trim();
    return arrayAlunosAuditoria.find(a => cpfSeguroAuditoria(a.cpf || a.CPF_ALUNO) === cpfLimpo && (!semestreSeguro || String(a.semestreId || a.semestreAtual || "") === semestreSeguro)) ||
        arrayAlunosAuditoria.find(a => cpfSeguroAuditoria(a.cpf || a.CPF_ALUNO) === cpfLimpo);
}

function encontrarIndiceAlunoAuditoria(cpf, semestreId = "") {
    const cpfLimpo = cpfSeguroAuditoria(cpf);
    const semestreSeguro = String(semestreId || "").trim();
    let index = arrayAlunosAuditoria.findIndex(a => cpfSeguroAuditoria(a.cpf || a.CPF_ALUNO) === cpfLimpo && (!semestreSeguro || String(a.semestreId || a.semestreAtual || "") === semestreSeguro));
    if (index === -1) index = arrayAlunosAuditoria.findIndex(a => cpfSeguroAuditoria(a.cpf || a.CPF_ALUNO) === cpfLimpo);
    return index;
}

function formatarDataAuditoria(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    const normalizado = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto;
    const data = new Date(normalizado);
    if (Number.isNaN(data.getTime())) return texto;
    return data.toLocaleDateString('pt-BR');
}

function renderizarEstagioRaioX(aluno) {
    const box = document.getElementById('rx-estagio-box');
    const resumo = document.getElementById('rx-estagio-resumo');
    const detalhes = document.getElementById('rx-estagio-detalhes');
    const badge = document.getElementById('rx-estagio-status');
    if (!box || !resumo || !detalhes || !badge) return;

    const estagio = aluno && aluno.estagio ? aluno.estagio : {};
    const temDados = estagio.ativo || estagio.tipoVinculo || estagio.inicio || estagio.fim || estagio.empresaInstituicao || estagio.declaracaoVinculo;
    if (!temDados) {
        box.classList.add("hidden");
        resumo.textContent = "";
        detalhes.innerHTML = "";
        badge.textContent = "";
        return;
    }

    const periodo = [formatarDataAuditoria(estagio.inicio), formatarDataAuditoria(estagio.fim)].filter(Boolean).join(" ate ");
    const ciclo = estagio.alteracaoCiclo || {};
    const cicloTexto = ciclo && typeof ciclo === "object"
        ? `Alteracoes do ciclo: ${primeiroValorAuditoria(ciclo.usadas, 0)}/${primeiroValorAuditoria(ciclo.limite, 1)}`
        : "";

    badge.textContent = primeiroValorAuditoria(estagio.statusValidacao, "PENDENTE");
    resumo.textContent = [
        primeiroValorAuditoria(estagio.tipoVinculo, "Vinculo informado"),
        periodo
    ].filter(Boolean).join(" - ");
    detalhes.innerHTML = `
        <div><span>Empresa/instituicao</span><strong>${escapeHTMLAuditoria(primeiroValorAuditoria(estagio.empresaInstituicao, "Nao informado"))}</strong></div>
        <div><span>Turno</span><strong>${escapeHTMLAuditoria(primeiroValorAuditoria(estagio.turno, "Nao informado"))}</strong></div>
        <div><span>Parada</span><strong>${escapeHTMLAuditoria(primeiroValorAuditoria(estagio.parada, "Nao informado"))}</strong></div>
        <div><span>Declaracao</span><strong>${estagio.declaracaoVinculo ? "Anexada" : "Nao anexada"}</strong></div>
        ${cicloTexto ? `<div class="raio-x-span-2"><span>Ciclo</span><strong>${escapeHTMLAuditoria(cicloTexto)}</strong></div>` : ""}
    `;
    box.classList.remove("hidden");
}

window.forcarResetSenhaEstudante = async function(cpf) {
    const alerta = window.confirm("⚠️ ATENÇÃO OPERADOR:\n\nIsto apagará a senha atual do estudante. A conta voltará ao estado de 'Primeiro Acesso' e a senha provisória será os 4 últimos dígitos do CPF.\n\nDeseja continuar?");
    if (!alerta) return;

    showToast("A resetar credenciais...", "loading");
    try {
        const res = await apiCall("resetarSenhaEstudanteAdmin", { cpf: cpf });
        if (res.sucesso) {
            showToast(res.mensagem, "success");
        } else {
            showToast(res.erro || "Falha ao resetar acesso.", "error");
        }
    } catch (e) {
        showToast("Erro de comunicação com o servidor.", "error");
    }
};

function formatarNomeProprio(nome) {
    if (!nome) return "Estudante";
    const preposicoes = ["da", "de", "do", "das", "dos", "e"];
    return nome.toString().toLowerCase().split(' ').map(function (palavra) {
        if (palavra === "") return "";
        if (preposicoes.indexOf(palavra) !== -1) return palavra;
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    }).join(' ').trim();
}

function abrirMesaAuditoria() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("auditoria", { notify: true })) return;

    switchView('view-auditoria');
    carregarFilaAuditoria();
}

async function carregarFilaAuditoria(ehPesquisa = false) {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const container = document.getElementById('auditoria-fila-container');

    // Sempre que carregar a lista ou pesquisar, volta à página 1
    paginaAtualAuditoria = 1;

    container.innerHTML = '<div class="loading-state-box dynamic-state-box dynamic-loading-state"><div class="loader"></div><p>A puxar a fila de trabalho...</p></div>';

    try {
        const pesquisaAtual = ehPesquisa ? (document.getElementById('auditoria-pesquisa')?.value.trim() || "") : "";
        const semesterContext = (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester)
            ? window.MaestroData.contexts.semester.get()
            : {};
        const res = await apiCall("getListaAuditoria", {
            pesquisa: pesquisaAtual,
            limite: 50,
            semestreId: semesterContext.semestreId || semesterContext.semestreAtual || ""
        });
        if (res.sucesso) {
            arrayAlunosAuditoria = Array.isArray(res.lista) ? res.lista.map(normalizarAlunoAuditoria) : [];
            aplicarFiltrosAuditoria();
        } else {
            container.innerHTML = `
                <div class="error-state-box dynamic-state-box dynamic-error-state">
                    <span class="error-icon">⚠️</span>
                    <h3>Erro ao Carregar Fila</h3>
                    <p>${escapeHTMLAuditoria(res.erro)}</p>
                    ${res.detalhes ? `<small>${escapeHTMLAuditoria(res.detalhes)}</small>` : ""}
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `
            <div class="error-state-box dynamic-state-box dynamic-error-state">
                <span class="error-icon">📡</span>
                <h3>Falha na Ligação</h3>
                <p>Não foi possível conectar com o servidor: ${escapeHTMLAuditoria(e.message)}</p>
            </div>
        `;
    }
}

function aplicarFiltrosAuditoria() {
    const termo = document.getElementById('auditoria-pesquisa')?.value.trim().toLowerCase() || "";
    const status = (document.getElementById('auditoria-status')?.value || "").toLowerCase();
    const instituicao = (document.getElementById('auditoria-instituicao')?.value || "").toLowerCase();
    const turno = (document.getElementById('auditoria-turno')?.value || "").toLowerCase();

    arrayAlunosAuditoriaFiltrado = arrayAlunosAuditoria.filter(aluno => {
        let matchPesquisa = true;
        if (termo) {
            const nomeStr = String(aluno.nome || aluno.NOME_ALUNO || "").toLowerCase();
            const cpfStr = String(aluno.cpf || aluno.CPF_ALUNO || "").toLowerCase();
            const emailStr = String(aluno.email || aluno.EMAIL_ALUNO || "").toLowerCase();
            const matriculaStr = String(aluno.matricula || aluno.MATRICULA_ALUNO || "").toLowerCase();
            matchPesquisa = nomeStr.includes(termo) || cpfStr.includes(termo) || emailStr.includes(termo) || matriculaStr.includes(termo);
        }

        let matchStatus = true;
        if (status) {
            const statusVal = String(aluno.statusAuditoria || aluno.statusValidacao || aluno.STATUS_VALIDACAO || "").toLowerCase();
            const statusAtv = String(aluno.statusAtividade || aluno.STATUS_ATIVIDADE || "").toLowerCase();
            matchStatus = (statusVal === status || statusAtv === status);
        }

        let matchInst = true;
        if (instituicao) {
            const instVal = String(aluno.instituicao || aluno.INSTITUICAO_ALUNO || "").toLowerCase();
            matchInst = (instVal === instituicao);
        }

        let matchTurno = true;
        if (turno) {
            const turnoVal = String(aluno.turno || aluno.TURNOS_ALUNO || "").toLowerCase();
            const turnosVal = toArrayAuditoria(aluno.turnos).join(" ").toLowerCase();
            matchTurno = (turnoVal === turno || turnoVal.includes(turno) || turnosVal.includes(turno));
        }

        return matchPesquisa && matchStatus && matchInst && matchTurno;
    });

    paginaAtualAuditoria = 1;
    renderizarListaAuditoria();
}

function renderizarListaAuditoria() {
    const container = document.getElementById('auditoria-fila-container');

    if (!arrayAlunosAuditoriaFiltrado || arrayAlunosAuditoriaFiltrado.length === 0) {
        container.innerHTML = `<div class="empty-state-box dynamic-state-box dynamic-empty-state admin-audit-empty"><h3>🎉 Fila Vazia!</h3><p>Todos os pedidos foram atendidos ou não há resultados.</p></div>`;
        return;
    }

    // Matemática da Paginação
    const totalPaginas = Math.ceil(arrayAlunosAuditoriaFiltrado.length / ITENS_POR_PAGINA);
    const inicio = (paginaAtualAuditoria - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const itensPagina = arrayAlunosAuditoriaFiltrado.slice(inicio, fim);

    let html = `
        <div class="auditoria-table-wrapper dynamic-table-wrapper admin-audit-table-wrapper">
            <table class="auditoria-table dynamic-table">
                <thead>
                    <tr>
                        <th>Estudante</th>
                        <th>Submissão</th>
                        <th>Status</th>
                        <th>Estágio</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    itensPagina.forEach(aluno => {
        let badgeClass = 'badge-auditoria-pendente';
        if (aluno.statusAuditoria === "ANALISE_HUMANA" || aluno.statusAuditoria === "PENDENCIA") { badgeClass = 'badge-auditoria-retido'; }
        else if (aluno.statusAuditoria === "ALERTA_FRAUDE" || aluno.statusAtividade === "SUSPENSO") { badgeClass = 'badge-auditoria-fraude'; }
        else if (aluno.statusAuditoria === "PENDENTE") { badgeClass = 'badge-auditoria-pendente'; }
        else if (aluno.statusAtividade === "ATIVO") { badgeClass = 'badge-auditoria-ativo'; }

        let d = new Date(aluno.timestamp);
        let strData = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (isNaN(d.getTime()) || aluno.timestamp === 0) strData = "Sem data registada";

        const cpfAluno = cpfSeguroAuditoria(aluno.cpf || aluno.CPF_ALUNO);
        const nomeTratado = escapeHTMLAuditoria(formatarNomeProprio(aluno.nome || aluno.NOME_ALUNO));
        const statusAuditoria = escapeHTMLAuditoria(aluno.statusAuditoria || aluno.STATUS_VALIDACAO || "");
        const strDataSeguro = escapeHTMLAuditoria(strData);
        const semestreSeguro = escapeHTMLAuditoria(aluno.semestreId || aluno.semestreAtual || "");
        const estagio = aluno.estagio || {};
        const badgeEstagio = (estagio.ativo || estagio.tipoVinculo || estagio.statusValidacao)
            ? `<span class="auditoria-badge badge-auditoria-estagio">Estagio ${escapeHTMLAuditoria(estagio.statusValidacao || "")}</span>`
            : "";

        html += `
        <tr class="auditoria-row dynamic-table-row">
            <td data-label="Estudante">
                <div class="auditoria-student-info">
                    <strong class="auditoria-nome">${nomeTratado}</strong>
                    <span class="auditoria-sub-info">CPF: ${cpfAluno}</span>
                </div>
            </td>
            <td data-label="Submissão">
                <span class="auditoria-data">${strDataSeguro}</span>
            </td>
            <td data-label="Status">
                <span class="auditoria-badge dynamic-status-badge ${badgeClass}">${statusAuditoria}</span>
            </td>
            <td data-label="Estágio">
                ${badgeEstagio || '<span class="text-light">-</span>'}
            </td>
            <td data-label="Ações">
                <button class="btn-solid btn-auditoria-detalhar" data-cpf="${cpfAluno}" data-semestre-id="${semestreSeguro}" onclick="abrirModalRaioX(this.dataset.cpf, this.dataset.semestreId)">Detalhar</button>
            </td>
        </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    // Rodapé de Paginação
    if (totalPaginas > 1) {
        const btnPrevDisabled = paginaAtualAuditoria === 1 ? 'disabled' : `onclick="mudarPaginaAuditoria(-1)"`;
        const btnNextDisabled = paginaAtualAuditoria === totalPaginas ? 'disabled' : `onclick="mudarPaginaAuditoria(1)"`;

        html += `
        <div class="auditoria-paginacao dynamic-pagination">
            <button class="btn-solid dark-bg btn-paginacao" ${btnPrevDisabled}>⬅ Ant.</button>
            <span class="paginacao-texto">Pág. ${paginaAtualAuditoria} de ${totalPaginas}</span>
            <button class="btn-solid dark-bg btn-paginacao" ${btnNextDisabled}>Próx. ➡</button>
        </div>`;
    }

    container.innerHTML = html;
}

// NOVA FUNÇÃO: Acionada pelas setas de paginação
function mudarPaginaAuditoria(direcao) {
    paginaAtualAuditoria += direcao;
    renderizarListaAuditoria();
    // Faz scroll suave até ao topo da lista
    document.getElementById('view-auditoria').scrollIntoView({ behavior: 'smooth' });
}

function abrirModalRaioX(cpf, semestreId = "") {
    const cpfLimpo = cpfSeguroAuditoria(cpf);
    const aluno = buscarAlunoAuditoria(cpfLimpo, semestreId);
    if (!aluno) return;

    const nomeTratado = formatarNomeProprio(aluno.nome || aluno.NOME_ALUNO);
    const semestreAluno = String(aluno.semestreId || aluno.semestreAtual || aluno.semestre || "");

    document.getElementById('rx-nome').innerText = nomeTratado;
    document.getElementById('rx-cpf').innerText = cpfLimpo;
    document.getElementById('rx-matricula').innerText = aluno.matricula || aluno.MATRICULA_ALUNO || "";
    document.getElementById('rx-email').innerText = aluno.email || aluno.EMAIL_ALUNO || "";
    document.getElementById('rx-logistica').innerText = [
        aluno.instituicao || aluno.INSTITUICAO_ALUNO || "",
        aluno.turno || aluno.TURNOS_ALUNO || "",
        aluno.rota || aluno.ROTA_ALUNO || ""
    ].filter(Boolean).join(" - ");
    document.getElementById('rx-status-badge').innerText = aluno.statusAtividade || aluno.STATUS_ATIVIDADE || "";

    document.getElementById('rx-novo-status').value = aluno.statusAtividade || aluno.STATUS_ATIVIDADE || "";
    document.getElementById('rx-notas').value = aluno.observacoes || "";
    document.getElementById('rx-linha-base').value = cpfLimpo;
    document.getElementById('rx-linha-base').dataset.semestreId = semestreAluno;
    renderizarEstagioRaioX(aluno);

    let anexoHtml = '';
    const docsMapa = {
        'FOTO': '🖼️ Foto',
        'DOCUMENTO': '🪪 Doc. ID',
        'VINCULO': '🎓 Vínculo',
        'RESIDENCIA': '🏠 Morada',
        'ESTAGIO': '💼 Estágio'
    };

    for (const [chave, rotulo] of Object.entries(docsMapa)) {
        anexoHtml += `<button class="btn-chip-anexo" data-cpf="${cpfLimpo}" data-tipo="${chave}" data-semestre-id="${escapeHTMLAuditoria(semestreAluno)}" onclick="abrirDocumentoSeguro(this.dataset.cpf, this.dataset.tipo, this.dataset.semestreId)">${escapeHTMLAuditoria(rotulo)}</button>`;
    }

    document.getElementById('rx-documentos-grid').innerHTML = anexoHtml;

    document.getElementById('modal-raio-x-aluno').classList.remove('hidden');
}

function fecharModalRaioX() {
    document.getElementById('modal-raio-x-aluno').classList.add('hidden');
}

async function abrirDocumentoSeguro(cpf, tipoDoc, semestreId = "") {
    const docViewer = document.getElementById('modal-doc-viewer');
    const contentBox = document.getElementById('doc-viewer-content');
    const cpfLimpo = cpfSeguroAuditoria(cpf);
    const semestreAtual = semestreId || getSemestreRaioXAtual();

    document.getElementById('doc-viewer-title').innerText = "A descarregar: " + tipoDoc;
    contentBox.innerHTML = '<div class="loader"></div>';
    docViewer.classList.remove('hidden');

    try {
        const res = await apiCall("verFicheiroBase64", { cpf: cpfLimpo, tipoDocumento: tipoDoc, semestreId: semestreAtual });

        if (res.sucesso && res.base64) {
            document.getElementById('doc-viewer-title').innerText = tipoDoc;
            const mimeType = /^[-\w.]+\/[-\w.+]+$/.test(String(res.mimeType || "")) ? String(res.mimeType) : "application/octet-stream";
            const fullBase64 = `data:${mimeType};base64,${String(res.base64 || "")}`;

            if (mimeType.includes("image")) {
                contentBox.innerHTML = `<img src="${fullBase64}" class="zoom-hover doc-viewer-image" alt="Documento do estudante">`;
            } else if (mimeType.includes("pdf")) {
                contentBox.innerHTML = `<embed src="${fullBase64}" width="100%" height="100%" type="application/pdf">`;
            } else {
                contentBox.innerHTML = `<div class="error-box">Formato não suportado: ${escapeHTMLAuditoria(mimeType)}</div>`;
            }
        } else {
            contentBox.innerHTML = `<div class="error-box">Erro: ${escapeHTMLAuditoria(res.erro)}</div>`;
        }
    } catch (e) {
        contentBox.innerHTML = `<div class="error-box">Falha de rede: ${escapeHTMLAuditoria(e.message)}</div>`;
    }
}

function fecharModalDocViewer() {
    document.getElementById('modal-doc-viewer').classList.add('hidden');
    document.getElementById('doc-viewer-content').innerHTML = ''; // Limpa memória Base64
}

async function gravarDecisaoAuditoria() {
    const cpf = cpfSeguroAuditoria(document.getElementById('rx-linha-base').value);
    const novoStatus = document.getElementById('rx-novo-status').value;
    const notas = document.getElementById('rx-notas').value;
    const semestreId = getSemestreRaioXAtual();

    showToast("A gravar e a notificar o estudante...", "loading");

    try {
        const res = await apiCall("atualizarStatusAluno", { cpf: cpf, novoStatus: novoStatus, motivo: notas, notasOperador: notas, semestreId: semestreId });
        if (res.sucesso) {
            showToast("Alteração guardada com sucesso!", "success");
            fecharModalRaioX();
            let alunoIndex = encontrarIndiceAlunoAuditoria(cpf, semestreId);
            if (alunoIndex !== -1) {
                arrayAlunosAuditoria[alunoIndex] = normalizarAlunoAuditoria(Object.assign({}, arrayAlunosAuditoria[alunoIndex], {
                    statusAtividade: res.statusAtividade || novoStatus,
                    STATUS_ATIVIDADE: res.statusAtividade || novoStatus,
                    statusAuditoria: res.statusValidacao || arrayAlunosAuditoria[alunoIndex].statusAuditoria,
                    statusValidacao: res.statusValidacao || arrayAlunosAuditoria[alunoIndex].statusValidacao,
                    STATUS_VALIDACAO: res.statusValidacao || arrayAlunosAuditoria[alunoIndex].STATUS_VALIDACAO,
                    statusDocs: res.statusDocs || arrayAlunosAuditoria[alunoIndex].statusDocs,
                    STATUS_DOCS: res.statusDocs || arrayAlunosAuditoria[alunoIndex].STATUS_DOCS,
                    observacoes: res.observacoes || notas
                }));
                aplicarFiltrosAuditoria();
            }
        } else {
            showToast(res.erro || "Falha ao gravar.", "error");
        }
    } catch (e) {
        showToast("Erro na ligação ao servidor: " + e.message, "error");
    }
}

async function acionarIAParaEmail() {
    const notasTexto = document.getElementById('rx-notas').value.trim();
    if (!notasTexto) {
        showToast("Escreva o motivo da retenção nas notas primeiro.", "error");
        return;
    }

    const cpf = cpfSeguroAuditoria(document.getElementById('rx-linha-base').value);
    const semestreId = getSemestreRaioXAtual();
    const btnIa = document.querySelector("button[onclick='acionarIAParaEmail()']");
    if (btnIa) {
        btnIa.innerText = "A Redigir... ⏳";
        btnIa.disabled = true;
    }

    try {
        const res = await apiCall("enviarParecerOperador", { cpf: cpf, textoRevisado: notasTexto, semestreId: semestreId });
        if (res.sucesso) {
            showToast("E-mail disparado para o estudante!", "success");
        } else {
            showToast(res.erro, "error");
        }
    } catch (e) {
        showToast("Falha ao comunicar com motor de E-mails: " + e.message, "error");
    } finally {
        if (btnIa) {
            btnIa.innerText = "✨ Gerar E-mail IA";
            btnIa.disabled = false;
        }
    }
}

document.addEventListener('keydown', (e) => {
    const modalRaioX = document.getElementById('modal-raio-x-aluno');
    if (!modalRaioX || modalRaioX.classList.contains('hidden')) return;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toUpperCase();
    if (key === 'A') {
        e.preventDefault();
        document.getElementById('rx-novo-status').value = 'ATIVO';
        gravarDecisaoAuditoria();
    } else if (key === 'R') {
        e.preventDefault();
        document.getElementById('rx-novo-status').value = 'CANCELADO';
    } else if (key === 'P') {
        e.preventDefault();
        document.getElementById('rx-novo-status').value = 'PENDENTE';
    }
});

// ========================================================================
// 5. MÓDULO DO MODERADOR (SALA DAS MÁQUINAS V9.2.8)
// ========================================================================

async function abrirPainelModerador() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("salaMaquinas", { notify: true })) return;

    switchView('view-moderador');
    const loader = document.getElementById('loader-sincronizacao-motores');

    if (loader) loader.classList.remove('hidden');

    try {
        const res = await apiCall("getStatusMotores");
        if (res.sucesso && res.estados) {
            const toggleETL = document.getElementById('toggle-motor-etl');
            const toggleOCR = document.getElementById('toggle-motor-ocr');
            const toggleDOCS = document.getElementById('toggle-motor-docs');
            const toggleEMAIL = document.getElementById('toggle-motor-email');

            if (toggleETL) toggleETL.checked = res.estados.ETL;
            if (toggleOCR) toggleOCR.checked = res.estados.OCR;
            if (toggleDOCS) toggleDOCS.checked = res.estados.DOCS;
            if (toggleEMAIL) toggleEMAIL.checked = res.estados.EMAIL;
        }
    } catch (err) {
        showToast("Não foi possível ler o estado dos motores: " + err.message, "error");
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

async function forcarMotor(motorId) {
    showToast(`A enviar sinal para o motor ${motorId}...`, "loading");
    try {
        const res = await apiCall("forcarExecucaoMotor", { motorId: motorId });
        if (res.sucesso) showToast(res.msg, "success");
        else showToast(res.erro, "error");
    } catch (e) {
        showToast("Ocorreu um erro ao acionar o motor: " + e.message, "error");
    }
}

async function alterarMotor(motorId, isLigado) {
    showToast(`A alterar configurações de ${motorId}...`, "loading");
    try {
        const res = await apiCall("alterarEstadoMotor", { motorId: motorId, ligado: isLigado });
        if (res.sucesso) showToast(res.msg, "success");
        else showToast(res.erro, "error");
    } catch (e) {
        showToast("Ocorreu um erro ao alterar o motor: " + e.message, "error");
    }
}


// ========================================================================
// NOTA: O MODO FISCAL E ADMINISTRAÇÃO AVANÇADA foram extraídos para admin_fiscal.js
// O MÓDULO DE FROTA E SOS foram extraídos para admin_sos.js
// ========================================================================

function abrirModalMural() {
    document.getElementById('modal-nova-mensagem').classList.remove('hidden');
    document.getElementById('mural-mensagem').value = '';
}

function fecharModalMural() {
    document.getElementById('modal-nova-mensagem').classList.add('hidden');
    const btn = document.getElementById('btn-enviar-mural');
    btn.innerHTML = 'PUBLICAR NO MURAL';
    btn.disabled = false;
}

async function enviarMensagemParaMural() {
    const categoria = document.getElementById('mural-categoria').value;
    const mensagem = document.getElementById('mural-mensagem').value.trim();
    const btn = document.getElementById('btn-enviar-mural');

    if (mensagem.length < 10) { showToast("A mensagem é muito curta.", "error"); return; }

    btn.innerHTML = 'A VALIDAR QUOTA... ⏳';
    btn.disabled = true;

    try {
        setTimeout(() => {
            if (btn.disabled) btn.innerHTML = 'A AUDITAR CONTEÚDO... 🤖';
        }, 1500);

        const builderMural = payloadComunicacaoMaestro("muralPost");
        const payloadMural = builderMural ? builderMural({
            idEstudante: currentWalletId,
            usuarioLogadoId: currentWalletId,
            nomeEstudante: currentStudentName,
            categoria: categoria,
            mensagem: mensagem
        }) : { idEstudante: currentWalletId, nomeEstudante: currentStudentName, categoria: categoria, mensagem: mensagem };
        const res = await apiCall("publicarMensagemMural", payloadMural);

        if (res.sucesso) {
            showToast(res.msg || "Mensagem aprovada e partilhada!", "success");
            fecharModalMural();
            abrirMuralDaSemana();
        } else {
            const limite = limitePostagensMuralMaestro(res);
            showToast(res.erro || `Limite semanal de ${limite} publicacoes atingido.`, "error");
            btn.innerHTML = 'TENTAR NOVAMENTE';
            btn.disabled = false;
        }
    } catch (e) {
        showToast("Erro de comunicação com o servidor: " + e.message, "error");
        btn.innerHTML = 'TENTAR NOVAMENTE';
        btn.disabled = false;
    }
}

// ------------------------------------------------------------------------
// V9.2.5: NOVO MOTOR DE AVISOS PUSH DO FISCAL
// ------------------------------------------------------------------------
function abrirModalAvisosFiscal() {
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("comunicacao", { notify: true })) return;

    document.getElementById('modal-novo-aviso-fiscal').classList.remove('hidden');

    // Reseta os campos
    document.getElementById('aviso-titulo-mural').value = '';
    document.getElementById('aviso-msg-mural').value = '';
    document.getElementById('aviso-titulo-direto').value = '';
    document.getElementById('aviso-msg-direto').value = '';

    alternarTipoAviso('mural');
    carregarFiltrosParaPush();
}

function fecharModalAvisosFiscal() {
    document.getElementById('modal-novo-aviso-fiscal').classList.add('hidden');
}

function alternarTipoAviso(tipo) {
    const tabMural = document.getElementById('tab-aviso-mural');
    const tabDireto = document.getElementById('tab-aviso-direto');
    const areaMural = document.getElementById('area-aviso-mural');
    const areaDireto = document.getElementById('area-aviso-direto');

    if (tipo === 'mural') {
        tabMural.classList.add('active');
        tabDireto.classList.remove('active');
        areaMural.classList.remove('hidden');
        areaDireto.classList.add('hidden');
    } else {
        tabMural.classList.remove('active');
        tabDireto.classList.add('active');
        areaMural.classList.add('hidden');
        areaDireto.classList.remove('hidden');
    }
}

async function carregarFiltrosParaPush() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const selectRota = document.getElementById('filtro-rota-push');
    const selectTurno = document.getElementById('filtro-turno-push');
    const selectInst = document.getElementById('filtro-inst-push');

    try {
        const res = await apiCall("getFiltrosPush");
        const adapterFiltros = adapterComunicacaoMaestro("pushFilters");
        const filtrosNormalizados = adapterFiltros ? adapterFiltros(res) : res;
        const filtros = (filtrosNormalizados && filtrosNormalizados.filtros) || {};
        if (filtrosNormalizados.sucesso !== false && filtros) {
            let htmlRota = '<option value="TODAS">Qualquer Rota</option>';
            (filtros.rotas || []).forEach(r => htmlRota += renderizarOptionPushMaestro(r));
            selectRota.innerHTML = htmlRota;

            let htmlTurno = '<option value="TODOS">Qualquer Turno</option>';
            (filtros.turnos || []).forEach(t => htmlTurno += renderizarOptionPushMaestro(t));
            selectTurno.innerHTML = htmlTurno;

            let htmlInst = '<option value="TODAS">Qualquer Instituição</option>';
            (filtros.instituicoes || []).forEach(i => htmlInst += renderizarOptionPushMaestro(i));
            selectInst.innerHTML = htmlInst;
        }
    } catch (e) {
        showToast("Erro ao carregar filtros de push: " + e.message, "error");
    }
}

async function dispararAvisoPublico() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const tipo = document.getElementById('aviso-tipo-mural').value;
    const titulo = document.getElementById('aviso-titulo-mural').value.trim();
    const mensagem = document.getElementById('aviso-msg-mural').value.trim();
    const validadeInformada = document.getElementById('aviso-validade').value;
    const validadePadrao = new Date();
    validadePadrao.setDate(validadePadrao.getDate() + 7);
    const validadeAviso = validadeInformada || validadePadrao.toISOString().slice(0, 10);
    const campoEnviarPush = document.getElementById('aviso-enviar-push');
    const enviarPush = campoEnviarPush ? campoEnviarPush.checked : true;
    const nomeOp = localStorage.getItem("MAESTRO_OPERADOR_NOME") || localStorage.getItem("MAESTRO_OP_NOME") || "Secretaria";
    const nivelOp = localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "Operador";
    const btn = document.getElementById('btn-publicar-aviso');

    if (!titulo || !mensagem) {
        showToast("Preencha o título e a mensagem.", "error");
        return;
    }

    btn.innerHTML = 'A COMUNICAR COM FIREBASE... ⏳';
    btn.disabled = true;

    try {
        const builderAviso = payloadComunicacaoMaestro("avisoPublico");
        const payloadAviso = builderAviso ? builderAviso({
            tipoAviso: tipo,
            titulo: titulo,
            mensagem: mensagem,
            validade: validadeAviso,
            validadeAviso: validadeAviso,
            ASSUNTO_VALIDADE: validadeAviso,
            enviarPush: enviarPush,
            operadorNome: nomeOp,
            operadorCargo: nivelOp
        }) : {
            tipoAviso: tipo,
            titulo: titulo,
            mensagem: mensagem,
            validade: validadeAviso,
            validadeAviso: validadeAviso,
            ASSUNTO_VALIDADE: validadeAviso,
            enviarPush: enviarPush,
            operadorNome: nomeOp,
            operadorCargo: nivelOp
        };
        const resRaw = await apiCall("publicarAvisoNotificacao", payloadAviso);
        const adapterResultadoPush = adapterComunicacaoMaestro("pushResult");
        const res = adapterResultadoPush ? adapterResultadoPush(resRaw) : resRaw;

        if (res.sucesso) {
            showToast("Aviso afixado e alunos notificados!", "success");
            fecharModalAvisosFiscal();
            btn.innerHTML = 'PUBLICAR AVISO';
            btn.disabled = false;
        } else {
            showToast(res.erro || "Falha ao publicar.", "error");
            btn.innerHTML = 'TENTAR NOVAMENTE';
            btn.disabled = false;
        }
    } catch (e) {
        showToast("Erro na comunicação: " + e.message, "error");
        btn.innerHTML = 'TENTAR NOVAMENTE';
        btn.disabled = false;
    }
}

async function dispararPushLoteManual() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const rota = document.getElementById('filtro-rota-push').value;
    const turno = document.getElementById('filtro-turno-push').value;
    const inst = document.getElementById('filtro-inst-push').value;
    const titulo = document.getElementById('aviso-titulo-direto').value.trim();
    const mensagem = document.getElementById('aviso-msg-direto').value.trim();
    const nomeOp = localStorage.getItem("MAESTRO_OPERADOR_NOME") || localStorage.getItem("MAESTRO_OP_NOME") || "Secretaria";
    const nivelOp = localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "Operador";
    const btn = document.getElementById('btn-disparar-direto');

    if (!titulo || !mensagem) {
        showToast("Preencha o título e a mensagem.", "error");
        return;
    }

    btn.innerHTML = 'A DISPARAR LOTE... ⏳';
    btn.disabled = true;

    try {
        const builderPush = payloadComunicacaoMaestro("pushSegmentado");
        const payloadPush = builderPush ? builderPush({
            titulo: titulo,
            mensagem: mensagem,
            rota: rota,
            turno: turno,
            instituicao: inst,
            operadorNome: nomeOp,
            operadorCargo: nivelOp
        }) : {
            titulo: titulo,
            mensagem: mensagem,
            rota: rota,
            turno: turno,
            instituicao: inst,
            operadorNome: nomeOp,
            operadorCargo: nivelOp
        };
        const resRaw = await apiCall("dispararPushLoteManual", payloadPush);
        const adapterResultadoPush = adapterComunicacaoMaestro("pushResult");
        const res = adapterResultadoPush ? adapterResultadoPush(resRaw) : resRaw;

        if (res.sucesso) {
            showToast(`Lote enviado para ${res.enviados} dispositivos.`, "success");
            fecharModalAvisosFiscal();
            btn.innerHTML = 'DISPARAR LOTE';
            btn.disabled = false;
        } else {
            showToast(res.erro || "Nenhum aluno encontrado neste filtro.", "error");
            btn.innerHTML = 'TENTAR NOVAMENTE';
            btn.disabled = false;
        }
    } catch (e) {
        showToast("Erro no disparo em lote: " + e.message, "error");
        btn.innerHTML = 'TENTAR NOVAMENTE';
        btn.disabled = false;
    }
}

function dispararPushSegmentado() {
    return dispararPushLoteManual();
}

function calcularTempoRelativo(tsServidor) {
    const agoraLocal = new Date().getTime();
    const tsNormalizado = typeof tsServidor === "string" ? new Date(tsServidor).getTime() : Number(tsServidor);
    if (!Number.isFinite(tsNormalizado)) return "Agora mesmo";
    const diffEmMinutos = Math.floor((agoraLocal - tsNormalizado) / 60000);
    if (diffEmMinutos <= 0) return "Agora mesmo";
    if (diffEmMinutos < 60) return diffEmMinutos + (diffEmMinutos === 1 ? " min atrás" : " mins atrás");
    const horas = Math.floor(diffEmMinutos / 60);
    if (horas < 24) return horas + (horas === 1 ? " hora atrás" : " horas atrás");
    const dias = Math.floor(horas / 24);
    return dias + (dias === 1 ? " dia atrás" : " dias atrás");
}

async function abrirMuralDaSemana() {
    switchView('view-mural');
    const container = document.getElementById('mural-feed');

    let btnNovoPostHTML = '';
    if (currentWalletId && localStorage.getItem("MAESTRO_EST_TOKEN")) {
        btnNovoPostHTML = `
        <div class="mural-create-row">
           <button class="btn-solid mural-create-button" onclick="abrirModalMural()">
              <span class="mural-create-icon">📝</span> Criar Nova Publicação
           </button>
        </div>`;
    } else {
        btnNovoPostHTML = `<div class="mural-login-hint">Apenas estudantes logados na Carteira Digital podem publicar ou votar.</div>`;
    }

    container.innerHTML = `${btnNovoPostHTML}<div class="dynamic-state-box dynamic-loading-state mural-loading-state"><div class="loader loader-center"></div><p class="mural-loading-text mural-loading-spaced">A carregar a voz da comunidade...</p></div>`;

    try {
        const res = await apiCall("getMuralDaSemana");
        const adapterMural = adapterComunicacaoMaestro("muralFeed");
        const muralNormalizado = adapterMural ? adapterMural(res, currentWalletId) : res;
        const mensagensMural = (muralNormalizado && muralNormalizado.mensagens) || [];
        const limiteSemanal = limitePostagensMuralMaestro(muralNormalizado);
        if (!muralNormalizado.sucesso) { container.innerHTML = `${btnNovoPostHTML}<div class="error-box dynamic-state-box dynamic-error-state">${escapeHTMLAuditoria(muralNormalizado.erro)}</div>`; return; }
        if (!mensagensMural.length) {
            container.innerHTML = `${btnNovoPostHTML}<div class="mural-empty-state dynamic-state-box dynamic-empty-state">Ainda não há contribuições nos últimos 7 dias.<br><br><b>Seja o primeiro a partilhar uma ideia!</b></div>`;
            return;
        }

        let html = btnNovoPostHTML + `<div class="mural-limit-note">Limite: ${limiteSemanal} publicacoes por estudante a cada semana.</div>`;
        mensagensMural.forEach((msg, index) => {
            const upsInfo = Array.isArray(msg.arrayUpsInfo) ? msg.arrayUpsInfo : [];
            const downsInfo = Array.isArray(msg.arrayDownsInfo) ? msg.arrayDownsInfo : [];
            const upAtivo = currentWalletId && (msg.meuVoto === "up" || upsInfo.includes(currentWalletId)) ? ' is-active-up' : '';
            const downAtivo = currentWalletId && (msg.meuVoto === "down" || downsInfo.includes(currentWalletId)) ? ' is-active-down' : '';
            const coroa = index === 0 && msg.pontuacao > 0 ? '👑 Top Semanal' : '';
            const tsMural = msg.tsMensagem || msg.criadoEm || (msg.raw && (msg.raw.tsMensagem || msg.raw.timestamp_epoch || msg.raw.criado_em));
            const tempoCorrigido = calcularTempoRelativo(tsMural);
            const idElementoSeguro = safeDomIdAuditoria(msg.id);
            const categoriaBruta = String(msg.categoria || "");
            const categoriaSegura = escapeHTMLAuditoria(categoriaBruta);
            const mensagemSegura = escapeHTMLAuditoria(msg.mensagem);
            const autorSeguro = escapeHTMLAuditoria(msg.autor || msg.autorNome);
            const votosUpSeguro = escapeHTMLAuditoria(msg.votosUp || 0);
            const votosDownSeguro = escapeHTMLAuditoria(msg.votosDown || 0);
            msg.categoria = categoriaBruta;

            let iconCat = '🗣️';
            if (msg.categoria.indexOf('Sugestão') !== -1) iconCat = '💡';
            if (msg.categoria.indexOf('Reclamação') !== -1) iconCat = '⚠️';
            if (msg.categoria.indexOf('Achados') !== -1) iconCat = '🎒';

            window.MaestroMuralIdMap = window.MaestroMuralIdMap || {};
            window.MaestroMuralIdMap[idElementoSeguro] = String(msg.id || "");
            msg.id = idElementoSeguro;
            msg.categoria = categoriaSegura;
            msg.mensagem = mensagemSegura;
            msg.autor = autorSeguro;
            msg.votosUp = votosUpSeguro;
            msg.votosDown = votosDownSeguro;

            html += `
            <div class="form-card mural-post-card dynamic-card dynamic-feed-card">
               <div class="mural-post-header">
                  <div class="mural-post-tags">
                     <span class="mural-tag">${iconCat} ${msg.categoria}</span>
                     ${coroa ? `<span class="mural-tag mural-tag-top">${coroa}</span>` : ''}
                  </div>
                  <span class="mural-post-time">${tempoCorrigido}</span>
               </div>
               <p class="mural-message">"${msg.mensagem}"</p>
               <div class="mural-post-footer">
                  <span class="mural-author">👤 Por: ${msg.autor}</span>
                  <div class="mural-vote-group">
                     <button class="mural-vote-button${upAtivo}" onclick="votarNoMural('${msg.id}', 'UP')">👍 <span id="count-up-${msg.id}" class="mural-vote-count">${msg.votosUp}</span></button>
                     <button class="mural-vote-button${downAtivo}" onclick="votarNoMural('${msg.id}', 'DOWN')">👎 <span id="count-down-${msg.id}" class="mural-vote-count">${msg.votosDown}</span></button>
                  </div>
               </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="error-box dynamic-state-box dynamic-error-state">Erro ao comunicar com o servidor do Mural: ${escapeHTMLAuditoria(e.message)}</div>`;
    }
}

async function votarNoMural(idMensagem, tipoVoto) {
    if (!currentWalletId || !localStorage.getItem("MAESTRO_EST_TOKEN")) {
        showToast("É necessário aceder ao Cofre Digital para votar.", "warning");
        return;
    }

    const idElementoSeguro = safeDomIdAuditoria(idMensagem);
    const idMensagemApi = (window.MaestroMuralIdMap && window.MaestroMuralIdMap[idElementoSeguro]) || idMensagem;
    const contadorUp = document.getElementById(`count-up-${idElementoSeguro}`);
    const contadorDown = document.getElementById(`count-down-${idElementoSeguro}`);
    const btnUp = contadorUp ? contadorUp.parentNode : null;
    const btnDown = contadorDown ? contadorDown.parentNode : null;

    if (btnUp) btnUp.classList.add('is-disabled');
    if (btnDown) btnDown.classList.add('is-disabled');

    try {
        const builderVoto = payloadComunicacaoMaestro("muralVote");
        const payloadVoto = builderVoto ? builderVoto({
            idEstudante: currentWalletId,
            usuarioLogadoId: currentWalletId,
            idMensagem: idMensagemApi,
            tipoVoto: tipoVoto
        }) : { idEstudante: currentWalletId, idMensagem: idMensagemApi, tipoVoto: tipoVoto };
        const res = await apiCall("votarMensagemMural", payloadVoto);
        if (res.sucesso) {
            setTimeout(abrirMuralDaSemana, 1000);
        } else {
            showToast(res.erro || "O seu voto não pôde ser contabilizado.", "error");
            if (btnUp) btnUp.classList.remove('is-disabled');
            if (btnDown) btnDown.classList.remove('is-disabled');
        }
    } catch (e) {
        showToast("Erro ao processar o voto: " + e.message, "error");
        if (btnUp) btnUp.classList.remove('is-disabled');
        if (btnDown) btnDown.classList.remove('is-disabled');
    }
}

// ========================================================================
// 15. CAIXA DE MENSAGENS (INBOX / PERSISTÊNCIA 7 DIAS)
// ========================================================================

function abrirInbox() {
    if (typeof window.abrirInboxIndexedDB === 'function') {
        return window.abrirInboxIndexedDB();
    }
    renderizarNotificacoes();
}

function renderizarNotificacoes() {
    const containers = document.querySelectorAll('.inbox-container');
    containers.forEach(container => {
        container.innerHTML = '<div class="dynamic-state-box dynamic-loading-state inbox-loading-state"><div class="loader loader-center"></div></div>';
    });

    const dbRequest = indexedDB.open('MaestroDB', 1);
    dbRequest.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('notificacoes')) {
            containers.forEach(container => {
                container.innerHTML = '<div class="inbox-empty-state dynamic-state-box dynamic-empty-state"><p class="inbox-empty-text">Caixa de entrada vazia.</p></div>';
            });
            return;
        }
        const transaction = db.transaction('notificacoes', 'readonly');
        const store = transaction.objectStore('notificacoes');
        const request = store.getAll();

        request.onsuccess = () => {
            const notificacoes = request.result.sort((a, b) => b.timestamp - a.timestamp);
            if (notificacoes.length === 0) {
                containers.forEach(container => {
                    container.innerHTML = '<div class="inbox-empty-state dynamic-state-box dynamic-empty-state"><p class="inbox-empty-text">Caixa de entrada vazia.</p></div>';
                });
                return;
            }

            let html = '';
            notificacoes.forEach(n => {
                const tempo = calcularTempoRelativo(n.timestamp);
                const iconeSeguro = safeUrlAttrOperacao(n.icon, './icone.png');
                const tituloSeguro = escapeHTMLAuditoria(n.title || "Notificacao");
                const corpoSeguro = escapeHTMLAuditoria(n.body || "");
                const linkSeguro = safeUrlAttrOperacao(n.link, "");
                const linkHtml = linkSeguro && linkSeguro !== "/" ? `<a href="${linkSeguro}" target="_blank" rel="noopener noreferrer" class="inbox-link">Ver detalhes</a>` : '';
                html += `
                <div class="form-card inbox-card dynamic-card dynamic-inbox-card">
                    <img src="${iconeSeguro}" class="inbox-icon" alt="">
                    <div class="inbox-content">
                        <div class="inbox-header">
                            <strong class="inbox-title">${tituloSeguro}</strong>
                            <span class="inbox-time">${tempo}</span>
                        </div>
                        <p class="inbox-body">${corpoSeguro}</p>
                        ${linkHtml}
                    </div>
                </div>`;
            });
            containers.forEach(container => {
                container.innerHTML = html;
            });

            // Remove o red dot após abrir a inbox
            document.querySelectorAll('.badge-notificacao').forEach(badge => {
                badge.textContent = '';
                badge.classList.remove('is-visible');
            });
        };
    };
    dbRequest.onerror = () => {
        containers.forEach(container => {
            container.innerHTML = '<div class="error-box dynamic-state-box dynamic-error-state">Erro ao carregar notificações locais.</div>';
        });
    };
}

function limparInbox() {
    if (typeof window.limparInboxIndexedDB === 'function') {
        return window.limparInboxIndexedDB();
    }
    const dbRequest = indexedDB.open('MaestroDB', 1);
    dbRequest.onsuccess = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains('notificacoes')) {
            const transaction = db.transaction('notificacoes', 'readwrite');
            const store = transaction.objectStore('notificacoes');
            store.clear();
            renderizarNotificacoes();
            document.querySelectorAll('.badge-notificacao').forEach(badge => {
                badge.textContent = '';
                badge.classList.remove('is-visible');
            });
            showToast("Caixa de entrada limpa com sucesso.", "success");
        }
    };
}

// Verifica periodicamente se há notificações para acender a badge
setInterval(() => {
    try {
        if (typeof window.atualizarContadorNotificacoes === 'function') {
            window.atualizarContadorNotificacoes();
            return;
        }

        const dbReq = indexedDB.open('MaestroDB', 1);
        dbReq.onsuccess = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains('notificacoes')) {
                const tx = db.transaction('notificacoes', 'readonly');
                const countReq = tx.objectStore('notificacoes').count();
                countReq.onsuccess = () => {
                    const viewAdminAtiva = document.getElementById('view-notificacoes') && document.getElementById('view-notificacoes').classList.contains('active');
                    const sidebarRightAtiva = document.getElementById('sidebar-right') && document.getElementById('sidebar-right').classList.contains('active');

                    // Mostra a badge se houver itens e a inbox não estiver aberta (em nenhum dos modos)
                    if (countReq.result > 0 && !viewAdminAtiva && !sidebarRightAtiva) {
                        document.querySelectorAll('.badge-notificacao').forEach(badge => {
                            badge.textContent = countReq.result > 99 ? '99+' : String(countReq.result);
                            badge.classList.add('is-visible');
                        });
                    }
                }
            }
        };
    } catch (err) { }
}, 10000);

// ========================================================================
// NOTA: O MOTOR DO DASHBOARD ANALÍTICO E BI foi extraído para admin_dashboard.js
// ========================================================================

// ========================================================================
// 12. MÓDULO DO MOTORISTA (PONTE VISUAL PWA)
// ========================================================================

// Variável global temporária para guardar a placa do veículo em condução
let veiculoConducaoAtual = "";

async function uiIniciarRota() {
    const select = document.getElementById("select-frota-motorista");
    const placa = select.value;

    if (!placa) {
        showToast("Selecione um veículo primeiro.", "warning");
        return;
    }

    veiculoConducaoAtual = placa;

    // 1. Chama a função central (que já criámos no main_core.js)
    await btnIniciarRotaMotorista(placa);

    // 2. Atualiza a UI para o ecrã de viagem (Tela Preta)
    document.getElementById("viagem-placa-display").innerText = placa;

    // 3. Esconde o painel normal e mostra o ecrã gigante do modo viagem
    const painelMotorista = document.getElementById("view-painel-motorista");
    const painelViagem = document.getElementById("painel-viagem-ativa");
    if (painelMotorista) painelMotorista.classList.add("hidden");
    if (painelViagem) {
        painelViagem.classList.remove("hidden");
        painelViagem.classList.add("driver-trip-panel-active");
    }
}

async function uiFinalizarRota() {
    if (confirm("Tem a certeza que deseja finalizar a rota? O rastreio será interrompido e os alunos notificados.")) {

        // 1. Chama a função central
        await btnFinalizarRotaMotorista(veiculoConducaoAtual);

        // 2. Restaura a UI normal
        const painelViagem = document.getElementById("painel-viagem-ativa");
        const painelMotorista = document.getElementById("view-painel-motorista");
        if (painelViagem) {
            painelViagem.classList.add("hidden");
            painelViagem.classList.remove("driver-trip-panel-active");
        }
        if (painelMotorista) painelMotorista.classList.remove("hidden");

        // Limpa a placa e reseta o select
        veiculoConducaoAtual = "";
        document.getElementById("select-frota-motorista").value = "";
    }
}

function uiDeclararSOS() {
    // Reutiliza o modal de SOS já existente no sistema do Fiscal
    if (typeof abrirModalSOS === "function") {
        abrirModalSOS();
        // Pré-preenche a placa
        const inputSosOnibus = document.getElementById('sos-id-onibus');
        if (inputSosOnibus) inputSosOnibus.value = veiculoConducaoAtual;
        showToast("Por favor, selecione o motivo da avaria no painel.", "warning");
    } else {
        showToast("Função de SOS acionada para " + veiculoConducaoAtual, "info");
    }
}

// ========================================================================
// CORREÇÕES DO MODAL DE ROTAS (Resolver o Botão Estático)
// ========================================================================
function abrirModalSelecaoRota() {
    if (typeof podeExecutarAcaoMaestro === 'function' &&
        !podeExecutarAcaoMaestro("gerirRotas", { notify: false }) &&
        !podeExecutarAcaoMaestro("motoristaRotas", { notify: true })) return;

    const modal = document.getElementById('modal-selecao-rota');
    if (!modal) return;

    // 1. Remove o hidden para o HTML existir na tela
    modal.classList.remove('hidden');

    // 2. Força o navegador a recalcular o layout (Reflow) antes de animar
    void modal.offsetWidth;

    // 3. Aplica a classe que faz o modal subir suavemente
    modal.classList.add('active');

    popularSelectFrotaMotorista();
}

function fecharModalSelecaoRota() {
    const modal = document.getElementById('modal-selecao-rota');
    if (!modal) return;

    modal.classList.remove('active'); // Desce o modal

    // Aguarda a animação terminar para esconder completamente
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// ========================================================================
// CORREÇÃO: MODO FISCALIZAÇÃO (Redirecionamento Global)
// ========================================================================

function abrirModoFiscalizacaoGlobal() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("fiscalizar", { notify: true })) return;

    // Leva qualquer operador para a tela isolada da câmara
    switchView('view-fiscal');
    iniciarScanner();
}

function fecharModoFiscalizacao() {
    fecharScanner();

    const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
    if (nav && typeof nav.getDefaultView === "function") {
        switchView(nav.getDefaultView());
        return;
    }

    // Devolve o utilizador à tela correta baseada no nível guardado no login
    const nivel = localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "";

    if (nivel === "MOTORISTA") {
        switchView('view-painel-motorista');
    } else if (nivel === "MODERADOR") {
        switchView('view-moderador');
    } else {
        switchView('view-admin-hub'); // Fiscais e Supervisores
    }
}

// ========================================================================
// CONTROLO DO MODAL DE SELEÇÃO DE ROTA (Animação Corrigida)
// ========================================================================

function abrirModalSelecaoRota() {
    if (typeof podeExecutarAcaoMaestro === 'function' &&
        !podeExecutarAcaoMaestro("gerirRotas", { notify: false }) &&
        !podeExecutarAcaoMaestro("motoristaRotas", { notify: true })) return;

    const modal = document.getElementById('modal-selecao-rota');
    if (!modal) return;

    modal.classList.remove('hidden');
    void modal.offsetWidth; // Força reflow para animação CSS
    modal.classList.add('active');

    popularSelectFrotaMotorista();
}

function fecharModalSelecaoRota() {
    const modal = document.getElementById('modal-selecao-rota');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

// ========================================================================
// LOGÍSTICA DE ROTAS: Filtro por E-mail e Turno (Horário)
// ========================================================================

function obterTurnosAtuais() {
    const agora = new Date();
    const horaMinuto = (agora.getHours() * 60) + agora.getMinutes();
    let turnos = [];

    const dentro = (inicioH, inicioM, fimH, fimM) => {
        return horaMinuto >= (inicioH * 60 + inicioM) && horaMinuto <= (fimH * 60 + fimM);
    };

    if (dentro(4, 30, 7, 0) || dentro(12, 0, 13, 30)) turnos.push("MANHÃ");
    if (dentro(11, 0, 13, 30) || dentro(18, 0, 19, 30)) turnos.push("TARDE");
    if (dentro(17, 0, 18, 30) || dentro(22, 0, 23, 59)) turnos.push("NOITE");

    return turnos;
}

async function popularSelectFrotaMotorista() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const select = document.getElementById("select-frota-motorista");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>A consultar veículos...</option>';

    const turnosValidos = obterTurnosAtuais();
    const emailMotorista = localStorage.getItem("MAESTRO_OPERADOR_EMAIL");

    try {
        // Chamada ao back-end filtrando pelo e-mail logado
        const res = await apiCall("getRotasMotorista", { usuarioLogadoId: emailMotorista });

        select.innerHTML = '<option value="" disabled selected>Escolha o seu veículo...</option>';

        if (res.sucesso && res.rotas && res.rotas.length > 0) {
            res.rotas.forEach(rota => {
                const rotaUpper = rota.toUpperCase();
                let turnoDaRota = "";

                if (rotaUpper.includes("MANHÃ") || rotaUpper.includes("MANHA")) turnoDaRota = "MANHÃ";
                else if (rotaUpper.includes("TARDE")) turnoDaRota = "TARDE";
                else if (rotaUpper.includes("NOITE")) turnoDaRota = "NOITE";

                const opt = document.createElement("option");
                opt.value = rota;

                if (turnoDaRota === "" || turnosValidos.includes(turnoDaRota)) {
                    opt.innerText = `🟢 [DISPONÍVEL] ${rota}`;
                    opt.disabled = false;
                } else {
                    opt.innerText = `🔴 [FORA DO HORÁRIO] ${rota}`;
                    opt.disabled = true;
                }
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="" disabled selected>Nenhum veículo vinculado a si.</option>';
        }
    } catch (e) {
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar rotas.</option>';
        showToast("Erro ao carregar rotas: " + e.message, "error");
    }
}


// ========================================================================
// FUNÇÃO GLOBAL DE SAÍDA (LOGOUT)
// ========================================================================
function logoutOperadorGlobal() {
    if (confirm("Tem certeza que deseja encerrar a sua sessão de trabalho?")) {
        localStorage.removeItem("MAESTRO_TOKEN");
        localStorage.removeItem("MAESTRO_OPERADOR_NIVEL");
        localStorage.removeItem("MAESTRO_OPERADOR_NOME");
        localStorage.removeItem("MAESTRO_OPERADOR_EMAIL");
        if (typeof limparContextsSessaoMaestro === 'function') limparContextsSessaoMaestro("operator");

        // Dá refresh na página para limpar a memória por completo
        window.location.href = window.location.pathname;
    }
}

// ========================================================================
// 11. MOTOR DO DASHBOARD ANALÍTICO E BI
// ========================================================================
window.myCharts = window.myCharts || {};

function mudarAbaDashboard(aba) {
    ['logistica', 'noturno', 'inclusao', 'analise'].forEach(t => {
        document.getElementById('tab-' + t).classList.remove('active');
        document.getElementById('dash-area-' + t).classList.add('hidden');
    });
    document.getElementById('tab-' + aba).classList.add('active');
    document.getElementById('dash-area-' + aba).classList.remove('hidden');

    if (aba === 'analise') {
        renderizarDashboardBI();
    }
}

const CACHE_STATS_KEY = "MAESTRO_DASH_STATS";

function normalizarDashboardStatsMaestro(payload) {
    const adapter = window.MaestroData &&
        window.MaestroData.adapters &&
        typeof window.MaestroData.adapters.dashboardStats === "function"
        ? window.MaestroData.adapters.dashboardStats
        : null;

    if (adapter) return adapter(payload || {});

    const stats = (payload && (payload.dashboardStats || payload.estatisticas || payload.stats || payload)) || {};
    return {
        sucesso: payload && payload.sucesso === false ? false : true,
        erro: payload && payload.erro ? payload.erro : "",
        kpis: stats.kpis || {},
        graficos: stats.graficos || {},
        consumo: stats.consumo || {},
        dataMart: Array.isArray(stats.dataMart) ? stats.dataMart : [],
        filtrosDisponiveis: stats.filtrosDisponiveis || {},
        atualizadoEm: stats.atualizadoEm || "",
        origem: stats.origem || "fallback",
        raw: stats
    };
}

function dashboardStatsValido(stats) {
    return !!(stats && stats.sucesso !== false && stats.graficos && typeof stats.graficos === "object");
}

function aplicarBarraIADashboardMaestro(percentual) {
    const pctSeguro = Math.max(0, Math.min(100, Number(percentual) || 0));
    let styleEl = document.getElementById("maestro-dashboard-dynamic-css");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "maestro-dashboard-dynamic-css";
        styleEl.setAttribute("data-owner", "MaestroDashboard");
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = `#bar-ia-usage { width: ${pctSeguro}%; }`;
}

function obterCacheDashboardMaestro() {
    const cachedStatsRaw = localStorage.getItem(CACHE_STATS_KEY);
    if (!cachedStatsRaw) return null;

    if (window.MaestroData && window.MaestroData.storage) {
        const tenantContext = window.MaestroData.contexts && window.MaestroData.contexts.tenant
            ? window.MaestroData.contexts.tenant.get()
            : {};
        const cacheValido = window.MaestroData.storage.isDomainFresh("dashboard", {
            tenantId: tenantContext.tenantId,
            maxAgeMs: 1000 * 60 * 60 * 6
        });
        if (!cacheValido) return null;
    }

    try {
        const dashboardStats = normalizarDashboardStatsMaestro(JSON.parse(cachedStatsRaw));
        return dashboardStatsValido(dashboardStats) ? dashboardStats : null;
    } catch (erro) {
        console.warn("Cache do dashboard invalido. Ignorando leitura local.", erro);
        return null;
    }
}

function salvarCacheDashboardMaestro(statsObj) {
    const dashboardStats = normalizarDashboardStatsMaestro(statsObj);
    if (!dashboardStatsValido(dashboardStats)) return;

    localStorage.setItem(CACHE_STATS_KEY, JSON.stringify(dashboardStats));
    if (window.MaestroData && window.MaestroData.storage) {
        const tenantContext = window.MaestroData.contexts && window.MaestroData.contexts.tenant
            ? window.MaestroData.contexts.tenant.get()
            : {};
        window.MaestroData.storage.markDomain("dashboard", {
            tenantId: tenantContext.tenantId,
            source: "getDashboardStats",
            key: CACHE_STATS_KEY
        });
    }
}

async function buscarDashboardStatsServidorMaestro() {
    const semesterContext = (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester)
        ? window.MaestroData.contexts.semester.get()
        : {};
    const res = await apiCall("getDashboardStats", {
        semestreId: semesterContext.semestreId || semesterContext.semestreAtual || ""
    });
    const dashboardStats = normalizarDashboardStatsMaestro(res);
    if (!dashboardStatsValido(dashboardStats)) {
        const erro = dashboardStats && dashboardStats.erro ? dashboardStats.erro : "Dados do Dashboard indisponiveis.";
        throw new Error(erro);
    }
    return dashboardStats;
}

function atualizarDashboardComStatsMaestro(dashboardStats, opcoes = {}) {
    const stats = normalizarDashboardStatsMaestro(dashboardStats);
    if (!dashboardStatsValido(stats)) {
        showToast((stats && stats.erro) || "Dados do Dashboard indisponiveis.", "error");
        return false;
    }

    window.dadosBI = Array.isArray(stats.dataMart) ? stats.dataMart : [];
    renderizarDashboardUI(stats);
    gerarChipsDinamicos();

    if (opcoes.cache !== false) salvarCacheDashboardMaestro(stats);

    const tabAnalise = document.getElementById('tab-analise');
    if (tabAnalise && tabAnalise.classList.contains('active')) {
        if (typeof renderizarDashboardBI === "function") renderizarDashboardBI();
    }

    return true;
}

async function carregarDashboard() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("dashboard", { notify: true })) return;

    const cachedStats = obterCacheDashboardMaestro();

    if (cachedStats) {
        atualizarDashboardComStatsMaestro(cachedStats, { cache: false });
        switchView('view-dashboard');

        buscarDashboardStatsServidorMaestro().then(stats => {
            atualizarDashboardComStatsMaestro(stats);
        }).catch(e => {
            console.error("Erro de Rede BI:", e);
            showToast("Erro ao carregar os dados analiticos: " + e.message, "error");
        });
        return;
    }

    showToast("A extrair dados para o Dashboard...", "info");
    try {
        const stats = await buscarDashboardStatsServidorMaestro();
        atualizarDashboardComStatsMaestro(stats);
        switchView('view-dashboard');
    } catch (err) {
        console.error("Erro de Rede BI:", err);
        showToast("Erro de ligacao aos dados analiticos: " + err.message, "error");
    }
}

/**
 * Renderiza a interface do Dashboard processando os dados e inicializando os gráficos de forma segura.
 * 
 * @param {Object} payload Objeto consolidado vindo de getDashboardStats()
 */
function renderizarDashboardUI(payload) {
    // 1. Guard Clause: Aborta a renderização caso os dados não estejam disponíveis
    const dashboardStats = normalizarDashboardStatsMaestro(payload);
    if (!dashboardStatsValido(dashboardStats)) {
        showToast("Dados do Dashboard indisponíveis.", "error");
        return;
    }

    const graficos = dashboardStats.graficos;
    const kpis = dashboardStats.kpis || {};
    const consumo = dashboardStats.consumo || {};

    // Atualização dos KPIs superiores
    if (document.getElementById('kpi-ativos')) document.getElementById('kpi-ativos').innerText = kpis.ativos || 0;
    if (document.getElementById('kpi-pendentes')) document.getElementById('kpi-pendentes').innerText = kpis.pendentes || 0;
    if (document.getElementById('kpi-retidos')) document.getElementById('kpi-retidos').innerText = kpis.retidos || 0;
    if (document.getElementById('kpi-suspensos')) document.getElementById('kpi-suspensos').innerText = kpis.suspensos || 0;

    // Atualização da barra de Uso de IA
    const ocrUsado = consumo?.ocr?.usado || 0;
    const ocrLimite = consumo?.ocr?.limite || 0;
    const pctIA = ocrLimite > 0 ? Math.round((ocrUsado / ocrLimite) * 100) : 0;

    const barraIA = document.getElementById('bar-ia-usage');
    if (document.getElementById('kpi-ia-text') && barraIA) {
        document.getElementById('kpi-ia-text').innerText = `${ocrUsado} / ${ocrLimite}`;
        aplicarBarraIADashboardMaestro(pctIA);
        barraIA.classList.toggle("is-danger", pctIA > 80);
    }

    // 2. Prevenção de Memory Leaks: Destrói qualquer gráfico existente
    if (typeof window.myCharts === 'undefined') {
        window.myCharts = {};
    }
    Object.values(window.myCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    window.myCharts = {};

    // 3. Renderização Segura: Tenta renderizar gráficos evitando travamento total em caso de corrupção
    try {
        // Obter cores do tema dinamicamente
        const style = getComputedStyle(document.body);
        const primaryColor = style.getPropertyValue('--primary').trim() || '#3B82F6';
        const accentColor = style.getPropertyValue('--accent').trim() || '#F59E0B';
        const successColor = style.getPropertyValue('--success').trim() || '#10B981';
        const warningColor = style.getPropertyValue('--warning').trim() || '#FBBF24';
        const dangerColor = style.getPropertyValue('--danger').trim() || '#EF4444';
        const textColor = style.getPropertyValue('--text-muted').trim() || '#aaaaaa';

        // 4. Verificações Condicionais e Renderização Segura (Blindado contra Undefined/Null e Array Conversions)
        const st = graficos.status || {};
        renderChart('chart-status', 'doughnut',
            ["Ativos", "Pendentes", "Retidos (Humana)", "Cancelados/Suspensos"],
            [st["Ativos"] || 0, st["Pendentes"] || 0, st["Retidos (Humana)"] || 0, st["Cancelados/Suspensos"] || 0],
            [successColor, warningColor, accentColor, dangerColor],
            { plugins: { legend: { display: true, position: 'right', labels: { color: textColor, boxWidth: 12 } } } }
        );

        const safeRenderBar = (key, canvasId, color, options = {}) => {
            const extraido = extrairEOrdenar(graficos[key]);
            if (extraido.labels.length > 0) renderChart(canvasId, 'bar', extraido.labels, extraido.data, color, options);
        };

        safeRenderBar('instituicoes', 'chart-instituicoes', primaryColor, { indexAxis: 'y' });
        safeRenderBar('dias', 'chart-dias', primaryColor, { indexAxis: 'y' });
        safeRenderBar('rotas', 'chart-rotas', primaryColor, { indexAxis: 'y' });
        safeRenderBar('turnos', 'chart-turnos', primaryColor);

        if (graficos.noturno) {
            const ads = extrairEOrdenar(graficos.noturno.adesao);
            if (ads.labels.length > 0) renderChart('chart-adesao-23h', 'doughnut', ads.labels, ads.data, [accentColor, 'rgba(255, 255, 255, 0.1)'], { plugins: { legend: { display: true, position: 'bottom', labels: { color: textColor, boxWidth: 12 } } } });
            
            const bairros = extrairEOrdenar(graficos.noturno.bairros);
            if (bairros.labels.length > 0) renderChart('chart-bairros-23h', 'bar', bairros.labels, bairros.data, accentColor, { indexAxis: 'y' });
        }

        const inclusao = graficos.inclusao || {};
        const renderInclusao = (canvas, objData) => {
            const dataSafe = objData || {};
            renderChart(canvas, 'bar', ['Sim', 'Não'], [dataSafe['Sim'] || 0, dataSafe['Não'] || 0], [primaryColor, 'rgba(255, 255, 255, 0.1)']);
        };

        renderInclusao('chart-pcd', inclusao.pcd);
        renderInclusao('chart-menor', inclusao.menor);
        renderInclusao('chart-acompanhado', inclusao.acompanhado);
        renderInclusao('chart-estagio', inclusao.estagio);

    } catch (erro) {
        console.error("[Dashboard] Ocorreu um erro ao renderizar os gráficos:", erro);
        showToast("Falha parcial ao carregar os gráficos.", "warning");
    }
}


const mapaDias = {
    "segunda": "Seg", "seg": "Seg",
    "terça": "Ter", "terca": "Ter", "ter": "Ter",
    "quarta": "Qua", "qua": "Qua",
    "quinta": "Qui", "qui": "Qui",
    "sexta": "Sex", "sex": "Sex",
    "sábado": "Sáb", "sabado": "Sáb", "sab": "Sáb", "sáb": "Sáb"
};

function normalizarDia(texto) {
    let t = texto.toLowerCase().trim();
    for (let chave in mapaDias) {
        if (t.includes(chave)) return mapaDias[chave];
    }
    return texto.trim();
}

function gerarChipsDinamicos() {
    if (!window.dadosBI || window.dadosBI.length === 0) return;

    let instituicoes = new Set();
    let turnos = new Set();
    let dias = new Set();

    window.dadosBI.forEach(aluno => {
        if (aluno.i) aluno.i.split(',').forEach(v => { if (v.trim()) instituicoes.add(v.trim()); });
        if (aluno.t) aluno.t.split(',').forEach(v => { if (v.trim()) turnos.add(v.trim()); });
        if (aluno.d) {
            aluno.d.split(',').forEach(v => {
                let diaLimpo = normalizarDia(v);
                if (diaLimpo) dias.add(diaLimpo);
            });
        }
    });

    const criarHTMLChips = (setValores, grupoNome) => {
        let html = '';
        Array.from(setValores).sort().forEach(val => {
            const chipAntigo = document.querySelector(`span.chip-filter[data-value="${val}"][data-group="${grupoNome}"]`);
            const classeAtiva = (chipAntigo && chipAntigo.classList.contains('chip-active')) ? 'chip-active' : '';
            html += `<span class="chip-filter ${classeAtiva}" data-group="${grupoNome}" data-value="${val}" onclick="toggleChip(this)">${val}</span>`;
        });
        return html;
    };

    const contInst = document.getElementById('container-chips-inst');
    if (contInst) contInst.innerHTML = criarHTMLChips(instituicoes, "bi_inst");

    const contTurno = document.getElementById('container-chips-turno');
    if (contTurno) contTurno.innerHTML = criarHTMLChips(turnos, "bi_turno");

    const contDia = document.getElementById('container-chips-dia');
    if (contDia) contDia.innerHTML = criarHTMLChips(dias, "bi_dia");
}

function toggleChip(element) {
    element.classList.toggle('chip-active');
    renderizarDashboardBI();
}

function renderizarDashboardBI() {
    if (!window.dadosBI || window.dadosBI.length === 0) return;

    const getActiveChips = (name) => Array.from(document.querySelectorAll(`span.chip-filter[data-group="${name}"].chip-active`)).map(el => el.getAttribute('data-value'));

    const fInst = getActiveChips("bi_inst");
    const fTurno = getActiveChips("bi_turno");
    const fDia = getActiveChips("bi_dia");
    const eixoX = document.getElementById("bi_eixo_x") ? document.getElementById("bi_eixo_x").value : "i";

    let dadosFiltrados = window.dadosBI.filter(aluno => {
        let passaInst = fInst.length === 0 || fInst.some(i => (aluno.i || "").includes(i));
        let passaTurno = fTurno.length === 0 || fTurno.some(t => (aluno.t || "").includes(t));

        let passaDia = fDia.length === 0;
        if (!passaDia && aluno.d) {
            let diasDoAlunoNormalizados = aluno.d.split(',').map(d => normalizarDia(d));
            passaDia = fDia.some(diaEscolhido => diasDoAlunoNormalizados.includes(diaEscolhido));
        }

        return passaInst && passaTurno && passaDia;
    });

    document.getElementById("bi_total").innerText = dadosFiltrados.length;

    let contagemGrafico = {};
    dadosFiltrados.forEach(aluno => {
        let stringBruta = aluno[eixoX] || "Sem Registo";
        let partes = stringBruta.split(',').map(p => p.trim()).filter(p => p !== "");

        if (partes.length === 0) {
            contagemGrafico["Sem Registo"] = (contagemGrafico["Sem Registo"] || 0) + 1;
        } else {
            partes.forEach(parte => {
                let chaveFinal = (eixoX === 'd') ? normalizarDia(parte) : parte;
                contagemGrafico[chaveFinal] = (contagemGrafico[chaveFinal] || 0) + 1;
            });
        }
    });

    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#F59E0B';
    const dadosOrdenados = extrairEOrdenar(contagemGrafico);
    renderChart('chart-bi', 'bar', dadosOrdenados.labels, dadosOrdenados.data, accentColor, { indexAxis: 'x' });
}

function renderChart(canvasId, type, labels, data, colors, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (typeof window.myCharts === 'undefined') {
        window.myCharts = {};
    }
    
    if (window.myCharts[canvasId]) {
        window.myCharts[canvasId].destroy();
    }

    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-muted').trim() || '#aaaaaa';
    const borderColor = style.getPropertyValue('--border').trim() || '#333333';

    // Integrar Poppins e cores padrões
    Chart.defaults.font.family = "'Poppins', 'Segoe UI', system-ui, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = borderColor;

    const defaultOptions = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } }
    };

    // Separar as escalas de forma que doughnut/pie não recebam eixos Cartesianos
    if (type === 'bar') {
        defaultOptions.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    color: textColor
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            },
            x: {
                ticks: {
                    color: textColor
                },
                grid: {
                    display: false
                }
            }
        };
    }

    window.myCharts[canvasId] = new Chart(ctx, { 
        type: type, 
        data: { 
            labels: labels, 
            datasets: [{ 
                data: data, 
                backgroundColor: colors, 
                borderRadius: type === 'bar' ? 8 : 0, 
                borderWidth: 0 
            }] 
        }, 
        options: Object.assign(defaultOptions, options) 
    });
}

function extrairEOrdenar(obj) {
    // Retorno seguro caso o objeto seja indefinido, nulo ou tenha sido convertido em array vazio (comportamento do GAS em Dictionaries vazios)
    if (!obj || typeof obj !== 'object' || (Array.isArray(obj) && obj.length === 0)) {
        return { labels: [], data: [] };
    }
    
    const arr = Object.keys(obj).map(key => ({ label: key, value: obj[key] }));
    arr.sort((a, b) => b.value - a.value);
    return { labels: arr.map(item => item.label), data: arr.map(item => item.value) };
}

// Export functions to global scope
window.mudarAbaDashboard = mudarAbaDashboard;
window.carregarDashboard = carregarDashboard;
window.renderizarDashboardUI = renderizarDashboardUI;
window.normalizarDia = normalizarDia;
window.gerarChipsDinamicos = gerarChipsDinamicos;
window.toggleChip = toggleChip;
window.renderizarDashboardBI = renderizarDashboardBI;
window.renderChart = renderChart;
window.extrairEOrdenar = extrairEOrdenar;

(function initAdminSemestresMaestro() {
  const state = {
    semestres: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function notify(message, type = "info") {
    if (typeof showToast === "function") {
      showToast(message, type);
      return;
    }
    console[type === "error" ? "error" : "log"](message);
  }

  function getOperatorSessionSafe() {
    try {
      return (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.operator)
        ? window.MaestroData.contexts.operator.get()
        : {};
    } catch (e) {
      return {};
    }
  }

  function setSemesterContextSafe(semestreAtual) {
    if (!semestreAtual || !semestreAtual.id) return;
    try {
      if (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester) {
        window.MaestroData.contexts.semester.set({
          semestreId: semestreAtual.id,
          semestreAtual: semestreAtual.id,
          label: semestreAtual.label || semestreAtual.id,
          status: semestreAtual.status || "ATUAL",
          source: "adminSemestres"
        });
      }
    } catch (e) {
      console.warn("[Semestres] Falha ao atualizar semesterContext:", e);
    }
  }

  function operatorCanManageSemesters() {
    if (typeof temSessaoOperadorAtiva === "function" && !temSessaoOperadorAtiva()) return false;
    if (typeof podeExecutarAcaoMaestro === "function") {
      return podeExecutarAcaoMaestro("semestres", { notify: true });
    }
    return true;
  }

  function statusColor(status) {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "ATUAL") return "#059669";
    if (normalized === "ARQUIVADO") return "#6b7280";
    return "#2563eb";
  }

  function normalizarSemestreUI(item) {
    const source = item || {};
    const id = String(source.id || source.semestreId || "").trim();
    const status = String(source.status || (source.ativo ? "ATUAL" : "PASSADO")).toUpperCase();
    return {
      id,
      semestreId: id,
      label: String(source.label || source.nome || id || "Semestre").trim(),
      ano: String(source.ano || "").trim(),
      periodo: String(source.periodo || source.semestreNumero || "").trim(),
      inicio: String(source.inicio || source.dataInicio || "").trim(),
      fim: String(source.fim || source.dataFim || "").trim(),
      status,
      origem: String(source.origem || "FIRESTORE").trim()
    };
  }

  function renderStatusChip(status) {
    const safeStatus = String(status || "PASSADO").toUpperCase();
    const statusClass = "status-" + safeStatus.toLowerCase();
    return `<span class="semestre-chip ${statusClass}">${escapeHTML(safeStatus)}</span>`;
  }

  function renderSemestreCard(item, index) {
    const semestre = normalizarSemestreUI(item);
    const isAtual = semestre.status === "ATUAL";
    const isArquivado = semestre.status === "ARQUIVADO";
    const statusClass = "status-" + semestre.status.toLowerCase();
    const periodo = [semestre.ano, semestre.periodo ? "Periodo " + semestre.periodo : ""].filter(Boolean).join(" - ");
    const vigencia = [semestre.inicio, semestre.fim].filter(Boolean).join(" ate ");

    return `
      <div class="form-card semestre-card dynamic-card semester-dynamic-card ${statusClass}">
        <div class="semestre-card-header">
          <div>
            <strong class="semestre-card-title">${escapeHTML(semestre.label)}</strong>
            <span class="semestre-card-desc">ID: ${escapeHTML(semestre.id || "-")}</span>
            <span class="semestre-card-desc">${escapeHTML(periodo || "Periodo nao informado")}</span>
            <span class="semestre-card-desc">${escapeHTML(vigencia || "Vigencia nao informada")}</span>
          </div>
          ${renderStatusChip(semestre.status)}
        </div>
        <div class="semestre-card-actions dynamic-card-actions">
          <button class="btn-text" onclick="preencherSemestreMaestro(${index})">Editar</button>
          <button class="btn-solid btn-semestre-atual" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="definirSemestreAtualMaestroUI(this.dataset.semestreId)">Atual</button>
          <button class="btn-solid btn-semestre-passado" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="marcarSemestrePassadoMaestroUI(this.dataset.semestreId)">Passado</button>
          <button class="btn-solid btn-semestre-arquivar" ${isAtual || isArquivado ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="arquivarSemestreMaestroUI(this.dataset.semestreId)">Arquivar</button>
          <button class="btn-solid text-danger btn-semestre-excluir" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="excluirSemestreMaestroUI(this.dataset.semestreId)">Excluir</button>
        </div>
      </div>
    `;
  }

  function atualizarResumoAtual(semestreAtual) {
    const atual = normalizarSemestreUI(semestreAtual || {});
    const label = byId("semestres-atual-label");
    const id = byId("semestres-atual-id");
    if (label) label.textContent = atual.id ? atual.label : "Nenhum semestre atual definido";
    if (id) id.textContent = atual.id ? atual.id : "Defina um semestre atual antes de auditar ou analisar dados.";
  }

  function renderizarSemestresMaestro(res) {
    const container = byId("semestres-lista-container");
    if (!container) return;

    const lista = Array.isArray(res && res.semestres) ? res.semestres.map(normalizarSemestreUI) : [];
    state.semestres = lista;

    const atual = normalizarSemestreUI((res && res.semestreAtual) || lista.find(item => item.status === "ATUAL") || {});
    atualizarResumoAtual(atual);
    if (atual.id) setSemesterContextSafe(atual);

    if (!lista.length) {
      container.innerHTML = '<div class="empty-state empty-state-semestres dynamic-state-box dynamic-empty-state">Nenhum semestre cadastrado.</div>';
      return;
    }

    container.innerHTML = lista.map(renderSemestreCard).join("");
  }

  async function carregarSemestresMaestro() {
    if (!operatorCanManageSemesters()) return;

    const container = byId("semestres-lista-container");
    if (container) {
      container.innerHTML = '<div class="loading-state-box dynamic-state-box dynamic-loading-state"><div class="loader"></div><p>A carregar semestres...</p></div>';
    }

    try {
      const res = await apiCall("listarSemestresMaestro", {});
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Falha ao carregar semestres.");
      }
      renderizarSemestresMaestro(res);
    } catch (e) {
      if (container) {
        container.innerHTML = `
          <div class="error-state-box dynamic-state-box dynamic-error-state">
            <span class="error-icon">⚠️</span>
            <h3>Erro ao Carregar Semestres</h3>
            <p>${escapeHTML(e.message)}</p>
          </div>
        `;
      }
    }
  }

  function preencherSemestreMaestro(index) {
    const semestre = normalizarSemestreUI(state.semestres[index] || {});
    if (!semestre.id) return;
    if (byId("semestre-id")) byId("semestre-id").value = semestre.id;
    if (byId("semestre-label")) byId("semestre-label").value = semestre.label;
    if (byId("semestre-ano")) byId("semestre-ano").value = semestre.ano;
    if (byId("semestre-periodo")) byId("semestre-periodo").value = semestre.periodo;
    if (byId("semestre-inicio")) byId("semestre-inicio").value = semestre.inicio;
    if (byId("semestre-fim")) byId("semestre-fim").value = semestre.fim;
    if (byId("semestre-status")) byId("semestre-status").value = semestre.status || "PASSADO";
  }

  function limparFormularioSemestreMaestro() {
    ["semestre-id", "semestre-label", "semestre-ano", "semestre-periodo", "semestre-inicio", "semestre-fim"].forEach(id => {
      const input = byId(id);
      if (input) input.value = "";
    });
    if (byId("semestre-status")) byId("semestre-status").value = "PASSADO";
  }

  function montarPayloadSemestre() {
    const session = getOperatorSessionSafe();
    return {
      semestreId: byId("semestre-id") ? byId("semestre-id").value.trim() : "",
      label: byId("semestre-label") ? byId("semestre-label").value.trim() : "",
      ano: byId("semestre-ano") ? byId("semestre-ano").value.trim() : "",
      periodo: byId("semestre-periodo") ? byId("semestre-periodo").value.trim() : "",
      inicio: byId("semestre-inicio") ? byId("semestre-inicio").value : "",
      fim: byId("semestre-fim") ? byId("semestre-fim").value : "",
      status: byId("semestre-status") ? byId("semestre-status").value : "PASSADO",
      usuarioLogadoId: session.email || session.nome || ""
    };
  }

  async function salvarSemestreMaestroUI() {
    if (!operatorCanManageSemesters()) return;

    const payload = montarPayloadSemestre();
    if (!payload.semestreId && (!payload.ano || !payload.periodo)) {
      notify("Informe um ID de semestre ou preencha ano e periodo.", "error");
      return;
    }

    try {
      const res = await apiCall("salvarSemestreMaestro", payload);
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Nao foi possivel salvar o semestre.");
      }
      notify("Semestre salvo com sucesso.", "success");
      renderizarSemestresMaestro(res);
    } catch (e) {
      notify(e.message, "error");
    }
  }

  async function executarAcaoSemestreMaestro(action, semestreId, confirmMessage) {
    if (!operatorCanManageSemesters()) return;
    const id = String(semestreId || "").trim();
    if (!id) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const session = getOperatorSessionSafe();
    try {
      const res = await apiCall(action, {
        semestreId: id,
        usuarioLogadoId: session.email || session.nome || ""
      });
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Acao nao concluida.");
      }
      notify("Semestre atualizado.", "success");
      renderizarSemestresMaestro(res);
    } catch (e) {
      notify(e.message, "error");
    }
  }

  function abrirGestaoSemestres() {
    if (!operatorCanManageSemesters()) return;
    switchView("view-semestres");
    carregarSemestresMaestro();
  }

  window.abrirGestaoSemestres = abrirGestaoSemestres;
  window.carregarSemestresMaestro = carregarSemestresMaestro;
  window.renderizarSemestresMaestro = renderizarSemestresMaestro;
  window.preencherSemestreMaestro = preencherSemestreMaestro;
  window.limparFormularioSemestreMaestro = limparFormularioSemestreMaestro;
  window.salvarSemestreMaestroUI = salvarSemestreMaestroUI;
  window.definirSemestreAtualMaestroUI = function definirSemestreAtualMaestroUI(id) {
    return executarAcaoSemestreMaestro("definirSemestreAtualMaestro", id);
  };
  window.marcarSemestrePassadoMaestroUI = function marcarSemestrePassadoMaestroUI(id) {
    return executarAcaoSemestreMaestro("marcarSemestrePassadoMaestro", id);
  };
  window.arquivarSemestreMaestroUI = function arquivarSemestreMaestroUI(id) {
    return executarAcaoSemestreMaestro("arquivarSemestreMaestro", id, "Arquivar este semestre?");
  };
  window.excluirSemestreMaestroUI = function excluirSemestreMaestroUI(id) {
    return executarAcaoSemestreMaestro("excluirSemestreMaestro", id, "Excluir apenas o registro do semestre? Os dados dos estudantes nao serao apagados por esta acao.");
  };
})();

// ========================================================================
// 9. MODO FISCAL E ADMINISTRAÇÃO AVANÇADA (V9.2.4)
// ========================================================================
let html5QrcodeScanner = null;

function escapeFiscal(valor) {
    if (typeof escapeHTMLMaestro === "function") return escapeHTMLMaestro(valor);
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeLinesFiscal(valor) {
    if (typeof safeLinesMaestro === "function") return safeLinesMaestro(valor);
    return escapeFiscal(valor).replace(/\r?\n/g, "<br>");
}

function iniciarScanner() {
    document.getElementById('leitor-qr-container').classList.remove('hidden');
    document.getElementById('btn-scanner').classList.add('hidden');
    document.getElementById('btn-scanner-nativo').classList.add('hidden');

    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(() => { });
    }

    html5QrcodeScanner = new Html5QrcodeScanner("leitor-qr", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render(aoLerQRCode, (e) => { });
}

function fecharScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(() => { });
        html5QrcodeScanner = null;
    }
    document.getElementById('leitor-qr-container').classList.add('hidden');
    document.getElementById('btn-scanner').classList.remove('hidden');
    document.getElementById('btn-scanner-nativo').classList.remove('hidden');
}

function aoLerQRCode(textoLido) {
    fecharScanner();

    let idLimpo = textoLido;
    let sementeLida = null;

    if (textoLido.indexOf('|') !== -1) {
        const partes = textoLido.split('|');
        idLimpo = partes[0];
        sementeLida = partes[1];
    } else {
        let matchId = textoLido.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
        if (matchId) idLimpo = matchId[1];
    }

    const sementeFiscal = localStorage.getItem("MAESTRO_SEMENTE_FISCAL");

    if (sementeFiscal && sementeLida !== sementeFiscal) {
        document.getElementById('res-fiscal').innerHTML = `
        <div class="wallet-card dark fiscal-security-card">
           <div class="wallet-header">ALERTA DE SEGURANCA</div>
           <div class="wallet-body text-center fiscal-security-body">
              <span class="fiscal-security-icon">⚠️</span>
              <strong class="fiscal-security-title">QR CODE EXPIRADO/INVALIDO</strong>
              <p class="fiscal-security-text">O codigo lido nao corresponde ao dia de hoje. Peca ao estudante para fechar a App, ligar a internet e abrir novamente a Carteira Digital.</p>
           </div>
        </div>`;
        return;
    }

    document.getElementById('id-fiscal').value = idLimpo;
    validarFiscal();
}
async function lerQRCodePorFoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("A processar imagem...", "loading");
    document.getElementById('btn-scanner-nativo').innerHTML = `⏳ A LER...`;

    const html5QrCode = new Html5Qrcode("leitor-qr");

    try {
        const textoLido = await html5QrCode.scanFile(file, true);
        document.getElementById('btn-scanner-nativo').innerHTML = `<span class="scanner-button-icon">📱</span> USAR CAMARA NATIVA`;
        aoLerQRCode(textoLido);
    } catch (err) {
        showToast("Erro ao processar imagem QR Code: " + err.message, "error");
        document.getElementById('btn-scanner-nativo').innerHTML = `<span class="scanner-button-icon">📱</span> USAR CAMARA NATIVA`;
    }

    event.target.value = '';
}
function fecharModoFiscalizacao() {
    fecharScanner();

    // Devolve o utilizador à tela correta baseada no nível guardado no login
    const nav = window.MaestroNavigation || (window.MaestroData && window.MaestroData.navigation);
    if (nav && typeof nav.getDefaultView === "function") {
        switchView(nav.getDefaultView());
        return;
    }

    const nivel = localStorage.getItem("MAESTRO_OPERADOR_NIVEL") || "";

    if (nivel === "MOTORISTA") {
        switchView('view-painel-motorista');
    } else if (nivel === "MODERADOR") {
        switchView('view-moderador');
    } else {
        switchView('view-admin-hub'); // Fiscais e Supervisores
    }
}

function abrirModoFiscalizacaoGlobal() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("fiscalizar", { notify: true })) return;

    // Leva qualquer operador para a tela isolada da câmara
    switchView('view-fiscal');
    iniciarScanner();
}

async function validarFiscal() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const idCarteira = document.getElementById('id-fiscal').value.trim().toUpperCase();
    if (!idCarteira) return;

    const btn = document.getElementById('btn-fiscal');
    const resBox = document.getElementById('res-fiscal');

    btn.innerText = "A VERIFICAR...";
    btn.disabled = true;
    resBox.innerHTML = "";

    let alunoBase = null;
    const cacheListRaw = localStorage.getItem("MAESTRO_LISTA_ESTUDANTES");
    if (cacheListRaw) {
        const cacheList = JSON.parse(cacheListRaw);
        alunoBase = cacheList.find(a => a.id === idCarteira);
    }

    if (alunoBase) {
        resBox.innerHTML = gerarHtmlFiscal(alunoBase.nome, "A carregar...", "...", "...", `<div class="wallet-photo skeleton-box"></div>`, alunoBase.status, "");
    } else {
        resBox.innerHTML = `<div class="text-center text-light fiscal-loading-text">A pesquisar na base de dados online... ⏳</div>`;
    }

    try {
        const res = await apiCall("consultarEstudantePorId", { idEstudante: idCarteira });

        if (!res.encontrado) {
            tocarBeep('error');
            resBox.innerHTML = `<div class="error-box">ID INVALIDO OU NAO ENCONTRADO</div>`;
        } else {
            if (res.statusAtividade === 'ATIVO') tocarBeep('success');
            else tocarBeep('error');
            resBox.innerHTML = gerarHtmlFiscal(res.nome, res.instituicao, res.rota, res.turno, `<div class="wallet-photo skeleton-box"></div>`, res.statusAtividade, res.obsCompleta);

            try {
                const resFoto = await apiCall("getFotoEstudanteBase64", { idEstudante: idCarteira });
                const fotoSegura = typeof safeUrlAttrMaestro === 'function' ? safeUrlAttrMaestro(resFoto.fotoBase64) : escapeFiscal(resFoto.fotoBase64 || "");
                const imgHtml = fotoSegura ? `<img src="${fotoSegura}" class="wallet-photo" alt="Foto do estudante">` : `<div class="wallet-photo wallet-photo-empty fiscal-photo-empty">Sem Foto</div>`;
                resBox.innerHTML = gerarHtmlFiscal(res.nome, res.instituicao, res.rota, res.turno, imgHtml, res.statusAtividade, res.obsCompleta);
                if (res.statusAtividade === "ATIVO" && typeof iniciarRelogioAntiPrint === "function") {
                    iniciarRelogioAntiPrint('fiscal-clock');
                }
            } catch (errFoto) {
                showToast("Erro ao carregar a foto: " + errFoto.message, "error");
            }
        }

    } catch (err) {
        showToast("Erro de conexao com o servidor: " + err.message, "error");
    } finally {
        btn.innerText = "VERIFICAR ESTUDANTE";
        btn.disabled = false;
    }
}
function tocarBeep(tipo) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (tipo === 'success') {
            osc.frequency.value = 800;
            osc.type = 'sine';
        } else {
            osc.frequency.value = 300;
            osc.type = 'sawtooth';
        }

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.warn("Áudio não suportado: " + e.message);
    }
}

function extrairTextoDaTag(textoBruto, tag) {
    if (!textoBruto) return "";
    const regex = new RegExp("<" + tag + ">([\\s\\S]*?)<\\/" + tag + ">", "i");
    const match = textoBruto.match(regex);
    return match ? match[1].trim() : "";
}

function gerarHtmlFiscal(nome, inst, rota, turno, fotoComponente, statusReal, obsCompleta) {
    let statusBadge = "";
    let relogioAntiPrint = "";
    let caixaMotivo = "";
    const statusNormalizado = String(statusReal || "").trim().toUpperCase();
    const nomeTratado = typeof formatarNomeProprio === 'function' ? formatarNomeProprio(nome) : nome;
    const nomeSeguro = escapeFiscal(nomeTratado);
    const instSeguro = escapeFiscal(inst || "...");
    const rotaSeguro = escapeFiscal(rota || "...");
    const turnoSeguro = escapeFiscal(turno || "...");

    if (statusNormalizado !== "ATIVO" && obsCompleta) {
        let motivoFiscal = extrairTextoDaTag(obsCompleta, "textofiscal");

        if (!motivoFiscal) {
            let linhas = String(obsCompleta || "").trim().split('\n');
            motivoFiscal = linhas.length > 0 ? linhas[linhas.length - 1] : "Motivo nao especificado. Consulte o sistema central.";
        }

        const classeCritica = statusNormalizado === "SUSPENSO" || statusNormalizado === "CANCELADO" ? " is-critical" : "";
        caixaMotivo = `
        <div class="fiscal-note-box${classeCritica}">
            <strong class="fiscal-note-title">Nota para o Fiscal:</strong>
            <p class="fiscal-note-text">${safeLinesFiscal(motivoFiscal)}</p>
        </div>`;
    }

    if (statusNormalizado === "ATIVO") {
        statusBadge = `<div class="fiscal-status-badge is-active">LIBERADO</div>`;
        relogioAntiPrint = `<div class="anti-print-bar fiscal-clock" id="fiscal-clock"></div>`;
    } else if (statusNormalizado === "CANCELADO") {
        statusBadge = `<div class="fiscal-status-badge is-cancelled">CANCELADO</div>`;
    } else if (statusNormalizado === "SUSPENSO") {
        statusBadge = `<div class="fiscal-status-badge is-suspended">SUSPENSO</div>`;
    } else {
        statusBadge = `<div class="fiscal-status-badge is-pending">PENDENTE</div>`;
    }

    return `
    <div class="wallet-card dark">
      <div class="wallet-header">FISCALIZACAO DE IDENTIDADE</div>
      <div class="wallet-body">
        ${fotoComponente}
        <div class="wallet-info">
          <div class="w-group"><span>Estudante</span><span class="highlight">${nomeSeguro}</span></div>
          <div class="w-group"><span>Instituicao</span><span>${instSeguro}</span></div>
          <div class="w-group"><span>Rota / Turno</span><span class="fiscal-route-highlight">${rotaSeguro} - ${turnoSeguro}</span></div>
        </div>
      </div>
      ${caixaMotivo}
      <div class="wallet-footer fiscal-footer">${statusBadge}${relogioAntiPrint}</div>
    </div>`;
}
// Export functions to global scope
window.iniciarScanner = iniciarScanner;
window.fecharScanner = fecharScanner;
window.aoLerQRCode = aoLerQRCode;
window.lerQRCodePorFoto = lerQRCodePorFoto;
window.fecharModoFiscalizacao = fecharModoFiscalizacao;
window.abrirModoFiscalizacaoGlobal = abrirModoFiscalizacaoGlobal;
window.validarFiscal = validarFiscal;
window.tocarBeep = tocarBeep;
window.extrairTextoDaTag = extrairTextoDaTag;
window.gerarHtmlFiscal = gerarHtmlFiscal;

// ========================================================================
// MÓDULO DE FROTA E SOS (V9.2.5)
// ========================================================================

// ------------------------------------------------------------------------
// NOVO: Funções de Encerramento Manual de Rota (V9.2.2)
// ------------------------------------------------------------------------
function abrirModalEncerrarRota() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("encerrarRota", { notify: true })) return;

    document.getElementById('modal-encerrar-rota').classList.remove('hidden');
    document.getElementById('input-encerrar-onibus').value = '';
}

function fecharModalEncerrarRota() {
    document.getElementById('modal-encerrar-rota').classList.add('hidden');
    const btn = document.getElementById('btn-enviar-encerramento');
    btn.innerHTML = 'CONFIRMAR FIM DE ROTA';
    btn.disabled = false;
}

async function dispararEncerramentoRota() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const idBus = document.getElementById('input-encerrar-onibus').value.trim().toUpperCase();
    const btn = document.getElementById('btn-enviar-encerramento');

    if (!idBus) {
        showToast("Digite o identificador do autocarro.", "error");
        return;
    }

    btn.innerHTML = 'A PROCESSAR DESEMBARQUE... ⏳';
    btn.disabled = true;

    try {
        const res = await apiCall("encerrarRotaManual", { idOnibus: idBus });
        if (res.sucesso) {
            showToast(res.msg, "success");
            fecharModalEncerrarRota();
        } else {
            showToast(res.erro || "Falha ao encerrar a rota.", "error");
        }
    } catch (e) {
        showToast("Erro ao encerrar a rota: " + e.message, "error");
    } finally {
        if (!document.getElementById('modal-encerrar-rota').classList.contains('hidden')) {
            btn.innerHTML = 'TENTAR NOVAMENTE';
            btn.disabled = false;
        }
    }
}

// ------------------------------------------------------------------------
// MOTOR DE CRISES E AVISOS PUSH - PARTE SOS
// ------------------------------------------------------------------------
function abrirModalSOS() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("reportarSos", { notify: true })) return;

    document.getElementById('modal-sos-fiscal').classList.remove('hidden');
    document.getElementById('sos-id-onibus').value = '';
    document.getElementById('sos-motivo').value = '';
}

function fecharModalSOS() {
    document.getElementById('modal-sos-fiscal').classList.add('hidden');
    const btn = document.getElementById('btn-enviar-sos');
    btn.innerHTML = 'ENVIAR ALARME E MEU GPS';
    btn.disabled = false;
}

function confirmarEmergenciaGPS() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const idBus = document.getElementById('sos-id-onibus').value.trim().toUpperCase();
    const motivo = document.getElementById('sos-motivo').value;
    const btn = document.getElementById('btn-enviar-sos');

    if (!idBus || !motivo) {
        showToast("Preencha a Placa/Rota e selecione o motivo.", "error");
        return;
    }

    btn.innerHTML = 'A OBTER GPS E NOTIFICAR ALUNOS... ⏳';
    btn.disabled = true;

    if (!navigator.geolocation) {
        enviarAlarmeCriseAPI(idBus, motivo, "GPS Indisponível no Dispositivo");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            const coord = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            enviarAlarmeCriseAPI(idBus, motivo, coord);
        },
        function (err) {
            enviarAlarmeCriseAPI(idBus, motivo, "GPS Recusado ou Falhou");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

async function enviarAlarmeCriseAPI(idBus, motivo, coords) {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const btn = document.getElementById('btn-enviar-sos');

    try {
        const res = await apiCall("declararEmergenciaOnibus", { idRotaPlaca: idBus, tipoAvaria: motivo, coordenadasGps: coords });
        if (res.sucesso) {
            showToast("Emergência reportada! Alunos da rota avisados via Push.", "success");
            fecharModalSOS();
        } else {
            showToast(res.erro || "Falha ao gravar emergência.", "error");
            btn.innerHTML = 'TENTAR NOVAMENTE';
            btn.disabled = false;
        }
    } catch (e) {
        showToast("Erro ao reportar SOS: " + e.message, "error");
        btn.innerHTML = 'TENTAR NOVAMENTE';
        btn.disabled = false;
    }
}

// Export functions to global scope
window.abrirModalEncerrarRota = abrirModalEncerrarRota;
window.fecharModalEncerrarRota = fecharModalEncerrarRota;
window.dispararEncerramentoRota = dispararEncerramentoRota;
window.abrirModalSOS = abrirModalSOS;
window.fecharModalSOS = fecharModalSOS;
window.confirmarEmergenciaGPS = confirmarEmergenciaGPS;
window.enviarAlarmeCriseAPI = enviarAlarmeCriseAPI;


console.log("🚀 [Jekyll] Maestro Bundle carregado com sucesso!");
