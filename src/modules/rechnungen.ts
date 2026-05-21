// @ts-nocheck
// ── Rechnungen-Modul ─────────────────────────────────────────────
// Vollständiger Rechnung-Flow: Positionen-UI, Material-Picker,
// Speichern, PDF (html2pdf), ZUGFeRD-XML, Mahnwesen.

import { DB } from '../lib/db'
import { uid, today, fmtDate, showToast } from '../lib/utils'
import { registerPage, showConfirm } from './ui'
import { generateEN16931Xml, downloadZUGFeRDPdf } from '../lib/zugferd'

// ── Konstanten ───────────────────────────────────────────────────
const FAELLIGKEIT_TAGE    = 14
const MAHNSTUFE2_TAGE     = 28
const VERZUGSZINS_PROZENT = 11.62   // §288 BGB B2B

// Fallback-Sätze, falls CONFIG noch nicht geladen
const LC_SATZ_FALLBACK: Record<string, number> = {
  '🔧 Handwerk & Reparatur': 61, '📋 Büro & Verwaltung': 72,
  '📱 IT & Digital': 65, '🚗 Fahrt & Lieferung': 0,
  '🌿 Außenarbeiten': 55, '💼 Beratung': 85,
}

function getLcSatz(): Record<string, number> {
  return (window as any).LC_SATZ || LC_SATZ_FALLBACK
}

function getCfg() { return (window as any).CONFIG || {} }

// ── Modul-State ──────────────────────────────────────────────────
let rCurrentBetrag  = 0
let rCurrentNummer  = ''
let _rgMatSelected: any[] = []   // [{...material, menge}]

// ── Callbacks ────────────────────────────────────────────────────
let _onDataChange: () => void = () => {}
let _triggerPush: (event: string, uid: string, title: string, msg: string) => void = () => {}
let _openSigModal: (cb: (sig: string | null) => void) => void = (cb) => cb(null)

export function onRechnungDataChange(fn: () => void) { _onDataChange = fn }
export function onRechnungTriggerPush(fn: (e: string, u: string, t: string, m: string) => void) { _triggerPush = fn }
export function onRgOpenSigModal(fn: (cb: (sig: string | null) => void) => void) { _openSigModal = fn }

// ── Rechnungs-Status Helpers ─────────────────────────────────────
export function getTageSeitFaelligkeit(r: any): number {
  if (!r.datum) return 0
  const faelligAm = r.faellig_am
    ? new Date(r.faellig_am + 'T12:00:00')
    : new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000)
  return Math.floor((Date.now() - faelligAm.getTime()) / 86400000)
}

export function calcVerzugszinsen(r: any): number {
  const tage = Math.max(0, getTageSeitFaelligkeit(r))
  return Math.round(r.betrag * (VERZUGSZINS_PROZENT / 100) * (tage / 365) * 100) / 100
}

export function getRgStatus(r: any): string {
  if (r.bezahlt) return 'bezahlt'
  const stufe = r.mahnStufe ?? (r.mahnStatus === 'gemahnt' ? 1 : 0)
  if (stufe >= 2) return 'mahnung2'
  if (stufe === 1) return 'mahnung1'
  const tage = (Date.now() - new Date((r.datum || '2000-01-01') + 'T12:00:00').getTime()) / 86400000
  if (tage > MAHNSTUFE2_TAGE) return 'ueberfaellig2'
  if (tage > FAELLIGKEIT_TAGE) return 'ueberfaellig1'
  return 'offen'
}

export function getRgStatusBadge(r: any): string {
  const s = getRgStatus(r)
  if (s === 'bezahlt')       return '<span class="badge badge-green">✓ Bezahlt</span>'
  if (s === 'mahnung2')      return '<span class="badge badge-red">🚨 2. Mahnung</span>'
  if (s === 'mahnung1')      return '<span class="badge badge-purple">⚠ 1. Mahnung</span>'
  if (s === 'ueberfaellig2') return '<span class="badge badge-red">🔴 +28 Tage</span>'
  if (s === 'ueberfaellig1') return '<span class="badge badge-gold">⏰ Überfällig</span>'
  return '<span class="badge badge-gold">⏳ Offen</span>'
}

function getRgAktionen(r: any): string {
  const s = getRgStatus(r)
  if (s === 'bezahlt') return ''
  let btns = `<button data-rg-action="bezahlt" data-rg-id="${r.id}" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--teal);cursor:pointer;margin-right:4px;">✓ Bezahlt</button>`
  if (s === 'ueberfaellig1' || s === 'mahnung1')
    btns += `<button data-rg-action="mahnung1" data-rg-id="${r.id}" style="background:var(--purple-dim);border:1px solid rgba(185,124,245,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--purple);cursor:pointer;">📄 Erinnerung</button>`
  if (s === 'ueberfaellig2' || s === 'mahnung2')
    btns += `<button data-rg-action="mahnung2" data-rg-id="${r.id}" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--red);cursor:pointer;">🚨 2. Mahnung</button>`
  return btns
}

// ── Initialisierung ──────────────────────────────────────────────
export function initRechnungen() {
  registerPage('rechnung', () => { renderRechnung(); populateRechnungSelect() })

  // Event-Delegation: Status-Aktionen
  document.getElementById('rechnungTbody')?.addEventListener('click', e => {
    const btn = (e.target as Element).closest('[data-rg-action]') as HTMLElement
    if (!btn) return
    const id = btn.dataset.rgId!; const action = btn.dataset.rgAction!
    if (action === 'bezahlt')  markBezahlt(id)
    if (action === 'mahnung1') mahnungErstellen(id, 1)
    if (action === 'mahnung2') mahnungErstellen(id, 2)
  })

  // PDF + ZUGFeRD Download
  document.getElementById('rechnungTbody')?.addEventListener('click', e => {
    const pdfBtn = (e.target as Element).closest('[data-rg-pdf]') as HTMLElement
    const zfBtn  = (e.target as Element).closest('[data-rg-xml]') as HTMLElement
    if (pdfBtn) downloadRechnungPDFData(pdfBtn.dataset.rgPdf!)
    if (zfBtn)  downloadZUGFeRDPdfById(zfBtn.dataset.rgXml!)
  })
}

// ── Nächste Rechnungsnummer ──────────────────────────────────────
export function nextRNr(): string {
  const CONFIG     = getCfg()
  const rechnungen = DB.rechnungen()
  const y          = new Date().getFullYear()
  const prefix     = CONFIG?.firma?.rg_prefix || 'RG'
  const n          = rechnungen.filter((r: any) => r.nummer?.startsWith(prefix + '-' + y)).length + 1
  return `${prefix}-${y}-${String(n).padStart(3, '0')}`
}

