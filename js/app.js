/* =========================================================
   NEXO · Examen integrador de IA — Motor
   Prof. Rafael Mamani · CIEU · 5.º A Economía y 5.º B Ciencias Naturales
   ========================================================= */
(function () {
  "use strict";
  const C = window.NEXO_CONFIG;
  const I18N = window.NEXO_I18N;

  /* ---------- Datos codificados ---------- */
  const KEY = "nexo|CIEU|5B|rm|2026";
  function decode(b64) {
    const bin = atob(b64), k = new TextEncoder().encode(KEY), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) ^ k[i % k.length];
    return JSON.parse(new TextDecoder().decode(u));
  }
  const DATA = decode(window.NEXO_DATA);
  const MODS = ["ia", "prompt", "bigdata", "iot", "trans", "redes"];
  const MOD_EMOJI = { ia: "🧠", prompt: "🛠️", bigdata: "📊", iot: "📡", trans: "🎬", redes: "🌐", etica: "⚖️" };
  const BADGES = ["ia", "prompt", "bigdata", "iot", "trans", "redes", "etica"];
  const byId = {};
  Object.keys(DATA).forEach(l => { byId[l] = {}; DATA[l].ITEMS.forEach(it => { byId[l][it.id] = it; }); });

  /* ---------- Utilidades ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function hashStr(s) { let h1 = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 3432918353); h1 = (h1 << 13) | (h1 >>> 19); } return h1 >>> 0; }
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function norm(s) { return " " + String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[“”«»"]/g, " ").replace(/\s+/g, " ") + " "; }
  function normK(k) { return String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function hasAny(n, list) { return list.some(k => { const kk = normK(k); return kk.trim() && n.includes(kk); }); }
  function words(s) { return (String(s || "").trim().match(/\S+/g) || []).length; }
  function fmt1(x) { return (Math.round(x * 10) / 10).toLocaleString(langTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function langTag() { return { es: "es-AR", fr: "fr-FR", en: "en-GB" }[S.lang || "es"]; }
  async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s).trim().toUpperCase())); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------- Estado ---------- */
  const SK = C.storageKey, QK = C.storageKey + "-cola", LK = C.storageKey + "-log";
  let S = store.get(SK, null) || fresh();
  function fresh() { return { v: 1, screen: "start", lang: "es", alumno: null, sesion: null, seed: 0, plan: [], mods: [], idx: 0, resp: {}, fb: null, salidas: 0, bloqueado: false, incidentes: 0, pegados: 0, sensible: false, aiUnlocked: false, aiStep: 0, aiData: {}, inicio: 0, fin: 0, itemStart: 0, badges: [], codigo: "" }; }
  function save() { store.set(SK, S); }
  function t(k, vars) {
    let s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.es[k] || k;
    if (vars) for (const v in vars) s = s.split("{" + v + "}").join(vars[v]);
    return s;
  }
  function it(id) { return byId[S.lang][id]; }
  function itES(id) { return byId.es[id]; }
  function ING() { return DATA[S.lang].ING; }

  /* ---------- Registro (Google Sheets) ---------- */
  function send(tipo, data) {
    const row = Object.assign({ tipo, sesion: S.sesion || "", fecha: new Date().toLocaleString("es-AR"), ts: Date.now(), alumno: S.alumno ? S.alumno.apellido + ", " + S.alumno.nombre : "", curso: C.curso }, data);
    const log = store.get(LK, []); log.push(row); store.set(LK, log);
    const q = store.get(QK, []); q.push(row); store.set(QK, q);
    flush();
  }
  let flushing = false;
  async function flush() {
    if (!C.sheetUrl || flushing) { updSync(); return; }
    flushing = true;
    let q = store.get(QK, []);
    while (q.length) {
      try {
        await fetch(C.sheetUrl, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(q[0]) });
        q.shift(); store.set(QK, q);
      } catch (e) { break; }
    }
    flushing = false; updSync();
  }
  setInterval(flush, 8000);
  window.addEventListener("online", flush);
  function updSync() {
    const el = $("#sync"); if (!el) return;
    const n = store.get(QK, []).length;
    el.textContent = !C.sheetUrl ? t("syncOff") : n ? t("syncPend", { n }) : t("syncOk");
    el.className = "sync " + (!C.sheetUrl ? "off" : n ? "pend" : "ok");
  }

  /* ---------- Plan del examen (sorteo por estudiante) ---------- */
  function buildPlan(seed) {
    const r = rng(seed), items = DATA.es.ITEMS, mods = shuffle(MODS, r), plan = [];
    let ai = null;
    // «Justificá tu respuesta»: se sortean C.draw.just preguntas, cada una de un nodo distinto
    const justSel = [];
    shuffle(items.filter(x => x.kind === "just"), r).forEach(x => { if (justSel.length < (C.draw.just || 0) && !justSel.some(j => j.mod === x.mod)) justSel.push(x); });
    mods.forEach(m => {
      const d = C.draw[m]; let chosen = [], imgSel = null;
      Object.keys(d).forEach(kind => {
        let pool = items.filter(x => x.mod === m && x.kind === kind);
        if (kind === "pick" && imgSel) pool = pool.filter(x => x.img !== imgSel); // no repetir la imagen del prompt
        const pick = shuffle(pool, r).slice(0, d[kind]);
        if (kind === "img" && pick[0]) imgSel = pick[0].img;
        if (kind === "ai") ai = pick[0] && pick[0].id; else chosen = chosen.concat(pick.map(p => p.id));
      });
      justSel.filter(j => j.mod === m).forEach(j => chosen.push(j.id));
      shuffle(chosen, r).forEach(id => plan.push(id));
    });
    if (ai) plan.push(ai);
    return { plan, mods };
  }
  function ir(id) { return rng(hashStr(S.seed + "|" + id)); }

  /* ---------- Puntajes ---------- */
  function totals() {
    const per = {}; MODS.forEach(m => per[m] = { got: 0, max: 0, done: 0, n: 0 });
    let got = 0, max = 0, ansMax = 0, eg = 0, em = 0;
    S.plan.forEach(id => {
      const x = itES(id), p = per[x.mod]; p.max += x.pts; p.n++; max += x.pts;
      const r = S.resp[id];
      if (r) { p.got += r.score * x.pts; p.done++; got += r.score * x.pts; ansMax += x.pts; if (x.etica) { eg += r.score * x.pts; em += x.pts; } }
    });
    return { per, got, max, ansMax, eg, em };
  }
  function nota(got, max) { return max ? Math.max(1, Math.round(100 * got / max) / 10) : 1; }

  function checkBadges(final) {
    const T = totals(), nuevos = [];
    MODS.forEach(m => {
      const p = T.per[m];
      if (p.n && p.done === p.n && p.got / p.max >= C.insigniaMin && !S.badges.includes(m)) { S.badges.push(m); nuevos.push(m); }
    });
    if (final && !S.badges.includes("etica") && T.em && T.eg / T.em >= C.insigniaMin && S.salidas <= 1 && !S.sensible) { S.badges.push("etica"); nuevos.push("etica"); }
    nuevos.forEach((b, i) => setTimeout(() => toast(MOD_EMOJI[b] + " " + t("badgeNew") + ": " + t("badge_" + b), "gold"), 400 + i * 900));
    save();
  }

  /* ---------- Rúbricas de prompts ---------- */
  function ingredients(text) {
    const n = norm(text), I = ING(), out = {};
    Object.keys(I).forEach(k => { out[k] = hasAny(n, I[k]); });
    return out;
  }
  const SENS = [/\b\d{2}\.?\d{3}\.?\d{3}\b/, /[\w.+-]+@[\w-]+\.[\w.]+/, /\b(\+?54)?\s?(2901|11|9)\s?-?\d{3,4}\s?-?\d{4}\b/, /contrase[ñn]a\s*[:=]|password\s*[:=]|mot de passe\s*[:=]/i];
  function sensitive(text) { return SENS.some(re => re.test(text)); }
  function gradePrompt(x, text) {
    const n = norm(text), w = words(text), ing = ingredients(text), det = { w, ing };
    let s = 0;
    if (x.type === "img") {
      const hit = x.el.filter(e => hasAny(n, e[1])).length; det.hit = hit; det.of = x.el.length;
      const style = hasAny(n, DATA[S.lang].ESTILO); det.style = style;
      s = 0.65 * Math.min(1, hit / x.need) + 0.2 * (style ? 1 : 0) + 0.15 * (w >= 20 ? 1 : w / 20);
    } else if (x.type === "txt") {
      const hit = x.ck.filter(e => hasAny(n, e[1])).length; det.hit = hit; det.of = x.ck.length;
      const base = ["tarea", "contexto", "formato"].filter(k => ing[k]).length;
      s = 0.7 * Math.min(1, hit / x.need) + 0.3 * base / 3;
    } else if (x.type === "fix") {
      const four = ["rol", "tarea", "contexto", "formato"].filter(k => ing[k]).length;
      const topic = hasAny(n, x.topic); det.topic = topic;
      s = norm(x.weak) === n ? 0 : 0.75 * four / 4 + 0.25 * (topic ? 1 : 0);
    }
    if (w < 8) s *= 0.3;
    det.sens = sensitive(text);
    if (det.sens) s = Math.max(0, s - 0.25);
    return { score: Math.max(0, Math.min(1, s)), det };
  }

  /* ---------- Antitrampa ---------- */
  let awayAt = 0;
  function examActive() { return S.screen === "exam" && !S.fin; }
  function aiFree() { const id = S.plan[S.idx]; return id && itES(id).type === "ai" && S.aiStep === 2; }
  function goneAway() { if (examActive() && !awayAt) awayAt = Date.now(); }
  function cameBack() {
    if (!awayAt) return;
    const ms = Date.now() - awayAt; awayAt = 0;
    if (!examActive() || ms < 1200 || aiFree()) return;
    S.salidas++; save();
    incident("salida", t("incAway", { s: Math.round(ms / 1000) }));
    if (S.salidas >= C.salidasMax) { S.bloqueado = true; save(); lockScreen(); }
    else warnScreen();
    renderHUD();
  }
  document.addEventListener("visibilitychange", () => { document.hidden ? goneAway() : cameBack(); });
  window.addEventListener("blur", goneAway);
  window.addEventListener("focus", cameBack);
  function incident(ev, det) { S.incidentes++; save(); send("incidente", { evento: ev, detalle: det || "", pregunta: S.plan[S.idx] || "", salidas: S.salidas }); }
  document.addEventListener("contextmenu", e => { if (examActive()) e.preventDefault(); });
  document.addEventListener("keydown", e => {
    if (!examActive()) return;
    const k = e.key.toLowerCase();
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) || (e.ctrlKey && ["u", "p", "s"].includes(k))) {
      e.preventDefault(); incident("atajo", e.key + (e.ctrlKey ? "+ctrl" : "") + (e.shiftKey ? "+shift" : "")); toast(t("noShortcut"), "warn");
    }
  });
  ["copy", "cut"].forEach(ev => document.addEventListener(ev, e => { if (examActive() && !e.target.closest("[data-allowcopy]")) { e.preventDefault(); } }));
  document.addEventListener("paste", e => {
    if (!examActive()) return;
    if (e.target.closest && e.target.closest("[data-allowpaste]")) return;
    e.preventDefault(); S.pegados++; save(); incident("pegar", t("incPaste")); toast(t("noPaste"), "warn");
  });
  document.addEventListener("drop", e => { if (examActive() && e.target.tagName === "TEXTAREA") e.preventDefault(); });
  document.addEventListener("fullscreenchange", () => { if (examActive() && !document.fullscreenElement) { incident("pantalla", t("incFull")); const b = $("#fsBtn"); if (b) b.hidden = false; } else { const b = $("#fsBtn"); if (b) b.hidden = true; } });
  function goFull() { try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }

  function overlay(content, cls) { closeOverlay(); const o = h("div", { class: "overlay " + (cls || ""), id: "overlay", role: "dialog", "aria-modal": "true" }, h("div", { class: "ov-card" }, content)); document.body.appendChild(o); return o; }
  function closeOverlay() { const o = $("#overlay"); if (o) o.remove(); }
  function warnScreen() {
    overlay([h("div", { class: "ov-ico" }, "👁️"), h("h2", null, t("awayTitle")), h("p", null, t("awayMsg", { n: S.salidas, m: C.salidasMax })),
      h("button", { class: "btn", onclick: () => { closeOverlay(); goFull(); } }, t("awayBack"))], "warn");
  }
  function lockScreen() {
    const inp = h("input", { type: "password", class: "inp", placeholder: t("teacherCode"), autocomplete: "off" });
    const msg = h("p", { class: "err" });
    overlay([h("div", { class: "ov-ico" }, "🔒"), h("h2", null, t("lockTitle")), h("p", null, t("lockMsg")), inp, msg,
      h("button", { class: "btn", onclick: async () => {
        if (await sha(inp.value) === C.hashDocente) { S.bloqueado = false; save(); send("incidente", { evento: "desbloqueo", detalle: t("unlockedBy") }); closeOverlay(); goFull(); }
        else { msg.textContent = t("badCode"); }
      } }, t("unlock"))], "lock");
    setTimeout(() => inp.focus(), 50);
  }

  /* ---------- Toast ---------- */
  function toast(msg, kind) {
    let w = $("#toasts"); if (!w) { w = h("div", { id: "toasts" }); document.body.appendChild(w); }
    const e = h("div", { class: "toast " + (kind || "") }, msg); w.appendChild(e);
    setTimeout(() => e.classList.add("out"), 3200); setTimeout(() => e.remove(), 3800);
  }

  /* =========================================================
     PANTALLAS
     ========================================================= */
  const app = $("#app");
  function render() {
    document.documentElement.lang = S.lang;
    app.innerHTML = "";
    document.body.classList.toggle("in-exam", S.screen === "exam");
    if (S.screen === "start") renderStart();
    else if (S.screen === "brief") renderBrief();
    else if (S.screen === "exam") renderExam();
    else renderFinal();
    if (S.bloqueado && S.screen === "exam") lockScreen();
  }

  function langPicker() {
    if (C.idiomas && C.idiomas.length < 2) return null;
    const sel = h("select", { class: "lang", "aria-label": "Idioma / Langue / Language", onchange: e => { S.lang = e.target.value; save(); render(); } },
      [["es", "🌐 ES · Español"], ["fr", "🌐 FR · Français"], ["en", "🌐 EN · English"]].filter(([v]) => !C.idiomas || C.idiomas.includes(v)).map(([v, l]) => h("option", { value: v, selected: S.lang === v }, l)));
    return sel;
  }

  function renderStart() {
    const nom = h("input", { class: "inp", id: "nom", autocomplete: "off", maxlength: 40, placeholder: t("firstName") });
    const ape = h("input", { class: "inp", id: "ape", autocomplete: "off", maxlength: 40, placeholder: t("lastName") });
    const sala = h("input", { class: "inp", id: "sala", type: "password", autocomplete: "off", placeholder: t("roomCode") });
    const pacto = h("input", { type: "checkbox", id: "pacto" });
    const err = h("p", { class: "err", id: "err" });
    const yaHecho = store.get(SK + "-fin", null);
    app.appendChild(h("main", { class: "start" }, [
      h("div", { class: "start-top" }, [h("span", { class: "chip-s" }, C.institucion), langPicker()]),
      h("div", { class: "hero" }, [
        h("img", { src: "assets/img/logo.svg", alt: "", class: "logo-big" }),
        h("h1", null, [h("span", { class: "grad" }, "NEXO"), " · ", t("title")]),
        h("p", { class: "sub" }, t("subtitle")),
        h("p", { class: "meta" }, C.curso + " · " + C.docente + " · " + t("minutes", { n: C.minutos }))
      ]),
      h("section", { class: "card form" }, yaHecho ? [
        h("h2", null, t("alreadyTitle")), h("p", null, t("alreadyMsg", { n: yaHecho })), teacherBtn()
      ] : [
        h("div", { class: "row2" }, [h("label", null, [t("firstName"), nom]), h("label", null, [t("lastName"), ape])]),
        h("label", null, [t("roomCode"), sala, h("small", null, t("roomHint"))]),
        h("label", { class: "pacto" }, [pacto, h("span", null, t("pact"))]),
        err,
        h("button", { class: "btn big", onclick: start }, t("start") + " →"),
        teacherBtn()
      ])
    ]));
    async function start() {
      const n = nom.value.trim().replace(/\s+/g, " "), a = ape.value.trim().replace(/\s+/g, " ");
      if (n.length < 2 || a.length < 2) { err.textContent = t("needName"); return; }
      if (!pacto.checked) { err.textContent = t("needPact"); return; }
      if (await sha(sala.value) !== C.hashSala) { err.textContent = t("badRoom"); return; }
      S.alumno = { nombre: n, apellido: a };
      S.seed = hashStr(n + a + Date.now() + Math.random());
      S.sesion = "NX-" + (S.seed % 1679616).toString(36).toUpperCase().padStart(4, "0") + "-" + Date.now().toString(36).slice(-4).toUpperCase();
      const P = buildPlan(S.seed); S.plan = P.plan; S.mods = P.mods;
      S.screen = "brief"; save(); render();
    }
  }
  function teacherBtn() { return h("button", { class: "link", onclick: teacherPanel }, "🔑 " + t("teacher")); }

  function teacherPanel() {
    const inp = h("input", { type: "password", class: "inp", placeholder: t("teacherCode"), autocomplete: "off" });
    const msg = h("p", { class: "err" });
    const box = h("div");
    overlay([h("h2", null, "🔑 " + t("teacher")), inp, msg, h("button", { class: "btn", onclick: async () => {
      if (await sha(inp.value) !== C.hashDocente) { msg.textContent = t("badCode"); return; }
      msg.textContent = ""; inp.remove();
      const q = store.get(QK, []).length, log = store.get(LK, []);
      box.innerHTML = "";
      box.appendChild(h("p", null, t("tpStatus", { q, n: log.length }) + (C.sheetUrl ? "" : " · " + t("syncOff"))));
      box.appendChild(h("button", { class: "btn ghost", onclick: () => downloadCSV(log) }, "⬇ " + t("tpCsv")));
      box.appendChild(h("button", { class: "btn ghost", onclick: flush }, "↻ " + t("tpResend")));
      box.appendChild(h("button", { class: "btn danger", onclick: () => {
        if (!confirm(t("tpResetQ"))) return;
        store.del(SK); store.del(SK + "-fin"); S = fresh(); save(); closeOverlay(); render();
      } }, "⟲ " + t("tpReset")));
    } }, t("enter")), box, h("button", { class: "link", onclick: closeOverlay }, t("close"))]);
  }
  function downloadCSV(rows) {
    const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set()));
    const csv = [cols.join(";")].concat(rows.map(r => cols.map(c => '"' + String(r[c] == null ? "" : r[c]).replace(/"/g, '""') + '"').join(";"))).join("\n");
    const a = h("a", { href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })), download: "registro_nexo_" + new Date().toISOString().slice(0, 10) + ".csv" });
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Sala de espera: inicio sincronizado por el docente ---------- */
  let salaInt = null;
  function salaSync() { return !!C.inicioSincronizado; }
  async function consultarSala() {
    if (!C.sheetUrl) return false;
    try {
      const r = await fetch(C.sheetUrl + "?accion=estado&curso=" + encodeURIComponent(C.curso) + "&_=" + Date.now(), { cache: "no-store" });
      const j = await r.json();
      return !!(j && j.habilitado);
    } catch (e) { return false; }
  }
  function habilitarLocal() {
    if (S.habilitado) return;
    S.habilitado = Date.now(); save();
    clearInterval(salaInt);
    const b = $("#goBtn"); if (b) { b.disabled = false; b.textContent = "🚀 " + t("goNow"); b.classList.add("pulse"); }
    const w = $("#waitBox"); if (w) { w.className = "wait ok"; w.innerHTML = ""; w.appendChild(h("b", null, "✅ " + t("salaOpen"))); }
    toast("✅ " + t("salaOpen"), "gold");
  }
  function iniciarSala() {
    if (!salaSync() || S.habilitado) return;
    if (!S.esperaEnviada) { S.esperaEnviada = true; save(); send("espera", { idioma: S.lang }); }
    const tick = async () => { if (S.screen !== "brief") { clearInterval(salaInt); return; } if (await consultarSala()) habilitarLocal(); };
    clearInterval(salaInt); salaInt = setInterval(tick, 4000); tick();
  }

  function renderBrief() {
    const items = S.plan.length;
    const espera = salaSync() && !S.habilitado;
    const codeIn = h("input", { type: "password", class: "inp small", placeholder: t("teacherCode"), autocomplete: "off" });
    const waitBox = !salaSync() ? null : h("div", { class: "wait " + (espera ? "" : "ok"), id: "waitBox" }, espera ? [
      h("div", { class: "spinner", "aria-hidden": "true" }),
      h("div", null, [h("b", null, t("salaWait")), h("p", null, t("salaWaitMsg"))]),
      h("details", { class: "noai" }, [h("summary", null, t("salaManual")), codeIn, h("button", { class: "btn ghost", onclick: async () => {
        if (await sha(codeIn.value) === C.hashDocente) { send("incidente", { evento: "inicio_manual", detalle: "habilitado con código en el equipo" }); habilitarLocal(); } else toast(t("badCode"), "warn");
      } }, t("unlock"))])
    ] : [h("b", null, "✅ " + t("salaOpen"))]);
    app.appendChild(h("main", { class: "brief" }, [
      h("h1", null, t("briefHi", { n: S.alumno.nombre })),
      h("p", { class: "sub" }, t("briefSub", { n: items, m: C.minutos })),
      h("div", { class: "nodes-intro" }, S.mods.map((m, i) => h("div", { class: "node-i" }, [h("span", { class: "nn" }, i + 1), h("span", { class: "ne" }, MOD_EMOJI[m]), h("b", null, t("mod_" + m))]))
        .concat([h("div", { class: "node-i final" }, [h("span", { class: "nn" }, "★"), h("span", { class: "ne" }, "🤖"), h("b", null, t("finalChallenge"))])])),
      h("div", { class: "grid2" }, [
        h("section", { class: "card" }, [h("h3", null, "📏 " + t("rulesTitle")), h("ul", null, ["r1", "r2", "r3", "r4", "r5"].map(k => h("li", { html: t(k, { m: C.salidasMax }) })))]),
        h("section", { class: "card" }, [h("h3", null, "🏅 " + t("badgesTitle")), h("p", null, t("badgesMsg", { p: Math.round(C.insigniaMin * 100) })),
          h("div", { class: "badge-row" }, BADGES.map(b => h("div", { class: "badge on mini" }, [h("span", null, MOD_EMOJI[b]), h("small", null, t("badge_" + b))]))),
          h("p", { class: "note" }, t("certMsg", { n: C.aprobacion }))])
      ]),
      waitBox,
      h("button", { class: "btn big" + (salaSync() && !espera ? " pulse" : ""), id: "goBtn", disabled: espera, onclick: () => {
        if (salaSync() && !S.habilitado) return;
        S.inicio = salaSync() ? Math.min(Date.now(), S.habilitado) : Date.now(); S.itemStart = Date.now(); S.screen = "exam"; save();
        send("inicio", { idioma: S.lang, preguntas: S.plan.join(" "), orden_nodos: S.mods.join(" > "), total: S.plan.length });
        goFull(); render();
      } }, espera ? "⏳ " + t("salaBtnWait") : "🚀 " + (salaSync() ? t("goNow") : t("go")))
    ]));
    if (espera) iniciarSala();
  }

  /* ---------- Examen ---------- */
  let timerInt = null;
  function renderExam() {
    app.appendChild(h("div", { class: "watermark", "aria-hidden": "true" }, Array(24).fill(S.alumno.apellido + " · " + S.sesion).map(s => h("span", null, s))));
    app.appendChild(h("header", { class: "hud" }, [
      h("div", { class: "brand" }, [h("img", { src: "assets/img/logo.svg", alt: "" }), h("b", null, "NEXO")]),
      h("div", { class: "who" }, S.alumno.nombre + " " + S.alumno.apellido),
      h("div", { class: "pill", id: "timer" }, "⏱ --:--"),
      h("div", { class: "pill", id: "exits", title: t("exitsTitle") }, "👁 0/" + C.salidasMax),
      h("button", { class: "pill fs", id: "fsBtn", hidden: !!document.fullscreenElement, onclick: goFull }, "⛶ " + t("fullscreen"))
    ]));
    const side = h("aside", { class: "side", id: "side" });
    const main = h("main", { class: "stage", id: "stage" });
    app.appendChild(h("div", { class: "layout" }, [side, main]));
    renderHUD(); renderItem();
    clearInterval(timerInt); timerInt = setInterval(tick, 1000); tick();
  }
  function tick() {
    if (S.screen !== "exam") { clearInterval(timerInt); return; }
    const left = C.minutos * 60000 - (Date.now() - S.inicio), el = $("#timer");
    if (left <= 0) { clearInterval(timerInt); toast(t("timeUp"), "warn"); finish(true); return; }
    const m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
    if (el) { el.textContent = "⏱ " + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0"); el.classList.toggle("hot", left < 600000); }
    if (Math.abs(left - 600000) < 1000) toast(t("tenLeft"), "warn");
  }
  function renderHUD() {
    const ex = $("#exits"); if (ex) { ex.textContent = "👁 " + S.salidas + "/" + C.salidasMax; ex.classList.toggle("hot", S.salidas > 0); }
    const side = $("#side"); if (!side) return;
    const T = totals(), answered = Object.keys(S.resp).length, total = S.plan.length;
    const parcial = T.ansMax ? nota(T.got, T.ansMax) : null;
    side.innerHTML = "";
    side.appendChild(h("div", { class: "card stats" }, [
      h("div", { class: "prog" }, [h("div", { class: "prog-bar", style: "width:" + (100 * answered / total) + "%" })]),
      h("p", { class: "small" }, t("progress", { a: answered, n: total })),
      h("div", { class: "score-row" }, [
        h("div", { class: "score" }, [h("small", null, t("gradeNow")), h("b", { class: parcial == null ? "" : parcial >= C.aprobacion ? "ok" : "low" }, parcial == null ? "—" : fmt1(parcial))]),
        h("div", { class: "score" }, [h("small", null, t("points")), h("b", null, fmt1(T.got) + " / " + T.max)])
      ]),
      h("p", { class: "tiny" }, t("gradeHint"))
    ]));
    const curMod = S.plan[S.idx] ? itES(S.plan[S.idx]).mod : null, isAi = S.plan[S.idx] && itES(S.plan[S.idx]).type === "ai";
    side.appendChild(h("div", { class: "card nodes" }, [h("h4", null, t("map"))].concat(S.mods.map((m, i) => {
      const p = T.per[m], pct = p.max ? Math.round(100 * p.got / p.max) : 0;
      const st = p.done === p.n ? "done" : curMod === m && !isAi ? "cur" : "";
      return h("div", { class: "node " + st }, [
        h("span", { class: "ring", style: "--p:" + (p.n ? 100 * p.done / p.n : 0) }, MOD_EMOJI[m]),
        h("div", null, [h("b", null, (i + 1) + ". " + t("mod_" + m)), h("small", null, p.done + "/" + p.n + (p.done ? " · " + pct + "%" : ""))]),
        S.badges.includes(m) ? h("span", { class: "got", title: t("badge_" + m) }, "🏅") : null
      ]);
    })).concat([h("div", { class: "node " + (isAi ? "cur" : "") }, [h("span", { class: "ring" }, "🤖"), h("div", null, [h("b", null, "★ " + t("finalChallenge")), h("small", null, S.resp[S.plan[S.plan.length - 1]] ? "✓" : "")])])])));
    side.appendChild(h("div", { class: "card badges-side" }, [h("h4", null, t("badgesTitle")), h("div", { class: "badge-row" }, BADGES.map(b => h("div", { class: "badge mini " + (S.badges.includes(b) ? "on" : "") }, [h("span", null, MOD_EMOJI[b]), h("small", null, t("badge_" + b))])))]));
    side.appendChild(h("p", { class: "sync", id: "sync" })); updSync();
  }

  function renderItem() {
    const stage = $("#stage"); stage.innerHTML = "";
    const id = S.plan[S.idx]; if (!id) { finish(false); return; }
    const x = it(id), xe = itES(id);
    if (!S.itemStart) { S.itemStart = Date.now(); save(); }
    const head = h("div", { class: "q-head" }, [
      h("span", { class: "tag" }, MOD_EMOJI[x.mod] + " " + (x.type === "ai" ? t("finalChallenge") : t("mod_" + x.mod))),
      h("span", { class: "tag ghost" }, t("qOf", { i: S.idx + 1, n: S.plan.length })),
      h("span", { class: "tag ghost" }, x.pts + " " + (x.pts === 1 ? t("pt") : t("pts")))
    ]);
    const card = h("section", { class: "card q-card anim" }, [head]);
    stage.appendChild(card);
    if (S.fb === id) { card.appendChild(h("h2", { class: "q" }, x.q)); feedback(card, id); return; }
    const R = RENDER[x.type](x, card, (answer, extra) => submit(id, answer, extra));
    if (R && R.focus) setTimeout(R.focus, 60);
  }

  function submit(id, answer, extra) {
    const xe = itES(id), xg = it(id); // se corrige con el banco del idioma del estudiante (mismas respuestas)
    let g = extra && extra.graded ? extra.graded : GRADE[xe.type](xg, answer);
    if (g.det && g.det.sens) { S.sensible = true; incident("datos_personales", id); }
    const secs = Math.round((Date.now() - (S.itemStart || Date.now())) / 1000);
    S.resp[id] = { a: answer, score: g.score, det: g.det || null, secs };
    S.fb = id; S.itemStart = 0; save();
    send("respuesta", {
      n: S.idx + 1, modulo: xe.mod, item: id, tipo_item: xe.type, pregunta: xe.q.slice(0, 220),
      respuesta: DESCR[xe.type](xe, answer).slice(0, 45000), esperado: EXPECT(xe, g),
      puntaje: Math.round(g.score * xe.pts * 100) / 100, max: xe.pts, segundos: secs, salidas: S.salidas
    });
    checkBadges(false);
    renderHUD(); renderItem();
  }

  function feedback(card, id) {
    const x = it(id), r = S.resp[id], pts = r.score * x.pts;
    const kind = r.score >= 0.99 ? "ok" : r.score > 0 ? "mid" : "bad";
    const msgs = { ok: ["fbOk1", "fbOk2", "fbOk3"], mid: ["fbMid1", "fbMid2"], bad: ["fbBad1", "fbBad2"] }[kind];
    const msg = t(msgs[hashStr(id + S.seed) % msgs.length]);
    const box = h("div", { class: "fb " + kind }, [
      h("div", { class: "fb-ico" }, kind === "ok" ? "✓" : kind === "mid" ? "◐" : "✗"),
      h("div", null, [h("b", null, msg), h("p", null, t("fbPts", { p: fmt1(pts), m: x.pts }))])
    ]);
    card.appendChild(box);
    if (r.det) card.appendChild(detView(x, r.det));
    const T = totals();
    card.appendChild(h("p", { class: "fb-grade" }, t("fbGrade", { g: fmt1(nota(T.got, T.ansMax)) })));
    const last = S.idx >= S.plan.length - 1;
    const nb = h("button", { class: "btn big", onclick: () => { S.fb = null; S.idx++; S.itemStart = Date.now(); save(); if (S.idx >= S.plan.length) finish(false); else { renderHUD(); renderItem(); window.scrollTo(0, 0); } } }, last ? t("seeResults") + " 🏁" : t("next") + " →");
    card.appendChild(nb); setTimeout(() => nb.focus(), 50);
  }
  function detView(x, d) {
    const chips = [];
    if (d.ing) ["rol", "tarea", "contexto", "formato", "ejemplos", "pasos"].forEach(k => chips.push(h("span", { class: "ing " + (d.ing[k] ? "on" : "") }, t("ing_" + k))));
    const lines = [];
    if (d.hit != null) lines.push(t(x.type === "img" ? "detImg" : "detTxt", { h: d.hit, n: d.of }));
    if (d.style != null) lines.push(t(d.style ? "detStyleY" : "detStyleN"));
    if (d.topic != null) lines.push(t(d.topic ? "detTopicY" : "detTopicN"));
    if (d.jhit != null) lines.push(t("detJust", { n: d.jhit }));
    if (d.sens) lines.push("⚠️ " + t("detSens"));
    return h("div", { class: "det" }, [h("div", { class: "ing-row" }, chips), lines.length ? h("ul", null, lines.map(l => h("li", null, l))) : null]);
  }

  /* =========================================================
     TIPOS DE PREGUNTA (render)
     ========================================================= */
  function qTitle(card, x, instr) { card.appendChild(h("h2", { class: "q" }, x.q)); if (instr) card.appendChild(h("p", { class: "instr" }, instr)); }
  function submitBtn(label) { return h("button", { class: "btn big", disabled: true }, label || t("answer")); }
  const RENDER = {};

  RENDER.mcq = (x, card, done) => {
    qTitle(card, x, t("iMcq"));
    mcqBody(x, card, done);
  };
  function mcqBody(x, card, done) {
    const order = shuffle(x.o.map((_, i) => i), ir(x.id)); let sel = null;
    const list = h("div", { class: "opts" });
    const btn = submitBtn();
    order.forEach((oi, k) => {
      const b = h("button", { class: "opt", onclick: () => { sel = oi; $$(".opt", list).forEach(e => e.classList.remove("sel")); b.classList.add("sel"); btn.disabled = false; } },
        [h("span", { class: "let" }, "ABCDEF"[k]), h("span", null, x.o[oi])]);
      list.appendChild(b);
    });
    btn.onclick = () => sel != null && done(sel);
    card.append(list, btn);
  }
  RENDER.pick = (x, card, done) => {
    card.appendChild(h("h2", { class: "q" }, x.q));
    if (x.img) card.appendChild(h("figure", { class: "pimg" }, h("img", { src: x.img, alt: t("imgAlt"), draggable: "false" })));
    if (x.out) card.appendChild(h("div", { class: "ai-out" }, [h("div", { class: "ai-who" }, "🤖 " + t("aiAnswered")), h("pre", null, x.out)]));
    card.appendChild(h("p", { class: "instr" }, t("iPick")));
    mcqBody(x, card, done);
  };
  RENDER.just = (x, card, done) => {
    qTitle(card, x, t("iJust"));
    const order = shuffle(x.o.map((_, i) => i), ir(x.id)); let sel = null;
    const list = h("div", { class: "opts" });
    const P = promptArea(t("phJust"), false, 10);
    const btn = submitBtn();
    const chk = () => { btn.disabled = sel == null || words(P.ta.value) < 10; };
    order.forEach((oi, k) => {
      const b = h("button", { class: "opt", onclick: () => { sel = oi; $$(".opt", list).forEach(e => e.classList.remove("sel")); b.classList.add("sel"); chk(); } },
        [h("span", { class: "let" }, "ABCDEF"[k]), h("span", null, x.o[oi])]);
      list.appendChild(b);
    });
    P.ta.addEventListener("input", chk);
    btn.onclick = () => done({ c: sel, t: P.ta.value.trim() });
    card.append(list, h("p", { class: "instr" }, t("iJust2")), P.wrap, btn);
  };

  RENDER.tf = (x, card, done) => {
    qTitle(card, x, t("iTf"));
    const order = shuffle(x.s.map((_, i) => i), ir(x.id)), ans = {};
    const btn = submitBtn();
    const list = h("div", { class: "tf" }, order.map(si => {
      const row = h("div", { class: "tf-row" }, [h("p", null, x.s[si][0])]);
      const g = h("div", { class: "tf-btns" }, [[true, t("true")], [false, t("false")]].map(([v, l]) => h("button", { class: "tfb", onclick: e => {
        ans[si] = v; $$(".tfb", g).forEach(z => z.classList.remove("sel")); e.currentTarget.classList.add("sel");
        btn.disabled = Object.keys(ans).length < x.s.length;
      } }, l)));
      row.appendChild(g); return row;
    }));
    btn.onclick = () => done(x.s.map((_, i) => ans[i]));
    card.append(list, btn);
  };

  function multiLike(x, card, done, cls, instr, renderOpt) {
    qTitle(card, x, instr);
    const order = shuffle(x.o.map((_, i) => i), ir(x.id)), sel = new Set();
    const btn = submitBtn();
    const list = h("div", { class: cls }, order.map(oi => {
      const b = h("button", { class: "opt", "aria-pressed": "false", onclick: () => {
        sel.has(oi) ? sel.delete(oi) : sel.add(oi); b.classList.toggle("sel"); b.setAttribute("aria-pressed", sel.has(oi)); btn.disabled = sel.size === 0;
      } }, renderOpt(x.o[oi]));
      return b;
    }));
    btn.onclick = () => done(Array.from(sel).sort((a, b) => a - b));
    card.append(list, btn);
  }
  RENDER.multi = (x, card, done) => multiLike(x, card, done, "opts multi", t("iMulti"), o => [h("span", { class: "box" }), h("span", null, o)]);
  RENDER.scene = (x, card, done) => multiLike(x, card, done, "scene", t("iScene"), o => [h("span", { class: "emo" }, o[0]), h("small", null, o[1])]);
  RENDER.spot = (x, card, done) => {
    qTitle(card, x, t("iSpot"));
    const sel = new Set(); const btn = submitBtn();
    const bubble = h("div", { class: "ai-bubble" }, [h("div", { class: "ai-who" }, "🤖 " + t("aiSays"))].concat(x.o.map((s, i) => {
      const sp = h("span", { class: "sent", tabindex: 0, role: "button", onclick: () => { sel.has(i) ? sel.delete(i) : sel.add(i); sp.classList.toggle("sel"); btn.disabled = sel.size === 0; } }, s + " ");
      sp.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sp.click(); } });
      return sp;
    })));
    btn.onclick = () => done(Array.from(sel).sort((a, b) => a - b));
    card.append(bubble, btn);
  };

  /* ---------- Arrastrar y soltar (mouse, touch y toque) ---------- */
  function dnd(root, onDrop, chipsAreZones) {
    let sel = null;
    function zoneAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY); const z = el && el.closest("[data-zone]"); return z && root.contains(z) ? z : null; }
    root.addEventListener("pointerdown", e => {
      const chip = e.target.closest(".chip"); if (!chip || !root.contains(chip)) return;
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY; let moved = false, ghost = null;
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          moved = true; ghost = chip.cloneNode(true); ghost.classList.add("drag-ghost"); ghost.style.width = chip.getBoundingClientRect().width + "px";
          document.body.appendChild(ghost); chip.classList.add("dragging");
          if (sel) { sel.classList.remove("sel"); sel = null; }
        }
        if (moved) {
          ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
          $$(".over", root).forEach(z => z.classList.remove("over")); const z = zoneAt(ev); if (z && z !== chip) z.classList.add("over");
        }
      };
      const up = ev => {
        document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
        if (moved) {
          ghost.remove(); chip.classList.remove("dragging"); $$(".over", root).forEach(z => z.classList.remove("over"));
          const z = zoneAt(ev); if (z && z !== chip) onDrop(chip.dataset.id, z, ev);
        } else if (chipsAreZones && sel && sel !== chip) {
          const id = sel.dataset.id; sel = null; onDrop(id, chip, ev);
        } else {
          if (sel === chip) { chip.classList.remove("sel"); sel = null; }
          else { if (sel) sel.classList.remove("sel"); sel = chip; chip.classList.add("sel"); }
        }
      };
      document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    });
    root.addEventListener("click", e => {
      if (!sel || e.target.closest(".chip")) return;
      const z = e.target.closest("[data-zone]"); if (!z || !root.contains(z)) return;
      const id = sel.dataset.id; sel = null; onDrop(id, z, e);
    });
  }

  RENDER.classify = (x, card, done) => {
    qTitle(card, x, t("iDrag"));
    const r = ir(x.id), chosen = shuffle(x.it.map((_, i) => i), r).slice(0, x.n || x.it.length);
    const place = {}; chosen.forEach(i => place[i] = -1);
    const btn = submitBtn();
    const root = h("div", { class: "dnd classify" });
    function draw() {
      root.innerHTML = "";
      const pool = h("div", { class: "pool", "data-zone": "-1" }, [h("small", { class: "zl" }, t("pool"))].concat(chosen.filter(i => place[i] === -1).map(chipFor)));
      const bins = h("div", { class: "bins", style: "--n:" + x.bins.length }, x.bins.map((b, bi) => h("div", { class: "bin", "data-zone": String(bi) }, [h("b", { class: "bin-t" }, b)].concat(chosen.filter(i => place[i] === bi).map(chipFor)))));
      root.append(pool, bins);
      btn.disabled = chosen.some(i => place[i] === -1);
    }
    function chipFor(i) { return h("div", { class: "chip", "data-id": String(i), tabindex: 0 }, x.it[i][0]); }
    dnd(root, (id, z) => { place[id] = parseInt(z.dataset.zone, 10); draw(); });
    draw();
    btn.onclick = () => done(chosen.map(i => [i, place[i]]));
    card.append(root, btn);
  };

  function slotsWidget(x, card, done, opts) {
    // opts: slots [{label|html}], words [{id,text}], correct(slotIdx)->wordId
    const fill = {}; const btn = submitBtn();
    const root = h("div", { class: "dnd slots " + (opts.cls || "") });
    function draw() {
      root.innerHTML = "";
      const used = new Set(Object.values(fill));
      const bank = h("div", { class: "pool", "data-zone": "bank" }, [h("small", { class: "zl" }, t("bank"))].concat(opts.words.filter(w => !used.has(w.id)).map(w => h("div", { class: "chip", "data-id": w.id, tabindex: 0 }, w.text))));
      const body = opts.layout(fill, (si) => {
        const w = fill[si] != null ? opts.words.find(z => z.id === fill[si]) : null;
        return h("span", { class: "slot " + (w ? "full" : ""), "data-zone": "s" + si }, w ? h("span", { class: "chip in", "data-id": w.id }, w.text) : " ");
      });
      root.append(body, bank);
      btn.disabled = Object.keys(fill).length < opts.nSlots;
    }
    dnd(root, (id, z) => {
      for (const k in fill) if (fill[k] === id) delete fill[k];
      if (z.dataset.zone !== "bank") { const si = z.dataset.zone.slice(1); fill[si] = id; }
      draw();
    });
    draw();
    btn.onclick = () => done(Array.from({ length: opts.nSlots }, (_, i) => fill[i]));
    card.append(root, btn);
  }
  RENDER.match = (x, card, done) => {
    qTitle(card, x, t("iMatch"));
    const r = ir(x.id), rows = shuffle(x.p.map((_, i) => i), r), words = shuffle(x.p.map((p, i) => ({ id: "w" + i, text: p[1] })), r);
    slotsWidget(x, card, ans => done(ans.map((w, k) => [rows[k], parseInt(w.slice(1), 10)])), {
      nSlots: rows.length, words, cls: "match",
      layout: (fill, slot) => h("div", { class: "match-rows" }, rows.map((pi, k) => h("div", { class: "m-row" }, [h("b", { class: "m-term" }, x.p[pi][0]), slot(k)])))
    });
  };
  RENDER.cloze = (x, card, done) => {
    qTitle(card, x, t("iCloze"));
    const parts = x.t.split(/\[\[|\]\]/); // texto, palabra, texto, palabra...
    const answers = parts.filter((_, i) => i % 2 === 1);
    const r = ir(x.id);
    const words = shuffle(answers.map((w, i) => ({ id: "a" + i, text: w })).concat(x.x.map((w, i) => ({ id: "x" + i, text: w }))), r);
    slotsWidget(x, card, ans => done(ans), {
      nSlots: answers.length, words, cls: "cloze",
      layout: (fill, slot) => h("p", { class: "cloze-text" }, parts.map((p, i) => i % 2 === 0 ? document.createTextNode(p) : slot((i - 1) / 2)))
    });
  };
  RENDER.order = (x, card, done) => {
    qTitle(card, x, t("iOrder"));
    let cur = shuffle(x.s.map((_, i) => i), ir(x.id));
    if (cur.every((v, i) => v === i)) cur.reverse();
    const btn = submitBtn(); btn.disabled = false;
    const root = h("div", { class: "dnd order" });
    function draw() {
      root.innerHTML = "";
      cur.forEach((si, k) => {
        root.appendChild(h("div", { class: "chip ord", "data-id": String(si), "data-zone": "o" + k }, [
          h("span", { class: "num" }, k + 1), h("span", { class: "otext" }, x.s[si]),
          h("span", { class: "arrows" }, [
            h("button", { class: "ar", "aria-label": "↑", onpointerdown: e => e.stopPropagation(), onclick: e => { e.stopPropagation(); mv(k, k - 1); } }, "▲"),
            h("button", { class: "ar", "aria-label": "↓", onpointerdown: e => e.stopPropagation(), onclick: e => { e.stopPropagation(); mv(k, k + 1); } }, "▼")
          ])
        ]));
      });
    }
    function mv(a, b) { if (b < 0 || b >= cur.length) return; const v = cur.splice(a, 1)[0]; cur.splice(b, 0, v); draw(); }
    dnd(root, (id, z) => { const from = cur.indexOf(parseInt(id, 10)), to = parseInt(z.dataset.zone.slice(1), 10); mv(from, to); }, true);
    draw();
    btn.onclick = () => done(cur.slice());
    card.append(root, btn);
  };

  /* ---------- Escritura de prompts ---------- */
  function promptArea(ph, live, minW) {
    const ta = h("textarea", { class: "ta", rows: 7, placeholder: ph, spellcheck: "true", autocomplete: "off" });
    const meter = h("div", { class: "meter" });
    const wc = h("small", { class: "wc" });
    function upd() {
      const w = words(ta.value); wc.textContent = t("wordsN", { n: w }) + (minW && w < minW ? " · " + t("minWords", { n: minW }) : "");
      if (live) { const ing = ingredients(ta.value); meter.innerHTML = ""; ["rol", "tarea", "contexto", "formato"].forEach(k => meter.appendChild(h("span", { class: "ing " + (ing[k] ? "on" : "") }, t("ing_" + k)))); }
      if (sensitive(ta.value)) wc.textContent += " · ⚠️ " + t("detSens");
    }
    ta.addEventListener("input", upd); upd();
    return { ta, wrap: h("div", { class: "ta-wrap" }, [live ? meter : null, ta, wc]) };
  }
  function writeType(x, card, done, extraTop) {
    qTitle(card, x, null);
    if (extraTop) card.appendChild(extraTop);
    const live = x.type === "fix";
    const P = promptArea(t("phPrompt"), live, 15);
    const btn = submitBtn(t("sendPrompt"));
    P.ta.addEventListener("input", () => { btn.disabled = words(P.ta.value) < 8; });
    let warned = false; const warnP = h("p", { class: "err" });
    btn.onclick = () => { if (words(P.ta.value) < 15 && !warned) { warned = true; warnP.textContent = t("shortQ"); return; } done(P.ta.value.trim()); };
    card.appendChild(warnP);
    card.append(h("p", { class: "instr" }, t(x.type === "img" ? "iImg" : x.type === "txt" ? "iTxt" : "iFix")), P.wrap, btn);
    return { focus: () => P.ta.focus() };
  }
  RENDER.img = (x, card, done) => writeType(x, card, done, h("figure", { class: "pimg" }, h("img", { src: x.img, alt: t("imgAlt"), draggable: "false" })));
  RENDER.txt = (x, card, done) => writeType(x, card, done, h("div", { class: "ai-out" }, [h("div", { class: "ai-who" }, "🤖 " + t("aiAnswered")), h("pre", null, x.out)]));
  RENDER.fix = (x, card, done) => writeType(x, card, done, h("div", { class: "weak" }, [h("small", null, t("weakPrompt")), h("code", null, "“" + x.weak + "”")]));

  /* ---------- Desafío final con IA real ---------- */
  RENDER.ai = (x, card, done) => {
    card.appendChild(h("h2", { class: "q" }, "🤖 " + t("finalChallenge")));
    card.appendChild(h("div", { class: "mission" }, [h("small", null, t("yourMission")), h("p", null, x.q)]));
    const D = S.aiData;
    if (!S.aiUnlocked) {
      const inp = h("input", { type: "password", class: "inp", placeholder: t("teacherCode"), autocomplete: "off" }), msg = h("p", { class: "err" });
      card.append(h("div", { class: "locked" }, [h("div", { class: "ov-ico" }, "🔒"), h("p", null, t("aiLocked")), inp, msg,
        h("button", { class: "btn", onclick: async () => {
          if (await sha(inp.value) === C.hashDocente) { S.aiUnlocked = true; S.aiStep = 1; save(); send("incidente", { evento: "desafio_habilitado", detalle: "" }); renderItem(); }
          else msg.textContent = t("badCode");
        } }, t("unlock"))]));
      return;
    }
    const steps = h("ol", { class: "steps" }, [1, 2, 3].map(n => h("li", { class: S.aiStep === n ? "cur" : S.aiStep > n ? "ok" : "" }, t("aiStep" + n))));
    card.appendChild(steps);
    if (S.aiStep === 1) {
      const P = promptArea(t("phPrompt"), true, 15);
      if (D.prompt) P.ta.value = D.prompt;
      P.ta.dispatchEvent(new Event("input"));
      const btn = h("button", { class: "btn big" }, t("aiGo") + " ↗");
      btn.onclick = () => {
        if (words(P.ta.value) < 10) { toast(t("minWords", { n: 10 }), "warn"); return; }
        D.prompt = P.ta.value.trim(); S.aiStep = 2; save();
        send("incidente", { evento: "salida_ia_autorizada", detalle: "" });
        renderItem();
      };
      card.append(h("p", { class: "instr" }, t("aiI1")), P.wrap, btn);
      setTimeout(() => P.ta.focus(), 60);
    } else if (S.aiStep === 2) {
      const pr = h("pre", { class: "mine", "data-allowcopy": "" }, D.prompt);
      const copy = h("button", { class: "btn ghost", onclick: () => { try { navigator.clipboard.writeText(D.prompt); toast(t("copied")); } catch (e) { } } }, "📋 " + t("copyPrompt"));
      const links = h("div", { class: "ai-links" }, C.ias.map(l => h("a", { class: "btn ghost", href: l.url, target: "_blank", rel: "noopener" }, l.nombre + " ↗")));
      const ta = h("textarea", { class: "ta", rows: 8, placeholder: t("phResp"), "data-allowpaste": "" });
      const btn = h("button", { class: "btn big", disabled: true }, t("aiNext") + " →");
      ta.addEventListener("input", () => { btn.disabled = ta.value.trim().length < 150; });
      btn.onclick = () => { D.resp = ta.value.trim(); D.sinIA = false; S.aiStep = 3; save(); renderItem(); };
      const codeIn = h("input", { type: "password", class: "inp small", placeholder: t("teacherCode"), autocomplete: "off" });
      const noai = h("details", { class: "noai" }, [h("summary", null, t("noAI")), codeIn, h("button", { class: "btn ghost", onclick: async () => {
        if (await sha(codeIn.value) === C.hashDocente) { D.resp = ""; D.sinIA = true; S.aiStep = 3; save(); renderItem(); } else toast(t("badCode"), "warn");
      } }, t("unlock"))]);
      card.append(h("p", { class: "instr" }, t("aiI2")), pr, h("div", { class: "row-btns" }, [copy, links]), ta, h("small", { class: "wc" }, t("min150")), btn, noai);
    } else {
      const qs = ["ev1", "ev2", "ev3"], ev = D.ev || {};
      const evBox = h("div", { class: "tf" }, qs.map(k => {
        const g = h("div", { class: "tf-btns" }, [["si", t("yes")], ["parcial", t("partly")], ["no", t("no")]].map(([v, l]) => h("button", { class: "tfb " + (ev[k] === v ? "sel" : ""), onclick: e => { ev[k] = v; D.ev = ev; save(); $$(".tfb", g).forEach(z => z.classList.remove("sel")); e.currentTarget.classList.add("sel"); chk(); } }, l)));
        return h("div", { class: "tf-row" }, [h("p", null, t(k)), g]);
      }));
      const P = promptArea(t("phImprove"), false, 0);
      const btn = h("button", { class: "btn big", disabled: true }, t("finishChallenge") + " ✓");
      function chk() { btn.disabled = qs.some(k => !ev[k]) || words(P.ta.value) < 6; }
      P.ta.addEventListener("input", chk);
      btn.onclick = () => {
        D.mejora = P.ta.value.trim(); save();
        S.aiStep = 4;
        done({ prompt: D.prompt, resp: D.resp || "", sinIA: !!D.sinIA, ev: D.ev, mejora: D.mejora }, { graded: gradeAI(x, D) });
      };
      card.append(h("p", { class: "instr" }, t("aiI3")), evBox, h("p", { class: "instr" }, t("aiI3b")), P.wrap, btn);
    }
  };
  function gradeAI(x, D) {
    const ing = ingredients(D.prompt), four = ["rol", "tarea", "contexto", "formato"].filter(k => ing[k]).length;
    const topic = hasAny(norm(D.prompt), itES(x.id).topic) || hasAny(norm(D.prompt), x.topic);
    let s = 0.45 * four / 4 + 0.1 * (topic ? 1 : 0);
    const respOk = D.sinIA || (D.resp.length >= 150 && norm(D.resp) !== norm(D.prompt));
    s += respOk ? 0.15 : 0;
    const ing2 = ingredients(D.mejora), adds = Object.keys(ing2).some(k => ing2[k] && !ing[k]);
    s += words(D.mejora) >= 6 ? (adds || ing2.ejemplos || ing2.pasos ? 0.3 : 0.18) : 0;
    if (words(D.prompt) < 8) s *= 0.4;
    const sens = sensitive(D.prompt);
    if (sens) s = Math.max(0, s - 0.25);
    return { score: Math.min(1, s), det: { ing, w: words(D.prompt), topic, sens } };
  }

  /* =========================================================
     CORRECCIÓN y DESCRIPCIÓN PARA EL REGISTRO
     ========================================================= */
  const GRADE = {
    mcq: (x, a) => ({ score: a === x.a ? 1 : 0 }),
    tf: (x, a) => ({ score: x.s.filter((s, i) => a[i] === s[1]).length / x.s.length }),
    multi: (x, a) => setScore(x.a, a), scene: (x, a) => setScore(x.a, a), spot: (x, a) => setScore(x.a, a),
    classify: (x, a) => ({ score: a.filter(([i, b]) => x.it[i][1] === b).length / a.length }),
    match: (x, a) => ({ score: a.filter(([r, w]) => r === w).length / a.length }),
    cloze: (x, a) => ({ score: a.filter((w, i) => w === "a" + i || (w && w[0] === "a" && clozeWord(x, w) === clozeWord(x, "a" + i))).length / a.length }),
    order: (x, a) => { let ok = 0; for (let i = 0; i < a.length - 1; i++) if (a[i + 1] === a[i] + 1) ok++; const pos = a.filter((v, i) => v === i).length; return { score: (ok / (a.length - 1) + pos / a.length) / 2 }; },
    img: (x, a) => gradePrompt(x, a), txt: (x, a) => gradePrompt(x, a), fix: (x, a) => gradePrompt(x, a),
    pick: (x, a) => ({ score: a === x.a ? 1 : 0 }),
    just: (x, a) => {
      const n = norm(a.t), w = words(a.t), hit = x.kw.filter(k => hasAny(n, [k])).length;
      const jq = w < 10 ? 0 : hit >= 2 ? 1 : hit === 1 ? 0.6 : 0.2;
      return { score: a.c === x.a ? 0.5 + 0.5 * jq : 0.15 * jq, det: { jhit: hit, w, sens: sensitive(a.t) } };
    }
  };
  function setScore(correct, a) { const c = new Set(correct); const hit = a.filter(v => c.has(v)).length, wrong = a.length - hit; return { score: Math.max(0, (hit - wrong) / correct.length) }; }
  function clozeWord(x, w) { const ans = x.t.split(/\[\[|\]\]/).filter((_, i) => i % 2 === 1); return w[0] === "a" ? ans[+w.slice(1)] : x.x[+w.slice(1)]; }
  const DESCR = {
    mcq: (x, a) => x.o[a], pick: (x, a) => x.o[a], just: (x, a) => x.o[a.c] + "\nJUSTIFICACIÓN: " + a.t, tf: (x, a) => x.s.map((s, i) => (a[i] ? "V" : "F")).join(" · "),
    multi: (x, a) => a.map(i => x.o[i]).join(" | "), scene: (x, a) => a.map(i => x.o[i][1]).join(" | "), spot: (x, a) => a.map(i => x.o[i]).join(" | "),
    classify: (x, a) => a.map(([i, b]) => (x.it[i][1] === b ? "✓ " : "✗ ") + x.it[i][0] + " → " + x.bins[b]).join("\n"),
    match: (x, a) => a.map(([r, w]) => (r === w ? "✓ " : "✗ ") + x.p[r][0] + " → " + x.p[w][1]).join("\n"),
    cloze: (x, a) => a.map((w, i) => (i + 1) + ") " + clozeWord(x, w)).join(" · "),
    order: (x, a) => a.map((v, i) => (i + 1) + ". " + x.s[v]).join("\n"),
    img: (x, a) => a, txt: (x, a) => a, fix: (x, a) => a,
    ai: (x, a) => "PROMPT: " + a.prompt + "\n\nRESPUESTA IA: " + (a.sinIA ? "(sin acceso a IA, habilitado por docente)" : a.resp.slice(0, 20000)) + "\n\nAUTOEVALUACIÓN: tarea=" + a.ev.ev1 + ", formato=" + a.ev.ev2 + ", verificar=" + a.ev.ev3 + "\n\nMEJORA: " + a.mejora
  };
  function EXPECT(x, g) {
    switch (x.type) {
      case "mcq": case "pick": return x.o[x.a];
      case "just": return x.o[x.a] + " · ideas clave esperadas: " + x.kw.join(", ") + " · detectadas: " + ((g.det && g.det.jhit) || 0) + " (revisión docente sugerida)";
      case "tf": return x.s.map(s => (s[1] ? "V" : "F")).join(" · ");
      case "multi": case "spot": return x.a.map(i => x.o[i]).join(" | ");
      case "scene": return x.a.map(i => x.o[i][1]).join(" | ");
      case "classify": return "Ver ✓/✗ en la respuesta";
      case "match": return "Ver ✓/✗ en la respuesta";
      case "cloze": return x.t.split(/\[\[|\]\]/).filter((_, i) => i % 2 === 1).join(" · ");
      case "order": return x.s.map((s, i) => (i + 1) + ". " + s).join("\n");
      default: {
        const d = g.det || {}, ing = d.ing || {};
        return "Rúbrica automática → ingredientes: " + ["rol", "tarea", "contexto", "formato", "ejemplos", "pasos"].filter(k => ing[k]).join(", ") +
          (d.hit != null ? " · elementos/criterios: " + d.hit + "/" + d.of : "") + (d.style != null ? " · estilo: " + (d.style ? "sí" : "no") : "") +
          (d.topic != null ? " · tema: " + (d.topic ? "sí" : "no") : "") + " · palabras: " + d.w + (d.sens ? " · ⚠ DATOS PERSONALES" : "") + " (revisión docente sugerida)";
      }
    }
  }

  /* =========================================================
     FINAL
     ========================================================= */
  function finish(porTiempo) {
    if (S.fin) { S.screen = "final"; save(); render(); return; }
    S.fin = Date.now(); S.screen = "final"; S.fb = null;
    checkBadges(true);
    const T = totals(), n = nota(T.got, T.max), ok = n >= C.aprobacion;
    S.codigo = S.sesion; save();
    store.set(SK + "-fin", S.alumno.nombre + " " + S.alumno.apellido);
    const per = {}; MODS.forEach(m => per[m] = T.per[m].max ? Math.round(100 * T.per[m].got / T.per[m].max) + "%" : "");
    send("final", Object.assign({ idioma: S.lang, nota: n, puntos: Math.round(T.got * 100) / 100, max: T.max, respondidas: Object.keys(S.resp).length + "/" + S.plan.length },
      per, { insignias: S.badges.map(b => I18N.es["badge_" + b]).join(", "), salidas: S.salidas, incidentes: S.incidentes, pegados: S.pegados,
        duracion_min: Math.round((S.fin - S.inicio) / 6000) / 10, fin_por_tiempo: porTiempo ? "sí" : "no", resultado: ok ? "Certificado EsencIA" : "Constancia de trayecto", codigo: S.codigo }));
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { }
    render();
  }

  function renderFinal() {
    const T = totals(), n = nota(T.got, T.max), ok = n >= C.aprobacion;
    const main = h("main", { class: "final" });
    app.appendChild(main);
    main.appendChild(h("div", { class: "final-head " + (ok ? "ok" : "low") }, [
      h("div", { class: "big-grade" }, [h("small", null, t("finalGrade")), h("b", null, fmt1(n))]),
      h("div", null, [h("h1", null, ok ? t("passTitle", { n: S.alumno.nombre }) : t("doneTitle", { n: S.alumno.nombre })), h("p", null, ok ? t("passMsg") : t("doneMsg", { n: C.aprobacion }))])
    ]));
    main.appendChild(h("section", { class: "card" }, [h("h3", null, "📈 " + t("byNode")), h("div", { class: "bars" }, S.mods.map(m => {
      const p = T.per[m], pct = p.max ? Math.round(100 * p.got / p.max) : 0;
      return h("div", { class: "bar-row" }, [h("span", null, MOD_EMOJI[m] + " " + t("mod_" + m)), h("div", { class: "bar" }, h("div", { class: "fill " + (pct >= 70 ? "ok" : pct >= 50 ? "mid" : "low"), style: "width:" + pct + "%" })), h("b", null, pct + "%")]);
    }))]));
    main.appendChild(h("section", { class: "card" }, [h("h3", null, "🏅 " + t("yourBadges")), h("div", { class: "badge-row big" }, BADGES.map(b => h("div", { class: "badge " + (S.badges.includes(b) ? "on" : "") }, [h("span", null, MOD_EMOJI[b]), h("small", null, t("badge_" + b))])))]));
    const certBox = h("section", { class: "card certs" }, [h("h3", null, "📜 " + (ok ? t("yourCert") : t("yourConst")))]);
    main.appendChild(certBox);
    main.appendChild(h("p", { class: "sync", id: "sync" }));
    main.appendChild(h("p", { class: "tiny center" }, t("verify") + ": " + S.codigo));
    main.appendChild(teacherBtn());
    updSync(); flush();
    const info = { nombre: S.alumno.nombre + " " + S.alumno.apellido, fecha: new Date(S.fin), nota: n, badges: S.badges, codigo: S.codigo, lang: S.lang, t, curso: C.curso, institucion: C.institucion, docente: C.docente, emoji: MOD_EMOJI, aprobado: ok };
    window.NEXO_CERT.build(info).then(list => {
      list.forEach(c => {
        const img = h("img", { src: c.url, alt: c.title, class: "cert-img" });
        certBox.appendChild(h("figure", null, [img, h("figcaption", null, [c.title, " ", h("a", { class: "btn ghost", href: c.url, download: c.file }, "⬇ PNG")])]));
      });
      certBox.appendChild(h("button", { class: "btn", onclick: () => window.NEXO_CERT.print(list) }, "🖨 " + t("printPdf")));
    });
  }

  /* ---------- Arranque ---------- */
  if (S.screen === "exam" && S.fin) S.screen = "final";
  render();
  flush();
  window.NEXO_DEBUG = { get S() { return S; }, finish, totals };
})();
