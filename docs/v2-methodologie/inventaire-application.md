# Inventaire de l'application "Yoria"

> Vue d'ensemble de référence — à relire en début de session pour retrouver le contexte
> sans re-parcourir tout le repo. Mis à jour au 16 juillet 2026.
>
> **État courant (résumé)** : v2.9 tout juste clos — voir §21 pour le détail complet
> de cette dernière session (paliers marche-course en durée continue + validation
> manuelle, carte de progression permanente au dashboard, correctif dates de séances,
> **correctif de sécurité critique** sur la déconnexion entre comptes, écran "Aucun
> plan en cours", correctif de redirection grand-débutant, et **reconstruction du
> module client Strava** qui n'existait en réalité jamais). v2.8 (§17-§18) avait
> traité le niveau grand-débutant/marche-course, la fiabilité Supabase (garde-fou
> anti-chevauchement, sauvegarde), l'écran d'accueil Consulter/Créer, et plusieurs
> bugs de synchro/onboarding. Le rebranding Yoria (§13-§14) et l'authentification
> Supabase (§8bis, v2.5) sont clos et stables. Publication Play Store en piste de
> test interne (§11). Site "beta" indépendant à ne jamais toucher (§18.1).
> **Domaine principal yoria.run** actif et opérationnel (§22) — Vercel (projet
> renommé `yoria` le 16/07), Supabase et Strava tous alignés dessus ; **config
> Android/TWA également migrée vers yoria.run le 16/07** (§22.2), suite à un
> bug de barre d'adresse réapparue, corrigé et validé sur le téléphone réel.
> **Nettoyage identité complet le 16/07** (§23) : plus aucune trace de "Run by Léa"
> ou `plan-10k` dans le code fonctionnel — le persona du coach IA s'appelle
> désormais Yoria (prompts, UI), headers de fichiers corrigés, doc dédupliquée.
> Seuls le package Android (`app.vercel.plan_10k_alpha.twa`) et `assetlinks.json`
> restent intentionnellement inchangés (identifiant permanent Play Store).
>
> Pour l'historique des décisions et le "pourquoi", voir les autres docs de ce dossier
> (bibliotheque-seances.md, convergence-v1-v2.md, etc.) et les mémoires de session.
>
> ⚠️ **Cet inventaire doit être mis à jour à chaque push** — voir §10, principe
> "Inventaire à jour". Un push qui change la structure, les écrans, les clés de
> stockage, les intégrations ou l'état des chantiers sans mettre à jour ce fichier
> est incomplet.

## 1. Vue d'ensemble

**Yoria** (anciennement "Run by Léa", renommée le 14 juillet 2026 — voir §13)
— PWA coach running, génère des plans d'entraînement adaptatifs.
Déployée sur Vercel : domaine principal **`yoria.run`** (domaine personnalisé
actif depuis le 15 juillet 2026, voir §22 ; `yoria-running.vercel.app` et
`plan-10k-alpha.vercel.app` redirigent tous deux en 308 vers `yoria.run`).
Projet Vercel renommé `yoria` (16 juillet 2026). Repo GitHub : `olayanne3-wq/yoria`.
Stack : vanilla HTML/CSS/JS, hosting statique Vercel, API serverless dans `/api/`.
Utilisateur principal actuel : Laurent, qui prépare un Semi le 1er novembre 2026.

## 2. Arborescence du repo

```
yoria/
â”œâ”€â”€ api/                          # Endpoints serverless (Vercel/Node)
â”‚   â”œâ”€â”€ coach.js                  # Proxy vers Claude Haiku (messages coach courts)
â”‚   â”œâ”€â”€ strava.js                 # OAuth Strava (auth, callback, refresh, activities)
│   ├── weather.js                # Proxy Open-Meteo (prévision + alerte chaleur >28°C)
â”‚   â””â”€â”€ config.js                  # Expose SUPABASE_URL/SUPABASE_ANON_KEY (variables
│                                    # d'environnement Vercel) au client — ajouté le
│                                    # 13 juillet 2026. Route déclarée explicitement dans
â”‚                                    # vercel.json (routing en liste blanche, absence
â”‚                                    # initiale de cette route causait un 404).
├── docs/
â”‚   â”œâ”€â”€ README.md                 # Point d'entrée de la doc — ajouté le 16 juillet 2026
â”‚   â”œâ”€â”€ legal/                    # Documentation légale/conformité — ajoutée le 16 juillet
â”‚   â”‚                             # 2026 (11 fichiers) : README.md, privacy.md,
â”‚   â”‚                             # mentions-legales.md, cgu.md, cgv.md, conditions-beta.md,
â”‚   â”‚                             # cookies.md, google-play-data-safety.md,
â”‚   â”‚                             # apple-privacy-labels.md, rgpd-registre.md, ia-policy.md,
â”‚   â”‚                             # changelog-legal.md
â”‚   â””â”€â”€ v2-methodologie/          # Documentation méthodologique et architecture
â”‚       â”œâ”€â”€ inventaire-application.md # CE FICHIER
│       â”œâ”€â”€ bibliotheque-seances.md   # Méthodologie détaillée des types de séances qualité
│       â”œâ”€â”€ convergence-v1-v2.md      # Historique des décisions de convergence v1→v2
â”‚       â”œâ”€â”€ coherence-semaine-test.md
â”‚       â”œâ”€â”€ jalons-narratifs.md
â”‚       â”œâ”€â”€ jour-de-course.md
â”‚       â”œâ”€â”€ notes-meteo.md
â”‚       â”œâ”€â”€ notes-pratiques.md
â”‚       â”œâ”€â”€ reperes-qualitatifs.md
â”‚       â”œâ”€â”€ fiche-store.md            # Textes de fiche Play Store (titre, description, mots-clés)
â”‚       â””â”€â”€ source-donnees-seances.md
â”œâ”€â”€ public/
│   ├── index.html                 # App principale (dashboard) — sert le plan v2, ~300K
│   ├── manifest.json, sw.js, icônes  # PWA v1 (racine)
│   ├── icon.svg                   # Source vectorielle de l'icône (silhouette coureur
│   │                               # orange sur fond arrondi) — utilisée aussi pour
│   │                               # générer les visuels Play Store
│   ├── privacy.html               # Politique de confidentialité — ajoutée le
â”‚   â”‚                               # 13 juillet 2026 pour la publication Play Store.
│   │                               # Accessible à /privacy.html
â”‚   â”œâ”€â”€ .well-known/
│   │   └── assetlinks.json        # Digital Asset Links — lie le domaine à l'app
â”‚   â”‚                               # Android TWA (Trusted Web Activity). Contient le
│   │                               # SHA256 du certificat de signature. À mettre à jour
│   │                               # à chaque changement de keystore, et une dernière
│   │                               # fois avec le fingerprint Play App Signing après
│   │                               # publication (cf. §11)
â”‚   â”œâ”€â”€ engine-classic-scripts/    # Copies non-module (.classic.js) du moteur v2,
│   │                               # utilisées par index.html (script classique).
│   │                               # À régénérer manuellement à chaque modif du moteur.
│   │                               # Inclut auth.classic.js (dérivé de v2/engine/auth.js,
│   │                               # 13 juillet 2026) et sync-storage.classic.js (dérivé de
│   │                               # v2/engine/sync-storage.js, 13 juillet 2026), attachés à
│   │                               # window.LkAuth et window.LkSync respectivement, plutôt
â”‚   â”‚                               # qu'aux globals habituels PLAN/ALL_SESSIONS.
│   │                               # plan-forme.classic.js (13 juillet 2026) dépend des
â”‚   â”‚                               # globales de plan-generator.classic.js (formatPace,
â”‚   â”‚                               # paceFromTime, riegelPredict, PACE_RATIOS, placerSemaine,
â”‚   â”‚                               # genererContenuEF/Longue, repartirVolumeSemaine,
│   │                               # computeFcMaxTanaka, computeZonesFC) — chargé après lui
│   │                               # dans index.html, câblé (§12.3).
â”‚   â”‚                               # changelog.classic.js (13 juillet 2026) : contenu pur
│   │                               # (tableau VERSIONS, historique des versions affiché dans
│   │                               # Paramètres), extrait d'index.html pour l'alléger (~250
â”‚   â”‚                               # lignes de texte sans rapport avec la logique de rendu
│   │                               # environnante). Pas de dépendance au moteur — pose juste
│   │                               # VERSIONS en portée globale, lu par renderSettings().
│   │                               # N'A PAS de source de vérité en module ES séparé (pas de
│   │                               # v2/engine/changelog.js) : c'est un contenu propre à
│   │                               # index.html (v1), pas partagé avec le wizard v2 — donc pas
│   │                               # de duplication à maintenir, ce fichier classic EST la
│   │                               # source de vérité.
â”‚   â””â”€â”€ v2/
│       ├── index.html             # Wizard de création de plan (~120K)
â”‚       â”œâ”€â”€ manifest.json, sw.js   # PWA v2
│       └── engine/                # Moteur v2 (modules ES, source de vérité)
│           ├── plan-generator.js  # Cœur : génération de plan, séances, adaptations (~100K)
â”‚           â”œâ”€â”€ plan-forme.js      # Mode Forme (v2.6, 13 juillet 2026) : cycle glissant sans
│           │                       # date de course, réutilise les briques génériques de
â”‚           â”‚                       # plan-generator.js (placerSemaine, genererContenuEF/Longue,
â”‚           â”‚                       # repartirVolumeSemaine, computeFcMaxTanaka, computeZonesFC)
│           │                       # — n'importe jamais computePhases/ROTATION_SOUS_TYPE/
│           │                       # placerSeanceTest/placerSeanceCourse. Codé et testé
│           │                       # (14 tests), câblage wizard/index.html pas encore fait —
│           │                       # voir §12.
â”‚           â”œâ”€â”€ gist-sync.js       # Sync multi-device via GitHub Gist. Contient aussi le
â”‚           â”‚                       # garde-fou anti-chevauchement entre plans (course ET
│           │                       # forme, généralisé le 13 juillet 2026, cf. inventaire
│           │                       # §12.4) — trouverPlanEnConflit(), dateFinPeriodeActive(),
│           │                       # et le blocage permanent d'un plan Forme clôturé dans
â”‚           â”‚                       # sauvegarderPlan().
â”‚           â”œâ”€â”€ pdf-export.js      # Export PDF du plan (jsPDF)
│           ├── strava.js          # Intégration Strava côté client (tokens, volume) — réutilisé
│           │                       # tel quel par le mode Forme (déjà générique, aucune
│           │                       # dépendance à distance/objectif de course)
│           ├── weather.js         # Intégration météo côté client
│           ├── auth.js            # Auth Supabase (écran connexion/inscription, session) — v2.5, 13 juillet 2026
│           ├── sync-storage.js    # Synchronisation localStorage ↔ Supabase, incl. migration rétroactive one-shot — v2.5, 13 juillet 2026
â”‚           â”œâ”€â”€ v1-bridge.js       # Traduction plan v2 â†’ format v1 (pour affichage classic)
│           └── test-*.mjs         # Suite de tests (14 fichiers, un par module/fonctionnalité,
â”‚                                    # incl. test-plan-forme.mjs depuis le 13 juillet 2026)
â”œâ”€â”€ vercel.json                    # Routage : /api/*, /v2, fallback statique
â””â”€â”€ package.json                   # { "type": "module" }
```

**Projet Android local (hors repo)** — `C:\Users\olaya\Yoria\` (renommé
depuis `runbylea-android-v3` le 16 juillet 2026) sur la machine de Laurent.
Généré via Bubblewrap (TWA), contient `android.keystore` (clé de
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
- `lk_github_token` — sync GitHub Gist (`lk_gist_id` retiré le 16 juillet
  2026, résidu mort de l'ancien backup v1, cf. §23bis)
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
    â†’ table `profils_coureur` ; tokens Strava/GitHub/Gist â†’ table
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
  (`el("div",...)` juste avant `"· plan-10k-alpha.vercel.app"` à l'époque —
  affiche désormais `"· yoria.run"`, corrigé le 16 juillet 2026)
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
| v1â†’v2 switch | ✅ Clos (7 juillet) |
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
| Navigation par flèches wizard (17.6) | ✅ Clos (15 juillet) — voir §19 |
| Blocage validation séances futures (17.4) | ✅ Clos (15 juillet) — voir §20 |
| Paliers marche-course en durée continue + validation manuelle (17.5) | ✅ Clos (15 juillet) — voir §21 |
| Prochain palier affiché en permanence au dashboard | ✅ Clos (15 juillet) — voir §21 |
| Correctif dates de séances (calendrier ne suppose plus lundi) | ✅ Clos (15 juillet) — voir §21 |
| Correctif sécurité : purge localStorage à la déconnexion | ✅ Clos (15 juillet) — voir §21 |
| Écran "Aucun plan en cours" (plan de repli marqué explicitement) | ✅ Clos (15 juillet) — voir §21 |
| Grand débutant redirigé vers le mauvais flux (accent) | ✅ Clos (15 juillet) — voir §21 |
| Module client Strava manquant (wizard) | ✅ Clos (15 juillet) — voir §21 |
| Domaine personnalisé yoria.run | ✅ Clos (15 juillet) — voir §22 |
| Nettoyage identité complet (plus de Léa/plan-10k) | ✅ Clos (16 juillet) — voir §23 |
| Migration Android/TWA vers yoria.run | ✅ Clos (16 juillet) — voir §22.2 |
| Bug intermittent écran d'accueil wizard (course async) | ✅ Clos (16 juillet) — voir §24 |
| Génération et signature du bundle .aab (jamais fait avant) | ✅ Fait (16 juillet) — voir §25 |
| v2.5 authentification Supabase | ✅ **Publiée** (13 juillet) — auth, migration rétroactive, wizard protégé, sync temps réel (Realtime), file d'attente, variables d'env Vercel, Réglages nettoyés |
| v2.5 commercialisation (Stripe) | 🔜 Non commencé |
| **Publication Play Store (TWA)** | 🟡 **En cours** (13 juillet) — compte développeur vérifié le 16/07, voir §11 pour le détail complet |

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
  malgré les permissions Contents Read+Write du token PAT. Confirmé de
  nouveau le 17/07/2026. Pattern retenu : push via l'API GitHub REST directe
  (curl/Python `urllib.request`, token PAT fourni en début de session par
  Laurent), toujours avec un SHA récupéré juste avant chaque écriture (le SHA
  n'est jamais mis en cache entre deux pushes). Rediscuter si le connecteur
  évolue.
- **Toute modification d'un plan déjà en place doit exclure les séances
  passées** (garde-fou anti-régénération rétroactive, cf. §27.3) — vérifié
  sur les 3 mécanismes identifiés au 17/07/2026 (`changerPalierGrandDebutant`,
  `appliquerAdaptations`, `regenererStructuresIntervalles`) ainsi que le
  Module 5 du moteur de décision (`decision-engine-apply.classic.js`, qui
  exclut déjà les dates passées via `reconstruireJoursAvenirDeLaSemaine`).
  **Ce n'est pas un garde-fou générique** appliqué automatiquement à toute
  écriture sur `plan.semaines`/`plan_brut` — toute future fonctionnalité qui
  modifie le contenu d'un plan existant (`plans_actif`, jamais
  `plans_original`) doit implémenter elle-même la vérification de date avant
  toute modification de séance/semaine.

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

**Package Android** : `app.vercel.plan_10k_alpha.twa` (identifiant permanent,
volontairement inchangé même après le passage à `yoria.run` — le changer
casserait toute mise à jour future de l'app publiée, cf. §22.2)
**Domaine associé** : `yoria-running.vercel.app` (pas encore migré vers
`yoria.run` côté config Android/TWA — reste à faire avant la publication
Play Store définitive, cf. §22.2)

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

**Mise à jour 16/07/2026** : **vérification du compte développeur validée**
— confirmation Google reçue ("Toutes vos applis ont bien été enregistrées
pour répondre aux exigences de validation des développeurs Android"), le
package `app.vercel.plan_10k_alpha.twa` est bien enregistré. Le blocage
qui empêchait de continuer sur Play Console est donc levé. Restent à
faire, tous encore ouverts à cette date : captures d'écran, classification
du contenu, Data Safety form, création de l'app dans Play Console et
upload du `.aab`.
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
  `plan10k-v21` â†’ `yoria-v1`, `plan10k-v2-v2` â†’ `yoria-v2-v1`, pour forcer
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
- Rouge erreur (`#ef4444`, `#f87171`) et jaune (`#eab308`) â†’ orange
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

---

## 14. Suite du rebranding Yoria (14 juillet 2026, session ultérieure)

### 14.1 Bug résiduel du wizard — deuxième couche

Le correctif de la section 13.6 (`chargerPlanExistant` ne masquait pas
`#choix-mode-contenu`) s'est révélé incomplet : après correction, le clic
sur un plan changeait bien d'écran (`data-step="10"` actif) mais
affichait un écran vide (seulement l'en-tête et le bouton retour
visibles).

**Diagnostic** (même méthode d'élimination par console qu'en 13.6) :
l'écran de résultats et tout son contenu (`renderResults()` bien exécuté,
semaines `week-1` à `week-9` bien présentes dans le DOM) avaient
`getBoundingClientRect()` à `width:0, height:0` — remontée de la
hiérarchie DOM parent par parent jusqu'à trouver la vraie cause :
`#wizard-course-contenu` (conteneur englobant tout le flux "wizard
course", par opposition au flux "Mode Forme") était resté en
`style="display:none"`, un niveau au-dessus de `#choix-mode-contenu`
déjà corrigé. `chargerPlanExistant()` ne l'affichait pas, contrairement à
`choisirMode('course')` qui le fait.

**Correctif** : ajout de
`document.getElementById('wizard-course-contenu').style.display = 'block';`
dans `chargerPlanExistant()`, en plus du correctif précédent.

**Leçon retenue** : pour ce genre de bug d'affichage sans erreur console,
la méthode fiable est de remonter la hiérarchie DOM parent par parent en
testant `getBoundingClientRect()` à chaque niveau jusqu'à localiser le
premier ancêtre à `width:0/height:0` — c'est souvent LUI le vrai
coupable, pas l'élément final où le symptôme est observé.

### 14.2 Logo Yoria sur l'écran de connexion

Ajout du symbole Yoria (SVG dégradé bleu/turquoise, identique à celui
utilisé dans `index.html`, 72×72px) en haut du bandeau de connexion,
au-dessus du titre et du sous-titre — appliqué aux deux fichiers
(`auth.js` et `auth.classic.js`). Validé sur maquette avant codage
(widget Imagine) avant implémentation.

**Résidus de bug de double-suffixe trouvés au passage dans ces mêmes
fichiers** (même famille que sections 13.3/13.5) : `var(--text)22` et
`var(--text)99` — deux syntaxes CSS invalides jamais détectées car
absentes des audits précédents (ces fichiers n'avaient pas encore été
scannés avec le bon pattern de recherche). Corrigées vers
`var(--border)` et `var(--text-muted)` respectivement.

### 14.3 Recoloration des badges de type de séance par intensité

Demande de Laurent : la couleur des badges de type de séance (VMA, EF,
LONGUE, etc. dans le planning) ne convenait pas — plusieurs types
différents partageaient la même couleur (`--accent`/bleu utilisé pour
EF, VMA, TEST et RACE simultanément), rendant le badge peu informatif.

**Maquette présentée avant codage** (widget Imagine, 3 options) :
- Option A — par intensité, fond léger (opacité)
- Option B — 3 groupes fonctionnels, fond léger
- Option C — même logique que A mais en teinte pleine (plus contrastée)

**Option C retenue.** Mapping final appliqué à `STYPES` dans
`index.html` :
- EF, LONGUE â†’ turquoise (`--accent2`)
- SEUIL, SPEC/allure course â†’ bleu (`--accent`)
- VMA, TEST, RACE â†’ orange (`--warn`)

**Bug de double-suffixe découvert en implémentant ceci** (troisième
occurrence de cette famille de bug, cette fois dans un contexte
différent) : le pattern `st.color+"22"` très répandu dans `index.html`
(bordures et fonds de cartes de séance, bannières, stats) concatène un
suffixe d'opacité hexadécimal directement sur `st.color`, qui vaut
désormais une variable CSS (`var(--accent)` etc.) plutôt qu'un hex brut
— générant une chaîne invalide type `var(--accent)22`, silencieusement
ignorée par le navigateur.

**Correctif structurel** : ajout d'un champ `colorSoft` dans chaque
entrée `STYPES`, pré-formaté en `rgba(var(--x-rgb),` (sans le nombre
d'opacité ni la parenthèse fermante), à compléter par l'appelant selon le
niveau d'opacité voulu — ex. `st.colorSoft+"0.13)"` produit
`rgba(var(--accent2-rgb),0.13)`, une couleur CSS valide qui suit le
thème. Six emplacements corrigés dans `index.html` : bannière "prochaine
séance clé", carte de séance du jour (avec sa variante `statusColor`
dynamique selon le statut ✅/⚠️/❌), badge de stats par type dans l'écran
Stats, carte de séance hebdomadaire, et la fonction `badge()` elle-même
(désormais en fond plein avec texte `var(--bg)`, conforme à l'option C).

**Point de vigilance retenu pour la suite** : toute variable CSS qui
contient déjà une couleur complète (`var(--x)`) ne doit JAMAIS recevoir
de suffixe d'opacité hexadécimal collé directement derrière
(`var(--x)+"22"`) — c'est le piège récurrent de cette session de
rebranding, rencontré au moins quatre fois sous des formes légèrement
différentes (sections 13.3, 13.5, 14.2, 14.3). Toujours utiliser le
pattern `rgba(var(--x-rgb), N)` pour composer une opacité personnalisée,
avec une variable RGB dédiée déclarée à côté de la variable couleur
complète.

### 14.4 Recoloration des badges dans le wizard v2 + label exact

Même demande étendue au wizard : badges recolorés selon le même mapping
(EF/Longue turquoise, Seuil/Allure course bleu, VMA orange), classes CSS
`.badge.vma`, `.badge.seuil`, `.badge.spec`, `.badge.ef`, `.badge.longue`
passées en fond plein (`background: var(--signal)` etc.) avec texte
`var(--ink)` (couleur de fond du thème, contrastée), remplaçant l'ancien
fond en opacité réduite.

**Changement fonctionnel demandé en même temps** : le badge affichait
jusqu'ici le mot générique "Qualité" pour toute séance de type
`qualite`, quel que soit son sous-type réel. Remplacé par le vrai nom de
la famille détectée via `Engine.FAMILLE_SOUS_TYPE[a.sousType]` déjà
utilisée pour la couleur : "VMA", "Seuil", ou "Allure course" — "Qualité"
reste seulement en repli si la famille n'est pas reconnue (cas
théoriquement impossible avec les sous-types actuels, gardé par
robustesse).

### 14.5 Changelog (VERSIONS) — nouvelle entrée v2.7

Nouvelle entrée ajoutée en tête de `VERSIONS` dans
`public/engine-classic-scripts/changelog.classic.js` (source unique,
pas de fichier module séparé — cf. section 12.6) :

```js
{ ver:"v2.7", title:"Yoria — nouvelle identité et thème clair/sombre", current:true, notes:[...] }
```

Couvre en synthèse pour l'utilisateur final : le nouveau nom/identité
Yoria, le choix de thème clair/sombre dans Paramètres, la recoloration
des badges de séance par intensité, et les correctifs d'affichage liés.
Ancienne entrée `v2.6` repassée en `current:false`.

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

**Nettoyé le 16 juillet 2026** — confirmé résidu mort : `lk_gist_id`
(variable `gistId`, `index.html`) était stocké mais jamais réellement
consommé par la logique fonctionnelle des plans (`gist-sync.js`, aucune
référence). Retiré de trois endroits : `index.html` (variable `gistId`
supprimée, paramètre URL `?gist=` toujours ignoré silencieusement pour ne
pas casser un ancien lien déjà partagé) ; `CLES_INTEGRATIONS` et les 3
fonctions de sync (`migrerDonneesExistantes`, `precharger`,
`synchroniserVersSupabase`) dans `sync-storage.js`/`sync-storage.classic.js`
(synchronisées, aucun oubli). La colonne `gist_id` reste en base côté
Supabase (non supprimée) mais n'est plus jamais lue ni écrite — dette
technique résiduelle minime et sans risque, pas de raison de supprimer la
colonne elle-même. Le Gist backup v1 lui-même (côté GitHub) n'a pas été
supprimé — hors périmètre de ce nettoyage, aucune urgence.

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

## 15. Niveau "grand débutant" et séances marche-course (chantier clos le 14/07/2026)

Contexte — les 3 niveaux existants (debutant/intermediaire/confirme,
cf. §2.2 méthodologie) supposent tous une capacité à courir en continu.
Laurent a demandé une vraie prise en charge des grands débutants (jamais
couru, ou marche uniquement) avec des séances de type marche-course.

Décisions prises avec Laurent avant codage, validées contre plusieurs
sources (NHS Couch-to-5K, Runners Need, Marathon Handbook, Gymshark,
méthode Galloway) :

- Nouveau niveau **`grand-debutant`**, distinct de `debutant` — évite de
  complexifier les 12 sous-types de séance qualité existants avec une
  logique marche-course.
- Le marche-course est une **phase initiale transitoire**, pas un
  remplacement permanent de l'EF — une fois la course continue acquise,
  transition vers un vrai plan `debutant` (structure longue/EF/qualité),
  via une bannière dédiée plutôt qu'une conversion automatique en place
  (jugée risquée, cf. §15.4).
- **Pas de sortie longue distincte** pendant cette phase : toutes les
  séances de la semaine sont identiques (même palier marche-course),
  conforme à tous les programmes de référence consultés.
- **Progression conditionnelle, pas de durée fixe** — seuil minimal de
  séances validées avant de proposer le palier suivant, jamais de saut
  automatique à date fixe.
- **Garde-fou de durée** : au-delà de 12 semaines bloqué au même palier,
  avertissement informatif (pas bloquant).
- Une seule variable bouge à la fois : durée totale de séance stable
  (~25min), seul le ratio course/marche évolue.

### 15.1 Moteur — FAIT (commits 7b4295b, a22c6e1)

Dans `public/v2/engine/plan-generator.js` (dupliqué en classic) :

- `nbQualiteFor` / `placerSemaine` : `grand-debutant` → 0 qualité, pas de
  longue, uniquement séances `{ type: 'marche-course' }`. Garde-fou 48h
  entre séances toujours appliqué.
- `PALIERS_MARCHE_COURSE` : 7 paliers, de 1min course/1min30 marche à
  30min de course continue (méthode Galloway).
- `genererContenuMarcheCourse({ palierId })` : texte de séance généré
  (échauffement + N cycles + retour au calme), durée totale stable.
- `palierMarcheCourseFor` : seuil de 2 séances "✅" validées avant de
  proposer le palier suivant.
- `generatePlanMarcheCourse` : chemin de génération dédié (appelé
  automatiquement par `generatePlan()` si `profil.niveau ===
  'grand-debutant'`), sans phases Construction/Spécifique/Affûtage.
  Expose `mode: 'marche-course'`, `palierMarcheCourse`, `dateDebut` à la
  racine du plan (même contrat que le plan classique et que
  `plan-forme.js`, nécessaire pour `renderResults`/`v1-bridge.js`).
- `analyserProgressionMarcheCourse(plan)` : détecte si prêt pour le
  palier suivant (lit les statuts `"✅"` réels, pas des mots), déclenche
  `MARCHE_COURSE_PROGRESSION_LENTE` au-delà de 12 semaines de stagnation.
  Distincte d'`analyserAdaptations` (§33) : ici on fait avancer un
  palier, pas un ajustement de volume.

Testé : `test-plan-generator.mjs` (exit 0, aucune régression sur les 3
niveaux existants) + tests manuels ciblés (non committés — à formaliser
en `test-marche-course.mjs` dans une session dédiée) sur placement de
semaine, contenu par palier, progression conditionnelle, garde-fou,
génération de plan complet, intégration avec le pont v1.

### 15.2 Pont v1-bridge — FAIT (commits 473859f, 0a2f00e)

`public/v2/engine/v1-bridge.js` (dupliqué en classic) : nouveau type
`MARCHE_COURSE` dans `typeV1DepuisSeanceV2` et `traduirePlanVersFormatV1`
— contenu affiché tel quel (pas de découpage warmup/session/cooldown
comme pour les séances qualité, le format généré est déjà une phrase
lisible), `palierLabel` propagé pour un affichage futur plus riche côté
carte de séance si besoin.

### 15.3 Wizard — FAIT (commit b1d9fa7)

`public/v2/index.html` :

- Nouveau choix niveau "Je n'ai jamais couru" (Step 2), mappé sur
  `grand-debutant` — libellé volontairement accessible plutôt que
  d'exposer le terme technique "grand débutant".
- Steps 3 (volume actuel), 4 (chrono de référence), 5 (objectif chrono)
  **sautés automatiquement** dans les deux sens de navigation
  (`estGrandDebutant()` + saut conditionnel dans `nextStep`/`prevStep`)
  — décision explicite avec Laurent : plus honnête que des valeurs par
  défaut invisibles, ces notions n'existent pas pour ce profil.
- Step 6 (échéance) adapté : libellés changés ("Jusqu'à quand ?" /
  "Fin du bloc" au lieu de "Jour de la course"), bloc "Infos de la
  course" (nom/lieu/lien) masqué.
- `collectParamsFromWizard` : `palierMarcheCourse: 0` à la création,
  constantes neutres (`'5K'`, `'30:00'`) pour `distance`/`tempsReference`
  /`objectif` — jamais affichées, seulement pour satisfaire la signature
  de `generatePlanMarcheCourse` qui ne les utilise pas.
- `renderResults` : court-circuit dédié pour `plan.mode ===
  'marche-course'` (pas d'allures/zoneFC à afficher, palier de départ
  affiché à la place).

### 15.4 Dashboard — FAIT (commit b52b1ca)

`public/index.html` :

- `STYPES.MARCHE_COURSE` ajouté (même famille visuelle que EF — effort
  d'endurance douce, pas une séance d'intensité). Couvre automatiquement
  la plupart des affichages via les nombreux replis
  `STYPES[type]||STYPES.REPOS` déjà présents dans le code.
- **Bannière de progression de palier** (pattern calqué sur la bannière
  d'adaptation existante, §33) : "🎉 Prêt·e pour la suite ?" avec deux
  boutons — "Palier suivant" (régénère le plan avec
  `palierMarcheCourse + 1`, sauvegarde si connecté) et "Continuer ce
  palier" (mémorise le refus pour CE palier précis, pas définitif —
  disparaît si on retombe dans la même situation à un palier différent).
- **Bannière de transition vers `debutant`** au dernier palier (course
  continue 30min) validé : "🏆 Tu cours en continu !" avec un lien vers
  `/v2` (même pattern que "🏁 Configurer un plan" déjà existant) pour
  créer un vrai plan `debutant`, plutôt qu'une conversion automatique en
  place — et un bouton "Pas encore" pour repousser sans y être forcé.
- Warning de stagnation (`MARCHE_COURSE_PROGRESSION_LENTE`) affiché en
  bannière discrète (💛) dès qu'il se déclenche, indépendamment du reste.

### 15.5 Bug corrigé au passage : `POIDS_STATUT` neutralisait
### `analyserAdaptations()` depuis un moment (commits a22c6e1, 7f823ad)

Repéré en corrigeant le même type d'erreur sur
`analyserProgressionMarcheCourse` : `POIDS_STATUT` utilisait des clés
textuelles (`ratee`/`adaptee`/`reussie`) qui ne correspondaient à AUCUN
statut réel jamais stocké par l'app — les vrais statuts sont des emojis
(`"✅"`/`"❌"`/`"⚠️"`/`"😴"`, cf. `SOPTS` dans `index.html`).
`POIDS_STATUT[statut]` retournait donc toujours `undefined`, neutralisé
silencieusement par le repli `?? 0` — chaque séance ratée comptait pour
0 au lieu de 1 dans `calculerScoreSemaine`. Conséquence concrète : la
bannière "🔄 Adaptation suggérée" ne s'affichait JAMAIS, quel que soit le
nombre de séances ratées, depuis l'introduction de ce mécanisme.

Corrigé : `POIDS_STATUT = { '❌': 1, '⚠️': 0.5, '✅': 0 }`. Validé par un
test ciblé (2 séances dures marquées "❌" sur une semaine → score 2 →
semaine suivante correctement proposée à l'adaptation, alors qu'avant
le correctif rien ne se déclenchait jamais).

### 15.6 Reste à faire

- **Tests réels sur l'app déployée** — pas encore fait à la clôture de
  cette session, à vérifier dès que Vercel a redéployé : parcours wizard
  complet en "Je n'ai jamais couru", validation de séances, apparition
  de la bannière de progression, passage de palier, bannière de
  transition au dernier palier.
- Fichier de test formel `test-marche-course.mjs` à créer (les tests
  actuels sont des scripts manuels non committés).
- Le calcul de km prévisionnel affiché sur la carte "Aujourd'hui"
  (`index.html`, repli `pace=6` par défaut pour tout type non EF/LONGUE/
  VMA/SPEC/SEUIL) donnera une estimation approximative pour
  `MARCHE_COURSE` — pas cassé, juste imprécis (le vrai `kmEstime` du
  moteur est `null` pour ce type, faute d'allure établie). Pas
  prioritaire, mais à garder en tête si Laurent le remarque.

## 16. Bug corrigé : synchro Strava cassée après rebranding (14/07/2026, session ultérieure)

**Symptôme** : "❌ Erreur Strava" / "Authorization Error — access_token invalid"
lors de la synchronisation, alors que Laurent venait de se reconnecter en
bonne et due forme (flow OAuth complet : bouton "Connecter Strava" →
autorisation sur strava.com → callback).

**Cause** : `api/strava.js` construit le `redirect_uri` dynamiquement à
partir de `req.headers.host` (§ ci-dessus, code inchangé depuis longtemps
et volontairement dynamique pour ne pas coder un domaine en dur). Le
renommage du repo `plan-10k` → `yoria` (§13/§14.5) a fait apparaître un
**nouveau domaine Vercel auto-généré**, `yoria-running.vercel.app`, en plus
de l'historique `plan-10k-alpha.vercel.app` — les deux coexistent
(`vercel_get_project` confirme domains: yoria-running.vercel.app,
plan-10k-alpha.vercel.app, plan-10k-olayanne.vercel.app,
plan-10k-git-main-olayanne.vercel.app). Laurent accédait à l'app via ce
nouveau domaine, dont le `redirect_uri` calculé
(`https://yoria-running.vercel.app/api/strava/callback`) ne correspondait
pas à l'**Authorization Callback Domain** configuré côté paramètres Strava
(qui n'autorisait que `plan-10k-alpha.vercel.app`) — l'échange OAuth
aboutissait donc à un token invalide côté Strava.

**Diagnostic** : logs runtime Vercel (via le connecteur MCP Vercel,
nouvellement connecté cette session) montrant `/api/strava/activities`
répondant `200`/`304` (donc pas de crash serveur) — le vrai signal est venu
du corps de la réponse relayée telle quelle par l'API (`{"message":
"Authorization Error", "errors": [{"resource": "Athlete", "field":
"access_token", "code": "invalid"}]}`), visible en inspectant la requête
réseau côté navigateur (DevTools). Confirmé par l'absence totale de
`/api/strava/auth` et `/api/strava/callback` dans les logs malgré un
premier essai de reconnexion signalé par Laurent — indice que quelque
chose empêchait le flow d'aboutir normalement, avant d'identifier la vraie
cause (mismatch de domaine, pas un souci de cache token).

**Corrigé** : Laurent a mis à jour l'Authorization Callback Domain côté
paramètres Strava (strava.com/settings/api, app Client ID 260339) pour
pointer vers `yoria-running.vercel.app`. Validé par un nouveau test
complet (logs confirmant `/auth` 302 → `/callback` 302 [code reçu] →
`/activities` 200 à 23:33 le 14/07/2026).

**Point de vigilance pour l'avenir** : Strava n'accepte qu'un seul domaine
dans ce champ — si Laurent bascule à nouveau entre domaines Vercel (ex.
retour à `plan-10k-alpha.vercel.app`, ou un futur domaine personnalisé),
la même erreur réapparaîtra et nécessitera de re-changer ce réglage côté
Strava. Envisager à terme un domaine personnalisé fixe (ex. via Vercel
Domains) plutôt que de dépendre des domaines `*.vercel.app` auto-générés,
qui peuvent changer à chaque renommage de repo.

## 17. v2.8 — Grand débutant, plans multiples & fiabilité Supabase (15/07/2026)

Chantier démarré en fin de session du 14/07 (recueil de 8 points avec
Laurent, alors non codé) et implémenté le 15/07/2026. Périmètre initial
en §17 (désormais historique, voir sous-sections ci-dessous pour l'état
réel implémenté) : refonte du grand-débutant, paliers de durée, séances
marche-course sur Strava, blocage séances futures, wizard sans données de
profil, navigation par flèches, suggestion de changement de niveau.

**Fait dans cette session** (17.1, 17.7 partiellement, 17.9 nouveau,
plus plusieurs bugs de fiabilité découverts en testant) : voir §17.1 à
§17.11 ci-dessous. **Pas encore fait** : 17.2 (déjà réglé par 17.1),
17.4 (blocage séances futures), 17.5 (paliers de durée continue — encore
sur l'ancien système ratio course/marche), 17.6 (flèches de navigation),
17.8 (suggestion de changement de niveau).

### 17.1 Grand débutant rattaché au Mode Forme — FAIT

Revient sur le choix initial du chantier marche-course (v2.0, alors dans
`plan-generator.js`). `generatePlanFormeMarcheCourse` (nouveau, dans
`plan-forme.js`) génère le plan grand-débutant en bloc glissant de 4
semaines (`TAILLE_BLOC_SEMAINES`, cohérent avec le Mode Forme classique
— pas une durée fixe à l'avance). `generatePlanMarcheCourse` et son
court-circuit dans `generatePlan()` (plan-generator.js) ont été retirés
— redondants. Restent dans `plan-generator.js`, réutilisés par
`plan-forme.js` : `nbQualiteFor`, `placerSemaine` (cas grand-debutant),
`PALIERS_MARCHE_COURSE`, `genererContenuMarcheCourse`,
`palierMarcheCourseFor`, `analyserProgressionMarcheCourse` (adaptée pour
lire `plan.mode === 'forme' && plan.sousMode === 'marche-course'` au lieu
de l'ancien `plan.profilOrigine`).

### 17.7 (partiel) Niveau retiré du wizard, profil unifié — FAIT

- `profilCoureur.niveau` ajouté (4 valeurs : `grand-debutant`,
  `debutant`, `intermediaire`, `confirme`) — sélecteur dédié dans
  Réglages (grille 2×2), plus dans le wizard.
- Écran d'onboarding (`monterEcranOnboarding`, auth.js) affiché une
  seule fois après connexion si `profilCoureur.niveau` est vide — année
  de naissance, FC max, niveau (avec "Je n'ai jamais couru" en option).
  Sync Supabase explicite (le mécanisme `save()` habituel n'est pas
  encore défini à ce stade du chargement).
- Champs année de naissance / FC max retirés des deux wizards (course et
  forme) — lus depuis `lk_profil_coureur` au lieu de champs de saisie.
- **"Grand débutant" est une valeur du niveau (profil), pas un choix du
  wizard forme** — correction en cours de session : d'abord envisagé
  comme option dans le wizard Mode Forme, finalement placé dans le
  sélecteur de Réglages comme les 3 autres niveaux, pour cohérence.

### 17.9 Écran dédié grand débutant, onboarding → wizard direct — FAIT (nouveau, pas dans le recueil initial)

- Nouvel écran `wizard-grand-debutant-contenu` (`v2/index.html`) :
  volontairement minimal — jours disponibles + invitation Strava
  (optionnelle) + bouton "Générer mon plan". Pas de volume actuel, pas
  de temps de référence, pas d'accent : aucun de ces champs n'a de sens
  pour ce profil.
  - `renderDaysGrandDebutant` persiste la sélection de jours en
    sessionStorage (survit au reload forcé par le retour Strava).
  - `rafraichirBlocStravaGrandDebutant` affiche l'état connecté/non
    connecté, rappelée après capture du token (bug corrigé, voir §17.10).
- Redirection automatique depuis l'onboarding
  (`index.html?...` → `/v2?onboarding=grand-debutant`) si le niveau
  choisi est grand-débutant — court-circuite l'écran de choix
  course/forme, un grand débutant ne peut de toute façon créer qu'un
  plan Forme (`bloquerCourseSiGrandDebutant`, grise "Objectif course").
  Le flag survit au reload OAuth Strava via sessionStorage
  (`v2_onboarding_grand_debutant`), nettoyé une fois le plan généré.
- **Un seul plan actif à la fois pour un grand débutant** (décision de
  Laurent, 15/07/2026) : la carte "Créer un nouveau plan" est grisée
  tant qu'un plan grand-débutant est déjà actif — aucun nouveau plan
  (ni un autre grand-débutant, ni forme, ni course) tant que celui-ci
  n'est pas clôturé. Vérifié dans `initialiserApresChargementEngine`.
- **Transition à 30min de course continue** : bannière "🏆 Tu cours en
  continu !" (déjà présente depuis le chantier initial) — le clic sur
  "Configurer mon prochain plan" clôture maintenant le plan (fixe
  `dateCloture` à aujourd'hui via `cloturerPlanSupabase`) AVANT de
  rediriger vers `/v2`, sinon le garde-fou anti-chevauchement (§17.11)
  bloquait la création du plan suivant.

### 17.10 Bugs corrigés en testant le flow grand-débutant (Strava, reload)

Plusieurs bugs découverts en testant le retour OAuth Strava depuis
l'écran dédié — tous liés au `window.location.reload()` forcé par
`capterRetourStravaOAuth()` (contournement d'un bug de rendu
Android/PWA) qui interrompt l'exécution en cours :

- Le nettoyage d'URL du flag `?onboarding=grand-debutant`
  (`history.replaceState`) effaçait TOUTE l'URL, y compris les tokens
  Strava présents dans la même URL au retour du callback — corrigé pour
  ne retirer que ce paramètre précis (`URLSearchParams.delete`), jamais
  toute l'URL.
- `rafraichirBlocStravaGrandDebutant()` n'était appelée qu'au tout
  premier affichage de l'écran, jamais après le reload du retour Strava
  — le bouton "Connecter Strava" restait affiché malgré une connexion
  réussie côté serveur. Corrigé : rappelée explicitement dans
  `initialiserApresChargementEngine` une fois le token capté.
- Sélection de jours réinitialisée à chaque reload (valeurs par
  défaut) — persistée en sessionStorage.

### 17.11 Bug majeur : Supabase silencieusement absent du chemin de sauvegarde principal — FAIT (corrigé)

Découvert en testant la génération d'un plan grand-débutant sans token
GitHub configuré (Laurent l'a volontairement retiré, décision
antérieure à cette session) :

- `nextStep()` (wizard, bouton "Terminer") ne tentait la sauvegarde
  QUE si un token GitHub (Gist) était présent — sans lui, **aucun plan
  n'était plus jamais sauvegardé du tout**, tous wizards confondus (pas
  spécifique au grand-débutant), malgré Supabase déjà en place depuis
  le chantier v2.5 (13/07). Inversé : `assurerPlanExiste` (Supabase)
  devient le mécanisme PRINCIPAL et bloquant ; Gist devient secondaire
  et best-effort (tenté seulement si un token existe encore).
- `chargerPlans()` (Gist) sans token retourne toujours `[]` — le
  dashboard (`index.html`) et `afficherPlansSauvegardes` (wizard)
  utilisaient encore ce seul chemin pour lister "mes plans". Aucune
  fonction Supabase équivalente n'existait (`assurerPlanExiste` ne fait
  que créer/vérifier UN plan, jamais lister). Nouvelle fonction
  `chargerPlansSupabase(userId)` (sync-storage.js + classic), utilisée
  en priorité partout où `chargerPlans()` l'était.
- **Garde-fou anti-chevauchement silencieusement contourné** : la
  logique existante (`trouverPlanEnConflit`, `datesChevauchent`,
  `dateFinPeriodeActive` — gist-sync.js) n'était appelée que dans
  `sauvegarderPlan()` (Gist), jamais dans `assurerPlanExiste()`
  (Supabase). Depuis le basculement vers Supabase comme mécanisme
  principal, plus aucun contrôle de chevauchement n'avait lieu, pour
  tous les modes. Réactivé : `assurerPlanExiste` importe et applique
  `trouverPlanEnConflit` avant toute insertion, relance une erreur
  explicite en cas de conflit (remonte jusqu'à l'utilisateur via
  `nextStep()`).
- `assurerPlanExiste` ne fait jamais de mise à jour (juste "créer si
  absent") — insuffisant pour clôturer ou renommer un plan déjà
  existant. Nouvelle fonction `mettreAJourPlanSupabase(planId,
  planBrutComplet)` (remplace intégralement `plan_brut`, met aussi à
  jour la colonne `nom` dénormalisée) ; `cloturerPlanSupabase` conservée
  pour le cas simple (clôture seule, sans renommage — utilisée par la
  bannière grand-débutant).

### 17.12 Écran d'accueil du wizard : Consulter / Créer — FAIT (nouveau, pas dans le recueil initial)

Demandé par Laurent après avoir testé le nouvel écran de liste de
plans : séparer clairement "consulter" de "créer", plutôt que la liste
en petit au-dessus du choix de mode.

- Nouvel écran `accueil-wizard-contenu` (deux cartes : "Consulter un
  plan existant" / "Créer un nouveau plan"), affiché en premier. Si
  aucun plan n'existe (nouveau compte), saute automatiquement à
  `choix-mode-contenu` — rien à consulter.
- Nouvel écran `consultation-plans-contenu` : liste des plans
  (`resPlansSauvegardesConsultation`), reprend `afficherPlansSauvegardes`
  tel quel, juste déplacé de son ancien emplacement.
- Bug trouvé et corrigé le jour même : `choix-mode-contenu` n'avait pas
  `display:none` par défaut (c'était l'écran affiché en premier avant
  ce changement) — les deux écrans restaient visibles superposés tant
  que ce style par défaut manquait.
- Titre des plans dans la liste agrandi (16px, style dédié) — l'ancien
  style `.bib-row .k` (13px) était trop discret pour un usage de titre
  principal, conçu à l'origine pour un contexte différent.

### 17.13 Nommage automatique des plans Mode Forme — FAIT (nouveau, pas dans le recueil initial)

Demandé par Laurent après avoir vu des plans Forme nommés "Plan"
(repli générique, `distance`/`objectif` étant `undefined` pour ce
mode) :

- `nommerPlanForme(plan)` (v2/index.html) : `"Mode forme — depuis le
  20 juil. 2026"` ou `"Marche-course — depuis le 20 juil. 2026"`
  (grand-débutant) ; avec date de clôture si elle existe :
  `"... — 20 juil. au 15 sept. 2026"`. Appliquée à la création
  (`genererPlanFormeUI`, `genererPlanGrandDebutantUI`).
- Renommage automatique a posteriori lors d'une clôture manuelle
  (Réglages, `index.html`) : si le nom actuel correspond au pattern
  auto-généré (`/^(Mode forme|Marche-course) —/`), il est recalculé
  avec la nouvelle date de clôture — persisté via
  `mettreAJourPlanSupabase`. Ne touche jamais un nom personnalisé par
  Laurent (pattern non reconnu → pas de renommage automatique).
- **Renommage manuel retiré pour tous les plans Mode Forme** (décision
  de Laurent, 15/07/2026) : le bouton ✏️ n'apparaît plus dans la liste
  que pour les plans course — un nom Mode Forme reste TOUJOURS
  synchronisé avec les vraies dates, jamais éditable à la main (éviterait
  une désynchronisation durable entre le nom affiché et la réalité du
  plan).

### 17.14 Suppression de compte — FAIT (nouveau, pas dans le recueil initial)

Demandé par Laurent pour pouvoir retester le flow d'inscription/
onboarding sans accumuler de comptes de test.

- `api/delete-account.js` : route serverless, appelle l'Admin API
  Supabase (`SUPABASE_SERVICE_ROLE_KEY`, nouvelle variable
  d'environnement Vercel — clé "service_role", jamais exposée côté
  client). Vérifie le token d'accès fourni (jamais un userId confié par
  le client) avant de supprimer.
- Lien "Supprimer mon compte" dans l'écran de connexion (mode connexion
  uniquement) — redemande email + mot de passe avant suppression
  (double confirmation implicite), `confirm()` JS en plus.
