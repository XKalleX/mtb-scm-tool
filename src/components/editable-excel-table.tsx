'use client'

/**
 * ========================================
 * EDITABLE EXCEL-LIKE TABLE
 * ========================================
 * 
 * Excel-ähnliche Tabelle mit INLINE-EDITING:
 * - Double-Click zum Bearbeiten von Zellen
 * - Validierung (keine negativen Werte, Zahlenformat)
 * - Globale Änderungen via Callbacks
 * - Frozen Zone Support (Vergangenheit ausgegraut)
 * - Alle Features von ExcelTable + Editing
 * 
 * VERWENDUNG:
 * - editableColumns: String-Array der editierbaren Spalten-Keys
 * - onCellChange: Callback wenn Zelle geändert wird
 * - frozenDate: Optional - Datum ab dem Zellen nicht editierbar sind (Frozen Zone)
 * - dateColumnKey: Spalte mit Datum für Frozen Zone Check
 * 
 * ANFORDERUNG A11: Frozen Zone Implementation
 */

import React, { useState, useRef, useEffect } from 'react'
import { Info, Lock } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { getDateRowBackgroundClasses, getDateTooltip } from '@/lib/date-classification'

interface ExcelTableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
  formula?: string
  format?: (value: any) => string
  sumable?: boolean
  sumLabel?: string
  editable?: boolean // NEU: Spalte ist editierbar (überschreibt globale editableColumns)
  validate?: (value: any, row: any) => string | null // NEU: Custom Validierung
}

interface EditableCellData {
  rowIndex: number
  columnKey: string
  value: any
}

interface EditableExcelTableProps {
  columns: ExcelTableColumn[]
  data: any[]
  maxHeight?: string
  showFormulas?: boolean
  title?: string
  description?: string
  showSums?: boolean
  sumRowLabel?: string
  groupBy?: string
  subtotalLabel?: string
  useAverage?: boolean
  dateColumnKey?: string
  highlightRow?: (row: any) => { color: string; tooltip?: string } | null
  
  // NEU: Editing-Features
  editableColumns?: string[] // Welche Spalten sind editierbar
  onCellChange?: (rowIndex: number, columnKey: string, newValue: any, oldValue: any) => void
  frozenDate?: Date // Datum für Frozen Zone (Vergangenheit nicht editierbar)
  showEditIndicator?: boolean // Zeige Indikator für geänderte Zellen
  changedCells?: Set<string> // Set von "rowIndex-columnKey" für geänderte Zellen
}

/**
 * Prüft ob eine Zeile in der Frozen Zone liegt (Vergangenheit)
 */
function isRowFrozen(row: any, dateColumnKey: string | undefined, frozenDate: Date | undefined): boolean {
  if (!frozenDate || !dateColumnKey) return false
  
  const rowDate = row[dateColumnKey]
  if (!rowDate) return false
  
  const date = rowDate instanceof Date ? rowDate : new Date(rowDate)
  return date < frozenDate
}

/**
 * Editable Excel-Tabelle mit Inline-Editing via Double-Click
 */
