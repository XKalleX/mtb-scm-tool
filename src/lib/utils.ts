import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * ========================================
 * UTILITY-FUNKTIONEN
 * ========================================
 * 
 * Allgemeine Hilfs-Funktionen für das MTB SCM Tool
 * - Formatierung (Zahlen, Währung, Datum)
 * - Datum-Berechnungen
 * - Array-Operationen
 */

// ==========================================
// CSS & STYLING
// ==========================================

/**
 * Kombiniert Tailwind CSS Klassen intelligent
 * @param inputs - CSS Klassen
 * @returns Kombinierte Klassen
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==========================================
// FORMATIERUNG
// ==========================================

/**
 * Formatiert Zahlen im deutschen Format (z.B. 1.234,56)
 * @param value - Numerischer Wert
 * @param decimals - Anzahl Dezimalstellen (default: 2)
 * @returns Formatierte Zahl als String
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formatiert Währung im deutschen Format (z.B. 1.234,56 €)
 * @param value - Numerischer Wert
 * @returns Formatierte Währung als String
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

/**
 * Formatiert Prozente im deutschen Format (z.B. 12,5 %)
 * @param value - Numerischer Wert (0-100)
 * @param decimals - Anzahl Dezimalstellen (default: 1)
 * @returns Formatierter Prozentsatz als String
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)} %`
}

/**
 * Formatiert Datum im deutschen Format (z.B. 15.04.2027)
 * @param date - Date Objekt
 * @returns Formatiertes Datum als String
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

/**
 * Konvertiert ein Date-Objekt in einen lokalen ISO-Format String (YYYY-MM-DD)
 * 
 * WICHTIG: Diese Funktion vermeidet Timezone-Probleme!
 * - new Date(2027, 0, 1).toISOString().split('T')[0] würde in UTC+1 "2026-12-31" ergeben!
 * - Diese Funktion gibt korrekt "2027-01-01" zurück
 * 
 * @param date - Date Objekt
 * @returns Datum als String im Format YYYY-MM-DD (lokale Zeit, nicht UTC!)
 */
export function toLocalISODateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formatiert Datum mit Wochentag (z.B. Montag, 15.04.2027)
 * @param date - Date Objekt
 * @returns Formatiertes Datum mit Wochentag als String
 */
export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

// ==========================================
// DATUM-BERECHNUNGEN
// ==========================================

/**
 * Berechnet die Anzahl der Tage zwischen zwei Daten
 * @param from - Start-Datum
 * @param to - End-Datum
 * @returns Anzahl Tage
 */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const utc2 = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.floor((utc2 - utc1) / msPerDay)
}

/**
 * Fügt Tage zu einem Datum hinzu
 * @param date - Ausgangs-Datum
 * @param days - Anzahl Tage (positiv oder negativ)
 * @returns Neues Datum
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Prüft ob ein Datum ein Wochenende ist
 * @param date - Zu prüfendes Datum
 * @returns True wenn Samstag oder Sonntag
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Gibt den deutschen Wochentag zurück
 * @param date - Datum
 * @returns Wochentag als String (z.B. "Montag")
 */
export function getGermanWeekday(date: Date): string {
  const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  return weekdays[date.getDay()]
}

/**
 * Gibt den Tag im Jahr zurück (1-365/366)
 * @param date - Datum
 * @returns Tag-Nummer im Jahr
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

/**
 * Gibt die Kalenderwoche zurück (ISO 8601)
 * @param date - Datum
 * @returns Kalenderwoche (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ==========================================
// MATHEMATIK
// ==========================================

/**
 * Rundet eine Zahl kaufmännisch
 * @param value - Zu rundender Wert
 * @param decimals - Anzahl Dezimalstellen (default: 0)
 * @returns Gerundeter Wert
 */
export function roundTo(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Begrenzt einen Wert zwischen Min und Max
 * @param value - Wert
 * @param min - Minimum
 * @param max - Maximum
 * @returns Begrenzter Wert
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ==========================================
// ARRAY-OPERATIONEN
// ==========================================

/**
 * Berechnet den Mittelwert eines Arrays
 * @param values - Array von Zahlen
 * @returns Durchschnitt
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Summiert ein Array von Zahlen
 * @param values - Array von Zahlen
 * @returns Summe
 */
export function sum(values: number[]): number {
  return values.reduce((total, val) => total + val, 0)
}

/**
 * Gruppiert ein Array nach einem Key
 * @param array - Input Array
 * @param keyGetter - Funktion die den Key zurückgibt
 * @returns Gruppiertes Object
 */
export function groupBy<T>(
  array: T[],
  keyGetter: (item: T) => string
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyGetter(item)
    if (!result[key]) {
      result[key] = []
    }
    result[key].push(item)
    return result
  }, {} as Record<string, T[]>)
}

/**
 * Generiert eine eindeutige ID
 * @returns Eindeutige ID als String
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}