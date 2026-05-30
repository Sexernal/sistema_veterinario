// app/dashboard/page.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

// ─── Constantes de rol ────────────────────────────────────────────────────────
// Para agregar un nuevo rol en el futuro, solo agrega una entrada aquí.
const ROLES = {
  admin: { label: "Administrador", color: "var(--accent-2)" },
  user: { label: "Recepcionista", color: "var(--accent)" },
};

// ─── Helpers de estado de modales ────────────────────────────────────────────
// Un solo objeto en lugar de 4 useState separados — más fácil de escalar.
const INITIAL_MODALS = { admin: false, prop: false, mascota: false, profile: false };

// ─── Componentes UI reutilizables ─────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p style={{
      margin: "0 0 12px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--subtext)",
    }}>
      {children}
    </p>
  );
}

function StatCard({ icon, value, label, loading }) {
  return (
    <div className="card" style={{ padding: "20px 24px", flex: 1, minWidth: 150 }}>
      <span style={{ fontSize: 26 }}>{icon}</span>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 10, color: "var(--text)" }}>
        {loading ? "—" : value}
      </div>
      <div className="small-muted" style={{ marginTop: 6 }}>{label}</div>
    </div>
  );
}

function NavCard({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "20px 22px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        color: "inherit",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)";
        e.currentTarget.style.background = "rgba(96,165,250,0.05)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</div>
      <div className="small-muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div>
    </button>
  );
}

