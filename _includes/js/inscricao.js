// ========================================================================
// 9. MÓDULO SMART STEPPER — INSCRIÇÃO NATIVA (V10.1)
// ========================================================================

const STEPPER_LABELS = {
    1: 'Triagem',
    2: 'Rota Acadêmica',
    3: 'Condicionais',
    4: 'Documentos e revisao'
};

let inscricaoArquivos = {};
let inscricaoFotoBase64 = null;
let cameraStream = null;

function atualizarFeedbackCPFInscricao(estado, mensagem) {
    const feedbackBox = document.getElementById('cpf-feedback-box');
    if (!feedbackBox) return false;
    feedbackBox.classList.remove('feedback-error', 'feedback-success', 'feedback-info', 'hidden');
    feedbackBox.classList.add(`feedback-${estado}`);
    feedbackBox.setAttribute("role", estado === "error" ? "alert" : "status");
    feedbackBox.setAttribute("aria-live", estado === "error" ? "assertive" : "polite");
    feedbackBox.textContent = typeof safeMessageMaestro === "function" ? safeMessageMaestro(mensagem, "") : String(mensagem || "");
    return true;
}

function atualizarStatusArquivoInscricao(statusSpan, texto, estado = "idle") {
    if (!statusSpan) return;
    statusSpan.innerText = texto;
    statusSpan.classList.remove('is-success', 'is-error', 'is-idle');
    statusSpan.classList.add(`is-${estado}`);
}

function estagioInscricaoVisivelMaestro() {
    return typeof window.maestroEstagioVisivel === "function" ? window.maestroEstagioVisivel() : true;
}

