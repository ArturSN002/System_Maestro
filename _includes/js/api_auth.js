// ========================================================================
// 0. CONFIGURAÇÕES DA API V11.1 (SALA DAS MÁQUINAS E RBAC)
// ========================================================================

let GAS_URL = "";

const IAM_STATE = {
  login: "",
  senhaTemporaria: "",
  tipo: "",
  origem: "",
  dados: null
};

const CLIENT_DIRECTORY = {
  "Ceará-Mirim": "https://script.google.com/macros/s/AKfycbw837McNVuzTqX543AXP3KRAvs5k9Ciov2wGYnXKNMsdz8JjxpBAIsdGSUJGGtzcKpCVw/exec",
};

async function checkClientGateway() {
  const savedUrl = localStorage.getItem("MAESTRO_CLIENT_URL");
  const splash = document.getElementById("splash-screen");
  const gateway = document.getElementById("view-gateway");

  if (savedUrl) {
    if (splash) {
      splash.style.display = "flex";
      splash.style.opacity = "1";
      splash.classList.remove("hidden");
    }
    if (gateway) {
      gateway.style.display = "none";
      gateway.classList.remove("active-view");
    }
    GAS_URL = savedUrl;
    if (typeof bootSystem === "function") bootSystem();
  } else {
    if (splash) {
      splash.style.opacity = "0";
      setTimeout(() => { splash.style.display = "none"; }, 300);
    }

    document.querySelectorAll(".view-section").forEach(sec => {
      sec.classList.remove("active-view");
      sec.style.display = "none";
    });

    if (gateway) {
      gateway.style.display = "block";
      setTimeout(() => gateway.classList.add("active-view"), 10);
    }

    const select = document.getElementById("client-select");
    if (select) {
      select.innerHTML = "";
      for (const client in CLIENT_DIRECTORY) {
        const option = document.createElement("option");
        option.value = CLIENT_DIRECTORY[client];
        option.textContent = client;
        select.appendChild(option);
      }
    }
  }
}

function salvarCliente() {
  const select = document.getElementById("client-select");
  if (!select) return;
  const selectedUrl = select.value;
  if (!selectedUrl) return;

  localStorage.setItem("MAESTRO_CLIENT_URL", selectedUrl);
  GAS_URL = selectedUrl;

  const gateway = document.getElementById("view-gateway");
  if (gateway) {
    gateway.classList.remove("active-view");
    gateway.style.display = "none";
  }

  const splash = document.getElementById("splash-screen");
  if (splash) splash.classList.remove("hidden");

  if (typeof bootSystem === "function") bootSystem();
}

async function apiCall(action, payload = {}) {
  let token = localStorage.getItem("MAESTRO_TOKEN") || localStorage.getItem("MAESTRO_EST_TOKEN");

  if (token === "undefined" || token === "null") {
    token = null;
    localStorage.removeItem("MAESTRO_TOKEN");
  }

  const body = {
    action: action,
    token: token,
    payload: payload
  };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (data.status === 401 && action !== "invalidarTokenSessao") {
      console.error("401 Unauthorized na rota:", action);
      localStorage.removeItem("MAESTRO_TOKEN");
      showToast("Sessão encerrada. Por favor, entre novamente.", "error");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      return { sucesso: false, erro: "Sessão expirada" };
    }

    return data;
  } catch (error) {
    console.error("Erro na chamada API:", error);
    return { sucesso: false, erro: "Falha na ligação ao servidor." };
  }
}

function temSessaoOperadorAtiva() {
  const tokenOperador = localStorage.getItem("MAESTRO_TOKEN");
  const nivelOperador = localStorage.getItem("MAESTRO_OPERADOR_NIVEL");

  return !!(
    tokenOperador &&
    nivelOperador &&
    tokenOperador !== "undefined" &&
    tokenOperador !== "null" &&
    nivelOperador !== "undefined" &&
    nivelOperador !== "null"
  );
}

// ========================================================================
// 1. AUTENTICAÇÃO DE OPERADORES (FISCAL / MOTORISTA / ADMIN)
// ========================================================================

