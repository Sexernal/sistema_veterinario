import axios from "axios";

const expressApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_EXPRESS_API_URL || "http://localhost:3001/api/v1",
});

expressApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token"); // usamos la misma key token
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default expressApi;