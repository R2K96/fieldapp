// @ts-nocheck
// ── Signatur-Modul ────────────────────────────────────────────────
// Canvas-Unterschrift: Touch + Maus, Retina-safe, Callback-Pattern.

// ── Modul-State ──────────────────────────────────────────────────
let _sigCtx:      CanvasRenderingContext2D | null = null
let _sigDrawing:  boolean                         = false
let _sigCallback: ((dataUrl: string | null) => void) | null = null
let _sigEmpty:    boolean                         = true

// ── Modal öffnen ──────────────────────────────────────────────────
export function openSigModal(callback: (dataUrl: string | null) => void) {
  _sigCallback = callback
  _sigEmpty    = true
  const modal = document.getElementById('sigModal')
  const placeholder = document.getElementById('sigPlaceholder')
  if (modal) modal.classList.add('open')
  if (placeholder) placeholder.style.display = 'block'
  setTimeout(initSigCanvas, 100)
}

// ── Modal schließen ───────────────────────────────────────────────
export function closeSigModal() {
  document.getElementById('sigModal')?.classList.remove('open')
}

// ── Überspringen (kein Bild) ──────────────────────────────────────
export function skipSig() {
  closeSigModal()
  if (_sigCallback) _sigCallback(null)
}

// ── Bestätigen ────────────────────────────────────────────────────
export function confirmSig() {
  const canvas  = document.getElementById('sigCanvas') as HTMLCanvasElement
  const dataUrl = _sigEmpty ? null : canvas.toDataURL('image/png')
  closeSigModal()
  if (_sigCallback) _sigCallback(dataUrl)
}

// ── Canvas leeren ─────────────────────────────────────────────────
export function clearSigCanvas() {
  if (!_sigCtx) return
  const canvas = document.getElementById('sigCanvas') as HTMLCanvasElement
  _sigCtx.clearRect(0, 0, canvas.width, canvas.height)
  _sigEmpty = true
  const placeholder = document.getElementById('sigPlaceholder')
  if (placeholder) placeholder.style.display = 'block'
}

// ── Canvas initialisieren (Retina-safe) ───────────────────────────
export function initSigCanvas() {
  const canvas = document.getElementById('sigCanvas') as HTMLCanvasElement
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  canvas.width  = rect.width  * window.devicePixelRatio
  canvas.height = rect.height * window.devicePixelRatio
  _sigCtx = canvas.getContext('2d')!
  _sigCtx.scale(window.devicePixelRatio, window.devicePixelRatio)
  _sigCtx.strokeStyle = '#1a1a2e'
  _sigCtx.lineWidth   = 2.5
  _sigCtx.lineCap     = 'round'
  _sigCtx.lineJoin    = 'round'

  function getPos(e: MouseEvent | TouchEvent) {
    const r   = canvas.getBoundingClientRect()
    const src = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : (e as MouseEvent)
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  const startDraw = (e: Event) => {
    e.preventDefault()
    _sigDrawing = true
    _sigEmpty   = false
    const placeholder = document.getElementById('sigPlaceholder')
    if (placeholder) placeholder.style.display = 'none'
    const p = getPos(e as MouseEvent | TouchEvent)
    _sigCtx!.beginPath()
    _sigCtx!.moveTo(p.x, p.y)
  }
  const moveDraw = (e: Event) => {
    e.preventDefault()
    if (!_sigDrawing) return
    const p = getPos(e as MouseEvent | TouchEvent)
    _sigCtx!.lineTo(p.x, p.y)
    _sigCtx!.stroke()
  }
  const stopDraw = () => { _sigDrawing = false }

  canvas.addEventListener('mousedown',  startDraw, { passive: false })
  canvas.addEventListener('touchstart', startDraw, { passive: false })
  canvas.addEventListener('mousemove',  moveDraw,  { passive: false })
  canvas.addEventListener('touchmove',  moveDraw,  { passive: false })
  canvas.addEventListener('mouseup',    stopDraw)
  canvas.addEventListener('touchend',   stopDraw)
}
