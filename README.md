# clona el repositorio
git clone https://github.com/Sexernal/login_react2.0.
# moverte a la carpeta del reposirotio
cd login_react2.0
# instala dependencias
npm install
# si axios no está ejecutar:
npm install axios
# crear archivo local .env.local de variables
NEXT_PUBLIC_API_URL=https://api-laravel-12-main-fv6pcf.laravel.cloud
NEXT_PUBLIC_EXPRESS_API_URL=http://localhost:3001/api/v1

# configurar variables de entorno en el API

# Crea la base de datos y tablas. Ejecuta los scripts en MySQL
Tabla para usuarios.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

Tabla para propietarios
CREATE TABLE IF NOT EXISTS propietarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(50),
  direccion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



Tabla para mascotas
CREATE TABLE IF NOT EXISTS mascotas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  especie VARCHAR(80),
  raza VARCHAR(100),
  edad INT,
  historial_medico TEXT,
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES propietarios(id) ON DELETE CASCADE
);

# Recordatorio: Mi app tiene las funciones bloqueadas para usuarios que no son admin por ende luego de crear tu primer usuario debes ir a la base de datos y hacerlo admin manualmente.

# iniciar dev server
npm run dev


Proyecto Next.js que implementa un login con tres modos: modo local de prueba (gmail@ejemplo.com / 1234) y modo API real que utiliza POST /api/login y GET /api/profile de la API del  y una nueva tercera funcion que es con una API express local con base de datos. Para usarlo sigue las instrucciones (aunque ya hay muchos cambios en la api asi que sin mi api)