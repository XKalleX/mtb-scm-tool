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

/**
 * Varianten für CollapsibleInfo Komponente
 */
export type CollapsibleInfoVariant = 'info' | 'warning' | 'success' | 'purple' | 'default' | 'destructive'

export interface CollapsibleInfoProps {
  title: string | ReactNode
  children: ReactNode
  defaultOpen?: boolean
  variant?: CollapsibleInfoVariant
  icon?: ReactNode
  className?: string
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
  icon,
  className = ''
}: CollapsibleInfoProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const variantClasses = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200',
    success: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    default: 'bg-slate-50 border-slate-200',
    destructive: 'bg-red-50 border-red-200'
  }

  const variantTextClasses = {
    info: 'text-blue-900',
    warning: 'text-orange-900',
    success: 'text-green-900',
    purple: 'text-purple-900',
    default: 'text-slate-900',
    destructive: 'text-red-900'
  }

  return (
    <div className={`border rounded-lg ${variantClasses[variant]} ${className}`}>
      <Button
        variant="ghost"
        className={`w-full justify-between hover:bg-transparent ${variantTextClasses[variant]} px-4 py-3 h-auto`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {typeof title === 'string' ? (
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-sm">{title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {icon}
            {title}
          </div>
        )}
        {isOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
      </Button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
