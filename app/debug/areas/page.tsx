"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DebugAreasPage() {
  const [areas, setAreas] = useState<any[]>([])
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [selectedArea, setSelectedArea] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFixingRls, setIsFixingRls] = useState(false)
  const { toast } = useToast()

  // Cargar áreas
  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase.from("areas").select("id, nombre").order("nombre")
      if (data) setAreas(data)
    }
    fetchAreas()
  }, [])

  // Realizar diagnóstico
  const handleDiagnostico = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/debug/areas")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar diagnóstico")
      }

      console.log("Datos de diagnóstico:", data)
      setDiagnostico(data)
      toast({
        title: "Diagnóstico completado",
        description: `Se encontraron ${data.materias_sin_area} materias sin área asignada.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo realizar el diagnóstico.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Asignar áreas a materias sin área
  const handleAsignarAreas = async () => {
    if (!selectedArea) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione un área para asignar.",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/debug/asignar-areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ area_id: selectedArea }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al asignar áreas")
      }

      toast({
        title: "Áreas asignadas",
        description: `Se actualizaron ${data.materias_actualizadas} materias con el área "${data.area.nombre}".`,
      })

      // Actualizar diagnóstico
      handleDiagnostico()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron asignar las áreas.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Corregir políticas RLS
  const handleFixRls = async () => {
    setIsFixingRls(true)
    try {
      const response = await fetch("/api/debug/fix-areas-rls", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al corregir políticas RLS")
      }

      toast({
        title: "Políticas RLS corregidas",
        description: `Se encontraron ${data.areas_count} áreas después de la corrección.`,
      })

      // Actualizar áreas
      if (data.areas) {
        setAreas(data.areas)
      }

      // Actualizar diagnóstico
      handleDiagnostico()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron corregir las políticas RLS.",
      })
    } finally {
      setIsFixingRls(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Diagnóstico de Áreas</h1>

        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico de Áreas y Materias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDiagnostico} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  "Realizar Diagnóstico"
                )}
              </Button>

              <Button variant="destructive" onClick={handleFixRls} disabled={isFixingRls}>
                {isFixingRls ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Corrigiendo...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Corregir Políticas RLS
                  </>
                )}
              </Button>
            </div>

            {diagnostico && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Áreas</h3>
                    <p>Total: {diagnostico.total_areas}</p>
                    {diagnostico.total_areas === 0 && (
                      <div className="mt-2 rounded-md bg-yellow-50 p-3 text-yellow-800 border border-yellow-200">
                        <p className="flex items-center">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          No se encontraron áreas. Esto puede deberse a políticas RLS restrictivas.
                        </p>
                        <p className="mt-1 text-sm">
                          Haga clic en "Corregir Políticas RLS" para intentar solucionar este problema.
                        </p>
                      </div>
                    )}
                    <ul className="mt-2 space-y-1">
                      {diagnostico.areas.map((area: any) => (
                        <li key={area.id}>
                          ID: {area.id} - {area.nombre}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">Materias</h3>
                    <p>Total: {diagnostico.total_materias}</p>
                    <p>Con área: {diagnostico.materias_con_area}</p>
                    <p>Sin área: {diagnostico.materias_sin_area}</p>
                  </div>
                </div>

                {diagnostico.materias_sin_area > 0 && diagnostico.total_areas > 0 && (
                  <div className="mt-6 p-4 border rounded-md bg-muted">
                    <h3 className="text-lg font-semibold mb-2">Asignar área a materias sin área</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="area">Área</Label>
                        <Select value={selectedArea} onValueChange={setSelectedArea}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar área" />
                          </SelectTrigger>
                          <SelectContent>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button onClick={handleAsignarAreas} disabled={!selectedArea || isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Asignando...
                            </>
                          ) : (
                            "Asignar Área a Materias sin Área"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {diagnostico.materias.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Listado de Materias</h3>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Código
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID Área
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nombre Área
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {diagnostico.materias.map((materia: any) => (
                            <tr key={materia.codigo}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {materia.codigo}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{materia.nombre}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {materia.id_area || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {materia.area_nombre || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
