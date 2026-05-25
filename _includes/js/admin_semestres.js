(function initAdminSemestresMaestro() {
  const state = {
    semestres: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function notify(message, type = "info") {
    if (typeof showToast === "function") {
      showToast(message, type);
      return;
    }
    console[type === "error" ? "error" : "log"](message);
  }

  function getOperatorSessionSafe() {
    try {
      return (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.operator)
        ? window.MaestroData.contexts.operator.get()
        : {};
    } catch (e) {
      return {};
    }
  }

  function setSemesterContextSafe(semestreAtual) {
    if (!semestreAtual || !semestreAtual.id) return;
    try {
      if (window.MaestroData && window.MaestroData.contexts && window.MaestroData.contexts.semester) {
        window.MaestroData.contexts.semester.set({
          semestreId: semestreAtual.id,
          semestreAtual: semestreAtual.id,
          label: semestreAtual.label || semestreAtual.id,
          status: semestreAtual.status || "ATUAL",
          source: "adminSemestres"
        });
      }
    } catch (e) {
      console.warn("[Semestres] Falha ao atualizar semesterContext:", e);
    }
  }

  function operatorCanManageSemesters() {
    if (typeof temSessaoOperadorAtiva === "function" && !temSessaoOperadorAtiva()) return false;
    if (typeof podeExecutarAcaoMaestro === "function") {
      return podeExecutarAcaoMaestro("semestres", { notify: true });
    }
    return true;
  }

  function statusColor(status) {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "ATUAL") return "#059669";
    if (normalized === "ARQUIVADO") return "#6b7280";
    return "#2563eb";
  }

  function normalizarSemestreUI(item) {
    const source = item || {};
    const id = String(source.id || source.semestreId || "").trim();
    const status = String(source.status || (source.ativo ? "ATUAL" : "PASSADO")).toUpperCase();
    return {
      id,
      semestreId: id,
      label: String(source.label || source.nome || id || "Semestre").trim(),
      ano: String(source.ano || "").trim(),
      periodo: String(source.periodo || source.semestreNumero || "").trim(),
      inicio: String(source.inicio || source.dataInicio || "").trim(),
      fim: String(source.fim || source.dataFim || "").trim(),
      status,
      origem: String(source.origem || "FIRESTORE").trim()
    };
  }

  function renderStatusChip(status) {
    const safeStatus = String(status || "PASSADO").toUpperCase();
    const color = statusColor(safeStatus);
    return `<span style="display:inline-flex; align-items:center; border-radius:999px; border:1px solid ${color}; color:${color}; padding:3px 8px; font-size:10px; font-weight:700;">${escapeHTML(safeStatus)}</span>`;
  }

  function renderSemestreCard(item, index) {
    const semestre = normalizarSemestreUI(item);
    const isAtual = semestre.status === "ATUAL";
    const isArquivado = semestre.status === "ARQUIVADO";
    const periodo = [semestre.ano, semestre.periodo ? "Periodo " + semestre.periodo : ""].filter(Boolean).join(" - ");
    const vigencia = [semestre.inicio, semestre.fim].filter(Boolean).join(" ate ");

    return `
      <div class="form-card" style="padding: 14px; margin: 0; border-left: 4px solid ${statusColor(semestre.status)};">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
          <div>
            <strong style="display:block; color:var(--text-main); font-size:15px;">${escapeHTML(semestre.label)}</strong>
            <span style="display:block; font-size:11px; color:var(--text-sub); margin-top:3px;">ID: ${escapeHTML(semestre.id || "-")}</span>
            <span style="display:block; font-size:11px; color:var(--text-sub); margin-top:3px;">${escapeHTML(periodo || "Periodo nao informado")}</span>
            <span style="display:block; font-size:11px; color:var(--text-sub); margin-top:3px;">${escapeHTML(vigencia || "Vigencia nao informada")}</span>
          </div>
          ${renderStatusChip(semestre.status)}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
          <button class="btn-text" style="margin:0; padding:8px 10px;" onclick="preencherSemestreMaestro(${index})">Editar</button>
          <button class="btn-solid" style="width:auto; margin:0; padding:8px 10px; background:#059669;" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="definirSemestreAtualMaestroUI(this.dataset.semestreId)">Atual</button>
          <button class="btn-solid" style="width:auto; margin:0; padding:8px 10px; background:#2563eb;" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="marcarSemestrePassadoMaestroUI(this.dataset.semestreId)">Passado</button>
          <button class="btn-solid" style="width:auto; margin:0; padding:8px 10px; background:#6b7280;" ${isAtual || isArquivado ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="arquivarSemestreMaestroUI(this.dataset.semestreId)">Arquivar</button>
          <button class="btn-solid text-danger" style="width:auto; margin:0; padding:8px 10px;" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="excluirSemestreMaestroUI(this.dataset.semestreId)">Excluir</button>
        </div>
      </div>
    `;
  }

  function atualizarResumoAtual(semestreAtual) {
    const atual = normalizarSemestreUI(semestreAtual || {});
    const label = byId("semestres-atual-label");
    const id = byId("semestres-atual-id");
    if (label) label.textContent = atual.id ? atual.label : "Nenhum semestre atual definido";
    if (id) id.textContent = atual.id ? atual.id : "Defina um semestre atual antes de auditar ou analisar dados.";
  }

  function renderizarSemestresMaestro(res) {
    const container = byId("semestres-lista-container");
    if (!container) return;

    const lista = Array.isArray(res && res.semestres) ? res.semestres.map(normalizarSemestreUI) : [];
    state.semestres = lista;

    const atual = normalizarSemestreUI((res && res.semestreAtual) || lista.find(item => item.status === "ATUAL") || {});
    atualizarResumoAtual(atual);
    if (atual.id) setSemesterContextSafe(atual);

    if (!lista.length) {
      container.innerHTML = '<div class="empty-state" style="padding: 24px; text-align:center;">Nenhum semestre cadastrado.</div>';
      return;
    }

    container.innerHTML = lista.map(renderSemestreCard).join("");
  }

  async function carregarSemestresMaestro() {
    if (!operatorCanManageSemesters()) return;

    const container = byId("semestres-lista-container");
    if (container) {
      container.innerHTML = '<div class="text-center" style="padding: 30px;"><div class="loader" style="margin: 0 auto;"></div><p style="font-size: 11px; margin-top: 10px;">A carregar semestres...</p></div>';
    }

    try {
      const res = await apiCall("listarSemestresMaestro", {});
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Falha ao carregar semestres.");
      }
      renderizarSemestresMaestro(res);
    } catch (e) {
      if (container) container.innerHTML = `<div class="error-box">Erro: ${escapeHTML(e.message)}</div>`;
    }
  }

  function preencherSemestreMaestro(index) {
    const semestre = normalizarSemestreUI(state.semestres[index] || {});
    if (!semestre.id) return;
    if (byId("semestre-id")) byId("semestre-id").value = semestre.id;
    if (byId("semestre-label")) byId("semestre-label").value = semestre.label;
    if (byId("semestre-ano")) byId("semestre-ano").value = semestre.ano;
    if (byId("semestre-periodo")) byId("semestre-periodo").value = semestre.periodo;
    if (byId("semestre-inicio")) byId("semestre-inicio").value = semestre.inicio;
    if (byId("semestre-fim")) byId("semestre-fim").value = semestre.fim;
    if (byId("semestre-status")) byId("semestre-status").value = semestre.status || "PASSADO";
  }

  function limparFormularioSemestreMaestro() {
    ["semestre-id", "semestre-label", "semestre-ano", "semestre-periodo", "semestre-inicio", "semestre-fim"].forEach(id => {
      const input = byId(id);
      if (input) input.value = "";
    });
    if (byId("semestre-status")) byId("semestre-status").value = "PASSADO";
  }

  function montarPayloadSemestre() {
    const session = getOperatorSessionSafe();
    return {
      semestreId: byId("semestre-id") ? byId("semestre-id").value.trim() : "",
      label: byId("semestre-label") ? byId("semestre-label").value.trim() : "",
      ano: byId("semestre-ano") ? byId("semestre-ano").value.trim() : "",
      periodo: byId("semestre-periodo") ? byId("semestre-periodo").value.trim() : "",
      inicio: byId("semestre-inicio") ? byId("semestre-inicio").value : "",
      fim: byId("semestre-fim") ? byId("semestre-fim").value : "",
      status: byId("semestre-status") ? byId("semestre-status").value : "PASSADO",
      usuarioLogadoId: session.email || session.nome || ""
    };
  }

  async function salvarSemestreMaestroUI() {
    if (!operatorCanManageSemesters()) return;

    const payload = montarPayloadSemestre();
    if (!payload.semestreId && (!payload.ano || !payload.periodo)) {
      notify("Informe um ID de semestre ou preencha ano e periodo.", "error");
      return;
    }

    try {
      const res = await apiCall("salvarSemestreMaestro", payload);
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Nao foi possivel salvar o semestre.");
      }
      notify("Semestre salvo com sucesso.", "success");
      renderizarSemestresMaestro(res);
    } catch (e) {
      notify(e.message, "error");
    }
  }

  async function executarAcaoSemestreMaestro(action, semestreId, confirmMessage) {
    if (!operatorCanManageSemesters()) return;
    const id = String(semestreId || "").trim();
    if (!id) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const session = getOperatorSessionSafe();
    try {
      const res = await apiCall(action, {
        semestreId: id,
        usuarioLogadoId: session.email || session.nome || ""
      });
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Acao nao concluida.");
      }
      notify("Semestre atualizado.", "success");
      renderizarSemestresMaestro(res);
    } catch (e) {
      notify(e.message, "error");
    }
  }

  function abrirGestaoSemestres() {
    if (!operatorCanManageSemesters()) return;
    switchView("view-semestres");
    carregarSemestresMaestro();
  }

  window.abrirGestaoSemestres = abrirGestaoSemestres;
  window.carregarSemestresMaestro = carregarSemestresMaestro;
  window.renderizarSemestresMaestro = renderizarSemestresMaestro;
  window.preencherSemestreMaestro = preencherSemestreMaestro;
  window.limparFormularioSemestreMaestro = limparFormularioSemestreMaestro;
  window.salvarSemestreMaestroUI = salvarSemestreMaestroUI;
  window.definirSemestreAtualMaestroUI = function definirSemestreAtualMaestroUI(id) {
    return executarAcaoSemestreMaestro("definirSemestreAtualMaestro", id);
  };
  window.marcarSemestrePassadoMaestroUI = function marcarSemestrePassadoMaestroUI(id) {
    return executarAcaoSemestreMaestro("marcarSemestrePassadoMaestro", id);
  };
  window.arquivarSemestreMaestroUI = function arquivarSemestreMaestroUI(id) {
    return executarAcaoSemestreMaestro("arquivarSemestreMaestro", id, "Arquivar este semestre?");
  };
  window.excluirSemestreMaestroUI = function excluirSemestreMaestroUI(id) {
    return executarAcaoSemestreMaestro("excluirSemestreMaestro", id, "Excluir apenas o registro do semestre? Os dados dos estudantes nao serao apagados por esta acao.");
  };
})();
