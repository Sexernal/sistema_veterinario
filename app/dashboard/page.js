// app/dashboard/page.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

// ─── Constantes de roles ──────────────────────────────────────────────────────
const ROLES = {
  admin: { label: "Administrador", color: "var(--accent-2)" },
  user:  { label: "Recepcionista", color: "var(--accent)" },
};

// ─── Constantes para citas ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pendiente:  { label: "Pendiente",  icon: "⏳", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)" },
  confirmada: { label: "Confirmada", icon: "✅", color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.35)" },
  completada: { label: "Completada", icon: "🏁", color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)" },
  cancelada:  { label: "Cancelada",  icon: "✖️", color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)" },
};

const TIPO_OPTIONS = [
  { value: "consulta general", label: "Consulta general", icon: "🩺" },
  { value: "vacunacion",       label: "Vacunación",        icon: "💉" },
  { value: "urgencia",         label: "Urgencia",          icon: "🚨" },
  { value: "cirugia",          label: "Cirugía",           icon: "🔪" },
  { value: "peluqueria",       label: "Peluquería",        icon: "✂️" },
  { value: "control",          label: "Control",           icon: "📋" },
  { value: "desparacitacion",  label: "Desparasitación",   icon: "🧴" },
];

const DURATION_MAP = {
  "consulta general": 30, "vacunacion": 20, "urgencia": 60,
  "cirugia": 120, "peluqueria": 45, "control": 20, "desparacitacion": 15,
};
const getDurationForTipo = (t) => DURATION_MAP[(t || "").toLowerCase()] || 30;

// ─── Estado inicial de modales ────────────────────────────────────────────────
const INITIAL_MODALS = { prop: false, mascota: false, cita: false };

// ─── Fecha de hoy en formato YYYY-MM-DD (hora local del navegador) ────────────
function getToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Componentes visuales base ────────────────────────────────────────────────

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

function StatCard({ icon, value, label, loading, valueColor }) {
  return (
    <div className="card" style={{ padding: "20px 24px", flex: 1, minWidth: 150 }}>
      <span style={{ fontSize: 26 }}>{icon}</span>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 10, color: valueColor || "var(--text)" }}>
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
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12, padding: "20px 22px", cursor: "pointer",
        textAlign: "left", width: "100%", color: "inherit",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)"; e.currentTarget.style.background = "rgba(96,165,250,0.05)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</div>
      <div className="small-muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div>
    </button>
  );
}

function ActionCard({ icon, title, subtitle, onClick, rgb = "96,165,250" }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `rgba(${rgb},0.07)`, border: `1px solid rgba(${rgb},0.2)`,
        borderRadius: 12, padding: "20px 22px", cursor: "pointer",
        textAlign: "left", width: "100%", color: "inherit",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `rgba(${rgb},0.13)`; e.currentTarget.style.borderColor = `rgba(${rgb},0.35)`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `rgba(${rgb},0.07)`; e.currentTarget.style.borderColor = `rgba(${rgb},0.2)`; }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</div>
      <div className="small-muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div>
    </button>
  );
}

// ModalBase con scroll — compatible con CreateCitaModal y OwnerModal
function ModalBase({ title, subtitle, onClose, children, maxWidth = 560 }) {
  return (
    <div className="modal-overlay">
      <div className="modal card" style={{
        maxWidth, width: "92vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <div>
            <div className="title" style={{ fontSize: 18 }}>{title}</div>
            {subtitle && <div className="subtitle" style={{ fontSize: 13 }}>{subtitle}</div>}
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function ErrorList({ errors }) {
  if (!errors.length) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8,
      background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)",
      color: "#fb7185", fontSize: 13,
    }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  );
}

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[(estado || "").toLowerCase()] || STATUS_CONFIG.pendiente;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span>{cfg.icon}</span><span>{cfg.label}</span>
    </span>
  );
}

// ─── Modal: Crear / Editar Propietario (con cédula) ──────────────────────────

