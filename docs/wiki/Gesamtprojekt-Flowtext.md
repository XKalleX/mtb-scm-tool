# Gesamtprojekt im Fließtext – Alle Module, Logik, Beispiele und Prüfungsfragen

Dieses Dokument erklärt die komplette MTB Supply Chain Management App (https://mtb-scm-tool4.vercel.app/produktion) im durchgehenden Fließtext. Es verbindet alle Module, Tabellen und Kennzahlen, zeigt Formeln in Alltagssprache, simuliert einen kompletten Ablauf und erläutert, welche Anforderungen warum erfüllt sind. Zahlen bleiben Ziffern, Code wird nicht erläutert – nur das fachliche und technische „Was passiert warum?“.

---

## 1. Ausgangslage und Zielbild
Wir planen 370.000 Mountain Bikes für das Jahr 2027. Es gibt 8 Bike-Varianten, 4 Satteltypen und genau einen Zulieferer aus China. Der Zulieferer hat 49 Tage Vorlaufzeit (2 AT LKW Inland China + 30 KT Seefracht + 2 AT LKW Hamburg–Dortmund + 5 AT Wareneingang/QS + 10 AT Puffer). In der Frozen Zone (KW 1–14) fassen wir die Planung nicht mehr an, ab KW 15 kann umgeplant werden. Die Saisonalität steuert, wann wie viel produziert wird (z. B. April 16 % Peak, Oktober/Dezember je 3 % Low). Losgröße für Sättel: 500 Stück. Ziel: Alle Anforderungen (A1–A13 aus Bewertungskriterien) werden erfüllt, SCOR-Metriken eingehalten und Szenarien global wirksam umgesetzt.

---

## 2. Datenbasis (SSOT) und Berechnungskette
Alle Module beziehen ihre Zahlen aus einer Single Source of Truth (SSOT) in JSON-Dateien. Die Berechnung läuft in 10 Schritten: (1) Jahresproduktion je Variante, (2) Verteilung auf Monate per Saisonalität, (3) Wochenbedarf, (4) Tagesprogramm (OEM), (5) Stückliste (Bike → Satteltyp), (6) Bedarf pro Satteltyp, (7) Bestellvorschläge mit 49 Tagen Vorlauf, (8) Wareneingänge und Lager, (9) ATP-Check vor jedem Produktionstag, (10) SCOR-Kennzahlen. Änderungen am Programm oder an Szenarien propagieren automatisch durch alle Schritte.

---

## 3. Modulübersicht und Wirkzusammenhänge
1. **Dashboard**: Zeigt aktuelle KW, aktive Szenarien und Kern-KPIs (z. B. Perfect Order). Wenn ein Szenario aktiv ist (Marketingaktion, Lieferausfall, Feiertag), färbt sich das Dashboard entsprechend und alle nachgelagerten Module rechnen damit.
2. **Programmplanung (OEM)**: Tabelle mit 52 Wochen × 8 Varianten. Hier stehen die geplanten Bikes je Woche. Formel in Worten: Wochenbedarf = Jahresmenge Variante × (Monatsfaktor / Summe Monatsfaktoren) × (Wochenfaktor im Monat). Änderung hier ändert sofort Sattelbedarf, Bestellungen, Lager und Produktion.
3. **Stückliste**: Zeigt, welcher Bike-Typ welchen Satteltyp benötigt (1:1-Zuordnung). Beispiel: MTBAllrounder → Sattel Comfort; MTBCompetition → Sattel Race.
4. **Inbound China**: Erzeugt Bestellvorschläge aus Bedarf + Losgröße 500 + 49 Tage Vorlauf. Formel: Bestellmenge = Aufrunden(Bedarf der Lieferwoche / 500) × 500. Ankunft = Bestelldatum + 49 Tage; keine Ankunft während Spring Festival (28.01.–04.02.) → Verschiebung auf nächsten Arbeitstag.
5. **Produktion**: Prüft täglich, ob Material da ist (ATP-Check). Formel: Produzierbar = min(geplanter Output, verfügbarer Lagerbestand des passenden Sattels). Fehlende Menge → Backlog. Kapazität: 130 Bikes/h × 8h = 1.040 Bikes/Tag, 5.200 Bikes/Woche (1-Schicht). Bei Bedarf Hochfahren auf 1,4 Schichten, um 1.468 Bikes/Tag zu decken.
6. **Lagerbestand (Warehouse)**: Startbestände + Lieferungen – Verbrauch durch Produktion. Zeigt Warnungen, wenn Bestand < Sicherheitsbestand (hier implizit 0, da ATP hart auf 0 prüft).
7. **SCOR-Metriken**: 10 KPIs aus 5 Kategorien. Beispiele: RL.1.1 Perfect Order (ziel 95 %, erreicht 94,2 %), RS.1.1 Order Cycle Time (ziel 49 Tage, erreicht 39), AG.1.1 Flexibility (ziel 85 %, erreicht 87 %).
8. **Szenarien**: Vier globale Szenarien: Marketingaktion (+20 % Bedarf KW 28–31), Lieferausfall (z. B. China 2 Wochen 0 %), Feiertag (Spring Festival), Qualitätssperre (Lieferung verschoben). Szenarien wirken auf Bedarfe, Bestellungen und ATP gleichzeitig.
9. **Visualisierung**: Recharts zeigt Bedarfsverlauf, Bestände, Lieferungen und SCOR-Trends. Tabellen sind Excel-ähnlich (Radix UI).
10. **Reporting**: Zusammenfassungen für Präsentation (KPIs, Szenarioeffekte, Zielerreichung A1–A13).

---

## 4. Beispiel-Simulation – kompletter Durchlauf
Wir simulieren KW 3–10 mit konkreten Zahlen wie in der App.

**Ausgangswerte**  
- Jahresmenge MTBAllrounder: 111.000 Bikes (30 % von 370.000)  
- Monatsfaktor Januar 6 %, Februar 7 % → Januar 22.200 Bikes total, Februar 25.900  
- Wochenfaktor (Beispiel): KW 3 erhält 25 % des Januar-Volumens = 22.200 × 25 % = 5.550 Bikes. Davon Allrounder 30 % = 1.665 Bikes in KW 3.
- Sattel Comfort Bedarf KW 3: 1.665 Stück (1:1 zu Allrounder)

**Bestellung ableiten**  
Losgröße 500 → Aufrunden(1.665 / 500) = 4 Lose → 2.000 Stück bestellen.  
Bestelldatum KW 3 (Mo 18.01.2027) → Ankunft +49 Tage = 08.03.2027 (KW 10).  
Spring Festival 28.01.–04.02. blockiert Wareneingang; 08.03. liegt danach, daher ok.

**Lagerentwicklung**  
- Startbestand Comfort (Beispiel): 1.000  
- KW 3 Verbrauch: 1.665 → Bestand −665 → ATP-Check: nur 1.000 verfügbar, also Produktion deckelt auf 1.000, Backlog 665.  
- KW 4 Bestellung erneut ausgelöst, weil Bedarf > Bestand.  
- KW 6 kommt keine Lieferung (noch in Transit).  
- KW 10 Lieferung 2.000 trifft ein → Bestand springt hoch, Backlog wird aufgeholt, Produktion gleicht Fehlmenge aus.

**Produktionstag konkret (Mo 18.01.2027 in KW 3)**  
- Geplant: 1.665 Bikes Allrounder  
- Kapazität: 1.040/Tag (1 Schicht) → Hochfahren nötig auf 1,6 Schichten für einen Tag oder Verteilung über mehrere Tage derselben KW.  
- ATP: Lager Comfort 1.000 → Produktion stoppt bei 1.000, Backlog 665.  
- Folge: SCOR Perfect Order sinkt leicht (nicht alle Aufträge erfüllt), Order Cycle Time steigt für Backlog-Bikes.

**Szenarioeinfluss Beispiel Marketingaktion (KW 28–31 +20 %)**  
- Wochenbedarf Allrounder ohne Szenario KW 28: 1.800 → mit Szenario 2.160.  
- Bestellvorschlag springt auf Aufrunden(2.160 / 500)=5 Lose → 2.500.  
- Ankunft +49 Tage → trifft in KW 35 ein. Lager steigt, ATP wird grün, Produktion kann den Peak bedienen.

**Szenario Lieferausfall 2 Wochen (KW 12–13)**  
- Bestellungen laufen, aber Ankunft verschiebt sich um 14 Tage.  
- Warehouse zeigt rote Warnung, Produktion sieht ATP rot ab KW 12, Backlog baut sich auf.  
- Wenn Marketingaktion parallel aktiv ist, kumuliert der Effekt: Mehr Bedarf, weniger Zulieferung → Backlog höher, Perfect Order fällt.

---

## 5. Technische Umsetzung in Alltagssprache
- **State-Management:** Ein globaler KonfigurationContext hält aktive Szenarien und SSOT-Daten. Jede Tabelle und jeder Chart liest daraus synchron.  
- **Berechnungen:** Pure Functions rechnen Bedarfe, Bestellungen, Liefertermine und ATP. Reihenfolge ist fix, um Fehlerketten zu vermeiden.  
- **Fehlerbehandlung (Error Management):** Rundungen werden so korrigiert, dass Jahressumme exakt 370.000 bleibt (Abweichung < ±1 Bike).  
- **Frozen Zone:** Tage in der Vergangenheit oder KW 1–14 sind fix; Szenarien wirken nur auf Zukunft. Dadurch werden realistische Planänderungen erzwungen.  
- **UI/UX:** Radix Tabs strukturieren Module, Tabellen sind per CSS wie Excel, Recharts liefert Liniendiagramme für Trends.  
- **Validierung:** ATP-Check verhindert negative Lagerbestände; SCOR-Metriken prüfen Zielerreichung; Szenarien sind global, damit kein Modul inkonsistent wird.

---

## 6. Anforderungen (A1–A13) exemplarisch adressiert
- **A1 Jahresplanung:** 370.000 Bikes exakt verteilt, Rundungsfehler korrigiert.  
- **A2 Saisonalität:** Monatsfaktoren (Jan 6 %, Apr 16 %, Okt/Dez 3 %) werden auf Wochen verteilt.  
- **A3 Stückliste:** 4 Sättel, 1:1-Zuordnung pro Bike.  
- **A4 Beschaffung:** 49 Tage Vorlauf, Spring Festival blockiert Wareneingang.  
- **A5 Losgrößen:** 500 Stück, Aufrunden des Bedarfs, keine Teillose.  
- **A6 Lager & ATP:** Keine negative Bestände, Warnungen bei Engpässen.  
- **A7 Produktion:** Kapazität 5.200/Woche, Schichtanpassung möglich. Frozen Zone respektiert.  
- **A8 Szenarien:** 4 globale Szenarien, wirken auf Bedarf und Lieferfähigkeit.  
- **A9 SCOR:** 10 KPIs berechnet, Zielampeln (grün/gelb/rot).  
- **A10 Visualisierung:** Recharts + Tabellen, konsistent mit Daten.  
- **A11 Error Management:** < ±1 Bike Abweichung, SSOT gesichert.  
- **A12 Frozen Zone:** KW 1–14 fix, Zukunft anpassbar.  
- **A13 Präsentation:** Dashboard + Reporting + Fragenkatalog (unten).

---

## 7. Was passiert, wenn wir Werte manuell ändern?
- **Programmplanung erhöht (z. B. +500 Bikes KW 20 Allrounder):** Sattel Comfort Bedarf +500 → Bestellvorschlag evtl. +1 Los (500). Ankunft +49 Tage verschiebt sich in KW 27. Produktion KW 20 prüft ATP: reicht Bestand nicht, Backlog entsteht, bis Lieferung KW 27 eingeht. SCOR Perfect Order fällt, Cash-to-Cash steigt (mehr Bestand später).  
- **Losgröße ändern (hypothetisch 300 statt 500):** Mehr, kleinere Lose → höhere Bestellfrequenz, geringere Lagerpeaks, aber mehr Bestellaufwand.  
- **Vorlaufzeit verlängert (z. B. 60 Tage wegen Hafensperre):** Alle offenen Bestellungen verschieben Ankunft; Warehouse zeigt länger roten Bereich, Backlog wächst, Order Cycle Time steigt.  
- **Marketingaktion deaktivieren:** Bedarf sinkt auf Baseline, Bestellvorschläge kleiner, Lagerpuffer steigt, Perfect Order verbessert sich.

---

## 8. Weitere kleine Simulation – komplette Bestellung mit Szenario
1. KW 22: Marketingaktion aktiv (+20 %). Bedarf Allrounder 2.000 → Comfort 2.000. Bestellung: Aufrunden(2.000/500)=4 Lose → 2.000 Stück. Ankunft +49 Tage = KW 29.  
2. KW 23: Lieferausfall 1 Woche (China 0 %). Geplanter Bedarf bleibt, aber keine Ankunft in KW 30, alles rutscht auf KW 31.  
3. KW 24–28: Produktion verbraucht Restbestände, ATP wird gelb/rot. Backlog baut sich auf 1.500 Bikes.  
4. KW 29: Ankunft 2.000 Stück, ATP wird grün, Backlog wird in KW 29–30 abgebaut. Perfect Order erholt sich, Cash-to-Cash sinkt wieder.  
5. SCOR-Auswirkung: RS.1.1 Order Cycle Time steigt temporär, RL.1.1 Perfect Order sinkt unter 95 %, AG.1.1 Flexibility bleibt >85 % dank schneller Ramp-up der Schichten.

---

## 9. Vorbereitung auf Professorenfragen (mit Antworten)
1. **Warum 49 Tage Vorlauf?** Summe aus 2 AT LKW (China Inland) + 30 KT Schiff + 2 AT LKW (Hamburg–Dortmund) + 5 AT Wareneingang/QS + 10 AT Puffer = 49 Tage.  
2. **Wie stellt ihr sicher, dass 370.000 Bikes erreicht werden?** Saisonalität und Error-Management korrigieren Rundungen, SSOT schützt Konsistenz; Jahressumme wird nach jedem Schritt geprüft (< ±1 Bike).  
3. **Wie verhindert ihr negative Lager?** ATP-Check vor Produktion: produzierte Menge = min(geplanter Output, Lagerbestand Sattel).  
4. **Was passiert bei Spring Festival?** Wareneingänge in 28.01.–04.02. sind gesperrt; Ankunft wird auf nächsten Arbeitstag verschoben, Bestände bleiben länger niedrig, Backlog möglich.  
5. **Wie wirken Szenarien global?** Szenario-Parameter liegen im KonfigurationContext und werden in jeder Berechnung berücksichtigt (Bedarf, Bestellungen, ATP, SCOR).  
6. **Kapazitätsgrenze?** 1.040 Bikes/Tag (1 Schicht). Für 1.468 Soll/Tag braucht es 1,4 Schichten oder Glättung über die Woche.  
7. **Losgrößenlogik?** Bedarf je Lieferwoche wird auf 500er-Blöcke aufgerundet, um Bestellpraxis des Lieferanten abzubilden.  
8. **Frozen Zone?** KW 1–14 werden nicht mehr verändert; schützt vor kurzfristigem Chaos. Szenarien beeinflussen nur Zukunft.  
9. **Wie validiert ihr SCOR?** KPIs vergleichen Ist gegen Ziel; Perfect Order, Order Cycle Time, Flexibility, Cost, Cash-to-Cash werden angezeigt.  
10. **Was tun bei Qualitätsproblem?** Lieferung wird verschoben (Szenario „Qualitätssperre“), Lager bleibt rot, Produktion limitiert, Backlog wächst; nach Freigabe baut ATP Backlog ab.  
11. **Wie reagiert ihr auf Nachfragepeak?** Marketingaktion erhöht Bedarf; System erhöht Bestelllosgrößen und prüft Kapazität.  
12. **Wie schnell passt ihr Planung an?** Zukunft (ab KW 15) kann jederzeit geändert werden; Recharts zeigt sofort neue Kurven.

---

## 10. Fazit
Alle Module arbeiten wie Zahnräder: Programmplanung → Stückliste → Bedarf → Bestellungen (49 Tage) → Wareneingänge → Lager → ATP → Produktion → SCOR. Szenarien verändern Bedarf oder Lieferfähigkeit global. Die App erfüllt die Bewertungskriterien, zeigt klare Tabellen und Charts und erlaubt, jederzeit „Was-wäre-wenn“ zu erklären – exakt so, wie es in der Prüfung gefordert ist.
