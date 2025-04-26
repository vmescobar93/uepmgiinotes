-- Crear tabla de configuración
CREATE TABLE IF NOT EXISTS configuracion (
  id INTEGER PRIMARY KEY,
  nombre_institucion VARCHAR(255),
  logo_url TEXT
);

-- Insertar configuración inicial
INSERT INTO configuracion (id, nombre_institucion, logo_url)
VALUES (1, 'U.E. Plena María Goretti II', NULL)
ON CONFLICT (id) DO NOTHING;
