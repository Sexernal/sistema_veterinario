// app/mascotas/fichasUtils.js
// Constantes y helpers puros del historial clínico: sin JSX y sin estado, para
// que cualquier pantalla nueva (reportes, impresión, etc.) pueda reutilizarlos.
"use client";

// ─── Tipos de ficha ───────────────────────────────────────────────────────────
export const TIPO_OPCIONES = [
  { value: "consulta",        label: "Consulta general"   },
  { value: "vacunacion",      label: "Vacunación"         },
  { value: "cirugia",         label: "Cirugía"            },
  { value: "urgencia",        label: "Urgencia"           },
  { value: "control",         label: "Control / revisión" },
  { value: "desparasitacion", label: "Desparasitación"    },
  { value: "otro",            label: "Otro"               },
];

export const TIPO_LABELS = Object.fromEntries(TIPO_OPCIONES.map(t => [t.value, t.label]));

// Las fichas de tipo "otro" guardan el nombre real en tipo_personalizado
export function tipoDisplay(f) {
  if (f.tipo === "otro" && f.tipo_personalizado) return f.tipo_personalizado;
  return TIPO_LABELS[f.tipo] || f.tipo;
}

// ─── Tratamientos ─────────────────────────────────────────────────────────────
const CIRCULOS = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮"];
export const numeroCirculo = (n) => CIRCULOS[n - 1] || `(${n})`;

export const ESTADO_TRATAMIENTO = {
  activo:     { icon:"🔄", label:"En curso",   col:"#f59e0b", bg:"rgba(245,158,11,0.12)", bd:"rgba(245,158,11,0.35)" },
  finalizado: { icon:"✓",  label:"Finalizado", col:"#34d399", bg:"rgba(52,211,153,0.12)", bd:"rgba(52,211,153,0.3)"  },
};

export const getEstadoTratamiento = (estado) =>
  ESTADO_TRATAMIENTO[String(estado || "").toLowerCase()] || ESTADO_TRATAMIENTO.activo;

export function duracionTexto(t) {
  if (t.duracion_dias == null) return null;
  if (t.duracion_dias === 0)   return "mismo día";
  return `${t.duracion_dias} día${t.duracion_dias !== 1 ? "s" : ""}`;
}

// ─── Selector "es seguimiento de…" ────────────────────────────────────────────
// El <select> codifica la opción como "t:<id>" (un tratamiento que ya existe)
// o "f:<id>" (una ficha suelta que se volverá el arranque de uno nuevo).
export function camposDeSeguimiento(valor) {
  if (valor.startsWith("t:")) return { tratamiento_id: valor.slice(2) };
  if (valor.startsWith("f:")) return { seguimiento_de: valor.slice(2) };
  return { tratamiento_id: "" }; // vacío explícito = sacar del tratamiento
}

// ─── Agrupación ───────────────────────────────────────────────────────────────
// Arma la línea de tiempo del historial mezclando tratamientos y consultas
// sueltas, ordenados por la actividad más reciente de cada uno.
export function agruparPorTratamiento(fichas, tratamientos) {
  const porId = new Map(tratamientos.map(t => [Number(t.id), { tratamiento: t, fichas: [] }]));
  const sueltas = [];

  for (const f of fichas) {
    const grupo = f.tratamiento_id != null ? porId.get(Number(f.tratamiento_id)) : null;
    // Si la ficha apunta a un tratamiento que no vino en la respuesta, se
    // muestra suelta antes que desaparecer del historial.
    if (grupo) grupo.fichas.push(f);
    else sueltas.push(f);
  }

  const grupos = [];
  porId.forEach(g => {
    if (!g.fichas.length) return;
    // Dentro del tratamiento, la 1ª consulta va arriba
    g.fichas.sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));
    grupos.push(g);
  });

  return { grupos, sueltas };
}

// Mezcla grupos y sueltas en una sola lista ordenada por fecha descendente.
// filtro: "todas" | "agrupadas" | "sueltas"
export function construirTimeline({ grupos, sueltas }, filtro = "todas") {
  const items = [];

  if (filtro !== "sueltas") {
    for (const g of grupos) {
      items.push({
        key: `t${g.tratamiento.id}`,
        tipo: "tratamiento",
        grupo: g,
        orden: g.fichas[g.fichas.length - 1]?.fecha || g.tratamiento.fecha_inicio || "",
      });
    }
  }
  if (filtro !== "agrupadas") {
    for (const f of sueltas) {
      items.push({ key: `f${f.id}`, tipo: "ficha", ficha: f, orden: f.fecha || "" });
    }
  }

  return items.sort((a, b) => String(b.orden).localeCompare(String(a.orden)));
}
