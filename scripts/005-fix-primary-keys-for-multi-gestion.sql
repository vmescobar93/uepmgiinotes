-- Script para cambiar las PRIMARY KEYS a claves compuestas que incluyan gestion_id
-- Esto permite tener los mismos cursos, materias, alumnos, profesores en diferentes gestiones

-- 1. CURSOS: Cambiar PK de nombre_corto a (nombre_corto, gestion_id)
ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_pkey;
ALTER TABLE cursos ADD PRIMARY KEY (nombre_corto, gestion_id);

-- 2. MATERIAS: Cambiar PK de codigo a (codigo, gestion_id)
ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_pkey;
ALTER TABLE materias ADD PRIMARY KEY (codigo, gestion_id);

-- 3. ALUMNOS: Cambiar PK de cod_moodle a (cod_moodle, gestion_id)
ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_pkey;
ALTER TABLE alumnos ADD PRIMARY KEY (cod_moodle, gestion_id);

-- 4. PROFESORES: Cambiar PK de cod_moodle a (cod_moodle, gestion_id)
ALTER TABLE profesores DROP CONSTRAINT IF EXISTS profesores_pkey;
ALTER TABLE profesores ADD PRIMARY KEY (cod_moodle, gestion_id);

-- 5. AREAS: Cambiar PK de id a (id, gestion_id)
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_pkey;
ALTER TABLE areas ADD PRIMARY KEY (id, gestion_id);

-- Verificar las nuevas PKs
SELECT 
  tc.table_name, 
  string_agg(kcu.column_name, ', ') as pk_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('cursos', 'materias', 'alumnos', 'profesores', 'areas')
GROUP BY tc.table_name;
