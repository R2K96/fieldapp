// @ts-nocheck
// ── Schnellerfassung-Modul ───────────────────────────────────────
// Sprach-Diktat → KI-Analyse (Groq-Proxy) → Kunde/Auftrag anlegen.

import { DB } from '../lib/db'
import { today, showToast } from '../lib/utils'
import { openModal } from './ui'
import { SUPA_URL } from '../lib/config'
import { getAccessToken } from '../lib/db'

// ── Modul-State ──────────────────────────────────────────────────
let _seRec         = false
let _seRecognition: any = null

// ── Callbacks ────────────────────────────────────────────────────
let _onCloseModal: (id: string) => void = (id) => (window as any).closeModal?.(id)

export function onSeCloseModal(fn: (id: string) => void) { _onCloseModal = fn }

// ── Initialisierung ──────────────────────────────────────────────
export function initSchnellerfassung() {
  document.getElementById('seMicBtn')?.addEventListener('click', seToggleRec)
  document.getElementById('seAnalyseBtn')?.addEventListener('click', seAnalysieren)
  document.getElementById('btnCloseSchnellerfassung')?.addEventListener('click', closeSchnellerfassung)
}

// ── Modal öffnen / schließen ─────────────────────────────────────
export function openSchnellerfassung() {
  const modal      = document.getElementById('seModal')
  const transcript = document.getElementById('seTranscript') as HTMLTextAreaElement
  const analyseBtn = document.getElementById('seAnalyseBtn')
  const preview    = document.getElementById('sePreview')
  const status     = document.getElementById('seStatus')

  if (modal)      modal.style.display = 'flex'
  if (transcript) transcript.value    = ''
  if (analyseBtn) analyseBtn.style.display = 'none'
  if (preview)    preview.style.display    = 'none'
  if (status)     status.textContent = 'Tippe auf das Mikrofon und diktiere einen Kunden oder Auftrag.'
}

export function closeSchnellerfassung() {
  seStopRec()
  const modal = document.getElementById('seModal')
  if (modal) modal.style.display = 'none'
}

// ── Aufnahme ─────────────────────────────────────────────────────
export function seToggleRec() {
  if (_seRec) seStopRec(); else seStartRec()
}

export function seStartRec() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const statusEl  = document.getElementById('seStatus')
  const transcript = document.getElementById('seTranscript') as HTMLTextAreaElement

  if (!SR) {
    if (statusEl) statusEl.textContent = '⚠ Spracherkennung nur in Chrome verfügbar. Text manuell eingeben.'
    transcript?.focus()
    return
  }

  _seRecognition           = new SR()
  _seRecognition.lang      = 'de-DE'
  _seRecognition.continuous     = true
  _seRecognition.interimResults = true

  let finalBuf = transcript?.value || ''

  _seRecognition.onresult = (e: any) => {
    let interim = '', newFinal = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) newFinal += t + ' '
      else interim += t
    }
    if (newFinal) {
      finalBuf += newFinal
      if (transcript) transcript.value = finalBuf
      const analyseBtn = document.getElementById('seAnalyseBtn')
      if (analyseBtn) analyseBtn.style.display = 'block'
    }
    if (statusEl) statusEl.textContent = interim ? '🎙 ' + interim : '🎙 Aufnahme läuft…'
  }

  _seRecognition.onerror = (ev: any) => { if (ev.error !== 'no-speech') seStopRec() }
  _seRecognition.onend   = () => { if (_seRec) _seRecognition.start() }
  _seRecognition.start()
  _seRec = true

  const btn = document.getElementById('seMicBtn')
  if (btn) { btn.textContent = '⏹'; (btn as HTMLElement).style.background = 'var(--red)' }
  if (statusEl) statusEl.textContent = '🎙 Aufnahme läuft…'
}

export function seStopRec() {
  if (_seRecognition) { try { _seRecognition.stop() } catch(e){} _seRecognition = null }
  _seRec = false

  const btn = document.getElementById('seMicBtn')
  if (btn) { btn.textContent = '🎙'; (btn as HTMLElement).style.background = 'var(--teal)' }

  const text      = (document.getElementById('seTranscript') as HTMLTextAreaElement)?.value?.trim()
  const analyseBtn = document.getElementById('seAnalyseBtn')
  const statusEl   = document.getElementById('seStatus')
  if (text) {
    if (analyseBtn) analyseBtn.style.display = 'block'
    if (statusEl)   statusEl.textContent = 'Aufnahme gestoppt. Jetzt analysieren.'
  }
}

