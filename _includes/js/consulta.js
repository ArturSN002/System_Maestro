// ========================================================================
// 6. FLUXO DE CONSULTA DO ESTUDANTE
// ========================================================================
const MAESTRO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const MAESTRO_UPLOAD_REGRAS = {
    resgate: {
        FOTO: {
            mimes: ["image/jpeg", "image/png"],
            exts: ["jpg", "jpeg", "png"],
            label: "imagem JPG ou PNG"
        },
        VINCULO: {
            mimes: ["application/pdf"],
            exts: ["pdf"],
            label: "PDF"
        },
        RESIDENCIA: {
            mimes: ["application/pdf"],
            exts: ["pdf"],
            label: "PDF"
        },
        DOCUMENTO: {
            mimes: ["application/pdf"],
            exts: ["pdf"],
            label: "PDF"
        },
        ESTAGIO: {
            mimes: ["application/pdf"],
            exts: ["pdf"],
            label: "PDF"
        }
    },
    inscricao: {
        foto3x4: {
            mimes: ["image/jpeg", "image/png", "image/webp"],
            exts: ["jpg", "jpeg", "png", "webp"],
            label: "imagem JPG, PNG ou WEBP"
        },
        documento: {
            mimes: ["application/pdf", "image/jpeg", "image/png"],
            exts: ["pdf", "jpg", "jpeg", "png"],
            label: "PDF, JPG ou PNG"
        },
        residencia: {
            mimes: ["application/pdf", "image/jpeg", "image/png"],
            exts: ["pdf", "jpg", "jpeg", "png"],
            label: "PDF, JPG ou PNG"
        },
        vinculo: {
            mimes: ["application/pdf", "image/jpeg", "image/png"],
            exts: ["pdf", "jpg", "jpeg", "png"],
            label: "PDF, JPG ou PNG"
        },
        estagio: {
            mimes: ["application/pdf", "image/jpeg", "image/png"],
            exts: ["pdf", "jpg", "jpeg", "png"],
            label: "PDF, JPG ou PNG"
        },
        menorIdade: {
            mimes: ["application/pdf", "image/jpeg", "image/png"],
            exts: ["pdf", "jpg", "jpeg", "png"],
            label: "PDF, JPG ou PNG"
        }
    }
};

function normalizarCPFMaestro(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function validarCPFMaestro(valor) {
    const cpf = normalizarCPFMaestro(valor);
    if (cpf.length !== 11) {
        return { valido: false, cpf: cpf, erro: "CPF invalido. Informe os 11 digitos." };
    }
    if (/^(\d)\1{10}$/.test(cpf)) {
        return { valido: false, cpf: cpf, erro: "CPF invalido. Sequencias repetidas nao sao aceitas." };
    }

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i), 10) * (10 - i);
    let digito = 11 - (soma % 11);
    if (digito >= 10) digito = 0;
    if (digito !== parseInt(cpf.charAt(9), 10)) {
        return { valido: false, cpf: cpf, erro: "CPF invalido. Confira os digitos informados." };
    }

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i), 10) * (11 - i);
    digito = 11 - (soma % 11);
    if (digito >= 10) digito = 0;
    if (digito !== parseInt(cpf.charAt(10), 10)) {
        return { valido: false, cpf: cpf, erro: "CPF invalido. Confira os digitos informados." };
    }

    return { valido: true, cpf: cpf };
}

