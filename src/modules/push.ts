// @ts-nocheck
// ── Push-Benachrichtigungen-Modul ────────────────────────────────
// VAPID-Subscription, Toggle-UI, Event-Trigger via Edge Function.

import { supabase, getAccessToken } from '../lib/db'
import { showToast } from '../lib/utils'
import { VAPID_PUBLIC_KEY, SUPA_URL } from '../lib/config'

// ── Hilfsfunktionen ──────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// ── Initialisierung ──────────────────────────────────────────────
export function initPush() {
  document.getElementById('pushToggleBtn')?.addEventListener('click', togglePushSubscription)
}

// ── Push-UI initialisieren ───────────────────────────────────────
export async function initPushUI() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    const card = document.getElementById('pushCard')
    if (card) card.style.display = 'none'
    return
  }

  const perm    = Notification.permission
  const btn     = document.getElementById('pushToggleBtn') as HTMLButtonElement
  const label   = document.getElementById('pushStatusLabel')
  const toggles = document.getElementById('pushEventToggles')

  if (perm === 'granted') {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      _setPushBtnActive(btn, false)       // zeigt "Deaktivieren"
      if (label)  label.textContent = 'Push aktiv'
      if (toggles) { toggles.style.display = 'block'; await renderPushToggles() }
    }
  } else if (perm === 'denied') {
    if (label) label.textContent = 'Push blockiert (in Browser-Einstellungen erlauben)'
    if (btn)   btn.disabled = true
  }
}

// ── Push an/abschalten ───────────────────────────────────────────
export async function togglePushSubscription() {
  const btn = document.getElementById('pushToggleBtn') as HTMLButtonElement
  if (!btn) return

  const reg      = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()

  if (existing) {
    await existing.unsubscribe()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('push_tokens').delete()
        .eq('user_id', user.id).eq('endpoint', existing.endpoint)
    }
    _setPushBtnActive(btn, true)          // zeigt "Aktivieren"
    const label   = document.getElementById('pushStatusLabel')
    const toggles = document.getElementById('pushEventToggles')
    if (label)   label.textContent = 'Push aktivieren'
    if (toggles) toggles.style.display = 'none'
    return
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') { showToast('Benachrichtigungen wurden nicht erlaubt.'); return }

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const { endpoint, keys } = sub.toJSON() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('push_tokens').upsert({
        user_id:     user.id,
        endpoint,
        p256dh:      keys.p256dh,
        auth:        keys.auth,
        device_info: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'user_id,endpoint' })

      await supabase.from('push_settings').upsert({
        user_id:          user.id,
        neuer_auftrag:    true,
        terminerinnerung: true,
        rechnung_bezahlt: true,
        mahnung_faellig:  true,
      }, { onConflict: 'user_id' })
    }

    _setPushBtnActive(btn, false)         // zeigt "Deaktivieren"
    const label   = document.getElementById('pushStatusLabel')
    const toggles = document.getElementById('pushEventToggles')
    if (label)   label.textContent = 'Push aktiv'
    if (toggles) { toggles.style.display = 'block'; await renderPushToggles() }
    showToast('Push-Benachrichtigungen aktiviert!')
  } catch (e: any) {
    showToast('Fehler: ' + e.message)
  }
}

// ── Toggle-Liste rendern ─────────────────────────────────────────
export async function renderPushToggles() {
  const list = document.getElementById('pushToggleList')
  if (!list) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: s } = await supabase.from('push_settings').select('*').eq('user_id', user.id).single()
  const settings = s || { neuer_auftrag: true, terminerinnerung: true, rechnung_bezahlt: true, mahnung_faellig: true }

  const events = [
    { key: 'neuer_auftrag',    label: 'Neuer Auftrag zugewiesen' },
    { key: 'terminerinnerung', label: 'Terminerinnerung (60 Min. vorher)' },
    { key: 'rechnung_bezahlt', label: 'Rechnung als bezahlt markiert' },
    { key: 'mahnung_faellig',  label: 'Mahnung fällig' },
  ]

  list.innerHTML = events.map(ev => `
    <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">
      <span style="font-size:13px;color:var(--text);">${ev.label}</span>
      <input type="checkbox" data-push-key="${ev.key}" ${settings[ev.key] ? 'checked' : ''}
        style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;">
    </label>`).join('')

  // Event-Delegation für Checkboxen
  list.querySelectorAll('[data-push-key]').forEach(cb => {
    cb.addEventListener('change', () => savePushSetting(
      (cb as HTMLElement).dataset.pushKey!,
      (cb as HTMLInputElement).checked
    ))
  })
}

export async function savePushSetting(key: string, value: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('push_settings').upsert(
    { user_id: user.id, [key]: value, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}

// ── Push auslösen (über Edge Function) ───────────────────────────
export async function triggerPush(eventType: string, targetUserId: string, title: string, message: string) {
  const token = getAccessToken()
  if (!token) return
  try {
    await fetch(`${SUPA_URL}/functions/v1/send-push`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ user_id: targetUserId, title, message }),
    })
  } catch (_) { /* Push-Fehler sind nicht kritisch */ }
}

// ── Interner Helfer ──────────────────────────────────────────────
function _setPushBtnActive(btn: HTMLButtonElement | null, activate: boolean) {
  if (!btn) return
  if (activate) {
    btn.textContent    = 'Aktivieren'
    btn.style.background = 'var(--teal)'
    btn.style.color      = '#0d1520'
    btn.style.border     = 'none'
  } else {
    btn.textContent    = 'Deaktivieren'
    btn.style.background = 'var(--bg3)'
    btn.style.color      = 'var(--text2)'
    btn.style.border     = '1px solid var(--border)'
  }
}
