// @ts-nocheck
// ── Nachtermin-Modul ─────────────────────────────────────────────
// Foto-Dokumentation, Sprachaufnahme (Gladia/Groq Whisper), KI-Analyse,
// Leistungsblöcke, Material-Picker, Unterschrift-Flow, Speichern.

import { DB, getAccessToken } from '../lib/db'
import { SUPA_URL } from '../lib/config'
import { uid, today, fmtDate, showToast } from '../lib/utils'

// ── Callbacks ─────────────────────────────────────────────────────
// main.ts injiziert die konkreten Implementierungen per onXxx()-Setter.
let _onRenderDashboard: () => void = () => {}
let _onOpenSigModal: (cb: (url: string | null) => void) => void = () => {}

export function onNtRenderDashboard(fn: () => void) { _onRenderDashboard = fn }
export function onNtOpenSigModal(fn: (cb: (url: string | null) => void) => void) { _onOpenSigModal = fn }

// ── Modul-State ───────────────────────────────────────────────────
let _ntFotosPending: { file: File; previewUrl: string; storageUrl: string | null }[] = []
let _ntBlockN = 0
let _ntMatSelected: any[] = []
export let ntState: { status: string; folgeLeistung: string } = { status: '', folgeLeistung: '' }

// Recording
let _mediaRecorder: MediaRecorder | null = null
let _audioChunks: Blob[] = []
let _isGroqRec = false
let _recTimer: ReturnType<typeof setInterval> | null = null
let ntRecording = false
let ntRecognition: any = null

const LANG_LABELS: Record<string, string> = {
  german:    '🇩🇪 Deutsch',
  polish:    '🇵🇱 Polnisch',
  romanian:  '🇷🇴 Rumänisch',
  turkish:   '🇹🇷 Türkisch',
  english:   '🇬🇧 Englisch',
  ukrainian: '🇺🇦 Ukrainisch',
  russian:   '🇷🇺 Russisch',
}

// ── Hilfsfunktion ─────────────────────────────────────────────────
function _el(id: string, fn: (el: HTMLElement) => void) {
  const el = document.getElementById(id)
  if (el) fn(el)
}

// ════════════════════════════════════════════════
// AUFTRAG-SELECTS
// ════════════════════════════════════════════════
export function loadNtSelects() {
  const auftraege = DB.auftraege().filter((a: any) => a.status !== 'erledigt').slice().reverse()
  const kunden    = DB.kunden()
  const sel       = document.getElementById('ntAuftrag') as HTMLSelectElement
  if (!sel) return
  sel.innerHTML = '<option value="">– Auftrag wählen –</option>'
  if (!auftraege.length) {
    const o = document.createElement('option')
    o.disabled  = true
    o.textContent = 'Keine offenen Aufträge vorhanden'
    sel.appendChild(o)
    _el('ntLeistungsBlocks', el => { el.innerHTML = '' })
    _ntBlockN = 0
    ntAddBlock()
    return
  }
  auftraege.forEach((a: any) => {
    const k  = kunden.find((k: any) => k.id === a.kundeId)
    const st = a.status === 'folgetermin' ? '📅 ' : '🔵 '
    const o  = document.createElement('option')
    o.value       = a.id
    o.textContent = st + (k ? k.name : '?') + ' – ' + a.leistung + ' (' + fmtDate(a.datum) + ')'
    sel.appendChild(o)
  })
  if (!document.querySelectorAll('[id^="ntBlock_nb"]').length) {
    _el('ntLeistungsBlocks', el => { el.innerHTML = '' })
    _ntBlockN = 0
    ntAddBlock()
  }
}

export function loadNtAuftrag() {
  const id = (document.getElementById('ntAuftrag') as HTMLSelectElement)?.value
  if (!id) { _el('ntAuftragInfo', el => { el.innerHTML = '' }); return }
  const a = DB.auftraege().find((a: any) => a.id === id)
  const k = a ? DB.kunden().find((k: any) => k.id === a.kundeId) : null
  _el('ntAuftragInfo', el => {
    el.innerHTML = `
      <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;font-size:13px;">
        <div style="font-weight:700;color:var(--text);">${k ? k.name : '–'}</div>
        <div style="color:var(--text2);margin-top:3px;">${a ? a.leistung : '–'} · ${a ? fmtDate(a.datum) : '–'}</div>
      </div>`
  })
}

export function ntPick(el: HTMLElement, key: string) {
  el.closest('.chips')?.querySelectorAll('.chip').forEach((c: any) => c.classList.remove('on'))
  el.classList.add('on')
  ;(ntState as any)[key] = el.textContent?.trim()
  if (key === 'status') {
    _el('ntFolgetermindiv', div => {
      div.style.display = el.textContent?.includes('Folgetermin') ? 'block' : 'none'
    })
  }
}

// ════════════════════════════════════════════════
// FOTO-DOKUMENTATION
// ════════════════════════════════════════════════
export function ntHandleFotos(files: FileList) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return
    _ntFotosPending.push({ file, previewUrl: URL.createObjectURL(file), storageUrl: null })
  })
  renderNtFotoGrid()
}

