-- Insertar tipos de masa
INSERT INTO tipos_masa (nombre, precio_extra, disponible) VALUES
('Masa normal', 0.00, true),
('Masa de maíz azul', 3.00, true),
('Masa integral', 2.00, true)
ON CONFLICT (nombre) DO NOTHING;

-- Insertar guisados
INSERT INTO guisados (nombre, precio, disponible, descripcion) VALUES
('Chicharrón prensado', 35.00, true, 'Chicharrón con salsa verde'),
('Picadillo', 35.00, true, 'Carne molida con papa y zanahoria'),
('Rajas con queso', 30.00, true, 'Rajas de chile poblano con queso'),
('Frijoles con queso', 25.00, true, 'Frijoles refritos con queso'),
('Papa con chorizo', 30.00, true, 'Papa con chorizo y especias'),
('Tinga de pollo', 35.00, true, 'Pollo deshebrado en salsa de tomate'),
('Bistec', 40.00, true, 'Bistec en trozos'),
('Deshebrada', 40.00, true, 'Carne deshebrada')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar extras
INSERT INTO extras (nombre, precio, disponible) VALUES
('Frijoles', 5.00, true),
('Queso extra', 8.00, true),
('Crema', 3.00, true),
('Aguacate', 10.00, true)
ON CONFLICT (nombre) DO NOTHING;

-- Insertar refrescos
INSERT INTO refrescos (nombre, sabor, tamaño, precio, disponible) VALUES
('Coca Cola', 'Cola', '600ml', 20.00, true),
('Coca Cola', 'Cola', '355ml', 15.00, true),
('Sprite', 'Lima-limón', '600ml', 20.00, true),
('Fanta', 'Naranja', '600ml', 20.00, true),
('Agua mineral', 'Natural', '500ml', 15.00, true),
('Manzanita', 'Manzana', '600ml', 20.00, true)
ON CONFLICT DO NOTHING;

-- Insertar promociones
INSERT INTO promociones (nombre, descripcion, cantidad_minima, descuento_porcentaje, activa, fecha_inicio) VALUES
('Promo 3x2', 'Lleva 3 gorditas y paga 2', 3, 33.33, true, CURRENT_DATE),
('Promo 5 gorditas', 'Precio especial por 5 gorditas', 5, 15.00, true, CURRENT_DATE)
ON CONFLICT DO NOTHING;