// ── Positions-Preisberechnung ────────────────────────────────────
export function calcPosBetrag(leistung: string, vor: number, ort: number, nach: number): number {
  if (leistung === '🚗 Fahrt & Lieferung') return 12
  const g      = (vor || 0) + (ort || 0) + (nach || 0)
  const abrMin = Math.max(60, Math.ceil(g / 15) * 15)
  return Math.round((abrMin / 60) * (getLcSatz()[leistung] || 65) * 100) / 100
}

// ── Auftrags-Select befüllen ─────────────────────────────────────
export function populateRechnungSelect() {
  const af = DB.auftraege().slice().reverse()
  const k  = DB.kunden()
  const s  = document.getElementById('rAuftragSel') as HTMLSelectElement
  if (!s) return
  s.innerHTML = '<option value="">- Auftrag wählen (optional) -</option>'
  if (!af.length) {
    const o = document.createElement('option')
    o.disabled = true; o.textContent = 'Noch keine Aufträge vorhanden'
    s.appendChild(o); return
  }
  const order: Record<string, number> = { offen: 0, folgetermin: 1, erledigt: 2 }
  af.sort((a: any, b: any) => (order[a.status] ?? 0) - (order[b.status] ?? 0))
  af.forEach((a: any) => {
    const kd = k.find((k: any) => k.id === a.kundeId)
    const st = a.status === 'erledigt' ? '✅' : a.status === 'folgetermin' ? '📅' : '🔵'
    const o  = document.createElement('option')
    o.value = a.id
    o.textContent = `${st} ${kd ? kd.name : '?'} · ${a.leistung} · ${fmtDate(a.datum)}`
    s.appendChild(o)
  })
}

// ── Positionen-UI ────────────────────────────────────────────────
export function addPosition(lPre?, orPre?, vorPre?, nachPre?, beschrPre?) {
  const id  = 'pos_' + Date.now()
  const lcs = getLcSatz()
  const d   = document.createElement('div')
  d.id = id
  d.style.cssText = 'background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--border);'
  d.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text3);">Position</div>'
    + '<button onclick="removePosition(\'' + id + '\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:15px;">✕</button></div>'
    + '<div class="chips" style="margin-bottom:8px;">'
    + Object.keys(lcs).map(l =>
        '<div class="chip' + (l === (lPre || '') ? ' on' : '') + '" onclick="selectPosL(this,\'' + id + '\')" data-l="' + l + '">' + l + '</div>'
      ).join('')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:7px;">'
    + '<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">Vorber.</div>'
    + '<input class="inp" type="number" value="' + (vorPre || 0) + '" min="0" data-f="vor" oninput="updPos(\'' + id + '\')" style="padding:7px 9px;font-size:13px;"></div>'
    + '<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">Vor Ort</div>'
    + '<input class="inp" type="number" value="' + (orPre || 60) + '" min="0" data-f="ort" oninput="updPos(\'' + id + '\')" style="padding:7px 9px;font-size:13px;"></div>'
    + '<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">Nachber.</div>'
    + '<input class="inp" type="number" value="' + (nachPre || 0) + '" min="0" data-f="nach" oninput="updPos(\'' + id + '\')" style="padding:7px 9px;font-size:13px;"></div></div>'
    + '<input class="inp" type="text" placeholder="Beschreibung / Diktat (optional)" data-f="beschr" value="'
    + (beschrPre || '').replace(/"/g, '&quot;').slice(0, 220)
    + '" style="margin-bottom:7px;padding:7px 9px;font-size:12px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:7px;border-top:1px solid var(--border);">'
    + '<div style="font-size:11px;color:var(--text2);" id="' + id + '_i">Leistung wählen</div>'
    + '<div style="font-size:15px;font-weight:700;color:var(--teal);" id="' + id + '_b">-- €</div></div>'
  document.getElementById('rPositionen')?.appendChild(d)
  if (lPre) updPos(id)
  updGesamt()
}

export function selectPosL(el: any, pid: string) {
  el.closest('.chips').querySelectorAll('.chip').forEach((c: any) => c.classList.remove('on'))
  el.classList.add('on')
  updPos(pid)
}

export function updPos(pid: string) {
  const d = document.getElementById(pid); if (!d) return
  const l    = d.querySelector('.chip.on')?.dataset.l || ''
  const vor  = parseInt((d.querySelector('[data-f="vor"]') as HTMLInputElement)?.value) || 0
  const ort  = parseInt((d.querySelector('[data-f="ort"]') as HTMLInputElement)?.value) || 0
  const nach = parseInt((d.querySelector('[data-f="nach"]') as HTMLInputElement)?.value) || 0
  const g    = vor + ort + nach
  const a    = Math.max(60, Math.ceil(g / 15) * 15)
  const b    = l ? calcPosBetrag(l, vor, ort, nach) : 0
  const iEl  = document.getElementById(pid + '_i')
  const bEl  = document.getElementById(pid + '_b')
  if (iEl) iEl.textContent = l ? g + ' Min. → ' + a + ' Min.' : 'Leistung wählen'
  if (bEl) bEl.textContent = l ? b.toFixed(2).replace('.', ',') + ' €' : '-- €'
  updGesamt()
}

export function removePosition(pid: string) {
  const el = document.getElementById(pid); if (el) el.remove()
  updGesamt()
}

export function updGesamt() {
  let t = 0
  document.querySelectorAll('#rPositionen > div').forEach((d: any) => {
    const l    = d.querySelector('.chip.on')?.dataset.l || ''; if (!l) return
    const vor  = parseInt(d.querySelector('[data-f="vor"]')?.value) || 0
    const ort  = parseInt(d.querySelector('[data-f="ort"]')?.value) || 0
    const nach = parseInt(d.querySelector('[data-f="nach"]')?.value) || 0
    t += calcPosBetrag(l, vor, ort, nach)
  })
  const matSum = _rgMatSelected.reduce((s: number, m: any) => s + (m.vkPreis * m.menge), 0)
  t += matSum
  const matEl = document.getElementById('rMatGesamt')
  if (matEl) matEl.textContent = matSum.toFixed(2).replace('.', ',') + '€'
  const mEl = document.getElementById('rBetragManual') as HTMLInputElement
  const m   = parseFloat(mEl?.value || '')
  rCurrentBetrag = isNaN(m) ? Math.round(t * 100) / 100 : m
  const vbEl = document.getElementById('rVorBetrag')
  if (vbEl) vbEl.textContent = rCurrentBetrag.toFixed(2).replace('.', ',') + ' €'
  const gpEl = document.getElementById('rGesamtPos')
  if (gpEl) gpEl.textContent = String(document.querySelectorAll('#rPositionen > div').length)
}

