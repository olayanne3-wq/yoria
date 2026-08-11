# Persistance et données — Yoria

> localStorage, tables Supabase, RLS, profil coureur. Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et les principes
> transverses.

## Persistance

**localStorage (préfixe `lk_`)** — clés globales (profil/config) :
`lk_profil_coureur`, `lk_strava_token`, `lk_strava_refresh`,
`lk_strava_expires`, `lk_strava_activities`, `lk_last_sync`,
`lk_data_source` (préfixée par plan via `clePourPlan()` une fois un plan
disponible, repli sur la clé brute avant — cf. `auth-et-publication.md`).

Clés préfixées par plan (via `clePourPlan()`) : `lk_statuses`,
`lk_hidden_sessions`, `lk_swapped_sessions`, `lk_session_notes`, `lk_notes`,
`lk_checklist`, `lk_adaptations_ignorees`, `lk_last_rebuild`,
`lk_pred_history`, `lk_race_goal`, `lk_race_horaires`, `lk_race_parcours`,
`lk_race_result`, `lk_race_result_details`, `lk_weather_cache`,
`lk_coach_msg`, `lk_coach_date`, `lk_coach_race_msg`,
`lk_resultat_test_forme`, `lk_manual_perf`, `lk_km_comptes_par_uid`.

**`lk_race_result_details`** — détail enrichi du résultat de course :
`{rpe, commentaire, classementGeneral:{place,total},
classementCategorie:{place,total}}`. Clé SÉPARÉE de `lk_race_result` (qui
reste un simple nombre de secondes, utilisé par 4 points d'appel
existants) — un résultat saisi avant l'ajout de ce champ reste valide,
ses détails sont simplement absents (`null`).

**`lk_manual_perf`** — objet `{uid: {average_speed, distance,
average_heartrate, dureeSaisieMin, intervalles, laps}}`. `distance` est
la distance TOTALE de la séance (échauffement + effort + récup + retour
au calme, cf. `distanceTotaleAvecRecup()`) — **jamais** utilisée telle
quelle par le prédicteur (cf. `moteur-plan.md`, qui recalcule une distance d'effort
seul). `intervalles` : tableau de booléens réussi/raté par répétition.
`laps` : tableau de laps SYNTHÉTIQUES au format Strava, un par répétition
attendue, construit à la sauvegarde par `construireLapsManuels()` (cf.
`architecture-generale.md`/`saisie-et-integrations.md`). Optionnel (absent pour toute saisie antérieure à ce champ).

**`lk_km_comptes_par_uid`** — registre `{uid: kmDejaComptes}`, sert
exclusivement à rendre idempotent l'ajustement du cumul global
`profilCoureur.kmCumulesTotal` (badge "km cumulés", cf. ci-dessous) : mémorise,
par séance, combien de km ont déjà été ajoutés au total global, pour
ajuster la différence à chaque changement de statut sans jamais compter
deux fois la même séance. Local au plan (contrairement à `kmCumulesTotal`
lui-même, champ GLOBAL du profil coureur).

**Principe** : toute donnée propre à un plan doit être préfixée — une clé
globale non préfixée est un risque de contamination inter-plans. Exception
volontaire : `yoria_bandeau_ios_ferme` (cf. `architecture-generale.md`) décrit un état de l'appareil
lui-même, pas une donnée de plan — ne doit jamais être préfixée ni
synchronisée.

**Convention `statuses[uid]`** : peut valoir `'—'` explicitement, pas
seulement `undefined`/absent — tout code qui teste "cette séance a-t-elle
déjà un statut" doit vérifier `statuses[uid] && statuses[uid] !== '—'`.

