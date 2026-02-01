// NOTA: actualmente el proyecto utiliza exclusivamente `lib/expressApi.js`
// Este cliente apunta al API Laravel (antiguo). Puedes eliminarlo si no lo vas a usar.
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://api-laravel-12-main-fv6pcf.laravel.cloud"
});

// Añadir token automáticamente si está en localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;