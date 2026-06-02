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

function obterTtlCarteiraMaestro() {
    const storage = window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;
    return storage && typeof storage.getDomainTtlMs === "function"
        ? storage.getDomainTtlMs("wallet")
        : 1000 * 60 * 60 * 12;
}

function marcarCacheCarteiraMaestro(dados, origem) {
    if (!window.MaestroData || !window.MaestroData.storage) return;
    const identidade = window.MaestroData.adapters && typeof window.MaestroData.adapters.studentIdentity === "function"
        ? window.MaestroData.adapters.studentIdentity(dados || {})
        : {};
    const semesterContext = window.MaestroData.contexts && window.MaestroData.contexts.semester
        ? window.MaestroData.contexts.semester.get()
        : {};

    window.MaestroData.storage.markDomain("wallet", {
        tenantId: identidade.tenantId,
        semestreId: semesterContext.semestreId || (dados && (dados.semestreId || dados.SEMESTRE_ATUAL)),
        source: origem || "carteira",
        key: "MAESTRO_WALLET_CACHE",
        ttlMs: obterTtlCarteiraMaestro()
    });
}

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
            if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Erro ao restaurar sessao de estudante na memoria.", e);
            else console.warn("Erro ao restaurar sessao de estudante na memoria.");
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
      marcarCacheCarteiraMaestro(res, "autenticarCarteiraDigital");

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

function estagioCarteiraVisivelMaestro() {
    return typeof window.maestroEstagioVisivel === "function" ? window.maestroEstagioVisivel() : true;
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
    let visualState = obterStatusCarteiraVisual(dados, { offline: offline });
    if (!estagioCarteiraVisivelMaestro() && visualState && visualState.stateClass === "wallet-state-estagio") {
        visualState = Object.assign({}, visualState, {
            isEstagioActive: false,
            stateClass: "wallet-state-neutral",
            backgroundToken: "wallet.neutral",
            badgeLabel: "Carteira digital",
            reason: "Estado visual padrao aplicado pela politica do portal."
        });
    }
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
    const estagioVisivel = estagioCarteiraVisivelMaestro();
    let visualState = obterStatusCarteiraVisual(dados, { offline: offline });
    if (!estagioVisivel && visualState && visualState.stateClass === "wallet-state-estagio") {
        visualState = Object.assign({}, visualState, {
            isEstagioActive: false,
            stateClass: "wallet-state-neutral",
            backgroundToken: "wallet.neutral",
            badgeLabel: "Carteira digital",
            reason: "Estado visual padrao aplicado pela politica do portal."
        });
    }
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
    const resumoEstagio = estagioVisivel
        ? obterResumoAtualizacaoEstagioCarteira(dados, offline)
        : {
            podeAtualizar: false,
            textoBotao: "Atualizacao de estagio indisponivel",
            motivo: "Conteudos de estagio ocultos pela politica do portal."
        };
    const botaoEstagioClasses = resumoEstagio.podeAtualizar ? "btn-solid wallet-stage-update-button" : "btn-solid wallet-disabled-action";
    const botaoEstagioDisabled = resumoEstagio.podeAtualizar ? "" : "disabled";
    const acoesEstagioHTML = estagioVisivel ? `
        <div data-maestro-estagio-feature="carteira">
          <button id="btn-wallet-stage-update" class="${botaoEstagioClasses}" onclick="abrirFormularioAtualizacaoEstagioCarteira()" ${botaoEstagioDisabled}>${escapeWallet(resumoEstagio.textoBotao)}</button>
          <div class="wallet-stage-limit-note">${escapeWallet(resumoEstagio.motivo)}</div>
          <div id="wallet-stage-update-slot"></div>
        </div>
      ` : "";

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
        ${acoesEstagioHTML}
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
    if (!estagioCarteiraVisivelMaestro()) {
        showToast("Atualizacao de estagio indisponivel para este portal.", "warning");
        return;
    }
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
    if (!estagioCarteiraVisivelMaestro()) {
        showToast("Atualizacao de estagio indisponivel para este portal.", "warning");
        return;
    }
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
        marcarCacheCarteiraMaestro(carteiraAtualizada, "atualizarEstagioCarteira");
        walletStageUpdateFile = null;
        showToast(res.msg || "Atualizacao enviada para auditoria.", "success");
        renderizarCarteira(carteiraAtualizada);
    } catch (erro) {
        if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro ao atualizar estagio pela carteira.", erro);
        else console.error("Erro ao atualizar estagio pela carteira.");
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
                if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Wake Lock falhou.", err);
                else console.warn("Wake Lock falhou.");
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