// rgb: string con "r,g,b" para calcular el color de acento
function ActionCard({ icon, title, subtitle, onClick, rgb = "96,165,250" }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `rgba(${rgb},0.07)`,
        border: `1px solid rgba(${rgb},0.2)`,
        borderRadius: 12,
        padding: "20px 22px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        color: "inherit",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `rgba(${rgb},0.13)`;
        e.currentTarget.style.borderColor = `rgba(${rgb},0.35)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `rgba(${rgb},0.07)`;
        e.currentTarget.style.borderColor = `rgba(${rgb},0.2)`;
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</div>
      <div className="small-muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div>
    </button>
  );
}

// ─── Componente base para modales ─────────────────────────────────────────────
// Reutilizable: wrap cualquier contenido en este modal base.
function ModalBase({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="title">{title}</div>
            {subtitle && <div className="subtitle">{subtitle}</div>}
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: "4px 8px", fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Muestra una lista de errores del servidor de forma uniforme.
function ErrorList({ errors }) {
  if (!errors.length) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8,
      background: "rgba(251,113,133,0.08)",
      border: "1px solid rgba(251,113,133,0.2)",
      color: "#fb7185", fontSize: 13,
    }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  );
}

// ─── Modales ──────────────────────────────────────────────────────────────────

function CreateAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", password: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    if (form.password.length < 8) e.push("Contraseña mínimo 8 caracteres.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await expressApi.post("/auth/register-admin", form);
      const newUser = res.data?.data?.user || res.data?.data || res.data;
      onCreated?.(newUser);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      setErrors(
        srv?.errors?.map(x => x.msg || x.message) || [srv?.message || err.message || "Error desconocido"]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase title="Crear doctor" subtitle="Cuenta con rol de administrador (doctor/veterinario)" onClose={onClose}>
      <form onSubmit={submit} style={{ marginTop: 14 }}>
        {[
          { label: "Nombre completo", key: "nombre", type: "text" },
          { label: "Email", key: "email", type: "email" },
          { label: "Teléfono", key: "telefono", type: "text" },
          { label: "Contraseña", key: "password", type: "password" },
        ].map(({ label, key, type }) => (
          <label key={key} style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <input
              className="input"
              type={type}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <small style={{ color: "var(--subtext)" }}>Contraseña: mínimo 8 caracteres.</small>
        <ErrorList errors={errors} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? "Creando..." : "Crear doctor"}</button>
          <button className="btn-ghost" type="button" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

function CreatePropModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await expressApi.post("/propietarios", form);
      onCreated(res.data?.data || res.data);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      setErrors([srv?.message || err.message || "Error desconocido"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase title="Crear propietario" subtitle="Registra los datos del dueño de la mascota" onClose={onClose}>
      <form onSubmit={submit} style={{ marginTop: 14 }}>
        {[
          { label: "Nombre", key: "nombre", type: "text" },
          { label: "Email", key: "email", type: "email" },
          { label: "Teléfono", key: "telefono", type: "text" },
          { label: "Dirección", key: "direccion", type: "text" },
        ].map(({ label, key, type }) => (
          <label key={key} style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <input
              className="input"
              type={type}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <ErrorList errors={errors} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? "Creando..." : "Crear propietario"}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

function CreateMascotaModal({ onClose, propietarios = [], onCreated }) {
  const [form, setForm] = useState({ nombre: "", especie: "", raza: "", edad: "", historial_medico: "", owner_id: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (!form.nombre.trim()) e.push("Nombre es requerido.");
    if (!form.owner_id) e.push("Debe seleccionar un propietario.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        edad: form.edad ? Number(form.edad) : null,
        owner_id: Number(form.owner_id),
      };
      const res = await expressApi.post("/mascotas", payload);
      onCreated(res.data?.data || res.data);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      setErrors([srv?.message || err.message || "Error desconocido"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase title="Crear mascota" subtitle="Registra el nuevo paciente veterinario" onClose={onClose}>
      <form onSubmit={submit} style={{ marginTop: 14 }}>
        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Nombre</div>
          <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Especie</div>
            <input className="input" value={form.especie} onChange={e => setForm(f => ({ ...f, especie: e.target.value }))} />
          </label>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Raza</div>
            <input className="input" value={form.raza} onChange={e => setForm(f => ({ ...f, raza: e.target.value }))} />
          </label>
        </div>

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Edad (años)</div>
          <input className="input" type="number" value={form.edad} onChange={e => setForm(f => ({ ...f, edad: e.target.value }))} />
        </label>

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Propietario</div>
          <select className="input" value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}>
            <option value="">-- Seleccionar propietario --</option>
            {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.email}</option>)}
          </select>
        </label>

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Historial médico</div>
          <textarea className="input" rows={3} value={form.historial_medico} onChange={e => setForm(f => ({ ...f, historial_medico: e.target.value }))} />
        </label>

        <ErrorList errors={errors} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? "Creando..." : "Crear mascota"}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

function ProfileModal({ onClose, userCurrent, onUpdated }) {
  const [form, setForm] = useState({
    nombre: userCurrent?.nombre || "",
    email: userCurrent?.email || "",
    telefono: userCurrent?.telefono || "",
    currentPassword: "",
    newPassword: "",
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    if (form.newPassword) {
      if (!form.currentPassword) e.push("Contraseña actual requerida para cambiarla.");
      if (form.newPassword.length < 8) e.push("Nueva contraseña: mínimo 8 caracteres.");
    }
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      };
      const res = await expressApi.put("/auth/profile", payload);
      const updated = res.data?.data || res.data;
      localStorage.setItem("user", JSON.stringify(updated));
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      setErrors(
        srv?.errors?.map(x => x.msg || x.message) || [srv?.message || err.message || "Error desconocido"]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase title="Editar perfil" subtitle="Actualiza tu información personal" onClose={onClose}>
      <form onSubmit={submit} style={{ marginTop: 14 }}>
        {[
          { label: "Nombre", key: "nombre", type: "text" },
          { label: "Email", key: "email", type: "email" },
          { label: "Teléfono", key: "telefono", type: "text" },
        ].map(({ label, key, type }) => (
          <label key={key} style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <input className="input" type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </label>
        ))}

        <hr style={{ margin: "16px 0", borderColor: "rgba(255,255,255,0.05)" }} />

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Contraseña actual</div>
          <input className="input" type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
          <small style={{ color: "var(--subtext)" }}>Requerida solo si deseas cambiar la contraseña.</small>
        </label>

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Nueva contraseña</div>
          <input className="input" type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
          <small style={{ color: "var(--subtext)" }}>Dejar vacío para no cambiarla.</small>
        </label>

        <ErrorList errors={errors} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

// ─── Página principal del Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userSource, setUserSource] = useState(null);
  const [totals, setTotals] = useState({ propietarios: 0, mascotas: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [propietariosList, setPropietariosList] = useState([]);
  const [modals, setModals] = useState(INITIAL_MODALS);

  const openModal = (key) => setModals(m => ({ ...m, [key]: true }));
  const closeModal = (key) => setModals(m => ({ ...m, [key]: false }));

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    const parsed = JSON.parse(raw);
    setUser(parsed);
    setUserSource(localStorage.getItem("user_source") || parsed.source || null);

    (async () => {
      setLoadingMetrics(true);
      try {
        const [pRes, mRes] = await Promise.all([
          expressApi.get("/propietarios?page=1&limit=1"),
          expressApi.get("/mascotas?page=1&limit=1"),
        ]);
        setTotals({
          propietarios: pRes.data?.meta?.total ?? Number(pRes.headers["x-total-count"] || 0),
          mascotas: mRes.data?.meta?.total ?? Number(mRes.headers["x-total-count"] || 0),
        });
        const listRes = await expressApi.get("/propietarios?page=1&limit=50");
        setPropietariosList(listRes.data?.data || listRes.data || []);
      } catch (err) {
        console.warn("Métricas no disponibles:", err?.message);
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, [router]);

  const logout = () => {
    ["token", "user", "user_source"].forEach(k => localStorage.removeItem(k));
    router.replace("/");
  };

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const role = ROLES[user.role] ?? ROLES.user;
  const canEditProfile = userSource === "express";
  const firstName = user.nombre?.split(" ")[0] || user.email;

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Barra de navegación superior ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0b1220",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐾</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.1 }}>VetCare</div>
            <div style={{ fontSize: 11, color: "var(--subtext)" }}>Sistema veterinario</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{user.nombre || user.email}</div>
            <div style={{ fontSize: 12, color: role.color, fontWeight: 600 }}>{role.label}</div>
          </div>
          {canEditProfile && (
            <button
              className="btn-ghost"
              onClick={() => openModal("profile")}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              Mi perfil
            </button>
          )}
          <button
            className="btn btn-danger"
            onClick={logout}
            style={{ padding: "7px 14px", fontSize: 13 }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Saludo */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            Bienvenido, {firstName}
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--subtext)", fontSize: 14 }}>
            {isAdmin
              ? "Tienes acceso completo al sistema."
              : "Puedes gestionar propietarios, mascotas y citas."}
          </p>
        </div>

        {/* Estadísticas */}
        <SectionTitle>Resumen general</SectionTitle>
        <div style={{ display: "flex", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
          <StatCard icon="👤" value={totals.propietarios} label="Propietarios registrados" loading={loadingMetrics} />
          <StatCard icon="🐾" value={totals.mascotas} label="Mascotas registradas" loading={loadingMetrics} />
        </div>

        {/* Navegación */}
        <SectionTitle>Secciones</SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          <NavCard
            icon="👤"
            title="Propietarios"
            subtitle="Ver y gestionar todos los dueños de mascotas"
            onClick={() => router.push("/propietarios")}
          />
          <NavCard
            icon="🐾"
            title="Mascotas"
            subtitle="Ver y gestionar todos los pacientes"
            onClick={() => router.push("/mascotas")}
          />
          <NavCard
            icon="📅"
            title="Citas"
            subtitle="Ver y gestionar todas las citas"
            onClick={() => router.push("/citas")}
          />
        </div>

        {/* Acciones rápidas */}
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: isAdmin ? 32 : 0,
        }}>
          <ActionCard
            icon="➕"
            title="Crear propietario"
            subtitle="Registrar nuevo dueño de mascota"
            onClick={() => openModal("prop")}
          />
          <ActionCard
            icon="🐶"
            title="Crear mascota"
            subtitle="Registrar nuevo paciente"
            onClick={() => openModal("mascota")}
          />
        </div>

        {/* Zona de admin — solo visible para administradores */}
        {isAdmin && (
          <>
            <SectionTitle>Zona de administrador</SectionTitle>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}>
              <ActionCard
                icon="👨‍⚕️"
                title="Crear doctor"
                subtitle="Registrar nuevo médico veterinario"
                onClick={() => openModal("admin")}
                rgb="52,211,153"
              />
            </div>
          </>
        )}
      </main>

      {/* ── Modales ── */}
      {canEditProfile && modals.profile && (
        <ProfileModal
          userCurrent={user}
          onClose={() => closeModal("profile")}
          onUpdated={u => { setUser(u); localStorage.setItem("user", JSON.stringify(u)); }}
        />
      )}
      {isAdmin && modals.admin && (
        <CreateAdminModal
          onClose={() => closeModal("admin")}
          onCreated={n => console.log("Doctor creado:", n)}
        />
      )}
      {modals.prop && (
        <CreatePropModal
          onClose={() => closeModal("prop")}
          onCreated={p => {
            setTotals(t => ({ ...t, propietarios: t.propietarios + 1 }));
            setPropietariosList(prev => [...prev, p]);
          }}
        />
      )}
      {modals.mascota && (
        <CreateMascotaModal
          onClose={() => closeModal("mascota")}
          propietarios={propietariosList}
          onCreated={() => setTotals(t => ({ ...t, mascotas: t.mascotas + 1 }))}
        />
      )}
    </div>
  );
}