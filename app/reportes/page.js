// app/reportes/page.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CRC = (n) =>
  `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function mesLabel(ym) {
  // "2026-07" → "jul 26"
  const [y, m] = (ym || "").split("-");
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${MESES_CORTOS[idx]} ${String(y).slice(2)}`;
}

const ESTADO_CITAS = {
  pendiente:  { label: "Pendientes",  icon: "⏳", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)" },
  confirmada: { label: "Confirmadas", icon: "✅", color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.35)" },
  completada: { label: "Completadas", icon: "🏁", color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)" },
  cancelada:  { label: "Canceladas",  icon: "✖️", color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)" },
};

const TIPO_FICHA_LABELS = {
  consulta: "Consulta general", vacunacion: "Vacunación", cirugia: "Cirugía",
  urgencia: "Urgencia", control: "Control / revisión", desparasitacion: "Desparasitación", otro: "Otro",
};

// ─── Componentes de visualización ─────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p style={{
      margin: "0 0 12px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtext)",
    }}>
      {children}
    </p>
  );
}

function StatTile({ icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ padding: "18px 20px", flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: "var(--subtext)", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 10, color: color || "var(--text)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Barras verticales (serie única, un solo tono — meses)
function BarChart({ data, color, formatValue, emptyText }) {
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
function HBarList({ data, color, formatValue }) {
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Guard: solo veterinarios (admin). Escribir /reportes en el navegador sin
  // permisos redirige al dashboard; además el API rechaza con 403 (seguridad real).
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try {
      const u = JSON.parse(raw);
      if (u?.role !== "admin") return router.replace("/dashboard");
      setUser(u);
    } catch { router.replace("/"); }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    expressApi.get("/reportes/resumen")
      .then(res => setData(res.data?.data || null))
      .catch(err => setError(err?.response?.data?.message || err.message || "Error cargando reportes"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ padding: "24px 32px", color: "var(--subtext)" }}>Cargando reportes...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ padding: "24px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
          <div style={{ color: "#fb7185" }}>{error || "No se pudieron cargar los datos."}</div>
          <button className="btn" style={{ marginTop: 14 }} onClick={() => router.push("/dashboard")}>← Volver al dashboard</button>
        </div>
      </div>
    );
  }

  const t = data.totales;
  const estadoMap = Object.fromEntries(data.citas_por_estado_mes.map(r => [r.estado, r.n]));
  const mesActualLabel = mesLabel(new Date().toISOString().slice(0, 7));

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── Barra superior ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0b1220",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button className="btn-ghost" onClick={() => router.push("/dashboard")}
          style={{ padding: "6px 10px", fontSize: 13 }}>← Volver</button>
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />
        <span style={{ fontWeight: 900, fontSize: 17 }}>📊 Reportes y estadísticas</span>
        <span style={{
          background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)",
          color: "var(--accent-2)", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
        }}>Solo veterinarios</span>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 48px" }}>

        {/* ── Resumen del mes ── */}
        <SectionTitle>Resumen del mes ({mesActualLabel})</SectionTitle>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <StatTile icon="💰" label="Ingresos cobrados" value={CRC(t.ingresos_mes)}   color="#34d399" />
          <StatTile icon="⏳" label="Pendiente de cobro" value={CRC(t.pendiente_cobro)} color="#f59e0b" sub="Total histórico sin cobrar" />
          <StatTile icon="📅" label="Citas del mes"      value={t.citas_mes} />
          <StatTile icon="📋" label="Fichas del mes"     value={t.fichas_mes} />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          <StatTile icon="👤" label="Propietarios" value={t.propietarios} />
          <StatTile icon="🐾" label="Mascotas"     value={t.mascotas} />
          <StatTile icon="⚠️" label="Vacunas vencidas" value={t.vacunas_vencidas}
            color={t.vacunas_vencidas > 0 ? "#ef4444" : "var(--text)"} sub="Ciclos sin completar" />
          <StatTile icon="💉" label="Vacunas próximas (30 días)" value={t.vacunas_proximas}
            color={t.vacunas_proximas > 0 ? "#f59e0b" : "var(--text)"} />
        </div>

        {/* ── Citas por estado (mes) ── */}
        <SectionTitle>Citas del mes por estado</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
          {Object.entries(ESTADO_CITAS).map(([key, cfg]) => (
            <div key={key} className="card" style={{
              flex: 1, minWidth: 140, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 10,
              border: `1px solid ${cfg.border}`, background: cfg.bg,
            }}>
              <span style={{ fontSize: 20 }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{estadoMap[key] || 0}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)" }}>{cfg.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Gráficas mensuales ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>💰 Ingresos cobrados por mes</div>
            <div style={{ fontSize: 11, color: "var(--subtext)" }}>Últimos 6 meses · colones</div>
            <BarChart data={data.ingresos_por_mes} color="#34d399" formatValue={CRC}
              emptyText="Aún no hay comandas cobradas." />
          </div>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📅 Citas por mes</div>
            <div style={{ fontSize: 11, color: "var(--subtext)" }}>Últimos 6 meses · cantidad</div>
            <BarChart data={data.citas_por_mes} color="#60a5fa" formatValue={v => String(v)}
              emptyText="Aún no hay citas registradas." />
          </div>
        </div>

        {/* ── Desgloses ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🏆 Servicios más facturados</div>
            <HBarList
              data={data.top_servicios.map(s => ({ label: s.descripcion, valor: s.total }))}
              color="#a78bfa"
              formatValue={CRC}
            />
          </div>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🐾 Mascotas por especie</div>
            <HBarList
              data={data.mascotas_por_especie.map(e => ({ label: e.especie, valor: e.n }))}
              color="#60a5fa"
              formatValue={v => String(v)}
            />
          </div>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📋 Fichas del mes por tipo</div>
            <HBarList
              data={data.fichas_por_tipo_mes.map(f => ({ label: TIPO_FICHA_LABELS[f.tipo] || f.tipo, valor: f.n }))}
              color="#34d399"
              formatValue={v => String(v)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