- Bug de routage trouvé et corrigé le jour même : `vercel.json`
  n'avait pas d'entrée pour `/api/delete-account` — 404 ("The page
  could not be found"), la requête n'atteignait jamais le serveur.
- Testé et validé : compte + toutes ses données (profiles/plans/
  integrations) bien supprimés côté Supabase, confirmé par Laurent
  directement dans le dashboard Supabase.

### 17.15 Bug corrigé indépendamment : synchro Strava cassée après rebranding

Repéré et corrigé en tout début de session, avant le chantier v2.8
lui-même — mismatch entre le nouveau domaine Vercel auto-généré
(`yoria-running.vercel.app`, apparu après le renommage du repo
plan-10k → yoria) et l'Authorization Callback Domain configuré côté
Strava (qui n'autorisait que l'ancien `plan-10k-alpha.vercel.app`).
Corrigé par Laurent directement dans les paramètres Strava. Point de
vigilance conservé : si le domaine change encore, la même erreur
réapparaîtra.

### 17.16 Reste à faire (v2.8, prochaine session)

- **17.4** ✅ Clos (15 juillet 2026) — voir §20.
- **17.5** Refonte des objectifs marche-course en paliers de durée
  continue (5→30min), validation manuelle par le coureur — le moteur
  utilise encore l'ancien système de ratio course/marche
  (`PALIERS_MARCHE_COURSE`) avec validation par seuil de séances
  automatique (`palierMarcheCourseFor`), pas la logique décidée en fin
  de session précédente (validation manuelle, coach encourageant).
- **17.6** ✅ Clos (15 juillet 2026) — voir §19.
- **17.8** Suggestion automatique de changement de niveau (après
  plusieurs plans terminés, sur un jugement combinant difficulté/
  performance/volume/assiduité) — pas commencé, conception à affiner.
- **Tests réels supplémentaires** sur l'app déployée — le flow complet
  grand-débutant (onboarding → wizard → Strava → génération →
  consultation → progression de palier → clôture → transition) a été
  testé et corrigé en plusieurs itérations cette session, mais la
  progression de palier elle-même (bouton "Palier suivant") n'a pas
  encore été testée en conditions réelles.
- Fichier de test formel pour `plan-forme.js`/marche-course — les tests
  actuels restent des scripts manuels non committés (`test-forme-mc.mjs`,
  etc., supprimés après usage).

## 18. Site "beta" indépendant, bugs Strava/sélection de plan/onboarding (15/07/2026)

### 18.1 Site "beta" ajouté au repo par Laurent

Laurent a créé et modifie volontairement un second site statique, **`public/beta/`**
(`index.html`, `script.js`, `styles.css`, `assets/`), avec son propre endpoint
`api/beta.js` et ses propres routes dans `vercel.json` (`/beta`, `/beta/`,
`/api/beta`). Sur la même branche `main`, mais un contexte complètement indépendant
de l'app principale (Yoria) — pas de dossier partagé avec `public/v2/` ni
`public/engine-classic-scripts/`.

**Consigne permanente** : ne jamais supprimer, modifier, ni toucher à ces
fichiers/routes lors des mises à jour de l'app principale, sauf demande explicite de
Laurent. Vérifié que le routing `vercel.json` ne crée aucun conflit avec l'app
principale (`/beta` et `/api/beta` déclarés explicitement avant le catch-all `/(.*)`).

### 18.2 Bug résolu : synchro Strava cassée après reconnexion Supabase

**Symptôme** : "❌ Erreur Strava" au clic sur le bouton de synchronisation, alors
qu'une séance récente (VMA du jour) était bien présente et valide côté Strava (confirmé
via l'API Strava directement, activité avec 4 PR détectés).

**Fausses pistes explorées avant la vraie cause** (utile pour ne pas les re-tester) :
- Cache HTTP / réponse 304 sur `/api/strava/activities` — un `Cache-Control: no-store`
  a été ajouté par précaution (bonne pratique générale, cf. code), mais n'était pas la
  cause principale de ce symptôme précis.
- Policies RLS Supabase sur `plans`/`plan_donnees` — plusieurs 409/403 observés en
  parallèle dans la console au même moment, mais vérifiés être des warnings sans effet
  bloquant (policies confirmées correctes en SQL : `auth.uid() = user_id` partout,
  types de colonnes corrects, UUID identiques entre session et base).

**Vraie cause** : la réponse réelle de Strava, visible dans l'onglet Réseau du
navigateur, était `{"message":"Authorization Error","errors":[{"resource":"Athlete",
"field":"access_token","code":"invalid"}]}` — l'`access_token` Strava stocké était
invalide, alors que `ensureFreshToken()` (`index.html`) ne vérifie que l'expiration
locale du token (`Date.now()/1000 < stravaExpires-60`), jamais sa validité réelle
côté Strava. Un token invalidé pour une autre raison (probable : désynchronisation du
`refresh_token` stocké suite à une déconnexion/reconnexion Supabase, qui réécrit les
intégrations en base) n'est donc jamais détecté par ce contrôle.

**Correctif appliqué** : reconnexion Strava directe (Paramètres → Strava,
déconnecter/reconnecter) — résout le symptôme en obtenant un couple token/refresh
entièrement neuf. Correctif de code complémentaire poussé : `Cache-Control: no-store,
max-age=0` ajouté sur les deux réponses de `/api/strava/activities` (`api/strava.js`)
— utile en soi pour éviter tout comportement de cache sur cette route dynamique, mais
n'était pas la cause de ce bug précis.

**Piste future si ça se reproduit** : détecter explicitement le cas `access_token
invalid` retourné par Strava dans `syncStrava()` et soit déclencher automatiquement un
`ensureFreshToken()` forcé (ignorant l'expiration locale), soit inviter directement à
la reconnexion Strava, plutôt que d'afficher seulement "❌ Erreur Strava" sans piste
d'action pour l'utilisateur.

**Suite — implémenté le 16/07/2026** : le même symptôme (`❌ Erreur Strava`) s'est
reproduit après la migration du domaine `yoria.run` (§22.2) — cause probable un
changement de `redirect_uri` calculé par `api/strava.js` (dynamique sur
`req.headers.host`, cf. §16), résolu par une reconnexion manuelle Strava. Cette
fois, la piste ci-dessus a été codée dans `syncStrava()` (`public/index.html`) :
détection explicite de `activities?.errors?.some(e => e.field === "access_token"
&& e.code === "invalid")`, nouvelle variable `stravaAuthInvalide`. Si vrai :
message dédié ("❌ Connexion Strava expirée — reconnecte-toi pour continuer la
synchro.") + bouton **"🔄 Reconnecter Strava"** (lien direct `/api/strava/auth`,
même mécanisme que le bouton "Connecter Strava" initial) affiché juste sous le
message, dans la section Paramètres. Semi-automatique par choix délibéré (pas de
redéclenchement silencieux du flow OAuth) — une reconnexion Strava sort forcément
vers le navigateur/Strava à un moment donné, un déclenchement invisible aurait
surpris l'utilisateur et risqué une boucle en cas d'échec répété non lié au token
(ex. vrai problème réseau). Le message ne s'auto-efface plus après 3s dans ce cas
précis (laisse le temps de cliquer), contrairement aux autres messages
succès/erreur qui gardent ce comportement.

**Même correctif étendu au wizard (16/07/2026)** — `public/v2/engine/strava.js`
(module client séparé de v1, cf. §21.6) a exactement le même point faible :
`assurerTokenStravaValide()` ne vérifie que l'expiration locale, jamais la
validité réelle côté Strava. Mais le symptôme y était différent et plus
sournois : `recupererVolumeStrava()` retournait déjà un objet `{ mediane,
erreur }` en cas d'échec, sans jamais distinguer le cas "token invalide" du
reste — le wizard basculait donc **silencieusement** vers la saisie manuelle
du volume (`toggleManualVolume()`/`toggleManualVolumeForme()`) sans que
l'utilisateur comprenne pourquoi sa connexion Strava avait cessé de
fonctionner. Corrigé : `recupererVolumeStrava()` retourne désormais aussi
`authInvalide` (même détection `errors[].field === "access_token"` que côté
v1) ; `chargerVolumeStrava()` et `chargerVolumeStravaForme()`
(`public/v2/index.html`) l'utilisent pour afficher un nouveau flag dédié
(`stravaAuthInvalideFlag`/`stravaAuthInvalideFlagForme`, distinct du flag
générique "Pas d'historique Strava suffisant") avec un bouton "🔄 Reconnecter
Strava" (réutilise `connecterStrava()` déjà existant). Pas de fichier de test
à mettre à jour — `recupererVolumeStrava()` touche le réseau, non testée en
isolation dans `test-strava.mjs` (comme documenté dans les commentaires du
fichier lui-même).

**Bug supplémentaire trouvé et corrigé en testant le wizard (16/07/2026)** —
après clic sur "Reconnecter Strava" en pleine étape 3 du wizard course,
l'utilisateur retombait sur l'écran d'accueil "Que veux-tu faire ?"
(`choix-mode-contenu`) au lieu de reprendre à l'étape où il était.
Diagnostic : `initialiserApresChargementEngine()` (`v2/index.html`) a bien
un mécanisme de persistance d'étape (`sessionStorage.v2_wizard_step`), mais
il n'était lu que dans `validerChoixMode()` — jamais automatiquement au
chargement de la page après le `window.location.reload()` forcé par
`capterRetourStravaOAuth()`. Corrigé en ajoutant un court-circuit en tout
début de la logique d'affichage par défaut : si une étape de wizard course
valide est trouvée en `sessionStorage` et que l'écran d'accueil est
affiché, bascule directement vers `wizard-course-contenu` à la bonne étape
plutôt que de laisser le comportement par défaut (accueil/choix de mode)
prendre la main. Diagnostic mené par ajout temporaire de `console.log` de
traçage (retirés une fois le correctif confirmé fonctionnel) — un premier
test après le simple push du correctif semblait ne rien changer, mais un
second test après un nouveau push (même sans changement fonctionnel,
seulement l'ajout des logs) a montré le comportement correct : probable
cache Vercel/navigateur qui servait encore une version antérieure du
fichier lors du tout premier test.

**Couverture étendue au Mode Forme et au grand-débutant (16/07/2026,
même jour)** — vérification demandée par Laurent après validation du
wizard course : les trois correctifs Strava n'étaient pas symétriques
entre les trois flux du wizard.

- **Restauration d'étape Mode Forme** : `showStepForme()` persiste
  désormais l'étape courante en `sessionStorage.v2_wizard_step_forme`
  (clé distincte de `v2_wizard_step`, wizard course — jamais confondues),
  même mécanisme de court-circuit dans `initialiserApresChargementEngine()`
  que pour le wizard course. Avant ce correctif, le mode Forme n'avait
  simplement aucun mécanisme de persistance d'étape (flux volontairement
  plus court, jugé "moins gênant à recommencer" à l'origine) — mais un
  retour Strava en pleine étape reste tout aussi gênant à recommencer que
  côté course.
- **Grand-débutant, vérification réelle du token (pas juste sa présence)**
  — `rafraichirBlocStravaGrandDebutant()` se contentait jusqu'ici de
  vérifier si un token existait en `localStorage`, jamais sa validité
  réelle côté Strava (contrairement aux wizards course/Forme, qui
  appellent `recupererVolumeStrava()`). Un token périmé restait donc
  affiché comme "connecté" ici, sans que l'utilisateur le découvre avant
  la vraie synchro (plus tard, une fois le plan créé). Corrigé en
  appelant `Engine.assurerTokenStravaValide()` (déjà existant) plutôt que
  `getStravaTokens()` seule, avec un nouveau bloc `flag`
  (`stravaAuthInvalideFlagGrandDebutant`) + bouton "🔄 Reconnecter Strava"
  si le rafraîchissement échoue. **Couverture volontairement partielle** :
  `assurerTokenStravaValide()` ne fait un appel réseau que si le token est
  expiré selon sa date locale (`expiresAt`) — un token révoqué côté
  Strava mais encore dans sa fenêtre de validité locale (exactement le
  scénario testé aujourd'hui via révocation manuelle sur
  strava.com/settings/apps) ne serait donc pas détecté par ce correctif
  précis. Un vrai appel de test aurait nécessité une requête réseau
  supplémentaire à chaque affichage de cet écran (flux qui n'en faisait
  aucun jusqu'ici) — jugé disproportionné par Laurent pour ce cas, décision
  explicite de garder cette couverture partielle plutôt que d'alourdir ce
  flux.

**Deux ajustements testés en conditions réelles le même jour** (côté v1,
`index.html`, après validation manuelle du bouton "Reconnecter Strava" via
révocation volontaire de l'accès sur strava.com/settings/apps) :

1. **Synchro relancée automatiquement après reconnexion** — cliquer
   "Reconnecter Strava" ramenait un token valide mais n'actualisait pas les
   activités tant que l'utilisateur ne recliquait pas manuellement sur
   "Synchroniser avec Strava". `checkOAuthCallback()` appelle désormais
   `syncStrava()` après capture du nouveau token.
2. **Bug de viewport découvert en testant le point 1** — le retour d'une
   navigation externe (Strava) laisse la page affichée "dézoomée" en
   contexte TWA/PWA Android (corrigé seulement par un reload manuel ou une
   fermeture/réouverture de l'app) — même famille de bug que celui déjà
   contourné côté wizard (`capterRetourStravaOAuth`, `v2/index.html`, cf.
   §17.10), mais jamais traité côté v1 jusqu'ici. Corrigé en forçant un
   `window.location.href = "/"` (reload complet) dans `checkOAuthCallback()`
   dès qu'un token est capté, plutôt que de laisser le state JS en place —
   le token est déjà sauvegardé en `localStorage` juste avant, donc rien
   n'est perdu au rechargement. Comme un reload complet interrompt
   l'exécution du script en cours, l'appel à `syncStrava()` du point 1 ne
   pouvait plus se faire au même endroit : un marqueur
   `sessionStorage.lk_strava_sync_apres_reload` est posé juste avant le
   reload, puis lu et consommé juste après le rechargement complet de la
   page pour relancer la synchro à ce moment-là.

### 18.3 Bug résolu : sélection du plan actif au démarrage

**Contexte découvert en diagnostiquant 18.4** (onboarding en boucle) : Laurent a
actuellement deux plans course actifs en parallèle, sur des dates qui ne se
chevauchent pas — GEM'AUBAGNE et "400 ans de la Marine". Légitime : le garde-fou
anti-chevauchement (`trouverPlanEnConflit`, cf. §17.11) fonctionne correctement pour
ce cas, les deux périodes ne se recoupant pas.

**Bug** : `window.__PLAN_PRET__` (`public/index.html`) choisissait, en l'absence de
`v2_preview_plan_id` explicite en `localStorage`, systématiquement
`plansDisponibles[0]` — le premier élément retourné par `chargerPlansSupabase()`,
trié par `created_at DESC` (le plus récemment **créé**, pas le plus pertinent). Avec
deux plans course actifs, l'app chargeait donc parfois le mauvais plan (celui créé en
dernier), sans lien avec la date de course réelle la plus proche.

**Correctif appliqué** (`public/index.html`, bloc `window.__PLAN_PRET__`) : en
l'absence de `v2_preview_plan_id`, l'app filtre désormais les plans de type course
(`mode !== 'forme'`) dont `dateCourse` est dans le futur (`>= aujourd'hui`), les trie
par date de course croissante, et prend le premier — c'est-à-dire **la course la plus
proche dans le temps**. Un plan Mode Forme n'est retenu en repli que s'il n'existe
aucun plan course à venir. Décision validée avec Laurent (deux plans course légitimes
en parallèle doivent afficher celui dont l'échéance est la plus proche, pas le plus
récemment créé).

### 18.4 Bug résolu : onboarding en boucle à chaque lancement

**Symptôme** : l'app affichait l'écran d'onboarding (année de naissance / niveau) à
chaque lancement au lieu du dashboard, malgré une session Supabase valide et des
données de profil complètes en base.

**Longue chaîne de diagnostic, plusieurs fausses pistes explorées et écartées avant
la vraie cause** (résumé, cf. §18.2/§18.3 pour le détail des sous-diagnostics
associés) :
- Cache HTTP Strava — écarté (cf. §18.2).
- Policies RLS Supabase — vérifiées correctes en SQL direct (`pg_policy`), écarté.
- Mismatch de `user_id` entre session et base — écarté après vérification directe
  (`getSession()`, comparaison UUID caractère pour caractère, type de colonne `uuid`
  confirmé côté `information_schema`).
- Sélection du mauvais plan par défaut — un vrai bug distinct, corrigé (§18.3), mais
  qui n'était pas non plus la cause de CE symptôme précis (la redirection persistait
  après ce correctif).

**Vraie cause** : le `profilCoureur` de Laurent avait `niveau: null` en base
(vérifié directement via `localStorage.getItem('lk_profil_coureur')` après
préchargement Supabase réussi) — probablement suite à un passage antérieur par le
bouton "Passer pour l'instant" de l'écran d'onboarding. Le test dans
`auth.classic.js`/`auth.js` :
```js
if (!profilBrut || !profilBrut.niveau) { /* affiche l'onboarding */ }
```
traite `null` exactement comme "jamais renseigné" (`!null === true`), donc
redéclenche l'onboarding à chaque connexion tant qu'aucun niveau n'est explicitement
choisi — un profil par ailleurs complet (poids, taille, records, prénom, etc.) était
piégé dans cette boucle uniquement à cause de ce champ.

**Correctif immédiat** : Laurent a choisi un vrai niveau dans l'onboarding (au lieu
de "Passer"), ce qui a résolu la boucle pour son compte.

**Correctif structurel appliqué** (demande explicite de Laurent : rendre le choix du
niveau obligatoire) — dans `public/engine-classic-scripts/auth.classic.js` ET
`public/v2/engine/auth.js` (les deux fichiers, synchronisés) :
- Bouton "Passer pour l'instant" retiré du HTML de `monterEcranOnboarding()`.
- Fonction `terminer(avecNiveau)` simplifiée en `terminer()` sans paramètre —
  `niveau: niveauChoisi` directement, sans plus jamais de repli possible vers `null`
  (le bouton Valider reste désactivé tant qu'aucune option de niveau n'a été
  cliquée, donc `terminer()` n'est structurellement plus jamais appelable sans un
  niveau valide).
- Un seul listener conservé : `validerBtn.addEventListener('click', terminer)`.

**Conséquence** : plus aucun compte, existant ou nouveau, ne peut désormais se
retrouver avec `niveau: null` en sortant de l'onboarding — élimine la classe de bug
à la racine plutôt que de traiter seulement le symptôme.

**Piste d'amélioration future, non implémentée** (si Laurent la redemande) :
distinguer explicitement "niveau jamais demandé" de "l'utilisateur a un jour
volontairement passé cette étape" (avec une valeur sentinelle dédiée, par exemple),
utile seulement si le bouton "Passer" devait un jour être réintroduit pour une autre
raison — non pertinent tant que le choix reste obligatoire.

### 18.5 Méthode de diagnostic à retenir pour la suite

Cette session a nécessité d'éliminer méthodiquement plusieurs hypothèses plausibles
mais fausses (cache HTTP, RLS, mismatch d'identité, mauvais plan chargé) avant
d'atteindre la vraie cause d'un symptôme ("redirection vers le profil"), qui s'est
révélée être un bug totalement différent et sans lien apparent avec Strava (le
problème initialement signalé). Les deux bugs (Strava et onboarding) sont
apparus mélangés dans les mêmes échanges de diagnostic à cause d'une coïncidence de
timing (les deux se sont manifestés après la même reconnexion Supabase), mais sont
in fine indépendants l'un de l'autre. Retenu : quand un symptôme résiste à un
correctif ciblé, vérifier les faits un par un directement en console (session réelle,
requêtes réelles, valeurs réelles en base) plutôt que d'empiler des hypothèses
successives sans les confirmer individuellement.

## 19. Navigation par flèches dans le wizard (17.6, clos le 15/07/2026)

**Demande** : remplacer le bouton "Continuer" en bas de chaque étape par des
flèches ←/→ en haut, encadrant le texte "ÉTAPE N SUR X". Périmètre validé avec
Laurent avant codage : les trois flux (wizard course, Mode Forme, grand-débutant)
concernés en principe, mais le grand-débutant n'a en réalité qu'un seul écran
sans étapes numérotées — laissé tel quel (bouton "Générer mon plan" en bas,
inchangé) après clarification avec Laurent.

**Implémenté** (`public/v2/index.html`) :

- **Wizard course** (steps 1-9) et **Mode Forme** (steps 1-4) : nouveau bloc
  `.step-nav` remplace l'ancien `.stepmeta` seul — deux boutons ronds
  `.arrow-btn` (`backBtn`/`nextBtn` pour le wizard course,
  `backBtnForme`/`nextBtnForme` pour le Mode Forme) encadrent le texte
  "ÉTAPE N SUR X". Ancien `.footer` (bas d'écran, `position:absolute;
  bottom:0`) retiré des deux flux.
- `showStep(n)`/`showStepForme(n)` : la flèche arrière se masque via
  `classList.toggle('hidden', n === 1)` (nouvelle classe CSS `.arrow-btn.hidden`,
  `opacity:0; pointer-events:none`) au lieu de l'ancien `style.visibility`. La
  flèche avant passe en `innerHTML = '→'` normalement, `'✓'` sur la dernière
  étape (génération du plan) et sur l'écran résultats ("Terminer") — le libellé
  textuel disparu est conservé en `aria-label`/`title` sur le bouton, pour ne
  pas perdre l'information pour un lecteur d'écran ou au survol.
- Logique de navigation (`nextStep`, `prevStep`, `nextStepForme`,
  `prevStepForme`, y compris le saut conditionnel des étapes 3-5 pour le
  grand-débutant côté wizard course) **inchangée** — seuls les éléments
  déclencheurs (flèches au lieu de bouton texte) ont changé, mêmes `id`
  réutilisés (`backBtn`/`nextBtn`/`backBtnForme`/`nextBtnForme`) donc aucun
  `onclick` à modifier ailleurs dans le fichier.
- CSS : `.arrow-btn` (rond, 34px, fond neutre pour ←, `--signal` pour →),
  `.step-nav` (flex centré, encadre `.stepmeta`). Padding bas de `.content`
  (130px, pensé pour l'ancien footer absolu) **laissé inchangé** —
  partagé avec les écrans qui gardent un footer bas (choix de mode,
  consultation de plans, grand-débutant), donc pas réduit pour ne pas
  élargir le risque hors du périmètre demandé. Effet secondaire mineur :
  léger vide en bas des écrans course/forme, purement cosmétique.
- Vérifié : syntaxe JS valide (`node --check` sur le bloc `<script>`
  principal, aucune régression).

**Non couvert par ce chantier** : écran grand-débutant (`wizard-grand-debutant-contenu`),
conservé avec son bouton bas "Générer mon plan" — décision explicite de
Laurent, cet écran n'a pas de notion d'étapes à naviguer.

**Reste à faire** : test réel sur l'app déployée (parcours complet wizard
course et Mode Forme avec les nouvelles flèches, y compris le cas
grand-débutant qui saute les steps 3-5 côté wizard course) — pas encore fait
à la clôture de cette session.

## 20. Blocage de validation des séances futures (17.4, clos le 15/07/2026)

**Demande** : empêcher la validation d'une séance (statuts ✅/❌/⚠️) tant que sa
date n'est pas encore atteinte, tous modes confondus (course, forme,
marche-course).

**Implémenté** (`public/index.html`, `renderStatusRow`) :

- `renderStatusRow(uid, dateSeance)` — nouveau second paramètre optionnel
  (rétrocompatible : le premier appel, carte "séance du jour", ne le passe
  pas car `s.date` y vaut toujours aujourd'hui par construction).
- Comparaison `dateSeance > today()` (helper déjà existant) pour déterminer
  si la séance est future.
- Si future : les boutons ✅/❌/⚠️ sont grisés (`opacity:0.35`), `disabled`,
  curseur `not-allowed`, et leur listener de clic est court-circuité (garde
  redondante en plus de `disabled`, pour робustesse si le style venait à
  changer). Un texte "📅 Séance à venir — disponible le jour J" apparaît
  sous la rangée de boutons.
- Le bouton "—" (annuler/remettre à zéro) **reste toujours actif**, même sur
  une séance future — nécessaire si une séance déjà validée est ensuite
  déplacée vers une date future (déplacement de séance), pour ne pas rester
  bloqué avec un statut qu'on ne peut plus retirer.
- Un seul point d'écriture de `statuses[uid]` dans tout le fichier (dans
  `renderStatusRow` elle-même) — aucun autre chemin de contournement à
  corriger. Un seul mécanisme de statut partagé par tous les modes (course,
  forme, marche-course), donc ce correctif les couvre tous sans code
  spécifique par mode.
- Deuxième appel (`renderWeekDetail`, vue détail de semaine — le seul
  endroit où une séance future est affichable/cliquable) mis à jour pour
  passer `s.date`.

**Vérifié** : syntaxe JS valide (`node --check` sur le bloc `<script>`
principal).

**Non couvert par ce chantier** : aucun message d'erreur bloquant côté
`showSessionMenu`/déplacement de séance si un déplacement place une séance
déjà validée dans le futur — le statut reste affiché tel quel jusqu'à ce que
l'utilisateur le réinitialise manuellement via "—", comportement jugé
suffisant pour ce cas marginal.

**Reste à faire** : test réel sur l'app déployée (séance future dans la vue
semaine, boutons bien désactivés ; séance du jour même veille au soir,
toujours validable ; cas d'une séance validée puis déplacée dans le futur,
bouton "—" toujours actif) — pas encore fait à la clôture de cette session.

## 21. v2.9 — 17.5, correctifs sécurité et fiabilité (15/07/2026, session ultérieure)

Suite directe de la session v2.8 (§17-§20). Plusieurs bugs remontés par
Laurent en testant les correctifs précédents en conditions réelles, certains
de gravité élevée (sécurité). Chronologie : 17.5 → correctif dates → bug
sécurité déconnexion → écran vide → redirection grand-débutant → module
Strava manquant.

### 21.1 Paliers marche-course en durée continue (17.5) + prochain palier au dashboard

Refonte demandée par Laurent : remplacer le système de paliers en ratio
course/marche (ex. "3min course / 1min30 marche") par des paliers de durée
de course **continue**, avec validation manuelle du coureur plutôt
qu'automatique par seuil de séances.

- **Nouveaux paliers** (`PALIERS_MARCHE_COURSE`, `plan-generator.js` +
  classic) : 7 paliers, 5→8→12→16→20→25→30 min de course continue, plus
  rapprochés en début de progression. Échauffement/retour au calme en
  marche calculés dynamiquement (`DUREE_CIBLE_MARCHE_COURSE_MIN` -
  `courseMin`, réparti de chaque côté, minimum 5min chacun) plutôt que fixes.
- **Validation manuelle** (`palierMarcheCourseFor`) : une seule séance "✅"
  au palier courant suffit à débloquer le bouton "Palier suivant" — plus de
  seuil de nombre de séances (`SEANCES_MIN_PAR_PALIER` retiré). Le passage
  reste toujours une action volontaire, jamais automatique.
- **Carte permanente "Progression marche-course"** ajoutée au dashboard
  (`index.html`, `prochainPalierEl`), même esprit que `heroPred`
  (objectif/estimation du mode course) : palier actuel, palier suivant avec
  badge "🎉 Débloqué" si validé, bouton direct pour passer au palier suivant
  sans attendre la bannière ponctuelle (`progressionMarcheCourseEl`, qui
  reste aussi affichée en complément).
- **Bug corrigé au passage** : le bouton "Palier suivant" (bannière) lisait
  `window.__PLAN_BRUT__.profilOrigine`/`paramsOrigine` et appelait
  `generatePlan()` — ces champs n'existent PAS sur un plan grand-débutant
  (généré par `generatePlanFormeMarcheCourse`, qui ne stocke ni profil ni
  params d'origine, cf. §17.1). Le bouton plantait donc systématiquement en
  pratique. Nouvelle fonction `changerPalierGrandDebutant(nouveauPalierId)`
  (`index.html`) qui reconstruit correctement profil/params à partir des
  données réellement disponibles (jours déduits de
  `plan.semaines[0].assignment`, reste lu depuis `lk_profil_coureur`),
  utilise `generatePlanForme` (nécessite `plan-forme.classic.js`, **ajouté
  au chargement de `index.html`**, absent jusqu'ici), et sauvegarde via le
  même pattern Supabase-prioritaire que le reste de l'app.

### 21.2 Correctif dates de séances — le calendrier ne suppose plus lundi

**Symptôme signalé** : dates de séances toutes décalées (ex. "mardi 16"
affiché pour un 16 qui tombait un vendredi), repéré sur un plan
grand-débutant mais touchant en réalité tous les modes.

**Cause** : `traduirePlanVersFormatV1()` (`v1-bridge.js` + classic)
calculait chaque date en ajoutant directement `jourIndex` (0-6) à
`plan.dateDebut`, en supposant implicitement que `jourIndex 0` = lundi de
CETTE date précise — vrai seulement si `dateDebut` tombe elle-même un
lundi. Rien, nulle part côté wizard, ne garantit ça (`dateDebut` = date
choisie ou date du jour de génération, sans contrainte de jour de semaine).

**Correctif, décidé avec Laurent** : un plan peut démarrer n'importe quel
jour de la semaine. Le calendrier se cale sur le vrai LUNDI de la semaine de
`dateDebut` ; toute séance dont la date calculée tombe AVANT `dateDebut` est
neutralisée en repos — la première semaine peut donc être incomplète (jours
passés sautés), le rythme normal reprend dès la semaine 2. Jamais de séance
affichée dans le passé par rapport à la génération du plan.

Testé manuellement (3 cas : démarrage vendredi, lundi, dimanche) — dates et
labels de jour cohérents dans les trois. Corrigé dans `v1-bridge.js` et sa
copie classic, gardées strictement identiques (vérifié par diff).

### 21.3 CORRECTIF SÉCURITÉ CRITIQUE — fuite de données entre comptes

**Symptôme signalé par Laurent, gravité élevée** : après déconnexion/
reconnexion sur le même appareil, un compte pouvait voir ET supprimer les
plans d'un autre utilisateur.

**Cause racine** : `deconnecter()` (`auth.js`/`auth.classic.js`) ne faisait
que `supabase.auth.signOut()` — ne vidait jamais `localStorage`. Or
`lk_github_token`/`v2_gist_id` (pointant vers un Gist GitHub précis) sont
complètement indépendants de la session Supabase. Un compte B se
connectant ensuite sur le même appareil, sans ses propres intégrations
GitHub configurées, héritait silencieusement du token/Gist du compte A
laissé en place — `afficherPlansSauvegardes()` (`v2/index.html`) bascule
automatiquement sur ce Gist dès que `chargerPlansSupabase()` renvoie une
liste vide, sans aucune vérification d'appartenance
(`chargerPlans()`/`gist-sync.js` lit purement `localStorage`, ignorant tout
scoping par utilisateur).

**Correctif, deux barrières** :
1. `deconnecter()` vide maintenant tout `localStorage` (sauf `lk_theme`,
   préférence d'affichage non personnelle) — purge large plutôt qu'une
   liste de clés à retirer une par une, choix délibéré : l'historique de ce
   projet montre plusieurs bugs venant justement d'une clé oubliée dans ce
   genre de liste (cf. `v2_gist_id` absent de `CLES_INTEGRATIONS`, §14).
2. Barrière supplémentaire dans `debloquer(user)` (point de passage unique
   de toute connexion réussie, `auth.js`/`auth.classic.js`) : compare l'id
   de l'utilisateur qui se connecte à celui de la dernière connexion connue
   sur cet appareil (`lk_dernier_user_id`) — purge automatique en cas de
   changement, même si la déconnexion précédente n'est pas passée par le
   bouton explicite (session expirée, etc.).

Corrigé dans les deux versions (`auth.js` et `auth.classic.js`). **Nécessite
une déconnexion pour prendre effet** sur un appareil déjà affecté (la
barrière ne s'active qu'au moment de `debloquer(user)`, donc tant qu'une
session reste active sans repasser par l'écran de connexion, l'ancien
`localStorage` pollué persiste) — confirmé fonctionnel par Laurent après
déconnexion/reconnexion.

### 21.4 Écran "Aucun plan en cours" — le plan de repli factice ne s'affiche plus comme un vrai plan

**Symptôme signalé, découlant directement de 21.3** : après la purge de
`localStorage`, plus aucun plan dans la liste, mais un "plan réminiscent"
persistait à l'affichage.

**Cause** : ce n'était pas une fuite résiduelle mais un comportement
existant révélé par le nouvel état "0 plan" (désormais légitime après une
purge) : `window.__PLAN_PRET__` (`index.html`) génère automatiquement un
plan factice codé en dur (paramètres historiques de Laurent, "10 km
Gem'Aubagne") dès que Supabase ET Gist sont tous deux vides, pour ne jamais
laisser un écran cassé — mais ce plan s'affichait tel quel comme un vrai
plan actif, trompeur.

**Correctif** :
- Ce plan de repli est marqué `estPlanRepli: true`.
- `renderDashboard()` détecte ce marqueur en tout début de fonction et
  affiche un vrai état vide ("🗓️ Aucun plan en cours" + bouton "Créer un
  plan") au lieu du contenu factice.
- Garde-fou global dans `render()` (orchestrateur principal) : tant
  qu'aucun vrai plan n'existe, toute navigation (Semaines, Stats, Course)
  retombe sur cet état vide — seul Paramètres reste accessible (ex. pour se
  déconnecter). Une nouvelle variable `vueEffective` (au lieu de `view`
  directement) porte ce court-circuit à travers header/titre/contenu/nav
  active, pour un affichage cohérent partout.

### 21.5 Grand débutant redirigé vers le mauvais flux (question d'accent)

**Symptôme signalé** : un profil grand-débutant se voyait proposer un choix
d'accent (VMA/Endurance/Polyvalent) — non pertinent pour ce niveau, aucune
notion de séance qualité différenciée en marche-course.

**Cause** : l'écran dédié grand-débutant (jours + Strava uniquement,
`wizard-grand-debutant-contenu`, §17.9) n'était atteint automatiquement que
lors de la toute première sortie d'onboarding
(`rediriger_si_onboarding_grand_debutant`). Un grand-débutant revenant plus
tard sur `/v2` et cliquant lui-même sur "Mode forme" depuis l'écran de
choix (`choisirMode('forme')` → `validerChoixMode()`) tombait dans le flux
Mode Forme générique à 4 étapes, dont l'étape accent. "Objectif course"
était déjà grisé pour ce profil (`bloquerCourseSiGrandDebutant`), mais
"Mode forme" restait un accès détourné vers le mauvais flux.

**Correctif** : `validerChoixMode()` vérifie maintenant `lk_profil_coureur`
et redirige vers l'écran dédié si le niveau est grand-débutant, quel que
soit le point d'entrée — cohérent avec le chemin normal depuis
l'onboarding.

**Bug annexe découvert et corrigé dans la foulée** : le marqueur
`sessionStorage` qui permet à l'écran grand-débutant de survivre au reload
forcé par `capterRetourStravaOAuth()` (contournement d'un bug de rendu
Android/PWA après retour d'une navigation externe) n'était posé que par
`rediriger_si_onboarding_grand_debutant()` — donc seulement pour le tout
premier passage. Un grand-débutant atteignant cet écran par un autre
chemin (ex. via le correctif ci-dessus) perdait tout au premier clic
"Connecter Strava" (reload → retour à l'accueil du wizard). Corrigé :
`renderDaysGrandDebutant()` (appelée par tous les chemins d'entrée réels)
pose désormais ce marqueur systématiquement, plus seulement depuis
l'onboarding.

### 21.6 CORRECTIF MAJEUR — module client Strava manquant

**Symptôme final signalé** : bouton Strava du wizard ne déclenchait rien,
puis après un premier correctif du clic, la connexion "ne se validait pas"
et le plan généré ne se sauvegardait pas.

**Cause racine, découverte par recherche exhaustive dans le repo** :
`public/v2/engine/strava.js` — censé être le module client Strava du
wizard — contenait en réalité une **copie accidentelle du code serverless**
(`api/strava.js`, le handler Vercel lui-même : routes `/auth`, `/callback`,
`/refresh`, `/activities`). Le vrai module client, avec les fonctions que
tout le wizard appelle (`Engine.urlConnexionStrava`,
`extraireTokensDepuisUrl`, `setStravaTokens`, `getStravaTokens`,
`clearStravaTokens`, `assurerTokenStravaValide`, `recupererVolumeStrava`),
**n'existait nulle part** — confirmé par recherche GitHub exhaustive sur
chacun de ces noms, zéro résultat.

Chaque appel levait une `TypeError` non catchée, interrompant le script en
plein milieu de son exécution :
- Le clic "Connecter Strava" ne faisait rien (`urlConnexionStrava`
  inexistante, corrigé une première fois le 15/07 par un lien direct vers
  `/api/strava/auth?state=v2`, sans savoir encore que le reste de la chaîne
  était cassé).
- Au retour du callback OAuth, `capterRetourStravaOAuth()` plantait sur
  `extraireTokensDepuisUrl` inexistante — la connexion "ne se validait
  jamais", aucun token stocké.
- Cette erreur interrompant l'exécution du script AVANT le code de
  sauvegarde du plan (plus loin dans le même bloc `<script type="module">`)
  explique pourquoi la sauvegarde échouait aussi, sans lien apparent avec
  Strava au premier abord.

**Correctif** : reconstruction complète du module
(`public/v2/engine/strava.js`), en s'appuyant sur `test-strava.mjs` — un
fichier de tests déjà présent dans le repo, jamais exécutable faute du vrai
fichier, qui documentait précisément l'API attendue (preuve qu'un vrai
module a existé à un moment donné, perdu ou écrasé par erreur). Toutes les
fonctions reconstruites : `urlConnexionStrava`, `extraireTokensDepuisUrl`,
`setStravaTokens`/`getStravaTokens`/`clearStravaTokens` (clés `v2_strava_*`
dédiées, distinctes de `lk_strava_*` utilisées par v1),
`assurerTokenStravaValide` (rafraîchissement si expiré, même logique que
`ensureFreshToken()` côté v1), `calculerMedianeVolumeHebdo` (semaine ISO,
cumul multi-sorties/semaine, activités non-Run ignorées),
`recupererVolumeStrava` (8 semaines d'historique). **Tous les cas de
`test-strava.mjs` passent.**

Aucune copie `.classic.js` de ce module n'existe (`index.html`/v1 gère
Strava indépendamment, code inline `ensureFreshToken`/`syncStrava`) — pas
de duplication à faire.

### 21.7 Reste à faire

- Tests réels supplémentaires sur l'app déployée : bouton "Palier suivant"
  (carte permanente ET bannière) en conditions réelles, parcours Strava
  complet (connexion → retour → génération → sauvegarde) sur les trois
  flux (course, forme, grand-débutant).
- Fichier de test formel pour les nouveaux paliers marche-course (durée
  continue) — les tests actuels restent manuels/scripts non committés.
- Vérifier qu'aucune autre fonction `Engine.*` référencée dans
  `v2/index.html` ne pointe vers un module incomplet similaire à
  `strava.js` avant cette session — un audit ponctuel (grep de tous les
  `Engine.xxx` contre les exports réels de chaque module `v2/engine/*.js`)
  n'a pas été fait de façon exhaustive au-delà de Strava dans cette
  session.

## 22. Domaine personnalisé yoria.run (15/07/2026)

Laurent a acheté le domaine `yoria.run`, destiné à devenir le domaine
**principal** du projet (remplace `yoria-running.vercel.app`). Audit fait
avant tout changement de config externe : recherche exhaustive de domaines
en dur dans le code (`grep` sur tous les fichiers `index.html`/`v2/index.html`,
manifests PWA, `assetlinks.json`).

**Résultat de l'audit initial (15/07)** : le changement de domaine est
presque entièrement une affaire de configuration externe
(Vercel/Strava/Supabase), pas de code. Une seule mention en dur trouvée et
corrigée à ce moment-là (texte affiché en Paramètres, `index.html`,
cosmétique) — tout le reste (manifests PWA, routes internes) utilise des
chemins relatifs, donc suit automatiquement n'importe quel domaine.

**Correction (16/07/2026)** : cet audit initial était incomplet. Un audit
plus large mené le 16 juillet (déclenché par la demande de retirer toute
mention de "Run by Léa"/`plan-10k`) a trouvé une vingtaine d'occurrences
supplémentaires de `plan-10k-alpha.vercel.app` réparties dans le code (pas
seulement la doc) — voir §23 pour le détail complet de ce nettoyage.

### 22.1 Fait

- **`index.html`** : texte "vX.Y · plan-10k-alpha.vercel.app" (écran
  Paramètres) mis à jour en "vX.Y · yoria.run".
- **Vercel** — `yoria.run` ajouté et défini comme domaine principal.
  `yoria-running.vercel.app` et `plan-10k-alpha.vercel.app` redirigent tous
  deux en `308 Permanent Redirect` vers `yoria.run`.
- **Supabase** — Site URL mis à jour vers `https://yoria.run`, et
  `https://yoria.run` / `https://yoria.run/**` ajoutés aux Redirect URLs
  (anciennes URLs laissées en place, sans impact).
- **Strava** — Authorization Callback Domain mis à jour vers `yoria.run`
  (remplace `yoria-running.vercel.app`, qui y était encore juste après le
  changement Vercel — cf. diagnostic ci-dessous). Testé avec succès sur les
  deux points d'entrée (Paramètres ET wizard) après une déconnexion/
  reconnexion complète (probablement nécessaire pour forcer un nouveau flow
  OAuth plutôt que de réutiliser un ancien state en cache côté navigateur).

**Diagnostic intermédiaire notable** : un premier test réussi depuis
Paramètres avait laissé penser que Strava acceptait déjà `yoria.run`, alors
que l'Authorization Callback Domain contenait encore
`yoria-running.vercel.app` à ce moment-là — ce domaine restant *lui-même*
un domaine valide au niveau DNS/Vercel (redirection 308 vers `yoria.run`),
il est possible que ce premier test ait en réalité abouti via ce chemin
sans jamais solliciter `yoria.run` au niveau du `redirect_uri` réellement
envoyé à Strava. Le test suivant depuis le wizard a échoué avec
`{"errors":[{"resource":"Application","field":"redirect_uri","code":
"invalid"}]}` — confirmant que le domaine autorisé chez Strava n'était pas
encore le bon. Résolu en mettant à jour ce champ vers `yoria.run`
explicitement.

### 22.2 Migration Android/TWA vers yoria.run — FAIT (16/07/2026)

**Symptôme découvert** : après le nettoyage identité (§23) et le renommage
du projet Vercel en `yoria`, la barre d'adresse est réapparue en permanence
sur l'app Android installée (TWA), en plein écran auparavant. Diagnostic
via `adb shell pm get-app-links app.vercel.plan_10k_alpha.twa` :
`Domain verification state: yoria-running.vercel.app: verified` —
`yoria.run` totalement absent de la liste, alors que la config TWA locale
n'avait jamais été migrée depuis le passage au domaine personnalisé du
15/07 (dette déjà identifiée mais non urgente à l'époque, cf. ancienne
version de cette section). Le déclencheur exact reste incertain (la
redirection 308 `yoria-running.vercel.app` → `yoria.run` existait déjà
depuis le 15/07 sans provoquer ce symptôme auparavant) — possible lien
avec le renommage du projet Vercel du 16/07, non confirmé formellement.

**Migration effectuée** (`twa-manifest.json`, projet local
`C:\Users\olaya\runbylea-android-v3\`, renommé `Yoria` après coup) : 5
champs mis à jour de `yoria-running.vercel.app` vers `yoria.run` — `host`,
`iconUrl`, `maskableIconUrl`, `webManifestUrl`, `fullScopeUrl`.
`packageId` (`app.vercel.plan_10k_alpha.twa`) et `signingKey`
**volontairement inchangés** — un `.aab` étant déjà uploadé sur Play
Console (même sans testeur ajouté), l'`applicationId` est réservé de façon
permanente côté Google ; le changer aurait signifié repartir de zéro sur
une fiche d'app entièrement séparée. `appVersionCode` incrémenté à `7`
(obligatoire pour qu'Android accepte de remplacer l'app déjà installée).

**Bug de signature `BadPaddingException` reproduit une nouvelle fois**
(déjà documenté §11/§13.2) — contournement habituel par `apksigner.jar`
en ligne de commande, mot de passe keystore/clé confirmé identique
(`keytool -list -v` avant signature, alias `android` retrouvé avec le bon
SHA256, correspondant à `assetlinks.json`). Un seul mot de passe demandé
par `apksigner` (comportement normal quand keystore et clé partagent la
même valeur).

**Validé en conditions réelles** : après `adb uninstall` /
`adb install app-release-signed.apk`, `adb shell pm get-app-links` affiche
désormais `yoria.run: verified`. Application testée sur le téléphone —
plein écran confirmé, barre d'adresse disparue.

**Non touché** (confirmé volontairement hors périmètre) :
`public/.well-known/assetlinks.json` (déjà correct, aucune modification
nécessaire — le fichier n'est pas lié à un domaine précis, juste servi
depuis le domaine que le navigateur/TWA interroge) ; certificat de
signature du keystore, qui contient encore `O=Run by Léa` dans son sujet
(gravé à la création le 13/07, non modifiable sans regénérer une nouvelle
clé — casserait la signature de l'app déjà publiée, aucun impact
fonctionnel ni visible).

## 23. Nettoyage identité complet — plus de "Run by Léa"/plan-10k (16/07/2026)

Demande de Laurent : ne plus laisser aucune trace de "Run by Léa" ou
`plan-10k` dans le code — Yoria doit être utilisé partout, y compris le
**persona du coach IA** lui-même (pas seulement le nom de l'app).

### 23.1 Audit mené avant modification

Repo entier téléchargé et grepé (94 fichiers texte) pour distinguer les
mentions à corriger des mentions légitimes à garder :

- **Headers de commentaire "Run by Léa"** dans 13 fichiers de code
  (`api/config.js`, les 6 `engine-classic-scripts/*.classic.js`, leurs 6
  équivalents `v2/engine/*.js`) — cosmétique, sans risque.
- **Persona coach "Léa"** dans `public/index.html` (17 occurrences) —
  prompts envoyés à l'IA (`Tu es Léa, coach running...`), labels UI,
  messages d'attente, commentaires expliquant pourquoi ne pas confondre le
  prénom du coach avec celui du coureur.
- **Domaine `plan-10k-alpha.vercel.app`** encore en dur dans le texte
  affiché en Paramètres (`index.html`, ligne ~5304) — pas corrigé lors du
  passage à `yoria.run` du 15/07 malgré ce qu'affirmait alors §22.1.
- **`assetlinks.json`** (`plan_10k`) et **package Android**
  (`app.vercel.plan_10k_alpha.twa`) — **volontairement exclus**, cf. §23.2.
- **Doublon de doc** : `docs/v2-methodologie/inventaire.md` (1628 lignes,
  version périmée arrêtée au 14/07) coexistait avec
  `inventaire-application.md` (la vraie source à jour) — résidu.
- **9 fichiers placeholders vides** `docs/{architecture,beta,changelog,
  legal,marketing,moteur,playstore,roadmap,sessions}/x` — origine inconnue,
  probable erreur de manipulation GitHub antérieure.

### 23.2 Décision : ce qui reste intentionnellement inchangé

- **`app.vercel.plan_10k_alpha.twa`** (applicationId Android) — identifiant
  **permanent** d'une app une fois publiée sur Play Store (même en piste de
  test interne). Le changer équivaudrait à créer une app totalement
  différente aux yeux de Google : perte de l'historique, des testeurs
  enregistrés, republication complète nécessaire. Laissé tel quel, decision
  actée avec Laurent.
- **`public/.well-known/assetlinks.json`** — lié au keystore/fingerprint
  Android existant, pas au nom du produit. Non touché.
- **Nom de dossier local** `runbylea-android-v3` — **renommé `Yoria` le
  16 juillet 2026**, après la migration Android/TWA (§22.2), une fois le
  build testé et validé fonctionnel. Cosmétique, aucun impact technique.
- **Sections narratives/historiques de cet inventaire** (§8bis, §12.5,
  §13-14, §16-22, diagnostics de bugs passés) — décrivent fidèlement l'état
  du code à un moment donné où "Léa"/`plan-10k` étaient encore les noms en
  vigueur ; laissées telles quelles pour la valeur documentaire, non
  réécrites rétroactivement.

### 23.3 Corrections appliquées

**Persona coach → Yoria** (`public/index.html`) — le coach s'appelle
désormais Yoria dans :
- Les deux prompts envoyés à l'IA (`fetchCoachMsg`, `fetchCoachRaceMsg`) :
  `Tu es Yoria, coach running...`, avec l'instruction anti-confusion mise à
  jour (`jamais "Yoria" — c'est ton propre prénom, pas le sien`).
- Les labels UI : "🤖 Conseil de Yoria pour la course", "Yoria réfléchit à
  un conseil…", "🤖 Yoria fait une pause — réessaie…", texte d'aide
  ("...les conseils personnalisés de Yoria selon ta progression").
- Les commentaires de code explicatifs (mécanisme anti-confusion de
  prénom, inchangé dans sa logique, juste renommé).

**Domaine** (`public/index.html`) : texte affiché en Paramètres corrigé en
`"vX.Y · yoria.run"` (n'avait en réalité jamais été fait au 15/07, malgré
l'ancienne affirmation en §22.1).

**Headers de commentaire** (13 fichiers, cf. liste §23.1) : `Run by Léa` →
`Yoria` en première ligne de chaque fichier.

**Docs** : suppression de `docs/v2-methodologie/inventaire.md` (doublon
périmé) et des 9 fichiers placeholders `docs/*/x`.

Vérification syntaxique (`node --check` sur le bloc `<script>` principal
extrait d'`index.html`) effectuée avant push — aucune régression.

### 23.4 Reste à faire

- **Android/TWA** : migration vers `yoria.run` **finalement faite le
  16 juillet 2026 également**, suite à un bug découvert (barre d'adresse
  réapparue sur l'app installée) — voir §22.2 pour le détail complet.
  N'était pas prévu dans le périmètre initial de ce nettoyage identité,
  traité en parallèle le même jour.
- `applicationId` Android (`app.vercel.plan_10k_alpha.twa`) : toujours
  intentionnellement inchangé (un `.aab` étant déjà uploadé sur Play
  Console, le changer impliquerait une republication complète) — décision
  confirmée à nouveau lors de la migration §22.2.

## 24. Bug intermittent corrigé : mauvais écran d'accueil du wizard (16/07/2026)

**Symptôme signalé par Laurent** : avec un seul plan actif (ex. plan
grand-débutant), cliquer sur "Configurer un plan" affichait tantôt "Que
veux-tu faire ?" (écran d'accueil normal, `accueil-wizard-contenu`) tantôt
directement "Quel est ton objectif ?" (`choix-mode-contenu`, comme si
aucun plan n'existait) — comportement intermittent, sans lien apparent
avec une action précise de l'utilisateur.

**Cause** : `initialiserApresChargementEngine()` (`v2/index.html`)
décide entre les deux écrans en interrogeant
`window.__UTILISATEUR__?.id` pour appeler `chargerPlansSupabase()`. Or
`window.__UTILISATEUR__` est peuplé de façon **asynchrone** par
`window.__AUTH_PRET__` (`LkAuth.monterEcranAuth()`, tout en haut du
fichier), sans aucune dépendance avec `engineReady` (l'événement qui
déclenche `initialiserApresChargementEngine()`) — une pure course entre
deux processus parallèles, dont l'issue dépend de la vitesse relative de
chacun à chaque chargement de page. Si l'authentification Supabase mettait
plus de temps à se résoudre que le chargement du moteur, le check
`window.__UTILISATEUR__?.id` échouait silencieusement (`undefined`),
`chargerPlansSupabase()` n'était jamais appelée, et le repli sur
`chargerPlans()` (Gist v1) retournait aussi `[]` faute de token GitHub
configuré — d'où le faux "aucun plan" intermittent. Bug de la même famille
que celui déjà corrigé côté `index.html` le 13 juillet 2026
(`window.__PLAN_PRET__` vs `window.__AUTH_PRET__`, cf. §8bis) — jamais
répliqué à l'époque côté wizard (`v2/index.html`), qui a son propre
mécanisme d'auth séparé.

**Correctif** : ajout d'un `await window.__AUTH_PRET__` explicite en tout
début de `initialiserApresChargementEngine()`, avant toute logique
dépendant de `window.__UTILISATEUR__`. Try/catch autour de l'attente
(si l'auth échoue complètement, `__UTILISATEUR__` reste `undefined` et le
comportement de repli existant — écran "Quel est ton objectif ?" — reste
correct dans ce cas, cohérent avec un utilisateur non connecté).

**Non touché** : `afficherPlansSauvegardes()` (fonction séparée, utilisée
par l'écran de consultation dédié) fait le même genre d'appel
`chargerPlansSupabase()`, mais elle n'est déclenchée que par un clic
utilisateur explicite (`ouvrirConsultationPlans()`) — largement après que
`window.__AUTH_PRET__` ait eu le temps de se résoudre dans tous les cas
réalistes, donc pas de risque de course identique.

**Validé en conditions réelles** par Laurent — plusieurs rechargements
successifs de page, toujours le bon écran d'accueil affiché.

## 25. Publication Play Store — génération du bundle .aab et exigences de test fermé (16/07/2026)

**Contexte** : suite à la validation du compte développeur (§11), Laurent a
commencé à remplir Play Console — orienté automatiquement vers un canal
**Tests fermés** plutôt que Test interne (piste initialement retenue,
§11, décision du 13/07). Vérification faite : ce n'est pas un choix
optionnel contournable, mais une vraie exigence Google en vigueur depuis
novembre 2023 pour tout nouveau compte développeur personnel — un test
fermé avec un minimum de testeurs (12 selon la documentation officielle
actuelle, certaines sources plus anciennes mentionnent 20) inscrits en
continu pendant 14 jours consécutifs est un prérequis obligatoire avant
tout accès à la production. Le canal "Test interne" reste disponible et
recommandé pour itérer rapidement, mais **ne compte pas** pour cette
exigence — les deux canaux sont indépendants. Laurent devra donc recruter
au moins une douzaine de testeurs (famille, amis coureurs, communauté
running) avant de pouvoir un jour publier en production, cohérent avec
l'objectif confirmé (app accessible à tous sur le Play Store à terme, pas
seulement famille/proches).

### 25.1 Découverte : aucun bundle .aab n'avait jamais été généré

En voulant uploader une release sur Play Console, constat que
`C:\Users\olaya\Yoria\` (renommé depuis `runbylea-android-v3`, cf. §23)
ne contenait qu'un `app-release-signed.apk` — **aucun fichier `.aab`**,
alors que Play Console exige un Android App Bundle, pas un APK, pour
toute publication (même en test fermé). Pourtant `bubblewrap build`
génère normalement les deux fichiers en une seule commande
(`app-release-signed.apk` et `app-release-bundle.aab`, documentation
officielle Bubblewrap) — investigation : `app\build\outputs\` ne
contenait qu'un dossier `apk\`, jamais de dossier `bundle\`, confirmant
que l'étape de construction du bundle (`bundleRelease`, tâche Gradle
distincte de `assembleRelease` pour l'APK) n'avait tout simplement jamais
été exécutée par Bubblewrap dans cette configuration — pas seulement
échouée à la signature comme pour l'APK (§11, bug `BadPaddingException`
déjà connu), mais carrément jamais lancée.

**Corrigé** : lancement manuel de la tâche Gradle correspondante,
directement depuis le projet Android local :
```
gradlew.bat bundleRelease
```
`BUILD SUCCESSFUL`, génère `app\build\outputs\bundle\release\app-release.aab`
(non signé). Un warning cosmétique sur `package=` dans
`AndroidManifest.xml` (recommandation Gradle moderne de retirer cet
attribut, namespace désormais géré ailleurs) — sans impact fonctionnel,
non traité.

### 25.2 Signature du bundle — apksigner ne fonctionne PAS sur un .aab

Première tentative avec `apksigner.jar` (l'outil habituel pour signer
l'APK, cf. §11/§13.2) — échec :
```
Exception in thread "main" com.android.apksig.apk.MinSdkVersionException:
Failed to determine APK's minimum supported platform version
Caused by: com.android.apksig.apk.ApkFormatException: Missing AndroidManifest.xml
```
Cause : un fichier `.aab` n'a pas la même structure interne qu'un `.apk`
(pas de `AndroidManifest.xml` à la racine — c'est un conteneur de modules,
pas un paquet installable directement) ; `apksigner` attend spécifiquement
un APK et ne sait pas traiter un bundle.

**Corrigé** : utilisation de `jarsigner` (signature générique de fichiers
ZIP/JAR, dont fait partie le format `.aab`) plutôt que `apksigner` :
```
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore android.keystore -signedjar app-release-bundle-signed.aab app\build\outputs\bundle\release\app-release.aab android
```
Réussi (`jar signed.`), même keystore/mot de passe que pour l'APK. Warning
"self-signed certificate" normal et attendu (keystore personnel, pas émis
par une autorité tierce) — pas une erreur.

Fichier final : `app-release-bundle-signed.aab` (~1,7 Mo), prêt à être
uploadé dans Play Console.

### 25.3 Point de vigilance retenu pour les prochaines releases

Si une future mise à jour de l'app native (icône, permissions, thème —
cf. §11, les mises à jour de contenu web n'en ont pas besoin) nécessite un
nouveau build : refaire les deux étapes dans l'ordre — `bubblewrap build`
(génère l'APK signé, échoue probablement à la signature comme d'habitude,
contournement par `apksigner.jar` déjà documenté) **puis**
`gradlew.bat bundleRelease` (génère le bundle non signé, jamais fait
automatiquement par Bubblewrap dans cette configuration) **puis**
`jarsigner` pour le signer. Ne pas réutiliser `apksigner.jar` sur le
`.aab`, ça échoue systématiquement.

## 26. Moteur de décision — ACWR unifié, coach connecté, garde-fous, profil enrichi (17/07/2026)

Suite directe de la session du 16/07/2026 (§11 doc intégration moteur de
décision) — traite les points 1 à 4 de la liste "prochaines étapes
logiques" (§11.7 doc intégration).

### 26.1 Unification de la source de vérité sur la charge (§9.3 doc intégration)

`calculerACWR(stravaActivities)` et `kmParJour()` (volume brut en km,
`plan-generator.classic.js` et `plan-generator.js`) **retirées**. Remplacées
par `DecisionEngineRunnerState.calculerHistoriqueCharge()`, nouvelle
fonction ajoutée à `decision-engine-runner-state.classic.js` qui reproduit
le calcul jour-par-jour de `calculerCharge()` (TRIMP/sRPE pondéré, pas du
volume brut) sur une fenêtre glissante — même moteur que celui utilisé pour
les décisions.

Deux nouveaux helpers dans `index.html` (`optionsRunnerStateActuel()`,
`obtenirRatioACWRActuel()`, `obtenirHistoriqueACWR()`) centralisent l'appel
au moteur pour le graphique dashboard ET la consigne de ton du coach — un
seul point de calcul, jamais deux exécutions séparées qui pourraient
diverger.

**Effet visible** : l'axe Y du graphique 1 (charge aiguë vs chronique)
affiche désormais des unités TRIMP/sRPE (ex. 777/389/0) au lieu de km bruts
(ex. 45/22/0) — changement d'échelle attendu, validé visuellement par
Laurent. Le ratio ACWR (graphique 2, seuils 0.8/1.3/1.5) reste inchangé,
sans unité.

### 26.2 Coach IA branché sur le moteur (§9.1 doc intégration)

Nouveau helper commun `calculerEtatMoteurDecision()` (`index.html`, retourne
`{ runnerState, engagementState, decision }`), réutilisé par `moteurDecisionEl`
(carte de proposition, refactorisée pour ne plus dupliquer le calcul) et par
`fetchCoachMsg()`.

`consigneChargeInterne` (prompt du coach) ne recalcule plus un ratio ACWR
informel séparé — elle lit `RunnerState.fatigue`/`.risque`, et si une
`EngineDecision` du jour existe (`reduire_charge`, `alerter_blessure_potentielle`,
`alerter_risque_decrochage`), le prompt en est informé explicitement pour
ne jamais contredire la carte de proposition affichée au même moment. Le
coach peut commenter la décision, jamais en produire une différente à
partir de son propre calcul — conforme au principe du doc archi ("les
modèles d'IA ne doivent jamais prendre les décisions d'entraînement").

`repos_complet`/`demarrer_taper` ne sont pas encore produits par le
catalogue actuel (3 règles seulement) — seuls les 3 types réels sont gérés
dans la consigne coach pour l'instant.

### 26.3 Deux garde-fous ajoutés (§10.2 doc intégration)

**Borne dure individuelle** (`decision-engine-rules.classic.js`) : nouvelle
constante `BORNE_AMPLEUR_MAX_POURCENT = 30`, exposée globalement
(`DecisionEngineRules.BORNE_AMPLEUR_MAX_POURCENT`). Dans `evaluerRegles()`,
`ampleurPourcent` de la décision gagnante est plafonné à -30% si une règle
en produirait plus (protection contre un seuil mal calibré ou une erreur de
frappe dans une constante) — un `console.warn` signale le plafonnement,
jamais silencieux.

**Plafond cumulé sur 14 jours glissants** (`decision-engine-apply.classic.js`) :
nouveau journal `planBrut.historiqueReductionsMoteur` (tableau
`{regleId, ampleurPourcent, appliqueLe}`), alimenté à chaque application
réussie d'une décision `reduire_charge`. Nouvelle fonction
`calculerReductionCumulee()` calcule le cumul des réductions déjà
appliquées sur la fenêtre glissante ; `appliquerDecisionAuPlan()` refuse
d'appliquer une nouvelle décision si le cumul dépasserait 25% — retourne
`{succes: false, raison: '...'}` sans toucher au plan.

Le journal est stocké directement sur `planBrut` (pas dans une clé
localStorage séparée) : il persiste automatiquement via `sauvegarderPlan()`
(déjà appelée après chaque application réussie), sans code de persistance
dédié à ajouter.

**Effet visible côté UI** : si le garde-fou refuse une application (clic
sur "Appliquer" dans la carte de proposition), un `alert()` explique la
raison au coureur — avant ce correctif, le refus n'était logué qu'en
console, sans aucun retour visuel (bug potentiel corrigé au passage, pas
encore observé en usage réel puisque le catalogue n'a produit aucune
décision `reduire_charge` jusqu'ici sur les données de Laurent).

### 26.4 Champs profil `fcRepos` et `sexe` (§11.7 point 4 doc intégration)

Deux nouveaux champs optionnels dans `profilCoureur` :
- **`fcRepos`** (number, bpm) : ajouté au tableau du formulaire Réglages, à
  côté de FC max (`inp-fcrepos`).
- **`sexe`** (`'homme'|'femme'|'autre'`) : nouvelle section dédiée en
  Réglages (boutons toggle, même pattern visuel que le sélecteur de
  niveau), placée juste après "Niveau".

Les deux champs sont également disponibles à l'**onboarding**
(`auth.classic.js`, `monterEcranOnboarding()`) — ajoutés le 17/07/2026 à la
demande de Laurent, après un premier passage où ils n'étaient présents
qu'en Réglages. **Point de vigilance appliqué** : le bug de redéclenchement
infini corrigé le 15/07/2026 (niveau `null` traité comme "jamais renseigné",
bouton "Passer" retiré) impose que ces deux nouveaux champs restent
strictement **optionnels** et ne touchent jamais à `validerBtn.disabled` —
seul `niveauChoisi` contrôle la validation de l'écran, vérifié explicitement
(un seul re-clic sur une option sexe la désélectionne, comportement normal
d'un champ optionnel, sans effet sur le bouton Valider).

`optionsRunnerStateActuel()` (§26.1) lit désormais les vraies valeurs de
`profilCoureur.fcRepos`/`.sexe` au lieu des valeurs d'exemple (55 / 'autre'
en dur) utilisées depuis le 16/07/2026. Tant que ces champs ne sont pas
renseignés, le moteur garde un repli propre déjà existant (sRPE si pas de
FC repos, moyenne des constantes TRIMP si sexe non renseigné) — purement
additif, aucune régression pour les profils non mis à jour.

### 26.5 Bug corrigé : message du coach figé après validation d'une séance

**Symptôme signalé par Laurent** : le coach continuait de parler de la
séance de qualité de mercredi (VMA) comme "clé de demain" alors qu'il avait
déjà validé son EF du jeudi. Cause : `fetchCoachMsg()` ne régénère le
message qu'une fois par jour (`coachDate === today() && coachMsg` bloque
tout refetch), et rien ne réinitialisait ce cache quand le statut d'une
séance changeait en cours de journée — le message restait figé sur l'état
du tout premier chargement du dashboard.

**Corrigé** (`index.html`, fonction générique `statusRow` utilisée pour
tous les boutons de statut ✅/⚠️/❌) : quand le statut de la séance **du
jour précis** (`dateSeance === today()`) change, le cache coach
(`coachMsg`/`coachDate`, mémoire ET localStorage) est invalidé et
`fetchCoachMsg()` relancé. Ne concerne que la séance du jour — corriger le
statut d'une séance passée ne redéclenche jamais d'appel coach inutile.

### 26.6 Régression détectée, non corrigée : barre TWA Android réapparue

Le symptôme déjà diagnostiqué et corrigé le 16/07/2026 (§22.2 — barre
Partager/⋮ visible sur la TWA installée au lieu du plein écran habituel)
est **réapparu**. Reconfirmé le 17/07 : `yoria-running.vercel.app/.well-known/assetlinks.json`
répond toujours `308` vers `yoria.run` (comportement normal, documenté en
§22.1 — redirection Vercel volontaire), et `yoria.run/.well-known/assetlinks.json`
répond bien `200`. Rien n'a changé côté serveur depuis le 16/07 — la
régression est donc côté app installée (build/vérification Android), pas
côté code du repo. Cause exacte non confirmée à ce stade (réinstallation
d'un ancien `.aab`/`.apk` ? invalidation de la vérification Android pour
une autre raison ?). Prochaine étape : reconfirmer avec
`adb shell pm get-app-links app.vercel.plan_10k_alpha.twa` si `yoria.run`
est toujours listé `verified` ; si non, réinstaller le build déjà signé et
validé le 16/07/2026 (procédure complète documentée en §22.2, pas besoin
de repartir de zéro).

## 27. Moteur de décision — Module 2 (SessionAnalyzer) et garde-fous anti-régénération rétroactive (17/07/2026)

### 27.1 Module 2 — SessionAnalyzer livré

Nouveau fichier `decision-engine-session-analysis.classic.js` (+ synchronisé
`public/v2/engine/session-analysis.js` non créé — **ce module n'existe qu'en
version classic**, pas de version ES source, car il ne dépend d'aucun autre
module ES et a été écrit directement pour l'usage classic ; à garder en tête
si l'architecture duale ES/classic doit être généralisée plus tard).

**Périmètre restreint** (décision Laurent) : analyse uniquement les séances
de qualité (VMA/SPEC/SEUIL/TEST), jamais EF/LONGUE/RECUP — ces dernières
n'ont pas de cible d'allure resserrée dans Yoria, l'écart n'y a pas le même
sens.

**Fonction principale** : `DecisionEngineSessionAnalysis.analyser(seanceRealisee, ciblesSeance)`
→ `SessionAnalysis` (score de réussite, écarts par dimension avec
commentaires, difficulté ressentie déduite, alertes). Branchée côté
`index.html` via `analyserSeanceQualite(seance)` (~ligne 1432), qui construit
les inputs depuis `stravaActivities`/`SESSION_TARGETS`/`FC_ZONES`/
`getLapsAffichage()`.

**Bugs trouvés et corrigés le jour même**, avant toute mise en usage réelle
prolongée (bloc de test dédié dans Stats, cf. 27.2) :
1. Comparaison initiale sur `activite.average_speed` (moyenne de TOUTE
   l'activité, échauffement/récup/retour au calme confondus) → corrigé pour
   utiliser `getLapsAffichage()` et ne comparer que les laps d'effort réels.
2. `distanceEffortStructure()` retourne des **mètres**, pas des km —
   conversion par 1000 manquante, faussait tout calcul de volume prévu par
   un facteur ~1000.
3. `distanceEffortStructure()` ne lisait que `bloc.distanceM`, ignorant
   silencieusement les blocs définis en **durée** (`dureeEffortSec` +
   `allure`, ex. "5×30s-30s" — protocole VMA courant) → distance nulle,
   "Volume non disponible" systématique sur ce type de séance. Corrigé :
   calcule la distance depuis durée/allure quand `distanceM` est absent.

**Refonte des 3 dimensions analysées** (décision issue d'une discussion
approfondie avec Laurent sur le sens sportif de chaque écart) :
- **Allure** : reste symétrique (trop rapide et trop lent pénalisent à la
  même hauteur). Une asymétrie (trop rapide plus pénalisant, cf. littérature
  sur le respect du protocole d'intervalles) a été envisagée mais **reportée
  faute de données réelles pour la calibrer** — décision explicite : "on
  verra l'asymétrique des allures si nécessaire plus tard".
- **FC** : une FC trop **basse** ne pénalise plus (n'est pas un signal
  négatif en soi, contrairement à l'allure) — seule une FC trop **haute**
  reste pénalisée.
- **Volume → Répétitions** : dimension entièrement repensée. L'ancienne
  comparaison de distance totale ne capturait pas un abandon en cours de
  séance (la montre continue d'enregistrer les créneaux prévus même en cas
  de répétition "marchée"/ratée — la distance totale peut rester proche de
  la cible malgré une vraie répétition ratée au milieu). Remplacée par
  `analyserRepetitions()` : compte le taux de répétitions dans la zone
  `okPace`, avec ratio de complétion `repOk`/`repWarn` — **réutilise
  exactement la même logique que `autoValidate()`/`validateReason()`**
  (§6097-6178 index.html, déjà existants) pour qu'il n'existe qu'une seule
  définition de "séance de qualité réussie" dans toute l'app.

Pondérations du score : allure 0.4, FC 0.25, répétitions 0.35 (remonté par
rapport à l'ancien "volume" à 0.15 — c'est le signal le plus fiable pour
détecter un abandon).

### 27.2 UI de test — bloc "🧪 Test Module 2" dans Stats

Sélecteur (menu déroulant) de toutes les séances qualité passées avec statut
renseigné, affiche le `SessionAnalysis` complet pour la séance choisie. Bug
trouvé et corrigé le jour même : `select.value` doit être forcé
explicitement après construction du DOM (l'attribut `selected` posé sur les
`<option>` par `el()` ne suffit pas à faire refléter la sélection après
re-render).

### 27.3 Garde-fous anti-régénération rétroactive des séances passées

**Origine** : Laurent a observé qu'une séance déjà réalisée (10/07/2026,
initialement "2×8×30-30") apparaissait a posteriori comme "4×30-30" dans le
plan — changement rétroactif trompeur pour toute analyse a posteriori (dont
le Module 2). Cause identifiée : un bouton UI "rattraper les structures
d'intervalles" existait dans Réglages avant le 13/07/2026 (retiré depuis),
appelant `regenererStructuresIntervalles()` — cette fonction attribuait une
structure fraîchement calculée à toute séance qui n'en avait pas encore, **y
compris les séances déjà passées**, sans aucun garde-fou de date à l'époque.

**Principe retenu, appliqué aux 3 mécanismes identifiés qui modifient un
plan existant en place** : avant toute modification du contenu d'une
séance/semaine, vérifier si sa date est strictement antérieure à aujourd'hui
— si oui, ne jamais la toucher.

1. **`changerPalierGrandDebutant()`** (index.html, ~ligne 3402) — seul point
   de régénération *complète* du plan trouvé (mode grand-débutant/marche-
   course). Garde-fou : pour chaque semaine du nouveau plan généré, si
   TOUTES ses séances ont une date déjà passée, la semaine du nouveau plan
   est remplacée par celle de l'ancien plan (fusion semaine par semaine, pas
   jour par jour — une semaine partiellement passée suit le nouveau plan en
   entier, plus simple à maintenir cohérent).

2. **`appliquerAdaptations()`** (plan-generator, ES + classic synchronisés)
   — mécanisme "Adaptation suggérée" (allégement ×0.75 d'une semaine suite à
   des séances difficiles). Ne cible normalement que la semaine SUIVANTE une
   semaine déjà notée (donc rarement déjà passée par construction), mais cas
   limite possible si la proposition est ignorée plusieurs semaines ou
   appliquée en retard. Garde-fou ajouté : si la semaine ciblée est déjà
   entièrement passée, elle est ignorée avec un nouveau code d'avertissement
   `ADAPTATION_IGNOREE_SEMAINE_PASSEE`, pas modifiée.

3. **`regenererStructuresIntervalles()`** (plan-generator, ES + classic
   synchronisés) — la cause identifiée en 27.3 ci-dessus. Le bouton UI
   correspondant n'existe plus (retiré 13/07), mais la fonction restait
   appelable manuellement depuis le moteur. Garde-fou ajouté : calcule la
   date de chaque séance qualité avant de lui attribuer une structure, `skip`
   silencieusement si déjà passée.

**Mode Forme (`plan-forme.js`/`.classic.js`)** : vérifié séparément,
`genererBlocSuivant()` (extension du cycle glissant) ne modifie jamais le
plan précédent en place — ajoute seulement un nouveau bloc à la suite, donc
aucun risque par construction. Pas encore branché à une UI dans
`index.html` à ce jour ; **point de vigilance pour plus tard** : vérifier au
moment de son branchement que la fusion avec le plan existant ne touche que
les semaines futures.

**Limite connue** : ces 3 garde-fous couvrent tous les mécanismes de
modification de plan existant identifiés dans le code au 17/07/2026. Toute
future fonctionnalité qui modifierait le contenu d'un plan déjà en place
(ex. futur "adapter mon plan suite à une blessure") devra implémenter le
même principe explicitement — ce n'est pas un garde-fou générique/transverse
appliqué automatiquement à toute écriture sur `plan.semaines`.

### 27.4 Idée notée, pas conçue ni codée : cochage automatique du statut "Partiel"

**Idée évoquée le 17/07/2026** : coder un déclenchement automatique du
statut coureur `⚠️ Partiel` (cf. §29 pour le renommage "Adaptée" →
"Partiel") à partir du `scoreReussite`/`reussite` produit par le Module 2
(`SessionAnalyzer`), plutôt que d'attendre le clic manuel du coureur.

**Points à trancher avant de concevoir ce chantier** (aucun acté à ce jour) :
- Le Module 2 ne couvre que les séances de qualité (VMA/SPEC/SEUIL/TEST,
  cf. §27.1) — un tel automatisme ne pourrait donc cocher `Partiel`
  automatiquement que sur ces types-là, jamais sur EF/LONGUE/RECUP.
- Seuil de déclenchement à définir (`scoreReussite` en dessous de quelle
  valeur ? le champ `reussite` du Module 2 utilise déjà un seuil à 60,
  cf. §27.1 — réutiliser ce même seuil ou en définir un différent
  spécifiquement pour ce cas ?).
- Tension avec le principe "rien n'est automatique en V1" (§7.1 doc
  intégration) — ce principe s'applique explicitement aux *décisions du
  moteur sur le plan à venir*, pas aux statuts rétrospectifs du coureur,
  mais l'esprit de prudence mérite d'être re-questionné avant de coder un
  automatisme qui modifierait un jugement que le coureur pose habituellement
  lui-même après coup.
- Doit-il rester silencieux (juste coché) ou notifier le coureur que le
  statut a été posé automatiquement, pour éviter toute confusion avec un
  clic qu'il n'a pas fait ?

## 28. Wizard — deux bugs de navigation trouvés et corrigés (17/07/2026, suite de session)

### 28.1 Bug corrigé : la flèche retour depuis une consultation menait à une régénération non désirée

**Symptôme identifié en creusant une remarque de Laurent** ("je trouve dangereux d'avoir 2 plans qui peuvent être modifiés chacun à leur niveau") : depuis l'écran de consultation d'un plan existant (`chargerPlanExistant()`, atteint via "Consulter un plan existant" → clic sur un plan), cliquer la flèche retour ramenait au formulaire du wizard (étape 9, récap) avec les champs pré-remplis de la dernière session de création — pas nécessairement synchronisés avec le plan réellement consulté. Poursuivre jusqu'au bout depuis cet écran déclenchait `generateAndShowResults()`, qui génère un **plan entièrement nouveau avec un nouvel id** (`crypto.randomUUID()`), sauvegardé en plus (pas à la place) du plan consulté.

**Vérifié, pas aussi grave qu'initialement craint** : ce n'est jamais un écrasement silencieux du plan consulté (id différent à chaque génération), mais le vrai risque reste réel — se retrouver avec deux plans distincts qui se chevauchent en dates (bloqué par le garde-fou `trouverPlanEnConflit()` existant, avec message d'erreur) ou un plan fantôme créé sans intention claire, simplement en naviguant par curiosité.

**Corrigé** (`public/v2/index.html`, wizard) : nouveau flag `consultationSeule`, positionné à `true` uniquement dans `chargerPlanExistant()` (jamais dans les 3 autres points de génération fraîche — course, Mode Forme, grand-débutant, qui le remettent explicitement à `false`). `prevStep()` vérifie ce flag en priorité : si vrai, la flèche retour appelle `retourAccueilWizard()` (retour direct à "Consulter / Créer un nouveau plan") au lieu de rouvrir le formulaire vers un chemin de régénération.

### 28.2 Bug corrigé : rouvrir le wizard forçait la reprise d'un plan abandonné, sans accès à l'écran d'accueil

**Symptôme remonté par Laurent** : après avoir initié un plan sans le terminer (retour à l'app en cours de route), rouvrir le wizard ("Configurer plan") ne proposait plus l'écran d'accueil (Consulter/Créer) — il forçait la reprise directe de l'étape où le wizard avait été quitté, sans échappatoire pour consulter un plan existant ou en créer un autre.

**Cause** : un mécanisme de restauration d'étape (`v2_wizard_step` en `sessionStorage`, écrit à chaque changement d'étape via `showStep()`) avait été conçu spécifiquement pour un cas précis — un retour après `window.location.reload()` forcé par `capterRetourStravaOAuth()` (nécessaire pour corriger un bug de rendu visuel sur Android/Chrome au retour d'une navigation externe, cf. commentaire historique dans le code). Le code de restauration (au chargement de la page) ne vérifiait que la présence de cette clé — jamais si on était réellement dans ce contexte précis. `sessionStorage` survit tant que l'onglet reste ouvert, donc la clé restait active bien après avoir quitté le wizard normalement, forçant indéfiniment la reprise à la prochaine ouverture.

**Corrigé** : nouveau signal dédié `v2_reload_retour_strava`, posé exclusivement dans `capterRetourStravaOAuth()` juste avant son `reload()` forcé, lu et **consommé** (retiré) une seule fois au chargement suivant. La restauration automatique d'étape (mode course ET Mode Forme) n'a désormais lieu que si ce signal est présent. Si ce n'est pas le cas, `v2_wizard_step`/`v2_wizard_step_forme` sont nettoyées explicitement — pour que le mécanisme `etapeSauvegardee` (utilisé plus loin dans `validerChoixMode()` lors d'un choix de mode volontaire depuis l'accueil) ne retrouve jamais une étape périmée non plus.

### 28.3 Contexte découvert en creusant ces bugs : lien réel entre wizard et dashboard

Clarification utile pour la suite (question de Laurent : "le plan du wizard et le plan dans l'application sont-ils complètement liés ?") — **non**, ils ne communiquent que via la liste de plans persistée (Supabase/Gist), jamais en mémoire vive partagée :
- Le wizard sauvegarde un plan (`sauvegarderPlan()`/`assurerPlanExiste()`) puis redirige (`location.href = '/'`) vers `index.html`, qui recharge indépendamment cette liste à son propre démarrage.
- Certaines données de suivi du dashboard (`swappedSessions`, `statuses`, notes, etc. — 19 clés recensées, préfixées `lk_*`) vivent en **localStorage**, séparément du plan réellement persisté (`plan.semaines`) — un swap de séance dans le dashboard n'est donc jamais visible si on rouvre le wizard sur ce même plan (il n'a jamais été écrit dans le plan lui-même).
- Vérifié : le wizard ne permet pas de rééditer/régénérer le contenu d'un plan existant en place (seul `changerPalierGrandDebutant()`, déjà sécurisé en §27.3, le fait) — la génération produit toujours un plan à nouvel id, jamais un écrasement du plan consulté.
## 29. Séparation plans_original / plans_actif + correctif date de course (17/07/2026, session ultérieure)

### 29.1 Chantier : historique figé vs plan vivant

**Objectif posé par Laurent** : garder une trace figée du plan tel que généré par le wizard (audit/comparaison), séparée de la version que le moteur de décision et les futurs décalages de date modifient au fil du temps.

**Décisions actées avec Laurent** :
- Deux tables Supabase distinctes plutôt qu'une colonne `type` sur la table existante — plus sûr et plus clair.
- `plans_original` : jamais modifiée après création, sert uniquement à l'audit/comparaison (pas de reset depuis cette copie en V1).
- `plans_actif` : version vivante, seule modifiée par le moteur/wizard/décalage de date.
- Migration des données existantes : renommage `plans` → `plans_original` (aucune donnée déplacée), puis `plans_actif` créée par copie complète (structure + contenu).
- Le backup Gist (sync multi-appareils, fallback si Supabase non configuré) contient aussi les deux versions, décision explicite de Laurent (anticiper plutôt que refaire plus tard), malgré le doublement de taille du fichier JSON.

### 29.2 Migration SQL exécutée

```sql
ALTER TABLE plans RENAME TO plans_original;
CREATE TABLE plans_actif (LIKE plans_original INCLUDING ALL);
INSERT INTO plans_actif SELECT * FROM plans_original;
```

**Point de vigilance confirmé en pratique** : `LIKE ... INCLUDING ALL` ne copie **pas** les policies RLS (vérifié via `SELECT * FROM pg_policies WHERE tablename = 'plans_actif'` → aucune ligne après la création). Recréées manuellement à l'identique de `plans_original` (4 policies : INSERT/SELECT/UPDATE/DELETE, toutes `auth.uid() = user_id`).

**Deuxième point trouvé après coup** : la contrainte de clé étrangère `plan_donnees.plan_id` a suivi le `RENAME` et pointait donc vers `plans_original` au lieu de `plans_actif` — repointée explicitement :
```sql
ALTER TABLE plan_donnees DROP CONSTRAINT plan_donnees_plan_id_fkey;
ALTER TABLE plan_donnees ADD CONSTRAINT plan_donnees_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES plans_actif(id) ON DELETE CASCADE;
```

### 29.3 Code adapté — routage des tables

**`sync-storage.js` / `.classic.js`** :
- `chargerPlansSupabase()`, `mettreAJourPlanSupabase()`, `cloturerPlanSupabase()` → lisent/écrivent `plans_actif` uniquement.
- `assurerPlanExiste()` (appelée par le wizard à la création, et à chaque chargement de `index.html` v1 en garde-fou) → vérifie l'existence dans `plans_actif`, puis insère la **même ligne** dans `plans_original` ET `plans_actif` si absente. Best-effort sur chaque insert séparément (un échec sur l'une n'empêche pas l'autre).

**`v2/index.html`** (`supprimerPlanUI`) : la suppression touche désormais les deux tables Supabase (`plans_original` puis `plans_actif`), plus le Gist. Toujours best-effort, jamais bloquant.

### 29.4 Gist — format étendu, rétrocompatible

**`gist-sync.js` / `.classic.js`** : le fichier `plan10k_v2_plans.json` passe de `{ plans }` à `{ plans, plansOriginal }`.
- `ecrireListePlans()` (sauvegarde/suppression/renommage du plan actif) relit désormais `plansOriginal` avant chaque écriture et le réinjecte tel quel — sans ça, la copie figée serait perdue à la prochaine écriture du plan actif, le body PATCH remplaçant tout le contenu du fichier Gist.
- Nouvelles fonctions `chargerPlansOriginal()` et `ajouterPlanOriginal()` (miroir de `assurerPlanExiste` côté Supabase) : n'écrit qu'une fois, à la création par le wizard ; ne fait rien si un plan avec cet id existe déjà dans `plansOriginal`.
- Appelée dans `v2/index.html`, juste après `sauvegarderPlan()`, au seul vrai point de création du wizard (juste avant la redirection vers le dashboard).
- `public/index.html` (v1) : pas de modification nécessaire — `assurerPlanExiste()` (Supabase) y gère déjà la création "si absent" à chaque chargement de page, sans équivalent Gist de création séparé à ce niveau.

### 29.5 Bug découvert en testant : date de course décalée jusqu'à plusieurs jours

**Symptôme remonté par Laurent** en testant la création d'un nouveau plan : dateCourse saisie 04/04/2027, mais le calendrier généré plaçait le jour de course au 28/03/2027 (-7 jours).

**Cause, dans `plan-generator.js`/`​.classic.js`** — deux problèmes cumulés, indépendants du chantier 29.1-29.4 (bug préexistant, découvert par hasard en testant) :

1. `computePhases()` calculait `totalSemaines = Math.round(totalJours / 7)` — un arrondi classique, qui peut arrondir **vers le bas** si `totalJours` n'est pas un multiple exact de 7. Le plan généré peut alors être une semaine trop court par rapport à la vraie durée jusqu'à `dateCourse`.
2. `placerSeanceCourse()` plaçait systématiquement la séance de course sur "le dernier jour généré" (dernière clé de `assignment` de la dernière semaine), en supposant que `dateCourse` tombait toujours exactement sur ce jour — vrai uniquement si `totalJours` est un multiple de 7 depuis `dateDebut`.

**Corrigé** :
1. `computePhases()` : `Math.round` → `Math.ceil` — le plan ne se termine plus jamais avant `dateCourse`, seulement pile ou légèrement après (semaines entières).
2. `placerSeanceCourse()` : calcule désormais le jour ISO exact de `dateCourse` (`new Date(dateCourse).getDay()`, converti de 0=dimanche...6=samedi vers 0=lundi...6=dimanche pour matcher les clés `assignment`), et cible cette clé précise dans la dernière semaine plutôt que systématiquement la dernière entrée de l'objet. Garde-fou ajouté pour le cas où `dateCourse` tombe un lundi (clé 0 absente de `assignment`, repos implicite) : repli sur l'ancien comportement (dernier jour généré) plutôt que ne rien faire silencieusement.

**Non traité, décision explicite** : refonte du moteur en vrai calendrier jour-par-jour (au lieu du modèle actuel en semaines entières par phase) — écartée après discussion. Le modèle "semaines entières" structure toute la génération (phases, séances qualité, longue, affûtage), pas seulement le calcul final ; une vraie refonte serait un chantier à part, plus risqué, non nécessaire pour corriger ce bug précis.

**Non re-testé** : le plan "Semi — 1:47:00" créé pendant les tests du chantier 29.1-29.4 a été généré **avant** ce correctif — il garde l'ancien calendrier décalé. Le fix ne s'applique qu'aux plans générés après le push. Pas régénéré par Laurent en fin de session (pas bloquant, juste à garder en tête si ce plan précis est réutilisé).

### 29.6 Fichiers modifiés (7 au total, 2 commits séparés)

Chantier 29.1-29.4 : `public/v2/engine/gist-sync.js`, `public/v2/engine/sync-storage.js`, `public/engine-classic-scripts/gist-sync.classic.js`, `public/engine-classic-scripts/sync-storage.classic.js`, `public/v2/index.html`.

Chantier 29.5 : `public/v2/engine/plan-generator.js`, `public/engine-classic-scripts/plan-generator.classic.js`.

Tous validés syntaxiquement (`node --check`) avant push. Push effectué via API GitHub REST directe (curl/Python, token PAT) — le connecteur MCP GitHub a renvoyé une 403 à l'écriture sur ce repo, confirmant qu'il reste lecture seule ici (cf. §Outils & principes déjà connus).

### 29.7 Renommage statut "Adaptée" → "Partiel" + réactivation du bloc "Bilan semaine" (session ultérieure, 17/07/2026)

**Renommage effectué** : le libellé du statut coureur ⚠️ passe de "Adaptée" à
"Partiel", conformément à la décision actée le 16/07/2026 (cf. doc
intégration §7.3/9.2) mais jamais appliquée en code jusqu'ici. Deux endroits
modifiés dans `public/index.html` : le badge affiché sur une carte de séance
validée (`✅ Validée`/`⚠️ Partiel`/`❌ Ratée`) et le libellé du compteur dans
le bilan de fin de semaine (`⚠️ partielles`). Le bouton de sélection du
statut lui-même (`SOPTS`, `renderStatusRow`) n'affiche que le symbole ⚠️
sans texte, donc rien à y changer.

**Idée notée en parallèle, pas codée** : cochage automatique du statut
"Partiel" basé sur le `scoreReussite` du Module 2 (SessionAnalyzer) —
documenté en §27.4, questions ouvertes à trancher avant conception.

**Découverte en marge du renommage** : le bloc "Bilan semaine" (compteurs
faites/partielles/manquées + % de complétion + stats additionnelles km/min
réels vs prévus, allure et FC moyennes EF avec comparaison à la semaine
précédente, température moyenne des séances) était entièrement calculé dans
`renderDashboard()` (variable `bilanEl`, cf. le calcul juste après la boucle
des cartes de séance) mais **jamais inséré dans le DOM retourné par la
fonction** — code mort, probablement laissé de côté au profit du "Bilan de
phase" qui le suit dans le fichier, sans nettoyage. Confirmé en discutant
avec Laurent (qui voyait bien le bilan de phase mais cherchait en vain le
bilan de semaine).

**Corrigé** : `bilanEl` est désormais branché dans le `return` final de
`renderDashboard()`, entre `todayEl` et `phaseEl` — ordre logique
(aujourd'hui → bilan de la semaine en cours → bilan de la phase en cours).
Le bloc ne s'affiche que si au moins une séance de la semaine a un statut
renseigné (`report.done+report.adapted+report.missed > 0`), sinon reste
`null` comme avant.

**Fichiers modifiés** : `public/index.html` uniquement (pas de fichier
`.classic.js` équivalent pour cette partie du dashboard v1).

## 30. Moteur de décision — Module 3 (WeekAnalyzer) livré (17/07/2026, session ultérieure)

### 30.1 Décisions actées avant codage

- **Fonction pure, sans dépendance au Module 2** (SessionAnalyzer) — le
  Module 2 ne couvre que les séances de qualité (VMA/SPEC/SEUIL/TEST), un
  WeekAnalyzer qui en dépendrait perdrait la vue sur EF/LONGUE/repos, la
  majorité d'une semaine type. Diverge d'une anticipation notée dans
  l'en-tête de `decision-engine-session-analysis.classic.js` ("doit être
  chargé AVANT tout futur Module 3") — anticipation qui ne s'est pas
  vérifiée, assumé.
- **Pas de gestion de stockage/historique** dans le module — `semainePrecedente`
  est un paramètre fourni par l'appelant, jamais récupéré par le module
  lui-même. Même philosophie que les Modules 1/2/5 (fonctions pures, aucun
  effet de bord).
- **Entrées en interfaces abstraites** (`SeanceRealisee[]`/`SeancePrevue[]`
  du doc archi), jamais `assignment`/`statuses` bruts d'`index.html` — la
  transformation depuis le format réel de stockage est la responsabilité de
  l'appelant (le wrapper `analyserSemaineActuelle()`, cf. §30.3), pas du
  module de calcul. Cohérent avec le style déjà choisi pour les Modules 1/2/5.

### 30.2 Comblement d'un vide du contrat théorique

`SeanceRealisee[]` (doc archi) ne représente que les séances réellement
faites — aucun moyen d'y exprimer une séance manquée. Le module prend donc
aussi `seancesPrevues: SeancePrevue[]` (toute la semaine prévue) et déduit
`seancesManquees` par différence (`seancesTotal - seancesReussies`), repos
exclu du calcul (`estSeanceARealiser`).

### 30.3 Fichier créé : `decision-engine-week-analysis.classic.js`

Expose `DecisionEngineWeekAnalysis.analyser(semaine, seances, seancesPrevues,
planSemaine, semainePrecedente, fcMaxReference, fcReposReference, sexe)`,
conforme à l'interface `WeekAnalysis` du doc archi (volume réalisé/prévu,
écart %, séances manquées/réussies/total, charge totale semaine,
récupération estimée, tendance vs semaine précédente).

`chargeTotaleSemaine` réutilise exactement la même formule que le Module 1
(TRIMP de Banister si FC dispo, sRPE de Foster sinon, proxy durée en dernier
recours), dupliquée volontairement dans ce fichier — même pattern que le
Module 2 vis-à-vis de `parseAllure` (aucun module du moteur ne dépend d'un
autre script du moteur).

`progressionVsPrecedente` : seuil ±10% de variation de charge pour basculer
hors de `'stable'` — évite de qualifier de hausse/baisse une fluctuation
normale d'une semaine à l'autre.

### 30.4 Chargé dans `index.html`, wrapper `analyserSemaineActuelle()`

Script chargé juste après le Module 2 (avant Module 5/RuleEngine). Wrapper
`analyserSemaineActuelle(weekNum, semainePrecedenteAnalyse)` ajouté dans
`index.html` (juste après `weeklyReport()`) : adapte `week.sessions`
(`PLAN`), `statuses`, `stravaActivities`, `sessionNotes` vers le format
attendu par le module — réutilise `fmtPace()`/`phaseOf()` déjà existantes,
ne duplique aucun calcul déjà fait par `weeklyReport()`/`weekStats()`.

**Bug trouvé et corrigé en testant avec Laurent (17/07/2026)** : sans
filtre de date, les séances futures de la semaine en cours (demain,
après-demain) étaient comptées comme "manquées" — `seancesPrevues` ne
contenait aucune notion de date passée/future avant correction. Corrigé :
`week.sessions` filtrée sur `s.date <= today()` avant d'être transformée en
`SeancePrevue[]`. Une séance future n'est ni manquée ni réussie, elle n'a
simplement pas encore eu lieu.

**Bloc de test ajouté** dans l'onglet Stats (`renderStats()`), même pattern
que "🧪 Test Module 2" (§27.2) : analyse la semaine en cours
(`currentWeek()`), affiche volume/séances/charge/récupération/tendance.
Pas de sélecteur de semaine (contrairement au test Module 2) — les données
Strava/statuts n'existent que pour la semaine réelle en cours, pas de sens
à tester une semaine future.

**Bug de crash trouvé et corrigé en testant (écran blanc sur l'onglet
Stats)** : `el(tag, attrs, ...children)` (fonction DOM maison,
`index.html`) n'accepte que des enfants `string` ou de vrais `Node` — un
`children.forEach` fait `appendChild(typeof c==="string" ?
document.createTextNode(c) : c)`, donc un `number` brut (ex.
`analyseSemaine.chargeTotaleSemaine`, un `Math.round(...)`) provoque
`TypeError: Failed to execute 'appendChild' on 'Node'`. Corrigé en forçant
la conversion en chaîne (`+ ""`). Point de vigilance à généraliser : tout
affichage d'une valeur numérique brute via `el()` dans ce fichier doit
passer par une concaténation de chaîne, jamais le nombre tel quel.

**Erreur de ma part trouvée en relisant** : le wrapper utilisait
`window.__PROFIL_COUREUR__` (variable inventée, n'existe nulle part dans le
code) au lieu de la vraie variable `profilCoureur` (déclarée ligne ~710).
Sans conséquence grâce à l'optional chaining (`?.`), mais corrigé pour que
`sexe` soit réellement lu depuis le profil plutôt que de toujours retomber
sur `'autre'`.

### 30.5 Chantier complémentaire : charge PRÉVUE par séance (même session)

`recuperationEstimee` restait bloqué à sa valeur neutre (50) tant
qu'aucune notion de "charge prévue" n'existait dans l'app — seul le volume
(`kmEstime`) était disponible, pas une estimation pondérée par intensité.
Décision actée avec Laurent : calculer `chargePrevue` par séance via
`coefficientIntensite(type) x dureeEstimeeMin` plutôt que reprendre
`kmEstime` tel quel comme proxy — un simple volume ne distinguerait pas une
séance de qualité d'une EF de même distance, alors que `chargeTotaleSemaine`
(réalisée) fait déjà cette distinction via TRIMP/sRPE. Sans pondération
côté prévu, `recuperationEstimee` comparerait des choses non comparables.

**Coefficients retenus** (base 1.0 = EF, référence) : `EF: 1.0`,
`LONGUE: 1.15`, `VMA: 1.5`, `SEUIL: 1.45`, `SPEC: 1.5`, `TEST: 1.4`,
`REPOS: 0`. Calibrés à dire d'expert (pas de données réelles pour les
calibrer autrement à ce stade) — même limite déjà assumée pour la
constante de normalisation TRIMP/sRPE du Module 1 (§5.1 doc archi), à
ajuster une fois croisés avec l'historique réel de Laurent.

`dureeEstimeeMin` : à défaut d'une vraie durée prévue par séance (le
générateur ne produit que `kmEstime`), estimée depuis `kmEstime` via
l'allure EF de référence (6.33 min/km) — même repli que
`weekStats()`/`EF_PACE` dans `index.html`, pour rester cohérent avec
l'estimation déjà utilisée ailleurs plutôt que d'inventer une deuxième
conversion km→min incompatible.

Nouvelle fonction `calculerChargePrevueSeance(seancePrevue)` dans le module,
exposée pour tests unitaires. `analyser()` calcule désormais
`chargePrevueSemaine` en sommant cette fonction sur `seancesPrevues` si
`planSemaine.chargePrevue` n'est pas explicitement fourni par l'appelant
(rétrocompatible avec un futur calcul différent côté appelant).
`recuperationEstimee` n'est donc plus bloqué à 50 dans l'usage réel de
l'app.

### 30.6 Non testé en conditions réelles au-delà du bloc de test manuel

Le Module 3 n'est pour l'instant appelé que par le bloc "🧪 Test Module 3"
de l'onglet Stats — aucun branchement dans `EngineInput` (Module 5/
RuleEngine) ni dans une future règle qui en dépendrait. Modules 4
(TrendAnalyzer) toujours non codé, cf. §26 (limite déjà documentée).

### 30.7 Fichiers modifiés/créés

Créé : `public/engine-classic-scripts/decision-engine-week-analysis.classic.js`.

Modifié : `public/index.html` (chargement du script, wrapper
`analyserSemaineActuelle()`, bloc de test Stats, 2 corrections de bugs
trouvés en testant).

### 30.8 Vérification en conditions réelles sur données Laurent (17/07/2026, même session)

Testé sur la semaine 2 réelle de Laurent (4 séances passées : EF 7km, VMA
5×30-30s, EF récup 5.5km, SEUIL 3×6min) : `recuperationEstimee` affichait
75/100. Laurent a remarqué, à raison, que ça semblait bas alors qu'il avait
suivi le plan tel que prévu.

**Investigation par calcul manuel** (charge prévue vs charge réalisée sur
les 4 vraies séances, via console navigateur) : les **durées** en minutes
sont quasi identiques (159 min prévu vs 162 min réel, écart de 3 min
seulement) — le volume n'est pas en cause. Mais la **charge TRIMP réalisée**
(calculée sur FC réelle, ~271) dépasse largement la **charge prévue
forfaitaire** (coefficient × durée, ~195) — ratio 1.39, d'où le score à 75
plutôt que ~100.

**Cause identifiée** : limite structurelle de l'approche
"coefficient × durée" pour estimer une charge PRÉVUE. Le TRIMP réel est
exponentiel selon la réserve FC (`a × exp(b × fcReserve)`, cf. §5.1 doc
archi) — un coefficient fixe par type de séance ne peut pas capturer cette
non-linéarité, et sous-estime structurellement la charge des séances
intenses (VMA/SEUIL) par rapport à ce qu'un vrai TRIMP donnerait sur FC
réelle. Aucune FC prévisionnelle n'existe pour une séance qui n'a pas
encore eu lieu, donc un vrai TRIMP prévisionnel est structurellement
impossible à calculer à l'avance — l'approximation par coefficient reste la
seule option disponible.

**Décision actée avec Laurent** : ne pas sur-calibrer les coefficients sur
ce seul échantillon (un point de données n'est pas "plus de données",
risque de sur-corriger dans l'autre sens sur une semaine différente).
Coefficients laissés inchangés pour l'instant (§30.5) — à revisiter une
fois plusieurs semaines de données réelles accumulées, idéalement avec des
mix qualité/EF variés.

**Limite à garder en tête** : `recuperationEstimee` sera structurellement
optimiste (score élevé signifiant faussement "beaucoup de récupération
disponible") sur toute semaine contenant des séances de qualité, tant que
les coefficients n'auront pas été recalibrés sur un échantillon plus large.

### 30.9 Bug distinct trouvé en creusant : `weeklyReport()` sous-comptait `plannedMin`

En creusant le désaccord, Laurent a remarqué que le "Bilan semaine"
(§29.7, bloc `bilanEl` réactivé plus tôt dans la même session) affichait
192 min de planifié sur la semaine — anormalement bas pour 6 séances dont 2
de qualité. Fausse piste pour le 75/100 (`weeklyReport()` et
`analyserSemaineActuelle()` sont deux fonctions indépendantes, qui ne
partagent aucun calcul), mais un vrai bug distinct trouvé au passage.

**Cause** : `weeklyReport()` calculait `plannedMin` en reparsant le texte
libre de chaque séance par regex (`/\d+\s*min/` sur `s.session`, `/\d+'/`
sur `s.warmup`/`s.cooldown`) — exactement le même type de bug déjà corrigé
sur `weekStats()` le 7 juillet 2026 (cf. §7bis/7quater : "l'ancien parsing
par regex ne gérait pas les formats N×Xmin, sous-comptant fortement les
séances qualité"), mais jamais appliqué à `weeklyReport()`. Sur le format
`"5×30s-30s"` (secondes, pas minutes) d'une séance VMA, la regex ne matche
strictement rien — la séance entière (30 min réelles) contribuait 0 minute
au total.

**Corrigé** : `weeklyReport()` utilise désormais `kmEstime × EF_PACE`
(6.33 min/km), exactement le même calcul que `weekStats()` — plus de
reparsing de texte libre. Sur la semaine 2 de Laurent, `plannedMin` passe
de 192 min (sous-compté) à 269 min (cohérent avec le volume réel du plan).

**Fichier modifié** : `public/index.html` uniquement.

### 30.10 Test manuel (non codé) : fenêtre glissante 7j vs semaine calendaire

Laurent a demandé si le Module 3 ne devrait pas raisonner en fenêtre
glissante de 7 jours plutôt qu'en semaine calendaire du plan (lundi-
dimanche) — l'ACWR existant (`calculerACWR()`) utilise déjà ce principe
pour charge aiguë/chronique, contrairement au Module 3.

**Décision de fond avant tout test** : le contrat `WeekAnalyzer` (doc
archi) est explicitement pensé comme "semaine N du plan" (`semaine:
number` en sortie, alignée sur les phases développement/spécifique/
affûtage) — passer en fenêtre glissante casserait cet alignement et
`progressionVsPrecedente` (comparaison semaine N vs N-1 du plan). Demande
traitée comme un test ponctuel de comparaison, pas un chantier de
modification.

**Test effectué** (calcul manuel, aucun code modifié) : sur les 7 derniers
jours réels de Laurent (11 au 17/07/2026, chevauchant les semaines 1 et 2
du plan, 6 séances) :

| | Semaine calendaire (4 séances) | Fenêtre glissante 7j (6 séances) |
|---|---|---|
| Charge réalisée | ~271 | ~451 |
| Charge prévue | ~195.5 | ~309 |
| Ratio | 1.39 | 1.46 |
| Score récupération | 75 | 77 |

**Conclusion** : le score reste quasi identique entre les deux approches
(75 vs 77) — la fenêtre glissante ne corrige pas la limite de calibration
identifiée en §30.8 (coefficients d'intensité trop bas vs charge TRIMP
réelle sur séances de qualité). Le problème est bien la calibration des
coefficients, pas le découpage temporel. Confirme la décision déjà actée en
§30.8 : pas de changement de code pour l'instant, ni sur les coefficients
ni sur le découpage semaine calendaire/fenêtre glissante.

## 31. Moteur de décision — Module 4 (TrendAnalyzer) livré (17/07/2026, même session)

### 31.1 Décision de conception

Contrat théorique (`analyser(historiqueSemaines: WeekAnalysis[],
fenetreSemaines: number)`) a un vide identique à celui déjà comblé pour le
Module 3 : `pointsDeSuivi[].fatigue` vient de `RunnerState` (Module 1), pas
de `WeekAnalysis` (Module 3), et la signature théorique ne prévoit aucun
moyen de le fournir. Comblé avec un paramètre séparé
`historiqueRunnerStates: RunnerState[]`, aligné par INDEX avec
`historiqueSemaines[]` (même semaine, même position, même ordre
chronologique) — jamais fusionné dans `WeekAnalysis` lui-même. Mêmes
raisons que pour le Module 3 (§30.1) : cohérence avec le pattern déjà
choisi, `WeekAnalysis` reste un contrat stable utilisé ailleurs
(`EngineInput.weekAnalysis`).

Fonction pure, aucune dépendance à un autre script du moteur — même
philosophie que les Modules 1/2/3/5.

### 31.2 Fichier créé : `decision-engine-trend-analysis.classic.js`

Expose `DecisionEngineTrendAnalysis.analyserAvecEtatCoureur(historiqueSemaines,
historiqueRunnerStates, fenetreSemaines)` (fonction à utiliser en pratique)
et `analyser(historiqueSemaines, fenetreSemaines)` (version dégradée sans
`RunnerState`, conforme à la signature théorique stricte, `fatigue` toujours
`null` dans ce cas — cf. §4 doc archi, principe de dégradation propre).

5 détecteurs de signaux, conformes au tableau du doc archi :
`3_SEMAINES_REUSSIES` (taux de réussite ≥90% sur 3 semaines),
`CHARGE_CROISSANTE_RAPIDE` (hausse >15% sur 2 transitions consécutives),
`SEANCES_MANQUEES_REPETEES` (≥2 semaines sur 3 avec ≥2 séances manquées),
`FATIGUE_CROISSANTE` (croissance stricte sur 3 points), `STAGNATION_VOLUME`
(volume quasi stable ±5% sur 4+ semaines). Chaque détecteur est une
fonction indépendante et testable isolément, exposée sur
`DecisionEngineTrendAnalysis` (cf. doc archi : "règles de détection simples
et nommées, elles-mêmes testables indépendamment").

`tendanceGenerale` déduite par table de règles simple
(`deduireTendanceGenerale`) : priorité aux signaux négatifs
(fatigue/charge) sur les positifs en cas de conflit — cohérent avec le
principe "sécurité avant performance" déjà appliqué au Module 5 (cf. §26
inventaire).

Testé unitairement sur 2 scénarios simulés (progression avec charge en
hausse contrôlée, dégradation avec fatigue croissante + séances manquées)
avant intégration — comportement conforme dans les deux cas.

### 31.3 Chargé dans `index.html`, wrapper `analyserTendance()`

Script chargé après le Module 3 (avant Module 5/RuleEngine). Wrapper
`analyserTendance(fenetreSemaines)` : boucle sur les semaines déjà
commencées du plan (semaine courante incluse, futures exclues), chaîne les
appels à `analyserSemaineActuelle()` (Module 3, `semainePrecedente`
correctement propagée sur toute la fenêtre) pour construire
`historiqueSemaines[]`, et appelle
`DecisionEngineRunnerState.calculerRunnerState()` avec `dateReference` calée
sur le dernier jour de chaque semaine pour construire
`historiqueRunnerStates[]` en parallèle, aligné par index.

Retourne `null` si moins de 3 semaines exploitables (tous les détecteurs
ont un minimum de 3 semaines).

**Bloc de test ajouté** dans l'onglet Stats, même pattern que les tests
Modules 2/3 : fenêtre fixe à 6 semaines (pas de sélecteur — cohérent avec
les autres blocs de test). Affiche tendance générale, signaux détectés,
points de suivi (fatigue/volume/taux de réussite par semaine).

**Vérifié sur les données réelles de Laurent** (2 semaines de plan actuel
au moment du test) : message "pas assez de semaines exploitables (minimum
3)" affiché proprement, sans crash — comportement attendu, pas encore
assez d'historique.

### 31.4 Bug annexe corrigé au passage : `fcRepos` en dur dans le Module 3

En préparant l'intégration du Module 4, découvert que le wrapper
`analyserSemaineActuelle()` (Module 3, §30) utilisait encore
`fcRepos = 55` en dur, alors que `profilCoureur.fcRepos` existe réellement
(champ Paramètres ajouté le même jour, §11.7 point 4, lu par
`optionsRunnerStateActuel()` utilisée ailleurs dans l'app pour l'ACWR).
Erreur de ma part lors du codage initial du Module 3, basée sur une mémoire
de session qui ne reflétait plus l'état réel du code au moment où je l'ai
écrit. Corrigé : `analyserSemaineActuelle()` utilise désormais
`optionsRunnerStateActuel()`, même source que le reste du moteur (ACWR,
RunnerState) — plus de duplication de la logique de repli fcMax/fcRepos/sexe.

### 31.5 Vérification incidente : champs profil `fcRepos` et `sexe` déjà tous les deux fonctionnels

En cherchant à combler "les champs profil manquants (fcRepos, sexe)"
identifiés dans une mémoire de session antérieure comme non codés, vérifié
que les **deux champs sont en réalité déjà entièrement implémentés** :
saisie dans Paramètres (`profileSection` pour FC repos, `sexeSection`
dédiée avec 3 boutons Homme/Femme/Autre pour sexe), sauvegarde
(`sauvegarderProfilCoureur()`), et lecture par le moteur via
`optionsRunnerStateActuel()`. Les deux sections sont bien montées dans le
DOM (`profileSection, niveauSection, sexeSection, recordsSection...`), pas
du code mort comme le "Bilan semaine" l'était (§29.7).

Aucun code à écrire — mémoire de session obsolète, chantier déjà réalisé
lors d'une session antérieure non entièrement reflétée dans le contexte de
mémoire disponible en début de cette session. Aucune modification de
fichier pour ce point.

## 32. Moteur de décision — weekAnalysis/trendAnalysis branchés dans l'input du RuleEngine (17/07/2026, même session)

### 32.1 Décision explicite de Laurent

Brancher uniquement les données (`weekAnalysis`, `trendAnalysis`) dans
l'objet passé à `DecisionEngineRules.evaluerRegles()` — **aucune nouvelle
règle créée** pour les consommer. Décision volontaire : les Modules 3/4
restent disponibles pour une future règle sans attendre qu'elle soit
conçue maintenant.

### 32.2 État réel du RuleEngine avant ce branchement

Vérifié que le vrai catalogue de règles implémenté (6 règles :
`evaluerPicDeSeance`, `evaluerFatigueElevee`, `evaluerACWRElevee`,
`evaluerTendanceFatigue`, `evaluerSeancesManqueesConsecutives`,
`evaluerDesengagementPrecoce`) prend un objet `input` différent du contrat
théorique `EngineInput` du doc archi — `runnerState`/`engagementState`/
`activitySamples`/`coureurOptions`/`seancesPlanifieesManquees`, sans
`weekAnalysis`/`trendAnalysis`/`goalFeasibility`/`sessionAnalysis`. Le
catalogue a grandi (R-060 tendance fatigue, R-070 séances manquées
consécutives) depuis les 3 règles de démarrage notées dans une mémoire de
session antérieure — cohérent avec le premier vrai déclenchement observé
en conditions réelles pendant cette session (R-060, cf. §31.3 note
adjacente sur la tendance fatigue vue par Laurent).

`evaluerRegles()` n'itère jamais génériquement sur les clés de son objet
`input` — confirmé avant modification, donc ajouter des champs
supplémentaires ne peut rien casser dans les règles existantes.

### 32.3 Modification

`calculerEtatMoteurDecision()` (`index.html`, fonction centrale déjà
partagée entre la carte de proposition et le prompt du coach IA, cf. §9.1
doc intégration) calcule désormais `weekAnalysis` (via
`analyserSemaineActuelle(currentWeek())`) et `trendAnalysis` (via
`analyserTendance(6)`), et les ajoute à l'objet transmis à
`evaluerRegles()`. Les deux peuvent être `null` (pas assez de semaines,
script non chargé) sans casser le calcul — même principe que
`sessionAnalysis` optionnel dans le contrat théorique `EngineInput`.

Point de vigilance vérifié avant modification : `analyserSemaineActuelle`/
`analyserTendance`/`currentWeek` sont déclarées plus bas dans le fichier
que `calculerEtatMoteurDecision` — sans conséquence grâce au hoisting
standard des déclarations `function` en JavaScript (accessibles dans toute
la portée du script dès son exécution, indépendamment de l'ordre
d'écriture), tant que `calculerEtatMoteurDecision()` n'est appelée qu'après
le chargement complet du script (déjà le cas : appelée en réaction à un
rendu/événement, jamais immédiatement).

**Fichier modifié** : `public/index.html` uniquement.

### 32.4 Reste à faire (non commencé)

Aucune règle du Module 5 ne consomme `weekAnalysis`/`trendAnalysis` à ce
jour — les données sont disponibles mais inertes tant qu'une nouvelle règle
n'est pas conçue et codée pour s'appuyer dessus (ex. une règle qui réagirait
à `SignalTendance` type `FATIGUE_CROISSANTE` ou `CHARGE_CROISSANTE_RAPIDE`
du Module 4, ou à `ecartVolumePourcent`/`seancesManquees` du Module 3).

## 33. Chantier RPE unifié (17/07/2026, même session)

### 33.1 Remarque de Laurent : le RPE était invisible pour la plupart des séances

Laurent a fait remarquer que le RPE n'était demandé que dans le formulaire
de saisie manuelle d'allure (`renderStatusRow`, cas "pas de Strava ou
correction manuelle") — jamais pour une séance validée normalement (Strava
trouvé, simple clic ✅/⚠️/❌), qui représente la grande majorité des
séances en pratique.

### 33.2 Bug trouvé en creusant : `sessionNotes[uid+'_rpe']` n'a jamais existé

En cherchant à corriger ça, découverte que les wrappers Module 1
(`calculerEtatMoteurDecision`/`obtenirRatioACWRActuel`/
`obtenirHistoriqueACWR`) et les wrappers Modules 2/3 codés plus tôt dans
cette même session lisaient tous `sessionNotes[uid + '_rpe']` — une clé
**qui n'a jamais été écrite nulle part dans le code**. Erreur de ma part :
j'avais halluciné cette clé en pensant qu'elle existait, sans vérifier. Le
vrai stockage du RPE était `manualPerf[uid].rpe`, une clé différente,
elle-même limitée au formulaire de saisie manuelle (cf. §33.1). Résultat
avant correction : `ressentiRPE` était toujours `undefined` en pratique,
peu importe ce que le coureur avait saisi.

### 33.3 Décisions actées avec Laurent

1. **Nouvelle clé unifiée `sessionRpe[uid]`** (stockage `lk_session_rpe`)
   — remplace les deux clés incohérentes. `manualPerf[uid].rpe` reste lu en
   repli pour compat ascendante (anciennes saisies), mais n'est plus jamais
   écrit par le nouveau sélecteur.
2. **RPE remonté au niveau du statut** : sélecteur ajouté directement dans
   `renderStatusRow()`, visible dès qu'un statut réel (✅/⚠️/❌) est posé —
   pas seulement en saisie manuelle. Repos (`😴`) et non renseigné (`—`)
   exclus (noter un ressenti n'a pas de sens sur ces deux cas).
3. **Échelle repensée : 5 niveaux plutôt que 3 ou 10**. Le contrat théorique
   du moteur attend une échelle CR-10 de Borg (`SeanceRealisee.ressentiRPE:
   number; // 1-10`, doc archi §3.1) — mais demander à un coureur amateur
   de noter précisément sur 10 est peu fiable en pratique (la littérature
   citée dans le doc archi §5.2 note elle-même une validité/fiabilité
   moindre chez les sujets non entraînés sans les ancrages verbaux précis
   de l'échelle CR-10 originale). L'ancien sélecteur à 3 niveaux (saisie
   manuelle seule) était à l'inverse trop grossier — ne distinguait pas
   "modérément dur" de "très dur". Compromis retenu : `RPE_OPTIONS`, 5
   niveaux visuels simples (🙂 Facile=2, 😐 Modéré=4, 😓 Difficile=6, 😣
   Très difficile=8, 🥵 Maximal=10), mappés directement sur l'échelle CR-10
   pour le calcul — le coureur ne voit jamais le chiffre lui-même, jamais
   de conversion approximative a posteriori.
4. **Le Module 1 (fatigue/ACWR, affiché partout dans l'app) doit aussi
   bénéficier du RPE**, pas seulement les Modules 2/3 — décision prise
   après réflexion sur la cohérence : sans ça, deux modules du même moteur
   auraient regardé des signaux différents pour la même séance.
5. **Pondération TRIMP par RPE plutôt que remplacement** : quand une FC est
   disponible, un RPE élevé amplifie légèrement le TRIMP calculé (jamais ne
   le remplace, jamais ne l'abaisse) — les deux échelles (TRIMP et sRPE) ne
   sont pas dans la même unité, les mélanger directement serait une erreur
   (cf. §5.1 doc archi).

### 33.4 Implémentation

**`index.html`** :
- `sessionRpe` déclarée (`load(clePourPlan("lk_session_rpe"), {})`), juste
  après `sessionNotes`.
- `RPE_OPTIONS` (constante partagée, 5 niveaux → valeurs CR-10 2/4/6/8/10),
  déclarée juste après `SOPTS`/`SCOLORS`.
- Sélecteur RPE ajouté dans `renderStatusRow()` (nouveau bloc, visible si
  statut ∈ {✅,⚠️,❌}) et dans le formulaire de saisie manuelle (migré de
  l'ancien `rpeOpts` à 3 niveaux vers `RPE_OPTIONS`, écrit désormais dans
  `sessionRpe` au lieu de `manualPerf[uid].rpe`).
- `adapterHistoriqueAvecRpe(stravaActivitiesListe, provenanceDeclaree)` —
  nouvelle fonction : reproduit la boucle de
  `DecisionEngineAdapter.adapterHistoriqueComplet()` mais fait la
  correspondance date d'activité → uid de séance du plan (via
  `ALL_SESSIONS`) → RPE (`sessionRpe` puis repli `manualPerf`) avant
  d'appeler `adapterActiviteStrava()` directement avec ce RPE. Choix
  d'implémentation suivant la recommandation discutée avec Laurent :
  modifier l'appelant plutôt que
  `DecisionEngineAdapter.adapterHistoriqueComplet()` elle-même — cette
  dernière ne peut structurellement pas faire cette correspondance (elle ne
  reçoit que des activités Strava brutes, sans notion de séance du plan),
  et son principe ("ne jamais inventer une correspondance sans qu'on la lui
  donne explicitement") reste respecté.
- `obtenirRatioACWRActuel()`, `obtenirHistoriqueACWR()`,
  `calculerEtatMoteurDecision()` : les 3 appelants de
  `adapterHistoriqueComplet()` identifiés dans le code, tous remplacés par
  `adapterHistoriqueAvecRpe()`.
- Deux wrappers corrigés pour lire `sessionRpe[uid]` (avec repli
  `manualPerf[uid].rpe`) au lieu de la clé fantôme
  `sessionNotes[uid+'_rpe']` : `analyserSemaineActuelle()` (Module 3, §30)
  et `analyserSeanceQualite()` (Module 2, §27 — celui-ci avait le même bug
  latent, présent avant même cette session).

**`decision-engine-runner-state.classic.js`** (Module 1) et
**`decision-engine-week-analysis.classic.js`** (Module 3) : ajout de
`SEUIL_RPE_AMPLIFICATION = 8` et `FACTEUR_AMPLIFICATION_RPE_ELEVE = 1.12`
(dupliquées dans les deux fichiers, cohérent avec le principe déjà établi
qu'aucun module du moteur ne dépend d'un autre script du moteur). Dans
`calculerChargeSeance()`/`calculerChargeSeanceRealisee()`, quand le TRIMP
est calculé (FC disponible) et que `ressentiRPE >= 8`, la charge finale est
multipliée par 1.12. Aucun effet si RPE absent ou < 8. Valeurs choisies à
dire d'expert, même limite déjà assumée pour les coefficients d'intensité
du Module 3 (§30.5/§30.8) — à recalibrer une fois croisées avec plus de
données réelles.

**Testé** : `calculerChargeSeance()` avec FC identique, RPE 4 (sous seuil,
aucun effet) vs RPE 9 (au-dessus, ×1.120 exactement) — comportement
conforme.

### 33.5 Fichiers modifiés

`public/index.html`,
`public/engine-classic-scripts/decision-engine-runner-state.classic.js`,
`public/engine-classic-scripts/decision-engine-week-analysis.classic.js`.
Aucun fichier `.classic.js` équivalent pour la partie UI d'`index.html`
(dashboard v1 uniquement).

### 33.6 Suite immédiate : suppression du doublon + agrandissement des boutons

**Remarque de Laurent après le chantier initial** : le RPE apparaissait
encore dans le formulaire de saisie manuelle d'allure — doublon avec le
nouveau sélecteur de `renderStatusRow()` (§33.4). Demande également
d'agrandir les boutons de statut (`SOPTS`, `—✅❌⚠️😴`) et RPE
(`RPE_OPTIONS`) pour qu'ils prennent toute la largeur de ligne.

**Doublon supprimé** : le bloc RPE du formulaire de saisie manuelle
(déclaration `rpeVal`/`rpeRow`/`rebuildRpe`, insertion dans `formWrap`,
écriture dans `sessionRpe` au clic) entièrement retiré. Le ressenti se
saisit désormais à un seul endroit : `renderStatusRow()`, quel que soit
comment la séance a été validée (Strava trouvé ou saisie manuelle).

**Boutons agrandis** : `SOPTS` et `RPE_OPTIONS` passent de
`padding:"5px 10px"`/`fontSize:"15px"` (ou `"4px 8px"`/`"15px"` pour RPE) à
`flex:"1"`, `padding:"10px 0"`, `fontSize:"18px"`, `borderRadius:"8px"` —
chaque bouton occupe une part égale de la largeur disponible plutôt qu'une
taille fixe. Nécessite une restructuration de `renderStatusRow()` : la
fonction retournait un seul `<div>` flex-row contenant boutons de statut +
message "séance à venir" + bloc RPE, tous enfants du même conteneur
`nowrap` — avec `flex:1` sur les boutons, un enfant `width:100%` au milieu
(le message futur ou le bloc RPE) aurait cassé la mise en page. Corrigé :
`wrapper` (colonne verticale) contient désormais `statusRow` (ligne des 5
boutons statut, `nowrap`) puis, empilés en dessous, le message futur
éventuel et le bloc RPE éventuel (lui-même : label + ligne de 5 boutons
`nowrap`). Les deux appelants de `renderStatusRow()` (`uid2` dans la carte
du jour, `statusRow` dans le détail de semaine) traitent la valeur de
retour comme un simple bloc à insérer — aucun ne manipule sa structure
interne, changement de forme sans impact sur eux.

### 33.7 Non vérifié visuellement — bloqué par le quota de déploiement Vercel

Poussé sur GitHub (vérifié présent dans le code source réel via
`raw.githubusercontent.com`), mais **jamais confirmé visuellement** :
Laurent rapporte "aucun changement sur la taille des boutons" après un
rafraîchissement forcé. Diagnostic en cours au moment de la pause :
- Code source confirmé correct sur GitHub (`flex:"1"` bien présent).
- Aucun style CSS global (`button {...}`) trouvé dans `index.html` qui
  pourrait écraser le style inline.
- Tentative de vérifier la version réellement servie par Vercel
  (`fetch('/index.html')` depuis la console) — non aboutie : en essayant de
  forcer un nouveau déploiement pour éliminer l'hypothèse d'un déploiement
  qui n'a pas suivi le dernier push, Laurent a atteint le **quota Vercel de
  déploiements gratuits** (`api-deployments-free-per-day`, "more than 100"
  en une journée — cohérent avec le volume de push de cette session
  particulièrement chargée).
- **Diagnostic suspendu** : impossible de forcer un nouveau déploiement
  avant reset du quota (~24h). Le code source reste correct dans le repo ;
  reste à confirmer si le prochain déploiement (automatique ou forcé une
  fois le quota reset) résout l'affichage, ou si un vrai bug plus profond
  existe (à investiguer alors avec les outils navigateur : `getComputedStyle`
  sur un vrai bouton, comparaison avant/après un déploiement confirmé à
  jour).

**Prochaine étape** : vérifier l'affichage une fois un nouveau déploiement
confirmé passé (attendre le reset du quota, ou un déploiement automatique
déclenché par un futur push).

## 34. Saisie manuelle : bouton Annuler, durée totale réelle, exclusion Strava (17/07/2026, session ultérieure)

Session de planification (pas de code au départ, quota Vercel dépassé),
finalement débloquée en cours de session (quota reset) — 3 chantiers livrés
et poussés sur `main`, tous dans `public/index.html` uniquement.

### 34.1 Bouton "✕ Annuler" (`renderManualPerfRow`)

Remplace l'ancien bouton 🗑️ (visible seulement si `hasManualNow()`) par un
bouton **toujours visible**, avec un comportement plus large que la simple
suppression :
- Supprime `manualPerf[uid]`
- **Décoche aussi le statut de la séance** (`delete statuses[uid]`) —
  demande explicite de Laurent : après suppression d'une saisie manuelle,
  le statut ✅/⚠️/❌ ne doit pas référencer une donnée qui vient d'être
  effacée
- `render()` immédiat pour refléter le statut décoché
- Relance `syncStrava()` pour retrouver l'activité Strava du jour si elle
  existe — décision actée : si Strava n'a toujours rien ce jour-là (pas
  encore synchronisé, ou vraiment aucune activité), la séance reste
  volontairement à `—`, au coureur de décider quoi faire ensuite plutôt que
  de forcer une resaisie immédiate.

### 34.2 Durée totale réelle → distance dérivée pour séances de qualité

**Problème identifié** : `distanceEffortStructure()` (existant) ne calcule
que la distance des blocs d'effort structurés — échauffement, récup entre
répétitions et retour au calme totalement absents du volume d'une séance
qualité saisie manuellement. Sous-estimation systématique du volume réel,
avec impact direct sur charge/TRIMP/ACWR pour toute séance qualité saisie
manuellement.

**Solution retenue et validée sur une vraie donnée** : nouveau champ
**durée totale de la séance (min)**, saisi par le coureur (pas dérivé du
plan), visible uniquement pour les séances structurées. Nouvelle fonction
`distanceTotaleAvecRecup(structureIntervalles, dureeTotaleSec, allureEFStr)` :
- Distance des blocs d'effort : allure du bloc (comme l'existant)
- Distance de la récup entre répétitions : **allure EF du coureur**
  (`window.__PLAN_BRUT__.allures.E`) — décision explicite de Laurent
  (auparavant la récup n'était comptée nulle part)
- Distance du reste du temps saisi (échauffement + retour au calme) :
  également à l'allure EF

**Test de validation** (avant codage, sur la vraie séance VMA du coureur du
15/07/2026, "VMA 5×30-30") : durée réelle Strava 1858s, distance réelle
Strava 5202.4m. Calcul avec la méthode retenue (allure EF `6:10/km` du
plan) : 581m (effort) + 324m (récup) + 4292m (reste) = **5197m**, écart de
**5m** avec la réalité. Validé avant implémentation.

Repli propre si le champ durée est laissé vide : ancien comportement
(`distanceEffortStructure`, blocs d'effort seuls) — non-régression pour
qui n'utilise pas le nouveau champ.

`manualPerf[uid]` gagne un nouveau champ `dureeSaisieMin`, pré-rempli à la
durée prévue au plan (échauffement+effort+récup+RAC) comme point de départ
ajustable, cohérent avec le principe déjà appliqué à l'allure.

### 34.3 Exclusion Strava quand une saisie manuelle existe

**Décision de Laurent, plus large que "la saisie manuelle prime"** (formule
de l'ancien commentaire du code, doc intégration §3.1) : une vraie
**exclusion**, pas une simple priorité — Strava ne doit plus être visible
ni utilisé nulle part pour une séance ayant une saisie manuelle, ni dans
l'UI ni dans le moteur de décision. Motivation : une saisie manuelle
signale souvent que la donnée Strava du jour est corrompue ou absente.

**Nouvelle fonction centrale** `getStravaRunSiPasManuel(date, uid, activites?)`
— point d'entrée unique pour chercher l'activité Strava d'une séance par
date, retourne `null` si `manualPerf[uid]` existe. Remplace 5 sites
identifiés dans le code qui faisaient chacun leur propre
`stravaActivities.find(...)` par date sans jamais vérifier `manualPerf` :
1. `todayStravaRun` (résumé du jour, dashboard)
2. `stravaRun2` (carte du jour)
3. `stravaRun` (détail semaine)
4. `run` (courbes IE/cadence, onglet Stats)
5. `strava` (export PDF)

**Côté moteur de décision** (`adapterHistoriqueAvecRpe()`, point d'entrée
unique déjà partagé par Modules 1/2/3 et le coach IA, cf. §26.1/§26.2) :
même exclusion appliquée à la liste d'activités transmise au moteur — mais
avec un point de vigilance supplémentaire identifié en codant : **exclure
Strava sans rien remettre à la place ferait disparaître la séance
entièrement du moteur**, pas seulement "moins précise". Corrigé : chaque
`manualPerf[uid]` est désormais reconstruit en objet Strava-like
synthétique (distance, `moving_time` dérivé de `dureeSaisieMin` ou
distance/allure en repli, `average_heartrate`, `provenance: 'manuel'`) et
repassé par le même `DecisionEngineAdapter.adapterActiviteStrava()` que les
vraies activités Strava — pas de duplication de la logique de conversion,
juste une source d'entrée différente.

**Fichier modifié** : `public/index.html` uniquement — le moteur
(`decision-engine-*.classic.js`) n'a pas eu besoin d'être touché, toute la
logique d'exclusion/substitution vit dans l'adaptateur côté `index.html`
qui appelle le moteur, pas dans le moteur lui-même.

### 34.4 Non vérifié visuellement à ce jour

Poussé sur `main` (2 commits : bouton Annuler seul, puis durée+exclusion
Strava ensemble), syntaxe validée (`node --check`) avant chaque push, mais
**aucun des 3 chantiers n'a encore été confirmé visuellement** par Laurent
en conditions réelles — session terminée juste après le second push.

**Prochaine étape** : vérifier une fois le déploiement Vercel confirmé
passé :
1. Bouton Annuler supprime bien la saisie + décoche le statut + relance la
   synchro
2. Champ durée totale apparaît bien sur une séance qualité, distance
   dérivée cohérente
3. Une activité Strava n'apparaît plus nulle part (UI + coach IA + ACWR
   affiché) si une saisie manuelle existe pour ce jour

## 35. R-062 (fatigue installée, Module 4) + fix coach IA sur les 4 statuts de séance (17-18/07/2026, session ultérieure)

Suite directe de la session §34 (même conversation, poursuivie). Deux
chantiers distincts : une nouvelle règle du moteur de décision, puis un
bug utilisateur trouvé en observant le résultat du premier chantier.

### 35.1 R-062 — Fatigue installée sur plusieurs semaines

Décision reprise du point en suspens depuis §26 ("concevoir une règle
exploitant `weekAnalysis`/`trendAnalysis`, livrés mais inertes"). Choix
tranché avec Laurent : démarrer par `TrendAnalysis` plutôt que
`WeekAnalysis` (moins redondant avec l'existant), sur le signal
`FATIGUE_CROISSANTE` (déjà calculé par le Module 4, 3 points de suivi
hebdomadaires) plutôt qu'un nouveau signal à inventer.

**Constat en relisant le Module 4** (`decision-engine-trend-analysis.classic.js`) :
plus riche que documenté en mémoire — 5 signaux déjà détectés et testés
(`FATIGUE_CROISSANTE`, `CHARGE_CROISSANTE_RAPIDE`, `SEANCES_MANQUEES_REPETEES`,
`3_SEMAINES_REUSSIES`, `STAGNATION_VOLUME`), avec `tendanceGenerale` déjà
déduite par une table de priorité (fatigue > baisse de forme > progression
> stagnation). Seul le RuleEngine n'en consommait rien.

**Distinction posée avec R-060 existante** (qui regarde les 7 derniers
jours, J/J-4/J-7) : R-060 est réactive à court terme et se redéclenche
chaque semaine sans mémoire du passé. R-062 capte la **persistance** d'une
fatigue qui ne redescend jamais sur 3 semaines — le vrai trou identifié :
rien n'ajustait la trajectoire de fond quand la fatigue reste élevée
plusieurs semaines de suite.

**Nouvelle règle R-062** (`decision-engine-rules.classic.js`,
`evaluerFatigueInstalleeTendance()`) :
- Priorité **82** — sous R-050 (ACWR élevé, 85 : un ratio déjà critique
  reste plus urgent et actionnable dans l'instant), au-dessus de R-060 (80)
- Décision explicite : les deux règles "fatigue" ne doivent jamais
  s'afficher simultanément (confusion pour le coureur) — R-062 éclipse
  R-060 naturellement via le tri "une seule règle gagnante" déjà en place
  dans `evaluerRegles()`, sans logique de fusion à ajouter
- Type `alerter_tendance_fatigue` — **informative uniquement**, pas
  d'action sur le plan (`reduire_charge`) : décision de démarrer
  prudemment, observer en conditions réelles avant d'envisager un
  `adapter_plan`, cohérent avec la même prudence déjà appliquée à R-070
- Consomme `trendAnalysis.signauxDetectes` — **aucune modification
  nécessaire côté `index.html`** pour le câblage : `trendAnalysis` était
  déjà transmis à `evaluerRegles()` depuis le 17/07 (branché "à vide",
  §32/§34), seul le commentaire explicatif a été mis à jour pour refléter
  qu'une règle le consomme désormais

**Fichiers modifiés** : `decision-engine-rules.classic.js` (nouvelle
règle) + `public/index.html` (commentaire seul, pas de logique changée).
Le moteur de décision n'a pas de copie ES Modules (confirmé en listant
`public/v2/engine/` : uniquement `plan-generator.js`, `strava.js`, etc. —
aucun `decision-engine-*.js`) — pas de risque d'oubli de duplication ici.

**Non vérifié en conditions réelles** : comme R-070, cette règle n'a
jamais encore été observée se déclencher sur les données de Laurent —
signal à surveiller aux prochaines sessions.

### 35.2 Bug coach IA — statuts de séance mal interprétés par le LLM

**Découvert par Laurent en vérifiant le déploiement** : séance marquée 😴
(sautée délibérément), le coach commentait comme si elle avait été
réussie.

**Cause racine identifiée** : le prompt du coach (`fetchCoachMsg()`)
transmettait le statut de la séance de deux façons insuffisantes :
1. `sessionDone` (booléen) ne testait que `✅`/`⚠️`/`❌` — `😴` tombait
   silencieusement dans la branche "pas encore fait" du prompt, sans
   jamais informer le LLM que la séance avait été volontairement sautée
2. Même pour `✅`/`⚠️`/`❌` : le prompt transmettait l'**emoji brut**
   ("statut ✅", "statut ❌") sans jamais expliciter en toutes lettres ce
   que chaque statut signifie ni la tonalité attendue — le LLM devait
   deviner, ce qui pouvait dériver vers des félicitations inappropriées
   sur une séance ❌ ou ⚠️

Laurent a testé le fix sur 😴 (Yoria a validé "le commentaire est bon")
avant de demander de généraliser aux 3 autres statuts par le même
principe.

**Correctif** (`fetchCoachMsg()`, `public/index.html`) :
- Nouvelle variable `sessionSkipped` (statut `😴`), distincte de
  `sessionDone`
- Le prompt explicite désormais en toutes lettres, pour chacun des 4
  statuts, ce qu'il signifie et la tonalité attendue :
  - `✅` : "RÉUSSIE, tu peux féliciter et être positif"
  - `⚠️` : "PARTIELLEMENT réussie ou difficile, reste nuancé"
  - `❌` : "RATÉE ou interrompue, NE FÉLICITE JAMAIS [...] sois
    compréhensif [...] sans culpabiliser"
  - `😴` : "volontairement SAUTÉE [...] ne la félicite JAMAIS [...] Un mot
    bienveillant sur le repos ou la reprise est possible, sans
    culpabiliser"

**Angle mort identifié en marge, volontairement reporté** (décision
explicite de Laurent, "on le garde pour plus tard") : pour une séance ❌
avec des laps Strava partiels (coureur arrêté après 2 répétitions sur 5
par ex.), `getLapsAffichage()`/`todayAvgPace` calculent une allure
correcte mais **partielle**, sans que le prompt précise au LLM que ce
chiffre ne porte que sur une partie de la séance. Pas trompeur en soi
(donnée réelle), mais pourrait laisser croire à une performance complète
si le LLM la commente sans nuance. À traiter dans une session future.

**Fichier modifié** : `public/index.html` uniquement.

## 36. Monotonie de charge (Foster) + fix bug graphique FC intervalles (18/07/2026, session ultérieure)

Suite directe de la session §35 (même conversation, poursuivie). Deux
chantiers indépendants : ajout d'une nouvelle donnée calculée (monotonie),
puis correction d'un bug préexistant découvert en marge.

### 36.1 Monotonie de charge (Foster, 1998)

Reprise du point laissé en suspens en §35 ("on garde la monotonie en
tête"). Recherche de littérature effectuée avant tout codage.

**Concept vérifié** : la monotonie mesure la similarité des charges
d'entraînement jour après jour (`moyenne(TRIMP quotidien) /
écart-type(TRIMP quotidien)` sur 7 jours glissants, Foster 1998). Une
monotonie élevée n'est pas automatiquement mauvaise en soi — elle peut
venir d'un entraînement trop dur tous les jours (jamais de vrai repos,
dangereux) OU d'un entraînement trop facile tous les jours (même petit
footing systématique, inefficace). D'où le concept de "Training Strain"
(monotonie × charge totale) pour distinguer les deux cas.

**Décision de ne PAS coder de règle d'alerte, uniquement afficher** :
aucun seuil consensuel trouvé pour un coureur récréatif dans la
littérature :
- Foster original / RYPT (sport co, élite) : seuil >2.0 = "trop élevé"
- Une étude sur des traileurs (Matos et al. 2020, population plus proche
  d'un coureur récréatif) donne 0.6-0.9 comme zone de **limitation de
  performance** — sens et échelle différents, pas transposables tels
  quels
- Une revue générale sur les coureurs récréatifs confirme explicitement
  que la plupart des preuves scientifiques sur la course d'endurance
  viennent d'études mêlant athlètes récréatifs et professionnels, rendant
  le transfert direct difficile, et cite même des algorithmes de suivi
  non validés (dont TrainingPeaks) comme exemple de pratiques anecdotiques
  sans support scientifique solide

Décision actée : afficher la monotonie (comme l'ACWR déjà visible avant
d'avoir sa propre règle), sans seuil d'alerte tant qu'il n'est pas calibré
sur l'historique réel de Laurent plutôt qu'importé d'une étude qui ne le
concerne pas vraiment — même prudence méthodologique déjà appliquée à
`COEFFICIENT_INTENSITE_PAR_TYPE` (§35/WeekAnalysis).

**Validation empirique avant codage** : calcul manuel sur la vraie semaine
3 du plan de Laurent (assignment complet fourni par Laurent) → monotonie
prévue ≈ 1.72 (formule originale). Confirme que le générateur (garde-fous
#6/#7 de `plan-generator.js`, espacement des jours durs) espace bien les
séances **dures** entre elles, mais ne vise aucune cible de monotonie
globale au sens de Foster — un seul vrai jour de repos par semaine avec
des jours EF "récupération" non-nuls produit une monotonie en zone haute
de la fourchette Foster/RYPT.

**Implémentation** (`decision-engine-week-analysis.classic.js`) :
- Nouvelles fonctions `ecartType()` et `calculerMonotonie(seancesAvecDate,
  dateDebutSemaine)` — reconstruit les 7 charges journalières (jours sans
  séance comptés à 0, essentiel pour ne pas fausser l'écart-type),
  retourne `null` si <2 jours avec charge non-nulle, plafond à 10 si
  écart-type nul
- Formule ORIGINALE de Foster retenue (pas la version bornée
  moyenne/(écart-type+moyenne)) — décision explicite : sans seuil
  d'alerte à stabiliser visuellement, la formule originale reste
  comparable aux repères de la littérature
- `analyser()` retourne désormais `monotonieRealisee` et
  `monotoniePrevue` (même logique, appliquée respectivement à
  `seancesRealisees` et `seancesPrevues`)

**Câblage `index.html`** :
- `seancesPrevues` (dans `analyserSemaineActuelle()`) enrichi avec `date`
  (absent avant, jamais nécessaire pour les champs déjà consommés)
- `planContext` enrichi avec `dateDebutSemaine` (toujours
  `week.sessions[0].date`, le lundi — jamais absent même si repos, cf.
  `v1-bridge.classic.js`)
- **Point de vigilance documenté** : pour la semaine EN COURS,
  `seancesPrevues` ne contient que les jours déjà passés (même filtre que
  `ecartVolumePourcent`/`seancesManquees`) — `monotoniePrevue` sur la
  semaine en cours est donc partielle tant qu'elle n'est pas terminée, pas
  un bug mais une limite à garder en tête
- Nouvelle fonction `obtenirHistoriqueMonotonie(fenetreSemaines)` :
  réutilise la même boucle que `analyserTendance()` (chaque semaine via
  `analyserSemaineActuelle()`) plutôt que d'écrire une deuxième boucle sur
  `PLAN` — pas de duplication

**Affichage** (`renderStats()`) : nouveau bloc `monotonieEl`, juste après
l'ACWR déjà existant, même pattern visuel (graphique SVG en ligne sur 8
semaines, dernier point mis en valeur). Repères de littérature donnés
dans le texte d'accompagnement, explicitement présentés comme indicatifs
et non comme un seuil d'alerte actif dans Yoria.

**Fichiers modifiés** : `decision-engine-week-analysis.classic.js` +
`public/index.html`.

### 36.2 Bug graphique "FC intervalles par type de séance" — corrigé

Découvert par Laurent en marge du reste (graphique invisible malgré des
données). Diagnostic mené par instrumentation progressive (logs de debug
temporaires poussés puis retirés, 4 itérations) plutôt qu'en devinant —
les hypothèses initiales (clé `average_heartrate` manquante, mutation
d'objet par `economyScore()`, exception silencieuse) ont toutes été
vérifiées et écartées une à une avant de trouver la vraie cause.

**Cause racine** : ligne dans `fcCurveEl` (`renderStats()`) :
```js
const allWeeks = PLAN.flatMap(w=>w.sessions).filter(s=>s.type===type).map(s=>s.week);
```
`s.week` **n'existe pas** sur un objet séance individuel
(`week.sessions[i]` n'a que `day/date/type/warmup/session/cooldown/notes/
kmEstime/structureIntervalles`, jamais `week` lui-même) — seul l'objet
SEMAINE (`w`, avant le `.flatMap`) porte le champ `week`. Résultat :
`uniqueWeeks = [undefined]`, affiché littéralement "Sundefined" à
l'écran, positionnement X de tous les points cassé.

**Pourquoi IE/Cadence n'avaient pas ce bug** : ces deux graphiques
utilisent `ieData[type]`, construit depuis `ALL_SESSIONS` (pas
`PLAN.flatMap(w=>w.sessions)` brut) — `ALL_SESSIONS` ajoute explicitement
`week:w.week` à chaque séance via `recalculerAllSessions()`
(`{...s, week:w.week, phase:w.phase, uid:...}`). Seul le bloc `fcCurveEl`
itérait directement sur le plan brut sans repasser par cet enrichissement.

**Correctif** : `allWeeks` reconstruit en conservant l'association
séance↔semaine avant le filtre (`PLAN.flatMap(w=>w.sessions.map(s=>({s,
weekNum:w.week})))`), au lieu de perdre `w.week` dans le flatMap initial.

**Fichier modifié** : `public/index.html` uniquement. Vérifié visuellement
par Laurent après déploiement — fonctionne.

## 37. Chaîne de bugs coach IA + fix Réglages Strava (18/07/2026, session ultérieure)

Suite directe de la session §36 (même conversation). Un bug signalé par
Laurent ("le coach félicite une séance sautée") a révélé en réalité
**quatre bugs distincts et cumulatifs**, découverts un par un par
instrumentation progressive (logs de debug temporaires poussés puis
retirés à chaque étape) — chaque fix révélait le suivant plutôt que de
résoudre le problème d'un coup. Méthode volontairement itérative :
vérifier chaque hypothèse avec de vraies données avant de conclure, ne
jamais supposer qu'un fix fonctionne sans preuve en conditions réelles.

### 37.1 Bug préalable : bloc Strava des Réglages sans date de synchro

Signalé en ouverture de session, sans lien avec le reste de §37. Le bloc
Strava de la page Réglages (`"Connecté · X activités"`) n'affichait jamais
la date de dernière synchro (`lastSyncTime`), contrairement au bloc
équivalent du dashboard qui l'affiche déjà correctement (`syncAgo`/
`syncAgoStr`) — deux blocs distincts et redondants, jamais maintenus en
cohérence. Corrigé en réutilisant le même calcul dans les deux blocs.
**Fichier modifié** : `public/index.html`.

### 37.2 Bug n°1 (partiel) — description du statut pas assez explicite pour le LLM

Premier correctif tenté : la partie du prompt qui décrit factuellement le
statut de la séance (`sessionDone ? ... : sessionSkipped ? ... : ...`)
transmettait un simple emoji brut ("statut ✅", "statut ❌") sans jamais
expliciter en toutes lettres le sens de chaque statut ni la tonalité
attendue pour le LLM. Corrigé : chaque statut (✅/⚠️/❌/😴) reçoit
désormais une instruction explicite ("RÉUSSIE, tu peux féliciter" /
"RATÉE, NE FÉLICITE JAMAIS" / etc.). **Insuffisant seul** — testé par
Laurent, bug persistant (cf. §37.3).

### 37.3 Bug n°2 — deuxième instruction du prompt ignorée pour 😴

En creusant plus loin dans le même prompt : une **deuxième instruction**,
distincte de la première (celle qui pilote réellement le CONTENU/ton du
message généré, pas seulement la description factuelle), ne testait que
`sessionDone` — jamais `sessionSkipped`. Pour une séance 😴, elle tombait
dans le `else` "PAS ENCORE EU LIEU", poussant le LLM à générer un message
tourné vers une séance à venir, que le modèle a ensuite halluciné comme
déjà réalisée (cohérent avec le contexte disponible par ailleurs dans le
prompt — météo, type de séance). Corrigé : branche `sessionSkipped`
ajoutée à cette deuxième instruction également. **Toujours insuffisant
seul** — le prompt corrigé produisait bien la bonne instruction (vérifié
en loggant le prompt complet envoyé), et l'API répondait bien correctement
(vérifié en loggant la réponse brute), mais le mauvais message continuait
d'apparaître à l'écran malgré un rafraîchissement manuel. Diagnostic plus
poussé nécessaire (cf. §37.4).

### 37.4 Bug n°3 (root cause principale) — race condition sync Supabase

**Diagnostic** : `coachMsg` était bien mis à jour correctement EN MÉMOIRE
juste après `render()` (vérifié par logs), mais `localStorage` contenait
encore l'ancien message quelques instants plus tard (vérifié directement
via `localStorage.getItem(...)` en console) — et un rechargement de page
ramenait systématiquement l'ancien message.

**Cause** : `lk_coach_msg`/`lk_coach_date` étaient synchronisés vers
Supabase comme n'importe quelle autre clé (`plan_donnees`, mécanisme
générique décrit en tête de fichier §"save()"). Au rechargement suivant,
`precharger()` (`sync-storage.classic.js`/`sync-storage.js`) récupère
`plan_donnees.data` depuis Supabase et écrase `localStorage` avec son
contenu — si la dernière écriture locale (le bon message, juste généré)
n'avait pas encore fini de se propager vers Supabase au moment de ce
rechargement, `precharger()` réimportait l'ancienne version cloud
par-dessus.

**Correctif** (2 fichiers, architecture duale ES/classic) :
- `CLES_LOCALES_UNIQUEMENT` (déjà existante pour `lk_weather_cache`)
  étendue à `lk_coach_msg`/`lk_coach_date` — empêche toute future écriture
  vers Supabase pour ces clés (données éphémères régénérées chaque jour,
  aucune valeur à synchroniser entre appareils)
- La boucle de `precharger()` exclut désormais explicitement ces clés
  (`CLES_LOCALES_UNIQUEMENT.indexOf(cle) !== -1 → continue`) — nécessaire
  en plus du point précédent, pour ne plus jamais relire une valeur déjà
  synchronisée par le passé (avant ce fix), qui serait sinon restée
  indéfiniment sur Supabase et continué à écraser localStorage à chaque
  démarrage

**Fichiers modifiés** : `public/engine-classic-scripts/sync-storage.classic.js`
+ `public/v2/engine/sync-storage.js` (même fix dans les deux, cohérent
avec l'architecture duale déjà établie pour ce module).

Vérifié par Laurent après déploiement — fonctionnel pour la première fois
sur ce scénario précis. **Mais un quatrième bug restait caché** (cf.
§37.5), invisible tant que ce scénario particulier n'avait jamais
fonctionné jusqu'au bout.

### 37.5 Bug n°4 — `dateSeance` jamais transmis sur la carte du jour

Demande de suivi de Laurent ("le coach devrait se rafraîchir à chaque
changement de statut, automatique ou manuel") a révélé, en testant le
chemin manuel à nouveau, que **le rafraîchissement manuel ne fonctionnait
toujours pas** — alors même que le mécanisme lui-même (`if (dateSeance ===
today()) { ...invalider cache...; fetchCoachMsg(); }`, présent depuis le
17/07) semblait correct sur le papier.

**Cause** (trouvée par log direct sur le clic) : `renderStatusRow(uid,
dateSeance)` attend deux paramètres, mais l'appel utilisé sur la carte du
jour du dashboard (`!isRest?renderStatusRow(uid2):null`, ligne ~3240)
n'en passait qu'**un seul** — `dateSeance` restait `undefined` à cet
endroit précis, donc `dateSeance === today()` échouait systématiquement,
peu importe la vraie date de la séance cliquée. L'autre appel de la même
fonction (détail semaine, `renderStatusRow(uid, s.date)`, ligne ~4401)
passait déjà `s.date` correctement — seul l'appel de la carte du jour
était incomplet.

**Ce bug était probablement présent depuis la création du mécanisme le
17/07/2026** — pas une régression introduite pendant cette session, mais
un bug jamais détecté car jamais testé jusqu'au bout dans ce contexte
précis avant aujourd'hui (masqué par le bug §37.4 qui empêchait de toute
façon toute vérification fiable).

**Correctif** : `renderStatusRow(uid2, s.date)` — un seul paramètre
manquant ajouté.

**Fichier modifié** : `public/index.html` uniquement.

### 37.6 Auto-refresh sur validation automatique (demande complémentaire)

En marge du debug, demande explicite de Laurent : le coach doit se
rafraîchir aussi quand le statut de la séance du jour est posé
**automatiquement** (validation post-synchro Strava, fonction appelée en
arrière-plan après `syncStrava()`), pas seulement sur un clic manuel.

**Implémentation** : la boucle de validation automatique (qui ne
concernait jamais que le passé/aujourd'hui, garde-fou déjà en place)
détecte désormais si la séance modifiée automatiquement est celle du jour
(`s.date === aujourdhui`), et si oui, invalide le cache coach et relance
`fetchCoachMsg()` après la boucle complète — même logique que le
déclenchement manuel, appliquée au chemin automatique.

**Non encore vérifié en conditions réelles** (Laurent a testé le chemin
manuel en premier, cf. §37.5) — à confirmer à la prochaine synchro Strava
qui valide automatiquement la séance du jour.

**Fichier modifié** : `public/index.html` uniquement.

### 37.7 Enseignement méthodologique de cette session

Cinq bugs indépendants (§37.1 à §37.5) ont produit un seul symptôme
observable ("le coach dit n'importe quoi") — chacun masquait le suivant.
Aucun n'aurait été trouvé par une simple relecture de code : chaque
diagnostic a nécessité une preuve empirique directe (prompt réellement
envoyé, réponse API réelle, contenu réel de `localStorage`, valeur réelle
d'un paramètre au moment du clic) plutôt qu'un raisonnement théorique sur
ce que le code "devrait" faire. Décision méthodologique à retenir pour de
futurs bugs similaires (symptôme persistant malgré un fix qui semble
correct sur le papier) : instrumenter directement plutôt que d'empiler les
hypothèses non vérifiées.

## 38. R-080 (déficit de volume durable) + test comparatif recuperationEstimee/ACWR (18/07/2026, session ultérieure)

Suite directe de la session §37 (même conversation). Reprise du chantier
`ecartVolumePourcent` laissé en attente depuis §36 (au profit de la
monotonie), puis exploration d'un axe complémentaire (`recuperationEstimee`)
avant de décider de ne pas coder de règle dessus pour l'instant.

### 38.1 R-080 — Déficit de volume durable

**Conception discutée avant codage** : trois options envisagées pour
exploiter `ecartVolumePourcent` (Module 3) — (1) règle ponctuelle par
semaine, (2) activer `STAGNATION_VOLUME` déjà détecté par le Module 4, (3)
nouveau détecteur combinant les deux. Option 2 écartée après analyse : elle
détecte un PLATEAU de volume (stabilité ±5% sur 4 semaines), pas un écart
au plan — un coureur stable à 20km/sem sur un plan qui en vise 40 ne
déclencherait jamais ce signal si son volume ne varie pas. Option 3
retenue.

**Nouveau détecteur** `detecterDeficitVolumeDurable()`
(`decision-engine-trend-analysis.classic.js`) : 3 semaines consécutives
avec `ecartVolumePourcent ≤ -10%` **chacune** (pas une moyenne globale ni
une majorité — plus strict que d'autres détecteurs du même fichier, pour
éviter qu'une seule semaine très faible fasse basculer une moyenne
globalement correcte). Seuil -10% réutilisé du seuil déjà choisi pour
`progressionVsPrecedente` (`WeekAnalysis`, §35) — pas de littérature
trouvée pour calibrer un écart en % au plan individuel (l'étude marathon
citée en §36 donne un seuil ABSOLU de 30km/sem, non transposable en %). À
recalibrer une fois observé sur l'historique réel, décision explicite de
ne pas figer ce choix.

**Nouvelle règle R-080** (`decision-engine-rules.classic.js`) : priorité
52 (entre R-070 à 55, signal plus direct sur le plan, et R-040 à 50, moins
précis), catégorie `engagement`, type `alerter_deficit_volume`,
informative uniquement. Distinct de R-070 (2 séances PRÉVUES ratées
d'affilée, signal binaire sur les statuts posés) : capte une
sous-réalisation même sur des séances FAITES mais raccourcies, invisible
pour R-070.

**Catalogue de règles à jour** : R-006 (100) > R-024s (90) > R-050 (85) >
R-062 (82) > R-060 (80) > R-070 (55) > **R-080 (52)** > R-040 (50).

**Fichiers modifiés** : `decision-engine-trend-analysis.classic.js` +
`decision-engine-rules.classic.js`. Aucun changement côté `index.html`
(câblage `trendAnalysis` déjà en place depuis §35/§36).

**Jamais observée en conditions réelles** (comme R-062 et R-070) — à
surveiller.

### 38.2 Test comparatif recuperationEstimee vs ACWR — pas de règle codée

Avant de concevoir une règle sur `recuperationEstimee`/`progressionVsPrecedente`
(WeekAnalysis, jamais consommés par aucune règle), test empirique demandé
par Laurent plutôt que de deviner leur valeur ajoutée.

**Méthode** : helper temporaire `window.__testCompareRecupACWR(nbSemaines)`
exposé dans `index.html` (retiré après le test, code conservé ci-dessous
pour réutilisation future), qui boucle `analyserSemaineActuelle()` et
`DecisionEngineRunnerState.calculerRunnerState()` sur N semaines et affiche
un tableau comparatif (`recuperationEstimee`, `progressionVsPrecedente`,
`ecartVolumePourcent`, `fatigue`, `ratioAcwr`).

**Résultat sur les 2 semaines disponibles à ce stade du plan de Laurent**
(seulement 2 semaines écoulées, plan démarré récemment) :

| Semaine | recuperationEstimee | progression | ecartVolume% | fatigue | ratioACWR |
|---|---|---|---|---|---|
| 1 | 71 | stable | +3.8% | 37 | 0.87 |
| 2 | 82 | baisse | -39.3% | 41 | 0.91 |

**Constat** : `recuperationEstimee` varie fortement (71→82) en phase avec
`ecartVolumePourcent` (+3.8%→-39.3%), alors que `fatigue`/`ratioAcwr` restent
quasi stables — confirme que `recuperationEstimee` capte un axe différent
de la fatigue/ACWR (écart au PLAN, pas écart à l'historique du coureur).
Mais `recuperationEstimee` semble mathématiquement quasi identique à
l'inverse de `ecartVolumePourcent` (cohérent avec sa formule, `100 -
(ratioCharge-1)*50`, dérivée du même ratio charge réalisée/prévue) — une
règle dessus ferait donc probablement doublon avec R-080 (§38.1), juste
formulée à l'envers (haut = déficit plutôt que bas = surcharge).

**Décision actée** : ne pas coder de règle sur `recuperationEstimee` pour
l'instant — échantillon de seulement 2 semaines insuffisant pour trancher
définitivement, et le risque de doublon avec R-080 est déjà visible sur ce
peu de données. `progressionVsPrecedente` (indépendant du plan prévu,
contrairement à `recuperationEstimee`) pourrait rester un vrai troisième
angle, mais pas assez de points pour juger sa valeur ajoutée propre à ce
stade.

**À refaire dans quelques semaines ou en fin de plan**, une fois plus de
semaines écoulées, pour trancher avec un échantillon exploitable. Code du
helper de test (à recréer identique, retiré de `index.html` après ce
test) :

```javascript
window.__testCompareRecupACWR = function(nbSemaines) {
  const semaineActuelleNum = currentWeek();
  const premiere = Math.max(1, semaineActuelleNum - nbSemaines + 1);
  const resultats = [];
  let precedente = null;
  for (let w = premiere; w <= semaineActuelleNum; w++) {
    const analyse = analyserSemaineActuelle(w, precedente);
    if (!analyse) continue;
    precedente = analyse;
    const week = PLAN.find(pw => pw.week === w);
    const dernierJour = week ? week.sessions[week.sessions.length - 1] : null;
    const dateRef = dernierJour && dernierJour.date <= today() ? dernierJour.date : today();
    let fatigue = null, ratioAcwr = null;
    try {
      const samples = adapterHistoriqueAvecRpe(window.stravaActivities || [], "strava_gratuit");
      const rs = DecisionEngineRunnerState.calculerRunnerState(samples, { ...optionsRunnerStateActuel(), dateReference: dateRef });
      fatigue = rs.fatigue;
      ratioAcwr = rs.charge ? rs.charge.ratio : null;
    } catch(e) {}
    resultats.push({
      semaine: w,
      recuperationEstimee: analyse.recuperationEstimee,
      progressionVsPrecedente: analyse.progressionVsPrecedente,
      ecartVolumePourcent: analyse.ecartVolumePourcent,
      fatigue,
      ratioAcwr: ratioAcwr ? Math.round(ratioAcwr * 100) / 100 : null,
    });
  }
  console.table(resultats);
  return resultats;
};
```

**Fichier modifié** : `public/index.html` (helper ajouté puis retiré dans
la même session — code final identique à l'état d'avant ce test).

## 39. Audit Daniels/Seiler sur plan réel (GEM'AUBAGNE) + strides sur EF de Construction (18/07/2026)

### 39.1 Audit de conformité — principes Daniels, sans code

Avant de coder quoi que ce soit, audit manuel du plan actif GEM'AUBAGNE
(9 semaines, 10K, `dateDebut: 2026-07-06`) contre plusieurs principes du
livre *Daniels' Running Formula* (4e édition, ajouté aux fichiers projet) :
progression du volume par palier de 3-4 semaines, limite de durée sur la
sortie longue (≤150min ou 25-30% du volume hebdo), limite sur le volume en
T-effort réel (≤10% du volume hebdo par séance), distribution facile/intense
(Seiler, 80/20).

**Méthode** : plan brut extrait via `console.log(JSON.stringify(__PLAN_BRUT__))`
depuis la console navigateur (pas d'accès direct à Supabase depuis l'outil
GitHub, en lecture seule sur ce repo).

**Résultat** : le générateur actuel respecte déjà l'essentiel des principes
vérifiés, **sans qu'aucune règle ne les code explicitement** :
- Progression du volume : jamais plus de 2 semaines consécutives
  d'augmentation, décharge cyclique correcte (40→42,5→42,5→31,9 décharge→42,5...)
- Sortie longue : max observé 73min, très en dessous de la limite Daniels
  (150min)
- T-effort réel (isolé de l'échauffement/retour au calme dans
  `structureIntervalles`, pas le `kmEstime` global de la séance qui inclut
  tout) : 8,5-9% du volume hebdo sur la plupart des semaines — un seul écart
  mineur trouvé (11,3% en semaine 5, phase Spécifique), jugé trop marginal
  pour justifier un nouveau garde-fou
- Distribution facile/intense : ~70-75% facile / 25-30% intense selon les
  semaines — plus proche d'un 70/30 que d'un strict 80/20 Seiler, mais
  cohérent avec la littérature spécifique 10K (moins polarisé qu'un plan
  marathon)

**Point méthodologique retenu pour tout audit futur** : comparer le volume
en allure T au `kmEstime` total d'une séance qualité est trompeur (inclut
échauffement + retour au calme, ~40% du volume affiché sur une séance
seuil-court typique) — il faut isoler `structureIntervalles.blocs[].dureeEffortSec`
à l'allure T précisément, pas le total de la séance.

**Conclusion** : pas de refonte du générateur, pas de nouveau garde-fou de
volume/durée nécessaire à ce stade — l'audit sert de référence si un futur
plan (marathon notamment, contraintes plus strictes) montre un écart plus
net.

### 39.2 Audit de variété des séances qualité — tableau de rotation complet

Constat initial (sur GEM'AUBAGNE seul) : peu de variété perçue en phase
Spécifique (seulement 4 sous-types vus sur 9 semaines). Vérification contre
`ROTATION_SOUS_TYPE` (source de vérité du code, pas le plan seul) : la
bibliothèque est en réalité riche (6 sous-types en Spécifique pour le 10K),
mais le cycle de rotation tourne sur 12 positions — un plan à phase
Spécifique courte (3 semaines × 2 séances qualité = 6 tirages) n'a
mathématiquement pas le temps d'atteindre les positions rares du cycle
(`seuil-negatif` position 5, `pyramidale` position 12). Pas un bug, un effet
de la durée du plan.

**Tableau de rotation complet par objectif et phase** (construit en lisant
`ROTATION_SOUS_TYPE` du code, avec l'allure travaillée associée à chaque
sous-type d'après le `switch` de `genererContenuQualite`) :

| Objectif | Construction | Spécifique (cycle sur 12) | Affûtage |
|---|---|---|---|
| 5K | cotes (V), i-30-30 (VMA) | i-3min/vitesse en alternance (VMA/V, ×5), pyramidale (VMA) en position 12 | vitesse (V), i-3min (VMA) |
| 10K | seuil-court (T), i-30-30 (VMA) | i-3min (VMA), seuil (T), allure-course (C) en boucle ×3, seuil-negatif (T→VMA) ×2, pyramidale (VMA) en position 12 | allure-course (C), seuil-court (T) |
| Semi | tempo-court (T), seuil-2min (T) | seuil (T), i-3min (VMA), allure-course (C) en boucle ×3, seuil-negatif (T→VMA) ×2, pyramidale (VMA) en position 12 | allure-course-court (C), seuil-court (T) |
| Marathon | tempo-court (T), seuil-court (T) | seuil (T), allure-course (C) en alternance ×4, seuil-negatif (T→VMA) ×2 — pas de pyramidale (volontaire, phase plus orientée seuil/allure course) | tempo-court (T), allure-course-court (C) |

`seuil-negatif` est noté T→VMA : seul sous-type qui enchaîne deux allures
différentes dans la même séance (bloc seuil puis bloc plus rapide, ~30% du
chemin vers l'allure VMA).

**Constat retenu** : la variété est correcte en Spécifique, mais
**Construction n'a que 2 sous-types pour chaque objectif** — installation
volontaire d'une base (VMA courte + seuil léger) avant la spécificité
course, cohérent avec Daniels, mais avec seulement 2 formats en boucle
pendant 3-4 semaines, la monotonie perçue en Construction est réelle, pas
qu'une impression.

### 39.3 Strides ajoutés sur les EF standard de Construction (v2.13)

Recherche complémentaire à Daniels (littérature 2024-2026 : tradition
Lydiard, Runners Connect, Coach Saltmarsh) pour combler le déficit de
variété en Construction sans toucher aux limites déjà validées en 39.1.
Détail complet de la recherche et de la décision : voir
`bibliotheque-seances.md` section 41.

**Résumé de la fonctionnalité livrée** : nouvelle fonction
`injecterStrides(semaines, alluresSec)` dans `plan-generator.classic.js` /
`plan-generator.js` (ES, synchronisées et testées) — mute `semaines` en
place, appelée juste après `injecterNotesPratiques` dans `generatePlan`.

- Ajoute `4×20s lignes droites` en fin d'un sous-ensemble des séances EF
  `role: "standard"` de la phase Construction — jamais sur `recuperation`,
  jamais hors Construction
- Fréquence : 1 EF standard sur 2 (compteur cyclique sur les occurrences
  d'EF standard, pas un jour fixe — s'adapte à tout mode/niveau
  automatiquement)
- **Pas d'allure chiffrée** (différence structurelle avec tous les autres
  sous-types qualité) — champ `allure` descriptif ("ressenti — accélération
  progressive... jamais un sprint à fond"), cohérent avec la nature de
  l'effort (piloté au ressenti dans la littérature, pas au chrono)
- `kmEstime` incrémenté légèrement (~0,3km pour 4×20s, estimé à ~95% de
  l'allure V) — pour que le moteur de décision (ACWR, charge) distingue une
  EF+strides d'une EF pure, même si l'écart réel est marginal
- Nouveau champ structuré `seance.strides` (repetitions, dureeEffortSec,
  allure descriptive, récupération complète) — cohérent avec le principe
  déjà en place que `structureIntervalles` ne doit jamais être reparsée
  depuis le texte

**Testé** (script Node local avant push, retiré après validation) : cycle
correct sur EF standard uniquement, jamais sur recuperation, jamais hors
Construction, `kmEstime` et texte de contenu correctement enrichis sur les
occurrences ciblées.

**Fichiers modifiés** : `public/engine-classic-scripts/plan-generator.classic.js`,
`public/v2/engine/plan-generator.js` (synchronisées, syntaxe validée via
`node --check` sur les deux). `docs/v2-methodologie/bibliotheque-seances.md`
(nouvelle section 41, avec les nouvelles sources ajoutées à la liste finale).

**Non fait à ce stade** : pas de garde-fou de non-régression automatisé
(ex. test unitaire dédié dans `test-plan-generator.mjs`) — à ajouter si ce
fichier de tests est retouché dans une session future.

## 40. Import FIT — audit complet, limitation Zepp/Amazfit confirmée, état des lieux par marque (18/07/2026)

### 40.1 Audit sur fichier réel — bug de vitesse corrigé

Fichier `.fit` réel fourni par Laurent (export manuel Zepp, montre Amazfit
Cheetah, séance qualité 3×6min/récup 90s le 17/07/2026) — premier vrai test
de la fonctionnalité import FIT livrée en fin de session précédente (§39.3).

**Bug trouvé et corrigé** : `avg_speed` du fichier FIT (champ natif de la
session ET de chaque lap) rapportait 2.0 m/s (8'20/km), alors que
`total_distance / total_elapsed_time` donne 2.667 m/s (6'15/km) — cohérent
avec la somme des 8 laps réels et avec l'allure attendue pour une EF. Écart
significatif (>30%) et trompeur, probablement dû à une inclusion des phases
d'arrêt/pause dans le calcul `avg_speed` côté firmware Amazfit/Zepp.

**Corrigé** dans `adapterFitVersFormatActivite()` (`index.html`) : nouvelle
fonction `vitesseFiable(distance, tempsSec, avgSpeedFit)` qui recalcule
systématiquement la vitesse depuis distance/temps plutôt que de faire
confiance au champ natif — appliquée au niveau activité ET à chaque lap,
par prudence (même défaut probable partout sur ce fabricant). Validé
numériquement contre les vraies données du fichier avant push.

### 40.2 Limitation structurelle trouvée — décomposition de séance qualité impossible pour ce fichier

Constat initial erroné : le fichier a été pris pour une EF (allure fausse
avant correction 40.1) alors que c'était en réalité une vraie séance
qualité (3×6min/récup 90s). Une fois requalifiée, l'audit a révélé un
problème plus profond que le simple bug de vitesse.

**Les 8 laps du fichier ne correspondent PAS à la structure programmée.**
Vérification exhaustive avec `fitdecode` (Python) sur tous les champs et
tous les types de messages du fichier :
- `lap_trigger = "distance"` sur les 7 premiers laps (déclenchement
  automatique au km fixe, 1000m chacun), `"session_end"` sur le dernier —
  aucun lap de type intervalle/manuel
- Seuls 2 `event` dans le fichier : `timer start` et `timer stop_all` —
  aucun événement de type intervalle
- Tous les types de messages présents listés exhaustivement : `file_id`,
  `session`, `lap`, `record`, `event`, `device_info`, `activity`,
  `field_description`, `developer_data_id` — **aucun message `split`**
  (voir 40.3)

**La vraie structure existe dans les records bruts, mais invisible dans les
laps.** Analyse manuelle du signal de vitesse instantanée (`enhanced_speed`
des 2937 records, moyennée par fenêtres de 30s) : 3 blocs d'effort à ~5'00-
5'10/km clairement identifiables (t≈900-1230s, t≈1350-1680s, t≈1800-2130s,
soit ~5.5min chacun, proche des 6min programmées), séparés par des creux de
récup — cohérent avec la séance annoncée par Laurent. Le signal existe donc
bel et bien dans le fichier, mais aucun marqueur structurel (lap, event,
champ custom) ne le rend directement exploitable sans ré-implémenter une
détection par changement de vitesse sur le signal brut — heuristique déjà
écartée une fois pour Strava (cf. historique `getEffortLaps`, tentative
"filtrer par durée" abandonnée) pour cause de fragilité.

### 40.3 Découverte clé — pourquoi Strava affiche pourtant les intervalles correctement

Question posée par Laurent : si Strava (alimenté par cette même montre)
affiche une décomposition précise des 3×6min, d'où vient cette info si le
fichier `.fit` exporté ne la contient pas ?

**Réponse trouvée (recherche web, source technique fiable — discussion
GitHub `mytourbook/mytourbook#1279`, développeurs inspectant le format FIT
brut)** : le protocole FIT distingue deux types de messages différents,
tous deux appelés "laps" dans le langage courant mais distincts au niveau
binaire :
- **`lap`** (mesg_num 19) — celui lu par `fitdecode`/`fit-file-parser`,
  déclenché par bouton ou auto-lap distance/temps sur l'appareil
- **`split`** (mesg_num 312) — message séparé, avec des types explicites
  `interval_active`/`interval_recovery`/`interval_rest`/`rwd_walk` — **ce
  que Garmin Connect affiche réellement**, pas les `lap`

Confirmé explicitement dans la doc : *"Garmin Connect displays the 'Split'
messages data from FIT file and not the 'Lap' messages data."*

**Deux explications possibles pour Strava sur cette séance Zepp**, non
tranchées à ce stade :
1. Zepp transmet des messages `split` (ou équivalent) via son intégration
   cloud directe avec Strava, absents de l'export manuel `.fit` que Laurent
   a fourni (l'app Zepp fait officiellement transiter les activités via une
   API cloud-to-cloud, cf. doc Strava officielle : *"activities are pushed
   to us from Zepp's cloud service and we have no insight into their
   system"*)
2. Strava applique sa propre détection algorithmique par changement de
   vitesse sur les records bruts — plausible mais non confirmé par une
   source

Dans les deux cas, le fichier `.fit` exporté manuellement par Zepp/Amazfit,
tel que testé, **ne contient exhaustivement aucun signal structurel exploi-
table** — confirmé, pas supposé.

### 40.4 État des lieux par marque de montre (18/07/2026, sources documentées, non testées empiriquement sauf Zepp)

Recherche complémentaire sur Coros et Suunto pour situer Zepp/Amazfit dans
un contexte plus large avant de décider d'une action :

| Marque | Message porteur de la structure | Confiance |
|---|---|---|
| **Zepp/Amazfit** | Aucun trouvé (testé exhaustivement sur fichier réel, §40.2) | **Confirmé par test direct** |
| **Garmin** | `split` (interval_active/recovery/rest), distinct de `lap` | Source technique fiable (discussion développeurs), **non vérifié empiriquement** — aucun fichier `.fit` public avec vraie séance fractionnée trouvé malgré recherche sur SDK officiels (Python/Java/C++/JS), `fit-sdk-tools`, projets communautaires (`mytourbook`) |
| **Suunto** | `lap` standard, avec `event: LAP` / `event_type: STOP` pour les intervalles (`FITNESS_EQUIPMENT — Intervals and downhills`) | Doc développeur officielle Suunto (`apizone.suunto.com/fit-description`) — laisse penser que Suunto encode correctement la structure dans le `lap` classique, contrairement à Zepp et potentiellement plus simplement que Garmin (`split`) |
| **Coros** | Non déterminé précisément | Doc utilisateur mentionne une distinction "manual laps" vs "1km/5km/10km splits" dans l'app — suggère une architecture proche de Garmin (deux concepts distincts), mais pas de confirmation du format `.fit` exporté lui-même |

**Recherche de fichiers `.fit` publics avec intervalles réels** : tentative
sur plusieurs sources (SDK officiels Garmin toutes langues, `fit-sdk-tools`,
`mytourbook`, outils en ligne comme `jasonkuperberg.com/fit-file-viewer`)
— aucun fichier trouvé et téléchargeable contenant une vraie séance de
course fractionnée avec message `split`. Piste Garmin non invalidée, mais
non confirmée non plus — à retester si un fichier réel devient disponible
(Laurent ou un tiers avec montre Garmin).

### 40.5 Décision — pas de nouveau développement dans l'immédiat

Compte tenu de l'incertitude et du fait qu'une seule marque (Zepp/Amazfit,
celle de Laurent) a été testée avec certitude :

- **Pas de garde-fou ni message d'avertissement ajouté au code pour
  l'instant** — prématuré tant que le comportement des autres marques n'est
  pas vérifié empiriquement, un avertissement mal calibré pourrait être
  trompeur dans l'autre sens (ex. bloquer à tort un fichier Garmin qui
  fonctionnerait correctement une fois le message `split` lu)
- **`adapterFitVersFormatActivite()` reste tel quel** (lit uniquement les
  `lap`), avec le correctif de vitesse fiable (§40.1) déjà appliqué et
  poussé
- **Piste ouverte, non commencée** : si un fichier Garmin ou Suunto réel
  devient disponible, vérifier si `fit-file-parser` (librairie JS choisie)
  expose bien les messages `split` en plus des `lap` dans son mode
  `cascade` — condition nécessaire avant d'envisager de les exploiter côté
  Yoria

### 40.6 Tentative de récupération de fichiers Coros/Suunto réels — bloquée techniquement, nuance importante trouvée (18/07/2026, même session)

Recherche de fichiers `.fit` publics Coros et Suunto avec vraie séance
d'intervalles, pour compléter l'audit §40.4 au-delà des sources
documentaires.

**Trouvé** : discussion GitHub `mytourbook/mytourbook#1194` contient des
liens vers de vrais fichiers `.fit` Suunto originaux (attachments
`.zip`), postés par un utilisateur pour du débogage d'export.

**Téléchargement impossible** : les pièces jointes GitHub sont hébergées
sur `objects.githubusercontent.com`, domaine absent de l'allowlist
réseau du sandbox (`github.com` lui-même est autorisé, pas ce
sous-domaine de stockage) — blocage technique, pas un manque de source.

**Nuance importante trouvée sans avoir besoin du fichier** : dans cette
même discussion, un développeur a passé un vrai fichier `.fit` d'une
montre **Suunto Vertical** dans l'outil de validation officiel Garmin
(`FitTestTool.jar`, fourni dans `fit-sdk-tools`), qui rapporte :

> "Lap Message Exists — Level: REQUIRED — Status: **FAILED**"

C'est-à-dire que ce fichier Suunto réel **n'avait aucun message `lap`**,
pas juste des laps mal structurés comme sur le fichier Zepp déjà testé
(§40.1-40.2). Ça contredit partiellement la doc développeur officielle
Suunto (`apizone.suunto.com/fit-description`, qui décrit un format
`event: LAP` pour les intervalles, cf. §40.4) — en pratique, au moins un
modèle/export Suunto n'a aucun lap du tout.

**Conclusion révisée** : le contenu réel d'un fichier `.fit` varie non
seulement par marque, mais aussi par **modèle précis et par mode
d'export** au sein d'une même marque — confirmé ici pour Suunto, déjà
suspecté pour Zepp. Ça renforce la prudence de la décision §40.5 (pas de
garde-fou générique par marque) : même une règle "Suunto = fiable, Zepp =
pas fiable" serait probablement fausse dans certains cas concrets.

**Reste à faire, si l'occasion se présente** : demander à Laurent (ou un
tiers) un vrai fichier `.fit` Coros ou Suunto, envoyé directement en
pièce jointe dans la conversation plutôt que via un lien externe — seule
méthode fiable pour contourner le blocage réseau du sandbox rencontré
ici, déjà utilisée avec succès pour le fichier Zepp initial (§40.1).

### 40.7 Apple Watch — cas structurellement différent, pas de fichier `.fit` natif (18/07/2026, même session)

Question posée par Laurent : et pour Apple Watch ? Recherche web menée
avec la même méthode que pour Coros/Suunto (§40.4/40.6).

**Différence fondamentale avec toutes les autres marques auditées** :
Apple Watch **n'exporte jamais de `.fit` nativement**. Confirmé
explicitement par plusieurs sources indépendantes : *"Apple Watch does
not record FIT natively — workouts are stored in HealthKit"* et *"One
downside of the Apple Watch workout ecosystem is that there is no way to
export your data out."* Contrairement à Zepp/Garmin/Coros/Suunto (qui
produisent tous un `.fit` en interne, avec une fiabilité variable selon
modèle/export, cf. §40.4/40.6), Apple stocke tout dans **HealthKit**, un
format propriétaire — aucun export `.fit` natif possible, quelle que soit
l'app utilisée pour enregistrer.

**Deux chemins distincts identifiés pour obtenir un `.fit` malgré tout** :

1. **Apple Fitness natif + app tierce de conversion a posteriori**
   (ex. HealthFit, ~2€, référence citée dans plusieurs sources) — lit
   HealthKit et reconstruit un `.fit`. Gère les segments/laps, mais via
   un mécanisme de **double-tap manuel** de l'utilisateur pendant l'effort
   pour marquer un segment — pas une détection automatique d'une structure
   d'intervalles programmée à l'avance. Pour une vraie séance qualité type
   3×6min, ce mode ne produirait donc probablement pas une décomposition
   fiable sans que l'utilisateur double-tape manuellement à chaque
   changement de phase pendant sa course.

2. **App tierce dédiée aux entraînements structurés** (ex. Watchletic,
   citée en exemple) — supporte nativement la synchronisation de workouts
   structurés depuis des plateformes externes (TrainingPeaks, Intervals.icu,
   etc.), pousse la séance programmée directement sur la montre avant
   l'effort, puis exporte en FIT/GPX/TCX/Strava après coup. Une note de
   changelog trouvée est un indice fort en faveur de cette voie : *"Fixes
   issue with importing interval repeats from FIT files"* — preuve que
   l'app manipule activement des répétitions d'intervalles dans son export
   FIT, contrairement au chemin HealthFit/double-tap.

**Conclusion, cohérente avec la prudence déjà actée en §40.5/40.6** :
Apple Watch n'est PAS un cas comparable aux autres marques — la fiabilité
de la décomposition dépendrait presque entièrement de l'app tierce
utilisée par l'utilisateur pour enregistrer sa séance (native Apple
Fitness vs Watchletic vs autre), plus encore que pour Zepp/Suunto où au
moins la même app fabricant est en cause. Pas de fichier testé, pas de
décision à prendre dans l'immédiat — à documenter comme cas à part si un
utilisateur Apple Watch de Yoria se présente un jour, plutôt qu'à traiter
comme une marque de montre supplémentaire dans le tableau §40.4.

## 41. Session du 19/07/2026 — cohérence de la stratégie de course, RPE mobile, profil coureur complet

Session de correctifs multiples, tous poussés et validés par Laurent le
jour même.

### 41.1 Bug "jour de course" incohérent entre 3 sources distinctes

Signalé par Laurent : le texte de stratégie de course (segments, allures)
affiché dans la vue Semaine ne correspondait ni à l'onglet Course ni au
message du coach IA — trois formulations différentes pour la même
course, avec parfois des allures contradictoires.

**Diagnostic** — trois sources indépendantes, chacune avec sa propre
logique :

1. **Vue Semaine** (`index.html`) — un bloc codé en dur ("Objectif
   48'30\", Km 1-3 prudent · Km 4-7 contrôle · Km 8-10 tout donner"),
   totalement indépendant du plan réel, vestige d'un ancien test resté
   en production.
2. **Onglet Course** (`index.html`, `renderCourse()`) — logique
   correcte et déjà bien pensée : `calculerSplitsCalibres()` /
   `calculerStrategieCourse()`, calibrage exact par distance (3-4
   segments selon 5K/10K/Semi-Marathon), déjà documentée et corrigée
   deux fois auparavant (bugs du 7 et 11 juillet 2026, cf. commentaires
   dans le code).
3. **Contenu du plan lui-même** (`plan-generator.js` /
   `.classic.js`, fonction `genererContenuRace()`) — génère le texte
   affiché comme titre de la séance RACE **au moment de la création du
   plan**, puis le fige dans `seance.contenu`, stocké tel quel en base
   (Supabase, `plans_actif.plan_brut`). Cette fonction avait sa PROPRE
   stratégie, plus ancienne et plus simple (2 segments bruts pour un
   10K, sans calibrage), jamais mise à jour en miroir des évolutions de
   `calculerStrategieCourse()` côté affichage.

**Fix en 3 temps** :

1. Extraction de `calculerSplitsCalibres()` / `calculerStrategieCourse()`
   en fonctions globales dans `index.html` (auparavant définies
   localement dans `renderCourse()`), réutilisables ailleurs dans le
   même fichier.
2. `genererContenuRace()` réécrite dans `plan-generator.js` **et**
   `plan-generator.classic.js` (architecture duale respectée) pour
   utiliser un miroir exact de cette même logique — même segments, même
   calibrage, mêmes allures.
3. Un premier essai d'ajout d'un bloc "🏁 Jour J" dédié dans la vue
   Semaine s'est avéré redondant avec `effSess.session` (le titre de la
   séance, déjà affiché plus haut dans la carte, contient déjà tout le
   texte généré par `genererContenuRace()`) — le bloc ajouté a été
   retiré, `effSess.session` suffit seul.

**Cache du message coach obsolète** — effet de bord découvert en cours
de diagnostic : `coachRaceMsg` (conseil texte généré une fois par Claude
Haiku via `/api/coach`, puis stocké en `localStorage`/Supabase) restait
figé indéfiniment même après correction du calcul sous-jacent, car
aucune condition ne le régénérait tant qu'un message existait déjà.
Fix : ajout d'une signature `coachRaceStratSig` (hash simple des
segments/allures calculés), sauvegardée avec le message ; si la
signature actuelle diverge de celle stockée, le cache est traité comme
obsolète et régénéré automatiquement.

**Migration des données déjà en base** — un correctif de code seul ne
suffisait pas : le texte incohérent était déjà figé dans
`plan_brut.semaines[X].assignment[Y].contenu` pour les deux plans actifs
de Laurent (GEM'AUBAGNE, "400 ans de la Marine"). Corrigé directement en
SQL via le SQL Editor Supabase : requête `SELECT` de vérification
d'abord (localiser précisément les 2 lignes concernées via
`jsonb_path_exists` sur `type == "race"`), puis un bloc `DO $$ ... $$`
en PL/pgSQL parcourant `semaines`/`assignment` de chaque plan et
appliquant `jsonb_set` uniquement sur le champ `contenu` des séances
`type: "race"`, sans toucher au reste du plan. Vérifié après coup par
une nouvelle `SELECT`.

### 41.2 RPE — lisibilité mobile et documentation utilisateur

Le tooltip du sélecteur RPE (attribut HTML `title`, déjà existant)
n'affiche jamais rien sur mobile, faute de survol souris possible.
Fix : le libellé complet (ex. "Difficile (CR-10 : 5-6)") s'affiche
maintenant sous le rang de boutons dès qu'une icône est sélectionnée
— fonctionne aussi bien sur desktop que mobile. Trois options
présentées à Laurent (label permanent sous chaque icône, appui long,
label sous l'icône sélectionnée) — la troisième retenue, la plus légère
visuellement.

Nouvelle entrée FAQ ajoutée (`docs`/aide intégrée à l'app) expliquant le
concept du RPE et détaillant les 5 niveaux avec leur référence CR-10.

### 41.3 Profil coureur — chantier "date de naissance complète" clos

Dernier des trois champs identifiés comme manquants dans `profilCoureur`
(avec `fcRepos` et `sexe`, qui se sont révélés déjà entièrement
implémentés lors de la vérification du code — corrigé dans la mémoire
de session, ces deux champs ne doivent plus être listés comme
chantiers à faire).

`profilCoureur.dateNaissance` (format `YYYY-MM-DD`, champ
`<input type="date">` dans Réglages) remplace l'ancien
`anneeNaissance` (nombre). `anneeNaissance` reste néanmoins calculée
automatiquement en dérivé à chaque sauvegarde, pour ne rien casser côté
`plan-generator.js`/wizard qui ne consomment que l'année (formule de
Tanaka, `computeFcMaxTanaka`).

Deux nouvelles fonctions dans `index.html` :
- `calculerAnneeReferenceSaisonFFA(dateReference)` — détermine l'année
  de référence de la saison FFA en cours, avec bascule au 1er septembre
  (avant cette date : année en cours ; à partir de cette date : année
  suivante).
- `calculerCategorieAgeFFA(anneeNaissance, dateReference)` — retourne
  la catégorie (Senior, Espoir, Junior, ... ou Master 0 à Master 10),
  calculée sur l'année de naissance uniquement (la règle FFA ne
  descend jamais au jour précis). Validée contre la grille officielle
  2025-2026 (athle.fr) et l'exemple officiel cité par une source tierce
  (né juin 1986 → Master 0 jusqu'au 31/08/2025, Master 1 dès le
  01/09/2025).

Catégorie affichée sous le tableau profil dans Réglages ("Catégorie
FFA saison en cours : Master X (MX)"). Message "🎂 Joyeux anniversaire !"
affiché en tête de la section profil si `dateNaissance` correspond au
jour du jour (comparaison "MM-DD" uniquement, indépendante du calcul de
catégorie).

### 41.4 Chantier de fond identifié, pas commencé — conversion en modules ES

Discuté avec Laurent en fin de session : éliminer la duplication
moteur/classic en convertissant `index.html` en `<script type="module">`
pour importer directement `public/v2/engine/*.js`, sans passer par
`public/engine-classic-scripts/*.classic.js`. Plan en 5 étapes présenté
(branche dédiée, migration progressive module par module en commençant
par les moins critiques, tests systématiques en conditions réelles).
Jugé trop risqué pour être fait à la volée — reporté à une session
dédiée avec du temps devant soi. Cf. mémoire de session pour le détail
complet du plan.
