# Inventaire de l'application "Yoria"

> Vue d'ensemble de référence — à relire en début de session pour retrouver le contexte
> sans re-parcourir tout le repo. Mis à jour au 14 juillet 2026 (chantier **marche-course
> / niveau grand-débutant en cours** — moteur fait et poussé, duplication classic +
> wizard + app pas commencés, voir §15 ; bug v2_gist_id résolu, voir §14 ; chantier ACWR
> toujours en cours ; harmonisation visuelle app/wizard ; badge décharge onglet Semaines ;
> **v2.5 publiée** — authentification Supabase, migration rétroactive, sync temps réel,
> wizard protégé, nettoyage Réglages, variables d'env Vercel, file d'attente de sync ;
> **publication Play Store en cours**, voir §11 ; **Mode Forme (v2.6) câblé de bout en
> bout** — wizard, dashboard, coach adapté, clôture permanente avec garde-fou
> anti-chevauchement, fiabilité du coach (prénom, moments de journée, météo dynamique),
> voir §12 ; **bug TWA duplication de tâches résolu**, voir §13 ; **rebranding Yoria**
> — nouveau nom, repo renommé plan-10k → yoria).
> Pour l'historique des décisions et le "pourquoi", voir les autres docs de ce dossier
> (bibliotheque-seances.md, convergence-v1-v2.md, etc.) et les mémoires de session.
>
> ⚠️ **Cet inventaire doit être mis à jour à chaque push** — voir §10, principe
> "Inventaire à jour". Un push qui change la structure, les écrans, les clés de
> stockage, les intégrations ou l'état des chantiers sans mettre à jour ce fichier
> est incomplet.

## 1. Vue d'ensemble

**Run by LÃ©a** â€” PWA coach running, gÃ©nÃ¨re des plans d'entraÃ®nement adaptatifs.
DÃ©ployÃ©e sur Vercel : `plan-10k-alpha.vercel.app`. Repo GitHub : `olayanne3-wq/plan-10k`.
Stack : vanilla HTML/CSS/JS, hosting statique Vercel, API serverless dans `/api/`.
Utilisateur principal actuel : Laurent, qui prÃ©pare un Semi le 1er novembre 2026.

## 2. Arborescence du repo

```
plan-10k/
â”œâ”€â”€ api/                          # Endpoints serverless (Vercel/Node)
â”‚   â”œâ”€â”€ coach.js                  # Proxy vers Claude Haiku (messages coach courts)
â”‚   â”œâ”€â”€ strava.js                 # OAuth Strava (auth, callback, refresh, activities)
â”‚   â”œâ”€â”€ weather.js                # Proxy Open-Meteo (prÃ©vision + alerte chaleur >28Â°C)
â”‚   â””â”€â”€ config.js                  # Expose SUPABASE_URL/SUPABASE_ANON_KEY (variables
â”‚                                    # d'environnement Vercel) au client â€” ajoutÃ© le
â”‚                                    # 13 juillet 2026. Route dÃ©clarÃ©e explicitement dans
â”‚                                    # vercel.json (routing en liste blanche, absence
â”‚                                    # initiale de cette route causait un 404).
â”œâ”€â”€ docs/v2-methodologie/         # Documentation mÃ©thodologique et architecture
â”‚   â”œâ”€â”€ inventaire-application.md # CE FICHIER
â”‚   â”œâ”€â”€ bibliotheque-seances.md   # MÃ©thodologie dÃ©taillÃ©e des types de sÃ©ances qualitÃ©
â”‚   â”œâ”€â”€ convergence-v1-v2.md      # Historique des dÃ©cisions de convergence v1â†’v2
â”‚   â”œâ”€â”€ coherence-semaine-test.md
â”‚   â”œâ”€â”€ jalons-narratifs.md
â”‚   â”œâ”€â”€ jour-de-course.md
â”‚   â”œâ”€â”€ notes-meteo.md
â”‚   â””â”€â”€ notes-pratiques.md
â”‚   â””â”€â”€ reperes-qualitatifs.md
â”œâ”€â”€ public/
â”‚   â”œâ”€â”€ index.html                 # App principale (dashboard) â€” sert le plan v2, ~300K
â”‚   â”œâ”€â”€ manifest.json, sw.js, icÃ´nes  # PWA v1 (racine)
â”‚   â”œâ”€â”€ icon.svg                   # Source vectorielle de l'icÃ´ne (silhouette coureur
â”‚   â”‚                               # orange sur fond arrondi) â€” utilisÃ©e aussi pour
â”‚   â”‚                               # gÃ©nÃ©rer les visuels Play Store
â”‚   â”œâ”€â”€ privacy.html               # Politique de confidentialitÃ© â€” ajoutÃ©e le
â”‚   â”‚                               # 13 juillet 2026 pour la publication Play Store.
â”‚   â”‚                               # Accessible Ã  /privacy.html
â”‚   â”œâ”€â”€ .well-known/
â”‚   â”‚   â””â”€â”€ assetlinks.json        # Digital Asset Links â€” lie le domaine Ã  l'app
â”‚   â”‚                               # Android TWA (Trusted Web Activity). Contient le
â”‚   â”‚                               # SHA256 du certificat de signature. Ã€ mettre Ã  jour
â”‚   â”‚                               # Ã  chaque changement de keystore, et une derniÃ¨re
â”‚   â”‚                               # fois avec le fingerprint Play App Signing aprÃ¨s
â”‚   â”‚                               # publication (cf. Â§11)
â”‚   â”œâ”€â”€ engine-classic-scripts/    # Copies non-module (.classic.js) du moteur v2,
â”‚   â”‚                               # utilisÃ©es par index.html (script classique).
â”‚   â”‚                               # Ã€ rÃ©gÃ©nÃ©rer manuellement Ã  chaque modif du moteur.
â”‚   â”‚                               # Inclut auth.classic.js (dÃ©rivÃ© de v2/engine/auth.js,
â”‚   â”‚                               # 13 juillet 2026) et sync-storage.classic.js (dÃ©rivÃ© de
â”‚   â”‚                               # v2/engine/sync-storage.js, 13 juillet 2026), attachÃ©s Ã 
â”‚   â”‚                               # window.LkAuth et window.LkSync respectivement, plutÃ´t
â”‚   â”‚                               # qu'aux globals habituels PLAN/ALL_SESSIONS.
â”‚   â”‚                               # plan-forme.classic.js (13 juillet 2026) dÃ©pend des
â”‚   â”‚                               # globales de plan-generator.classic.js (formatPace,
â”‚   â”‚                               # paceFromTime, riegelPredict, PACE_RATIOS, placerSemaine,
â”‚   â”‚                               # genererContenuEF/Longue, repartirVolumeSemaine,
â”‚   â”‚                               # computeFcMaxTanaka, computeZonesFC) â€” chargÃ© aprÃ¨s lui
â”‚   â”‚                               # dans index.html, cÃ¢blÃ© (Â§12.3).
â”‚   â”‚                               # changelog.classic.js (13 juillet 2026) : contenu pur
â”‚   â”‚                               # (tableau VERSIONS, historique des versions affichÃ© dans
â”‚   â”‚                               # ParamÃ¨tres), extrait d'index.html pour l'allÃ©ger (~250
â”‚   â”‚                               # lignes de texte sans rapport avec la logique de rendu
â”‚   â”‚                               # environnante). Pas de dÃ©pendance au moteur â€” pose juste
â”‚   â”‚                               # VERSIONS en portÃ©e globale, lu par renderSettings().
â”‚   â”‚                               # N'A PAS de source de vÃ©ritÃ© en module ES sÃ©parÃ© (pas de
â”‚   â”‚                               # v2/engine/changelog.js) : c'est un contenu propre Ã 
â”‚   â”‚                               # index.html (v1), pas partagÃ© avec le wizard v2 â€” donc pas
â”‚   â”‚                               # de duplication Ã  maintenir, ce fichier classic EST la
â”‚   â”‚                               # source de vÃ©ritÃ©.
â”‚   â””â”€â”€ v2/
â”‚       â”œâ”€â”€ index.html             # Wizard de crÃ©ation de plan (~120K)
â”‚       â”œâ”€â”€ manifest.json, sw.js   # PWA v2
â”‚       â””â”€â”€ engine/                # Moteur v2 (modules ES, source de vÃ©ritÃ©)
â”‚           â”œâ”€â”€ plan-generator.js  # CÅ“ur : gÃ©nÃ©ration de plan, sÃ©ances, adaptations (~100K)
â”‚           â”œâ”€â”€ plan-forme.js      # Mode Forme (v2.6, 13 juillet 2026) : cycle glissant sans
â”‚           â”‚                       # date de course, rÃ©utilise les briques gÃ©nÃ©riques de
â”‚           â”‚                       # plan-generator.js (placerSemaine, genererContenuEF/Longue,
â”‚           â”‚                       # repartirVolumeSemaine, computeFcMaxTanaka, computeZonesFC)
â”‚           â”‚                       # â€” n'importe jamais computePhases/ROTATION_SOUS_TYPE/
â”‚           â”‚                       # placerSeanceTest/placerSeanceCourse. CodÃ© et testÃ©
â”‚           â”‚                       # (14 tests), cÃ¢blage wizard/index.html pas encore fait â€”
â”‚           â”‚                       # voir Â§12.
â”‚           â”œâ”€â”€ gist-sync.js       # Sync multi-device via GitHub Gist. Contient aussi le
â”‚           â”‚                       # garde-fou anti-chevauchement entre plans (course ET
â”‚           â”‚                       # forme, gÃ©nÃ©ralisÃ© le 13 juillet 2026, cf. inventaire
â”‚           â”‚                       # Â§12.4) â€” trouverPlanEnConflit(), dateFinPeriodeActive(),
â”‚           â”‚                       # et le blocage permanent d'un plan Forme clÃ´turÃ© dans
â”‚           â”‚                       # sauvegarderPlan().
â”‚           â”œâ”€â”€ pdf-export.js      # Export PDF du plan (jsPDF)
â”‚           â”œâ”€â”€ strava.js          # IntÃ©gration Strava cÃ´tÃ© client (tokens, volume) â€” rÃ©utilisÃ©
â”‚           â”‚                       # tel quel par le mode Forme (dÃ©jÃ  gÃ©nÃ©rique, aucune
â”‚           â”‚                       # dÃ©pendance Ã  distance/objectif de course)
â”‚           â”œâ”€â”€ weather.js         # IntÃ©gration mÃ©tÃ©o cÃ´tÃ© client
â”‚           â”œâ”€â”€ auth.js            # Auth Supabase (Ã©cran connexion/inscription, session) â€” v2.5, 13 juillet 2026
â”‚           â”œâ”€â”€ sync-storage.js    # Synchronisation localStorage â†” Supabase, incl. migration rÃ©troactive one-shot â€” v2.5, 13 juillet 2026
â”‚           â”œâ”€â”€ v1-bridge.js       # Traduction plan v2 â†’ format v1 (pour affichage classic)
â”‚           â””â”€â”€ test-*.mjs         # Suite de tests (14 fichiers, un par module/fonctionnalitÃ©,
â”‚                                    # incl. test-plan-forme.mjs depuis le 13 juillet 2026)
â”œâ”€â”€ vercel.json                    # Routage : /api/*, /v2, fallback statique
â””â”€â”€ package.json                   # { "type": "module" }
```

