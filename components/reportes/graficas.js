// components/reportes/graficas.js
// Piezas visuales del panel de estadísticas. Separadas de la página para
// poder reutilizarlas y para que page.js se ocupe solo de orquestar.
"use client";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-07" → "jul 26"
export function mesLabel(ym) {
  const [y, m] = (ym || "").split("-");
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${MESES_CORTOS[idx]} ${String(y).slice(2)}`;
}

export const CRC = (n) =>
  `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function SectionTitle({ children }) {
  return (
    <p style={{
      margin: "0 0 12px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtext)",
    }}>
      {children}
    </p>
  );
}

// Variación contra el periodo anterior. `null` significa que antes no había
// nada con qué comparar: un "+100%" partiendo de cero engaña más de lo que
// informa, así que en ese caso no se muestra nada.
export function Variacion({ pct, invertirColor = false }) {
  if (pct == null) return null;
  const sube = pct > 0;
  const neutro = pct === 0;
  // En "tasa de cancelación" subir es malo, por eso se puede invertir
  const bueno = invertirColor ? !sube : sube;
  const color = neutro ? "var(--subtext)" : bueno ? "#34d399" : "#fb7185";
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {neutro ? "→" : sube ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

export function StatTile({ icon, label, value, color, sub, variacion, invertirColor }) {
  return (
    <div className="card" style={{ padding: "18px 20px", flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: "var(--subtext)", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: color || "var(--text)" }}>{value}</span>
        <Variacion pct={variacion} invertirColor={invertirColor} />
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Tabla compacta. La primera columna va a la izquierda y el resto a la
// derecha, que es como se leen bien los números.
export function TablaSimple({ cabeceras, filas, vacio = "Sin datos en este periodo." }) {
  if (!filas.length) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--subtext)", fontSize: 13, fontStyle: "italic" }}>
        {vacio}
      </div>
    );
  }
  const cols = `2fr ${cabeceras.slice(1).map(() => "1fr").join(" ")}`;
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{
        display: "grid", gridTemplateColumns: cols, gap: 8, padding: "8px 14px",
        background: "rgba(255,255,255,0.04)", fontSize: 10, fontWeight: 700,
        color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {cabeceras.map((c, i) => (
          <span key={c} style={{ textAlign: i === 0 ? "left" : "right" }}>{c}</span>
        ))}
      </div>
      {filas.map((f, idx) => (
        <div key={idx} style={{
          display: "grid", gridTemplateColumns: cols, gap: 8, padding: "10px 14px",
          alignItems: "center", fontSize: 13,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: idx % 2 ? "rgba(255,255,255,0.015)" : "transparent",
        }}>
          {f.map((celda, i) => (
            <span key={i} style={{
              textAlign: i === 0 ? "left" : "right",
              fontWeight: i === 0 ? 600 : 700,
              color: i === 0 ? "var(--text)" : "var(--subtext)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{celda}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// Barras verticales (serie única, un solo tono — meses)
export function BarChart({ data, color, formatValue, emptyText }) {
  const max = Math.max(...data.map(d => d.valor), 0);
  if (max === 0) {
    return (
      <div style={{ padding: "28px 0", textAlign: "center", color: "var(--subtext)", fontSize: 13, fontStyle: "italic" }}>
        {emptyText || "Sin datos en este período."}
      </div>
    );
  }
  const H = 150;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: H + 44, paddingTop: 20 }}>
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.valor / max) * H));
        const esActual = i === data.length - 1;
        return (
          <div key={d.mes} title={`${mesLabel(d.mes)}: ${formatValue(d.valor)}`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "default" }}>
            <span style={{ fontSize: 10, color: esActual ? "var(--text)" : "var(--subtext)", fontWeight: esActual ? 800 : 500 }}>
              {formatValue(d.valor)}
            </span>
            <div style={{
              width: "100%", maxWidth: 42, height: h,
              background: color, opacity: esActual ? 1 : 0.55,
              borderRadius: "4px 4px 0 0",
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = esActual ? 1 : 0.55; }}
            />
            <span style={{ fontSize: 10, color: esActual ? "var(--text)" : "var(--subtext)", fontWeight: esActual ? 700 : 500 }}>
              {mesLabel(d.mes)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Barras horizontales (serie única, un solo tono — categorías)
export function HBarList({ data, color, formatValue }) {
  const max = Math.max(...data.map(d => d.valor), 0);
  if (!data.length || max === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--subtext)", fontSize: 13, fontStyle: "italic" }}>
        Sin datos registrados.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map(d => (
        <div key={d.label} title={`${d.label}: ${formatValue(d.valor)}`}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text)" }}>{d.label}</span>
            <span style={{ fontSize: 12, color: "var(--subtext)", fontWeight: 700 }}>{formatValue(d.valor)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
            <div style={{
              width: `${Math.max(2, Math.round((d.valor / max) * 100))}%`,
              height: "100%", background: color, borderRadius: 4,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
