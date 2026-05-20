import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPA_URL, SUPA_KEY } from './config'

export const supabase: SupabaseClient = createClient(SUPA_URL, SUPA_KEY)

/** Aktuelles Access-Token (wird nach Login gesetzt) */
let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

/** Sync-Header für direkte REST-Calls */
export function buildHeaders(): Record<string, string> {
  return {
    'apikey':        SUPA_KEY,
    'Authorization': `Bearer ${_accessToken ?? SUPA_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates',
  }
}