async function fazerLoginOperador() {
  const email = document.getElementById('fiscal-email').value.trim();
  const senha = document.getElementById('fiscal-senha').value.trim();
  const btn = document.getElementById('btn-login-fiscal');
  const resBox = document.getElementById('res-login-fiscal');

  if (!email || !senha) {
    showToast("Preencha todos os campos.", "error");
    return;
  }

  btn.innerText = "A AUTENTICAR...";
  btn.disabled = true;
  resBox.classList.add('hidden');

  try {
    const res = await apiCall("autenticarUsuario", { login: email, email, senha });

    if (res.status === "PRIMEIRO_ACESSO") {
      prepararPrimeiroAcessoIAM(email, senha, res, "OPERADOR");
      return;
    }

    if (res.sucesso) {
      if (String(res.tipo || "OPERADOR").toUpperCase() !== "OPERADOR") {
        resBox.innerText = "Este acesso pertence a estudante. Use o Cofre Digital.";
        resBox.classList.remove('hidden');
        return;
      }

      const tokenValido = res.token || res.tokenSessao || res.hashAcesso || res.sessionToken;

      if (!tokenValido) {
        showToast("Erro Crítico: O servidor não gerou o token.", "error");
        resBox.innerText = "Falha de comunicação com o autorizador. Token ausente.";
        resBox.classList.remove('hidden');
        btn.innerText = "AUTENTICAR";
        btn.disabled = false;
        return;
      }

      localStorage.setItem("MAESTRO_TOKEN", tokenValido);
      localStorage.setItem("MAESTRO_OPERADOR_NOME", res.nome || "Operador");
      localStorage.setItem("MAESTRO_OPERADOR_NIVEL", String(res.nivel || "OPERADOR").toUpperCase());
      localStorage.setItem("MAESTRO_OPERADOR_EMAIL", res.email || email);

      const elNome = document.getElementById('nome-operador-logado');
      if (elNome) elNome.innerText = res.nome || "Operador";

      configurarInterfacePorNivel(String(res.nivel || "OPERADOR").toUpperCase());
      showToast("Acesso concedido!", "success");
    } else {
      resBox.innerText = res.erro || "Login Inválido.";
      resBox.classList.remove('hidden');
    }
  } catch (e) {
    showToast("Erro de ligação.", "error");
  } finally {
    btn.innerText = "AUTENTICAR";
    btn.disabled = false;
  }
}

function finalizarLoginOperadorIAM(res, login, resBox) {
  const tokenValido = res.token || res.tokenSessao || res.hashAcesso || res.sessionToken;

  if (!tokenValido) {
    showToast("Erro Crítico: O servidor não gerou o token.", "error");
    if (resBox) {
      resBox.innerText = "Falha de comunicação com o autorizador. Token ausente.";
      resBox.classList.remove('hidden');
    }
    return false;
  }

  localStorage.setItem("MAESTRO_TOKEN", tokenValido);
  localStorage.setItem("MAESTRO_OPERADOR_NOME", res.nome || "Operador");
  localStorage.setItem("MAESTRO_OPERADOR_NIVEL", String(res.nivel || "OPERADOR").toUpperCase());
  localStorage.setItem("MAESTRO_OPERADOR_EMAIL", res.email || login);

  const elNome = document.getElementById('nome-operador-logado');
  if (elNome) elNome.innerText = res.nome || "Operador";

  configurarInterfacePorNivel(String(res.nivel || "OPERADOR").toUpperCase());
  showToast("Acesso concedido!", "success");
  return true;
}

function inicializarValidadorSenhaIAM() {
  const novaSenha = document.getElementById('nova-senha');
  const confirmarSenha = document.getElementById('confirmar-nova-senha');
  const btnSalvar = document.getElementById('btn-salvar-nova-senha');

  if (!novaSenha || !confirmarSenha || !btnSalvar) return;

  const atualizarEstado = () => {
    const resultado = validarRegrasSenha(novaSenha.value);
    const senhasConferem = novaSenha.value !== "" && novaSenha.value === confirmarSenha.value;
    btnSalvar.disabled = !(resultado.valida && senhasConferem);
    btnSalvar.style.opacity = btnSalvar.disabled ? "0.55" : "1";
    btnSalvar.style.cursor = btnSalvar.disabled ? "not-allowed" : "pointer";
  };

  if (novaSenha.dataset.iamValidatorBound !== "true") {
    novaSenha.addEventListener('input', atualizarEstado);
    confirmarSenha.addEventListener('input', atualizarEstado);
    novaSenha.dataset.iamValidatorBound = "true";
  }

  atualizarEstado();
}

