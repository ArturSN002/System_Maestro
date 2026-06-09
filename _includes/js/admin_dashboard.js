// ========================================================================
// 11. MOTOR DO DASHBOARD ANALÍTICO E BI
// ========================================================================
window.myCharts = window.myCharts || {};
let ultimoDashboardStatsMaestro = null;

function mudarAbaDashboard(aba) {
    ['logistica', 'noturno', 'inclusao', 'analise'].forEach(t => {
        const tab = document.getElementById('tab-' + t);
        const area = document.getElementById('dash-area-' + t);
        if (tab) tab.classList.remove('active');
        if (area) area.classList.add('hidden');
    });
    const tabAtiva = document.getElementById('tab-' + aba);
    const areaAtiva = document.getElementById('dash-area-' + aba);
    if (tabAtiva) tabAtiva.classList.add('active');
    if (areaAtiva) areaAtiva.classList.remove('hidden');

    if (aba === 'analise') {
        renderizarDashboardBI();
    }
}

const CACHE_STATS_KEY = "MAESTRO_DASH_STATS";

function obterTtlDashboardMaestro() {
    const storage = window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;
    return storage && typeof storage.getDomainTtlMs === "function"
        ? storage.getDomainTtlMs("dashboard")
        : 1000 * 60 * 60 * 6;
}

function atualizarEstadoDashboardMaestro(tipo, mensagem, opcoes = {}) {
    const container = document.getElementById("dashboard-async-state");
    if (!container) return;
    const isHidden = opcoes.hidden === true;
    container.classList.toggle("hidden", isHidden);
    if (isHidden) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = typeof renderAsyncStateMaestro === "function"
        ? renderAsyncStateMaestro(tipo, {
            message: mensagem,
            title: opcoes.title || "",
            updatedAt: opcoes.updatedAt || "",
            className: opcoes.className || "dashboard-state-banner"
        })
        : `<div class="dynamic-state-box dynamic-${tipo}-state dashboard-state-banner"><p>${String(mensagem || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>`;
}

function atualizarEstadoCacheDashboardMaestro(cache) {
    if (!cache) return;
    const tipo = cache.expired ? "offline" : (cache.stale ? "stale" : "success");
    const mensagem = cache.expired
        ? "Dashboard exibido do cache local."
        : (cache.stale ? "Dashboard em cache enquanto sincronizamos." : "Dashboard sincronizado.");
    const updatedAt = cache.meta && cache.meta.updatedAt ? cache.meta.updatedAt : "";
    atualizarEstadoDashboardMaestro(tipo, mensagem, { updatedAt: updatedAt, className: "dashboard-state-banner" });
}

function obterContextoDashboardAdminMaestro() {
    let semesterContext = {};
    let operatorContext = {};

    try {
        semesterContext = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester
            ? window.MaestroData.contexts.semester.get()
            : {};
    } catch (error) {
        semesterContext = {};
    }

    try {
        operatorContext = window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.operator
            ? window.MaestroData.contexts.operator.get()
            : {};
    } catch (error) {
        operatorContext = {};
    }

    return {
        semestreId: semesterContext.semestreId || semesterContext.semestreAtual || "",
        semestreLabel: semesterContext.label || semesterContext.nome || semesterContext.semestreId || semesterContext.semestreAtual || "",
        perfil: String(
            operatorContext.nivel ||
            operatorContext.perfil ||
            localStorage.getItem("MAESTRO_OPERADOR_NIVEL") ||
            "OPERADOR"
        ).toUpperCase()
    };
}

function formatarDataDashboardMaestro(value) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value);
    try {
        return date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (error) {
        return String(value);
    }
}

function escapeHTMLDashboardMaestro(valor) {
    if (typeof escapeHTMLMaestro === "function") return escapeHTMLMaestro(valor);
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setTextoDashboardMaestro(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(valor ?? "");
}

function numeroDashboardMaestro(valor, fallback = 0) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
}

