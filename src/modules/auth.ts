// @ts-nocheck
// ── Auth-Modul ───────────────────────────────────────────────────
// Login, Register, Passwort-Reset, Konto löschen, Sign Out.
// Nutzt Supabase Auth direkt — kein Zustand in window nötig.

import { supabase, DB, setAccessToken } from '../lib/db'
import { showToast } from '../lib/utils'
import { showConfirm } from './ui'

// ── Modul-State ──────────────────────────────────────────────────
let _authMode = 'login'  // 'login' | 'register'

// ── Callbacks ────────────────────────────────────────────────────
let _onAuthSuccess:  () => void               = () => {}
let _onSignOut:      () => void               = () => {}
let _onApplyUser:    (user: any) => void      = () => {}

export function onAuthSuccess(fn: () => void)             { _onAuthSuccess = fn }
export function onAuthSignOut(fn: () => void)              { _onSignOut     = fn }
export function onAuthApplyUser(fn: (u: any) => void)     { _onApplyUser   = fn }

// ── Initialisierung ──────────────────────────────────────────────
export function initAuth() {
  document.getElementById('authBtn')?.addEventListener('click', authSubmit)
  document.getElementById('authForgotBtn')?.addEventListener('click', authForgot)
  document.getElementById('authToggleRegBtn')?.addEventListener('click', authToggleMode)
  document.getElementById('recoverySetPwBtn')?.addEventListener('click', recoverySetPassword)
  document.getElementById('btnDeleteAccount')?.addEventListener('click', deleteAccount)
  document.getElementById('btnSignOut')?.addEventListener('click', signOut)

  // Supabase Auth State Listener (zentral hier — nicht in main.ts)
  supabase.auth.onAuthStateChange(async (event: string, session: any) => {
    const screen          = document.getElementById('authScreen')
    const recoveryOverlay = document.getElementById('pwRecoveryOverlay')

    if (event === 'PASSWORD_RECOVERY') {
      if (recoveryOverlay) recoveryOverlay.style.display = 'flex'
      return
    }

    if (session?.access_token) {
      setAccessToken(session.access_token)
      if (screen) screen.style.display = 'none'
      _onApplyUser(session.user)
      _onAuthSuccess()
    } else {
      setAccessToken(null)
      if (screen) screen.style.display = 'flex'
    }
  })
}

// ── Modus umschalten ─────────────────────────────────────────────
export function authToggleMode() {
  _authMode = _authMode === 'login' ? 'register' : 'login'
  const isReg = _authMode === 'register'

  _el('authModeLbl',    el => el.textContent = isReg
    ? 'Erstelle ein neues Konto mit E-Mail und Passwort.'
    : 'Melde dich mit deiner E-Mail und deinem Passwort an.')
  _el('authPw',         el => { el.placeholder = isReg ? 'Passwort wählen (min. 6 Zeichen)' : '••••••••'; el.autocomplete = isReg ? 'new-password' : 'current-password' })
  _el('authPw2',        el => el.style.display = isReg ? 'block' : 'none')
  _el('authBtn',        el => el.textContent   = isReg ? '✓ Konto erstellen' : '→ Einloggen')
  _el('authToggleRegBtn', el => el.textContent = isReg ? '← Zurück zum Login' : 'Konto erstellen')
  _el('authMsg',        el => el.textContent   = '')
  _el('authConsentBox', el => el.style.display = isReg ? 'flex' : 'none')
  const consent = document.getElementById('authConsent') as HTMLInputElement
  if (!isReg && consent) consent.checked = false
}

export function authShowLogin() {
  _authMode = 'login'
  _el('authFormInner',  el => el.style.display = 'block')
  _el('authSent',       el => el.style.display = 'none')
  _el('authPw2',        el => el.style.display = 'none')
  _el('authBtn',        el => el.textContent   = '→ Einloggen')
  _el('authToggleRegBtn', el => el.textContent = 'Konto erstellen')
  _el('authModeLbl',    el => el.textContent   = 'Melde dich mit deiner E-Mail und deinem Passwort an.')
  _el('authMsg',        el => el.textContent   = '')
  _el('authConsentBox', el => el.style.display = 'none')
  const consent = document.getElementById('authConsent') as HTMLInputElement
  if (consent) consent.checked = false
}

