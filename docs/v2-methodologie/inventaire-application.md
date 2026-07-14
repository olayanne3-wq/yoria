# Inventaire de l'application "Run by Léa"

> Vue d'ensemble de référence — à relire en début de session pour retrouver le contexte
> sans re-parcourir tout le repo. Mis à jour au 13 juillet 2026 (chantier ACWR en cours ;
> harmonisation visuelle app/wizard ; badge décharge onglet Semaines ; **v2.5 publiée** —
> authentification Supabase, migration rétroactive, sync temps réel, wizard protégé,
> nettoyage Réglages, variables d'env Vercel, file d'attente de sync ; **publication
> Play Store en cours**, voir §11 ; **Mode Forme (v2.6) câblé de bout en bout** — wizard,
> dashboard, coach adapté, clôture permanente avec garde-fou anti-chevauchement, fiabilité
> du coach (prénom, moments de journée, météo dynamique), voir §12 ; **bug TWA duplication
> de tâches résolu**, voir §13).
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
│   ├── weather.js                # Proxy Open-Meteo (prévision + alerte chaleur >28°C)
│   └── config.js                  # Expose SUPABASE_URL/SUPABASE_ANON_KEY (variables
│                                    # d'environnement Vercel) au client — ajouté le
│                                    # 13 juillet 2026. Route déclarée explicitement dans
│                                    # vercel.json (routing en liste blanche, absence
│                                    # initiale de cette route causait un 404).
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
│   ├── icon.svg                   # Source vectorielle de l'icône (silhouette coureur
│   │                               # orange sur fond arrondi) — utilisée aussi pour
│   │                               # générer les visuels Play Store
│   ├── privacy.html               # Politique de confidentialité — ajoutée le
│   │                               # 13 juillet 2026 pour la publication Play Store.
│   │                               # Accessible à /privacy.html
│   ├── .well-known/
│   │   └── assetlinks.json        # Digital Asset Links — lie le domaine à l'app
│   │                               # Android TWA (Trusted Web Activity). Contient le
│   │                               # SHA256 du certificat de signature. À mettre à jour
│   │                               # à chaque changement de keystore, et une dernière
│   │                               # fois avec le fingerprint Play App Signing après
│   │                               # publication (cf. §11)
│   ├── engine-classic-scripts/    # Copies non-module (.classic.js) du moteur v2,
│   │                               # utilisées par index.html (script classique).
│   │                               # À régénérer manuellement à chaque modif du moteur.
│   │                               # Inclut auth.classic.js (dérivé de v2/engine/auth.js,
│   │                               # 13 juillet 2026) et sync-storage.classic.js (dérivé de
│   │                               # v2/engine/sync-storage.js, 13 juillet 2026), attachés à
│   │                               # window.LkAuth et window.LkSync respectivement, plutôt
│   │                               # qu'aux globals habituels PLAN/ALL_SESSIONS.
│   │                               # plan-forme.classic.js (13 juillet 2026) dépend des
│   │                               # globales de plan-generator.classic.js (formatPace,
│   │                               # paceFromTime, riegelPredict, PACE_RATIOS, placerSemaine,
│   │                               # genererContenuEF/Longue, repartirVolumeSemaine,
│   │                               # computeFcMaxTanaka, computeZonesFC) — chargé après lui
│   │                               # dans index.html, câblé (§12.3).
│   │                               # changelog.classic.js (13 juillet 2026) : contenu pur
│   │                               # (tableau VERSIONS, historique des versions affiché dans
│   │                               # Paramètres), extrait d'index.html pour l'alléger (~250
│   │                               # lignes de texte sans rapport avec la logique de rendu
│   │                               # environnante). Pas de dépendance au moteur — pose juste
│   │                               # VERSIONS en portée globale, lu par renderSettings().
│   │                               # N'A PAS de source de vérité en module ES séparé (pas de
│   │                               # v2/engine/changelog.js) : c'est un contenu propre à
│   │                               # index.html (v1), pas partagé avec le wizard v2 — donc pas
│   │                               # de duplication à maintenir, ce fichier classic EST la
│   │                               # source de vérité.
│   └── v2/
│       ├── index.html             # Wizard de création de plan (~120K)
│       ├── manifest.json, sw.js   # PWA v2
│       └── engine/                # Moteur v2 (modules ES, source de vérité)
│           ├── plan-generator.js  # Cœur : génération de plan, séances, adaptations (~100K)
│           ├── plan-forme.js      # Mode Forme (v2.6, 13 juillet 2026) : cycle glissant sans
│           │                       # date de course, réutilise les briques génériques de
│           │                       # plan-generator.js (placerSemaine, genererContenuEF/Longue,
│           │                       # repartirVolumeSemaine, computeFcMaxTanaka, computeZonesFC)
│           │                       # — n'importe jamais computePhases/ROTATION_SOUS_TYPE/
│           │                       # placerSeanceTest/placerSeanceCourse. Codé et testé
│           │                       # (14 tests), câblage wizard/index.html pas encore fait —
│           │                       # voir §12.
│           ├── gist-sync.js       # Sync multi-device via GitHub Gist. Contient aussi le
│           │                       # garde-fou anti-chevauchement entre plans (course ET
│           │                       # forme, généralisé le 13 juillet 2026, cf. inventaire
│           │                       # §12.4) — trouverPlanEnConflit(), dateFinPeriodeActive(),
│           │                       # et le blocage permanent d'un plan Forme clôturé dans
│           │                       # sauvegarderPlan().
│           ├── pdf-export.js      # Export PDF du plan (jsPDF)
│           ├── strava.js          # Intégration Strava côté client (tokens, volume) — réutilisé
│           │                       # tel quel par le mode Forme (déjà générique, aucune
│           │                       # dépendance à distance/objectif de course)
│           ├── weather.js         # Intégration météo côté client
│           ├── auth.js            # Auth Supabase (écran connexion/inscription, session) — v2.5, 13 juillet 2026
│           ├── sync-storage.js    # Synchronisation localStorage ↔ Supabase, incl. migration rétroactive one-shot — v2.5, 13 juillet 2026
│           ├── v1-bridge.js       # Traduction plan v2 → format v1 (pour affichage classic)
│           └── test-*.mjs         # Suite de tests (14 fichiers, un par module/fonctionnalité,
│                                    # incl. test-plan-forme.mjs depuis le 13 juillet 2026)
├── vercel.json                    # Routage : /api/*, /v2, fallback statique
└── package.json                   # { "type": "module" }
```

**Projet Android local (hors repo)** — `C:\Users\olaya\runbylea-android-v3\` sur la
machine de Laurent. Généré via Bubblewrap (TWA), contient `android.keystore` (clé de
signature, **jamais dans le repo**, à sauvegarder séparément), `app-release-signed.apk`,
et le projet Gradle complet. Voir §11 pour le détail du setup et des mots de passe à
conserver précieusement en dehors de ce document.

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

**Bug de production découvert et corrigé** (13 juillet 2026, après premier
déploiement sur `main`) — un compte ayant déjà une synchronisation Gist
active (`lk_github_token` configuré avant la migration) se retrouvait
après connexion sur le **plan de repli par défaut**, avec le sélecteur
de plan disparu et l'historique incorrect. Cause : `window.__PLAN_PRET__`
(qui appelle `chargerPlans()`, dépendante de `lk_github_token` en
`localStorage`) démarrait en parallèle de `window.__AUTH_PRET__` (qui
restaure ce même token depuis Supabase via `LkSync.precharger`), sans
dépendance entre les deux — une course que `chargerPlans()` pouvait
gagner, trouvant `localStorage` encore vide et échouant silencieusement
sur le repli. Corrigé en ajoutant `await window.__AUTH_PRET__;` en tout
début de la définition de `window.__PLAN_PRET__`, garantissant que le
token est restauré avant toute tentative de chargement Gist. Coût
accepté : le premier rendu attend désormais la résolution de l'auth
Supabase avant de tenter le Gist (légèrement plus lent qu'avant, mais
correct plutôt que rapide-et-faux). Pousser une correction en production
sans repasser par une branche de test était un raccourci pris sciemment
ce jour-là (auth.js/auth.classic.js avaient déjà atterri sur `main` par
inadvertance plus tôt dans la session) — à éviter en temps normal, y
revenir en pratique standard dès que ce chantier n'est plus en phase
de découverte active.

**Vraie cause racine identifiée après la première correction** — la
correction de l'ordre de course (ci-dessus) était nécessaire mais pas
suffisante. Le vrai problème : ce compte avait `lk_github_token` en
`localStorage` **depuis avant** la mise en place de la synchronisation
Supabase (13 juillet 2026) ; comme aucune migration rétroactive
n'existait, `precharger()` n'avait rigoureusement rien à restaurer côté
Supabase (`integrations.github_token` = `null` pour ce compte, confirmé
en Table Editor), donc le token restait `null` en `localStorage` même
une fois l'ordre de course corrigé, et `chargerPlans()` échouait faute
d'authentification GitHub.

**Correctif : `migrerDonneesExistantes(userId, planId)`** ajoutée dans
`sync-storage.js`/`sync-storage.classic.js` — migration one-shot par
appareil (marqueurs `lk_migration_supabase_globale_faite` et
`lk_migration_supabase_plan_faite_<planId>` en `localStorage`,
distincts l'un de l'autre car le `planId` n'est pas encore connu au
tout premier appel) qui pousse vers Supabase les données déjà
présentes en `localStorage` **avant** que `precharger()` ne les
écrase. Appelée juste avant chaque appel à `precharger()` dans
`index.html`, aux deux points de préchargement (sans `planId` juste
après connexion, puis avec le vrai `planId` une fois le plan chargé).
En cas d'échec réseau, les marqueurs ne sont pas posés, pour retenter
au prochain appel plutôt que d'abandonner silencieusement.

**Deux incidents supplémentaires découverts et corrigés lors du test
de production du 13 juillet 2026** (après les deux premiers,
ci-dessus) :

1. **Bouton de déconnexion manquant** — `LkAuth.deconnecter()`
   existait dans `auth.js`/`auth.classic.js` depuis le début du
   chantier, mais aucun bouton dans l'interface n'y donnait accès.
   Corrigé : section "👤 Compte" ajoutée en tête de `renderSettings()`
   dans `index.html`, avec confirmation avant déconnexion et
   rechargement de page ensuite.

2. **Perte de données du profil coureur (poids, taille, records
   personnels)** — au cours des multiples tests de connexion/
   déconnexion effectués avant que `migrerDonneesExistantes()` existe,
   le préchargement Supabase (qui, à l'époque, ne trouvait rien côté
   serveur) a écrasé un `localStorage` qui contenait encore les
   bonnes valeurs. Une fois la migration ajoutée, c'est cette version
   déjà appauvrie qui a été migrée vers Supabase — confirmée identique
   des deux côtés (`poids`, `taille`, `records` tous `null`, alors que
   `nom`/`prenom`/`fcMax` étaient corrects). **Aucune copie de secours
   trouvée** (pas d'autre appareil avec les données intactes) ;
   Laurent a dû ressaisir ces champs manuellement dans Réglages.
   Aucune action corrective côté code — c'est un risque inhérent à
   avoir testé en conditions réelles sur un compte réel pendant que
   la logique de migration était encore incomplète, pas un bug
   récurrent une fois `migrerDonneesExistantes()` en place.

3. **Wizard `v2/index.html` accidentellement écrasé** — à un moment de
   la session, `public/index.html` (l'app, avec écran d'auth) a été
   poussé par erreur vers `public/v2/index.html` au lieu de
   `public/index.html`, remplaçant intégralement le vrai wizard de
   création de plan. Symptôme : cliquer sur "🏁 Configurer un plan"
   affichait un flash de l'écran de connexion puis revenait à l'app,
   sans jamais atteindre le wizard. Restauré en récupérant la version
   précédente via l'historique des commits GitHub (onglet History du
   fichier) et en la repoussant au bon endroit. Point de vigilance
   retenu : `public/index.html` et `public/v2/index.html` sont deux
   fichiers distincts au nom identique (`index.html`) dans des dossiers
   différents — vérifier le chemin affiché sur GitHub avant chaque
   commit, en particulier lors d'un glisser-déposer.

**État de fin de session (13 juillet 2026)** : authentification,
déconnexion, sélecteur de plan et wizard tous fonctionnels en
production. La migration rétroactive et le préchargement ont été
validés pour les tokens d'intégration (GitHub/Gist) sur un compte
réel. **Reste à vérifier** : l'écriture réelle vers `plan_donnees`
avec un vrai plan actif (UUID, pas le plan de repli) — non testée
explicitement cette session, cf. plus bas.

**Deux derniers bugs découverts et corrigés lors du test final de
synchronisation `plan_donnees`** (13 juillet 2026, sur un vrai plan
existant, id `250aae43-...`) :

4. **Contrainte de clé étrangère violée (`plan_donnees_plan_id_fkey`)**
   — `plan_donnees.plan_id` référence `plans.id`, mais aucun code
   n'insérait jamais de ligne dans la table `plans` elle-même. Toute
   tentative d'écriture vers `plan_donnees` échouait donc en 409, quel
   que soit le plan. Corrigé : nouvelle fonction
   `assurerPlanExiste(userId, planId, planBrut)` dans
   `sync-storage.js`/`sync-storage.classic.js`, qui vérifie l'existence
   de la ligne et l'insère si besoin (id, user_id, nom déduit du
   plan_brut, plan_brut complet). Appelée dans `index.html`
   **avant** `migrerDonneesExistantes`/`precharger` avec `planId`, dès
   que `window.__PLAN_BRUT__.id` est connu.

5. **Erreur de conversion de date** (`date/time field value out of
   range`) sur `strava_expires`/`last_sync` — `synchroniserVersSupabase`
   envoyait le timestamp Unix brut (parfois en secondes, parfois en
   millisecondes selon l'origine dans `index.html`) directement vers
   une colonne `timestamptz`, sans conversion. Corrigé : détection du
   format (secondes si `< 1e12`) et conversion en ISO avant l'envoi.

**Confirmation finale de bout en bout** (13 juillet 2026, après ces 5
corrections cumulées) : une séance cochée sur un vrai plan
(`250aae43-2f9b-4f1c-a031-bb57a1b6ae90`) a été vérifiée présente dans
`plan_donnees.data.lk_statuses` sur Supabase, avec les bonnes valeurs
(`"1-1": "✅"`, etc.). **La chaîne complète — auth, migration
rétroactive, création automatique de la ligne `plans`, et
synchronisation des statuts de séances — est confirmée fonctionnelle
en conditions réelles**, pas seulement en théorie ou en test isolé.

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
  - **Testé en production le 13 juillet** avec un compte réel ayant
    déjà une sync Gist active — a révélé le bug de course puis le
    besoin de migration rétroactive documentés ci-dessus. Après les
    deux correctifs, en attente de re-confirmation sur ce même compte
    avant de considérer la migration validée de bout en bout

**Suite de la session — tout ce qui a été fait après les 5 bugs
ci-dessus** (13 juillet 2026, jusqu'à publication de la v2.5) :

- **Wizard protégé par authentification** — `v2/index.html` monte le
  même écran de connexion que l'app (bloc `#ecran-auth-hote` +
  `auth.classic.js`) avant d'afficher son contenu. Un plan ne peut
  plus être créé sans utilisateur associé.
