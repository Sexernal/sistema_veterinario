// app/mascotas/ComandaSection.js
// Selector de servicios y ítems manuales que se cobra junto con la ficha.
"use client";
import { useEffect, useState } from "react";
import expressApi from "../../lib/expressApi";

// ── Sección comanda dentro del formulario de ficha ────────────────────────────
function ComandaSection({ fichaId, items, onItemsChange }) {
  const [servicios, setServicios]           = useState([]);
  const [loadingS, setLoadingS]             = useState(true);
  const [manualDesc, setManualDesc]         = useState("");
  const [manualPrecio, setManualPrecio]     = useState("");
  const [manualCantidad, setManualCantidad] = useState("1");

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          expressApi.get("/servicios"),
          fichaId ? expressApi.get(`/fichas/${fichaId}/comanda`) : Promise.resolve(null),
        ]);
        setServicios(sRes.data?.data || []);
        if (cRes?.data?.data?.items?.length) {
          onItemsChange(cRes.data.data.items.map(i => ({
            tipo:            i.tipo,
            servicio_id:     i.servicio_id,
            descripcion:     i.descripcion,
            cantidad:        Number(i.cantidad),
            precio_unitario: Number(i.precio_unitario),
          })));
        }
      } catch { } finally { setLoadingS(false); }
    };
    load();
  }, [fichaId]); // solo al montar

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const toggleServicio = (s) => {
    const idx = items.findIndex(i => i.servicio_id === s.id && i.tipo === "servicio");
    if (idx >= 0) {
      onItemsChange(items.filter((_, i) => i !== idx));
    } else {
      onItemsChange([...items, { tipo: "servicio", servicio_id: s.id, descripcion: s.nombre, cantidad: 1, precio_unitario: Number(s.precio) }]);
    }
  };

  const updateQty = (idx, val) => {
    const n = Math.max(0.01, Number(val) || 1);
    onItemsChange(items.map((item, i) => i === idx ? { ...item, cantidad: n } : item));
  };

  const removeItem = (idx) => onItemsChange(items.filter((_, i) => i !== idx));

  const addManual = () => {
    if (!manualDesc.trim() || !manualPrecio) return;
    onItemsChange([...items, {
      tipo: "manual", servicio_id: null,
      descripcion: manualDesc.trim(),
      cantidad: Math.max(0.01, Number(manualCantidad) || 1),
      precio_unitario: Math.max(0, Number(manualPrecio)),
    }]);
    setManualDesc(""); setManualPrecio(""); setManualCantidad("1");
  };

  // Agrupar por categoría
  const byCategory = {};
  for (const s of servicios) {
    const cat = s.categoria || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }

  const CRC = (n) => `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{ marginTop: 16, borderTop: "2px solid rgba(52,211,153,0.2)", paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 17 }}>🧾</span>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Comanda</div>
        <span style={{ fontSize: 12, color: "var(--subtext)" }}>— facturación de la consulta</span>
      </div>

      {/* Catálogo de servicios */}
      {loadingS ? (
        <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 12 }}>Cargando servicios...</div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Servicios — clic para agregar / quitar
          </div>
          {Object.entries(byCategory).map(([cat, svcs]) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, letterSpacing: 1, textTransform: "uppercase" }}>{cat}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {svcs.map(s => {
                  const sel = items.some(i => i.servicio_id === s.id && i.tipo === "servicio");
                  return (
                    <button key={s.id} type="button" onClick={() => toggleServicio(s)} style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                      border: sel ? "1px solid rgba(52,211,153,0.6)" : "1px solid rgba(255,255,255,0.12)",
                      background: sel ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.04)",
                      color: sel ? "#34d399" : "var(--text)", fontWeight: sel ? 700 : 400,
                      transition: "all 0.12s",
                    }}>
                      {s.nombre}
                      <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>{CRC(s.precio)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ítem manual */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          Agregar ítem manual (medicamentos, otros)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px auto", gap: 6, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 3 }}>Descripción</div>
            <input className="input" placeholder="Ej: Amoxicilina 500mg" value={manualDesc}
              onChange={e => setManualDesc(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addManual())} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 3 }}>Cant.</div>
            <input className="input" type="number" min="0.01" step="0.01" value={manualCantidad}
              onChange={e => setManualCantidad(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 3 }}>Precio ₡</div>
            <input className="input" type="number" min="0" value={manualPrecio}
              onChange={e => setManualPrecio(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addManual())} />
          </div>
          <button type="button" className="btn" onClick={addManual} disabled={!manualDesc.trim() || !manualPrecio}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Lista de ítems */}
      {items.length === 0 ? (
        <div style={{
          padding: "14px 16px", borderRadius: 10, textAlign: "center",
          border: "1px dashed rgba(255,255,255,0.1)", color: "var(--subtext)", fontSize: 13, fontStyle: "italic",
        }}>
          No hay ítems en la comanda aún
        </div>
      ) : (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 62px 95px 30px",
            gap: 8, padding: "6px 12px",
            background: "rgba(255,255,255,0.04)",
            fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase",
          }}>
            <span>Descripción</span>
            <span style={{ textAlign: "center" }}>Cant.</span>
            <span style={{ textAlign: "right" }}>Subtotal</span>
            <span />
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{
              display: "grid", gridTemplateColumns: "1fr 62px 95px 30px",
              gap: 8, padding: "8px 12px", alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.015)",
            }}>
              <div style={{ fontSize: 12 }}>
                {item.descripcion}
                {item.tipo === "manual" && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "var(--subtext)", padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }}>manual</span>
                )}
                <div style={{ fontSize: 10, color: "var(--subtext)" }}>{CRC(item.precio_unitario)} c/u</div>
              </div>
              <input type="number" min="0.01" step="0.01" value={item.cantidad}
                onChange={e => updateQty(idx, e.target.value)}
                style={{
                  width: "100%", textAlign: "center", padding: "4px 6px",
                  borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", color: "var(--text)", fontSize: 12,
                }} />
              <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>
                {CRC(item.cantidad * item.precio_unitario)}
              </div>
              <button type="button" onClick={() => removeItem(idx)} style={{
                width: 24, height: 24, borderRadius: 6, border: "none",
                background: "rgba(239,68,68,0.15)", color: "#ef4444",
                cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              }}>×</button>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14,
            padding: "10px 12px",
            background: "rgba(52,211,153,0.06)", borderTop: "1px solid rgba(52,211,153,0.2)",
          }}>
            <span style={{ fontSize: 12, color: "var(--subtext)" }}>{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#34d399" }}>{CRC(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComandaSection;
