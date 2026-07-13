# Inventaire de l'application "Run by Léa"

> Vue d'ensemble de référence — à relire en début de session pour retrouver le contexte
> sans re-parcourir tout le repo. Mis à jour au 13 juillet 2026 (chantier ACWR en cours ;
> harmonisation visuelle app/wizard ; badge décharge onglet Semaines ; chantier v2.5
> authentification Supabase intégré et testé en conditions réelles ; premier jet de
> migration localStorage → Supabase implémenté).
> Pour l'historique des décisions et le "pourquoi", voir les autres docs de ce dossier
> (bibliotheque-seances.md, convergence-v1-v2.md, etc.) et les mémoires de session.
>
> ⚠️ **Cet inventaire doit être mis à jour à chaque push** — voir §10, principe
> "Inventaire à jour". Un push qui change la structure, les écrans, les clés de
> stockage, les intégrations ou l'état des chantiers sans mettre à jour ce fichier
> est incomplet.

## 1. Vue d'ensemble

**Run by Léa** — PWA coach running, génère des plans d'entraînement adaptatifs.
Déployée sur Vercel : `plan-10k-alpha.vercel.app`. Repo GitHub : `olayanne3-wq/plan-10k`.
Stack : vanilla HTML/CSS/JS, hosting statique Vercel, API serverless dans `/api/`.
Utilisateur principal actuel : Laurent, qui prépare un Semi le 1er novembre 2026.

## 2. Arborescence du repo

```
plan-10k/
├── api/                          # Endpoints serverless (Vercel/Node)
│   ├── coach.js                  # Proxy vers Claude Haiku (messages coach courts)
│   ├── strava.js                 # OAuth Strava (auth, callback, refresh, activities)
│   └── weather.js                # Proxy Open-Meteo (prévision + alerte chaleur >28°C)
├── docs/v2-methodologie/         # Documentation méthodologique et architecture
│   ├── inventaire-application.md # CE FICHIER
│   ├── bibliotheque-seances.md   # Méthodologie détaillée des types de séances qualité
│   ├── convergence-v1-v2.md      # Historique des décisions de convergence v1→v2
│   ├── coherence-semaine-test.md
│   ├── jalons-narratifs.md
│   ├── jour-de-course.md
│   ├── notes-meteo.md
│   └── notes-pratiques.md
│   └── reperes-qualitatifs.md
├── public/
│   ├── index.html                 # App principale (dashboard) — sert le plan v2, ~300K
│   ├── manifest.json, sw.js, icônes  # PWA v1 (racine)
│   ├── engine-classic-scripts/    # Copies non-module (.classic.js) du moteur v2,
│   │                               # utilisées par index.html (script classique).
│   │                               # À régénérer manuellement à chaque modif du moteur.
│   │                               # Inclut auth.classic.js (dérivé de v2/engine/auth.js,
│   │                               # 13 juillet 2026) et sync-storage.classic.js (dérivé de
│   │                               # v2/engine/sync-storage.js, 13 juillet 2026), attachés à
│   │                               # window.LkAuth et window.LkSync respectivement, plutôt
│   │                               # qu'aux globals habituels PLAN/ALL_SESSIONS.
│   └── v2/
│       ├── index.html             # Wizard de création de plan (~120K)
│       ├── manifest.json, sw.js   # PWA v2
│       └── engine/                # Moteur v2 (modules ES, source de vérité)
│           ├── plan-generator.js  # Cœur : génération de plan, séances, adaptations (~100K)
│           ├── gist-sync.js       # Sync multi-device via GitHub Gist
│           ├── pdf-export.js      # Export PDF du plan (jsPDF)
│           ├── strava.js          # Intégration Strava côté client (tokens, volume)
│           ├── weather.js         # Intégration météo côté client
│           ├── auth.js            # Auth Supabase (écran connexion/inscription, session) — v2.5, 13 juillet 2026
│           ├── sync-storage.js    # Synchronisation localStorage ↔ Supabase — v2.5, 13 juillet 2026
│           ├── v1-bridge.js       # Traduction plan v2 → format v1 (pour affichage classic)
│           └── test-*.mjs         # Suite de tests (13 fichiers, un par module/fonctionnalité)
├── vercel.json                    # Routage : /api/*, /v2, fallback statique
└── package.json                   # { "type": "module" }
```