function OwnerModal({ onClose, onSaved, initial = null }) {
  const isEditing = !!initial?.id;
  const [form, setForm] = useState({
    nombre:    initial?.nombre    || "",
    email:     initial?.email     || "",
    telefono:  initial?.telefono  || "",
    direccion: initial?.direccion || "",
  });
  const [cedula, setCedula]                   = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const onCedulaChange = (v) => setCedula(v.replace(/\D/g, "").slice(0, 9));
  const onTelefonoChange = (v) =>
    setForm(f => ({ ...f, telefono: v.replace(/[^0-9+\-\s().]/g, "") }));

  const validate = () => {
    const e = [];
    if (form.nombre.trim().length < 2)
      e.push("Nombre mínimo 2 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.push("Email inválido.");
    const tel = form.telefono.trim();
    if (!tel) {
      e.push("Teléfono requerido.");
    } else {
      if (/[^0-9+\-\s().]/.test(tel)) e.push("Teléfono: solo dígitos y + - ( ) . espacios.");
      if ((tel.match(/\d/g) || []).length < 7) e.push("Teléfono: mínimo 7 dígitos.");
    }
    if (form.direccion.trim().length < 5)
      e.push("Dirección requerida (mínimo 5 caracteres).");
    if (!isEditing && cedula && cedula.length !== 9)
      e.push("Cédula debe tener exactamente 9 dígitos.");
    if (password) {
      if (password.length < 8)         e.push("Contraseña: mínimo 8 caracteres.");
      if (password !== confirmPassword) e.push("Las contraseñas no coinciden.");
    }
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (!isEditing) {
        if (cedula)   payload.cedula   = cedula;
        if (password) payload.password = password;
      } else {
        if (password) payload.password = password;
      }
      const res = isEditing
        ? await expressApi.put(`/propietarios/${initial.id}`, payload)
        : await expressApi.post("/propietarios", payload);
      onSaved(res.data?.data || res.data);
      onClose();
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error desconocido"]);
    } finally { setLoading(false); }
  };

  return (
    <ModalBase
      title={isEditing ? "Editar propietario" : "Nuevo propietario"}
      subtitle="Registra los datos del dueño de la mascota"
      onClose={onClose}
      maxWidth={560}
    >
      <form onSubmit={submit}>
        {/* CEDULA: badge readonly en editar */}
        {isEditing && initial?.cedula && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Cédula</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px", borderRadius: 8,
              background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
              fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: "0.1em",
            }}>
              🪪 {initial.cedula}
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--subtext)" }}>
              La cédula no se puede modificar.
            </div>
          </div>
        )}

        {/* CEDULA: campo editable en crear (opcional) */}
        {!isEditing && (
          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Cédula (opcional)</div>
            <input
              className="input"
              inputMode="numeric"
              maxLength={9}
              value={cedula}
              onChange={e => onCedulaChange(e.target.value)}
              placeholder="000000000"
            />
            <small style={{ color: "var(--subtext)" }}>
              9 dígitos. Requerida para inicio de sesión en la app móvil.
            </small>
          </label>
        )}

        {[
          { label: "Nombre",    key: "nombre",    type: "text"  },
          { label: "Email",     key: "email",     type: "email" },
          { label: "Dirección", key: "direccion", type: "text"  },
        ].map(({ label, key, type }) => (
          <label key={key} style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <input className="input" type={type} value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
          </label>
        ))}

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Teléfono</div>
          <input className="input" inputMode="tel" value={form.telefono}
            onChange={e => onTelefonoChange(e.target.value)}
            placeholder="+506 8888-9999" required />
          <small style={{ color: "var(--subtext)" }}>Mínimo 7 dígitos. Permite + - ( ) . y espacios.</small>
        </label>

        <hr style={{ margin: "14px 0", borderColor: "rgba(255,255,255,0.05)" }} />
        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {isEditing ? "Nueva contraseña (opcional)" : "Contraseña (opcional)"}
          </div>
          <input className="input" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={
              isEditing
                ? "Dejar vacío para no cambiar"
                : "Dejar vacío si no necesita acceso a la app móvil"
            }
          />
          <small style={{ color: "var(--subtext)" }}>
            {isEditing
              ? "Solo si deseas cambiar la contraseña del propietario."
              : "Solo si el propietario va a iniciar sesión en la app móvil."}
          </small>
        </label>
        {password && (
          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Confirmar contraseña</div>
            <input className="input" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repetir contraseña" />
          </label>
        )}

        <ErrorList errors={errors} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Guardando..." : (isEditing ? "Guardar cambios" : "Crear propietario")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

// ─── Modal: Crear Mascota ─────────────────────────────────────────────────────

