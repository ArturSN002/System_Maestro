// ========================================================================
// 1. MOTOR PWA & ARRANQUE DINÂMICO (BOOTSTRAP)
// ========================================================================

let deferredPrompt;

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

async function bootSystem() {
  try {
    const res = await apiCall("getConfiguracoesPWA");

    if (res.sucesso) {
      window.PWA_NOME = res.pwa.NOME;
      window.PWA_ICONE = res.pwa.ICONE;

      window.THEME_LIGHT = { primary: res.ui.COR_PRIMARIA_LIGHT, secondary: res.ui.COR_SECUNDARIA_LIGHT, accent: res.ui.COR_DE_DESTAQUE_LIGHT, logo: res.ui.LOGO_LIGHT };
      window.THEME_DARK = { primary: res.ui.COR_PRIMARIA_DARK, secondary: res.ui.COR_SECUNDARIA_DARK, accent: res.ui.COR_DE_DESTAQUE_DARK, logo: res.ui.LOGO_DARK };

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

      const elSetor = document.getElementById('ui-nome-setor');
      if (elSetor) elSetor.innerText = res.ui.NOME_SISTEMA;

      // Captura e renderiza o emblema dinâmico (Fallback para LOGO_LIGHT se necessário)
      const urlEmblema = (res.pwa && res.pwa.EMBLEMA_PWA) || 
                         (res.ui && res.ui.EMBLEMA_PWA) || 
                         (res.config && res.config.EMBLEMA_PWA) || 
                         (res.ui && res.ui.LOGO_LIGHT);
      if (urlEmblema) {
        document.querySelectorAll('img[src*="MGA.png"], .app-emblem, #splash-logo').forEach(img => {
          img.src = urlEmblema;
          img.classList.remove('hidden');
        });
      }

      const elEnd = document.getElementById('ui-endereco');
      if (elEnd && res.contato.ENDERECO) { elEnd.innerText = res.contato.ENDERECO; elEnd.classList.remove('hidden'); }

      const elEmail = document.getElementById('ui-email');
      if (elEmail && res.contato.EMAIL) { elEmail.innerText = res.contato.EMAIL; elEmail.classList.remove('hidden'); }

      const elCnpj = document.getElementById('ui-cnpj');
      if (elCnpj && res.contato.CNPJ) { elCnpj.innerText = "CNPJ: " + res.contato.CNPJ; elCnpj.classList.remove('hidden'); }

      initPWA();
    }
  } catch (e) {
    console.warn("A arrancar em modo offline persistente.");
  }

  const lastView = sessionStorage.getItem('MAESTRO_LAST_VIEW') || 'view-hub';
  switchView(lastView);

  carregarAvisosSMEB();
  verificarSessaoAtiva();
  restaurarSessaoEstudante();

  ocultarSplashScreen();
  if (typeof window.atualizarContadorNotificacoes === 'function') window.atualizarContadorNotificacoes();
}

function ocultarSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => { splash.style.display = 'none'; }, 500);
  }
}

function initPWA() {
  if (!window.PWA_NOME) return;

  if ('serviceWorker' in navigator) {
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      const swUrl = `./sw.js?apiKey=${window.FIREBASE_CONFIG.apiKey}&projectId=${window.FIREBASE_CONFIG.projectId}&senderId=${window.FIREBASE_CONFIG.messagingSenderId}&appId=${window.FIREBASE_CONFIG.appId}`;

      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('SW registado com sucesso com chaves dinâmicas!', registration.scope);
        })
        .catch(err => {
          console.log('Falha ao registar SW:', err);
        });

    } else {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('SW registado em modo apenas-offline.'));
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

