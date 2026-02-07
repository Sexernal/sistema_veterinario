Resumen
Proyecto fullstack: frontend en Next.js (React + Tailwind) y API en Express + MySQL.
Funcionalidades principales implementadas (resumen):
Gestión de usuarios (doctores/admins) y propietarios.
Gestión de mascotas y fichas médicas (subida de archivos).

CRUD de citas con:
Generación de slots por tipo de consulta (backend /citas/slots).
Detección y bloqueo de solapamientos por veterinario (con buffer_min).
Estados: pendiente, confirmada, completada, cancelada.
Endpoints para confirmar / completar / cambiar estado.
Prevención de agendar en días pasados (validación cliente y servidor).

UI: filtros, paginación, modal de crear cita (slot-driven), dashboard con modal nuevo.
Protección al crear doctores: prompt de contraseña compartida (dev).

Requisitos previos
Node.js >= 18 (recomendado) y npm
MySQL (XAMPP o similar) — acceso a mysql y mysqldump
Git

# clona el repositorio
git clone https://github.com/Sexernal/sistema_veterinario.git
# moverte a la carpeta del reposirotio
cd sistema_veterinario

Dependencias principales:
next
react
react-dom
axios
tailwindcss + @tailwindcss/postcss

# instala dependencias
npm install
# si axios no está ejecutar:
npm install axios
# crear archivo local .env.local de variables
NEXT_PUBLIC_EXPRESS_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_ADMIN_CREATION_PASS=password

# configurar variables de entorno en el API

# iniciar dev server
npm run dev

# Crea la base de datos y tablas. Ejecuta los scripts en MySQL
-No puse el SQL por que tengo pereza de armarlo otro dia lo armo y lo subo (ya hice un backup de mi base de datos)

# Recordatorio: Mi app tiene las funciones bloqueadas para usuarios que no son admin por ende luego de crear tu primer usuario debes ir a la base de datos y hacerlo admin manualmente (Ya no uso usuarios no admin pero mantuve estas funciones).

:/ que dolores de cabeza me dio hacer esto por amor a dios (si aun no subi el SQL para la creacion de la base de datos y quiere probar el sistema me escribe y le paso el backup)