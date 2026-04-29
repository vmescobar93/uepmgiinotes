-- Script para cambiar las PRIMARY KEYS usando CASCADE

-- 1. CURSOS
ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_pkey CASCADE;
ALTER TABLE cursos ADD PRIMARY KEY (nombre_corto, gestion_id);

-- 2. MATERIAS
ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_pkey CASCADE;
ALTER TABLE materias ADD PRIMARY KEY (codigo, gestion_id);

-- 3. ALUMNOS
ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_pkey CASCADE;
ALTER TABLE alumnos ADD PRIMARY KEY (cod_moodle, gestion_id);

-- 4. PROFESORES
ALTER TABLE profesores DROP CONSTRAINT IF EXISTS profesores_pkey CASCADE;
ALTER TABLE profesores ADD PRIMARY KEY (cod_moodle, gestion_id);

-- 5. AREAS
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_pkey CASCADE;
ALTER TABLE areas ADD PRIMARY KEY (id, gestion_id);
