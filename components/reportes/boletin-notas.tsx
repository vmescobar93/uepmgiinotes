"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer, Users } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getConfiguracion } from "@/lib/config"
import { supabase } from "@/lib/supabase"
import { generarBoletinPDF } from "@/lib/pdf-generators"
import { getEstadoNota } from "@/lib/utils"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"] & { orden?: number }
type Area = Database["public"]["Tables"]["areas"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface MateriaConArea extends Materia {
  areaNombre?: string
}

interface MateriasAgrupadas {
  [areaId: string]: {
    areaNombre: string
    materias: MateriaConArea[]
  }
}

interface BoletinNotasProps {
  alumno?: Alumno
  curso?: Curso
  materias: Materia[]
  calificaciones: {
    trimestre1: Calificacion[]
    trimestre2: Calificacion[]
    trimestre3: Calificacion[]
  }
  alumnos?: Alumno[] // Lista completa de alumnos para generar todos los boletines
}

// Hook personalizado para cargar configuración y áreas
function useConfiguracionYAreas() {
  const [nombreInstitucion, setNombreInstitucion] = useState("U.E. Plena María Goretti II")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [areas, setAreas] = useState<Area[]>([])

  useEffect(() => {
    // Cargar configuración
    getConfiguracion().then((cfg) => {
      setNombreInstitucion(cfg.nombre_institucion)
      setLogoUrl(cfg.logo_url)
    })

    // Cargar áreas
    supabase
      .from("areas")
      .select("id, nombre")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error cargando áreas:", error)
        } else if (data) {
          setAreas(data)
        }
      })
  }, [])

  // Crear mapa de áreas para acceso rápido
  const areaMap = useMemo(() => {
    const map: Record<string, string> = {}
    areas.forEach((a) => (map[a.id] = a.nombre))
    return map
  }, [areas])

  return { nombreInstitucion, logoUrl, areas, areaMap }
}

// Hook personalizado para agrupar materias por área
function useMateriasPorArea(materias: Materia[], areaMap: Record<string, string>) {
  return useMemo(() => {
    // Enriquecer materias con nombre de área
    const materiasConArea: MateriaConArea[] = materias.map((m) => ({
      ...m,
      areaNombre: m.id_area && areaMap[m.id_area] ? areaMap[m.id_area] : "Sin área",
    }))

    // Ordenar por área y luego por orden
    const ordenadas = [...materiasConArea].sort((a, b) => {
      const areaA = a.areaNombre || "Sin área"
      const areaB = b.areaNombre || "Sin área"

      if (areaA !== areaB) {
        return areaA.localeCompare(areaB)
      }
      return (a.orden ?? 0) - (b.orden ?? 0)
    })

    // Agrupar por área
    const agrupadas: MateriasAgrupadas = {}
    ordenadas.forEach((materia) => {
      const areaId = materia.id_area || "sin-area"
      if (!agrupadas[areaId]) {
        agrupadas[areaId] = {
          areaNombre: materia.areaNombre || "Sin área",
          materias: [],
        }
      }
      agrupadas[areaId].materias.push(materia)
    })

    return agrupadas
  }, [materias, areaMap])
}

