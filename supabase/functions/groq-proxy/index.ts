// FieldApp · Groq Proxy Edge Function
// Läuft serverseitig auf Supabase — Groq Key wird nie an den Browser weitergegeben.
// Unterstützt: Transkription (Whisper) + Übersetzung + KI-Analyse

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LANG_DE = 'german'

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth prüfen: nur eingeloggte User dürfen die Funktion nutzen ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const groqKey = Deno.env.get('GROQ_KEY')
    if (!groqKey) return json({ error: 'Server nicht konfiguriert' }, 500)

    // ── Action aus FormData oder JSON lesen ──
    const contentType = req.headers.get('content-type') || ''
    let action = '', text = '', audioFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      action = fd.get('action') as string
      text = fd.get('text') as string || ''
      audioFile = fd.get('file') as File | null
    } else {
      const body = await req.json()
      action = body.action
      text = body.text || ''
    }

    // ══ ACTION: transcribe ══
    // Audio → Whisper → Sprache erkannt → ggf. auf Deutsch übersetzen
    if (action === 'transcribe') {
      if (!audioFile) return json({ error: 'Keine Audio-Datei' }, 400)

      const fd = new FormData()
      fd.append('file', audioFile, 'audio.webm')
      fd.append('model', 'whisper-large-v3')
      fd.append('response_format', 'verbose_json')

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: fd,
      })
      if (!whisperRes.ok) {
        const err = await whisperRes.text()
        return json({ error: 'Whisper Fehler: ' + err }, 502)
      }
      const whisperData = await whisperRes.json()
      const originalText = whisperData.text?.trim() || ''
      const detectedLang = (whisperData.language || LANG_DE).toLowerCase()

      if (!originalText) return json({ text: '', detectedLanguage: detectedLang })

      // Deutsch → kein Übersetzungsschritt nötig
      if (detectedLang === LANG_DE) {
        return json({ text: originalText, originalText, detectedLanguage: detectedLang })
      }

      // Nicht-Deutsch → LLM Übersetzung
      const translatedText = await translateToGerman(originalText, groqKey)
      return json({ text: translatedText, originalText, detectedLanguage: detectedLang })
    }

    // ══ ACTION: analyze ══
    // Deutschen Text → strukturierte Auftragsdaten extrahieren
    if (action === 'analyze') {
      if (!text) return json({ error: 'Kein Text übergeben' }, 400)

      const systemPrompt = `Du bist ein Assistent für Handwerker-Dokumentationen.
Extrahiere aus dem folgenden Diktat strukturierte Informationen und antworte NUR mit validem JSON:
{
  "taetigkeit": "<Was wurde konkret gemacht?>",
  "material": "<Welche Materialien wurden verwendet?>",
  "dauer": "<Wie lange hat es gedauert?>",
  "maengel": "<Welche Mängel oder Probleme wurden festgestellt?>",
  "naechsteSchritte": "<Was muss noch gemacht werden?>",
  "zusammenfassung": "<1-2 Sätze was gemacht wurde>"
}`

      const analyzeRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ]
        })
      })
      if (!analyzeRes.ok) return json({ error: 'Analyse Fehler' }, 502)
      const analyzeData = await analyzeRes.json()
      const raw = analyzeData.choices[0].message.content
      // JSON aus Antwort extrahieren
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return json({ error: 'Kein JSON in Antwort' }, 502)
      return json(JSON.parse(match[0]))
    }

    return json({ error: 'Unbekannte action' }, 400)

  } catch (e) {
    console.error('[groq-proxy]', e)
    return json({ error: e.message }, 500)
  }
})

// ── Hilfsfunktionen ──
async function translateToGerman(text: string, groqKey: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Du bist ein präziser Übersetzer für Handwerker-Dokumentationen. Übersetze exakt auf Deutsch. Nur die Übersetzung, keine Erklärungen.' },
        { role: 'user', content: text }
      ]
    })
  })
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}
