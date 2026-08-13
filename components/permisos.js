// components/permisos.js
//
// Copia de la matriz de permisos del API (services/permisos.js).
// Sirve para decidir QUÉ SE DIBUJA: los botones que un rol no puede usar
// no se renderizan, en vez de aparecer y dar error al pulsarlos.
//
// ⚠️ Esto NO es seguridad. Esconder un botón no impide que alguien llame la
// ruta a mano; quien manda de verdad es el API. Esto es sobre no mostrarle
// a la gente cosas que no le sirven.
//
// ⚠️ Si cambias la matriz aquí, cámbiala también en el API o la interfaz
// dirá una cosa y el servidor hará otra.
"use client";

export const ROLES = {
  SUPERADMIN:  "superadmin",   // Administración de la veterinaria
  VETERINARIO: "admin",        // Doctores. 'admin' por compatibilidad histórica
  RECEPCION:   "user",         // Recepcionistas
  PROPIETARIO: "propietario",  // Clientes, desde la app móvil
};

export const ETIQUETAS = {
  superadmin:  "Administrador",
  admin:       "Doctor(a)",
  user:        "Recepcionista",
  propietario: "Propietario",
};

export const COLORES_ROL = {
  superadmin:  "#f59e0b",
  admin:       "var(--accent-2)",
  user:        "var(--accent)",
  propietario: "var(--subtext)",
};

// Debe coincidir con services/permisos.js del API
export const PERMISOS = {
  // Administrativo: exclusivo del super admin
  "usuarios.gestionar":     ["superadmin"],
  "servicios.gestionar":    ["superadmin"],
  "reportes.ver":           ["superadmin"],

  // Clínico: super admin y veterinarios
  "consolidado.ver":        ["superadmin", "admin"],
  "propietarios.gestionar": ["superadmin", "admin"],
  "mascotas.gestionar":     ["superadmin", "admin"],
  "fichas.gestionar":       ["superadmin", "admin"],
  "vacunas.gestionar":      ["superadmin", "admin"],
  "comandas.editar":        ["superadmin", "admin"],

  // Operación diaria: todo el personal
  "citas.gestionar":        ["superadmin", "admin", "user"],
  "facturacion.ver":        ["superadmin", "admin", "user"],
  "facturacion.cobrar":     ["superadmin", "admin", "user"],
  "notificaciones.ver":     ["superadmin", "admin", "user"],
};

const normalizar = (role) => String(role || "").trim().toLowerCase();

// ¿Este usuario puede hacer esto?
//
// Prefiere la lista `permisos` que manda el login: así, si algún día cambia
// la matriz en el servidor, la interfaz se ajusta sin tocar este archivo.
// La tabla local queda como respaldo para sesiones viejas guardadas en
// localStorage, que todavía no traen ese campo.
export function puede(user, permiso) {
  if (!user) return false;

  if (Array.isArray(user.permisos)) return user.permisos.includes(permiso);

  const lista = PERMISOS[permiso];
  if (!lista) {
    console.error(`⚠️ permisos: "${permiso}" no está definido en la matriz`);
    return false;
  }
  return lista.includes(normalizar(user.role));
}

// Atajo para pantallas que necesitan varios permisos a la vez
export const puedeAlguno = (user, ...permisos) => permisos.some(p => puede(user, p));

export const etiquetaRol = (user) =>
  user?.role_label || ETIQUETAS[normalizar(user?.role)] || "Usuario";

export const colorRol = (user) =>
  COLORES_ROL[normalizar(user?.role)] || "var(--subtext)";

// Personal clínico: veterinario o administración
export const esPersonalClinico = (user) => {
  const r = normalizar(user?.role);
  return r === ROLES.SUPERADMIN || r === ROLES.VETERINARIO;
};

// Guarda de página: devuelve la ruta a la que hay que redirigir, o null si
// puede quedarse. Se usa en el useEffect que protege cada pantalla.
//
//   const destino = redirigirSiNoPuede(user, "reportes.ver");
//   if (destino) return router.replace(destino);
export function redirigirSiNoPuede(user, permiso) {
  if (!user) return "/";
  return puede(user, permiso) ? null : "/dashboard";
}
