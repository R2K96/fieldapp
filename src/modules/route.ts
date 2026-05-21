// @ts-nocheck
// ── Route-Modul ───────────────────────────────────────────────────
// Tagesroute: Geocoding (Nominatim), Nearest-Neighbor-Optimierung,
// Leaflet-Karte, Google Maps Link, manuelle Stopps, Fahrtenbuch.

import { DB } from '../lib/db'
import { today, fmtDate, showToast, uid } from '../lib/utils'

// ── Modul-State ───────────────────────────────────────────────────
let _routeManuelleStopps: any[] = []
let _routeStopps:         any[] = []
let _leafletMap:          any   = null
let _leafletMarkers:      any[] = []
let _geocodeCache:        Record<string, { lat: number; lon: number }> = {}

// ── Hilfsfunktion ─────────────────────────────────────────────────
function _calcPreis(leistung: string, dauer: number): number {
  const LC = (window as any).LC || {}
  const cfg = LC[leistung] || {}
  if (cfg.flat) return 16
  const abrMin = Math.max(60, Math.ceil(dauer / 15) * 15)
  return (abrMin / 60) * (cfg.satz || 65)
}

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
export function initRoute() {
  const d = document.getElementById('routeDatum') as HTMLInputElement
  if (d && !d.value) d.value = today()
}

// ════════════════════════════════════════════════
// STOPPS SAMMELN
// ════════════════════════════════════════════════
function _collectStopps(): any[] {
  const datum  = (document.getElementById('routeDatum') as HTMLInputElement)?.value || today()
  const kunden = DB.kunden()
  const stopps: any[] = []

  DB.auftraege()
    .filter((a: any) => a.datum === datum)
    .forEach((a: any) => {
      const k = kunden.find((k: any) => k.id === a.kundeId)
      if (k && k.adresse)
        stopps.push({ id: a.id, label: k.name, adresse: k.adresse, leistung: a.leistung, preis: a.preis || 0, typ: 'auftrag', ma: a.ma || '--' })
    })

  DB.wpItems()
    .filter((w: any) => w.dayKey === datum)
    .forEach((w: any) => {
      const k = kunden.find((k: any) => k.id === w.kundeId)
      if (k && k.adresse && !stopps.find((s: any) => s.id === w.id))
        stopps.push({ id: w.id, label: k.name, adresse: k.adresse, leistung: w.leistung, preis: _calcPreis(w.leistung, w.dauer || 60), typ: 'wp', ma: w.ma || '--' })
    })

  _routeManuelleStopps.forEach(s => stopps.push(s))
  return stopps
}

// ════════════════════════════════════════════════
// RENDERN
// ════════════════════════════════════════════════
export function renderRoute() {
  const datum  = (document.getElementById('routeDatum') as HTMLInputElement)?.value || today()
  const stopps = _collectStopps()
  _routeStopps = stopps

  const rSub = document.getElementById('routeSub')
  if (rSub) rSub.textContent = new Date(datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
  const aN = document.getElementById('routeAnzahl'); if (aN) aN.textContent = String(stopps.length)
  const rK = document.getElementById('routeKm');     if (rK) rK.textContent = '--'
  const rZ = document.getElementById('routeZeit');   if (rZ) rZ.textContent = '--'

  const mc = document.getElementById('routeMapContainer'); if (mc) mc.style.display = 'none'
  const ob = document.getElementById('routeOptBtn')
  const list = document.getElementById('routeList'); if (!list) return

  if (!stopps.length) {
    list.innerHTML = '<div class="card" style="padding:20px;text-align:center;color:var(--text3);font-size:13px;">Keine Aufträge für diesen Tag.</div>'
    const ra = document.getElementById('routeActions'); if (ra) ra.style.display = 'none'
    if (ob) ob.style.display = 'none'
    return
  }
  _renderStoppList(stopps)
  const ra = document.getElementById('routeActions'); if (ra) ra.style.display = 'flex'
  if (ob) ob.style.display = 'block'
  updateRouteLink(stopps)
}

function _renderStoppList(stopps: any[]) {
  const list = document.getElementById('routeList'); if (!list) return
  const colors: Record<string, string> = {
    'Handwerk': 'var(--blue)', 'Bürokratie': 'var(--purple)', 'Steuer': 'var(--gold)',
    'Digital': 'var(--teal)', 'Botendienst': 'var(--green)', 'Garten': '#82c850',
  }
  list.innerHTML = stopps.map((s, i) => {
    let color = 'var(--teal)'
    Object.entries(colors).forEach(([k, v]) => { if (s.leistung && s.leistung.includes(k)) color = v })
    const mu = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.adresse + ', Deutschland')
    const removeBtn = s.typ === 'manuell'
      ? `<button data-remove-stopp="${s.id}" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0;">✕</button>`
      : ''
    return `<div style="background:var(--card);border-radius:12px;border:1px solid var(--border);padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;">
      <div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0;margin-top:2px;">${i + 1}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;margin-bottom:1px;">${s.label}</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:3px;">${s.leistung} · ${s.ma}</div>
        <a href="${mu}" target="_blank" style="font-size:11px;color:var(--teal);font-weight:600;text-decoration:none;">${s.adresse}</a>
      </div>${removeBtn}</div>`
  }).join('')

  // Wire remove-buttons (manuelle Stopps)
  list.querySelectorAll('[data-remove-stopp]').forEach(btn => {
    btn.addEventListener('click', () => removeManuellerStopp((btn as HTMLElement).dataset.removeStopp!))
  })
}

