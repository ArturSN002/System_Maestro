// ========================================================================
// 4. MESA DE AUDITORIA & GESTÃO DOCUMENTAL
// ========================================================================

let arrayAlunosAuditoria = [];
let arrayAlunosAuditoriaFiltrado = [];
let paginaAtualAuditoria = 1;     // NOVO: Guarda a página atual
const ITENS_POR_PAGINA = 10;      // NOVO: Exibe 10 alunos por bloco
const AUDITORIA_FILTER_STORAGE_KEY = "MAESTRO_AUDITORIA_FILTROS_V1";
let auditoriaRaioXSelecionado = null;

let metaAuditoriaMaestro = {
    totalBackend: 0,
    limite: 0,
    truncado: false,
    semestreId: ""
};

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

function obterContextoOperacaoMaestro() {
    const contexts = window.MaestroData && window.MaestroData.contexts ? window.MaestroData.contexts : {};
    const tenant = contexts.tenant && typeof contexts.tenant.get === "function" ? contexts.tenant.get() : {};
    const semester = contexts.semester && typeof contexts.semester.get === "function" ? contexts.semester.get() : {};
    const operator = contexts.operator && typeof contexts.operator.get === "function" ? contexts.operator.get() : {};

    return {
        tenantId: primeiroValorAuditoria(
            tenant.tenantId,
            tenant.tenantID,
            tenant.tenant_id,
            localStorage.getItem("MAESTRO_TENANT_ID")
        ),
        semestreId: primeiroValorAuditoria(
            semester.semestreId,
            semester.semestreAtual,
            semester.activeSemesterId,
            localStorage.getItem("MAESTRO_SEMESTRE_ID")
        ),
        usuarioLogadoId: primeiroValorAuditoria(
            operator.email,
            operator.identificador,
            localStorage.getItem("MAESTRO_OPERADOR_EMAIL"),
            localStorage.getItem("MAESTRO_OPERADOR_NOME")
        )
    };
}

function obterFiltrosAuditoriaUI() {
    return {
        pesquisa: document.getElementById('auditoria-pesquisa')?.value || "",
        status: document.getElementById('auditoria-status')?.value || "",
        instituicao: document.getElementById('auditoria-instituicao')?.value || "",
        turno: document.getElementById('auditoria-turno')?.value || ""
    };
}

function salvarFiltrosAuditoriaPersistentes() {
    try {
        localStorage.setItem(AUDITORIA_FILTER_STORAGE_KEY, JSON.stringify(obterFiltrosAuditoriaUI()));
    } catch (error) { }
}

function restaurarFiltrosAuditoriaPersistentes() {
    let filtros = {};
    try {
        filtros = JSON.parse(localStorage.getItem(AUDITORIA_FILTER_STORAGE_KEY) || "{}");
    } catch (error) {
        filtros = {};
    }

    const mapa = {
        "auditoria-pesquisa": filtros.pesquisa,
        "auditoria-status": filtros.status,
        "auditoria-instituicao": filtros.instituicao,
        "auditoria-turno": filtros.turno
    };

    Object.keys(mapa).forEach(id => {
        const el = document.getElementById(id);
        if (!el || mapa[id] === undefined || mapa[id] === null) return;
        el.value = String(mapa[id] || "");
    });
}

