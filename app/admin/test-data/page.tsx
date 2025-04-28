"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle, Database, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TestDataPage() {
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>("1")
  const [selectedCurso, setSelectedCurso] = useState<string>("TODOS")
  const [cursos, setCursos] = useState<{ nombre_corto: string; nombre_largo: string }[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmacion, setConfirmacion] = useState("")
  const { toast } = useToast()

  // Cargar cursos
  useState(() => {
    const fetchCursos = async () => {
      const { data } = await supabase.from("cursos").select("nombre_corto, nombre_largo").order("nombre_corto")
      if (data) setCursos(data)
    }
    fetchCursos()
  }, [])

  // Generar datos de prueba
  const handleGenerateTestData = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/test-data/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trimestre: Number.parseInt(selectedTrimestre),
          cursoCorto: selectedCurso === "TODOS" ? null : selectedCurso,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al generar datos de prueba")
      }

      toast({
        title: "Datos generados",
        description: data.message,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron generar los datos de prueba",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Eliminar calificaciones
  const handleDeleteData = async () => {
    if (confirmacion !== "CONFIRMAR") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe escribir CONFIRMAR para eliminar los datos",
      })
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch("/api/test-data/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trimestre: selectedTrimestre === "TODOS" ? null : Number.parseInt(selectedTrimestre),
          cursoCorto: selectedCurso === "TODOS" ? null : selectedCurso,
          confirmacion,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar calificaciones")
      }

      toast({
        title: "Datos eliminados",
        description: data.message,
      })

      // Limpiar el campo de confirmación
      setConfirmacion("")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron eliminar las calificaciones",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Administración de Datos de Prueba</h1>

        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Advertencia</AlertTitle>
          <AlertDescription>
            Esta sección es solo para fines de prueba. Las operaciones realizadas aquí pueden afectar datos reales.
            Utilice con precaución.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">Generar Datos</TabsTrigger>
            <TabsTrigger value="delete">Eliminar Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Generar Calificaciones de Prueba</CardTitle>
                <CardDescription>
                  Genera calificaciones aleatorias para todos los alumnos y materias del trimestre seleccionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar trimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primer Trimestre</SelectItem>
                        <SelectItem value="2">Segundo Trimestre</SelectItem>
                        <SelectItem value="3">Tercer Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos los cursos</SelectItem>
                        {cursos.map((curso) => (
                          <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                            {curso.nombre_largo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleGenerateTestData} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Generar Datos de Prueba
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="delete" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Eliminar Calificaciones</CardTitle>
                <CardDescription>
                  Elimina las calificaciones existentes según los criterios seleccionados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Peligro</AlertTitle>
                  <AlertDescription>
                    Esta acción eliminará permanentemente las calificaciones seleccionadas. No se puede deshacer.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar trimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos los trimestres</SelectItem>
                        <SelectItem value="1">Primer Trimestre</SelectItem>
                        <SelectItem value="2">Segundo Trimestre</SelectItem>
                        <SelectItem value="3">Tercer Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos los cursos</SelectItem>
                        {cursos.map((curso) => (
                          <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                            {curso.nombre_largo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmacion">
                    Escriba <span className="font-bold">CONFIRMAR</span> para eliminar
                  </Label>
                  <Input
                    id="confirmacion"
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    placeholder="CONFIRMAR"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={handleDeleteData}
                  disabled={isDeleting || confirmacion !== "CONFIRMAR"}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Calificaciones
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
