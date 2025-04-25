"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Download, Printer } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function ReportesPage() {
  const [selectedCurso, setSelectedCurso] = useState("")
  const [selectedAlumno, setSelectedAlumno] = useState("")
  const [selectedTrimestre, setSelectedTrimestre] = useState("1")
  const { toast } = useToast()

  const handleGenerarReporte = (tipo: string) => {
    toast({
      title: "Generando reporte",
      description: `El reporte de ${tipo} se está generando.`,
    })
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reportes</h1>

        <Tabs defaultValue="centralizador">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="centralizador">Centralizador</TabsTrigger>
            <TabsTrigger value="boletin">Boletín</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="centralizador" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Centralizador de Calificaciones</CardTitle>
                <CardDescription>Genere el centralizador de calificaciones por curso y trimestre.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1A">1° A Secundaria</SelectItem>
                        <SelectItem value="2A">2° A Secundaria</SelectItem>
                        <SelectItem value="3A">3° A Secundaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={() => handleGenerarReporte("centralizador interno")} disabled={!selectedCurso}>
                    <FileText className="mr-2 h-4 w-4" />
                    Centralizador Interno
                  </Button>
                  <Button onClick={() => handleGenerarReporte("centralizador ministerio")} disabled={!selectedCurso}>
                    <FileText className="mr-2 h-4 w-4" />
                    Centralizador Ministerio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="boletin" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Boletín de Calificaciones</CardTitle>
                <CardDescription>
                  Genere el boletín individual de calificaciones por alumno y trimestre.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="alumno">Alumno</Label>
                    <Select value={selectedAlumno} onValueChange={setSelectedAlumno}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar alumno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A001">Juan Pérez</SelectItem>
                        <SelectItem value="A002">María López</SelectItem>
                        <SelectItem value="A003">Carlos Gómez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={() => handleGenerarReporte("boletín")} disabled={!selectedAlumno}>
                    <Printer className="mr-2 h-4 w-4" />
                    Generar Boletín
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGenerarReporte("boletín PDF")}
                    disabled={!selectedAlumno}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Alumnos</CardTitle>
                <CardDescription>Genere el ranking de mejores alumnos por curso o nivel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1A">1° A Secundaria</SelectItem>
                        <SelectItem value="2A">2° A Secundaria</SelectItem>
                        <SelectItem value="3A">3° A Secundaria</SelectItem>
                        <SelectItem value="TODOS">Todos los cursos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                        <SelectItem value="FINAL">Calificación Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={() => handleGenerarReporte("ranking")} disabled={!selectedCurso}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Ranking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGenerarReporte("ranking PDF")}
                    disabled={!selectedCurso}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