**Tout point qui écrit ou efface un statut (`statuses[uid]`) ou une
saisie manuelle (`manualPerf[uid]`) doit répercuter le changement sur le
cumul km (`recalculerKmComptesPourUid`) et, si le type de séance est
SEUIL/VMA/SPEC, sur l'historique de prédiction (`rebuildPredHistory()`)**.
Les points d'écriture concernés : clic manuel de statut
(`renderStatusRow`), saisie manuelle Enregistrer/Annuler, suppression
d'une activité, auto-validation en masse après synchro
(`matchActivitiesToPlan()`, le chemin le plus fréquent), choix d'une
activité ambiguë, test semi-Cooper. Tout NOUVEAU point d'écriture de ces
deux structures doit être audité contre cette liste — un `grep` exhaustif
du motif d'écriture reste plus fiable qu'une liste mentale de points déjà
identifiés.

**Supabase** — tables `plans_original` (copie figée), `plans_actif`
(version vivante), `plan_donnees`, `integrations` (colonne `v2_gist_id` en
brut), `abonnements`, `beta_testers`, `signalements`, `badges_debloques`,
`decision_events`, `decision_outcomes` (cf. `saisie-et-integrations.md`), plus deux tables de
rate limiting `tentatives_connexion_admin` et `tentatives_soumission_beta`
(cf. `site-beta-admin.md`). Sync Realtime activée sur `plan_donnees` (anti-écho 3s) —
établissement du canal WebSocket non-bloquant (`activerRealtime()` n'est
pas `await`-é avant le premier `render()`, le canal continue de s'établir
en arrière-plan). File d'attente de sync en cas d'échec réseau
(`lk_file_attente_sync`, 5 min, abandon après 10 essais).

**RLS (Row Level Security)** — activée sur toutes les tables applicatives
sensibles, vérifiée table par table début août 2026 (méthode : SQL Editor,
requête `select policyname, cmd, qual, with_check from pg_policies where
tablename = '...'`, plus fiable que l'aperçu replié de l'éditeur de
policies qui peut tronquer une condition longue). Deux patterns
légitimes selon le cas :
- **Lien direct par `user_id`** (`plans_actif`, `plan_donnees`,
  `decision_events`, `badges_debloques`) : condition `auth.uid() =
  user_id`, en `USING` pour SELECT/UPDATE/DELETE et `WITH CHECK` pour
  INSERT (les deux colonnes du système, pas juste une — une valeur `null`
  dans l'une des deux pour une opération qui la nécessite serait un vrai
  trou).
- **Lien indirect** (`decision_outcomes`, qui n'a pas de `user_id` propre,
  seulement `decision_event_id` → `decision_events.id`) : condition par
  sous-requête EXISTS vers la table parente.
- **Lecture seule, écriture serveur uniquement** (`abonnements`) : une
  seule policy SELECT (`auth.uid() = user_id`), aucune policy
  INSERT/UPDATE/DELETE côté client — toute écriture passe exclusivement
  par les endpoints serverless (`service_role`, qui contourne RLS
  nativement). Absence de policy d'écriture = comportement voulu ici, pas
  un oubli.
- **Accès client totalement bloqué** (`beta_testers`) : RLS activée, zéro
  policy déclarée = aucune donnée ne transite par l'API Data côté client,
  quelle que soit l'opération. Tout passe par `api/beta.js`/
  `api/beta-admin.js` en `service_role`. C'est la configuration la plus
  restrictive possible, cohérente avec le fait qu'aucun point du
  frontend n'accède directement à cette table.

**`synchroniserVersSupabase()` (`sync-storage.js`)** — merge atomique via
RPC Postgres `merger_plan_donnees(p_plan_id, p_user_id, p_cle, p_valeur)`
(`security definer`) qui fait le merge côté serveur via `data ||
jsonb_build_object(...)` en un seul `UPDATE` — élimine toute fenêtre de
lecture séparée entre deux écritures concurrentes sur des clés
différentes du même `plan_donnees.data` (jsonb). `rejouerEntreeFile()`
(file de retry réseau) utilise le même RPC — un seul chemin d'écriture
vers `plan_donnees` dans tout le fichier.