**Projet Android local (hors repo)** â€” `C:\Users\olaya\runbylea-android-v3\` sur la
machine de Laurent. GÃ©nÃ©rÃ© via Bubblewrap (TWA), contient `android.keystore` (clÃ© de
signature, **jamais dans le repo**, Ã  sauvegarder sÃ©parÃ©ment), `app-release-signed.apk`,
et le projet Gradle complet. Voir Â§11 pour le dÃ©tail du setup et des mots de passe Ã 
conserver prÃ©cieusement en dehors de ce document.

## 3. Les deux interfaces

| | `public/index.html` | `public/v2/index.html` |
|---|---|---|
| RÃ´le | App principale : dashboard, suivi, rÃ©glages | Wizard : crÃ©ation/paramÃ©trage d'un plan |
| Route | `/` | `/v2` |
| Type de script | Classique (pas de `type="module"`) | Module ES natif |
| DÃ©pend de | `engine-classic-scripts/*.classic.js` (copies) | `v2/engine/*.js` (source) |
| Statut | Sert le plan v2 depuis le switch du 7 juillet 2026 | â€” |

**Dette technique connue** : le moteur (`v2/engine/*.js`) est dupliquÃ© manuellement
en `.classic.js` (export retirÃ©s) pour Ãªtre utilisable par `index.html`. Toute
modification du moteur doit Ãªtre rÃ©percutÃ©e Ã  la main dans les deux â€” dÃ©jÃ  source
d'oublis. Piste propre identifiÃ©e (convertir `index.html` en `type="module"`) jugÃ©e
trop risquÃ©e pour une intervention Ã  chaud (fichier ~5000 lignes) ; reportÃ©e Ã  une
session dÃ©diÃ©e avec tests approfondis.

**Harmonisation visuelle app/wizard** (13 juillet 2026) : les variables CSS du
wizard (`--ink`, `--ink-soft`, `--paper`, `--line` dans `v2/index.html`)
correspondaient dÃ©jÃ  exactement Ã  la palette codÃ©e en dur dans `index.html`
(`#0f1117`/`#1a1d27`/`#f1f5f9`/`#2e3347`) â€” aucun changement de couleur nÃ©cessaire.
Le bandeau du wizard (logo + "Run by LÃ©a", ajoutÃ© le 8 juillet, commit 83cb4f0)
a Ã©tÃ© complÃ©tÃ© avec :
- un sous-titre "CONCEPTION DE PLAN" (orange `--signal`, sous le titre principal),
  pour distinguer clairement le wizard du dashboard ;
- un bouton aide `?` en haut Ã  droite du bandeau, visuellement identique au
  `helpBtn` de `index.html` (mÃªme style, mÃªmes dimensions 26px) ;
- une modale d'aide propre au wizard (pas un lien vers `renderHelp()` de l'app,
  inaccessible depuis `v2/index.html` â€” pages sÃ©parÃ©es, pas de routage entre
  les deux) : 4 questions ciblÃ©es sur le fonctionnement du wizard lui-mÃªme
  (objet de l'assistant, navigation arriÃ¨re, persistance des rÃ©ponses en cours
  de route, oÃ¹ trouver l'aide complÃ¨te une fois le plan gÃ©nÃ©rÃ©).

## 4. Ã‰crans de l'app principale (`index.html`)

Fonctions de rendu principales (`render*`) :

- `renderSelecteurPlan` â€” sÃ©lection entre plusieurs plans actifs
- `renderDashboard` â€” Ã©cran d'accueil, rÃ©sumÃ© de la semaine
- `renderWeeks` / `renderWeekDetail` â€” vue calendrier et dÃ©tail d'une semaine.
  `renderWeeks` (liste repliÃ©e par semaine) affiche depuis le 13 juillet 2026 un
  badge "DÃ©charge" (pill orange, style cohÃ©rent avec `.pill` dÃ©jÃ  dÃ©fini en CSS
  global) Ã  cÃ´tÃ© du libellÃ© de phase, quand `estSemaineDecharge(weekNum)` est
  vraie. Le numÃ©ro de semaine ("S{n}") de chaque onglet repliÃ© Ã©tait dÃ©jÃ  colorÃ©
  selon la couleur de phase (`phaseOf(week.week).color`) â€” confirmÃ©, pas modifiÃ©.
- `renderStatusRow`, `showSessionMenu`, `showMoveMenu`, `showRestoreMenu` â€” gestion
  des sÃ©ances (statut fait/ratÃ©, dÃ©placement, restauration)
- `renderStats` â€” statistiques
- `renderCourse` â€” page dÃ©diÃ©e jour de course (horaires, parcours, rÃ©sultat)
- `renderHelp` â€” aide
- `renderSettings` â€” rÃ©glages : profil coureur, records personnels, tokens (GitHub,
  Strava), notifications
- `render` â€” orchestrateur principal

## 5. Persistance (localStorage, prÃ©fixe `lk_`)

**ClÃ©s globales (profil / config, non liÃ©es Ã  un plan prÃ©cis) :**
- `lk_profil_coureur` â€” structure unifiÃ©e du profil (voir Â§6)
- `lk_weight`, `lk_height`, `lk_fc_max`, `lk_pps` â€” anciennes clÃ©s, migrÃ©es en douceur
  vers `lk_profil_coureur` au premier chargement (aucune perte de donnÃ©es)
- `lk_github_token`, `lk_gist_id` â€” sync GitHub Gist
- `lk_strava_token`, `lk_strava_refresh`, `lk_strava_expires`, `lk_strava_activities`
- `lk_last_sync`

**ClÃ©s prÃ©fixÃ©es par plan (via `clePourPlan()`)** â€” tout ce qui est spÃ©cifique Ã  un
plan donnÃ© : `lk_statuses`, `lk_hidden_sessions`, `lk_swapped_sessions`,
`lk_session_notes`, `lk_notes`, `lk_checklist`, `lk_adaptations_ignorees`,
`lk_last_rebuild`, `lk_pred_history`, `lk_race_goal`, `lk_race_horaires`,
`lk_race_parcours`, `lk_race_result`, `lk_weather_cache`, `lk_coach_msg`,
`lk_coach_date`, `lk_coach_race_msg`.

Principe architectural (retenu aprÃ¨s le bug de contamination v1) : **toute donnÃ©e
propre Ã  un plan doit Ãªtre prÃ©fixÃ©e**. Une clÃ© globale non prÃ©fixÃ©e est un risque de
contamination inter-plans.

## 6. Profil coureur (`lk_profil_coureur`) â€” v2.3, clos le 12/07/2026

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

- Migration douce depuis les anciennes clÃ©s sÃ©parÃ©es, sans perte de donnÃ©es.
- App (`Settings`) : carte "Records personnels".
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit annÃ©e de naissance, FC max,
  temps de rÃ©fÃ©rence â€” au chargement et Ã  chaque changement de distance visÃ©e.
  SÃ©lection du record le plus pertinent via table `ORDRE_PROXIMITE_DISTANCE`, sinon
  repli sur estimation Riegel avec message explicite.
- `verifierCoherenceRecord()` : Ã©carte un record si son Ã©cart Ã  l'estimation Riegel
  moyenne (depuis les autres records) dÃ©passe 10%. DÃ©partage de symÃ©trie par date
  (le plus rÃ©cent gagne ; celui qui a une date gagne sur celui qui n'en a pas ; pas
  de tranchage si aucune date connue).

## 7. Moteur de plan (`v2/engine/plan-generator.js`)

Fonctions clÃ©s, dans l'ordre du pipeline de gÃ©nÃ©ration :
1. `computePhases` â€” dÃ©coupage du plan en phases (base, construction, affÃ»tage...)
2. `computeVolumeProgression` â€” progression du volume hebdo selon niveau/contraintes
3. `placerSemaine` â€” rÃ©partition des sÃ©ances dans la semaine
4. `genererContenuQualite` â€” gÃ©nÃ¨re le contenu dÃ©taillÃ© d'une sÃ©ance qualitÃ©,
   avec 12 sous-types (i-30-30, seuil, i-3min, vitesse, cotes, allure-course, etc.),
   chacun paramÃ©trÃ© par niveau (dÃ©butant/intermÃ©diaire/confirmÃ©) â€” voir
   `bibliotheque-seances.md` pour le dÃ©tail mÃ©thodologique complet
5. `genererContenuLongue`, `genererContenuTest`, `genererContenuRace`
6. `repartirVolumeSemaine`
7. `generatePlan` â€” orchestrateur principal

Adaptation dynamique du plan en cours de route :
- `calculerScoreSemaine` â€” score d'une semaine rÃ©alisÃ©e vs statuses
- `analyserAdaptations` â€” dÃ©tecte si une adaptation du plan est nÃ©cessaire
- `appliquerAdaptations` â€” applique l'adaptation aprÃ¨s confirmation utilisateur
- `regenererStructuresIntervalles`

**ACWR (Acute:Chronic Workload Ratio)** â€” section 33bis, chantier lancÃ© le
13 juillet 2026, validÃ© historiquement sur les donnÃ©es rÃ©elles de Laurent avant
codage (approche dÃ©cidÃ©e le 11 juillet). `calculerACWR(activitesStrava)` : Ã 
partir des activitÃ©s Strava rÃ©elles (type `Run` uniquement, jamais le plan
thÃ©orique), calcule pour chaque jour la charge aiguÃ« (somme des 7 derniers
jours) et la charge chronique (moyenne des 4 fenÃªtres de 7 jours sur 28 jours),
retourne l'historique quotidien complet + le dernier ratio connu. v1
volontairement simple : volume brut (km), sans pondÃ©ration FC ni allure â€”
TRIMP ou pondÃ©ration `SESSION_TARGETS` identifiÃ©s comme piste v2 si
nÃ©cessaire. Seuils : `ACWR_SEUIL_RISQUE` (1.5), `ACWR_SEUIL_VIGILANCE` (1.3),
`ACWR_SEUIL_SOUS_CHARGE` (0.8). Fonction pure, dupliquÃ©e dans
`engine-classic-scripts/plan-generator.classic.js` (sans export) pour
`index.html`. AffichÃ©e dans l'onglet Stats (`renderStats`, deux graphiques
empilÃ©s : charge aiguÃ« vs chronique, puis ratio avec zones colorÃ©es + texte
d'explication) â€” **pas encore intÃ©grÃ©e** comme second facteur dans
`analyserAdaptations()` (intÃ©gration dashboard reportÃ©e Ã  une session
sÃ©parÃ©e, dÃ©cision du 13 juillet).

Autres briques : gestion des rÃ©fÃ©rences de temps (`riegelPredict`, `computeAllures`),
zones FC (`computeFcMaxTanaka`, `computeZonesFC`), jalons de transition entre phases,
notes pratiques et repÃ¨res de ressenti injectÃ©s dans les sÃ©ances, cohÃ©rence de la
semaine test.

**Semaines de dÃ©charge** â€” chaque semaine du plan brut porte un champ boolÃ©en
`estDechargeSemaine` (`window.__PLAN_BRUT__.semaines[i].estDechargeSemaine`,
indexÃ© par `semaineNum`). DÃ©jÃ  affichÃ© cÃ´tÃ© wizard (`.decharge-tag`, orange
`--signal`). Ce champ n'existe PAS dans `PLAN`/`ALL_SESSIONS` (format traduit
v1 consommÃ© par `index.html` â€” ne connaÃ®t que `volumeCibleKm`/allures/statuts
par sÃ©ance) : toute lecture cÃ´tÃ© app doit repasser par `__PLAN_BRUT__.semaines`,
mÃªme pattern dÃ©jÃ  utilisÃ© pour `raceName`/`zoneFC`/etc. (cf. Â§2, commentaire du
chargement du plan). Helper ajoutÃ© le 13 juillet 2026 : `estSemaineDecharge(weekNum)`
(juste aprÃ¨s `phaseOf`), repli silencieux Ã  `false` si `__PLAN_BRUT__` ou le
champ est absent (plans gÃ©nÃ©rÃ©s avant l'introduction du champ).

## 8. IntÃ©grations externes

**Strava** (Client ID `260339`)
- OAuth gÃ©rÃ© par `api/strava.js` (auth/callback/refresh/activities)
- CÃ´tÃ© client : `v2/engine/strava.js` (tokens, calcul volume hebdo mÃ©dian)
- Comparaison sÃ©ance programmÃ©e vs laps rÃ©els : `activity.laps.slice(1, -2)`
  (exclut warmup + 2 derniers laps) filtrÃ© par allure cible Â±15%
  (`extractTargetSpeed`). L'API Strava n'expose que les laps rÃ©sultants, jamais la
  structure de programmation de la montre â€” approche par streams explorÃ©e et
  abandonnÃ©e (voir mÃ©moires, chantier "v2.0 streams", clos).
- `syncStrava()` (`index.html`) : demande toujours au moins 8 semaines
  d'historique en arriÃ¨re (`plan_start` = le plus ancien entre le vrai dÃ©but
  du plan et 8 semaines avant aujourd'hui), pas seulement depuis la date de
  dÃ©but du plan actuel â€” corrigÃ© le 13 juillet 2026, nÃ©cessaire pour que
  l'ACWR ait toujours assez de recul mÃªme sur un plan qui vient de dÃ©marrer.
  `activitesDuPlan()` continue de filtrer correctement sur `dateDebutPlan`
  indÃ©pendamment de ce qui est chargÃ© en amont (aucun effet de bord sur le
  "Km courus" du bloc Infos de Stats).

**MÃ©tÃ©o** â€” proxy Open-Meteo (`api/weather.js`), gratuit, sans clÃ© API. Alerte
chaleur si tempÃ©rature max prÃ©vue > 28Â°C. Utilise la gÃ©olocalisation GPS rÃ©elle,
pas une ville saisie manuellement. Limite actÃ©e Ã  revoir si passage en usage
commercial (v2.5).

**Coach (messages courts)** â€” `api/coach.js`, proxy vers Claude Haiku 4.5
(`claude-haiku-4-5-20251001`), 150 tokens max.

**Sync multi-device** â€” GitHub Gist via token personnel (`lk_github_token`),
gÃ©rÃ© par `v2/engine/gist-sync.js` (`chargerPlans`, `sauvegarderPlan`,
`supprimerPlan`, `renommerPlan`, dÃ©tection de conflit de dates entre plans).

## 8bis. Authentification Supabase (v2.5, chantier lancÃ© le 13 juillet 2026)

**Contexte** â€” prÃ©requis identifiÃ© pour la publication Play Store (Â§9,
v2.5 commercialisation) : une app multi-utilisateur nÃ©cessite un vrai
backend d'auth et de stockage serveur, pas uniquement `localStorage`
cÃ´tÃ© device. DÃ©cision : Supabase (Postgres + Auth), plan gratuit pour
dÃ©marrer (500 Mo, 50k utilisateurs actifs mensuels inclus â€” largement
suffisant Ã  l'Ã©chelle actuelle). Projet crÃ©Ã©, URL et clÃ© `anon`
(publique par conception) en dur dans `auth.js`/`auth.classic.js` â€” la
clÃ© `service_role`, elle, ne doit jamais apparaÃ®tre cÃ´tÃ© client.

**SchÃ©ma base de donnÃ©es** â€” 4 tables, RLS (Row Level Security) activÃ©
partout dÃ¨s le dÃ©part (Ã©quivalent serveur du principe de prÃ©fixage
`lk_` dÃ©jÃ  en place) :
- `profils_coureur` (`user_id` clÃ© primaire â†’ `auth.users`, `data` JSONB)
  â€” remplace `lk_profil_coureur`
- `plans` (`id` UUID, `user_id`, `plan_brut` JSONB) â€” remplace
  `window.__PLAN_BRUT__` actuellement stockÃ© via le Gist
- `plan_donnees` (`plan_id` clÃ© primaire, `user_id` dupliquÃ© pour
  simplifier les policies RLS, `data` JSONB) â€” regroupe toutes les
  clÃ©s prÃ©fixÃ©es par plan (`lk_statuses`, `lk_hidden_sessions`,
  `lk_notes`, `lk_race_goal`, etc., cf. Â§5) en un seul objet
- `integrations` (`user_id` clÃ© primaire, tokens Strava/GitHub/Gist)
  â€” table sÃ©parÃ©e car donnÃ©es sensibles, isolÃ©es du reste
- Trigger gÃ©nÃ©rique `set_updated_at()` sur les 4 tables

**Incident rÃ©solu pendant les tests** (13 juillet 2026) â€” plusieurs
Ã©checs de connexion en apparence liÃ©s Ã  un mauvais mot de passe
provenaient en rÃ©alitÃ© de la **limite d'envoi d'emails du plan gratuit
Supabase**, Ã©puisÃ©e par les tests rÃ©pÃ©tÃ©s (confirmation d'inscription
et reset de mot de passe Ã©chouaient silencieusement ou avec l'erreur
`email rate limit exceeded`). RÃ©solu en dÃ©sactivant "Confirm email"
dans Authentication â†’ Providers â†’ Email â€” dÃ©cision assumÃ©e pour un
usage familial/perso : un compte s'active immÃ©diatement Ã 
l'inscription, sans dÃ©pendre d'un email qui peut Ãªtre retardÃ©,
bloquÃ©, ou en spam. Point de vigilance si l'app s'ouvre un jour Ã 
des utilisateurs externes non familiers : reconsidÃ©rer l'activation
de la confirmation email Ã  ce moment-lÃ .

**Bug de production dÃ©couvert et corrigÃ©** (13 juillet 2026, aprÃ¨s premier
dÃ©ploiement sur `main`) â€” un compte ayant dÃ©jÃ  une synchronisation Gist
active (`lk_github_token` configurÃ© avant la migration) se retrouvait
aprÃ¨s connexion sur le **plan de repli par dÃ©faut**, avec le sÃ©lecteur
de plan disparu et l'historique incorrect. Cause : `window.__PLAN_PRET__`
(qui appelle `chargerPlans()`, dÃ©pendante de `lk_github_token` en
`localStorage`) dÃ©marrait en parallÃ¨le de `window.__AUTH_PRET__` (qui
restaure ce mÃªme token depuis Supabase via `LkSync.precharger`), sans
dÃ©pendance entre les deux â€” une course que `chargerPlans()` pouvait
gagner, trouvant `localStorage` encore vide et Ã©chouant silencieusement
sur le repli. CorrigÃ© en ajoutant `await window.__AUTH_PRET__;` en tout
dÃ©but de la dÃ©finition de `window.__PLAN_PRET__`, garantissant que le
token est restaurÃ© avant toute tentative de chargement Gist. CoÃ»t
acceptÃ© : le premier rendu attend dÃ©sormais la rÃ©solution de l'auth
Supabase avant de tenter le Gist (lÃ©gÃ¨rement plus lent qu'avant, mais
correct plutÃ´t que rapide-et-faux). Pousser une correction en production
sans repasser par une branche de test Ã©tait un raccourci pris sciemment
ce jour-lÃ  (auth.js/auth.classic.js avaient dÃ©jÃ  atterri sur `main` par
inadvertance plus tÃ´t dans la session) â€” Ã  Ã©viter en temps normal, y
revenir en pratique standard dÃ¨s que ce chantier n'est plus en phase
de dÃ©couverte active.

**Vraie cause racine identifiÃ©e aprÃ¨s la premiÃ¨re correction** â€” la
correction de l'ordre de course (ci-dessus) Ã©tait nÃ©cessaire mais pas
suffisante. Le vrai problÃ¨me : ce compte avait `lk_github_token` en
`localStorage` **depuis avant** la mise en place de la synchronisation
Supabase (13 juillet 2026) ; comme aucune migration rÃ©troactive
n'existait, `precharger()` n'avait rigoureusement rien Ã  restaurer cÃ´tÃ©
Supabase (`integrations.github_token` = `null` pour ce compte, confirmÃ©
en Table Editor), donc le token restait `null` en `localStorage` mÃªme
une fois l'ordre de course corrigÃ©, et `chargerPlans()` Ã©chouait faute
d'authentification GitHub.

**Correctif : `migrerDonneesExistantes(userId, planId)`** ajoutÃ©e dans
`sync-storage.js`/`sync-storage.classic.js` â€” migration one-shot par
appareil (marqueurs `lk_migration_supabase_globale_faite` et
`lk_migration_supabase_plan_faite_<planId>` en `localStorage`,
distincts l'un de l'autre car le `planId` n'est pas encore connu au
tout premier appel) qui pousse vers Supabase les donnÃ©es dÃ©jÃ 
prÃ©sentes en `localStorage` **avant** que `precharger()` ne les
Ã©crase. AppelÃ©e juste avant chaque appel Ã  `precharger()` dans
`index.html`, aux deux points de prÃ©chargement (sans `planId` juste
aprÃ¨s connexion, puis avec le vrai `planId` une fois le plan chargÃ©).
En cas d'Ã©chec rÃ©seau, les marqueurs ne sont pas posÃ©s, pour retenter
au prochain appel plutÃ´t que d'abandonner silencieusement.

**Deux incidents supplÃ©mentaires dÃ©couverts et corrigÃ©s lors du test
de production du 13 juillet 2026** (aprÃ¨s les deux premiers,
ci-dessus) :

1. **Bouton de dÃ©connexion manquant** â€” `LkAuth.deconnecter()`
   existait dans `auth.js`/`auth.classic.js` depuis le dÃ©but du
   chantier, mais aucun bouton dans l'interface n'y donnait accÃ¨s.
   CorrigÃ© : section "ðŸ‘¤ Compte" ajoutÃ©e en tÃªte de `renderSettings()`
   dans `index.html`, avec confirmation avant dÃ©connexion et
   rechargement de page ensuite.

2. **Perte de donnÃ©es du profil coureur (poids, taille, records
   personnels)** â€” au cours des multiples tests de connexion/
   dÃ©connexion effectuÃ©s avant que `migrerDonneesExistantes()` existe,
   le prÃ©chargement Supabase (qui, Ã  l'Ã©poque, ne trouvait rien cÃ´tÃ©
   serveur) a Ã©crasÃ© un `localStorage` qui contenait encore les
   bonnes valeurs. Une fois la migration ajoutÃ©e, c'est cette version
   dÃ©jÃ  appauvrie qui a Ã©tÃ© migrÃ©e vers Supabase â€” confirmÃ©e identique
   des deux cÃ´tÃ©s (`poids`, `taille`, `records` tous `null`, alors que
   `nom`/`prenom`/`fcMax` Ã©taient corrects). **Aucune copie de secours
   trouvÃ©e** (pas d'autre appareil avec les donnÃ©es intactes) ;
   Laurent a dÃ» ressaisir ces champs manuellement dans RÃ©glages.
   Aucune action corrective cÃ´tÃ© code â€” c'est un risque inhÃ©rent Ã 
   avoir testÃ© en conditions rÃ©elles sur un compte rÃ©el pendant que
   la logique de migration Ã©tait encore incomplÃ¨te, pas un bug
   rÃ©current une fois `migrerDonneesExistantes()` en place.

3. **Wizard `v2/index.html` accidentellement Ã©crasÃ©** â€” Ã  un moment de
   la session, `public/index.html` (l'app, avec Ã©cran d'auth) a Ã©tÃ©
   poussÃ© par erreur vers `public/v2/index.html` au lieu de
   `public/index.html`, remplaÃ§ant intÃ©gralement le vrai wizard de
   crÃ©ation de plan. SymptÃ´me : cliquer sur "ðŸ Configurer un plan"
   affichait un flash de l'Ã©cran de connexion puis revenait Ã  l'app,
   sans jamais atteindre le wizard. RestaurÃ© en rÃ©cupÃ©rant la version
   prÃ©cÃ©dente via l'historique des commits GitHub (onglet History du
   fichier) et en la repoussant au bon endroit. Point de vigilance
   retenu : `public/index.html` et `public/v2/index.html` sont deux
   fichiers distincts au nom identique (`index.html`) dans des dossiers
   diffÃ©rents â€” vÃ©rifier le chemin affichÃ© sur GitHub avant chaque
   commit, en particulier lors d'un glisser-dÃ©poser.

**Ã‰tat de fin de session (13 juillet 2026)** : authentification,
dÃ©connexion, sÃ©lecteur de plan et wizard tous fonctionnels en
production. La migration rÃ©troactive et le prÃ©chargement ont Ã©tÃ©
validÃ©s pour les tokens d'intÃ©gration (GitHub/Gist) sur un compte
rÃ©el. **Reste Ã  vÃ©rifier** : l'Ã©criture rÃ©elle vers `plan_donnees`
avec un vrai plan actif (UUID, pas le plan de repli) â€” non testÃ©e
explicitement cette session, cf. plus bas.

**Deux derniers bugs dÃ©couverts et corrigÃ©s lors du test final de
synchronisation `plan_donnees`** (13 juillet 2026, sur un vrai plan
existant, id `250aae43-...`) :

4. **Contrainte de clÃ© Ã©trangÃ¨re violÃ©e (`plan_donnees_plan_id_fkey`)**
   â€” `plan_donnees.plan_id` rÃ©fÃ©rence `plans.id`, mais aucun code
   n'insÃ©rait jamais de ligne dans la table `plans` elle-mÃªme. Toute
   tentative d'Ã©criture vers `plan_donnees` Ã©chouait donc en 409, quel
   que soit le plan. CorrigÃ© : nouvelle fonction
   `assurerPlanExiste(userId, planId, planBrut)` dans
   `sync-storage.js`/`sync-storage.classic.js`, qui vÃ©rifie l'existence
   de la ligne et l'insÃ¨re si besoin (id, user_id, nom dÃ©duit du
   plan_brut, plan_brut complet). AppelÃ©e dans `index.html`
   **avant** `migrerDonneesExistantes`/`precharger` avec `planId`, dÃ¨s
   que `window.__PLAN_BRUT__.id` est connu.

5. **Erreur de conversion de date** (`date/time field value out of
   range`) sur `strava_expires`/`last_sync` â€” `synchroniserVersSupabase`
   envoyait le timestamp Unix brut (parfois en secondes, parfois en
   millisecondes selon l'origine dans `index.html`) directement vers
   une colonne `timestamptz`, sans conversion. CorrigÃ© : dÃ©tection du
   format (secondes si `< 1e12`) et conversion en ISO avant l'envoi.

**Confirmation finale de bout en bout** (13 juillet 2026, aprÃ¨s ces 5
corrections cumulÃ©es) : une sÃ©ance cochÃ©e sur un vrai plan
(`250aae43-2f9b-4f1c-a031-bb57a1b6ae90`) a Ã©tÃ© vÃ©rifiÃ©e prÃ©sente dans
`plan_donnees.data.lk_statuses` sur Supabase, avec les bonnes valeurs
(`"1-1": "âœ…"`, etc.). **La chaÃ®ne complÃ¨te â€” auth, migration
rÃ©troactive, crÃ©ation automatique de la ligne `plans`, et
synchronisation des statuts de sÃ©ances â€” est confirmÃ©e fonctionnelle
en conditions rÃ©elles**, pas seulement en thÃ©orie ou en test isolÃ©.

**Ce qui est fait** :
- SchÃ©ma SQL exÃ©cutÃ© avec succÃ¨s sur le projet Supabase
- Authentification par email + mot de passe (pas de magic link,
  dÃ©cision du 13 juillet â€” usage quotidien, friction du lien email Ã 
  chaque connexion jugÃ©e trop coÃ»teuse pour cet usage). Confirmation
  email dÃ©sactivÃ©e (cf. incident ci-dessus)
- `v2/engine/auth.js` crÃ©Ã© â€” source de vÃ©ritÃ©, module ES. Expose
  `supabase` (client), `monterEcranAuth(conteneurId)` (construit et
  affiche l'Ã©cran connexion/inscription, retourne une Promise rÃ©solue
  avec l'utilisateur dÃ¨s qu'une session est active), `deconnecter()`,
  `utilisateurActuel()`
- `engine-classic-scripts/auth.classic.js` crÃ©Ã© â€” copie dÃ©rivÃ©e,
  attache tout Ã  `window.LkAuth` (mÃªme pattern que les autres modules
  classic). NÃ©cessite le SDK Supabase chargÃ© en amont via
  `<script src="...supabase-js@2/dist/umd/supabase.min.js">`
  (jsdelivr) plutÃ´t qu'en import ES, cohÃ©rent avec le reste de
  `index.html`
- `index.html` modifiÃ© : conteneur `#ecran-auth-hote` juste aprÃ¨s
  `#app`, charge le SDK puis `auth.classic.js`, appelle
  `LkAuth.monterEcranAuth()` dont la promesse (`window.__AUTH_PRET__`)
  est attendue en tout dÃ©but de la deuxiÃ¨me IIFE (avant mÃªme la
  dÃ©claration de `STRAVA_CLIENT_ID`), donc avant toutes les lectures
  `load()` qui suivent plus bas dans le mÃªme script
- **TestÃ© en conditions rÃ©elles** sur preview Vercel (branche
  `test-auth-supabase`) : inscription, connexion, dÃ©connexion, session
  persistante au rechargement â€” fonctionnel de bout en bout
- **Migration localStorage â†’ Supabase, premier jet implÃ©mentÃ©**
  (13 juillet 2026) â€” stratÃ©gie retenue : plutÃ´t que de rendre
  asynchrones les ~22 lectures synchrones `let x = load(clePourPlan(...))`
  qui initialisent l'Ã©tat au chargement de `index.html` (risque Ã©levÃ©
  de casser le sÃ©quencement sur un fichier de 5000+ lignes), on
  prÃ©charge toutes les donnÃ©es Supabase dans `localStorage` AVANT que
  ces lignes s'exÃ©cutent. `load()`/`save()` restent inchangÃ©es dans
  leur usage par le reste du fichier ; `save()` dÃ©clenche en plus une
  synchronisation vers Supabase en arriÃ¨re-plan (fire-and-forget, ne
  bloque pas l'affichage)
  - `v2/engine/sync-storage.js` (source) et sa copie
    `engine-classic-scripts/sync-storage.classic.js` (`window.LkSync`)
    crÃ©Ã©s : `precharger(userId, planId)` et
    `synchroniserVersSupabase(userId, planId, cle, valeur)`
  - Deux passes de prÃ©chargement dans `index.html` : une premiÃ¨re
    juste aprÃ¨s connexion (sans `planId`, pas encore connu â€” couvre
    `lk_profil_coureur` et les clÃ©s `integrations`), une seconde une
    fois `window.__PLAN_BRUT__.id` disponible (couvre les clÃ©s
    prÃ©fixÃ©es par plan, regroupÃ©es dans `plan_donnees.data`)
  - Routage par table dans `synchroniserVersSupabase` : `lk_profil_coureur`
    â†’ table `profils_coureur` ; tokens Strava/GitHub/Gist â†’ table
    `integrations` ; `lk_weather_cache` volontairement non synchronisÃ©
    (donnÃ©e re-gÃ©nÃ©rable) ; toutes les autres clÃ©s prÃ©fixÃ©es par plan
    â†’ table `plan_donnees`, regroupÃ©es dans une seule colonne JSONB
  - **Limite connue assumÃ©e** : l'Ã©criture vers `plan_donnees` fait un
    `select` puis un `upsert` Ã  chaque sauvegarde (pour ne pas Ã©craser
    les autres clÃ©s du mÃªme objet JSON) â€” deux appels rÃ©seau au lieu
    d'un. Acceptable en l'Ã©tat, Ã  revoir si Ã§a devient un problÃ¨me de
    performance perceptible
  - **TestÃ© en production le 13 juillet** avec un compte rÃ©el ayant
    dÃ©jÃ  une sync Gist active â€” a rÃ©vÃ©lÃ© le bug de course puis le
    besoin de migration rÃ©troactive documentÃ©s ci-dessus. AprÃ¨s les
    deux correctifs, en attente de re-confirmation sur ce mÃªme compte
    avant de considÃ©rer la migration validÃ©e de bout en bout

**Suite de la session â€” tout ce qui a Ã©tÃ© fait aprÃ¨s les 5 bugs
ci-dessus** (13 juillet 2026, jusqu'Ã  publication de la v2.5) :

- **Wizard protÃ©gÃ© par authentification** â€” `v2/index.html` monte le
  mÃªme Ã©cran de connexion que l'app (bloc `#ecran-auth-hote` +
  `auth.classic.js`) avant d'afficher son contenu. Un plan ne peut
  plus Ãªtre crÃ©Ã© sans utilisateur associÃ©.
- **Sync du plan dÃ¨s sa crÃ©ation dans le wizard** â€”
  `sauvegarderPlanUI()` appelle `LkSync.assurerPlanExiste()` juste
  aprÃ¨s la sauvegarde Gist (best-effort, non bloquant si Supabase
  Ã©choue). Chargement de `sync-storage.classic.js` ajoutÃ© au wizard.
- **Sync de la suppression** â€” `supprimerPlanUI()` supprime aussi la
  ligne `plans` correspondante sur Supabase ; `plan_donnees` suit par
  `ON DELETE CASCADE` (dÃ©jÃ  dans le schÃ©ma SQL, un seul appel suffit).
- **Nettoyage de RÃ©glages** â€” retirÃ©s : section "â˜ï¸ Sauvegarde
  cloud" (token GitHub manuel), QR code de transfert d'appareil,
  toggle "Options avancÃ©es" (devenu vide), fonctions
  `nettoyerNotesMeteoDupliquees()` et `regenererStructuresIntervallesUI()`
  (plus d'appelant). Tout redondant avec la sync Supabase automatique
  au login.
- **Variables d'environnement Vercel** â€” clÃ©s Supabase dÃ©placÃ©es du
  code vers `SUPABASE_URL`/`SUPABASE_ANON_KEY` sur Vercel, exposÃ©es au
  client via une nouvelle route `api/config.js`. `auth.js`/
  `auth.classic.js` font un `fetch('/api/config')` avant de crÃ©er le
  client (`export let supabase` + `export const supabaseReady`,
  plutÃ´t qu'un `export const supabase` figÃ© â€” tout appelant doit
  attendre `supabaseReady`). Route ajoutÃ©e Ã  `vercel.json` (absente
  initialement du routing explicite, causait un 404).
- **File d'attente de synchronisation** â€” tout Ã©chec d'Ã©criture
  (`profils_coureur`, `integrations`, `plan_donnees`) est mis en file
  dans `localStorage` (`lk_file_attente_sync`) plutÃ´t qu'abandonnÃ©.
  RejouÃ©e au retour rÃ©seau (`online`) et toutes les 5 min en secours.
  Abandon aprÃ¨s 10 essais infructueux.
- **Supabase Realtime** â€” dÃ©cision : ne pas supprimer `localStorage`
  (chantier jugÃ© disproportionnÃ© vu le risque sur ce fichier), mais
  combler son vrai defaut (pas de rafraÃ®chissement entre appareils)
  via Realtime. `activerRealtime(planId, onChangement)` s'abonne aux
  changements sur `plan_donnees` filtrÃ©s par `plan_id` ; anti-Ã©cho par
  fenÃªtre de 3s (`marquerEchoLocal`) pour ignorer les Ã©vÃ©nements
  provoquÃ©s par ses propres Ã©critures. Publication `supabase_realtime`
  activÃ©e manuellement sur `plan_donnees` cÃ´tÃ© Supabase (Database â†’
  Publications) â€” nÃ©cessaire, pas actif par dÃ©faut sur une nouvelle
  table. `profils_coureur`/`integrations`/`plans` volontairement pas
  couverts (changements trop rares pour justifier le code
  supplÃ©mentaire ; Ã  ajouter si besoin rÃ©el constatÃ©).
- **Version affichÃ©e passÃ©e Ã  v2.5, bandeau rendu dynamique** â€” entrÃ©e
  ajoutÃ©e en tÃªte de `VERSIONS` dans `index.html`. Le bandeau header
  (`el("div",...)` juste avant `"Â· plan-10k-alpha.vercel.app"`)
  affichait un numÃ©ro figÃ© en dur, retrouvÃ© bloquÃ© sur `v1.8.15` alors
  que l'app Ã©tait dÃ©jÃ  en v2.3 â€” oubliÃ© Ã  chaque mise Ã  jour depuis
  plusieurs versions. CorrigÃ© en sortant `const VERSIONS` de
  `buildVersionSection()` pour la rendre accessible dans tout
  `renderSettings()` (mÃªme scope de fonction), et en faisant lire au
  bandeau `VERSIONS[0].ver` plutÃ´t qu'une chaÃ®ne Ã©crite Ã  la main. Le
  bandeau suit maintenant automatiquement la premiÃ¨re entrÃ©e du
  tableau, plus de risque d'oubli futur.

**Restant** (aucun bloquant pour l'usage courant) :
- Confirmation email Supabase dÃ©sactivÃ©e (cf. incident plus haut) â€”
  Ã  reconsidÃ©rer si l'app s'ouvre un jour Ã  des utilisateurs externes
  non familiers
- `localStorage` reste un doublon volontaire de Supabase (pas
  supprimÃ©, cf. dÃ©cision Realtime ci-dessus) â€” cache local + source de
  vÃ©ritÃ© distante, pas une vraie source unique

## 9. Ã‰tat des chantiers (au 13/07/2026)

| Chantier | Statut |
|---|---|
| v1â†’v2 switch | âœ… Clos (7 juillet) |
| v2.1 adaptation dynamique + harmonisation visuelle | âœ… Clos (8 juillet) |
| v2.0 streams (dÃ©tection effort rÃ©el) | âœ… Clos â€” approche streams abandonnÃ©e, laps+filtre allure retenu |
| v2.2 mÃ©thodologie (12 sous-types par niveau) | âœ… Clos (11 juillet) |
| v2.2 nettoyage technique (suppression backup v1) | âœ… Clos (11 juillet, commit 7c9f0cb) |
| v2.3 profil coureur unifiÃ© + cohÃ©rence records | âœ… Clos (12 juillet, commits 81dd647, d37eaf3, 0e4969d) |
| Connecteur MCP GitHub custom (remplacer PAT) | âŒ AbandonnÃ© (12 juillet) â€” OAuth App trop lourd pour l'usage |
| DÃ©-duplication moteur/classic (`type="module"`) | â¸ï¸ ReportÃ© â€” trop risquÃ© Ã  chaud |
| ACWR (Acute:Chronic Workload Ratio) | ðŸŸ¡ En cours (13 juillet) â€” moteur + graphique Stats codÃ©s, intÃ©gration dashboard (analyserAdaptations) reportÃ©e |
| Harmonisation visuelle app/wizard (titre + aide dans le header) | âœ… Clos (13 juillet) |
| Badge "DÃ©charge" dans l'onglet Semaines (`renderWeeks`) | âœ… Clos (13 juillet) |
| Rework prÃ©sentation wizard | ðŸ”œ Ã€ revalider avec Laurent |
| v2.5 authentification Supabase | âœ… **PubliÃ©e** (13 juillet) â€” auth, migration rÃ©troactive, wizard protÃ©gÃ©, sync temps rÃ©el (Realtime), file d'attente, variables d'env Vercel, RÃ©glages nettoyÃ©s |
| v2.5 commercialisation (Stripe) | ðŸ”œ Non commencÃ© |
| **Publication Play Store (TWA)** | ðŸŸ¡ **En cours** (13 juillet) â€” voir Â§11 pour le dÃ©tail complet |

## 10. Principes transverses Ã  retenir

- **Inventaire Ã  jour Ã  chaque push** â€” toute modification poussÃ©e sur le repo qui
  change la structure des fichiers, les Ã©crans, les clÃ©s de stockage, les
  intÃ©grations externes, le pipeline du moteur ou l'Ã©tat d'un chantier doit
  s'accompagner d'une mise Ã  jour de ce fichier (`inventaire-application.md`)
  dans le mÃªme push. Objectif : ce document reste la rÃ©fÃ©rence fiable Ã  relire
  en dÃ©but de session, sans dÃ©rive par rapport au code rÃ©el. Un push qui laisse
  l'inventaire obsolÃ¨te est considÃ©rÃ© incomplet, au mÃªme titre qu'un push qui
  casserait la syntaxe JS.
  MÃ©canique retenue avec Claude (13 juillet 2026) : dÃ¨s qu'un fichier destinÃ© Ã 
  Ãªtre poussÃ© sur GitHub est fourni en sortie de conversation, l'inventaire mis
  Ã  jour est fourni avec, sans que l'utilisateur ait Ã  le redemander â€” pas
  besoin de signaler explicitement qu'un push a eu lieu.
- **Prefixage des donnÃ©es de plan** obligatoire (`clePourPlan()`) â€” clÃ© globale non
  prÃ©fixÃ©e = risque de contamination inter-plans.
- **Un seul variable modifiÃ©e Ã  la fois** pour la progressive overload (raison de la
  refonte i-30-30).
- **Niveau intermÃ©diaire = valeur historique inchangÃ©e** Ã  chaque ajout de
  diffÃ©renciation par niveau (zÃ©ro rÃ©gression).
- **Validation historique avant codage** pour toute nouvelle mÃ©trique d'adaptation
  (ex. ACWR) â€” vÃ©rifier que Ã§a "sonne juste" sur les donnÃ©es rÃ©elles de Laurent
  avant d'investir dans la complexitÃ©.
- **ES modules obligatoires** pour les fonctions Vercel/Netlify ; jamais
  d'apostrophe dans une chaÃ®ne JS entre guillemets doubles (Ã©chec silencieux du
  parseur) ; vÃ©rification syntaxique systÃ©matique aprÃ¨s modification.
- **404 sur une route API** â†’ vÃ©rifier `vercel.json` en premier (pas un fichier
  manquant).
- **Ã‰criture GitHub via connecteur MCP indisponible** â€” le connecteur GitHub
  connectÃ© (`Push Github ...`) peut lire le repo (`get_file_contents`,
  `search_code` une fois indexÃ©) mais **Ã©choue systÃ©matiquement en Ã©criture**
  (`create_or_update_file`, 403 "Resource not accessible by integration"),
  malgrÃ© les permissions Contents Read+Write du token PAT. Pattern Ã©tabli :
  Claude prÃ©pare le contenu final exact et le fournit Ã  copier-coller, Laurent
  le colle et commit manuellement sur GitHub.com. Rediscuter si le connecteur
  Ã©volue.

## 11. Publication Play Store (TWA / Bubblewrap) â€” chantier ouvert le 13/07/2026

**Choix d'architecture** : TWA (Trusted Web Activity) via Bubblewrap plutÃ´t que
Capacitor â€” l'app Ã©tant dÃ©jÃ  une PWA conforme (manifest, service worker, HTTPS),
le TWA est un wrapper quasi sans code natif. Mises Ã  jour de contenu (99% des cas)
ne nÃ©cessitent aucune re-publication : le TWA charge directement le site en
production, donc un `git push` + dÃ©ploiement Vercel suffit. Seuls les changements
touchant l'app native elle-mÃªme (icÃ´ne, nom, permissions, thÃ¨me) nÃ©cessitent de
regÃ©nÃ©rer et re-soumettre un `.aab`.

**Setup local (machine de Laurent, Windows/CMD)** â€” mis en place le 13 juillet,
douloureux mais one-shot, ne sera pas Ã  refaire :
- JDK 17 (Eclipse Temurin) installÃ© manuellement en `C:\Java\jdk-17.0.19+10`
  (zip, pas de `.msi` disponible) + variables systÃ¨me `JAVA_HOME` et ajout au `Path`
- Android SDK existant en `C:\Users\olaya\AppData\Local\Android\Sdk`, complÃ©tÃ©
  manuellement avec `cmdline-tools/latest` (tÃ©lÃ©chargÃ© sÃ©parÃ©ment, structure
  stricte requise) et le paquet legacy `tools` (requis spÃ©cifiquement par
  Bubblewrap 1.24.1, qui cherche `tools/bin/sdkmanager.bat` et non
  `cmdline-tools/latest/bin/sdkmanager.bat`) + variables systÃ¨me `ANDROID_HOME`
  et `ANDROID_SDK_ROOT`
- **Bug JAXB/Java 17** : le vieux `sdkmanager` embarquÃ© dans `tools/` plante
  avec `NoClassDefFoundError: javax/xml/bind/...` (module retirÃ© depuis Java 11).
  CorrigÃ© en copiant manuellement 7 jars JAXB (`jaxb-api-2.3.1`,
  `jaxb-runtime-2.3.2`, `jakarta.xml.bind-api-2.3.2`,
  `jakarta.activation-api-1.2.1`, `txw2-2.3.2`, `istack-commons-runtime-3.0.8`,
  `stax-ex-1.8.1`, `FastInfoset-1.2.16` â€” rÃ©cupÃ©rÃ©s depuis
  `cmdline-tools/latest/lib/external/...`, dÃ©jÃ  prÃ©sents localement) dans
  `Sdk/tools/lib/`, puis en Ã©ditant `tools/bin/sdkmanager.bat` pour les
  prÃ©fixer manuellement Ã  la variable `CLASSPATH`.
- **Bug de signature Bubblewrap** : `bubblewrap build` Ã©choue systÃ©matiquement
  Ã  la derniÃ¨re Ã©tape (signature de l'APK/AAB) avec `BadPaddingException` /
  "Wrong password?", en rÃ©utilisant en cache un ancien couple de mots de passe
  au lieu de ceux fraÃ®chement saisis â€” reproductible sur plusieurs projets
  gÃ©nÃ©rÃ©s Ã  zÃ©ro. Contournement systÃ©matique : signer manuellement avec
  `apksigner.jar` en ligne de commande une fois le build (non signÃ©) gÃ©nÃ©rÃ© :
  ```
  java -jar <SDK>/build-tools/34.0.0/lib/apksigner.jar sign --ks android.keystore
    --ks-key-alias android --out app-release-signed.apk app-release-unsigned-aligned.apk
  ```
  Ã€ refaire Ã  l'identique pour le futur `.aab` de publication si le mÃªme bug
  se reproduit.
- Projet Android final : `C:\Users\olaya\runbylea-android-v3\` (v1 et v2
  abandonnÃ©s en cours de route Ã  cause de la casquette de bugs ci-dessus,
  jamais nettoyÃ©s â€” sans consÃ©quence, hors repo Git). Contient
  `android.keystore` (jamais committÃ©, mots de passe connus de Laurent
  uniquement, **critique de ne jamais le perdre** : irremplaÃ§able pour toute
  future mise Ã  jour Play Store une fois publiÃ©) et `app-release-signed.apk`.

**Digital Asset Links (`assetlinks.json`)** â€” nÃ©cessaire pour que l'app
s'ouvre en plein Ã©cran (TWA) plutÃ´t qu'en Chrome Custom Tab (barre d'adresse
visible). DÃ©ployÃ© Ã  `public/.well-known/assetlinks.json`, contient le SHA256
du certificat de signature (`keytool -list -v -keystore android.keystore
-alias android`, chercher la ligne SHA256). **Bug de diagnostic notable** :
l'outil web Google "Statement List Generator" a affichÃ© une erreur "No app
deep linking permission found" alors que le fichier Ã©tait en rÃ©alitÃ©
parfaitement valide (confirmÃ© par l'API rÃ©elle
`digitalassetlinks.googleapis.com/v1/statements:list` en GET direct
navigateur, qui a rÃ©pondu correctement) â€” ne pas se fier Ã  cet outil web en
cas de doute, prÃ©fÃ©rer l'appel API direct.

**Vraie cause de la barre d'adresse persistante** (rÃ©solue) : ce n'Ã©tait ni
`assetlinks.json` ni un problÃ¨me de cache MIUI â€” c'Ã©tait simplement une
**ancienne version de l'app** (signÃ©e avec un ancien keystore/fingerprint,
projet v1 ou v2) qui restait installÃ©e sur le tÃ©lÃ©phone malgrÃ© plusieurs
tentatives de dÃ©sinstallation/rÃ©installation manuelle depuis l'interface
MIUI. DiagnostiquÃ© via ADB (`adb shell pm get-app-links <package>`, qui
affiche le fingerprint rÃ©ellement enregistrÃ© par le systÃ¨me) puis rÃ©solu en
dÃ©sinstallant/rÃ©installant **via ADB** (`adb uninstall` / `adb install`)
plutÃ´t que depuis l'interface tÃ©lÃ©phone â€” nÃ©cessite d'activer "Installer via
USB" dans les Options dÃ©veloppeur MIUI (dÃ©sactivÃ© par dÃ©faut, bloque
silencieusement `adb install` avec `INSTALL_FAILED_USER_RESTRICTED` sinon).
AprÃ¨s cette install propre, `pm get-app-links` a confirmÃ© `verified` et
l'app s'est ouverte correctement en plein Ã©cran avec la bonne icÃ´ne.
**LeÃ§on retenue** : en cas de comportement incohÃ©rent sur MIUI aprÃ¨s
plusieurs rÃ©installations manuelles, vÃ©rifier via ADB quelle version/
fingerprint est rÃ©ellement installÃ©e avant de chercher ailleurs.

**Package Android** : `app.vercel.plan_10k_alpha.twa`
**Domaine associÃ©** : `plan-10k-alpha.vercel.app`

**Assets store prÃ©parÃ©s** :
- IcÃ´ne source : `public/icon.svg` (silhouette coureur orange, dÃ©jÃ  en prod)
- Feature graphic (1024Ã—500) : composÃ© en SVG, version horizontale validÃ©e
  (icÃ´ne Ã  gauche, texte Ã  droite, fond sombre avec courbes de route) â€”
  Ã  exporter en PNG et uploader
- Textes de fiche store (titre, description courte/longue, catÃ©gorie,
  mots-clÃ©s) rÃ©digÃ©s, ton "produit public" (vouvoiement implicite, sans
  "ton/ta") â€” fournis Ã  Laurent, pas encore commitÃ©s nulle part (pas
  pertinent pour le repo, vivent dans Play Console directement)
- `public/privacy.html` rÃ©digÃ©e et fournie Ã  dÃ©ployer (couvre : email,
  profil coureur, localisation, donnÃ©es Strava ; stockage Supabase avec RLS ;
  partage limitÃ© Ã  Strava/Open-Meteo/Anthropic Ã  des fins strictement
  fonctionnelles, jamais publicitaire ; droit Ã  la suppression)
- Guide de remplissage Data Safety Play Console fourni (catÃ©gories Ã  cocher :
  informations personnelles, localisation approximative, santÃ© et fitness ;
  aucun partage tiers Ã  visÃ©e publicitaire ; chiffrement en transit ;
  suppression possible sur demande)

**DÃ©cision de diffusion** (13 juillet 2026) : l'app restera en **piste de test
interne** sur Play Console, pas en production. Visible uniquement par les emails
ajoutÃ©s explicitement comme testeurs (Laurent, et famille/proches si besoin) â€”
non trouvable par recherche publique, non installable par des inconnus. CohÃ©rent
avec l'Ã©tat actuel de l'app (mono-utilisateur, Supabase encore jeune). Le passage
en production reste possible Ã  tout moment plus tard, c'est un choix explicite Ã 
faire dans Play Console, jamais automatique.

**Ã‰tat au 13/07/2026 fin de session** :
- âœ… TWA gÃ©nÃ©rÃ©, buildÃ©, signÃ© manuellement, **testÃ© en conditions rÃ©elles**
  sur le Xiaomi 11 de Laurent : plein Ã©cran confirmÃ© (`pm get-app-links` â†’
  `verified`), icÃ´ne correcte, auth Supabase fonctionnelle, gÃ©olocalisation
  fonctionnelle
- âœ… Compte dÃ©veloppeur Google Play crÃ©Ã©, 25$ payÃ©s, **vÃ©rification
  d'identitÃ© en cours** (dÃ©lai variable, quelques heures Ã  quelques jours)
- âœ… Politique de confidentialitÃ© rÃ©digÃ©e (Ã  dÃ©ployer sur `public/privacy.html`)
- âœ… Textes de fiche store rÃ©digÃ©s
- âœ… Feature graphic composÃ© et validÃ© (version horizontale)
- ðŸ”œ Captures d'Ã©cran (Ã  prendre directement sur le tÃ©lÃ©phone, pas encore fait)
- ðŸ”œ Classification du contenu (questionnaire Play Console, pas encore rempli)
- ðŸ”œ Data Safety form (guide fourni, pas encore rempli dans Play Console)
- ðŸ”œ CrÃ©ation de l'app dans Play Console + upload du `.aab` (bloquÃ© en
  attente de la validation du compte dÃ©veloppeur)
- ðŸ”œ Test en piste interne â€” **c'est la piste retenue, pas de passage en
  production prÃ©vu pour l'instant** (cf. dÃ©cision de diffusion ci-dessus)
- ðŸ”œ **AprÃ¨s premiÃ¨re publication uniquement** : remplacer le fingerprint
  dans `assetlinks.json` par celui de Play App Signing (Release > Setup >
  App Integrity dans Play Console) â€” diffÃ©rent du fingerprint local actuel,
  Google re-signe l'app avec sa propre clÃ© de gestion

## 12. Mode Forme (v2.6) â€” cÃ¢blÃ© de bout en bout

**Objectif** : un mode d'entraÃ®nement alternatif au plan course, pour le
maintien en forme hors prÃ©paration d'une Ã©chÃ©ance prÃ©cise (demandÃ© par
Laurent le 13 juillet 2026). Cadrage discutÃ© et validÃ© avant codage :

- **Mode alternatif, sans date de fin fixe** â€” remplace le plan course
  plutÃ´t que de s'y ajouter en complÃ©ment ; pas de switch libre entre les
  deux au sein d'un mÃªme plan.
- **Plan structurÃ©** (pas un simple journal de suivi), mais orientÃ©
  dÃ©veloppement gÃ©nÃ©ral plutÃ´t que prÃ©paration compÃ©titive.
- **ParamÃ¨tres d'entrÃ©e** : niveau + volume hebdo + Â« accent Â» au choix
  (VMA / Endurance / Polyvalent), pas de distance/date de course/objectif
  chrono.
- **Renouvellement dans le temps** : plan Â« glissant Â», qui s'ajuste par
  blocs de semaines plutÃ´t qu'une structure cyclique fixe ou un plan Ã  durÃ©e
  dÃ©terminÃ©e.
- **Affichage** : mÃªme dashboard que le mode course (`index.html`), pas de
  vue sÃ©parÃ©e â€” `plan.mode` sert de discriminant, les blocs spÃ©cifiques Ã  la
  course (compte Ã  rebours, phases, jour J) se masquent en mode Forme.
  DÃ©cision motivÃ©e par la rÃ©utilisation directe de l'ACWR, des Stats, de la
  sÃ©ance du jour, de la sync Strava et du suivi de statuts, tous dÃ©jÃ 
  indÃ©pendants de la notion de date de course.
- **Contenu des sÃ©ances qualitÃ©** : registre volontairement diffÃ©rent du
  moteur course â€” dans l'esprit Â« jeu avec l'allure Â» (fartlek Ã  fourchette
  d'allure T-I sans dÃ©coupage en blocs fixes, pyramidale sur allure seuil
  plutÃ´t que VMA) plutÃ´t que le protocole chronomÃ©trÃ© strict des sÃ©ances
  course. DÃ©cision explicite pour que le mode Forme ne soit pas juste
  Â« un plan course sans date Â».

### 12.1 Moteur â€” `plan-forme.js`

`public/v2/engine/plan-forme.js` (+ copie classic
`public/engine-classic-scripts/plan-forme.classic.js`, chargÃ©e aprÃ¨s
`plan-generator.classic.js`) â€” module ES codÃ© et testÃ©
(`test-plan-forme.mjs`, 14 tests, tous passent). RÃ©utilise directement
`placerSemaine`, `genererContenuEF`, `genererContenuLongue`,
`repartirVolumeSemaine`, `computeFcMaxTanaka`, `computeZonesFC` de
`plan-generator.js` ; n'importe jamais `computePhases`,
`ROTATION_SOUS_TYPE`, `placerSeanceTest`, `placerSeanceCourse` ni
`injecterApprocheCourse`. Fonctions principales :

- `generatePlanForme(profil, params)` â€” gÃ©nÃ¨re un bloc glissant de N
  semaines (4 par dÃ©faut, `nbSemainesBloc` rÃ©glable). Retourne un plan avec
  `mode: 'forme'`, `accent`, `dateCloture` (optionnelle, cf. Â§12.4), pas de
  `phases`/`dateCourse`.
- `genererBlocSuivant(planPrecedent, profilOrigine, paramsOrigine)` â€”
  enchaÃ®ne le bloc suivant en repartant du plateau de volume atteint (pas de
  la derniÃ¨re semaine si celle-ci est une dÃ©charge), pour une progression
  continue sans redÃ©marrer de zÃ©ro ni reculer Ã  chaque enchaÃ®nement.
  `dateCloture` se propage automatiquement d'un bloc Ã  l'autre via l'Ã©talage
  de `paramsOrigine`.
- `computeAlluresForme` â€” variante de `computeAllures` sans zone C (allure
  course), les autres zones (recup/E/T/I/V) rÃ©utilisent `PACE_RATIOS` tel
  quel.
- `computeVolumeFormeSemaine` â€” plateau glissant (volume dÃ©part + 15% max,
  `MARGE_PROGRESSION_PLATEAU`), montÃ©e douce sur 3 semaines puis
  stabilisation, dÃ©charge -25% tous les 4 semaines (mÃªme rÃ¨gle que le moteur
  course).
- `genererContenuQualiteForme` + `ROTATION_SOUS_TYPE_FORME` â€” rotation par
  accent (`vma`/`endurance`/`polyvalent`), sous-types propres au mode Forme
  (`fartlek`, `pyramidale-forme`, `i-30-30-forme`, `cotes-forme`,
  `seuil-forme`), jamais ceux du moteur course.

Bug trouvÃ© et corrigÃ© pendant le dÃ©veloppement : le texte fartlek affichait
un double `/km` (`4:59/km et 4:18/km/km`) â€” `formatPace()` inclut dÃ©jÃ 
l'unitÃ©, il ne fallait pas la rajouter dans le gabarit du texte.

### 12.2 Wizard â€” `v2/index.html`

Ã‰cran de choix de mode (Â« Objectif course Â» vs Â« Mode forme Â»), affichÃ©
avant le wizard course existant, indÃ©pendant du systÃ¨me `data-step`
numÃ©rique pour ne rien dÃ©caler dans les rÃ©fÃ©rences existantes
(`totalSteps`/`current`). Flux Forme dÃ©diÃ© en 4 Ã©tapes (niveau + rÃ©fÃ©rence,
volume, jours, accent + date de clÃ´ture optionnelle), rÃ©utilise Strava, la
logique de jours et `renderResults()`/`rafraichirPlanComplet()` du wizard
course (rendues robustes aux champs absents `phases`/`dateCourse` via des
gardes `ESTMODEFORME`/`?.`). Import de `plan-forme.js` ajoutÃ© au
`<script type="module">` du wizard.

`resPlansSauvegardes` (liste des plans dÃ©jÃ  sauvegardÃ©s) dÃ©placÃ©e depuis
l'Ã©tape 1 du wizard course vers l'Ã©cran de choix de mode â€” c'est dÃ©sormais
le tout premier Ã©cran affichÃ©, donc le seul endroit garanti visible avant
tout choix de type de plan. Auparavant invisible tant que Â« Objectif course Â»
n'Ã©tait pas sÃ©lectionnÃ©.

### 12.3 Dashboard â€” `index.html`

`ESTMODEFORME` (`window.__PLAN_BRUT__?.mode === 'forme'`) sert de
discriminant global, dÃ©clarÃ© tÃ´t dans le fichier (avant tout usage) :

- `countdown()`/`DATE_COURSE_REFERENCE` : `null`-safe en mode Forme, plus de
  fausse date de repli.
- `PHASES` : repli neutre (une seule Â« phase Â» sans label, couvrant tout le
  bloc) en mode Forme, au lieu du faux repli historique 11 semaines qui
  aurait affichÃ© Ã  tort Â« Construction/SpÃ©cifique/AffÃ»tage Â».
- Badge Â« Jâ€“ Â» masquÃ© (header dashboard + header sticky), onglet Â« Course Â»
  retirÃ© de la nav (avec garde anti-crash si `view` y reste bloquÃ©e),
  banniÃ¨re post-course dÃ©sactivÃ©e, bloc `heroPred` (objectif/estimation
  chrono) masquÃ© en mode Forme.
- **Coach quotidien adaptÃ©** : prompt sans ligne Â« Estimation actuelleâ€¦ de
  l'objectif Â» en mode Forme ; intÃ¨gre l'ACWR de faÃ§on *implicite* â€” le
  ratio actuel (`calculerACWR(stravaActivities).dernierRatio`) est traduit
  en consigne de ton interne (prudent / neutre / encourageant selon les
  seuils `ACWR_SEUIL_RISQUE`/`ACWR_SEUIL_VIGILANCE`/
  `ACWR_SEUIL_SOUS_CHARGE`), injectÃ©e dans le prompt avec instruction
  explicite de ne jamais employer les termes techniques (Â« ACWR Â», Â« charge
  aiguÃ«/chronique Â»). S'applique en pratique Ã  tous les modes, pas
  seulement Forme, puisque l'ACWR est dÃ©jÃ  indÃ©pendante de la notion de
  course.

**Deux bugs trouvÃ©s et corrigÃ©s en testant en production** :
- Lors d'une Ã©dition du prompt du coach, tout le bloc de calcul des donnÃ©es
  Strava de la sÃ©ance du jour (`todayAvgPace`, `todayInTarget`,
  `todayAvgIE`, `todayAvgCad`) avait Ã©tÃ© supprimÃ© par erreur alors que ces
  variables restaient utilisÃ©es plus loin â€” `ReferenceError` silencieuse
  qui interrompait `fetchCoachMsg()` avant mÃªme l'appel rÃ©seau, donc aucun
  message ne se gÃ©nÃ©rait jamais (aucune requÃªte visible dans l'onglet
  RÃ©seau). RÃ©intÃ©grÃ©.
- Le bloc coach (`coachEl`) n'Ã©tait historiquement insÃ©rÃ© que dans la carte
  Â« sÃ©ance du jour Â» (branche non-repos de `renderDashboard()`) â€” jamais
  affichÃ© les jours de repos, dans **aucun mode**, comportement prÃ©-existant
  rÃ©vÃ©lÃ© en pratique parce que le plan Forme de test tombait justement sur
  un jour de repos. `coachEl` est dÃ©sormais aussi inclus dans la carte
  Â« REPOS Â», juste aprÃ¨s le bilan de semaine et avant l'aperÃ§u Â« Demain Â» â€”
  s'applique aux deux modes.

### 12.4 ClÃ´ture permanente & garde-fou anti-chevauchement

**ProblÃ¨me identifiÃ©** : un plan Forme n'a pas de date de fin naturelle
(contrairement Ã  un plan course, bornÃ© par `dateCourse`). L'ancien garde-fou
de non-chevauchement (`trouverPlanEnConflit`, `gist-sync.js`) exigeait
`p.dateCourse` sur chaque plan comparÃ© â€” un plan Forme (toujours sans
`dateCourse`) Ã©tait donc silencieusement exclu de toute vÃ©rification, dans
les deux sens : deux plans (course et Forme, ou deux Forme) pouvaient
coexister sur les mÃªmes dates sans aucun avertissement.

**Analyse du risque rÃ©el** (avant de choisir un correctif) : pas de
mÃ©lange/corruption de donnÃ©es â€” chaque plan a ses propres clÃ©s de stockage
prÃ©fixÃ©es (`clePourPlan()`), et un seul plan est actif Ã  la fois dans le
dashboard (`window.__PLAN_BRUT__`). Le vrai risque est la **confusion** :
deux plans actifs sur la mÃªme pÃ©riode, sans lien entre eux, chacun
interprÃ©tant indÃ©pendamment les mÃªmes activitÃ©s Strava rÃ©elles.

**Principe retenu avec Laurent** : un seul plan actif Ã  la fois, tous types
confondus â€” pas de coexistence plan course / plan Forme sur les mÃªmes dates.
Un plan Forme est considÃ©rÃ© Â« en cours Â» **indÃ©finiment** tant qu'aucune
`dateCloture` optionnelle n'est fixÃ©e dessus. Une fois `dateCloture` fixÃ©e
et sauvegardÃ©e, elle devient **permanente et irrÃ©versible** : le plan
devient intÃ©gralement figÃ© (lecture seule â€” plus aucune modification de
contenu, statuts, notes, ni synchro Strava), ce qui Ã©limine tout besoin de
revÃ©rifier les conflits Ã  chaque sauvegarde ultÃ©rieure et rend le
comportement d'un plan clÃ´turÃ© aussi prÃ©visible qu'un plan course dÃ©jÃ 
couru.

**ImplÃ©mentation** (`gist-sync.js` + `gist-sync.classic.js` rÃ©gÃ©nÃ©rÃ©e) :
- `dateFinPeriodeActive(plan)` â€” abstrait la diffÃ©rence de rÃ¨gle entre types
  : `dateCourse` pour un plan course, `dateCloture || null` pour un plan
  Forme (`null` = actif indÃ©finiment dans le futur, jamais Â« pas de plan Â»).
- `datesChevauchent(debutA, finA, debutB, finB)` â€” gÃ©nÃ©ralisÃ©e pour gÃ©rer
  des pÃ©riodes Â« ouvertes Â» (fin = `null`).
- `trouverPlanEnConflit(plans, dateDebut, dateFin, idAExclure)` â€” fonctionne
  pour n'importe quelle combinaison de types (course/course, course/forme,
  forme/forme).
- `sauvegarderPlan(plan)` : rejette d'emblÃ©e toute Ã©criture sur un plan
  Forme dÃ©jÃ  clÃ´turÃ© (`planAvant.dateCloture` existe) avec un message
  explicite. Sinon, vÃ©rifie le conflit uniquement Ã  la **crÃ©ation** d'un
  nouveau plan (`indexExistant === -1`) â€” une mise Ã  jour de contenu sur un
  plan Forme non clÃ´turÃ© (ex. rouvrir un vieux plan des mois plus tard pour
  corriger une sÃ©ance Strava historique) reste toujours libre, jamais
  bloquÃ©e rÃ©troactivement par l'apparition d'un plan plus rÃ©cent sur la
  mÃªme pÃ©riode calendaire. Point vÃ©rifiÃ© explicitement par Laurent avant de
  choisir cette conception : la premiÃ¨re approche envisagÃ©e (revÃ©rifier Ã 
  chaque sauvegarde si les dates changent) aurait cassÃ© cet usage lÃ©gitime.
- `syncStrava()` (`index.html`) refuse de se dÃ©clencher sur un plan Forme
  clÃ´turÃ© (garde en tout dÃ©but de fonction, avant l'appel rÃ©seau).

**Interface** :
- Wizard (`v2/index.html`, Ã©tape accent) : champ Â« Date de clÃ´ture
  (optionnel) Â», texte d'aide prÃ©cisant le caractÃ¨re dÃ©finitif, confirmation
  explicite (`confirm()`) au moment de gÃ©nÃ©rer le plan si une date a Ã©tÃ©
  renseignÃ©e.
- ParamÃ¨tres (`index.html`, section Â« ðŸ ClÃ´ture du plan forme Â», visible
  seulement si `ESTMODEFORME`) : si le plan n'est pas encore clÃ´turÃ©, un
  champ date + bouton Â« ClÃ´turer dÃ©finitivement Ã  cette date Â» avec
  confirmation explicite (action irrÃ©versible, pas de bouton Â« Retirer Â»).
  Si dÃ©jÃ  clÃ´turÃ©, affichage lecture seule uniquement (ðŸ”’ date +
  explication) â€” aucun champ ni bouton modifiable.

**Tests** (exÃ©cutÃ©s manuellement en session, pas encore de fichier
`test-*.mjs` dÃ©diÃ© dans le repo â€” Ã  crÃ©er si ce mÃ©canisme Ã©volue) : 11 cas
sur `datesChevauchent`/`trouverPlanEnConflit` (chevauchements/non-
chevauchements course/course, forme sans clÃ´ture qui bloque, forme clÃ´turÃ©
qui dÃ©bloque, mise Ã  jour du mÃªme plan jamais en conflit avec lui-mÃªme) + 7
cas sur `sauvegarderPlan` avec storage/fetch simulÃ©s (modification de
contenu sur plan Forme clÃ´turÃ© rejetÃ©e, re-clÃ´ture avec mÃªmes valeurs
toujours rejetÃ©e, premiÃ¨re clÃ´ture autorisÃ©e, crÃ©ation de plan course aprÃ¨s
clÃ´ture autorisÃ©e, crÃ©ation pendant un plan Forme actif bloquÃ©e, Ã©dition de
contenu sur plan Forme non clÃ´turÃ© toujours libre, plans course jamais
concernÃ©s par la rÃ¨gle de figeage). Tous passent.

### 12.5 FiabilitÃ© du coach & mÃ©tÃ©o dynamique (`index.html`)

Trois problÃ¨mes trouvÃ©s en usage rÃ©el sur les deux prompts du coach
(`fetchCoachMsg` et `fetchCoachRaceMsg`), tous corrigÃ©s :

- **Confusion de prÃ©nom** : le coach s'adressait parfois Ã  l'utilisateur en
  l'appelant Â« LÃ©a Â» (le prÃ©nom du personnage coach lui-mÃªme, pas celui du
  coureur) â€” ex. Â« Bravo LÃ©a ! Â» adressÃ© Ã  Laurent. Le prompt ne
  transmettait jamais le vrai prÃ©nom de l'utilisateur. CorrigÃ© : injection
  de `profilCoureur.prenom` (dÃ©jÃ  existant, ParamÃ¨tres â†’ Profil) dans les
  deux prompts, avec instruction explicite Â« utilise son prÃ©nom, jamais
  LÃ©a Â» ; repli sur une instruction Â« n'utilise jamais LÃ©a pour t'adresser
  au coureur Â» si le prÃ©nom n'est pas renseignÃ©.
- **Moments de journÃ©e inventÃ©s** : le prompt contenait littÃ©ralement
  Â« terminÃ©e ce soir Â» comme fait injectÃ©, poussant l'IA Ã  broder des
  dÃ©tails temporels qu'elle ne peut pas connaÃ®tre (Â« demain matin Â»,
  Â« avant de dormir Â», horaires de petit-dÃ©jeunerâ€¦) â€” l'app ne connaÃ®t que
  la date d'une sÃ©ance, jamais l'heure. CorrigÃ© : retrait de la mention
  factuelle Â« ce soir Â», ajout d'une consigne explicite interdisant toute
  supposition d'heure/moment de journÃ©e dans les deux prompts.
- **MÃ©tÃ©o en position fixe** : `weatherTemp` (mÃ©tÃ©o actuelle, transmise au
  coach) utilisait des coordonnÃ©es Toulon codÃ©es en dur
  (`latitude=43.12&longitude=5.93`), sans lien avec l'endroit rÃ©el oÃ¹
  Laurent court. CorrigÃ© : `coordonneesMeteoActuelles()` utilise dÃ©sormais
  la position GPS de la derniÃ¨re activitÃ© Strava disponible avec GPS
  (triÃ©e par date, ignore les activitÃ©s sans `start_latlng` mÃªme plus
  rÃ©centes), avec repli sur Toulon si aucune activitÃ© GPS n'existe ou si
  `stravaActivities` est vide. TestÃ© (6 cas : aucune activitÃ©, activitÃ©s
  sans GPS, mÃ©lange, tri par date, GPS mal formÃ©) â€” tous passent.

Deux bugs de rÃ©gression trouvÃ©s et corrigÃ©s pendant le dÃ©veloppement de ces
correctifs (avant celui-ci) :
- Suppression accidentelle du bloc de calcul des donnÃ©es Strava de la
  sÃ©ance du jour (`todayAvgPace`, `todayInTarget`, `todayAvgIE`,
  `todayAvgCad`) lors d'une Ã©dition antÃ©rieure du prompt â€” `ReferenceError`
  silencieuse qui empÃªchait `fetchCoachMsg()` de s'exÃ©cuter jusqu'au bout
  (aucune requÃªte rÃ©seau visible, aucun message gÃ©nÃ©rÃ©). DiagnostiquÃ© via
  l'onglet RÃ©seau des outils dÃ©veloppeur (absence totale de requÃªte vers
  `/api/coach`) plutÃ´t qu'en devinant.
- Le bloc coach (`coachEl`) n'Ã©tait historiquement insÃ©rÃ© que dans la carte
  Â« sÃ©ance du jour Â», jamais dans la carte Â« REPOS Â» â€” comportement
  prÃ©-existant (pas une rÃ©gression de cette session), rÃ©vÃ©lÃ© en pratique
  parce qu'un plan de test tombait justement sur un jour de repos. AjoutÃ© Ã 
  la carte REPOS, pour les deux modes.

### 12.6 Extraction du changelog (`changelog.classic.js`)

Le tableau `VERSIONS` (historique des versions affichÃ© dans ParamÃ¨tres,
~250 lignes de contenu texte pur) vivait en dur au milieu de
`renderSettings()` dans `index.html` (dÃ©jÃ  ~5600 lignes) â€” sans rapport
avec la logique de rendu environnante, et risquÃ© Ã  Ã©diter (une entrÃ©e mal
formÃ©e pouvait casser du JS ailleurs dans ce mÃªme fichier massif).

Extrait tel quel vers `public/engine-classic-scripts/changelog.classic.js`
(nouveau fichier), chargÃ© en `<script src>` avec les autres scripts moteur,
avant le script principal d'`index.html` qui lit `VERSIONS`. Choix du
format JS plutÃ´t que JSON : cohÃ©rent avec le pattern dÃ©jÃ  en place pour
tout le reste du moteur classic (chargement synchrone, pas d'attente
rÃ©seau au dÃ©marrage, commentaires possibles pour documenter chaque entrÃ©e
â€” un JSON ne le permettrait pas).

ParticularitÃ© par rapport aux autres fichiers `*.classic.js` : **pas de
source de vÃ©ritÃ© en module ES sÃ©parÃ©**. Les autres fichiers de ce dossier
sont des copies dÃ©rivÃ©es d'un vrai module `v2/engine/*.js` (Ã  rÃ©gÃ©nÃ©rer
manuellement Ã  chaque Ã©volution du moteur) ; `changelog.classic.js` n'a
pas d'Ã©quivalent v2 â€” c'est un contenu propre Ã  l'app v1 (`index.html`),
jamais partagÃ© avec le wizard v2, donc ce fichier classic *est*
directement la source de vÃ©ritÃ©, Ã  Ã©diter sur place pour chaque nouvelle
version.

`index.html` allÃ©gÃ© de ~200 lignes par cette extraction (~5620 â†’ ~5450).

### 12.7 Chantier encore ouvert

- **DÃ©clenchement de `genererBlocSuivant()`** : pas encore cÃ¢blÃ© cÃ´tÃ©
  `index.html`. Reste Ã  dÃ©cider comment le bloc suivant est gÃ©nÃ©rÃ© quand le
  bloc courant touche Ã  sa fin â€” dÃ©clenchement automatique en arriÃ¨re-plan
  (ex. Ã  l'ouverture de l'app si la derniÃ¨re semaine du bloc est dÃ©passÃ©e),
  ou action explicite proposÃ©e Ã  l'utilisateur (ex. banniÃ¨re Â« GÃ©nÃ©rer le
  prochain bloc Â» sur le dashboard, dans l'esprit de la banniÃ¨re
  d'adaptation dynamique dÃ©jÃ  existante) ? Ã€ trancher en session dÃ©diÃ©e.



**SymptÃ´me** (signalÃ© le 13 juillet 2026, pendant la session mode Forme) :
sur l'app Android installÃ©e (TWA), chaque navigation vers "configuration de
plan" (`/v2`) ouvrait une **nouvelle tÃ¢che** dans le multitÃ¢che du
tÃ©lÃ©phone (plusieurs cartes "Run by LÃ©a" visuellement identiques
s'accumulaient), et le systÃ¨me proposait systÃ©matiquement "ouvrir avec
Chrome" au lieu de rester dans l'app.

**Fausses pistes explorÃ©es avant la vraie cause** (utiles Ã  documenter pour
ne pas les re-tester inutilement si un symptÃ´me similaire rÃ©apparaÃ®t) :
- **`v2/manifest.json` avait un `scope`/`name` diffÃ©rents de la racine**
  (`scope: "/v2"` vs `"/"`, `name: "Run by LÃ©a (v2)"` vs `"Run by LÃ©a"`) â€”
  corrigÃ© (alignÃ©s sur la racine), dÃ©ployÃ©, mais n'a pas rÃ©solu le
  problÃ¨me seul. Le correctif reste appliquÃ© et lÃ©gitime (cohÃ©rence
  gÃ©nÃ©rale), juste insuffisant.
- **WebAPK Chrome fantÃ´me** (`org.chromium.webapk.afd89bd65879efa80_v2`) â€”
  un second package Chrome, distinct du TWA, revendiquait aussi
  `plan-10k-alpha.vercel.app` (signature diffÃ©rente). DÃ©sinstallÃ© via
  `adb uninstall org.chromium.webapk.afd89bd65879efa80_v2` â€” a nettoyÃ© un
  vrai conflit potentiel mais n'Ã©tait pas non plus la cause du symptÃ´me
  observÃ© (confirmÃ© via `pm get-app-links` et `dumpsys package
  domain-preferred-apps` aprÃ¨s coup : un seul revendicateur restant, bug
  toujours prÃ©sent).
- **`launchHandlerClientMode` vide dans `twa-manifest.json`** â€” changÃ© en
  `"navigate-existing"`, rebuild complet (Bubblewrap â†’ Ã©chec de signature
  automatique `BadPaddingException`, contournement habituel par signature
  manuelle `apksigner.jar`, rÃ©installation via `adb uninstall`/`adb
  install`). N'a pas rÃ©solu le problÃ¨me non plus. Le changement reste
  appliquÃ© (bonne pratique gÃ©nÃ©rale pour un TWA), sans effet sur ce bug
  prÃ©cis.

**Vraie cause** : dans `public/index.html`, fonction `renderSelecteurPlan()`
(dashboard), le bouton "ðŸ Configurer un plan" Ã©tait un `<a href="/v2"
target="_blank">`. `target="_blank"` force Android Ã  traiter la navigation
comme **externe** au TWA plutÃ´t qu'interne, ce qui dÃ©clenche Ã  la fois le
choix d'application ("ouvrir avec Chrome") et l'ouverture d'une nouvelle
tÃ¢che Ã  chaque clic.

**Origine de cet attribut** : ajoutÃ© le 8 juillet 2026 (commit antÃ©rieur Ã 
cette session) pour contourner un bug diffÃ©rent â€” `window.open()` en JS ne
fonctionnait pas du tout depuis la PWA installÃ©e en mode standalone. Le
correctif de l'Ã©poque (passer par un vrai `<a target="_blank">` plutÃ´t que
`window.open()`) rÃ©solvait ce problÃ¨me-lÃ , mais introduisait celui-ci sans
que le lien ait Ã©tÃ© identifiÃ© Ã  l'Ã©poque.

**Correctif appliquÃ©** : retrait de `target:"_blank"` sur ce lien (reste un
`<a href="/v2">` simple). Un `<a>` cliquÃ© directement (pas via
`window.open()` JS) reste fiable en contexte TWA/PWA standalone â€” le retrait
ne devrait donc pas rÃ©introduire l'ancien bug de juillet, mais **Ã  surveiller**
si un comportement similaire Ã  celui du 8 juillet rÃ©apparaÃ®t un jour.

**MÃ©thode de diagnostic qui a fini par isoler la cause** : recherche directe
dans le code de toute occurrence de `/v2` pour vÃ©rifier COMMENT la
navigation Ã©tait dÃ©clenchÃ©e (`grep` sur le fichier `index.html` tÃ©lÃ©chargÃ©
depuis GitHub), plutÃ´t que de continuer Ã  empiler des hypothÃ¨ses cÃ´tÃ©
configuration Android/manifest. Une fois localisÃ©, la cause Ã©tait visible
immÃ©diatement dans le code.

**Commandes ADB utiles pour un diagnostic futur** (conservÃ©es pour
rÃ©fÃ©rence) :
```
adb shell pm get-app-links <package>
adb shell dumpsys package domain-preferred-apps | findstr /i "<mot-clÃ©>"
adb shell pm list packages | findstr /i "<mot-clÃ©>"
adb uninstall <package>
adb install <apk>
```

---

## 13. Rebranding "Run by LÃ©a" â†’ "Yoria" (14 juillet 2026)

### 13.1 PÃ©rimÃ¨tre du changement

Renommage complet de l'application, Ã  la demande de Laurent, en vue de la
commercialisation v2.5 (500 abonnÃ©s cible). Nouveau nom : **Yoria**.

**Repo GitHub renommÃ©** : `plan-10k` â†’ `yoria` (`olayanne3-wq/yoria`).
GitHub applique un redirect automatique de l'ancien nom, Vercel a continuÃ©
Ã  dÃ©ployer sans reconfiguration (connectÃ© par ID de repo, pas par nom).
Domaine Vercel de production inchangÃ© : `plan-10k-alpha.vercel.app` (pas
renommÃ© Ã  ce stade â€” changement de domaine non demandÃ©).

**Fichiers modifiÃ©s pour le nom/l'identitÃ©** :
- `public/index.html` (titre, UI, icÃ´ne SVG inline)
- `public/manifest.json`, `public/v2/manifest.json`
- `public/v2/index.html` (wizard)
- `public/engine-classic-scripts/auth.classic.js` et
  `public/v2/engine/auth.js` (Ã©cran de connexion â€” texte "Run by LÃ©a"
  oubliÃ© lors du premier passage, corrigÃ© dans une session ultÃ©rieure)
- `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`
  (remplacÃ©s par les assets du pack Yoria fourni par Laurent)
- `README.md`
- `public/sw.js`, `public/v2/sw.js` (nom de cache renommÃ©
  `plan10k-v21` â†’ `yoria-v1`, `plan10k-v2-v2` â†’ `yoria-v2-v1`, pour forcer
  un rafraÃ®chissement du cache PWA cÃ´tÃ© utilisateurs existants)

### 13.2 APK Android (TWA) â€” rÃ©gÃ©nÃ©ration

Projet Android local (`C:\Users\olaya\runbylea-android-v3\`, nom de
dossier restÃ© tel quel â€” cosmÃ©tique, aucun impact) : `twa-manifest.json`
mis Ã  jour avec `name`/`launcherName: "Yoria"`, `themeColor`/
`backgroundColor` alignÃ©s sur la nouvelle palette, `iconUrl`/
`maskableIconUrl` pointant vers `https://plan-10k-alpha.vercel.app/icon-512.png`
(champ `maskableIconUrl` absent par dÃ©faut du fichier gÃ©nÃ©rÃ© par
Bubblewrap â€” ajoutÃ© manuellement).

**Bug de signature `BadPaddingException` reproduit** (dÃ©jÃ  documentÃ©
section 8bis) â€” contournement habituel par `apksigner.jar` en ligne de
commande. **PrÃ©cision utile pour la prochaine fois** : l'Ã©chec initial
venait d'un mauvais mot de passe pour `--key-pass` (une valeur diffÃ©rente
de celle du keystore, provenant probablement d'un essai antÃ©rieur) â€”
`keytool -list -v -keystore android.keystore -storepass <pwd>` a permis
de confirmer que keystore et clÃ© partagent en rÃ©alitÃ© le **mÃªme mot de
passe**. Utiliser la mÃªme valeur pour `--ks-pass` et `--key-pass` a rÃ©solu
la signature.

AprÃ¨s signature, dÃ©sinstallation de l'ancien package via
`adb uninstall app.vercel.plan_10k_alpha.twa` a Ã©chouÃ©
(`DELETE_FAILED_INTERNAL_ERROR`) â€” contournÃ©e par dÃ©sinstallation manuelle
depuis les paramÃ¨tres du tÃ©lÃ©phone, puis `adb install
app-release-signed.apk` a fonctionnÃ© normalement. Package Android
inchangÃ© : `app.vercel.plan_10k_alpha.twa` (changer l'identifiant
casserait toute mise Ã  jour future â€” non fait, aucune raison de le faire
tant que l'app n'est pas publiÃ©e).

### 13.3 Palette graphique

Pack de branding fourni par Laurent (`Yoria_Google_Play_Assets.zip`) avec
`palette.json` :
```
primary:   #1E4ED8 (bleu)
secondary: #22C7B8 (turquoise)
navy:      #07162F (fond sombre, version initiale â€” remplacÃ© ensuite,
                     voir 13.5)
off_white: #F8FAFC (fond clair)
charcoal:  #1F2937 (texte)
```
Une 5e couleur d'accent orange (`#FF7755`) a Ã©tÃ© ajoutÃ©e par Laurent dans
une maquette Google Play ultÃ©rieure (mockups incluant captures d'Ã©cran,
banniÃ¨re, feature graphic) â€” adoptÃ©e comme couleur d'alerte/accent
secondaire Ã  la place du rouge/jaune/violet historiques.

**DÃ©cisions de mapping validÃ©es avec Laurent** :
- Vert succÃ¨s (`#22c55e`) â†’ turquoise (`#22C7B8`)
- Rouge erreur (`#ef4444`, `#f87171`) et jaune (`#eab308`) â†’ orange
  (`#FF7755`)
- Violet (`#a855f7`, sÃ©ances spÃ©cifiques/adaptation) â†’ bleu (`#1E4ED8`)
- Cartes : pas de distinction de fond (auparavant blanc sur gris clair) â€”
  fond uniforme `#F8FAFC` partout, sÃ©paration visuelle par **ombre lÃ©gÃ¨re**
  (`box-shadow`) plutÃ´t que bordure dure, conforme au style observÃ© sur la
  maquette Google Play.

**Contrainte stricte de Laurent** : n'utiliser QUE les 5 couleurs
officielles (+ leurs variantes d'opacitÃ©), aucune couleur "de convenance"
ajoutÃ©e. Un audit complet du repo (`index.html`, `v2/index.html`,
`auth.classic.js`, `auth.js`, tous les fichiers moteur classic/module, API
serverless) a confirmÃ© zÃ©ro couleur hors palette aprÃ¨s nettoyage â€” y
compris deux rÃ©sidus `#fff` en dur sur des boutons Ã  fond plein, corrigÃ©s
vers `#F8FAFC` (couleur officielle) bien que visuellement dÃ©jÃ  corrects.

**PiÃ¨ge rencontrÃ© pendant les remplacements automatisÃ©s** : plusieurs
passages successifs de remplacement de couleurs par script ont gÃ©nÃ©rÃ© des
couleurs hexadÃ©cimales invalides Ã  10 caractÃ¨res (ex. `#1F29372222`,
`#1F29371111`) en concatÃ©nant un second suffixe d'opacitÃ© sur une valeur
dÃ©jÃ  suffixÃ©e. CSS ignore silencieusement une couleur invalide â€” aucune
erreur visible, juste un style non appliquÃ©. DÃ©tectÃ© par grep ciblÃ©
(`#[0-9a-fA-F]{10}`) lors d'un audit, corrigÃ© Ã  la source avant de
poursuivre. **Vigilance Ã  conserver** pour toute future automatisation de
remplacement de couleurs sur ce projet.

### 13.4 ThÃ¨me clair (light mode) â€” premiÃ¨re itÃ©ration

Passage du thÃ¨me sombre historique (fond `#0f1117`/`#07162F`) Ã  un thÃ¨me
clair (fond `#F8FAFC`), Ã  la demande de Laurent aprÃ¨s une maquette Google
Play montrant des captures d'app en fond clair. Conversion appliquÃ©e sur
`index.html`, `v2/index.html`, et l'Ã©cran d'authentification (deux
versions, classic et module).

**Bugs de contraste identifiÃ©s aprÃ¨s la conversion initiale** (couleurs en
`rgba(...)` codÃ©es avec des valeurs numÃ©riques littÃ©rales, invisibles Ã  un
`grep` sur `#hex` et donc oubliÃ©es lors du premier passage) :
- Barre de navigation du bas : `background: rgba(26,29,39,0.97)`
  (quasi-noir) â€” restÃ© actif sur fond clair, rendant la barre illisible.
- Header sticky en haut de certains Ã©crans : `rgba(15,17,23,0.95)` â€” mÃªme
  problÃ¨me.
- Wizard v2 : 43 occurrences de texte en `rgba(238,240,234,X)` (blanc cassÃ©,
  ancienne couleur de texte sur fond sombre) jamais migrÃ©es â†’ texte
  quasiment invisible sur le nouveau fond clair.
- `<option>` d'un `<select>` HTML natif (sÃ©lecteur de plan dans
  `index.html`) : sans couleur explicite sur chaque `<option>`, certains
  navigateurs/OS appliquent leur propre thÃ¨me sombre systÃ¨me, rendant le
  texte illisible malgrÃ© un CSS correct sur le `<select>` parent. CorrigÃ©
  en forÃ§ant `style:{background,color}` sur chaque `<option>` gÃ©nÃ©rÃ©.

**LeÃ§on retenue** : lors d'une conversion de palette, chercher aussi les
couleurs en `rgb()`/`rgba()` avec valeurs dÃ©cimales, pas seulement les
`#hex` â€” un simple `grep -oE "#[0-9a-fA-F]{6}"` laisse passer ces cas.

### 13.5 SystÃ¨me de thÃ¨me clair/sombre avec bascule utilisateur

Demande ultÃ©rieure de Laurent : proposer un vrai choix clair/sombre dans
les ParamÃ¨tres, pas seulement un remplacement figÃ© du thÃ¨me sombre par le
clair. NÃ©cessite que **toute couleur soit une variable**, jamais une
valeur en dur, pour permettre une bascule dynamique.

**Architecture retenue** â€” variables CSS basÃ©es sur des triplets RGB (pas
directement des couleurs hexadÃ©cimales), pour permettre une composition
d'opacitÃ© propre sans collision :
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
  --shadow1: rgba(0,0,0,0.4);  /* ombres neutres, pas liÃ©es au thÃ¨me */
}
```
Couleurs d'accent (`--accent`, `--accent2`, `--warn`) **identiques dans
les deux thÃ¨mes** â€” seules les couleurs de fond/texte/bordure changent,
conformÃ©ment aux deux maquettes fournies par Laurent (light et dark
utilisent les mÃªmes bleu/turquoise/orange).

**PiÃ¨ge rencontrÃ© (deuxiÃ¨me occurrence du mÃªme type de bug)** : le premier
essai de conversion a rÃ©utilisÃ© des variables dÃ©jÃ  porteuses d'une opacitÃ©
fixe (ex. `--border: rgba(...,0.13)`) en leur accolant un second suffixe
d'opacitÃ© hexadÃ©cimal (`var(--border)22`), gÃ©nÃ©rant une couleur CSS
invalide silencieusement ignorÃ©e â€” mÃªme symptÃ´me que celui de la section
13.3, cette fois provoquÃ© par la conversion en variables elle-mÃªme plutÃ´t
que par un remplacement hexâ†’hex. CorrigÃ© en repartant d'une version
propre du fichier et en utilisant systÃ©matiquement le pattern
`rgba(var(--x-rgb), N)` pour toute opacitÃ© personnalisÃ©e, jamais de
suffixe collÃ© Ã  une variable qui contient dÃ©jÃ  une couleur complÃ¨te.

**Toggle utilisateur** : section "ðŸŽ¨ Apparence" ajoutÃ©e dans
`renderSettings()` (juste aprÃ¨s la section "ðŸ‘¤ Compte"), deux boutons
Clair/Sombre, sauvegarde dans `localStorage` (`lk_theme`), application
immÃ©diate via `document.documentElement.setAttribute('data-theme', ...)`
+ `render()`. Un script en tÃªte de `<head>` (avant tout style visible)
lit `localStorage` et pose l'attribut `data-theme` sur `<html>` dÃ¨s le
chargement, pour Ã©viter un flash de thÃ¨me incorrect.

**Wizard v2 et Ã©cran d'authentification** : branchÃ©s sur le mÃªme systÃ¨me
de variables (le wizard rÃ©utilise ses variables sÃ©mantiques historiques â€”
`--ink`, `--paper`, `--signal`, etc. â€” redÃ©finies pour pointer vers les
nouvelles variables RGB plutÃ´t que des couleurs figÃ©es). L'Ã©cran
d'authentification (`auth.classic.js`/`auth.js`) injecte son propre
`<style>` en JS dans un `<div>` hÃ´te du document principal
(`#ecran-auth-hote`) : confirmÃ© qu'il hÃ©rite bien des variables `:root`/
`[data-theme]` dÃ©finies dans le document parent (`index.html` ou
`v2/index.html`), donc `var(--accent)` etc. fonctionnent correctement
sans dupliquer les dÃ©finitions de variables dans ce fichier.

