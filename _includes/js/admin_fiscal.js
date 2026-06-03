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
    if (typeof atualizarEstadoOperacionalMaestro === "function") atualizarEstadoOperacionalMaestro();

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
    if (typeof atualizarEstadoOperacionalMaestro === "function") atualizarEstadoOperacionalMaestro();
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
    if (typeof atualizarEstadoOperacionalMaestro === "function") atualizarEstadoOperacionalMaestro();

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
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Audio nao suportado.", e);
        else console.warn("Audio nao suportado.");
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
