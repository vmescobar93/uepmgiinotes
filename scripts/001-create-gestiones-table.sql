-- Crear tabla de gestiones
CREATE TABLE IF NOT EXISTS gestiones (
  id SERIAL PRIMARY KEY,
  anio INTEGER NOT NULL UNIQUE,
  nombre VARCHAR(50) NOT NULL,
  activa BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar gestión 2025 como activa (datos actuales)
INSERT INTO gestiones (anio, nombre, activa) 
VALUES (2025, 'Gestión 2025', true)
ON CONFLICT (anio) DO NOTHING;

-- Crear índice para búsqueda rápida de gestión activa
CREATE INDEX IF NOT EXISTS idx_gestiones_activa ON gestiones(activa) WHERE activa = true;