**RÃ©sidus de couleurs en dur oubliÃ©s lors du passage initial en variables**
(trouvÃ©s aprÃ¨s retour utilisateur signalant onglets/header toujours
blancs en mode sombre, et texte illisible dans le wizard) :
- `index.html` : les mÃªmes `rgba(255,255,255,0.97)` /
  `rgba(248,250,252,0.95)` de la nav bar et du header sticky (section
  13.4) avaient Ã©tÃ© remplacÃ©s par leurs Ã©quivalents en thÃ¨me clair lors du
  passage en variables, mais pas reliÃ©s Ã  la variable `--bg` â€” recorrigÃ©s
  en `rgba(var(--bg-rgb), X)`.
- `v2/index.html` : 43 occurrences de texte en `rgba(31,41,55,X)`
  (charcoal, couleur de texte clair) codÃ©es avec des valeurs RGB
  littÃ©rales plutÃ´t que `var(--text-rgb)` â€” texte restÃ© sombre figÃ© mÃªme
  en thÃ¨me sombre, illisible sur fond sombre. RecorrigÃ© en
  `rgba(var(--text-rgb), X)`.

**MÃ©thode de vÃ©rification Ã©tablie pour ce type de bug** : aprÃ¨s toute
conversion de couleurs, chercher spÃ©cifiquement les `rgba(N,N,N` avec
valeurs numÃ©riques (`grep -oE "rgba\([0-9]+,[0-9]+,[0-9]+"`), en plus des
`#hex`, car ce sont deux syntaxes distinctes qui n'apparaissent pas dans
le mÃªme filtre.

