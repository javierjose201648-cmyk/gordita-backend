-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'empleado',
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP,
  CONSTRAINT check_rol CHECK (rol IN ('administrador', 'empleado'))
);

-- Índice para búsqueda rápida por username
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);