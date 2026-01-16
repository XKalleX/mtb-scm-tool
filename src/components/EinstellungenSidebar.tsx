'use client'

/**
 * ========================================
 * EINSTELLUNGEN SIDEBAR (GLOBAL)
 * ========================================
 * 
 * Globally accessible settings sidebar:
 * - Floating button available on all pages
 * - Positioned above the scenario button
 * - Wide sidebar to accommodate all settings
 * - Reuses EinstellungenPanel component
 */

import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import { Settings } from 'lucide-react'
import { EinstellungenPanel } from '@/components/EinstellungenPanel'

/**
 * Floating button that opens the settings sidebar
 * Positioned above the scenario button with higher z-index
 */
export function EinstellungenFloatingButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="fixed right-6 bottom-24 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          aria-label="Einstellungen öffnen"
        >
          <Settings className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Globale Einstellungen</SheetTitle>
          <SheetDescription>
            Passen Sie alle Konfigurationen an. Änderungen wirken sich auf alle Module aus.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <EinstellungenPanel />
        </div>
      </SheetContent>
    </Sheet>
  )
}