function CreateMascotaModal({ onClose, propietarios = [], onCreated }) {
  const [form, setForm] = useState({ nombre: "", especie: "", raza: "", edad: "", historial_medico: "", owner_id: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (!form.nombre.trim()) e.push("Nombre es requerido.");
    if (!form.owner_id)      e.push("Debe seleccionar un propietario.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, edad: form.edad ? Number(form.edad) : null, owner_id: Number(form.owner_id) };
      const res = await expressApi.post("/mascotas", payload);
      onCreated(res.data?.data || res.data);
      onClose();
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error desconocido"]);
    } finally { setLoading(false); }
  };

  return (
    <ModalBase title="Crear mascota" subtitle="Registra el nuevo paciente veterinario" onClose={onClose} maxWidth={560}>
      <form onSubmit={submit}>
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
          <div style={{ fontSize: 13, fontWeight: 600 }}>Observaciones</div>
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

// ─── Modal: Crear Cita (copiado completo de citas/page.js) ───────────────────

function CreateCitaModal({ propietarios = [], onClose, onCreated }) {
  const [propietarioId, setPropietarioId] = useState(propietarios[0]?.id || "");
  const [mascotas, setMascotas] = useState([]);
  const [mascotaId, setMascotaId] = useState("");
  const [veterinarios, setVeterinarios] = useState([]);
  const [veterinarioId, setVeterinarioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [duracion, setDuracion] = useState(30);
  const [tipo, setTipo] = useState("consulta general");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [slotsByVet, setSlotsByVet] = useState({});
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);

  const todayDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (propietarios.length && !propietarioId) setPropietarioId(propietarios[0].id);
  }, [propietarios]);

  useEffect(() => {
    const run = async () => {
      try {
        const [mRes, uRes] = await Promise.all([
          expressApi.get("/mascotas?page=1&limit=500"),
          expressApi.get("/users?page=1&limit=500"),
        ]);
        const allPets = mRes.data?.data || [];
        setMascotas(allPets.filter(p =>
          String(p.owner_id) === String(propietarioId) ||
          String(p.propietario_id) === String(propietarioId)
        ));
        const users = uRes.data?.data || [];
        setVeterinarios(users.filter(u => (u.role || "").toLowerCase() === "admin"));
      } catch (err) {
        console.warn("Error cargando mascotas/veterinarios", err);
      }
    };
    run();
    setMascotaId("");
    setVeterinarioId("");
  }, [propietarioId]);

  const parseTimeToMinutes = (hhmm) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    return hh * 60 + mm;
  };
  const minutesToTimeStr = (m) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  const overlaps = (aS, aE, bS, bE) => (aS < bE && bS < aE);

  const generateSlotsLocal = (dateStr, tipoStr, vetList, existingCitas) => {
    if (!dateStr || !tipoStr) return { slotsByVet: {}, durationMin: 0 };
    const durationMin = getDurationForTipo(tipoStr);
    const getWindowsForTipo = (t) => {
      const low = (t || "").toLowerCase();
      switch (low) {
        case "vacunacion": return [{ from: "08:00", to: "12:30" }, { from: "14:00", to: "17:00" }];
        case "cirugia":    return [{ from: "08:00", to: "12:00" }];
        case "peluqueria": return [{ from: "09:00", to: "16:00" }];
        case "urgencia":   return [{ from: "07:00", to: "17:00" }];
        default: return [{ from: "07:00", to: "17:00" }];
      }
    };
    const CLINIC_OPEN = "07:00", CLINIC_CLOSE = "17:00", step = 15;
    const citasByVet = {};
    for (const c of existingCitas) {
      
      const vid = c.veterinario_id ? String(c.veterinario_id) : "null";
      if (!citasByVet[vid]) citasByVet[vid] = [];
      const start = new Date(c.fecha_inicio || c.fecha || "");
      const end   = new Date(start.getTime() + Number(c.duracion_min || c.duracion || 0) * 60000);
      citasByVet[vid].push({ start, end });
    }
    const slotsByVet = {};
    const windows = getWindowsForTipo(tipoStr);
    for (const vet of vetList) {
      const vid = String(vet.id);
      slotsByVet[vid] = [];
      for (const w of windows) {
        const fromMin   = Math.max(parseTimeToMinutes(CLINIC_OPEN), parseTimeToMinutes(w.from));
        const toMin     = Math.min(parseTimeToMinutes(CLINIC_CLOSE), parseTimeToMinutes(w.to));
        const lastStart = toMin - durationMin;
        for (let t = fromMin; t <= lastStart; t += step) {
          const timeStr = minutesToTimeStr(t);
          const start   = new Date(`${dateStr}T${timeStr}:00`);
          if (isNaN(start.getTime())) continue;
          const end = new Date(start.getTime() + durationMin * 60000);
          const vetCitas = citasByVet[vid] || [];
          let conflict = false;
          for (const c of vetCitas) {
            if (overlaps(start.getTime(), end.getTime(), c.start.getTime(), c.end.getTime())) {
              conflict = true; break;
            }
          }
          if (!conflict) slotsByVet[vid].push({ start, timeStr, startIsoLocal: `${dateStr}T${timeStr}` });
        }
      }
      slotsByVet[vid].sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    return { slotsByVet, durationMin };
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setSlotsByVet({});
      if (!fecha) return;
      const dObj = new Date(`${fecha}T00:00:00`);
      if (isNaN(dObj.getTime())) return;
      if (dObj.getDay() === 0) {
        setErrors(["La clínica está cerrada los domingos."]);
        setFecha(""); return;
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (dObj < todayStart) {
        setErrors(["No se pueden agendar citas en días pasados."]);
        setFecha(""); return;
      }
      setErrors([]);
      setIsGeneratingSlots(true);
      try {
        const q = `/citas/slots?date=${encodeURIComponent(fecha)}&tipo=${encodeURIComponent(tipo)}${veterinarioId ? `&veterinario_id=${encodeURIComponent(veterinarioId)}` : ""}`;
        let usedSlotsByVet = {};
        try {
          const res = await expressApi.get(q);
          if (res.data?.success && res.data?.data?.slotsByVet) {
            usedSlotsByVet = res.data.data.slotsByVet;
          } else {
            const cRes = await expressApi.get(`/citas?page=1&limit=1000`);
            const all  = cRes.data?.data || [];
            const vetList = veterinarioId ? veterinarios.filter(v => String(v.id) === String(veterinarioId)) : veterinarios;
            usedSlotsByVet = generateSlotsLocal(fecha, tipo, vetList, all).slotsByVet;
          }
        } catch {
          const cRes = await expressApi.get(`/citas?page=1&limit=1000`);
          const all  = cRes.data?.data || [];
          const vetList = veterinarioId ? veterinarios.filter(v => String(v.id) === String(veterinarioId)) : veterinarios;
          usedSlotsByVet = generateSlotsLocal(fecha, tipo, vetList, all).slotsByVet;
        }
        if (mounted) setSlotsByVet(usedSlotsByVet);
      } catch (err) {
        console.error("Error generando slots", err);
        if (mounted) setSlotsByVet({});
      } finally {
        if (mounted) setIsGeneratingSlots(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [fecha, tipo, veterinarioId, veterinarios]);

  useEffect(() => {
    setDuracion(getDurationForTipo(tipo));
    setFechaHora("");
  }, [tipo]);

  const toSQLDatetime = (dtLocal) => {
    if (!dtLocal) return null;
    const d = new Date(dtLocal);
    if (isNaN(d.getTime())) return null;
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const validate = () => {
    const e = [];
    if (!propietarioId) e.push("Propietario requerido.");
    if (!mascotaId)     e.push("Mascota requerida.");
    if (!fechaHora)     e.push("Debe seleccionar una franja horaria disponible.");
    if (!duracion || Number(duracion) <= 0) e.push("Duración inválida.");
    if (fechaHora) {
      const dt = new Date(fechaHora);
      if (isNaN(dt.getTime())) e.push("Fecha/hora inválida.");
      else if (dt.getTime() < Date.now()) e.push("No se pueden agendar citas en el pasado.");
    }
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        mascota_id:     Number(mascotaId),
        propietario_id: Number(propietarioId),
        veterinario_id: veterinarioId ? Number(veterinarioId) : null,
        tipo_consulta:  tipo,
        motivo:         motivo || null,
        fecha_inicio:   toSQLDatetime(fechaHora),
        duracion_min:   Number(duracion),
      };
      const res = await expressApi.post("/citas", payload);
      onCreated && onCreated(res.data?.data || res.data);
      onClose();
    } catch (err) {
      if (err?.response?.status === 409) {
        setErrors([err.response.data?.message || "Conflicto: cita solapada."]);
      } else {
        setErrors([err?.response?.data?.message || err.message || "Error creando cita"]);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSlotsForVet = (vet) => {
    if (!vet) return null;
    const list = slotsByVet[String(vet.id)] || [];
    if (!list.length) return (
      <div className="small-muted" style={{ fontStyle: "italic" }}>Sin horarios disponibles</div>
    );
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {list.map(s => {
          const selected = fechaHora === s.startIsoLocal;
          return (
            <button
              key={s.startIsoLocal}
              type="button"
              onClick={() => {
                setFechaHora(s.startIsoLocal);
                setVeterinarioId(String(vet.id));
                setDuracion(getDurationForTipo(tipo));
              }}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                minWidth: 64, textAlign: "center", cursor: "pointer",
                border: selected ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                background: selected ? "var(--accent)" : "rgba(255,255,255,0.04)",
                color: selected ? "#fff" : "var(--text)",
                transition: "all 0.15s",
              }}
            >
              {s.timeStr}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <ModalBase title="📅 Nueva cita" subtitle="Selecciona fecha y elige una franja disponible" onClose={onClose} maxWidth={860}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>PROPIETARIO</div>
            <select className="input" value={propietarioId} onChange={e => setPropietarioId(e.target.value)}>
              <option value="">Selecciona propietario</option>
              {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.email}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>MASCOTA</div>
            <select className="input" value={mascotaId} onChange={e => setMascotaId(e.target.value)}>
              <option value="">Selecciona mascota</option>
              {mascotas.map(m => <option key={m.id} value={m.id}>{m.nombre} — {m.especie || m.raza || ""}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>VETERINARIO (opcional)</div>
            <select className="input" value={veterinarioId} onChange={e => setVeterinarioId(e.target.value)}>
              <option value="">-- Cualquiera --</option>
              {veterinarios.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>TIPO DE CONSULTA</div>
            <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>FECHA (no domingos)</div>
            <input className="input" type="date" value={fecha} min={todayDate} onChange={e => setFecha(e.target.value)} />
          </label>
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>DURACIÓN (min)</div>
            <input className="input" type="number" min={5} value={duracion} disabled />
            <small style={{ color: "var(--subtext)" }}>Se fija automáticamente por tipo</small>
          </label>
        </div>

        <div style={{
          marginTop: 16, padding: 14, borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            🕐 Horarios disponibles
            {fechaHora && <StatusBadge estado="confirmada" />}
          </div>
          {!fecha ? (
            <div className="small-muted" style={{ fontStyle: "italic" }}>Selecciona una fecha para ver horarios.</div>
          ) : isGeneratingSlots ? (
            <div className="small-muted">Generando horarios...</div>
          ) : (
            <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 6 }}>
              {veterinarioId ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    👨‍⚕️ {veterinarios.find(v => String(v.id) === String(veterinarioId))?.nombre || "Veterinario"}
                  </div>
                  {renderSlotsForVet(veterinarios.find(v => String(v.id) === String(veterinarioId)) || null)}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {veterinarios.length === 0 && <div className="small-muted">No hay veterinarios disponibles</div>}
                  {veterinarios.map(v => (
                    <div key={v.id} style={{
                      padding: 10, borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.02)",
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        👨‍⚕️ {v.nombre} <small style={{ color: "var(--subtext)", fontWeight: 400 }}>{v.email}</small>
                      </div>
                      {renderSlotsForVet(v)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <small style={{ color: "var(--subtext)" }}>
              Lun a sáb. Al picar una franja sin veterinario seleccionado se asigna automáticamente.
            </small>
          </div>
        </div>

        <label style={{ display: "block", marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--subtext)" }}>MOTIVO (opcional)</div>
          <textarea className="input" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} />
        </label>

        <ErrorList errors={errors} />
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={loading}>{loading ? "Guardando..." : "Crear cita"}</button>
        </div>
      </form>
    </ModalBase>
  );
}

// ─── Página principal del Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [totals, setTotals]     = useState({ propietarios: 0, mascotas: 0, citasHoy: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [propietariosList, setPropietariosList] = useState([]);
  const [modals, setModals]     = useState(INITIAL_MODALS);

  const openModal  = (key) => setModals(m => ({ ...m, [key]: true }));
  const closeModal = (key) => setModals(m => ({ ...m, [key]: false }));

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    setUser(JSON.parse(raw));

    (async () => {
      setLoadingMetrics(true);
      const today = getToday();
      try {
        const [pRes, mRes, citasRes] = await Promise.all([
          expressApi.get("/propietarios?page=1&limit=1"),
          expressApi.get("/mascotas?page=1&limit=1"),
          expressApi.get(`/citas?fecha_inicio=${today}&fecha_fin=${today}&limit=200`).catch(() =>
            expressApi.get(`/citas?fecha=${today}&limit=200`).catch(() =>
              expressApi.get("/citas?limit=200")
            )
          ),
        ]);

        const citasData = citasRes.data?.data || citasRes.data || [];
        const citasArr  = Array.isArray(citasData) ? citasData : [];
        const citasHoy  = citasArr.filter(c => {
          const fechaCita = (c.fecha_cita || c.fecha_inicio || c.fecha || "").substring(0, 10);
          const activa    = !["completada", "cancelada"].includes(c.estado);
          return fechaCita === today && activa;
        }).length;

        setTotals({
          propietarios: pRes.data?.meta?.total ?? Number(pRes.headers?.["x-total-count"] || 0),
          mascotas:     mRes.data?.meta?.total ?? Number(mRes.headers?.["x-total-count"] || 0),
          citasHoy,
        });

        // Carga todos los propietarios para los modales de crear cita / mascota
        const listRes = await expressApi.get("/propietarios?page=1&limit=500");
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

  // Cuando se crea una cita desde el dashboard, actualiza el contador si es de hoy
  const handleCitaCreated = (c) => {
    const today = getToday();
    const fechaCita = (c.fecha_inicio || c.fecha || "").substring(0, 10);
    const activa    = !["completada", "cancelada"].includes(c.estado);
    if (fechaCita === today && activa) {
      setTotals(t => ({ ...t, citasHoy: t.citasHoy + 1 }));
    }
  };

  if (!user) return null;

  const role      = ROLES[user.role] ?? ROLES.user;
  const firstName = user.nombre?.split(" ")[0] || user.cedula || user.email;
  const citasColor = totals.citasHoy > 0 ? "#34d399" : "var(--subtext)";

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
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              {user.nombre || user.cedula || user.email}
            </div>
            <div style={{ fontSize: 12, color: role.color, fontWeight: 600 }}>{role.label}</div>
          </div>
          <button
            className="btn-ghost"
            onClick={() => router.push("/profile")}
            style={{ padding: "6px 12px", fontSize: 13 }}
          >
            Mi perfil
          </button>
          <button className="btn btn-danger" onClick={logout} style={{ padding: "7px 14px", fontSize: 13 }}>
            Salir
          </button>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Bienvenido, {firstName}</h1>
          <p style={{ margin: "6px 0 0", color: "var(--subtext)", fontSize: 14 }}>
            {user.role === "admin"
              ? "Tienes acceso completo al sistema."
              : "Puedes gestionar propietarios, mascotas y citas."}
          </p>
        </div>

        {/* Estadísticas */}
        <SectionTitle>Resumen general</SectionTitle>
        <div style={{ display: "flex", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
          <StatCard icon="👤" value={totals.propietarios} label="Propietarios registrados" loading={loadingMetrics} />
          <StatCard icon="🐾" value={totals.mascotas}     label="Mascotas registradas"     loading={loadingMetrics} />
          <StatCard
            icon="📅"
            value={totals.citasHoy}
            label="Citas pendientes hoy"
            loading={loadingMetrics}
            valueColor={citasColor}
          />
        </div>

        {/* Navegación */}
        <SectionTitle>Secciones</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
          <NavCard icon="👤" title="Propietarios" subtitle="Ver y gestionar todos los dueños de mascotas" onClick={() => router.push("/propietarios")} />
          <NavCard icon="🐾" title="Mascotas"     subtitle="Ver y gestionar todos los pacientes"           onClick={() => router.push("/mascotas")} />
          <NavCard icon="📅" title="Citas"        subtitle="Ver y gestionar todas las citas"               onClick={() => router.push("/citas")} />
        </div>

        {/* Acciones rápidas */}
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
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
            rgb="52,211,153"
          />
          <ActionCard
            icon="📅"
            title="Crear cita"
            subtitle="Agendar nueva consulta"
            onClick={() => openModal("cita")}
            rgb="167,139,250"
          />
        </div>
      </main>

      {/* ── Modales ── */}
      {modals.prop && (
        <OwnerModal
          initial={null}
          onClose={() => closeModal("prop")}
          onSaved={p => {
            setTotals(t => ({ ...t, propietarios: t.propietarios + 1 }));
            setPropietariosList(prev => [p, ...prev]);
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
      {modals.cita && (
        <CreateCitaModal
          propietarios={propietariosList}
          onClose={() => closeModal("cita")}
          onCreated={handleCitaCreated}
        />
      )}
    </div>
  );
}