export default function EditableExcelTable({
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
  dateColumnKey,
  highlightRow,
  editableColumns = [],
  onCellChange,
  frozenDate,
  showEditIndicator = true,
  changedCells = new Set()
}: EditableExcelTableProps) {
  const [selectedFormula, setSelectedFormula] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<EditableCellData | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  /**
   * Fokussiert Input-Feld wenn Editing startet
   */
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])
  
  /**
   * Startet Editing einer Zelle (Double-Click)
   * 
   * Prüft ob die Zelle editierbar ist (Spalte in editableColumns + nicht in Frozen Zone)
   * und initialisiert den Editing-Modus mit dem aktuellen Wert.
   * 
   * @param rowIndex - Index der Zeile in der data-Array
   * @param columnKey - Spalten-Key (z.B. 'planMenge', 'istMenge')
   * @param currentValue - Aktueller Wert der Zelle
   * @param row - Komplette Zeilen-Daten für Validierung (z.B. Datum-Check)
   */
  const handleCellDoubleClick = (rowIndex: number, columnKey: string, currentValue: any, row: any) => {
    // Prüfe ob Spalte editierbar ist
    const column = columns.find(c => c.key === columnKey)
    const isEditable = column?.editable !== false && editableColumns.includes(columnKey)
    
    if (!isEditable) return
    
    // Prüfe Frozen Zone
    if (isRowFrozen(row, dateColumnKey, frozenDate)) {
      return // Frozen Rows sind nicht editierbar
    }
    
    setEditingCell({ rowIndex, columnKey, value: currentValue })
    setEditValue(String(currentValue ?? ''))
    setValidationError(null)
  }
  
  /**
   * Validiert und speichert Änderung
   */
  const handleSaveEdit = () => {
    if (!editingCell) return
    
    const column = columns.find(c => c.key === editingCell.columnKey)
    const row = data[editingCell.rowIndex]
    
    // Parse Wert (angenommen: meistens Zahlen)
    let newValue: string | number = editValue.trim()
    
    // Versuche als Zahl zu parsen
    if (!isNaN(Number(newValue))) {
      newValue = Number(newValue)
    }
    
    // Standard-Validierung: Keine negativen Zahlen für Produktionswerte
    if (typeof newValue === 'number' && newValue < 0) {
      setValidationError('Negative Werte sind nicht erlaubt')
      return
    }
    
    // Custom Validierung wenn vorhanden
    if (column?.validate) {
      const error = column.validate(newValue, row)
      if (error) {
        setValidationError(error)
        return
      }
    }
    
    // Callback aufrufen
    if (onCellChange) {
      onCellChange(editingCell.rowIndex, editingCell.columnKey, newValue, editingCell.value)
    }
    
    // Editing beenden
    setEditingCell(null)
    setEditValue('')
    setValidationError(null)
  }
  
  /**
   * Bricht Editing ab
   */
  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
    setValidationError(null)
  }
  
  /**
   * Keyboard-Handler für Input
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }
  
  /**
   * Berechnet Summen oder Durchschnitte für numerische Spalten
   */
  const calculateSums = (dataToSum: any[]) => {
    const sums: Record<string, number> = {}
    
    columns.forEach(col => {
      if (col.sumable !== false) {
        const values = dataToSum.map(row => row[col.key])
        const numericValues = values.filter(v => typeof v === 'number')
        
        if (numericValues.length > 0) {
          const sum = numericValues.reduce((sum, val) => sum + val, 0)
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
  
  /**
   * Prüft ob eine Zelle editierbar ist
   */
  const isCellEditable = (row: any, columnKey: string): boolean => {
    const column = columns.find(c => c.key === columnKey)
    const isEditable = column?.editable !== false && editableColumns.includes(columnKey)
    const isFrozen = isRowFrozen(row, dateColumnKey, frozenDate)
    
    return isEditable && !isFrozen
  }
  
  /**
   * Rendert Zellen-Inhalt (normal oder editierbar)
   */
  const renderCellContent = (row: any, rowIndex: number, column: ExcelTableColumn) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === column.key
    const cellKey = `${rowIndex}-${column.key}`
    const hasChanged = changedCells.has(cellKey)
    const editable = isCellEditable(row, column.key)
    const frozen = isRowFrozen(row, dateColumnKey, frozenDate)
    
    // Editing-Modus: Input-Feld
    if (isEditing) {
      return (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            className={`
              w-full px-2 py-1 border-2 rounded
              ${validationError ? 'border-red-500' : 'border-blue-500'}
              focus:outline-none focus:ring-2 focus:ring-blue-300
            `}
          />
          {validationError && (
            <div className="absolute top-full left-0 mt-1 bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded text-xs whitespace-nowrap z-20">
              {validationError}
            </div>
          )}
        </div>
      )
    }
    
    // Normaler Modus: Formatierter Wert
    const displayValue = column.format ? column.format(row[column.key]) : row[column.key]
    
    return (
      <div className={`
        flex items-center gap-2
        ${editable ? 'cursor-pointer hover:bg-blue-50' : ''}
        ${hasChanged && showEditIndicator ? 'bg-yellow-100' : ''}
        ${frozen ? 'text-gray-400' : ''}
        px-2 py-1 rounded transition-colors
      `}>
        {frozen && <Lock className="h-3 w-3 text-gray-400" />}
        <span>{displayValue}</span>
      </div>
    )
  }

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
      
      {/* Editing-Hinweis */}
      {editableColumns.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Inline-Editing:</strong> Doppelklick auf editierbare Zellen zum Bearbeiten. 
              Enter = Speichern, Escape = Abbrechen.
              {frozenDate && <span className="ml-2">🔒 Vergangenheit ist gesperrt (Frozen Zone).</span>}
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
              {columns.map((col) => (
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
                    const absoluteRowIndex = data.indexOf(row)
                    rowCounter++
                    
                    // Bestimme Hintergrundfarbe
                    let bgClasses = rowCounter % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                    let tooltipText: string | undefined = undefined
                    
                    // Frozen Zone Styling
                    const isFrozen = isRowFrozen(row, dateColumnKey, frozenDate)
                    if (isFrozen) {
                      bgClasses = 'bg-gray-100'
                      tooltipText = 'Frozen Zone - Vergangenheit nicht editierbar'
                    }
                    
                    // Prüfe ob Zeile hervorgehoben werden soll
                    const highlightInfo = highlightRow ? highlightRow(row) : null
                    if (highlightInfo && !isFrozen) {
                      bgClasses = highlightInfo.color
                      tooltipText = highlightInfo.tooltip
                    } else if (dateColumnKey && row[dateColumnKey] != null && !isFrozen) {
                      const date = row[dateColumnKey] instanceof Date 
                        ? row[dateColumnKey] 
                        : new Date(row[dateColumnKey])
                      
                      if (date instanceof Date && !isNaN(date.getTime())) {
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
                            className={`px-2 py-2 text-sm border-r border-slate-200 last:border-r-0 ${
                              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                            }`}
                            style={{ minWidth: col.width || '120px' }}
                            onDoubleClick={() => handleCellDoubleClick(absoluteRowIndex, col.key, row[col.key], row)}
                          >
                            {renderCellContent(row, absoluteRowIndex, col)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  
                  {/* Zwischensumme nach jeder Gruppe */}
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
        
        {/* Legende */}
        <div className="flex items-center gap-4 text-xs">
          {showEditIndicator && changedCells.size > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Geändert ({changedCells.size})</span>
            </div>
          )}
          {frozenDate && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Frozen Zone</span>
            </div>
          )}
          {dateColumnKey && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Wochenende</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                <span>Feiertag</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
