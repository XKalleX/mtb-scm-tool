/**
 * ========================================
 * EXPORT-FUNKTIONEN
 * ========================================
 * 
 * Hilfsfunktionen für den Export von Daten:
 * - CSV-Export
 * - JSON-Download
 * - Kopieren in Zwischenablage
 */

/**
 * Exportiert Daten als CSV-Datei
 * @param data - Array von Objekten zum Exportieren
 * @param filename - Name der Datei (ohne .csv)
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('Keine Daten zum Exportieren')
    return
  }

  // CSV Header aus dem ersten Objekt erstellen
  const headers = Object.keys(data[0])
  const csvContent = [
    // Header-Zeile
    headers.join(';'),
    // Datenzeilen
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Zahlen und Texte escapen für CSV
        if (typeof value === 'string' && value.includes(';')) {
          return `"${value}"`
        }
        return value
      }).join(';')
    )
  ].join('\n')

  // CSV-Datei herunterladen
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
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