### 13.6 Bug fonctionnel dÃ©couvert pendant le dÃ©bogage du theming (non liÃ©)

SignalÃ© par Laurent : impossible de cliquer sur un plan existant dans la
liste de la page 1 du wizard (`renderSelecteurPlan` / bib-row du wizard) â€”
aucune rÃ©action visible, aucune erreur console.

**Diagnostic** (par tests successifs en console dÃ©veloppeur, pas de
reproduction locale possible) : la fonction `chargerPlanExistant(id)`
activait bien la classe `.active` sur l'Ã©cran de rÃ©sultats
(`data-step="10"`, confirmÃ© par `dataset.step === '10'` aprÃ¨s clic), mais
l'Ã©cran restait visuellement invisible
(`getBoundingClientRect()` retournait `width:0, height:0`) car un autre
conteneur, `#choix-mode-contenu` (la page de choix Objectif course / Mode
forme), restait affichÃ© par-dessus (`style.display: 'block'`), jamais
masquÃ© par cette fonction â€” contrairement Ã  `choisirMode()` qui fait
`document.getElementById('choix-mode-contenu').style.display = 'none'`
avant d'afficher un Ã©cran suivant.

**Bug prÃ©existant, sans lien avec les changements de couleur/thÃ¨me** â€”
probablement prÃ©sent depuis l'ajout du sÃ©lecteur de plans sauvegardÃ©s
dans le wizard, dÃ©couvert seulement maintenant car Laurent teste peu ce
chemin (chargement d'un plan dÃ©jÃ  existant depuis la page d'accueil du
wizard, plutÃ´t que d'en crÃ©er un nouveau).

**Correctif** : ajout de la ligne manquante dans `chargerPlanExistant()` :
```js
document.getElementById('choix-mode-contenu').style.display = 'none';
```

**MÃ©thode de diagnostic utile pour la prochaine fois** : en l'absence
d'accÃ¨s direct au navigateur de Laurent, diagnostic entiÃ¨rement menÃ© via
allers-retours de commandes Ã  coller dans la console dÃ©veloppeur
(`document.elementFromPoint`, `getBoundingClientRect`, `dataset.step`,
appel direct de la fonction vs `.click()` simulÃ© vs `.onclick` inspectÃ©)
pour isoler mÃ©thodiquement si le problÃ¨me venait du DOM (Ã©lÃ©ment
manquant/mal ciblÃ©), de l'Ã©vÃ©nement (listener non attachÃ©), de la logique
(fonction en erreur), ou du rendu (Ã©lÃ©ment actif mais non visible) â€” dans
cet ordre d'Ã©limination.

---

## 14. Suite du rebranding Yoria (14 juillet 2026, session ultÃ©rieure)

### 14.1 Bug rÃ©siduel du wizard â€” deuxiÃ¨me couche

Le correctif de la section 13.6 (`chargerPlanExistant` ne masquait pas
`#choix-mode-contenu`) s'est rÃ©vÃ©lÃ© incomplet : aprÃ¨s correction, le clic
sur un plan changeait bien d'Ã©cran (`data-step="10"` actif) mais
affichait un Ã©cran vide (seulement l'en-tÃªte et le bouton retour
visibles).

**Diagnostic** (mÃªme mÃ©thode d'Ã©limination par console qu'en 13.6) :
l'Ã©cran de rÃ©sultats et tout son contenu (`renderResults()` bien exÃ©cutÃ©,
semaines `week-1` Ã  `week-9` bien prÃ©sentes dans le DOM) avaient
`getBoundingClientRect()` Ã  `width:0, height:0` â€” remontÃ©e de la
hiÃ©rarchie DOM parent par parent jusqu'Ã  trouver la vraie cause :
`#wizard-course-contenu` (conteneur englobant tout le flux "wizard
course", par opposition au flux "Mode Forme") Ã©tait restÃ© en
`style="display:none"`, un niveau au-dessus de `#choix-mode-contenu`
dÃ©jÃ  corrigÃ©. `chargerPlanExistant()` ne l'affichait pas, contrairement Ã 
`choisirMode('course')` qui le fait.

**Correctif** : ajout de
`document.getElementById('wizard-course-contenu').style.display = 'block';`
dans `chargerPlanExistant()`, en plus du correctif prÃ©cÃ©dent.

**LeÃ§on retenue** : pour ce genre de bug d'affichage sans erreur console,
la mÃ©thode fiable est de remonter la hiÃ©rarchie DOM parent par parent en
testant `getBoundingClientRect()` Ã  chaque niveau jusqu'Ã  localiser le
premier ancÃªtre Ã  `width:0/height:0` â€” c'est souvent LUI le vrai
coupable, pas l'Ã©lÃ©ment final oÃ¹ le symptÃ´me est observÃ©.

### 14.2 Logo Yoria sur l'Ã©cran de connexion

Ajout du symbole Yoria (SVG dÃ©gradÃ© bleu/turquoise, identique Ã  celui
utilisÃ© dans `index.html`, 72Ã—72px) en haut du bandeau de connexion,
au-dessus du titre et du sous-titre â€” appliquÃ© aux deux fichiers
(`auth.js` et `auth.classic.js`). ValidÃ© sur maquette avant codage
(widget Imagine) avant implÃ©mentation.

**RÃ©sidus de bug de double-suffixe trouvÃ©s au passage dans ces mÃªmes
fichiers** (mÃªme famille que sections 13.3/13.5) : `var(--text)22` et
`var(--text)99` â€” deux syntaxes CSS invalides jamais dÃ©tectÃ©es car
absentes des audits prÃ©cÃ©dents (ces fichiers n'avaient pas encore Ã©tÃ©
scannÃ©s avec le bon pattern de recherche). CorrigÃ©es vers
`var(--border)` et `var(--text-muted)` respectivement.

### 14.3 Recoloration des badges de type de sÃ©ance par intensitÃ©

Demande de Laurent : la couleur des badges de type de sÃ©ance (VMA, EF,
LONGUE, etc. dans le planning) ne convenait pas â€” plusieurs types
diffÃ©rents partageaient la mÃªme couleur (`--accent`/bleu utilisÃ© pour
EF, VMA, TEST et RACE simultanÃ©ment), rendant le badge peu informatif.

**Maquette prÃ©sentÃ©e avant codage** (widget Imagine, 3 options) :
- Option A â€” par intensitÃ©, fond lÃ©ger (opacitÃ©)
- Option B â€” 3 groupes fonctionnels, fond lÃ©ger
- Option C â€” mÃªme logique que A mais en teinte pleine (plus contrastÃ©e)

**Option C retenue.** Mapping final appliquÃ© Ã  `STYPES` dans
`index.html` :
- EF, LONGUE â†’ turquoise (`--accent2`)
- SEUIL, SPEC/allure course â†’ bleu (`--accent`)
- VMA, TEST, RACE â†’ orange (`--warn`)

**Bug de double-suffixe dÃ©couvert en implÃ©mentant ceci** (troisiÃ¨me
occurrence de cette famille de bug, cette fois dans un contexte
diffÃ©rent) : le pattern `st.color+"22"` trÃ¨s rÃ©pandu dans `index.html`
(bordures et fonds de cartes de sÃ©ance, banniÃ¨res, stats) concatÃ¨ne un
suffixe d'opacitÃ© hexadÃ©cimal directement sur `st.color`, qui vaut
dÃ©sormais une variable CSS (`var(--accent)` etc.) plutÃ´t qu'un hex brut
â€” gÃ©nÃ©rant une chaÃ®ne invalide type `var(--accent)22`, silencieusement
ignorÃ©e par le navigateur.

**Correctif structurel** : ajout d'un champ `colorSoft` dans chaque
entrÃ©e `STYPES`, prÃ©-formatÃ© en `rgba(var(--x-rgb),` (sans le nombre
d'opacitÃ© ni la parenthÃ¨se fermante), Ã  complÃ©ter par l'appelant selon le
niveau d'opacitÃ© voulu â€” ex. `st.colorSoft+"0.13)"` produit
`rgba(var(--accent2-rgb),0.13)`, une couleur CSS valide qui suit le
thÃ¨me. Six emplacements corrigÃ©s dans `index.html` : banniÃ¨re "prochaine
sÃ©ance clÃ©", carte de sÃ©ance du jour (avec sa variante `statusColor`
dynamique selon le statut âœ…/âš ï¸/âŒ), badge de stats par type dans l'Ã©cran
Stats, carte de sÃ©ance hebdomadaire, et la fonction `badge()` elle-mÃªme
(dÃ©sormais en fond plein avec texte `var(--bg)`, conforme Ã  l'option C).

**Point de vigilance retenu pour la suite** : toute variable CSS qui
contient dÃ©jÃ  une couleur complÃ¨te (`var(--x)`) ne doit JAMAIS recevoir
de suffixe d'opacitÃ© hexadÃ©cimal collÃ© directement derriÃ¨re
(`var(--x)+"22"`) â€” c'est le piÃ¨ge rÃ©current de cette session de
rebranding, rencontrÃ© au moins quatre fois sous des formes lÃ©gÃ¨rement
diffÃ©rentes (sections 13.3, 13.5, 14.2, 14.3). Toujours utiliser le
pattern `rgba(var(--x-rgb), N)` pour composer une opacitÃ© personnalisÃ©e,
avec une variable RGB dÃ©diÃ©e dÃ©clarÃ©e Ã  cÃ´tÃ© de la variable couleur
complÃ¨te.

### 14.4 Recoloration des badges dans le wizard v2 + label exact

Mªme demande Ã©tendue au wizard : badges recolorÃ©s selon le mÃªme mapping
(EF/Longue turquoise, Seuil/Allure course bleu, VMA orange), classes CSS
`.badge.vma`, `.badge.seuil`, `.badge.spec`, `.badge.ef`, `.badge.longue`
passÃ©es en fond plein (`background: var(--signal)` etc.) avec texte
`var(--ink)` (couleur de fond du thÃ¨me, contrastÃ©e), remplaÃ§ant l'ancien
fond en opacitÃ© rÃ©duite.

**Changement fonctionnel demandÃ© en mÃªme temps** : le badge affichait
jusqu'ici le mot gÃ©nÃ©rique "QualitÃ©" pour toute sÃ©ance de type
`qualite`, quel que soit son sous-type rÃ©el. RemplacÃ© par le vrai nom de
la famille dÃ©tectÃ©e via `Engine.FAMILLE_SOUS_TYPE[a.sousType]` dÃ©jÃ 
utilisÃ©e pour la couleur : "VMA", "Seuil", ou "Allure course" â€” "QualitÃ©"
reste seulement en repli si la famille n'est pas reconnue (cas
thÃ©oriquement impossible avec les sous-types actuels, gardÃ© par
robustesse).

### 14.5 Changelog (VERSIONS) â€” nouvelle entrÃ©e v2.7

Nouvelle entrÃ©e ajoutÃ©e en tÃªte de `VERSIONS` dans
`public/engine-classic-scripts/changelog.classic.js` (source unique,
pas de fichier module sÃ©parÃ© â€” cf. section 12.6) :

```js
{ ver:"v2.7", title:"Yoria â€” nouvelle identitÃ© et thÃ¨me clair/sombre", current:true, notes:[...] }
```

Couvre en synthÃ¨se pour l'utilisateur final : le nouveau nom/identitÃ©
Yoria, le choix de thÃ¨me clair/sombre dans ParamÃ¨tres, la recoloration
des badges de sÃ©ance par intensitÃ©, et les correctifs d'affichage liÃ©s.
Ancienne entrÃ©e `v2.6` repassÃ©e en `current:false`.

14. Bug v2_gist_id manquant de la synchronisation Supabase (résolu le 14/07/2026)

Contexte — lors du premier test d'installation réel via Play Store (piste
de test interne, cf. §11), sur un appareil neuf (aucun localStorage
préexistant), l'app affichait "Aucun plan enregistré" malgré un compte
connecté avec succès et des plans bien réels et intacts côté GitHub Gist.
Reproduit aussi en navigateur Chrome classique (pas spécifique au TWA) —
confirmé bug de code, pas d'environnement Android.