## 3. Les deux interfaces

| | `public/index.html` | `public/v2/index.html` |
|---|---|---|
| Rôle | App principale : dashboard, suivi, réglages | Wizard : création/paramétrage d'un plan |
| Route | `/` | `/v2` |
| Type de script | Classique (pas de `type="module"`) | Module ES natif |
| Dépend de | `engine-classic-scripts/*.classic.js` (copies) | `v2/engine/*.js` (source) |
| Statut | Sert le plan v2 depuis le switch du 7 juillet 2026 | — |

**Dette technique connue** : le moteur (`v2/engine/*.js`) est dupliqué manuellement
en `.classic.js` (export retirés) pour être utilisable par `index.html`. Toute
modification du moteur doit être répercutée à la main dans les deux — déjà source
d'oublis. Piste propre identifiée (convertir `index.html` en `type="module"`) jugée
trop risquée pour une intervention à chaud (fichier ~5000 lignes) ; reportée à une
session dédiée avec tests approfondis.

**Harmonisation visuelle app/wizard** (13 juillet 2026) : les variables CSS du
wizard (`--ink`, `--ink-soft`, `--paper`, `--line` dans `v2/index.html`)
correspondaient déjà exactement à la palette codée en dur dans `index.html`
(`#0f1117`/`#1a1d27`/`#f1f5f9`/`#2e3347`) — aucun changement de couleur nécessaire.
Le bandeau du wizard (logo + "Run by Léa", ajouté le 8 juillet, commit 83cb4f0)
a été complété avec :
- un sous-titre "CONCEPTION DE PLAN" (orange `--signal`, sous le titre principal),
  pour distinguer clairement le wizard du dashboard ;
- un bouton aide `?` en haut à droite du bandeau, visuellement identique au
  `helpBtn` de `index.html` (même style, mêmes dimensions 26px) ;
