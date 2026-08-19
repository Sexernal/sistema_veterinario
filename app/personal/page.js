// app/personal/page.js
// Gestión del personal de la clínica: ver roles, ascender/degradar y
// corregir datos de contacto. Exclusiva del super admin.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";
import { puede } from "../../components/permisos";
import { EmptyState, FilterChips } from "../../components/ui";
import CambiarRolModal from "../../components/personal/CambiarRolModal";
import EditarDatosModal from "../../components/personal/EditarDatosModal";

const COLOR_ROL = {
  superadmin: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  bd: "rgba(245,158,11,0.35)" },
  admin:      { color: "#34d399", bg: "rgba(52,211,153,0.12)",  bd: "rgba(52,211,153,0.3)"  },
  user:       { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  bd: "rgba(96,165,250,0.3)"  },
};

function RolBadge({ role, label }) {
  const c = COLOR_ROL[role] || COLOR_ROL.user;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
      background: c.bg, border: `1px solid ${c.bd}`, color: c.color, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

export default function PersonalPage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [lista, setLista]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [aviso, setAviso]     = useState(null);
  const [filtro, setFiltro]   = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cambiando, setCambiando] = useState(null); // { persona, rolDestino }
  const [editando, setEditando]   = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try {
      const u = JSON.parse(raw);
      if (!puede(u, "usuarios.gestionar")) return router.replace("/dashboard");
      setUser(u);
    } catch { router.replace("/"); }
  }, [router]);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pRes, rRes] = await Promise.all([
        expressApi.get("/personal"),
        expressApi.get("/personal/roles"),
      ]);
      setLista(pRes.data?.data || []);
      setRoles(rRes.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "No se pudo cargar el personal");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) cargar(); }, [user, cargar]);

  const tras = (actualizado, mensaje) => {
    setCambiando(null); setEditando(null);
    if (actualizado) setLista(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
    setAviso(mensaje || "Listo");
    setTimeout(() => setAviso(null), 5000);
  };

  const conteos = useMemo(() => ({
    todos:      lista.length,
    superadmin: lista.filter(p => p.role === "superadmin").length,
    admin:      lista.filter(p => p.role === "admin").length,
    user:       lista.filter(p => p.role === "user").length,
    sin_correo: lista.filter(p => !p.correo_utilizable).length,
  }), [lista]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(p => {
      if (filtro === "sin_correo" && p.correo_utilizable) return false;
      if (filtro !== "todos" && filtro !== "sin_correo" && p.role !== filtro) return false;
      if (!q) return true;
      return (p.nombre || "").toLowerCase().includes(q)
          || (p.cedula || "").includes(q)
          || (p.email || "").toLowerCase().includes(q);
    });
  }, [lista, filtro, busqueda]);

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(11,16,32,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={() => router.push("/dashboard")}
            style={{ padding: "6px 12px", fontSize: 13 }}>← Volver</button>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            👥 Personal
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--subtext)" }}>
              {lista.length} {lista.length === 1 ? "persona" : "personas"}
            </span>
          </div>
        </div>
        <button className="btn-ghost" onClick={cargar} disabled={loading}
          style={{ fontSize: 13, padding: "6px 12px" }}>↻ Actualizar</button>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        {aviso && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399",
          }}>
            ✅ {aviso}
          </div>
        )}

        {conteos.sin_correo > 0 && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, lineHeight: 1.6,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b",
          }}>
            ⚠️ {conteos.sin_correo} {conteos.sin_correo === 1 ? "persona no tiene" : "personas no tienen"} un
            correo real registrado. Sin correo no pueden restablecer su contraseña si la olvidan.
          </div>
        )}

        <input
          className="input"
          placeholder="Buscar por nombre, cédula o correo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <FilterChips
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "todos",      label: "Todos",           count: conteos.todos },
            { value: "superadmin", label: "Administradores", count: conteos.superadmin },
            { value: "admin",      label: "Doctores",        count: conteos.admin },
            { value: "user",       label: "Recepción",       count: conteos.user },
            { value: "sin_correo", label: "⚠️ Sin correo",   count: conteos.sin_correo },
          ]}
        />

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
            Cargando personal...
          </div>
        ) : error ? (
          <div className="card" style={{
            padding: "20px 24px", color: "#fb7185",
            border: "1px solid rgba(251,113,133,0.25)", background: "rgba(251,113,133,0.06)",
          }}>{error}</div>
        ) : visibles.length === 0 ? (
          <EmptyState icon="👥">No hay personal que coincida con el filtro.</EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibles.map(p => {
              const esYo = Number(p.id) === Number(user.id);
              return (
                <div key={p.id} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{p.nombre}</span>
                        <RolBadge role={p.role} label={p.role_label} />
                        {esYo && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)",
                            border: "1px solid rgba(255,255,255,0.12)", padding: "2px 7px", borderRadius: 999 }}>
                            tú
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.6 }}>
                        <div>Cédula: {p.cedula || "—"}</div>
                        <div>
                          {p.correo_utilizable
                            ? <>✉️ {p.email}</>
                            : <span style={{ color: "#f59e0b" }}>⚠️ Sin correo real registrado</span>}
                        </div>
                        {p.telefono && <div>📞 {p.telefono}</div>}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button className="btn" style={{ padding: "5px 12px", fontSize: 12 }}
                        onClick={() => setEditando(p)}>
                        ✎ Editar
                      </button>

                      {/* Nadie puede cambiar su propio rol: esa regla la impone
                          también el API, esto solo evita ofrecer el botón. */}
                      {!esYo && roles
                        .filter(r => r.value !== p.role)
                        .map(r => (
                          <button
                            key={r.value}
                            className="btn"
                            style={{
                              padding: "5px 12px", fontSize: 12, whiteSpace: "nowrap",
                              ...(r.value === "superadmin" ? {
                                background: "rgba(245,158,11,0.12)",
                                border: "1px solid rgba(245,158,11,0.4)",
                                color: "#f59e0b",
                              } : {}),
                            }}
                            onClick={() => setCambiando({ persona: p, rolDestino: r.value })}
                          >
                            {r.value === "superadmin" ? "⬆ " : ""}{r.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ margin: "20px 0 40px", fontSize: 12, color: "var(--subtext)", lineHeight: 1.7 }}>
          Cambiar un rol pide tu contraseña y queda registrado. No puedes cambiar el
          tuyo propio, ni quitar el último Administrador del sistema.
        </p>
      </main>

      {cambiando && (
        <CambiarRolModal
          persona={cambiando.persona}
          rolDestino={cambiando.rolDestino}
          roles={roles}
          onClose={() => setCambiando(null)}
          onHecho={tras}
        />
      )}
      {editando && (
        <EditarDatosModal
          persona={editando}
          onClose={() => setEditando(null)}
          onHecho={tras}
        />
      )}
    </div>
  );
}
