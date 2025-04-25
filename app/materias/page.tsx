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

type Materia = Database["public"]["Tables"]["materias"]["Row"]

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchMaterias = async () => {
      try {
        const { data, error } = await supabase.from("materias").select("*").order("codigo", { ascending: true })

        if (error) throw error
        setMaterias(data || [])
      } catch (error) {
        console.error("Error al obtener materias:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMaterias()
  }, [])

  const filteredMaterias = materias.filter(
    (materia) =>
      materia.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materia.nombre_corto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materia.nombre_largo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materia.curso_corto?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold">Materias</h1>
          <Link href="/materias/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Materia
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Materias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materia..."
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
                      <TableHead>Nombre Corto</TableHead>
                      <TableHead>Nombre Largo</TableHead>
                      <TableHead>Curso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No se encontraron materias.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMaterias.map((materia) => (
                        <TableRow key={materia.codigo}>
                          <TableCell>{materia.codigo}</TableCell>
                          <TableCell>{materia.nombre_corto}</TableCell>
                          <TableCell>{materia.nombre_largo}</TableCell>
                          <TableCell>{materia.curso_corto || "-"}</TableCell>
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