export function renderNtFotoGrid() {
  const grid = document.getElementById('ntFotoGrid')
  if (!grid) return
  let html = ''
  _ntFotosPending.forEach((f, i) => {
    html += `<div style="position:relative;">
      <img src="${f.previewUrl}" class="foto-thumb" data-preview-url="${f.previewUrl}">
      <button data-remove-foto="${i}" style="position:absolute;top:-5px;right:-5px;width:20px;height:20px;border-radius:50%;background:var(--red);border:none;color:white;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
    </div>`
  })
  html += `<label class="foto-add-btn" for="ntFotoInput"><span>📷</span><span class="foto-add-lbl">Foto</span></label>
           <input type="file" id="ntFotoInput" accept="image/*" capture="environment" multiple style="display:none;">`
  grid.innerHTML = html

  // Wire events
  grid.querySelectorAll('img[data-preview-url]').forEach(img => {
    img.addEventListener('click', () => previewFoto((img as HTMLElement).dataset.previewUrl!))
  })
  grid.querySelectorAll('[data-remove-foto]').forEach(btn => {
    btn.addEventListener('click', () => removeNtFoto(parseInt((btn as HTMLElement).dataset.removeFoto!)))
  })
  const input = document.getElementById('ntFotoInput') as HTMLInputElement
  if (input) {
    input.addEventListener('change', () => { if (input.files) ntHandleFotos(input.files) })
  }
}

export function removeNtFoto(i: number) {
  _ntFotosPending.splice(i, 1)
  renderNtFotoGrid()
}

export async function uploadNtFotos(refId: string, refType: string): Promise<string[]> {
  const urls: string[] = []
  for (const f of _ntFotosPending) {
    showToast('📷 Foto wird hochgeladen…')
    const url = await DB.uploadFoto(f.file, refId, refType)
    if (url) urls.push(url)
  }
  _ntFotosPending = []
  renderNtFotoGrid()
  return urls
}

export function previewFoto(url: string) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;'
  overlay.addEventListener('click', () => overlay.remove())
  overlay.innerHTML = `<img src="${url}" style="max-width:95vw;max-height:90vh;border-radius:12px;object-fit:contain;">
    <button style="position:absolute;top:20px;right:20px;background:none;border:none;color:white;font-size:28px;cursor:pointer;">✕</button>`
  document.body.appendChild(overlay)
}

export function renderFotoGallery(fotos: string[], containerId: string) {
  const el = document.getElementById(containerId)
  if (!el) return
  if (!fotos || !fotos.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);">Keine Fotos vorhanden</div>'
    return
  }
  el.innerHTML = '<div class="foto-grid">' + fotos.map(url =>
    `<img src="${url}" class="foto-thumb" data-preview-url="${url}">`
  ).join('') + '</div>'
  el.querySelectorAll('img[data-preview-url]').forEach(img => {
    img.addEventListener('click', () => previewFoto((img as HTMLElement).dataset.previewUrl!))
  })
}

// ════════════════════════════════════════════════
// RECORDING: Groq Whisper (primär) + Web Speech (Fallback)
// ════════════════════════════════════════════════
export function ntToggleRecording() {
  const token = getAccessToken()
  if (token) {
    if (!_isGroqRec) ntStartGroqRec(); else ntStopGroqRec()
  } else {
    if (!ntRecording) ntStartRec(); else ntStopRec()
  }
}

export async function ntStartGroqRec() {
  try {
    const stream     = await navigator.mediaDevices.getUserMedia({ audio: true })
    _audioChunks     = []
    _mediaRecorder   = new MediaRecorder(stream)
    _mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) _audioChunks.push(e.data)
    }
    _mediaRecorder.start()
    _isGroqRec = true

    const btn = document.getElementById('ntVoiceBtn')
    if (btn) {
      btn.style.cssText = 'background:var(--red-dim);border:2px solid var(--red);color:var(--red);width:100%;font-size:14px;'
      btn.innerHTML = '⏹ Aufnahme stoppen'
    }
    _el('ntLiveBox', el => { el.style.display = 'block' })
    _el('ntFinalText', el => { el.textContent = '' })
    let secs = 0
    _el('ntInterimText', el => { el.textContent = '🎙 Aufnahme läuft… 0s' })
    _recTimer = setInterval(() => {
      secs++
      _el('ntInterimText', el => { el.textContent = `🎙 Aufnahme läuft… ${secs}s` })
    }, 1000)
  } catch (e) {
    showToast('⚠ Mikrofon-Zugriff verweigert')
  }
}

export function ntStopGroqRec() {
  if (_recTimer) clearInterval(_recTimer)
  _isGroqRec = false
  const btn = document.getElementById('ntVoiceBtn')
  if (btn) {
    btn.style.cssText = 'background:var(--bg3);border:2px dashed var(--border2);color:var(--text2);width:100%;font-size:14px;'
    btn.innerHTML = '🎙 Aufnahme starten'
  }
  _el('ntInterimText', el => { el.textContent = '🔄 Transkribiere mit KI…' })
  if (!_mediaRecorder) return
  _mediaRecorder.onstop = async () => {
    const blob = new Blob(_audioChunks, { type: 'audio/webm' })
    await ntTranscribeGroq(blob)
    _mediaRecorder!.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
  }
  _mediaRecorder.stop()
}

export async function ntTranscribeGroq(blob: Blob) {
  const token = getAccessToken()
  try {
    const fd = new FormData()
    fd.append('file', blob, 'audio.webm')
    fd.append('action', 'transcribe')
    const r = await fetch(`${SUPA_URL}/functions/v1/groq-proxy`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd,
    })
    if (!r.ok) throw new Error('Proxy Fehler ' + r.status)
    const d = await r.json()
    if (d.error) throw new Error(d.error)

    const finalText  = d.text?.trim() || ''
    const detectedLang = (d.detectedLanguage || 'german').toLowerCase()
    const langLabel  = LANG_LABELS[detectedLang] || detectedLang

    if (!finalText) {
      showToast('⚠ Kein Text erkannt')
      _el('ntInterimText', el => { el.textContent = '' })
      return
    }
    _el('ntFinalText',   el => { el.textContent = finalText })
    _el('ntInterimText', el => { el.textContent = detectedLang === 'german' ? `${langLabel} erkannt ✓` : `${langLabel} → 🇩🇪 Deutsch ✓` })
    const ta = document.getElementById('ntDiktat') as HTMLTextAreaElement
    if (ta) { ta.value = finalText; ta.dispatchEvent(new Event('input')) }
    _el('ntAnalyseBtn', el => { (el as HTMLButtonElement).style.display = 'block' })
    showToast(detectedLang === 'german' ? 'Transkription fertig ✓' : `${langLabel} erkannt & übersetzt ✓`)
  } catch (e: any) {
    console.error('[Proxy]', e)
    _el('ntInterimText', el => { el.textContent = '⚠ ' + e.message })
    showToast('⚠ KI-Transkription fehlgeschlagen')
  }
}

