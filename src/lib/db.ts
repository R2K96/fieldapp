// @ts-nocheck
// ── Datenbank-Layer ─────────────────────────────────────────────
// In-Memory-Cache + Supabase-Sync via direkten fetch-Calls.
// Reads sind synchron (aus Cache), Writes gehen asynchron raus.
// Offline: Änderungen landen in der OfflineQueue und werden bei
// reconnect automatisch geflusht.

import { createClient } from '@supabase/supabase-js'
import { SUPA_URL, SUPA_KEY } from './config'
import { uid } from './utils'

// ── Supabase Client (Singleton) ─────────────────────────────────
export const supabase = createClient(SUPA_URL, SUPA_KEY)

// Access-Token wird nach Login gesetzt → macht _headers() synchron
let _accessToken: string | null = null
export function setAccessToken(token: string | null) { _accessToken = token }
export function getAccessToken() { return _accessToken }

// ── Offline-Queue ───────────────────────────────────────────────
const QUEUE_KEY = 'schnellr_offline_queue'

export const OfflineQueue = {
  _q: [] as any[],

  load() {
    try { this._q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { this._q = [] }
  },
  save() {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(this._q)) } catch {}
  },
  push(op: any) { this._q.push({ ...op, ts: Date.now() }) },
  count() { return this._q.length },
  clear() { this._q = []; this.save() },

  async flush(headers: Record<string, string>) {
    if (!this._q.length) return
    const ops = [...this._q]
    this.clear()
    updateOfflineBadge()
    const failed: any[] = []

    for (const op of ops) {
      try {
        if (op.type === 'upsert' && op.items?.length) {
          const h = { ...headers, 'Prefer': 'resolution=merge-duplicates' }
          const res = await fetch(`${SUPA_URL}/rest/v1/${op.table}`, {
            method: 'POST', headers: h,
            body: JSON.stringify(op.items.map((item: any) => ({ id: item.id, user_id: op.uid, data: item })))
          })
          if (!res.ok) failed.push(op)
        } else if (op.type === 'delete' && op.ids?.length) {
          const ids = op.ids.map((id: string) => `"${id}"`).join(',')
          const res = await fetch(`${SUPA_URL}/rest/v1/${op.table}?id=in.(${ids})`, {
            method: 'DELETE', headers
          })
          if (!res.ok) failed.push(op)
        }
      } catch { failed.push(op) }
    }

    if (failed.length) { this._q = failed; this.save() }
    else { showOfflineToast(`✓ ${ops.length} Änderung${ops.length > 1 ? 'en' : ''} synchronisiert`) }
    updateOfflineBadge()
  }
}
OfflineQueue.load()

// ── Offline-Badge ───────────────────────────────────────────────
export function updateOfflineBadge() {
  const badge = document.getElementById('offlineBadge')
  if (!badge) return
  const offline = !navigator.onLine
  const pending = OfflineQueue.count()
  if (offline) {
    badge.style.display = 'inline'
    badge.style.background = 'rgba(239,68,68,0.15)'
    badge.style.color = '#f87171'
    badge.style.borderColor = 'rgba(239,68,68,0.3)'
    badge.textContent = pending ? `OFFLINE · ${pending} ausstehend` : 'OFFLINE'
  } else if (pending) {
    badge.style.display = 'inline'
    badge.style.background = 'rgba(234,179,8,0.15)'
    badge.style.color = 'var(--gold)'
    badge.style.borderColor = 'rgba(234,179,8,0.3)'
    badge.textContent = `⏳ ${pending} syncing…`
  } else {
    badge.style.display = 'none'
  }
}

// Kleiner Toast ohne zirkulären Import (showToast ist in utils.ts)
function showOfflineToast(msg: string) {
  const t = document.createElement('div')
  t.textContent = msg
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--teal)', color: '#0d1520', padding: '10px 20px',
    borderRadius: '20px', fontWeight: '700', fontSize: '13px', zIndex: '9999',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  })
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