export function rManualOverride(v: string) {
  rCurrentBetrag = v ? (parseFloat(v) || 0) : 0
  if (!v) { updGesamt() } else {
    const el = document.getElementById('rVorBetrag')
    if (el) el.textContent = rCurrentBetrag.toFixed(2).replace('.', ',') + ' €'
  }
}

export function collectPositionen(): any[] {
  const r: any[] = []
  document.querySelectorAll('#rPositionen > div').forEach((d: any) => {
    const l    = d.querySelector('.chip.on')?.dataset.l || ''; if (!l) return
    const vor  = parseInt(d.querySelector('[data-f="vor"]')?.value) || 0
    const ort  = parseInt(d.querySelector('[data-f="ort"]')?.value) || 0
    const nach = parseInt(d.querySelector('[data-f="nach"]')?.value) || 0
    r.push({
      leistung: l, vor, ort, nach,
      gesamt: vor + ort + nach,
      abrMin: Math.max(60, Math.ceil((vor + ort + nach) / 15) * 15),
      beschr: (d.querySelector('[data-f="beschr"]') as HTMLInputElement)?.value || '',
      betrag: calcPosBetrag(l, vor, ort, nach),
    })
  })
  return r
}

// ── rgMat-Picker (Material im Rechnungsmodal) ────────────────────
export function rgMatToggle() {
  const s = document.getElementById('rgMatSearch'); if (!s) return
  const vis = s.style.display !== 'none'
  s.style.display = vis ? 'none' : 'block'
  if (!vis) { (document.getElementById('rgMatQ') as HTMLInputElement).value = ''; rgMatFilter('') }
}

export function rgMatFilter(q: string) {
  const dd   = document.getElementById('rgMatDropdown')
  const mats = DB.materialien()
  const filtered = q
    ? mats.filter((m: any) =>
        m.bezeichnung.toLowerCase().includes(q.toLowerCase()) ||
        (m.artNr || '').toLowerCase().includes(q.toLowerCase()))
    : mats
  if (!filtered.length) { if (dd) dd.style.display = 'none'; return }
  if (dd) {
    dd.style.display = 'block'
    dd.innerHTML = (filtered as any[]).slice(0, 20).map((m: any) =>
      `<div onclick="rgMatAdd('${m.id}')" style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
        <div style="font-size:13px;font-weight:600;">${m.bezeichnung}</div>
        <div style="font-size:11px;color:var(--text2);">${m.artNr ? m.artNr + ' · ' : ''}${m.einheit || ''} ${m.vkPreis ? '· <span style=\'color:var(--teal)\'>' + m.vkPreis.toFixed(2).replace('.', ',') + '€</span>' : ''}</div>
      </div>`
    ).join('')
  }
}

export function rgMatAdd(id: string) {
  const m = DB.materialien().find((x: any) => x.id === id)
  if (!m) return
  if (_rgMatSelected.find((x: any) => x.id === id)) { showToast('Bereits hinzugefügt'); return }
  _rgMatSelected.push({ ...m, menge: 1 })
  ;(document.getElementById('rgMatQ') as HTMLInputElement).value = ''
  const dd = document.getElementById('rgMatDropdown'); if (dd) dd.style.display = 'none'
  const sr = document.getElementById('rgMatSearch');   if (sr) sr.style.display = 'none'
  _renderRgMatUsed()
  updGesamt()
}

function _renderRgMatUsed() {
  const el = document.getElementById('rgMatUsed'); if (!el) return
  el.innerHTML = _rgMatSelected.map((m: any, i: number) =>
    `<div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:6px 10px;border:1px solid var(--border);">
      <span style="font-size:13px;flex:1;">${m.bezeichnung}</span>
      <input type="number" value="${m.menge}" min="0.01" step="0.01" style="width:60px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:3px 7px;font-size:12px;" onchange="rgMatSetMenge(${i},this.value)" title="Menge">
      <span style="font-size:11px;color:var(--text3);">${m.einheit || 'Stk'}</span>
      ${m.vkPreis ? `<span style="font-size:12px;color:var(--teal);font-weight:700;">${(m.vkPreis * m.menge).toFixed(2).replace('.', ',')}€</span>` : ''}
      <button onclick="rgMatRemove(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0;">✕</button>
    </div>`
  ).join('')
  const el2 = document.getElementById('rMatGesamt')
  if (el2) el2.textContent = _rgMatSelected.reduce((s: number, m: any) => s + (m.vkPreis * m.menge), 0).toFixed(2).replace('.', ',') + '€'
}

export function rgMatSetMenge(i: number, val: string) {
  _rgMatSelected[i].menge = parseFloat(val) || 1
  _renderRgMatUsed(); updGesamt()
}

export function rgMatRemove(i: number) {
  _rgMatSelected.splice(i, 1)
  _renderRgMatUsed(); updGesamt()
}

export function rgMatKatalogNamen(): string {
  return DB.materialien().slice(0, 60).map((m: any) => m.bezeichnung).join(', ')
}

// ── Auftrag in Rechnung laden ────────────────────────────────────
export function loadRechnungAuftrag() {
  const id = (document.getElementById('rAuftragSel') as HTMLSelectElement)?.value
  const ai = document.getElementById('rAutoInfo')
  if (!id) { if (ai) ai.style.display = 'none'; return }
  const a = DB.auftraege().find((a: any) => a.id === id)
  const k = a ? DB.kunden().find((k: any) => k.id === a.kundeId) : null
  if (!a) return

  const nameEl = document.getElementById('rKundeName') as HTMLInputElement
  if (nameEl) nameEl.value = k ? k.name : ''
  const rd = document.getElementById('rDatum') as HTMLInputElement
  if (rd && a.datum) rd.value = a.datum
  const rma = document.getElementById('rMitarbeiter') as HTMLSelectElement
  if (rma && a.ma) {
    for (let i = 0; i < rma.options.length; i++) {
      if (rma.options[i].text === a.ma || rma.options[i].value === a.ma) rma.selectedIndex = i
    }
  }

  const docs   = DB.docs().filter((d: any) => d.auftragId === id)
  const doc    = docs.length ? docs[docs.length - 1] : null
  const vorMin = doc ? (doc.zeitVor || 0)            : 0
  const ortMin = doc ? (doc.zeitOrt || a.dauer || 60) : (a.dauer || 60)
  const nachMin= doc ? (doc.zeitNach || 0)           : 0
  const diktat = doc?.diktat?.trim() || ''
  const beschr = diktat ? diktat.slice(0, 220) + (diktat.length > 220 ? '…' : '') : ''

  const lcs     = getLcSatz()
  const leistung= a.leistung || ''
  const lcKey   = Object.keys(lcs).find(k =>
    leistung.includes(k.replace(/[^\w]/g, '').slice(0, 5)) || leistung === k
  ) || leistung

  const posEl = document.getElementById('rPositionen')
  if (posEl) posEl.innerHTML = ''

  if (doc?.leistungsBlocks?.length > 1) {
    doc.leistungsBlocks.forEach((bl: any) => {
      const blKey = bl.leistung && lcs[bl.leistung] !== undefined ? bl.leistung : lcKey
      addPosition(blKey, bl.dauer, 0, 0, beschr)
    })
  } else {
    addPosition(lcKey, ortMin, vorMin, nachMin, beschr)
  }

  const dh = document.getElementById('rDiktatHidden') as HTMLInputElement
  if (dh) dh.value = diktat

  if (ai) {
    ai.style.display = 'block'
    const infoText = document.getElementById('rAutoInfoText')
    const infoDikt = document.getElementById('rAutoInfoDiktat')
    if (doc) {
      const gesamt = vorMin + ortMin + nachMin
      const abrMin = Math.max(60, Math.ceil(gesamt / 15) * 15)
      if (infoText) infoText.textContent =
        'Dokumentation vom ' + fmtDate(doc.datum) +
        ' · Vor Ort: ' + ortMin + ' Min.' +
        (vorMin ? ' · Vorber.: ' + vorMin + ' Min.' : '') +
        (nachMin ? ' · Nachber.: ' + nachMin + ' Min.' : '') +
        ' → Abgerechnet: ' + abrMin + ' Min.'
      if (infoDikt) infoDikt.textContent = diktat ? '🎙 "' + diktat.slice(0, 120) + (diktat.length > 120 ? '…' : '') + '"' : ''
    } else {
      if (infoText) infoText.textContent = 'Zeiten aus Auftrag übernommen · ' + ortMin + ' Min. Vor Ort'
      if (infoDikt) infoDikt.textContent = 'Keine Nachtermin-Dokumentation vorhanden.'
    }
  }
}