// Fallback: Web Speech API
export function ntStartRec() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { showToast('⚠ Spracherkennung nur in Chrome verfügbar'); return }
  ntRecognition = new SR()
  ntRecognition.lang = 'de-DE'
  ntRecognition.continuous = true
  ntRecognition.interimResults = true
  let finalBuffer = (document.getElementById('ntDiktat') as HTMLTextAreaElement)?.value || ''
  ntRecognition.onresult = (e: any) => {
    let interim = '', newFinal = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) newFinal += t + ' '; else interim += t
    }
    if (newFinal) {
      finalBuffer += newFinal
      const el = document.getElementById('ntDiktat') as HTMLTextAreaElement
      if (el) { el.value = finalBuffer; el.dispatchEvent(new Event('input')) }
      _el('ntFinalText', el => { el.textContent = finalBuffer })
    }
    _el('ntInterimText', el => { el.textContent = interim })
    _el('ntLiveBox', el => { el.style.display = (finalBuffer || interim) ? 'block' : 'none' })
  }
  ntRecognition.onerror = (ev: any) => {
    if (ev.error === 'not-allowed') showToast('⚠ Mikrofon-Zugriff verweigert')
    else if (ev.error !== 'no-speech') ntStopRec()
  }
  ntRecognition.onend = () => { if (ntRecording) ntRecognition.start() }
  ntRecognition.start()
  ntRecording = true
  const btn = document.getElementById('ntVoiceBtn')
  if (btn) {
    btn.style.cssText = 'background:var(--red-dim);border:2px solid var(--red);color:var(--red);width:100%;font-size:14px;'
    btn.innerHTML = '⏹ Aufnahme stoppen'
  }
}

export function ntStopRec() {
  if (ntRecognition) { try { ntRecognition.stop() } catch (e) {} ntRecognition = null }
  ntRecording = false
  const btn = document.getElementById('ntVoiceBtn')
  if (btn) {
    btn.style.cssText = 'background:var(--bg3);border:2px dashed var(--border2);color:var(--text2);width:100%;font-size:14px;'
    btn.innerHTML = '🎙 Aufnahme starten'
  }
  _el('ntInterimText', el => { el.textContent = '' })
  showToast('Aufnahme gestoppt ✓')
  const ta = document.getElementById('ntDiktat') as HTMLTextAreaElement
  if (ta?.value.trim()) _el('ntAnalyseBtn', el => { (el as HTMLButtonElement).style.display = 'block' })
}

// ════════════════════════════════════════════════
// KI-ANALYSE
// ════════════════════════════════════════════════
export async function analyzeSprachdoku() {
  const ta = document.getElementById('ntDiktat') as HTMLTextAreaElement
  const text = ta?.value.trim()
  if (!text) { showToast('⚠ Kein Diktat-Text vorhanden'); return }
  if (getAccessToken()) {
    await analyzeWithProxy(text)
  } else {
    analyzeRuleBased(text)
  }
}