// ════════════════════════════════════════════════
// GEOCODING (Nominatim, 1 req/s)
// ════════════════════════════════════════════════
async function geocodeAdresse(adresse: string): Promise<{ lat: number; lon: number } | null> {
  if (_geocodeCache[adresse]) return _geocodeCache[adresse]
  try {
    const url  = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(adresse + ', Deutschland')
    const res  = await fetch(url, { headers: { 'Accept-Language': 'de', 'User-Agent': 'SchnellR/1.0' } })
    const data = await res.json()
    if (data && data[0]) {
      const coord = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
      _geocodeCache[adresse] = coord
      return coord
    }
  } catch (e) { console.warn('[Geocode] Fehler:', adresse, e) }
  return null
}

// ════════════════════════════════════════════════
// OPTIMIERUNG: Haversine + Nearest Neighbor
// ════════════════════════════════════════════════
function _haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function _nearestNeighbor(stopps: any[], startCoord: any): any[] {
  if (!stopps.length) return stopps
  const remaining = [...stopps]
  const ordered:   any[] = []
  let cur = startCoord || stopps[0]._coord
  while (remaining.length) {
    let best: any = null, bestDist = Infinity, bestIdx = 0
    remaining.forEach((s, i) => {
      if (!s._coord) return
      const d = _haversine(cur.lat, cur.lon, s._coord.lat, s._coord.lon)
      if (d < bestDist) { bestDist = d; best = s; bestIdx = i }
    })
    if (!best) { ordered.push(...remaining); break }
    ordered.push(best)
    cur = best._coord
    remaining.splice(bestIdx, 1)
  }
  return ordered
}

export async function optimiereRoute() {
  const btn = document.getElementById('routeOptBtn') as HTMLButtonElement
  if (btn) { btn.textContent = '⏳ Geocoding läuft…'; btn.disabled = true }

  const stopps = _collectStopps()
  if (!stopps.length) {
    showToast('Keine Stopps vorhanden')
    if (btn) { btn.textContent = '🔀 Route optimieren & Karte laden'; btn.disabled = false }
    return
  }

  // Geocode alle Adressen (Nominatim Rate Limit: 1 req/s)
  for (const s of stopps) {
    s._coord = await geocodeAdresse(s.adresse)
    await new Promise(r => setTimeout(r, 1100))
  }

  // Startpunkt
  const startVal = (document.getElementById('routeStart') as HTMLInputElement)?.value?.trim()
  let startCoord: any = null
  if (startVal) {
    startCoord = await geocodeAdresse(startVal)
    await new Promise(r => setTimeout(r, 1100))
  }

  const optimiert = _nearestNeighbor(stopps.filter(s => s._coord), startCoord)
  _routeStopps = optimiert

  // Distanz + Fahrzeit (~40 km/h Stadtverkehr)
  const coords: any[] = []
  if (startCoord) coords.push(startCoord)
  optimiert.forEach(s => { if (s._coord) coords.push(s._coord) })
  let totalKm = 0
  for (let i = 1; i < coords.length; i++)
    totalKm += _haversine(coords[i - 1].lat, coords[i - 1].lon, coords[i].lat, coords[i].lon)
  totalKm = Math.round(totalKm)
  const minuten = Math.round(totalKm / 40 * 60)
  const std = Math.floor(minuten / 60), min = minuten % 60

  const rK = document.getElementById('routeKm');   if (rK) rK.textContent = '~' + totalKm + ' km'
  const rZ = document.getElementById('routeZeit'); if (rZ) rZ.textContent = std > 0 ? std + 'h ' + min + 'min' : '~' + min + ' min'

  _renderStoppList(optimiert)
  updateRouteLink(optimiert)
  _zeichneKarte(optimiert, startCoord)

  if (btn) { btn.textContent = '🔄 Neu optimieren'; btn.disabled = false }
  showToast('Route optimiert ✓')
}