function validarRegrasSenha(valor) {
  const senha = String(valor || "");
  const regras = {
    tam: senha.length >= 8,
    mai: /[A-Z]/.test(senha),
    min: /[a-z]/.test(senha),
    num: /[0-9]/.test(senha),
    esp: /[^A-Za-z0-9]/.test(senha)
  };

  atualizarItemRegraSenhaIAM('regra-tam', regras.tam, 'Mínimo de 8 caracteres');
  atualizarItemRegraSenhaIAM('regra-mai', regras.mai, 'Pelo menos uma letra maiúscula');
  atualizarItemRegraSenhaIAM('regra-min', regras.min, 'Pelo menos uma letra minúscula');
  atualizarItemRegraSenhaIAM('regra-num', regras.num, 'Pelo menos um número');
  atualizarItemRegraSenhaIAM('regra-esp', regras.esp, 'Pelo menos um caractere especial');

  return { ...regras, valida: regras.tam && regras.mai && regras.min && regras.num && regras.esp };
}

function atualizarItemRegraSenhaIAM(id, valido, texto) {
  const itens = document.querySelectorAll('[id="' + id + '"]');
  if (!itens || itens.length === 0) return;

  itens.forEach(item => {
    if (item) {
      item.textContent = (valido ? "✅ " : "❌ ") + texto;
      item.style.color = valido ? "var(--success)" : "var(--danger)";
    }
  });
}

function prepararPrimeiroAcessoIAM(login, senhaTemporaria, res, origem) {
  IAM_STATE.login = String(login || "").trim();
  IAM_STATE.senhaTemporaria = String(senhaTemporaria || "");
  IAM_STATE.tipo = String(res.tipo || origem || "").toUpperCase();
  IAM_STATE.origem = String(IAM_STATE.tipo || origem || "").toUpperCase();
  IAM_STATE.dados = res || null;

  sessionStorage.setItem("MAESTRO_IAM_TEMP_LOGIN", IAM_STATE.login);
  sessionStorage.setItem("MAESTRO_IAM_TEMP_SENHA", IAM_STATE.senhaTemporaria);
  sessionStorage.setItem("MAESTRO_IAM_TEMP_TIPO", IAM_STATE.tipo);
  sessionStorage.setItem("MAESTRO_IAM_TEMP_ORIGEM", IAM_STATE.origem);

  const novaSenha = document.getElementById('nova-senha');
  const confirmarSenha = document.getElementById('confirmar-nova-senha');
  if (novaSenha) novaSenha.value = "";
  if (confirmarSenha) confirmarSenha.value = "";

  validarRegrasSenha("");
  inicializarValidadorSenhaIAM();
  switchView('view-nova-senha');
  showToast("Primeiro acesso confirmado. Defina uma senha forte.", "info");
}

async function loginCarteiraIAM() {
  const login = document.getElementById('login-id').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const btn = document.getElementById('btn-login');
  const resBox = document.getElementById('res-login');

  if (!login || !senha) {
    resBox.innerText = "Preencha o login e a senha.";
    resBox.classList.remove('hidden');
    return;
  }

  btn.innerText = "A AUTENTICAR...";
  btn.disabled = true;
  resBox.classList.add('hidden');

  try {
    const res = await apiCall("autenticarUsuario", { login, senha });

    if (res.status === "PRIMEIRO_ACESSO") {
      prepararPrimeiroAcessoIAM(login, senha, res, "ESTUDANTE");
      return;
    }

    if (!res.sucesso) {
      resBox.innerText = res.erro || "Login inválido.";
      resBox.classList.remove('hidden');
      return;
    }

    if (String(res.tipo || "ESTUDANTE").toUpperCase() === "OPERADOR") {
      finalizarLoginOperadorIAM(res, login, resBox);
      return;
    }

    finalizarLoginEstudanteIAM(login, senha, res);
  } catch (err) {
    console.warn("Falha no login IAM da carteira:", err);
    resBox.innerText = "Falha de ligação. Necessita de internet.";
    resBox.classList.remove('hidden');
  } finally {
    btn.innerText = "ENTRAR NO COFRE";
    btn.disabled = false;
  }
}