export async function analyzeWithProxy(text: string) {
  const btn = document.getElementById('ntAnalyseBtn') as HTMLButtonElement
  if (btn) { btn.textContent = '⏳ KI analysiert…'; btn.disabled = true }

  const katalogNamen = DB.materialien().slice(0, 80).map((m: any) => m.bezeichnung)
  const fullText = katalogNamen.length
    ? `${text}\n\n[Materialkatalog: ${katalogNamen.join(', ')}]`
    : text

  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/groq-proxy`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getAccessToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze', text: fullText }),
    })
    if (!res.ok) throw new Error('Proxy Fehler ' + res.status)
    const json = await res.json()
    if (json.error) throw new Error(json.error)
    applyAnalyseResult(json, text)
  } catch (e: any) {
    console.error('[Groq]', e)
    showToast('⚠ Groq Fehler – falle auf Keyword-Erkennung zurück')
    analyzeRuleBased(text)
  } finally {
    if (btn) { btn.textContent = '🧠 Diktat automatisch auswerten'; btn.disabled = false }
  }
}

export function applyAnalyseResult(json: any, _originalText: string) {
  const gefunden: string[] = []

  // Zeit
  if (json.zeitMinuten && json.zeitMinuten > 0) {
    const zeitMin   = json.zeitMinuten
    const arbeitsMin = Math.max(Math.round(zeitMin * 0.8 / 5) * 5, 5)
    const nachMin   = Math.max(zeitMin - arbeitsMin, 5)
    const vor = document.getElementById('ntZeitVor') as HTMLInputElement
    const nach = document.getElementById('ntZeitNach') as HTMLInputElement
    if (vor)  { vor.value  = String(arbeitsMin); vor.dispatchEvent(new Event('input')) }
    if (nach) { nach.value = String(nachMin) }
    gefunden.push(`⏱ <b>Zeit:</b> ${zeitMin} Min. → Vorbereitung ${arbeitsMin} Min., Nachbereitung ${nachMin} Min.`)
  }

  // Materialien → Leistungsblöcke
  if (json.materialien && json.materialien.length > 0) {
    gefunden.push(`🔩 <b>Leistungen:</b> ${json.materialien.join(', ')}`)
    json.materialien.slice(0, 3).forEach((l: string) =>
      ntAddBlock(l, json.zeitMinuten ? Math.round(json.zeitMinuten / json.materialien.length / 5) * 5 : 30)
    )
  }

  // Folgetermin
  if (json.folgetermin) {
    document.querySelectorAll('#ntStatusChips .chip').forEach((c: any) => {
      c.classList.remove('on')
      if (c.textContent.includes('Folgetermin')) {
        c.classList.add('on')
        _el('ntFolgetermindiv', el => { el.style.display = 'block' })
      }
    })
    gefunden.push('📅 <b>Folgetermin:</b> ' + (json.folgeGrund || 'erkannt'))
    if (json.leistungsart) {
      const ziel = json.leistungsart.includes('Büro') ? 'Bürokratie' : 'Handwerk'
      document.querySelectorAll('#ntFolgeLeistungChips .chip').forEach((c: any) => {
        c.classList.remove('on')
        if (c.textContent.includes(ziel)) c.classList.add('on')
      })
    }
  } else {
    const chips = document.querySelectorAll('#ntStatusChips .chip')
    let keinerAktiv = true
    chips.forEach((c: any) => { if (c.classList.contains('on')) keinerAktiv = false })
    if (keinerAktiv) {
      chips.forEach((c: any) => { if (c.textContent.includes('Erledigt')) c.classList.add('on') })
      gefunden.push('✅ <b>Status:</b> „Erledigt" gesetzt')
    }
  }

  // Zusammenfassung
  if (json.zusammenfassung) {
    const notizEl = document.getElementById('ntNotiz') as HTMLTextAreaElement
    if (notizEl && !notizEl.value) notizEl.value = json.zusammenfassung
    gefunden.push(`📝 <b>Zusammenfassung:</b> ${json.zusammenfassung}`)
  }

  _showAnalyseResult(gefunden)
}

export function analyzeRuleBased(text: string) {
  const txt = text.toLowerCase()
  const gefunden: string[] = []

  // ── 1. ZEITANGABEN ──────────────────────────────────────
  const wortZahlen: Record<string, number> = {
    'eine':1,'ein':1,'zwei':2,'drei':3,'vier':4,'fünf':5,'sechs':6,
    'sieben':7,'acht':8,'neun':9,'zehn':10,'elf':11,'zwölf':12,
    'dreißig':30,'fünfzehn':15,'zwanzig':20,'fünfundvierzig':45,
    'anderthalb':1.5,'eineinhalb':1.5,
  }
  const wortPart = '(?:\\d+(?:[.,]\\d+)?|anderthalb|eineinhalb|eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreißig|fünfzehn|zwanzig|fünfundvierzig)'
  const kombiRgxFull = new RegExp('('+wortPart+')\\s*(?:stunden?|std\\.?|h)\\s*(?:und\\s+)?(\\d+)\\s*(?:minuten?|min\\.?)', 'i')
  const kombiM = text.match(kombiRgxFull)
  let zeitMin = 0
  if (kombiM) {
    const raw1 = kombiM[1].replace(',', '.').toLowerCase()
    const h = parseFloat(raw1) || wortZahlen[raw1] || 1
    zeitMin = Math.round(h * 60) + parseInt(kombiM[2])
  } else {
    const stdM = text.match(/(\d+(?:[.,]\d+)?|anderthalb|eineinhalb|eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s*(?:stunden?|std\.?|h)(?:\s|$|[^a-z])/i)
    if (stdM) {
      const raw = stdM[1].replace(',', '.').toLowerCase()
      zeitMin = Math.round((parseFloat(raw) || wortZahlen[raw] || 1) * 60)
    }
    const minM = text.match(/(\d+(?:[.,]\d+)?|fünfzehn|zwanzig|dreißig|fünfundvierzig)\s*(?:minuten?|min\.?)/i)
    if (minM) {
      const raw = minM[1].replace(',', '.').toLowerCase()
      zeitMin += Math.round(parseFloat(raw) || wortZahlen[raw] || 0)
    }
  }
  if (zeitMin > 0) {
    const arbeitsMin = Math.max(Math.round(zeitMin * 0.8 / 5) * 5, 5)
    const nachMin    = Math.max(zeitMin - arbeitsMin, 5)
    const vor  = document.getElementById('ntZeitVor') as HTMLInputElement
    const nach = document.getElementById('ntZeitNach') as HTMLInputElement
    if (vor)  { vor.value  = String(arbeitsMin); vor.dispatchEvent(new Event('input')) }
    if (nach) { nach.value = String(nachMin) }
    gefunden.push(`⏱ <b>Zeit:</b> ${zeitMin} Min. erkannt → Vorbereitung ${arbeitsMin} Min., Nachbereitung ${nachMin} Min.`)
  }

  // ── 2. MATERIALIEN / LEISTUNGSBLÖCKE ─────────────────────
  const materialKeywords = [
    {k:'rohr',l:'Rohr'},{k:'rohre',l:'Rohr'},{k:'leitung',l:'Rohr'},{k:'leitungen',l:'Rohr'},
    {k:'ventil',l:'Ventil'},{k:'ventile',l:'Ventil'},{k:'absperrventil',l:'Ventil'},{k:'hahn',l:'Ventil'},{k:'kugelhahn',l:'Ventil'},
    {k:'filter',l:'Filter'},{k:'wasserfilter',l:'Filter'},
    {k:'pumpe',l:'Pumpe'},{k:'heizungspumpe',l:'Pumpe'},
    {k:'dichtung',l:'Dichtung'},{k:'dichtungen',l:'Dichtung'},{k:'o-ring',l:'Dichtung'},{k:'oring',l:'Dichtung'},
    {k:'thermostat',l:'Thermostat'},{k:'thermostatkopf',l:'Thermostat'},
    {k:'heizkörper',l:'Heizkörper'},{k:'heizkoerper',l:'Heizkörper'},
    {k:'boiler',l:'Boiler'},{k:'warmwasserspeicher',l:'Boiler'},
    {k:'wasserhahn',l:'Armatur'},{k:'mischbatterie',l:'Armatur'},{k:'armatur',l:'Armatur'},{k:'armaturen',l:'Armatur'},
    {k:'wc',l:'WC-Spülung'},{k:'toilette',l:'WC-Spülung'},{k:'spülkasten',l:'WC-Spülung'},
    {k:'dusche',l:'Dusche'},{k:'duschkopf',l:'Dusche'},
    {k:'badewanne',l:'Badewanne'},
    {k:'abfluss',l:'Abfluss'},{k:'siphon',l:'Abfluss'},
    {k:'rohrverstopfung',l:'Rohrreinigung'},{k:'verstopfung',l:'Rohrreinigung'},
    {k:'heizung',l:'Heizung'},{k:'therme',l:'Therme'},{k:'heizkessel',l:'Heizkessel'},
    {k:'gasheizung',l:'Gasheizung'},{k:'brenner',l:'Brenner'},
    {k:'expansion',l:'Ausdehnungsgefäß'},{k:'ausdehnungsgefäß',l:'Ausdehnungsgefäß'},
    {k:'druckminderer',l:'Druckminderer'},{k:'manometer',l:'Manometer'},
    {k:'wartung',l:'Wartung'},{k:'inspektion',l:'Inspektion'},
    {k:'dichtigkeit',l:'Dichtigkeitsprüfung'},{k:'druckprüfung',l:'Dichtigkeitsprüfung'},
    {k:'leck',l:'Leckage'},{k:'leckage',l:'Leckage'},{k:'frostschaden',l:'Frostschaden'},
    {k:'ersatzteil',l:'Ersatzteil'},{k:'ersatzteile',l:'Ersatzteil'},
    {k:'glühlampe',l:'Leuchtmittel'},{k:'lampe',l:'Leuchtmittel'},{k:'led',l:'Leuchtmittel'},{k:'birne',l:'Leuchtmittel'},
    {k:'steckdose',l:'Steckdose'},{k:'schalter',l:'Schalter'},{k:'sicherung',l:'Sicherung'},
    {k:'schranktür',l:'Schranktür'},{k:'tür',l:'Tür'},{k:'türen',l:'Tür'},
    {k:'fenster',l:'Fenster'},{k:'griff',l:'Griff'},
    {k:'schraube',l:'Schraube'},{k:'schrauben',l:'Schraube'},{k:'scharnier',l:'Scharnier'},
    {k:'gartenarbeit',l:'Gartenarbeit'},{k:'garten',l:'Gartenarbeit'},{k:'rasen',l:'Gartenarbeit'},{k:'hecke',l:'Gartenarbeit'},
    {k:'reparatur',l:'Reparatur'},{k:'repariert',l:'Reparatur'},
    {k:'festgezogen',l:'Befestigung'},{k:'festgeschraubt',l:'Befestigung'},
    {k:'montiert',l:'Montage'},{k:'demontiert',l:'Demontage'},
    {k:'eingebaut',l:'Einbau'},{k:'ausgebaut',l:'Ausbau'},
    {k:'gewechselt',l:'Austausch'},{k:'ausgetauscht',l:'Austausch'},
  ]
  const erkannt: string[] = []
  const gesehenSet = new Set<string>()
  materialKeywords.forEach(({ k, l }) => {
    if (txt.includes(k) && !gesehenSet.has(l)) { gesehenSet.add(l); erkannt.push(l) }
  })
  if (erkannt.length > 0) {
    gefunden.push(`🔩 <b>Materialien/Leistungen:</b> ${erkannt.join(', ')}`)
    erkannt.slice(0, 3).forEach(l => ntAddBlock(l, zeitMin > 0 ? Math.round(zeitMin / erkannt.length / 5) * 5 : 30))
  }

  // ── 3. FOLGETERMIN ────────────────────────────────────────
  const folgeSignale = [
    'folgetermin','nächsten termin','neuen termin',
    'vorbeischauen','vorbeikommen','nochmal vorbeikommen','nochmals vorbeischauen',
    'wieder kommen','nochmal kommen','nochmals kommen','nochmal da','wieder da',
    'noch einmal kommen','noch einmal vorbeikommen',
    'nächste woche','nächsten monat','nächsten montag','nächsten dienstag',
    'nächsten mittwoch','nächsten donnerstag','nächsten freitag',
    'morgen','übermorgen','in ein paar tagen','in einer woche',
    'teil bestellen','ersatzteil','ersatzteile','bestellen','lieferzeit',
    'nicht vorrätig','nicht dabei','nicht dabei gehabt','muss bestellt',
    'wird bestellt','muss noch besorgt',
    'muss noch','noch offen','nicht abgeschlossen','nicht fertig',
    'offen','weitermachen','weitergemacht','fortsetzen',
    'noch nicht fertig','konnte nicht abgeschlossen','nicht lösen',
    'helfen bei','unterstützen bei','beheben','zu helfen','dabei helfen',
  ]
  const hatFolge = folgeSignale.some(s => txt.includes(s))
  if (hatFolge) {
    document.querySelectorAll('#ntStatusChips .chip').forEach((c: any) => {
      c.classList.remove('on')
      if (c.textContent.includes('Folgetermin')) {
        c.classList.add('on')
        _el('ntFolgetermindiv', el => { el.style.display = 'block' })
      }
    })
    gefunden.push('📅 <b>Folgetermin erkannt</b> → Status auf „Folgetermin nötig" gesetzt')
  } else {
    const chips = document.querySelectorAll('#ntStatusChips .chip')
    let keinerAktiv = true
    chips.forEach((c: any) => { if (c.classList.contains('on')) keinerAktiv = false })
    if (keinerAktiv) {
      chips.forEach((c: any) => { if (c.textContent.includes('Erledigt')) c.classList.add('on') })
      gefunden.push('✅ <b>Status:</b> „Erledigt" vorgeschlagen')
    }
  }

  // ── 4. LEISTUNGSART für Folgetermin ──────────────────────
  const istHandwerk  = ['reparatur','einbau','austausch','montage','demontage','installation','verlegen','abdichten'].some(s => txt.includes(s))
  const istBuerokratie = ['angebot','aufmaß','dokumentation','protokoll','abnahme','gutachten','beratung'].some(s => txt.includes(s))
  if (hatFolge && (istHandwerk || istBuerokratie)) {
    const zielText = istHandwerk ? '🔧 Handwerk' : '📋 Bürokratie'
    document.querySelectorAll('#ntFolgeLeistungChips .chip').forEach((c: any) => {
      c.classList.remove('on')
      if (c.textContent.includes(zielText.replace('🔧 ', '').replace('📋 ', ''))) c.classList.add('on')
    })
    gefunden.push(`🏷 <b>Leistungsart Folgetermin:</b> ${zielText}`)
  }

  _showAnalyseResult(gefunden)
}

function _showAnalyseResult(gefunden: string[]) {
  _el('ntAnalyseContent', el => {
    el.innerHTML = gefunden.length
      ? gefunden.map(f => `<div style="margin-bottom:6px;">• ${f}</div>`).join('')
      : '<span style="color:var(--text3)">Keine strukturierten Informationen erkannt. Bitte Felder manuell ausfüllen.</span>'
  })
  const resultEl = document.getElementById('ntAnalyseResult')
  if (resultEl) {
    resultEl.style.display = 'block'
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  showToast(`🧠 ${gefunden.length} Informationen erkannt`)
}

// ════════════════════════════════════════════════
// LEISTUNGSBLÖCKE
// ════════════════════════════════════════════════
export function ntAddBlock(leistung?: string, dauer?: number) {
  _ntBlockN++
  const id  = 'nb' + _ntBlockN
  const dur = dauer || 30
  const LC_SATZ = (window as any).LC_SATZ || {}
  const chips = Object.keys(LC_SATZ).map(l => {
    const on = (l === (leistung || '')) ? ' on' : ''
    return `<div class="chip${on}" data-l="${l}">${l}</div>`
  }).join('')

  const div = document.createElement('div')
  div.id = 'ntBlock_' + id
  div.style.cssText = 'background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:8px;'
  div.innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
       <div style="font-size:10px;color:var(--text2);font-weight:700;letter-spacing:.5px;">LEISTUNGSART</div>
       <button data-block-remove="${id}" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;line-height:1;padding:0;" title="Block entfernen">✕</button>
     </div>
     <div class="chips" id="ntBlockChips_${id}" style="flex-wrap:wrap;gap:5px;margin-bottom:10px;">${chips}</div>
     <div style="display:flex;align-items:center;gap:10px;">
       <label style="font-size:12px;color:var(--text2);white-space:nowrap;">Zeit (Min.)</label>
       <input type="number" class="inp" value="${dur}" min="0" style="width:80px;" id="ntBlockDauer_${id}">
     </div>`

  document.getElementById('ntLeistungsBlocks')?.appendChild(div)

  // Wire events on new div
  div.querySelector('[data-block-remove]')?.addEventListener('click', () => ntRemoveBlock(id))
  div.querySelector('input')?.addEventListener('input', ntUpdateGesamt)
  div.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => ntSelectBlockLeistung(chip as HTMLElement, id))
  })

  ntUpdateGesamt()
}