export function goRStep(n: number) {
  ['rStep1', 'rStep2', 'rStep3'].forEach((id, i) => {
    const el = document.getElementById(id)
    if (el) el.style.display = i === n - 1 ? 'block' : 'none'
  })
  if (n === 2) buildRPreview()
}

export function buildRPreview() {
  const CONFIG   = getCfg()
  const auftragId= (document.getElementById('rAuftragSel') as HTMLSelectElement)?.value
  const a        = auftragId ? DB.auftraege().find((a: any) => a.id === auftragId) : null
  const k        = a ? DB.kunden().find((k: any) => k.id === a.kundeId) : null
  const name     = (document.getElementById('rKundeName') as HTMLInputElement)?.value || (k ? k.name : 'Kunde')
  const ma       = (document.getElementById('rMitarbeiter') as HTMLSelectElement)?.value || ''
  const dv       = (document.getElementById('rDatum') as HTMLInputElement)?.value
  const dt       = dv ? new Date(dv + 'T12:00:00').toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE')
  const pos      = collectPositionen()
  rCurrentNummer = nextRNr()

  const setT = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.textContent = val }
  const setH = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.innerHTML  = val }

  setT('rNummer', rCurrentNummer)
  setT('rPreviewKunde', name)
  const adEl = document.getElementById('rPreviewKundeAdresse')
  if (adEl) adEl.textContent = k ? k.adresse || '' : ''
  setT('rPreviewDatum', dt)
  setT('rPreviewMA', ma)

  if (!pos.length) {
    setT('rPreviewLeistung', '--'); setT('rPreviewZeit', ''); setT('rPreviewBeschreibung', '')
  } else if (pos.length === 1) {
    const p = pos[0]
    setT('rPreviewLeistung', p.leistung); setT('rPreviewZeit', p.abrMin + ' Min.')
    setT('rPreviewBeschreibung', p.beschr || p.leistung)
  } else {
    setT('rPreviewLeistung', 'Kombi (' + pos.length + ' Leistungen)')
    setT('rPreviewZeit', '')
    setH('rPreviewBeschreibung', pos.map(p =>
      '<div style="padding:4px 0;border-bottom:1px solid #e4e0d8;font-size:11px;"><strong>' + p.leistung + '</strong> · ' + p.abrMin + ' Min. · ' + p.betrag.toFixed(2).replace('.', ',') + '€' + (p.beschr ? ' — ' + p.beschr : '') + '</div>'
    ).join(''))
  }

  const bStr = rCurrentBetrag.toFixed(2).replace('.', ',') + ' €'
  setT('rPreviewBetrag', bStr); setT('rBarBetrag', bStr)
  setT('rIbanVwz', 'Rechnung ' + rCurrentNummer); setT('rPaypalNr', rCurrentNummer)

  const diktatVal = (document.getElementById('rDiktatHidden') as HTMLInputElement)?.value || ''
  const nb = document.getElementById('rPreviewNotizenBlock')
  const de = document.getElementById('rPreviewDiktat')
  if (nb && de) { if (diktatVal) { nb.style.display = 'block'; de.textContent = diktatVal } else { nb.style.display = 'none'; de.textContent = '' } }

  const footerEl = document.getElementById('rPreviewFooter')
  if (footerEl && CONFIG.firma) {
    footerEl.innerHTML = CONFIG.firma.name + ' · ' + CONFIG.firma.adresse + ' · ' + CONFIG.firma.telefon + ' · ' + CONFIG.firma.email + '<br>' + (CONFIG.abrechnung?.rechnungsFusszeile || '')
  }
}

export function showZahlungDetails(t: string) {
  ;['Bar', 'Iban', 'Paypal'].forEach(x => {
    const el = document.getElementById('zDetail' + x)
    if (el) el.style.display = x.toLowerCase() === t ? 'block' : 'none'
  })
}

export function calcWechsel() {
  const e  = parseFloat((document.getElementById('rBarErhalten') as HTMLInputElement)?.value || '') || 0
  const el = document.getElementById('rWechsel')
  if (el) el.textContent = (e >= rCurrentBetrag ? (e - rCurrentBetrag).toFixed(2).replace('.', ',') : '--') + ' €'
}

