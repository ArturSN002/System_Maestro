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
        barraIA.style.width = Math.min(pctIA, 100) + "%";
        barraIA.style.background = pctIA > 80 ? "var(--danger)" : "var(--accent)";
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