Cause racine — l'app utilise deux identifiants de Gist GitHub distincts,
stockés sous deux clés localStorage différentes :


lk_gist_id — résidu de l'ancien système de backup v1 (chantier
"nettoyage backup v1" déjà clos, cf. §9/§10), pointe vers un Gist au
format obsolète (plan10k_backup.json, un seul plan, pas de structure
multi-plans)
v2_gist_id — le vrai identifiant utilisé par chargerPlans()
(wizard v2, plans multiples), jamais retiré ni renommé, coexistant
silencieusement avec lk_gist_id


La liste CLES_INTEGRATIONS dans sync-storage.js/sync-storage.classic.js
(migration rétroactive + préchargement Supabase, cf. §8bis) ne contenait que
lk_gist_id, pas v2_gist_id — écrit nulle part, donc jamais migré vers
Supabase, donc jamais restauré sur un nouvel appareil. chargerPlans()
recevait un v2_gist_id vide et retournait une liste de plans vide, sans
erreur JS visible (deux console.warn avalés silencieusement dans le flux
normal).

Diagnostic — mené en direct dans les DevTools du navigateur (await chargerPlans() → [], puis vérification manuelle de chaque clé
localStorage et de chaque table Supabase une par une) plutôt que par
lecture de code, la clé manquante n'étant identifiable qu'en comparant les
deux Gists réels (contenu du Gist lk_gist_id confirmé être l'ancien format
backup v1, distinct du Gist v2_gist_id contenant les vrais plans).