export function ntRemoveBlock(id: string) {
  document.getElementById('ntBlock_' + id)?.remove()
  ntUpdateGesamt()
}

export function ntSelectBlockLeistung(el: HTMLElement, blockId: string) {
  document.querySelectorAll('#ntBlockChips_' + blockId + ' .chip').forEach((c: any) => c.classList.remove('on'))
  el.classList.add('on')
  ntUpdateGesamt()
}

export function ntUpdateGesamt() {
  const vor  = parseInt((document.getElementById('ntZeitVor')  as HTMLInputElement)?.value) || 0
  const nach = parseInt((document.getElementById('ntZeitNach') as HTMLInputElement)?.value) || 0
  let ort = 0
  document.querySelectorAll('[id^="ntBlockDauer_"]').forEach((inp: any) => { ort += parseInt(inp.value) || 0 })
  const ortEl = document.getElementById('ntZeitOrt') as HTMLInputElement
  if (ortEl) ortEl.value = String(ort)
  _el('ntZeitOrtAnzeige',   el => { el.textContent = ort + ' Min.' })
  _el('ntGesamtAnzeige',    el => { el.textContent = (vor + ort + nach) + ' Min.' })
}

export function ntCollectBlocks(): { leistung: string; dauer: number }[] {
  const blocks: { leistung: string; dauer: number }[] = []
  document.querySelectorAll('[id^="ntBlock_nb"]').forEach((div: any) => {
    const blockId = div.id.replace('ntBlock_', '')
    const onChip  = div.querySelector('.chip.on')
    const leistung = onChip ? onChip.getAttribute('data-l') : ''
    const inp      = document.getElementById('ntBlockDauer_' + blockId) as HTMLInputElement
    const dauer    = parseInt(inp?.value) || 0
    blocks.push({ leistung, dauer })
  })
  return blocks
}

