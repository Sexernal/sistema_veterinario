// app/facturacion/page.js
"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

const CRC = (n) =>
  `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).substring(0, 10);
  return d.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function printComanda(row) {
  const items = row.items || [];
  const total = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Comanda — ${row.mascota_nombre}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:14px;padding:30px;color:#111}
    h1{font-size:20px;margin-bottom:4px} .sub{color:#666;font-size:13px;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:20px;font-size:13px}
    .lbl{font-weight:700;color:#444}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#f0f0f0;text-align:left;padding:7px 10px;font-size:12px;border:1px solid #ddd}
    td{padding:7px 10px;border:1px solid #ddd;font-size:13px}
    .r{text-align:right} .b{font-weight:900}
    .badge{display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;background:#eee;color:#666;margin-left:6px}
    .foot{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:8px}
    @media print{body{padding:15px}}
  </style></head><body>
  <h1>🐾 VetCare — Comanda de servicio</h1>
  <div class="sub">Clínica Veterinaria</div>
  <div class="grid">
    <div><span class="lbl">Mascota:</span> ${row.mascota_nombre}${row.especie ? ` (${row.especie})` : ""}</div>
    <div><span class="lbl">Propietario:</span> ${row.propietario_nombre || "—"}</div>
    <div><span class="lbl">Teléfono:</span> ${row.propietario_telefono || "—"}</div>
    <div><span class="lbl">Fecha:</span> ${fmtDate(row.fecha)}</div>
    <div><span class="lbl">Tipo consulta:</span> ${row.tipo_personalizado || row.tipo || "—"}</div>
    ${row.veterinario_nombre ? `<div><span class="lbl">Veterinario:</span> Dr. ${row.veterinario_nombre}</div>` : ""}
  </div>
  <table>
    <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th class="r">Precio unit.</th><th class="r">Subtotal</th></tr></thead>
    <tbody>
      ${items.map(i => `<tr>
        <td>${i.descripcion}${i.tipo === "manual" ? '<span class="badge">manual</span>' : ""}</td>
        <td style="text-align:center">${Number(i.cantidad)}</td>
        <td class="r">${CRC(i.precio_unitario)}</td>
        <td class="r b">${CRC(Number(i.cantidad) * Number(i.precio_unitario))}</td>
      </tr>`).join("")}
      <tr><td colspan="3" class="r b" style="background:#f9f9f9">TOTAL</td>
          <td class="r b" style="background:#f9f9f9;font-size:16px">${CRC(total)}</td></tr>
    </tbody>
  </table>
  <div class="foot">Generado el ${new Date().toLocaleDateString("es-CR")} a las ${new Date().toLocaleTimeString("es-CR")}</div>
  </body></html>`;
  const w = window.open("", "_blank", "width=820,height=650");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