function escapeHTMLBasicoMaestro(valor) {
    if (typeof escapeHTMLMaestro === "function") return escapeHTMLMaestro(valor);
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obterExtensaoArquivoMaestro(nome) {
    const partes = String(nome || "").toLowerCase().split(".");
    return partes.length > 1 ? partes.pop().replace(/[^a-z0-9]/g, "") : "";
}

function obterRegraUploadMaestro(contexto, tipoDoc) {
    const grupo = MAESTRO_UPLOAD_REGRAS[contexto] || {};
    return grupo[tipoDoc] || grupo[String(tipoDoc || "").toUpperCase()] || null;
}

function validarArquivoMaestro(file, tipoDoc, contexto) {
    const regra = obterRegraUploadMaestro(contexto, tipoDoc);
    if (!file) return { valido: false, erro: "Selecione um arquivo." };
    if (!regra) return { valido: false, erro: "Tipo de documento nao permitido." };
    if (file.size > MAESTRO_UPLOAD_MAX_BYTES) {
        return { valido: false, erro: "Arquivo muito grande. Envie um arquivo de ate 5MB." };
    }

    const mime = String(file.type || "").toLowerCase();
    const ext = obterExtensaoArquivoMaestro(file.name);
    const extOk = regra.exts.indexOf(ext) !== -1;
    const mimeOk = !mime || regra.mimes.indexOf(mime) !== -1;

    if (!extOk || !mimeOk) {
        return {
            valido: false,
            erro: "Formato invalido. Envie " + regra.label + "."
        };
    }

    return { valido: true };
}

function marcarCampoInvalidoMaestro(campoId, mensagem, describedById) {
    const campo = document.getElementById(campoId);
    if (!campo) return;
    campo.setAttribute("aria-invalid", "true");
    if (describedById) campo.setAttribute("aria-describedby", describedById);
    if (!describedById) {
        const feedbackId = campoId + "-feedback-fixo";
        let feedback = document.getElementById(feedbackId);
        if (!feedback) {
            feedback = document.createElement("div");
            feedback.id = feedbackId;
            feedback.className = "feedback-box-cpf feedback-error";
            feedback.setAttribute("role", "alert");
            feedback.setAttribute("aria-live", "polite");
            campo.insertAdjacentElement("afterend", feedback);
        }
        feedback.textContent = mensagem;
        campo.setAttribute("aria-describedby", feedbackId);
    }
}

function limparCampoInvalidoMaestro(campoId) {
    const campo = document.getElementById(campoId);
    if (!campo) return;
    campo.removeAttribute("aria-invalid");
}

function mostrarFeedbackPersistenteMaestro(containerId, titulo, mensagem, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const classe = tipo === "success" ? "feedback-success" : (tipo === "info" ? "feedback-info" : "feedback-error");
    const role = tipo === "success" || tipo === "info" ? "status" : "alert";
    const tituloSeguro = escapeHTMLBasicoMaestro(titulo);
    const mensagemSegura = escapeHTMLBasicoMaestro(mensagem).replace(/\n/g, "<br>");
    container.className = "feedback-box-cpf " + classe;
    container.setAttribute("role", role);
    container.setAttribute("aria-live", "polite");
    container.innerHTML = `<strong>${tituloSeguro}</strong><br>${mensagemSegura}`;
    container.classList.remove("hidden");
}

function normalizarCodigoValidadorPublicoMaestro(valor) {
    return String(valor || "").trim().replace(/\s+/g, "").toUpperCase();
}

function validarCodigoValidadorPublicoMaestro(codigo) {
    if (!codigo) return { valido: false, erro: "Informe o codigo de validacao." };
    if (codigo.length < 6) return { valido: false, erro: "Codigo de validacao muito curto." };
    if (!/^[A-Z0-9_-]+$/.test(codigo)) return { valido: false, erro: "Codigo de validacao contem caracteres invalidos." };
    return { valido: true };
}

async function verificarHashPublico() {
    const inputHash = document.getElementById("input-hash-validador");
    const btn = document.querySelector("#view-validador button[onclick='verificarHashPublico()']");
    const codigo = normalizarCodigoValidadorPublicoMaestro(inputHash ? inputHash.value : "");
    const validacao = validarCodigoValidadorPublicoMaestro(codigo);

    if (inputHash) inputHash.value = codigo;
    if (!validacao.valido) {
        marcarCampoInvalidoMaestro("input-hash-validador", validacao.erro, "res-validador");
        mostrarFeedbackPersistenteMaestro("res-validador", "Validacao pendente", validacao.erro, "error");
        if (typeof showToast === "function") showToast(validacao.erro, "error");
        return;
    }

    limparCampoInvalidoMaestro("input-hash-validador");
    mostrarFeedbackPersistenteMaestro("res-validador", "Validando documento", "Aguarde enquanto consultamos o cartorio digital.", "info");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Validando...";
    }

    try {
        const res = await apiCall("validarDocumentoPublico", { hash: codigo, codigo: codigo });
        if (!res || res.sucesso === false) {
            mostrarFeedbackPersistenteMaestro("res-validador", "Documento nao validado", (res && res.erro) || "Codigo nao localizado.", "error");
            return;
        }

        const tipo = res.tipo === "CARTEIRA" ? "Carteira digital" : "Declaracao";
        const situacao = res.valido ? "Documento autentico e ativo." : "Documento localizado, mas sem status ativo.";
        const detalhes = [
            situacao,
            "Tipo: " + tipo,
            res.nome ? "Estudante: " + res.nome : "",
            res.cpfMascarado ? "CPF: " + res.cpfMascarado : "",
            res.instituicao ? "Instituicao: " + res.instituicao : "",
            res.status ? "Status: " + res.status : ""
        ].filter(Boolean).join("\n");
        mostrarFeedbackPersistenteMaestro("res-validador", res.valido ? "Documento valido" : "Atencao", detalhes, res.valido ? "success" : "error");
    } catch (e) {
        mostrarFeedbackPersistenteMaestro("res-validador", "Falha na validacao", "Nao foi possivel consultar o servidor agora.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Validar Documento";
        }
    }
}

