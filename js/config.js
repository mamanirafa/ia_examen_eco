/* =========================================================
   NEXO · Configuración (este es el ÚNICO archivo que necesitás editar)
   ========================================================= */
window.NEXO_CONFIG = {
  curso: "5.º A · Ciclo Orientado en Economía",
  institucion: "Colegio Integral de Educación Ushuaia",
  docente: "Prof. Rafael Mamani",
  minutos: 75,
  aprobacion: 6,          // nota mínima para el certificado EsencIA
  insigniaMin: 0.7,       // % de puntos de un nodo para ganar su insignia
  salidasMax: 3,          // salidas de la página antes de bloquear el examen

  // URL de la aplicación web de Apps Script (ver apps_script/Codigo.gs).
  // Dejala vacía "" para probar sin planilla.
  sheetUrl: "https://script.google.com/macros/s/AKfycbwXvO-8FdK8R76DA1aNn1ljRAlkEGE6uw_nOPPod0_eSjPPj2Roxx0Psj3niLU72bXu/exec",

  // Sala de espera: los estudiantes ingresan y esperan hasta que el docente habilite el inicio desde panel.html
  inicioSincronizado: true,

  // Los códigos NO se guardan en texto: se guarda su huella (SHA-256).
  // Para cambiarlos, abrí docente.html, escribí el código nuevo y copiá la huella acá.
  hashSala: "7306db0bd05485702abd387256073916335a9c115cb63463ccd3b1dddd02bab7",    // código de sala actual: ver guía docente
  hashDocente: "0af7daa68ecca6ed652a1c95fdb88e6583c1ce8ed29e00fc36deed6af8b71fdf", // código docente actual: ver guía docente

  // Cuántas preguntas de cada tipo se sortean por nodo (quick = rápidas, inter = interactivas)
  // Versión 2 (nov. 2026): 41 desafíos y 62 puntos, pensada para unos 60 min de trabajo
  draw: {
    ia:      { quick: 4, inter: 2 },
    prompt:  { quick: 3, inter: 2, img: 1, write: 1, pick: 1, ai: 1 },  // pick = «Elegí el prompt correcto»
    bigdata: { quick: 4, inter: 2 },
    iot:     { quick: 4, inter: 2 },
    trans:   { quick: 4, inter: 2 },
    redes:   { quick: 4, inter: 2 },
    just: 2  // «Justificá tu respuesta»: 2 preguntas, de nodos distintos
  },

  ias: [
    { nombre: "Gemini", url: "https://gemini.google.com/" },
    { nombre: "ChatGPT", url: "https://chatgpt.com/" },
    { nombre: "Copilot", url: "https://copilot.microsoft.com/" }
  ],
  idiomas: ["es"],      // un solo idioma: se oculta el selector
  storageKey: "nexo-examen-eco-v2"
};
