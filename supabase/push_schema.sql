-- ════════════════════════════════════════════
-- SchnellR · Push-Benachrichtigungen Schema
-- Im Supabase SQL-Editor ausführen
-- ════════════════════════════════════════════

-- Push Tokens (ein Eintrag pro Gerät + User)
CREATE TABLE IF NOT EXISTS push_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  device_info text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Push-Einstellungen pro User (welche Events aktiv)
CREATE TABLE IF NOT EXISTS push_settings (
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  neuer_auftrag        boolean DEFAULT true,
  terminerinnerung     boolean DEFAULT true,
  rechnung_bezahlt     boolean DEFAULT true,
  mahnung_faellig      boolean DEFAULT true,
  updated_at           timestamptz DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_settings ENABLE ROW LEVEL SECURITY;

-- Policies: User sieht + bearbeitet nur eigene Daten
CREATE POLICY "Users own push_tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own push_settings" ON push_settings
  FOR ALL USING (auth.uid() = user_id);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
