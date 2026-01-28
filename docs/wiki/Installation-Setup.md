# Installation & Setup

## 📋 Voraussetzungen

### System-Anforderungen

- **Node.js:** Version 23.0.0 oder höher
- **npm:** Version 10.0.0 oder höher (oder pnpm >= 8.0.0)
- **Git:** Für Repository-Klonen
- **Browser:** Chrome, Firefox, Safari oder Edge (neueste Version)
- **Betriebssystem:** Windows, macOS oder Linux

### Empfohlene Tools

- **VS Code:** Mit TypeScript- und React-Extensions
- **Node Version Manager (nvm):** Für einfaches Node.js-Versionsmanagement

---

## 🚀 Installation

### Schritt 1: Repository klonen

```bash
# HTTPS
git clone https://github.com/XKalleX/mtb-scm-tool.git
cd mtb-scm-tool

# Oder SSH
git clone git@github.com:XKalleX/mtb-scm-tool.git
cd mtb-scm-tool
```

### Schritt 2: Dependencies installieren

**Mit npm:**
```bash
npm install
```

**Mit pnpm (empfohlen, schneller):**
```bash
# pnpm installieren (falls noch nicht vorhanden)
npm install -g pnpm

# Dependencies installieren
pnpm install
```

**Mit yarn:**
```bash
yarn install
```

### Schritt 3: Development Server starten

**Mit npm:**
```bash
npm run dev
```

**Mit pnpm:**
```bash
pnpm dev
```

**Mit yarn:**
```bash
yarn dev
```

**Ausgabe:**
```
▲ Next.js 16.0.0
- Local:        http://localhost:3000
- Network:      http://192.168.1.10:3000

✓ Ready in 2.5s
```

### Schritt 4: Öffne im Browser

Navigiere zu: `http://localhost:3000`

**Fertig!** Das Dashboard sollte jetzt geladen werden.

---

## 🔧 Konfiguration

### JSON-Daten anpassen (optional)

Alle Stammdaten befinden sich in `/src/data/*.json`:

```bash
# Stammdaten
src/data/stammdaten.json          # Varianten, Jahresproduktion
src/data/saisonalitaet.json       # Monatliche Verteilung
src/data/lieferant-china.json     # Vorlaufzeit, Losgröße
src/data/stueckliste.json         # Sattel-Varianten
src/data/feiertage-*.json         # Feiertage
src/data/szenario-defaults.json   # Szenario-Parameter
```

**Beispiel: Jahresproduktion ändern**

```json
// src/data/stammdaten.json
{
  "jahresproduktion": {
    "gesamt": 370000  // ← Hier ändern (z.B. 400000)
  }
}
```

Nach Änderungen: **Server neu starten** (Ctrl+C → `npm run dev`)

Siehe auch: [SSOT](SSOT.md), [Datenmodell](Datenmodell.md)

### Umgebungsvariablen (optional)

Erstelle `.env.local` im Root-Verzeichnis:

```bash
# .env.local
NEXT_PUBLIC_APP_NAME="MTB Supply Chain Management"
NEXT_PUBLIC_BASE_YEAR=2027
```

---

## 🧪 Build & Test

### Production Build erstellen

```bash
npm run build
# oder
pnpm build
```

**Ausgabe:**
```
▲ Next.js 16.0.0
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (10/10)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    1.2 kB         85.3 kB
├ ○ /dashboard                           2.4 kB         87.5 kB
├ ○ /inbound                             3.1 kB         88.2 kB
├ ○ /produktion                          2.8 kB         87.9 kB
└ ...

Build completed in 12.4s
```

### Production Server starten

```bash
npm run start
# oder
pnpm start
```

Öffne: `http://localhost:3000`

### Linting

```bash
npm run lint
# oder
pnpm lint
```

---

## 🐳 Docker (Optional)

### Dockerfile

```dockerfile
# Dockerfile
FROM node:23-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:23-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:23-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mtb-scm:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./src/data:/app/src/data
    environment:
      - NODE_ENV=production
```

### Docker Commands

