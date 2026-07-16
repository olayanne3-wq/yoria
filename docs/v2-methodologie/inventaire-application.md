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
> renommé `yoria` le 16/07), Supabase et Strava tous alignés dessus ; reste juste
> la config Android/TWA à refaire avant la publication Play Store définitive (§22.2).
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
plan-10k/
â”œâ”€â”€ api/                          # Endpoints serverless (Vercel/Node)
â”‚   â”œâ”€â”€ coach.js                  # Proxy vers Claude Haiku (messages coach courts)
â”‚   â”œâ”€â”€ strava.js                 # OAuth Strava (auth, callback, refresh, activities)
│   ├── weather.js                # Proxy Open-Meteo (prévision + alerte chaleur >28°C)
â”‚   â””â”€â”€ config.js                  # Expose SUPABASE_URL/SUPABASE_ANON_KEY (variables
│                                    # d'environnement Vercel) au client — ajouté le
│                                    # 13 juillet 2026. Route déclarée explicitement dans
â”‚                                    # vercel.json (routing en liste blanche, absence
â”‚                                    # initiale de cette route causait un 404).
├── docs/v2-methodologie/         # Documentation méthodologique et architecture
â”‚   â”œâ”€â”€ inventaire-application.md # CE FICHIER
│   ├── bibliotheque-seances.md   # Méthodologie détaillée des types de séances qualité
│   ├── convergence-v1-v2.md      # Historique des décisions de convergence v1→v2
â”‚   â”œâ”€â”€ coherence-semaine-test.md
â”‚   â”œâ”€â”€ jalons-narratifs.md
â”‚   â”œâ”€â”€ jour-de-course.md
â”‚   â”œâ”€â”€ notes-meteo.md
â”‚   â””â”€â”€ notes-pratiques.md
â”‚   â””â”€â”€ reperes-qualitatifs.md
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
- ðŸ”œ Classification du contenu (questionnaire Play Console, pas encore rempli)
- ðŸ”œ Data Safety form (guide fourni, pas encore rempli dans Play Console)
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

### 22.2 Reste à faire

- **Android / TWA** (§11) — `assetlinks.json` et la config Bubblewrap
  (`android.keystore`, projet `runbylea-android-v3`) restent calés sur
  `yoria-running.vercel.app`. Pas bloquant dans l'immédiat (ce domaine
  redirige maintenant vers `yoria.run` en 308), mais l'app Android devra
  être régénérée/republiée avec le nouveau domaine avant la publication
  Play Store définitive.

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
- **Nom de dossier local** `runbylea-android-v3` (machine Windows de
  Laurent, hors repo) — cosmétique, aucun impact, non renommé (pas
  d'intérêt à le faire).
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

- **Android/TWA** (§22.2, inchangé) : toujours calé sur
  `yoria-running.vercel.app`, à migrer vers `yoria.run` avant publication
  Play Store définitive — indépendant de ce nettoyage d'identité.
- Si Laurent veut un jour aussi renommer `runbylea-android-v3` (dossier
  local Windows) ou changer l'`applicationId` Android : décision à part,
  impliquant une republication Play Store complète — non fait ici par choix
  explicite.