// ════════════════════════════════════════════════
// SPEICHERN
// ════════════════════════════════════════════════
export async function saveNachterminStart() {
  const auftragId = (document.getElementById('ntAuftrag') as HTMLSelectElement)?.value
  if (!auftragId) { alert('Bitte Auftrag auswählen'); return }
  let fotoUrls: string[] = []
  if (_ntFotosPending.length) {
    showToast('📷 Fotos werden hochgeladen…')
    fotoUrls = await uploadNtFotos(auftragId, 'nachtermin')
  }
  _onOpenSigModal((sigDataUrl) => {
    saveNachtermin(fotoUrls, sigDataUrl)
  })
}

export function saveNachtermin(fotoUrls: string[] = [], unterschrift: string | null = null) {
  try {
    const auftragId = (document.getElementById('ntAuftrag') as HTMLSelectElement)?.value
    if (!auftragId) { alert('Bitte Auftrag auswählen'); return }
    const diktat = (document.getElementById('ntDiktat') as HTMLTextAreaElement)?.value
    ntUpdateGesamt()
    const vor    = parseInt((document.getElementById('ntZeitVor')  as HTMLInputElement)?.value) || 0
    const nach   = parseInt((document.getElementById('ntZeitNach') as HTMLInputElement)?.value) || 0
    const blocks = ntCollectBlocks()
    const ort    = blocks.reduce((s, b) => s + b.dauer, 0)
    const gesamt = vor + ort + nach
    const abrMin = Math.max(60, Math.ceil(gesamt / 15) * 15)

    const LC = (window as any).LC || {}
    const auftraege = DB.auftraege()
    const ai = auftraege.findIndex((a: any) => a.id === auftragId)
    if (ai >= 0) {
      auftraege[ai].status = ntState.status?.includes('Erledigt') ? 'erledigt'
        : ntState.status?.includes('Folgetermin') ? 'folgetermin' : 'offen'
      auftraege[ai].folgetermin = (document.getElementById('ntFolgeDate') as HTMLInputElement)?.value || null
      auftraege[ai].zeitGesamt  = gesamt
      const cfg = LC[auftraege[ai].leistung] || {}
      auftraege[ai].preis = (abrMin / 60) * (cfg.satz || 65)
      DB.saveAuftraege(auftraege)
    }

    const a    = auftraege[ai]
    const docs = DB.docs()
    const doc  = {
      id: uid(), auftragId, kundeId: a ? a.kundeId : '',
      datum: today(), diktat,
      zeitVor: vor, zeitOrt: ort, zeitNach: nach, zeitGesamt: gesamt, abrMin,
      leistungsBlocks: blocks,
      status: ntState.status || '', folgeLeistung: ntState.folgeLeistung || '',
      folgeDate: (document.getElementById('ntFolgeDate') as HTMLInputElement)?.value || '',
      notiz: (document.getElementById('ntNotiz') as HTMLTextAreaElement)?.value,
      preis: a ? a.preis : 0,
      materialien: _ntMatSelected.map((m: any) => ({
        id: m.id, bezeichnung: m.bezeichnung, einheit: m.einheit, vkPreis: m.vkPreis, menge: m.menge,
      })),
      fotos: fotoUrls,
      unterschrift: unterschrift || null,
    }
    docs.push(doc)
    DB.saveDocs(docs)

    // Cross-Sell Update
    if (ntState.folgeLeistung && a) {
      const kunden = DB.kunden()
      const ki = kunden.findIndex((k: any) => k.id === a.kundeId)
      if (ki >= 0) {
        if (!kunden[ki].crossSell) kunden[ki].crossSell = []
        if (!kunden[ki].crossSell.includes(ntState.folgeLeistung))
          kunden[ki].crossSell.push(ntState.folgeLeistung)
        DB.saveKunden(kunden)
      }
    }

    // Output-Card anzeigen
    const k = DB.kunden().find((k: any) => k.id === doc.kundeId)
    _el('ntOutputCard', el => { el.style.display = 'block' })
    _el('ntOutput', el => {
      el.innerHTML = [
        { k: 'Kunde',      v: k ? k.name : '–' },
        { k: 'Datum',      v: fmtDate(today()) },
        { k: 'Leistung',   v: a ? a.leistung : '–' },
        { k: 'Zeit gesamt', v: `${gesamt} Min. → abgerechnet: ${abrMin} Min.` },
        { k: 'Betrag',     v: '~' + Math.round(doc.preis || 0) + ' €' },
        { k: 'Status',     v: doc.status || '–' },
        { k: 'Folgetermin', v: doc.folgeDate ? fmtDate(doc.folgeDate) + ' · ' + doc.folgeLeistung : '–' },
        { k: 'Diktat',     v: diktat ? diktat.slice(0, 120) + (diktat.length > 120 ? '…' : '') : '–' },
      ].map(r => `<div class="dp-row"><span class="dp-key">${r.k}</span><span class="dp-val">${r.v}</span></div>`).join('')
    })

    showToast('Dokumentation gespeichert ✓')

    // Reset
    const ta = document.getElementById('ntDiktat') as HTMLTextAreaElement
    if (ta) ta.value = ''
    _el('ntLiveBox',     el => { el.style.display = 'none' })
    _el('ntFinalText',   el => { el.textContent = '' })
    _el('ntInterimText', el => { el.textContent = '' })
    ;['ntZeitVor', 'ntZeitNach'].forEach(id => {
      const inp = document.getElementById(id) as HTMLInputElement
      if (inp) inp.value = '0'
    })
    const ortEl = document.getElementById('ntZeitOrt') as HTMLInputElement
    if (ortEl) ortEl.value = '0'
    _el('ntZeitOrtAnzeige',  el => { el.textContent = '0 Min.' })
    _el('ntGesamtAnzeige',   el => { el.textContent = '0 Min.' })
    _el('ntLeistungsBlocks', el => { el.innerHTML = '' })
    _ntBlockN = 0
    ntAddBlock()
    _ntMatSelected = []
    _renderNtMatUsed()
    _el('ntMatSearch', el => { (el as HTMLElement).style.display = 'none' })
    document.querySelectorAll('#page-nachtermin .chip').forEach((c: any) => c.classList.remove('on'))
    _el('ntFolgetermindiv', el => { el.style.display = 'none' })
    ntState = { status: '', folgeLeistung: '' }

    _onRenderDashboard()
  } catch (err: any) {
    console.error('[saveNachtermin] Fehler:', err)
    showToast('⚠️ Fehler beim Speichern: ' + err.message)
  }
}

