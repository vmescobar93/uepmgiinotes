-- Habilitar RLS en la tabla configuracion
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Permitir lectura de configuración a usuarios autenticados" 
ON configuracion FOR SELECT 
TO authenticated 
USING (true);

-- Crear política para permitir inserción/actualización solo a usuarios con rol 'admin'
-- Nota: Esta política requiere que la tabla de usuarios tenga un campo 'rol'
CREATE POLICY "Permitir escritura de configuración solo a administradores" 
ON configuracion FOR ALL 
TO authenticated 
USING (
  (SELECT rol FROM auth.users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT rol FROM auth.users WHERE id = auth.uid()) = 'admin'
);