function somarMapaDashboardMaestro(mapa) {
    if (!mapa || typeof mapa !== "object") return 0;
    return Object.keys(mapa).reduce((acc, chave) => acc + numeroDashboardMaestro(mapa[chave], 0), 0);
}

function contarChavesDashboardMaestro(mapa) {
    if (!mapa || typeof mapa !== "object") return 0;
    return Object.keys(mapa).filter(chave => String(chave || "").trim() !== "").length;
}

function maiorItemDashboardMaestro(mapa) {
    if (!mapa || typeof mapa !== "object") return null;
    return Object.keys(mapa).reduce((maior, chave) => {
        const valor = numeroDashboardMaestro(mapa[chave], 0);
        if (!maior || valor > maior.valor) return { label: chave, valor: valor };
        return maior;
    }, null);
}

function valoresUnicosDashboardMaestro(dataMart, campo) {
    const valores = new Set();
    (Array.isArray(dataMart) ? dataMart : []).forEach(item => {
        String(item && item[campo] ? item[campo] : "")
            .split(",")
            .map(valor => valor.trim())
            .filter(Boolean)
            .forEach(valor => valores.add(valor));
    });
    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function listaFiltroDashboardMaestro(stats, nomeFiltro, campoDataMart, graficoFallback) {
    const filtros = stats && stats.filtrosDisponiveis ? stats.filtrosDisponiveis : {};
    const direto = filtros[nomeFiltro] || filtros[nomeFiltro + "Disponiveis"] || filtros[nomeFiltro + "Disponíveis"];
    if (Array.isArray(direto) && direto.length) return direto.map(String).filter(Boolean);
    const viaDataMart = valoresUnicosDashboardMaestro(stats && stats.dataMart, campoDataMart);
    if (viaDataMart.length) return viaDataMart;
    const mapa = graficoFallback || {};
    return Object.keys(mapa).filter(Boolean);
}

function atualizarAtalhosDashboardMaestro() {
    const bar = document.querySelector(".admin-dashboard-command-bar");
    if (!bar || typeof podeExecutarAcaoMaestro !== "function") return;
    bar.querySelectorAll("[data-maestro-action]").forEach(botao => {
        const action = botao.getAttribute("data-maestro-action") || "";
        const visivel = podeExecutarAcaoMaestro(action, { notify: false });
        botao.classList.toggle("hidden", !visivel);
        botao.setAttribute("aria-hidden", visivel ? "false" : "true");
    });
}

function atualizarFiltrosDashboardMaestro(stats) {
    const dashboardStats = normalizarDashboardStatsMaestro(stats);
    const graficos = dashboardStats.graficos || {};
    const instituicoes = listaFiltroDashboardMaestro(dashboardStats, "instituicoes", "i", graficos.instituicoes);
    const turnos = listaFiltroDashboardMaestro(dashboardStats, "turnos", "t", graficos.turnos);
    const dias = listaFiltroDashboardMaestro(dashboardStats, "dias", "d", graficos.dias);
    const rotas = listaFiltroDashboardMaestro(dashboardStats, "rotas", "r", graficos.rotas);
    const chips = [
        ["Instituicoes", instituicoes.length],
        ["Turnos", turnos.length],
        ["Dias", dias.length],
        ["Rotas", rotas.length]
    ];

    setTextoDashboardMaestro("dashboard-filter-title", `${numeroDashboardMaestro((dashboardStats.kpis || {}).total, 0) || dashboardStats.dataMart.length || 0} estudantes no recorte`);
    setTextoDashboardMaestro("dashboard-filter-summary", `Fonte: dashboardStats | BI: ${dashboardStats.dataMart.length} registros | Origem: ${dashboardStats.origem || "network"}`);

    const chipsContainer = document.getElementById("dashboard-filter-chips");
    if (chipsContainer) {
        chipsContainer.innerHTML = chips
            .map(([label, total]) => `<span class="admin-dashboard-filter-chip"><strong>${escapeHTMLDashboardMaestro(total)}</strong>${escapeHTMLDashboardMaestro(label)}</span>`)
            .join("");
    }
}

function atualizarInsightsDashboardMaestro(stats) {
    const dashboardStats = normalizarDashboardStatsMaestro(stats);
    const kpis = dashboardStats.kpis || {};
    const graficos = dashboardStats.graficos || {};
    const total = numeroDashboardMaestro(kpis.total, 0) || [
        kpis.ativos,
        kpis.pendentes,
        kpis.retidos,
        kpis.suspensos
    ].reduce((acc, valor) => acc + numeroDashboardMaestro(valor, 0), 0);
    const ativos = numeroDashboardMaestro(kpis.ativos, 0);
    const pendencias = numeroDashboardMaestro(kpis.pendentes, 0) + numeroDashboardMaestro(kpis.retidos, 0);
    const pctAtivos = total > 0 ? Math.round((ativos / total) * 100) : 0;
    const pctPendencias = total > 0 ? Math.round((pendencias / total) * 100) : 0;
    const topInstituicao = maiorItemDashboardMaestro(graficos.instituicoes);
    const topRota = maiorItemDashboardMaestro(graficos.rotas);

    const insights = [
        ["Saude operacional", `${pctAtivos}% ativos`],
        ["Fila de atencao", `${pendencias} casos (${pctPendencias}%)`],
        ["Instituicao lider", topInstituicao ? `${topInstituicao.label} (${topInstituicao.valor})` : "Sem dados"],
        ["Rota lider", topRota ? `${topRota.label} (${topRota.valor})` : "Sem dados"]
    ];

    const container = document.getElementById("dashboard-executive-insights");
    if (!container) return;
    container.innerHTML = insights
        .map(([label, value]) => `<div class="dashboard-insight-row"><span>${escapeHTMLDashboardMaestro(label)}</span><strong>${escapeHTMLDashboardMaestro(value)}</strong></div>`)
        .join("");
}

function atualizarContextoDashboardAdminMaestro(dashboardStats) {
    const contexto = obterContextoDashboardAdminMaestro();
    const stats = dashboardStats ? normalizarDashboardStatsMaestro(dashboardStats) : null;
    const semestreLabel = document.getElementById("dashboard-semestre-label");
    const operadorNivel = document.getElementById("dashboard-operador-nivel");
    const atualizadoLabel = document.getElementById("dashboard-atualizado-label");

    const semestreTexto = (stats && stats.semestreId) || contexto.semestreLabel || contexto.semestreId || "nao definido";
    if (semestreLabel) {
        semestreLabel.textContent = "Semestre: " + semestreTexto;
        semestreLabel.classList.toggle("admin-context-chip-warning", !semestreTexto || semestreTexto === "nao definido");
    }

    if (operadorNivel) {
        operadorNivel.textContent = "Perfil: " + contexto.perfil;
    }

    if (atualizadoLabel) {
        const atualizadoEm = stats && stats.atualizadoEm ? formatarDataDashboardMaestro(stats.atualizadoEm) : "";
        atualizadoLabel.textContent = atualizadoEm ? "Atualizado: " + atualizadoEm : "Aguardando sincronizacao";
        atualizadoLabel.classList.toggle("admin-context-chip-muted", !atualizadoEm);
    }
}

if (typeof window !== "undefined") {
    window.atualizarContextoDashboardAdminMaestro = atualizarContextoDashboardAdminMaestro;
}

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
    const storage = window.MaestroData && window.MaestroData.storage ? window.MaestroData.storage : null;

    if (!cachedStatsRaw && storage && typeof storage.getDomainCache === "function") {
        const tenantContext = window.MaestroData.contexts && window.MaestroData.contexts.tenant
            ? window.MaestroData.contexts.tenant.get()
            : {};
        const semesterContext = window.MaestroData.contexts && window.MaestroData.contexts.semester
            ? window.MaestroData.contexts.semester.get()
            : {};
        const envelope = storage.getDomainCache("dashboard", {
            tenantId: tenantContext.tenantId,
            semestreId: semesterContext.semestreId
        });
        if (envelope && envelope.hit && dashboardStatsValido(envelope.data)) {
            const statsEnvelope = normalizarDashboardStatsMaestro(envelope.data);
            statsEnvelope.__cacheState = envelope;
            return statsEnvelope;
        }
        return null;
    }
    if (!cachedStatsRaw) return null;

    if (storage) {
        const tenantContext = window.MaestroData.contexts && window.MaestroData.contexts.tenant
            ? window.MaestroData.contexts.tenant.get()
            : {};
        const semesterContext = window.MaestroData.contexts && window.MaestroData.contexts.semester
            ? window.MaestroData.contexts.semester.get()
            : {};
        const cacheValido = window.MaestroData.storage.isDomainFresh("dashboard", {
            tenantId: tenantContext.tenantId,
            semestreId: semesterContext.semestreId,
            maxAgeMs: obterTtlDashboardMaestro()
        });
        if (!cacheValido) return null;
    }

    try {
        const dashboardStats = normalizarDashboardStatsMaestro(JSON.parse(cachedStatsRaw));
        if (dashboardStatsValido(dashboardStats) && storage && typeof storage.getDomainMeta === "function") {
            const meta = storage.getDomainMeta("dashboard");
            dashboardStats.__cacheState = {
                hit: true,
                fresh: true,
                stale: false,
                expired: false,
                meta: meta || {}
            };
        }
        return dashboardStatsValido(dashboardStats) ? dashboardStats : null;
    } catch (erro) {
        if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Cache do dashboard invalido. Ignorando leitura local.", erro);
        else console.warn("Cache do dashboard invalido. Ignorando leitura local.");
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
        const semesterContext = window.MaestroData.contexts && window.MaestroData.contexts.semester
            ? window.MaestroData.contexts.semester.get()
            : {};
        window.MaestroData.storage.markDomain("dashboard", {
            tenantId: tenantContext.tenantId,
            semestreId: semesterContext.semestreId,
            source: "getDashboardStats",
            key: CACHE_STATS_KEY,
            ttlMs: obterTtlDashboardMaestro()
        });
        if (typeof window.MaestroData.storage.setDomainCache === "function") {
            window.MaestroData.storage.setDomainCache("dashboard", dashboardStats, {
                tenantId: tenantContext.tenantId,
                semestreId: semesterContext.semestreId,
                source: "getDashboardStats",
                ttlMs: obterTtlDashboardMaestro()
            });
        }
        if (
            window.MaestroData.storage.offlineDB &&
            typeof window.MaestroData.storage.offlineDB.putCacheEntry === "function"
        ) {
            window.MaestroData.storage.offlineDB
                .putCacheEntry("dashboard", "dashboardStats", dashboardStats, {
                    tenantId: tenantContext.tenantId,
                    semestreId: semesterContext.semestreId,
                    source: "getDashboardStats",
                    ttlMs: obterTtlDashboardMaestro()
                })
                .catch(() => null);
        }
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
    atualizarContextoDashboardAdminMaestro(stats);

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

    atualizarContextoDashboardAdminMaestro();
    atualizarAtalhosDashboardMaestro();
    const cachedStats = obterCacheDashboardMaestro();

    if (cachedStats) {
        atualizarDashboardComStatsMaestro(cachedStats, { cache: false });
        atualizarEstadoCacheDashboardMaestro(cachedStats.__cacheState || {
            hit: true,
            stale: true,
            expired: typeof navigator !== "undefined" && navigator.onLine === false,
            meta: {}
        });
        switchView('view-dashboard');

        buscarDashboardStatsServidorMaestro().then(stats => {
            atualizarDashboardComStatsMaestro(stats);
            atualizarEstadoDashboardMaestro("success", "Dashboard sincronizado com o semestre atual.", { className: "dashboard-state-banner" });
        }).catch(e => {
            if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "Erro de Rede BI.", e);
            else console.warn("Erro de Rede BI.");
            atualizarEstadoDashboardMaestro("stale", "Nao foi possivel atualizar agora. Mantivemos os dados em cache.", { className: "dashboard-state-banner" });
            showToast("Erro ao carregar os dados analiticos: " + e.message, "error");
        });
        return;
    }

    showToast("A extrair dados para o Dashboard...", "info");
    atualizarEstadoDashboardMaestro("loading", "A carregar dados analiticos...", { className: "dashboard-state-banner" });
    try {
        const stats = await buscarDashboardStatsServidorMaestro();
        atualizarDashboardComStatsMaestro(stats);
        atualizarEstadoDashboardMaestro("success", "Dashboard sincronizado com o semestre atual.", { className: "dashboard-state-banner" });
        switchView('view-dashboard');
    } catch (err) {
        if (typeof logMaestroSafe === "function") logMaestroSafe("error", "Erro de Rede BI.", err);
        else console.error("Erro de Rede BI.");
        atualizarEstadoDashboardMaestro("error", "Nao foi possivel carregar o Dashboard.", { className: "dashboard-state-banner" });
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
    ultimoDashboardStatsMaestro = dashboardStats;

    // Atualização dos KPIs superiores
    const totalKpi = kpis.total || (numeroDashboardMaestro(kpis.ativos, 0) + numeroDashboardMaestro(kpis.pendentes, 0) + numeroDashboardMaestro(kpis.retidos, 0) + numeroDashboardMaestro(kpis.suspensos, 0));
    if (document.getElementById('kpi-total')) document.getElementById('kpi-total').innerText = totalKpi || 0;
    if (document.getElementById('kpi-ativos')) document.getElementById('kpi-ativos').innerText = kpis.ativos || 0;
    if (document.getElementById('kpi-pendentes')) document.getElementById('kpi-pendentes').innerText = kpis.pendentes || 0;
    if (document.getElementById('kpi-retidos')) document.getElementById('kpi-retidos').innerText = kpis.retidos || 0;
    if (document.getElementById('kpi-suspensos')) document.getElementById('kpi-suspensos').innerText = kpis.suspensos || 0;
    if (document.getElementById('kpi-bi-registros')) document.getElementById('kpi-bi-registros').innerText = Array.isArray(dashboardStats.dataMart) ? dashboardStats.dataMart.length : 0;
    atualizarFiltrosDashboardMaestro(dashboardStats);
    atualizarInsightsDashboardMaestro(dashboardStats);
    atualizarAtalhosDashboardMaestro();

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
        if (typeof logMaestroSafe === "function") logMaestroSafe("error", "[Dashboard] Erro ao renderizar graficos.", erro);
        else console.error("[Dashboard] Erro ao renderizar graficos.");
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
            const valorSeguro = typeof escapeHTMLMaestro === "function" ? escapeHTMLMaestro(val) : String(val || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const valorAttrSeguro = typeof safeAttrMaestro === "function" ? safeAttrMaestro(val) : valorSeguro.replace(/"/g, "&quot;");
            const grupoAttrSeguro = typeof safeAttrMaestro === "function" ? safeAttrMaestro(grupoNome) : String(grupoNome || "").replace(/"/g, "&quot;");
            html += `<span class="chip-filter ${classeAtiva}" role="button" tabindex="0" data-group="${grupoAttrSeguro}" data-value="${valorAttrSeguro}" onclick="toggleChip(this)" onkeydown="ativarChipPorTeclado(event, this)">${valorSeguro}</span>`;
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
    element.setAttribute('aria-pressed', element.classList.contains('chip-active') ? 'true' : 'false');
    renderizarDashboardBI();
}

function ativarChipPorTeclado(event, element) {
    if (!event || !element) return;
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleChip(element);
    }
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
window.atualizarFiltrosDashboardMaestro = atualizarFiltrosDashboardMaestro;
window.atualizarInsightsDashboardMaestro = atualizarInsightsDashboardMaestro;
window.atualizarAtalhosDashboardMaestro = atualizarAtalhosDashboardMaestro;
window.renderChart = renderChart;
window.extrairEOrdenar = extrairEOrdenar;