// ── Login / Register ─────────────────────────────────────────────
export async function authSubmit() {
  const email = ((document.getElementById('authEmail') as HTMLInputElement)?.value || '').trim()
  const pw    = (document.getElementById('authPw')    as HTMLInputElement)?.value || ''
  const pw2   = (document.getElementById('authPw2')   as HTMLInputElement)?.value || ''
  const btn   = document.getElementById('authBtn') as HTMLButtonElement

  if (!email) { showAuthMsg('Bitte E-Mail eingeben', 'err'); return }
  if (!pw)    { showAuthMsg('Bitte Passwort eingeben', 'err'); return }
  btn.disabled = true

  if (_authMode === 'register') {
    if (pw.length < 6)  { showAuthMsg('Passwort muss mind. 6 Zeichen haben', 'err'); btn.disabled = false; return }
    if (pw !== pw2)     { showAuthMsg('Passwörter stimmen nicht überein', 'err');    btn.disabled = false; return }
    const consent = document.getElementById('authConsent') as HTMLInputElement
    if (!consent?.checked) { showAuthMsg('Bitte AGB und Datenschutzerklärung akzeptieren.', 'err'); btn.disabled = false; return }

    btn.textContent = 'Erstelle Konto…'
    const { data, error } = await supabase.auth.signUp({ email, password: pw })
    if (error) {
      showAuthMsg('Fehler: ' + error.message, 'err')
      btn.disabled = false; btn.textContent = '✓ Konto erstellen'
    } else {
      // DSGVO Art. 7 — Consent-Zeitstempel
      if (data?.user?.id) {
        await supabase.from('einstellungen').upsert({
          user_id: data.user.id,
          config:  { consent_at: new Date().toISOString(), consent_version: '1.0' }
        }, { onConflict: 'user_id' }).catch(() => {})
      }
      _el('authFormInner', el => el.style.display = 'none')
      _el('authSent',      el => el.style.display = 'block')
      _el('authSentIcon',  el => el.textContent   = '✅')
      _el('authSentTitle', el => el.textContent   = 'Konto erstellt!')
      _el('authSentMsg',   el => el.textContent   = 'Prüfe dein Postfach und bestätige deine E-Mail. Danach kannst du dich einloggen.')
    }
  } else {
    btn.textContent = 'Einloggen…'
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) {
      const msg = error.message.includes('Invalid login') ? 'E-Mail oder Passwort falsch.' : 'Fehler: ' + error.message
      showAuthMsg(msg, 'err')
      btn.disabled = false; btn.textContent = '→ Einloggen'
    }
    // bei Erfolg: onAuthStateChange übernimmt
  }
}

// ── Passwort-Reset (Recovery-Link) ───────────────────────────────
export async function recoverySetPassword() {
  const pw1 = ((document.getElementById('recoveryPw1') as HTMLInputElement)?.value || '').trim()
  const pw2 = ((document.getElementById('recoveryPw2') as HTMLInputElement)?.value || '').trim()
  const msg = document.getElementById('recoveryMsg')

  if (!pw1 || pw1.length < 6) { if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Mind. 6 Zeichen eingeben.' } return }
  if (pw1 !== pw2)            { if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Passwörter stimmen nicht überein.' } return }
  if (msg)                    { msg.style.color = 'var(--text2)'; msg.textContent = 'Speichere…' }

  try {
    const { error } = await Promise.race([
      supabase.auth.updateUser({ password: pw1 }),
      new Promise<any>((_, rej) => setTimeout(() => rej(new Error('Timeout — bitte nochmal versuchen')), 8000))
    ])
    if (error) throw error
    if (msg) { msg.style.color = 'var(--teal)'; msg.textContent = '✓ Passwort gesetzt!' }
    showToast('✓ Passwort gesetzt — bitte in der App einloggen')
    setTimeout(() => {
      const overlay = document.getElementById('pwRecoveryOverlay')
      if (overlay) overlay.style.display = 'none'
    }, 2000)
  } catch (e: any) {
    if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Fehler: ' + e.message }
    showToast('⚠ ' + e.message)
  }
}

// ── Passwort vergessen ───────────────────────────────────────────
export async function authForgot() {
  const email = ((document.getElementById('authEmail') as HTMLInputElement)?.value || '').trim()
  if (!email) { showAuthMsg('Bitte zuerst E-Mail eingeben', 'err'); return }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href.split('#')[0]
  })
  if (error) { showAuthMsg('Fehler: ' + error.message, 'err'); return }

  _el('authFormInner', el => el.style.display = 'none')
  _el('authSent',      el => el.style.display = 'block')
  _el('authSentIcon',  el => el.textContent   = '📬')
  _el('authSentTitle', el => el.textContent   = 'Reset-Link gesendet')
  _el('authSentMsg',   el => el.textContent   = 'Prüfe dein Postfach. Klicke auf den Link um ein neues Passwort zu setzen.')
}

