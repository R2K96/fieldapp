-- ═══════════════════════════════════════════════
-- SchnellR: Multi-User Team Schema
-- Ausführen im Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Teams-Tabelle
CREATE TABLE IF NOT EXISTS teams (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  owner_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_code  TEXT UNIQUE NOT NULL,
  max_members  INT DEFAULT 5,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Team-Mitglieder
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role         TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  display_name TEXT,
  email        TEXT,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE,
  UNIQUE(team_id, user_id)
);

-- RLS aktivieren
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams: Owner hat vollen Zugriff
CREATE POLICY "teams_owner_all" ON teams FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Teams: Mitglieder können ihr Team lesen
CREATE POLICY "teams_member_read" ON teams FOR SELECT TO authenticated
  USING (id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

-- Team-Mitglieder: Admin kann alles im eigenen Team verwalten
CREATE POLICY "team_members_admin_all" ON team_members FOR ALL TO authenticated
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

-- Team-Mitglieder: Alle können Mitglieder ihres Teams lesen
CREATE POLICY "team_members_read" ON team_members FOR SELECT TO authenticated
  USING (team_id IN (
    SELECT team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.is_active = TRUE
  ));

-- Team-Mitglieder: Nutzer kann selbst austreten (is_active = false setzen)
CREATE POLICY "team_members_self_update" ON team_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Hilfsfunktion: Team-ID für eingeloggten Nutzer
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT team_id FROM team_members
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1
$$;

-- Hilfsfunktion: Ist der eingeloggte Nutzer Admin?
CREATE OR REPLACE FUNCTION is_team_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams WHERE owner_id = auth.uid()
  )
$$;
