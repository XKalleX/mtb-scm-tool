/**
 * ========================================
 * EXPORT-FUNKTIONEN
 * ========================================
 * 
 * Hilfsfunktionen für den Export von Daten:
 * - CSV-Export (Semikolon-getrennt, Deutsche Excel-Kompatibilität)
 * - JSON-Download (Formatiert, Human-Readable)
 * - XLSX-Export (Echtes Excel-Format mit Formatierung)
 * - Kopieren in Zwischenablage
 * 
 * ✅ VOLLSTÄNDIGER DATENUMFANG: Alle Funktionen exportieren ALLE Daten
 * ✅ KEINE FILTERUNG: Keine automatische Entfernung von Zeilen
 * ✅ TROUBLESHOOTING: Maximaler Datenumfang für Analysen
 */

import ExcelJS from 'exceljs'

/**
 * Exportiert Daten als CSV-Datei
 * 
 * ✅ UTF-8 mit BOM: Excel-kompatibel, korrekte Umlaute/Emojis
 * ✅ Semikolon-getrennt: Deutsche Excel-Standard
 * ✅ Quoting: Automatisch bei Sonderzeichen
 * 
 * @param data - Array von Objekten zum Exportieren
 * @param filename - Name der Datei (ohne .csv)
 * @param options - Optional: cleanEmojis (entfernt Emojis für bessere Kompatibilität)
 */
