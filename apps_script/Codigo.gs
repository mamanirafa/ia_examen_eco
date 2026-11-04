/**
 * NEXO · Registro de respuestas en Google Sheets
 * 1. Creá una planilla nueva en Google Drive (por ej. "NEXO 5B - Registro").
 * 2. Extensiones → Apps Script → borrá todo y pegá este código → Guardar.
 * 3. Implementar → Nueva implementación → Tipo: Aplicación web
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier persona → Implementar.
 * 4. Copiá la URL que termina en /exec y pegala en js/config.js → sheetUrl.
 * Se crean solas 4 hojas: Inicio, Respuestas, Incidentes y Final.
 */
const HOJAS = { inicio: "Inicio", respuesta: "Respuestas", incidente: "Incidentes", final: "Final" };

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

function doGet() { return ContentService.createTextOutput("NEXO activo ✓"); }
