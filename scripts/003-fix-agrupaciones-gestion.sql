-- Verificar y corregir gestion_id en agrupaciones_materias
-- Primero verificamos qué gestiones existen
SELECT * FROM gestiones;

-- Verificamos cuántas agrupaciones tienen gestion_id NULL o incorrecto
SELECT gestion_id, COUNT(*) FROM agrupaciones_materias GROUP BY gestion_id;

-- Obtenemos el ID de la gestión 2025
DO $$
DECLARE
    gestion_2025_id INTEGER;
BEGIN
    SELECT id INTO gestion_2025_id FROM gestiones WHERE anio = 2025 LIMIT 1;
    
    IF gestion_2025_id IS NOT NULL THEN
        -- Actualizar todas las agrupaciones que no tienen gestion_id asignado
        UPDATE agrupaciones_materias 
        SET gestion_id = gestion_2025_id 
        WHERE gestion_id IS NULL;
        
        RAISE NOTICE 'Agrupaciones actualizadas con gestion_id = %', gestion_2025_id;
    ELSE
        RAISE NOTICE 'No se encontró la gestión 2025';
    END IF;
END $$;

-- Verificar resultado
SELECT gestion_id, COUNT(*) FROM agrupaciones_materias GROUP BY gestion_id;
