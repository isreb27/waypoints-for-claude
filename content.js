// Waypoints: navigation, saved messages and send times for claude.ai.
// Everything runs on this page and is stored in your browser only.
// Works in Chrome, Edge, Brave and other Chromium browsers, and in Firefox.

(() => {
  'use strict';
  if (window.__waypointsLoaded) return;
  window.__waypointsLoaded = true;

  // ---- claude.ai page structure ----------------------------------------------
  // If Claude changes its website and Waypoints stops finding your messages,
  // these are the lines to update.
  const SEL = {
    user: '[data-testid="user-message"]',   // one of your messages
    userFallback: '.font-user-message',      // older layout
    input: '[contenteditable="true"], textarea', // message box / edit box
  };
  const SEND_LABEL = /\b(send|save|submit|enviar|guardar)\b/i; // buttons that send a message

  // ---- Keyboard shortcuts -------------------------------------------------------
  // A shortcut is a physical key (KeyboardEvent.code, so it works the same with any keyboard
  // layout) plus modifiers. They can be changed in Settings → Shortcuts.
  const ACTIONS = [
    { id: 'prev', label: 'Previous of your messages', repeat: true },
    { id: 'next', label: 'Next of your messages', repeat: true },
    { id: 'save', label: 'Save or unsave the current message' },
    { id: 'panel', label: 'Open or close the panel' },
  ];
  const DEFAULT_KEYS = {
    prev: { code: 'ArrowUp', ctrl: false, alt: true, shift: false, meta: false },
    next: { code: 'ArrowDown', ctrl: false, alt: true, shift: false, meta: false },
    save: { code: 'KeyS', ctrl: false, alt: true, shift: true, meta: false },
    panel: { code: 'KeyP', ctrl: false, alt: true, shift: true, meta: false },
  };
  const MOD_CODES = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
    'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight', 'CapsLock', 'Fn', 'FnLock']);
  const IS_MAC = /mac/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');

  const DEFAULT_SETTINGS = { rail: true, hoverOpen: true, chip: true, hour12: false, pinned: false };
  const PENDING_MS = 60 * 1000;   // a send counts for a new message appearing within this time
  const JUMP_MS = 30 * 1000;      // how long a new tab keeps trying to find a saved message

  const S = {
    settings: mergeSettings(null),
    chatId: undefined,   // current chat id (null on pages that aren't a chat)
    rec: null,           // stored record for this chat: { title, updated, msgs: [{h, n, t, s}] }
    stamps: new Map(),   // "hash.n" -> stored message, for this chat
    list: [],            // your messages on screen: { el, h, n, key, text }
    sig: '',
    prevList: null,
    pending: null,       // last send action: { at, chat }
    saved: [],
    active: -1,
    jump: null,
    tab: 'chat',
    query: '',
    historyLimit: 150,
  };

  // Settings as stored, completed with defaults (including shortcuts added in later versions).
  function mergeSettings(stored) {
    const st = stored && typeof stored === 'object' ? stored : {};
    const keys = { ...DEFAULT_KEYS };
    if (st.keys && typeof st.keys === 'object') {
      for (const a of ACTIONS) {
        if (!(a.id in st.keys)) continue;
        const c = st.keys[a.id];
        keys[a.id] = c && typeof c.code === 'string' && c.code ? c : null; // null: no shortcut
      }
    }
    return { ...DEFAULT_SETTINGS, ...st, keys };
  }

  // ---- Helpers -------------------------------------------------------------------

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }

  function hash(s) {
    let x = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193); }
    return (x >>> 0).toString(36) + s.length.toString(36);
  }

  const chatIdFromUrl = () => (location.pathname.match(/^\/chat\/([\w-]+)/) || [])[1] || null;
  const ck = id => 'c:' + id;
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function chatTitle() {
    const t = document.title.replace(/\s*[-–—|]\s*Claude\s*$/i, '').trim();
    if (t && !/^claude$/i.test(t)) return t;
    return S.list[0] ? S.list[0].text.slice(0, 70) : '';
  }

  const fmtTime = t => new Date(t).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: S.settings.hour12,
  });

  function dayLabel(t) {
    const d = new Date(t);
    const today = new Date();
    const days = Math.round((new Date(today).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
  const fmtFull = t => `${dayLabel(t)}, ${fmtTime(t)}`;

  // ---- Icons ---------------------------------------------------------------------------
  // Built as SVG elements (no HTML strings), each: [size, svg attributes, [child tag, attributes]...].

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LINE = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2 };
  const BOOKMARK = 'M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z';
  const DOT = { r: 1.3, fill: 'currentColor', stroke: 'none' };
  const ICONS = {
    nav: [15, { ...LINE, 'stroke-linecap': 'round' }, [
      ['path', { d: 'M9 6h11M9 12h11M9 18h11' }],
      ['circle', { cx: 4.5, cy: 6, ...DOT }],
      ['circle', { cx: 4.5, cy: 12, ...DOT }],
      ['circle', { cx: 4.5, cy: 18, ...DOT }],
    ]],
    mark: [14, { ...LINE, 'stroke-linejoin': 'round' }, [['path', { d: BOOKMARK }]]],
    marked: [14, { ...LINE, fill: 'currentColor', 'stroke-linejoin': 'round' }, [['path', { d: BOOKMARK }]]],
    pin: [14, { ...LINE, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [['path', { d: 'M12 17v4M8 3h8l-1 6 3 3v2H6v-2l3-3z' }]]],
    panel: [14, LINE, [['rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2.5 }], ['path', { d: 'M14.5 4.5v15' }]]],
    close: [16, { ...LINE, 'stroke-linecap': 'round' }, [['path', { d: 'M6 6l12 12M18 6L6 18' }]]],
  };

  function icon(name) {
    const [size, attrs, parts] = ICONS[name];
    const set = (el, a) => { for (const [k, v] of Object.entries(a)) el.setAttribute(k, v); };
    const svg = document.createElementNS(SVG_NS, 'svg');
    set(svg, { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', ...attrs });
    for (const [tag, a] of parts) {
      const el = document.createElementNS(SVG_NS, tag);
      set(el, a);
      svg.append(el);
    }
    return svg;
  }
  const markIcon = saved => icon(saved ? 'marked' : 'mark');

  // ---- Reading your messages ----------------------------------------------------------

  const cache = new WeakMap();
  function readMessages() {
    let els = document.querySelectorAll(SEL.user);
    if (!els.length) els = document.querySelectorAll(SEL.userFallback);
    const out = [];
    const counts = new Map();
    for (const el of els) {
      const raw = el.textContent || '';
      let c = cache.get(el);
      if (!c || c.raw !== raw) {
        // innerText keeps line breaks between paragraphs; it's only read when the message changes.
        const text = (el.innerText || raw).replace(/\s+/g, ' ').trim();
        c = { raw, text, h: hash(text.slice(0, 4000)) };
        cache.set(el, c);
      }
      if (!c.text) continue;
      const n = (counts.get(c.h) || 0) + 1;
      counts.set(c.h, n);
      out.push({ el, h: c.h, n, key: c.h + '.' + n, text: c.text });
    }
    return out;
  }

  function findIndex(hh, n) {
    const exact = S.list.findIndex(m => m.h === hh && m.n === n);
    return exact !== -1 ? exact : S.list.findIndex(m => m.h === hh);
  }

  // ---- Watching the page -----------------------------------------------------------------

  let scanTimer = null, scanning = false, rescan = false;
  function scheduleScan(ms = 250) {
    if (!scanTimer) scanTimer = setTimeout(() => { scanTimer = null; scan(); }, ms);
  }

  async function scan() {
    if (scanning) { rescan = true; return; }
    scanning = true;
    try {
      const id = chatIdFromUrl();
      if (id !== S.chatId) {
        S.chatId = id;
        S.prevList = null;
        S.sig = '';
        S.active = -1;
        S.rec = null;
        S.stamps = new Map();
        if (id) {
          const r = await chrome.storage.local.get(ck(id));
          if (chatIdFromUrl() !== id) { rescan = true; return; }
          S.rec = r[ck(id)] || { title: '', updated: 0, msgs: [] };
          S.stamps = new Map(S.rec.msgs.map(m => [m.h + '.' + m.n, m]));
        }
      }
      const list = readMessages();
      const sig = list.map(m => m.key).join('|');
      S.list = list;
      if (sig !== S.sig) {
        if (S.chatId) stampNewMessage(list);
        S.prevList = list;
        S.sig = sig;
        renderRail();
        if (drawerOpen() && S.tab === 'chat') renderDrawer();
      }
      updateTitle();
      tryJump();
      updateActive();
    } finally {
      scanning = false;
      if (rescan) { rescan = false; scheduleScan(50); }
    }
  }

  // Store the time of a message you just sent. A message counts as just sent when it's
  // the newest one and either you pressed Enter or a send button in the last minute, or
  // it appeared right after the previous newest message while this chat was open.
  function stampNewMessage(list) {
    const last = list[list.length - 1];
    if (!last || S.stamps.has(last.key)) return;
    let t = 0;
    const p = S.pending;
    if (p && Date.now() - p.at < PENDING_MS && (p.chat === S.chatId || p.chat === null)) {
      t = p.at;
    } else {
      const prev = S.prevList;
      if (prev && prev.length && list.length === prev.length + 1 &&
        list[list.length - 2].key === prev[prev.length - 1].key) t = Date.now();
    }
    if (!t) return;
    S.pending = null;
    const entry = { h: last.h, n: last.n, t, s: last.text.slice(0, 300) };
    S.rec.msgs.push(entry);
    S.rec.title = chatTitle() || S.rec.title;
    S.rec.updated = Date.now();
    S.stamps.set(last.key, entry);
    chrome.storage.local.set({ [ck(S.chatId)]: S.rec });
  }

  function updateTitle() {
    if (!S.rec || !S.rec.msgs.length) return;
    const t = chatTitle();
    if (!t || t === S.rec.title) return;
    S.rec.title = t;
    chrome.storage.local.set({ [ck(S.chatId)]: S.rec });
    let changed = false;
    for (const s of S.saved) if (s.chat === S.chatId && s.title !== t) { s.title = t; changed = true; }
    if (changed) chrome.storage.local.set({ saved: S.saved });
  }

  // ---- Jumping ---------------------------------------------------------------------------

  function scrollParent(el) {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 2) return p;
    }
    return document.scrollingElement;
  }

  function jumpTo(i) {
    const m = S.list[i];
    if (!m || !m.el.isConnected) return;
    const sp = scrollParent(m.el);
    const top = m.el.getBoundingClientRect().top;
    const base = sp === document.scrollingElement ? 0 : Math.max(0, sp.getBoundingClientRect().top);
    sp.scrollTo({ top: sp.scrollTop + top - base - 80, behavior: 'instant' });
    m.el.animate([
      { outline: '2px solid rgba(201,100,66,.9)', outlineOffset: '6px' },
      { outline: '2px solid rgba(201,100,66,0)', outlineOffset: '6px' },
    ], { duration: 1600, easing: 'ease-out' });
    S.active = i;
    markActive();
  }

  function goTo(item) {
    if (item.chat === S.chatId) {
      const i = findIndex(item.h, item.n);
      if (i !== -1) { jumpTo(i); if (window.innerWidth < 900) closeDrawer(); return; }
      toast('That message isn’t in this chat anymore (it may have been edited).');
      return;
    }
    chrome.storage.local.set({ jump: { chat: item.chat, h: item.h, n: item.n, at: Date.now() } });
    window.open('https://claude.ai/chat/' + item.chat, '_blank');
  }

  // A tab opened from a saved message looks for it as the chat loads.
  function tryJump() {
    const j = S.jump;
    if (!j) return;
    if (Date.now() - j.at > JUMP_MS) {
      S.jump = null;
      chrome.storage.local.remove('jump');
      toast('Couldn’t find that message in this chat.');
      return;
    }
    if (j.chat !== S.chatId) return;
    const i = findIndex(j.h, j.n);
    if (i === -1) return;
    S.jump = null;
    chrome.storage.local.remove('jump');
    // Claude may scroll to the bottom once the chat finishes loading, so jump twice.
    setTimeout(() => jumpTo(i), 400);
    setTimeout(() => {
      const el = S.list[i] && S.list[i].el;
      if (el) { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) jumpTo(i); }
    }, 1500);
  }

  function currentTarget(dir) {
    if (!S.list.length) return -1;
    let a = S.active < 0 ? 0 : S.active;
    if (dir < 0) {
      const el = S.list[a].el;
      // In the middle of a long reply: go back to the start of this message first.
      return el.getBoundingClientRect().top < 20 ? a : Math.max(0, a - 1);
    }
    return Math.min(S.list.length - 1, a + 1);
  }

  // ---- Saving --------------------------------------------------------------------------------

  const savedIndex = (chat, m) => S.saved.findIndex(s => s.chat === chat && s.h === m.h && s.n === m.n);

  async function toggleSave(i) {
    const m = S.list[i];
    if (!m) return;
    if (!S.chatId) return toast('Open the chat itself to save its messages.');
    const idx = savedIndex(S.chatId, m);
    if (idx !== -1) {
      S.saved.splice(idx, 1);
      toast('Removed from saved');
    } else {
      const e = S.stamps.get(m.key);
      S.saved.unshift({
        id: newId(), chat: S.chatId, title: chatTitle() || 'Untitled chat',
        h: m.h, n: m.n, text: m.text.slice(0, 600), t: e ? e.t : 0, savedAt: Date.now(), note: '',
      });
      toast('Saved');
    }
    await chrome.storage.local.set({ saved: S.saved });
    refreshAll();
  }

  // ---- Shortcuts -------------------------------------------------------------------------------

  const comboOf = e => ({ code: e.code, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
  const sameCombo = (a, b) => !!a && !!b && a.code === b.code &&
    !!a.ctrl === !!b.ctrl && !!a.alt === !!b.alt && !!a.shift === !!b.shift && !!a.meta === !!b.meta;
  // AltGr (used for @, #, € on many keyboards) shows up as Ctrl+Alt on Windows: never a shortcut.
  const altGr = e => !!(e.getModifierState && e.getModifierState('AltGraph'));

  const KEY_NAMES = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Enter: 'Enter',
    Backspace: 'Backspace', Tab: 'Tab', Escape: 'Esc', Delete: 'Delete', Insert: 'Insert',
    Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '<',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`',
    NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /',
    NumpadDecimal: 'Num .', NumpadEnter: 'Num Enter',
  };
  function keyName(code) {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6);
    return KEY_NAMES[code] || code;
  }

  function comboParts(c) {
    const p = [];
    if (IS_MAC) {
      if (c.ctrl) p.push('⌃');
      if (c.alt) p.push('⌥');
      if (c.shift) p.push('⇧');
      if (c.meta) p.push('⌘');
    } else {
      if (c.ctrl) p.push('Ctrl');
      if (c.alt) p.push('Alt');
      if (c.shift) p.push('Shift');
      if (c.meta) p.push('Meta');
    }
    if (c.code) p.push(keyName(c.code));
    return p;
  }

  function comboNodes(c) {
    const out = [];
    comboParts(c).forEach((part, i) => {
      if (i && !IS_MAC) out.push(' + ');
      out.push(h('kbd', { text: part }));
    });
    return out;
  }

  // Returns true when the shortcut did something (only then is the key kept from Claude).
  function runAction(id) {
    if (id === 'prev' || id === 'next') {
      const i = currentTarget(id === 'prev' ? -1 : 1);
      if (i === -1) return false;
      jumpTo(i);
      return true;
    }
    if (id === 'save') {
      if (!S.list.length) return false;
      toggleSave(Math.max(0, S.active));
      return true;
    }
    if (id === 'panel') {
      if (drawerOpen()) closeDrawer(); else openDrawer();
      return true;
    }
    return false;
  }

  // Recording a new shortcut in Settings.
  let recording = null; // { id, btn }

  function startRecording(id, btn) {
    if (recording) stopRecording();
    recording = { id, btn };
    btn.classList.add('recording');
    btn.textContent = 'Press keys…';
    btn.focus();
  }

  function stopRecording() {
    if (!recording) return;
    const { id, btn } = recording;
    recording = null;
    btn.classList.remove('recording');
    showCombo(btn, S.settings.keys[id]);
  }

  function showCombo(btn, c) {
    btn.textContent = '';
    if (c) btn.append(...comboNodes(c));
    else btn.append(h('span', { class: 'unset', text: 'Not set' }));
  }

  // While modifiers are held, show them: "Alt + Shift + …".
  function showPartial(btn, e) {
    const mods = { code: '', ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
    btn.textContent = '';
    if (mods.ctrl || mods.alt || mods.shift || mods.meta) btn.append(...comboNodes(mods), IS_MAC ? ' …' : ' + …');
    else btn.textContent = 'Press keys…';
  }

  function recordKey(e) {
    e.preventDefault();
    e.stopPropagation();
    const { id, btn } = recording;
    const plain = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
    if (e.key === 'Escape' && plain) { stopRecording(); return; }
    if ((e.key === 'Backspace' || e.key === 'Delete') && plain) { assignKey(id, null); return; }
    if (e.repeat) return;
    if (altGr(e)) { btn.textContent = 'AltGr can’t be used'; return; }
    if (!e.code || MOD_CODES.has(e.code)) { showPartial(btn, e); return; }
    if (!e.ctrlKey && !e.altKey && !e.metaKey) { btn.textContent = IS_MAC ? 'Add ⌥, ⌃ or ⌘' : 'Add Alt or Ctrl'; return; }
    assignKey(id, comboOf(e));
  }

  function assignKey(id, combo) {
    const keys = { ...S.settings.keys, [id]: combo };
    if (combo) {
      for (const a of ACTIONS) {
        if (a.id !== id && sameCombo(keys[a.id], combo)) {
          keys[a.id] = null;
          toast(`Removed that shortcut from “${a.label}”`);
        }
      }
    }
    recording = null;
    setSetting('keys', keys);
  }

  function resetKeys() {
    recording = null;
    setSetting('keys', { ...DEFAULT_KEYS });
    toast('Shortcuts reset');
  }

  // ---- Interface ------------------------------------------------------------------------------

  const CSS = `
:host { --bg:#ffffff; --bg2:#f4f3ee; --line:rgba(31,30,29,.13); --text:#1f1e1d; --muted:#76726b;
  --accent:#c96442; --soft:rgba(201,100,66,.12); --shadow:0 10px 30px rgba(0,0,0,.13);
  font:13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--text); }
:host([data-theme=dark]) { --bg:#262624; --bg2:#31302d; --line:rgba(255,255,255,.12); --text:#ecebe6;
  --muted:#a4a098; --accent:#d97757; --soft:rgba(217,119,87,.17); --shadow:0 10px 30px rgba(0,0,0,.5); }
* { box-sizing:border-box; }
.rail, .drawer, .chip, .toast { font:13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color:var(--text); text-align:left; letter-spacing:normal; -webkit-font-smoothing:antialiased; }
[hidden] { display:none !important; }
button { font:inherit; color:inherit; background:none; border:0; padding:0; margin:0; cursor:pointer; }
input { font:inherit; color:var(--text); }

.rail { position:fixed; right:6px; top:84px; bottom:170px; width:24px; display:flex; flex-direction:column; align-items:center; gap:6px; }
.head { width:24px; height:24px; border-radius:7px; display:grid; place-items:center; color:var(--muted); opacity:.7; flex:none; }
.head:hover { opacity:1; color:var(--text); background:var(--bg2); }
.ticks { flex:1 1 auto; min-height:0; width:24px; display:flex; flex-direction:column; overflow-y:auto; scrollbar-width:none; }
.ticks::-webkit-scrollbar { display:none; }
.tick { flex:0 1 14px; min-height:5px; width:24px; display:flex; align-items:center; justify-content:flex-end; padding-right:4px; }
.tick span { width:8px; height:2px; border-radius:2px; background:var(--muted); opacity:.45; transition:width .12s, opacity .12s; }
.tick:hover span { width:14px; opacity:.9; }
.tick.on span { width:14px; background:var(--accent); opacity:1; }
.tick.saved span { background:var(--accent); opacity:.8; }

.list { position:absolute; right:30px; top:0; width:310px; max-height:100%; display:flex; flex-direction:column;
  background:var(--bg); border:1px solid var(--line); border-radius:12px; box-shadow:var(--shadow); overflow:hidden;
  opacity:0; transform:translateX(6px); pointer-events:none; transition:opacity .12s, transform .12s; }
.rail.open .list { opacity:1; transform:none; pointer-events:auto; }
.lhead { display:flex; align-items:center; gap:4px; padding:7px 8px 7px 12px; border-bottom:1px solid var(--line); color:var(--muted); font-size:12px; }
.grow { flex:1; min-width:0; }
.litems { overflow-y:auto; padding:4px; }
.item { display:grid; grid-template-columns:20px minmax(0,1fr) auto 22px; align-items:center; gap:6px; padding:5px 4px 5px 6px; border-radius:7px; cursor:pointer; }
.item:hover { background:var(--bg2); }
.item.on { background:var(--soft); }
.num { color:var(--muted); font-size:11px; text-align:right; font-variant-numeric:tabular-nums; }
.txt { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.time { color:var(--muted); font-size:11px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.mark { width:22px; height:22px; display:grid; place-items:center; border-radius:6px; color:var(--muted); opacity:0; }
.mark:hover { background:var(--bg2); color:var(--text); }
.item:hover .mark, .card:hover .mark, .mark.saved { opacity:1; }
.mark.saved { color:var(--accent); }
.sep { padding:9px 8px 3px; font-size:10.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
.icon { width:26px; height:26px; display:grid; place-items:center; border-radius:7px; color:var(--muted); flex:none; }
.icon:hover { background:var(--bg2); color:var(--text); }
.icon.active { color:var(--accent); }

.drawer { position:fixed; top:0; right:0; bottom:0; width:min(380px,100vw); display:flex; flex-direction:column;
  background:var(--bg); border-left:1px solid var(--line); box-shadow:var(--shadow);
  transform:translateX(100%); visibility:hidden; transition:transform .16s ease, visibility 0s linear .16s; }
.drawer.open { transform:none; visibility:visible; transition:transform .16s ease; }
.dhead { display:flex; align-items:center; gap:8px; padding:12px 10px 6px 16px; }
.dtitle { font-weight:600; font-size:14px; flex:1; }
.tabs { display:flex; padding:0 10px; border-bottom:1px solid var(--line); }
.tab { padding:8px 9px; color:var(--muted); font-weight:500; border-bottom:2px solid transparent; margin-bottom:-1px; }
.tab:hover { color:var(--text); }
.tab.on { color:var(--text); border-bottom-color:var(--accent); }
.tab .count { font-size:11px; color:var(--muted); margin-left:3px; }
.search { margin:10px 12px 4px; width:calc(100% - 24px); padding:7px 10px; border:1px solid var(--line); border-radius:8px; background:var(--bg2); outline:none; }
.search:focus { border-color:var(--accent); }
.dbody { flex:1; overflow-y:auto; padding:2px 6px 20px; }
.card { position:relative; padding:8px 10px; border-radius:9px; cursor:pointer; }
.card:hover { background:var(--bg2); }
.card.on { background:var(--soft); }
.meta { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:11.5px; margin-bottom:2px; }
.meta .grow { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.body { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word; }
.note { display:block; width:100%; margin-top:6px; padding:4px 8px; border:1px solid transparent; border-radius:6px; background:transparent; font-size:12px; color:var(--muted); outline:none; }
.card:hover .note, .note:focus, .note:not(:placeholder-shown) { border-color:var(--line); background:var(--bg); }
.note:focus { border-color:var(--accent); color:var(--text); }
.empty { padding:28px 16px; color:var(--muted); text-align:center; }
.more { display:block; margin:10px auto; padding:6px 12px; border:1px solid var(--line); border-radius:8px; color:var(--muted); }
.more:hover { color:var(--text); }

.settings { padding:10px 10px 20px; }
.settings h3 { margin:14px 0 6px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
.row { display:flex; gap:10px; align-items:flex-start; padding:6px 0; cursor:pointer; }
.row input { margin:2px 0 0; accent-color:var(--accent); width:15px; height:15px; flex:none; }
.stats { color:var(--muted); }
.btns { display:flex; flex-wrap:wrap; gap:6px; }
.btn { padding:6px 11px; border:1px solid var(--line); border-radius:8px; background:var(--bg2); font-weight:500; }
.btn:hover { border-color:var(--muted); }
.btn.danger { color:#c2333a; }
kbd { font:11px ui-monospace, Menlo, monospace; padding:1px 5px; border:1px solid var(--line); border-radius:4px; background:var(--bg2); }
.krow { display:flex; align-items:center; gap:10px; padding:4px 0; }
.kbtn, .kfixed { flex:none; min-width:124px; min-height:28px; padding:3px 8px; border:1px solid var(--line); border-radius:8px;
  text-align:center; white-space:nowrap; color:var(--muted); font-size:12px; }
.kfixed { border-style:dashed; display:inline-flex; align-items:center; justify-content:center; }
.kbtn { background:var(--bg2); }
.kbtn:hover { border-color:var(--muted); color:var(--text); }
.kbtn kbd { background:var(--bg); }
.kbtn.recording { border-color:var(--accent); background:var(--soft); color:var(--text); }
.kbtn:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
.unset { font-style:italic; }

.chip { position:fixed; display:flex; align-items:center; gap:2px; height:26px; padding:0 2px 0 9px; background:var(--bg);
  border:1px solid var(--line); border-radius:13px; box-shadow:0 2px 10px rgba(0,0,0,.08); color:var(--muted);
  font-size:11.5px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.chip.notime { padding-left:2px; }
.chip .mark { opacity:1; }
.toast { position:fixed; left:50%; bottom:26px; transform:translate(-50%,6px); padding:8px 14px; border-radius:9px;
  background:var(--text); color:var(--bg); font-size:12.5px; opacity:0; pointer-events:none; transition:opacity .15s, transform .15s; }
.toast.show { opacity:1; transform:translate(-50%,0); }
`;

  let ui = null;

  function buildUI() {
    // Remove a panel left behind by an earlier copy of Waypoints. Firefox starts the new version
    // in open tabs when it updates, but the old version's elements stay on the page.
    for (const old of document.querySelectorAll('#waypoints-root')) old.remove();

    const host = h('div', { id: 'waypoints-root' });
    host.style.cssText = 'all:initial; position:fixed; top:0; left:0; width:0; height:0; z-index:2147483000;';
    const root = host.attachShadow({ mode: 'open' });

    const head = h('button', { class: 'head', title: 'Waypoints: saved messages, history and settings' }, icon('nav'));
    const ticks = h('div', { class: 'ticks' });
    const litems = h('div', { class: 'litems' });
    const lcount = h('span', { class: 'grow' });
    const pinBtn = h('button', { class: 'icon', title: 'Keep this list open' }, icon('pin'));
    const panelBtn = h('button', { class: 'icon', title: 'Open the Waypoints panel' }, icon('panel'));
    const list = h('div', { class: 'list' }, h('div', { class: 'lhead' }, lcount, pinBtn, panelBtn), litems);
    const rail = h('div', { class: 'rail' }, head, ticks, list);

    const tabs = {};
    const tabBar = h('div', { class: 'tabs' },
      ...[['chat', 'This chat'], ['saved', 'Saved'], ['history', 'History'], ['settings', 'Settings']].map(([k, label]) =>
        (tabs[k] = h('button', { class: 'tab', 'data-tab': k }, label, h('span', { class: 'count' })))));
    const search = h('input', { class: 'search', type: 'search', placeholder: 'Search' });
    const dbody = h('div', { class: 'dbody' });
    const closeBtn = h('button', { class: 'icon', title: 'Close (Esc)' }, icon('close'));
    const drawer = h('div', { class: 'drawer' },
      h('div', { class: 'dhead' }, h('span', { class: 'dtitle', text: 'Waypoints' }), closeBtn), tabBar, search, dbody);

    const chipTime = h('span');
    const chipMark = h('button', { class: 'mark' });
    const chip = h('div', { class: 'chip', hidden: true }, chipTime, chipMark);
    const toastEl = h('div', { class: 'toast' });

    root.append(h('style', { text: CSS }), rail, drawer, chip, toastEl);
    // Keep typing in the panel (search, notes) from reaching Claude's own shortcuts.
    for (const type of ['keydown', 'keyup', 'keypress']) root.addEventListener(type, e => e.stopPropagation());
    document.documentElement.append(host);
    ui = {
      host, root, rail, head, ticks, list, litems, lcount, pinBtn, panelBtn, drawer, tabs, search, dbody, closeBtn,
      chip, chipTime, chipMark, toastEl
    };

    // Rail
    head.addEventListener('click', () => (drawerOpen() ? closeDrawer() : openDrawer()));
    ticks.addEventListener('click', e => { const t = e.target.closest('.tick'); if (t) jumpTo(+t.dataset.i); });
    litems.addEventListener('click', e => {
      const it = e.target.closest('.item');
      if (!it) return;
      if (e.target.closest('.mark')) toggleSave(+it.dataset.i);
      else jumpTo(+it.dataset.i);
    });
    pinBtn.addEventListener('click', () => setSetting('pinned', !S.settings.pinned));
    panelBtn.addEventListener('click', () => { openDrawer('chat'); if (!S.settings.pinned) closeRail(); });
    let openT, closeT;
    rail.addEventListener('mouseenter', () => {
      clearTimeout(closeT);
      if (S.settings.hoverOpen && S.list.length) openT = setTimeout(openRail, 140);
    });
    rail.addEventListener('mouseleave', () => {
      clearTimeout(openT);
      if (!S.settings.pinned) closeT = setTimeout(closeRail, 350);
    });

    // Drawer
    closeBtn.addEventListener('click', closeDrawer);
    tabBar.addEventListener('click', e => {
      const t = e.target.closest('.tab');
      if (t) { S.tab = t.dataset.tab; S.historyLimit = 150; renderDrawer(); }
    });
    let searchT;
    search.addEventListener('input', () => {
      clearTimeout(searchT);
      searchT = setTimeout(() => { S.query = search.value.trim().toLowerCase(); renderDrawer(); }, 120);
    });

    // Hover chip on your messages
    let hideT;
    const hideChip = () => { hideT = setTimeout(() => { chip.hidden = true; }, 350); };
    chip.addEventListener('mouseenter', () => clearTimeout(hideT));
    chip.addEventListener('mouseleave', hideChip);
    chipMark.addEventListener('click', () => { if (chip.dataset.i) toggleSave(+chip.dataset.i).then(() => showChip(+chip.dataset.i)); });
    document.addEventListener('mouseover', e => {
      if (!S.settings.chip || e.target === host) return;
      const el = e.target.closest && (e.target.closest(SEL.user) || e.target.closest(SEL.userFallback));
      if (!el) { if (!chip.hidden) { clearTimeout(hideT); hideChip(); } return; }
      const i = S.list.findIndex(m => m.el === el || m.el.contains(el) || el.contains(m.el));
      if (i === -1) return;
      clearTimeout(hideT);
      showChip(i);
    }, { passive: true });
    document.addEventListener('scroll', () => {
      chip.hidden = true;
      if (!activeFrame) activeFrame = requestAnimationFrame(() => { activeFrame = 0; updateActive(); });
    }, { capture: true, passive: true });
  }

  let activeFrame = 0;

  function showChip(i) {
    const m = S.list[i];
    if (!m || !m.el.isConnected) return;
    const e = S.stamps.get(m.key);
    const saved = S.chatId && savedIndex(S.chatId, m) !== -1;
    ui.chip.dataset.i = i;
    ui.chipTime.textContent = e ? fmtTime(e.t) : '';
    ui.chip.title = e ? 'Sent ' + fmtFull(e.t) : 'Sent before Waypoints was installed';
    ui.chip.classList.toggle('notime', !e);
    ui.chipMark.replaceChildren(markIcon(saved));
    ui.chipMark.className = 'mark' + (saved ? ' saved' : '');
    ui.chipMark.title = saved ? 'Remove from saved' : 'Save this message';
    ui.chip.hidden = false;
    const r = m.el.getBoundingClientRect();
    const w = ui.chip.offsetWidth, hgt = ui.chip.offsetHeight;
    let left, top = Math.max(4, r.top);
    if (r.left - w - 10 > 0) left = r.left - w - 10;
    else if (innerWidth - r.right > w + 40) left = r.right + 10;
    else { left = Math.max(4, r.right - w); top = Math.max(4, r.top - hgt - 4); }
    ui.chip.style.left = left + 'px';
    ui.chip.style.top = top + 'px';
  }

  function toast(msg) {
    if (!ui) return;
    ui.toastEl.textContent = msg;
    ui.toastEl.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ui.toastEl.classList.remove('show'), 2200);
  }

  // ---- Rail ---------------------------------------------------------------------------------

  const railOpen = () => ui.rail.classList.contains('open');
  function openRail() { renderRailList(); ui.rail.classList.add('open'); scrollListToActive(); }
  function closeRail() { ui.rail.classList.remove('open'); }

  function renderRail() {
    if (!ui) return;
    ui.rail.hidden = !S.settings.rail;
    ui.ticks.textContent = '';
    ui.ticks.hidden = !S.list.length;
    const frag = document.createDocumentFragment();
    S.list.forEach((m, i) => {
      const saved = S.chatId && savedIndex(S.chatId, m) !== -1;
      frag.append(h('button', { class: 'tick' + (saved ? ' saved' : ''), 'data-i': i, title: `${i + 1}. ${m.text.slice(0, 80)}` }, h('span')));
    });
    ui.ticks.append(frag);
    if (!S.list.length) closeRail();
    else if (railOpen() || S.settings.pinned) { renderRailList(); ui.rail.classList.add('open'); }
    markActive();
  }

  function renderRailList() {
    const box = ui.litems;
    box.textContent = '';
    const n = S.list.length;
    ui.lcount.textContent = `${n} message${n === 1 ? '' : 's'} from you`;
    ui.pinBtn.classList.toggle('active', S.settings.pinned);
    ui.pinBtn.title = S.settings.pinned ? 'Close this list when the mouse leaves' : 'Keep this list open';
    const frag = document.createDocumentFragment();
    let lastDay = '';
    S.list.forEach((m, i) => {
      const e = S.stamps.get(m.key);
      if (e) {
        const d = dayLabel(e.t);
        if (d !== lastDay) { frag.append(h('div', { class: 'sep', text: d })); lastDay = d; }
      }
      const saved = S.chatId && savedIndex(S.chatId, m) !== -1;
      frag.append(h('div', { class: 'item' + (i === S.active ? ' on' : ''), 'data-i': i, title: e ? 'Sent ' + fmtFull(e.t) : '' },
        h('span', { class: 'num', text: i + 1 }),
        h('span', { class: 'txt', text: m.text }),
        h('span', { class: 'time', text: e ? fmtTime(e.t) : '' }),
        h('button', { class: 'mark' + (saved ? ' saved' : ''), title: saved ? 'Remove from saved' : 'Save' }, markIcon(saved))));
    });
    box.append(frag);
  }

  function updateActive() {
    if (!S.list.length) return;
    const limit = innerHeight * 0.4;
    let a = 0;
    for (let i = 0; i < S.list.length; i++) {
      if (S.list[i].el.getBoundingClientRect().top <= limit) a = i; else break;
    }
    if (a !== S.active) { S.active = a; markActive(); }
  }

  function markActive() {
    if (!ui) return;
    for (const el of ui.ticks.children) el.classList.toggle('on', +el.dataset.i === S.active);
    for (const el of ui.litems.querySelectorAll('.item')) el.classList.toggle('on', +el.dataset.i === S.active);
    if (railOpen()) scrollListToActive();
    const t = ui.ticks.children[S.active];
    if (t) {
      const box = ui.ticks;
      if (t.offsetTop < box.scrollTop || t.offsetTop > box.scrollTop + box.clientHeight - 14) box.scrollTop = t.offsetTop - box.clientHeight / 2;
    }
  }

  function scrollListToActive() {
    const it = ui.litems.querySelector('.item.on');
    if (!it) return;
    const box = ui.litems;
    if (it.offsetTop < box.scrollTop || it.offsetTop + it.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = it.offsetTop - box.clientHeight / 2;
    }
  }

  // ---- Drawer -------------------------------------------------------------------------------

  const drawerOpen = () => ui && ui.drawer.classList.contains('open');
  function openDrawer(tab) {
    if (tab) S.tab = tab;
    ui.drawer.classList.add('open');
    renderDrawer();
  }
  function closeDrawer() {
    if (!ui) return;
    if (recording) stopRecording();
    ui.drawer.classList.remove('open');
  }

  const matches = (...fields) => !S.query || fields.some(f => f && f.toLowerCase().includes(S.query));

  let renderToken = 0;
  function renderDrawer() {
    if (!drawerOpen()) return;
    const token = ++renderToken;
    for (const [k, b] of Object.entries(ui.tabs)) b.classList.toggle('on', k === S.tab);
    ui.tabs.chat.querySelector('.count').textContent = S.list.length || '';
    ui.tabs.saved.querySelector('.count').textContent = S.saved.length || '';
    ui.search.hidden = S.tab === 'settings';
    ui.search.placeholder = { chat: 'Search this chat', saved: 'Search saved messages and notes', history: 'Search everything you’ve sent' }[S.tab] || '';
    const body = ui.dbody;
    const keep = body.scrollTop;
    if (S.tab !== 'settings') recording = null;
    if (S.tab === 'chat') renderChatTab(body);
    else if (S.tab === 'saved') renderSavedTab(body);
    else if (S.tab === 'history') renderHistoryTab(body, token);
    else renderSettingsTab(body);
    if (S.tab !== 'history') body.scrollTop = keep;
  }

  function empty(msg) { return h('div', { class: 'empty', text: msg }); }

  function renderChatTab(body) {
    body.textContent = '';
    if (!S.list.length) return body.append(empty(S.chatId ? 'No messages from you yet.' : 'Open a chat to see your messages here.'));
    const frag = document.createDocumentFragment();
    let lastDay = '', shown = 0;
    S.list.forEach((m, i) => {
      if (!matches(m.text)) return;
      shown++;
      const e = S.stamps.get(m.key);
      if (e) {
        const d = dayLabel(e.t);
        if (d !== lastDay) { frag.append(h('div', { class: 'sep', text: d })); lastDay = d; }
      }
      const saved = S.chatId && savedIndex(S.chatId, m) !== -1;
      const mark = h('button', {
        class: 'mark' + (saved ? ' saved' : ''), title: saved ? 'Remove from saved' : 'Save',
        onclick: ev => { ev.stopPropagation(); toggleSave(i); }
      }, markIcon(saved));
      frag.append(h('div', { class: 'card' + (i === S.active ? ' on' : ''), onclick: () => jumpTo(i) },
        h('div', { class: 'meta' }, h('span', { class: 'grow', text: `#${i + 1}` + (e ? ` · ${fmtTime(e.t)}` : '') }), mark),
        h('div', { class: 'body', text: m.text })));
    });
    body.append(shown ? frag : empty('Nothing matches your search.'));
  }

  function renderSavedTab(body) {
    body.textContent = '';
    if (!S.saved.length) {
      return body.append(empty('Nothing saved yet. Hover one of your messages and click the bookmark, or use the bookmark in the list on the right.'));
    }
    const items = S.saved.filter(s => matches(s.text, s.note, s.title));
    if (!items.length) return body.append(empty('Nothing matches your search.'));
    for (const s of items) {
      const note = h('input', { class: 'note', placeholder: 'Add a note…', value: s.note || '' });
      note.value = s.note || '';
      note.addEventListener('click', e => e.stopPropagation());
      note.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') note.blur(); });
      note.addEventListener('change', () => { s.note = note.value.trim(); chrome.storage.local.set({ saved: S.saved }); });
      const remove = h('button', {
        class: 'mark saved', title: 'Remove from saved', onclick: ev => {
          ev.stopPropagation();
          S.saved = S.saved.filter(x => x.id !== s.id);
          chrome.storage.local.set({ saved: S.saved });
          refreshAll();
        }
      }, markIcon(true));
      const here = s.chat === S.chatId;
      body.append(h('div', { class: 'card', title: here ? 'Jump to this message' : 'Open this chat in a new tab', onclick: () => goTo(s) },
        h('div', { class: 'meta' },
          h('span', { class: 'grow', text: (here ? 'This chat' : s.title || 'Untitled chat') + (s.t ? ` · ${fmtFull(s.t)}` : '') }),
          remove),
        h('div', { class: 'body', text: s.text }),
        note));
    }
  }

  async function renderHistoryTab(body, token) {
    const all = await chrome.storage.local.get(null);
    if (token !== renderToken) return;
    const rows = [];
    for (const [k, rec] of Object.entries(all)) {
      if (!k.startsWith('c:') || !rec || !Array.isArray(rec.msgs)) continue;
      for (const m of rec.msgs) if (m.t) rows.push({ chat: k.slice(2), title: rec.title || 'Untitled chat', h: m.h, n: m.n, t: m.t, s: m.s });
    }
    rows.sort((a, b) => b.t - a.t);
    const hits = rows.filter(r => matches(r.s, r.title));
    body.textContent = '';
    if (!rows.length) return body.append(empty('Messages you send from now on appear here, with the day and time you sent them.'));
    if (!hits.length) return body.append(empty('Nothing matches your search.'));
    const frag = document.createDocumentFragment();
    let lastDay = '';
    for (const r of hits.slice(0, S.historyLimit)) {
      const d = dayLabel(r.t);
      if (d !== lastDay) { frag.append(h('div', { class: 'sep', text: d })); lastDay = d; }
      const here = r.chat === S.chatId;
      frag.append(h('div', { class: 'card', title: here ? 'Jump to this message' : 'Open this chat in a new tab', onclick: () => goTo(r) },
        h('div', { class: 'meta' }, h('span', { class: 'grow', text: `${fmtTime(r.t)} · ${here ? 'This chat' : r.title}` })),
        h('div', { class: 'body', text: r.s })));
    }
    body.append(frag);
    if (hits.length > S.historyLimit) {
      body.append(h('button', { class: 'more', text: `Show more (${hits.length - S.historyLimit} left)`, onclick: () => { S.historyLimit += 300; renderDrawer(); } }));
    }
  }

  function shortcutRow(a) {
    const btn = h('button', { class: 'kbtn', title: 'Click, then press the new keys' });
    showCombo(btn, S.settings.keys[a.id]);
    btn.addEventListener('click', () => {
      if (recording && recording.btn === btn) stopRecording();
      else startRecording(a.id, btn);
    });
    btn.addEventListener('blur', () => { if (recording && recording.btn === btn) stopRecording(); });
    return h('div', { class: 'krow' }, h('span', { class: 'grow', text: a.label }), btn);
  }

  function renderSettingsTab(body) {
    recording = null;
    body.textContent = '';
    const box = h('div', { class: 'settings' });
    const toggle = (key, label) => {
      const cb = h('input', { type: 'checkbox' });
      cb.checked = !!S.settings[key];
      cb.addEventListener('change', () => setSetting(key, cb.checked));
      return h('label', { class: 'row' }, cb, h('span', { text: label }));
    };
    const stats = h('p', { class: 'stats', text: '…' });
    chrome.storage.local.get(null).then(all => {
      let chats = 0, msgs = 0;
      for (const [k, rec] of Object.entries(all)) if (k.startsWith('c:') && rec && rec.msgs && rec.msgs.length) { chats++; msgs += rec.msgs.length; }
      stats.textContent = `${msgs} message time${msgs === 1 ? '' : 's'} recorded in ${chats} chat${chats === 1 ? '' : 's'}, ${S.saved.length} saved message${S.saved.length === 1 ? '' : 's'}. Stored only in this browser.`;
    });
    let armed = false;
    const clearBtn = h('button', { class: 'btn danger', text: 'Delete all data' });
    clearBtn.addEventListener('click', async () => {
      if (!armed) { armed = true; clearBtn.textContent = 'Click again to delete everything'; return; }
      await chrome.storage.local.clear();
      await chrome.storage.local.set({ settings: S.settings });
      S.saved = []; S.rec = S.chatId ? { title: '', updated: 0, msgs: [] } : null; S.stamps = new Map();
      toast('All Waypoints data deleted');
      refreshAll();
    });
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      file.value = '';
      if (!f) return;
      try { await importData(JSON.parse(await f.text())); toast('Imported'); refreshAll(); }
      catch { toast('That file isn’t a Waypoints backup.'); }
    });

    const needs = IS_MAC ? '⌥ Option, ⌃ Control or ⌘ Command' : 'Alt or Ctrl';
    const browserKey = IS_MAC ? '⌘T' : 'Ctrl+T';

    box.append(
      h('h3', { text: 'Display' }),
      toggle('rail', 'Show the message rail on the right'),
      toggle('hoverOpen', 'Open the message list when hovering the rail'),
      toggle('chip', 'Show the time and a save button when hovering your messages'),
      toggle('hour12', 'Use a 12-hour clock'),
      h('h3', { text: 'Shortcuts' }),
      ...ACTIONS.map(shortcutRow),
      h('div', { class: 'krow' }, h('span', { class: 'grow', text: 'Close this panel' }),
        h('span', { class: 'kfixed' }, h('kbd', { text: 'Esc' }))),
      h('div', { class: 'krow' }, h('span', { class: 'grow', text: 'Open or close this panel from the toolbar' }),
        h('span', { class: 'kfixed', text: 'Toolbar icon' })),
      h('p', {
        class: 'stats', text: `Click a shortcut, then press the new keys. It needs ${needs}. Esc cancels, Backspace removes it. ` +
          `Shortcuts only work on claude.ai, where they take priority over Claude’s and the browser’s own. ` +
          `Some keys, like ${browserKey}, belong to the browser and can’t be used.`
      }),
      h('div', { class: 'btns' }, h('button', { class: 'btn', text: 'Reset shortcuts', onclick: resetKeys })),
      h('h3', { text: 'Your data' }),
      stats,
      h('div', { class: 'btns' },
        h('button', { class: 'btn', text: 'Export backup', onclick: exportData }),
        h('button', { class: 'btn', text: 'Import backup', onclick: () => file.click() }),
        clearBtn, file),
      h('p', { class: 'stats', text: 'Times are recorded for messages you send while Waypoints is installed. Older messages show no time. Waypoints doesn’t run in private windows.' }));
    body.append(box);
  }

  // ---- Settings and data ----------------------------------------------------------------------

  function setSetting(key, value) {
    S.settings[key] = value;
    chrome.storage.local.set({ settings: S.settings });
    applySettings();
  }

  function applySettings() {
    if (!ui) return;
    ui.rail.hidden = !S.settings.rail;
    if (!S.settings.chip) ui.chip.hidden = true;
    if (S.settings.pinned && S.list.length) openRail();
    else if (!S.settings.pinned && !ui.rail.matches(':hover')) closeRail();
    refreshAll();
  }

  function refreshAll() {
    renderRail();
    if (railOpen()) renderRailList();
    if (drawerOpen()) renderDrawer();
    if (!ui.chip.hidden && ui.chip.dataset.i) showChip(+ui.chip.dataset.i);
  }

  async function exportData() {
    const all = await chrome.storage.local.get(null);
    const chats = {};
    for (const [k, v] of Object.entries(all)) if (k.startsWith('c:')) chats[k.slice(2)] = v;
    const data = { app: 'waypoints', version: 1, exportedAt: new Date().toISOString(), saved: all.saved || [], chats };
    const a = h('a', { download: `waypoints-backup-${new Date().toISOString().slice(0, 10)}.json` });
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    ui.root.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importData(obj) {
    if (!obj || obj.app !== 'waypoints' || typeof obj.chats !== 'object') throw new Error('bad file');
    const cur = await chrome.storage.local.get(null);
    const out = {};
    for (const [id, rec] of Object.entries(obj.chats)) {
      if (!rec || !Array.isArray(rec.msgs)) continue;
      const base = cur[ck(id)] || { title: rec.title || '', updated: rec.updated || 0, msgs: [] };
      const have = new Set(base.msgs.map(m => m.h + '.' + m.n));
      for (const m of rec.msgs) if (!have.has(m.h + '.' + m.n)) base.msgs.push(m);
      base.title = base.title || rec.title || '';
      out[ck(id)] = base;
    }
    const saved = cur.saved || [];
    const ids = new Set(saved.map(s => s.id));
    for (const s of obj.saved || []) if (s && s.id && !ids.has(s.id)) saved.push(s);
    saved.sort((a, b) => b.savedAt - a.savedAt);
    out.saved = saved;
    await chrome.storage.local.set(out);
    S.saved = saved;
    if (S.chatId && out[ck(S.chatId)]) {
      S.rec = out[ck(S.chatId)];
      S.stamps = new Map(S.rec.msgs.map(m => [m.h + '.' + m.n, m]));
    }
  }

  // Match Claude's light or dark look.
  function applyTheme() {
    if (!ui) return;
    const pick = el => {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!m || (m[3] !== undefined && +m[3] < 0.1)) return null;
      return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    };
    let lum = pick(document.body);
    if (lum == null) lum = pick(document.documentElement);
    const dark = lum == null ? matchMedia('(prefers-color-scheme: dark)').matches : lum < 0.5;
    ui.host.dataset.theme = dark ? 'dark' : 'light';
  }

  // ---- Start ------------------------------------------------------------------------------------

  async function init() {
    const st = await chrome.storage.local.get(['settings', 'saved', 'jump']);
    S.settings = mergeSettings(st.settings);
    S.saved = st.saved || [];
    if (st.jump && Date.now() - st.jump.at < JUMP_MS) S.jump = st.jump;

    buildUI();
    applyTheme();
    applySettings();

    new MutationObserver(() => scheduleScan()).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-mode', 'data-theme', 'style'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    setInterval(() => { if (chatIdFromUrl() !== S.chatId) scheduleScan(0); }, 800);

    // Keys: recording a shortcut, noticing a send (Enter in the message box), and your shortcuts.
    // Listening on window in the capture phase sees keys before claude.ai's own handlers do.
    window.addEventListener('keydown', e => {
      if (recording) { recordKey(e); return; }
      const inUI = e.target === ui.host;
      if (!inUI && e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.closest && e.target.closest(SEL.input)) {
        S.pending = { at: Date.now(), chat: chatIdFromUrl() };
        return;
      }
      if (e.key === 'Escape' && drawerOpen()) { closeDrawer(); return; }
      if (inUI || e.isComposing || altGr(e)) return;
      const c = comboOf(e);
      const act = ACTIONS.find(a => sameCombo(S.settings.keys[a.id], c));
      if (!act) return;
      if (e.repeat && !act.repeat) { e.preventDefault(); e.stopPropagation(); return; }
      if (runAction(act.id)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    window.addEventListener('keyup', e => {
      if (recording && MOD_CODES.has(e.code)) { e.preventDefault(); e.stopPropagation(); showPartial(recording.btn, e); }
    }, true);

    // Notice when you send a message with a send/save button.
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button');
      if (b && SEND_LABEL.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '').slice(0, 30))) {
        S.pending = { at: Date.now(), chat: chatIdFromUrl() };
      }
    }, true);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.saved) S.saved = changes.saved.newValue || [];
      if (changes.settings && changes.settings.newValue) S.settings = mergeSettings(changes.settings.newValue);
      if (S.chatId && changes[ck(S.chatId)] && changes[ck(S.chatId)].newValue) {
        S.rec = changes[ck(S.chatId)].newValue;
        S.stamps = new Map(S.rec.msgs.map(m => [m.h + '.' + m.n, m]));
      }
      if (changes.saved || changes.settings || (S.chatId && changes[ck(S.chatId)])) {
        if (changes.settings) applySettings(); else refreshAll();
      }
    });

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'waypoints:toggle') {
        if (drawerOpen()) closeDrawer(); else openDrawer();
        sendResponse({ ok: true });
      }
    });

    scan();
  }

  init();
})();