// Componente para el encabezado del boletín (versión impresa)
function BoletinHeader({
  alumno,
  curso,
  nombreInstitucion,
  logoUrl,
}: {
  alumno: Alumno
  curso?: Curso
  nombreInstitucion: string
  logoUrl: string | null
}) {
  return (
    <div className="hidden print:block mb-6">
      <div className="flex items-center justify-center gap-4 mb-2">
        {logoUrl && (
          <img
            src={logoUrl || "/placeholder.svg"}
            alt="Logo institucional"
            className="h-16 w-auto object-contain"
            crossOrigin="anonymous"
            onError={(e) => {
              console.error("Error al cargar el logo en la vista previa")
              e.currentTarget.style.display = "none"
            }}
          />
        )}
        <div>
          <h2 className="text-xl font-bold text-center">Boletín de Calificaciones</h2>
          <h3 className="text-lg font-semibold text-center">{nombreInstitucion}</h3>
        </div>
      </div>
      <div className="mt-4">
        <p>
          <strong>Alumno:</strong> {alumno.apellidos}, {alumno.nombres}
        </p>
        <p>
          <strong>Curso:</strong> {curso?.nombre_largo}
        </p>
        <p>
          <strong>Fecha:</strong> {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

// Componente para las firmas del boletín (versión impresa)
function BoletinFooter() {
  return (
    <div className="mt-8 hidden print:flex justify-between px-12">
      <div className="text-center">
        <div className="border-t border-black pt-2 w-40 mx-auto mt-16"></div>
        <p>Director/a</p>
      </div>
      <div className="text-center">
        <div className="border-t border-black pt-2 w-40 mx-auto mt-16"></div>
        <p>Padre o Apoderado</p>
      </div>
    </div>
  )
}

// Componente para mostrar una nota con el color correspondiente
function NotaConEstado({ nota }: { nota: number | null }) {
  if (nota === null) return <span>-</span>

  const { color, texto } = getEstadoNota(nota)

  return (
    <span style={{ color }} title={texto}>
      {nota.toFixed(2)}
    </span>
  )
}

// Componente principal
export function BoletinNotas({ alumno, curso, materias, calificaciones, alumnos }: BoletinNotasProps) {
  const { toast } = useToast()
  const boletinRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingAll, setIsExportingAll] = useState(false)

  // Cargar configuración y áreas
  const { nombreInstitucion, logoUrl, areaMap } = useConfiguracionYAreas()

  // Agrupar materias por área
  const materiasAgrupadas = useMateriasPorArea(materias, areaMap)

  // Funciones para calcular calificaciones
  const getCalificacion = (materiaId: string, trimestre: 1 | 2 | 3): number | null => {
    if (!alumno) return null

    const list =
      trimestre === 1
        ? calificaciones.trimestre1
        : trimestre === 2
          ? calificaciones.trimestre2
          : calificaciones.trimestre3

    const cal = list.find((c) => c.alumno_id === alumno.cod_moodle && c.materia_id === materiaId)
    return cal?.nota ?? null
  }

  const calcularPromedioMateria = (materiaId: string): number => {
    const notas = [1, 2, 3]
      .map((t) => getCalificacion(materiaId, t as 1 | 2 | 3))
      .filter((n): n is number => n !== null)

    if (!notas.length) return 0
    return Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 100) / 100
  }

  const calcularPromedioTrimestre = (tr: 1 | 2 | 3): number => {
    const notas = materias.map((m) => getCalificacion(m.codigo, tr)).filter((n): n is number => n !== null)
    if (!notas.length) return 0
    return Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 100) / 100
  }

  const calcularPromedioAnual = (): number => {
    const proms = [1, 2, 3].map((t) => calcularPromedioTrimestre(t as 1 | 2 | 3)).filter((p) => p > 0)
    if (!proms.length) return 0
    return Math.round((proms.reduce((s, p) => s + p, 0) / proms.length) * 100) / 100
  }

  // Función para exportar a PDF
  const exportarPDF = async () => {
    if (!alumno) return
    setIsExporting(true)

    try {
      const doc = await generarBoletinPDF(alumno, curso, materias, calificaciones, nombreInstitucion, logoUrl, areaMap)
      doc.save(`Boletin_${alumno.apellidos}_${alumno.nombres}.pdf`)
      toast({ title: "PDF generado", description: "El boletín se ha exportado correctamente." })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." })
    } finally {
      setIsExporting(false)
    }
  }

  // Función para exportar todos los boletines
  const exportarTodosLosBoletienes = async () => {
    if (!alumnos || alumnos.length === 0 || !curso) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay alumnos para generar boletines.",
      })
      return
    }

    setIsExportingAll(true)

    try {
      const doc = await generarBoletinPDF(
        alumnos[0],
        curso,
        materias,
        calificaciones,
        nombreInstitucion,
        logoUrl,
        areaMap,
      )

      // Generar boletín para el resto de alumnos
      for (let i = 1; i < alumnos.length; i++) {
        await generarBoletinPDF(
          alumnos[i],
          curso,
          materias,
          calificaciones,
          nombreInstitucion,
          logoUrl,
          areaMap,
          doc,
          true, // Añadir salto de página
        )
      }

      // Guardar el documento combinado
      doc.save(`Boletines_${curso.nombre_corto}.pdf`)

      toast({
        title: "PDF generado",
        description: `Se han generado ${alumnos.length} boletines en un solo documento.`,
      })
    } catch (error) {
      console.error("Error al generar PDF combinado:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron generar todos los boletines.",
      })
    } finally {
      setIsExportingAll(false)
    }
  }

  // Función para imprimir
  const imprimir = () => window.print()

  // Si no hay alumno seleccionado
  if (!alumno) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Seleccione un alumno para generar el boletín.</p>
        </CardContent>
      </Card>
    )
  }

  // Renderizar boletín
  return (
    <Card className="print:shadow-none" id="boletin-container">
      <CardHeader className="flex items-center justify-between print:hidden">
        <CardTitle>Boletín de Calificaciones</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" onClick={exportarPDF} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
          {alumnos && alumnos.length > 0 && (
            <Button size="sm" variant="secondary" onClick={exportarTodosLosBoletienes} disabled={isExportingAll}>
              <Users className="mr-2 h-4 w-4" /> Exportar Todos
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Encabezado para impresión */}
        <BoletinHeader alumno={alumno} curso={curso} nombreInstitucion={nombreInstitucion} logoUrl={logoUrl} />

        {/* Tabla de calificaciones */}
        <div className="rounded-md border overflow-x-auto" ref={boletinRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2}>Área</TableHead>
                <TableHead rowSpan={2}>Materia</TableHead>
                <TableHead className="text-center">1er Trimestre</TableHead>
                <TableHead className="text-center">2do Trimestre</TableHead>
                <TableHead className="text-center">3er Trimestre</TableHead>
                <TableHead className="text-center" rowSpan={2}>
                  Promedio Anual
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.keys(materiasAgrupadas).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay materias para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Materias agrupadas por área */}
                  {Object.values(materiasAgrupadas).map((grupo, groupIndex) => (
                    <React.Fragment key={`area-${groupIndex}`}>
                      {grupo.materias.map((materia, idx) => {
                        const nota1 = getCalificacion(materia.codigo, 1)
                        const nota2 = getCalificacion(materia.codigo, 2)
                        const nota3 = getCalificacion(materia.codigo, 3)
                        const promedio = calcularPromedioMateria(materia.codigo)

                        return (
                          <TableRow key={materia.codigo}>
                            {idx === 0 && (
                              <TableCell
                                rowSpan={grupo.materias.length}
                                className="align-middle bg-muted/30 font-medium"
                              >
                                {grupo.areaNombre}
                              </TableCell>
                            )}
                            <TableCell>{materia.nombre_largo}</TableCell>
                            <TableCell className="text-center">
                              <NotaConEstado nota={nota1} />
                            </TableCell>
                            <TableCell className="text-center">
                              <NotaConEstado nota={nota2} />
                            </TableCell>
                            <TableCell className="text-center">
                              <NotaConEstado nota={nota3} />
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              <NotaConEstado nota={promedio} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </React.Fragment>
                  ))}

                  {/* Promedio general */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2} className="font-bold">
                      PROMEDIO GENERAL
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      <NotaConEstado nota={calcularPromedioTrimestre(1)} />
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      <NotaConEstado nota={calcularPromedioTrimestre(2)} />
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      <NotaConEstado nota={calcularPromedioTrimestre(3)} />
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      <NotaConEstado nota={calcularPromedioAnual()} />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pie de página para impresión */}
        <BoletinFooter />

        {/* Leyenda de colores */}
        <div className="mt-6 text-sm print:mt-4">
          <h3 className="font-semibold mb-2">Leyenda:</h3>
          <ul className="space-y-1">
            <li>
              <span className="inline-block w-4 h-4 bg-red-500 mr-2"></span>
              <span style={{ color: "red" }}>0-49,00:</span> Reprobado
            </li>
            <li>
              <span className="inline-block w-4 h-4 bg-amber-500 mr-2"></span>
              <span style={{ color: "#f59e0b" }}>49,01-50,99:</span> No Concluyente
            </li>
            <li>
              <span className="inline-block w-4 h-4 bg-green-500 mr-2"></span>
              <span>51,00-100,00:</span> Aprobado
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
