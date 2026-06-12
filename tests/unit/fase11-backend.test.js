const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "../..");
const backendRoot = path.resolve(repoRoot, "../../GAS/System_Maestro_Backend/MaestroCore");

const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  parseInt,
  isFinite,
  isNaN,
  Utilities: {
    formatDate: () => "01/01 00:00",
    getUuid: () => "qa-uuid"
  }
};

vm.createContext(context);

function loadBackendFile(name) {
  const source = fs.readFileSync(path.join(backendRoot, name), "utf8");
  vm.runInContext(source, context, { filename: name });
}

[
  "serviceFirestoreCRUD.gs",
  "serviceAuditoria.gs",
  "utils.gs",
  "serviceOCR.gs",
  "serviceModerator.gs"
].forEach(loadBackendFile);

const run = (source) => vm.runInContext(source, context);

assert.equal(run('maestroNormalizarStatusDocsPendente_("", "")'), "PENDENTE");
assert.equal(run('maestroNormalizarStatusDocsPendente_("", "PENDENTE")'), "PENDENTE");
assert.equal(run('maestroNormalizarStatusDocsPendente_("", "OK")'), "");
assert.equal(run('maestroNormalizarStatusDocsPendente_("GERADO", "OK")'), "GERADO");

const flat = run(`achatarDocumentoEstudante({
  dados_pessoais: { cpf: "10398067406", nome: "Aluno QA" },
  status_sistema: { status_validacao: "PENDENTE" }
})`);
assert.equal(flat.STATUS_DOCS, "PENDENTE");

context._auditoriaBuscarContextosTodosFirestore_ = function(credentials, tenantId, limit, semestreId) {
  assert.equal(tenantId, "TENANT_QA");
  assert.equal(semestreId, "2026_1");
  assert.equal(limit, 5000);
  return [
    { cpf: "111", semestreId, usandoSemestre: true, doc: { dados_pessoais: { cpf: "111" } } },
    { cpf: "222", semestreId, usandoSemestre: false, doc: { dados_pessoais: { cpf: "222" } } },
    { cpf: "333", semestreId, usandoSemestre: true, doc: { dados_pessoais: { cpf: "333" } } }
  ];
};
context.firestoreRunQuery = function() {
  throw new Error("Dashboard nao deve cair na consulta exclusiva de semestres quando o resolvedor da mesa existe.");
};

const dashboardDocs = run('_listarSemestresDashboardFirestore_({}, "TENANT_QA", "2026_1", 5000)');
assert.equal(dashboardDocs.length, 3);
assert.equal(dashboardDocs.filter((doc) => doc._dashboard_contexto && doc._dashboard_contexto.origem === "rootFallback").length, 1);
assert.match(run('maestroDashboardCacheKey_("TENANT_QA", "2026_1")'), /F11_UNIVERSO_AUDITORIA_V1$/);

context._auditoriaBuscarContextosTodosFirestore_ = function() {
  return [
    {
      cpf: "111",
      doc: {
        dados_pessoais: { cpf: "111" },
        status_sistema: { status_validacao: "PENDENTE" }
      }
    },
    {
      cpf: "222",
      doc: {
        dados_pessoais: { cpf: "222" },
        status_sistema: { status_validacao: "PENDENTE", status_docs: "GERADO" }
      }
    },
    {
      cpf: "333",
      doc: {
        dados_pessoais: { cpf: "333" },
        status_sistema: { status_validacao: "OK" }
      }
    },
    {
      cpf: "444",
      doc: {
        dados_pessoais: { cpf: "444" },
        status_sistema: { status_validacao: "PENDENTE", status_docs: "PENDENTE" }
      }
    }
  ];
};
context._auditoriaBuscarContextosPorStatusFirestore_ = function() {
  throw new Error("OCR deve preferir o universo completo da mesa para incluir status_docs vazio.");
};

const filaOCR = run('_buscarEstudantesPendentesOCRFirestore_({}, "TENANT_QA", 10, "2026_1", { dryRunProfundo: true, scanLimit: 10 })');
assert.deepEqual(Array.from(filaOCR, (item) => item.cpf), ["111", "444"]);

let patchCalls = 0;
let pushCalls = 0;
context.firestorePatchDocument = function() { patchCalls++; };
context.dispararAvisoPushIndividual = function() { pushCalls++; };
context.getFileIdFromUrl = function(value) { return String(value || "").trim(); };
context.mapearDadosEstudante = function(row) {
  return {
    anexoFoto: row[1],
    anexoDocumento: row[2],
    anexoResidencia: row[3],
    anexoVinculo: row[4],
    estagio: "",
    anexoEstagio: ""
  };
};

const dryRun = run(`processOCRLoop({
  FUSO_HORARIO: "America/Fortaleza",
  MAP_SISTEMA: {
    ID_ALUNO: 0,
    ANEXO_FOTO_3X4: 1,
    ANEXO_DOCUMENTO_FOTO: 2,
    ANEXO_COMPROVANTE_RESIDENCIA: 3,
    ANEXO_DECLARACAO_VINCULO: 4,
    STATUS_VALIDACAO: 5,
    STATUS_DOCS: 6
  }
}, Date.now(), {}, "TENANT_QA", "2026_1", { dryRunProfundo: true, scanLimit: 10 })`);

assert.equal(dryRun.codigo, "DRY_RUN_PROFUNDO");
assert.equal(dryRun.suprimirNotificacoes, true);
assert.equal(dryRun.pendentes, 2);
assert.equal(patchCalls, 0);
assert.equal(pushCalls, 0);

const classified = run('_classificarResultadoMotorMaestro_("OCR", { sucesso: true, codigo: "DRY_RUN_PROFUNDO", statusMotor: "OK", processados: 0, msg: "QA" }, "")');
assert.equal(classified.sucesso, true);
assert.equal(classified.codigo, "DRY_RUN_PROFUNDO");

console.log("Fase 1.1 backend OK");
