const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "../..");
const consultaJs = fs.readFileSync(path.join(repoRoot, "_includes/js/consulta.js"), "utf8");

const context = {
  console,
  document: {
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => ({
      setAttribute() {},
      className: "",
      classList: { add() {}, remove() {} },
      insertAdjacentElement() {}
    })
  },
  window: {},
  setTimeout,
  clearTimeout
};

vm.createContext(context);
vm.runInContext(consultaJs, context, { filename: "consulta.js" });

const run = (source) => vm.runInContext(source, context);

assert.equal(run('validarCPFMaestro("103.980.674-06").valido'), true);
assert.equal(run('validarCPFMaestro("000.000.000-00").valido'), false);
assert.equal(run('validarCPFMaestro("123").valido'), false);

assert.equal(
  run('validarArquivoMaestro({ name: "pendencia.txt", type: "text/plain", size: 100 }, "VINCULO", "resgate").valido'),
  false
);
assert.equal(
  run('validarArquivoMaestro({ name: "pendencia.pdf", type: "application/pdf", size: 100 }, "VINCULO", "resgate").valido'),
  true
);
assert.equal(
  run('validarArquivoMaestro({ name: "foto.png", type: "image/png", size: 100 }, "FOTO", "resgate").valido'),
  true
);
assert.equal(
  run('validarArquivoMaestro({ name: "foto.pdf", type: "application/pdf", size: 100 }, "FOTO", "resgate").valido'),
  false
);

console.log("Fase 01 validators OK");