// ─── Modal gestión de catálogo de servicios (admin) ──────────────────────────
function CatalogoModal({ onClose }) {
  const [servicios, setServicios]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [form, setForm]               = useState({ nombre: "", categoria: "", precio: "" });
  const [editingId, setEditingId]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await expressApi.get("/servicios?all=1");
      setServicios(res.data?.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ nombre: s.nombre, categoria: s.categoria || "", precio: String(s.precio) });
    setErr("");
  };

  const reset = () => { setEditingId(null); setForm({ nombre: "", categoria: "", precio: "" }); setErr(""); };

  const save = async () => {
    if (!form.nombre.trim() || !form.precio) { setErr("Nombre y precio son requeridos."); return; }
    setSaving(true); setErr("");
    try {
      const payload = { nombre: form.nombre.trim(), categoria: form.categoria.trim() || null, precio: Number(form.precio) };
      if (editingId) {
        await expressApi.put(`/servicios/${editingId}`, payload);
      } else {
        await expressApi.post("/servicios", payload);
      }
      reset(); fetch();
    } catch (e) { setErr(e?.response?.data?.message || e.message || "Error"); }
    finally { setSaving(false); }
  };

  const toggle = async (s) => {
    try {
      await expressApi.put(`/servicios/${s.id}`, { activo: !s.activo });
      fetch();
    } catch { }
  };

  const CATS = ["Consulta", "Vacunación", "Tratamiento", "Procedimiento", "Diagnóstico", "Cirugía", "Hospitalización", "Peluquería", "Otro"];

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth: 700, width: "92vw", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div>
            <div className="title" style={{ fontSize: 17 }}>⚙️ Catálogo de servicios</div>
            <div className="subtitle" style={{ fontSize: 12 }}>Gestiona los servicios y precios del consultorio</div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          {/* Form */}
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--accent)" }}>
              {editingId ? "Editar servicio" : "Agregar nuevo servicio"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--subtext)" }}>Nombre</div>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Vacuna antirrábica" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--subtext)" }}>Categoría</div>
                <select className="input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--subtext)" }}>Precio ₡</div>
                <input className="input" type="number" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="0" />
              </div>
            </div>
            {err && <div style={{ marginTop: 8, fontSize: 12, color: "#fb7185" }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={save} disabled={saving}>{saving ? "Guardando..." : (editingId ? "Guardar cambios" : "Agregar servicio")}</button>
              {editingId && <button className="btn-ghost" onClick={reset}>Cancelar</button>}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--subtext)", padding: 24 }}>Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {servicios.map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)",
                  background: s.activo ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                  opacity: s.activo ? 1 : 0.5,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.nombre}</div>
                    {s.categoria && <div style={{ fontSize: 11, color: "var(--subtext)" }}>{s.categoria}</div>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#34d399", minWidth: 90, textAlign: "right" }}>{CRC(s.precio)}</div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(s)}>Editar</button>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => toggle(s)}>
                      {s.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FacturacionPage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState({ q: "", cobrado: "", fecha_desde: "", fecha_hasta: "" });
  const [expanded, setExpanded] = useState(null);
  const [marking, setMarking]   = useState(null);
  const [meta, setMeta]         = useState({ total: 0 });
  const [showCatalogo, setShowCatalogo] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    setUser(JSON.parse(raw));
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter.q)          p.set("q", filter.q);
      if (filter.cobrado !== "") p.set("cobrado", filter.cobrado);
      if (filter.fecha_desde) p.set("fecha_desde", filter.fecha_desde);
      if (filter.fecha_hasta) p.set("fecha_hasta", filter.fecha_hasta);
      p.set("limit", "200");
      const res = await expressApi.get(`/facturacion?${p}`);
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0 });
    } catch (err) {
      console.error("Error cargando facturación:", err);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user]);

  const markCobrado = async (fichaId, cobrado) => {
    setMarking(fichaId);
    try {
      await expressApi.put(`/facturacion/${fichaId}/cobrar`, { cobrado });
      setRows(prev => prev.map(r => r.id === fichaId
        ? { ...r, cobrado: cobrado ? 1 : 0, cobrado_at: cobrado ? new Date().toISOString() : null }
        : r
      ));
    } catch (err) {
      alert("Error: " + (err?.response?.data?.message || err.message));
    } finally { setMarking(null); }
  };

  if (!user) return null;
  const isAdmin        = user.role === "admin";
  const totalPendiente = rows.filter(r => !r.cobrado).reduce((s, r) => s + Number(r.total_comanda || 0), 0);
  const totalCobrado   = rows.filter(r =>  r.cobrado).reduce((s, r) => s + Number(r.total_comanda || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(11,16,32,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={() => router.push("/dashboard")} style={{ padding: "6px 12px", fontSize: 13 }}>← Volver</button>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            🧾 Facturación
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--subtext)" }}>{meta.total} comandas</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin && (
            <button className="btn-ghost" onClick={() => setShowCatalogo(true)} style={{ fontSize: 13, padding: "6px 12px" }}>
              ⚙️ Catálogo
            </button>
          )}
          <button className="btn-ghost" onClick={fetchData} style={{ fontSize: 13, padding: "6px 12px" }}>↻ Actualizar</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
        {/* Resumen */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 180, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 6 }}>PENDIENTE DE COBRO</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>{CRC(totalPendiente)}</div>
            <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 2 }}>{rows.filter(r => !r.cobrado).length} comandas</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 6 }}>COBRADO (FILTRO ACTUAL)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#34d399" }}>{CRC(totalCobrado)}</div>
            <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 2 }}>{rows.filter(r => r.cobrado).length} comandas</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 135px 135px", gap: 10, marginBottom: 20 }}>
          <input className="input" placeholder="Buscar propietario o mascota..." value={filter.q}
            onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} style={{ margin: 0 }} />
          <select className="input" value={filter.cobrado} onChange={e => setFilter(f => ({ ...f, cobrado: e.target.value }))} style={{ margin: 0 }}>
            <option value="">Todos</option>
            <option value="0">⏳ Pendiente</option>
            <option value="1">✅ Cobrado</option>
          </select>
          <input className="input" type="date" value={filter.fecha_desde}
            onChange={e => setFilter(f => ({ ...f, fecha_desde: e.target.value }))} style={{ margin: 0 }} />
          <input className="input" type="date" value={filter.fecha_hasta}
            onChange={e => setFilter(f => ({ ...f, fecha_hasta: e.target.value }))} style={{ margin: 0 }} />
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--subtext)" }}>Cargando comandas...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", color: "var(--subtext)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
            <div style={{ fontWeight: 600 }}>No hay comandas que mostrar</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Las comandas se crean al agregar ítems en una ficha médica</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map(row => {
              const isPending = !row.cobrado;
              const isExp     = expanded === row.id;
              return (
                <div key={row.id} className="card" style={{
                  borderLeft: `3px solid ${isPending ? "rgba(245,158,11,0.6)" : "rgba(52,211,153,0.6)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{row.mascota_nombre}</span>
                        {row.especie && <span style={{ fontSize: 12, color: "var(--subtext)" }}>({row.especie})</span>}
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                          background: isPending ? "rgba(245,158,11,0.12)" : "rgba(52,211,153,0.12)",
                          color: isPending ? "#f59e0b" : "#34d399",
                          border: `1px solid ${isPending ? "rgba(245,158,11,0.3)" : "rgba(52,211,153,0.3)"}`,
                        }}>
                          {isPending ? "⏳ Pendiente" : "✅ Cobrado"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--subtext)", display: "flex", flexWrap: "wrap", gap: "3px 14px" }}>
                        {row.propietario_nombre && <span>👤 {row.propietario_nombre}</span>}
                        {row.propietario_telefono && <span>📞 {row.propietario_telefono}</span>}
                        <span>📅 {fmtDate(row.fecha)}</span>
                        <span>🩺 {row.tipo_personalizado || row.tipo || "—"}</span>
                        {row.veterinario_nombre && <span>Dr. {row.veterinario_nombre}</span>}
                        <span style={{ fontWeight: 600 }}>{row.items_count} ítem{row.items_count !== 1 ? "s" : ""}</span>
                      </div>
                      {row.cobrado && row.cobrado_at && (
                        <div style={{ marginTop: 4, fontSize: 11, color: "#34d399" }}>
                          ✅ Cobrado el {fmtDate(row.cobrado_at)}
                          {row.notas_cobro && <span style={{ color: "var(--subtext)" }}> — {row.notas_cobro}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isPending ? "#f59e0b" : "#34d399" }}>
                        {CRC(row.total_comanda)}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => setExpanded(isExp ? null : row.id)}>
                          {isExp ? "▲ Ocultar" : "▼ Detalle"}
                        </button>
                        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => printComanda(row)}>
                          🖨️ Imprimir
                        </button>
                        {isPending ? (
                          <button className="btn" disabled={marking === row.id}
                            style={{ padding: "5px 12px", fontSize: 12, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399" }}
                            onClick={() => markCobrado(row.id, true)}>
                            {marking === row.id ? "..." : "✓ Cobrado"}
                          </button>
                        ) : (
                          <button className="btn-ghost" disabled={marking === row.id}
                            style={{ padding: "5px 10px", fontSize: 12, color: "var(--subtext)" }}
                            onClick={() => markCobrado(row.id, false)}>
                            {marking === row.id ? "..." : "↩ Desmarcar"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 8, letterSpacing: "0.06em" }}>DETALLE DE COMANDA</div>
                      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 60px 110px 110px",
                          gap: 8, padding: "6px 12px",
                          background: "rgba(255,255,255,0.04)",
                          fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase",
                        }}>
                          <span>Descripción</span><span style={{ textAlign: "center" }}>Cant.</span>
                          <span style={{ textAlign: "right" }}>Precio u.</span><span style={{ textAlign: "right" }}>Subtotal</span>
                        </div>
                        {(row.items || []).map((item, idx) => (
                          <div key={idx} style={{
                            display: "grid", gridTemplateColumns: "1fr 60px 110px 110px",
                            gap: 8, padding: "8px 12px", alignItems: "center",
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                          }}>
                            <div style={{ fontSize: 13 }}>
                              {item.descripcion}
                              {item.tipo === "manual" && (
                                <span style={{ marginLeft: 6, fontSize: 10, color: "var(--subtext)", padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)" }}>manual</span>
                              )}
                            </div>
                            <div style={{ textAlign: "center", fontSize: 13 }}>{Number(item.cantidad)}</div>
                            <div style={{ textAlign: "right", fontSize: 13 }}>{CRC(item.precio_unitario)}</div>
                            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>{CRC(Number(item.cantidad) * Number(item.precio_unitario))}</div>
                          </div>
                        ))}
                        <div style={{
                          display: "flex", justifyContent: "flex-end", gap: 16, padding: "10px 12px",
                          borderTop: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.03)",
                        }}>
                          <span style={{ fontSize: 12, color: "var(--subtext)", fontWeight: 600 }}>TOTAL</span>
                          <span style={{ fontSize: 20, fontWeight: 900 }}>{CRC(row.total_comanda)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCatalogo && <CatalogoModal onClose={() => setShowCatalogo(false)} />}
    </div>
  );
}