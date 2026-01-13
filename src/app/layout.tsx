import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import { Package, LineChart, Download, Factory, BarChart3 } from 'lucide-react'
import { SzenarienProvider } from '@/contexts/SzenarienContext'
import { KonfigurationProvider } from '@/contexts/KonfigurationContext'
import { SzenarienFloatingButton } from '@/components/SzenarienSidebar'

export const metadata: Metadata = {
  title: 'MTB SCM Tool 2027 - Adventure Works AG (Code-Lösung)',
  description: 'Supply Chain Management System für Mountain Bike Produktion - Nur China-Lieferant, kein Outbound',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">
        <KonfigurationProvider>
        <SzenarienProvider>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b bg-white shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold">MTB Supply Chain 2027</h1>
                    <p className="text-sm text-muted-foreground">
                      Adventure Works AG - HAW Hamburg WI3 (Code-Lösung)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <div className="font-medium">Code-Ermäßigung:</div>
                    <div className="text-muted-foreground">Nur China • Kein Outbound • Kein Solver</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="border-b bg-slate-50">
            <div className="container mx-auto px-4">
              <div className="flex space-x-1">
                <NavLink href="/" icon={<BarChart3 />} label="Dashboard" />
                <NavLink href="/oem-programm" icon={<LineChart />} label="OEM Programm" />
                <NavLink href="/inbound" icon={<Download />} label="Inbound China" />
                <NavLink href="/produktion" icon={<Factory />} label="Produktion" />
                <NavLink href="/reporting" icon={<BarChart3 />} label="Reporting" />
                {/* Szenarien nur über Sidebar (Floating Button) erreichbar - keine eigene Seite mehr */}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 bg-slate-50">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t bg-white py-4">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <div>© 2025 MTB Supply Chain Management Tool - HAW Hamburg WI3 Projekt</div>
              <div className="mt-1">
                Team: Pascal Wagner, Da Yeon Kang, Shauna Ré Erfurth, Taha Wischmann
              </div>
            </div>
          </footer>

          {/* Floating Scenario Button - Available on all pages */}
          <SzenarienFloatingButton />
        </div>
        </SzenarienProvider>
        </KonfigurationProvider>
      </body>
    </html>
  )
}

function NavLink({ 
  href, 
  icon, 
  label 
}: { 
  href: string
  icon: React.ReactNode
  label: string 
}) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary"
    >
      <span className="h-4 w-4">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}