// ── Rechnung speichern ───────────────────────────────────────────
export function saveRechnungData(bezahlt: boolean, unterschrift: string | null = null): any {
  const aid  = (document.getElementById('rAuftragSel') as HTMLSelectElement)?.value
  const a    = aid ? DB.auftraege().find((a: any) => a.id === aid) : null
  const k    = a ? DB.kunden().find((k: any) => k.id === a.kundeId) : null
  const name = (document.getElementById('rKundeName') as HTMLInputElement)?.value || (k ? k.name : 'Kunde')
  const pos  = collectPositionen()
  const lbl  = pos.length === 1 ? pos[0].leistung : 'Kombi (' + pos.map((p: any) => p.leistung).join(', ') + ')'
  const datum= (document.getElementById('rDatum') as HTMLInputElement)?.value || today()
  const faellig = new Date(new Date(datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000)
    .toISOString().split('T')[0]
  const mState = (window as any).mState || {}

  const r: any = {
    id: uid(), nummer: rCurrentNummer,
    auftragId: aid || null, kundeId: a ? a.kundeId : null,
    kundeName: name, kundeAdresse: k ? k.adresse || '' : '',
    leistung: lbl, positionen: pos,
    materialien: _rgMatSelected.map((m: any) => ({
      bezeichnung: m.bezeichnung, einheit: m.einheit, vkPreis: m.vkPreis, menge: m.menge,
    })),
    betrag: rCurrentBetrag,
    ma: (document.getElementById('rMitarbeiter') as HTMLSelectElement)?.value || '',
    zahlung: mState.rZahlung || '--',
    bezahlt, datum, faellig_am: faellig,
    unterschrift: unterschrift || null, mahnStufe: 0,
  }
  const rg = DB.rechnungen().slice(); rg.push(r); DB.saveRechnungen(rg)

  if (aid && bezahlt) {
    const af = DB.auftraege()
    const ai = af.findIndex((a: any) => a.id === aid)
    if (ai >= 0) { af[ai].status = 'erledigt'; af[ai].preis = rCurrentBetrag; DB.saveAuftraege(af) }
  }
  _onDataChange()
  return r
}

export function bezahltBestaetigen() {
  _openSigModal((sigDataUrl: string | null) => {
    const r = saveRechnungData(true, sigDataUrl)
    const bt = document.getElementById('rBestaetigungText')
    if (bt) bt.innerHTML = '<strong>' + r.kundeName + '</strong> hat ' + r.betrag.toFixed(2).replace('.', ',') + '€ bezahlt.'
    goRStep(3)
    const sb = (window as any)._supabase
    sb?.auth.getUser().then(({ data: { user } }: any) => {
      if (user) _triggerPush('rechnung_bezahlt', user.id, 'Rechnung bezahlt',
        r.kundeName + ' · ' + r.betrag.toFixed(2).replace('.', ',') + ' €')
    })
  })
}

export function offenLassen() {
  _openSigModal((sigDataUrl: string | null) => {
    const r = saveRechnungData(false, sigDataUrl)
    const bt = document.getElementById('rBestaetigungText')
    if (bt) bt.innerHTML = 'Rechnung <strong>' + r.nummer + '</strong> offen gespeichert.'
    goRStep(3)
  })
}

// ── PDF-Export ───────────────────────────────────────────────────
export function _pdfOpts(filename: string) {
  return {
    margin: [12, 12, 12, 12], filename,
    image: { type: 'jpeg', quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }
}

export function downloadRechnungPDFModal() {
  const el = document.getElementById('rechnungPreview')
  if (!el) { showToast('Keine Vorschau vorhanden'); return }
  const nr = document.getElementById('rNummer')?.textContent || 'export'
  showToast('PDF wird erstellt…')
  ;(window as any).html2pdf().set(_pdfOpts('Rechnung_' + nr + '.pdf')).from(el).save()
    .then(() => showToast('PDF heruntergeladen ✓'))
}

export function downloadRechnungPDFData(id: string) {
  const CONFIG = getCfg()
  const r = DB.rechnungen().find((r: any) => r.id === id)
  if (!r) { showToast('Rechnung nicht gefunden'); return }
  const pos    = r.positionen || []
  const posHTML= pos.length === 1
    ? '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="font-weight:700;">' + pos[0].leistung + '</span><span style="color:#7a9088;">' + pos[0].abrMin + ' Min.</span></div>'
      + '<div style="font-size:11px;color:#4a5550;line-height:1.55;">' + (pos[0].beschr || pos[0].leistung) + '</div>'
    : pos.map((p: any) =>
        '<div style="padding:5px 0;border-bottom:1px solid #e4e0d8;font-size:11px;"><strong>' + p.leistung + '</strong> · ' + p.abrMin + ' Min. · ' + p.betrag.toFixed(2).replace('.', ',') + '€' + (p.beschr ? ' — ' + p.beschr : '') + '</div>'
      ).join('')
  const dt  = r.datum ? new Date(r.datum + 'T12:00:00').toLocaleDateString('de-DE') : '-'
  const f   = CONFIG.firma || {}
  const fuss= f.name + ' · ' + f.adresse + ' · ' + f.telefon + ' · ' + f.email + '<br>' + (CONFIG.abrechnung?.rechnungsFusszeile || '')
  const html = `<div style="background:white;padding:24px 28px;font-family:Arial,sans-serif;color:#1a1f1c;max-width:680px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #00c4a8;">
      <div>
        <div style="font-size:24px;font-weight:700;color:#1a1f1c;">${f.name || ''}</div>
        <div style="font-size:11px;color:#7a9088;font-style:italic;">${f.tagline || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#7a9088;font-weight:700;text-transform:uppercase;">Rechnung</div>
        <div style="font-size:15px;font-weight:700;color:#00c4a8;">${r.nummer || '-'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;font-size:12px;">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-bottom:3px;">Empfänger</div>
        <div style="font-weight:600;">${r.kundeName || '-'}</div>
        ${r.kundeAdresse ? '<div style="font-size:11px;color:#7a9088;margin-top:2px;">' + r.kundeAdresse + '</div>' : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-bottom:3px;">Datum</div>
        <div style="font-weight:600;">${dt}</div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-top:5px;margin-bottom:3px;">Mitarbeiter</div>
        <div>${r.ma || '-'}</div>
      </div>
    </div>
    <div style="background:#f7f6f2;border-radius:8px;padding:12px 14px;margin-bottom:14px;">${posHTML}</div>
    ${r.diktat ? '<div style="background:#f0faf5;border-radius:8px;padding:10px 13px;margin-bottom:14px;border-left:3px solid #00c4a8;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#7a9088;margin-bottom:4px;">Dokumentation / Notizen</div><div style="font-size:11px;color:#3a5048;line-height:1.6;">' + r.diktat + '</div></div>' : ''}
    <div style="background:#00c4a8;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:11px;color:rgba(13,21,32,0.75);">Gesamt (netto, §19 UStG)</div>
      <div style="font-size:22px;font-weight:700;color:#0d1520;">${r.betrag.toFixed(2).replace('.', ',')} €</div>
    </div>
    <div style="font-size:10px;color:#9aada6;line-height:1.6;">${fuss}</div>
  </div>`
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  document.body.appendChild(wrapper)
  showToast('PDF wird erstellt…')
  ;(window as any).html2pdf().set(_pdfOpts('Rechnung_' + (r.nummer || id) + '.pdf')).from(wrapper.firstChild).save()
    .then(() => { document.body.removeChild(wrapper); showToast('PDF heruntergeladen ✓') })
}

// ── Reset Rechnungs-Modal ────────────────────────────────────────
export function resetRModal() {
  ;['rStep2', 'rStep3'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none' })
  const s1 = document.getElementById('rStep1'); if (s1) s1.style.display = 'block'
  ;['rAuftragSel', 'rKundeName', 'rBetragManual'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement; if (el) el.value = ''
  })
  const rd = document.getElementById('rDatum') as HTMLInputElement; if (rd) rd.value = today()
  const rp = document.getElementById('rPositionen');                if (rp) rp.innerHTML = ''
  document.querySelectorAll('#rZahlungChips .chip').forEach((c: any) => c.classList.remove('on'))
  ;['Bar', 'Iban', 'Paypal'].forEach(t => { const el = document.getElementById('zDetail' + t); if (el) el.style.display = 'none' })
  const mState = (window as any).mState; if (mState) delete mState.rZahlung
  rCurrentBetrag = 0; rCurrentNummer = ''
  const vb = document.getElementById('rVorBetrag'); if (vb) vb.textContent = '0,00 €'
  const gp = document.getElementById('rGesamtPos'); if (gp) gp.textContent = '0'
  const ai = document.getElementById('rAutoInfo');  if (ai) ai.style.display = 'none'
  const dh = document.getElementById('rDiktatHidden') as HTMLInputElement; if (dh) dh.value = ''
  const nb = document.getElementById('rPreviewNotizenBlock');              if (nb) nb.style.display = 'none'
  _rgMatSelected = []
  const rmu = document.getElementById('rgMatUsed');   if (rmu) rmu.innerHTML = ''
  const rms = document.getElementById('rgMatSearch'); if (rms) rms.style.display = 'none'
  const rmg = document.getElementById('rMatGesamt');  if (rmg) rmg.textContent = '0,00€'
  addPosition()
}

// ── ZUGFeRD XML ──────────────────────────────────────────────────
export function generateZUGFeRDXml(r: any): string {
  const CONFIG = getCfg()
  const f      = CONFIG.firma || {}
  const fmt    = (d: string) => d ? d.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')
  const faelligFmt = r.faellig_am
    ? r.faellig_am.replace(/-/g, '')
    : new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000)
        .toISOString().split('T')[0].replace(/-/g, '')
  const betrag = r.betrag.toFixed(2)
  const esc    = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(r.nummer || r.id)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${fmt(r.datum)}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(f.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(f.adresse)}</ram:LineOne>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${f.email || ''}</ram:URIID>
        </ram:URIUniversalCommunication>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(r.kundeName)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(r.kundeAdresse)}</ram:LineOne>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(r.nummer || r.id)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${f.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${f.iban.replace(/\s/g, '')}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>0.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:ExemptionReason>Umsatzsteuerbefreiung gemäß §19 UStG</ram:ExemptionReason>
        <ram:BasisAmount>${betrag}</ram:BasisAmount>
        <ram:CategoryCode>E</ram:CategoryCode>
        <ram:RateApplicablePercent>0</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime><udt:DateTimeString format="102">${faelligFmt}</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${betrag}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${betrag}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${betrag}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${betrag}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
}

export function downloadZUGFeRDXml(id: string) {
  const r = DB.rechnungen().find((r: any) => r.id === id)
  if (!r) { showToast('Rechnung nicht gefunden'); return }
  const xml  = generateZUGFeRDXml(r)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = (r.nummer || r.id) + '_ZUGFeRD.xml'; a.click()
  URL.revokeObjectURL(url)
  showToast('📋 ZUGFeRD-XML heruntergeladen')
}

// ── ZUGFeRD 2.1 / EN 16931 PDF (vollständig eingebettetes XML) ───
export async function downloadZUGFeRDPdfById(id: string) {
  const CONFIG = getCfg()
  const r = DB.rechnungen().find((r: any) => r.id === id)
  if (!r) { showToast('Rechnung nicht gefunden'); return }

  showToast('⏳ ZUGFeRD PDF wird erstellt…')

  // Rechnung mit Firmadaten anreichern
  const rMitFirma = {
    ...r,
    firma: CONFIG.firma || {},
  }

  // Gleichen HTML-Wrapper wie downloadRechnungPDFData verwenden
  const pos     = r.positionen || []
  const posHTML = pos.length === 1
    ? '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="font-weight:700;">'
        + pos[0].leistung + '</span><span style="color:#7a9088;">' + pos[0].abrMin + ' Min.</span></div>'
      + '<div style="font-size:11px;color:#4a5550;line-height:1.55;">' + (pos[0].beschr || pos[0].leistung) + '</div>'
    : pos.map((p: any) =>
        '<div style="padding:5px 0;border-bottom:1px solid #e4e0d8;font-size:11px;"><strong>'
          + p.leistung + '</strong> · ' + p.abrMin + ' Min. · '
          + (p.betrag || 0).toFixed(2).replace('.', ',') + '€'
          + (p.beschr ? ' — ' + p.beschr : '') + '</div>'
      ).join('')

  const dt  = r.datum ? new Date(r.datum + 'T12:00:00').toLocaleDateString('de-DE') : '-'
  const f   = CONFIG.firma || {}
  const fuss= f.name + ' · ' + f.adresse + ' · ' + f.telefon + ' · ' + f.email
              + '<br>' + (CONFIG.abrechnung?.rechnungsFusszeile || '')

  const html = `<div style="background:white;padding:24px 28px;font-family:Arial,sans-serif;color:#1a1f1c;max-width:680px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #00c4a8;">
      <div>
        <div style="font-size:24px;font-weight:700;color:#1a1f1c;">${f.name || ''}</div>
        <div style="font-size:11px;color:#7a9088;font-style:italic;">${f.tagline || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#7a9088;font-weight:700;text-transform:uppercase;">Rechnung</div>
        <div style="font-size:15px;font-weight:700;color:#00c4a8;">${r.nummer || '-'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;font-size:12px;">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-bottom:3px;">Empfänger</div>
        <div style="font-weight:600;">${r.kundeName || '-'}</div>
        ${r.kundeAdresse ? '<div style="font-size:11px;color:#7a9088;margin-top:2px;">' + r.kundeAdresse + '</div>' : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-bottom:3px;">Datum</div>
        <div style="font-weight:600;">${dt}</div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-top:5px;margin-bottom:3px;">Mitarbeiter</div>
        <div>${r.ma || '-'}</div>
      </div>
    </div>
    <div style="background:#f7f6f2;border-radius:8px;padding:12px 14px;margin-bottom:14px;">${posHTML}</div>
    ${r.diktat ? '<div style="background:#f0faf5;border-radius:8px;padding:10px 13px;margin-bottom:14px;border-left:3px solid #00c4a8;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#7a9088;margin-bottom:4px;">Dokumentation</div><div style="font-size:11px;color:#3a5048;line-height:1.6;">' + r.diktat + '</div></div>' : ''}
    <div style="background:#00c4a8;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:11px;color:rgba(13,21,32,0.75);">Gesamt (netto, §19 UStG)</div>
      <div style="font-size:22px;font-weight:700;color:#0d1520;">${r.betrag.toFixed(2).replace('.', ',')} €</div>
    </div>
    <div style="background:#f0faf5;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:10px;color:#3a5048;border:1px solid rgba(0,196,168,0.2);">
      <strong>ZUGFeRD 2.1 / Factur-X EN 16931</strong> — Diese Rechnung enthält ein eingebettetes XML-Dokument gemäß EU-Norm EN 16931.
    </div>
    <div style="font-size:10px;color:#9aada6;line-height:1.6;">${fuss}</div>
  </div>`

  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  document.body.appendChild(wrapper)

  try {
    await downloadZUGFeRDPdf(rMitFirma, wrapper.firstChild as HTMLElement)
    showToast('✅ ZUGFeRD PDF heruntergeladen')
  } catch (err) {
    console.error('ZUGFeRD PDF Fehler:', err)
    showToast('⚠ Fehler beim Erstellen des ZUGFeRD PDF')
  } finally {
    document.body.removeChild(wrapper)
  }
}

// ── Aliase für Legacy-Window-Exports ─────────────────────────────
export const sendMahnung    = mahnungErstellen
export const generateRechnungPDF = downloadRechnungPDFModal
export const downloadRechnungPDF = downloadRechnungPDFData
export const exportZugferd  = downloadZUGFeRDPdfById

// ── Render ───────────────────────────────────────────────────────
export function renderRechnung() {
  const rechnungen = DB.rechnungen()
  const tk = today()
  const mk = tk.slice(0, 7)

  const rOffenEl  = document.getElementById('rOffen')
  const rHeuteEl  = document.getElementById('rHeute')
  const rMonatEl  = document.getElementById('rMonat')
  if (rOffenEl) rOffenEl.textContent = String(rechnungen.filter((r: any) => !r.bezahlt).length)
  if (rHeuteEl) rHeuteEl.textContent = Math.round(
    rechnungen.filter((r: any) => r.bezahlt && r.datum === tk).reduce((s: number, r: any) => s + r.betrag, 0)
  ) + ' €'
  if (rMonatEl) rMonatEl.textContent = Math.round(
    rechnungen.filter((r: any) => r.bezahlt && r.datum.startsWith(mk)).reduce((s: number, r: any) => s + r.betrag, 0)
  ) + ' €'

  const ueberfaellig = rechnungen.filter((r: any) =>
    ['ueberfaellig1', 'ueberfaellig2', 'mahnung1', 'mahnung2'].includes(getRgStatus(r))
  )
  let banner = document.getElementById('rgUeberfaelligBanner')
  if (!banner) {
    banner = document.createElement('div'); banner.id = 'rgUeberfaelligBanner'
    const page = document.getElementById('page-rechnung')
    const card = page?.querySelector('.card')
    if (card && page) page.insertBefore(banner, card)
  }
  if (ueberfaellig.length) {
    const summe = ueberfaellig.reduce((s: number, r: any) => s + r.betrag, 0)
    banner.innerHTML = `<div style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.25);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:22px;">🔴</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--red);">${ueberfaellig.length} Rechnung${ueberfaellig.length > 1 ? 'en' : ''} überfällig</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px;">Offener Betrag: <strong style="color:var(--red)">${summe.toFixed(2).replace('.', ',')} €</strong> — älter als ${FAELLIGKEIT_TAGE} Tage</div>
      </div>
    </div>`
  } else { banner.innerHTML = '' }

  const tb = document.getElementById('rechnungTbody'); if (!tb) return
  if (!rechnungen.length) {
    tb.innerHTML = `<tr><td colspan="7" style="padding:0;border:none;"><div class="empty-state" style="border:none;border-radius:0;">
      <div class="empty-state-icon">🧾</div>
      <div class="empty-state-title">Noch keine Rechnungen erstellt</div>
      <div class="empty-state-sub">Erstelle deine erste Rechnung direkt nach dem Kundentermin.</div>
      <button class="btn btn-teal" data-action="open-modal-rechnung">+ Erste Rechnung erstellen</button>
    </div></td></tr>`
    tb.querySelector('[data-action="open-modal-rechnung"]')
      ?.addEventListener('click', () => (window as any).openModal('modalRechnung'))
    return
  }

  tb.innerHTML = [...rechnungen].reverse().map((r: any) => {
    const s        = getRgStatus(r)
    const isRed    = ['ueberfaellig1', 'ueberfaellig2', 'mahnung1', 'mahnung2'].includes(s)
    const faelligStr = r.faellig_am
      ? fmtDate(r.faellig_am)
      : fmtDate(new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000).toISOString().split('T')[0])

    return `<tr style="${isRed ? 'background:rgba(255,95,95,0.04);' : ''}">
      <td><strong>${r.kundeName}</strong>${r.nummer ? `<div style="font-size:10px;color:var(--text3);">${r.nummer}</div>` : ''}</td>
      <td style="font-size:12px;">${r.leistung}</td>
      <td><div>${fmtDate(r.datum)}</div><div style="font-size:10px;color:var(--text3);">Fällig: ${faelligStr}</div></td>
      <td style="color:var(--green);font-weight:700;">${r.betrag.toFixed(2).replace('.', ',')} €</td>
      <td>${getRgStatusBadge(r)}</td>
      <td style="white-space:nowrap;">
        <button data-rg-pdf="${r.id}" style="background:none;border:1px solid rgba(0,196,168,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--teal);cursor:pointer;margin-right:3px;">⬇ PDF</button>
        <button data-rg-xml="${r.id}" style="background:none;border:1px solid rgba(90,171,255,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--blue);cursor:pointer;" title="ZUGFeRD 2.1 / Factur-X EN 16931">📋 ZUGFeRD</button>
      </td>
      <td style="white-space:nowrap;">${getRgAktionen(r)}</td>
    </tr>`
  }).join('')
}