function finalizarLoginEstudanteIAM(login, senha, res) {
  currentWalletId = res.idCarteira || res.identificador || login;
  currentWalletSenha = senha;
  currentStudentName = res.nome;

  if (res.token) localStorage.setItem("MAESTRO_EST_TOKEN", res.token);
  localStorage.setItem("MAESTRO_WALLET_CACHE", JSON.stringify(res));
  localStorage.setItem("MAESTRO_WALLET_CREDS", JSON.stringify({ id: login, senha }));

  renderizarCarteira(res);
  switchView('view-wallet');

  const loginId = document.getElementById('login-id');
  const loginSenha = document.getElementById('login-senha');
  if (loginId) loginId.value = "";
  if (loginSenha) loginSenha.value = "";

  if (typeof armarRelogioSessaoEstudante === 'function') armarRelogioSessaoEstudante();

  if (localStorage.getItem('MAESTRO_PREF_PUSH') === 'true') {
    const tokenTemp = localStorage.getItem("MAESTRO_FCM_TOKEN_TEMP");
    if (tokenTemp && typeof registrarTokenPush === 'function') {
      registrarTokenPush(tokenTemp);
    } else if (typeof inicializarPushNotifications === 'function') {
      setTimeout(inicializarPushNotifications, 2000);
    }
  }
}

async function salvarNovaSenhaPrimeiroAcesso() {
  const novaSenha = document.getElementById('nova-senha').value.trim();
  const confirmarSenha = document.getElementById('confirmar-nova-senha').value.trim();
  const btn = document.getElementById('btn-salvar-nova-senha');
  const resultado = validarRegrasSenha(novaSenha);

  if (!resultado.valida || novaSenha !== confirmarSenha) {
    showToast("A senha ainda não atende aos requisitos ou não confere.", "error");
    return;
  }

  const login = IAM_STATE.login || sessionStorage.getItem("MAESTRO_IAM_TEMP_LOGIN") || localStorage.getItem("MAESTRO_RESET_EMAIL") || "";
  const senhaTemporaria = IAM_STATE.senhaTemporaria || sessionStorage.getItem("MAESTRO_IAM_TEMP_SENHA") || "";
  const pin = sessionStorage.getItem("MAESTRO_IAM_TEMP_PIN") || "";
  const origem = IAM_STATE.origem || sessionStorage.getItem("MAESTRO_IAM_TEMP_ORIGEM") || "ESTUDANTE";

  if (!login) {
    showToast("Sessão temporária expirada. Faça login novamente.", "error");
    switchView('view-login');
    return;
  }

  btn.innerText = "A SALVAR...";
  btn.disabled = true;

  try {
    const action = pin ? "validarPinERedefinir" : "definirSenhaPrimeiroAcesso";
    const payload = pin
      ? { email: login, pin, novaSenha }
      : { login, senhaTemporaria, novaSenha };
    const res = await apiCall(action, payload);

    if (!res.sucesso) {
      showToast(res.erro || "Não foi possível salvar a nova senha.", "error");
      return;
    }

    sessionStorage.removeItem("MAESTRO_IAM_TEMP_LOGIN");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_SENHA");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_TIPO");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_ORIGEM");
    sessionStorage.removeItem("MAESTRO_IAM_TEMP_PIN");

    showToast("Senha definida com sucesso. Entrando...", "success");

    if (origem === "OPERADOR") {
      const auth = await apiCall("autenticarUsuario", { login, senha: novaSenha });
      if (auth.sucesso) {
        localStorage.setItem("MAESTRO_TOKEN", auth.token);
        localStorage.setItem("MAESTRO_OPERADOR_NOME", auth.nome || "Operador");
        localStorage.setItem("MAESTRO_OPERADOR_NIVEL", String(auth.nivel || "OPERADOR").toUpperCase());
        localStorage.setItem("MAESTRO_OPERADOR_EMAIL", auth.email || login);
        configurarInterfacePorNivel(String(auth.nivel || "OPERADOR").toUpperCase());
      } else {
        switchView('view-login-fiscal');
      }
      return;
    }

    const auth = await apiCall("autenticarUsuario", { login, senha: novaSenha });
    if (auth.sucesso) {
      finalizarLoginEstudanteIAM(login, novaSenha, auth);
    } else {
      switchView('view-login');
    }
  } catch (e) {
    console.error("Erro ao salvar senha de primeiro acesso:", e);
    showToast("Erro de ligação ao salvar a senha.", "error");
  } finally {
    btn.innerText = "Salvar e Entrar";
    inicializarValidadorSenhaIAM();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarValidadorSenhaIAM();
  window.loginCarteira = loginCarteiraIAM;
});