// ── Konto löschen (DSGVO Art. 17) ───────────────────────────────
export async function deleteAccount() {
  const confirmed = await showConfirm(
    '⚠️ Konto wirklich löschen?',
    'Alle Daten werden dauerhaft entfernt: Kunden, Aufträge, Rechnungen, Angebote, Zeiterfassung und Einstellungen. Diese Aktion kann NICHT rückgängig gemacht werden.',
    'Konto löschen', 'var(--red)'
  )
  if (!confirmed) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { showToast('⚠ Nicht eingeloggt'); return }
  showToast('Lösche alle Daten…')

  try {
    const tabellen = ['kunden','auftraege','rechnungen','fahrtenbuch','zeiterfassung','materialien','einstellungen','wochenplan']
    for (const t of tabellen) {
      await supabase.from(t).delete().eq('user_id', user.id).catch(() => {})
    }
    const { data: files } = await supabase.storage.from('fotos').list(user.id).catch(() => ({ data: [] }))
    if (files?.length) {
      await supabase.storage.from('fotos').remove(files.map((f: any) => `${user.id}/${f.name}`)).catch(() => {})
    }
    await supabase.auth.signOut()
    localStorage.clear()
    alert('✓ Konto und alle Daten wurden gelöscht. Du wirst ausgeloggt.')
    location.reload()
  } catch (e: any) {
    showToast('⚠ Fehler beim Löschen: ' + e.message)
  }
}

// ── Sign Out ─────────────────────────────────────────────────────
export async function signOut() {
  try { await Promise.race([supabase.auth.signOut(), new Promise(r => setTimeout(r, 2000))]) } catch (_) {}

  // Cache leeren
  DB._uid   = null
  DB._cache = { kunden:[], auftraege:[], docs:[], wp:[], rechnungen:[], fahrtenbuch:[], einstellungen:[], zeiterfassung:[], materialien:[] }

  authShowLogin()
  ;(document.getElementById('authEmail') as HTMLInputElement).value = ''
  ;(document.getElementById('authPw')    as HTMLInputElement).value = ''
  ;(document.getElementById('authBtn')   as HTMLButtonElement).disabled = false
  const screen = document.getElementById('authScreen')
  if (screen) screen.style.display = 'flex'
  const sm = document.getElementById('sideMenu')
  if (sm) sm.classList.remove('open')
  const so = document.getElementById('sideOverlay')
  if (so) so.classList.remove('open')

  _onSignOut()
  showToast('Abgemeldet ✓')
}

// ── User-Infos in UI anwenden ────────────────────────────────────
export function applyAuthUser(user: any) {
  const el  = document.getElementById('sideUserEmail')
  if (el && user) el.textContent = user.email || ''
  const gem = document.getElementById('authGem')
  const CONFIG = (window as any).CONFIG
  if (gem) gem.textContent = CONFIG?.firma?.kuerzel || 'F'
  _onApplyUser(user)
}

export function showAuthMsg(msg: string, type: string) {
  const el = document.getElementById('authMsg')
  if (!el) return
  el.textContent  = msg
  el.style.color  = type === 'err' ? 'var(--red)' : 'var(--teal)'
}

// ── Interner DOM-Helfer ──────────────────────────────────────────
function _el(id: string, fn: (el: HTMLElement) => void) {
  const el = document.getElementById(id)
  if (el) fn(el)
}
