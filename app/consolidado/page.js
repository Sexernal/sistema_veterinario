// app/consolidado/page.js
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CRC = (n) =>
  `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function getToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function fechaLarga(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(String(fechaNacimiento).slice(0, 10) + "T00:00:00");
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  if (nac > hoy) return null;
  let years = hoy.getFullYear() - nac.getFullYear();
  let months = hoy.getMonth() - nac.getMonth();
  if (hoy.getDate() < nac.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) return "Recién nacido";
  if (years === 0) return `${months} ${months === 1 ? "mes" : "meses"}`;
  if (months === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} a. ${months} m.`;
}

const TIPO_FICHA_LABELS = {
  consulta: "Consulta general", vacunacion: "Vacunación", cirugia: "Cirugía",
  urgencia: "Urgencia", control: "Control / revisión", desparasitacion: "Desparasitación", otro: "Otro",
};
const tipoFichaLabel = (f) =>
  f.tipo === "otro" && f.tipo_personalizado
    ? f.tipo_personalizado
    : (TIPO_FICHA_LABELS[f.tipo] || f.tipo || "—");

const ESTADO_CITA = {
  pendiente:  { label: "Pendiente",  color: "#f59e0b" },
  confirmada: { label: "Confirmada", color: "#3b82f6" },
  completada: { label: "Completada", color: "#10b981" },
  cancelada:  { label: "Cancelada",  color: "#ef4444" },
};

