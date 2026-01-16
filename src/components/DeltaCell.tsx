'use client'

/**
 * ========================================
 * DELTA CELL KOMPONENTE
 * ========================================
 * 
 * Wiederverwendbare Komponente zur Anzeige von Differenzen
 * zwischen Szenario- und Baseline-Werten.
 * 
 * Zeigt:
 * - Aktueller Wert
 * - Delta als +X oder -X
 * - Farbcodierung (grün = positiv, rot = negativ)
 * 
 * VERWENDUNG:
 * - In allen Tabellen mit Szenario-Daten
 * - Macht Änderungen sofort sichtbar
 */

import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface DeltaCellProps {
  /**
   * Der aktuelle Wert (mit Szenario)
   */
  value: number
  
  /**
   * Die Differenz zum Baseline (Szenario - Baseline)
   */
  delta: number
  
  /**
   * Format-Optionen
   */
  format?: {
    decimals?: number      // Nachkommastellen
    suffix?: string        // Suffix (z.B. ' Bikes', ' %')
    prefix?: string        // Prefix (z.B. '€')
  }
  
  /**
   * Inverse Logik (z.B. für Durchlaufzeit: weniger = besser)
   */
  inverseLogic?: boolean
  
  /**
   * Zeige Delta nur wenn es signifikant ist (> threshold)
   */
  threshold?: number
  
  /**
   * Kompakte Darstellung (nur Delta, kein Wert)
   */
  compact?: boolean
  
  /**
   * Ausrichtung
   */
  align?: 'left' | 'center' | 'right'
  
  /**
   * CSS Klasse
   */
  className?: string
}

/**
 * DeltaCell - Zeigt einen Wert mit Szenario-Delta an
 * 
 * @example
 * <DeltaCell value={1500} delta={+50} format={{ suffix: ' Bikes' }} />
 * // Zeigt: "1.500 Bikes +50"
 * 
 * <DeltaCell value={85} delta={-5} format={{ suffix: '%' }} inverseLogic={true} />
 * // Zeigt: "85% -5" (rot, weil weniger = schlecht für diesen Wert)
 */
export function DeltaCell({
  value,
  delta,
  format = {},
  inverseLogic = false,
  threshold = 0,
  compact = false,
  align = 'right',
  className
}: DeltaCellProps) {
  const { decimals = 0, suffix = '', prefix = '' } = format
  
  // Validierung: Prüfe ob value eine gültige Zahl ist
  if (typeof value !== 'number' || isNaN(value)) {
    return <span className={cn('text-muted-foreground', className)}>N/A</span>
  }
  
  // Formatiere den Hauptwert
  const formattedValue = decimals > 0
    ? value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : value.toLocaleString('de-DE')
  
  // Validierung für Delta
  const safeDelta = typeof delta === 'number' && !isNaN(delta) ? delta : 0
  
  // Prüfe ob Delta signifikant ist
  const isDeltaSignificant = Math.abs(safeDelta) > threshold
  
  // Bestimme Farbe basierend auf Delta und Logik (verwende safeDelta)
  const isPositiveDelta = inverseLogic ? safeDelta < 0 : safeDelta > 0
  const isNegativeDelta = inverseLogic ? safeDelta > 0 : safeDelta < 0
  
  // Formatiere Delta
  const formatDelta = (d: number): string => {
    if (Math.abs(d) <= threshold) return '±0'
    const sign = d > 0 ? '+' : ''
    const formatted = decimals > 0
      ? d.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : d.toLocaleString('de-DE')
    return `${sign}${formatted}`
  }
  
  // CSS Klassen für Ausrichtung
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }
  
  // CSS Klassen für Delta-Farbe
  const deltaColorClass = isDeltaSignificant
    ? isPositiveDelta
      ? 'text-green-600'
      : isNegativeDelta
        ? 'text-red-600'
        : 'text-gray-500'
    : 'text-gray-400'
  
  // Kompakte Ansicht: Nur Delta
  if (compact) {
    return (
      <span className={cn(alignClasses[align], deltaColorClass, 'font-mono text-xs', className)}>
        {isDeltaSignificant ? formatDelta(safeDelta) : '—'}
      </span>
    )
  }
  
  return (
    <div className={cn('flex flex-col', alignClasses[align], className)}>
      {/* Hauptwert */}
      <span className="font-medium">
        {prefix}{formattedValue}{suffix}
      </span>
      
      {/* Delta (nur wenn signifikant) */}
      {isDeltaSignificant && (
        <span className={cn('text-xs font-mono flex items-center gap-0.5', deltaColorClass, align === 'right' && 'justify-end')}>
          {isPositiveDelta && <ArrowUp className="h-3 w-3" />}
          {isNegativeDelta && <ArrowDown className="h-3 w-3" />}
          {formatDelta(safeDelta)}
        </span>
      )}
    </div>
  )
}

/**
 * DeltaBadge - Kompaktes Badge für Delta-Anzeige
 * 
 * Ideal für Übersichtskarten und Dashboard-Elemente
 */
export function DeltaBadge({
  delta,
  suffix = '',
  inverseLogic = false,
  className
}: {
  delta: number
  suffix?: string
  inverseLogic?: boolean
  className?: string
}) {
  if (delta === 0) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        'bg-gray-100 text-gray-600',
        className
      )}>
        <Minus className="h-3 w-3" />
        ±0{suffix}
      </span>
    )
  }
  
  const isPositive = inverseLogic ? delta < 0 : delta > 0
  const sign = delta > 0 ? '+' : ''
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
      isPositive
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700',
      className
    )}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {sign}{delta.toLocaleString('de-DE')}{suffix}
    </span>
  )
}

/**
 * SzenarioHinweis - Zeigt an wenn ein Wert von Szenarien betroffen ist
 */
export function SzenarioHinweis({
  typ,
  notiz,
  className
}: {
  typ?: string
  notiz?: string
  className?: string
}) {
  if (!typ && !notiz) return null
  
  const getIcon = () => {
    switch (typ) {
      case 'marketingaktion': return '📈'
      case 'maschinenausfall': return '🔧'
      case 'wasserschaden': return '💧'
      case 'schiffsverspaetung': return '🚢'
      case 'materialmangel': return '⚠️'
      default: return '⚡'
    }
  }
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 text-xs text-orange-600',
        className
      )}
      title={notiz || typ}
    >
      {getIcon()} {notiz || typ}
    </span>
  )
}

/**
 * DeltaRow - Tabellen-Zeile mit integrierter Delta-Anzeige
 * 
 * Für komplexe Tabellen-Zeilen mit mehreren Spalten
 */
export function DeltaRow({
  isAffected,
  children,
  className
}: {
  isAffected: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <tr className={cn(
      isAffected && 'bg-orange-50 border-l-2 border-l-orange-400',
      className
    )}>
      {children}
    </tr>
  )
}

export default DeltaCell