function configurarInterfacePorNivel(nivel) {
  if (!temSessaoOperadorAtiva()) return;

  const mCampo = document.getElementById('menu-grupo-campo');
  const mSecretaria = document.getElementById('menu-grupo-secretaria');
  const mModerador = document.getElementById('menu-grupo-moderador');

  if (mCampo) mCampo.classList.add('hidden');
  if (mSecretaria) mSecretaria.classList.add('hidden');
  if (mModerador) mModerador.classList.add('hidden');

  if (nivel === "MOTORISTA") {
    switchView('view-painel-motorista');
    if (typeof popularSelectFrotaMotorista === 'function') popularSelectFrotaMotorista();
  }
  else if (nivel === "FISCAL") {
    switchView('view-admin-hub');
    if (mCampo) mCampo.classList.remove('hidden');
  }
  else if (nivel === "OPERADOR" || nivel === "SUPERVISOR") {
    switchView('view-admin-hub');
    if (mCampo) mCampo.classList.remove('hidden');
    if (mSecretaria) mSecretaria.classList.remove('hidden');
  }
  else if (nivel === "MODERADOR") {
    switchView('view-admin-hub');
    if (mCampo) mCampo.classList.remove('hidden');
    if (mSecretaria) mSecretaria.classList.remove('hidden');
    if (mModerador) mModerador.classList.remove('hidden');
  }
}

function verificarSessaoAtiva() {
  const token = localStorage.getItem("MAESTRO_TOKEN");
  const nivel = localStorage.getItem("MAESTRO_OPERADOR_NIVEL");
  const nome = localStorage.getItem("MAESTRO_OPERADOR_NOME");

  if (token && nivel && token !== "undefined" && token !== "null") {
    const elNome = document.getElementById('nome-operador-logado');
    if (elNome) elNome.innerText = nome || "Operador";
    configurarInterfacePorNivel(nivel);
  } else {
    localStorage.removeItem("MAESTRO_TOKEN");
  }
}

function encerrarSessaoOperador() {
  localStorage.removeItem("MAESTRO_TOKEN");
  localStorage.removeItem("MAESTRO_OPERADOR_NOME");
  localStorage.removeItem("MAESTRO_OPERADOR_NIVEL");
  localStorage.removeItem("MAESTRO_OPERADOR_EMAIL");

  // CRITICAL FIX: Destroy the view memory to prevent the session loop
  sessionStorage.removeItem('MAESTRO_LAST_VIEW');

  window.location.reload();
}

// ========================================================================
// 2. RECUPERAÇÃO DE SENHA
// ========================================================================

function abrirRecuperacaoSenha() {
  switchView('view-recuperar-senha');
}

async function solicitarRecuperacaoSenha() {
  const email = document.getElementById('recuperar-email').value.trim();
  const btn = document.getElementById('btn-solicitar-recuperacao');

  if (!email) { showToast("Insira o seu e-mail.", "error"); return; }

  btn.innerText = "A ENVIAR...";
  btn.disabled = true;

  try {
    const res = await apiCall("recuperarSenhaOperador", { email });
    if (res.sucesso) {
      showToast("PIN enviado para o seu e-mail!", "success");
      localStorage.setItem("MAESTRO_RESET_EMAIL", email);
      switchView('view-redefinir-senha');
    } else {
      showToast(res.erro, "error");
    }
  } catch (e) {
    showToast("Erro de ligação.", "error");
  } finally {
    btn.innerText = "ENVIAR CÓDIGO PIN";
    btn.disabled = false;
  }
}

async function confirmarRedefinicaoSenha() {
  const email = localStorage.getItem("MAESTRO_RESET_EMAIL");
  const pin = document.getElementById('redefinir-pin').value.trim();
  const novaSenha = document.getElementById('redefinir-nova-senha').value.trim();
  const confirma = document.getElementById('redefinir-confirmar-senha').value.trim();
  const btn = document.getElementById('btn-confirmar-redefinicao');

  if (!email) {
    showToast("Informe o e-mail antes de validar o PIN.", "error");
    switchView('view-recuperar-senha');
    return;
  }

  if (!pin || !novaSenha || novaSenha !== confirma) {
    showToast("Verifique os campos e a confirmação da senha.", "error");
    return;
  }

  if (!validarRegrasSenha(novaSenha).valida) {
    showToast("A nova senha deve atender aos requisitos de seguranÃ§a.", "error");
    return;
  }

  btn.innerText = "A PROCESSAR...";
  btn.disabled = true;

  try {
    const res = await apiCall("validarPinERedefinir", { email, pin, novaSenha });
    if (res.sucesso) {
      showToast("Senha alterada com sucesso! Faça login.", "success");
      localStorage.removeItem("MAESTRO_RESET_EMAIL");
      sessionStorage.removeItem("MAESTRO_IAM_TEMP_PIN");
      switchView('view-login-fiscal');
    } else {
      showToast(res.erro, "error");
    }
  } catch (e) {
    showToast("Erro de conexão.", "error");
  } finally {
    btn.innerText = "REDEFINIR SENHA";
    btn.disabled = false;
  }
}

