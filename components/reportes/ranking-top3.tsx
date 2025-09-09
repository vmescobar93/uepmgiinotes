"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Printer, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { generarRankingTop3PDF } from "@/lib/pdf/ranking-top3-pdf"
import type { Database } from "@/types/supabase"

// Tipos
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio?: number
  posicion?: number
  curso_nombre?: string
}

interface RankingTop3Props {
  alumnosPorCurso: Record<string, Alumno[]>
  cursos: Curso[]
  selectedTrimestre: string
}

export function RankingTop3({ alumnosPorCurso, cursos, selectedTrimestre }: RankingTop3Props) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const { toast } = useToast()

  // Función para exportar a PDF
  const exportarPDF = async () => {
    setIsGeneratingPDF(true)

    try {
      // Cargar configuración
      const { data: configData } = await supabase.from("configuracion").select("*").eq("id", 1).single()

      if (!configData) {
        throw new Error("No se pudo cargar la configuración")
      }

      // Obtener texto del trimestre
      const trimestreTexto =
        selectedTrimestre === "1"
          ? "Primer Trimestre"
          : selectedTrimestre === "2"
            ? "Segundo Trimestre"
            : selectedTrimestre === "3"
              ? "Tercer Trimestre"
              : "Promedio Anual"

      // Generar PDF
      const doc = await generarRankingTop3PDF(
        alumnosPorCurso,
        cursos,
        configData.nombre_institucion,
        configData.logo_url,
        trimestreTexto,
      )

      // Guardar PDF
      doc.save(`Ranking_Top3_${trimestreTexto.replace(/\s+/g, "_")}.pdf`)

      toast({
        title: "PDF generado",
        description: "El ranking Top 3 se ha exportado correctamente.",
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF del ranking Top 3.",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Función para imprimir
  const imprimir = () => window.print()

  // Obtener texto del trimestre
  const trimestreTexto =
    selectedTrimestre === "1"
      ? "Primer Trimestre"
      : selectedTrimestre === "2"
        ? "Segundo Trimestre"
        : selectedTrimestre === "3"
          ? "Tercer Trimestre"
          : "Promedio Anual"

  // Verificar si hay datos
  const hasData = Object.values(alumnosPorCurso).some((alumnos) => alumnos.length > 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ranking Top 3 por Curso</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={imprimir} className="print:hidden bg-transparent">
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button size="sm" onClick={exportarPDF} disabled={isGeneratingPDF || !hasData} className="print:hidden">
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Exportar PDF
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Título para impresión */}
          <div className="hidden print:block mb-6">
            <h2 className="text-2xl font-bold text-center">Ranking Top 3 por Curso</h2>
            <h3 className="text-xl font-semibold text-center">Periodo: {trimestreTexto}</h3>
            <p className="text-center text-sm mt-2">Fecha de generación: {new Date().toLocaleDateString("es-ES")}</p>
          </div>

          {hasData ? (
            <div className="space-y-8">
              {cursos
                .filter((curso) => alumnosPorCurso[curso.nombre_corto]?.length > 0)
                .map((curso) => {
                  const alumnosCurso = alumnosPorCurso[curso.nombre_corto]

                  return (
                    <div key={curso.nombre_corto} className="space-y-4">
                      <h3 className="text-lg font-bold border-b pb-2">{curso.nombre_largo}</h3>
                      <div className="overflow-hidden rounded-lg border">
                        <table className="w-full">
                          <thead className="bg-amber-400 text-black">
                            <tr>
                              <th className="p-2 text-left w-16">Posición</th>
                              <th className="p-2 text-left">Alumno</th>
                              <th className="p-2 text-right w-24">Promedio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {alumnosCurso.map((alumno) => {
                              // Determinar color según posición
                              let bgColor = "bg-white"
                              let textColor = "text-gray-900"
                              let icon = null

                              if (alumno.posicion === 1) {
                                bgColor = "bg-amber-50"
                                textColor = "text-amber-800"
                                icon = "🥇"
                              } else if (alumno.posicion === 2) {
                                bgColor = "bg-gray-50"
                                textColor = "text-gray-700"
                                icon = "🥈"
                              } else if (alumno.posicion === 3) {
                                bgColor = "bg-orange-50"
                                textColor = "text-orange-700"
                                icon = "🥉"
                              }

                              return (
                                <tr key={alumno.cod_moodle} className={bgColor}>
                                  <td className="p-2 text-center">
                                    <span className="text-lg">{icon}</span>
                                  </td>
                                  <td className={`p-2 font-medium ${textColor}`}>
                                    {alumno.apellidos}, {alumno.nombres}
                                  </td>
                                  <td className="p-2 text-right font-bold">{alumno.promedio?.toFixed(2)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay datos disponibles. Asegúrate de haber generado el ranking desde el botón principal.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RankingTop3
