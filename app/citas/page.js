// app/citas/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/* ============================================================
   CONSTANTES VISUALES
   ============================================================ */
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
  "consulta general": 30,
  "vacunacion": 20,
  "urgencia": 60,
  "cirugia": 120,
  "peluqueria": 45,
  "control": 20,
  "desparacitacion": 15,
};
const getDurationForTipo = (t) => DURATION_MAP[(t || "").toLowerCase()] || 30;

/* ============================================================
   COMPONENTES VISUALES COMPARTIDOS
   ============================================================ */
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

function ErrorList({ errors }) {
  if (!errors?.length) return null;
  return (
    <div style={{
      marginTop: 10, padding: 10, borderRadius: 8,
      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
      color: "#fca5a5",
    }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

function ModalBase({ title, subtitle, onClose, children, maxWidth = 720 }) {
  return (
    <div className="modal-overlay">
      <div className="modal card" style={{
        maxWidth, width: "92vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)",
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

function StatCard({ icon, label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        textAlign: "left", cursor: "pointer", padding: 16,
        background: active ? `${color}22` : undefined,
        border: active ? `2px solid ${color}` : "2px solid transparent",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ color: "var(--subtext)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </button>
  );
}

/* ============================================================
   CreateCitaModal (FUNCIONALIDAD INTACTA, SOLO VISUAL NUEVO)
   ============================================================ */
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
        case "control":
        case "desparacitacion": return [{ from: "07:00", to: "17:00" }];
        default: return [{ from: "07:00", to: "17:00" }];
      }
    };
    const CLINIC_OPEN = "07:00", CLINIC_CLOSE = "17:00", step = 15;
    const citasByVet = {};
    for (const c of existingCitas) {
      const vid = c.veterinario_id ? String(c.veterinario_id) : "null";
      if (!citasByVet[vid]) citasByVet[vid] = [];
      const start = new Date(c.fecha_inicio || c.fecha || "");
      const end = new Date(start.getTime() + Number(c.duracion_min || c.duracion || 0) * 60000);
      citasByVet[vid].push({ start, end });
    }
    const slotsByVet = {};
    const windows = getWindowsForTipo(tipoStr);
    for (const vet of vetList) {
      const vid = String(vet.id);
      slotsByVet[vid] = [];
      for (const w of windows) {
        const fromMin = Math.max(parseTimeToMinutes(CLINIC_OPEN), parseTimeToMinutes(w.from));
        const toMin = Math.min(parseTimeToMinutes(CLINIC_CLOSE), parseTimeToMinutes(w.to));
        const lastStart = toMin - durationMin;
        for (let t = fromMin; t <= lastStart; t += step) {
          const timeStr = minutesToTimeStr(t);
          const start = new Date(`${dateStr}T${timeStr}:00`);
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
        setErrors(["La clínica está cerrada los domingos. Si es una urgencia, llame por teléfono."]);
        setFecha("");
        return;
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (dObj < todayStart) {
        setErrors(["No se pueden agendar citas en días pasados."]);
        setFecha("");
        return;
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
            const all = cRes.data?.data || [];
            const vetList = veterinarioId ? veterinarios.filter(v => String(v.id) === String(veterinarioId)) : veterinarios;
            usedSlotsByVet = generateSlotsLocal(fecha, tipo, vetList, all).slotsByVet;
          }
        } catch {
          const cRes = await expressApi.get(`/citas?page=1&limit=1000`);
          const all = cRes.data?.data || [];
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
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const validate = () => {
    const e = [];
    if (!propietarioId) e.push("Propietario requerido.");
    if (!mascotaId) e.push("Mascota requerida.");
    if (!fechaHora) e.push("Debe seleccionar una franja horaria disponible.");
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
        mascota_id: Number(mascotaId),
        propietario_id: Number(propietarioId),
        veterinario_id: veterinarioId ? Number(veterinarioId) : null,
        tipo_consulta: tipo,
        motivo: motivo || null,
        fecha_inicio: toSQLDatetime(fechaHora),
        duracion_min: Number(duracion),
      };
      const res = await expressApi.post("/citas", payload);
      const created = res.data?.data || res.data;
      onCreated && onCreated(created);
      onClose();
    } catch (err) {
      if (err?.response?.status === 409) {
        setErrors([err.response.data?.message || "Conflicto: cita solapada con otra del mismo veterinario."]);
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
    if (!list.length) return <div className="small-muted" style={{ fontStyle: "italic" }}>Sin horarios disponibles para este veterinario / tipo</div>;
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
              {veterinarios.map(v => <option key={v.id} value={v.id}>{v.nombre} — {v.email}</option>)}
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
            <div className="small-muted" style={{ fontStyle: "italic" }}>Selecciona una fecha para ver horarios disponibles.</div>
          ) : isGeneratingSlots ? (
            <div className="small-muted">Generando horarios...</div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 6 }}>
              {veterinarioId ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    👨‍⚕️ {(veterinarios.find(v => String(v.id) === String(veterinarioId))?.nombre) || "Veterinario"}
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
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>👨‍⚕️ {v.nombre} <small style={{ color: "var(--subtext)", fontWeight: 400 }}>{v.email}</small></div>
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
              Lun a sáb. Si eliges "Cualquiera", al picar una franja se asigna automáticamente al veterinario de esa columna (no permite doble reserva en un mismo doctor).
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

/* ============================================================
   CitaDetailModal (FUNCIONALIDAD INTACTA, VISUAL NUEVO)
   ============================================================ */
function CitaDetailModal({ cita, onClose, onUpdated }) {
  if (!cita) return null;
  const fechaStr = cita.fecha_inicio ? new Date(cita.fecha_inicio).toLocaleString() : "-";
  const lowerEstado = (cita.estado || "").toLowerCase();
  const isTerminal = lowerEstado === "completada" || lowerEstado === "cancelada";
  const tipoCfg = TIPO_OPTIONS.find(t => t.value === (cita.tipo_consulta || "").toLowerCase());

  const changeStatus = async (estado, confirmMsg) => {
    if (isTerminal) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
      await expressApi.patch(`/citas/${cita.id}/status`, { estado });
      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Error");
    }
  };

  return (
    <ModalBase
      title={`${tipoCfg?.icon || "📅"} ${cita.tipo_consulta || "Cita"}`}
      subtitle={cita.mascota_nombre || ""}
      onClose={onClose}
      maxWidth={680}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <StatusBadge estado={cita.estado} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>FECHA</div>
          <div>{fechaStr}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>DURACIÓN</div>
          <div>{cita.duracion_min} min</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>VETERINARIO</div>
          <div>{cita.veterinario_nombre || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>PROPIETARIO</div>
          <div>{cita.propietario_nombre || "—"}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>MOTIVO</div>
        <div style={{
          whiteSpace: "pre-wrap", padding: 10, borderRadius: 8,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          minHeight: 40, color: "var(--text)",
        }}>{cita.motivo || "—"}</div>
      </div>

      {!isTerminal && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {lowerEstado !== "confirmada" && (
            <button className="btn" onClick={() => changeStatus("confirmada")}>✅ Confirmar</button>
          )}
          <button className="btn btn-success" onClick={() => changeStatus("completada", "¿Marcar esta cita como completada? Esta acción es final.")}>
            🏁 Completada
          </button>
          <button className="btn btn-danger" onClick={() => changeStatus("cancelada", '¿Cancelar esta cita? Pasará al estado "cancelada".')}>
            ✖️ Cancelar cita
          </button>
        </div>
      )}
      {isTerminal && (
        <div style={{ marginTop: 18, padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", textAlign: "center", color: "var(--subtext)" }}>
          Esta cita ya está en un estado final y no admite cambios.
        </div>
      )}
    </ModalBase>
  );
}

/* ============================================================
   CitaCard — tarjeta con banda superior por estado
   ============================================================ */
function CitaCard({ cita, onOpen }) {
  const cfg = STATUS_CONFIG[(cita.estado || "").toLowerCase()] || STATUS_CONFIG.pendiente;
  const tipoCfg = TIPO_OPTIONS.find(t => t.value === (cita.tipo_consulta || "").toLowerCase());
  const fechaObj = cita.fecha_inicio ? new Date(cita.fecha_inicio) : null;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderTop: `3px solid ${cfg.color}` }}>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{tipoCfg?.icon || "📅"}</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{cita.mascota_nombre || "—"}</span>
            </div>
            <div style={{ color: "var(--subtext)", fontSize: 13, textTransform: "capitalize" }}>
              {cita.tipo_consulta || "—"} • {cita.duracion_min} min
            </div>
          </div>
          <StatusBadge estado={cita.estado} />
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 13,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>📅 FECHA</div>
            <div>{fechaObj ? fechaObj.toLocaleString() : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>👨‍⚕️ VETERINARIO</div>
            <div>{cita.veterinario_nombre || "—"}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5 }}>👤 PROPIETARIO</div>
            <div>{cita.propietario_nombre || "—"}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn" onClick={onOpen}>Ver / Acciones</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PÁGINA PRINCIPAL
   ============================================================ */
export default function CitasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [citas, setCitas] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [veterinarios, setVeterinarios] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const [filterProp, setFilterProp] = useState("");
  const [filterVet, setFilterVet] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);

  // Acceso: admin (doctores) y user (recepcionistas)
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try {
      const u = JSON.parse(raw);
      if (u.role !== "admin" && u.role !== "user") {
        alert("Acceso denegado.");
        router.replace("/dashboard");
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, uRes] = await Promise.all([
        expressApi.get(`/citas?page=${page}&limit=${limit}`),
        expressApi.get(`/propietarios?page=1&limit=500`),
        expressApi.get(`/users?page=1&limit=500`),
      ]);
      setCitas(cRes.data?.data || []);
      setTotal(cRes.data?.meta?.total || Number(cRes.headers["x-total-count"] || 0));
      setPropietarios(pRes.data?.data || []);
      setVeterinarios((uRes.data?.data || []).filter(u => (u.role || "").toLowerCase() === "admin"));
    } catch (err) {
      console.error("Error fetching citas", err);
      alert("Error cargando citas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [page]);

  const counts = useMemo(() => {
    const c = { total: citas.length, pendiente: 0, confirmada: 0, completada: 0, cancelada: 0 };
    for (const ci of citas) {
      const e = (ci.estado || "").toLowerCase();
      if (c[e] !== undefined) c[e]++;
    }
    return c;
  }, [citas]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return citas.filter(c => {
      if (filterProp && String(c.propietario_id) !== String(filterProp)) return false;
      if (filterVet && String(c.veterinario_id || "") !== String(filterVet)) return false;
      if (filterEstado && (c.estado || "").toLowerCase() !== filterEstado) return false;
      if (filterDate) {
        const d = new Date(c.fecha_inicio || c.fecha || "");
        if (isNaN(d.getTime())) return false;
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (iso !== filterDate) return false;
      }
      if (term) {
        const blob = `${c.mascota_nombre || ""} ${c.propietario_nombre || ""} ${c.veterinario_nombre || ""} ${c.tipo_consulta || ""} ${c.motivo || ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [citas, filterProp, filterVet, filterEstado, filterDate, search]);

  const onCreated = (c) => {
    setCitas(prev => [c, ...prev]);
    setTotal(t => t + 1);
  };

  const clearFilters = () => {
    setFilterProp(""); setFilterVet(""); setFilterEstado(""); setFilterDate(""); setSearch("");
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* HEADER */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div>
          <h1 className="title" style={{ margin: 0, fontSize: 26 }}>📅 Gestión de Citas</h1>
          <div className="subtitle" style={{ fontSize: 14 }}>Agenda, confirma y da seguimiento a las consultas</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowCreate(true)}>+ Nueva cita</button>
          <button className="btn-ghost" onClick={() => router.push("/dashboard")}>← Dashboard</button>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="metrics" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12, marginBottom: 20,
      }}>
        <StatCard icon="⏳" label="Pendientes"  value={counts.pendiente}  color={STATUS_CONFIG.pendiente.color}  active={filterEstado === "pendiente"}  onClick={() => setFilterEstado(filterEstado === "pendiente" ? "" : "pendiente")} />
        <StatCard icon="✅" label="Confirmadas" value={counts.confirmada} color={STATUS_CONFIG.confirmada.color} active={filterEstado === "confirmada"} onClick={() => setFilterEstado(filterEstado === "confirmada" ? "" : "confirmada")} />
        <StatCard icon="🏁" label="Completadas" value={counts.completada} color={STATUS_CONFIG.completada.color} active={filterEstado === "completada"} onClick={() => setFilterEstado(filterEstado === "completada" ? "" : "completada")} />
        <StatCard icon="✖️" label="Canceladas"  value={counts.cancelada}  color={STATUS_CONFIG.cancelada.color}  active={filterEstado === "cancelada"}  onClick={() => setFilterEstado(filterEstado === "cancelada" ? "" : "cancelada")} />
      </div>

      {/* FILTROS */}
      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>🔍 BUSCAR</div>
            <input className="input" placeholder="Mascota, propietario, vet, motivo..." value={search} onChange={e => setSearch(e.target.value)} />
          </label>
          <label>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>PROPIETARIO</div>
            <select className="input" value={filterProp} onChange={e => setFilterProp(e.target.value)}>
              <option value="">Todos</option>
              {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>VETERINARIO</div>
            <select className="input" value={filterVet} onChange={e => setFilterVet(e.target.value)}>
              <option value="">Todos</option>
              {veterinarios.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>FECHA</div>
            <input className="input" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </label>
          <button className="btn-ghost" onClick={clearFilters}>Limpiar</button>
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="card" style={{ padding: 30, textAlign: "center" }}>Cargando citas...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--subtext)" }}>
          📭 No hay citas que coincidan con los filtros actuales.
        </div>
      ) : (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}>
            {filtered.map(c => <CitaCard key={c.id} cita={c} onOpen={() => setDetail(c)} />)}
          </div>

          <div style={{
            marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="small-muted">Mostrando {filtered.length} de {total}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn-ghost" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>← Anterior</button>
              <strong style={{ padding: "0 12px" }}>{page}</strong>
              <button className="btn-ghost" onClick={() => setPage(page + 1)}>Siguiente →</button>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <CreateCitaModal
          propietarios={propietarios}
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}

      {detail && (
        <CitaDetailModal
          cita={detail}
          onClose={() => { setDetail(null); fetchAll(); }}
          onUpdated={() => fetchAll()}
        />
      )}
    </div>
  );
}