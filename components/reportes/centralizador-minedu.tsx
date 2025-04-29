"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getConfiguracion } from "@/lib/config"
import { generarCentralizadorMineduPDF } from "@/lib/pdf-generators"
import { getEstadoNota } from "@/lib/utils"
import type { Database } from "@/types/supabase"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]

interface CentralizadorMineduProps {
  curso?: Curso
  alumnos: Alumno[]
  materias: Materia[]
  calificaciones: Calificacion[]
  agrupaciones: Agrupacion[]
  trimestre: string
}

interface MateriaAgrupada {
  id_area: number
  nombre_grupo: string
  nombre_mostrar: string
  materias: string[]
  orden: number // Valor mínimo de orden entre las materias del grupo
}

interface ElementoOrdenado {
  tipo: "grupo" | "materia"
  id: string // id_area-nombre_grupo para grupos, codigo para materias
  nombre: string // nombre_grupo para grupos, nombre_corto para materias
  orden: number
}

// Componente para mostrar una nota con el color correspondiente
function NotaConEstado({ nota }: { nota: number | null }) {
  if (nota === null) return <span>-</span>

  const { color, texto } = getEstadoNota(nota)

  return (
    <span style={{ color }} title={texto}>
      {typeof nota === "number" ? Math.round(nota).toString() : "-"}
    </span>
  )
}

