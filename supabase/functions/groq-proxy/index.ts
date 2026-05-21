// SchnellR · KI-Proxy Edge Function
// Provider-Kette: Gladia (Transkription) → Groq Whisper (Fallback)
//                 Mistral (LLM)          → Groq LLaMA (Fallback)
// Alle Keys serverseitig — kein Schlüssel im Browser.

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
    // ── Auth: nur eingeloggte Nutzer ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // ── Keys: Gladia + Mistral primär, Groq als Fallback ──
    const gladiaKey  = Deno.env.get('GLADIA_KEY')  ?? ''
    const mistralKey = Deno.env.get('MISTRAL_KEY') ?? ''
    const groqKey    = Deno.env.get('GROQ_KEY')    ?? ''

    // ── Request parsen ──
    const contentType = req.headers.get('content-type') || ''
    let action = '', text = '', audioFile: File | null = null
    let messages: { role: string; content: string }[] = []

    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      action    = fd.get('action') as string
      text      = fd.get('text') as string || ''
      audioFile = fd.get('file') as File | null
    } else {
      const body = await req.json()
      action   = body.action
      text     = body.text || ''
      messages = body.messages || []
    }

    // ══════════════════════════════════════
    // ACTION: transcribe
    // Gladia → Groq Whisper (Fallback)
    // ══════════════════════════════════════
    if (action === 'transcribe') {
      if (!audioFile) return json({ error: 'Keine Audio-Datei' }, 400)
      if (!gladiaKey && !groqKey) return json({ error: 'Kein Transkriptions-Key konfiguriert' }, 500)

      if (gladiaKey) {
        return await transcribeGladia(audioFile, gladiaKey, groqKey)
      } else {
        return await transcribeGroq(audioFile, groqKey)
      }
    }

    // ══════════════════════════════════════
    // ACTION: analyze
    // Diktat → strukturiertes Auftrags-JSON
    // Mistral → Groq LLaMA (Fallback)
    // ══════════════════════════════════════
    if (action === 'analyze') {
      if (!text) return json({ error: 'Kein Text übergeben' }, 400)
      if (!mistralKey && !groqKey) return json({ error: 'Kein LLM-Key konfiguriert' }, 500)

      const systemPrompt = `Du bist ein Assistent für Handwerker-Dokumentationen im Außendienst.
Extrahiere aus dem folgenden Diktat strukturierte Informationen und antworte NUR mit validem JSON (kein Markdown, keine Erklärung):
{
  "zeitMinuten": <Gesamtdauer als Zahl in Minuten, z.B. 45 — oder 0 wenn nicht erkennbar>,
  "materialien": [<Array von durchgeführten Leistungen oder verwendeten Materialien als Strings, z.B. ["Thermostat getauscht","Heizkörper entlüftet"]>],
  "folgetermin": <true wenn ein Folgetermin, Rückruf oder Wiedervorlage erwähnt wird — sonst false>,
  "folgeGrund": "<Kurzer Grund für den Folgetermin oder null>",
  "leistungsart": "<'Handwerk' wenn handwerkliche Folgeleistung, 'Bürokratie' wenn administrativ — sonst null>",
  "zusammenfassung": "<1-2 prägnante Sätze was konkret gemacht wurde>"
}`

      const msgs = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: text }
      ]

      const raw = mistralKey
        ? await chatMistral(msgs, mistralKey, 0.2)
        : await chatGroq(msgs, groqKey, 0.2)

      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return json({ error: 'Kein JSON in Antwort' }, 502)
      return json(JSON.parse(match[0]))
    }

    // ══════════════════════════════════════
    // ACTION: chat  (generisch)
    // Für Schnellerfassung + zukünftige Features
    // Mistral → Groq LLaMA (Fallback)
    // ══════════════════════════════════════
    if (action === 'chat') {
      if (!messages.length) return json({ error: 'Keine messages' }, 400)
      if (!mistralKey && !groqKey) return json({ error: 'Kein LLM-Key konfiguriert' }, 500)

      const raw = mistralKey
        ? await chatMistral(messages, mistralKey, 0.1)
        : await chatGroq(messages, groqKey, 0.1)

      return json({ content: raw })
    }

    return json({ error: 'Unbekannte action' }, 400)

  } catch (e) {
    console.error('[ki-proxy]', e)
    return json({ error: e.message }, 500)
  }
})

