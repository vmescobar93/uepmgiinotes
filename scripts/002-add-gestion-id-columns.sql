-- Agregar columna gestion_id a todas las tablas relevantes
-- Primero como nullable, luego migrar datos, luego hacer NOT NULL

-- 1. Agregar columnas (nullable primero)
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE materias ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE areas ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE profesores ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE materias_profesores ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE agrupaciones_materias ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);
ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS gestion_id INTEGER REFERENCES gestiones(id);

-- 2. Migrar datos existentes a gestión 2025 (id = 1)
UPDATE cursos SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE materias SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE areas SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE alumnos SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE profesores SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE materias_profesores SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE agrupaciones_materias SET gestion_id = 1 WHERE gestion_id IS NULL;
UPDATE calificaciones SET gestion_id = 1 WHERE gestion_id IS NULL;

-- 3. Hacer NOT NULL después de migrar
ALTER TABLE cursos ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE materias ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE areas ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE alumnos ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE profesores ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE materias_profesores ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE agrupaciones_materias ALTER COLUMN gestion_id SET NOT NULL;
ALTER TABLE calificaciones ALTER COLUMN gestion_id SET NOT NULL;

-- 4. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_cursos_gestion ON cursos(gestion_id);
CREATE INDEX IF NOT EXISTS idx_materias_gestion ON materias(gestion_id);
CREATE INDEX IF NOT EXISTS idx_areas_gestion ON areas(gestion_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_gestion ON alumnos(gestion_id);
CREATE INDEX IF NOT EXISTS idx_profesores_gestion ON profesores(gestion_id);
CREATE INDEX IF NOT EXISTS idx_materias_profesores_gestion ON materias_profesores(gestion_id);
CREATE INDEX IF NOT EXISTS idx_agrupaciones_materias_gestion ON agrupaciones_materias(gestion_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_gestion ON calificaciones(gestion_id);

-- 5. Índice compuesto para alumnos (búsqueda por cod_moodle entre gestiones)
CREATE INDEX IF NOT EXISTS idx_alumnos_cod_moodle ON alumnos(cod_moodle);