Correctif appliqué :


Nouvelle colonne v2_gist_id (text) ajoutée à la table integrations
côté Supabase (ALTER TABLE integrations ADD COLUMN IF NOT EXISTS v2_gist_id text;)
v2_gist_id ajoutée à CLES_INTEGRATIONS et à la table de routage
colonnes dans les trois fonctions concernées de
sync-storage.js/sync-storage.classic.js : migrerDonneesExistantes,
precharger, synchroniserVersSupabase
Contournement manuel appliqué en urgence sur l'appareil de test avant
correctif (localStorage.setItem('v2_gist_id', '...') collé en
console) — sans valeur au-delà du dépannage immédiat de cette session,
le vrai correctif est dans le code, pas ce contournement


Non couvert par ce correctif, à garder en tête : lk_gist_id continue
d'exister et d'être migré/synchronisé (branche CLES_INTEGRATIONS
existante, inchangée) alors qu'il ne sert plus à rien pour l'affichage réel
— resté en l'état pour ne pas élargir le correctif pendant une session de
publication Play Store. Candidat à un futur nettoyage (retirer lk_gist_id
de la synchronisation, voire supprimer le Gist backup v1 lui-même côté
GitHub) lors d'une session dédiée au nettoyage technique, pas urgent.

Statut : corrigé et validé en conditions réelles sur le téléphone
Android (app Play Store, déconnexion/reconnexion), après un second correctif
complémentaire au premier (cf. ci-dessous) — les deux ensemble résolvent le
problème complètement.