// ── Bezahlt markieren ────────────────────────────────────────────
export function markBezahlt(id: string) {
  const rechnungen = DB.rechnungen()
  const i = rechnungen.findIndex((r: any) => r.id === id); if (i < 0) return
  rechnungen[i].bezahlt = true; rechnungen[i].zahlung = 'Nachtraglich'
  DB.saveRechnungen(rechnungen); renderRechnung(); _onDataChange()
  showToast('✓ Als bezahlt markiert!')
  const sb = (window as any)._supabase
  sb?.auth.getUser().then(({ data: { user } }: any) => {
    if (user) _triggerPush('rechnung_bezahlt', user.id, 'Rechnung bezahlt',
      `${rechnungen[i].kundeName || 'Kunde'} · ${(rechnungen[i].betrag || 0).toFixed(2).replace('.', ',')} €`)
  })
}

// ── Mahnung erstellen ────────────────────────────────────────────
export function mahnungErstellen(id: string, stufe?: number) {
  const rechnungen = DB.rechnungen()
  const i = rechnungen.findIndex((r: any) => r.id === id); if (i < 0) return
  const r = rechnungen[i]

  if (!stufe) {
    const s = getRgStatus(r)
    stufe = (s === 'ueberfaellig2' || s === 'mahnung2') ? 2 : 1
  }
  const aktStufe = r.mahnStufe ?? (r.mahnStatus === 'gemahnt' ? 1 : 0)
  if (stufe > aktStufe) {
    rechnungen[i].mahnStufe  = stufe
    rechnungen[i].mahnStatus = stufe >= 2 ? 'mahnung2' : 'mahnung1'
    rechnungen[i][stufe === 1 ? 'mahnung1Datum' : 'mahnung2Datum'] = today()
    DB.saveRechnungen(rechnungen); renderRechnung()
  }

  const CONFIG      = getCfg(); const f = CONFIG.firma || {}
  const tageSeit    = Math.max(0, getTageSeitFaelligkeit(r))
  const zinsen      = stufe >= 2 ? calcVerzugszinsen(r) : 0
  const gesamtFord  = r.betrag + zinsen
  const faelligStr  = r.faellig_am ? fmtDate(r.faellig_am)
    : fmtDate(new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000).toISOString().split('T')[0])
  const neuesFaellig = new Date(Date.now() + 7 * 86400000).toLocaleDateString('de-DE')
  const headerColor  = stufe >= 2 ? '#ff5f5f' : '#f0a500'
  const titel        = stufe >= 2 ? '2. Mahnung (Letzte Mahnung)' : '1. Zahlungserinnerung'
  const intro        = stufe >= 2
    ? `trotz unserer Zahlungserinnerung vom ${r.mahnung1Datum ? fmtDate(r.mahnung1Datum) : '–'} ist die folgende Rechnung bis heute nicht beglichen worden. Wir fordern Sie hiermit letztmalig zur Begleichung Ihrer Verbindlichkeiten auf.`
    : `trotz unserer Leistungserbringung ist die folgende Rechnung noch nicht beglichen. Bitte überprüfen Sie, ob die Zahlung möglicherweise vergessen wurde.`

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;'
  wrapper.innerHTML = `
  <div style="font-family:Arial,sans-serif;background:white;padding:40px;width:700px;color:#1a1f1c;font-size:13px;line-height:1.7;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid ${headerColor};">
      <div>
        <div style="font-size:24px;font-weight:700;">${f.name || ''}</div>
        <div style="font-size:11px;color:#7a9088;">${f.adresse || ''}</div>
        <div style="font-size:11px;color:#7a9088;">${f.telefon || ''} · ${f.email || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#7a9088;font-weight:700;text-transform:uppercase;">Mahnschreiben</div>
        <div style="font-size:16px;font-weight:700;color:${headerColor};">${titel}</div>
        <div style="font-size:11px;color:#7a9088;margin-top:4px;">${new Date().toLocaleDateString('de-DE')}</div>
      </div>
    </div>
    <div style="margin-bottom:24px;"><div style="font-weight:700;">${r.kundeName}</div></div>
    <div style="font-size:15px;font-weight:700;margin-bottom:12px;">Betreff: ${titel} zur Rechnung ${r.nummer || r.id}</div>
    <p>Sehr geehrte Damen und Herren,</p>
    <p style="margin-top:10px;">${intro}</p>
    <div style="background:#fff8f0;border:1px solid ${headerColor}44;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
        <div style="color:#7a9088;">Rechnungsnummer</div><div style="font-weight:700;">${r.nummer || r.id}</div>
        <div style="color:#7a9088;">Rechnungsdatum</div><div>${fmtDate(r.datum)}</div>
        <div style="color:#7a9088;">Zahlungsziel</div><div>${faelligStr}</div>
        <div style="color:#7a9088;">Überfällig seit</div><div style="color:${headerColor};font-weight:700;">${tageSeit} Tagen</div>
        <div style="color:#7a9088;padding-top:8px;border-top:1px solid #eee;">Rechnungsbetrag</div>
        <div style="padding-top:8px;border-top:1px solid #eee;">${r.betrag.toFixed(2).replace('.', ',')} €</div>
        ${stufe >= 2 ? `<div style="color:#7a9088;">Verzugszinsen (${VERZUGSZINS_PROZENT}% p.a.)</div><div style="color:${headerColor};">${zinsen.toFixed(2).replace('.', ',')} €</div>` : ''}
        <div style="color:#7a9088;font-size:15px;font-weight:700;padding-top:8px;border-top:2px solid ${headerColor}44;">Gesamtforderung</div>
        <div style="font-size:18px;font-weight:700;color:${headerColor};padding-top:8px;border-top:2px solid ${headerColor}44;">${gesamtFord.toFixed(2).replace('.', ',')} €</div>
      </div>
    </div>
    <p>Bitte überweisen Sie <strong>${gesamtFord.toFixed(2).replace('.', ',')} €</strong> bis <strong>${neuesFaellig}</strong>:</p>
    <div style="background:#f7f6f2;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:13px;">
      <div><strong>IBAN:</strong> ${f.iban || '–'}</div>
      <div><strong>Verwendungszweck:</strong> Rechnung ${r.nummer || r.id}</div>
      ${f.paypal ? `<div><strong>PayPal:</strong> ${f.paypal}</div>` : ''}
    </div>
    <p>Mit freundlichen Grüßen,<br><strong>${f.name || ''}</strong></p>
    <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:10px;color:#9aada6;">${f.name || ''} · ${f.adresse || ''} · ${f.email || ''}</div>
  </div>`

  document.body.appendChild(wrapper)
  const fname    = (stufe >= 2 ? '2_Mahnung_' : 'Zahlungserinnerung_') + r.nummer + '_' + r.kundeName + '.pdf'
  const html2pdf = (window as any).html2pdf
  if (!html2pdf) { showToast('⚠ html2pdf nicht geladen'); document.body.removeChild(wrapper); return }
  html2pdf().set({ margin: 0, filename: fname, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } })
    .from(wrapper.firstChild).save()
    .then(() => { document.body.removeChild(wrapper); showToast(`📄 ${stufe >= 2 ? '2. Mahnung' : 'Zahlungserinnerung'} heruntergeladen`) })
}