- une modale d'aide propre au wizard (pas un lien vers `renderHelp()` de l'app,
  inaccessible depuis `v2/index.html` — pages séparées, pas de routage entre
  les deux) : 4 questions ciblées sur le fonctionnement du wizard lui-même
  (objet de l'assistant, navigation arrière, persistance des réponses en cours
  de route, où trouver l'aide complète une fois le plan généré).

## 4. Écrans de l'app principale (`index.html`)

Fonctions de rendu principales (`render*`) :

- `renderSelecteurPlan` — sélection entre plusieurs plans actifs
- `renderDashboard` — écran d'accueil, résumé de la semaine
- `renderWeeks` / `renderWeekDetail` — vue calendrier et détail d'une semaine.
  `renderWeeks` (liste repliée par semaine) affiche depuis le 13 juillet 2026 un
  badge "Décharge" (pill orange, style cohérent avec `.pill` déjà défini en CSS
  global) à côté du libellé de phase, quand `estSemaineDecharge(weekNum)` est
  vraie. Le numéro de semaine ("S{n}") de chaque onglet replié était déjà coloré
  selon la couleur de phase (`phaseOf(week.week).color`) — confirmé, pas modifié.
- `renderStatusRow`, `showSessionMenu`, `showMoveMenu`, `showRestoreMenu` — gestion
  des séances (statut fait/raté, déplacement, restauration)
- `renderStats` — statistiques
- `renderCourse` — page dédiée jour de course (horaires, parcours, résultat)
- `renderHelp` — aide
- `renderSettings` — réglages : profil coureur, records personnels, tokens (GitHub,
  Strava), notifications
- `render` — orchestrateur principal

## 5. Persistance (localStorage, préfixe `lk_`)

**Clés globales (profil / config, non liées à un plan précis) :**
- `lk_profil_coureur` — structure unifiée du profil (voir §6)
- `lk_weight`, `lk_height`, `lk_fc_max`, `lk_pps` — anciennes clés, migrées en douceur
  vers `lk_profil_coureur` au premier chargement (aucune perte de données)
- `lk_github_token`, `lk_gist_id` — sync GitHub Gist
- `lk_strava_token`, `lk_strava_refresh`, `lk_strava_expires`, `lk_strava_activities`
- `lk_last_sync`

**Clés préfixées par plan (via `clePourPlan()`)** — tout ce qui est spécifique à un
plan donné : `lk_statuses`, `lk_hidden_sessions`, `lk_swapped_sessions`,
`lk_session_notes`, `lk_notes`, `lk_checklist`, `lk_adaptations_ignorees`,
`lk_last_rebuild`, `lk_pred_history`, `lk_race_goal`, `lk_race_horaires`,
`lk_race_parcours`, `lk_race_result`, `lk_weather_cache`, `lk_coach_msg`,
`lk_coach_date`, `lk_coach_race_msg`.

Principe architectural (retenu après le bug de contamination v1) : **toute donnée
propre à un plan doit être préfixée**. Une clé globale non préfixée est un risque de
contamination inter-plans.

## 6. Profil coureur (`lk_profil_coureur`) — v2.3, clos le 12/07/2026

```
{
  prenom, nom, anneeNaissance, poids, taille, fcMax, pps,
  records: {
    "5K":     { temps, date? },
    "10K":    { temps, date? },
    "Semi":   { temps, date? },
    "Marathon": { temps, date? }
  }
}
```

- Migration douce depuis les anciennes clés séparées, sans perte de données.
- App (`Settings`) : carte "Records personnels".
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit année de naissance, FC max,
  temps de référence — au chargement et à chaque changement de distance visée.
  Sélection du record le plus pertinent via table `ORDRE_PROXIMITE_DISTANCE`, sinon
  repli sur estimation Riegel avec message explicite.
- `verifierCoherenceRecord()` : écarte un record si son écart à l'estimation Riegel
  moyenne (depuis les autres records) dépasse 10%. Départage de symétrie par date
  (le plus récent gagne ; celui qui a une date gagne sur celui qui n'en a pas ; pas
  de tranchage si aucune date connue).

## 7. Moteur de plan (`v2/engine/plan-generator.js`)

Fonctions clés, dans l'ordre du pipeline de génération :
1. `computePhases` — découpage du plan en phases (base, construction, affûtage...)
2. `computeVolumeProgression` — progression du volume hebdo selon niveau/contraintes
3. `placerSemaine` — répartition des séances dans la semaine
4. `genererContenuQualite` — génère le contenu détaillé d'une séance qualité,
   avec 12 sous-types (i-30-30, seuil, i-3min, vitesse, cotes, allure-course, etc.),
   chacun paramétré par niveau (débutant/intermédiaire/confirmé) — voir
   `bibliotheque-seances.md` pour le détail méthodologique complet
5. `genererContenuLongue`, `genererContenuTest`, `genererContenuRace`
6. `repartirVolumeSemaine`
7. `generatePlan` — orchestrateur principal

Adaptation dynamique du plan en cours de route :
- `calculerScoreSemaine` — score d'une semaine réalisée vs statuses
- `analyserAdaptations` — détecte si une adaptation du plan est nécessaire
- `appliquerAdaptations` — applique l'adaptation après confirmation utilisateur
- `regenererStructuresIntervalles`

**ACWR (Acute:Chronic Workload Ratio)** — section 33bis, chantier lancé le
13 juillet 2026, validé historiquement sur les données réelles de Laurent avant
codage (approche décidée le 11 juillet). `calculerACWR(activitesStrava)` : à
partir des activités Strava réelles (type `Run` uniquement, jamais le plan
théorique), calcule pour chaque jour la charge aiguë (somme des 7 derniers
jours) et la charge chronique (moyenne des 4 fenêtres de 7 jours sur 28 jours),
retourne l'historique quotidien complet + le dernier ratio connu. v1
volontairement simple : volume brut (km), sans pondération FC ni allure —
TRIMP ou pondération `SESSION_TARGETS` identifiés comme piste v2 si
nécessaire. Seuils : `ACWR_SEUIL_RISQUE` (1.5), `ACWR_SEUIL_VIGILANCE` (1.3),
`ACWR_SEUIL_SOUS_CHARGE` (0.8). Fonction pure, dupliquée dans
`engine-classic-scripts/plan-generator.classic.js` (sans export) pour
`index.html`. Affichée dans l'onglet Stats (`renderStats`, deux graphiques
empilés : charge aiguë vs chronique, puis ratio avec zones colorées + texte
d'explication) — **pas encore intégrée** comme second facteur dans
`analyserAdaptations()` (intégration dashboard reportée à une session
séparée, décision du 13 juillet).

Autres briques : gestion des références de temps (`riegelPredict`, `computeAllures`),
zones FC (`computeFcMaxTanaka`, `computeZonesFC`), jalons de transition entre phases,
notes pratiques et repères de ressenti injectés dans les séances, cohérence de la
semaine test.

**Semaines de décharge** — chaque semaine du plan brut porte un champ booléen
`estDechargeSemaine` (`window.__PLAN_BRUT__.semaines[i].estDechargeSemaine`,
indexé par `semaineNum`). Déjà affiché côté wizard (`.decharge-tag`, orange
`--signal`). Ce champ n'existe PAS dans `PLAN`/`ALL_SESSIONS` (format traduit
v1 consommé par `index.html` — ne connaît que `volumeCibleKm`/allures/statuts
par séance) : toute lecture côté app doit repasser par `__PLAN_BRUT__.semaines`,
même pattern déjà utilisé pour `raceName`/`zoneFC`/etc. (cf. §2, commentaire du
chargement du plan). Helper ajouté le 13 juillet 2026 : `estSemaineDecharge(weekNum)`
(juste après `phaseOf`), repli silencieux à `false` si `__PLAN_BRUT__` ou le
champ est absent (plans générés avant l'introduction du champ).

## 8. Intégrations externes

**Strava** (Client ID `260339`)
- OAuth géré par `api/strava.js` (auth/callback/refresh/activities)
- Côté client : `v2/engine/strava.js` (tokens, calcul volume hebdo médian)
- Comparaison séance programmée vs laps réels : `activity.laps.slice(1, -2)`
  (exclut warmup + 2 derniers laps) filtré par allure cible ±15%
  (`extractTargetSpeed`). L'API Strava n'expose que les laps résultants, jamais la
  structure de programmation de la montre — approche par streams explorée et
  abandonnée (voir mémoires, chantier "v2.0 streams", clos).
- `syncStrava()` (`index.html`) : demande toujours au moins 8 semaines
  d'historique en arrière (`plan_start` = le plus ancien entre le vrai début
  du plan et 8 semaines avant aujourd'hui), pas seulement depuis la date de
  début du plan actuel — corrigé le 13 juillet 2026, nécessaire pour que
  l'ACWR ait toujours assez de recul même sur un plan qui vient de démarrer.
  `activitesDuPlan()` continue de filtrer correctement sur `dateDebutPlan`
  indépendamment de ce qui est chargé en amont (aucun effet de bord sur le
  "Km courus" du bloc Infos de Stats).

**Météo** — proxy Open-Meteo (`api/weather.js`), gratuit, sans clé API. Alerte
chaleur si température max prévue > 28°C. Utilise la géolocalisation GPS réelle,
pas une ville saisie manuellement. Limite actée à revoir si passage en usage
commercial (v2.5).

**Coach (messages courts)** — `api/coach.js`, proxy vers Claude Haiku 4.5
(`claude-haiku-4-5-20251001`), 150 tokens max.

**Sync multi-device** — GitHub Gist via token personnel (`lk_github_token`),
géré par `v2/engine/gist-sync.js` (`chargerPlans`, `sauvegarderPlan`,
`supprimerPlan`, `renommerPlan`, détection de conflit de dates entre plans).

## 8bis. Authentification Supabase (v2.5, chantier lancé le 13 juillet 2026)

**Contexte** — prérequis identifié pour la publication Play Store (§9,
v2.5 commercialisation) : une app multi-utilisateur nécessite un vrai
backend d'auth et de stockage serveur, pas uniquement `localStorage`
côté device. Décision : Supabase (Postgres + Auth), plan gratuit pour
démarrer (500 Mo, 50k utilisateurs actifs mensuels inclus — largement
suffisant à l'échelle actuelle). Projet créé, URL et clé `anon`
(publique par conception) en dur dans `auth.js`/`auth.classic.js` — la
clé `service_role`, elle, ne doit jamais apparaître côté client.

**Schéma base de données** — 4 tables, RLS (Row Level Security) activé
partout dès le départ (équivalent serveur du principe de préfixage
`lk_` déjà en place) :
- `profils_coureur` (`user_id` clé primaire → `auth.users`, `data` JSONB)
  — remplace `lk_profil_coureur`
- `plans` (`id` UUID, `user_id`, `plan_brut` JSONB) — remplace
  `window.__PLAN_BRUT__` actuellement stocké via le Gist
- `plan_donnees` (`plan_id` clé primaire, `user_id` dupliqué pour
  simplifier les policies RLS, `data` JSONB) — regroupe toutes les
  clés préfixées par plan (`lk_statuses`, `lk_hidden_sessions`,
  `lk_notes`, `lk_race_goal`, etc., cf. §5) en un seul objet
- `integrations` (`user_id` clé primaire, tokens Strava/GitHub/Gist)
  — table séparée car données sensibles, isolées du reste
- Trigger générique `set_updated_at()` sur les 4 tables

**Incident résolu pendant les tests** (13 juillet 2026) — plusieurs
échecs de connexion en apparence liés à un mauvais mot de passe
provenaient en réalité de la **limite d'envoi d'emails du plan gratuit
Supabase**, épuisée par les tests répétés (confirmation d'inscription
et reset de mot de passe échouaient silencieusement ou avec l'erreur
`email rate limit exceeded`). Résolu en désactivant "Confirm email"
dans Authentication → Providers → Email — décision assumée pour un
usage familial/perso : un compte s'active immédiatement à
l'inscription, sans dépendre d'un email qui peut être retardé,
bloqué, ou en spam. Point de vigilance si l'app s'ouvre un jour à
des utilisateurs externes non familiers : reconsidérer l'activation
de la confirmation email à ce moment-là.

**Ce qui est fait** :
- Schéma SQL exécuté avec succès sur le projet Supabase
- Authentification par email + mot de passe (pas de magic link,
  décision du 13 juillet — usage quotidien, friction du lien email à
  chaque connexion jugée trop coûteuse pour cet usage). Confirmation
  email désactivée (cf. incident ci-dessus)
- `v2/engine/auth.js` créé — source de vérité, module ES. Expose
  `supabase` (client), `monterEcranAuth(conteneurId)` (construit et
  affiche l'écran connexion/inscription, retourne une Promise résolue
  avec l'utilisateur dès qu'une session est active), `deconnecter()`,
  `utilisateurActuel()`
- `engine-classic-scripts/auth.classic.js` créé — copie dérivée,
  attache tout à `window.LkAuth` (même pattern que les autres modules
  classic). Nécessite le SDK Supabase chargé en amont via
  `<script src="...supabase-js@2/dist/umd/supabase.min.js">`
  (jsdelivr) plutôt qu'en import ES, cohérent avec le reste de
  `index.html`
- `index.html` modifié : conteneur `#ecran-auth-hote` juste après
  `#app`, charge le SDK puis `auth.classic.js`, appelle
  `LkAuth.monterEcranAuth()` dont la promesse (`window.__AUTH_PRET__`)
  est attendue en tout début de la deuxième IIFE (avant même la
  déclaration de `STRAVA_CLIENT_ID`), donc avant toutes les lectures
  `load()` qui suivent plus bas dans le même script
- **Testé en conditions réelles** sur preview Vercel (branche
  `test-auth-supabase`) : inscription, connexion, déconnexion, session
  persistante au rechargement — fonctionnel de bout en bout
- **Migration localStorage → Supabase, premier jet implémenté**
  (13 juillet 2026) — stratégie retenue : plutôt que de rendre
  asynchrones les ~22 lectures synchrones `let x = load(clePourPlan(...))`
  qui initialisent l'état au chargement de `index.html` (risque élevé
  de casser le séquencement sur un fichier de 5000+ lignes), on
  précharge toutes les données Supabase dans `localStorage` AVANT que
  ces lignes s'exécutent. `load()`/`save()` restent inchangées dans
  leur usage par le reste du fichier ; `save()` déclenche en plus une
  synchronisation vers Supabase en arrière-plan (fire-and-forget, ne
  bloque pas l'affichage)
  - `v2/engine/sync-storage.js` (source) et sa copie
    `engine-classic-scripts/sync-storage.classic.js` (`window.LkSync`)
    créés : `precharger(userId, planId)` et
    `synchroniserVersSupabase(userId, planId, cle, valeur)`
  - Deux passes de préchargement dans `index.html` : une première
    juste après connexion (sans `planId`, pas encore connu — couvre
    `lk_profil_coureur` et les clés `integrations`), une seconde une
    fois `window.__PLAN_BRUT__.id` disponible (couvre les clés
    préfixées par plan, regroupées dans `plan_donnees.data`)
  - Routage par table dans `synchroniserVersSupabase` : `lk_profil_coureur`
    → table `profils_coureur` ; tokens Strava/GitHub/Gist → table
    `integrations` ; `lk_weather_cache` volontairement non synchronisé
    (donnée re-générable) ; toutes les autres clés préfixées par plan
    → table `plan_donnees`, regroupées dans une seule colonne JSONB
  - **Limite connue assumée** : l'écriture vers `plan_donnees` fait un
    `select` puis un `upsert` à chaque sauvegarde (pour ne pas écraser
    les autres clés du même objet JSON) — deux appels réseau au lieu
    d'un. Acceptable en l'état, à revoir si ça devient un problème de
    performance perceptible
  - **Pas encore testé en conditions réelles** — la logique est en
    place et syntaxiquement validée, mais n'a pas encore été vérifiée
    avec de vraies données allant et venant entre localStorage et
    Supabase sur la preview Vercel

**Pas encore fait** (suite du chantier) :
- Tester la migration en conditions réelles : créer/modifier des
  données (statuts de séance, notes, profil coureur) et confirmer
  qu'elles apparaissent bien dans les tables Supabase, PUIS qu'elles
  se rechargent correctement sur un autre appareil/navigateur
- `v2/index.html` (wizard) ne demande pas encore d'authentification —
  à faire avant publication, sinon un plan peut être créé sans
  utilisateur associé
- En cas de perte réseau pendant une sauvegarde Supabase, la donnée
  reste correcte en `localStorage` sur l'appareil courant mais ne
  remonte pas au serveur tant que la prochaine sauvegarde réussie ne
  se produit pas — pas de file d'attente de synchronisation pour
  l'instant, à envisager si ça devient un problème réel en usage
- Confirmation email Supabase désactivée pour l'instant (cf. incident
  ci-dessus) — à reconsidérer si l'app s'ouvre à des utilisateurs
  externes
- Variables d'environnement Vercel pour les clés Supabase (actuellement
  en dur dans le code — acceptable pour la clé `anon` mais à revoir
  pour la maintenabilité si le projet est régénéré)
