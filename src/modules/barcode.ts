// @ts-nocheck
// ── Barcode/QR-Scanner-Modul ─────────────────────────────────────
// Nutzt BarcodeDetector-API (Chrome ≥ 83) mit jsQR als Fallback.
// Scannt EAN/QR-Codes und fügt Material zum Auftrag hinzu.

import { DB } from '../lib/db'
import { showToast } from '../lib/utils'
import { registerPage } from './ui'

// ── Modul-State ──────────────────────────────────────────────────
let _bcStream:    MediaStream | null = null
let _bcAnim:      number | null      = null
let _bcAuftragId: string | null      = null
let _bcScanning                      = false

// ── Initialisierung ──────────────────────────────────────────────
export function initBarcode() {
  document.getElementById('btnCloseBcModal')?.addEventListener('click', closeBarcodeScanner)
  document.getElementById('btnBcManual')?.addEventListener('click', bcManualLookup)
}

// ── Scanner öffnen ───────────────────────────────────────────────
export async function openBarcodeScanner(auftragId: string) {
  _bcAuftragId = auftragId
  _bcScanning  = false

  const modal  = document.getElementById('bcModal')
  const status = document.getElementById('bcStatus')
  const input  = document.getElementById('bcManualInput') as HTMLInputElement
  if (modal)  modal.style.display = 'flex'
  if (status) status.textContent  = 'Kamera wird gestartet…'
  if (input)  input.value         = ''

  try {
    _bcStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } }
    })
    const video = document.getElementById('bcVideo') as HTMLVideoElement
    video.srcObject = _bcStream
    await video.play()
    if (status) status.textContent = 'Halte den Barcode in den Rahmen…'
    _bcStartLoop()
  } catch (err: any) {
    if (status) status.textContent = 'Kamera nicht verfügbar: ' + err.message
  }
}

// ── Scanner schließen ────────────────────────────────────────────
export function closeBarcodeScanner() {
  if (_bcAnim !== null) { cancelAnimationFrame(_bcAnim); _bcAnim = null }
  if (_bcStream) { _bcStream.getTracks().forEach(t => t.stop()); _bcStream = null }
  const video = document.getElementById('bcVideo') as HTMLVideoElement
  if (video) video.srcObject = null
  const modal = document.getElementById('bcModal')
  if (modal)  modal.style.display = 'none'
}

// ── Scan-Loop ────────────────────────────────────────────────────
function _bcStartLoop() {
  const video  = document.getElementById('bcVideo')  as HTMLVideoElement
  const canvas = document.getElementById('bcCanvas') as HTMLCanvasElement
  const ctx    = canvas.getContext('2d')!

  const detector = ('BarcodeDetector' in window)
    ? new (window as any).BarcodeDetector({
        formats: ['ean_13','ean_8','qr_code','code_128','code_39','upc_a','upc_e','data_matrix']
      })
    : null

  async function tick() {
    if (!_bcStream || _bcScanning) return
    if (video.readyState < 2) { _bcAnim = requestAnimationFrame(tick); return }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    let code: string | null = null
    try {
      if (detector) {
        const barcodes = await detector.detect(video)
        if (barcodes.length) code = barcodes[0].rawValue
      } else {
        // Fallback: jsQR lazy-geladen
        if (!(window as any).jsQR) {
          await _bcLoadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js')
        }
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result  = (window as any).jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' })
        if (result) code = result.data
      }
    } catch (_) {}

    if (code) {
      _bcScanning = true
      await _bcHandleCode(code)
      return
    }
    _bcAnim = requestAnimationFrame(tick)
  }
  _bcAnim = requestAnimationFrame(tick)
}

function _bcLoadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const s   = document.createElement('script')
    s.src     = src
    s.onload  = () => res()
    s.onerror = () => rej(new Error('Script-Ladefehler: ' + src))
    document.head.appendChild(s)
  })
}

// ── Code auflösen ────────────────────────────────────────────────
async function _bcHandleCode(code: string) {
  const status = document.getElementById('bcStatus')
  if (status) status.textContent = `Erkannt: ${code} — suche…`

  const katalog = DB.materialien()
  let material  = katalog.find((m: any) => m.artNr && m.artNr.trim() === code.trim())

  if (!material) {
    material = { bezeichnung: code, artNr: code, einheit: 'Stk', vkPreis: 0, menge: 1 }
  }

  _bcAddToAuftrag(material, code)
}

function _bcAddToAuftrag(material: any, rawCode: string) {
  const status    = document.getElementById('bcStatus')
  const auftraege = DB.auftraege()
  const idx       = auftraege.findIndex((a: any) => a.id === _bcAuftragId)

  if (idx < 0) {
    if (status) status.textContent = 'Auftrag nicht gefunden.'
    _bcScanning = false
    _bcAnim = requestAnimationFrame(() => _bcStartLoop())
    return
  }

  const a = auftraege[idx]
  if (!a.materialien) a.materialien = []

  const existing = a.materialien.find((m: any) =>
    (m.artNr || m.bezeichnung) === (material.artNr || material.bezeichnung)
  )
  if (existing) {
    existing.menge = (existing.menge || 1) + 1
    if (status) status.textContent = `Menge +1: ${existing.bezeichnung}`
  } else {
    a.materialien.push({
      id:          material.id || crypto.randomUUID(),
      bezeichnung: material.bezeichnung,
      artNr:       material.artNr || rawCode,
      einheit:     material.einheit || 'Stk',
      vkPreis:     material.vkPreis || 0,
      menge:       1,
    })
    if (status) status.textContent = `✓ Hinzugefügt: ${material.bezeichnung}`
  }

  DB.saveAuftraege(auftraege)
  showToast(`${material.bezeichnung} zur Materialliste hinzugefügt`)
  setTimeout(() => closeBarcodeScanner(), 1500)
}

// ── Manuelle Eingabe ─────────────────────────────────────────────
export function bcManualLookup() {
  const input = document.getElementById('bcManualInput') as HTMLInputElement
  const code  = input?.value.trim()
  if (!code) return
  _bcScanning = true
  if (_bcAnim !== null) { cancelAnimationFrame(_bcAnim); _bcAnim = null }
  _bcHandleCode(code)
}
