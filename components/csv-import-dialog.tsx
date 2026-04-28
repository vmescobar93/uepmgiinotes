"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CsvColumn {
  key: string
  label: string
  required?: boolean
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  columns: CsvColumn[]
  templateFileName: string
  onImport: (data: Record<string, any>[]) => Promise<{ success: boolean; message: string; errors?: string[] }>
}

export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  templateFileName,
  onImport,
}: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  const generateTemplate = () => {
    const headers = columns.map((col) => col.key).join(",")
    const exampleRow = columns
      .map((col) => {
        if (col.key === "activo") return "true"
        if (col.key === "orden") return "1"
        return `ejemplo_${col.key}`
      })
      .join(",")
    const csv = `${headers}\n${exampleRow}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = templateFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const parseCsv = useCallback(
    (text: string) => {
      const lines = text.trim().split("\n")
      if (lines.length < 2) {
        setErrors(["El archivo debe tener al menos una fila de encabezados y una de datos"])
        return []
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
      const requiredColumns = columns.filter((c) => c.required).map((c) => c.key.toLowerCase())
      const missingColumns = requiredColumns.filter((rc) => !headers.includes(rc))

      if (missingColumns.length > 0) {
        setErrors([`Faltan columnas requeridas: ${missingColumns.join(", ")}`])
        return []
      }

      const data: Record<string, any>[] = []
      const parseErrors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        if (values.length !== headers.length) {
          parseErrors.push(`Fila ${i + 1}: número de columnas incorrecto`)
          continue
        }

        const row: Record<string, any> = {}
        headers.forEach((header, index) => {
          let value: any = values[index]
          if (value.toLowerCase() === "true") value = true
          else if (value.toLowerCase() === "false") value = false
          else if (!isNaN(Number(value)) && value !== "") value = Number(value)
          row[header] = value === "" ? null : value
        })

        // Validar campos requeridos
        const emptyRequired = requiredColumns.filter((rc) => !row[rc] && row[rc] !== 0 && row[rc] !== false)
        if (emptyRequired.length > 0) {
          parseErrors.push(`Fila ${i + 1}: campos requeridos vacíos (${emptyRequired.join(", ")})`)
          continue
        }

        data.push(row)
      }

      setErrors(parseErrors)
      return data
    },
    [columns]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportResult(null)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const data = parseCsv(text)
      setParsedData(data)
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setIsImporting(true)
    try {
      const result = await onImport(parsedData)
      setImportResult(result)
      if (result.success) {
        setParsedData([])
        setFile(null)
        if (result.errors && result.errors.length > 0) {
          setErrors(result.errors)
        }
      } else if (result.errors) {
        setErrors(result.errors)
      }
    } catch (error: any) {
      setImportResult({ success: false, message: error.message || "Error al importar" })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedData([])
    setErrors([])
    setImportResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Descargar plantilla */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Plantilla CSV</p>
                <p className="text-sm text-muted-foreground">
                  Descarga la plantilla con las columnas correctas
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={generateTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </div>

          {/* Columnas requeridas */}
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-2">Columnas del archivo:</p>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <span
                  key={col.key}
                  className={`rounded px-2 py-1 text-xs ${
                    col.required
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {col.label} {col.required && "*"}
                </span>
              ))}
            </div>
          </div>

          {/* Subir archivo */}
          <div className="space-y-2">
            <Label htmlFor="csv_file">Archivo CSV</Label>
            <Input
              id="csv_file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>

          {/* Errores */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {errors.length > 5 && <li>...y {errors.length - 5} errores mas</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Resultado de importación */}
          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{importResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Vista previa */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Vista previa ({parsedData.length} registros)
              </p>
              <ScrollArea className="h-[200px] rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key} className="whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {columns.map((col) => (
                          <TableCell key={col.key} className="whitespace-nowrap">
                            {row[col.key]?.toString() ?? "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {parsedData.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  Mostrando 10 de {parsedData.length} registros
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || isImporting || errors.length > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar {parsedData.length} registros
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
