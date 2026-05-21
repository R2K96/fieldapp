// @ts-nocheck
// ── Export-Modul ─────────────────────────────────────────────────
// XLSX-Gesamtexport, Lexoffice-CSV, DATEV-CSV.
// XLSX kommt als CDN-Global — kein npm-Paket nötig.

import { DB } from '../lib/db'
import { today, showToast } from '../lib/utils'

// ── Hilfsfunktion ─────────────────────────────────────────────────
function _downloadCSV(rows: any[][] | null, filename: string, rawContent?: string) {
  let content: string
  if (rawContent !== undefined) {
    content = rawContent
  } else {
    content = (rows || []).map(row =>
      row.map((cell: any) => {
        const s = String(cell ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s
      }).join(',')
    ).join('\r\n')
  }
  // BOM für korrekte UTF-8-Erkennung in Excel & DATEV
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Excel-Gesamtexport ───────────────────────────────────────────
export function exportAllesDaten() {
  const xlsxData = _buildExportXLSX()
  const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `SchnellR_Export_${today()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
  showToast('📥 Export heruntergeladen ✓')
}

function _buildExportXLSX() {
  const XLSX = (window as any).XLSX
  const wb   = XLSX.utils.book_new()

  const kunden = DB.kunden().map((k: any) => ({
    Name: k.name||'', Adresse: k.adresse||'', Telefon: k.telefon||'',
    Leistung: k.leistung||'', Notiz: k.notiz||''
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kunden.length ? kunden : [{}]), 'Kunden')

  const auftraege = DB.auftraege().map((a: any) => ({
    Kunde: a.kunde||'', Leistung: a.leistung||'', Datum: a.datum||'',
    Dauer: a.dauer||'', Status: a.status||'', Mitarbeiter: a.ma||'', Notiz: a.notiz||''
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auftraege.length ? auftraege : [{}]), 'Aufträge')

  const rechnungen = DB.rechnungen().map((r: any) => ({
    Nummer: r.nummer||'', Kunde: r.kunde||'', Datum: r.datum||'',
    Betrag: r.betrag||'', Status: r.status||''
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rechnungen.length ? rechnungen : [{}]), 'Rechnungen')

  const fahrten = DB.fahrtenbuch().map((f: any) => ({
    Datum: f.datum||'', Von: f.von||'', Nach: f.nach||'',
    km: f.km||'', Zweck: f.zweck||'', Mitarbeiter: f.ma||''
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fahrten.length ? fahrten : [{}]), 'Fahrtenbuch')

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

// ── Lexoffice CSV ────────────────────────────────────────────────
export function exportLexofficeCSV() {
  const rechnungen = DB.rechnungen()
  if (!rechnungen.length) { showToast('⚠ Keine Rechnungen vorhanden'); return }

  const CONFIG = (window as any).CONFIG
  const ust    = CONFIG.firma.ustSatz ?? 19

  const rows: any[][] = [
    ['Datum','Belegnummer','Buchungstext','Erlöskonto','Betrag (netto)','Steuersatz %','MwSt-Betrag','Betrag (brutto)','Kundennummer','Kundenname','Zahlungsstatus']
  ]

  rechnungen.forEach((r: any) => {
    const brutto = parseFloat(r.betrag) || 0
    const netto  = Math.round(brutto / (1 + ust/100) * 100) / 100
    const mwst   = Math.round((brutto - netto) * 100) / 100
    const status = r.bezahlt ? 'bezahlt' : (r.mahnStufe >= 2 ? 'mahnung2' : r.mahnStufe >= 1 ? 'mahnung1' : 'offen')
    rows.push([
      r.datum || '',
      r.nummer || r.id || '',
      (r.leistung || r.kunde || 'Dienstleistung').replace(/[,;"]/g,' '),
      '8400',
      netto.toFixed(2).replace('.',','),
      ust,
      mwst.toFixed(2).replace('.',','),
      brutto.toFixed(2).replace('.',','),
      r.kundeId || '',
      (r.kunde || '').replace(/[,;"]/g,' '),
      status
    ])
  })

  _downloadCSV(rows, `SchnellR_Lexoffice_${today()}.csv`)
  showToast('📊 Lexoffice CSV exportiert ✓')
}

// ── DATEV CSV ────────────────────────────────────────────────────
export function exportDATEVCSV() {
  const rechnungen = DB.rechnungen()
  if (!rechnungen.length) { showToast('⚠ Keine Rechnungen vorhanden'); return }

  const CONFIG = (window as any).CONFIG
  const jahr   = new Date().getFullYear()

  const header1 = [
    '"EXTF"', '700', '21', '"Buchungsstapel"', '5',
    '', '', '', '', '',
    '', '',
    `${jahr}0101`, '4',
    `${jahr}0101`, `${jahr}1231`,
    '"SchnellR Export"', '',
    '1', '0', '0', 'EUR'
  ].join(';')

  const header2 = [
    'Umsatz (ohne Soll/Haben-Kz)','Soll/Haben-Kennzeichen','WKZ Umsatz','Kurs','Basis-Umsatz',
    'WKZ Basis-Umsatz','Konto','Gegenkonto (ohne BU-Schlüssel)','BU-Schlüssel','Belegdatum',
    'Belegfeld 1','Belegfeld 2','Skonto','Buchungstext','Postensperre','Diverse Adressnummer',
    'Geschäftspartnerbank','Sachverhalt','Zinssperre','Beleglink',
    'Beleginfo - Art 1','Beleginfo - Inhalt 1','Beleginfo - Art 2','Beleginfo - Inhalt 2',
    'Beleginfo - Art 3','Beleginfo - Inhalt 3','Beleginfo - Art 4','Beleginfo - Inhalt 4',
    'Beleginfo - Art 5','Beleginfo - Inhalt 5','Beleginfo - Art 6','Beleginfo - Inhalt 6',
    'Beleginfo - Art 7','Beleginfo - Inhalt 7','Beleginfo - Art 8','Beleginfo - Inhalt 8',
    'KOST1 - Kostenstelle','KOST2 - Kostenstelle','Kost-Menge','EU-Land u. UStID',
    'EU-Steuersatz','Abw. Versteuerungsart','Sachverhalt L+L','Funktionsergänzung L+L',
    'BU 49 Hauptfunktionstyp','BU 49 Hauptfunktionsnummer','BU 49 Funktionsergänzung',
    'Zusatzinformation - Art 1','Zusatzinformation - Inhalt 1',
    'Zusatzinformation - Art 2','Zusatzinformation - Inhalt 2',
    'Stück','Gewicht','Zahlweise','Forderungsart','Veranlagungsjahr','Zugeordnete Fälligkeit',
    'Skontotyp','Auftragsnummer','Buchungstyp','USt-Schlüssel (Anzahlungen)',
    'EU-Land (Anzahlungen)','Sachverhalt L+L (Anzahlungen)','EU-Steuersatz (Anzahlungen)',
    'Erlöskonto (Anzahlungen)','Herkunft-Kz','Buchungs GUID','KOST-Datum',
    'SEPA-Mandatsreferenz','Skontosperre','Gesellschaftername','Beteiligtennummer',
    'Identifikationsnummer','Zeichnernummer','Postensperre bis',
    'Bezeichnung SoBil-Sachverhalt','Kennzeichen SoBil-Buchung','Festschreibung',
    'Leistungsdatum','Datum Zuord. Steuerperiode'
  ].join(';')

  const buchungszeilen = rechnungen.map((r: any) => {
    const brutto    = parseFloat(r.betrag) || 0
    const d         = r.datum ? new Date(r.datum) : new Date()
    const belegdatum = String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0')
    const buchungstext = (r.kunde || 'Dienstleistung').replace(/[;"]/g,' ').substring(0,60)
    return [
      brutto.toFixed(2).replace('.',','),
      'S', 'EUR', '', '', '',
      '1200', '8400', '',
      belegdatum,
      (r.nummer || r.id || '').substring(0,36),
      '', '',
      buchungstext,
      ...Array(65).fill('')
    ].join(';')
  })

  const csvContent = [header1, header2, ...buchungszeilen].join('\r\n')
  _downloadCSV(null, `SchnellR_DATEV_${today()}.csv`, csvContent)
  showToast('🏦 DATEV CSV exportiert ✓')
}
