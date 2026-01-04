/**
 * ========================================
 * BENACHRICHTIGUNGS-SYSTEM
 * ========================================
 * 
 * Einfaches Benachrichtigungssystem für User-Feedback
 * Als Ersatz für browser alert()
 */

/**
 * Zeigt eine Erfolgs-Benachrichtigung
 * @param message - Nachricht
 */
export function showSuccess(message: string) {
  showNotification(message, 'success')
}

/**
 * Zeigt eine Fehler-Benachrichtigung
 * @param message - Fehlermeldung
 */
export function showError(message: string) {
  showNotification(message, 'error')
}

/**
 * Zeigt eine Info-Benachrichtigung
 * @param message - Info-Nachricht
 */
export function showInfo(message: string) {
  showNotification(message, 'info')
}

/**
 * Zeigt eine Warnung
 * @param message - Warnungs-Nachricht
 */
export function showWarning(message: string) {
  showNotification(message, 'warning')
}

/**
 * Interne Funktion zum Anzeigen einer Benachrichtigung
 * @param message - Nachricht
 * @param type - Typ der Benachrichtigung
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning') {
  // Erstelle Toast-Element
  const toast = document.createElement('div')
  toast.className = `fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 max-w-md animate-slide-up`
  
  // Farben je nach Typ
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-orange-600'
  }
  
  toast.classList.add(colors[type])
  toast.textContent = message
  
  // Füge zum DOM hinzu
  document.body.appendChild(toast)
  
  // Automatisch nach 3 Sekunden entfernen
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    toast.style.transition = 'all 0.3s ease-out'
    
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}
