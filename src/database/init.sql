-- Tabla de tipos de masa
CREATE TABLE IF NOT EXISTS tipos_masa (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  precio_extra DECIMAL(10, 2) DEFAULT 0.00,
  disponible BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de guisados
CREATE TABLE IF NOT EXISTS guisados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  precio DECIMAL(10, 2) NOT NULL,
  disponible BOOLEAN DEFAULT true,
  descripcion TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de extras
CREATE TABLE IF NOT EXISTS extras (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  precio DECIMAL(10, 2) NOT NULL,
  disponible BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de refrescos
CREATE TABLE IF NOT EXISTS refrescos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  sabor VARCHAR(50) NOT NULL,
  tamaño VARCHAR(20) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  disponible BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de promociones
CREATE TABLE IF NOT EXISTS promociones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  cantidad_minima INTEGER NOT NULL,
  descuento_porcentaje DECIMAL(5, 2),
  precio_especial DECIMAL(10, 2),
  activa BOOLEAN DEFAULT true,
  fecha_inicio DATE,
  fecha_fin DATE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  numero_orden VARCHAR(20) UNIQUE NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  nombre_cliente VARCHAR(100),
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completado_en TIMESTAMP
);

-- Tabla de items de orden (gorditas individuales)
CREATE TABLE IF NOT EXISTS orden_items (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER REFERENCES ordenes(id) ON DELETE CASCADE,
  tipo_masa_id INTEGER REFERENCES tipos_masa(id),
  guisado_id INTEGER REFERENCES guisados(id),
  cantidad INTEGER DEFAULT 1,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de extras por item (frijoles, queso extra)
CREATE TABLE IF NOT EXISTS orden_item_extras (
  id SERIAL PRIMARY KEY,
  orden_item_id INTEGER REFERENCES orden_items(id) ON DELETE CASCADE,
  extra_id INTEGER REFERENCES extras(id),
  cantidad INTEGER DEFAULT 1,
  precio DECIMAL(10, 2) NOT NULL
);

-- Tabla de refrescos en orden
CREATE TABLE IF NOT EXISTS orden_refrescos (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER REFERENCES ordenes(id) ON DELETE CASCADE,
  refresco_id INTEGER REFERENCES refrescos(id),
  cantidad INTEGER DEFAULT 1,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_fecha ON ordenes(creado_en);
CREATE INDEX idx_orden_items_orden ON orden_items(orden_id);