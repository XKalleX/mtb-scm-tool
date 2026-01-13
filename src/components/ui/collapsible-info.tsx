'use client'

/**
 * ========================================
 * COLLAPSIBLE INFO COMPONENT
 * ========================================
 * 
 * Einklappbare Informationsbox für Erklärungen und Hilfestellungen
 * - Standardmäßig eingeklappt (collapsed=true)
 * - Smooth Animation
 * - Verschiedene Varianten (info, warning, success)
 */

import { ReactNode, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './button'

export interface CollapsibleInfoProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  variant?: 'info' | 'warning' | 'success' | 'purple'
  icon?: ReactNode
}

/**
 * Einklappbare Informationsbox
 * Perfekt für Erklärungen, Formeln und Hilfestellungen
 */
export function CollapsibleInfo({
  title,
  children,
  defaultOpen = false,
  variant = 'info',
  icon
}: CollapsibleInfoProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const variantClasses = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200',
    success: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200'
  }

  const variantTextClasses = {
    info: 'text-blue-900',
    warning: 'text-orange-900',
    success: 'text-green-900',
    purple: 'text-purple-900'
  }

  return (
    <div className={`border rounded-lg ${variantClasses[variant]}`}>
      <Button
        variant="ghost"
        className={`w-full justify-between hover:bg-transparent ${variantTextClasses[variant]} px-4 py-3`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