export function exportToCSV(
  data: any[], 
  filename: string,
  options: { cleanEmojis?: boolean } = {}
) {
  if (!data || data.length === 0) {
    console.warn('Keine Daten zum Exportieren')
    return
  }

  // CSV Header aus dem ersten Objekt erstellen
  const headers = Object.keys(data[0])
  
  // Hilfsfunktion: Bereinigt Werte für CSV (optional Emojis entfernen)
  const cleanValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    
    let strValue = String(value)
    
    // Optional: Entferne Emojis und ersetze sie durch Text
    if (options.cleanEmojis) {
      strValue = strValue
        .replace(/🟢/g, 'OK')
        .replace(/🟡/g, 'Warnung')
        .replace(/🔴/g, 'Kritisch')
        .replace(/⚠️/g, 'Achtung')
        .replace(/✅/g, 'Ja')
        .replace(/❌/g, 'Nein')
        .replace(/✓/g, 'Ja')
        .replace(/✗/g, 'Nein')
        .replace(/📦/g, 'Paket')
        .replace(/🚢/g, 'Schiff')
        .replace(/🚚/g, 'LKW')
        // Entferne verbleibende Emojis (Unicode ranges)
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    }
    
    // Quote wenn nötig (Semikolon, Newline, Quote)
    if (strValue.includes(';') || strValue.includes('\n') || strValue.includes('"')) {
      // Escape existierende Quotes
      strValue = strValue.replace(/"/g, '""')
      return `"${strValue}"`
    }
    
    return strValue
  }
  
  const csvContent = [
    // Header-Zeile
    headers.map(h => cleanValue(h)).join(';'),
    // Datenzeilen
    ...data.map(row => 
      headers.map(header => cleanValue(row[header])).join(';')
    )
  ].join('\n')

  // ✅ UTF-8 BOM voranstellen für Excel-Kompatibilität
  // BOM (Byte Order Mark) = \uFEFF signalisiert Excel, dass UTF-8 verwendet wird
  const csvWithBOM = '\uFEFF' + csvContent

  // CSV-Datei herunterladen mit korrektem MIME-Type
  downloadFile(csvWithBOM, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

/**
 * Exportiert Daten als JSON-Datei
 * @param data - Daten zum Exportieren (Object oder Array)
 * @param filename - Name der Datei (ohne .json)
 */
export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${filename}.json`, 'application/json')
}

/**
 * Hilfsfunktion zum Herunterladen einer Datei
 * @param content - Dateiinhalt
 * @param filename - Dateiname
 * @param mimeType - MIME-Type der Datei
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Kopiert Text in die Zwischenablage
 * @param text - Zu kopierender Text
 * @returns Promise<boolean> - true wenn erfolgreich
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Moderne Clipboard API (bevorzugt)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // Fallback für ältere Browser oder unsichere Kontexte
    // HINWEIS: document.execCommand('copy') ist deprecated, aber notwendig als Fallback
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    } catch (err) {
      document.body.removeChild(textArea)
      console.error('Fallback: Fehler beim Kopieren:', err)
      return false
    }
  } catch (error) {
    console.error('Fehler beim Kopieren:', error)
    return false
  }
}

/**
 * Konvertiert Tabellendaten in Excel-kompatibles Format
 * @param data - Array von Objekten
 * @returns Tab-separierter String
 */
export function formatForExcel(data: any[]): string {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  return [
    headers.join('\t'),
    ...data.map(row => 
      headers.map(h => row[h]).join('\t')
    )
  ].join('\n')
}

/**
 * Exportiert Daten als XLSX-Datei (Echtes Excel-Format)
 * 
 * Features:
 * - Automatische Spaltenbreiten
 * - Header-Formatierung (Fett, Hintergrund)
 * - Zahlenformatierung
 * - Freeze Panes (erste Zeile fixiert)
 * - Filter-Funktionalität
 * 
 * @param data - Array von Objekten zum Exportieren
 * @param filename - Name der Datei (ohne .xlsx)
 * @param options - Optional: Zusätzliche Optionen
 */
export async function exportToXLSX(
  data: any[], 
  filename: string,
  options: {
    sheetName?: string
    title?: string
    author?: string
    freezeHeader?: boolean
    autoFilter?: boolean
    columnWidths?: Record<string, number>
  } = {}
) {
  if (!data || data.length === 0) {
    console.warn('Keine Daten zum Exportieren')
    return
  }

  try {
    // Erstelle Workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = options.author || 'MTB SCM Tool'
    workbook.created = new Date()
    
    // Erstelle Worksheet
    const worksheet = workbook.addWorksheet(options.sheetName || 'Daten')
    
    // Extrahiere Header aus erstem Objekt
    const headers = Object.keys(data[0])
    
    // Füge Titel hinzu (optional)
    let startRow = 1
    if (options.title) {
      const titleRow = worksheet.addRow([options.title])
      titleRow.font = { bold: true, size: 14 }
      worksheet.mergeCells(1, 1, 1, headers.length)
      startRow = 2
    }
    
    // Füge Header-Zeile hinzu
    const headerRow = worksheet.addRow(headers)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2EFDA' } // Hellgrün wie Excel
    }
    headerRow.border = {
      bottom: { style: 'thin' }
    }
    
    // Füge Datenzeilen hinzu
    data.forEach(row => {
      const values = headers.map(h => {
        const value = row[h]
        // Datum-Objekte als ISO-String
        if (value instanceof Date) {
          return value.toISOString().split('T')[0]
        }
        return value
      })
      worksheet.addRow(values)
    })
    
    // Setze Spaltenbreiten
    worksheet.columns.forEach((column, index) => {
      const header = headers[index]
      
      // Custom Breite wenn angegeben
      if (options.columnWidths && options.columnWidths[header]) {
        column.width = options.columnWidths[header]
      } else {
        // Auto-Berechnung basierend auf Inhalt
        let maxLength = header.length
        data.slice(0, 100).forEach(row => { // Sample erste 100 Zeilen
          const value = String(row[header] || '')
          maxLength = Math.max(maxLength, value.length)
        })
        column.width = Math.min(Math.max(maxLength + 2, 10), 50)
      }
    })
    
    // Freeze Panes (erste Zeile fixiert)
    if (options.freezeHeader !== false) {
      worksheet.views = [
        { state: 'frozen', ySplit: startRow + 1 }
      ]
    }
    
    // Auto-Filter aktivieren
    if (options.autoFilter !== false) {
      worksheet.autoFilter = {
        from: { row: startRow + 1, column: 1 },
        to: { row: startRow + data.length, column: headers.length }
      }
    }
    
    // Generiere Buffer
    const buffer = await workbook.xlsx.writeBuffer()
    
    // Download
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log(`✅ XLSX Export erfolgreich: ${filename}.xlsx (${data.length} Zeilen)`)
  } catch (error) {
    console.error('❌ Fehler beim XLSX-Export:', error)
    throw error
  }
}

/**
 * Exportiert mehrere Datensätze als Multi-Sheet XLSX-Datei
 * 
 * @param sheets - Array von Sheets mit Name und Daten
 * @param filename - Name der Datei (ohne .xlsx)
 * @param options - Optional: Zusätzliche Optionen
 */
export async function exportToMultiSheetXLSX(
  sheets: Array<{
    name: string
    data: any[]
    title?: string
    columnWidths?: Record<string, number>
  }>,
  filename: string,
  options: {
    author?: string
    freezeHeader?: boolean
    autoFilter?: boolean
  } = {}
) {
  if (!sheets || sheets.length === 0) {
    console.warn('Keine Sheets zum Exportieren')
    return
  }

  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = options.author || 'MTB SCM Tool'
    workbook.created = new Date()
    
    // Erstelle jedes Sheet
    for (const sheet of sheets) {
      if (!sheet.data || sheet.data.length === 0) continue
      
      const worksheet = workbook.addWorksheet(sheet.name)
      const headers = Object.keys(sheet.data[0])
      
      // Titel (optional)
      let startRow = 1
      if (sheet.title) {
        const titleRow = worksheet.addRow([sheet.title])
        titleRow.font = { bold: true, size: 14 }
        worksheet.mergeCells(1, 1, 1, headers.length)
        startRow = 2
      }
      
      // Header
      const headerRow = worksheet.addRow(headers)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
      }
      
      // Daten
      sheet.data.forEach(row => {
        const values = headers.map(h => {
          const value = row[h]
          if (value instanceof Date) {
            return value.toISOString().split('T')[0]
          }
          return value
        })
        worksheet.addRow(values)
      })
      
      // Spaltenbreiten
      worksheet.columns.forEach((column, index) => {
        const header = headers[index]
        if (sheet.columnWidths && sheet.columnWidths[header]) {
          column.width = sheet.columnWidths[header]
        } else {
          let maxLength = header.length
          sheet.data.slice(0, 100).forEach(row => {
            const value = String(row[header] || '')
            maxLength = Math.max(maxLength, value.length)
          })
          column.width = Math.min(Math.max(maxLength + 2, 10), 50)
        }
      })
      
      // Freeze & Filter
      if (options.freezeHeader !== false) {
        worksheet.views = [{ state: 'frozen', ySplit: startRow + 1 }]
      }
      if (options.autoFilter !== false) {
        worksheet.autoFilter = {
          from: { row: startRow + 1, column: 1 },
          to: { row: startRow + sheet.data.length, column: headers.length }
        }
      }
    }
    
    // Download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log(`✅ Multi-Sheet XLSX Export erfolgreich: ${filename}.xlsx (${sheets.length} Sheets)`)
  } catch (error) {
    console.error('❌ Fehler beim Multi-Sheet XLSX-Export:', error)
    throw error
  }
}
