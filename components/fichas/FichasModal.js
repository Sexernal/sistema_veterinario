// app/mascotas/FichasModal.js
// Historial clínico de una mascota: mezcla en una sola línea de tiempo los
// tratamientos (con sus consultas adentro) y las consultas sueltas.
"use client";
import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { ModalBase, EmptyState, FilterChips, getSpeciesIcon } from "../ui";
import FichaForm from "./FichaForm";
import FichaDetailModal from "./FichaDetailModal";
import FichaRow from "./FichaRow";
import TratamientoCard from "./TratamientoCard";
import { agruparPorTratamiento, construirTimeline } from "./fichasUtils";

export default function FichasModal({ pet, onClose, isAdmin = false }) {
  const [fichas, setFichas]             = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingFicha, setEditingFicha] = useState(null);
  const [viewingFicha, setViewingFicha] = useState(null);
  const [filtro, setFiltro]             = useState("todas");
  // Los tratamientos arrancan desplegados; aquí guardamos los que el usuario cerró
  const [cerrados, setCerrados]         = useState({});

  const fetchTodo = async () => {
    setLoading(true);
    try {
      const [fRes, tRes] = await Promise.all([
        expressApi.get(`/medical-records?pet_id=${pet.id}`),
        expressApi.get(`/tratamientos?pet_id=${pet.id}`),
      ]);
      setFichas(fRes.data?.data || []);
      setTratamientos(tRes.data?.data || []);
    } catch (err) {
      console.error("Error cargando historial:", err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTodo(); }, [pet.id]);

  // Guardar una ficha puede crear un tratamiento y mover OTRA ficha (la que se
  // marcó como origen), así que recargamos todo en vez de parchear el estado.
  const handleSaved = async () => {
    setShowForm(false); setEditingFicha(null);
    await fetchTodo();
  };

  const deleteFicha = async (id) => {
    if (!confirm("¿Eliminar esta ficha médica?")) return;
    try {
      await expressApi.delete(`/medical-records/${id}`);
      await fetchTodo();
    } catch (err) { alert(err?.response?.data?.message || err.message || "Error al eliminar"); }
  };

  const desagruparFicha = async (ficha) => {
    if (!confirm("¿Sacar esta consulta del tratamiento?\n\nLa ficha NO se elimina, solo deja de estar agrupada.")) return;
    try {
      await expressApi.delete(`/tratamientos/${ficha.tratamiento_id}/fichas/${ficha.id}`);
      await fetchTodo();
    } catch (err) { alert(err?.response?.data?.message || err.message || "Error al desagrupar"); }
  };

  const eliminarTratamiento = async (t) => {
    if (!confirm(
      `¿Deshacer el tratamiento "${t.nombre}"?\n\n` +
      `Sus ${t.total_fichas} ficha${t.total_fichas !== 1 ? "s" : ""} volverán a quedar como consultas sueltas. ` +
      `Ninguna ficha se elimina.`
    )) return;
    try {
      await expressApi.delete(`/tratamientos/${t.id}`);
      await fetchTodo();
    } catch (err) { alert(err?.response?.data?.message || err.message || "Error al eliminar el tratamiento"); }
  };

  // Renombrar o cambiar el estado no altera la agrupación: basta con
  // refrescar ese tratamiento en memoria, sin recargar todo el historial.
  const actualizarTratamiento = (t) =>
    setTratamientos(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x));

  const { grupos, sueltas } = useMemo(
    () => agruparPorTratamiento(fichas, tratamientos),
    [fichas, tratamientos]
  );

  const timeline = useMemo(
    () => construirTimeline({ grupos, sueltas }, filtro),
    [grupos, sueltas, filtro]
  );

  if (viewingFicha) {
    return <FichaDetailModal ficha={viewingFicha} onClose={() => setViewingFicha(null)} />;
  }

  const subtitulo = [
    pet.especie ? `${getSpeciesIcon(pet.especie)} ${pet.especie}` : "Mascota",
    `${fichas.length} ficha${fichas.length !== 1 ? "s" : ""}`,
    grupos.length ? `${grupos.length} tratamiento${grupos.length !== 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");

  const editarFicha = (f) => { setEditingFicha(f); setShowForm(false); };

  return (
    <ModalBase
      title={`Fichas médicas — ${pet.nombre}`}
      subtitle={subtitulo}
      onClose={onClose} maxWidth={720}
    >
      {isAdmin && !showForm && !editingFicha && (
        <button className="btn" onClick={() => setShowForm(true)} style={{ marginBottom: 12 }}>
          + Nueva ficha
        </button>
      )}

      {showForm && (
        <FichaForm petId={pet.id} onSaved={handleSaved} onCancel={() => setShowForm(false)}
          tratamientos={tratamientos} fichas={fichas} />
      )}
      {editingFicha && (
        // key por ficha: sin esto React reutiliza el formulario y, al pasar de
        // editar una ficha a otra sin cerrarlo, quedan los datos de la anterior.
        <FichaForm key={editingFicha.id} petId={pet.id} initial={editingFicha}
          onSaved={handleSaved} onCancel={() => setEditingFicha(null)}
          tratamientos={tratamientos} fichas={fichas} />
      )}

      {!loading && fichas.length > 0 && (
        <FilterChips
          value={filtro}
          onChange={setFiltro}
          options={[
            { value:"todas",     label:"Todas",        count:fichas.length },
            { value:"agrupadas", label:"Tratamientos", count:grupos.length },
            { value:"sueltas",   label:"Sueltas",      count:sueltas.length },
          ]}
        />
      )}

      {loading ? (
        <div style={{ padding:"20px 0", textAlign:"center", color:"var(--subtext)" }}>
          Cargando historial...
        </div>
      ) : fichas.length === 0 ? (
        <EmptyState icon="📋">No hay fichas médicas registradas aún.</EmptyState>
      ) : timeline.length === 0 ? (
        <EmptyState icon="🔍">
          {filtro === "agrupadas"
            ? "Ninguna consulta está agrupada en un tratamiento todavía."
            : "Todas las consultas pertenecen a algún tratamiento."}
        </EmptyState>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {timeline.map(item =>
            item.tipo === "tratamiento" ? (
              <TratamientoCard
                key={item.key}
                tratamiento={item.grupo.tratamiento}
                fichas={item.grupo.fichas}
                isAdmin={isAdmin}
                abierto={!cerrados[item.key]}
                onToggle={() => setCerrados(c => ({ ...c, [item.key]: !c[item.key] }))}
                onVerFicha={setViewingFicha}
                onEditarFicha={editarFicha}
                onEliminarFicha={deleteFicha}
                onDesagrupar={desagruparFicha}
                onTratamientoActualizado={actualizarTratamiento}
                onEliminarTratamiento={eliminarTratamiento}
              />
            ) : (
              <FichaRow
                key={item.key}
                ficha={item.ficha}
                suelta
                isAdmin={isAdmin}
                onVer={setViewingFicha}
                onEditar={editarFicha}
                onEliminar={deleteFicha}
              />
            )
          )}
        </div>
      )}
    </ModalBase>
  );
}
