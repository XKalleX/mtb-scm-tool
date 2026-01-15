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
 * - Summenzeilen und Zwischensummen
 */

import React, { useState } from 'react'
import { Info } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { getDateRowBackgroundClasses, getDateTooltip } from '@/lib/date-classification'

interface ExcelTableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
  formula?: string // Optional: Formel-Erklärung
  format?: (value: any) => string
  sumable?: boolean // Spalte kann summiert werden
  sumLabel?: string // Optionales Label für Summe (z.B. "Gesamt")
}

interface ExcelTableProps {
  columns: ExcelTableColumn[]
  data: any[]
  maxHeight?: string
  showFormulas?: boolean
  title?: string
  description?: string
  showSums?: boolean // Zeige Summenzeile am Ende
  sumRowLabel?: string // Label für die Summenzeile (Standard: "SUMME")
  groupBy?: string // Optional: Gruppiere nach Spalte für Zwischensummen
  subtotalLabel?: string // Label für Zwischensummen (Standard: "Zwischensumme")
  useAverage?: boolean // Verwende Durchschnitt statt Summe (Standard: false)
  dateColumnKey?: string // Optional: Key der Datum-Spalte für farbliche Markierung von Wochenenden/Feiertagen
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
  description,
  showSums = false,
  sumRowLabel = 'SUMME',
  groupBy,
  subtotalLabel = 'Zwischensumme',
  useAverage = false,
  dateColumnKey
}: ExcelTableProps) {
  const [selectedFormula, setSelectedFormula] = useState<string | null>(null)
  
  /**
   * Berechnet Summen oder Durchschnitte für numerische Spalten
   */
  const calculateSums = (dataToSum: any[]) => {
    const sums: Record<string, number> = {}
    
    columns.forEach(col => {
      if (col.sumable !== false) {
        // Standardmäßig alle numerischen Spalten summieren/durchschnittlich berechnen
        const values = dataToSum.map(row => row[col.key])
        const numericValues = values.filter(v => typeof v === 'number')
        
        if (numericValues.length > 0) {
          const sum = numericValues.reduce((sum, val) => sum + val, 0)
          // Wenn useAverage=true, berechne Durchschnitt statt Summe
          sums[col.key] = useAverage ? sum / numericValues.length : sum
        }
      }
    })
    
    return sums
  }
  
  /**
   * Gruppiert Daten nach Spalte für Zwischensummen
   */
  const groupData = () => {
    if (!groupBy) return [{ group: null, items: data }]
    
    const groups: Record<string, any[]> = {}
    data.forEach(row => {
      const groupValue = row[groupBy]
      if (!groups[groupValue]) {
        groups[groupValue] = []
      }
      groups[groupValue].push(row)
    })
    
    return Object.entries(groups).map(([group, items]) => ({
      group,
      items
    }))
  }
  
  const groupedData = groupData()
  const totalSums = showSums ? calculateSums(data) : {}

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

          {/* Body mit Zebra-Streifen, Gruppen und Zwischensummen */}
          <tbody>
            {groupedData.map((group, groupIdx) => {
              const groupSums = groupBy ? calculateSums(group.items) : {}
              let rowCounter = 0
              
              return (
                <React.Fragment key={groupIdx}>
                  {/* Datenzeilen der Gruppe */}
                  {group.items.map((row, rowIdx) => {
                    rowCounter++
                    
                    // Bestimme Hintergrundfarbe basierend auf Datum (falls dateColumnKey angegeben)
                    let bgClasses = rowCounter % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                    let tooltipText: string | undefined = undefined
                    
                    if (dateColumnKey && row[dateColumnKey]) {
                      const date = row[dateColumnKey] instanceof Date 
                        ? row[dateColumnKey] 
                        : new Date(row[dateColumnKey])
                      
                      if (!isNaN(date.getTime())) {
                        const dateClasses = getDateRowBackgroundClasses(date)
                        if (dateClasses) {
                          bgClasses = dateClasses
                        }
                        tooltipText = getDateTooltip(date)
                      }
                    }
                    
                    return (
                      <tr 
                        key={`${groupIdx}-${rowIdx}`}
                        className={`border-b border-slate-200 transition-colors ${bgClasses}`}
                        title={tooltipText}
                      >
                        {columns.map((col) => (
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
                    )
                  })}
                  
                  {/* Zwischensumme nach jeder Gruppe (außer wenn es nur eine Gruppe gibt) */}
                  {groupBy && groupedData.length > 1 && (
                    <tr className="bg-amber-50 border-b-2 border-amber-300 font-semibold">
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm border-r border-slate-200 last:border-r-0 ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                          style={{ minWidth: col.width || '120px' }}
                        >
                          {colIdx === 0 ? (
                            <span>{subtotalLabel} {group.group}</span>
                          ) : groupSums[col.key] !== undefined ? (
                            col.format ? col.format(groupSums[col.key]) : formatNumber(groupSums[col.key], 0)
                          ) : (
                            ''
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            
            {/* Gesamtsumme am Ende */}
            {showSums && data.length > 0 && (
              <tr className="bg-green-100 border-t-2 border-green-600 font-bold sticky bottom-0">
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm border-r border-slate-200 last:border-r-0 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                    style={{ minWidth: col.width || '120px' }}
                  >
                    {colIdx === 0 ? (
                      <span className="text-green-900">{sumRowLabel}</span>
                    ) : totalSums[col.key] !== undefined ? (
                      <span className="text-green-900">
                        {col.format ? col.format(totalSums[col.key]) : formatNumber(totalSums[col.key], 0)}
                      </span>
                    ) : (
                      ''
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Statistik Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Zeigt {data.length} von {data.length} Einträgen</span>
        
        {/* Legende für Farbkodierung (nur wenn dateColumnKey gesetzt ist) */}
        {dateColumnKey && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Wochenende</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Deutscher Feiertag</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
              <span>Chinesischer Feiertag</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Formel-Karte Komponente
 * Zeigt wichtige Formeln mit Erklärung - COLLAPSIBLE by default
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
    <CollapsibleInfo
      title={title}
      variant="info"
      icon={<Info className="h-4 w-4" />}
      defaultOpen={false}
    >
      <div className="space-y-3">
        <div className="bg-white rounded px-3 py-2 font-mono text-sm text-blue-800 border border-blue-200">
          {formula}
        </div>
        <p className="text-sm text-blue-800">{description}</p>
        {example && (
          <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-800">
            <strong>Beispiel:</strong> {example}
          </div>
        )}
      </div>
    </CollapsibleInfo>
  )
}