export function CentralizadorMinedu({
  curso,
  alumnos,
  materias,
  calificaciones,
  agrupaciones,
  trimestre,
}: CentralizadorMineduProps) {
  const { toast } = useToast()
  const tableRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [nombreInstitucion, setNombreInstitucion] = useState("U.E. Plena María Goretti II")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [elementosOrdenados, setElementosOrdenados] = useState<ElementoOrdenado[]>([])
  const [materiasAgrupadas, setMateriasAgrupadas] = useState<Record<string, MateriaAgrupada>>({})
  const [materiasNoAgrupadas, setMateriasNoAgrupadas] = useState<Materia[]>([])

  // Cargar configuración
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getConfiguracion()
      setNombreInstitucion(config.nombre_institucion)
      setLogoUrl(config.logo_url)
    }
    loadConfig()
  }, [])

  // Procesar materias y agrupaciones
  useEffect(() => {
    if (!materias.length) return

    // Crear un mapa para acceder rápidamente a las materias por código
    const materiasMap = new Map<string, Materia>()
    materias.forEach((materia) => {
      materiasMap.set(materia.codigo, materia)
    })

    // Identificar materias agrupadas y no agrupadas
    const grupos: Record<string, MateriaAgrupada> = {}
    const noAgrupadas: Materia[] = []
    const materiasAgrupadasCodigos = new Set<string>()

    if (agrupaciones.length > 0) {
      // Procesar agrupaciones
      agrupaciones.forEach((agrupacion) => {
        if (!agrupacion.materia_codigo) return

        const key = `${agrupacion.id_area}-${agrupacion.nombre_grupo}`

        if (!grupos[key]) {
          grupos[key] = {
            id_area: agrupacion.id_area,
            nombre_grupo: agrupacion.nombre_grupo,
            nombre_mostrar: agrupacion.nombre_mostrar,
            materias: [],
            orden: Number.POSITIVE_INFINITY,
          }
        }

        grupos[key].materias.push(agrupacion.materia_codigo)
        materiasAgrupadasCodigos.add(agrupacion.materia_codigo)
      })

      // Calcular el orden mínimo para cada grupo
      Object.values(grupos).forEach((grupo) => {
        let minOrden = Number.POSITIVE_INFINITY

        grupo.materias.forEach((codigo) => {
          const materia = materiasMap.get(codigo)
          if (materia && materia.orden !== null && materia.orden < minOrden) {
            minOrden = materia.orden
          }
        })

        grupo.orden = minOrden === Number.POSITIVE_INFINITY ? 1000 : minOrden
      })

      // Identificar materias no agrupadas
      materias.forEach((materia) => {
        if (!materiasAgrupadasCodigos.has(materia.codigo)) {
          noAgrupadas.push(materia)
        }
      })
    } else {
      // Si no hay agrupaciones, todas las materias son no agrupadas
      noAgrupadas.push(...materias)
    }

    // Crear lista combinada de elementos ordenados
    const elementos: ElementoOrdenado[] = []

    // Añadir grupos
    Object.entries(grupos).forEach(([key, grupo]) => {
      elementos.push({
        tipo: "grupo",
        id: key,
        nombre: grupo.nombre_grupo,
        orden: grupo.orden,
      })
    })

    // Añadir materias no agrupadas
    noAgrupadas.forEach((materia) => {
      elementos.push({
        tipo: "materia",
        id: materia.codigo,
        nombre: materia.nombre_corto,
        orden: materia.orden !== null ? materia.orden : 1000,
      })
    })

    // Ordenar todos los elementos por el campo orden
    elementos.sort((a, b) => a.orden - b.orden)

    setElementosOrdenados(elementos)
    setMateriasAgrupadas(grupos)
    setMateriasNoAgrupadas(noAgrupadas)
  }, [materias, agrupaciones])

  // Obtener la nota de un alumno en una materia específica
  const getCalificacion = (alumnoId: string, materiaId: string): number | null => {
    const calificacion = calificaciones.find((cal) => cal.alumno_id === alumnoId && cal.materia_id === materiaId)
    return calificacion ? calificacion.nota : null
  }

  // Calcular el promedio de un grupo de materias para un alumno
  const calcularPromedioGrupo = (alumnoId: string, materiasCodigos: string[]): number => {
    const notasGrupo = materiasCodigos
      .map((codigo) => getCalificacion(alumnoId, codigo))
      .filter((nota): nota is number => nota !== null)

    if (notasGrupo.length === 0) return 0

    const suma = notasGrupo.reduce((acc, nota) => acc + nota, 0)
    // Redondear a entero según requisito
    return Math.round(suma / notasGrupo.length)
  }

  // Exportar a PDF
  const exportarPDF = async () => {
    setIsExporting(true)

    try {
      const doc = await generarCentralizadorMineduPDF(
        curso,
        alumnos,
        materias,
        calificaciones,
        agrupaciones,
        trimestre,
        nombreInstitucion,
        logoUrl,
      )

      // Guardar PDF
      doc.save(`Centralizador_MINEDU_${curso?.nombre_corto || "Curso"}_T${trimestre}.pdf`)

      toast({
        title: "PDF generado",
        description: "El centralizador MINEDU se ha exportado correctamente.",
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Imprimir
  const imprimir = () => {
    window.print()
  }

  // Obtener el nombre de la materia a partir del código
  const getNombreMateria = (codigo: string): string => {
    const materia = materias.find((m) => m.codigo === codigo)
    return materia ? materia.nombre_corto : codigo
  }

  return (
    <Card className="print:shadow-none" id="centralizador-minedu-container">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle>Centralizador MINEDU - {curso?.nombre_largo}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button size="sm" onClick={exportarPDF} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
              <h2 className="text-xl font-bold text-center">
                Centralizador MINEDU - {trimestre === "1" ? "Primer" : trimestre === "2" ? "Segundo" : "Tercer"}{" "}
                Trimestre
              </h2>
              <h3 className="text-lg font-semibold text-center">{nombreInstitucion}</h3>
            </div>
          </div>
          <p className="text-center">
            Curso: {curso?.nombre_largo} - Fecha: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-md border overflow-x-auto" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Nombres</TableHead>

                {/* Encabezados según el orden calculado */}
                {elementosOrdenados.map((elemento) => (
                  <TableHead key={elemento.id} className="text-center whitespace-nowrap">
                    {elemento.nombre}
                    {elemento.tipo === "grupo" && (
                      <span className="sr-only">{materiasAgrupadas[elemento.id].nombre_mostrar}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4 + elementosOrdenados.length} className="h-24 text-center">
                    No hay alumnos para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Notas según el orden calculado */}
                  {alumnos.map((alumno, index) => (
                    <TableRow key={alumno.cod_moodle}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>{alumno.cod_moodle}</TableCell>
                      <TableCell>{alumno.apellidos}</TableCell>
                      <TableCell>{alumno.nombres}</TableCell>

                      {/* Notas según el orden calculado */}
                      {elementosOrdenados.map((elemento) => {
                        if (elemento.tipo === "grupo") {
                          const grupo = materiasAgrupadas[elemento.id]
                          const promedio = calcularPromedioGrupo(alumno.cod_moodle, grupo.materias)
                          return (
                            <TableCell key={`${alumno.cod_moodle}-${elemento.id}`} className="text-center font-medium">
                              <NotaConEstado nota={promedio === 0 ? null : promedio} />
                            </TableCell>
                          )
                        } else {
                          const materia = materiasNoAgrupadas.find((m) => m.codigo === elemento.id)
                          if (!materia) return <TableCell key={`${alumno.cod_moodle}-${elemento.id}`}>-</TableCell>

                          const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
                          return (
                            <TableCell key={`${alumno.cod_moodle}-${elemento.id}`} className="text-center">
                              <NotaConEstado nota={nota} />
                            </TableCell>
                          )
                        }
                      })}
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda de agrupaciones */}
        {Object.keys(materiasAgrupadas).length > 0 && (
          <div className="mt-6 text-sm">
            <h3 className="font-semibold mb-2">Leyenda de agrupaciones:</h3>
            <ul className="space-y-1">
              {Object.values(materiasAgrupadas).map((grupo) => (
                <li key={`leyenda-${grupo.id_area}-${grupo.nombre_grupo}`}>
                  <strong>{grupo.nombre_grupo}</strong> ({grupo.nombre_mostrar}):{" "}
                  {grupo.materias.map(getNombreMateria).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Leyenda de colores */}
        <div className="mt-6 text-sm print:mt-4">
          <h3 className="font-semibold mb-2">Leyenda de calificaciones:</h3>
          <ul className="space-y-1">
            <li>
              <span className="inline-block w-4 h-4 bg-red-500 mr-2"></span>
              <span style={{ color: "red" }}>0-49:</span> Reprobado
            </li>
            <li>
              <span className="inline-block w-4 h-4 bg-amber-500 mr-2"></span>
              <span style={{ color: "#f59e0b" }}>50:</span> No Concluyente
            </li>
            <li>
              <span className="inline-block w-4 h-4 bg-green-500 mr-2"></span>
              <span>51-100:</span> Aprobado
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
