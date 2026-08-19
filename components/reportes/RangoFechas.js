// components/reportes/RangoFechas.js
// Selector del periodo del reporte: atajos frecuentes y, si hace falta,
// fechas exactas a mano.
"use client";
import { useState } from "react";
import { hoyLocal } from "../fechas";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Todo se calcula en hora local, nunca con toISOString(): en UTC-6 eso
// devolvería el día siguiente a partir de las 6 de la tarde.
export const ATAJOS = {
  este_mes: {
    label: "Este mes",
    calcular: () => {
      const h = new Date();
      return { desde: ymd(new Date(h.getFullYear(), h.getMonth(), 1)),
               hasta: ymd(new Date(h.getFullYear(), h.getMonth() + 1, 0)) };
    },
  },
  mes_pasado: {
    label: "Mes pasado",
    calcular: () => {
      const h = new Date();
      return { desde: ymd(new Date(h.getFullYear(), h.getMonth() - 1, 1)),
               hasta: ymd(new Date(h.getFullYear(), h.getMonth(), 0)) };
    },
  },
  trimestre: {
    label: "Últimos 3 meses",
    calcular: () => {
      const h = new Date();
      return { desde: ymd(new Date(h.getFullYear(), h.getMonth() - 2, 1)), hasta: hoyLocal() };
    },
  },
  anio: {
    label: "Este año",
    calcular: () => {
      const h = new Date();
      return { desde: ymd(new Date(h.getFullYear(), 0, 1)), hasta: hoyLocal() };
    },
  },
};

export default function RangoFechas({ valor, onChange, cargando }) {
  // "atajo" mientras se usan los botones; "manual" al tocar las fechas
  const [modo, setModo] = useState("este_mes");
  const [borrador, setBorrador] = useState(valor);

  const aplicarAtajo = (clave) => {
    setModo(clave);
    const r = ATAJOS[clave].calcular();
    setBorrador(r);
    onChange(r);
  };

  const cambiarFecha = (campo) => (e) => {
    setModo("manual");
    setBorrador(b => ({ ...b, [campo]: e.target.value }));
  };

  const aplicarManual = () => {
    if (!borrador.desde || !borrador.hasta) return;
    // Si se invierten, se ordenan solas en vez de dar error
    const r = borrador.desde <= borrador.hasta
      ? borrador
      : { desde: borrador.hasta, hasta: borrador.desde };
    setBorrador(r);
    onChange(r);
  };

  const btn = (activo) => ({
    fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999,
    cursor: "pointer", whiteSpace: "nowrap",
    background: activo ? "rgba(96,165,250,0.16)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${activo ? "rgba(96,165,250,0.45)" : "rgba(255,255,255,0.1)"}`,
    color: activo ? "var(--accent)" : "var(--subtext)",
  });

  return (
    <div className="card" style={{ padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(ATAJOS).map(([clave, a]) => (
          <button key={clave} type="button" disabled={cargando}
            onClick={() => aplicarAtajo(clave)} style={btn(modo === clave)}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 150px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>DESDE</div>
          <input className="input" type="date" value={borrador.desde}
            onChange={cambiarFecha("desde")} style={{ margin: 0 }} />
        </label>
        <label style={{ flex: "1 1 150px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>HASTA</div>
          <input className="input" type="date" value={borrador.hasta}
            onChange={cambiarFecha("hasta")} style={{ margin: 0 }} />
        </label>
        <button className="btn" type="button" onClick={aplicarManual}
          disabled={cargando || modo !== "manual"}
          style={{ padding: "10px 18px", opacity: modo === "manual" ? 1 : 0.45 }}>
          Aplicar
        </button>
      </div>
    </div>
  );
}