// ════════════════════════════════════════════════
// LEAFLET KARTE
// ════════════════════════════════════════════════
function _zeichneKarte(stopps: any[], startCoord: any) {
  const mc = document.getElementById('routeMapContainer'); if (mc) mc.style.display = 'block'
  const mapEl = document.getElementById('routeMap');       if (!mapEl) return
  const L = (window as any).L
  if (!L) { showToast('⚠ Leaflet nicht geladen'); return }

  if (_leafletMap) { _leafletMap.remove(); _leafletMap = null }
  _leafletMarkers = []

  const allCoords: [number, number][] = []
  if (startCoord) allCoords.push([startCoord.lat, startCoord.lon])
  stopps.forEach(s => { if (s._coord) allCoords.push([s._coord.lat, s._coord.lon]) })
  if (!allCoords.length) return

  _leafletMap = L.map('routeMap').setView(allCoords[0], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>', maxZoom: 19,
  }).addTo(_leafletMap)

  if (startCoord) {
    L.marker([startCoord.lat, startCoord.lon], {
      icon: L.divIcon({ html: '<div style="background:#00c4a8;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏠</div>', iconSize: [28, 28], iconAnchor: [14, 14], className: '' }),
    }).addTo(_leafletMap).bindPopup('Startpunkt')
  }

  stopps.forEach((s, i) => {
    if (!s._coord) return
    const marker = L.marker([s._coord.lat, s._coord.lon], {
      icon: L.divIcon({ html: `<div style="background:var(--teal,#00c4a8);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14], className: '' }),
    }).addTo(_leafletMap)
    marker.bindPopup(`<strong>${i + 1}. ${s.label}</strong><br>${s.adresse}<br><span style="font-size:11px;color:#888;">${s.leistung}</span>`)
    _leafletMarkers.push(marker)
  })

  if (allCoords.length > 1)
    L.polyline(allCoords, { color: '#00c4a8', weight: 3, opacity: 0.7, dashArray: '8 6' }).addTo(_leafletMap)

  _leafletMap.fitBounds(allCoords, { padding: [20, 20] })
  setTimeout(() => _leafletMap.invalidateSize(), 100)
}

// ════════════════════════════════════════════════
// GOOGLE MAPS LINK
// ════════════════════════════════════════════════
export function updateRouteLink(stopps: any[]) {
  if (!stopps || !stopps.length) return
  const start   = (document.getElementById('routeStart') as HTMLInputElement)?.value?.trim()
  const adr     = stopps.map(s => encodeURIComponent(s.adresse + ', Deutschland'))
  const dest    = adr[adr.length - 1]
  const wpParts = adr.slice(0, adr.length - 1)
  const origin  = start ? encodeURIComponent(start + ', Deutschland') : adr[0]
  const wpStr   = wpParts.length > 1 ? '&waypoints=' + wpParts.slice(1).join('|') : ''
  const ml = document.getElementById('routeMapsLink') as HTMLAnchorElement
  if (ml) ml.href = 'https://www.google.com/maps/dir/?api=1&origin=' + origin + '&destination=' + dest + wpStr + '&travelmode=driving'
}

export function startNavigation() {
  const ml = document.getElementById('routeMapsLink') as HTMLAnchorElement
  if (ml && ml.href && ml.href !== '#') ml.click()
  else showToast('⚠ Erst Route laden oder optimieren')
}

// ════════════════════════════════════════════════
// MANUELLE STOPPS
// ════════════════════════════════════════════════
export function addManuellerStopp() {
  const aEl = document.getElementById('routeManuelAdresse') as HTMLInputElement
  const lEl = document.getElementById('routeManuelLabel')   as HTMLInputElement
  const a   = aEl?.value?.trim()
  const l   = lEl?.value?.trim() || a
  if (!a) { alert('Adresse eingeben'); return }
  _routeManuelleStopps.push({ id: 'm_' + Date.now(), label: l, adresse: a, leistung: 'Manuell', preis: 0, typ: 'manuell' })
  if (aEl) aEl.value = ''
  if (lEl) lEl.value = ''
  renderRoute()
}

export function removeManuellerStopp(id: string) {
  _routeManuelleStopps = _routeManuelleStopps.filter(s => s.id !== id)
  renderRoute()
}

// Alias für HTML-onclick Kompatibilität
export const removeRoutenStopp = removeManuellerStopp

export function clearRoute() {
  _routeManuelleStopps = []
  _routeStopps         = []
  _geocodeCache        = {}
  if (_leafletMap) { _leafletMap.remove(); _leafletMap = null }
  _leafletMarkers = []
  const mc = document.getElementById('routeMapContainer'); if (mc) mc.style.display = 'none'
  renderRoute()
  showToast('Route zurückgesetzt')
}

// ════════════════════════════════════════════════
// HILFSFUNKTIONEN ROUTE
// ════════════════════════════════════════════════
export function copyRouteAddresses() {
  const datum  = (document.getElementById('routeDatum') as HTMLInputElement)?.value || today()
  const k      = DB.kunden()
  const lines: string[] = []
  const start  = (document.getElementById('routeStart') as HTMLInputElement)?.value
  if (start) lines.push('Start: ' + start)
  DB.auftraege()
    .filter((a: any) => a.datum === datum)
    .forEach((a: any, i: number) => {
      const kd = k.find((k: any) => k.id === a.kundeId)
      if (kd && kd.adresse) lines.push((i + 1) + '. ' + kd.name + ' - ' + kd.adresse)
    })
  _routeManuelleStopps.forEach((s, i) => lines.push((i + 1) + '. ' + s.label + ' - ' + s.adresse))
  navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Adressen kopiert'))
}

// ════════════════════════════════════════════════
// FAHRTENBUCH
// ════════════════════════════════════════════════
export function calcFahrtkosten() {
  const s  = parseInt((document.getElementById('fbStart') as HTMLInputElement)?.value) || 0
  const e  = parseInt((document.getElementById('fbEnde')  as HTMLInputElement)?.value) || 0
  const km = e - s
  const el = document.getElementById('fbErgebnis')
  if (el) el.textContent = km > 0 ? `${km} km - ${(km * 0.30).toFixed(2).replace('.', ',')} EUR` : '-- km'
}

export function saveFahrtenbuch() {
  const s   = parseInt((document.getElementById('fbStart') as HTMLInputElement)?.value) || 0
  const e   = parseInt((document.getElementById('fbEnde')  as HTMLInputElement)?.value) || 0
  const km  = e - s
  if (km <= 0) { alert('Kilometer eingeben'); return }
  const datum = (document.getElementById('routeDatum') as HTMLInputElement)?.value || today()
  const fb  = DB.fahrtenbuch().slice()
  fb.push({ id: uid(), datum, km, kosten: Math.round(km * 0.30 * 100) / 100, auftraege: DB.auftraege().filter((a: any) => a.datum === datum).length })
  DB.saveFahrtenbuch(fb)
  ;['fbStart', 'fbEnde'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement; if (el) el.value = ''
  })
  const fe = document.getElementById('fbErgebnis'); if (fe) fe.textContent = '-- km'
  renderFbHistorie()
  showToast('Fahrtenbuch gespeichert')
}

export function renderFbHistorie() {
  const fahrtenbuch = DB.fahrtenbuch()
  const h = document.getElementById('fbHistorie'); if (!h) return
  if (!fahrtenbuch.length) {
    h.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:12px;">Noch keine Einträge.</div>'
    return
  }
  const mk  = today().slice(0, 7)
  const mKm = fahrtenbuch.filter((f: any) => f.datum?.startsWith(mk)).reduce((s: number, f: any) => s + f.km, 0)
  h.innerHTML =
    `<div style="background:var(--card);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;justify-content:space-between;font-size:12px;">
       <span style="color:var(--text2);">Monat gesamt</span>
       <span style="font-weight:700;color:var(--teal);">${mKm} km - ${(mKm * 0.30).toFixed(2).replace('.', ',')} EUR</span>
     </div>` +
    fahrtenbuch.slice().reverse().slice(0, 5).map((f: any) =>
      `<div style="background:var(--card);border-radius:9px;padding:10px 13px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border);">
         <div>
           <div style="font-size:12px;font-weight:600;">${fmtDate(f.datum)}</div>
           <div style="font-size:10px;color:var(--text3);">${f.km} km - ${f.auftraege} Aufträge</div>
         </div>
         <div style="font-size:13px;font-weight:700;color:var(--teal);">${f.kosten.toFixed(2).replace('.', ',')} EUR</div>
       </div>`
    ).join('')
}
