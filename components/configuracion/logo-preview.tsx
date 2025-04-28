import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoPreviewProps {
  logoUrl: string | null
  className?: string
  height?: number
  width?: number
}

export function LogoPreview({ logoUrl, className, height = 100, width = 200 }: LogoPreviewProps) {
  if (!logoUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 rounded-md border border-dashed border-gray-300",
          className,
        )}
        style={{ height, width }}
      >
        <p className="text-gray-500 text-sm">No hay logo</p>
      </div>
    )
  }

  return (
    <div
      className={cn("relative flex items-center justify-center bg-white rounded-md border overflow-hidden", className)}
      style={{ height, width }}
    >
      <Image
        src={logoUrl || "/placeholder.svg"}
        alt="Logo institucional"
        fill
        style={{ objectFit: "contain" }}
        onError={(e) => {
          // Si hay un error al cargar la imagen, mostrar un mensaje
          const target = e.target as HTMLImageElement
          target.style.display = "none"
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = '<p class="text-red-500 text-sm">Error al cargar el logo</p>'
          }
        }}
      />
    </div>
  )
}