// ── Datenbank-Objekt ────────────────────────────────────────────
export const DB = {
  _uid: null as string | null,
  _cache: {
    kunden: [] as any[], auftraege: [] as any[], docs: [] as any[],
    wp: [] as any[], rechnungen: [] as any[], fahrtenbuch: [] as any[],
    einstellungen: [] as any[], zeiterfassung: [] as any[],
    materialien: [] as any[], angebote: [] as any[],
  },

  /** Alle Tabellen beim Login laden */
  async init() {
    const tables    = ['kunden','auftraege','docs','wochenplan','rechnungen','fahrtenbuch','einstellungen','zeiterfassung','materialien','angebote']
    const cacheKeys = ['kunden','auftraege','docs','wp','rechnungen','fahrtenbuch','einstellungen','zeiterfassung','materialien','angebote']
    const results = await Promise.all(tables.map(t => supabase.from(t).select('data').order('created_at')))
    results.forEach((res, i) => {
      this._cache[cacheKeys[i]] = (res.data || []).map((row: any) => row.data)
    })
  },

  // ── Synchrone Lesemethoden ──────────────────────────────────────
  kunden()        { return this._cache.kunden.slice() },
  auftraege()     { return this._cache.auftraege.slice() },
  docs()          { return this._cache.docs.slice() },
  wpItems()       { return this._cache.wp.slice() },
  rechnungen()    { return this._cache.rechnungen.slice() },
  fahrtenbuch()   { return this._cache.fahrtenbuch.slice() },
  einstellungen() { return this._cache.einstellungen[0] || null },
  zeiterfassung() { return this._cache.zeiterfassung.slice() },
  materialien()   { return this._cache.materialien.slice() },
  angebote()      { return this._cache.angebote.slice() },

  // ── REST-Header (synchron, kein getSession-Hang) ────────────────
  _headers(): Record<string, string> {
    return {
      'apikey':        SUPA_KEY,
      'Authorization': `Bearer ${_accessToken || SUPA_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    }
  },

  // ── Interner Sync: Cache → Supabase ────────────────────────────
  _sync(cacheKey: string, table: string, newData: any[]) {
    const old = [...this._cache[cacheKey]]
    this._cache[cacheKey] = newData
    const userId = this._uid
    if (!userId) { console.warn('[DB] _uid fehlt – kein Sync für', table); return }

    const toUpsert = newData.filter(n => {
      const o = old.find((x: any) => x.id === n.id)
      return !o || JSON.stringify(o) !== JSON.stringify(n)
    })
    const toDelete = old.filter((o: any) => !newData.find(n => n.id === o.id)).map((o: any) => o.id)

    if (!toUpsert.length && !toDelete.length) return

    if (!navigator.onLine) {
      if (toUpsert.length) OfflineQueue.push({ type: 'upsert', table, uid: userId, items: toUpsert })
      if (toDelete.length) OfflineQueue.push({ type: 'delete', table, uid: userId, ids: toDelete })
      OfflineQueue.save()
      updateOfflineBadge()
      return
    }

    this._flush(table, userId, toUpsert, toDelete)
  },

  _flush(table: string, userId: string, toUpsert: any[], toDelete: string[]) {
    if (toUpsert.length) {
      const h = this._headers()
      fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: 'POST', headers: h,
        body: JSON.stringify(toUpsert.map(item => ({ id: item.id, user_id: userId, data: item }))),
      })
        .then(res => res.ok
          ? console.log('[DB] upsert OK', table, toUpsert.length)
          : res.text().then(t => console.error('[DB] upsert Fehler', table, t))
        )
        .catch(e => console.error('[DB] upsert Exception', table, e))
    }
    if (toDelete.length) {
      const h = this._headers()
      const ids = toDelete.map(id => `"${id}"`).join(',')
      fetch(`${SUPA_URL}/rest/v1/${table}?id=in.(${ids})`, { method: 'DELETE', headers: h })
        .then(res => res.ok
          ? console.log('[DB] delete OK', table)
          : res.text().then(t => console.error('[DB] delete Fehler', table, t))
        )
        .catch(e => console.error('[DB] delete Exception', table, e))
    }
  },

  // ── Schreibmethoden ─────────────────────────────────────────────
  saveKunden(d: any[])      { this._sync('kunden',       'kunden',       d) },
  saveAuftraege(d: any[])   { this._sync('auftraege',    'auftraege',    d) },
  saveDocs(d: any[])        { this._sync('docs',         'docs',         d) },
  saveWP(d: any[])          { this._sync('wp',           'wochenplan',   d) },
  saveRechnungen(d: any[])  { this._sync('rechnungen',   'rechnungen',   d) },
  saveFahrtenbuch(d: any[]) { this._sync('fahrtenbuch',  'fahrtenbuch',  d) },
  saveEinstellungen(cfg: any) { this._sync('einstellungen', 'einstellungen', [{ id: 'config', ...cfg }]) },
  saveZeiterfassung(d: any[]){ this._sync('zeiterfassung','zeiterfassung', d) },
  saveMaterialien(d: any[]) { this._sync('materialien',  'materialien',  d) },
  saveAngebote(d: any[])    { this._sync('angebote',     'angebote',     d) },

  // ── Storage: Foto hochladen ──────────────────────────────────────
  async uploadFoto(file: File, refId: string, refType: string): Promise<string | null> {
    if (!this._uid) return null
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${this._uid}/${refType}_${refId}_${uid()}.${ext}`
    const res  = await fetch(`${SUPA_URL}/storage/v1/object/fieldapp-fotos/${path}`, {
      method:  'POST',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${_accessToken || SUPA_KEY}`, 'Content-Type': file.type },
      body:    file,
    })
    if (!res.ok) { console.error('[Storage] Upload fehlgeschlagen', await res.text()); return null }
    return `${SUPA_URL}/storage/v1/object/public/fieldapp-fotos/${path}`
  },

  async deleteFoto(url: string) {
    const path = url.split('/fieldapp-fotos/')[1]
    if (!path) return
    await fetch(`${SUPA_URL}/storage/v1/object/fieldapp-fotos/${path}`, {
      method:  'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${_accessToken || SUPA_KEY}` },
    })
  },
}

// ── Online/Offline-Events ───────────────────────────────────────
window.addEventListener('online', async () => {
  updateOfflineBadge()
  if (OfflineQueue.count() && DB._uid) {
    await OfflineQueue.flush(DB._headers())
  }
})
window.addEventListener('offline', () => updateOfflineBadge())
