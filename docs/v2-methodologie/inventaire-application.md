# Inventaire de l'application "Run by Léa"

> Vue d'ensemble de référence — à relire en début de session pour retrouver le contexte
> sans re-parcourir tout le repo. Mis à jour au 13 juillet 2026 (chantier ACWR en cours).
> Pour l'historique des décisions et le "pourquoi", voir les autres docs de ce dossier
> (bibliotheque-seances.md, convergence-v1-v2.md, etc.) et les mémoires de session.

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
│   └── v2/
│       ├── index.html             # Wizard de création de plan (~120K)
│       ├── manifest.json, sw.js   # PWA v2
│       └── engine/                # Moteur v2 (modules ES, source de vérité)
│           ├── plan-generator.js  # Cœur : génération de plan, séances, adaptations (~100K)
│           ├── gist-sync.js       # Sync multi-device via GitHub Gist
│           ├── pdf-export.js      # Export PDF du plan (jsPDF)
│           ├── strava.js          # Intégration Strava côté client (tokens, volume)
│           ├── weather.js         # Intégration météo côté client
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

## 4. Écrans de l'app principale (`index.html`)

Fonctions de rendu principales (`render*`) :

- `renderSelecteurPlan` — sélection entre plusieurs plans actifs
- `renderDashboard` — écran d'accueil, résumé de la semaine
- `renderWeeks` / `renderWeekDetail` — vue calendrier et détail d'une semaine
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
| Rework présentation wizard | 🔜 À revalider avec Laurent |
| v2.5 commercialisation (Supabase, Stripe, multi-user) | 🔜 Architecture décidée, pas codée |

## 10. Principes transverses à retenir

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