// ════════════════════════════════════════════════
// MATERIAL-PICKER (Nachtermin)
// ════════════════════════════════════════════════
export function ntMatToggle() {
  const s = document.getElementById('ntMatSearch')
  if (!s) return
  const vis = s.style.display !== 'none'
  s.style.display = vis ? 'none' : 'block'
  if (!vis) {
    const q = document.getElementById('ntMatQ') as HTMLInputElement
    if (q) q.value = ''
    ntMatFilter('')
  }
}

export function ntMatFilter(q: string) {
  const dd   = document.getElementById('ntMatDropdown')
  const mats = DB.materialien()
  const filtered = q
    ? mats.filter((m: any) => m.bezeichnung.toLowerCase().includes(q.toLowerCase()) || (m.artNr || '').toLowerCase().includes(q.toLowerCase()))
    : mats
  if (!dd) return
  if (!filtered.length) { dd.style.display = 'none'; return }
  dd.style.display = 'block'
  dd.innerHTML = filtered.slice(0, 20).map((m: any) =>
    `<div data-mat-id="${m.id}" style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);">
       <div style="font-size:13px;font-weight:600;">${m.bezeichnung}</div>
       <div style="font-size:11px;color:var(--text2);">${m.artNr ? m.artNr + ' · ' : ''}${m.einheit || ''} ${m.vkPreis ? '· <span style=\'color:var(--teal)\'>' + m.vkPreis.toFixed(2).replace('.', ',') + '€</span>' : ''}</div>
     </div>`
  ).join('')
  dd.querySelectorAll('[data-mat-id]').forEach(row => {
    row.addEventListener('click', () => ntMatAdd((row as HTMLElement).dataset.matId!))
    ;(row as HTMLElement).addEventListener('mouseover', () => { (row as HTMLElement).style.background = 'var(--card2)' })
    ;(row as HTMLElement).addEventListener('mouseout',  () => { (row as HTMLElement).style.background = '' })
  })
}

