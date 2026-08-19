// app/reportes/page.js
// Panel de estadísticas. Exclusivo del super admin.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";
import { puede } from "../../components/permisos";
import { descargarArchivo } from "../../components/descargar";
import RangoFechas, { ATAJOS } from "../../components/reportes/RangoFechas";
import {
  CRC, mesLabel, SectionTitle, StatTile, TablaSimple, BarChart, HBarList,
} from "../../components/reportes/graficas";

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

const fechaCorta = (ymd) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

export default function ReportesPage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [rango, setRango]     = useState(ATAJOS.este_mes.calcular());
  const [bajando, setBajando] = useState(null);   // "pdf" | "csv" | null

  // Guarda de página. El API rechaza igual con 403: esto es solo para que
  // nadie llegue a una pantalla que no le sirve.
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try {
      const u = JSON.parse(raw);
      if (!puede(u, "reportes.ver")) return router.replace("/dashboard");
      setUser(u);
    } catch { router.replace("/"); }
  }, [router]);

  const cargar = useCallback(async (r) => {
    setLoading(true); setError(null);
    try {
      const res = await expressApi.get("/reportes/resumen", { params: r });
      setData(res.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "No se pudo cargar el reporte");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) cargar(rango); }, [user, rango, cargar]);

  const descargar = async (formato) => {
    setBajando(formato);
    try {
      await descargarArchivo(`/reportes/${formato}`, rango, `reporte.${formato}`);
    } catch (err) {
      alert(err?.message || `No se pudo descargar el ${formato.toUpperCase()}`);
    } finally { setBajando(null); }
  };

  if (!user) return null;

  const t = data?.totales;
  const v = data?.variaciones || {};

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Encabezado */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(11,16,32,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px", minHeight: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={() => router.push("/dashboard")}
            style={{ padding: "6px 12px", fontSize: 13 }}>← Volver</button>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ fontWeight: 800, fontSize: 16 }}>📊 Reportes y estadísticas</div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "10px 0" }}>
          <button className="btn-ghost" onClick={() => descargar("pdf")}
            disabled={loading || !data || bajando}
            style={{ fontSize: 13, padding: "6px 12px" }}>
            {bajando === "pdf" ? "Generando..." : "📄 Descargar PDF"}
          </button>
          <button className="btn-ghost" onClick={() => descargar("csv")}
            disabled={loading || !data || bajando}
            style={{ fontSize: 13, padding: "6px 12px" }}>
            {bajando === "csv" ? "Generando..." : "📊 Excel (CSV)"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
        <RangoFechas valor={rango} onChange={setRango} cargando={loading} />

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
            Cargando estadísticas...
          </div>
        ) : error ? (
          <div className="card" style={{
            padding: "20px 24px", color: "#fb7185",
            border: "1px solid rgba(251,113,133,0.25)", background: "rgba(251,113,133,0.06)",
          }}>
            {error}
          </div>
        ) : !data ? null : (
          <>
            {/* ── Indicadores del periodo ── */}
            <SectionTitle>
              Periodo del {fechaCorta(data.rango.desde)} al {fechaCorta(data.rango.hasta)}
            </SectionTitle>
            <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
              <StatTile icon="💰" label="Ingresos cobrados" value={CRC(t.ingresos)}
                color="#34d399" variacion={v.ingresos} />
              <StatTile icon="🧾" label="Ticket promedio" value={CRC(t.ticket_promedio)}
                variacion={v.ticket_promedio} sub={`${t.comandas_cobradas} comandas cobradas`} />
              <StatTile icon="📅" label="Citas" value={t.citas} variacion={v.citas} />
              <StatTile icon="📋" label="Fichas creadas" value={t.fichas} variacion={v.fichas} />
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
              <StatTile icon="🆕" label="Clientes nuevos" value={t.propietarios_nuevos}
                variacion={v.propietarios_nuevos}
                sub={`${data.clientes.recurrentes} ya venían antes`} />
              <StatTile icon="❌" label="Tasa de cancelación" value={`${t.tasa_cancelacion}%`}
                color={t.tasa_cancelacion > 15 ? "#fb7185" : undefined}
                sub={`${t.citas_canceladas} de ${t.citas} citas`} />
              <StatTile icon="⏳" label="Pendiente de cobro" value={CRC(t.pendiente_cobro)}
                color="#f59e0b" sub="Histórico sin cobrar" />
            </div>

            <p style={{ margin: "0 0 26px", fontSize: 11, color: "var(--subtext)", lineHeight: 1.6 }}>
              Los porcentajes comparan contra el periodo anterior de la misma duración
              ({fechaCorta(data.rango.prev_desde)} al {fechaCorta(data.rango.prev_hasta)}).
              Cuando en ese periodo no hubo movimiento, no se muestra variación.
            </p>

            {/* ── Rendimiento por veterinario ── */}
            <SectionTitle>Rendimiento por veterinario</SectionTitle>
            <div style={{ marginBottom: 26 }}>
              <TablaSimple
                cabeceras={["Veterinario", "Fichas", "Citas", "Facturado"]}
                filas={data.productividad.map(p => [p.nombre, p.fichas, p.citas, CRC(p.ingresos)])}
                vacio="Ningún veterinario registró actividad en este periodo."
              />
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--subtext)" }}>
                Lo facturado se atribuye a quien creó la ficha, no a quien la cobró en recepción.
              </p>
            </div>

            {/* ── Citas por estado ── */}
            <SectionTitle>Citas por estado</SectionTitle>
            <div style={{ display: "flex", gap: 10, marginBottom: 26, flexWrap: "wrap" }}>
              {data.citas_por_estado.length === 0 ? (
                <div className="card" style={{ padding: "18px 20px", color: "var(--subtext)", fontSize: 13, fontStyle: "italic" }}>
                  Sin citas en este periodo.
                </div>
              ) : data.citas_por_estado.map(c => {
                const cfg = ESTADO_CITAS[c.estado] || { label: c.estado, icon: "•", color: "var(--subtext)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" };
                return (
                  <div key={c.estado} style={{
                    flex: "1 1 150px", padding: "14px 18px", borderRadius: 12,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}>
                    <div style={{ fontSize: 12, color: cfg.color, fontWeight: 700 }}>{cfg.icon} {cfg.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{c.n}</div>
                  </div>
                );
              })}
            </div>

            {/* ── Evolución ── */}
            <SectionTitle>Evolución de los últimos 6 meses</SectionTitle>
            <div style={{ display: "flex", gap: 14, marginBottom: 26, flexWrap: "wrap" }}>
              <div className="card" style={{ flex: "1 1 380px", padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📅 Citas por mes</div>
                <BarChart data={data.citas_por_mes} color="#60a5fa" formatValue={n => n} />
              </div>
              <div className="card" style={{ flex: "1 1 380px", padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>💰 Ingresos cobrados por mes</div>
                <BarChart data={data.ingresos_por_mes} color="#34d399"
                  formatValue={n => (n >= 1000 ? `${Math.round(n / 1000)}k` : n)} />
              </div>
            </div>

            {/* ── Servicios y tipos de ficha ── */}
            <div style={{ display: "flex", gap: 14, marginBottom: 26, flexWrap: "wrap" }}>
              <div className="card" style={{ flex: "1 1 380px", padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🏆 Servicios más facturados</div>
                <HBarList
                  data={data.top_servicios.map(s => ({ label: s.descripcion, valor: s.total }))}
                  color="#a78bfa" formatValue={CRC} />
              </div>
              <div className="card" style={{ flex: "1 1 380px", padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📋 Fichas por tipo</div>
                <HBarList
                  data={data.fichas_por_tipo.map(f => ({
                    label: TIPO_FICHA_LABELS[f.tipo] || f.tipo, valor: f.n,
                  }))}
                  color="#60a5fa" formatValue={n => n} />
              </div>
            </div>

            {/* ── Situación general (no depende del rango) ── */}
            <SectionTitle>Situación general de la clínica</SectionTitle>
            <div style={{ display: "flex", gap: 14, marginBottom: 26, flexWrap: "wrap" }}>
              <StatTile icon="👤" label="Propietarios" value={t.propietarios} />
              <StatTile icon="🐾" label="Mascotas" value={t.mascotas} />
              <StatTile icon="⚠️" label="Vacunas vencidas" value={t.vacunas_vencidas}
                color={t.vacunas_vencidas > 0 ? "#fb7185" : undefined} />
              <StatTile icon="💉" label="Vacunas por vencer (30 días)" value={t.vacunas_proximas}
                color={t.vacunas_proximas > 0 ? "#f59e0b" : undefined} />
            </div>

            <div className="card" style={{ padding: "18px 20px", marginBottom: 40 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🐾 Mascotas por especie</div>
              <HBarList
                data={(t.mascotas_por_especie || []).map(e => ({ label: e.especie, valor: e.n }))}
                color="#34d399" formatValue={n => n} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
