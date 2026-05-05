"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import Link from "next/link"

type Profesor = Database["public"]["Tables"]["profesores"]["Row"]

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchProfesores = async () => {
      try {
        const { data, error } = await supabase.from("profesores").select("*").order("apellidos", { ascending: true })

        if (error) throw error
        setProfesores(data || [])
      } catch (error) {
        console.error("Error al obtener profesores:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfesores()
  }, [])

  const filteredProfesores = profesores.filter(
    (profesor) =>
      profesor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profesor.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profesor.ci?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold">Profesores</h1>
          <Link href="/profesores/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Profesor
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Profesores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar profesor..."
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
                      <TableHead>Apellidos</TableHead>
                      <TableHead>CI</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfesores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No se encontraron profesores.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProfesores.map((profesor) => (
                        <TableRow key={profesor.cod_moodle}>
                          <TableCell>{profesor.cod_moodle}</TableCell>
                          <TableCell>{profesor.nombre}</TableCell>
                          <TableCell>{profesor.apellidos}</TableCell>
                          <TableCell>{profesor.ci || "-"}</TableCell>
                          <TableCell>
                            {profesor.activo ? <Badge>Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                          </TableCell>
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