// ── KI-Analyse ───────────────────────────────────────────────────
export async function seAnalysieren() {
  const text      = (document.getElementById('seTranscript') as HTMLTextAreaElement)?.value?.trim()
  const analyseBtn = document.getElementById('seAnalyseBtn') as HTMLButtonElement
  const statusEl   = document.getElementById('seStatus')

  if (!text) return

  if (analyseBtn) { analyseBtn.textContent = '⏳ Analysiere…'; analyseBtn.disabled = true }
  if (statusEl)   statusEl.textContent = 'KI analysiert deinen Text…'

  const kunden           = DB.kunden().map((k: any) => k.name).join(', ')
  const katalogNamen     = DB.materialien().slice(0, 60).map((m: any) => m.bezeichnung).join(', ')
  const katalogHinweis   = katalogNamen ? `\nMaterialkatalog des Unternehmens: ${katalogNamen}` : ''

  const prompt = `Du bist ein Assistent für einen Außendienstmitarbeiter. Analysiere dieses Diktat und erkenne ob ein neuer Kunde, ein neuer Auftrag oder beides erfasst werden soll.

Diktat: "${text}"

Bekannte Kunden: ${kunden || 'keine'}
Heutiges Datum: ${today()}${katalogHinweis}

Antworte NUR mit JSON (kein Markdown, keine Erklärung):
{
  "typ": "kunde" | "auftrag" | "beides",
  "kunde": {
    "name": "<Vollständiger Name oder null>",
    "adresse": "<Straße, PLZ Ort oder null>",
    "telefon": "<Telefonnummer oder null>",
    "notiz": "<Kurze Notiz oder null>"
  },
  "auftrag": {
    "kundenname": "<Name des Kunden aus bekannter Liste oder neu erkanntem Kunden, oder null>",
    "leistung": "<Handwerk|Bürokratie|Steuer|Digital|Botendienst|Garten oder null>",
    "datum": "<YYYY-MM-DD oder null>",
    "dauer": <Minuten als Zahl oder 60>,
    "notiz": "<Kurze Beschreibung was zu tun ist oder null>"
  }
}`

  try {
    const token = getAccessToken()
    const res   = await fetch(`${SUPA_URL}/functions/v1/groq-proxy`, {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ action: 'chat', messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error('Proxy HTTP ' + res.status)
    const data   = await res.json()
    if (data.error) throw new Error(data.error)
    const raw    = data.content.trim().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw)
    seZeigeVorschau(parsed)
  } catch(e: any) {
    if (statusEl) statusEl.textContent = '⚠ Fehler: ' + e.message
  } finally {
    if (analyseBtn) { analyseBtn.textContent = '🧠 Analysieren'; analyseBtn.disabled = false }
  }
}

// ── Vorschau anzeigen ────────────────────────────────────────────
export function seZeigeVorschau(json: any) {
  ;(window as any)._seJson = json
  const p = document.getElementById('sePreviewContent')
  if (!p) return

  const inp = (id: string, val: any, ph: string) =>
    `<input class="inp" id="${id}" value="${String(val || '').replace(/"/g, '&quot;')}" placeholder="${ph}" style="margin-bottom:6px;font-size:12px;">`

  let html = ''

  if ((json.typ === 'kunde' || json.typ === 'beides') && json.kunde?.name) {
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--teal);margin-bottom:8px;">👤 Neuer Kunde</div>
      <label class="lbl">Name</label>${inp('seKName', json.kunde.name, 'Name')}
      <label class="lbl">Adresse</label>${inp('seKAdresse', json.kunde.adresse, 'Straße, PLZ Ort')}
      <label class="lbl">Telefon</label>${inp('seKTelefon', json.kunde.telefon, 'Telefon')}
      <label class="lbl">Notiz</label>${inp('seKNotiz', json.kunde.notiz, 'Notiz')}
      <button class="btn btn-teal btn-full" id="seKundeAnlegenBtn" style="margin-top:4px;">✓ Kunde anlegen</button>
    </div>`
  }

  if ((json.typ === 'auftrag' || json.typ === 'beides') && json.auftrag) {
    const a = json.auftrag
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--teal);margin-bottom:8px;">📋 Neuer Auftrag</div>
      <label class="lbl">Kunde</label>${inp('seAKunde', a.kundenname, 'Kundenname')}
      <label class="lbl">Leistung</label>${inp('seALeistung', a.leistung, 'z.B. Handwerk')}
      <label class="lbl">Datum</label><input class="inp" id="seADatum" type="date" value="${a.datum || ''}" style="margin-bottom:6px;font-size:12px;">
      <label class="lbl">Dauer (Min.)</label>${inp('seADauer', a.dauer, '60')}
      <label class="lbl">Notiz</label>${inp('seANotiz', a.notiz, 'Was ist zu tun?')}
      <button class="btn btn-teal btn-full" id="seAuftragAnlegenBtn" style="margin-top:4px;">✓ Auftrag anlegen</button>
    </div>`
  }

  if (!html) {
    html = '<div style="color:var(--text3)">Keine Daten erkannt. Bitte erneut diktieren.</div>'
  }

  p.innerHTML = html

  // Event-Listener auf die dynamischen Buttons
  document.getElementById('seKundeAnlegenBtn')?.addEventListener('click', seKundeAnlegen)
  document.getElementById('seAuftragAnlegenBtn')?.addEventListener('click', seAuftragAnlegen)

  const previewEl = document.getElementById('sePreview')
  const statusEl  = document.getElementById('seStatus')
  if (previewEl) previewEl.style.display = 'block'
  if (statusEl)  statusEl.textContent = '✏ Felder prüfen, anpassen und bestätigen.'
}