// ----- Wrapper de Inicialização -----
function abrirNovaInscricao() {
    switchView('view-inscricao');
    if (typeof aplicarPoliticaEstagioMaestro === "function") aplicarPoliticaEstagioMaestro();
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
        const estagioVisivel = estagioInscricaoVisivelMaestro();
        if (!getRadioValue('insc-23h') || (estagioVisivel && !getRadioValue('insc-estagio')) || !getRadioValue('insc-pcd') || !getRadioValue('insc-menor') || !getRadioValue('insc-criancas')) { 
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
        if (estagioVisivel && condEstagio && condEstagio.classList.contains('cond-visible')) {
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
                atualizarFeedbackCPFInscricao("error", "Atencao: " + mensagemDuplicidade);
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

            if (estagioInscricaoVisivelMaestro() && d.estagio === 'Sim') {
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
                feedbackBox.innerHTML = '<span data-maestro-icon-slot="check" aria-hidden="true"></span> Inscrição anterior encontrada! Os seus dados foram importados. Verifique-os na próxima etapa.';
                if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(feedbackBox);
                feedbackBox.classList.remove('hidden');
            }
            triggerVibration(50);
            setTimeout(() => { stepperNext(1, 2); }, 2000);
        } else {
            const feedbackBox = document.getElementById('cpf-feedback-box');
            if (feedbackBox) {
                feedbackBox.classList.remove('feedback-error', 'feedback-success');
                feedbackBox.classList.add('feedback-info');
                feedbackBox.innerHTML = '<span data-maestro-icon-slot="sparkles" aria-hidden="true"></span> Novo Cadastro! Prossiga para preencher os seus dados.';
                if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(feedbackBox);
                feedbackBox.classList.remove('hidden');
            }
            triggerVibration(50);
            setTimeout(() => { stepperNext(1, 2); }, 1500);
        }

    } catch (err) {
        if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro na verificacao de CPF.", err);
        else console.error("Erro na verificacao de CPF.");
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
        labelUpload.innerHTML = '<span data-maestro-icon-slot="paperclip" aria-hidden="true"></span> Toque para selecionar o arquivo';
        if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(labelUpload);
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
            statusSpan.textContent = file.name;
            statusSpan.classList.remove('is-error', 'is-idle');
            statusSpan.classList.add('is-success');
        }
        if (labelUpload) {
            labelUpload.classList.add('file-attached');
            labelUpload.innerHTML = '<span data-maestro-icon-slot="check" aria-hidden="true"></span> Arquivo anexado';
            if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(labelUpload);
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
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Falha ao iniciar camera.", err);
        else console.warn("Falha ao iniciar camera.");
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
                if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "[Inscricao] Falha ao encerrar faixa da camera.", err);
                else console.warn("[Inscricao] Falha ao encerrar faixa da camera.");
            }
        });
        cameraStream = null;
        if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") logMaestroSafe("debug", "[Inscricao] Camera fechada por seguranca.");
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

    const estagioVisivel = estagioInscricaoVisivelMaestro();
    const estagio = estagioVisivel ? getRadioSimNao('insc-estagio') : 'Não';
    const tipoVinculoEstagio = estagio === 'Sim' ? getValorCampoInscricao('insc-tipo-vinculo-estagio') : "";
    const inicioEstagio = estagio === 'Sim' ? getValorCampoInscricao('insc-inicio-estagio') : "";
    const fimEstagio = estagio === 'Sim' ? getValorCampoInscricao('insc-fim-estagio') : "";
    const empresaInstituicaoEstagio = estagio === 'Sim' ? getValorCampoInscricao('insc-empresa-estagio') : "";
    const paradaEstagio = estagio === 'Sim' ? getValorCampoInscricao('insc-parada-estagio') : "";
    const turnoEstagio = estagio === 'Sim' ? getValorCampoInscricao('insc-turno-estagio') : "";

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
    if (!estagioVisivel) delete arquivosPayload.estagio;
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
        declaracaoVinculoEstagio: estagio === 'Sim' && inscricaoArquivos.estagio ? {
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

    // Feedback visual.
    btn.textContent = "A ENVIAR...";
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
                btn.innerHTML = '<span data-maestro-icon-slot="upload" aria-hidden="true"></span> SUBMETER INSCRIÇÃO';
                if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(btn);
                btn.disabled = false;
            }
        })
        .catch(err => {
            if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro de rede na inscricao.", err);
            else console.error("Erro de rede na inscricao.");
            showToast("Falha de conexão. Verifique a internet e tente novamente.", "error");
            btn.innerHTML = '<span data-maestro-icon-slot="upload" aria-hidden="true"></span> SUBMETER INSCRIÇÃO';
            if (typeof decorateMaestroIcons === "function") decorateMaestroIcons(btn);
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
    if (typeof aplicarPoliticaEstagioMaestro === "function") aplicarPoliticaEstagioMaestro();

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
function obterStorageInscricaoMaestro() {
    return window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;
}

function obterTtlListasInscricaoMaestro() {
    const storage = obterStorageInscricaoMaestro();
    return storage && typeof storage.getDomainTtlMs === "function"
        ? storage.getDomainTtlMs("lists")
        : 1000 * 60 * 60;
}

function obterCacheListasInscricaoMaestro(permitirExpirado) {
    const storage = obterStorageInscricaoMaestro();
    if (!storage || typeof storage.getDomainCache !== "function") return null;
    const cache = storage.getDomainCache("lists", {
        key: "MAESTRO_LISTS_CACHE_INSCRICAO",
        allowExpired: permitirExpirado === true
    });
    return cache && cache.hit && cache.data ? cache : null;
}

function salvarCacheListasInscricaoMaestro(res) {
    const storage = obterStorageInscricaoMaestro();
    if (!storage || typeof storage.setDomainCache !== "function" || !res || res.sucesso === false) return;
    storage.setDomainCache("lists", {
        instituicoes: res.instituicoes || [],
        rotas: res.rotas || [],
        bairros: res.bairros || [],
        linkDeclaracaoMenor: res.linkDeclaracaoMenor || "",
        atualizadoEm: new Date().toISOString()
    }, {
        key: "MAESTRO_LISTS_CACHE_INSCRICAO",
        source: "getListsInscricao",
        ttlMs: obterTtlListasInscricaoMaestro()
    });
}

function aplicarListasInscricaoMaestro(res) {
    if (!res) return false;
        _popularSelect('insc-instituicao', res.instituicoes || [], 'Outra (NÃ£o listada)');
    _popularSelect('insc-rota', res.rotas || [], 'Outra (NÃ£o listada)');
    _popularSelect('insc-bairro-23h', res.bairros || [], 'Outro');

    if (res.linkDeclaracaoMenor) {
        const linkMenor = document.getElementById('link-declaracao-menor');
        if (linkMenor) linkMenor.href = res.linkDeclaracaoMenor;
    }
    return true;
}

async function carregarListasInscricao() {
    const cacheInicial = obterCacheListasInscricaoMaestro(typeof navigator !== "undefined" && navigator.onLine === false);
    if (cacheInicial) {
        aplicarListasInscricaoMaestro(cacheInicial.data);
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    }

    try {
        const res = await apiCall("getListsInscricao");
        if (!res || !res.sucesso) {
            const cacheFallback = obterCacheListasInscricaoMaestro(true);
            if (cacheFallback && aplicarListasInscricaoMaestro(cacheFallback.data)) return;
            if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "[LISTAS] Falha ao carregar listas dinamicas.", res ? res.erro : "sem resposta");
            else console.warn("[LISTAS] Falha ao carregar listas dinamicas.");
            return;
        }

        salvarCacheListasInscricaoMaestro(res);
        _popularSelect('insc-instituicao', res.instituicoes || [], 'Outra (Não listada)');
        _popularSelect('insc-rota', res.rotas || [], 'Outra (Não listada)');
        _popularSelect('insc-bairro-23h', res.bairros || [], 'Outro');

        if (res.linkDeclaracaoMenor) {
            const linkMenor = document.getElementById('link-declaracao-menor');
            if (linkMenor) linkMenor.href = res.linkDeclaracaoMenor;
        }

    } catch (err) {
        const cacheFallback = obterCacheListasInscricaoMaestro(true);
        if (cacheFallback && aplicarListasInscricaoMaestro(cacheFallback.data)) return;
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "[LISTAS] Erro de rede ao carregar listas.", err);
        else console.warn("[LISTAS] Erro de rede ao carregar listas.");
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