- Fusion de la branche `test-auth-supabase` vers `main`, une fois la
  migration validée en conditions réelles

## 9. État des chantiers (au 13/07/2026)

| Chantier | Statut |
|---|---|
| v1→v2 switch | ✅ Clos (7 juillet) |
| v2.1 adaptation dynamique + harmonisation visuelle | ✅ Clos (8 juillet) |
| v2.0 streams (détection effort réel) | ✅ Clos — approche streams abandonnée, laps+filtre allure retenu |
| v2.2 méthodologie (12 sous-types par niveau) | ✅ Clos (11 juillet) |
| v2.2 nettoyage technique (suppression backup v1) | ✅ Clos (11 juillet, commit 7c9f0cb) |
| v2.3 profil coureur unifié + cohérence records | ✅ Clos (12 juillet, commits 81dd647, d37eaf3, 0e4969d) |
| Connecteur MCP GitHub custom (remplacer PAT) | ❌ Abandonné (12 juillet) — OAuth App trop lourd pour l'usage |
| Dé-duplication moteur/classic (`type="module"`) | ⏸️ Reporté — trop risqué à chaud |
| ACWR (Acute:Chronic Workload Ratio) | 🟡 En cours (13 juillet) — moteur + graphique Stats codés, intégration dashboard (analyserAdaptations) reportée |
| Harmonisation visuelle app/wizard (titre + aide dans le header) | ✅ Clos (13 juillet) |
| Badge "Décharge" dans l'onglet Semaines (`renderWeeks`) | ✅ Clos (13 juillet) |
| Rework présentation wizard | 🔜 À revalider avec Laurent |
| v2.5 authentification Supabase | 🟡 En cours (13 juillet) — écran connexion testé en conditions réelles sur preview Vercel ; migration localStorage↔Supabase implémentée (sync-storage.js), pas encore testée en conditions réelles ; wizard pas encore protégé par auth (détail §8bis) |
| v2.5 commercialisation (Stripe) | 🔜 Non commencé |

