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

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchAlumnos = async () => {
      try {
        const { data, error } = await supabase.from("alumnos").select("*").order("apellidos", { ascending: true })

        if (error) throw error
        setAlumnos(data || [])
      } catch (error) {
        console.error("Error al obtener alumnos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlumnos()
  }, [])

  const filteredAlumnos = alumnos.filter(
    (alumno) =>
      alumno.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.ci?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.rude?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.curso_corto?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold">Alumnos</h1>
          <Link href="/alumnos/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Alumno
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Alumnos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alumno..."
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
                      <TableHead>Nombres</TableHead>
                      <TableHead>Apellidos</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>CI</TableHead>
                      <TableHead>RUDE</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlumnos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No se encontraron alumnos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlumnos.map((alumno) => (
                        <TableRow key={alumno.cod_moodle}>
                          <TableCell>{alumno.cod_moodle}</TableCell>
                          <TableCell>{alumno.nombres}</TableCell>
                          <TableCell>{alumno.apellidos}</TableCell>
                          <TableCell>{alumno.curso_corto || "-"}</TableCell>
                          <TableCell>{alumno.ci || "-"}</TableCell>
                          <TableCell>{alumno.rude || "-"}</TableCell>
                          <TableCell>
                            {alumno.activo ? <Badge>Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
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