Second bug découvert après le premier correctif — une fois v2_gist_id
ajoutée à la liste des clés migrées/synchronisées (correctif ci-dessus), un
second problème est apparu : chargerPlans() échouait en 404 avec une URL
GitHub visiblement corrompue
(api.github.com/gists/%224b9e8e7d9e15e441f3d82091b9730872%22) — les %22
sont des guillemets doubles URL-encodés. Cause : precharger() (dans
sync-storage.js) fait systématiquement JSON.stringify() sur les valeurs
restaurées depuis Supabase, cohérent avec toutes les autres clés
d'intégration (lk_github_token, lk_gist_id, etc.) — mais gist-sync.js
(getV2GistId()) lit v2_gist_id en lecture brute
(storage.getItem('v2_gist_id'), sans JSON.parse()), contrairement à
getGithubToken() dans ce même fichier qui gère les deux formats. Le
JSON.stringify() de precharger() ajoutait donc des guillemets que
chargerPlans() ne savait pas retirer.

Corrigé en traitant v2_gist_id comme un cas à part (lecture/écriture
brute, sans JSON.stringify()/JSON.parse()) dans les trois fonctions de
sync-storage.js/sync-storage.classic.js où il apparaît — contrairement
au reste de CLES_INTEGRATIONS, qui continue de passer par le
JSON.stringify()/JSON.parse() générique.

