-- Correctif race condition sync-storage.js (07/08/2026, bug signalé par
-- Laurent : des statuts de séance ✅/⚠️/❌ posés disparaissaient
-- silencieusement, en particulier autour d'un changement de source de
-- données, quand plusieurs saves rapprochés se produisaient — cf.
-- inventaire §16 pour la discussion complète).
--
-- CAUSE : synchroniserVersSupabase() (sync-storage.js) faisait un
-- read-modify-write en 2 requêtes séparées côté client (select puis
-- upsert) pour fusionner une clé dans plan_donnees.data (jsonb) :
--   1. SELECT data FROM plan_donnees WHERE plan_id = ...
--   2. upsert({ data: { ...existant, [cle]: valeur } })
-- Si deux appels à synchroniserVersSupabase() pour des clés DIFFÉRENTES
-- (ex. lk_statuses et lk_manual_perf) partaient presque simultanément
-- (plusieurs actions rapprochées : saisie manuelle suivie d'un
-- changement de source, ou plusieurs onglets/appareils actifs), chacun
-- lisait `data` AVANT que l'autre n'ait écrit sa propre fusion — le
-- second upsert écrasait alors le premier avec une version de `data`
-- qui ne contenait pas encore sa fusion à lui. Résultat : une clé
-- fraîchement sauvegardée disparaissait silencieusement de la base,
-- sans jamais lever d'erreur (les deux upserts réussissent
-- individuellement, aucun des deux ne voit l'autre).
--
-- FIX : fonction Postgres qui fait le merge ATOMIQUEMENT côté serveur
-- (un seul UPDATE, jsonb_set), donc plus aucune fenêtre de race
-- condition possible quel que soit le nombre d'écritures concurrentes
-- (plusieurs onglets, plusieurs appareils, plusieurs clés à la fois).
--
-- À exécuter une fois dans l'éditeur SQL de Supabase (dashboard) —
-- schema-decision-memory.sql existant dans ce repo est le seul
-- précédent de SQL versionné ; plan_donnees elle-même n'a pas de
-- migration versionnée trouvée dans le repo, donc ce fichier sert de
-- référence mais doit être appliqué manuellement au dashboard.

create or replace function merger_plan_donnees(
  p_plan_id uuid,
  p_user_id uuid,
  p_cle text,
  p_valeur jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- upsert atomique : si la ligne n'existe pas encore pour ce plan_id,
  -- on la crée avec data = { p_cle: p_valeur } ; si elle existe déjà,
  -- on fusionne p_cle dans le jsonb existant via l'opérateur || (jsonb
  -- concat, remplace la clé si présente, l'ajoute sinon) — équivalent
  -- exact du spread JS { ...existant, [cle]: valeur } mais exécuté
  -- atomiquement dans la même transaction, sans jamais relire une
  -- version périmée de data entre deux écritures concurrentes.
  insert into plan_donnees (plan_id, user_id, data)
  values (p_plan_id, p_user_id, jsonb_build_object(p_cle, p_valeur))
  on conflict (plan_id)
  do update set data = plan_donnees.data || jsonb_build_object(p_cle, p_valeur);
end;
$$;

-- Sécurité : la fonction s'exécute avec les droits du définisseur
-- (security definer), donc elle doit être appelable par le rôle
-- authentifié standard sans lui donner un accès direct plus large à la
-- table — cohérent avec le reste du schéma (RLS déjà en place sur
-- plan_donnees d'après les appels .eq('plan_id', ...) systématiques
-- côté client). Si RLS bloque l'appel malgré security definer, vérifier
-- la policy INSERT/UPDATE de plan_donnees dans le dashboard.
grant execute on function merger_plan_donnees(uuid, uuid, text, jsonb) to authenticated;