## 10. Principes transverses à retenir

- **Inventaire à jour à chaque push** — toute modification poussée sur le repo qui
  change la structure des fichiers, les écrans, les clés de stockage, les
  intégrations externes, le pipeline du moteur ou l'état d'un chantier doit
  s'accompagner d'une mise à jour de ce fichier (`inventaire-application.md`)
  dans le même push. Objectif : ce document reste la référence fiable à relire
  en début de session, sans dérive par rapport au code réel. Un push qui laisse
  l'inventaire obsolète est considéré incomplet, au même titre qu'un push qui
  casserait la syntaxe JS.
  Mécanique retenue avec Claude (13 juillet 2026) : dès qu'un fichier destiné à
  être poussé sur GitHub est fourni en sortie de conversation, l'inventaire mis
  à jour est fourni avec, sans que l'utilisateur ait à le redemander — pas
  besoin de signaler explicitement qu'un push a eu lieu.
- **Prefixage des données de plan** obligatoire (`clePourPlan()`) — clé globale non
  préfixée = risque de contamination inter-plans.
- **Un seul variable modifiée à la fois** pour la progressive overload (raison de la
  refonte i-30-30).
- **Niveau intermédiaire = valeur historique inchangée** à chaque ajout de
  différenciation par niveau (zéro régression).
- **Validation historique avant codage** pour toute nouvelle métrique d'adaptation
  (ex. ACWR) — vérifier que ça "sonne juste" sur les données réelles de Laurent
  avant d'investir dans la complexité.
- **ES modules obligatoires** pour les fonctions Vercel/Netlify ; jamais
  d'apostrophe dans une chaîne JS entre guillemets doubles (échec silencieux du
  parseur) ; vérification syntaxique systématique après modification.
- **404 sur une route API** → vérifier `vercel.json` en premier (pas un fichier
  manquant).
