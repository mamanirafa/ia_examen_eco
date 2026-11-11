/**
 * NEXO · Registro de respuestas + sala de espera sincronizada (versión 2.1: envíos en lote, sin duplicados)
 * 1. En la planilla: Extensiones → Apps Script → reemplazá TODO por este código → Guardar.
 * 2. Implementar → Administrar implementaciones → ✏️ editar → Versión: «Nueva versión» → Implementar.
 *    (Así la URL /exec sigue siendo la misma y no hay que tocar config.js.)
 *    Si es la primera vez: Implementar → Nueva implementación → Aplicación web,
 *    Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 * Hojas que se crean solas: Sala, Inicio, Respuestas, Incidentes y Final.
 */
const HOJAS = { espera: "Sala", inicio: "Inicio", respuesta: "Respuestas", incidente: "Incidentes", final: "Final" };

// Huellas SHA-256 de los códigos docentes que pueden manejar el panel (5.º B Naturales y 5.º A Economía).
// Para cambiarlas, usá docente.html del sitio.
const CLAVES_DOCENTE = [
  "090429398e2b567f586baad94d8791521ee85ec04cea254dc29ea4cc2ec644b2",
  "0af7daa68ecca6ed652a1c95fdb88e6583c1ce8ed29e00fc36deed6af8b71fdf"
];
const VENTANA_MS = 3 * 60 * 60 * 1000; // la habilitación y la lista valen 3 horas

/* ---------- Registro (lo envía cada examen, en lotes) ---------- */
function doPost(e) {
  let lote;
  try { const d = JSON.parse(e.postData.contents); lote = Array.isArray(d) ? d : [d]; }
  catch (err) { return texto("error: json"); }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return texto("ocupado"); // el examen reintenta solo
  try {
    const cache = CacheService.getScriptCache();
    const rids = lote.map(d => d.rid).filter(Boolean);
    const vistos = rids.length ? cache.getAll(rids) : {};
    const ahora = Date.now(), porHoja = {};
    lote.forEach(d => {
      if (d.rid && vistos[d.rid]) return;          // ya registrado (reintento)
      d.ts_srv = ahora;                           // hora del servidor: no depende del reloj de cada PC
      const n = HOJAS[d.tipo] || "Otros";
      (porHoja[n] = porHoja[n] || []).push(d);
    });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(porHoja).forEach(n => {
      const filasNuevas = porHoja[n];
      const sh = ss.getSheetByName(n) || ss.insertSheet(n);
      let head = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
      const nuevas = [];
      filasNuevas.forEach(d => Object.keys(d).forEach(k => { if (head.indexOf(k) < 0 && nuevas.indexOf(k) < 0) nuevas.push(k); }));
      if (nuevas.length) {
        head = head.concat(nuevas);
        sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground("#0f2747").setFontColor("#ffffff");
        sh.setFrozenRows(1);
      }
      const desde = sh.getLastRow() + 1;
      sh.getRange(desde, 1, filasNuevas.length, head.length).setValues(filasNuevas.map(d => head.map(k => d[k] === undefined ? "" : d[k])));
      filasNuevas.forEach((d, i) => { if (d.tipo === "incidente" && d.evento === "salida") sh.getRange(desde + i, 1, 1, head.length).setBackground("#fde2e2"); });
    });
    if (rids.length) { const m = {}; rids.forEach(r => m[r] = "1"); cache.putAll(m, 21600); }
    return texto("ok");
  } catch (err) {
    return texto("error: " + err);
  } finally {
    lock.releaseLock();
  }
}
function texto(s) { return ContentService.createTextOutput(s); }

/* ---------- Sala de espera y panel docente ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const curso = p.curso || "";
  if (!p.accion) return salida({ ok: true, msg: "NEXO activo ✓" });
  const props = PropertiesService.getScriptProperties();
  const key = "sala|" + curso;
  let st = JSON.parse(props.getProperty(key) || '{"habilitado":false,"t":0,"reset":0}');
  const vigente = st.habilitado && Date.now() - st.t < VENTANA_MS;

  if (p.accion === "estado") return salida({ ok: true, habilitado: vigente, t: st.t });

  if (["panel", "iniciar", "cerrar"].indexOf(p.accion) < 0) return salida({ ok: false, error: "accion" });
  if (!claveOk(p.clave)) return salida({ ok: false, error: "clave" });

  if (p.accion === "iniciar") { st.habilitado = true; st.t = Date.now(); props.setProperty(key, JSON.stringify(st)); }
  if (p.accion === "cerrar") {
    if (vigente) st.habilitado = false;           // cierra la sala: quien no empezó vuelve a esperar
    else { st.habilitado = false; st.reset = Date.now(); } // limpia la lista para otra clase
    props.setProperty(key, JSON.stringify(st));
  }
  const on = st.habilitado && Date.now() - st.t < VENTANA_MS;
  return salida({ ok: true, ahora: Date.now(), habilitado: on, t: st.t, alumnos: alumnos(curso, Math.max(st.reset || 0, Date.now() - VENTANA_MS)) });
}

function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function claveOk(c) {
  if (!c) return false;
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(c).trim().toUpperCase(), Utilities.Charset.UTF_8);
  const hex = d.map(b => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
  return CLAVES_DOCENTE.indexOf(hex) >= 0;
}

function filas(nombre) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!sh || sh.getLastRow() < 2) return [];
  const ultima = sh.getLastRow(), cols = sh.getLastColumn(), desde = Math.max(2, ultima - 5000 + 1); // solo las últimas 5000 filas
  const h = sh.getRange(1, 1, 1, cols).getValues()[0];
  return sh.getRange(desde, 1, ultima - desde + 1, cols).getValues().map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
}

function alumnos(curso, desde) {
  const m = {}, ok = r => r.curso === curso && Number(r.ts_srv || 0) >= desde;
  const al = r => {
    const a = m[r.sesion] = m[r.sesion] || { alumno: r.alumno, estado: "esperando", items: {}, resp: 0, total: "", salidas: 0, nota: "", ultima: 0 };
    a.ultima = Math.max(a.ultima, Number(r.ts_srv) || 0);
    return a;
  };
  const sube = (a, e) => { const orden = ["esperando", "en examen", "terminado"]; if (orden.indexOf(e) > orden.indexOf(a.estado)) a.estado = e; };
  filas("Sala").filter(ok).forEach(r => al(r));
  filas("Inicio").filter(ok).forEach(r => { const a = al(r); sube(a, "en examen"); a.total = r.total || a.total; });
  filas("Respuestas").filter(ok).forEach(r => { const a = al(r); sube(a, "en examen"); a.items[r.item] = 1; });
  filas("Incidentes").filter(ok).forEach(r => { const a = al(r); if (r.evento === "salida") a.salidas++; });
  filas("Final").filter(ok).forEach(r => { const a = al(r); a.estado = "terminado"; a.nota = r.nota; });
  return Object.keys(m).map(k => { const a = m[k]; a.resp = Object.keys(a.items).length; delete a.items; return a; })
    .sort((x, y) => String(x.alumno).localeCompare(String(y.alumno)));
}
