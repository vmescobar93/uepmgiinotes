-- Script completo para cambiar las PRIMARY KEYS a claves compuestas
-- Primero eliminamos las foreign keys, luego cambiamos las PKs

-- Desactivar temporalmente las restricciones de FK
SET session_replication_role = 'replica';

-- 1. CURSOS: Cambiar PK
ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_pkey CASCADE;
ALTER TABLE cursos ADD PRIMARY KEY (nombre_corto, gestion_id);

-- 2. MATERIAS: Cambiar PK  
ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_pkey CASCADE;
ALTER TABLE materias ADD PRIMARY KEY (codigo, gestion_id);

-- 3. ALUMNOS: Cambiar PK
ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_pkey CASCADE;
ALTER TABLE alumnos ADD PRIMARY KEY (cod_moodle, gestion_id);

-- 4. PROFESORES: Cambiar PK
ALTER TABLE profesores DROP CONSTRAINT IF EXISTS profesores_pkey CASCADE;
ALTER TABLE profesores ADD PRIMARY KEY (cod_moodle, gestion_id);

-- 5. AREAS: Cambiar PK
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_pkey CASCADE;
ALTER TABLE areas ADD PRIMARY KEY (id, gestion_id);

-- Reactivar las restricciones de FK
SET session_replication_role = 'origin';

-- Verificar
SELECT 'PKs actualizadas correctamente' as resultado;