async function consultarEstudante() {
    const alvo = document.getElementById('id-estudante').value.trim();
    const cpfValidado = validarCPFMaestro(alvo);
    if (!cpfValidado.valido) {
        marcarCampoInvalidoMaestro("id-estudante", cpfValidado.erro, "res-estudante");
        mostrarErroEstudante("CPF invalido", cpfValidado.erro);
        showToast(cpfValidado.erro, "error");
        return;
    }

    const btn = document.getElementById('btn-estudante');
    const resBox = document.getElementById('res-estudante');
    const checkboxPush = document.getElementById('chk-notificacoes-cpf');
    limparCampoInvalidoMaestro("id-estudante");

    btn.innerText = "A CONSULTAR...";
    btn.disabled = true;
    resBox.classList.add('hidden');

    try {
        const res = await apiCall("consultarStatusCPF", { cpf: cpfValidado.cpf });

        if (!res.encontrado) {
            mostrarErroEstudante("Não Encontrado", "Verifique o CPF ou submissão.");
            return;
        }

        if (checkboxPush && checkboxPush.checked) {
            solicitarConsentimentoPushAnonimo(cpfValidado.cpf);
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
            if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Firebase nao disponivel apos aguardar inicializacao.");
            else console.warn("Firebase nao disponivel apos aguardar inicializacao.");
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
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Push anonimo falhou ou foi bloqueado.", error);
        else console.warn("Push anonimo falhou ou foi bloqueado.");
    }
}

function renderizarTimelineEstudante(dados, container) {
    const nomeLimpo = typeof escapeHTMLMaestro === 'function'
        ? escapeHTMLMaestro(formatarNomeProprio(dados.nome).split(' ')[0])
        : String(formatarNomeProprio(dados.nome).split(' ')[0] || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
                    const idJsSeguro = typeof safeJsStringAttrMaestro === 'function'
                        ? safeJsStringAttrMaestro(dados.idAcesso)
                        : JSON.stringify(String(dados.idAcesso || "")).replace(/"/g, "&quot;");
                    html += `
           <div class="timeline-id-card">
             <span class="timeline-id-label">O seu ID de Acesso e:</span>
             <strong class="timeline-access-id">${idSeguro}</strong>
             <p class="timeline-id-help">Use este ID e os 4 ultimos digitos do seu CPF para abrir o cofre digital.</p>
             <button class="btn-solid timeline-action-button" onclick="irParaCofreComId(${idJsSeguro})">IR PARA O COFRE</button>
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
    resBox.setAttribute("role", "alert");
    resBox.setAttribute("aria-live", "polite");
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
    const feedback = document.getElementById("resgate-feedback");
    if (feedback) feedback.classList.add("hidden");
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

    const validacaoArquivo = validarArquivoMaestro(file, tipoDoc, "resgate");
    if (!validacaoArquivo.valido) {
        showToast(validacaoArquivo.erro, "error");
        inputElement.value = "";
        delete arquivosParaResgate[tipoDoc];
        atualizarStatusResgateMaestro(statusSpan, validacaoArquivo.erro, "is-error");
        mostrarFeedbackPersistenteMaestro("resgate-feedback", "Arquivo recusado", validacaoArquivo.erro, "error");
        verificarBotaoResgate();
        return;
    }

    atualizarStatusResgateMaestro(statusSpan, "A processar...", "is-processing");

    const reader = new FileReader();
    reader.onload = function (e) {
        arquivosParaResgate[tipoDoc] = {
            tipo: tipoDoc,
            nome: file.name,
            mimeType: file.type || "",
            base64: e.target.result
        };
        atualizarStatusResgateMaestro(statusSpan, "Anexado e pronto a enviar!", "is-success");
        const cpfAtual = validarCPFMaestro(document.getElementById('id-estudante') ? document.getElementById('id-estudante').value : "");
        if (!cpfAtual.valido) {
            mostrarFeedbackPersistenteMaestro("resgate-feedback", "CPF necessario", "Consulte um CPF valido antes de enviar documentos de resgate.", "error");
        }
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
    if (!btn) return;
    const cpfAtual = validarCPFMaestro(document.getElementById('id-estudante') ? document.getElementById('id-estudante').value : "");
    if (Object.keys(arquivosParaResgate).length > 0 && cpfAtual.valido) {
        btn.disabled = false;
        btn.classList.remove("btn-soft-disabled");
    } else {
        btn.disabled = true;
        btn.classList.add("btn-soft-disabled");
    }
}
async function enviarArquivosResgate() {
    const cpf = document.getElementById('id-estudante').value.trim();
    const cpfValidado = validarCPFMaestro(cpf);
    if (!cpfValidado.valido) {
        marcarCampoInvalidoMaestro("id-estudante", cpfValidado.erro, "resgate-feedback");
        mostrarFeedbackPersistenteMaestro("resgate-feedback", "CPF necessario", "Consulte um CPF valido antes de enviar documentos de resgate.", "error");
        showToast(cpfValidado.erro, "error");
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
            cpf: cpfValidado.cpf,
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