export function ntMatAdd(id: string) {
  const m = DB.materialien().find((x: any) => x.id === id)
  if (!m) return
  if (_ntMatSelected.find((x: any) => x.id === id)) { showToast('Bereits hinzugefügt'); return }
  _ntMatSelected.push({ ...m, menge: 1 })
  const q  = document.getElementById('ntMatQ') as HTMLInputElement
  const dd = document.getElementById('ntMatDropdown')
  const s  = document.getElementById('ntMatSearch')
  if (q)  q.value = ''
  if (dd) dd.style.display = 'none'
  if (s)  s.style.display  = 'none'
  _renderNtMatUsed()
}

export function _renderNtMatUsed() {
  const el = document.getElementById('ntMatUsed')
  if (!el) return
  el.innerHTML = _ntMatSelected.map((m: any, i: number) =>
    `<div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:6px 10px;border:1px solid var(--border);">
       <span style="font-size:13px;flex:1;">${m.bezeichnung}</span>
       <input type="number" value="${m.menge}" min="1" step="0.01" style="width:60px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:3px 7px;font-size:12px;" data-mat-idx="${i}" title="Menge">
       <span style="font-size:11px;color:var(--text3);">${m.einheit || 'Stk'}</span>
       ${m.vkPreis ? `<span style="font-size:12px;color:var(--teal);font-weight:700;">${(m.vkPreis * m.menge).toFixed(2).replace('.', ',')}€</span>` : ''}
       <button data-mat-remove="${i}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0;">✕</button>
     </div>`
  ).join('')

  // Wire events after render
  el.querySelectorAll('input[data-mat-idx]').forEach(inp => {
    inp.addEventListener('change', () => {
      const i = parseInt((inp as HTMLElement).dataset.matIdx!)
      ntMatSetMenge(i, (inp as HTMLInputElement).value)
    })
  })
  el.querySelectorAll('[data-mat-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt((btn as HTMLElement).dataset.matRemove!)
      ntMatRemove(i)
    })
  })
}

export function ntMatSetMenge(i: number, val: string) {
  _ntMatSelected[i].menge = parseFloat(val) || 1
  _renderNtMatUsed()
}

export function ntMatRemove(i: number) {
  _ntMatSelected.splice(i, 1)
  _renderNtMatUsed()
}
