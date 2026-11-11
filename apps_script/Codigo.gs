/**
 * NEXO · Registro de respuestas + sala de espera sincronizada (versión 2)
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

/* ---------- Registro (lo envía cada examen) ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const nombre = HOJAS[d.tipo] || "Otros";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    let head = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    const nuevas = Object.keys(d).filter(k => head.indexOf(k) < 0);
    if (nuevas.length) {
      head = head.concat(nuevas);
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground("#0f2747").setFontColor("#ffffff");
      sh.setFrozenRows(1);
    }
    sh.appendRow(head.map(k => d[k] === undefined ? "" : d[k]));
    if (d.tipo === "incidente" && d.evento === "salida") sh.getRange(sh.getLastRow(), 1, 1, head.length).setBackground("#fde2e2");
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error: " + err);
  } finally {
    lock.releaseLock();
  }
}

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
  return salida({ ok: true, habilitado: on, t: st.t, alumnos: alumnos(curso, Math.max(st.reset || 0, Date.now() - VENTANA_MS)) });
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
  const v = sh.getDataRange().getValues(), h = v.shift();
  return v.map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
}

function alumnos(curso, desde) {
  const m = {}, ok = r => r.curso === curso && Number(r.ts || 0) >= desde;
  const nuevo = r => ({ alumno: r.alumno, estado: "esperando", resp: 0, total: "", salidas: 0, nota: "" });
  filas("Sala").filter(ok).forEach(r => { m[r.sesion] = m[r.sesion] || nuevo(r); });
  filas("Inicio").filter(ok).forEach(r => { const a = m[r.sesion] = m[r.sesion] || nuevo(r); a.estado = "en examen"; a.total = r.total || ""; });
  filas("Respuestas").filter(ok).forEach(r => { const a = m[r.sesion]; if (a) a.resp++; });
  filas("Incidentes").filter(ok).forEach(r => { const a = m[r.sesion]; if (a && r.evento === "salida") a.salidas++; });
  filas("Final").filter(ok).forEach(r => { const a = m[r.sesion]; if (a) { a.estado = "terminado"; a.nota = r.nota; } });
  return Object.keys(m).map(k => m[k]).sort((x, y) => String(x.alumno).localeCompare(String(y.alumno)));
}