**Sauvegarde de plan — Supabase est l'unique mécanisme de persistance.**
Le système Gist v2 (`gist-sync.js`) a été entièrement retiré des écritures
— reste dans le repo uniquement pour `trouverPlanEnConflit` (garde-fou
anti-chevauchement de dates, fonction pure indépendante de la
persistance). Un plan Forme clôturé (`dateCloture` posée) ne peut plus
être écrasé via `mettreAJourPlanSupabase()`.

**`chargerResultatsCoursesSupabase(userId)` (`sync-storage.js`)** — liste
les résultats de course déjà saisis sur TOUS les plans course d'un
utilisateur (mode ≠ 'forme'), pour la section "🏅 Mes courses" (cf. `architecture-generale.md`).
Requête en N+1 (une lecture `plan_donnees` par plan) plutôt qu'un
`IN(...)` groupé — volume attendu faible.

**Sauvegarde/restauration de la base (`api/backup.js`)** — le projet
Supabase est en plan **Free**, sans Daily Backups ni PITR.
`api/backup.js`, accessible depuis `beta-admin` (onglet Sauvegarde),
comble ce manque : export global (découverte automatique des tables via
introspection PostgREST — jamais de liste blanche codée en dur), export
ciblé par utilisateur (email), et réinjection en upsert.
`decision_events`/`decision_outcomes` traités via la chaîne indirecte
(`decision_event_id`, pas de `user_id` direct sur la seconde table).
Réinjection d'un utilisateur dont le compte Auth a été supprimé :
recréation automatique avec le même `id`. Réinjection depuis un export
global : champ e-mail optionnel pour isoler un seul utilisateur — bloque
explicitement si aucune ligne ne correspond, plutôt qu'un upsert
silencieux de 0 ligne. Priorité de résolution de l'`id` : `user_id` fourni
manuellement (priorité absolue), sinon API Admin Auth, sinon table
`abonnements` de l'export.

**Garde-fou de cohérence id/données avant recréation d'un compte** — un
`id` et un `email` ne sont pas la même clé (`user_id` est la clé de
vérité pour les données applicatives). `recreerUtilisateurSiAbsent` exige
qu'au moins une ligne des données à réinjecter porte réellement cet `id`
avant de créer le compte — sinon refuse explicitement (statut 409).
Portée strictement limitée à la réparation d'une perte accidentelle —
jamais un contournement d'une suppression de compte volontaire au titre
du droit à l'effacement (RGPD art. 17).

**Diagnostic des cascades ON DELETE (`api/backup.js`, onglet Cascades de
`beta-admin`)** — vérifie proactivement que toute table applicative avec
une colonne `user_id`/`id_utilisateur` a bien `ON DELETE CASCADE` vers
`auth.users`. Repose sur deux fonctions RPC Postgres
(`diagnostiquer_cascades_user_id`, `diagnostiquer_colonnes_user_id_sans_fk`
— cf. `docs/v2-methodologie/diagnostic-cascades-user-id.sql`, accès
restreint au `service_role`). Génère le SQL de correction prêt à
copier-coller — cet onglet ne modifie **jamais** le schéma lui-même,
uniquement en lecture. À lancer occasionnellement (ex. avant une mise en
production), pas à chaque table ajoutée.

**`decision_events`/`decision_outcomes`** — étape 1 du chantier de vision
"coach adaptatif à mémoire par coureur". Écriture best-effort uniquement,
aucune lecture n'exploite encore cette donnée. `decision_events`
journalise chaque décision du `RuleEngine` (proposée/appliquée/ignorée,
contexte complet). `decision_outcomes` lie une décision à la première
séance ultérieure avec un statut connu (référence `decision_event_id`,
pas `user_id` directement). RLS strictement par propriétaire (vérifiée,
cf. ci-dessus). Schéma SQL dans `schema-decision-memory.sql`.

