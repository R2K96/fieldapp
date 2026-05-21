// @ts-nocheck
// ── Einstellungen-Modul ──────────────────────────────────────────
// Firmendaten, Stundensätze, Mitarbeiter, Logo, Groq-Key.

import { DB } from '../lib/db'
import { uid, showToast } from '../lib/utils'
import { registerPage } from './ui'
import { BRANCH_LEISTUNGEN, DEFAULT_LEISTUNGEN } from '../lib/branchLeistungen'
import { OB_BRANCHES } from './onboarding'

// Logo-State (Modul-lokal, kein globales Leak mehr)
let _logoBase64: string | null = null

// Callbacks
let _renderTeamSection: () => void         = () => {}
let _renderMaterialListe: () => void       = () => {}
let _renderChecklistTemplates: () => void  = () => {}

export function onRenderTeamSection(fn: () => void)          { _renderTeamSection = fn }
export function onRenderMaterialListe(fn: () => void)        { _renderMaterialListe = fn }
export function onRenderChecklistTemplates(fn: () => void)   { _renderChecklistTemplates = fn }

// ── Initialisierung ──────────────────────────────────────────────
export function initEinstellungen() {
  registerPage('einstellungen', () => { renderEinstellungen(); (window as any).initPushUI?.() })

  document.getElementById('btnSaveEinstellungen')?.addEventListener('click', saveEinstellungen)
  document.getElementById('btnAddMitarbeiter')?.addEventListener('click', addMitarbeiter)
  document.getElementById('btnSaveGroqKey')?.addEventListener('click', saveGroqKey)
  document.getElementById('cfgLogoInput')?.addEventListener('change', (e) =>
    handleLogoUpload((e.target as HTMLInputElement))
  )
  document.getElementById('btnRemoveLogo')?.addEventListener('click', removeLogo)
}

