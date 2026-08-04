// app/mascotas/FichaDetailModal.js
// Vista de solo lectura de una ficha, con su comanda si tiene.
"use client";
import { useEffect, useState } from "react";
import expressApi from "../../lib/expressApi";
import { ModalBase } from "./ui";
import { tipoDisplay } from "./fichasUtils";

// ─── Detalle de una ficha ─────────────────────────────────────────────────────
function FichaDetailModal({ ficha, onClose }) {
  const tipo = tipoDisplay(ficha);
  const [comanda, setComanda]               = useState(null);
  const [loadingComanda, setLoadingComanda] = useState(true);

  useEffect(() => {
    expressApi.get(`/fichas/${ficha.id}/comanda`)
      .then(res => setComanda(res.data?.data || null))
      .catch(() => setComanda(null))
      .finally(() => setLoadingComanda(false));
  }, [ficha.id]);

  const items = comanda?.items || [];
  const total = comanda?.total  || 0;

  const CRC = (n) =>
    `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <ModalBase
      title="📋 Ficha médica"
      subtitle={`${ficha.mascota_nombre || "Mascota"} — ${ficha.fecha_display || ficha.fecha}`}
      onClose={onClose}
      maxWidth={660}
    >
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 8,
          background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
          fontWeight: 700, fontSize: 14, color: "var(--accent)",
        }}>
          {tipo}
        </div>
        {ficha.tratamiento_nombre && (
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            padding:"6px 12px", borderRadius:8,
            background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.28)",
            fontWeight:700, fontSize:13, color:"#a78bfa",
          }}>
            🩺 {ficha.tratamiento_nombre}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>FECHA</div>
          <div style={{ fontSize: 14 }}>{ficha.fecha_display || ficha.fecha || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>VETERINARIO</div>
          <div style={{ fontSize: 14 }}>{ficha.creado_por_nombre ? `Dr. ${ficha.creado_por_nombre}` : "—"}</div>
        </div>
        {ficha.peso != null && ficha.peso !== "" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>PESO</div>
            <div style={{ fontSize: 14 }}>⚖️ {ficha.peso} kg</div>
          </div>
        )}
        {ficha.temperatura != null && ficha.temperatura !== "" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>TEMPERATURA</div>
            <div style={{ fontSize: 14 }}>🌡️ {ficha.temperatura} °C</div>
          </div>
        )}
      </div>

      {ficha.nota ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 8 }}>OBSERVACIONES</div>
          <div style={{
            whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14,
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {ficha.nota}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, color: "var(--subtext)", fontSize: 13, fontStyle: "italic" }}>
          Sin observaciones registradas.
        </div>
      )}

      {ficha.filepath && (
        <a href={ficha.filepath} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 8, textDecoration: "none",
          background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)",
          color: "var(--accent)", fontSize: 13, fontWeight: 600,
        }}>
          📎 Ver archivo adjunto
        </a>
      )}

      {/* Comanda */}
      {!loadingComanda && items.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px solid rgba(52,211,153,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              🧾 Comanda
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#34d399" }}>{CRC(total)}</div>
          </div>
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", fontSize: 13,
                borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <span>
                  {item.descripcion}
                  {item.tipo === "manual" && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--subtext)", padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)" }}>manual</span>
                  )}
                </span>
                <span style={{ color: "var(--subtext)", flexShrink: 0, marginLeft: 10, fontSize: 12 }}>
                  {Number(item.cantidad)} × {CRC(item.precio_unitario)} =
                  <span style={{ fontWeight: 700, color: "var(--text)", marginLeft: 4 }}>
                    {CRC(Number(item.cantidad) * Number(item.precio_unitario))}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            {comanda.cobrado
              ? <span style={{ color: "#34d399" }}>✅ Cobrado</span>
              : <span style={{ color: "#f59e0b" }}>⏳ Pendiente de cobro en recepción</span>}
          </div>
        </div>
      )}
    </ModalBase>
  );
}

export default FichaDetailModal;
