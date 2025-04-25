"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MainLayout } from "@/components/layout/main-layout"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    totalProfesores: 0,
    totalCursos: 0,
    totalMaterias: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Obtener total de alumnos
        const { count: alumnosCount } = await supabase.from("alumnos").select("*", { count: "exact", head: true })

        // Obtener total de profesores
        const { count: profesoresCount } = await supabase.from("profesores").select("*", { count: "exact", head: true })

        // Obtener total de cursos
        const { count: cursosCount } = await supabase.from("cursos").select("*", { count: "exact", head: true })

        // Obtener total de materias
        const { count: materiasCount } = await supabase.from("materias").select("*", { count: "exact", head: true })

        setStats({
          totalAlumnos: alumnosCount || 0,
          totalProfesores: profesoresCount || 0,
          totalCursos: cursosCount || 0,
          totalMaterias: materiasCount || 0,
        })
      } catch (error) {
        console.error("Error al obtener estadísticas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Alumnos</CardTitle>
                <CardDescription>Alumnos registrados en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAlumnos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Profesores</CardTitle>
                <CardDescription>Profesores registrados en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProfesores}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Cursos</CardTitle>
                <CardDescription>Cursos registrados en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCursos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Materias</CardTitle>
                <CardDescription>Materias registradas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMaterias}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimas acciones realizadas en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No hay actividad reciente para mostrar.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Eventos</CardTitle>
              <CardDescription>Eventos programados en el calendario académico</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No hay eventos próximos para mostrar.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
