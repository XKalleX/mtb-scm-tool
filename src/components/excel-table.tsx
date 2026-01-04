'use client'

/**
 * ========================================
 * EXCEL-LIKE SCROLLABLE TABLE
 * ========================================
 * 
 * Excel-ähnliche Tabelle mit:
 * - Sticky Headers (Kopfzeilen bleiben sichtbar)
 * - Horizontaler Scroll für viele Tage
 * - Vertikaler Scroll für viele Zeilen
 * - Zebra-Streifen für bessere Lesbarkeit
 * - Formel-Tooltips
 */

import { useState } from 'react'
import { Info } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface ExcelTableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
  formula?: string // Optional: Formel-Erklärung
  format?: (value: any) => string
}

interface ExcelTableProps {
  columns: ExcelTableColumn[]
  data: any[]
  maxHeight?: string
  showFormulas?: boolean
  title?: string
  description?: string
}

/**
 * Excel-ähnliche Tabelle mit Sticky Headers und Scroll
 */
export default function ExcelTable({
  columns,
  data,
  maxHeight = '600px',
  showFormulas = false,
  title,
  description
}: ExcelTableProps) {
  const [selectedFormula, setSelectedFormula] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Header mit Titel */}
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Formel-Anzeige */}
      {showFormulas && selectedFormula && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Formel-Erklärung</h4>
              <p className="text-sm text-blue-800 font-mono">{selectedFormula}</p>
            </div>
          </div>
        </div>
      )}

      {/* Excel-ähnliche Tabelle */}
      <div 
        className="border rounded-lg bg-white shadow-sm overflow-auto"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-100 border-b-2 border-slate-300">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-sm font-semibold text-slate-700 border-r border-slate-200 last:border-r-0 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={{ 
                    minWidth: col.width || '120px',
                    position: 'sticky',
                    top: 0
                  }}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <span>{col.label}</span>
                    {showFormulas && col.formula && (
                      <button
                        onClick={() => setSelectedFormula(col.formula!)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Formel anzeigen"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body mit Zebra-Streifen */}
          <tbody>
            {data.map((row, rowIdx) => (
              <tr 
                key={rowIdx}
                className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2 text-sm border-r border-slate-200 last:border-r-0 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                    style={{ minWidth: col.width || '120px' }}
                  >
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statistik Footer */}
      <div className="text-sm text-muted-foreground">
        Zeigt {data.length} von {data.length} Einträgen
      </div>
    </div>
  )
}

/**
 * Formel-Karte Komponente
 * Zeigt wichtige Formeln mit Erklärung
 */
export function FormulaCard({ 
  title, 
  formula, 
  description, 
  example 
}: { 
  title: string
  formula: string
  description: string
  example?: string
}) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="bg-blue-600 text-white rounded-full p-2">
          <Info className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-2">{title}</h4>
          <div className="bg-white rounded px-3 py-2 mb-2 font-mono text-sm text-blue-800 border border-blue-200">
            {formula}
          </div>
          <p className="text-sm text-blue-800 mb-2">{description}</p>
          {example && (
            <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-800">
              <strong>Beispiel:</strong> {example}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
