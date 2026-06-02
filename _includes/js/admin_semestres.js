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
      if (typeof logMaestroSafe === "function") logMaestroSafe("warn", "[Semestres] Falha ao atualizar semesterContext.", e);
      else console.warn("[Semestres] Falha ao atualizar semesterContext.");
    }
  }

  function operatorCanManageSemesters() {
    if (typeof temSessaoOperadorAtiva === "function" && !temSessaoOperadorAtiva()) return false;
    if (typeof podeExecutarAcaoMaestro === "function") {
      return podeExecutarAcaoMaestro("semestres", { notify: true });
    }
    return true;
  }

  function atualizarContextoPerfilSemestresMaestro() {
    const context = byId("semestres-contexto-perfil");
    if (!context) return;
    const session = getOperatorSessionSafe();
    const nivel = String(
      session.nivel ||
      session.perfil ||
      localStorage.getItem("MAESTRO_OPERADOR_NIVEL") ||
      "OPERADOR"
    ).toUpperCase();
    const podeGerir = ["MODERADOR", "SUPERVISOR"].includes(nivel);
    context.textContent = "Perfil: " + nivel + " | " + (podeGerir ? "gestao liberada" : "sem permissao de gestao");
    context.classList.toggle("semestre-context-note-warning", !podeGerir);
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
    const statusClass = "status-" + safeStatus.toLowerCase();
    return `<span class="semestre-chip ${statusClass}">${escapeHTML(safeStatus)}</span>`;
  }

  function renderSemestreCard(item, index) {
    const semestre = normalizarSemestreUI(item);
    const isAtual = semestre.status === "ATUAL";
    const isArquivado = semestre.status === "ARQUIVADO";
    const statusClass = "status-" + semestre.status.toLowerCase();
    const periodo = [semestre.ano, semestre.periodo ? "Periodo " + semestre.periodo : ""].filter(Boolean).join(" - ");
    const vigencia = [semestre.inicio, semestre.fim].filter(Boolean).join(" ate ");

    return `
      <div class="form-card semestre-card dynamic-card semester-dynamic-card ${statusClass}">
        <div class="semestre-card-header">
          <div>
            <strong class="semestre-card-title">${escapeHTML(semestre.label)}</strong>
            <span class="semestre-card-desc">ID: ${escapeHTML(semestre.id || "-")}</span>
            <span class="semestre-card-desc">${escapeHTML(periodo || "Periodo nao informado")}</span>
            <span class="semestre-card-desc">${escapeHTML(vigencia || "Vigencia nao informada")}</span>
          </div>
          ${renderStatusChip(semestre.status)}
        </div>
        <div class="semestre-card-actions dynamic-card-actions">
          <button class="btn-text" onclick="preencherSemestreMaestro(${index})">Editar</button>
          <button class="btn-solid btn-semestre-atual" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="definirSemestreAtualMaestroUI(this.dataset.semestreId)">Atual</button>
          <button class="btn-solid btn-semestre-passado" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="marcarSemestrePassadoMaestroUI(this.dataset.semestreId)">Passado</button>
          <button class="btn-solid btn-semestre-arquivar" ${isAtual || isArquivado ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="arquivarSemestreMaestroUI(this.dataset.semestreId)">Arquivar</button>
          <button class="btn-solid text-danger btn-semestre-excluir" ${isAtual ? "disabled" : ""} data-semestre-id="${escapeHTML(semestre.id)}" onclick="excluirSemestreMaestroUI(this.dataset.semestreId)">Excluir</button>
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
    atualizarContextoPerfilSemestresMaestro();
  }

  function renderizarSemestresMaestro(res) {
    const container = byId("semestres-lista-container");
    if (!container) return;

    const lista = Array.isArray(res && res.semestres) ? res.semestres.map(normalizarSemestreUI) : [];
    state.semestres = lista;

    const atual = normalizarSemestreUI((res && res.semestreAtual) || lista.find(item => item.status === "ATUAL") || {});
    atualizarResumoAtual(atual);
    if (atual.id) {
      setSemesterContextSafe(atual);
      if (typeof window.atualizarContextoAdminVisualMaestro === "function") {
        window.atualizarContextoAdminVisualMaestro();
      }
      if (typeof window.atualizarContextoDashboardAdminMaestro === "function") {
        window.atualizarContextoDashboardAdminMaestro();
      }
    }

    if (!lista.length) {
      container.innerHTML = '<div class="empty-state empty-state-semestres dynamic-state-box dynamic-empty-state">Nenhum semestre cadastrado.</div>';
      return;
    }

    container.innerHTML = lista.map(renderSemestreCard).join("");
  }

  async function carregarSemestresMaestro() {
    if (!operatorCanManageSemesters()) return;

    const container = byId("semestres-lista-container");
    if (container) {
      container.innerHTML = typeof renderAsyncStateMaestro === "function"
        ? renderAsyncStateMaestro("loading", { message: "A carregar semestres...", className: "loading-state-box" })
        : '<div class="loading-state-box dynamic-state-box dynamic-loading-state"><div class="loader"></div><p>A carregar semestres...</p></div>';
    }

    try {
      const res = await apiCall("listarSemestresMaestro", {});
      if (!res || !res.sucesso) {
        throw new Error((res && (res.erro || res.detalhes)) || "Falha ao carregar semestres.");
      }
      renderizarSemestresMaestro(res);
    } catch (e) {
      if (container) {
        if (typeof renderAsyncStateMaestro === "function") {
          container.innerHTML = renderAsyncStateMaestro("error", {
            title: "Erro ao carregar semestres",
            message: e.message,
            className: "error-state-box"
          });
          return;
        }
        container.innerHTML = `
          <div class="error-state-box dynamic-state-box dynamic-error-state">
            <span class="error-icon">⚠️</span>
            <h3>Erro ao Carregar Semestres</h3>
            <p>${escapeHTML(e.message)}</p>
          </div>
        `;
      }
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
    atualizarContextoPerfilSemestresMaestro();
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
