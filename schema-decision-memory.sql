-- ============================================================================
-- Chantier de vision "coach adaptatif à mémoire par coureur"
-- (cf. docs/v2-methodologie/vision-coach-adaptatif.md)
--
-- Étape 1 uniquement : AMASSER la donnée, sans jamais l'exploiter. Ces deux
-- tables sont écrites en best-effort depuis public/index.html
-- (journaliserDecisionEvent, mettreAJourStatutDecisionEvent,
-- observerDecisionOutcomes) — aucune lecture n'alimente encore le moteur de
-- décision ni aucune autre fonctionnalité. À exécuter une seule fois dans
-- Supabase (SQL Editor).
-- ============================================================================

create table if not exists decision_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  plan_id uuid,
  created_at timestamptz not null default now(),
  regle_id text,
  priorite int,
  type_decision text,
  contexte jsonb,
  ampleur_demandee numeric,
  ampleur_appliquee numeric,
  statut text not null default 'proposee' check (statut in ('proposee', 'appliquee', 'ignoree'))
);

create index if not exists idx_decision_events_user_plan on decision_events(user_id, plan_id);
create index if not exists idx_decision_events_created_at on decision_events(created_at);

alter table decision_events enable row level security;

create policy "Lecture de ses propres decision_events"
  on decision_events for select
  using (auth.uid() = user_id);

create policy "Ecriture de ses propres decision_events"
  on decision_events for insert
  with check (auth.uid() = user_id);

create policy "Mise a jour de ses propres decision_events"
  on decision_events for update
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------

create table if not exists decision_outcomes (
  id uuid primary key default gen_random_uuid(),
  decision_event_id uuid not null references decision_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  uid_seance_suivie text,
  statut_seance text,
  rpe int,
  delai_jours int
);

create index if not exists idx_decision_outcomes_event on decision_outcomes(decision_event_id);

alter table decision_outcomes enable row level security;

-- Pas de user_id direct sur cette table — la RLS passe par une sous-requête
-- vers decision_events (le lien de propriété se fait via decision_event_id).
create policy "Lecture des outcomes de ses propres decisions"
  on decision_outcomes for select
  using (
    exists (
      select 1 from decision_events
      where decision_events.id = decision_outcomes.decision_event_id
      and decision_events.user_id = auth.uid()
    )
  );

create policy "Ecriture des outcomes de ses propres decisions"
  on decision_outcomes for insert
  with check (
    exists (
      select 1 from decision_events
      where decision_events.id = decision_outcomes.decision_event_id
      and decision_events.user_id = auth.uid()
    )
  );
