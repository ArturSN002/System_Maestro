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
        box.style.display = "none";
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
        ${cicloTexto ? `<div style="grid-column: span 2;"><span>Ciclo</span><strong>${escapeHTMLAuditoria(cicloTexto)}</strong></div>` : ""}
    `;
    box.style.display = "block";
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

    container.innerHTML = '<div class="loading-state-box"><div class="loader"></div><p>A puxar a fila de trabalho...</p></div>';

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
                <div class="error-state-box">
                    <span class="error-icon">⚠️</span>
                    <h3>Erro ao Carregar Fila</h3>
                    <p>${escapeHTMLAuditoria(res.erro)}</p>
                    ${res.detalhes ? `<small>${escapeHTMLAuditoria(res.detalhes)}</small>` : ""}
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `
            <div class="error-state-box">
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
        container.innerHTML = `<div class="empty-state-box"><h3>🎉 Fila Vazia!</h3><p>Todos os pedidos foram atendidos ou não há resultados.</p></div>`;
        return;
    }

    // Matemática da Paginação
    const totalPaginas = Math.ceil(arrayAlunosAuditoriaFiltrado.length / ITENS_POR_PAGINA);
    const inicio = (paginaAtualAuditoria - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const itensPagina = arrayAlunosAuditoriaFiltrado.slice(inicio, fim);

    let html = `
        <div class="auditoria-table-wrapper">
            <table class="auditoria-table">
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
        <tr class="auditoria-row">
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
                <span class="auditoria-badge ${badgeClass}">${statusAuditoria}</span>
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
        <div class="auditoria-paginacao">
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
                contentBox.innerHTML = `<img src="${fullBase64}" class="zoom-hover" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
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
        <div style="text-align: center; margin-bottom: 20px;">
           <button class="btn-solid" style="background: var(--primary); display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: auto; padding: 10px 20px;" onclick="abrirModalMural()">
              <span style="font-size: 16px;">📝</span> Criar Nova Publicação
           </button>
        </div>`;
    } else {
        btnNovoPostHTML = `<div style="text-align: center; margin-bottom: 20px; font-size: 11px; color: var(--text-sub);">Apenas estudantes logados na Carteira Digital podem publicar ou votar.</div>`;
    }

    container.innerHTML = `${btnNovoPostHTML}<div class="loader" style="margin: 0 auto;"></div><p style="text-align: center; font-size: 12px; margin-top: 10px;">A carregar a voz da comunidade...</p>`;

    try {
        const res = await apiCall("getMuralDaSemana");
        const adapterMural = adapterComunicacaoMaestro("muralFeed");
        const muralNormalizado = adapterMural ? adapterMural(res, currentWalletId) : res;
        const mensagensMural = (muralNormalizado && muralNormalizado.mensagens) || [];
        const limiteSemanal = limitePostagensMuralMaestro(muralNormalizado);
        if (!muralNormalizado.sucesso) { container.innerHTML = `${btnNovoPostHTML}<div class="error-box">${escapeHTMLAuditoria(muralNormalizado.erro)}</div>`; return; }
        if (!mensagensMural.length) {
            container.innerHTML = `${btnNovoPostHTML}<div class="text-center" style="padding: 30px 10px; color: var(--text-sub); border: 1px dashed var(--border); border-radius: 8px;">Ainda não há contribuições nos últimos 7 dias.<br><br><b>Seja o primeiro a partilhar uma ideia!</b></div>`;
            return;
        }

        let html = btnNovoPostHTML + `<div style="text-align: center; margin: -8px 0 16px; font-size: 11px; color: var(--text-sub);">Limite: ${limiteSemanal} publicacoes por estudante a cada semana.</div>`;
        mensagensMural.forEach((msg, index) => {
            const upsInfo = Array.isArray(msg.arrayUpsInfo) ? msg.arrayUpsInfo : [];
            const downsInfo = Array.isArray(msg.arrayDownsInfo) ? msg.arrayDownsInfo : [];
            const upAtivo = currentWalletId && (msg.meuVoto === "up" || upsInfo.includes(currentWalletId)) ? 'color: var(--primary); font-weight: bold;' : 'color: #999;';
            const downAtivo = currentWalletId && (msg.meuVoto === "down" || downsInfo.includes(currentWalletId)) ? 'color: var(--danger); font-weight: bold;' : 'color: #999;';
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
            <div class="form-card" style="padding: 15px; margin-bottom: 15px; border-left: 4px solid var(--primary); border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: left;">
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <div>
                     <span style="font-size: 10px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; color: var(--text-sub);">${iconCat} ${msg.categoria}</span>
                     ${coroa ? `<span style="font-size: 10px; background: #fef08a; padding: 2px 6px; border-radius: 4px; color: #854d0e; font-weight: bold; margin-left: 5px;">${coroa}</span>` : ''}
                  </div>
                  <span style="font-size: 10px; color: var(--text-sub);">${tempoCorrigido}</span>
               </div>
               <p style="font-size: 13px; color: #333; line-height: 1.5; margin-bottom: 12px; word-wrap: break-word;">"${msg.mensagem}"</p>
               <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 10px;">
                  <span style="font-size: 11px; color: var(--text-sub); font-weight: 500;">👤 Por: ${msg.autor}</span>
                  <div style="display: flex; gap: 15px; align-items: center;">
                     <button onclick="votarNoMural('${msg.id}', 'UP')" style="background: none; border: none; font-size: 16px; cursor: pointer; ${upAtivo} transition: transform 0.1s;">👍 <span id="count-up-${msg.id}" style="font-size: 12px;">${msg.votosUp}</span></button>
                     <button onclick="votarNoMural('${msg.id}', 'DOWN')" style="background: none; border: none; font-size: 16px; cursor: pointer; ${downAtivo} transition: transform 0.1s;">👎 <span id="count-down-${msg.id}" style="font-size: 12px;">${msg.votosDown}</span></button>
                  </div>
               </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="error-box">Erro ao comunicar com o servidor do Mural: ${escapeHTMLAuditoria(e.message)}</div>`;
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

    if (btnUp) { btnUp.style.pointerEvents = 'none'; btnUp.style.opacity = '0.5'; }
    if (btnDown) { btnDown.style.pointerEvents = 'none'; btnDown.style.opacity = '0.5'; }

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
            if (btnUp) { btnUp.style.pointerEvents = 'auto'; btnUp.style.opacity = '1'; }
            if (btnDown) { btnDown.style.pointerEvents = 'auto'; btnDown.style.opacity = '1'; }
        }
    } catch (e) {
        showToast("Erro ao processar o voto: " + e.message, "error");
        if (btnUp) { btnUp.style.pointerEvents = 'auto'; btnUp.style.opacity = '1'; }
        if (btnDown) { btnDown.style.pointerEvents = 'auto'; btnDown.style.opacity = '1'; }
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
        container.innerHTML = '<div class="loader" style="margin: 0 auto;"></div>';
    });

    const dbRequest = indexedDB.open('MaestroDB', 1);
    dbRequest.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('notificacoes')) {
            containers.forEach(container => {
                container.innerHTML = '<div style="text-align: center; padding: 30px; background: #fff; border: 1px dashed #ccc; border-radius: 8px;"><p style="font-size: 12px; color: #666;">Caixa de entrada vazia.</p></div>';
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
                    container.innerHTML = '<div style="text-align: center; padding: 30px; background: #fff; border: 1px dashed #ccc; border-radius: 8px;"><p style="font-size: 12px; color: #666;">Caixa de entrada vazia.</p></div>';
                });
                return;
            }

            let html = '';
            notificacoes.forEach(n => {
                const tempo = calcularTempoRelativo(n.timestamp);
                html += `
                <div class="form-card" style="padding: 15px; margin-bottom: 10px; border-left: 4px solid var(--primary); display: flex; gap: 10px; align-items: flex-start; text-align: left;">
                    <img src="${n.icon || './icone.png'}" style="width: 40px; height: 40px; border-radius: 8px;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 13px; color: var(--primary);">${n.title}</strong>
                            <span style="font-size: 10px; color: var(--text-sub);">${tempo}</span>
                        </div>
                        <p style="font-size: 12px; margin: 0; color: #333; line-height: 1.4;">${n.body}</p>
                        ${(n.link && n.link !== '/') ? `<a href="${n.link}" target="_blank" style="font-size: 11px; display: inline-block; margin-top: 5px; color: var(--accent); font-weight: bold;">Ver Detalhes ➡</a>` : ''}
                    </div>
                </div>`;
            });
            containers.forEach(container => {
                container.innerHTML = html;
            });

            // Remove o red dot após abrir a inbox
            document.querySelectorAll('.badge-notificacao').forEach(badge => {
                badge.textContent = '';
                badge.style.display = 'none';
            });
        };
    };
    dbRequest.onerror = () => {
        containers.forEach(container => {
            container.innerHTML = '<div class="error-box">Erro ao carregar notificações locais.</div>';
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
                badge.style.display = 'none';
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
                            badge.style.display = 'inline-flex';
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
    document.getElementById("view-painel-motorista").style.display = "none";
    document.getElementById("painel-viagem-ativa").style.display = "flex";
}

async function uiFinalizarRota() {
    if (confirm("Tem a certeza que deseja finalizar a rota? O rastreio será interrompido e os alunos notificados.")) {

        // 1. Chama a função central
        await btnFinalizarRotaMotorista(veiculoConducaoAtual);

        // 2. Restaura a UI normal
        document.getElementById("painel-viagem-ativa").style.display = "none";
        document.getElementById("view-painel-motorista").style.display = "block";

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