// ========================================================================
// 3. PRIVACIDADE DO ESTUDANTE (LGPD)
// ========================================================================

function obterCpfPrivacidadeEstudante() {
  const cacheBruto = localStorage.getItem("MAESTRO_WALLET_CACHE") || localStorage.getItem("MAESTRO_OFFLINE_WALLET") || "{}";

  try {
    const dados = JSON.parse(cacheBruto);
    return String(dados.cpf || dados.cpfAluno || "").replace(/\D/g, "");
  } catch (erro) {
    console.warn("Não foi possível ler o CPF da carteira local:", erro);
    return "";
  }
}

async function downloadDadosPessoais() {
  const cpf = obterCpfPrivacidadeEstudante();

  if (!cpf || cpf.length !== 11) {
    showToast("CPF não encontrado na sessão. Entre novamente no Cofre Digital.", "error");
    return;
  }

  showToast("Preparando seus dados pessoais...", "info");

  try {
    const res = await apiCall("exportarDadosEstudante", { cpf: cpf });

    if (!res || !res.sucesso) {
      showToast((res && res.erro) || "Não foi possível exportar seus dados.", "error");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.dados));
    const link = document.createElement("a");
    const dataArquivo = new Date().toISOString().slice(0, 10);

    link.setAttribute("href", dataStr);
    link.setAttribute("download", `dados_pessoais_maestro_${cpf}_${dataArquivo}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Arquivo JSON gerado com sucesso.", "success");
  } catch (erro) {
    console.error("Erro ao baixar dados pessoais:", erro);
    showToast("Falha de conexão ao exportar seus dados.", "error");
  }
}

async function confirmarExclusaoConta() {
  const cpf = obterCpfPrivacidadeEstudante();

  if (!cpf || cpf.length !== 11) {
    showToast("CPF não encontrado na sessão. Entre novamente no Cofre Digital.", "error");
    return;
  }

  const primeiraConfirmacao = window.confirm(
    "A anonimização da conta é irreversível. Seus dados pessoais, documentos e acesso ao Cofre Digital serão removidos do cadastro, mantendo apenas dados estatísticos como rota, turno, instituição e data de inscrição.\n\nDeseja continuar?"
  );

  if (!primeiraConfirmacao) return;

  const segundaConfirmacao = window.confirm(
    "Confirma definitivamente a solicitação de exclusão de conta? Esta ação não poderá ser desfeita."
  );

  if (!segundaConfirmacao) return;

  showToast("Enviando solicitação de anonimização...", "warning");

  try {
    const res = await apiCall("solicitarAnonimizacaoEstudante", { cpf: cpf });

    if (!res || !res.sucesso) {
      showToast((res && res.erro) || "Não foi possível anonimizar sua conta.", "error");
      return;
    }

    limparCarteiraLocalAposAnonimizacao();
    showToast(res.mensagem || "Conta anonimizada com sucesso.", "success");

    setTimeout(() => {
      switchView("view-aluno-menu");
    }, 1200);
  } catch (erro) {
    console.error("Erro ao solicitar anonimização:", erro);
    showToast("Falha de conexão ao solicitar a exclusão da conta.", "error");
  }
}

function limparCarteiraLocalAposAnonimizacao() {
  localStorage.removeItem("MAESTRO_EST_TOKEN");
  localStorage.removeItem("MAESTRO_WALLET_CACHE");
  localStorage.removeItem("MAESTRO_OFFLINE_WALLET");
  localStorage.removeItem("MAESTRO_WALLET_CREDS");
  localStorage.removeItem("MAESTRO_FCM_TOKEN");
  localStorage.removeItem("MAESTRO_FCM_TOKEN_TEMP");
  localStorage.removeItem("FCM_SYNCED_ID");

  if (typeof currentWalletId !== "undefined") currentWalletId = "";
  if (typeof currentWalletSenha !== "undefined") currentWalletSenha = "";
  if (typeof currentStudentName !== "undefined") currentStudentName = "";

  const walletContainer = document.getElementById("wallet-container");
  if (walletContainer) walletContainer.innerHTML = "";

  const walletActions = document.getElementById("wallet-actions");
  if (walletActions) walletActions.classList.add("hidden");

  const painelMobilidade = document.getElementById("view-mobilidade");
  if (painelMobilidade) painelMobilidade.style.display = "none";
}
