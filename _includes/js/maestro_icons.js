/* ==========================================================================
 * Maestro Icons
 * Replaces device-dependent emoji glyphs with consistent inline SVG icons.
 * ========================================================================== */
(function initMaestroIcons(window, document) {
  "use strict";

  if (!window || !document || window.MaestroIcons) return;

  const ICON_PATHS = {
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
    briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/>',
    bus: '<path d="M6 17h12"/><path d="M6 17v3"/><path d="M18 17v3"/><path d="M5 6h14"/><path d="M6 3h12a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3Z"/><path d="M8 12h.01"/><path d="M16 12h.01"/>',
    camera: '<path d="M14.5 4 16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2Z"/><circle cx="12" cy="13" r="3"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    crown: '<path d="m2 6 5 4 5-7 5 7 5-4-2 13H4Z"/><path d="M4 19h16"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h13l-1 5 1 5H4"/>',
    gauge: '<path d="M12 14 16 8"/><path d="M4 14a8 8 0 0 1 16 0"/><path d="M5 19h14"/>',
    graduation: '<path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
    headset: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 19a2 2 0 0 1-2 2h-3"/><rect x="3" y="13" width="4" height="6" rx="2"/><rect x="17" y="13" width="4" height="6" rx="2"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    idCard: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 9h3"/><path d="M15 13h3"/><path d="M7 16h5"/>',
    key: '<circle cx="7.5" cy="14.5" r="4.5"/><path d="m11 11 9-9"/><path d="m15 6 3 3"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-.7.6-1 1.5-1 2H9c0-.5-.3-1.4-1-2Z"/>',
    locate: '<path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="4"/>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    map: '<path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    mapPin: '<path d="M12 21s7-5.3 7-12a7 7 0 1 0-14 0c0 6.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 13Z"/><path d="M11.6 16.8A3 3 0 0 1 6 15"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    paperclip: '<path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 1 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    pin: '<path d="m12 17-5 5"/><path d="M9 3h6l1 7 3 3v2H5v-2l3-3Z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    robot: '<rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 8V4"/><path d="M8 12h.01"/><path d="M16 12h.01"/><path d="M9 16h6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    sparkles: '<path d="M12 3 10 8l-5 2 5 2 2 5 2-5 5-2-5-2Z"/><path d="M19 16v3"/><path d="M17.5 17.5h3"/>',
    thumbsDown: '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V3H5.7a2 2 0 0 0-2 1.7l-1 7A2 2 0 0 0 4.7 14H10Z"/><path d="M17 3h3v11h-3"/>',
    thumbsUp: '<path d="M14 9V5a3 3 0 0 0-3-3L7 11v10h11.3a2 2 0 0 0 2-1.7l1-7A2 2 0 0 0 19.3 10H14Z"/><path d="M7 21H4V11h3"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H5"/><path d="M16 14h.01"/>',
    xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    zap: '<path d="M13 2 3 14h8l-1 8 11-13h-8Z"/>'
  };

  const EMOJI_TO_ICON = [
    ["⚙️", "settings"], ["⚙", "settings"],
    ["🔔", "bell"], ["📍", "mapPin"], ["🎯", "locate"],
    ["📷", "camera"], ["📸", "camera"], ["🛡️", "shield"], ["🛡", "shield"],
    ["📖", "book"], ["📜", "file"], ["🔒", "lock"], ["🔐", "lock"],
    ["📱", "phone"], ["📲", "phone"], ["⚠️", "alert"], ["⚠", "alert"],
    ["🚨", "alert"], ["📢", "megaphone"], ["📣", "megaphone"],
    ["📌", "pin"], ["⚡", "zap"], ["🌗", "moon"], ["✈️", "map"], ["✈", "map"],
    ["🎓", "graduation"], ["🗣️", "megaphone"], ["🗣", "megaphone"],
    ["🏢", "home"], ["📝", "edit"], ["🔍", "gauge"], ["🪪", "idCard"],
    ["📤", "upload"], ["📥", "download"], ["📎", "paperclip"],
    ["🏠", "home"], ["💼", "briefcase"], ["🚌", "bus"], ["🛂", "shield"],
    ["🏁", "flag"], ["📂", "file"], ["📊", "dashboard"], ["📄", "document"],
    ["📧", "mail"], ["🔑", "key"], ["👁", "eye"], ["✅", "check"],
    ["❌", "close"], ["✨", "sparkles"], ["🔄", "refresh"],
    ["🤖", "robot"], ["🎒", "briefcase"], ["💡", "lightbulb"],
    ["❓", "alert"], ["🖼️", "file"], ["🖼", "file"], ["🗺️", "map"],
    ["🗺", "map"], ["📡", "gauge"], ["🕒", "gauge"], ["🟢", "check"],
    ["🔴", "close"], ["👑", "crown"], ["👤", "user"], ["👍", "thumbsUp"],
    ["👎", "thumbsDown"], ["➡️", "arrowRight"], ["➡", "arrowRight"],
    ["⬅️", "arrowLeft"], ["⬅", "arrowLeft"], ["▶", "arrowRight"]
  ];

  const emojiPattern = new RegExp(EMOJI_TO_ICON
    .map(([emoji]) => emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"), "gu");
  const emojiLookup = Object.fromEntries(EMOJI_TO_ICON);
  const skipSelector = "script, style, textarea, input, canvas, svg, .maestro-icon, [data-maestro-icons-skip]";

  function svg(name, options) {
    const iconName = ICON_PATHS[name] ? name : "sparkles";
    const opts = options || {};
    const classes = ["maestro-icon", opts.className || ""].filter(Boolean).join(" ");
    const aria = opts.label
      ? `role="img" aria-label="${escapeAttr(opts.label)}"`
      : 'aria-hidden="true" focusable="false"';
    return `<svg class="${classes}" data-maestro-icon="${escapeAttr(iconName)}" ${aria} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[iconName]}</svg>`;
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function iconElement(name) {
    const span = document.createElement("span");
    span.className = "maestro-icon-inline";
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = svg(name);
    return span;
  }

  function hydrateIconSlots(root) {
    const scope = root || document.body;
    if (!scope || !scope.querySelectorAll) return;
    const slots = scope.querySelectorAll("[data-maestro-icon-slot]");
    slots.forEach(slot => {
      const iconName = slot.getAttribute("data-maestro-icon-slot") || "sparkles";
      const label = slot.getAttribute("aria-label") || "";
      slot.innerHTML = svg(iconName, { label: label || null });
      slot.setAttribute("data-maestro-icons-skip", "true");
      if (!label) slot.setAttribute("aria-hidden", "true");
    });
  }

  function stripEmoji(text) {
    return String(text || "").replace(emojiPattern, "").replace(/\s{2,}/g, " ").trim();
  }

  function replaceTextNode(node) {
    const text = node.nodeValue || "";
    if (!emojiPattern.test(text)) {
      emojiPattern.lastIndex = 0;
      return;
    }
    emojiPattern.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = emojiPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      fragment.appendChild(iconElement(emojiLookup[match[0]] || "sparkles"));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  }

  function decorateOptions(root) {
    const options = root.querySelectorAll ? root.querySelectorAll("option") : [];
    options.forEach(option => {
      const cleaned = stripEmoji(option.textContent || "");
      if (cleaned && cleaned !== option.textContent) option.textContent = cleaned;
    });
  }

  function decorate(root) {
    const scope = root || document.body;
    if (!scope || (scope.matches && scope.matches(skipSelector))) return;

    hydrateIconSlots(scope);
    decorateOptions(scope);

    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
        return emojiPattern.test(node.nodeValue || "")
          ? (emojiPattern.lastIndex = 0, NodeFilter.FILTER_ACCEPT)
          : (emojiPattern.lastIndex = 0, NodeFilter.FILTER_REJECT);
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
  }

  function startObserver() {
    if (!document.body || window.__maestroIconObserverStarted) return;
    window.__maestroIconObserverStarted = true;
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        decorate(document.body);
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    decorate(document.body);
  }

  window.MaestroIcons = {
    svg,
    decorate,
    hydrateIconSlots,
    stripEmoji,
    map: emojiLookup
  };
  window.decorateMaestroIcons = decorate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})(window, document);
