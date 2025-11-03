"use client";
import { useState, useEffect } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(()=> {
    const raw = localStorage.getItem('user');
    if (!raw) router.replace('/');
    else setUser(JSON.parse(raw));
  }, [router]);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=> { if (user) { setNombre(user.nombre||''); setTelefono(user.telefono||''); setEmail(user.email||''); }}, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await expressApi.put('/auth/profile', { nombre, email, telefono, currentPassword, newPassword });
      const updated = res.data?.data || res.data;
      localStorage.setItem('user', JSON.stringify(updated));
      setMsg('Perfil actualizado');
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || 'Error');
    } finally { setLoading(false); }
  };

  if (!user) return null;
  return (
    <div style={{ padding:24 }}>
      <div className="card" style={{ maxWidth:560 }}>
        <h2>Mi perfil</h2>
        <form onSubmit={handleSave}>
          <label>Nombre <input className="input" value={nombre} onChange={e=>setNombre(e.target.value)}/></label>
          <label>Email <input className="input" value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Teléfono <input className="input" value={telefono} onChange={e=>setTelefono(e.target.value)}/></label>
          <hr />
          <label>Contraseña actual (requerida si cambiasla) <input className="input" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
          <label>Nueva contraseña <input className="input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>

          {msg && <div style={{ color: 'crimson' }}>{msg}</div>}
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>
      </div>
    </div>
  );
}