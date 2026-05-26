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