- **Sync du plan dès sa création dans le wizard** —
  `sauvegarderPlanUI()` appelle `LkSync.assurerPlanExiste()` juste
  après la sauvegarde Gist (best-effort, non bloquant si Supabase
  échoue). Chargement de `sync-storage.classic.js` ajouté au wizard.
- **Sync de la suppression** — `supprimerPlanUI()` supprime aussi la
  ligne `plans` correspondante sur Supabase ; `plan_donnees` suit par
  `ON DELETE CASCADE` (déjà dans le schéma SQL, un seul appel suffit).
- **Nettoyage de Réglages** — retirés : section "☁️ Sauvegarde
  cloud" (token GitHub manuel), QR code de transfert d'appareil,
  toggle "Options avancées" (devenu vide), fonctions
  `nettoyerNotesMeteoDupliquees()` et `regenererStructuresIntervallesUI()`
  (plus d'appelant). Tout redondant avec la sync Supabase automatique
  au login.
- **Variables d'environnement Vercel** — clés Supabase déplacées du
  code vers `SUPABASE_URL`/`SUPABASE_ANON_KEY` sur Vercel, exposées au
  client via une nouvelle route `api/config.js`. `auth.js`/
  `auth.classic.js` font un `fetch('/api/config')` avant de créer le
  client (`export let supabase` + `export const supabaseReady`,
  plutôt qu'un `export const supabase` figé — tout appelant doit
  attendre `supabaseReady`). Route ajoutée à `vercel.json` (absente
  initialement du routing explicite, causait un 404).
- **File d'attente de synchronisation** — tout échec d'écriture
  (`profils_coureur`, `integrations`, `plan_donnees`) est mis en file
  dans `localStorage` (`lk_file_attente_sync`) plutôt qu'abandonné.
  Rejouée au retour réseau (`online`) et toutes les 5 min en secours.
  Abandon après 10 essais infructueux.
- **Supabase Realtime** — décision : ne pas supprimer `localStorage`
  (chantier jugé disproportionné vu le risque sur ce fichier), mais
  combler son vrai defaut (pas de rafraîchissement entre appareils)
  via Realtime. `activerRealtime(planId, onChangement)` s'abonne aux
  changements sur `plan_donnees` filtrés par `plan_id` ; anti-écho par
  fenêtre de 3s (`marquerEchoLocal`) pour ignorer les événements
  provoqués par ses propres écritures. Publication `supabase_realtime`
  activée manuellement sur `plan_donnees` côté Supabase (Database →
  Publications) — nécessaire, pas actif par défaut sur une nouvelle
  table. `profils_coureur`/`integrations`/`plans` volontairement pas
  couverts (changements trop rares pour justifier le code
  supplémentaire ; à ajouter si besoin réel constaté).
- **Version affichée passée à v2.5, bandeau rendu dynamique** — entrée
  ajoutée en tête de `VERSIONS` dans `index.html`. Le bandeau header
  (`el("div",...)` juste avant `"· plan-10k-alpha.vercel.app"`)
  affichait un numéro figé en dur, retrouvé bloqué sur `v1.8.15` alors
  que l'app était déjà en v2.3 — oublié à chaque mise à jour depuis
  plusieurs versions. Corrigé en sortant `const VERSIONS` de
  `buildVersionSection()` pour la rendre accessible dans tout
  `renderSettings()` (même scope de fonction), et en faisant lire au
  bandeau `VERSIONS[0].ver` plutôt qu'une chaîne écrite à la main. Le
  bandeau suit maintenant automatiquement la première entrée du
  tableau, plus de risque d'oubli futur.

**Restant** (aucun bloquant pour l'usage courant) :
- Confirmation email Supabase désactivée (cf. incident plus haut) —
  à reconsidérer si l'app s'ouvre un jour à des utilisateurs externes
  non familiers
- `localStorage` reste un doublon volontaire de Supabase (pas
  supprimé, cf. décision Realtime ci-dessus) — cache local + source de
  vérité distante, pas une vraie source unique

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
| v2.5 authentification Supabase | ✅ **Publiée** (13 juillet) — auth, migration rétroactive, wizard protégé, sync temps réel (Realtime), file d'attente, variables d'env Vercel, Réglages nettoyés |
| v2.5 commercialisation (Stripe) | 🔜 Non commencé |
| **Publication Play Store (TWA)** | 🟡 **En cours** (13 juillet) — voir §11 pour le détail complet |

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
- **Écriture GitHub via connecteur MCP indisponible** — le connecteur GitHub
  connecté (`Push Github ...`) peut lire le repo (`get_file_contents`,
  `search_code` une fois indexé) mais **échoue systématiquement en écriture**
  (`create_or_update_file`, 403 "Resource not accessible by integration"),
  malgré les permissions Contents Read+Write du token PAT. Pattern établi :
  Claude prépare le contenu final exact et le fournit à copier-coller, Laurent
  le colle et commit manuellement sur GitHub.com. Rediscuter si le connecteur
  évolue.

## 11. Publication Play Store (TWA / Bubblewrap) — chantier ouvert le 13/07/2026

**Choix d'architecture** : TWA (Trusted Web Activity) via Bubblewrap plutôt que
Capacitor — l'app étant déjà une PWA conforme (manifest, service worker, HTTPS),
le TWA est un wrapper quasi sans code natif. Mises à jour de contenu (99% des cas)
ne nécessitent aucune re-publication : le TWA charge directement le site en
production, donc un `git push` + déploiement Vercel suffit. Seuls les changements
touchant l'app native elle-même (icône, nom, permissions, thème) nécessitent de
regénérer et re-soumettre un `.aab`.

**Setup local (machine de Laurent, Windows/CMD)** — mis en place le 13 juillet,
douloureux mais one-shot, ne sera pas à refaire :
- JDK 17 (Eclipse Temurin) installé manuellement en `C:\Java\jdk-17.0.19+10`
  (zip, pas de `.msi` disponible) + variables système `JAVA_HOME` et ajout au `Path`
- Android SDK existant en `C:\Users\olaya\AppData\Local\Android\Sdk`, complété
  manuellement avec `cmdline-tools/latest` (téléchargé séparément, structure
  stricte requise) et le paquet legacy `tools` (requis spécifiquement par
  Bubblewrap 1.24.1, qui cherche `tools/bin/sdkmanager.bat` et non
  `cmdline-tools/latest/bin/sdkmanager.bat`) + variables système `ANDROID_HOME`
  et `ANDROID_SDK_ROOT`
- **Bug JAXB/Java 17** : le vieux `sdkmanager` embarqué dans `tools/` plante
  avec `NoClassDefFoundError: javax/xml/bind/...` (module retiré depuis Java 11).
  Corrigé en copiant manuellement 7 jars JAXB (`jaxb-api-2.3.1`,
  `jaxb-runtime-2.3.2`, `jakarta.xml.bind-api-2.3.2`,
  `jakarta.activation-api-1.2.1`, `txw2-2.3.2`, `istack-commons-runtime-3.0.8`,
  `stax-ex-1.8.1`, `FastInfoset-1.2.16` — récupérés depuis
  `cmdline-tools/latest/lib/external/...`, déjà présents localement) dans
  `Sdk/tools/lib/`, puis en éditant `tools/bin/sdkmanager.bat` pour les
  préfixer manuellement à la variable `CLASSPATH`.
- **Bug de signature Bubblewrap** : `bubblewrap build` échoue systématiquement
  à la dernière étape (signature de l'APK/AAB) avec `BadPaddingException` /
  "Wrong password?", en réutilisant en cache un ancien couple de mots de passe
  au lieu de ceux fraîchement saisis — reproductible sur plusieurs projets
  générés à zéro. Contournement systématique : signer manuellement avec
  `apksigner.jar` en ligne de commande une fois le build (non signé) généré :
  ```
  java -jar <SDK>/build-tools/34.0.0/lib/apksigner.jar sign --ks android.keystore
    --ks-key-alias android --out app-release-signed.apk app-release-unsigned-aligned.apk
  ```
  À refaire à l'identique pour le futur `.aab` de publication si le même bug
  se reproduit.
- Projet Android final : `C:\Users\olaya\runbylea-android-v3\` (v1 et v2
  abandonnés en cours de route à cause de la casquette de bugs ci-dessus,
  jamais nettoyés — sans conséquence, hors repo Git). Contient
  `android.keystore` (jamais committé, mots de passe connus de Laurent
  uniquement, **critique de ne jamais le perdre** : irremplaçable pour toute
  future mise à jour Play Store une fois publié) et `app-release-signed.apk`.

**Digital Asset Links (`assetlinks.json`)** — nécessaire pour que l'app
s'ouvre en plein écran (TWA) plutôt qu'en Chrome Custom Tab (barre d'adresse
visible). Déployé à `public/.well-known/assetlinks.json`, contient le SHA256
du certificat de signature (`keytool -list -v -keystore android.keystore
-alias android`, chercher la ligne SHA256). **Bug de diagnostic notable** :
l'outil web Google "Statement List Generator" a affiché une erreur "No app
deep linking permission found" alors que le fichier était en réalité
parfaitement valide (confirmé par l'API réelle
`digitalassetlinks.googleapis.com/v1/statements:list` en GET direct
navigateur, qui a répondu correctement) — ne pas se fier à cet outil web en
cas de doute, préférer l'appel API direct.

**Vraie cause de la barre d'adresse persistante** (résolue) : ce n'était ni
`assetlinks.json` ni un problème de cache MIUI — c'était simplement une
**ancienne version de l'app** (signée avec un ancien keystore/fingerprint,
projet v1 ou v2) qui restait installée sur le téléphone malgré plusieurs
tentatives de désinstallation/réinstallation manuelle depuis l'interface
MIUI. Diagnostiqué via ADB (`adb shell pm get-app-links <package>`, qui
affiche le fingerprint réellement enregistré par le système) puis résolu en
désinstallant/réinstallant **via ADB** (`adb uninstall` / `adb install`)
plutôt que depuis l'interface téléphone — nécessite d'activer "Installer via
USB" dans les Options développeur MIUI (désactivé par défaut, bloque
silencieusement `adb install` avec `INSTALL_FAILED_USER_RESTRICTED` sinon).
Après cette install propre, `pm get-app-links` a confirmé `verified` et
l'app s'est ouverte correctement en plein écran avec la bonne icône.
**Leçon retenue** : en cas de comportement incohérent sur MIUI après
plusieurs réinstallations manuelles, vérifier via ADB quelle version/
fingerprint est réellement installée avant de chercher ailleurs.

**Package Android** : `app.vercel.plan_10k_alpha.twa`
**Domaine associé** : `plan-10k-alpha.vercel.app`

**Assets store préparés** :
- Icône source : `public/icon.svg` (silhouette coureur orange, déjà en prod)
- Feature graphic (1024×500) : composé en SVG, version horizontale validée
  (icône à gauche, texte à droite, fond sombre avec courbes de route) —
  à exporter en PNG et uploader
- Textes de fiche store (titre, description courte/longue, catégorie,
  mots-clés) rédigés, ton "produit public" (vouvoiement implicite, sans
  "ton/ta") — fournis à Laurent, pas encore commités nulle part (pas
  pertinent pour le repo, vivent dans Play Console directement)
- `public/privacy.html` rédigée et fournie à déployer (couvre : email,
  profil coureur, localisation, données Strava ; stockage Supabase avec RLS ;
  partage limité à Strava/Open-Meteo/Anthropic à des fins strictement
  fonctionnelles, jamais publicitaire ; droit à la suppression)
- Guide de remplissage Data Safety Play Console fourni (catégories à cocher :
  informations personnelles, localisation approximative, santé et fitness ;
  aucun partage tiers à visée publicitaire ; chiffrement en transit ;
  suppression possible sur demande)

**Décision de diffusion** (13 juillet 2026) : l'app restera en **piste de test
interne** sur Play Console, pas en production. Visible uniquement par les emails
ajoutés explicitement comme testeurs (Laurent, et famille/proches si besoin) —
non trouvable par recherche publique, non installable par des inconnus. Cohérent
avec l'état actuel de l'app (mono-utilisateur, Supabase encore jeune). Le passage
en production reste possible à tout moment plus tard, c'est un choix explicite à
faire dans Play Console, jamais automatique.

**État au 13/07/2026 fin de session** :
- ✅ TWA généré, buildé, signé manuellement, **testé en conditions réelles**
  sur le Xiaomi 11 de Laurent : plein écran confirmé (`pm get-app-links` →
  `verified`), icône correcte, auth Supabase fonctionnelle, géolocalisation
  fonctionnelle
- ✅ Compte développeur Google Play créé, 25$ payés, **vérification
  d'identité en cours** (délai variable, quelques heures à quelques jours)
- ✅ Politique de confidentialité rédigée (à déployer sur `public/privacy.html`)
- ✅ Textes de fiche store rédigés
- ✅ Feature graphic composé et validé (version horizontale)
- 🔜 Captures d'écran (à prendre directement sur le téléphone, pas encore fait)
- 🔜 Classification du contenu (questionnaire Play Console, pas encore rempli)
- 🔜 Data Safety form (guide fourni, pas encore rempli dans Play Console)
- 🔜 Création de l'app dans Play Console + upload du `.aab` (bloqué en
  attente de la validation du compte développeur)
- 🔜 Test en piste interne — **c'est la piste retenue, pas de passage en
  production prévu pour l'instant** (cf. décision de diffusion ci-dessus)
- 🔜 **Après première publication uniquement** : remplacer le fingerprint
  dans `assetlinks.json` par celui de Play App Signing (Release > Setup >
  App Integrity dans Play Console) — différent du fingerprint local actuel,
  Google re-signe l'app avec sa propre clé de gestion

## 12. Mode Forme (v2.6) — câblé de bout en bout

**Objectif** : un mode d'entraînement alternatif au plan course, pour le
maintien en forme hors préparation d'une échéance précise (demandé par
Laurent le 13 juillet 2026). Cadrage discuté et validé avant codage :

- **Mode alternatif, sans date de fin fixe** — remplace le plan course
  plutôt que de s'y ajouter en complément ; pas de switch libre entre les
  deux au sein d'un même plan.
- **Plan structuré** (pas un simple journal de suivi), mais orienté
  développement général plutôt que préparation compétitive.
- **Paramètres d'entrée** : niveau + volume hebdo + « accent » au choix
  (VMA / Endurance / Polyvalent), pas de distance/date de course/objectif
  chrono.
- **Renouvellement dans le temps** : plan « glissant », qui s'ajuste par
  blocs de semaines plutôt qu'une structure cyclique fixe ou un plan à durée
  déterminée.
- **Affichage** : même dashboard que le mode course (`index.html`), pas de
  vue séparée — `plan.mode` sert de discriminant, les blocs spécifiques à la
  course (compte à rebours, phases, jour J) se masquent en mode Forme.
  Décision motivée par la réutilisation directe de l'ACWR, des Stats, de la
  séance du jour, de la sync Strava et du suivi de statuts, tous déjà
  indépendants de la notion de date de course.
- **Contenu des séances qualité** : registre volontairement différent du
  moteur course — dans l'esprit « jeu avec l'allure » (fartlek à fourchette
  d'allure T-I sans découpage en blocs fixes, pyramidale sur allure seuil
  plutôt que VMA) plutôt que le protocole chronométré strict des séances
  course. Décision explicite pour que le mode Forme ne soit pas juste
  « un plan course sans date ».

### 12.1 Moteur — `plan-forme.js`

`public/v2/engine/plan-forme.js` (+ copie classic
`public/engine-classic-scripts/plan-forme.classic.js`, chargée après
`plan-generator.classic.js`) — module ES codé et testé
(`test-plan-forme.mjs`, 14 tests, tous passent). Réutilise directement
`placerSemaine`, `genererContenuEF`, `genererContenuLongue`,
`repartirVolumeSemaine`, `computeFcMaxTanaka`, `computeZonesFC` de
`plan-generator.js` ; n'importe jamais `computePhases`,
`ROTATION_SOUS_TYPE`, `placerSeanceTest`, `placerSeanceCourse` ni
`injecterApprocheCourse`. Fonctions principales :

- `generatePlanForme(profil, params)` — génère un bloc glissant de N
  semaines (4 par défaut, `nbSemainesBloc` réglable). Retourne un plan avec
  `mode: 'forme'`, `accent`, `dateCloture` (optionnelle, cf. §12.4), pas de
  `phases`/`dateCourse`.
- `genererBlocSuivant(planPrecedent, profilOrigine, paramsOrigine)` —
  enchaîne le bloc suivant en repartant du plateau de volume atteint (pas de
  la dernière semaine si celle-ci est une décharge), pour une progression
  continue sans redémarrer de zéro ni reculer à chaque enchaînement.
  `dateCloture` se propage automatiquement d'un bloc à l'autre via l'étalage
  de `paramsOrigine`.
- `computeAlluresForme` — variante de `computeAllures` sans zone C (allure
  course), les autres zones (recup/E/T/I/V) réutilisent `PACE_RATIOS` tel
  quel.
- `computeVolumeFormeSemaine` — plateau glissant (volume départ + 15% max,
  `MARGE_PROGRESSION_PLATEAU`), montée douce sur 3 semaines puis
  stabilisation, décharge -25% tous les 4 semaines (même règle que le moteur
  course).
- `genererContenuQualiteForme` + `ROTATION_SOUS_TYPE_FORME` — rotation par
  accent (`vma`/`endurance`/`polyvalent`), sous-types propres au mode Forme
  (`fartlek`, `pyramidale-forme`, `i-30-30-forme`, `cotes-forme`,
  `seuil-forme`), jamais ceux du moteur course.

Bug trouvé et corrigé pendant le développement : le texte fartlek affichait
un double `/km` (`4:59/km et 4:18/km/km`) — `formatPace()` inclut déjà
l'unité, il ne fallait pas la rajouter dans le gabarit du texte.

### 12.2 Wizard — `v2/index.html`

Écran de choix de mode (« Objectif course » vs « Mode forme »), affiché
avant le wizard course existant, indépendant du système `data-step`
numérique pour ne rien décaler dans les références existantes
(`totalSteps`/`current`). Flux Forme dédié en 4 étapes (niveau + référence,
volume, jours, accent + date de clôture optionnelle), réutilise Strava, la
logique de jours et `renderResults()`/`rafraichirPlanComplet()` du wizard
course (rendues robustes aux champs absents `phases`/`dateCourse` via des
gardes `ESTMODEFORME`/`?.`). Import de `plan-forme.js` ajouté au
`<script type="module">` du wizard.

`resPlansSauvegardes` (liste des plans déjà sauvegardés) déplacée depuis
l'étape 1 du wizard course vers l'écran de choix de mode — c'est désormais
le tout premier écran affiché, donc le seul endroit garanti visible avant
tout choix de type de plan. Auparavant invisible tant que « Objectif course »
n'était pas sélectionné.

### 12.3 Dashboard — `index.html`

`ESTMODEFORME` (`window.__PLAN_BRUT__?.mode === 'forme'`) sert de
discriminant global, déclaré tôt dans le fichier (avant tout usage) :

- `countdown()`/`DATE_COURSE_REFERENCE` : `null`-safe en mode Forme, plus de
  fausse date de repli.
- `PHASES` : repli neutre (une seule « phase » sans label, couvrant tout le
  bloc) en mode Forme, au lieu du faux repli historique 11 semaines qui
  aurait affiché à tort « Construction/Spécifique/Affûtage ».
- Badge « J– » masqué (header dashboard + header sticky), onglet « Course »
  retiré de la nav (avec garde anti-crash si `view` y reste bloquée),
  bannière post-course désactivée, bloc `heroPred` (objectif/estimation
  chrono) masqué en mode Forme.
- **Coach quotidien adapté** : prompt sans ligne « Estimation actuelle… de
  l'objectif » en mode Forme ; intègre l'ACWR de façon *implicite* — le
  ratio actuel (`calculerACWR(stravaActivities).dernierRatio`) est traduit
  en consigne de ton interne (prudent / neutre / encourageant selon les
  seuils `ACWR_SEUIL_RISQUE`/`ACWR_SEUIL_VIGILANCE`/
  `ACWR_SEUIL_SOUS_CHARGE`), injectée dans le prompt avec instruction
  explicite de ne jamais employer les termes techniques (« ACWR », « charge
  aiguë/chronique »). S'applique en pratique à tous les modes, pas
  seulement Forme, puisque l'ACWR est déjà indépendante de la notion de
  course.

**Deux bugs trouvés et corrigés en testant en production** :
- Lors d'une édition du prompt du coach, tout le bloc de calcul des données
  Strava de la séance du jour (`todayAvgPace`, `todayInTarget`,
  `todayAvgIE`, `todayAvgCad`) avait été supprimé par erreur alors que ces
  variables restaient utilisées plus loin — `ReferenceError` silencieuse
  qui interrompait `fetchCoachMsg()` avant même l'appel réseau, donc aucun
  message ne se générait jamais (aucune requête visible dans l'onglet
  Réseau). Réintégré.
- Le bloc coach (`coachEl`) n'était historiquement inséré que dans la carte
  « séance du jour » (branche non-repos de `renderDashboard()`) — jamais
  affiché les jours de repos, dans **aucun mode**, comportement pré-existant
  révélé en pratique parce que le plan Forme de test tombait justement sur
  un jour de repos. `coachEl` est désormais aussi inclus dans la carte
  « REPOS », juste après le bilan de semaine et avant l'aperçu « Demain » —
  s'applique aux deux modes.

### 12.4 Clôture permanente & garde-fou anti-chevauchement

**Problème identifié** : un plan Forme n'a pas de date de fin naturelle
(contrairement à un plan course, borné par `dateCourse`). L'ancien garde-fou
de non-chevauchement (`trouverPlanEnConflit`, `gist-sync.js`) exigeait
`p.dateCourse` sur chaque plan comparé — un plan Forme (toujours sans
`dateCourse`) était donc silencieusement exclu de toute vérification, dans
les deux sens : deux plans (course et Forme, ou deux Forme) pouvaient
coexister sur les mêmes dates sans aucun avertissement.

**Analyse du risque réel** (avant de choisir un correctif) : pas de
mélange/corruption de données — chaque plan a ses propres clés de stockage
préfixées (`clePourPlan()`), et un seul plan est actif à la fois dans le
dashboard (`window.__PLAN_BRUT__`). Le vrai risque est la **confusion** :
deux plans actifs sur la même période, sans lien entre eux, chacun
interprétant indépendamment les mêmes activités Strava réelles.

**Principe retenu avec Laurent** : un seul plan actif à la fois, tous types
confondus — pas de coexistence plan course / plan Forme sur les mêmes dates.
Un plan Forme est considéré « en cours » **indéfiniment** tant qu'aucune
`dateCloture` optionnelle n'est fixée dessus. Une fois `dateCloture` fixée
et sauvegardée, elle devient **permanente et irréversible** : le plan
devient intégralement figé (lecture seule — plus aucune modification de
contenu, statuts, notes, ni synchro Strava), ce qui élimine tout besoin de
revérifier les conflits à chaque sauvegarde ultérieure et rend le
comportement d'un plan clôturé aussi prévisible qu'un plan course déjà
couru.

**Implémentation** (`gist-sync.js` + `gist-sync.classic.js` régénérée) :
- `dateFinPeriodeActive(plan)` — abstrait la différence de règle entre types
  : `dateCourse` pour un plan course, `dateCloture || null` pour un plan
  Forme (`null` = actif indéfiniment dans le futur, jamais « pas de plan »).
- `datesChevauchent(debutA, finA, debutB, finB)` — généralisée pour gérer
  des périodes « ouvertes » (fin = `null`).
- `trouverPlanEnConflit(plans, dateDebut, dateFin, idAExclure)` — fonctionne
  pour n'importe quelle combinaison de types (course/course, course/forme,
  forme/forme).
- `sauvegarderPlan(plan)` : rejette d'emblée toute écriture sur un plan
  Forme déjà clôturé (`planAvant.dateCloture` existe) avec un message
  explicite. Sinon, vérifie le conflit uniquement à la **création** d'un
  nouveau plan (`indexExistant === -1`) — une mise à jour de contenu sur un
  plan Forme non clôturé (ex. rouvrir un vieux plan des mois plus tard pour
  corriger une séance Strava historique) reste toujours libre, jamais
  bloquée rétroactivement par l'apparition d'un plan plus récent sur la
  même période calendaire. Point vérifié explicitement par Laurent avant de
  choisir cette conception : la première approche envisagée (revérifier à
  chaque sauvegarde si les dates changent) aurait cassé cet usage légitime.
- `syncStrava()` (`index.html`) refuse de se déclencher sur un plan Forme
  clôturé (garde en tout début de fonction, avant l'appel réseau).

**Interface** :
- Wizard (`v2/index.html`, étape accent) : champ « Date de clôture
  (optionnel) », texte d'aide précisant le caractère définitif, confirmation
  explicite (`confirm()`) au moment de générer le plan si une date a été
  renseignée.
- Paramètres (`index.html`, section « 🏁 Clôture du plan forme », visible
  seulement si `ESTMODEFORME`) : si le plan n'est pas encore clôturé, un
  champ date + bouton « Clôturer définitivement à cette date » avec
  confirmation explicite (action irréversible, pas de bouton « Retirer »).
  Si déjà clôturé, affichage lecture seule uniquement (🔒 date +
  explication) — aucun champ ni bouton modifiable.

**Tests** (exécutés manuellement en session, pas encore de fichier
`test-*.mjs` dédié dans le repo — à créer si ce mécanisme évolue) : 11 cas
sur `datesChevauchent`/`trouverPlanEnConflit` (chevauchements/non-
chevauchements course/course, forme sans clôture qui bloque, forme clôturé
qui débloque, mise à jour du même plan jamais en conflit avec lui-même) + 7
cas sur `sauvegarderPlan` avec storage/fetch simulés (modification de
contenu sur plan Forme clôturé rejetée, re-clôture avec mêmes valeurs
toujours rejetée, première clôture autorisée, création de plan course après
clôture autorisée, création pendant un plan Forme actif bloquée, édition de
contenu sur plan Forme non clôturé toujours libre, plans course jamais
concernés par la règle de figeage). Tous passent.

### 12.5 Fiabilité du coach & météo dynamique (`index.html`)

Trois problèmes trouvés en usage réel sur les deux prompts du coach
(`fetchCoachMsg` et `fetchCoachRaceMsg`), tous corrigés :

- **Confusion de prénom** : le coach s'adressait parfois à l'utilisateur en
  l'appelant « Léa » (le prénom du personnage coach lui-même, pas celui du
  coureur) — ex. « Bravo Léa ! » adressé à Laurent. Le prompt ne
  transmettait jamais le vrai prénom de l'utilisateur. Corrigé : injection
  de `profilCoureur.prenom` (déjà existant, Paramètres → Profil) dans les
  deux prompts, avec instruction explicite « utilise son prénom, jamais
  Léa » ; repli sur une instruction « n'utilise jamais Léa pour t'adresser
  au coureur » si le prénom n'est pas renseigné.
- **Moments de journée inventés** : le prompt contenait littéralement
  « terminée ce soir » comme fait injecté, poussant l'IA à broder des
  détails temporels qu'elle ne peut pas connaître (« demain matin »,
  « avant de dormir », horaires de petit-déjeuner…) — l'app ne connaît que
  la date d'une séance, jamais l'heure. Corrigé : retrait de la mention
  factuelle « ce soir », ajout d'une consigne explicite interdisant toute
  supposition d'heure/moment de journée dans les deux prompts.
- **Météo en position fixe** : `weatherTemp` (météo actuelle, transmise au
  coach) utilisait des coordonnées Toulon codées en dur
  (`latitude=43.12&longitude=5.93`), sans lien avec l'endroit réel où
  Laurent court. Corrigé : `coordonneesMeteoActuelles()` utilise désormais
  la position GPS de la dernière activité Strava disponible avec GPS
  (triée par date, ignore les activités sans `start_latlng` même plus
  récentes), avec repli sur Toulon si aucune activité GPS n'existe ou si
  `stravaActivities` est vide. Testé (6 cas : aucune activité, activités
  sans GPS, mélange, tri par date, GPS mal formé) — tous passent.

Deux bugs de régression trouvés et corrigés pendant le développement de ces
correctifs (avant celui-ci) :
- Suppression accidentelle du bloc de calcul des données Strava de la
  séance du jour (`todayAvgPace`, `todayInTarget`, `todayAvgIE`,
  `todayAvgCad`) lors d'une édition antérieure du prompt — `ReferenceError`
  silencieuse qui empêchait `fetchCoachMsg()` de s'exécuter jusqu'au bout
  (aucune requête réseau visible, aucun message généré). Diagnostiqué via
  l'onglet Réseau des outils développeur (absence totale de requête vers
  `/api/coach`) plutôt qu'en devinant.
- Le bloc coach (`coachEl`) n'était historiquement inséré que dans la carte
  « séance du jour », jamais dans la carte « REPOS » — comportement
  pré-existant (pas une régression de cette session), révélé en pratique
  parce qu'un plan de test tombait justement sur un jour de repos. Ajouté à
  la carte REPOS, pour les deux modes.

### 12.6 Extraction du changelog (`changelog.classic.js`)

Le tableau `VERSIONS` (historique des versions affiché dans Paramètres,
~250 lignes de contenu texte pur) vivait en dur au milieu de
`renderSettings()` dans `index.html` (déjà ~5600 lignes) — sans rapport
avec la logique de rendu environnante, et risqué à éditer (une entrée mal
formée pouvait casser du JS ailleurs dans ce même fichier massif).

Extrait tel quel vers `public/engine-classic-scripts/changelog.classic.js`
(nouveau fichier), chargé en `<script src>` avec les autres scripts moteur,
avant le script principal d'`index.html` qui lit `VERSIONS`. Choix du
format JS plutôt que JSON : cohérent avec le pattern déjà en place pour
tout le reste du moteur classic (chargement synchrone, pas d'attente
réseau au démarrage, commentaires possibles pour documenter chaque entrée
— un JSON ne le permettrait pas).

Particularité par rapport aux autres fichiers `*.classic.js` : **pas de
source de vérité en module ES séparé**. Les autres fichiers de ce dossier
sont des copies dérivées d'un vrai module `v2/engine/*.js` (à régénérer
manuellement à chaque évolution du moteur) ; `changelog.classic.js` n'a
pas d'équivalent v2 — c'est un contenu propre à l'app v1 (`index.html`),
jamais partagé avec le wizard v2, donc ce fichier classic *est*
directement la source de vérité, à éditer sur place pour chaque nouvelle
version.

`index.html` allégé de ~200 lignes par cette extraction (~5620 → ~5450).

### 12.7 Chantier encore ouvert

- **Déclenchement de `genererBlocSuivant()`** : pas encore câblé côté
  `index.html`. Reste à décider comment le bloc suivant est généré quand le
  bloc courant touche à sa fin — déclenchement automatique en arrière-plan
  (ex. à l'ouverture de l'app si la dernière semaine du bloc est dépassée),
  ou action explicite proposée à l'utilisateur (ex. bannière « Générer le
  prochain bloc » sur le dashboard, dans l'esprit de la bannière
  d'adaptation dynamique déjà existante) ? À trancher en session dédiée.



**Symptôme** (signalé le 13 juillet 2026, pendant la session mode Forme) :
sur l'app Android installée (TWA), chaque navigation vers "configuration de
plan" (`/v2`) ouvrait une **nouvelle tâche** dans le multitâche du
téléphone (plusieurs cartes "Run by Léa" visuellement identiques
s'accumulaient), et le système proposait systématiquement "ouvrir avec
Chrome" au lieu de rester dans l'app.

**Fausses pistes explorées avant la vraie cause** (utiles à documenter pour
ne pas les re-tester inutilement si un symptôme similaire réapparaît) :
- **`v2/manifest.json` avait un `scope`/`name` différents de la racine**
  (`scope: "/v2"` vs `"/"`, `name: "Run by Léa (v2)"` vs `"Run by Léa"`) —
  corrigé (alignés sur la racine), déployé, mais n'a pas résolu le
  problème seul. Le correctif reste appliqué et légitime (cohérence
  générale), juste insuffisant.
- **WebAPK Chrome fantôme** (`org.chromium.webapk.afd89bd65879efa80_v2`) —
  un second package Chrome, distinct du TWA, revendiquait aussi
  `plan-10k-alpha.vercel.app` (signature différente). Désinstallé via
  `adb uninstall org.chromium.webapk.afd89bd65879efa80_v2` — a nettoyé un
  vrai conflit potentiel mais n'était pas non plus la cause du symptôme
  observé (confirmé via `pm get-app-links` et `dumpsys package
  domain-preferred-apps` après coup : un seul revendicateur restant, bug
  toujours présent).
- **`launchHandlerClientMode` vide dans `twa-manifest.json`** — changé en
  `"navigate-existing"`, rebuild complet (Bubblewrap → échec de signature
  automatique `BadPaddingException`, contournement habituel par signature
  manuelle `apksigner.jar`, réinstallation via `adb uninstall`/`adb
  install`). N'a pas résolu le problème non plus. Le changement reste
  appliqué (bonne pratique générale pour un TWA), sans effet sur ce bug
  précis.

**Vraie cause** : dans `public/index.html`, fonction `renderSelecteurPlan()`
(dashboard), le bouton "🏁 Configurer un plan" était un `<a href="/v2"
target="_blank">`. `target="_blank"` force Android à traiter la navigation
comme **externe** au TWA plutôt qu'interne, ce qui déclenche à la fois le
choix d'application ("ouvrir avec Chrome") et l'ouverture d'une nouvelle
tâche à chaque clic.

**Origine de cet attribut** : ajouté le 8 juillet 2026 (commit antérieur à
cette session) pour contourner un bug différent — `window.open()` en JS ne
fonctionnait pas du tout depuis la PWA installée en mode standalone. Le
correctif de l'époque (passer par un vrai `<a target="_blank">` plutôt que
`window.open()`) résolvait ce problème-là, mais introduisait celui-ci sans
que le lien ait été identifié à l'époque.

**Correctif appliqué** : retrait de `target:"_blank"` sur ce lien (reste un
`<a href="/v2">` simple). Un `<a>` cliqué directement (pas via
`window.open()` JS) reste fiable en contexte TWA/PWA standalone — le retrait
ne devrait donc pas réintroduire l'ancien bug de juillet, mais **à surveiller**
si un comportement similaire à celui du 8 juillet réapparaît un jour.

**Méthode de diagnostic qui a fini par isoler la cause** : recherche directe
dans le code de toute occurrence de `/v2` pour vérifier COMMENT la
navigation était déclenchée (`grep` sur le fichier `index.html` téléchargé
depuis GitHub), plutôt que de continuer à empiler des hypothèses côté
configuration Android/manifest. Une fois localisé, la cause était visible
immédiatement dans le code.

**Commandes ADB utiles pour un diagnostic futur** (conservées pour
référence) :
```
adb shell pm get-app-links <package>
adb shell dumpsys package domain-preferred-apps | findstr /i "<mot-clé>"
adb shell pm list packages | findstr /i "<mot-clé>"
adb uninstall <package>
adb install <apk>
```

---

## 13. Rebranding "Run by Léa" → "Yoria" (14 juillet 2026)

### 13.1 Périmètre du changement

Renommage complet de l'application, à la demande de Laurent, en vue de la
commercialisation v2.5 (500 abonnés cible). Nouveau nom : **Yoria**.

**Repo GitHub renommé** : `plan-10k` → `yoria` (`olayanne3-wq/yoria`).
GitHub applique un redirect automatique de l'ancien nom, Vercel a continué
à déployer sans reconfiguration (connecté par ID de repo, pas par nom).
Domaine Vercel de production inchangé : `plan-10k-alpha.vercel.app` (pas
renommé à ce stade — changement de domaine non demandé).

**Fichiers modifiés pour le nom/l'identité** :
- `public/index.html` (titre, UI, icône SVG inline)
- `public/manifest.json`, `public/v2/manifest.json`
- `public/v2/index.html` (wizard)
- `public/engine-classic-scripts/auth.classic.js` et
  `public/v2/engine/auth.js` (écran de connexion — texte "Run by Léa"
  oublié lors du premier passage, corrigé dans une session ultérieure)
- `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`
  (remplacés par les assets du pack Yoria fourni par Laurent)
- `README.md`
- `public/sw.js`, `public/v2/sw.js` (nom de cache renommé
  `plan10k-v21` → `yoria-v1`, `plan10k-v2-v2` → `yoria-v2-v1`, pour forcer
  un rafraîchissement du cache PWA côté utilisateurs existants)

### 13.2 APK Android (TWA) — régénération

Projet Android local (`C:\Users\olaya\runbylea-android-v3\`, nom de
dossier resté tel quel — cosmétique, aucun impact) : `twa-manifest.json`
mis à jour avec `name`/`launcherName: "Yoria"`, `themeColor`/
`backgroundColor` alignés sur la nouvelle palette, `iconUrl`/
`maskableIconUrl` pointant vers `https://plan-10k-alpha.vercel.app/icon-512.png`
(champ `maskableIconUrl` absent par défaut du fichier généré par
Bubblewrap — ajouté manuellement).

**Bug de signature `BadPaddingException` reproduit** (déjà documenté
section 8bis) — contournement habituel par `apksigner.jar` en ligne de
commande. **Précision utile pour la prochaine fois** : l'échec initial
venait d'un mauvais mot de passe pour `--key-pass` (une valeur différente
de celle du keystore, provenant probablement d'un essai antérieur) —
`keytool -list -v -keystore android.keystore -storepass <pwd>` a permis
de confirmer que keystore et clé partagent en réalité le **même mot de
passe**. Utiliser la même valeur pour `--ks-pass` et `--key-pass` a résolu
la signature.

Après signature, désinstallation de l'ancien package via
`adb uninstall app.vercel.plan_10k_alpha.twa` a échoué
(`DELETE_FAILED_INTERNAL_ERROR`) — contournée par désinstallation manuelle
depuis les paramètres du téléphone, puis `adb install
app-release-signed.apk` a fonctionné normalement. Package Android
inchangé : `app.vercel.plan_10k_alpha.twa` (changer l'identifiant
casserait toute mise à jour future — non fait, aucune raison de le faire
tant que l'app n'est pas publiée).

### 13.3 Palette graphique

Pack de branding fourni par Laurent (`Yoria_Google_Play_Assets.zip`) avec
`palette.json` :
```
primary:   #1E4ED8 (bleu)
secondary: #22C7B8 (turquoise)
navy:      #07162F (fond sombre, version initiale — remplacé ensuite,
                     voir 13.5)
off_white: #F8FAFC (fond clair)
charcoal:  #1F2937 (texte)
```
Une 5e couleur d'accent orange (`#FF7755`) a été ajoutée par Laurent dans
une maquette Google Play ultérieure (mockups incluant captures d'écran,
bannière, feature graphic) — adoptée comme couleur d'alerte/accent
secondaire à la place du rouge/jaune/violet historiques.

**Décisions de mapping validées avec Laurent** :
- Vert succès (`#22c55e`) → turquoise (`#22C7B8`)
- Rouge erreur (`#ef4444`, `#f87171`) et jaune (`#eab308`) → orange
  (`#FF7755`)
- Violet (`#a855f7`, séances spécifiques/adaptation) → bleu (`#1E4ED8`)
- Cartes : pas de distinction de fond (auparavant blanc sur gris clair) —
  fond uniforme `#F8FAFC` partout, séparation visuelle par **ombre légère**
  (`box-shadow`) plutôt que bordure dure, conforme au style observé sur la
  maquette Google Play.

**Contrainte stricte de Laurent** : n'utiliser QUE les 5 couleurs
officielles (+ leurs variantes d'opacité), aucune couleur "de convenance"
ajoutée. Un audit complet du repo (`index.html`, `v2/index.html`,
`auth.classic.js`, `auth.js`, tous les fichiers moteur classic/module, API
serverless) a confirmé zéro couleur hors palette après nettoyage — y
compris deux résidus `#fff` en dur sur des boutons à fond plein, corrigés
vers `#F8FAFC` (couleur officielle) bien que visuellement déjà corrects.

**Piège rencontré pendant les remplacements automatisés** : plusieurs
passages successifs de remplacement de couleurs par script ont généré des
couleurs hexadécimales invalides à 10 caractères (ex. `#1F29372222`,
`#1F29371111`) en concaténant un second suffixe d'opacité sur une valeur
déjà suffixée. CSS ignore silencieusement une couleur invalide — aucune
erreur visible, juste un style non appliqué. Détecté par grep ciblé
(`#[0-9a-fA-F]{10}`) lors d'un audit, corrigé à la source avant de
poursuivre. **Vigilance à conserver** pour toute future automatisation de
remplacement de couleurs sur ce projet.

### 13.4 Thème clair (light mode) — première itération

Passage du thème sombre historique (fond `#0f1117`/`#07162F`) à un thème
clair (fond `#F8FAFC`), à la demande de Laurent après une maquette Google
Play montrant des captures d'app en fond clair. Conversion appliquée sur
`index.html`, `v2/index.html`, et l'écran d'authentification (deux
versions, classic et module).

**Bugs de contraste identifiés après la conversion initiale** (couleurs en
`rgba(...)` codées avec des valeurs numériques littérales, invisibles à un
`grep` sur `#hex` et donc oubliées lors du premier passage) :
- Barre de navigation du bas : `background: rgba(26,29,39,0.97)`
  (quasi-noir) — resté actif sur fond clair, rendant la barre illisible.
- Header sticky en haut de certains écrans : `rgba(15,17,23,0.95)` — même
  problème.
- Wizard v2 : 43 occurrences de texte en `rgba(238,240,234,X)` (blanc cassé,
  ancienne couleur de texte sur fond sombre) jamais migrées → texte
  quasiment invisible sur le nouveau fond clair.
- `<option>` d'un `<select>` HTML natif (sélecteur de plan dans
  `index.html`) : sans couleur explicite sur chaque `<option>`, certains
  navigateurs/OS appliquent leur propre thème sombre système, rendant le
  texte illisible malgré un CSS correct sur le `<select>` parent. Corrigé
  en forçant `style:{background,color}` sur chaque `<option>` généré.

**Leçon retenue** : lors d'une conversion de palette, chercher aussi les
couleurs en `rgb()`/`rgba()` avec valeurs décimales, pas seulement les
`#hex` — un simple `grep -oE "#[0-9a-fA-F]{6}"` laisse passer ces cas.

### 13.5 Système de thème clair/sombre avec bascule utilisateur

Demande ultérieure de Laurent : proposer un vrai choix clair/sombre dans
les Paramètres, pas seulement un remplacement figé du thème sombre par le
clair. Nécessite que **toute couleur soit une variable**, jamais une
valeur en dur, pour permettre une bascule dynamique.

**Architecture retenue** — variables CSS basées sur des triplets RGB (pas
directement des couleurs hexadécimales), pour permettre une composition
d'opacité propre sans collision :
```css
:root {
  --bg-rgb: 248,250,252;       --text-rgb: 31,41,55;
  --accent-rgb: 30,78,216;     --accent2-rgb: 34,199,184;
  --warn-rgb: 255,119,85;
  --bg: rgb(var(--bg-rgb));    --text: rgb(var(--text-rgb));
  --text-muted: rgba(var(--text-rgb),0.6);
  --text2: rgba(var(--text-rgb),0.8);
  --border: rgba(var(--text-rgb),0.13);
  /* etc. */
}
[data-theme="dark"] {
  --bg-rgb: 13,17,23;          --surface-rgb: 31,41,55;
  --text-rgb: 248,250,252;
  --shadow1: rgba(0,0,0,0.4);  /* ombres neutres, pas liées au thème */
}
```
Couleurs d'accent (`--accent`, `--accent2`, `--warn`) **identiques dans
les deux thèmes** — seules les couleurs de fond/texte/bordure changent,
conformément aux deux maquettes fournies par Laurent (light et dark
utilisent les mêmes bleu/turquoise/orange).

**Piège rencontré (deuxième occurrence du même type de bug)** : le premier
essai de conversion a réutilisé des variables déjà porteuses d'une opacité
fixe (ex. `--border: rgba(...,0.13)`) en leur accolant un second suffixe
d'opacité hexadécimal (`var(--border)22`), générant une couleur CSS
invalide silencieusement ignorée — même symptôme que celui de la section
13.3, cette fois provoqué par la conversion en variables elle-même plutôt
que par un remplacement hex→hex. Corrigé en repartant d'une version
propre du fichier et en utilisant systématiquement le pattern
`rgba(var(--x-rgb), N)` pour toute opacité personnalisée, jamais de
suffixe collé à une variable qui contient déjà une couleur complète.

**Toggle utilisateur** : section "🎨 Apparence" ajoutée dans
`renderSettings()` (juste après la section "👤 Compte"), deux boutons
Clair/Sombre, sauvegarde dans `localStorage` (`lk_theme`), application
immédiate via `document.documentElement.setAttribute('data-theme', ...)`
+ `render()`. Un script en tête de `<head>` (avant tout style visible)
lit `localStorage` et pose l'attribut `data-theme` sur `<html>` dès le
chargement, pour éviter un flash de thème incorrect.

**Wizard v2 et écran d'authentification** : branchés sur le même système
de variables (le wizard réutilise ses variables sémantiques historiques —
`--ink`, `--paper`, `--signal`, etc. — redéfinies pour pointer vers les
nouvelles variables RGB plutôt que des couleurs figées). L'écran
d'authentification (`auth.classic.js`/`auth.js`) injecte son propre
`<style>` en JS dans un `<div>` hôte du document principal
(`#ecran-auth-hote`) : confirmé qu'il hérite bien des variables `:root`/
`[data-theme]` définies dans le document parent (`index.html` ou
`v2/index.html`), donc `var(--accent)` etc. fonctionnent correctement
sans dupliquer les définitions de variables dans ce fichier.

**Résidus de couleurs en dur oubliés lors du passage initial en variables**
(trouvés après retour utilisateur signalant onglets/header toujours
blancs en mode sombre, et texte illisible dans le wizard) :
- `index.html` : les mêmes `rgba(255,255,255,0.97)` /
  `rgba(248,250,252,0.95)` de la nav bar et du header sticky (section
  13.4) avaient été remplacés par leurs équivalents en thème clair lors du
  passage en variables, mais pas reliés à la variable `--bg` — recorrigés
  en `rgba(var(--bg-rgb), X)`.
- `v2/index.html` : 43 occurrences de texte en `rgba(31,41,55,X)`
  (charcoal, couleur de texte clair) codées avec des valeurs RGB
  littérales plutôt que `var(--text-rgb)` — texte resté sombre figé même
  en thème sombre, illisible sur fond sombre. Recorrigé en
  `rgba(var(--text-rgb), X)`.

**Méthode de vérification établie pour ce type de bug** : après toute
conversion de couleurs, chercher spécifiquement les `rgba(N,N,N` avec
valeurs numériques (`grep -oE "rgba\([0-9]+,[0-9]+,[0-9]+"`), en plus des
`#hex`, car ce sont deux syntaxes distinctes qui n'apparaissent pas dans
le même filtre.

### 13.6 Bug fonctionnel découvert pendant le débogage du theming (non lié)

Signalé par Laurent : impossible de cliquer sur un plan existant dans la
liste de la page 1 du wizard (`renderSelecteurPlan` / bib-row du wizard) —
aucune réaction visible, aucune erreur console.

**Diagnostic** (par tests successifs en console développeur, pas de
reproduction locale possible) : la fonction `chargerPlanExistant(id)`
activait bien la classe `.active` sur l'écran de résultats
(`data-step="10"`, confirmé par `dataset.step === '10'` après clic), mais
l'écran restait visuellement invisible
(`getBoundingClientRect()` retournait `width:0, height:0`) car un autre
conteneur, `#choix-mode-contenu` (la page de choix Objectif course / Mode
forme), restait affiché par-dessus (`style.display: 'block'`), jamais
masqué par cette fonction — contrairement à `choisirMode()` qui fait
`document.getElementById('choix-mode-contenu').style.display = 'none'`
avant d'afficher un écran suivant.

**Bug préexistant, sans lien avec les changements de couleur/thème** —
probablement présent depuis l'ajout du sélecteur de plans sauvegardés
dans le wizard, découvert seulement maintenant car Laurent teste peu ce
chemin (chargement d'un plan déjà existant depuis la page d'accueil du
wizard, plutôt que d'en créer un nouveau).

**Correctif** : ajout de la ligne manquante dans `chargerPlanExistant()` :
```js
document.getElementById('choix-mode-contenu').style.display = 'none';
```

**Méthode de diagnostic utile pour la prochaine fois** : en l'absence
d'accès direct au navigateur de Laurent, diagnostic entièrement mené via
allers-retours de commandes à coller dans la console développeur
(`document.elementFromPoint`, `getBoundingClientRect`, `dataset.step`,
appel direct de la fonction vs `.click()` simulé vs `.onclick` inspecté)
pour isoler méthodiquement si le problème venait du DOM (élément
manquant/mal ciblé), de l'événement (listener non attaché), de la logique
(fonction en erreur), ou du rendu (élément actif mais non visible) — dans
cet ordre d'élimination.