function switchView(viewId) {
  closeAllSidebars();

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
    v.style.display = 'none';
  });

  if (target) {
    target.style.display = 'block';
    setTimeout(() => {
      target.classList.add('active-view');
      target.classList.add('slide-in-right');
    }, 10);
    sessionStorage.setItem('MAESTRO_LAST_VIEW', viewId);
  }

  window.scrollTo(0, 0);

  // CONTROLO DO BOTÃO DE CONFIGURAÇÕES (ENGRENAGEM) ULTRA-RESILIENTE
  const btnConfig = document.getElementById('btn-config');
  if (btnConfig) {
    // Força a remoção de qualquer classe 'hidden' que possa ter ficado presa no HTML
    btnConfig.classList.remove('hidden');

    // Se for ecrã de município ou login, oculta. Se não, força a exibição absoluta!
    if (viewId === 'view-gateway' || viewId === 'view-login-fiscal' || viewId === 'view-login') {
      btnConfig.style.setProperty('display', 'none', 'important');
    } else {
      btnConfig.style.setProperty('display', 'flex', 'important');
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

    if (!res || !res.avisos || res.avisos.length === 0) {
      if (container) container.classList.add('hidden');
      if (header) header.classList.add('hidden');
      return;
    }

    let html = '';
    res.avisos.forEach(function (aviso) {
      let classeTipo = 'aviso-geral';
      const tipoNormalizado = aviso.tipo.toLowerCase().trim();
      if (tipoNormalizado === 'urgente') classeTipo = 'aviso-urgente';
      if (tipoNormalizado === 'transporte') classeTipo = 'aviso-transporte';

      html += `<div class="aviso-card ${classeTipo}">`;
      if (aviso.imagem) html += `<img src="${aviso.imagem}" class="aviso-imagem" alt="Aviso">`;
      html += `<span class="aviso-tag">${aviso.tipo}</span>`;
      html += `<h4 class="aviso-titulo">${aviso.titulo}</h4>`;
      if (aviso.assunto) html += `<p class="aviso-texto">${aviso.assunto}</p>`;
      if (aviso.anexo) html += `<a href="${aviso.anexo}" target="_blank" class="aviso-btn-anexo">📄 Baixar Documento</a>`;
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
  toast.innerText = msg;
  toast.style.background = type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : type === 'warning' ? '#f59e0b' : '#333';
  toast.style.display = 'block';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 3500);
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

  if (!cpfParaSync) {
    console.warn("registrarTokenPush: CPF ausente no cache — registo de push abortado.");
    return;
  }

  try {
    const res = await apiCall("registrarPushToken", {
      idEstudante: cpfParaSync,
      pushToken: token,
      tokenDispositivo: token
    });

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

function aplicarTemaAtual() {
  if (!window.THEME_LIGHT || !window.THEME_DARK) return;

  const isDark = document.body.classList.contains('dark-theme');
  const theme = isDark ? window.THEME_DARK : window.THEME_LIGHT;

  document.body.style.setProperty('--primary', theme.primary, 'important');
  document.body.style.setProperty('--secondary', theme.secondary, 'important');
  document.body.style.setProperty('--accent', theme.accent, 'important');

  window.THEME_COLOR = theme.primary;
  window.BG_COLOR = theme.secondary;

  const metaThemeColor = document.getElementById('meta-theme-color');
  if (metaThemeColor) metaThemeColor.content = theme.primary;

  if (theme.logo && theme.logo !== "") {
    const logoEl = document.getElementById('ui-logo');
    const splashLogo = document.getElementById('splash-logo');
    if (logoEl) { logoEl.src = theme.logo; logoEl.classList.remove('hidden'); }
    if (splashLogo) { splashLogo.src = theme.logo; splashLogo.classList.remove('hidden'); }
  }
}

window.onload = function () {
  if (localStorage.getItem('MAESTRO_DARK_MODE') === 'true') {
    document.body.classList.add('dark-theme');
  }

  if (typeof checkClientGateway === 'function') checkClientGateway();

  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');
  const authParam = urlParams.get('auth');
  const validarParam = urlParams.get('validar');

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
          if (indicador) indicador.style.opacity = (indicador.style.opacity == '1' ? '0.5' : '1');
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
          badge.style.display = 'inline-flex';
          badge.setAttribute('aria-label', `${totalNaoLidas} notificações não lidas`);
          badge.title = `${totalNaoLidas} notificações não lidas`;
        } else {
          badge.textContent = '';
          badge.style.display = 'none';
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
      container.innerHTML = '<div class="loader" style="margin: 0 auto;"></div>';
    });

    try {
      const db = await abrirBancoInbox();
      const transaction = db.transaction(INBOX_STORE_NAME, 'readonly');
      const store = transaction.objectStore(INBOX_STORE_NAME);
      const notificacoes = await executarRequestInbox(store.getAll());

      notificacoes.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

      if (notificacoes.length === 0) {
        containers.forEach(container => {
          container.innerHTML = '<div style="text-align: center; padding: 30px; background: #fff; border: 1px dashed #ccc; border-radius: 8px;"><p style="font-size: 12px; color: #666;">Nenhuma notificação recente.</p></div>';
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
        const corBorda = naoLida ? '#2563eb' : 'var(--primary)';
        const marcadorNaoLida = naoLida ? '<span style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%; flex: 0 0 auto; margin-top: 4px;" title="Não lida"></span>' : '';
        const botaoMarcarLida = naoLida ? `<button type="button" class="btn-text" data-marcar-lida="${timestampSeguro}" style="margin-top: 8px; padding: 0; font-size: 10px; font-weight: 700; color: #2563eb;">Marcar como lida</button>` : '';

        return `
          <div class="form-card" style="padding: 15px; margin-bottom: 10px; border-left: 4px solid ${corBorda}; text-align: left;">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                ${marcadorNaoLida}
                <strong style="font-size: 13px; color: var(--primary);">${titulo}</strong>
              </div>
              <span style="font-size: 10px; color: var(--text-sub); white-space: nowrap;">${dataFormatada}</span>
            </div>
            <p style="font-size: 12px; margin: 0; color: #333; line-height: 1.4;">${corpo}</p>
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
        container.innerHTML = '<div class="error-box">Erro ao carregar notificações locais.</div>';
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