**Suppression de compte — toutes les tables applicatives liées à
`user_id` doivent être en `ON DELETE CASCADE`** vers `auth.users(id)` —
`decision_events`, `badges_debloques`, `plans_actif` en font partie.
`decision_outcomes` cascade indirectement via `decision_event_id` →
`decision_events.id`. `api/delete-account.js` nettoie en plus
`decision_events` explicitement en filet de sécurité
(`TABLES_A_NETTOYER`), avant l'appel à l'Admin API — toute nouvelle table
applicative liée à `user_id` doit être vérifiée en cascade au moment de
sa création. Nettoyage complet équivalent aussi implémenté côté
`api/beta-admin.js` (suppression de compte depuis l'admin, cf. `site-beta-admin.md`) —
étendu à `plans_original`, `plan_donnees` (lien indirect via `plan_id`),
`integrations`, et `abonnements` (lien par email, pas `user_id`).

## Profil coureur (`lk_profil_coureur`)

```
{
  prenom, nom, dateNaissance, anneeNaissance (dérivée), poids, taille,
  fcMax, fcRepos, sexe, pps,
  ppsDocument: {data (JPEG base64), type:"image/jpeg", nomFichier} | null,
  ppsExpiration: "YYYY-MM-DD" | null,
  records: { "5K": {temps, date?}, "10K": {...}, "Semi": {...}, "Marathon": {...} },
  kmCumulesTotal: nombre (cumul GLOBAL, tous plans confondus)
}
```

- `dateNaissance` : catégorie d'âge FFA calculée (`calculerCategorieAgeFFA()`,
  bascule au 1er septembre), message anniversaire.
- `fcRepos`/`sexe` : consommés par le moteur de décision (pondération
  TRIMP). Repli sur 'autre' si non renseigné.
- `pps` : champ texte (numéro de licence/PPS), remplacé par le module
  d'import `ppsDocument`. Reste dans la structure pour compatibilité,
  éditable nulle part dans l'UI actuelle.
- `ppsDocument`/`ppsExpiration` : gérés exclusivement via la modale du
  bouton "🩺 PPS" du header (cf. `architecture-generale.md`) — Réglages n'affiche qu'un rappel en
  lecture seule.
- `kmCumulesTotal` : cumul de km sur toutes les séances validées
  (✅/⚠️/❌), tous plans confondus — alimente le badge "km cumulés" (cf.
  ci-dessous). Champ GLOBAL, à distinguer explicitement de
  `lk_km_comptes_par_uid` (local au plan, cf. ci-dessus). Ajusté de façon
  idempotente à chaque changement de statut via
  `recalculerKmComptesPourUid()`.
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit à partir du
  profil (record le plus pertinent, repli Riegel sinon).
  `verifierCoherenceRecord()` écarte un record si écart >10% à
  l'estimation Riegel des autres.
- **Sauvegarde** : chaque champ du profil coureur (identité,
  poids/taille/FC, objectif) s'auto-sauvegarde individuellement à la
  sortie du champ (`sauvegarderProfilCoureur()`), les records personnels
  passent par validation explicite (cf. `architecture-generale.md`). Les sélecteurs Niveau/Sexe
  ne doivent JAMAIS appeler `sauvegarderProfilCoureur()` directement au
  clic — seulement mettre à jour l'état local puis `render()`, sinon un
  profil incomplet écrase Supabase.
- **Toute donnée binaire volumineuse** (image, PDF converti) doit être
  compressée côté client avant sauvegarde — un fichier brut fait exploser
  le payload JSONB envoyé par `sauvegarderProfilCoureur()`, qui échoue en
  fire-and-forget sans jamais remonter d'erreur ni bloquer l'écriture
  locale.
- **Un seul compte Supabase Auth par email** — vérifier `Authentication →
  Users` en cas de doute, un profil orphelin peut coexister
  silencieusement avec le vrai profil actif.

