// SchnellR · send-push Edge Function
// Sendet Web-Push-Benachrichtigungen an einen oder mehrere User
// POST { user_id, title, body, url?, icon? }
// Oder: POST { user_ids: string[], title, body, ... }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    const vapidSubject    = 'mailto:hallo@schnellr.app'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const userIds: string[] = body.user_ids ?? (body.user_id ? [body.user_id] : [])
    const { title, message, url = '/', icon = '/icon-192.png' } = body

    if (!userIds.length || !title) {
      return json({ error: 'user_id/user_ids und title erforderlich' }, 400)
    }

    // Alle Tokens für die gewünschten User laden
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('*')
      .in('user_id', userIds)

    if (error) throw error
    if (!tokens?.length) return json({ sent: 0, message: 'Keine Tokens gefunden' })

    const payload = JSON.stringify({ title, body: message ?? title, url, icon })
    const results = await Promise.allSettled(
      tokens.map(t => sendWebPush(t, payload, vapidPublicKey, vapidPrivateKey, vapidSubject))
    )

    // Ungültige Tokens (410 Gone) aus DB entfernen
    const expiredEndpoints = results
      .map((r, i) => r.status === 'fulfilled' && r.value === 410 ? tokens[i].endpoint : null)
      .filter(Boolean)
    if (expiredEndpoints.length) {
      await supabase.from('push_tokens').delete().in('endpoint', expiredEndpoints)
    }

    const sent = results.filter(r => r.status === 'fulfilled' && r.value === 201).length
    return json({ sent, total: tokens.length })

  } catch (e) {
    console.error('[send-push]', e)
    return json({ error: e.message }, 500)
  }
})

// ── Web Push senden (VAPID-signiert) ──────────────────────────────────────
async function sendWebPush(
  token: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<number> {
  const audience = new URL(token.endpoint).origin
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 12 * 3600

  // VAPID JWT Header + Claims
  const header  = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims  = b64u(JSON.stringify({ aud: audience, exp, sub: subject }))
  const signing = `${header}.${claims}`

  // Private Key importieren und signieren
  const privKeyBytes = b64uDecode(vapidPrivateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signing)
  )
  const jwt = `${signing}.${b64u(new Uint8Array(sig))}`

  // Payload verschlüsseln (RFC 8291 / aes128gcm)
  const encrypted = await encryptPayload(payload, token.p256dh, token.auth)

  const res = await fetch(token.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'normal',
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
    },
    body: encrypted,
  })
  return res.status
}

// ── AES-128-GCM Verschlüsselung (RFC 8291) ───────────────────────────────
async function encryptPayload(
  plaintext: string,
  p256dhB64: string,
  authB64: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  )

  // Client Public Key
  const clientPub = await crypto.subtle.importKey(
    'raw', b64uDecode(p256dhB64),
    { name: 'ECDH', namedCurve: 'P-256' }, true, []
  )

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPub }, serverKeyPair.privateKey, 256
  )

  // Server public key (raw, 65 bytes)
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // HKDF auth secret
  const authSecret = b64uDecode(authB64)
  const prk = await hkdf(
    new Uint8Array(sharedSecret), authSecret,
    concat(encoder.encode('WebPush: info\x00'), b64uDecode(p256dhB64), serverPubRaw),
    32
  )

  // HKDF CEK + Nonce
  const cek   = await hkdf(prk, salt, buildInfo('aesgcm128', b64uDecode(p256dhB64), serverPubRaw), 16)
  const nonce = await hkdf(prk, salt, buildInfo('nonce', b64uDecode(p256dhB64), serverPubRaw), 12)

  // AES-GCM encrypt
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const paddedPayload = new Uint8Array([...encoder.encode(plaintext), 0x02])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, paddedPayload)
  )

  // RFC 8291 content-encoding header: salt(16) + rs(4) + keyid_len(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([serverPubRaw.length]), serverPubRaw, ciphertext)
}

function buildInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder()
  return concat(
    enc.encode(`Content-Encoding: ${type}\x00P-256\x00`),
    new Uint8Array([0, clientPub.length]), clientPub,
    new Uint8Array([0, serverPub.length]), serverPub
  )
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm))
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, concat(info, new Uint8Array([1]))))
  return t.slice(0, len)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

function b64u(data: string | Uint8Array): string {
  const str = typeof data === 'string' ? data : String.fromCharCode(...data)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64uDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=')
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}
