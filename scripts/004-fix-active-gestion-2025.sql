-- Establecer gestión 2025 como activa y 2026 como inactiva
UPDATE gestiones SET activa = false WHERE activa = true;
UPDATE gestiones SET activa = true WHERE anio = 2025;

-- Verificar
SELECT * FROM gestiones ORDER BY anio;