// ════════════════════════════════════════════════
// GLADIA: Audio → Text (v2 API)
// 1. Upload → audio_url
// 2. Transcription job starten → id
// 3. Polling bis status === "done"
// ════════════════════════════════════════════════
async function transcribeGladia(
  audioFile: File,
  gladiaKey: string,
  groqKeyFallback: string
): Promise<Response> {
  try {
    // 1. Audio hochladen
    const uploadForm = new FormData()
    uploadForm.append('audio', audioFile, 'audio.webm')
    const uploadRes = await fetch('https://api.gladia.io/v2/upload', {
      method: 'POST',
      headers: { 'x-gladia-key': gladiaKey },
      body: uploadForm,
    })
    if (!uploadRes.ok) throw new Error('Gladia Upload: ' + await uploadRes.text())
    const { audio_url } = await uploadRes.json()

    // 2. Transkription starten mit auto-detect + Übersetzung auf Deutsch
    const transcribeRes = await fetch('https://api.gladia.io/v2/pre-recorded', {
      method: 'POST',
      headers: { 'x-gladia-key': gladiaKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_url,
        detect_language: true,
        enable_code_switching: false,
        translation: {
          target_translation_language: 'german',
          model: 'base',
        },
      }),
    })
    if (!transcribeRes.ok) throw new Error('Gladia Transcribe: ' + await transcribeRes.text())
    const { id } = await transcribeRes.json()

    // 3. Polling (max 25× alle 1,5s = ~37,5s Timeout)
    for (let i = 0; i < 25; i++) {
      await sleep(1500)
      const pollRes = await fetch(`https://api.gladia.io/v2/pre-recorded/${id}`, {
        headers: { 'x-gladia-key': gladiaKey },
      })
      const data = await pollRes.json()

      if (data.status === 'error') throw new Error('Gladia Verarbeitungsfehler: ' + data.error_message)

      if (data.status === 'done') {
        const detectedLang = (
          data.result?.metadata?.detected_languages?.[0] ?? 'german'
        ).toLowerCase()

        const isGerman = detectedLang === 'german' || detectedLang === 'de'

        if (!isGerman && data.result?.translation) {
          // Übersetzung vorhanden → deutsch zurückgeben
          const translated = (data.result.translation.results ?? [])
            .map((r: { full_transcript: string }) => r.full_transcript)
            .join(' ')
            .trim()
          const original = data.result.transcription?.full_transcript?.trim() ?? ''
          return json({ text: translated || original, originalText: original, detectedLanguage: detectedLang, provider: 'gladia' })
        }

        const transcript = data.result?.transcription?.full_transcript?.trim() ?? ''
        return json({ text: transcript, detectedLanguage: detectedLang, provider: 'gladia' })
      }
      // status: 'queued' | 'processing' → weiter warten
    }
    throw new Error('Gladia Timeout nach 37,5s')

  } catch (e) {
    console.warn('[Gladia] Fehler:', e.message, '→ Fallback Groq Whisper')
    if (!groqKeyFallback) return json({ error: 'Gladia fehlgeschlagen, kein Groq-Fallback: ' + e.message }, 502)
    return await transcribeGroq(audioFile, groqKeyFallback)
  }
}

// ════════════════════════════════════════════════
// GROQ WHISPER: Audio → Text (Fallback)
// ════════════════════════════════════════════════
async function transcribeGroq(audioFile: File, groqKey: string): Promise<Response> {
  const fd = new FormData()
  fd.append('file', audioFile, 'audio.webm')
  fd.append('model', 'whisper-large-v3')
  fd.append('response_format', 'verbose_json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}` },
    body: fd,
  })
  if (!res.ok) return json({ error: 'Groq Whisper: ' + await res.text() }, 502)

  const data = await res.json()
  const originalText = data.text?.trim() ?? ''
  const detectedLang = (data.language ?? 'german').toLowerCase()

  if (!originalText) return json({ text: '', detectedLanguage: detectedLang, provider: 'groq' })
  if (detectedLang === 'german' || detectedLang === 'de') {
    return json({ text: originalText, detectedLanguage: detectedLang, provider: 'groq' })
  }

  // Nicht-Deutsch → per LLM übersetzen
  const translated = await translateGroq(originalText, groqKey)
  return json({ text: translated, originalText, detectedLanguage: detectedLang, provider: 'groq' })
}

// ════════════════════════════════════════════════
// MISTRAL: Chat-Completion (primärer LLM)
// ════════════════════════════════════════════════
async function chatMistral(
  messages: { role: string; content: string }[],
  mistralKey: string,
  temperature: number
): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      temperature,
      max_tokens: 600,
    }),
  })
  if (!res.ok) throw new Error('Mistral: ' + await res.text())
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

// ════════════════════════════════════════════════
// GROQ LLAMA: Chat-Completion (Fallback LLM)
// ════════════════════════════════════════════════
async function chatGroq(
  messages: { role: string; content: string }[],
  groqKey: string,
  temperature: number
): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature,
      max_tokens: 600,
    }),
  })
  if (!res.ok) throw new Error('Groq LLM: ' + await res.text())
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

async function translateGroq(text: string, groqKey: string): Promise<string> {
  return chatGroq([
    { role: 'system', content: 'Übersetze exakt auf Deutsch. Nur die Übersetzung, keine Erklärungen.' },
    { role: 'user',   content: text }
  ], groqKey, 0.1)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}
