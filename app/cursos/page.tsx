"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import Link from "next/link"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const { data, error } = await supabase.from("cursos").select("*").order("nombre_corto", { ascending: true })

        if (error) throw error
        setCursos(data || [])
      } catch (error) {
        console.error("Error al obtener cursos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCursos()
  }, [])

  const filteredCursos = cursos.filter(
    (curso) =>
      curso.nombre_corto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curso.nombre_largo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curso.nivel.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold">Cursos</h1>
          <Link href="/cursos/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Curso
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Nivel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCursos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          No se encontraron cursos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCursos.map((curso) => (
                        <TableRow key={curso.nombre_corto}>
                          <TableCell>{curso.nombre_corto}</TableCell>
                          <TableCell>{curso.nombre_largo}</TableCell>
                          <TableCell>{curso.nivel}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