function limparFiltrosAuditoria() {
    ["auditoria-pesquisa", "auditoria-status", "auditoria-instituicao", "auditoria-turno"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    salvarFiltrosAuditoriaPersistentes();
    aplicarFiltrosAuditoria();
}

function atualizarContextoAuditoriaVisualMaestro() {
    const contexto = obterContextoOperacaoMaestro();
    const chip = document.getElementById("auditoria-contexto-semestre");
    if (!chip) return;
    const semestreTexto = metaAuditoriaMaestro.semestreId || contexto.semestreId || "nao definido";
    chip.textContent = "Semestre: " + semestreTexto;
    chip.classList.toggle("admin-context-chip-warning", !metaAuditoriaMaestro.semestreId && !contexto.semestreId);
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

function normalizarTextoFiltroAuditoria(valor) {
    const texto = String(valor || "").toLowerCase().trim();
    try {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (e) {
        return texto;
    }
}

function statusEquivalentesAuditoria(status) {
    const valor = String(status || "").toUpperCase().trim();
    if (!valor) return [];
    if (valor === "ATIVO") return ["ATIVO", "OK", "APROVADO", "APROVADO_IA", "APROVADO_MANUAL"];
    if (valor === "PENDENTE") return ["PENDENTE", "AGUARDANDO", "EM_ANALISE"];
    if (valor === "ANALISE_HUMANA") return ["ANALISE_HUMANA", "PENDENCIA", "RETIDO", "ERRO", "FALHA_ANEXO", "ALERTA_FRAUDE"];
    if (valor === "CANCELADO") return ["CANCELADO", "SUSPENSO", "INATIVO"];
    return [valor];
}

function valoresStatusAlunoAuditoria(aluno) {
    return [
        aluno.statusAuditoria,
        aluno.statusValidacao,
        aluno.STATUS_VALIDACAO,
        aluno.statusAtividade,
        aluno.STATUS_ATIVIDADE,
        aluno.statusDocs,
        aluno.STATUS_DOCS,
        aluno.statusOCR,
        aluno.STATUS_OCR
    ].map(valor => String(valor || "").toUpperCase().trim()).filter(Boolean);
}

function alunoTemStatusAuditoria(aluno, statusBase) {
    const equivalentes = statusEquivalentesAuditoria(statusBase);
    const statusAluno = valoresStatusAlunoAuditoria(aluno);
    return statusAluno.some(valor => equivalentes.includes(valor));
}

function calcularKpisAuditoria(lista) {
    const origem = Array.isArray(lista) ? lista : [];
    return origem.reduce((acc, aluno) => {
        acc.total += 1;
        if (alunoTemStatusAuditoria(aluno, "PENDENTE")) acc.pendentes += 1;
        if (alunoTemStatusAuditoria(aluno, "ANALISE_HUMANA")) acc.retidos += 1;
        if (alunoTemStatusAuditoria(aluno, "ATIVO")) acc.ativos += 1;
        if (aluno.estagio && (aluno.estagio.ativo || aluno.estagio.tipoVinculo || aluno.estagio.statusValidacao)) acc.estagios += 1;
        return acc;
    }, {
        total: 0,
        pendentes: 0,
        retidos: 0,
        ativos: 0,
        estagios: 0
    });
}

function atualizarKpisAuditoriaMaestro() {
    const kpisTotal = calcularKpisAuditoria(arrayAlunosAuditoria);
    const kpisFiltrado = calcularKpisAuditoria(arrayAlunosAuditoriaFiltrado);
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    };

    setText("auditoria-kpi-total", kpisTotal.total);
    setText("auditoria-kpi-filtrados", kpisFiltrado.total);
    setText("auditoria-kpi-pendentes", kpisFiltrado.pendentes);
    setText("auditoria-kpi-retidos", kpisFiltrado.retidos);
}

function resumoCurtoAlunoAuditoria(aluno) {
    return [
        aluno.instituicao || aluno.INSTITUICAO_ALUNO || "",
        aluno.turno || aluno.TURNOS_ALUNO || "",
        aluno.rota || aluno.ROTA_ALUNO || ""
    ].filter(Boolean).join(" - ");
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

function renderizarRaioXLateralAuditoria(aluno) {
    const empty = document.getElementById("auditoria-raio-x-empty");
    const content = document.getElementById("auditoria-raio-x-content");
    if (!empty || !content) return;

    if (!aluno) {
        empty.classList.remove("hidden");
        content.classList.add("hidden");
        content.innerHTML = "";
        return;
    }

    const cpfAluno = cpfSeguroAuditoria(aluno.cpf || aluno.CPF_ALUNO);
    const semestreId = String(aluno.semestreId || aluno.semestreAtual || aluno.semestre || "");
    const nome = formatarNomeProprio(aluno.nome || aluno.NOME_ALUNO);
    const status = String(aluno.statusAuditoria || aluno.STATUS_VALIDACAO || aluno.statusAtividade || "PENDENTE").toUpperCase();
    const estagio = aluno.estagio || {};
    const temEstagio = estagio.ativo || estagio.tipoVinculo || estagio.statusValidacao || estagio.empresaInstituicao;
    const estagioResumo = temEstagio
        ? [
            primeiroValorAuditoria(estagio.tipoVinculo, "Vinculo informado"),
            primeiroValorAuditoria(estagio.statusValidacao, "PENDENTE")
        ].filter(Boolean).join(" | ")
        : "Sem dados de estagio";

    auditoriaRaioXSelecionado = { cpf: cpfAluno, semestreId: semestreId };
    empty.classList.add("hidden");
    content.classList.remove("hidden");
    content.innerHTML = `
        <div class="admin-audit-side-header">
            <span class="admin-panel-eyebrow">Raio-X lateral</span>
            <h3>${escapeHTMLAuditoria(nome)}</h3>
            <span class="auditoria-badge dynamic-status-badge">${escapeHTMLAuditoria(status)}</span>
        </div>
        <div class="admin-audit-side-grid">
            <div><span>CPF</span><strong>${escapeHTMLAuditoria(cpfAluno || "-")}</strong></div>
            <div><span>Semestre</span><strong>${escapeHTMLAuditoria(semestreId || "-")}</strong></div>
            <div><span>Matricula</span><strong>${escapeHTMLAuditoria(aluno.matricula || aluno.MATRICULA_ALUNO || "-")}</strong></div>
            <div><span>Email</span><strong>${escapeHTMLAuditoria(aluno.email || aluno.EMAIL_ALUNO || "-")}</strong></div>
            <div class="admin-audit-side-span"><span>Logistica</span><strong>${escapeHTMLAuditoria(resumoCurtoAlunoAuditoria(aluno) || "-")}</strong></div>
        </div>
        <div class="admin-audit-side-stage ${temEstagio ? "" : "is-muted"}">
            <span>Estagio</span>
            <strong>${escapeHTMLAuditoria(estagioResumo)}</strong>
            ${temEstagio && estagio.empresaInstituicao ? `<small>${escapeHTMLAuditoria(estagio.empresaInstituicao)}</small>` : ""}
        </div>
        <div class="admin-audit-side-actions">
            <button class="btn-solid" data-cpf="${escapeHTMLAuditoria(cpfAluno)}" data-semestre-id="${escapeHTMLAuditoria(semestreId)}" onclick="abrirModalRaioX(this.dataset.cpf, this.dataset.semestreId)">Abrir parecer completo</button>
            <button class="btn-text" data-cpf="${escapeHTMLAuditoria(cpfAluno)}" data-semestre-id="${escapeHTMLAuditoria(semestreId)}" onclick="abrirDocumentoSeguro(this.dataset.cpf, 'DOCUMENTO', this.dataset.semestreId)">Ver documento</button>
        </div>
    `;
}

function marcarLinhaSelecionadaAuditoria(cpf, semestreId) {
    const cpfLimpo = cpfSeguroAuditoria(cpf);
    const semestreSeguro = String(semestreId || "");
    document.querySelectorAll(".auditoria-row").forEach(row => {
        const match = cpfSeguroAuditoria(row.dataset.cpf || "") === cpfLimpo &&
            (!semestreSeguro || String(row.dataset.semestreId || "") === semestreSeguro);
        row.classList.toggle("auditoria-row-selected", match);
    });
}

function selecionarAlunoAuditoria(cpf, semestreId = "") {
    const aluno = buscarAlunoAuditoria(cpf, semestreId);
    if (!aluno) return;
    const cpfAluno = cpfSeguroAuditoria(aluno.cpf || aluno.CPF_ALUNO);
    const semestreAluno = String(aluno.semestreId || aluno.semestreAtual || aluno.semestre || semestreId || "");
    renderizarRaioXLateralAuditoria(aluno);
    marcarLinhaSelecionadaAuditoria(cpfAluno, semestreAluno);

    if (window.matchMedia && window.matchMedia("(max-width: 1023px)").matches) {
        abrirModalRaioX(cpfAluno, semestreAluno);
    }
}

function sincronizarRaioXLateralAuditoria() {
    const selecionado = auditoriaRaioXSelecionado || {};
    let aluno = selecionado.cpf ? buscarAlunoAuditoria(selecionado.cpf, selecionado.semestreId) : null;
    if (aluno && !arrayAlunosAuditoriaFiltrado.some(item => cpfSeguroAuditoria(item.cpf || item.CPF_ALUNO) === cpfSeguroAuditoria(aluno.cpf || aluno.CPF_ALUNO))) {
        aluno = null;
    }
    if (!aluno) aluno = arrayAlunosAuditoriaFiltrado[0] || null;
    renderizarRaioXLateralAuditoria(aluno);
    if (aluno) marcarLinhaSelecionadaAuditoria(aluno.cpf || aluno.CPF_ALUNO, aluno.semestreId || aluno.semestreAtual || "");
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

    restaurarFiltrosAuditoriaPersistentes();
    atualizarContextoAuditoriaVisualMaestro();
    switchView('view-auditoria');
    carregarFilaAuditoria();
}

function renderEstadoOperacaoMaestro(tipo, opcoes) {
    if (typeof renderAsyncStateMaestro === "function") return renderAsyncStateMaestro(tipo, opcoes || {});
    const mensagem = escapeHTMLAuditoria((opcoes && (opcoes.message || opcoes.title)) || "");
    const classe = tipo === "error" ? "dynamic-error-state" : tipo === "empty" ? "dynamic-empty-state" : "dynamic-loading-state";
    const loader = tipo === "loading" ? '<div class="loader loader-center"></div>' : "";
    return `<div class="dynamic-state-box ${classe}">${loader}<p>${mensagem}</p></div>`;
}

function obterStorageOperacaoMaestro() {
    return window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;
}

function obterTtlOperacaoMaestro(domain, fallback) {
    const storage = obterStorageOperacaoMaestro();
    return storage && typeof storage.getDomainTtlMs === "function"
        ? storage.getDomainTtlMs(domain)
        : fallback;
}

function obterCacheAuditoriaMaestro(semestreId, permitirExpirado, tenantId) {
    const storage = obterStorageOperacaoMaestro();
    if (!storage || typeof storage.getDomainCache !== "function") return null;
    const cache = storage.getDomainCache("audit", {
        tenantId: tenantId || "",
        semestreId: semestreId || "",
        allowExpired: permitirExpirado === true
    });
    return cache && cache.hit && cache.data && Array.isArray(cache.data.lista) ? cache : null;
}

function salvarCacheAuditoriaMaestro(lista, semestreId, tenantId, meta) {
    const storage = obterStorageOperacaoMaestro();
    if (!storage || typeof storage.setDomainCache !== "function" || !Array.isArray(lista)) return;
    storage.setDomainCache("audit", {
        lista: lista,
        meta: meta || {},
        atualizadoEm: new Date().toISOString()
    }, {
        tenantId: tenantId || "",
        semestreId: semestreId || "",
        source: "getListaAuditoria",
        ttlMs: obterTtlOperacaoMaestro("audit", 1000 * 60 * 5)
    });
}

function renderizarAuditoriaDoCacheMaestro(cache) {
    if (!cache || !cache.data || !Array.isArray(cache.data.lista)) return false;
    arrayAlunosAuditoria = cache.data.lista.map(normalizarAlunoAuditoria);
    metaAuditoriaMaestro = Object.assign({}, cache.data.meta || {}, {
        totalBackend: (cache.data.meta && cache.data.meta.totalBackend) || arrayAlunosAuditoria.length,
        limite: (cache.data.meta && cache.data.meta.limite) || arrayAlunosAuditoria.length
    });
    atualizarOpcoesFiltrosAuditoria();
    atualizarContextoAuditoriaVisualMaestro();
    aplicarFiltrosAuditoria();
    if ((cache.stale || cache.expired) && typeof showToast === "function") {
        showToast("Fila de auditoria exibida do cache local.", "warning");
    }
    return true;
}

function atualizarOpcoesSelectAuditoria(selectId, valores, rotuloTodos) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const valorAtual = select.value;
    const unicos = Array.from(new Set((valores || []).map(valor => String(valor || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    const opcoes = [`<option value="">${escapeHTMLAuditoria(rotuloTodos)}</option>`].concat(
        unicos.map(valor => `<option value="${escapeHTMLAuditoria(valor)}">${escapeHTMLAuditoria(valor)}</option>`)
    );
    select.innerHTML = opcoes.join("");
    if (valorAtual && unicos.includes(valorAtual)) select.value = valorAtual;
}

function atualizarOpcoesFiltrosAuditoria() {
    const instituicoes = [];
    const turnos = [];
    const status = ["ATIVO", "PENDENTE", "ANALISE_HUMANA", "CANCELADO"];

    arrayAlunosAuditoria.forEach(aluno => {
        instituicoes.push(aluno.instituicao || aluno.INSTITUICAO_ALUNO || "");
        toArrayAuditoria(aluno.turnos).forEach(turno => turnos.push(turno));
        toArrayAuditoria(aluno.turno || aluno.TURNOS_ALUNO).forEach(turno => turnos.push(turno));
        valoresStatusAlunoAuditoria(aluno).forEach(valor => status.push(valor));
    });

    atualizarOpcoesSelectAuditoria("auditoria-status", status, "Status (Todos)");
    atualizarOpcoesSelectAuditoria("auditoria-instituicao", instituicoes, "Instituicao (Todas)");
    atualizarOpcoesSelectAuditoria("auditoria-turno", turnos, "Turno (Todos)");
}

function atualizarResumoAuditoriaMaestro() {
    const resumo = document.getElementById("auditoria-status-resumo");
    const totalCarregado = arrayAlunosAuditoria.length;
    const totalFiltrado = arrayAlunosAuditoriaFiltrado.length;
    const totalBackend = Number(metaAuditoriaMaestro.totalBackend || 0);
    const partes = [`${totalFiltrado} de ${totalCarregado} estudantes exibidos`];
    if (metaAuditoriaMaestro.semestreId) partes.push(`semestre ${metaAuditoriaMaestro.semestreId}`);
    if (totalBackend && totalBackend > totalCarregado) partes.push(`backend informou ${totalBackend}`);
    if (metaAuditoriaMaestro.truncado) partes.push("lista truncada pelo limite da API");
    if (resumo) resumo.textContent = partes.join(" | ");
    atualizarKpisAuditoriaMaestro();
    atualizarContextoAuditoriaVisualMaestro();
}

function renderizarErroAuditoriaMaestro(resposta, fallbackTitulo) {
    const erro = resposta || {};
    const codigo = String(erro.codigo || "");
    let titulo = fallbackTitulo || "Erro ao carregar fila";
    let mensagem = erro.erro || erro.message || "Nao foi possivel carregar a Mesa de Auditoria.";
    let detalhes = erro.detalhes || "";

    if (codigo === "FIRESTORE_INDEX_REQUIRED") {
        titulo = "Indice Firestore ausente";
        mensagem = "A consulta da Mesa de Auditoria precisa de um indice composto no Firestore.";
    } else if (codigo === "API_TIMEOUT" || erro.status === 408) {
        titulo = "Tempo limite excedido";
        mensagem = "A Mesa de Auditoria demorou demais para responder. Verifique indices Firestore e execucao do GAS.";
    } else if (codigo === "GAS_DEPLOY_DESATUALIZADO") {
        titulo = "Backend desatualizado";
    }

    return `
        <div class="error-state-box dynamic-state-box dynamic-error-state">
            <span class="error-icon" aria-hidden="true">!</span>
            <h3>${escapeHTMLAuditoria(titulo)}</h3>
            <p>${escapeHTMLAuditoria(mensagem)}</p>
            ${detalhes ? `<small>${escapeHTMLAuditoria(detalhes)}</small>` : ""}
            <button class="btn-solid btn-auditoria-retry" onclick="carregarFilaAuditoria()">Tentar novamente</button>
        </div>
    `;
}

async function carregarFilaAuditoria(ehPesquisa = false) {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;

    const container = document.getElementById('auditoria-fila-container');
    if (!container) return;

    // Sempre que carregar a lista ou pesquisar, volta à página 1
    paginaAtualAuditoria = 1;

    const contexto = obterContextoOperacaoMaestro();
    const semestreId = contexto.semestreId || "";
    const tenantId = contexto.tenantId || "";
    const cacheAuditoria = obterCacheAuditoriaMaestro(semestreId, typeof navigator !== "undefined" && navigator.onLine === false, tenantId);

    if (cacheAuditoria) {
        renderizarAuditoriaDoCacheMaestro(cacheAuditoria);
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    } else {
        container.innerHTML = renderEstadoOperacaoMaestro("loading", {
            message: "A puxar a fila de trabalho...",
            className: "loading-state-box admin-audit-loading"
        });
    }

    try {
        const res = await apiCall("getListaAuditoria", {
            pesquisa: "",
            statusFiltro: "TODOS",
            incluirTodos: true,
            limite: 2000,
            semestreId: semestreId,
            tenantId: tenantId,
            usuarioLogadoId: contexto.usuarioLogadoId,
            permitirScanFallback: true
        }, { timeoutMs: 90000 });
        if (res.sucesso) {
            arrayAlunosAuditoria = Array.isArray(res.lista) ? res.lista.map(normalizarAlunoAuditoria) : [];
            metaAuditoriaMaestro = {
                totalBackend: Number(res.total || arrayAlunosAuditoria.length),
                limite: Number(res.limite || 2000),
                truncado: res.truncado === true,
                semestreId: res.semestreAlvo || res.semestreId || semestreId
            };
            if (metaAuditoriaMaestro.semestreId && window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester) {
                window.MaestroData.contexts.semester.set({
                    semestreId: metaAuditoriaMaestro.semestreId,
                    semestreAtual: metaAuditoriaMaestro.semestreId,
                    source: "getListaAuditoria"
                });
            }
            salvarCacheAuditoriaMaestro(res.lista || [], metaAuditoriaMaestro.semestreId || semestreId, tenantId, metaAuditoriaMaestro);
            atualizarOpcoesFiltrosAuditoria();
            atualizarContextoAuditoriaVisualMaestro();
            aplicarFiltrosAuditoria();
        } else {
            const cacheFallback = obterCacheAuditoriaMaestro(semestreId, true, tenantId);
            if (cacheFallback && renderizarAuditoriaDoCacheMaestro(cacheFallback)) return;
            container.innerHTML = renderizarErroAuditoriaMaestro(res, "Erro ao carregar fila");
        }
    } catch (e) {
        const cacheFallback = obterCacheAuditoriaMaestro(semestreId, true, tenantId);
        if (cacheFallback && renderizarAuditoriaDoCacheMaestro(cacheFallback)) return;
        container.innerHTML = renderizarErroAuditoriaMaestro({
            erro: "Nao foi possivel conectar com o servidor.",
            detalhes: e && e.message ? e.message : String(e),
            codigo: "NETWORK_ERROR"
        }, "Falha na ligacao");
    }
}

function aplicarFiltrosAuditoria() {
    salvarFiltrosAuditoriaPersistentes();
    const termoOriginal = document.getElementById('auditoria-pesquisa')?.value.trim() || "";
    const termo = normalizarTextoFiltroAuditoria(termoOriginal);
    const termoCpf = termoOriginal.replace(/\D/g, "");
    const status = (document.getElementById('auditoria-status')?.value || "").toUpperCase();
    const instituicao = normalizarTextoFiltroAuditoria(document.getElementById('auditoria-instituicao')?.value || "");
    const turno = normalizarTextoFiltroAuditoria(document.getElementById('auditoria-turno')?.value || "");

    arrayAlunosAuditoriaFiltrado = arrayAlunosAuditoria.filter(aluno => {
        let matchPesquisa = true;
        if (termo) {
            const cpfStr = cpfSeguroAuditoria(aluno.cpf || aluno.CPF_ALUNO);
            const alvoTexto = normalizarTextoFiltroAuditoria([
                aluno.nome || aluno.NOME_ALUNO || "",
                aluno.email || aluno.EMAIL_ALUNO || "",
                aluno.matricula || aluno.MATRICULA_ALUNO || "",
                aluno.instituicao || aluno.INSTITUICAO_ALUNO || "",
                aluno.rota || aluno.ROTA_ALUNO || ""
            ].join(" "));
            matchPesquisa = alvoTexto.includes(termo) || (termoCpf && cpfStr.includes(termoCpf));
        }

        let matchStatus = true;
        if (status) {
            const equivalentes = statusEquivalentesAuditoria(status);
            const statusAluno = valoresStatusAlunoAuditoria(aluno);
            matchStatus = statusAluno.some(valor => equivalentes.includes(valor));
        }

        let matchInst = true;
        if (instituicao) {
            const instVal = normalizarTextoFiltroAuditoria(aluno.instituicao || aluno.INSTITUICAO_ALUNO || "");
            matchInst = (instVal === instituicao || instVal.includes(instituicao));
        }

        let matchTurno = true;
        if (turno) {
            const turnoVal = normalizarTextoFiltroAuditoria(aluno.turno || aluno.TURNOS_ALUNO || "");
            const turnosVal = normalizarTextoFiltroAuditoria(toArrayAuditoria(aluno.turnos).join(" "));
            matchTurno = (turnoVal === turno || turnoVal.includes(turno) || turnosVal.includes(turno));
        }

        return matchPesquisa && matchStatus && matchInst && matchTurno;
    });

    paginaAtualAuditoria = 1;
    atualizarResumoAuditoriaMaestro();
    renderizarListaAuditoria();
}

function renderizarListaAuditoria() {
    const container = document.getElementById('auditoria-fila-container');
    if (!arrayAlunosAuditoriaFiltrado || arrayAlunosAuditoriaFiltrado.length === 0) {
        container.innerHTML = renderEstadoOperacaoMaestro("empty", {
            title: "Fila vazia",
            message: "Todos os pedidos foram atendidos ou nao ha resultados.",
            className: "empty-state-box admin-audit-empty"
        });
        renderizarRaioXLateralAuditoria(null);
        return;
    }

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
        <tr class="auditoria-row dynamic-table-row" data-cpf="${cpfAluno}" data-semestre-id="${semestreSeguro}">
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
                <button class="btn-solid btn-auditoria-detalhar" data-cpf="${cpfAluno}" data-semestre-id="${semestreSeguro}" onclick="selecionarAlunoAuditoria(this.dataset.cpf, this.dataset.semestreId)">Raio-X</button>
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
    sincronizarRaioXLateralAuditoria();
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
            const base64Seguro = String(res.base64 || "").replace(/\s+/g, "");
            if (!/^[A-Za-z0-9+/=]+$/.test(base64Seguro)) {
                contentBox.innerHTML = '<div class="error-box">Documento recebido em formato invalido.</div>';
                return;
            }
            const fullBase64 = `data:${mimeType};base64,${base64Seguro}`;

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

function setEstadoSalaMaquinasMaestro(tipo, mensagem) {
    const card = document.querySelector(".motores-status-card");
    if (!card) return;
    let box = document.getElementById("motores-status-feedback");
    if (!box) {
        box = document.createElement("p");
        box.id = "motores-status-feedback";
        box.className = "motores-status-feedback";
        card.appendChild(box);
    }
    box.className = `motores-status-feedback motores-status-${tipo || "info"}`;
    box.textContent = mensagem || "";
}

function normalizarEstadosMotoresMaestro(estados) {
    const source = estados || {};
    return {
        ETL: source.ETL === true || source.etl === true || String(source.ETL || source.etl || "").toLowerCase() === "true",
        OCR: source.OCR === true || source.ocr === true || String(source.OCR || source.ocr || "").toLowerCase() === "true",
        DOCS: source.DOCS === true || source.docs === true || String(source.DOCS || source.docs || "").toLowerCase() === "true",
        EMAIL: source.EMAIL === true || source.email === true || String(source.EMAIL || source.email || "").toLowerCase() === "true"
    };
}

function obterBotaoMotorMaestro(motorId) {
    return Array.from(document.querySelectorAll(".btn-motor-force, .btn-motor-force-last"))
        .find(btn => String(btn.getAttribute("onclick") || "").indexOf(`'${motorId}'`) !== -1);
}

function resumirHealthcheckMaestro(res) {
    const checks = res && res.checks && typeof res.checks === "object" ? res.checks : {};
    const nomes = Object.keys(checks);
    const falhas = nomes.filter(nome => !checks[nome] || checks[nome].ok !== true);
    if (!nomes.length) return res && res.erro ? res.erro : "Healthcheck sem detalhes retornados.";
    if (!falhas.length) return `Healthcheck OK: ${nomes.length} verificacoes aprovadas.`;
    return `Healthcheck com atencao: ${falhas.length} de ${nomes.length} verificacoes falharam (${falhas.slice(0, 4).join(", ")}).`;
}

async function executarHealthcheckMaestroUI() {
    const contexto = obterContextoOperacaoMaestro();
    const btn = document.getElementById("btn-healthcheck-maestro");
    if (btn) btn.disabled = true;
    setEstadoSalaMaquinasMaestro("loading", "Validando backend, Firestore, Drive, FCM e configuracoes...");

    try {
        const res = await apiCall("healthcheckMaestro", {
            tenantId: contexto.tenantId,
            semestreId: contexto.semestreId,
            usuarioLogadoId: contexto.usuarioLogadoId
        }, { timeoutMs: 120000 });
        const resumo = resumirHealthcheckMaestro(res);
        const tipo = res && res.sucesso ? "success" : "error";
        setEstadoSalaMaquinasMaestro(tipo, resumo);
        showToast(resumo, tipo);
    } catch (e) {
        const msg = "Healthcheck falhou: " + (e && e.message ? e.message : String(e));
        setEstadoSalaMaquinasMaestro("error", msg);
        showToast(msg, "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function abrirPainelModerador() {
    if (typeof temSessaoOperadorAtiva === 'function' && !temSessaoOperadorAtiva()) return;
    if (typeof podeExecutarAcaoMaestro === 'function' && !podeExecutarAcaoMaestro("salaMaquinas", { notify: true })) return;

    switchView('view-moderador');
    if (typeof aplicarPoliticaEstagioMaestro === "function") aplicarPoliticaEstagioMaestro();
    const loader = document.getElementById('loader-sincronizacao-motores');
    const contexto = obterContextoOperacaoMaestro();

    if (loader) {
        loader.classList.remove('hidden');
        loader.setAttribute("aria-busy", "true");
    }
    setEstadoSalaMaquinasMaestro("loading", "Sincronizando estado dos motores...");

    try {
        const res = await apiCall("getStatusMotores", {
            tenantId: contexto.tenantId,
            semestreId: contexto.semestreId,
            usuarioLogadoId: contexto.usuarioLogadoId
        }, { timeoutMs: 45000 });
        if (res.sucesso && res.estados) {
            const estados = normalizarEstadosMotoresMaestro(res.estados);
            const toggleETL = document.getElementById('toggle-motor-etl');
            const toggleOCR = document.getElementById('toggle-motor-ocr');
            const toggleDOCS = document.getElementById('toggle-motor-docs');
            const toggleEMAIL = document.getElementById('toggle-motor-email');

            if (toggleETL) toggleETL.checked = estados.ETL;
            if (toggleOCR) toggleOCR.checked = estados.OCR;
            if (toggleDOCS) toggleDOCS.checked = estados.DOCS;
            if (toggleEMAIL) toggleEMAIL.checked = estados.EMAIL;
            setEstadoSalaMaquinasMaestro("success", "Motores sincronizados com o backend.");
        } else {
            setEstadoSalaMaquinasMaestro("error", res.erro || "Nao foi possivel ler o estado dos motores.");
            showToast(res.erro || "Nao foi possivel ler o estado dos motores.", "error");
        }
    } catch (err) {
        setEstadoSalaMaquinasMaestro("error", "Nao foi possivel ler o estado dos motores: " + err.message);
        showToast("Não foi possível ler o estado dos motores: " + err.message, "error");
    } finally {
        if (loader) {
            loader.classList.add('hidden');
            loader.setAttribute("aria-busy", "false");
        }
    }
}

async function forcarMotor(motorId) {
    const contexto = obterContextoOperacaoMaestro();
    const btn = obterBotaoMotorMaestro(motorId);
    if (btn) btn.disabled = true;
    showToast(`A enviar sinal para o motor ${motorId}...`, "loading");
    setEstadoSalaMaquinasMaestro("loading", `Executando motor ${motorId}...`);
    try {
        const res = await apiCall("forcarExecucaoMotor", {
            motorId: motorId,
            tenantId: contexto.tenantId,
            semestreId: contexto.semestreId,
            usuarioLogadoId: contexto.usuarioLogadoId
        }, { timeoutMs: 180000 });
        if (res.sucesso) {
            const msg = res.msg || "Motor executado com sucesso.";
            setEstadoSalaMaquinasMaestro("success", msg);
            showToast(msg, "success");
        } else {
            const erro = res.erro || "Motor nao retornou sucesso.";
            setEstadoSalaMaquinasMaestro("error", erro);
            showToast(erro, "error");
        }
    } catch (e) {
        setEstadoSalaMaquinasMaestro("error", "Erro ao acionar motor: " + e.message);
        showToast("Ocorreu um erro ao acionar o motor: " + e.message, "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function alterarMotor(motorId, isLigado) {
    const contexto = obterContextoOperacaoMaestro();
    showToast(`A alterar configurações de ${motorId}...`, "loading");
    try {
        const res = await apiCall("alterarEstadoMotor", {
            motorId: motorId,
            ligado: isLigado,
            tenantId: contexto.tenantId,
            semestreId: contexto.semestreId,
            usuarioLogadoId: contexto.usuarioLogadoId
        }, { timeoutMs: 45000 });
        if (res.sucesso) showToast(res.msg || "Motor atualizado.", "success");
        else showToast(res.erro || "Falha ao alterar motor.", "error");
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

function obterCacheMuralMaestro(permitirExpirado) {
    const storage = obterStorageOperacaoMaestro();
    if (!storage || typeof storage.getDomainCache !== "function") return null;
    const cache = storage.getDomainCache("communication", {
        key: "MAESTRO_COMMUNICATION_CACHE_MURAL",
        allowExpired: permitirExpirado === true
    });
    return cache && cache.hit && cache.data ? cache : null;
}

function salvarCacheMuralMaestro(muralNormalizado) {
    const storage = obterStorageOperacaoMaestro();
    if (!storage || typeof storage.setDomainCache !== "function" || !muralNormalizado || muralNormalizado.sucesso === false) return;
    storage.setDomainCache("communication", muralNormalizado, {
        key: "MAESTRO_COMMUNICATION_CACHE_MURAL",
        source: "getMuralDaSemana",
        ttlMs: obterTtlOperacaoMaestro("communication", 1000 * 60 * 10)
    });
}

function renderizarMuralNormalizadoMaestro(container, btnNovoPostHTML, muralNormalizado, opcoes) {
    if (!container || !muralNormalizado) return false;
    const mensagensMural = muralNormalizado.mensagens || [];
    const limiteSemanal = limitePostagensMuralMaestro(muralNormalizado);
    if (!mensagensMural.length) {
        container.innerHTML = `${btnNovoPostHTML}${renderEstadoOperacaoMaestro("empty", {
            message: "Ainda nao ha contribuicoes nos ultimos 7 dias. Seja o primeiro a partilhar uma ideia!",
            className: "mural-empty-state"
        })}`;
        return true;
    }

    let html = btnNovoPostHTML + `<div class="mural-limit-note">Limite: ${limiteSemanal} publicacoes por estudante a cada semana.</div>`;
    if (opcoes && opcoes.cache === true && typeof renderAsyncStateMaestro === "function") {
        html += renderAsyncStateMaestro(opcoes.expired ? "offline" : "stale", {
            message: opcoes.expired ? "Mural exibido do cache local." : "Mural atualizado em segundo plano.",
            className: "mural-cache-state"
        });
    }

    mensagensMural.forEach((msg, index) => {
        const upsInfo = Array.isArray(msg.arrayUpsInfo) ? msg.arrayUpsInfo : [];
        const downsInfo = Array.isArray(msg.arrayDownsInfo) ? msg.arrayDownsInfo : [];
        const upAtivo = currentWalletId && (msg.meuVoto === "up" || upsInfo.includes(currentWalletId)) ? ' is-active-up' : '';
        const downAtivo = currentWalletId && (msg.meuVoto === "down" || downsInfo.includes(currentWalletId)) ? ' is-active-down' : '';
        const coroa = index === 0 && msg.pontuacao > 0 ? 'Top Semanal' : '';
        const tsMural = msg.tsMensagem || msg.criadoEm || (msg.raw && (msg.raw.tsMensagem || msg.raw.timestamp_epoch || msg.raw.criado_em));
        const tempoCorrigido = escapeHTMLAuditoria(calcularTempoRelativo(tsMural));
        const idElementoSeguro = safeDomIdAuditoria(msg.id);
        const categoriaSegura = escapeHTMLAuditoria(msg.categoria || "");
        const mensagemSegura = escapeHTMLAuditoria(msg.mensagem);
        const autorSeguro = escapeHTMLAuditoria(msg.autor || msg.autorNome);
        const votosUpSeguro = escapeHTMLAuditoria(msg.votosUp || 0);
        const votosDownSeguro = escapeHTMLAuditoria(msg.votosDown || 0);

        window.MaestroMuralIdMap = window.MaestroMuralIdMap || {};
        window.MaestroMuralIdMap[idElementoSeguro] = String(msg.id || "");

        html += `
            <div class="form-card mural-post-card dynamic-card dynamic-feed-card">
               <div class="mural-post-header">
                  <div class="mural-post-tags">
                     <span class="mural-tag">${categoriaSegura}</span>
                     ${coroa ? `<span class="mural-tag mural-tag-top">${coroa}</span>` : ''}
                  </div>
                  <span class="mural-post-time">${tempoCorrigido}</span>
               </div>
               <p class="mural-message">"${mensagemSegura}"</p>
               <div class="mural-post-footer">
                  <span class="mural-author">Por: ${autorSeguro}</span>
                  <div class="mural-vote-group">
                     <button class="mural-vote-button${upAtivo}" onclick="votarNoMural('${idElementoSeguro}', 'UP')">UP <span id="count-up-${idElementoSeguro}" class="mural-vote-count">${votosUpSeguro}</span></button>
                     <button class="mural-vote-button${downAtivo}" onclick="votarNoMural('${idElementoSeguro}', 'DOWN')">DOWN <span id="count-down-${idElementoSeguro}" class="mural-vote-count">${votosDownSeguro}</span></button>
                  </div>
               </div>
            </div>`;
    });
    container.innerHTML = html;
    return true;
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

    const cacheMural = obterCacheMuralMaestro(typeof navigator !== "undefined" && navigator.onLine === false);
    if (cacheMural) {
        renderizarMuralNormalizadoMaestro(container, btnNovoPostHTML, cacheMural.data, { cache: cacheMural.stale || cacheMural.expired, expired: cacheMural.expired });
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    } else {
        container.innerHTML = `${btnNovoPostHTML}${renderEstadoOperacaoMaestro("loading", {
            message: "A carregar a voz da comunidade...",
            className: "mural-loading-state"
        })}`;
    }

    try {
        const res = await apiCall("getMuralDaSemana");
        const adapterMural = adapterComunicacaoMaestro("muralFeed");
        const muralNormalizado = adapterMural ? adapterMural(res, currentWalletId) : res;
        const mensagensMural = (muralNormalizado && muralNormalizado.mensagens) || [];
        const limiteSemanal = limitePostagensMuralMaestro(muralNormalizado);
        if (!muralNormalizado.sucesso) { container.innerHTML = `${btnNovoPostHTML}<div class="error-box dynamic-state-box dynamic-error-state">${escapeHTMLAuditoria(muralNormalizado.erro)}</div>`; return; }
        salvarCacheMuralMaestro(muralNormalizado);
        if (!mensagensMural.length) {
            container.innerHTML = `${btnNovoPostHTML}<div class="mural-empty-state dynamic-state-box dynamic-empty-state">Ainda não há contribuições nos últimos 7 dias.<br><br><b>Seja o primeiro a partilhar uma ideia!</b></div>`;
            return;
        }

        const limiteSemanalSeguro = escapeHTMLAuditoria(limiteSemanal);
        let html = btnNovoPostHTML + `<div class="mural-limit-note">Limite: ${limiteSemanalSeguro} publicacoes por estudante a cada semana.</div>`;
        mensagensMural.forEach((msg, index) => {
            const upsInfo = Array.isArray(msg.arrayUpsInfo) ? msg.arrayUpsInfo : [];
            const downsInfo = Array.isArray(msg.arrayDownsInfo) ? msg.arrayDownsInfo : [];
            const upAtivo = currentWalletId && (msg.meuVoto === "up" || upsInfo.includes(currentWalletId)) ? ' is-active-up' : '';
            const downAtivo = currentWalletId && (msg.meuVoto === "down" || downsInfo.includes(currentWalletId)) ? ' is-active-down' : '';
            const coroa = index === 0 && msg.pontuacao > 0 ? '👑 Top Semanal' : '';
            const tsMural = msg.tsMensagem || msg.criadoEm || (msg.raw && (msg.raw.tsMensagem || msg.raw.timestamp_epoch || msg.raw.criado_em));
            const tempoCorrigido = escapeHTMLAuditoria(calcularTempoRelativo(tsMural));
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
        const cacheFallback = obterCacheMuralMaestro(true);
        if (cacheFallback && renderizarMuralNormalizadoMaestro(container, btnNovoPostHTML, cacheFallback.data, { cache: true, expired: true })) return;
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