// ── Render ───────────────────────────────────────────────────────
export function renderEinstellungen() {
  _renderTeamSection()
  _renderMaterialListe()
  _renderChecklistTemplates()

  const CONFIG = (window as any).CONFIG
  if (!CONFIG) return
  const f = CONFIG.firma

  // Firmendaten
  ;['name','kuerzel','tagline','region','adresse','telefon','email','iban','paypal'].forEach(k => {
    const el = document.getElementById('cfg-' + k) as HTMLInputElement
    if (el) el.value = f[k] || ''
  })
  const rgEl = document.getElementById('cfg-rgprefix') as HTMLInputElement
  if (rgEl) rgEl.value = f.rg_prefix || 'RG'
  const fEl = document.getElementById('cfg-fusszeile') as HTMLTextAreaElement
  if (fEl) fEl.value = CONFIG.abrechnung?.rechnungsFusszeile || ''

  // Logo
  _logoBase64 = f.logo || null
  const prev  = document.getElementById('cfg-logo-preview')
  if (prev) {
    prev.innerHTML = _logoBase64
      ? `<img src="${_logoBase64}" style="width:100%;height:100%;object-fit:contain;">`
      : 'kein Logo'
  }

  // Leistungen-Bereich mit Branch-Switcher
  const list = document.getElementById('cfg-leistungen-list')
  if (list) {
    const currentBranch = CONFIG._branchLabel || ''
    const branchBadge = currentBranch
      ? `<span style="background:var(--teal);color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">${currentBranch}</span>`
      : ''

    // Branch-Switcher oben
    const branchGrid = OB_BRANCHES.map((b, i) =>
      `<div data-cfg-branch="${b.label}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 6px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:12px;text-align:center;gap:3px;background:${CONFIG._branchLabel === b.label ? 'var(--teal)' : 'var(--bg3)'};color:${CONFIG._branchLabel === b.label ? '#fff' : 'var(--text1)'};">
        <span style="font-size:18px;">${b.icon}</span>
        <span style="font-weight:600;">${b.label}</span>
      </div>`
    ).join('')

    // Leistungs-Zeilen mit Löschen-Button
    const leistungRows = CONFIG.leistungen.map((l: any, i: number) =>
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;background:var(--bg3);border-radius:8px;padding:9px 12px;">
        <span style="font-size:18px;flex-shrink:0;">${l.emoji}</span>
        <div style="flex:1;font-size:13px;font-weight:600;">${l.label}</div>
        ${l.flat
          ? `<div style="font-size:12px;color:var(--text3);">Pauschale</div>
             <input class="inp" type="number" value="${l.pause || 0}" style="width:68px;padding:6px 8px;font-size:13px;" id="cfg-l-pause-${i}" placeholder="€">`
          : `<input class="inp" type="number" value="${l.satz || 0}" style="width:68px;padding:6px 8px;font-size:13px;" id="cfg-l-satz-${i}" placeholder="€/h">
             <span style="font-size:11px;color:var(--text3);">€/h</span>`
        }
        <button data-remove-leistung="${i}" style="background:none;border:none;color:var(--red);font-size:15px;cursor:pointer;padding:0 2px;flex-shrink:0;">✕</button>
      </div>`
    ).join('')

    list.innerHTML = `
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px;">Aktives Gewerk ${branchBadge}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px;" id="cfg-branch-grid">${branchGrid}</div>
        <div style="font-size:11px;color:var(--text3);">Gewerk wechseln setzt Leistungen auf Branchenstandard zurück.</div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px;">Leistungskatalog</div>
      <div id="cfg-leistungen-rows">${leistungRows}</div>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
        <input class="inp" id="cfg-new-leistung-emoji" placeholder="🔧" style="width:48px;text-align:center;padding:8px;">
        <input class="inp" id="cfg-new-leistung-label" placeholder="Neue Leistung..." style="flex:1;">
        <input class="inp" id="cfg-new-leistung-satz" type="number" placeholder="€/h" style="width:72px;" min="0">
        <button id="btnAddLeistung" style="background:var(--teal);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;">+ Hinzufügen</button>
      </div>`

    // Events: Branch-Wechsel
    list.querySelectorAll('[data-cfg-branch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = (btn as HTMLElement).dataset.cfgBranch!
        if (!confirm(`Leistungen auf "${label}"-Standard zurücksetzen?`)) return
        const leistungen = BRANCH_LEISTUNGEN[label] ?? DEFAULT_LEISTUNGEN
        CONFIG.leistungen  = leistungen
        CONFIG._branchLabel = label
        renderEinstellungen()
        showToast(`✓ Gewerk auf ${label} gewechselt`)
      })
    })

    // Events: Leistung löschen
    list.querySelectorAll('[data-remove-leistung]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt((btn as HTMLElement).dataset.removeLeistung!)
        CONFIG.leistungen.splice(i, 1)
        renderEinstellungen()
      })
    })

    // Event: Leistung hinzufügen
    list.querySelector('#btnAddLeistung')?.addEventListener('click', () => {
      const emoji = (list.querySelector('#cfg-new-leistung-emoji') as HTMLInputElement)?.value.trim() || '🔧'
      const label = (list.querySelector('#cfg-new-leistung-label') as HTMLInputElement)?.value.trim()
      const satz  = parseFloat((list.querySelector('#cfg-new-leistung-satz') as HTMLInputElement)?.value) || 60
      if (!label) { showToast('⚠ Bitte Leistungsname eingeben'); return }
      CONFIG.leistungen.push({ emoji, label, satz, flat: false, puffer: 60, color: 'var(--teal)' })
      renderEinstellungen()
      ;(window as any).buildLeistungChips?.()
    })
  }

  renderMaList()
}

// ── Mitarbeiter-Liste ────────────────────────────────────────────
export function renderMaList() {
  const CONFIG = (window as any).CONFIG
  const list   = document.getElementById('cfg-ma-list')
  if (!list || !CONFIG) return
  list.innerHTML = CONFIG.mitarbeiter.map((m: string, i: number) =>
    `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <input class="inp" value="${m}" style="flex:1;" id="cfg-ma-${i}">
      <button data-ma-remove="${i}" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
    </div>`
  ).join('')

  // Event-Delegation für Remove-Buttons
  list.querySelectorAll('[data-ma-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeMitarbeiter(parseInt((btn as HTMLElement).dataset.maRemove!)))
  })
}

export function addMitarbeiter() {
  const CONFIG = (window as any).CONFIG
  if (!CONFIG) return
  CONFIG.mitarbeiter.push('Neuer Mitarbeiter')
  renderMaList()
  const last = document.getElementById('cfg-ma-' + (CONFIG.mitarbeiter.length - 1)) as HTMLInputElement
  if (last) { last.focus(); last.select() }
}

export function removeMitarbeiter(i: number) {
  const CONFIG = (window as any).CONFIG
  if (!CONFIG) return
  CONFIG.mitarbeiter.splice(i, 1)
  renderMaList()
}

// ── Logo ─────────────────────────────────────────────────────────
export function handleLogoUpload(input: HTMLInputElement) {
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) { showToast('Datei zu groß (max. 2 MB)'); return }
  const reader = new FileReader()
  reader.onload = (e) => {
    _logoBase64 = (e.target as FileReader).result as string
    const prev  = document.getElementById('cfg-logo-preview')
    if (prev) prev.innerHTML = `<img src="${_logoBase64}" style="width:100%;height:100%;object-fit:contain;">`
  }
  reader.readAsDataURL(file)
}

export function removeLogo() {
  _logoBase64 = null
  const prev  = document.getElementById('cfg-logo-preview')
  if (prev) prev.innerHTML = 'kein Logo'
}

// ── Speichern ────────────────────────────────────────────────────
export function saveEinstellungen() {
  const CONFIG = (window as any).CONFIG
  if (!CONFIG) return

  // Firmendaten lesen
  const f: Record<string, string> = {}
  ;['name','kuerzel','tagline','region','adresse','telefon','email','iban','paypal'].forEach(k => {
    const el = document.getElementById('cfg-' + k) as HTMLInputElement
    if (el) f[k] = el.value.trim()
  })
  const rgEl = document.getElementById('cfg-rgprefix') as HTMLInputElement
  if (rgEl) f.rg_prefix = rgEl.value.trim() || 'RG'
  f.logo = _logoBase64 || null

  // Fußzeile
  const fEl = document.getElementById('cfg-fusszeile') as HTMLTextAreaElement
  if (fEl) CONFIG.abrechnung.rechnungsFusszeile = fEl.value.trim()

  // Stundensätze
  const leistungen = CONFIG.leistungen.map((l: any, i: number) => {
    const el  = document.getElementById(l.flat ? `cfg-l-pause-${i}` : `cfg-l-satz-${i}`) as HTMLInputElement
    const val = el ? parseFloat(el.value) || 0 : (l.satz || 0)
    return l.flat ? { ...l, pause: val } : { ...l, satz: val }
  })

  // Mitarbeiter
  const mitarbeiter = CONFIG.mitarbeiter.map((_: any, i: number) => {
    const el = document.getElementById(`cfg-ma-${i}`) as HTMLInputElement
    return el ? el.value.trim() : CONFIG.mitarbeiter[i]
  }).filter(Boolean)

  // CONFIG global aktualisieren (bleibt bis Phase 3 global)
  Object.assign(CONFIG.firma, f)
  CONFIG.mitarbeiter = mitarbeiter
  CONFIG.leistungen  = leistungen

  // In Supabase speichern
  DB.saveEinstellungen({
    firma: f, mitarbeiter, leistungen,
    rechnungsFusszeile: CONFIG.abrechnung.rechnungsFusszeile,
    branchLabel: CONFIG._branchLabel || '',
  })

  // UI aktualisieren (applyConfig ist noch in main.ts)
  ;(window as any).applyConfig?.()
  showToast('Einstellungen gespeichert ✓')
}

// ── Groq-Key ─────────────────────────────────────────────────────
export function saveGroqKey() {
  const input = document.getElementById('groqKeyInput') as HTMLInputElement
  const msg   = document.getElementById('groqKeyMsg')
  const key   = (input?.value || '').trim()
  if (!key) {
    if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Bitte Key eingeben.' }
    return
  }
  if (!key.startsWith('gsk_')) {
    if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Groq Keys beginnen mit gsk_' }
    return
  }
  localStorage.setItem('fa_groq_key', key)
  if (msg) { msg.style.color = 'var(--teal)'; msg.textContent = '✓ Key gespeichert – KI-Auswertung aktiv.' }
  showToast('Groq Key gespeichert ✓')
}

// ── Einstellungen aus DB laden ────────────────────────────────────
export function applyEinstellungenFromDB() {
  const CONFIG   = (window as any).CONFIG
  const einst    = DB.einstellungen()
  if (!einst || !CONFIG) return

  if (einst.firma)        Object.assign(CONFIG.firma, einst.firma)
  if (einst.mitarbeiter)  CONFIG.mitarbeiter   = einst.mitarbeiter
  if (einst.leistungen)   CONFIG.leistungen    = einst.leistungen
  if (einst.branchLabel)  CONFIG._branchLabel  = einst.branchLabel
  if (einst.rechnungsFusszeile !== undefined)
    CONFIG.abrechnung.rechnungsFusszeile = einst.rechnungsFusszeile
}
