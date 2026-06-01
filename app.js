---
---
// =======================================================================
// MAESTRO PWA - BUNDLE PRINCIPAL (Compilado pelo Jekyll)
// =======================================================================

// 1. Core & Variáveis Globais
{% include js/js_global.js %}
{% include js/main_core.js %}
{% include js/api_auth.js %}
{% include js/data_layer.js %}

// 2. Módulos do Estudante
{% include js/carteira.js %}
{% include js/consulta.js %}
{% include js/inscricao.js %}

// 3. Módulos Operacionais & Secretaria
{% include js/mobilidade.js %}
{% include js/operacao.js %}
{% include js/admin_dashboard.js %}
{% include js/admin_semestres.js %}
{% include js/admin_fiscal.js %}
{% include js/admin_sos.js %}

if (localStorage.getItem("MAESTRO_DEBUG") === "true" && typeof logMaestroSafe === "function") {
  logMaestroSafe("info", "[Jekyll] Maestro Bundle carregado com sucesso.");
}