Diagnostic final mené en DevTools sur onglet de navigation privée
(pour garantir un état vraiment vierge, sans résidu d'un test précédent),
en observant directement l'URL de la requête réseau en échec plutôt qu'en
relisant le code — la faute de frappe %22 dans l'URL a été le vrai
indice, pas visible en lisant sync-storage.js isolément sans comparer à
la façon dont gist-sync.js lit cette même clé.






## 15. Niveau "grand débutant" et séances marche-course (chantier ouvert, démarré le 14/07/2026)

Contexte — les 3 niveaux existants (debutant/intermediaire/confirme,
cf. §2.2 méthodologie) supposent tous une capacité à courir en continu.
Laurent a demandé une vraie prise en charge des grands débutants (jamais
couru, ou marche uniquement) avec des séances de type marche-course.

Décisions prises avec Laurent avant codage, validées contre plusieurs
sources (NHS Couch-to-5K, Runners Need, Marathon Handbook, Gymshark,
méthode Galloway) :

- Nouveau niveau **`grand-debutant`**, distinct de `debutant` — évite de
  complexifier les 12 sous-types de séance qualité existants avec une
  logique marche-course (un grand débutant n'a de toute façon pas sa
  place sur ces séances-là).
- Le marche-course est une **phase initiale transitoire**, pas un
  remplacement permanent de l'EF — une fois la course continue acquise,
  transition vers le niveau `debutant` classique (structure
  longue/EF/qualité).
- **Pas de sortie longue distincte** pendant cette phase : toutes les
  séances de la semaine sont identiques (même palier marche-course),
  conforme à tous les programmes de référence consultés — la notion de
  "longue" n'apparaît qu'une fois la course continue tenue.
- **Progression conditionnelle, pas de durée fixe** — chaque palier a un
  seuil minimal de séances validées avant de proposer le palier suivant,
  mais pas de saut automatique à date fixe (cohérent avec le principe
  "pas de saut brutal" déjà appliqué en v2.2, et avec ce que font tous
  les programmes de référence : 8 à 12+ semaines selon la personne, sans
  pénalité à répéter une semaine).
- **Garde-fou de durée** : si le coureur reste bloqué au même palier plus
  de 12 semaines, un avertissement informatif (pas bloquant) est généré
  plutôt que de laisser le plan traîner silencieusement sans que
  personne ne s'en aperçoive.
- Une seule variable bouge à la fois : la durée totale de séance reste
  stable (~25min) pendant que le ratio course/marche évolue — jamais les
  deux en même temps (principe retrouvé dans toutes les sources sur le
  run/walk method).

### 15.1 Moteur (FAIT et poussé le 14/07/2026, commit 7b4295b)

Dans `public/v2/engine/plan-generator.js` :

- `nbQualiteFor(nbSeances, niveau)` : `grand-debutant` → toujours 0.
- `placerSemaine(...)` : pour `grand-debutant`, court-circuite la
  logique longue/qualité/EF — toutes les séances de la semaine reçoivent
  `{ type: 'marche-course' }`. Garde-fou 48h entre séances dures
  toujours appliqué.
- `PALIERS_MARCHE_COURSE` : table de 7 paliers, du ratio 1min course /
  1min30 marche jusqu'à 30min de course continue (méthode Galloway),
  chacun avec un label et des durées course/marche en secondes.
- `genererContenuMarcheCourse({ palierId })` : génère le texte de séance
  (échauffement marche + N cycles course/marche + retour au calme), en
  ajustant le nombre de cycles pour tenir dans la durée cible fixe
  (~25min) — pas de kmEstime fiable à ce stade (pas d'allure établie).
- `palierMarcheCourseFor(seancesValideesPalierCourant, palierActuelId)` :
  détermine si le coureur est prêt pour le palier suivant (seuil : 2
  séances validées "reussie" au palier courant).
- `generatePlanMarcheCourse(profil, params)` : chemin de génération
  dédié, appelé depuis `generatePlan()` dès que `profil.niveau ===
  'grand-debutant'` — pas de phases Construction/Spécifique/Affûtage
  (qui supposent une allure course/Riegel dont ce public n'a pas encore
  besoin), pas d'estimation d'allure. Le plan est une répétition du
  palier courant (`profil.palierMarcheCourse`) sur toutes les semaines ;
  changer de palier nécessite de régénérer le plan avec la nouvelle
  valeur (pas de recalcul automatique en cours de plan à ce stade).
- `analyserProgressionMarcheCourse(plan)` : lit les statuts des séances
  marche-course déjà vécues (`statuses`), compte les séances "reussie"
  depuis le début du palier courant, retourne si prêt pour le palier
  suivant + déclenche le warning `MARCHE_COURSE_PROGRESSION_LENTE` au-delà
  de `GARDE_FOU_SEMAINES_MARCHE_COURSE` (12) semaines sans progression.
  Distincte du mécanisme d'adaptation classique (`analyserAdaptations`,
  §33) car ici il s'agit de faire avancer un palier, pas d'ajuster un
  volume — `calculerScoreSemaine` ignore de toute façon les séances
  `marche-course` (ne compte que qualité/longue), donc les deux
  mécanismes ne se marchent pas dessus.

Testé (fichiers de test manuels, non committés — à formaliser en vrai
fichier `test-marche-course.mjs` lors d'une prochaine session) : cas
niveau/nbQualite, placement de semaine, contenu par palier, progression
conditionnelle, garde-fou déclenché au bon seuil, génération de plan
complet. Aucune régression sur `test-plan-generator.mjs` existant
(exit 0, tous les cas debutant/intermediaire/confirme toujours OK).

### 15.2 Reste à faire (pas commencé)

- **Duplication classic** : régénérer
  `public/engine-classic-scripts/plan-generator.classic.js` avec les
  mêmes ajouts (export retirés via `sed`, cf. §12) — sans ça, `index.html`
  ne voit aucun de ces changements malgré le push du moteur ES.
- **Wizard** (`public/v2/index.html`) : ajouter le choix `grand-debutant`
  dans la sélection de niveau, idéalement avec une question de type
  "je n'ai jamais couru / je marche mais ne cours pas encore" plutôt que
  d'exposer directement le mot "grand débutant".
- **App/dashboard** (`public/index.html`) : afficher le contenu
  marche-course (actuellement juste un texte généré, pas de rendu
  spécifique), capter le statut de chaque séance (reussie/ratee/adaptee),
  déclencher le changement de palier (mettre à jour
  `profil.palierMarcheCourse` puis régénérer le plan — pas de mécanisme
  de régénération partielle pour l'instant) une fois
  `analyserProgressionMarcheCourse` confirme `pretPourSuivant`.
- **Transition vers `debutant`** : au dernier palier (course continue
  30min), pas encore de mécanique définie pour basculer proprement vers
  un vrai plan `debutant` avec structure longue/EF/qualité — à
  concevoir lors d'une prochaine session (probablement : proposer la
  création d'un nouveau plan `debutant` une fois le dernier palier
  validé, plutôt qu'une transformation automatique en place).
- Le warning `MARCHE_COURSE_PROGRESSION_LENTE` n'est affiché nulle part
  dans l'UI pour l'instant (le mécanisme existe côté moteur, pas encore
  câblé à un composant d'affichage).