// ─── Estilos de impresión (el navegador genera el PDF) ────────────────────────
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm 12mm; }
  html, body {
    background: #ffffff !important;
    color: #000000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .doc { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .p-card {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    box-shadow: none !important;
    break-inside: avoid;
    page-break-inside: avoid;
    color: #000 !important;
  }
  .p-section { break-inside: auto; }
  .p-section-title {
    color: #000 !important;
    border-bottom: 2px solid #000 !important;
    break-after: avoid;
    page-break-after: avoid;
  }
  .p-text  { color: #000 !important; }
  .p-muted { color: #444 !important; }
  .p-chip  { border: 1px solid #94a3b8 !important; background: #f1f5f9 !important; color: #000 !important; }
  .p-firma { break-inside: avoid; page-break-inside: avoid; }
  /* Sin esto los recuadros dibujados con rgba(255,255,255,...) desaparecen sobre papel blanco */
  .p-box  { border: 1px solid #cbd5e1 !important; background: #ffffff !important; color: #000 !important; }
  .p-list { border: 1px solid #cbd5e1 !important; background: #ffffff !important; }
  .p-list > * + * { border-top: 1px solid #cbd5e1 !important; }
}
.print-only { display: none; }
`;

// ─── Componentes ──────────────────────────────────────────────────────────────

function Chip({ children, color }) {
  return (
    <span className="p-chip" style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      background: color ? `${color}1f` : "rgba(255,255,255,0.06)",
      border: `1px solid ${color ? `${color}59` : "rgba(255,255,255,0.12)"}`,
      color: color || "var(--subtext)",
    }}>{children}</span>
  );
}

function SectionTitle({ icon, title, count }) {
  return (
    <div className="p-section-title" style={{
      display: "flex", alignItems: "center", gap: 10,
      margin: "26px 0 14px", paddingBottom: 8,
      borderBottom: "1px solid rgba(255,255,255,0.1)",
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span className="p-text" style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
      <span className="p-chip" style={{
        padding: "1px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700,
        background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)",
        color: "var(--accent)",
      }}>{count}</span>
    </div>
  );
}

function Dato({ label, children }) {
  return (
    <div>
      <div className="p-muted" style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--subtext)", marginBottom: 2,
      }}>{label}</div>
      <div className="p-text" style={{ fontSize: 13 }}>{children ?? "—"}</div>
    </div>
  );
}

function Vacio({ texto }) {
  return (
    <div className="p-muted p-box" style={{
      padding: "18px 16px", borderRadius: 10, textAlign: "center",
      border: "1px dashed rgba(255,255,255,0.1)",
      color: "var(--subtext)", fontSize: 13, fontStyle: "italic",
    }}>{texto}</div>
  );
}

function Registro({ n, titulo, chips, children }) {
  return (
    <div className="card p-card" style={{ padding: "14px 16px", marginBottom: 10 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: 10, marginBottom: 10, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span className="p-chip" style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 11, fontWeight: 800, color: "var(--subtext)",
          }}>{n}</span>
          <span className="p-text" style={{ fontWeight: 800, fontSize: 14.5 }}>{titulo}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chips}</div>
      </div>
      {children}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ConsolidadoPage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [fecha, setFecha]     = useState(getToday());
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Guard: solo veterinarios (admin). El API también valida con requireAdmin.
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try {
      const u = JSON.parse(raw);
      if (u?.role !== "admin") return router.replace("/dashboard");
      setUser(u);
    } catch { router.replace("/"); }
  }, [router]);

  // isAlive evita que una respuesta lenta de una fecha anterior pise a la actual
  // (el input date dispara un cambio por cada dígito del año que se escribe)
  const cargar = useCallback(async (f, isAlive = () => true) => {
    setLoading(true); setError(null);
    try {
      const res = await expressApi.get(`/consolidado?fecha=${f}`);
      if (!isAlive()) return;
      setData(res.data?.data || null);
    } catch (err) {
      if (!isAlive()) return;
      setError(err?.response?.data?.message || err.message || "Error cargando el consolidado");
      setData(null);
    } finally { if (isAlive()) setLoading(false); }
  }, []);

  useEffect(() => {
    // Si el campo queda vacío o incompleto no se consulta: se conserva lo ya mostrado
    if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
    let alive = true;
    cargar(fecha, () => alive);
    return () => { alive = false; };
  }, [user, fecha, cargar]);

  if (!user) return null;

  const r = data?.resumen;
  const generadoEl = new Date().toLocaleString("es-CR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{PRINT_CSS}</style>

      {/* ── Barra superior (no se imprime) ── */}
      <header className="no-print" style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0b1220",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 24px", minHeight: 64,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <button className="btn-ghost" onClick={() => router.push("/dashboard")}
          style={{ padding: "6px 10px", fontSize: 13 }}>← Volver</button>
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />
        <span style={{ fontWeight: 900, fontSize: 17 }}>📄 Consolidado diario</span>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={() => setFecha(getToday())}
            style={{ padding: "6px 12px", fontSize: 13 }}>Hoy</button>
          <input className="input" type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ maxWidth: 170, margin: 0 }} />
          <button className="btn" onClick={() => window.print()} disabled={loading || !data}
            style={{ whiteSpace: "nowrap" }}>
            🖨️ Exportar PDF
          </button>
        </div>
      </header>

      <main className="doc" style={{ maxWidth: 980, margin: "0 auto", padding: "26px 24px 60px" }}>

        {/* ── Encabezado del documento ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          gap: 16, paddingBottom: 16, marginBottom: 6,
          borderBottom: "2px solid rgba(96,165,250,0.3)", flexWrap: "wrap",
        }}>
          <div>
            <div className="p-text" style={{ fontWeight: 900, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🐾</span> Veterinaria Cañas
            </div>
            <div className="p-muted" style={{ fontSize: 12.5, color: "var(--subtext)", marginTop: 3 }}>
              Consolidado de trabajos realizados
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="p-text" style={{ fontWeight: 800, fontSize: 15, textTransform: "capitalize" }}>
              {fechaLarga(fecha)}
            </div>
            <div className="p-muted" style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 3 }}>
              Generado el {generadoEl}
            </div>
            <div className="p-muted print-only" style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>
              Responsable: {user.nombre || user.email}
            </div>
          </div>
        </div>

        {/* ── Estados de carga / error ── */}
        {loading && (
          <div className="p-muted" style={{ padding: "50px 0", textAlign: "center", color: "var(--subtext)" }}>
            Cargando consolidado...
          </div>
        )}

        {error && !loading && (
          <div style={{
            marginTop: 20, padding: "14px 16px", borderRadius: 10,
            background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.25)",
            color: "#fb7185", fontSize: 14,
          }}>⚠️ {error}</div>
        )}

        {!loading && !error && data && r && (
          <>
            {/* ── Resumen ── */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10, margin: "18px 0 4px",
            }}>
              {[
                { icon: "📋", label: "Fichas médicas", value: r.fichas },
                { icon: "💉", label: "Vacunas aplicadas", value: r.vacunas },
                { icon: "📅", label: "Citas del día", value: r.citas },
                { icon: "🐾", label: "Pacientes atendidos", value: r.pacientes_atendidos },
                { icon: "💰", label: "Total facturado", value: CRC(r.total_facturado) },
              ].map(s => (
                <div key={s.label} className="card p-card" style={{ padding: "12px 14px" }}>
                  <div className="p-muted" style={{ fontSize: 10.5, color: "var(--subtext)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>{s.icon}</span>{s.label}
                  </div>
                  <div className="p-text" style={{ fontSize: 21, fontWeight: 900, marginTop: 5 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* ── 1. Fichas médicas ── */}
            <section className="p-section">
              <SectionTitle icon="📋" title="Fichas médicas y procedimientos" count={data.fichas.length} />
              {data.fichas.length === 0 ? (
                <Vacio texto="No se registraron fichas médicas en esta fecha." />
              ) : data.fichas.map((f, i) => {
                const edad = calcEdad(f.mascota.fecha_nacimiento);
                const especieRaza = [f.mascota.especie, f.mascota.raza].filter(Boolean).join(" / ");
                // uploaded_by puede ser recepcionista: solo se antepone "Dr." si es veterinario
                const registrado = f.registrado_por_nombre
                  ? (f.registrado_por_role === "admin" ? `Dr. ${f.registrado_por_nombre}` : f.registrado_por_nombre)
                  : "—";
                return (
                <Registro
                  key={f.id}
                  n={i + 1}
                  titulo={`${f.mascota.nombre || "—"} — ${tipoFichaLabel(f)}`}
                  chips={<>
                    <Chip>🕐 {f.hora}</Chip>
                    {f.total > 0 && (
                      <Chip color={f.cobrado ? "#10b981" : "#f59e0b"}>
                        {f.cobrado ? "✓ Cobrado" : "⏳ Pendiente"} · {CRC(f.total)}
                      </Chip>
                    )}
                  </>}
                >
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10, marginBottom: f.nota || f.items.length ? 10 : 0,
                  }}>
                    <Dato label="Paciente">
                      {f.mascota.nombre}
                      <span className="p-muted" style={{ color: "var(--subtext)" }}>
                        {especieRaza ? ` · ${especieRaza}` : ""}
                        {edad ? ` · ${edad}` : ""}
                      </span>
                    </Dato>
                    <Dato label="Propietario">
                      {f.propietario.nombre || "—"}
                      {f.propietario.cedula && (
                        <span className="p-muted" style={{ color: "var(--subtext)" }}> · 🪪 {f.propietario.cedula}</span>
                      )}
                    </Dato>
                    <Dato label="Teléfono">{f.propietario.telefono}</Dato>
                    <Dato label="Registrado por">{registrado}</Dato>
                    <Dato label="Peso">{f.peso != null ? `${f.peso} kg` : "—"}</Dato>
                    <Dato label="Temperatura">{f.temperatura != null ? `${f.temperatura} °C` : "—"}</Dato>
                  </div>

                  {f.nota && (
                    <div style={{ marginBottom: f.items.length ? 10 : 0 }}>
                      <div className="p-muted" style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: "var(--subtext)", marginBottom: 4,
                      }}>Observaciones / diagnóstico</div>
                      <div className="p-text p-box" style={{
                        fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                        padding: "9px 12px", borderRadius: 8,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                      }}>{f.nota}</div>
                    </div>
                  )}

                  {f.items.length > 0 && (
                    <div>
                      <div className="p-muted" style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: "var(--subtext)", marginBottom: 5,
                      }}>Tratamientos y servicios</div>
                      <div className="p-list" style={{
                        borderRadius: 8, overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}>
                        {f.items.map((it, idx) => (
                          <div key={idx} className="p-text" style={{
                            display: "flex", justifyContent: "space-between", gap: 10,
                            padding: "6px 11px", fontSize: 12.5,
                            borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          }}>
                            <span>{it.descripcion}{it.cantidad !== 1 ? ` ×${it.cantidad}` : ""}</span>
                            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{CRC(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Registro>
                );
              })}
            </section>

            {/* ── 2. Vacunas ── */}
            <section className="p-section">
              <SectionTitle icon="💉" title="Vacunas aplicadas" count={data.vacunas.length} />
              {data.vacunas.length === 0 ? (
                <Vacio texto="No se aplicaron vacunas en esta fecha." />
              ) : data.vacunas.map((v, i) => (
                <Registro
                  key={v.id}
                  n={i + 1}
                  titulo={`${v.mascota.nombre || "—"} — ${v.nombre_vacuna || "Vacuna"}`}
                  chips={v.fecha_proxima ? <Chip color="#a78bfa">🔁 Próxima: {v.fecha_proxima_display}</Chip> : null}
                >
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10, marginBottom: v.notas ? 10 : 0,
                  }}>
                    <Dato label="Paciente">
                      {v.mascota.nombre}
                      <span className="p-muted" style={{ color: "var(--subtext)" }}>
                        {[v.mascota.especie, v.mascota.raza].filter(Boolean).length
                          ? ` · ${[v.mascota.especie, v.mascota.raza].filter(Boolean).join(" / ")}` : ""}
                      </span>
                    </Dato>
                    <Dato label="Propietario">
                      {v.propietario.nombre || "—"}
                      {v.propietario.cedula && (
                        <span className="p-muted" style={{ color: "var(--subtext)" }}> · 🪪 {v.propietario.cedula}</span>
                      )}
                    </Dato>
                    <Dato label="Teléfono">{v.propietario.telefono}</Dato>
                    <Dato label="Producto">{v.producto}</Dato>
                    <Dato label="Lote">{v.lote}</Dato>
                    <Dato label="Veterinario">{v.veterinario_nombre ? `Dr. ${v.veterinario_nombre}` : "—"}</Dato>
                  </div>
                  {v.notas && (
                    <div>
                      <div className="p-muted" style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: "var(--subtext)", marginBottom: 4,
                      }}>Notas</div>
                      <div className="p-text p-box" style={{
                        fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                        padding: "9px 12px", borderRadius: 8,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                      }}>{v.notas}</div>
                    </div>
                  )}
                </Registro>
              ))}
            </section>

            {/* ── 3. Citas ── */}
            <section className="p-section">
              <SectionTitle icon="📅" title="Citas agendadas" count={data.citas.length} />
              {data.citas.length === 0 ? (
                <Vacio texto="No hubo citas agendadas en esta fecha." />
              ) : data.citas.map((c, i) => {
                const est = ESTADO_CITA[c.estado] || ESTADO_CITA.pendiente;
                return (
                  <Registro
                    key={c.id}
                    n={i + 1}
                    titulo={`${c.hora} — ${c.mascota.nombre || "—"}`}
                    chips={<>
                      <Chip color={est.color}>{est.label}</Chip>
                      {c.origen === "mobile" && <Chip>📱 App móvil</Chip>}
                    </>}
                  >
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 10, marginBottom: c.motivo ? 10 : 0,
                    }}>
                      <Dato label="Paciente">
                        {c.mascota.nombre}
                        <span className="p-muted" style={{ color: "var(--subtext)" }}>
                          {[c.mascota.especie, c.mascota.raza].filter(Boolean).length
                            ? ` · ${[c.mascota.especie, c.mascota.raza].filter(Boolean).join(" / ")}` : ""}
                        </span>
                      </Dato>
                      <Dato label="Propietario">
                        {c.propietario.nombre || "—"}
                        {c.propietario.cedula && (
                          <span className="p-muted" style={{ color: "var(--subtext)" }}> · 🪪 {c.propietario.cedula}</span>
                        )}
                      </Dato>
                      <Dato label="Teléfono">{c.propietario.telefono}</Dato>
                      <Dato label="Tipo de consulta">{c.tipo_consulta}</Dato>
                      <Dato label="Duración">{c.duracion_min ? `${c.duracion_min} min` : "—"}</Dato>
                      <Dato label="Veterinario">{c.veterinario_nombre ? `Dr. ${c.veterinario_nombre}` : "—"}</Dato>
                    </div>
                    {c.motivo && (
                      <div>
                        <div className="p-muted" style={{
                          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase", color: "var(--subtext)", marginBottom: 4,
                        }}>Motivo</div>
                        <div className="p-text p-box" style={{
                          fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                          padding: "9px 12px", borderRadius: 8,
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        }}>{c.motivo}</div>
                      </div>
                    )}
                  </Registro>
                );
              })}
            </section>

            {/* ── Pie / firma (solo al imprimir) ── */}
            <div className="print-only p-firma" style={{ marginTop: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 40, marginTop: 50 }}>
                <div style={{ flex: 1, borderTop: "1px solid #000", paddingTop: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 11.5 }}>Firma del médico veterinario</div>
                </div>
                <div style={{ flex: 1, borderTop: "1px solid #000", paddingTop: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 11.5 }}>Código de colegiado</div>
                </div>
              </div>
              <div style={{ marginTop: 22, fontSize: 10, textAlign: "center", color: "#444" }}>
                Documento generado automáticamente por el Sistema Veterinaria Cañas · {fechaLarga(fecha)}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
