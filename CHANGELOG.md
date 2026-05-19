# FieldApp SHK – Changelog

## v2.0.0 – 2026-05-16 (CoWork-Session)

### 🗄 Supabase Backend-Integration

- **localStorage komplett ersetzt** durch Supabase-Datenbank
- **6 Tabellen** angelegt: `kunden`, `auftraege`, `docs`, `rechnungen`, `wochenplan`, `fahrtenbuch`
- **Row Level Security (RLS)** – jeder Nutzer sieht nur seine eigenen Daten
- **In-Memory Cache** – alle Render-Funktionen bleiben synchron, Supabase-Writes async im Hintergrund
- **Magic Link Auth** – Login per E-Mail-Link, kein Passwort nötig
- **Session-Persistenz** – automatisches Re-Login bei bekannter Session
- **Abmelden-Button** im Seitenmenü
- Neue Datei: `FieldApp_SHK_v2.html`
- Neue Datei: `supabase_schema.sql` – SQL für Supabase SQL Editor

---

## v1.1.0 – 2026-05-15 (CoWork-Session)

### 🐛 Bugfixes

- **Doppelte HTML-Elemente** (`modalKunde`, `modalAuftrag`, `detailPanel`, `modalWP` je 2×) entfernt → alle Modals und Panels öffnen sich wieder korrekt
- **Rechnung: Auftrag-Dropdown leer** – Statusfilter schloss `folgetermin`-Aufträge aus; Filter vollständig entfernt, alle Aufträge (✅/📅/🔵) werden angezeigt
- **Neuer Auftrag speichern fehlgeschlagen** – JavaScript-SyntaxError durch ungültige Escaping-Sequenz (`\'&quot;\'`) behoben
- **Cloudflare-Skript entfernt** – `email-decode.min.js` verursachte 404-Fehler beim lokalen Öffnen
- **HTML-Quote-Bug** im Rechnungsvorschau-Block (`color:#1a1f1c;""`) bereinigt

### ✨ Neue Features

#### Sprachfunktion (Nachdokumentation)
- Web Speech API vollständig integriert (`SpeechRecognition` / `webkitSpeechRecognition`)
- Live-Transkription während der Aufnahme (Interim-Text sichtbar)
- Start/Stopp-Button mit visuellem Aufnahme-Indikator
- Toast-Hinweis bei fehlendem Mikrofon-Zugriff

#### Rechnungs-Autofill
- Beim Auswählen eines Auftrags werden Zeiten (Vor-/Vor-Ort-/Nachbereitung) und Diktat automatisch in die erste Rechnungsposition übernommen
- Info-Banner zeigt welche Nachtermin-Dokumentation übernommen wurde
- Alle Aufträge unabhängig vom Status wählbar

#### Multi-Leistungsblöcke (Nachdokumentation & Rechnung)
- Pro Termin können beliebig viele Leistungsblöcke erfasst werden (z.B. 30 Min. Handwerk + 30 Min. Bürokratie)
- Jeder Block: Leistungsart-Chip-Auswahl + Zeitfeld (Min.)
- Blöcke hinzufügen über „+ Block", entfernen über ✕
- Summen (Vor Ort gesamt / Gesamt abrechenbar) rechnen sich live neu aus
- Blöcke werden in der Dokumentation gespeichert (`leistungsBlocks`-Array)
- Beim Erstellen einer Rechnung aus einem Auftrag: mehrere Blöcke → mehrere Rechnungspositionen automatisch

---

## v1.0.0 – Ursprungsversion (vor CoWork-Session)

- Grundlegende Kundenverwaltung, Auftragsverwaltung, Wochenplan
- Nachdokumentation mit Einfachauswahl für Leistungsart
- Rechnungsstellung (manuell)
- Fahrtenbuch
- LocalStorage-basierte Datenhaltung
