-- ════════════════════════════════════════════
-- SchnellR · Checklisten Schema
-- Im Supabase SQL-Editor ausführen
-- ════════════════════════════════════════════

-- Templates: Chef definiert pro Auftragstyp eine Checkliste
CREATE TABLE IF NOT EXISTS checklist_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,           -- z.B. "Heizungswartung"
  auftragstyp text,                    -- optional: nur für bestimmten Typ anzeigen
  created_at  timestamptz DEFAULT now()
);

-- Items: Einzelne Punkte pro Template
CREATE TABLE IF NOT EXISTS checklist_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES checklist_templates(id) ON DELETE CASCADE NOT NULL,
  position    int  DEFAULT 0,
  text        text NOT NULL
);

-- Auftragsspezifische Abhak-Instanzen
CREATE TABLE IF NOT EXISTS checklist_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auftrag_id  text NOT NULL,           -- lokale Auftrags-ID
  item_id     uuid REFERENCES checklist_items(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  erledigt    boolean DEFAULT false,
  erledigt_at timestamptz,
  UNIQUE(auftrag_id, item_id)
);

-- RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_entries   ENABLE ROW LEVEL SECURITY;

-- Templates: nur der Chef (= Ersteller) sieht + bearbeitet seine Templates
CREATE POLICY "owner_checklist_templates" ON checklist_templates
  FOR ALL USING (auth.uid() = user_id);

-- Items: sichtbar für alle im selben Team (via template owner)
CREATE POLICY "team_checklist_items" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklist_templates t
      JOIN team_members tm ON tm.team_id = (
        SELECT team_id FROM team_members WHERE user_id = auth.uid() LIMIT 1
      )
      WHERE t.id = checklist_items.template_id
      AND (t.user_id = auth.uid() OR tm.user_id = t.user_id)
    )
  );

-- Entries: eigene Einträge
CREATE POLICY "owner_checklist_entries" ON checklist_entries
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_cl_templates_user ON checklist_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_cl_items_template ON checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_cl_entries_auftrag ON checklist_entries(auftrag_id);
