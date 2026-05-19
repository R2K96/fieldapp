# FieldApp SHK

Schlanke Außendienst-App für SHK-Betriebe (Sanitär, Heizung, Klima) und ähnliche Handwerksbetriebe. Läuft komplett im Browser – keine Installation, kein Server.

## Schnellstart

1. `FieldApp_SHK_fixed.html` im Chrome-Browser öffnen
2. Unter **⚙ Einstellungen** Firmennamen und Stundensätze anpassen
3. Erste Kunden und Aufträge anlegen – los geht's

> **Wichtig:** Für die Sprachfunktion muss Chrome Mikrofon-Zugriff erhalten (einmalige Browser-Abfrage).

---

## Projektstruktur

```
FieldApp_SHK_fixed.html   ← komplette App (HTML + CSS + JS, Single File)
CHANGELOG.md              ← Änderungshistorie
README.md                 ← diese Datei
FieldApp_Projektdokumentation_CoWork.docx  ← ausführliche Doku
```

Die App ist bewusst als **Single-File** gehalten – kein Build-Tool, kein Framework, keine Abhängigkeiten außer Chrome.

---

## Datenhaltung (localStorage)

Alle Daten liegen im `localStorage` des Browsers unter dem Präfix `fa` (konfigurierbar in `CONFIG.firma.storage`).

| Schlüssel       | Inhalt                                      |
|-----------------|---------------------------------------------|
| `fa_kunden`     | Kundenliste (Array)                         |
| `fa_auftraege`  | Aufträge mit Status, Datum, Leistung        |
| `fa_docs`       | Nachtermin-Dokumentationen                  |
| `fa_rechnungen` | Rechnungen                                  |
| `fa_wp`         | Wochenplan-Einträge                         |
| `fa_fahrtenbuch`| Fahrteneinträge                             |

**Backup:** Einstellungen → Export (speichert JSON-Datei). Import stellt alle Daten wieder her.

---

## Datenstrukturen (wichtigste Felder)

### Auftrag
```json
{
  "id": "uid",
  "kundeId": "uid",
  "leistung": "🔧 Handwerk",
  "status": "offen | erledigt | folgetermin",
  "datum": "YYYY-MM-DD",
  "dauer": 60,
  "preis": 65.00
}
```

### Nachtermin-Dokumentation (doc)
```json
{
  "id": "uid",
  "auftragId": "uid",
  "datum": "YYYY-MM-DD",
  "diktat": "Freitext aus Sprachaufnahme",
  "zeitVor": 10,
  "zeitOrt": 60,
  "zeitNach": 15,
  "zeitGesamt": 85,
  "abrMin": 90,
  "leistungsBlocks": [
    { "leistung": "🔧 Handwerk", "dauer": 30 },
    { "leistung": "📋 Bürokratie", "dauer": 30 }
  ],
  "status": "Erledigt | Folgetermin | Offen",
  "preis": 97.50
}
```

---

## Leistungsarten & Stundensätze

In `LC_SATZ` (im Script) hinterlegt – aktuell:

| Leistung              | €/h |
|-----------------------|-----|
| 🔧 Handwerk           | 61  |
| 📋 Bürokratie         | 76  |
| 💰 Steuer/Finanzen    | 86  |
| 📱 Digital            | 65  |
| 🛵 Botendienst        | Pauschale 12 € |
| 🌿 Garten             | 58  |

Sätze direkt im Script in `LC_SATZ` anpassen oder über ⚙ Einstellungen → Leistungen.

---

## Sprachfunktion

Nutzt die **Web Speech API** – nur in Chrome verfügbar (kein Safari, kein Firefox).

- Seite „Nach dem Termin" öffnen
- Auftrag auswählen → 🎙 Aufnahme starten
- Text erscheint live im Textfeld
- Aufnahme stoppen → Text prüfen und ggf. ergänzen
- Beim Speichern wird das Diktat in der Dokumentation abgelegt und beim nächsten Rechnungsaufruf automatisch übernommen

---

## Erweiterungshinweise

- **Neue Leistungsart hinzufügen:** `LC_SATZ`-Objekt um einen Eintrag erweitern + in `CONFIG.leistungen`-Array eintragen
- **Firmenlogo in Rechnung:** `CONFIG.firma.logo` auf Base64-Bild-String setzen
- **Mehrbenutzerbetrieb:** localStorage durch eine REST-API ersetzen (Funktion `DB` austauschen)
- **Mobile-App:** HTML als PWA verpacken (manifest.json + Service Worker) → offline-fähig

---

## Browser-Kompatibilität

| Browser | App | Sprachfunktion |
|---------|-----|---------------|
| Chrome  | ✅  | ✅             |
| Edge    | ✅  | ✅             |
| Firefox | ✅  | ❌             |
| Safari  | ✅  | ❌             |

---

## Lizenz

Internes Werkzeug – kein öffentliches Repository.
