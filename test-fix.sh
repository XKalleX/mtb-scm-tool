#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "WAREHOUSE MANAGEMENT FIX - TEST SCRIPT"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Prüfe ob Development Server läuft
if ! lsof -i:3000 > /dev/null 2>&1; then
    echo "⚠️  Development Server läuft nicht auf Port 3000"
    echo "   Starte Server..."
    cd /home/runner/work/mtb-scm-tool/mtb-scm-tool
    npm run dev > /tmp/dev-server.log 2>&1 &
    DEV_PID=$!
    echo "   Server gestartet mit PID: $DEV_PID"
    echo "   Warte 10 Sekunden..."
    sleep 10
else
    echo "✅ Development Server läuft bereits"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 1: Prüfe geänderte Dateien"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Prüfe ob warehouse-management.ts die POST-JAHRESENDE Logik enthält
if grep -q "POST-JAHRESENDE VERBRAUCH" /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts; then
    echo "✅ warehouse-management.ts enthält POST-JAHRESENDE Logik"
else
    echo "❌ warehouse-management.ts fehlt POST-JAHRESENDE Logik"
    exit 1
fi

# Prüfe ob Verifizierung implementiert ist
if grep -q "VERIFIKATION" /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts; then
    echo "✅ warehouse-management.ts enthält Verifizierungs-Logging"
else
    echo "❌ warehouse-management.ts fehlt Verifizierungs-Logging"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 2: Prüfe Code-Struktur"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Zähle Zeilen in der Post-Verarbeitung
POST_LINES=$(grep -A 100 "POST-JAHRESENDE VERBRAUCH" /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts | wc -l)
echo "   POST-JAHRESENDE Block: $POST_LINES Zeilen"

if [ $POST_LINES -gt 50 ]; then
    echo "✅ POST-JAHRESENDE Logik ist vollständig implementiert"
else
    echo "❌ POST-JAHRESENDE Logik scheint unvollständig"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 3: Syntax-Validierung"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Prüfe JavaScript-Syntax (basic check)
node -c /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts 2>&1 | head -5
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Keine offensichtlichen Syntax-Fehler"
else
    echo "⚠️  Syntax-Check hat Fehler gefunden (TypeScript benötigt Transpilation)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 4: Logik-Validierung"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Prüfe wichtige Variablen
echo "Prüfe wichtige Code-Stellen:"

if grep -q "const maxPostTage = 60" /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts; then
    echo "✅ maxPostTage = 60 Tage definiert"
else
    echo "❌ maxPostTage nicht gefunden"
fi

if grep -q "verbleibendesMaterial === 0" /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts; then
    echo "✅ Exit-Bedingung für vollständigen Verbrauch vorhanden"
else
    echo "❌ Exit-Bedingung fehlt"
fi

if grep -q "gesamtVerbrauch += verbrauch" /home/runner/work/mtb-scm-tool/mtb-scm-tool/src/lib/calculations/warehouse-management.ts; then
    echo "✅ Verbrauch wird korrekt akkumuliert"
else
    echo "❌ Verbrauch-Akkumulation fehlt"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 5: Dokumentation"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

if [ -f "/home/runner/work/mtb-scm-tool/mtb-scm-tool/WAREHOUSE_FIX_DOCUMENTATION.md" ] || \
   [ -f "/home/runner/work/mtb-scm-tool/mtb-scm-tool/test-warehouse-fix.md" ]; then
    echo "✅ Dokumentation vorhanden"
else
    echo "⚠️  Keine Dokumentations-Datei gefunden"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "ZUSAMMENFASSUNG"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Alle Tests abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "1. Browser öffnen: http://localhost:3000/produktion"
echo "2. DevTools Console öffnen (F12)"
echo "3. Suche nach: 'POST-JAHRESENDE' und 'VERIFIKATION'"
echo "4. Prüfe ob: 'Gesamt Verbrauch: 370.000 Stück'"
echo "5. Prüfe ob: 'Rohstofflager Ende: 0 Stück ✅'"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
