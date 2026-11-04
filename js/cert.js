/* =========================================================
   NEXO · Certificados
   - Nota >= aprobación: certificado oficial EsencIA (plantilla
     assets/cert_fondo.jpg) + anexo con nota e insignias.
   - Nota < aprobación: constancia de finalización del trayecto
     con las insignias alcanzadas (sin certificado EsencIA).
   ========================================================= */
(function () {
  "use strict";
  const W = 2339, H = 1654;
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const NAVY = "#0f2747", TEAL = "#0aa89a", CREAM = "#fbf6ea", INK = "#2E2F2F";

  function loadImg(src) { return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }
  async function fonts() { try { await Promise.all(["500 50px Inter", "700 50px Inter", "800 100px Inter", "700 60px 'Space Grotesk'"].map(f => document.fonts.load(f))); } catch (e) { } }
  function fit(ctx, text, max, size, weight, family) { let s = size; do { ctx.font = weight + " " + s + "px " + family; s -= 2; } while (ctx.measureText(text).width > max && s > 30); }
  // Dibuja una línea centrada con tramos en negrita: [[texto, bold], ...]
  function richLine(ctx, parts, cx, y, size, color) {
    let total = 0; parts.forEach(p => { ctx.font = (p[1] ? "700 " : "500 ") + size + "px Inter"; total += ctx.measureText(p[0]).width; });
    let x = cx - total / 2; ctx.fillStyle = color; ctx.textAlign = "left";
    parts.forEach(p => { ctx.font = (p[1] ? "700 " : "500 ") + size + "px Inter"; ctx.fillText(p[0], x, y); x += ctx.measureText(p[0]).width; });
    ctx.textAlign = "center";
  }

  async function oficial(I) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.drawImage(await loadImg("assets/cert_fondo.jpg"), 0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    // Nombre (Montserrat/Inter bold, azul #002060)
    ctx.fillStyle = "#002060"; fit(ctx, I.nombre, 1750, 100, "700", "Inter");
    ctx.fillText(I.nombre, W / 2, 778);
    // Texto con la fecha
    const d = I.fecha, dia = d.getDate(), mes = MESES[d.getMonth()], anio = d.getFullYear();
    richLine(ctx, [["por haber finalizado, el día " + dia + " de " + mes + " de " + anio + ", el curso de ", false], ["EsencIA", true], [" sobre", false]], W / 2, 893, 48, INK);
    richLine(ctx, [["Introducción a la Inteligencia Artificial Generativa y uso responsable", true]], W / 2, 963, 48, INK);
    richLine(ctx, [["(20 horas de duración).", true]], W / 2, 1065, 48, INK);
    return c;
  }

  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  async function propio(I, anexo) {
    const t = I.t, c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    // red de nodos decorativa
    ctx.strokeStyle = "rgba(10,168,154,.18)"; ctx.lineWidth = 3;
    const pts = [[120, 320], [300, 180], [420, 420], [2200, 1300], [2050, 1500], [1900, 1350], [2230, 1520]];
    for (let i = 0; i < pts.length - 1; i++) { if (i === 2) continue; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke(); }
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 14, 0, 7); ctx.fillStyle = "rgba(10,168,154,.35)"; ctx.fill(); });
    // marco
    ctx.strokeStyle = NAVY; ctx.lineWidth = 10; roundRect(ctx, 50, 50, W - 100, H - 100, 30); ctx.stroke();
    ctx.strokeStyle = TEAL; ctx.lineWidth = 4; roundRect(ctx, 75, 75, W - 150, H - 150, 24); ctx.stroke();
    // encabezado
    ctx.fillStyle = NAVY; roundRect(ctx, 75, 75, W - 150, 230, 24); ctx.fill(); ctx.fillRect(75, 200, W - 150, 105);
    try { const logo = await loadImg("assets/img/logo.svg"); ctx.drawImage(logo, 130, 112, 156, 156); } catch (e) { }
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "700 76px 'Space Grotesk', Inter"; ctx.fillText("NEXO", 320, 190);
    ctx.fillStyle = "#9ee7dd"; ctx.font = "500 40px Inter"; ctx.fillText(t("title") + " · EsencIA", 320, 255);
    ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "600 34px Inter"; ctx.fillText(I.institucion, W - 130, 175); ctx.fillStyle = "#9ee7dd"; ctx.fillText(I.curso, W - 130, 230);
    ctx.textAlign = "center";
    // título
    ctx.fillStyle = TEAL; ctx.font = "700 44px Inter"; ctx.fillText((anexo ? t("certAnnex") : t("certConst")).toUpperCase(), W / 2, 420);
    ctx.fillStyle = INK; ctx.font = "500 40px Inter"; ctx.fillText(t("certGrants"), W / 2, 500);
    ctx.fillStyle = NAVY; fit(ctx, I.nombre, 1800, 104, "800", "Inter"); ctx.fillText(I.nombre, W / 2, 625);
    ctx.strokeStyle = "rgba(15,39,71,.25)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(500, 665); ctx.lineTo(W - 500, 665); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = "500 38px Inter";
    const fecha = I.fecha.toLocaleDateString({ es: "es-AR", fr: "fr-FR", en: "en-GB" }[I.lang], { day: "numeric", month: "long", year: "numeric" });
    ctx.fillText(anexo ? t("certAnnexTxt", { n: String(I.nota).replace(".", I.lang === "en" ? "." : ",") }) : t("certConstTxt"), W / 2, 740);
    ctx.fillText(t("certTopics"), W / 2, 795);
    ctx.fillText(fecha, W / 2, 850);
    // insignias
    const B = ["ia", "prompt", "bigdata", "iot", "trans", "redes", "etica"], got = B.filter(b => I.badges.includes(b));
    ctx.fillStyle = NAVY; ctx.font = "700 36px Inter"; ctx.fillText(got.length ? t("certBadges", { n: got.length }) : t("certNoBadges"), W / 2, 945);
    const list = got.length ? got : [];
    const gap = 270, x0 = W / 2 - (list.length - 1) * gap / 2;
    list.forEach((b, i) => {
      const x = x0 + i * gap, y = 1080;
      const g = ctx.createLinearGradient(x - 90, y - 90, x + 90, y + 90); g.addColorStop(0, "#f7d774"); g.addColorStop(1, "#d99a1e");
      ctx.beginPath(); ctx.arc(x, y, 92, 0, 7); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 76, 0, 7); ctx.fillStyle = NAVY; ctx.fill();
      ctx.font = "84px 'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textBaseline = "middle"; ctx.fillText(I.emoji[b], x, y + 6); ctx.textBaseline = "alphabetic";
      ctx.fillStyle = NAVY; ctx.font = "700 28px Inter";
      const words = t("badge_" + b).split(" "); let line = "", yy = y + 140;
      words.forEach(w => { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > 250 && line) { ctx.fillText(line, x, yy); line = w; yy += 34; } else line = test; });
      ctx.fillText(line, x, yy);
    });
    // firma
    ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 260, 1390); ctx.lineTo(W / 2 + 260, 1390); ctx.stroke();
    ctx.fillStyle = NAVY; ctx.font = "700 34px Inter"; ctx.fillText(I.docente, W / 2, 1435);
    ctx.fillStyle = INK; ctx.font = "500 28px Inter"; ctx.fillText(t("certTeacher"), W / 2, 1475);
    ctx.textAlign = "left"; ctx.fillStyle = "#6b7280"; ctx.font = "500 26px Inter"; ctx.fillText(t("verify") + ": " + I.codigo, 120, H - 110);
    ctx.textAlign = "right"; ctx.fillText("Ushuaia, Tierra del Fuego", W - 120, H - 110);
    return c;
  }

  function safe(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_"); }

  window.NEXO_CERT = {
    async build(I) {
      await fonts();
      const out = [], base = safe(I.nombre);
      if (I.aprobado) {
        const a = await oficial(I); out.push({ title: I.t("yourCert"), url: a.toDataURL("image/png"), file: "Certificado_EsencIA_" + base + ".png" });
        const b = await propio(I, true); out.push({ title: I.t("certAnnex"), url: b.toDataURL("image/png"), file: "Anexo_insignias_" + base + ".png" });
      } else {
        const b = await propio(I, false); out.push({ title: I.t("certConst"), url: b.toDataURL("image/png"), file: "Constancia_trayecto_" + base + ".png" });
      }
      return out;
    },
    print(list) {
      const w = window.open("", "_blank"); if (!w) return;
      w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>Certificado</title><style>@page{size:A4 landscape;margin:0}body{margin:0}img{width:100vw;height:100vh;object-fit:contain;display:block;page-break-after:always}</style></head><body>" +
        list.map(c => "<img src='" + c.url + "'>").join("") + "<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>");
      w.document.close();
    }
  };
})();
