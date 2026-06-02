// ========================================================================
// MAESTRO DATA LAYER V2.1
// Foundation for Firestore-compatible frontend contracts.
// This file is intentionally side-effect light: it exposes helpers without
// changing the current apiCall behavior or the current UI rendering.
// ========================================================================

(function initMaestroDataLayer(window) {
  "use strict";

  const DATA_LAYER_VERSION = "2.3.1";
  const CACHE_SCHEMA_VERSION = "maestro-data-schema-v2";
  const OFFLINE_DB_NAME = "MaestroOfflineDB";
  const OFFLINE_DB_VERSION = 2;
  const SECOND_MS = 1000;
  const MINUTE_MS = SECOND_MS * 60;
  const HOUR_MS = MINUTE_MS * 60;
  const DAY_MS = HOUR_MS * 24;
  const OFFLINE_STORES = {
    inbox: "notifications",
    cache: "cacheEntries"
  };
  const STORAGE_KEYS = {
    tenantContext: "MAESTRO_TENANT_CONTEXT",
    themeConfig: "MAESTRO_THEME_CONFIG",
    studentIdentity: "MAESTRO_STUDENT_IDENTITY",
    operatorSession: "MAESTRO_OPERATOR_SESSION",
    semesterContext: "MAESTRO_SEMESTER_CONTEXT",
    cacheSchemaVersion: "MAESTRO_CACHE_SCHEMA_VERSION",
    cacheMeta: "MAESTRO_CACHE_META"
  };

  const CACHE_DOMAINS = {
    theme: {
      version: "theme-v2",
      ttlMs: DAY_MS * 7,
      primaryKey: "MAESTRO_THEME_CACHE",
      derivedKeys: [STORAGE_KEYS.themeConfig, STORAGE_KEYS.tenantContext, STORAGE_KEYS.semesterContext],
      keyPrefixes: ["MAESTRO_THEME_CACHE"]
    },
    wallet: {
      version: "wallet-v2",
      ttlMs: HOUR_MS * 12,
      primaryKey: "MAESTRO_WALLET_CACHE",
      derivedKeys: [STORAGE_KEYS.studentIdentity],
      legacyKeys: ["MAESTRO_WALLET_CACHE", "MAESTRO_OFFLINE_WALLET"],
      keyPrefixes: ["MAESTRO_WALLET_CACHE", "MAESTRO_OFFLINE_WALLET"],
      sensitiveKeys: ["MAESTRO_WALLET_CREDS", "MAESTRO_EST_TOKEN"]
    },
    dashboard: {
      version: "dashboard-v2",
      ttlMs: HOUR_MS * 6,
      primaryKey: "MAESTRO_DASH_STATS",
      derivedKeys: ["MAESTRO_DASH_STATS"],
      keyPrefixes: ["MAESTRO_DASH_STATS", "MAESTRO_DASHBOARD_CACHE"]
    },
    lists: {
      version: "lists-v1",
      ttlMs: HOUR_MS,
      primaryKey: "MAESTRO_LISTS_CACHE",
      derivedKeys: ["MAESTRO_LISTS_CACHE"],
      legacyKeys: ["MAESTRO_LISTA_ESTUDANTES"],
      keyPrefixes: ["MAESTRO_LISTS_CACHE"]
    },
    audit: {
      version: "audit-v1",
      ttlMs: MINUTE_MS * 5,
      primaryKey: "MAESTRO_AUDIT_CACHE",
      derivedKeys: ["MAESTRO_AUDIT_CACHE"],
      keyPrefixes: ["MAESTRO_AUDIT_CACHE"]
    },
    communication: {
      version: "communication-v1",
      ttlMs: MINUTE_MS * 10,
      primaryKey: "MAESTRO_COMMUNICATION_CACHE",
      derivedKeys: ["MAESTRO_COMMUNICATION_CACHE"],
      keyPrefixes: ["MAESTRO_COMMUNICATION_CACHE"]
    },
    mobility: {
      version: "mobility-v1",
      ttlMs: SECOND_MS * 30,
      primaryKey: "MAESTRO_MOBILITY_CACHE",
      derivedKeys: ["MAESTRO_MOBILITY_CACHE"],
      keyPrefixes: ["MAESTRO_MOBILITY_CACHE"]
    },
    session: {
      version: "session-v2",
      ttlMs: HOUR_MS * 8,
      primaryKey: "MAESTRO_SESSION_CACHE",
      derivedKeys: [STORAGE_KEYS.operatorSession],
      legacyKeys: ["MAESTRO_TOKEN"],
      keyPrefixes: ["MAESTRO_SESSION_CACHE"],
      sensitiveKeys: [
        "MAESTRO_TOKEN",
        "MAESTRO_OPERADOR_EMAIL",
        "MAESTRO_FCM_TOKEN",
        "MAESTRO_FCM_TOKEN_TEMP",
        "FCM_SYNCED_ID"
      ]
    }
  };

  const ASYNC_STATE_TYPES = {
    idle: "idle",
    loading: "loading",
    empty: "empty",
    error: "error",
    offline: "offline",
    stale: "stale",
    success: "success"
  };

  const BUSINESS_RULES = {
    muralWeeklyPostLimit: 5,
    stageUpdateLimitPerCycle: 1,
    walletTurnWindows: {
      MATUTINO: { start: "05:00", end: "10:30" },
      VESPERTINO: { start: "11:00", end: "16:30" },
      NOTURNO: { start: "17:00", end: "21:30" }
    }
  };

  const VISUAL_TOKEN_DEFAULTS = {
    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    light: {
      primary: "#0A3D6B",
      secondary: "#F8F9FA",
      accent: "#F29900"
    },
    dark: {
      primary: "#8AB4F8",
      secondary: "#121212",
      accent: "#F29900"
    },
    status: {
      success: "#10B981",
      warning: "#F59E0B",
      danger: "#EF4444",
      info: "#2563EB"
    },
    text: {
      light: {
        main: "#1F2937",
        sub: "#4B5563",
        muted: "#5E6A75",
        inverse: "#FFFFFF"
      },
      dark: {
        main: "#F3F4F6",
        sub: "#94A3B8",
        muted: "#A0AEC0",
        inverse: "#FFFFFF"
      }
    },
    surface: {
      light: {
        page: "#F8F9FA",
        card: "#FFFFFF",
        elevated: "rgba(255, 255, 255, 0.88)",
        muted: "#F1F5F9",
        hover: "rgba(10, 61, 107, 0.06)",
        border: "#E5E7EB",
        overlay: "rgba(15, 23, 42, 0.45)"
      },
      dark: {
        page: "#121212",
        card: "#1E1E1E",
        elevated: "rgba(15, 23, 42, 0.88)",
        muted: "#0F172A",
        hover: "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.08)",
        overlay: "rgba(0, 0, 0, 0.65)"
      }
    },
    shadow: {
      soft: "0 10px 30px rgba(15, 23, 42, 0.10)",
      raised: "0 20px 40px rgba(15, 23, 42, 0.16)",
      focus: "0 0 0 3px rgba(10, 61, 107, 0.22)"
    }
  };

  const PUBLIC_NAVIGATION_VIEWS = [
    "view-gateway",
    "view-hub",
    "view-aluno-menu",
    "view-inscricao",
    "view-consult",
    "view-resgate",
    "view-login",
    "view-login-fiscal",
    "view-validador",
    "view-mural",
    "view-recuperar-senha",
    "view-redefinir-senha",
    "view-nova-senha"
  ];

  const STUDENT_NAVIGATION_VIEWS = PUBLIC_NAVIGATION_VIEWS.concat([
    "view-wallet",
    "view-radar"
  ]);

  const NAVIGATION_MATRIX = {
    ANONIMO: {
      label: "Anonimo",
      defaultView: "view-hub",
      views: PUBLIC_NAVIGATION_VIEWS,
      actions: ["publico"]
    },
    ESTUDANTE: {
      label: "Estudante",
      defaultView: "view-aluno-menu",
      views: STUDENT_NAVIGATION_VIEWS,
      actions: ["publico", "estudante", "radar"]
    },
    MOTORISTA: {
      label: "Motorista",
      defaultView: "view-painel-motorista",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-painel-motorista",
        "view-fiscal",
        "view-radar"
      ]),
      actions: ["publico", "fiscalizar", "motoristaRotas", "reportarSos", "radar"]
    },
    FISCAL: {
      label: "Fiscal",
      defaultView: "view-admin-hub",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-fiscal",
        "view-notificacoes",
        "view-radar"
      ]),
      actions: ["publico", "fiscalizar", "encerrarRota", "reportarSos", "radar"]
    },
    OPERADOR: {
      label: "Operador",
      defaultView: "view-admin-hub",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-auditoria",
        "view-dashboard",
        "view-notificacoes"
      ]),
      actions: ["publico", "auditoria", "dashboard"]
    },
    SUPERVISOR: {
      label: "Supervisor",
      defaultView: "view-admin-hub",
      views: PUBLIC_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-fiscal",
        "view-auditoria",
        "view-dashboard",
        "view-semestres",
        "view-notificacoes",
        "view-radar"
      ]),
      actions: ["publico", "fiscalizar", "encerrarRota", "reportarSos", "gerirRotas", "auditoria", "comunicacao", "dashboard", "semestres", "radar"]
    },
    MODERADOR: {
      label: "Moderador",
      defaultView: "view-admin-hub",
      views: STUDENT_NAVIGATION_VIEWS.concat([
        "view-admin-hub",
        "view-fiscal",
        "view-auditoria",
        "view-dashboard",
        "view-semestres",
        "view-notificacoes",
        "view-moderador",
        "view-painel-motorista"
      ]),
      actions: ["publico", "estudante", "fiscalizar", "encerrarRota", "reportarSos", "gerirRotas", "auditoria", "comunicacao", "dashboard", "semestres", "salaMaquinas", "motoristaRotas", "radar"]
    }
  };

  const NAVIGATION_MENU_GROUPS = {
    "menu-grupo-campo": ["fiscalizar", "encerrarRota", "reportarSos"],
    "menu-grupo-secretaria": ["gerirRotas", "auditoria", "comunicacao", "dashboard", "semestres"],
    "menu-grupo-moderador": ["salaMaquinas"]
  };

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function safeString(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  function escapeHTML(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeText(value, fallback) {
    const text = safeString(value).replace(/[\u0000-\u001F\u007F]/g, " ");
    return text || safeString(fallback);
  }

  function safeMessage(value, fallback) {
    const message = safeText(value, fallback || "Mensagem indisponivel.");
    return message.length > 700 ? message.slice(0, 697) + "..." : message;
  }

  function safeAttr(value) {
    return escapeHTML(safeText(value));
  }

  function safeUrl(value) {
    const raw = safeString(value);
    if (!raw) return "";
    try {
      const parsed = new URL(raw, window.location && window.location.href ? window.location.href : "https://maestro.local/");
      const protocol = parsed.protocol.toLowerCase();
      if (["http:", "https:", "mailto:", "tel:"].includes(protocol)) return parsed.href;
      if (protocol === "data:" && /^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,/i.test(raw)) return raw;
      if (protocol === "blob:") return raw;
      return "";
    } catch (err) {
      if (/^\.{0,2}\//.test(raw)) return raw;
      return "";
    }
  }

  function safeUrlAttr(value) {
    return safeAttr(safeUrl(value));
  }

  function safeLines(value) {
    return escapeHTML(String(value === undefined || value === null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " "))
      .replace(/\r?\n/g, "<br>");
  }

  function safeDomId(value) {
    const normalized = removeDiacritics(safeText(value, "item")).replace(/[^A-Za-z0-9_-]+/g, "_");
    return (normalized || "item").slice(0, 80);
  }

  function safeJsStringAttr(value) {
    return safeAttr(JSON.stringify(String(value === undefined || value === null ? "" : value)));
  }

  function setSafeText(elementOrId, value, fallback) {
    const element = typeof elementOrId === "string" ? window.document.getElementById(elementOrId) : elementOrId;
    if (!element) return false;
    element.textContent = safeText(value, fallback);
    return true;
  }

  function sanitizeHTML(html) {
    const raw = String(html || "");
    if (!raw) return "";
    if (!window.document || !window.document.createElement) return escapeHTML(raw);

    const template = window.document.createElement("template");
    template.innerHTML = raw;
    const allowedTags = {
      A: true, B: true, BR: true, BUTTON: true, CODE: true, DIV: true, EM: true,
      H1: true, H2: true, H3: true, H4: true, H5: true, H6: true,
      IMG: true, LI: true, OL: true, P: true, SMALL: true, SPAN: true, STRONG: true,
      TABLE: true, TBODY: true, TD: true, TH: true, THEAD: true, TR: true, UL: true
    };
    const allowedAttr = /^(aria-[\w-]+|data-[\w-]+|class|id|role|title|type|disabled|tabindex)$/i;

    Array.from(template.content.querySelectorAll("*")).forEach(node => {
      if (!allowedTags[node.tagName]) {
        node.replaceWith(window.document.createTextNode(node.textContent || ""));
        return;
      }

      Array.from(node.attributes).forEach(attr => {
        const name = attr.name;
        const lowerName = name.toLowerCase();
        const value = attr.value;
        if (lowerName.indexOf("on") === 0 || lowerName === "style") {
          node.removeAttribute(name);
          return;
        }
        if (["href", "src"].includes(lowerName)) {
          const safe = safeUrl(value);
          if (safe) node.setAttribute(name, safe);
          else node.removeAttribute(name);
          return;
        }
        if (lowerName === "target") {
          node.setAttribute("target", value === "_blank" ? "_blank" : "_self");
          if (value === "_blank") node.setAttribute("rel", "noopener noreferrer");
          return;
        }
        if (lowerName === "rel") {
          node.setAttribute("rel", "noopener noreferrer");
          return;
        }
        if (!allowedAttr.test(name)) node.removeAttribute(name);
      });
    });

    return template.innerHTML;
  }

  function setSafeHTML(elementOrId, html) {
    const element = typeof elementOrId === "string" ? window.document.getElementById(elementOrId) : elementOrId;
    if (!element) return false;
    element.innerHTML = sanitizeHTML(html);
    return true;
  }

  function redactSensitiveText(value) {
    let text = safeString(value);
    if (!text) return text;
    text = text.replace(/(\d{3})\.?\d{3}\.?\d{3}-?(\d{2})/g, "$1.***.***-$2");
    text = text.replace(/([A-Z0-9._%+-])[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})/gi, "$1***@$2");
    text = text.replace(/\b(Bearer\s+)?[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g, "[token-redacted]");
    text = text.replace(/\b[A-Za-z0-9_-]{48,}\b/g, "[token-redacted]");
    return text;
  }

  function sanitizeLogDetails(value, depth) {
    const currentDepth = Number(depth) || 0;
    if (value instanceof Error) {
      return {
        name: safeString(value.name || "Error"),
        message: redactSensitiveText(value.message || ""),
        code: value.code || "",
        status: value.status || ""
      };
    }
    if (typeof value === "string") return redactSensitiveText(value);
    if (value === null || value === undefined || typeof value !== "object") return value;
    if (currentDepth >= 3) return "[object-redacted]";
    if (Array.isArray(value)) {
      return value.slice(0, 10).map(item => sanitizeLogDetails(item, currentDepth + 1));
    }

    const sanitized = {};
    Object.keys(value).slice(0, 24).forEach(key => {
      if (/cpf|token|senha|password|pin|email|base64|foto|arquivo|documento|auth|cookie|payload/i.test(key)) {
        sanitized[key] = "[redacted]";
      } else {
        sanitized[key] = sanitizeLogDetails(value[key], currentDepth + 1);
      }
    });
    return sanitized;
  }

  function logSafe(level, message, details) {
    const consoleRef = window.console || {};
    const method = ["error", "warn", "info", "debug", "log"].includes(level) ? level : "log";
    const writer = typeof consoleRef[method] === "function" ? consoleRef[method].bind(consoleRef) : null;
    if (!writer) return false;
    const safeMessage = redactSensitiveText(message);
    if (details === undefined) writer(safeMessage);
    else writer(safeMessage, sanitizeLogDetails(details, 0));
    return true;
  }

  function renderAsyncState(type, options) {
    const opts = options || {};
    const state = ASYNC_STATE_TYPES[type] ? type : ASYNC_STATE_TYPES.idle;
    const defaults = {
      offline: { title: "Modo offline", message: "Dados exibidos do cache local." },
      stale: { title: "Dados em cache", message: "Conteudo atualizado em segundo plano." },
      success: { title: "Atualizado", message: "Dados sincronizados com sucesso." },
      empty: { title: "Nada encontrado", message: "" },
      error: { title: "Nao foi possivel carregar", message: "" },
      loading: { title: "", message: "A carregar..." }
    };
    const fallback = defaults[state] || {};
    const title = safeText(opts.title || fallback.title || "", "");
    const message = safeMessage(opts.message || fallback.message || "", "");
    const icon = safeText(opts.icon || "", "");
    const extraClass = safeText(opts.className || "", "").replace(/[^A-Za-z0-9_\-\s]/g, "");
    const loader = state === ASYNC_STATE_TYPES.loading ? '<div class="loader loader-center"></div>' : "";
    const iconHtml = icon ? `<span class="dynamic-state-icon" aria-hidden="true">${escapeHTML(icon)}</span>` : "";
    const titleHtml = title ? `<strong class="dynamic-state-title">${escapeHTML(title)}</strong>` : "";
    const messageHtml = message ? `<p class="dynamic-state-message">${escapeHTML(message)}</p>` : "";
    const staleMeta = opts.updatedAt ? `<small class="dynamic-state-meta">Atualizado em ${escapeHTML(opts.updatedAt)}</small>` : "";

    return `<div class="dynamic-state-box dynamic-${state}-state ${extraClass}" data-async-state="${state}" role="${state === "error" ? "alert" : "status"}">${loader}${iconHtml}${titleHtml}${messageHtml}${staleMeta}</div>`;
  }

  function setAsyncState(elementOrId, type, options) {
    return setSafeHTML(elementOrId, renderAsyncState(type, options || {}));
  }

  function formatCacheTimestamp(value) {
    const time = toTimestamp(value);
    if (!time) return "";
    try {
      return new Date(time).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (err) {
      return "";
    }
  }

  function renderCacheState(domain, cacheResult, options) {
    const opts = options || {};
    const cache = cacheResult || {};
    const state = opts.state || (cache.expired ? "offline" : (cache.stale ? "stale" : "success"));
    const updatedAt = opts.updatedAt || (cache.meta && cache.meta.updatedAt ? formatCacheTimestamp(cache.meta.updatedAt) : "");
    return renderAsyncState(state, {
      title: opts.title,
      message: opts.message,
      className: opts.className || ("cache-state cache-state-" + safeDomId(domain || "generic")),
      updatedAt: updatedAt
    });
  }

  function pickFirst() {
    for (let i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (value !== undefined && value !== null && safeString(value) !== "") return value;
    }
    return "";
  }

  function pickPath(source, paths, fallback) {
    if (!source) return fallback;
    for (let i = 0; i < paths.length; i += 1) {
      const parts = String(paths[i]).split(".");
      let cursor = source;
      let found = true;
      for (let j = 0; j < parts.length; j += 1) {
        if (!isObject(cursor) && !Array.isArray(cursor)) {
          found = false;
          break;
        }
        if (!hasOwn(cursor, parts[j])) {
          found = false;
          break;
        }
        cursor = cursor[parts[j]];
      }
      if (found && cursor !== undefined && cursor !== null && safeString(cursor) !== "") return cursor;
    }
    return fallback;
  }

  function cleanCpf(value) {
    return safeString(value).replace(/\D/g, "");
  }

  function removeDiacritics(value) {
    const text = safeString(value);
    return typeof text.normalize === "function"
      ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : text;
  }

  function normalizeUpper(value) {
    return removeDiacritics(value).toUpperCase();
  }

  function normalizeSimNao(value) {
    if (value === true) return "Sim";
    if (value === false) return "Nao";
    const normalized = normalizeUpper(value);
    if (["SIM", "S", "TRUE", "1", "YES"].includes(normalized)) return "Sim";
    if (["NAO", "N", "FALSE", "0", "NO"].includes(normalized)) return "Nao";
    return safeString(value);
  }

  function normalizeAccessProfile(profile) {
    const normalized = normalizeUpper(profile);
    const aliases = {
      ADMIN: "MODERADOR",
      ADMINISTRADOR: "MODERADOR",
      GESTOR: "SUPERVISOR",
      GESTORA: "SUPERVISOR",
      SECRETARIA: "OPERADOR",
      ATENDENTE: "OPERADOR",
      ALUNO: "ESTUDANTE",
      ALUNA: "ESTUDANTE",
      ESTUDANTE: "ESTUDANTE",
      ANONIMO: "ANONIMO",
      ANONIMA: "ANONIMO"
    };
    const profileKey = aliases[normalized] || normalized;
    return NAVIGATION_MATRIX[profileKey] ? profileKey : "ANONIMO";
  }

  function normalizeTurno(value) {
    const normalized = normalizeUpper(value);
    if (["MATUTINO", "MANHA"].includes(normalized)) return "MATUTINO";
    if (["VESPERTINO", "TARDE"].includes(normalized)) return "VESPERTINO";
    if (["NOTURNO", "NOITE"].includes(normalized)) return "NOTURNO";
    return normalized;
  }

  function toArray(value) {
    if (Array.isArray(value)) return value.filter(item => safeString(item) !== "");
    if (value === undefined || value === null || value === "") return [];
    return String(value)
      .split(/[;,|]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function uniqueArray(values) {
    const seen = {};
    return toArray(values).filter(item => {
      const key = normalizeUpper(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function safeJsonParse(value, fallback) {
    try {
      if (!value) return fallback;
      return JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }

  function getLocal(key, fallback) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) || fallback : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function setLocal(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeLocal(key) {
    try {
      if (window.localStorage) window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  function getJson(key, fallback) {
    return safeJsonParse(getLocal(key, ""), fallback);
  }

  function setJson(key, value) {
    return setLocal(key, JSON.stringify(value));
  }

  function toTimestamp(value) {
    if (!value) return 0;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function getCacheDomainConfig(domain) {
    return CACHE_DOMAINS[safeString(domain)] || null;
  }

  function getDomainStorageKey(domain, options) {
    const config = getCacheDomainConfig(domain);
    const opts = options || {};
    return safeString(opts.key || opts.storageKey || (config && (config.primaryKey || config.storageKey)) || ("MAESTRO_CACHE_" + safeString(domain).toUpperCase()));
  }

  function getCurrentTenantIdSafe() {
    try {
      return getTenantContext().tenantId || "";
    } catch (err) {
      return "";
    }
  }

  function getCurrentSemesterIdSafe() {
    try {
      return getSemesterContext().semestreId || "";
    } catch (err) {
      return "";
    }
  }

  function resolveCacheTtlMs(domain, options) {
    const config = getCacheDomainConfig(domain);
    const opts = options || {};
    if (Number.isFinite(Number(opts.ttlMs))) return Math.max(0, Number(opts.ttlMs));
    if (config && Number.isFinite(Number(config.ttlMs))) return Math.max(0, Number(config.ttlMs));
    return 0;
  }

  function buildCacheEnvelope(domain, data, options) {
    const config = getCacheDomainConfig(domain);
    const opts = options || {};
    const now = new Date();
    const ttlMs = resolveCacheTtlMs(domain, opts);
    const staleMs = Number.isFinite(Number(opts.staleMs)) ? Math.max(0, Number(opts.staleMs)) : Math.floor(ttlMs / 2);
    const updatedAt = now.toISOString();
    const expiresAt = ttlMs > 0 ? new Date(now.getTime() + ttlMs).toISOString() : "";
    const staleAt = staleMs > 0 ? new Date(now.getTime() + staleMs).toISOString() : "";

    return {
      __maestroCache: true,
      schemaVersion: CACHE_SCHEMA_VERSION,
      domain: safeString(domain),
      domainVersion: config ? config.version : "",
      appVersion: safeString(window.MAESTRO_PWA_VERSION || ""),
      tenantId: opts.tenantId !== undefined ? safeString(opts.tenantId) : getCurrentTenantIdSafe(),
      semestreId: opts.semestreId !== undefined ? safeString(opts.semestreId) : getCurrentSemesterIdSafe(),
      updatedAt: updatedAt,
      staleAt: staleAt,
      expiresAt: expiresAt,
      ttlMs: ttlMs,
      source: safeString(opts.source || "runtime"),
      data: data
    };
  }

  function isCacheEnvelope(value) {
    return isObject(value) && value.__maestroCache === true;
  }

  function readCacheEnvelope(key) {
    const stored = getJson(key, null);
    return isCacheEnvelope(stored) ? stored : null;
  }

  function evaluateCacheEnvelope(envelope, options) {
    const opts = options || {};
    if (!isCacheEnvelope(envelope)) {
      return { hit: false, fresh: false, stale: false, expired: false, reason: "missing", data: null, meta: null };
    }

    const domain = envelope.domain;
    const config = getCacheDomainConfig(domain);
    const now = Date.now();
    const expiredAt = toTimestamp(envelope.expiresAt);
    const staleAt = toTimestamp(envelope.staleAt);
    const expired = expiredAt > 0 && now > expiredAt;
    const stale = !expired && staleAt > 0 && now > staleAt;
    const versionMismatch = config && envelope.domainVersion && envelope.domainVersion !== config.version;
    const schemaMismatch = envelope.schemaVersion !== CACHE_SCHEMA_VERSION;
    const tenantMismatch = opts.tenantId && envelope.tenantId && opts.tenantId !== envelope.tenantId;
    const semesterMismatch = opts.semestreId && envelope.semestreId && opts.semestreId !== envelope.semestreId;
    let reason = "";

    if (schemaMismatch) reason = "schema";
    else if (versionMismatch) reason = "domain_version";
    else if (tenantMismatch) reason = "tenant";
    else if (semesterMismatch) reason = "semester";
    else if (expired) reason = "expired";
    else if (stale) reason = "stale";
    else reason = "fresh";

    const validScope = !schemaMismatch && !versionMismatch && !tenantMismatch && !semesterMismatch;
    return {
      hit: validScope && (!expired || opts.allowExpired === true),
      fresh: validScope && !expired && !stale,
      stale: validScope && stale,
      expired: validScope && expired,
      reason: reason,
      data: validScope && (!expired || opts.allowExpired === true) ? envelope.data : null,
      meta: envelope
    };
  }

  function setDomainCache(domain, data, options) {
    const key = getDomainStorageKey(domain, options);
    if (!key) return null;
    const envelope = buildCacheEnvelope(domain, data, options || {});
    setJson(key, envelope);
    markCacheDomain(domain, mergeDefined(options || {}, {
      key: key,
      ttlMs: envelope.ttlMs,
      staleAt: envelope.staleAt,
      expiresAt: envelope.expiresAt
    }));
    return envelope;
  }

  function getDomainCache(domain, options) {
    const key = getDomainStorageKey(domain, options);
    if (!key) return { hit: false, fresh: false, stale: false, expired: false, reason: "missing", data: null, meta: null };
    const envelope = readCacheEnvelope(key);
    return evaluateCacheEnvelope(envelope, options || {});
  }

  function removeDomainCache(domain, options) {
    const key = getDomainStorageKey(domain, options);
    if (key) removeLocal(key);
    return invalidateCacheDomain(domain, options || {});
  }

  function executarIndexedDBRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha no IndexedDB."));
    });
  }

  function prepararStoresOffline(db) {
    if (!db.objectStoreNames.contains(OFFLINE_STORES.inbox)) {
      db.createObjectStore(OFFLINE_STORES.inbox, { keyPath: "timestamp" });
    }

    if (!db.objectStoreNames.contains(OFFLINE_STORES.cache)) {
      const cacheStore = db.createObjectStore(OFFLINE_STORES.cache, { keyPath: "key" });
      cacheStore.createIndex("domain", "domain", { unique: false });
      cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
      cacheStore.createIndex("updatedAt", "updatedAt", { unique: false });
    }
  }

  function openOfflineDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponivel neste navegador."));
        return;
      }

      const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      request.onupgradeneeded = (event) => prepararStoresOffline(event.target.result);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir cache offline."));
      request.onblocked = () => reject(new Error("Cache offline bloqueado por outra aba."));
    });
  }

  async function putOfflineCacheEntry(domain, key, data, options) {
    const storageKey = safeString(key || getDomainStorageKey(domain, options));
    if (!storageKey) return null;
    const envelope = buildCacheEnvelope(domain, data, mergeDefined(options || {}, { key: storageKey }));
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.cache, "readwrite");
    const store = tx.objectStore(OFFLINE_STORES.cache);
    await executarIndexedDBRequest(store.put(Object.assign({ key: storageKey }, envelope)));
    db.close();
    return envelope;
  }

  async function getOfflineCacheEntry(key, options) {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.cache, "readonly");
    const store = tx.objectStore(OFFLINE_STORES.cache);
    const envelope = await executarIndexedDBRequest(store.get(safeString(key)));
    db.close();
    return evaluateCacheEnvelope(envelope, options || {});
  }

  async function deleteOfflineCacheEntry(key) {
    const storageKey = safeString(key);
    if (!storageKey) return false;
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.cache, "readwrite");
    const store = tx.objectStore(OFFLINE_STORES.cache);
    await executarIndexedDBRequest(store.delete(storageKey));
    db.close();
    return true;
  }

  async function clearOfflineCacheDomain(domain) {
    const targetDomain = safeString(domain);
    if (!targetDomain) return false;
    const readDb = await openOfflineDB();
    const readTx = readDb.transaction(OFFLINE_STORES.cache, "readonly");
    const readStore = readTx.objectStore(OFFLINE_STORES.cache);
    const allEntries = await executarIndexedDBRequest(readStore.getAll());
    readDb.close();

    const keys = (allEntries || [])
      .filter(entry => safeString(entry && entry.domain) === targetDomain)
      .map(entry => entry.key)
      .filter(Boolean);
    if (!keys.length) return true;

    const writeDb = await openOfflineDB();
    const writeTx = writeDb.transaction(OFFLINE_STORES.cache, "readwrite");
    const writeStore = writeTx.objectStore(OFFLINE_STORES.cache);
    await Promise.all(keys.map(key => executarIndexedDBRequest(writeStore.delete(key))));
    writeDb.close();
    return true;
  }

  async function clearOfflineStore(storeName) {
    const name = safeString(storeName);
    if (!name || !Object.keys(OFFLINE_STORES).some(key => OFFLINE_STORES[key] === name)) return false;
    const db = await openOfflineDB();
    const tx = db.transaction(name, "readwrite");
    const store = tx.objectStore(name);
    await executarIndexedDBRequest(store.clear());
    db.close();
    return true;
  }

  async function deleteExpiredOfflineCacheEntries() {
    const readDb = await openOfflineDB();
    const readTx = readDb.transaction(OFFLINE_STORES.cache, "readonly");
    const readStore = readTx.objectStore(OFFLINE_STORES.cache);
    const allEntries = await executarIndexedDBRequest(readStore.getAll());
    readDb.close();

    const now = Date.now();
    const expiredKeys = (allEntries || [])
      .filter(entry => {
        const expiresAt = toTimestamp(entry && entry.expiresAt);
        return expiresAt > 0 && now > expiresAt;
      })
      .map(entry => entry.key)
      .filter(Boolean);

    if (!expiredKeys.length) return true;

    const writeDb = await openOfflineDB();
    const writeTx = writeDb.transaction(OFFLINE_STORES.cache, "readwrite");
    const writeStore = writeTx.objectStore(OFFLINE_STORES.cache);
    await Promise.all(expiredKeys.map(key => executarIndexedDBRequest(writeStore.delete(key))));
    writeDb.close();
    return true;
  }

  function getCacheMetaRoot() {
    const meta = getJson(STORAGE_KEYS.cacheMeta, {});
    if (!isObject(meta.domains)) meta.domains = {};
    if (!meta.schemaVersion) meta.schemaVersion = getLocal(STORAGE_KEYS.cacheSchemaVersion, "") || CACHE_SCHEMA_VERSION;
    return meta;
  }

  function setCacheMetaRoot(meta) {
    const next = isObject(meta) ? meta : {};
    next.schemaVersion = CACHE_SCHEMA_VERSION;
    if (!isObject(next.domains)) next.domains = {};
    setLocal(STORAGE_KEYS.cacheSchemaVersion, CACHE_SCHEMA_VERSION);
    return setJson(STORAGE_KEYS.cacheMeta, next);
  }

  function markCacheDomain(domain, details) {
    const config = CACHE_DOMAINS[domain];
    if (!config) return null;
    const meta = getCacheMetaRoot();
    const payload = details || {};
    const ttlMs = resolveCacheTtlMs(domain, payload);
    const updatedAt = new Date();
    const expiresAt = payload.expiresAt || (ttlMs > 0 ? new Date(updatedAt.getTime() + ttlMs).toISOString() : "");
    const staleAt = payload.staleAt || (ttlMs > 0 ? new Date(updatedAt.getTime() + Math.floor(ttlMs / 2)).toISOString() : "");
    meta.domains[domain] = mergeDefined(meta.domains[domain] || {}, {
      version: config.version,
      updatedAt: updatedAt.toISOString(),
      staleAt: staleAt,
      expiresAt: expiresAt,
      ttlMs: ttlMs,
      schemaVersion: CACHE_SCHEMA_VERSION,
      tenantId: payload.tenantId,
      semestreId: payload.semestreId,
      appVersion: safeString(window.MAESTRO_PWA_VERSION || ""),
      source: payload.source || "runtime",
      key: payload.key
    });
    setCacheMetaRoot(meta);
    return meta.domains[domain];
  }

  function getCacheDomainMeta(domain) {
    const meta = getCacheMetaRoot();
    return meta.domains[domain] || null;
  }

  function isCacheDomainFresh(domain, options) {
    const config = CACHE_DOMAINS[domain];
    if (!config) return false;
    const opts = options || {};
    const meta = getCacheDomainMeta(domain);
    if (!meta || meta.version !== config.version || meta.schemaVersion !== CACHE_SCHEMA_VERSION) {
      return Boolean(opts.allowLegacy);
    }
    if (opts.tenantId && meta.tenantId && meta.tenantId !== opts.tenantId) return false;
    if (opts.semestreId && meta.semestreId && meta.semestreId !== opts.semestreId) return false;
    if (meta.expiresAt) {
      const expiresAt = new Date(meta.expiresAt).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) return false;
    }
    if (opts.maxAgeMs && meta.updatedAt) {
      const updatedAt = new Date(meta.updatedAt).getTime();
      if (Number.isFinite(updatedAt) && Date.now() - updatedAt > opts.maxAgeMs) return false;
    }
    return true;
  }

  function getLocalKeysByPrefixes(prefixes) {
    const result = [];
    const normalizedPrefixes = toArray(prefixes).filter(Boolean);
    if (!normalizedPrefixes.length || !window.localStorage) return result;
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && normalizedPrefixes.some(prefix => key.indexOf(prefix) === 0)) result.push(key);
      }
    } catch (err) {
      return result;
    }
    return result;
  }

  function invalidateCacheDomain(domain, options) {
    const config = CACHE_DOMAINS[domain];
    if (!config) return false;
    const opts = options || {};
    const exactKeys = (config.derivedKeys || []).concat([config.primaryKey || ""]);
    if (opts.includeLegacy) exactKeys.push.apply(exactKeys, config.legacyKeys || []);
    if (opts.includeSensitive) exactKeys.push.apply(exactKeys, config.sensitiveKeys || []);
    const prefixedKeys = opts.includeCustom === false ? [] : getLocalKeysByPrefixes(config.keyPrefixes || []);
    const keys = {};
    exactKeys.concat(prefixedKeys).filter(Boolean).forEach(key => { keys[key] = true; });
    Object.keys(keys).forEach(removeLocal);
    const meta = getCacheMetaRoot();
    if (meta.domains) delete meta.domains[domain];
    setCacheMetaRoot(meta);
    return true;
  }

  async function clearCacheDomains(domains, options) {
    const opts = options || {};
    const targetDomains = toArray(domains).length
      ? toArray(domains).map(safeString).filter(domain => CACHE_DOMAINS[domain])
      : Object.keys(CACHE_DOMAINS);
    const uniqueDomains = uniqueArray(targetDomains);

    uniqueDomains.forEach(domain => invalidateCacheDomain(domain, {
      includeLegacy: opts.includeLegacy !== false,
      includeCustom: opts.includeCustom !== false,
      includeSensitive: opts.includeSensitive === true
    }));

    if (opts.includeIndexedDB !== false) {
      await Promise.all(uniqueDomains.map(domain => clearOfflineCacheDomain(domain).catch(() => false)));
      if (opts.pruneExpired !== false) await deleteExpiredOfflineCacheEntries().catch(() => false);
    }

    return {
      sucesso: true,
      domains: uniqueDomains
    };
  }

  function ensureStorageSchemaVersion() {
    const current = getLocal(STORAGE_KEYS.cacheSchemaVersion, "");
    const changed = current !== CACHE_SCHEMA_VERSION;
    if (changed && current) {
      ["theme", "dashboard", "session", "lists", "audit", "communication", "mobility"].forEach(domain => invalidateCacheDomain(domain));
    }
    setLocal(STORAGE_KEYS.cacheSchemaVersion, CACHE_SCHEMA_VERSION);
    const meta = getCacheMetaRoot();
    meta.schemaVersion = CACHE_SCHEMA_VERSION;
    setCacheMetaRoot(meta);
    return { changed: changed, previous: current, current: CACHE_SCHEMA_VERSION };
  }

  function mergeDefined() {
    const result = {};
    for (let i = 0; i < arguments.length; i += 1) {
      const source = arguments[i] || {};
      Object.keys(source).forEach(key => {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") result[key] = value;
      });
    }
    return result;
  }

  function sanitizeCssColor(value, fallback) {
    const color = safeString(value);
    const safeFallback = safeString(fallback);
    if (!color) return safeFallback;
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color;
    if (/^rgba?\(\s*[\d\s.,%+-]+\)$/i.test(color)) return color;
    if (/^hsla?\(\s*[\d\s.,%+-]+\)$/i.test(color)) return color;
    if (/^[a-z]+$/i.test(color)) {
      try {
        if (window.CSS && typeof window.CSS.supports === "function" && window.CSS.supports("color", color)) {
          return color;
        }
      } catch (err) {
        return safeFallback;
      }
    }
    return safeFallback;
  }

  function isAdaptedThemeConfig(config) {
    return isObject(config) && (isObject(config.colors) || isObject(config.brand) || isObject(config.logos));
  }

  function resolveThemeMode(options) {
    if (options && hasOwn(options, "dark")) return options.dark ? "dark" : "light";
    if (options && options.mode) return options.mode === "dark" ? "dark" : "light";
    return window.document && window.document.body && window.document.body.classList.contains("dark-theme")
      ? "dark"
      : "light";
  }

  function buildVisualTokens(themeConfig, options) {
    const config = isAdaptedThemeConfig(themeConfig)
      ? themeConfig
      : adaptThemeConfig(themeConfig || getThemeConfig() || {});
    const colors = config.colors || {};
    const logos = config.logos || {};
    const brand = config.brand || {};
    const pwa = config.pwa || {};
    const mode = resolveThemeMode(options || {});

    const light = {
      primary: sanitizeCssColor(colors.light && colors.light.primary, VISUAL_TOKEN_DEFAULTS.light.primary),
      secondary: sanitizeCssColor(colors.light && colors.light.secondary, VISUAL_TOKEN_DEFAULTS.light.secondary),
      accent: sanitizeCssColor(colors.light && colors.light.accent, VISUAL_TOKEN_DEFAULTS.light.accent)
    };
    const dark = {
      primary: sanitizeCssColor(colors.dark && colors.dark.primary, light.primary || VISUAL_TOKEN_DEFAULTS.dark.primary),
      secondary: sanitizeCssColor(colors.dark && colors.dark.secondary, VISUAL_TOKEN_DEFAULTS.dark.secondary),
      accent: sanitizeCssColor(colors.dark && colors.dark.accent, light.accent || VISUAL_TOKEN_DEFAULTS.dark.accent)
    };
    const active = mode === "dark" ? dark : light;
    const text = VISUAL_TOKEN_DEFAULTS.text[mode] || VISUAL_TOKEN_DEFAULTS.text.light;
    const surfaceDefaults = VISUAL_TOKEN_DEFAULTS.surface[mode] || VISUAL_TOKEN_DEFAULTS.surface.light;
    const surface = {
      page: sanitizeCssColor(active.secondary, surfaceDefaults.page),
      card: surfaceDefaults.card,
      elevated: surfaceDefaults.elevated,
      muted: surfaceDefaults.muted,
      hover: surfaceDefaults.hover,
      border: sanitizeCssColor(surfaceDefaults.border, mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB"),
      overlay: surfaceDefaults.overlay
    };
    const logo = safeUrl(mode === "dark"
      ? pickFirst(logos.dark, logos.light, logos.emblem, pwa.icon)
      : pickFirst(logos.light, logos.emblem, logos.dark, pwa.icon));

    return {
      mode: mode,
      active: active,
      colors: { light: light, dark: dark },
      brand: brand,
      text: text,
      surface: surface,
      assets: {
        logo: logo,
        logoLight: safeUrl(logos.light),
        logoDark: safeUrl(logos.dark),
        emblem: safeUrl(logos.emblem),
        appIcon: safeUrl(logos.appIcon || pwa.icon)
      },
      typography: {
        fontFamily: VISUAL_TOKEN_DEFAULTS.fontFamily,
        baseFamily: "Poppins"
      },
      cssVars: {
        "--maestro-font-family": VISUAL_TOKEN_DEFAULTS.fontFamily,
        "--font-main": VISUAL_TOKEN_DEFAULTS.fontFamily,
        "--maestro-primary": active.primary,
        "--maestro-secondary": active.secondary,
        "--maestro-accent": active.accent,
        "--maestro-primary-light": light.primary,
        "--maestro-secondary-light": light.secondary,
        "--maestro-accent-light": light.accent,
        "--maestro-primary-dark": dark.primary,
        "--maestro-secondary-dark": dark.secondary,
        "--maestro-accent-dark": dark.accent,
        "--maestro-color-primary": active.primary,
        "--maestro-color-secondary": active.secondary,
        "--maestro-color-accent": active.accent,
        "--maestro-color-primary-light": light.primary,
        "--maestro-color-secondary-light": light.secondary,
        "--maestro-color-accent-light": light.accent,
        "--maestro-color-primary-dark": dark.primary,
        "--maestro-color-secondary-dark": dark.secondary,
        "--maestro-color-accent-dark": dark.accent,
        "--maestro-color-success": VISUAL_TOKEN_DEFAULTS.status.success,
        "--maestro-color-warning": VISUAL_TOKEN_DEFAULTS.status.warning,
        "--maestro-color-danger": VISUAL_TOKEN_DEFAULTS.status.danger,
        "--maestro-color-info": VISUAL_TOKEN_DEFAULTS.status.info,
        "--maestro-text-main": text.main,
        "--maestro-text-sub": text.sub,
        "--maestro-text-muted": text.muted,
        "--maestro-text-inverse": text.inverse,
        "--maestro-surface-page": surface.page,
        "--maestro-surface-card": surface.card,
        "--maestro-surface-elevated": surface.elevated,
        "--maestro-surface-muted": surface.muted,
        "--maestro-surface-hover": surface.hover,
        "--maestro-surface-overlay": surface.overlay,
        "--maestro-border-color": surface.border,
        "--maestro-state-success": VISUAL_TOKEN_DEFAULTS.status.success,
        "--maestro-state-warning": VISUAL_TOKEN_DEFAULTS.status.warning,
        "--maestro-state-danger": VISUAL_TOKEN_DEFAULTS.status.danger,
        "--maestro-state-info": VISUAL_TOKEN_DEFAULTS.status.info,
        "--maestro-space-1": "4px",
        "--maestro-space-2": "8px",
        "--maestro-space-3": "12px",
        "--maestro-space-4": "16px",
        "--maestro-space-5": "24px",
        "--maestro-space-6": "32px",
        "--maestro-radius-sm": "6px",
        "--maestro-radius-md": "8px",
        "--maestro-radius-lg": "12px",
        "--maestro-radius-xl": "20px",
        "--maestro-shadow-soft": VISUAL_TOKEN_DEFAULTS.shadow.soft,
        "--maestro-shadow-raised": VISUAL_TOKEN_DEFAULTS.shadow.raised,
        "--maestro-focus-ring": VISUAL_TOKEN_DEFAULTS.shadow.focus,
        "--primary": active.primary,
        "--secondary": active.secondary,
        "--accent": active.accent,
        "--success": VISUAL_TOKEN_DEFAULTS.status.success,
        "--warning": VISUAL_TOKEN_DEFAULTS.status.warning,
        "--danger": VISUAL_TOKEN_DEFAULTS.status.danger,
        "--info": VISUAL_TOKEN_DEFAULTS.status.info,
        "--text-main": text.main,
        "--text-sub": text.sub,
        "--text-muted": text.muted,
        "--text-light": text.inverse,
        "--bg-body": surface.page,
        "--bg-surface": surface.card,
        "--bg-hover": surface.hover,
        "--border": surface.border,
        "--form-bg": surface.card,
        "--bg-dark": VISUAL_TOKEN_DEFAULTS.surface.dark.page,
        "--card-dark": VISUAL_TOKEN_DEFAULTS.surface.dark.card,
        "--cor-voltar-alerta": VISUAL_TOKEN_DEFAULTS.status.danger
      }
    };
  }

  function safeCssVarName(name) {
    return /^--[A-Za-z0-9_-]+$/.test(String(name || ""));
  }

  function safeCssVarValue(value) {
    return String(value || "")
      .replace(/[{}<>;]/g, "")
      .trim();
  }

  function renderDynamicThemeCss(cssVars) {
    return Object.keys(cssVars || {})
      .filter(safeCssVarName)
      .map(name => `${name}: ${safeCssVarValue(cssVars[name])};`)
      .join("\n");
  }

  function ensureThemeStyleElement(doc) {
    let styleEl = doc.getElementById("maestro-dynamic-theme-vars");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "maestro-dynamic-theme-vars";
      styleEl.setAttribute("data-owner", "MaestroTheme");
      doc.head.appendChild(styleEl);
    }
    return styleEl;
  }

  function applyVisualTokens(themeConfig, options) {
    const tokens = buildVisualTokens(themeConfig, options || {});
    const doc = window.document;
    if (!doc) return tokens;

    const root = doc.documentElement;
    const cssVars = renderDynamicThemeCss(tokens.cssVars);
    if (cssVars) {
      const styleEl = ensureThemeStyleElement(doc);
      styleEl.textContent = `:root, body {\n${cssVars}\n}`;
    }

    if (root) {
      root.setAttribute("data-maestro-theme", tokens.mode);
    }

    if (doc.body) {
      doc.body.setAttribute("data-maestro-theme", tokens.mode);
      if (tokens.brand && tokens.brand.secretaria) {
        doc.body.setAttribute("data-maestro-secretaria", safeText(tokens.brand.secretaria).slice(0, 80));
      }
    }

    const metaThemeColor = doc.getElementById("meta-theme-color");
    if (metaThemeColor) metaThemeColor.content = tokens.active.primary;
    return tokens;
  }

  function getToken(kind) {
    if (kind === "operator") return getLocal("MAESTRO_TOKEN", "");
    if (kind === "student") return getLocal("MAESTRO_EST_TOKEN", "");
    return getLocal("MAESTRO_TOKEN", "") || getLocal("MAESTRO_EST_TOKEN", "");
  }

  function getTenantContext() {
    const stored = getJson(STORAGE_KEYS.tenantContext, {});
    return mergeDefined({
      tenantId: pickFirst(stored.tenantId, stored.tenantID, stored.tenant_id),
      clientUrl: pickFirst(stored.clientUrl, getLocal("MAESTRO_CLIENT_URL", ""), window.GAS_URL),
      cidade: pickFirst(stored.cidade, stored.cidadeAlvo),
      cepsValidos: toArray(stored.cepsValidos || stored.CEPS_VALIDOS),
      source: stored.source || "local"
    });
  }

  function setTenantContext(context) {
    const current = getTenantContext();
    const next = mergeDefined(current, {
      tenantId: pickFirst(context && context.tenantId, context && context.tenantID, context && context.tenant_id),
      clientUrl: pickFirst(context && context.clientUrl, context && context.url, context && context.LINK_PWA),
      cidade: pickFirst(context && context.cidade, context && context.CIDADE_ALVO),
      cepsValidos: toArray((context && (context.cepsValidos || context.CEPS_VALIDOS)) || current.cepsValidos),
      source: (context && context.source) || "runtime"
    });
    setJson(STORAGE_KEYS.tenantContext, next);
    return next;
  }

  function getSemesterContext() {
    const stored = getJson(STORAGE_KEYS.semesterContext, {});
    return mergeDefined({
      semestreId: pickFirst(stored.semestreId, stored.activeSemesterId, stored.semestreAtual),
      label: pickFirst(stored.label, stored.nome, stored.semestre),
      docsValidityMonths: toNumber(stored.docsValidityMonths, null),
      lgpdRetentionMonths: toNumber(stored.lgpdRetentionMonths, null),
      source: stored.source || "local"
    });
  }

  function setSemesterContext(context) {
    const next = adaptSemesterContext(context || {}, getSemesterContext());
    setJson(STORAGE_KEYS.semesterContext, next);
    return next;
  }

  function adaptSemesterContext(raw, fallback) {
    const source = raw || {};
    const current = fallback || {};
    return mergeDefined(current, {
      semestreId: pickFirst(source.semestreId, source.activeSemesterId, source.semestreAtual),
      label: pickFirst(source.label, source.nome, source.semestre),
      docsValidityMonths: toNumber(source.docsValidityMonths || source.MESES_VALIDADE_DOCS, current.docsValidityMonths),
      lgpdRetentionMonths: toNumber(source.lgpdRetentionMonths || source.MESES_RETENCAO_LGPD, current.lgpdRetentionMonths),
      source: source.source || "adapter"
    });
  }

  function getCurrentNavigationProfile() {
    const operatorToken = getLocal("MAESTRO_TOKEN", "");
    const operatorLevel = getLocal("MAESTRO_OPERADOR_NIVEL", "");
    if (
      operatorToken &&
      operatorToken !== "undefined" &&
      operatorToken !== "null" &&
      operatorLevel &&
      operatorLevel !== "undefined" &&
      operatorLevel !== "null"
    ) {
      return normalizeAccessProfile(operatorLevel);
    }

    const studentToken = getLocal("MAESTRO_EST_TOKEN", "");
    if (studentToken && studentToken !== "undefined" && studentToken !== "null") {
      return "ESTUDANTE";
    }

    return "ANONIMO";
  }

  function resolveNavigationProfile(profileOrSession) {
    if (!profileOrSession) return getCurrentNavigationProfile();
    if (typeof profileOrSession === "string") return normalizeAccessProfile(profileOrSession);
    return normalizeAccessProfile(pickFirst(
      profileOrSession.nivel,
      profileOrSession.perfil,
      profileOrSession.profile,
      profileOrSession.tipo,
      profileOrSession.role
    ));
  }

  function getNavigationConfig(profileOrSession) {
    const profile = resolveNavigationProfile(profileOrSession);
    return NAVIGATION_MATRIX[profile] || NAVIGATION_MATRIX.ANONIMO;
  }

  function uniqueNavigationList(values) {
    const seen = {};
    return (values || []).filter(item => {
      const key = safeString(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function getKnownNavigationViews() {
    let views = [];
    Object.keys(NAVIGATION_MATRIX).forEach(profile => {
      views = views.concat(NAVIGATION_MATRIX[profile].views || []);
    });
    return uniqueNavigationList(views);
  }

  function isKnownNavigationView(viewId) {
    return getKnownNavigationViews().includes(safeString(viewId));
  }

  function profileHasAction(profileOrSession, action) {
    const config = getNavigationConfig(profileOrSession);
    return (config.actions || []).includes(safeString(action));
  }

  function profileCanAccessView(profileOrSession, viewId) {
    const view = safeString(viewId);
    if (!view || !isKnownNavigationView(view)) return true;
    const config = getNavigationConfig(profileOrSession);
    return (config.views || []).includes(view);
  }

  function getDefaultViewForProfile(profileOrSession) {
    return getNavigationConfig(profileOrSession).defaultView || "view-hub";
  }

  function resolveViewAccess(viewId, profileOrSession) {
    const profile = resolveNavigationProfile(profileOrSession);
    const view = safeString(viewId);
    const allowed = profileCanAccessView(profile, view);
    return {
      allowed: allowed,
      profile: profile,
      viewId: view,
      fallback: allowed ? view : getDefaultViewForProfile(profile),
      reason: allowed ? "" : "Perfil sem acesso a view solicitada."
    };
  }

  function canExecuteNavigationAction(action, profileOrSession, options) {
    const allowed = profileHasAction(profileOrSession, action);
    if (!allowed && options && options.notify && typeof window.showToast === "function") {
      window.showToast("Seu perfil nao possui acesso a esta acao.", "warning");
    }
    return allowed;
  }

  function setNavigationElementVisible(element, visible) {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
    element.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible) {
      element.setAttribute("tabindex", "-1");
    } else if (element.getAttribute("tabindex") === "-1") {
      element.removeAttribute("tabindex");
    }
  }

  function applyNavigationVisibility(profileOrSession) {
    const profile = resolveNavigationProfile(profileOrSession);
    const config = getNavigationConfig(profile);
    const doc = window.document;
    if (!doc) return { profile: profile, visibleActions: config.actions || [], visibleViews: config.views || [] };

    doc.body.setAttribute("data-maestro-profile", profile.toLowerCase());

    Array.prototype.forEach.call(doc.querySelectorAll("[data-maestro-action]"), element => {
      const actions = safeString(element.getAttribute("data-maestro-action"))
        .split(/[,\s]+/)
        .filter(Boolean);
      const visible = actions.some(action => profileHasAction(profile, action));
      setNavigationElementVisible(element, visible);
    });

    Object.keys(NAVIGATION_MENU_GROUPS).forEach(groupId => {
      const group = doc.getElementById(groupId);
      if (!group) return;
      const actions = NAVIGATION_MENU_GROUPS[groupId] || [];
      const hasAction = actions.some(action => profileHasAction(profile, action));
      const hasVisibleChild = Array.prototype.some.call(
        group.querySelectorAll("[data-maestro-action]"),
        element => !element.classList.contains("hidden")
      );
      setNavigationElementVisible(group, hasAction && (hasVisibleChild || group.querySelectorAll("[data-maestro-action]").length === 0));
    });

    return {
      profile: profile,
      visibleActions: uniqueNavigationList(config.actions || []),
      visibleViews: uniqueNavigationList(config.views || [])
    };
  }

  function permissionsForProfile(profile) {
    const level = resolveNavigationProfile(profile || "ANONIMO");
    const isModerator = level === "MODERADOR";
    const isSupervisor = level === "SUPERVISOR";
    const isOperator = level === "OPERADOR";
    const isFiscal = level === "FISCAL";
    const isDriver = level === "MOTORISTA";
    return {
      canAccessAdmin: isModerator || isSupervisor || isOperator || isFiscal || isDriver,
      canAudit: profileHasAction(level, "auditoria"),
      canDashboard: profileHasAction(level, "dashboard"),
      canCommunicate: profileHasAction(level, "comunicacao"),
      canModerate: isModerator,
      canManageSemesters: profileHasAction(level, "semestres"),
      canUseMachineRoom: profileHasAction(level, "salaMaquinas"),
      canFiscalize: profileHasAction(level, "fiscalizar"),
      canDriveRoute: profileHasAction(level, "motoristaRotas"),
      canSuperviseMobility: profileHasAction(level, "gerirRotas") || profileHasAction(level, "encerrarRota"),
      profile: level
    };
  }

  function adaptOperatorSession(raw) {
    const source = raw || {};
    const nivel = normalizeUpper(pickFirst(
      source.nivel,
      source.nivelUsuario,
      source.perfil,
      getLocal("MAESTRO_OPERADOR_NIVEL", "")
    ));
    const session = mergeDefined({
      token: pickFirst(source.token, source.tokenSessao, getLocal("MAESTRO_TOKEN", "")),
      nome: pickFirst(source.nome, source.nomeOperador, getLocal("MAESTRO_OPERADOR_NOME", "")),
      email: pickFirst(source.email, source.identificador, getLocal("MAESTRO_OPERADOR_EMAIL", "")),
      perfil: nivel || "OPERADOR",
      nivel: nivel || "OPERADOR",
      tenantId: pickFirst(source.tenantId, getTenantContext().tenantId)
    });
    session.permissions = permissionsForProfile(session.nivel);
    return session;
  }

  function getOperatorSession() {
    const stored = getJson(STORAGE_KEYS.operatorSession, {});
    return adaptOperatorSession(stored);
  }

  function setOperatorSession(session) {
    const next = adaptOperatorSession(session || {});
    setJson(STORAGE_KEYS.operatorSession, next);
    markCacheDomain("session", { tenantId: next.tenantId, source: "operatorSession", key: STORAGE_KEYS.operatorSession });
    return next;
  }

  function adaptStudentIdentity(raw) {
    const source = raw || {};
    const cpf = cleanCpf(pickFirst(
      source.cpf,
      source.cpfAluno,
      source.CPF_ALUNO,
      source.documento,
      source.identidade && source.identidade.cpf
    ));
    const idCarteira = safeString(pickFirst(
      source.idCarteira,
      source.id_carteira,
      source.id,
      source.identificador,
      source.idAcesso,
      source.ID_CARTEIRA
    ));
    const turnos = uniqueArray(pickFirst(
      source.turnos,
      source.turno,
      source.TURNOS,
      source.TURNO,
      source.TURNOS_ALUNO,
      source.TURNO_ALUNO,
      source.dadosAcademicos && source.dadosAcademicos.turnos
    )).map(normalizeTurno).filter(Boolean);
    const estagioDetalhes = pickFirst(
      source.estagioDetalhes,
      source.estagio_detalhes,
      source.condicionais && source.condicionais.estagio_detalhes,
      {}
    );
    const estagioSource = mergeDefined(
      isObject(estagioDetalhes) ? estagioDetalhes : {},
      isObject(source.estagio) ? source.estagio : {}
    );
    const estagioFlag = isObject(source.estagio) ? "" : source.estagio;
    const estagioAtivo = estagioSource.ativo === true || normalizeSimNao(pickFirst(
      estagioSource.ativo,
      estagioSource.transporte,
      estagioFlag,
      source.estagioAtivo,
      source.ESTAGIO,
      source.transporteEstagio,
      source.ESTAGIO_ALUNO,
      source.TRANSPORTE_ESTAGIO,
      source.condicionais && source.condicionais.estagio,
      source.condicionais && source.condicionais.transporte_estagio
    )) === "Sim";

    return mergeDefined({
      cpf: cpf,
      cpfMascarado: pickFirst(source.cpfMascarado, source.cpf_mask, source.CPF_MASCARADO),
      idCarteira: idCarteira,
      firestoreId: pickFirst(source.firestoreId, source.docId, source.idFirestore),
      nome: pickFirst(source.nome, source.nomeAluno, source.NOME_ALUNO),
      email: pickFirst(source.email, source.EMAIL_ALUNO),
      turnos: turnos,
      instituicao: pickFirst(source.instituicao, source.INSTITUICAO, source.INSTITUICAO_ALUNO, source.INSTITUICAO_ENSINO),
      rota: pickFirst(source.rota, source.ROTA, source.ROTA_ALUNO),
      statusAtividade: pickFirst(source.statusAtividade, source.STATUS_ATIVIDADE),
      estagio: {
        ativo: estagioAtivo,
        tipoVinculo: pickFirst(estagioSource.tipoVinculo, estagioSource.tipo_vinculo, source.tipoVinculoEstagio, source.tipo_vinculo_estagio, source.TIPO_VINCULO_ESTAGIO, source.condicionais && source.condicionais.tipo_vinculo_estagio),
        inicio: pickFirst(estagioSource.inicio, source.inicioEstagio, source.inicio_estagio, source.INICIO_ESTAGIO, source.condicionais && source.condicionais.inicio_estagio),
        fim: pickFirst(estagioSource.fim, source.fimEstagio, source.fim_estagio, source.FIM_ESTAGIO, source.condicionais && source.condicionais.fim_estagio),
        empresaInstituicao: pickFirst(estagioSource.empresaInstituicao, estagioSource.empresa_instituicao, source.empresaInstituicaoEstagio, source.empresa_instituicao_estagio, source.EMPRESA_INSTITUICAO_ESTAGIO, source.EMPRESA_ESTAGIO, source.condicionais && source.condicionais.empresa_instituicao_estagio),
        transporte: normalizeSimNao(pickFirst(estagioSource.transporte, source.transporteEstagio, source.TRANSPORTE_ESTAGIO, source.condicionais && source.condicionais.transporte_estagio)),
        parada: pickFirst(estagioSource.parada, source.paradaEstagio, source.PARADA_ESTAGIO, source.rotaEstagio, source.ROTA_ESTAGIO, source.condicionais && source.condicionais.parada_estagio),
        turno: normalizeTurno(pickFirst(estagioSource.turno, source.turnoEstagio, source.TURNO_ESTAGIO, source.TURNO_ESTAGIO_ALUNO, source.condicionais && source.condicionais.turno_estagio)),
        declaracaoVinculo: pickFirst(estagioSource.declaracaoVinculo, estagioSource.declaracao_url, source.declaracaoVinculoEstagio, source.DECLARACAO_VINCULO_ESTAGIO, source.ANEXO_COMPROVANTE_ESTAGIO, source.anexos_drive && source.anexos_drive.declaracao_vinculo_estagio, source.anexos_drive && source.anexos_drive.comprovante_estagio),
        statusValidacao: pickFirst(estagioSource.statusValidacao, estagioSource.status_validacao, source.statusValidacaoEstagio, source.STATUS_VALIDACAO_ESTAGIO, source.condicionais && source.condicionais.status_validacao_estagio),
        alteracaoCiclo: pickFirst(estagioSource.alteracaoCiclo, estagioSource.alteracao_ciclo, source.alteracaoEstagioCiclo, source.ALTERACAO_ESTAGIO_CICLO, source.condicionais && source.condicionais.alteracao_estagio_ciclo, null)
      }
    });
  }

  function getStudentIdentity() {
    const stored = getJson(STORAGE_KEYS.studentIdentity, {});
    const wallet = getJson("MAESTRO_WALLET_CACHE", getJson("MAESTRO_OFFLINE_WALLET", {}));
    return adaptStudentIdentity(mergeDefined(wallet, stored));
  }

  function setStudentIdentity(identity) {
    const next = adaptStudentIdentity(identity || {});
    setJson(STORAGE_KEYS.studentIdentity, next);
    markCacheDomain("wallet", {
      tenantId: getTenantContext().tenantId,
      semestreId: getSemesterContext().semestreId,
      source: "studentIdentity",
      key: STORAGE_KEYS.studentIdentity
    });
    return next;
  }

  function adaptThemeConfig(raw) {
    const source = raw || {};
    const ui = source.ui || source.UI || {};
    const pwa = source.pwa || source.PWA || {};
    const contato = source.contato || source.CONTATO || {};
    const config = source.config || source.CONFIG || {};

    const theme = {
      brand: {
        secretaria: pickFirst(ui.NOME_SECRETARIA, source.NOME_SECRETARIA),
        setor: pickFirst(ui.NOME_DO_SETOR, ui.NOME_SISTEMA, source.NOME_DO_SETOR),
        cidade: pickFirst(ui.CIDADE_ALVO, source.CIDADE_ALVO),
        abreviacao: pickFirst(ui.NOME_ABREV_SECRETARIA, source.NOME_ABREV_SECRETARIA),
        marcaDagua: pickFirst(ui.MARCA_DAGUA_SECRETARIA, source.MARCA_DAGUA_SECRETARIA),
        responsavel: pickFirst(ui.NOME_RESPONSAVEL, source.NOME_RESPONSAVEL),
        cpfResponsavel: cleanCpf(pickFirst(ui.CPF_RESPONSAVEL, source.CPF_RESPONSAVEL))
      },
      colors: {
        light: {
          primary: pickFirst(ui.COR_PRIMARIA_LIGHT, source.COR_PRIMARIA_LIGHT),
          secondary: pickFirst(ui.COR_SECUNDARIA_LIGHT, source.COR_SECUNDARIA_LIGHT),
          accent: pickFirst(ui.COR_DE_DESTAQUE_LIGHT, source.COR_DE_DESTAQUE_LIGHT)
        },
        dark: {
          primary: pickFirst(ui.COR_PRIMARIA_DARK, source.COR_PRIMARIA_DARK),
          secondary: pickFirst(ui.COR_SECUNDARIA_DARK, source.COR_SECUNDARIA_DARK),
          accent: pickFirst(ui.COR_DE_DESTAQUE_DARK, source.COR_DE_DESTAQUE_DARK)
        }
      },
      logos: {
        light: pickFirst(ui.LOGO_URL_LIGHT, ui.LOGO_LIGHT, source.LOGO_URL_LIGHT),
        dark: pickFirst(ui.LOGO_URL_DARK, ui.LOGO_DARK, source.LOGO_URL_DARK),
        emblem: pickFirst(pwa.EMBLEMA_PWA, ui.EMBLEMA_PWA, config.EMBLEMA_PWA, source.EMBLEMA_PWA),
        appIcon: pickFirst(pwa.ICONE_APP_PWA, pwa.ICONE, source.ICONE_APP_PWA)
      },
      pwa: {
        name: pickFirst(pwa.NOME_APP_PWA, pwa.NOME, source.NOME_APP_PWA),
        link: pickFirst(pwa.LINK_PWA, source.LINK_PWA),
        icon: pickFirst(pwa.ICONE_APP_PWA, pwa.ICONE, source.ICONE_APP_PWA)
      },
      contact: {
        email: pickFirst(contato.EMAIL_DE_CONTATO, contato.EMAIL, source.EMAIL_DE_CONTATO),
        endereco: pickFirst(contato["ENDERECO_FISICO"], contato["ENDERECO_F\u00cdSICO"], contato.ENDERECO, source.ENDERECO_FISICO, source["ENDERECO_F\u00cdSICO"]),
        cnpj: pickFirst(contato.CNPJ_SECRETARIA, contato.CNPJ, source.CNPJ_SECRETARIA)
      },
      rules: {
        cepsValidos: toArray(pickFirst(config.CEPS_VALIDOS, ui.CEPS_VALIDOS, source.CEPS_VALIDOS)),
        docsValidityMonths: toNumber(pickFirst(config.MESES_VALIDADE_DOCS, source.MESES_VALIDADE_DOCS), null),
        lgpdRetentionMonths: toNumber(pickFirst(config.MESES_RETENCAO_LGPD, source.MESES_RETENCAO_LGPD), null),
        muralWeeklyPostLimit: BUSINESS_RULES.muralWeeklyPostLimit,
        stageUpdateLimitPerCycle: BUSINESS_RULES.stageUpdateLimitPerCycle
      },
      firebase: source.firebase || source.FIREBASE || null,
      fuso: source.fuso || source.FUSO || null,
      raw: source
    };

    return theme;
  }

  function getThemeConfig() {
    return getJson(STORAGE_KEYS.themeConfig, {});
  }

  function setThemeConfig(config) {
    const next = adaptThemeConfig(config || {});
    setJson(STORAGE_KEYS.themeConfig, next);
    setTenantContext({
      cidade: next.brand && next.brand.cidade,
      cepsValidos: next.rules && next.rules.cepsValidos,
      source: "themeConfig"
    });
    setSemesterContext({
      docsValidityMonths: next.rules && next.rules.docsValidityMonths,
      lgpdRetentionMonths: next.rules && next.rules.lgpdRetentionMonths,
      source: "themeConfig"
    });
    markCacheDomain("theme", { tenantId: getTenantContext().tenantId, source: "themeConfig", key: STORAGE_KEYS.themeConfig });
    return next;
  }

  function adaptAuditStudent(raw) {
    const source = raw || {};
    const identity = adaptStudentIdentity(source);
    const documentosSource = source.documentos || source.anexos || source.anexos_drive || {};
    const documentos = mergeDefined(documentosSource, {
      FOTO: pickFirst(source.ANEXO_FOTO_3X4, documentosSource.foto_3x4, documentosSource.anexo_foto),
      DOCUMENTO: pickFirst(source.ANEXO_DOCUMENTO_FOTO, documentosSource.documento_foto),
      VINCULO: pickFirst(source.ANEXO_DECLARACAO_VINCULO, source.DECLARACAO_ALUNO, documentosSource.declaracao_vinculo, documentosSource.declaracao_aluno),
      RESIDENCIA: pickFirst(source.ANEXO_COMPROVANTE_RESIDENCIA, documentosSource.comprovante_residencia),
      ESTAGIO: pickFirst(identity.estagio && identity.estagio.declaracaoVinculo, source.ANEXO_COMPROVANTE_ESTAGIO, source.DECLARACAO_VINCULO_ESTAGIO, documentosSource.declaracao_vinculo_estagio, documentosSource.comprovante_estagio)
    });
    const turnosTexto = identity.turnos && identity.turnos.length
      ? identity.turnos.join(" + ")
      : pickFirst(source.turno, source.TURNOS_ALUNO, source.TURNO_ALUNO);
    const statusValidacao = pickFirst(source.statusAuditoria, source.statusValidacao, source.STATUS_VALIDACAO);

    return mergeDefined({
      id: pickFirst(source.id, source.firestoreId, source.docId, identity.cpf, identity.idCarteira),
      cpf: identity.cpf,
      cpfMascarado: pickFirst(source.cpfMascarado, identity.cpfMascarado),
      nome: identity.nome,
      email: identity.email,
      matricula: pickFirst(source.matricula, source.MATRICULA_ALUNO),
      instituicao: identity.instituicao,
      rota: identity.rota,
      turnos: identity.turnos,
      turno: turnosTexto,
      dias: pickFirst(source.dias, source.DIAS_ALUNO),
      semestreId: pickFirst(source.semestreId, source.semestreAtual, source.semestre),
      timestamp: pickFirst(source.timestamp, source.criadoEm, source.createdAt, source.metadados && source.metadados.criado_em, 0),
      statusAtividade: pickFirst(source.statusAtividade, source.STATUS_ATIVIDADE),
      statusDocs: pickFirst(source.statusDocs, source.STATUS_DOCS),
      statusOCR: pickFirst(source.statusOCR, source.STATUS_OCR),
      statusAuditoria: statusValidacao,
      statusValidacao: statusValidacao,
      observacoes: pickFirst(source.observacoes, source.obs, source.OBSERVACOES),
      documentos: documentos,
      estagio: identity.estagio,
      raw: source
    });
  }

  function normalizeCounterMap(value) {
    if (!value) return {};
    if (Array.isArray(value)) {
      return value.reduce((acc, item) => {
        if (Array.isArray(item) && item.length >= 2) {
          const key = safeString(item[0]);
          if (key) acc[key] = toNumber(item[1], 0);
          return acc;
        }
        if (isObject(item)) {
          const key = safeString(pickFirst(item.label, item.nome, item.name, item.key, item.valor));
          if (key) acc[key] = toNumber(pickFirst(item.value, item.total, item.count, item.quantidade, item.qtd), 0);
        }
        return acc;
      }, {});
    }
    return isObject(value) ? value : {};
  }

  function adaptDashboardDataMart(rawItems) {
    const items = Array.isArray(rawItems) ? rawItems : [];
    return items.map(item => {
      const source = item || {};
      return mergeDefined(source, {
        i: pickFirst(source.i, source.instituicao, source.INSTITUICAO_ALUNO, source.institution),
        t: pickFirst(source.t, source.turno, source.TURNOS_ALUNO, source.turnos),
        r: pickFirst(source.r, source.rota, source.ROTA_ALUNO),
        d: pickFirst(source.d, source.dias, source.DIAS_ALUNO)
      });
    });
  }

  function extractDashboardStatsSource(raw) {
    const source = raw || {};
    if (isObject(source.dashboardStats)) return source.dashboardStats;
    if (isObject(source.estatisticas)) return source.estatisticas;
    if (isObject(source.stats)) return source.stats;
    if (isObject(source.data) && (source.data.graficos || source.data.kpis || source.data.KPIS)) return source.data;
    return source;
  }

  function adaptDashboardStats(raw) {
    const envelope = raw || {};
    const stats = extractDashboardStatsSource(envelope);
    const graficos = stats.graficos || stats.charts || stats.GRAFICOS || {};
    const inclusao = graficos.inclusao || graficos.inclusaoSocial || {};
    const noturno = graficos.noturno || graficos.rotas23h || {};
    const kpis = stats.kpis || stats.KPIS || {};
    const consumo = stats.consumo || stats.quota || stats.quotas || {};

    return {
      sucesso: envelope.sucesso !== false,
      erro: envelope.erro || stats.erro || "",
      kpis: {
        total: toNumber(pickFirst(kpis.total, kpis.TOTAL), 0),
        ativos: toNumber(pickFirst(kpis.ativos, kpis.ATIVOS), 0),
        pendentes: toNumber(pickFirst(kpis.pendentes, kpis.PENDENTES), 0),
        retidos: toNumber(pickFirst(kpis.retidos, kpis.RETIDOS), 0),
        suspensos: toNumber(pickFirst(kpis.suspensos, kpis.inativos, kpis.SUSPENSOS, kpis.INATIVOS), 0)
      },
      graficos: {
        status: mergeDefined({
          "Ativos": 0,
          "Pendentes": 0,
          "Retidos (Humana)": 0,
          "Cancelados/Suspensos": 0
        }, normalizeCounterMap(graficos.status)),
        rotas: normalizeCounterMap(graficos.rotas),
        instituicoes: normalizeCounterMap(graficos.instituicoes || graficos.instituicao),
        dias: normalizeCounterMap(graficos.dias),
        turnos: normalizeCounterMap(graficos.turnos),
        inclusao: {
          pcd: normalizeCounterMap(inclusao.pcd),
          menor: normalizeCounterMap(inclusao.menor),
          acompanhado: normalizeCounterMap(inclusao.acompanhado),
          estagio: normalizeCounterMap(inclusao.estagio)
        },
        noturno: {
          adesao: normalizeCounterMap(noturno.adesao),
          bairros: normalizeCounterMap(noturno.bairros)
        }
      },
      consumo: consumo,
      dataMart: adaptDashboardDataMart(pickFirst(stats.dataMart, stats.datamart, stats.data_mart, stats.bi, [])),
      filtrosDisponiveis: stats.filtrosDisponiveis || stats.filtros || {},
      atualizadoEm: pickFirst(stats.atualizadoEm, stats.updatedAt, stats.ultimaAtualizacao, envelope.atualizadoEm),
      semestreId: pickFirst(stats.semestreId, stats.semestreAtual, stats.semestre, envelope.semestreId),
      origem: stats.origem || envelope.origem || "network",
      raw: stats
    };
  }

  function adaptDocumentFile(raw) {
    const source = raw || {};
    return mergeDefined({
      sucesso: source.sucesso !== false,
      mimeType: pickFirst(source.mimeType, source.tipoMime, "application/pdf"),
      fileName: pickFirst(source.fileName, source.arquivoNome, source.nome),
      base64: pickFirst(source.base64, source.arquivoBase64, source.fotoBase64),
      storageUrl: pickFirst(source.storageUrl, source.url, source.downloadUrl),
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptTrip(raw) {
    const source = raw || {};
    return mergeDefined({
      id: pickFirst(source.id, source.idViagem),
      idOnibus: pickFirst(source.idOnibus, source.onibusId, source.placa),
      rota: pickFirst(source.rota, source.nomeRota),
      horario: pickFirst(source.horario, source.hora),
      turno: normalizeUpper(pickFirst(source.turno, source.TURNO)),
      placa: pickFirst(source.placa, source.idOnibus),
      vagasRestantes: toNumber(source.vagasRestantes, null),
      statusOperacao: pickFirst(source.statusOperacao, source.status),
      estadoRadar: pickFirst(source.estadoRadar, source.radar),
      paradas: Array.isArray(source.paradas) ? source.paradas : [],
      geojsonUrl: pickFirst(source.geojson_url, source.geojsonUrl),
      guiaAtivo: source.guiaAtivo || null,
      atualizadoEm: pickFirst(source.atualizadoEm, source.updatedAt),
      raw: source
    });
  }

  function adaptMuralMessage(raw, currentStudentId) {
    const source = raw || {};
    const ups = Array.isArray(source.arrayUpsInfo) ? source.arrayUpsInfo : [];
    const downs = Array.isArray(source.arrayDownsInfo) ? source.arrayDownsInfo : [];
    const identity = getStudentIdentity();
    const actorIds = uniqueArray([currentStudentId, identity.idCarteira, identity.cpf].filter(Boolean));
    const upsNormalizados = ups.map(item => normalizeUpper(item));
    const downsNormalizados = downs.map(item => normalizeUpper(item));
    const votouUp = actorIds.some(id => upsNormalizados.includes(normalizeUpper(id)));
    const votouDown = actorIds.some(id => downsNormalizados.includes(normalizeUpper(id)));
    return mergeDefined({
      id: pickFirst(source.id, source.idMensagem),
      autorId: pickFirst(source.autorId, source.idEstudante),
      autorNome: pickFirst(source.autor, source.nomeEstudante, source.autorNome),
      categoria: pickFirst(source.categoria, "geral"),
      mensagem: pickFirst(source.mensagem, source.texto),
      votosUp: toNumber(source.votosUp, ups.length || 0),
      votosDown: toNumber(source.votosDown, downs.length || 0),
      pontuacao: toNumber(source.pontuacao, 0),
      meuVoto: votouUp ? "up" : votouDown ? "down" : "",
      statusModeracao: pickFirst(source.statusModeracao, source.status, "PUBLICADO"),
      criadoEm: pickFirst(source.tsMensagem, source.criadoEm, source.createdAt),
      raw: source
    });
  }

  function adaptMuralFeed(raw, currentStudentId) {
    const source = Array.isArray(raw) ? { sucesso: true, mensagens: raw } : (raw || {});
    const mensagensRaw = Array.isArray(source.mensagens)
      ? source.mensagens
      : (Array.isArray(source.data) ? source.data : []);
    const limiteSemanal = toNumber(pickFirst(
      source.limiteSemanal,
      source.limitePostagensSemanais,
      source.limite_semanal,
      BUSINESS_RULES.muralWeeklyPostLimit
    ), BUSINESS_RULES.muralWeeklyPostLimit);

    return mergeDefined({
      sucesso: source.sucesso !== false,
      mensagens: mensagensRaw.map(item => adaptMuralMessage(item, currentStudentId)),
      limiteSemanal: limiteSemanal,
      limitePostagensSemanais: limiteSemanal,
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptAvisoAtivo(raw) {
    const source = raw || {};
    const mensagem = pickFirst(source.assunto, source.mensagem, source.texto, source.ASSUNTO_PRINCIPAL);

    return mergeDefined({
      id: pickFirst(source.id, source.idAviso, source.ID_AVISO, source.titulo),
      tipo: safeText(pickFirst(source.tipo, source.tipoAviso, source.ASSUNTO_TIPO, "Geral"), "Geral"),
      titulo: safeText(pickFirst(source.titulo, source.ASSUNTO_TITULO), ""),
      assunto: safeText(mensagem, ""),
      mensagem: safeText(mensagem, ""),
      imagem: safeUrl(pickFirst(source.imagem, source.imagemUrl, source.ASSUNTO_IMAGEM)),
      anexo: safeUrl(pickFirst(source.anexo, source.anexoUrl, source.ASSUNTO_ANEXO)),
      validade: pickFirst(source.validade, source.validadeAviso, source.ASSUNTO_VALIDADE),
      statusPush: pickFirst(source.statusPush, source.ASSUNTO_STATUS_PUSH, source.STATUS_PUSH),
      raw: source
    });
  }

  function adaptAvisosAtivos(raw) {
    const source = Array.isArray(raw) ? { sucesso: true, avisos: raw } : (raw || {});
    const avisosRaw = Array.isArray(source.avisos)
      ? source.avisos
      : (Array.isArray(source.dados) ? source.dados : (Array.isArray(source.data) ? source.data : []));

    return mergeDefined({
      sucesso: source.sucesso !== false,
      avisos: avisosRaw.map(adaptAvisoAtivo).filter(aviso => aviso.titulo || aviso.assunto),
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptPushFilters(raw) {
    const source = raw || {};
    const filtros = source.filtros || source.data || source;

    return mergeDefined({
      sucesso: source.sucesso !== false,
      filtros: {
        rotas: uniqueArray(filtros.rotas || filtros.rotasDisponiveis || []),
        turnos: uniqueArray(filtros.turnos || filtros.turnosDisponiveis || []),
        instituicoes: uniqueArray(filtros.instituicoes || filtros.instituicoesDisponiveis || filtros.instituicoesEnsino || [])
      },
      erro: source.erro || "",
      raw: source
    });
  }

  function adaptPushResult(raw) {
    const source = raw || {};
    const push = source.push || {};

    return mergeDefined({
      sucesso: source.sucesso !== false,
      enviados: toNumber(pickFirst(source.enviados, push.enviados, source.totalEnviados), 0),
      falhas: toNumber(pickFirst(source.falhas, push.falhas, source.totalFalhas), 0),
      msg: pickFirst(source.msg, source.mensagem, push.mensagem),
      erro: source.erro || push.erro || "",
      raw: source
    });
  }

  function minutesFromClock(value) {
    const parts = safeString(value).split(":");
    if (parts.length < 2) return null;
    const hours = toNumber(parts[0], null);
    const minutes = toNumber(parts[1], null);
    if (hours === null || minutes === null) return null;
    return (hours * 60) + minutes;
  }

  function getCurrentClockMinutes(now) {
    const date = now instanceof Date ? now : new Date();
    return (date.getHours() * 60) + date.getMinutes();
  }

  function activeTurnoForClock(clockMinutes) {
    const windows = BUSINESS_RULES.walletTurnWindows;
    return Object.keys(windows).find(turno => {
      const start = minutesFromClock(windows[turno].start);
      const end = minutesFromClock(windows[turno].end);
      return start !== null && end !== null && clockMinutes >= start && clockMinutes <= end;
    }) || "";
  }

  function adaptWalletVisualState(student, now, options) {
    const identity = adaptStudentIdentity(student || getStudentIdentity());
    const opts = options || {};
    const declaredTurnos = uniqueArray(identity.turnos).map(normalizeTurno).filter(Boolean);
    const activeTurno = activeTurnoForClock(getCurrentClockMinutes(now));
    const hasActiveTurno = activeTurno && declaredTurnos.includes(activeTurno);
    const status = normalizeUpper(identity.statusAtividade);
    const blocked = ["BLOQUEADO", "EXPIRADO", "INATIVO", "REPROVADO", "INDEFERIDO", "SUSPENSO", "CANCELADO"].includes(status);
    const pending = ["PENDENTE", "ANALISE", "ANALISE_HUMANA", "EM_ANALISE", "AGUARDANDO", "AGUARDANDO_EMISSAO"].includes(status);
    const estagio = identity.estagio || {};
    const isEstagioActive = estagio.ativo === true && (!estagio.statusValidacao || normalizeUpper(estagio.statusValidacao) !== "RECUSADO");
    const offline = opts.offline === true || opts.mode === "offline";

    let backgroundToken = "wallet.neutral";
    let badgeLabel = "Fora do horario do turno";
    let reason = "Carteira acessada fora das janelas declaradas.";
    let stateClass = "wallet-state-neutral";
    let qrLabel = "FORA DO HORARIO DO TURNO";
    let canEmbark = false;

    if (offline) {
      backgroundToken = "wallet.offline";
      badgeLabel = "Modo offline";
      reason = "Carteira exibida a partir do cache local.";
      stateClass = "wallet-state-offline";
      qrLabel = "ACESSO OFFLINE LIMITADO";
    } else if (blocked) {
      backgroundToken = "wallet.blocked";
      badgeLabel = "Carteira indisponivel";
      reason = "Status do estudante impede o uso normal da carteira.";
      stateClass = "wallet-state-blocked";
      qrLabel = "CARTEIRA INDISPONIVEL PARA EMBARQUE";
    } else if (pending) {
      backgroundToken = "wallet.pending";
      badgeLabel = "Cadastro em analise";
      reason = "Status do estudante requer validacao antes do uso pleno.";
      stateClass = "wallet-state-pending";
      qrLabel = "CADASTRO EM ANALISE";
    } else if (isEstagioActive) {
      backgroundToken = "wallet.estagio";
      badgeLabel = "Estagio ativo";
      reason = "Estudante possui vinculo de estagio ativo ou em analise.";
      stateClass = "wallet-state-estagio";
      qrLabel = "VALIDO PARA ESTAGIO";
      canEmbark = true;
    } else if (hasActiveTurno && declaredTurnos.length > 1) {
      backgroundToken = "wallet.multiTurno";
      badgeLabel = "Turno " + activeTurno.toLowerCase() + " ativo";
      reason = "Estudante possui multiplos turnos e esta em uma janela autorizada.";
      stateClass = "wallet-state-multi";
      qrLabel = "VALIDO PARA EMBARQUE AGORA";
      canEmbark = true;
    } else if (hasActiveTurno) {
      backgroundToken = "wallet." + activeTurno.toLowerCase();
      badgeLabel = "Turno " + activeTurno.toLowerCase() + " ativo";
      reason = "Carteira acessada dentro do horario declarado.";
      stateClass = "wallet-state-" + activeTurno.toLowerCase();
      qrLabel = "VALIDO PARA EMBARQUE AGORA";
      canEmbark = true;
    } else if (declaredTurnos.length > 1) {
      badgeLabel = "Fora dos turnos";
      reason = "Estudante possui mais de um turno, mas nenhum esta ativo agora.";
    }

    return {
      activeTurnos: hasActiveTurno ? [activeTurno] : [],
      declaredTurnos: declaredTurnos,
      currentTurno: activeTurno,
      isWithinDeclaredTurno: Boolean(hasActiveTurno),
      isEstagioActive: Boolean(isEstagioActive),
      isOffline: Boolean(offline),
      isBlocked: Boolean(blocked),
      isPending: Boolean(pending),
      canEmbark: Boolean(canEmbark),
      backgroundToken: opts.backgroundToken || backgroundToken,
      badgeLabel: badgeLabel,
      reason: reason,
      stateClass: opts.stateClass || stateClass,
      qrLabel: qrLabel,
      status: status || "ATIVO"
    };
  }

  function normalizeApiError(raw, action) {
    const status = toNumber(raw && raw.status, 0);
    const message = safeMessage((raw && (raw.erro || raw.error || raw.mensagem)) || "Erro desconhecido.");
    let code = "unknown_error";
    if (status === 401 || /sess/i.test(message)) code = "session_expired";
    else if (status === 403 || /permiss/i.test(message)) code = "forbidden";
    else if (/timeout|tempo limite|demor/i.test(message)) code = "timeout";
    else if (/network|rede|conex/i.test(message)) code = "network_error";
    else if (/tenant/i.test(message)) code = "tenant_missing";
    else if (/payload|tamanho|large/i.test(message)) code = "payload_too_large";
    else if (/valid/i.test(message)) code = "validation_error";
    return {
      code: code,
      message: message,
      status: status || 500,
      action: action || "",
      raw: raw || null
    };
  }

  function normalizeApiResult(raw, action) {
    const defaultStatus = raw ? (raw.sucesso === false ? 500 : 200) : 500;
    const status = toNumber(raw && raw.status, defaultStatus);
    const ok = raw && raw.sucesso !== false && status < 400;
    if (!ok) {
      return {
        ok: false,
        data: null,
        error: normalizeApiError(raw, action),
        status: status || 500,
        raw: raw || null
      };
    }
    return {
      ok: true,
      data: raw && raw.dados !== undefined ? raw.dados : raw && raw.data !== undefined ? raw.data : raw,
      error: null,
      status: status || 200,
      raw: raw
    };
  }

  async function apiClientCall(action, payload, options) {
    const opts = options || {};
    const builder = typeof opts.builder === "function" ? opts.builder : null;
    const finalPayload = builder ? builder(payload || {}) : (payload || {});
    const timeoutMs = Number(opts.timeoutMs || 0);

    if (typeof window.apiCall !== "function") {
      return normalizeApiResult({
        sucesso: false,
        status: 500,
        erro: "apiCall nao esta disponivel no bundle atual."
      }, action);
    }

    try {
      const requestPromise = window.apiCall(action, finalPayload);
      const raw = timeoutMs > 0
        ? await Promise.race([
          requestPromise,
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("Timeout ao comunicar com o servidor.")), timeoutMs);
          })
        ])
        : await requestPromise;
      const normalized = normalizeApiResult(raw, action);
      if (typeof opts.adapter === "function" && normalized.ok) {
        normalized.data = opts.adapter(normalized.data);
      }
      return normalized;
    } catch (err) {
      return normalizeApiResult({
        sucesso: false,
        status: 0,
        erro: err && err.message ? err.message : "Falha de rede."
      }, action);
    }
  }

  function buildBasePayload(payload) {
    const tenant = getTenantContext();
    return mergeDefined({
      tenantId: tenant.tenantId || ""
    }, payload || {});
  }

  function buildPublicPayload(payload) {
    return mergeDefined(buildBasePayload(payload), {
      origemFrontend: "PUBLICO"
    });
  }

  function buildStudentPayload(payload) {
    const identity = getStudentIdentity();
    return mergeDefined(buildBasePayload(payload), {
      cpf: (payload && payload.cpf) || identity.cpf,
      idCarteira: identity.idCarteira,
      idEstudante: (payload && payload.idEstudante) || identity.idCarteira || identity.cpf,
      estudante: identity
    });
  }

  function buildOperatorPayload(payload) {
    const session = getOperatorSession();
    return mergeDefined(buildBasePayload(payload), {
      usuarioLogadoId: (payload && payload.usuarioLogadoId) || session.email,
      nivelUsuario: session.nivel,
      tipoUsuario: "OPERADOR",
      operador: {
        nome: session.nome,
        email: session.email,
        nivel: session.nivel
      }
    });
  }

  function buildSemesterPayload(payload) {
    const semester = getSemesterContext();
    return mergeDefined(buildBasePayload(payload), {
      semestreId: (payload && payload.semestreId) || semester.semestreId
    });
  }

  function buildMobilityPayload(payload) {
    const identity = getStudentIdentity();
    const session = getOperatorSession();
    return mergeDefined(buildBasePayload(payload), {
      idEstudante: (payload && payload.idEstudante) || identity.idCarteira || identity.cpf,
      usuarioLogadoId: (payload && payload.usuarioLogadoId) || session.email || identity.idCarteira || identity.cpf
    });
  }

  function buildDocumentPayload(payload) {
    const identity = getStudentIdentity();
    const semester = getSemesterContext();
    return mergeDefined(buildBasePayload(payload), {
      cpf: cleanCpf((payload && payload.cpf) || identity.cpf),
      semestreId: (payload && payload.semestreId) || semester.semestreId
    });
  }

  function buildStageUpdatePayload(payload) {
    const identity = getStudentIdentity();
    const semester = getSemesterContext();
    const source = payload || {};
    return mergeDefined(buildBasePayload(source), {
      cpf: cleanCpf(source.cpf || identity.cpf),
      idCarteira: source.idCarteira || identity.idCarteira,
      semestreId: source.semestreId || semester.semestreId,
      tipoVinculoEstagio: source.tipoVinculoEstagio,
      inicioEstagio: source.inicioEstagio,
      fimEstagio: source.fimEstagio,
      empresaInstituicaoEstagio: source.empresaInstituicaoEstagio,
      transporteEstagio: source.transporteEstagio,
      paradaEstagio: source.paradaEstagio,
      turnoEstagio: source.turnoEstagio,
      declaracaoVinculoEstagio: source.declaracaoVinculoEstagio,
      estagio: mergeDefined({
        tipoVinculoEstagio: source.tipoVinculoEstagio,
        inicioEstagio: source.inicioEstagio,
        fimEstagio: source.fimEstagio,
        empresaInstituicaoEstagio: source.empresaInstituicaoEstagio,
        transporteEstagio: source.transporteEstagio,
        paradaEstagio: source.paradaEstagio,
        turnoEstagio: source.turnoEstagio,
        declaracaoVinculoEstagio: source.declaracaoVinculoEstagio
      }, source.estagio || {})
    });
  }

  function buildMuralPostPayload(payload) {
    const identity = getStudentIdentity();
    const source = payload || {};
    const idEstudante = safeText(source.cpf || identity.cpf || source.idEstudante || source.usuarioLogadoId || identity.idCarteira, "");
    const mensagem = safeText(source.mensagem, "").slice(0, 280);

    return mergeDefined(buildStudentPayload(source), {
      idEstudante: idEstudante,
      usuarioLogadoId: source.usuarioLogadoId || idEstudante,
      nomeEstudante: safeText(source.nomeEstudante || identity.nome, "Estudante"),
      categoria: safeText(source.categoria, "Duvida Geral"),
      mensagem: mensagem,
      limiteSemanal: BUSINESS_RULES.muralWeeklyPostLimit
    });
  }

  function buildMuralVotePayload(payload) {
    const identity = getStudentIdentity();
    const source = payload || {};
    const idEstudante = safeText(source.cpf || identity.cpf || source.idEstudante || source.usuarioLogadoId || identity.idCarteira, "");

    return mergeDefined(buildStudentPayload(source), {
      idEstudante: idEstudante,
      usuarioLogadoId: source.usuarioLogadoId || idEstudante,
      idMensagem: safeText(source.idMensagem, ""),
      tipoVoto: normalizeUpper(source.tipoVoto || source.voto)
    });
  }

  function buildPushTokenPayload(payload) {
    const identity = getStudentIdentity();
    const source = payload || {};
    const cpf = cleanCpf(source.cpf || source.idEstudante || source.idAluno || identity.cpf);
    const token = safeText(source.pushToken || source.tokenDispositivo || source.token, "");

    return mergeDefined(buildStudentPayload(source), {
      cpf: cpf,
      idEstudante: cpf || source.idEstudante || identity.idCarteira,
      pushToken: token,
      tokenDispositivo: token
    });
  }

  function buildAvisoPublicoPayload(payload) {
    const session = getOperatorSession();
    const semester = getSemesterContext();
    const source = payload || {};
    const validadeAviso = source.validadeAviso || source.validade || source.ASSUNTO_VALIDADE || "";

    return mergeDefined(buildOperatorPayload(source), {
      semestreId: source.semestreId || semester.semestreId,
      tipoAviso: safeText(source.tipoAviso || source.tipo, "Geral"),
      titulo: safeText(source.titulo, "").slice(0, 120),
      mensagem: safeText(source.mensagem, "").slice(0, 700),
      validade: validadeAviso,
      validadeAviso: validadeAviso,
      ASSUNTO_VALIDADE: validadeAviso,
      enviarPush: source.enviarPush !== false,
      operadorNome: safeText(source.operadorNome || session.nome, "Secretaria"),
      operadorCargo: safeText(source.operadorCargo || session.nivel, "Operador")
    });
  }

  function buildPushSegmentadoPayload(payload) {
    const session = getOperatorSession();
    const semester = getSemesterContext();
    const source = payload || {};

    return mergeDefined(buildOperatorPayload(source), {
      semestreId: source.semestreId || semester.semestreId,
      titulo: safeText(source.titulo, "").slice(0, 120),
      mensagem: safeText(source.mensagem, "").slice(0, 700),
      rota: safeText(source.rota, "TODAS"),
      turno: safeText(source.turno, "TODOS"),
      instituicao: safeText(source.instituicao, "TODAS"),
      operadorNome: safeText(source.operadorNome || session.nome, "Secretaria"),
      operadorCargo: safeText(source.operadorCargo || session.nivel, "Operador")
    });
  }

  const storage = {
    keys: STORAGE_KEYS,
    domains: CACHE_DOMAINS,
    schemaVersion: CACHE_SCHEMA_VERSION,
    asyncStates: ASYNC_STATE_TYPES,
    offlineDbName: OFFLINE_DB_NAME,
    offlineDbVersion: OFFLINE_DB_VERSION,
    getJson: getJson,
    setJson: setJson,
    remove: removeLocal,
    getMeta: getCacheMetaRoot,
    getDomainMeta: getCacheDomainMeta,
    getDomainTtlMs: resolveCacheTtlMs,
    markDomain: markCacheDomain,
    isDomainFresh: isCacheDomainFresh,
    invalidateDomain: invalidateCacheDomain,
    clearDomains: clearCacheDomains,
    ensureSchemaVersion: ensureStorageSchemaVersion,
    setDomainCache: setDomainCache,
    getDomainCache: getDomainCache,
    removeDomainCache: removeDomainCache,
    buildEnvelope: buildCacheEnvelope,
    evaluateEnvelope: evaluateCacheEnvelope,
    offlineDB: {
      open: openOfflineDB,
      putCacheEntry: putOfflineCacheEntry,
      getCacheEntry: getOfflineCacheEntry,
      deleteCacheEntry: deleteOfflineCacheEntry,
      clearCacheDomain: clearOfflineCacheDomain,
      clearStore: clearOfflineStore,
      pruneExpired: deleteExpiredOfflineCacheEntries,
      stores: OFFLINE_STORES
    }
  };

  const storageState = ensureStorageSchemaVersion();

  const safeRender = {
    escapeHTML: escapeHTML,
    text: safeText,
    message: safeMessage,
    attr: safeAttr,
    url: safeUrl,
    urlAttr: safeUrlAttr,
    lines: safeLines,
    html: sanitizeHTML,
    domId: safeDomId,
    jsStringAttr: safeJsStringAttr,
    setText: setSafeText,
    setHTML: setSafeHTML,
    renderAsyncState: renderAsyncState,
    renderCacheState: renderCacheState,
    setAsyncState: setAsyncState
  };

  const themeTokens = {
    defaults: VISUAL_TOKEN_DEFAULTS,
    build: buildVisualTokens,
    apply: applyVisualTokens,
    sanitizeColor: sanitizeCssColor
  };

  const navigation = {
    matrix: NAVIGATION_MATRIX,
    menuGroups: NAVIGATION_MENU_GROUPS,
    normalizeProfile: normalizeAccessProfile,
    getCurrentProfile: getCurrentNavigationProfile,
    getConfig: getNavigationConfig,
    getDefaultView: getDefaultViewForProfile,
    getKnownViews: getKnownNavigationViews,
    isKnownView: isKnownNavigationView,
    canAccessView: profileCanAccessView,
    resolveViewAccess: resolveViewAccess,
    hasAction: profileHasAction,
    canExecuteAction: canExecuteNavigationAction,
    applyVisibility: applyNavigationVisibility,
    permissionsForProfile: permissionsForProfile
  };

  const adapters = {
    themeConfig: adaptThemeConfig,
    studentIdentity: adaptStudentIdentity,
    operatorSession: adaptOperatorSession,
    semesterContext: function adaptSemester(raw) { return adaptSemesterContext(raw || {}, {}); },
    auditStudent: adaptAuditStudent,
    dashboardStats: adaptDashboardStats,
    documentFile: adaptDocumentFile,
    trip: adaptTrip,
    muralMessage: adaptMuralMessage,
    muralFeed: adaptMuralFeed,
    avisoAtivo: adaptAvisoAtivo,
    avisosAtivos: adaptAvisosAtivos,
    pushFilters: adaptPushFilters,
    pushResult: adaptPushResult,
    walletVisualState: adaptWalletVisualState,
    apiResult: normalizeApiResult,
    apiError: normalizeApiError
  };

  const payloadBuilders = {
    base: buildBasePayload,
    publico: buildPublicPayload,
    estudante: buildStudentPayload,
    operador: buildOperatorPayload,
    semestre: buildSemesterPayload,
    mobilidade: buildMobilityPayload,
    documento: buildDocumentPayload,
    atualizacaoEstagio: buildStageUpdatePayload,
    muralPost: buildMuralPostPayload,
    muralVote: buildMuralVotePayload,
    pushToken: buildPushTokenPayload,
    avisoPublico: buildAvisoPublicoPayload,
    pushSegmentado: buildPushSegmentadoPayload
  };

  const contexts = {
    tenant: { get: getTenantContext, set: setTenantContext },
    theme: { get: getThemeConfig, set: setThemeConfig },
    student: { get: getStudentIdentity, set: setStudentIdentity, clear: function clearStudent() { removeLocal(STORAGE_KEYS.studentIdentity); invalidateCacheDomain("wallet"); return true; } },
    operator: { get: getOperatorSession, set: setOperatorSession, clear: function clearOperator() { removeLocal(STORAGE_KEYS.operatorSession); invalidateCacheDomain("session"); return true; } },
    semester: { get: getSemesterContext, set: setSemesterContext }
  };

  const apiClient = {
    call: apiClientCall,
    rawCall: function rawCall(action, payload) {
      if (typeof window.apiCall !== "function") {
        return Promise.resolve({ sucesso: false, erro: "apiCall nao esta disponivel no bundle atual." });
      }
      return window.apiCall(action, payload || {});
    },
    normalizeResult: normalizeApiResult,
    normalizeError: normalizeApiError,
    getToken: getToken
  };

  window.MaestroData = {
    version: DATA_LAYER_VERSION,
    rules: BUSINESS_RULES,
    apiClient: apiClient,
    contexts: contexts,
    payloadBuilders: payloadBuilders,
    adapters: adapters,
    safeRender: safeRender,
    themeTokens: themeTokens,
    navigation: navigation,
    storage: storage,
    storageState: storageState,
    utils: {
      cleanCpf: cleanCpf,
      escapeHTML: escapeHTML,
      safeText: safeText,
      safeMessage: safeMessage,
      safeAttr: safeAttr,
      safeUrl: safeUrl,
      sanitizeCssColor: sanitizeCssColor,
      redactLogValue: redactSensitiveText,
      sanitizeLogDetails: sanitizeLogDetails,
      logSafe: logSafe,
      normalizeAccessProfile: normalizeAccessProfile,
      normalizeTurno: normalizeTurno,
      normalizeUpper: normalizeUpper,
      normalizeSimNao: normalizeSimNao,
      toArray: toArray,
      pickFirst: pickFirst,
      pickPath: pickPath,
      mergeDefined: mergeDefined
    }
  };

  window.MaestroAPI = apiClient;
  window.MaestroSafeRender = safeRender;
  window.MaestroTheme = themeTokens;
  window.MaestroLogger = {
    log: function log(message, details) { return logSafe("log", message, details); },
    info: function info(message, details) { return logSafe("info", message, details); },
    warn: function warn(message, details) { return logSafe("warn", message, details); },
    error: function error(message, details) { return logSafe("error", message, details); },
    debug: function debug(message, details) { return logSafe("debug", message, details); },
    sanitize: sanitizeLogDetails,
    redact: redactSensitiveText
  };
  window.logMaestroSafe = logSafe;
  window.MaestroNavigation = navigation;
  window.aplicarTokensVisuaisMaestro = applyVisualTokens;
  window.aplicarNavegacaoMaestro = applyNavigationVisibility;
  window.podeAcessarViewMaestro = function podeAcessarViewMaestro(viewId, profile) {
    return profileCanAccessView(profile, viewId);
  };
  window.podeExecutarAcaoMaestro = function podeExecutarAcaoMaestro(action, options) {
    return canExecuteNavigationAction(action, null, options || {});
  };
  window.obterViewInicialMaestro = getDefaultViewForProfile;
  window.escapeHTMLMaestro = escapeHTML;
  window.safeTextMaestro = safeText;
  window.safeMessageMaestro = safeMessage;
  window.safeAttrMaestro = safeAttr;
  window.safeUrlMaestro = safeUrl;
  window.safeUrlAttrMaestro = safeUrlAttr;
  window.safeLinesMaestro = safeLines;
  window.sanitizeHTMLMaestro = sanitizeHTML;
  window.safeDomIdMaestro = safeDomId;
  window.safeJsStringAttrMaestro = safeJsStringAttr;
  window.renderAsyncStateMaestro = renderAsyncState;
  window.renderCacheStateMaestro = renderCacheState;
  window.setAsyncStateMaestro = setAsyncState;
})(window);