// ── Aktionen aus Vorschau ────────────────────────────────────────
function _seVal(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement
  return el ? el.value.trim() : ''
}

export function seKundeAnlegen() {
  const name    = _seVal('seKName')
  const adresse = _seVal('seKAdresse')
  const telefon = _seVal('seKTelefon')
  const notiz   = _seVal('seKNotiz')

  openModal('modalKunde')
  closeSchnellerfassung()

  setTimeout(() => {
    if (name)    (document.getElementById('mkName')    as HTMLInputElement).value = name
    if (adresse) (document.getElementById('mkAdresse') as HTMLInputElement).value = adresse
    if (telefon) (document.getElementById('mkTelefon') as HTMLInputElement).value = telefon
    if (notiz)   (document.getElementById('mkNotiz')   as HTMLInputElement).value = notiz
  }, 100)
}

export function seAuftragAnlegen() {
  const kundenname = _seVal('seAKunde')
  const leistung   = _seVal('seALeistung')
  const datum      = _seVal('seADatum')
  const dauer      = _seVal('seADauer')
  const notiz      = _seVal('seANotiz')

  openModal('modalAuftrag')
  closeSchnellerfassung()

  setTimeout(() => {
    if (kundenname) {
      const sel   = document.getElementById('mAKunde') as HTMLSelectElement
      const match = DB.kunden().find((k: any) =>
        k.name.toLowerCase().includes(kundenname.toLowerCase()) ||
        kundenname.toLowerCase().includes(k.name.toLowerCase().split(' ').pop())
      )
      if (match && sel) sel.value = match.id
    }
    if (leistung) {
      document.querySelectorAll('#mALeistungChips .chip').forEach((c: any) => {
        if (c.textContent.toLowerCase().includes(leistung.toLowerCase())) c.click()
      })
    }
    const datumEl = document.getElementById('mADatum') as HTMLInputElement
    const dauerEl = document.getElementById('mADauer') as HTMLInputElement
    const notizEl = document.getElementById('mANotiz') as HTMLInputElement
    if (datum) datumEl.value = datum
    if (dauer) { dauerEl.value = dauer; (window as any).updateMAPreis?.() }
    if (notiz) notizEl.value = notiz
  }, 100)
}