```bash
# Build Image
docker build -t mtb-scm-tool .

# Run Container
docker run -p 3000:3000 mtb-scm-tool

# Docker Compose
docker-compose up -d
```

---

## 🔍 Verzeichnisstruktur

```
mtb-scm-tool/
├── docs/
│   └── wiki/                # Wiki-Dokumentation
├── kontext/
│   ├── Aufgabenstellung.pdf # Originalaufgabe
│   └── Spezifikation_SSOT_MR.ts # Anforderungsdokumentation
├── public/                  # Statische Assets
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── dashboard/
│   │   ├── inbound/
│   │   ├── produktion/
│   │   └── ...
│   ├── components/         # React-Komponenten
│   │   ├── dashboard/
│   │   ├── editable-excel-table.tsx
│   │   └── ...
│   ├── contexts/           # React Contexts
│   │   ├── KonfigurationContext.tsx
│   │   └── SzenarienContext.tsx
│   ├── data/               # JSON-Stammdaten (SSOT!)
│   │   ├── stammdaten.json
│   │   ├── saisonalitaet.json
│   │   ├── lieferant-china.json
│   │   └── ...
│   └── lib/                # Business Logic
│       ├── calculations/   # Berechnungen
│       │   ├── zentrale-produktionsplanung.ts
│       │   ├── error-management.ts
│       │   ├── inbound-china.ts
│       │   ├── warehouse-management.ts
│       │   └── ...
│       └── helpers/        # Hilfsfunktionen
├── .gitignore
├── package.json
├── README.md
├── tsconfig.json
└── ...
```

---

## ❓ Troubleshooting

### Problem: "command not found: npm"

**Lösung:** Node.js installieren

```bash
# Windows: Installer von nodejs.org
# macOS: Homebrew
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_23.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Problem: "Port 3000 already in use"

**Lösung:** Port ändern

```bash
# Anderen Port verwenden
PORT=3001 npm run dev
```

Oder anderen Prozess auf Port 3000 beenden:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Problem: "Module not found" Fehler

**Lösung:** Dependencies neu installieren

```bash
# node_modules und lock-Files löschen
rm -rf node_modules package-lock.json

# Neu installieren
npm install

# Server neu starten
npm run dev
```

### Problem: TypeScript Fehler beim Build

**Lösung:** Types prüfen

```bash
# TypeScript Check
npx tsc --noEmit

# Bei Fehlern: tsconfig.json prüfen
# Oder strict mode temporär deaktivieren:
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false  // Temporär für Entwicklung
  }
}
```

### Problem: Langsamer Development Server

**Lösungen:**

1. **pnpm statt npm verwenden** (schneller)
```bash
npm install -g pnpm
rm -rf node_modules package-lock.json
pnpm install
```

2. **Next.js Cache löschen**
```bash
rm -rf .next
npm run dev
```

3. **Turbopack verwenden** (experimentell, schneller)
```bash
npm run dev -- --turbo
```

---

## 📚 Nächste Schritte

Nach erfolgreicher Installation:

1. **Dashboard erkunden**
   - Öffne `http://localhost:3000`
   - Navigiere durch die Tabs (Dashboard, Programmplanung, Inbound, etc.)

2. **Daten anpassen**
   - Ändere Werte in `/src/data/*.json`
   - Server neu starten → Änderungen sichtbar

3. **Code verstehen**
   - Lies [Code-Struktur](Code-Struktur.md)
   - Erkunde [Kernkonzepte](Home.md#-kernkonzepte)

4. **Szenarien testen**
   - Öffne Szenarien-Tab
   - Aktiviere Marketingaktion oder Maschinenausfall
   - Beobachte Auswirkungen

---

## 🔗 Weitere Ressourcen

- [Benutzerhandbuch](Benutzerhandbuch.md) - Funktionen nutzen
- [FAQ](FAQ.md) - Häufige Fragen
- [Code-Struktur](Code-Struktur.md) - Architektur verstehen
- [Datenmodell](Datenmodell.md) - JSON-Schema

---

**Bei Problemen:** Erstelle ein Issue im Repository oder kontaktiere das Team.

**Zurück zu:** [Home](Home.md)
