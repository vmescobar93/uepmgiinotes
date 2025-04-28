"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileText,
  Settings,
  X,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Alumnos",
    href: "/alumnos",
    icon: Users,
  },
  {
    title: "Profesores",
    href: "/profesores",
    icon: GraduationCap,
  },
  {
    title: "Cursos",
    href: "/cursos",
    icon: BookOpen,
  },
  {
    title: "Materias",
    href: "/materias",
    icon: BookOpen,
  },
  {
    title: "Calificaciones",
    href: "/calificaciones",
    icon: ClipboardList,
  },
  {
    title: "Reportes",
    href: "/reportes",
    icon: FileText,
  },
  {
    title: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
  {
    title: "Datos de Prueba",
    href: "/admin/test-data",
    icon: Database,
  },
  {
    title: "Usuarios",
    href: "/usuarios",
    icon: Users,
  },
]

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold">U.E. María Goretti II</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="md:hidden">
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar menú</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="grid gap-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                  pathname === item.href ? "bg-muted" : "transparent",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  )
}
