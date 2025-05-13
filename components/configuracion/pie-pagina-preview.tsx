"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface PiePaginaPreviewProps {
  imageUrl: string | null
  altura: number
  ajuste: string
  className?: string
}

export function PiePaginaPreview({ imageUrl, altura, ajuste, className }: PiePaginaPreviewProps) {
  const [dimensions, setDimensions] = useState<{ width: string; height: string }>({
    width: "100%",
    height: `${altura}px`,
  })
  const [objectFit, setObjectFit] = useState<"contain" | "cover" | "fill">("contain")
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({})

  // Simular el ancho de una página tamaño carta en proporción
  const pageWidth = 612 // Ancho de página carta en puntos (8.5 pulgadas = 21.59 cm)
  const previewWidth = 500 // Ancho de la vista previa en píxeles
  const margin = 15 // Margen reducido en puntos (convertido a proporción del previewWidth)
  const marginPx = (margin * previewWidth) / pageWidth

  useEffect(() => {
    if (!imageUrl) return

    // Calcular dimensiones según el tipo de ajuste
    const availableWidth = previewWidth - 2 * marginPx

    switch (ajuste) {
      case "proporcional":
        setImageStyle({
          maxHeight: `${altura}px`,
          maxWidth: `${availableWidth}px`,
          height: "auto",
          width: "auto",
          margin: "0 auto",
        })
        break
      case "altura_fija":
        setImageStyle({
          height: `${altura}px`,
          maxWidth: `${availableWidth}px`,
          width: "auto",
          margin: "0 auto",
        })
        break
      case "ancho_completo":
        setImageStyle({
          width: `${availableWidth}px`,
          height: "auto",
          maxHeight: "250px", // Aumentar altura máxima para reflejar cambios del PDF
          margin: "0 auto",
        })
        break
      default:
        setImageStyle({
          maxHeight: `${altura}px`,
          maxWidth: `${availableWidth}px`,
          height: "auto",
          width: "auto",
          margin: "0 auto",
        })
    }
  }, [imageUrl, altura, ajuste, marginPx, previewWidth])

  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 rounded-md border border-dashed border-gray-300",
          className,
        )}
        style={{ height: "100px", width: `${previewWidth}px`, maxWidth: "100%" }}
      >
        <p className="text-gray-500 text-sm">No hay imagen de pie de página</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center bg-white rounded-md border overflow-hidden",
          className,
        )}
        style={{
          width: `${previewWidth}px`,
          maxWidth: "100%",
          padding: "10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <p className="text-xs text-gray-500 mb-2 text-center">Vista previa del pie de página (Tamaño Carta)</p>

        <div
          className="w-full relative"
          style={{
            border: "1px dashed #e5e7eb",
            padding: `${marginPx}px`,
            backgroundColor: "#f9fafb",
          }}
        >
          {/* Indicadores de margen */}
          <div className="absolute top-0 left-0 w-full flex justify-between text-xs text-gray-400 -mt-4">
            <span>↑ Margen</span>
            <span>Margen ↑</span>
          </div>

          <div className="flex justify-center items-center">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Vista previa del pie de página"
              style={imageStyle}
              onError={(e) => {
                console.error("Error al cargar la imagen de pie de página en la vista previa")
                const target = e.target as HTMLImageElement
                target.style.display = "none"
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML += '<p class="text-red-500 text-sm">Error al cargar la imagen</p>'
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>
          Ajuste:{" "}
          {ajuste === "proporcional" ? "Proporcional" : ajuste === "altura_fija" ? "Altura Fija" : "Ancho Completo"}
        </p>
        <p>Altura: {ajuste === "ancho_completo" ? "Automática" : `${altura}px`}</p>
        <p className="text-blue-500 mt-2">
          Recomendación: Para mejores resultados, use una imagen con proporción aproximada de 5:1 (ancho:alto)
        </p>
      </div>
    </div>
  )
}
