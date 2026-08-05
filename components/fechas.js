// components/fechas.js
// Fechas en hora LOCAL, no en UTC.
//
// El bug que esto resuelve: new Date().toISOString() convierte a UTC. En Costa
// Rica (UTC-6) eso significa que a partir de las 6 de la tarde el "hoy" en UTC
// ya es mañana, así que los formularios abrían con la fecha del día siguiente.
"use client";

const pad = (n) => String(n).padStart(2, "0");

// Fecha de hoy en formato YYYY-MM-DD según el reloj del usuario.
// Es lo que espera <input type="date">.
export function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Convierte lo que venga del API a YYYY-MM-DD para un <input type="date">.
// Acepta "2026-03-12", "2026-03-12 09:00:00", "2026-03-12T09:00:00.000Z" y Date.
// Corta la cadena en vez de reinterpretarla como fecha: así no se corre un día.
export function aFechaInput(val) {
  if (!val) return "";
  // Date y timestamps se leen en hora local. El método viejo los pasaba por
  // toISOString(), que en UTC-6 podía devolver el día anterior.
  if (val instanceof Date || typeof val === "number") {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const m = String(val).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

// Suma años a una fecha YYYY-MM-DD sin pasar por Date, para no arrastrar
// desfases de zona horaria. Se usa en el botón "+1 año" de las vacunas.
export function sumarAnios(ymd, anios = 1) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${y + anios}-${pad(m)}-${pad(d)}`;
}

// DD/MM/YYYY para mostrar en pantalla
export function mostrarFecha(ymd) {
  const limpio = aFechaInput(ymd);
  if (!limpio) return "—";
  const [y, m, d] = limpio.split("-");
  return `${d}/${m}/${y}`;
}
