# Inventaire de l'application "Yoria"

> Vue d'ensemble de référence — état ACTUEL du système, à relire en début de
> session. Organisé par thème, pas par session. **L'historique des correctifs,
> bugs et versions livrées vit uniquement dans `changelog.classic.js`** — ne
> pas le dupliquer ici.
>
> ⚠️ **Mettre à jour ce fichier à chaque changement structurel** (nouvel
> écran, nouvelle clé de stockage, nouvelle intégration, pipeline modifié,
> chantier ouvert/fermé). Un simple correctif de bug va dans le changelog,
> pas ici.

## 1. Vue d'ensemble

**Yoria** — PWA + Android TWA de coaching à la course à pied, génère des
plans d'entraînement adaptatifs. Développeur solo : Laurent, objectif
personnel semi-marathon le 1er novembre 2026.

- Repo GitHub : `olayanne3-wq/yoria` (branche `main`)
- Déployé sur Vercel, domaine `yoria.run`
- Stack : vanilla HTML/CSS/JS (modules ES depuis le 19/07/2026), hosting
  statique Vercel, API serverless dans `/api/`
- Backend Supabase (auth + données), intégration Strava

## 2. Arborescence du repo

```
yoria/
├── api/                          # Endpoints serverless (Vercel/Node)
│   ├── coach.js                  # Proxy Claude Haiku (messages coach courts)
│   ├── strava.js                 # OAuth Strava (auth, callback, refresh, activities)
│   ├── weather.js                # Proxy Open-Meteo (prévision + alerte chaleur >28°C)
│   ├── config.js                 # Expose SUPABASE_URL/SUPABASE_ANON_KEY au client
│   ├── stripe-checkout.js        # Création session Stripe Checkout
│   ├── stripe-webhook.js         # Réception événements Stripe (statut abonnement)
│   ├── beta.js                   # Candidature bêta (public)
│   └── beta-admin.js             # Administration bêta (invitations, abonnements gratuits,
│                                  # signalements)
├── docs/
│   ├── legal/                    # Confidentialité, CGU/CGV, RGPD, Play Store data safety
│   └── v2-methodologie/
│       ├── inventaire-application.md   # CE FICHIER
│       ├── bibliotheque-seances.md     # Méthodologie des types de séances qualité
│       └── (autres docs de contexte : jour-de-course, notes-meteo, etc.)
├── public/
│   ├── index.html                 # App principale (dashboard, ~8300 lignes)
│   ├── privacy.html
│   ├── beta/                      # Page candidature bêta publique
│   ├── beta-admin/                # Interface admin bêta (index.html, script.js, styles.css)
│   │                              # Onglets : Candidatures, Sélectionnés, Invités,
│   │                              # Signalements, Statistiques
│   ├── .well-known/assetlinks.json  # Digital Asset Links (TWA Android)
│   ├── engine-classic-scripts/    # Copies non-module (.classic.js) du moteur v2
│   │   ├── changelog.classic.js    # Historique versions (source de vérité directe,
│   │   │                           # pas de module ES équivalent)
│   │   └── decision-engine-*.classic.js  # Moteur de décision (8 fichiers, UNIQUES,
│   │                               # jamais eu de version module ES — pas une duplication)
│   └── v2/
│       ├── index.html             # Wizard de création de plan
│       └── engine/                # Moteur v2 (modules ES, source de vérité)
│           ├── plan-generator.js
│           ├── plan-forme.js
│           ├── v1-bridge.js       # Traduction plan brut v2 -> format v1 (index.html)
│           ├── strava.js, weather.js, gist-sync.js
│           └── auth.js, sync-storage.js
└── vercel.json                    # Routing explicite en whitelist (toute route API
                                    # doit y être déclarée, sinon 404 silencieux)
```

## 3. Les deux interfaces

| | `public/index.html` | `public/v2/index.html` |
|---|---|---|
| Rôle | App principale : dashboard, suivi, réglages | Wizard : création/paramétrage d'un plan |
| Route | `/` | `/v2` |
| Type de script | `<script type="module">` (converti le 19/07/2026) | Module ES natif |

**Architecture duale (contrainte permanente)** : tout changement dans
`public/v2/engine/*.js` doit être dupliqué dans
`public/engine-classic-scripts/*.classic.js` (suppression des `export` via
sed) — **sauf** les 8 fichiers `decision-engine-*.classic.js`, qui sont des
scripts classiques uniques sans équivalent module ES.

La conversion complète de `index.html`/`v2/index.html` en modules ES est
**terminée** (19/07/2026) : import dynamique au point d'usage, exposition
globale via `Object.assign(window, module)` (sauf `auth.js`/`sync-storage.js`
qui exposent `window.LkAuth`/`window.LkSync` comme objets nommés). Les 7
fichiers `.classic.js` devenus orphelins ont été supprimés du repo.

**Point de vigilance critique (race condition découverte et corrigée le
21/07/2026, dans les DEUX fichiers)** : `window.__AUTH_PRET__` doit être
créée de façon **synchrone**, en tout début de script, avant tout `await
import(...)`. L'ancien pattern (assignée après plusieurs imports
dynamiques) laissait une fenêtre où `window.__AUTH_PRET__` valait
`undefined` — tout code qui teste `if (window.__AUTH_PRET__)` avant ce
point échoue silencieusement, et tout code qui fait `await
window.__AUTH_PRET__` sur `undefined` ne bloque jamais (JS résout
immédiatement une valeur non-promise). Pattern correct désormais en
place : `window.__AUTH_PRET__ = new Promise((resolve) => {
window.__resoudreAuthPret__ = resolve; })` tout en haut, résolue plus
tard via `window.__resoudreAuthPret__(user)`. Symptômes observés avant
correctif : écran "Consulter un plan existant" jamais affiché
(v2/index.html), dashboard retombant sur le plan de repli par défaut
malgré un vrai plan existant en base (index.html).

## 4. Écrans de l'app principale (`index.html`)

Fonctions de rendu (`render*`) :
- `renderSelecteurPlan` — sélection entre plusieurs plans actifs
- `renderDashboard` — écran d'accueil, résumé de la semaine
- `renderWeeks` / `renderWeekDetail` — vue calendrier et détail semaine
- `renderStatusRow`, `showSessionMenu`, `showMoveMenu`, `showRestoreMenu` — gestion des séances
- `renderStats` — statistiques (ACWR, monotonie de charge, etc.)
- `renderCourse` — page jour de course (horaires, parcours, résultat, stratégie)
- `renderHelp` — aide
- `renderSettings` — profil coureur, records personnels, tokens, notifications, abonnement
- `render` — orchestrateur principal
- `ouvrirSignalementProbleme` — modale accessible via le bouton 🐛 des
  headers, cf. §11
- `renderTestSemiCooperRow` — carte du jour, cf. §14 (Mode Forme sans
  référence)

## 5. Persistance

**localStorage (préfixe `lk_`)** — clés globales (profil/config) :
`lk_profil_coureur`, `lk_strava_token`,
`lk_strava_refresh`, `lk_strava_expires`, `lk_strava_activities`,
`lk_last_sync`. (`lk_github_token`/`lk_gist_id`/`v2_gist_id` retirés le
22/07/2026 avec le reste du système Gist v2, cf. §5 et §11.)

Clés préfixées par plan (via `clePourPlan()`) : `lk_statuses`,
`lk_hidden_sessions`, `lk_swapped_sessions`, `lk_session_notes`, `lk_notes`,
`lk_checklist`, `lk_adaptations_ignorees`, `lk_last_rebuild`,
`lk_pred_history`, `lk_race_goal`, `lk_race_horaires`, `lk_race_parcours`,
`lk_race_result`, `lk_weather_cache`, `lk_coach_msg`, `lk_coach_date`,
`lk_coach_race_msg`, `lk_resultat_test_forme` (résultat du test semi-Cooper
en attente de complétion du bloc, cf. §14).

**Principe** : toute donnée propre à un plan doit être préfixée — une clé
globale non préfixée est un risque de contamination inter-plans.

**Convention `statuses[uid]`** : peut valoir `'—'` (valeur de repli
explicite utilisée à plusieurs endroits de l'app), pas seulement
`undefined`/absent — tout code qui teste "cette séance a-t-elle déjà un
statut" doit vérifier `statuses[uid] && statuses[uid] !== '—'`, pas
`if (statuses[uid])` seul (bug rencontré le 21/07/2026 sur la carte de
test semi-Cooper).

**Supabase** — tables `plans_original` (copie figée), `plans_actif`
(version vivante), `plan_donnees`, `integrations` (colonne `v2_gist_id`,
lue/écrite en brut sans JSON.parse/stringify, contrairement aux autres clés),
`abonnements` (statut de facturation Stripe, cf. §11), `beta_testers`
(candidatures bêta), `signalements` (retours utilisateurs, cf. §11). Sync
Realtime activée sur `plan_donnees` (anti-écho 3s). File d'attente de
sync en cas d'échec réseau (`lk_file_attente_sync`, rejouée au retour
réseau et toutes les 5 min, abandon après 10 essais).

**Sauvegarde de plan — Supabase est l'unique mécanisme de persistance
(22/07/2026)** : le système Gist v2 (`gist-sync.js`, sync par token GitHub
personnel) a été entièrement retiré de `index.html` et du wizard
(`public/v2/index.html`) — bouton "☁️ Sauvegarder" et formulaire de token
supprimés côté wizard, tous les appels `sauvegarderPlan()`/
`chargerPlans()`/`supprimerPlan()`/`renommerPlan()` remplacés par leurs
équivalents Supabase (`mettreAJourPlanSupabase`/`chargerPlansSupabase`,
etc.) ou simplement retirés quand Supabase gérait déjà la même action en
parallèle. `gist-sync.js` reste dans le repo (toujours importé par
`sync-storage.js` pour `trouverPlanEnConflit`, le garde-fou anti-
chevauchement de dates entre plans — fonction pure indépendante de la
persistance elle-même), mais n'est plus utilisé pour aucune écriture/
lecture de plan. **Garde-fou porté vers Supabase** au même moment : un plan
Forme déjà clôturé (`dateCloture` posée) ne peut plus être écrasé via
`mettreAJourPlanSupabase()` — protection qui n'existait qu'au niveau du
Gist jusqu'ici, absente côté Supabase (bug potentiel découvert en
vérifiant l'impact du retrait, corrigé avant qu'il ne cause de régression
réelle).

## 6. Profil coureur (`lk_profil_coureur`)

```
{
  prenom, nom, dateNaissance, anneeNaissance (dérivée), poids, taille,
  fcMax, fcRepos, sexe, pps,
  records: { "5K": {temps, date?}, "10K": {...}, "Semi": {...}, "Marathon": {...} }
}
```

- `dateNaissance` (YYYY-MM-DD) : catégorie d'âge FFA calculée
  (`calculerCategorieAgeFFA()`, bascule de saison au 1er septembre),
  message anniversaire. `anneeNaissance` reste dérivée automatiquement
  pour compatibilité avec le code existant (Tanaka).
- `fcRepos` (bpm) et `sexe` (`'homme'|'femme'|'autre'`) : champs Réglages,
  consommés par le moteur de décision (pondération TRIMP). Repli sur
  'autre' (moyenne des constantes) si non renseigné.
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit à partir du
  profil (sélection du record le plus pertinent, repli Riegel sinon).
- `verifierCoherenceRecord()` : écarte un record si écart >10% à
  l'estimation Riegel moyenne des autres records.
- **Sauvegarde** : un seul point d'entrée réel, `sauvegarderProfilCoureur()`
  (bouton "Enregistrer les paramètres", qui relit tous les champs du
  formulaire avant d'appeler `save()`). Les sélecteurs Niveau et Sexe ne
  doivent JAMAIS appeler `sauvegarderProfilCoureur()` directement au clic
  — seulement mettre à jour l'état local (`profilCoureur.niveau/sexe` +
  `render()`) — sinon un profil incomplet (champs texte pas encore relus)
  écrase Supabase. Bug déjà rencontré et corrigé le 20/07/2026.
- **Un seul compte Supabase Auth par email** — vérifier `Authentication →
  Users` en cas de doute plutôt que de supposer : un profil orphelin (lié
  à un `user_id` qui n'existe plus dans Auth) peut coexister silencieusement
  avec le vrai profil actif, provoquant des erreurs RLS et un affichage
  "profil vide" trompeur (incident réel du 21/07/2026, cause jamais
  formellement identifiée, profil restauré et orpheline nettoyée).

## 7. Moteur de plan (`v2/engine/plan-generator.js`)

Pipeline de génération :
1. `computePhases` — découpage en phases (base, construction, affûtage...)
2. `computeVolumeProgression` — progression du volume hebdo
3. `placerSemaine` — répartition des séances dans la semaine
4. `genererContenuQualite` — contenu détaillé séance qualité (12 sous-types,
   paramétrés par niveau — voir `bibliotheque-seances.md`)
5. `genererContenuLongue`, `genererContenuTest`, `genererContenuRace`
6. `repartirVolumeSemaine`
7. `neutraliserJoursApresCourse` — transforme en repos tout jour de la
   dernière semaine après le jour de course
8. `generatePlan` — orchestrateur

Adaptation dynamique : `calculerScoreSemaine`, `analyserAdaptations`,
`appliquerAdaptations`, `regenererStructuresIntervalles` — excluent toujours
les séances déjà passées.

**Stratégie de jour de course** : `calculerStrategieCourse()` (miroir exact
entre `index.html` et `plan-generator.js`) — bornes km fixes pour
Semi/Marathon (tous les 5km + palier à 35km sur marathon), proportionnel
pour 5K/10K.

**v1-bridge.js (`traduirePlanVersFormatV1`)** — couche de traduction entre
le plan brut (v2) et le format attendu par `index.html`. Tout nouveau champ
personnalisé ajouté sur une séance côté moteur (ex: `estTest`, `sousType`)
doit être explicitement propagé dans cette fonction pour être visible côté
`index.html` — sinon silencieusement perdu, sans erreur (bug rencontré le
21/07/2026 : `estTest`/`sousType` du test semi-Cooper jamais propagés,
rendant le champ de saisie de résultat invisible malgré un plan brut
correct). Mapping `FAMILLE_VERS_TYPE_V1` doit couvrir tout nouveau
`sousType` de séance qualité (ex. `test-semi-cooper` → `TEST`), sinon
repli silencieux vers `SEUIL`.

**Test semi-Cooper pour plan course (22/07/2026)** — même principe que
Mode Forme (`generatePlanAvecTestSemiCooper`/`completerPlanApresTestSemiCooper`,
flux "Je n'ai pas de référence" côté wizard), mais la suite du plan dépend
de `dateCourse` : `completerPlanApresTestSemiCooper` ré-appelle
`generatePlan()` normalement avec `dateDebut` décalé de 7 jours,
`computePhases` recalcule alors `totalSemaines` depuis le temps réellement
restant jusqu'à la course (pas un bloc de taille fixe comme en Forme).

- **Placement du test** : sur le premier jour *utile* de la semaine (date
  réelle ≥ `dateDebut`), pas simplement le plus petit jourIndex de la
  semaine calendaire — sinon le test peut tomber sur un jour neutralisé
  par `traduirePlanVersFormatV1` (jour antérieur à `dateDebut`, si le plan
  démarre en cours de semaine), donc jamais affiché côté dashboard.
- **`estimerReferenceDepuisSemiCooper`** : VMA (km/h) = distance en 6min ÷
  100 (protocole demi-Cooper), puis conversion directe vers un temps 10K
  équivalent via le ratio documenté de la littérature (~90% de la VMA
  tenue sur 10K, `RATIO_VMA_VERS_10K`). Ne passe plus par `PACE_RATIOS.I`
  (calibré sur des séances VMA classiques avec récupération, pas
  équivalent à un effort continu de 6 minutes — chaîner les deux ratios
  sous-estimait fortement le 10K équivalent, bug corrigé le 22/07/2026).
- **`objectif`** recalculé par Riegel depuis le vrai résultat du test
  (jamais la valeur par défaut du champ neutralisé du wizard) — sinon
  fausse l'allure C, `categoriserAmpleurObjectif` et la stratégie de
  course affichée.
- **`paramsOrigine`/`profilOrigine`** conservés sur le plan complété (pas
  mis à `undefined`) avec les vraies valeurs finales — `index.html` lit
  `paramsOrigine.tempsReference` pour l'affichage "Estimation"
  (`BASE_TIME_REFERENCE`), avec un repli codé en dur sur 3021s (50'21")
  si absent.
- **Footings de la semaine 1** recalculés en allure EF réelle une fois le
  test complété (40min à allure EF, via `genererContenuEF`) — jamais le
  jour du test lui-même (déjà réalisé, principe transverse de l'app).
- **Jour "🏁 Jour J — Course !"** ne doit jamais s'afficher sur un plan
  encore `enAttenteTest` (une seule semaine → risque de la traiter comme
  "dernière semaine du plan" = semaine de course) — `jourCourseIndex` mis
  à `null` dans ce cas côté wizard.

**Allures dynamiques (22/07/2026)** — jusqu'ici, les allures E/T/I
(`computeAllures()`) restaient calibrées sur `paramsOrigine.tempsReference`
(référence de forme mesurée à la CRÉATION du plan) pendant toute sa durée,
même quand le prédicteur détectait une vraie progression — un plan visant
45:00 avec une référence de départ à 50:19 gardait des allures calibrées
sur 50:19 tout du long, sans jamais se resserrer vers l'objectif. Nouveau
mécanisme, déclenché à la fin de chaque semaine PAIRE du plan (S2, S4,
S6...) :
- `calculerReferenceCouranteAllures()` (fonction pure, `plan-generator.js`)
  compare l'estimation du prédicteur à celle de la période précédente
  (`predHistory`), avec un seuil de signification de 1% pour ignorer le
  bruit. Progression (estimation plus rapide) → appliquée immédiatement.
  Régression → appliquée seulement si confirmée sur 2 périodes de 2
  semaines CONSÉCUTIVES (state `lk_regression_allures_en_attente`), pour
  éviter de réagir à un accident ponctuel.
- `verifierEtAppliquerAlluresDynamiques()` (`index.html`) orchestre :
  détection de la fin de semaine paire (`currentWeek()`), lecture des deux
  estimations dans `predHistory`, appel à la fonction pure, application
  (régénère `window.__PLAN_BRUT__.allures` via `computeAllures()`,
  sauvegarde Supabase) et notification visible ("📈 Allures mises à jour",
  bandeau dismissible sur le dashboard — jamais silencieux).
- Première comparaison possible dès la fin de S2, contre
  `paramsOrigine.tempsReference` (pas de `null` forcé — correctif du même
  jour, la version initiale bloquait toute détection avant la fin de S4).
- Indépendant d'`appliquerAdaptations()` (qui réagit à des semaines ratées,
  déclenché sur clic explicite) — les deux mécanismes coexistent sans se
  substituer l'un à l'autre.
- **Non testé en conditions réelles** — le premier déclenchement possible
  n'arrive qu'à la fin d'un cycle S2 d'un plan en cours, à surveiller.

## 8. Moteur de décision

5 modules, tous livrés et en production (`engine-classic-scripts/decision-engine-*.classic.js`) :

1. **RunnerStateCalculator** — TRIMP/ACWR/fatigue/confiance/risque à partir
   des vraies données Strava (charge aiguë = 7j, charge chronique = moyenne
   sur fenêtres réellement couvertes si historique <28j). `calculerChargeSeance()` :
   repli `FC_REPOS_DEFAUT=60bpm` si `fcReposReference` absent — sans ce
   repli, le calcul bascule silencieusement de TRIMP vers sRPE
   (`dureeMin × RPE`, échelle bien plus élevée), ce qui a produit un ratio
   ACWR aberrant (1.88 au lieu de ~0.8) en conditions réelles le 20/07/2026.
2. **SessionAnalyzer** — score de réussite d'une séance (FC, allure,
   répétitions dans zone `okPace`)
3. **WeekAnalyzer** — bilan hebdomadaire (volume, séances, charge,
   récupération estimée)
4. **TrendAnalyzer** — 5 détecteurs de signaux sur plusieurs semaines
5. **RuleEngine** — catalogue de règles actif :
   - R-006 (pic de séance), R-024s (fatigue élevée), R-040 (désengagement),
     R-050 (ACWR élevé), R-070 (séances ratées consécutives)
   - **R-060 (tendance fatigue en hausse)** — méthode revue le 22/07/2026 :
     échantillonnage quotidien sur 8 jours (J à J-7) comparé par moitiés
     (moyenne J-7..J-4 vs J-3..J), seuil écart ≥6, au lieu de l'ancienne
     méthode à 3 points (J/J-4/J-7, croissance stricte, seuil ≥8).
     Raison : avec 3 points, une seule séance isolée bien placée pouvait
     satisfaire par hasard la croissance stricte et déclencher une fausse
     alerte — particulièrement probable pour un coureur à faible fréquence
     (2-3 séances/semaine), où la fatigue reste "en plateau" entre deux
     séances (le ratio ACWR ne varie qu'aux dates avec activité). La
     comparaison par moitiés amortit ce cas (une moyenne sur 4 jours n'est
     pas basculée par un seul point) tout en détectant aussi bien les
     vraies tendances progressives. Ne touche à aucune logique de
     `calculerCharge()`/ACWR (Module 1) — R-060 échantillonne seulement à
     des dates différentes la métrique `fatigue` déjà calculée là-bas.
   - R-062 (fatigue persistante 3 semaines, priorité 82)
   - R-080 (déficit volume durable, 3 semaines ≤−10% vs plan, priorité 52)

`DecisionEngineApply` + carte UI : détection automatique, application sur
clic explicite uniquement, `reduire_charge` cible EF/LONGUE/RECUP en
priorité, séances de qualité en second recours si aucune EF/LONGUE
disponible cette semaine (réduction structurelle du nombre de
répétitions/blocs, jamais l'allure ni la récup — cf. plus bas). Garde-fous
anti-cumul : −30% max par décision, plafond cumulé 25%/14j glissants
(journal `planBrut.historiqueReductionsMoteur`, sur l'ampleur RÉELLEMENT
appliquée, pas la demandée).
**Titre de la carte** distingue désormais deux cas (22/07/2026) : "Yoria
te propose un ajustement" uniquement quand une vraie action est possible
(`reduire_charge`, bouton Appliquer visible) ; "Yoria a repéré un signal à
surveiller" pour les décisions purement informatives (`alerter_*`, R-060/
R-062, seul "Ignorer" disponible) — l'ancien titre unique était trompeur
pour ce second cas.

**Réduction structurelle des séances qualité** (23/07/2026) : ne touche
jamais à l'allure ni à la récup — seul le nombre de répétitions/blocs est
réduit, jamais sous le plancher `base(niveau, sousType)` (justifié par la
littérature de périodisation, redémarrage conservateur à chaque
mésocycle — cf. `bibliotheque-seances.md` §42). Trois sous-cas :
bloc unique répété (i-3min, seuil, vitesse...) → retire des répétitions ;
pyramide → retire des paliers depuis la fin, plancher = pyramide
`debutant` (`[2,3,4]`) quel que soit le niveau réel ; i-30-30 → réduit
`repsParSerie` en premier, `nbSeries` seulement en dernier recours. Les
séances à bloc continu unique (tempo-court, seuil-negatif) n'ont pas de
structure à casser, traitées comme EF/LONGUE (réduction linéaire simple).
L'ampleur réellement appliquée (après arrondi à l'unité entière la plus
proche) diffère souvent de l'ampleur demandée par la règle — c'est cette
valeur réelle qui alimente `kmEstime` et le journal de cumul, jamais la
brute. Tables `base`/`cap` par sous-type/niveau dupliquées depuis
`plan-generator.js` dans `decision-engine-apply.classic.js` (elles n'y
sont pas exportées, déclarées localement dans chaque `case` du switch) —
risque de divergence documenté en commentaire, à répercuter si
`plan-generator.js` change une valeur `base`. Validé par 29 tests
unitaires + test en conditions réelles navigateur (clone du plan).

Coach IA branché sur le moteur : lit `RunnerState`/`EngineDecision` du jour,
ne recalcule jamais un ratio séparé, peut commenter la décision mais jamais
en produire une différente.

Monotonie d'entraînement (Foster 1998) : calculée et affichée dans Stats,
sans règle d'alerte (pas de seuils validés pour coureurs récréatifs).

**Prédicteur d'estimation 10K** (`predict10K()`, `index.html`) — distinct
des 5 modules ci-dessus mais lit les mêmes données (`ALL_SESSIONS`,
`statuses`). Deux couches (22/07/2026, refonte "convergence
progressive") :
- **Borne brute** (`borneBrute`, ex-"estimate") : mesure physio pure, non
  lissée — moyenne pondérée SPEC (poids 0.45, allure directe), VMA (0.35,
  vitesse×0.87), SEUIL (0.10, Riegel — contribue seulement à partir de 3
  séances ; formule connue pour être structurellement pessimiste sur cette
  source précise, pas encore corrigée, cf. chantiers ouverts), combinée à
  `BASE_TIME_REFERENCE` via `lavendouWeight` (poids de la référence,
  décroît linéairement de 90% à 10% sur 8 semaines, garde-fou 50% si
  aucune séance VMA/SPEC dans les 3 dernières semaines). Garde-fou
  d'exclusion : source écartée si écart >20% vs `BASE_TIME_REFERENCE`.
- **Estimation affichée** (`estimate`) : ne saute plus directement à
  `borneBrute` à chaque séance — part de `BASE_TIME_REFERENCE` en début de
  plan et converge par petits pas (`PAS_CONVERGENCE_BASE=0.15`, modulé par
  `fiabilitePlanPonderee()`) à chaque nouvelle séance de qualité
  (SEUIL/VMA/SPEC) réussie ou partielle. Clampée entre `BASE_TIME_REFERENCE`
  et `borneBrute` — ne peut jamais dépasser ce que les séances mesurent
  réellement. Corrige le comportement pré-22/07/2026 où une séance de
  qualité réussie pouvait dégrader l'estimation affichée (cas réel : un
  3ᵉ seuil réussi avait fait reculer l'estimation de 49'22" à 49'31" à
  cause du poids Riegel pessimiste de SEUIL).
- **`fiabilitePlanPonderee(dateStr)`** : taux de réussite sur TOUTES les
  séances (pas seulement qualité — une EF/LONGUE ratée est un vrai signal
  de fatigue qui doit freiner la convergence même sans donnée de vitesse),
  pondéré par récence sur toute la durée du plan (demi-vie 21 jours,
  ✅=1/⚠️=0.5/❌=0). Fiabilité 0 → convergence gelée.
- **Bande de tolérance affichée dans le graphe Stats** : incertitude
  autour de l'estimation (`±margin`, `margin = (1-confidence/100)×90s`),
  pas l'intervalle `BASE_TIME_REFERENCE↔borneBrute` — ce dernier est
  structurellement plat en début de plan (borneMax=BASE tant que peu de
  données), donnait une bande plaquée contre le haut du graphe plutôt
  qu'un vrai relief symétrique (retour utilisateur après premier essai).
- **Historique rejoué rétroactivement** : `rebuildPredHistorySequentielle()`
  (remplace l'ancienne boucle indépendante `predict10KAtDate` par jour) —
  applique la même convergence jour par jour depuis le début du plan,
  nécessaire car chaque jour dépend de la veille. `calculerBorneBruteAtDate`
  (ex-`predict10KAtDate`) calcule la borne brute à une date donnée en
  réutilisant `weightedAvgByEffortDuration()` (extrait de `predict10K()` en
  fonction top-level partagée le 22/07/2026 — la version précédente était
  simplifiée et OUBLIAIT SEUIL entièrement, bug réel découvert sur un compte
  de test avec séances SEUIL+VMA validées : la convergence restait figée
  sur `BASE_TIME_REFERENCE` malgré des séances de qualité, le graphe Stats
  affichant une ligne plate). `PREDICTOR_VERSION` (actuellement 8) déclenche
  la reconstruction automatique au chargement si incrémentée — nécessite un
  geste manuel (incrémenter la constante) à chaque changement de méthode de
  calcul, rien d'automatique ne détecte qu'une formule a changé.
- **Source SEUIL — formule Daniels-Gilbert (VDOT) depuis le 22/07/2026** :
  remplace Riegel, qui traitait une allure seuil (sous-maximale par nature,
  86-88% VO2max chez Daniels, tenable ~60min en course) comme si c'était
  une performance maximale — sous-estimait systématiquement la vitesse 10K
  réelle (écart mesuré ~4min sur un cas réel : 52'58" en Riegel contre
  49'15"-49'02" en VDOT pour la même séance). Nouvelles fonctions pures dans
  `plan-generator.js` : `vo2FromVelocity`/`velocityFromVo2` (coût O2 ↔
  vitesse), `pctVo2MaxPourDuree` (courbe de durée Daniels-Gilbert),
  `vdotDepuisEffortSousMaximal`/`vitesseDepuisVdotEtDistance` (assemblage
  complet). Équations vérifiées par recherche web (chapitre 5 du livre,
  "VDOT System of Training", absent du fichier projet fourni — seuls les
  chapitres 1-4 sont disponibles), cohérentes avec plusieurs calculateurs
  VDOT tiers indépendants et avec les % VO2max déjà confirmés dans le
  chapitre 4 (seuil 86-88% VO2max, tenable ~60min).
- **Bug racine "convergence figée" (22/07/2026, résolu)** — après plusieurs
  correctifs partiels dans la même journée (fix SEUIL manquant, fix VDOT,
  fix condition de déclenchement, fix repli `sport_type`), l'estimation
  restait bloquée sur `BASE_TIME_REFERENCE` malgré 3 séances SEUIL validées
  — graphe Stats plat de bout en bout. Cause racine trouvée par
  instrumentation directe (logs temporaires en production, méthode utilisée
  faute d'accès aux variables de module depuis la console navigateur) :
  `fiabilitePlanPonderee(dateStr)` lisait `s.statutEffectif`, un champ
  **FIGÉ** calculé une seule fois par `recalculerAllSessions()` par rapport
  à `today()` réel — jamais recalculé pour les dates passées simulées dans
  `rebuildPredHistorySequentielle()` (boucle jour par jour depuis le début
  du plan). Résultat : fiabilité mesurée à 0 dès les premiers jours du plan
  (peu de séances encore passées par rapport à `today()`, indépendamment de
  la date simulée), bloquant tout pas de convergence dès la première
  itération — et comme `estimateCourante` est séquentielle (chaque jour
  dépend du précédent), ce blocage initial se propageait à toute la
  séquence, y compris les dates ultérieures où la fiabilité aurait dû être
  bonne. Corrigé : `fiabilitePlanPonderee()` recalcule maintenant
  `statutEffectif` localement, PAR RAPPORT À `dateStr` (paramètre), au lieu
  de lire le champ figé — comportement inchangé pour l'appel avec
  `today()` (calcul en direct, `predict10K()`), corrigé uniquement pour la
  reconstruction rétroactive. `PREDICTOR_VERSION` 12. Confirmé résolu :
  graphe affiche une vraie descente progressive après ce fix, pas juste un
  saut final.
- **Repli `sport_type` sur les filtres d'activités** (22/07/2026, fix
  intermédiaire, toujours valide) : `a.type === "Run"` seul ratait
  certaines activités selon la source de synchro (montres tierces
  notamment) — corrigé en `a.type === "Run" || a.sport_type === "Run"`
  dans `predict10K()`, `calculerBorneBruteAtDate()`,
  `aDesNouvellesDonneesQualite()`, `matchActivitiesToPlan()`. N'était pas
  la cause du bug racine ci-dessus (vérifié par diagnostic : les 3
  activités de Laurent avaient bien `type: "Run"`), mais reste une
  vraie correction de robustesse à conserver.
- **Convergence n'avance que sur nouvelle donnée du jour** (22/07/2026,
  fix intermédiaire, toujours valide) : `predict10K()` utilisait
  `estimates.length > 0` (vrai dès qu'au moins une source existe au
  global) au lieu de `aDesNouvellesDonneesQualite(todayStrConv)` (vrai
  uniquement si une séance de qualité a réellement lieu aujourd'hui) —
  l'estimation avançait donc d'un petit pas à chaque simple chargement du
  dashboard, pas seulement sur une vraie nouvelle séance. Corrigé,
  unifié avec la logique déjà utilisée par la reconstruction rétroactive.

**Non couvert / reporté** :
- Saisie de plaisir par séance (PACES-S) — EngagementCalculator tourne sur
  régularité comportementale seule
- R-062/R-070/R-080 jamais observées sur données réelles de Laurent — à
  surveiller
- Convergence progressive — maintenant confirmée fonctionnelle en
  conditions réelles (22/07/2026, graphe descendant observé après le fix
  du bug racine ci-dessus), mais le rythme du pas
  (`PAS_CONVERGENCE_BASE=0.15`) reste à éprouver sur plusieurs semaines
  pour juger s'il est bien calibré (ni trop lent, ni trop rapide).
- Chapitre 5 du livre Daniels ("VDOT System of Training", tables complètes)
  absent du fichier projet fourni à Claude — la formule VDOT implémentée le
  22/07/2026 a été reconstruite à partir des équations Daniels-Gilbert
  vérifiées par recherche web, pas directement lue dans le livre fourni ;
  fiable mais pas garantie identique à 100% aux tables publiées.
- Méthode de diagnostic à retenir : aucune variable interne (`ALL_SESSIONS`,
  `statuses`, `PLAN`, `SESSION_TARGETS`, les fonctions du prédicteur) n'est
  exposée sur `window` pour un debug depuis la console navigateur — seuls
  `window.__PLAN_BRUT__`, `window.__PLAN_GENERE__`, `window.stravaActivities`
  et le contenu de `localStorage` (préfixé par plan) sont accessibles de
  l'extérieur. Pour un diagnostic profond, l'instrumentation directe
  (logs temporaires poussés en production, retirés une fois la cause
  identifiée) reste la méthode la plus fiable — cf. procédure suivie le
  22/07/2026 pour ce bug.

**Bug "0 séance sur 14 jours" (résolu le 22/07/2026)** : cause la plus
probable identifiée — `autoSync()` (auto-synchro Strava) ne se
redéclenchait que si `lastSyncTime` datait de plus d'1h, sans jamais
vérifier si `stravaActivities` était réellement peuplé. Si ces deux
données se retrouvaient incohérentes entre elles (ex. lors d'une
interruption de session), le moteur tournait silencieusement sur un
historique vide, potentiellement longtemps. Corrigé : l'auto-synchro se
déclenche aussi si `stravaActivities` est vide, même si la sync est
récente. Hypothèse cohérente avec le code, pas reproduite explicitement
en conditions réelles — à surveiller si le message réapparaît malgré ce
fix.

## 9. Saisie manuelle, RPE et statuts de séance

**Saisie manuelle** : bouton "Annuler" (réinitialise + relance sync Strava),
champ "durée totale" pour séances de qualité, exclusion Strava complète
quand saisie manuelle existe (injection `ActivitySample` synthétique).

**RPE** : source unique `sessionRpe[uid]`, sélecteur 5 niveaux
(🙂😐😓😣🥵) mappés CR-10, visible dès qu'un statut ✅/⚠️/❌ est posé,
pondération TRIMP +12% si RPE ≥ 8. Libellé affiché en dur sous l'icône
sélectionnée après clic (pas de tooltip seul, ne marche pas sur mobile).

**Statuts de séance** (`SOPTS`) : `—` / `✅` / `❌` / `⚠️` / `😴`, indexés
par `uid` (`week-slotIdx`) dans `statuses`. Une séance ne peut plus être
supprimée du plan (bouton retiré le 22/07/2026, demande explicite de
Laurent) — seul un statut la caractérise. `hiddenSessions`/`showRestoreMenu`
restent dans le code pour compatibilité avec les séances masquées avant ce
changement, sans nouveau point d'entrée.

**`statutEffectif` (22/07/2026)** — calculé de façon centralisée dans
`recalculerAllSessions()`, disponible sur chaque objet `ALL_SESSIONS` :
égal au vrai statut saisi (`statuses[uid]`) s'il existe, sinon `"😴"`
automatiquement pour tout jour **déjà passé** (`date < today()`, jamais le
jour même) sans saisie. Jamais écrit dans `statuses[uid]` lui-même — reste
purement un calcul d'affichage, ne peut jamais écraser une vraie saisie
tardive. Avant ce changement, un calcul équivalent n'existait que
localement dans `renderWeekDetail()` (le badge de statut), invisible du
reste de l'app — stats, moteur de décision et garde-fous du swap
continuaient de lire `statuses[uid]` brut, ignorant les séances
auto-repos. Point de vigilance : `recalculerAllSessions()` est appelée une
première fois avant que `statuses` (`let`, déclarée plus loin dans le
fichier) soit initialisée — accès protégé par un vrai `try/catch` (pas
`typeof`, qui ne protège pas d'une temporal dead zone `let`/`const` du même
scope — cause d'un bug d'écran blanc corrigé le 22/07/2026).

**Audit complet des lecteurs de `statuses[uid]` (22/07/2026, chantier
clos)** — les ~30 occurrences de `statuses[uid]` dans `index.html` passées
en revue une par une. Deux vrais bugs trouvés et corrigés :
`fiabilitePlanPonderee()` (excluait totalement les séances passées jamais
cochées du calcul de fiabilité au lieu de les compter comme un signal de
désengagement — faussait potentiellement la convergence du prédicteur et
les allures dynamiques) et `obtenirSeancesPlanifieesManquees()` (R-070 du
RuleEngine, même défaut — ne détectait jamais un enchaînement de séances
"ratées" quand elles étaient simplement oubliées plutôt que cochées ❌).
Bilan semaine (compteur 😴) et export PDF (détail par semaine) également
corrigés pour cohérence d'affichage. Les ~26 autres occurrences vérifiées
sont correctes par construction, regroupées en 4 catégories légitimes qui
doivent rester sur le statut BRUT : boutons de sélection/écriture du
statut lui-même, contexte "aujourd'hui" (le 😴 auto ne s'applique jamais au
jour même par définition), compteurs stricts ✅/⚠️/❌ (une séance non
cochée n'égale déjà aucun de ces statuts, donc correcte sans changement),
et les gardes du swap (déjà réécrites le même jour avec un calcul local
équivalent à `statutEffectif`).

**Échange de séances (swap, `swappedSessions[uid] = uidB` bidirectionnel)**
— étendu le 22/07/2026 : `getAvailableSlots()` propose désormais tous les
jours de la semaine comme cible, pas seulement les jours repos/masqués
(demande explicite de Laurent : "swap 2 séances existantes, même si ce
n'est pas un repos"). Bloqué dans les deux sens (source et destination) si
la séance a un statut posé, une note, un RPE, une saisie manuelle, **ou**
si le jour est passé sans saisie (`statutEffectif` = 😴 implicite) — ces
données restent indexées par `uid` (position calendaire), pas par le
contenu de la séance, donc un swap les laisserait accrochées au mauvais
jour après échange.

## 10. Import FIT

`adapterFitVersFormatActivite()`, `chargerFitParser()` (import ESM
dynamique depuis jsDelivr, pas de build UMD/browser), `importerFichierFit()`.
`vitesseFiable()` calcule toujours depuis distance/temps, jamais
`avg_speed` du fichier FIT (peut être faux sur Amazfit/Zepp).

## 11. Intégrations externes

**Strava** (Client ID `260339`) — OAuth via `api/strava.js`. Client :
`v2/engine/strava.js`. Sync conditionnelle sur `dataSource === "strava"`
via paramètre `force` (syncs auto respectent le garde, actions explicites
passent `force: true`). Comparaison séance programmée vs laps réels filtrée
par allure cible ±15%. Token invalide/révoqué détecté explicitement
(`activities?.errors?.some(e => e.field === "access_token" && e.code ===
"invalid")`, `stravaAuthInvalide`) — message "Connexion Strava expirée"
avec bouton "🔄 Reconnecter Strava", affiché sans auto-effacement tant que
non résolu (contrairement aux messages de sync ordinaires).

**Météo** — proxy Open-Meteo (`api/weather.js`), gratuit, sans clé.
Paramètre `type=forecast|current|historical` (forecast = défaut,
rétrocompatible). Géolocalisation selon l'usage : dernière activité Strava
avec GPS pour la météo actuelle/passée (repli position par défaut sinon),
position live du navigateur pour la prévision J+1 (alerte chaleur avant
séance, `v2/engine/weather.js`) — deux besoins légitimement différents,
pas un doublon.

**Coach (messages courts)** — `api/coach.js`, proxy Claude Haiku 4.5.

**Sync multi-device** — Supabase (auth par compte email/mot de passe),
seul mécanisme depuis le 22/07/2026 (Gist v2/GitHub token entièrement
retiré, cf. §5). Aucune action de l'utilisateur nécessaire au-delà de se
connecter avec le même compte sur chaque appareil.

**Stripe (abonnements, v2.5)** — Produit "Yoria Premium" (7€/mois,
`STRIPE_PRICE_ID`, et tarif annuel `STRIPE_PRICE_ID_ANNUAL`), mode Checkout
hébergé (jamais de formulaire carte natif dans la TWA, conforme politique
Google Play sans programme "alternative billing"). Table Supabase
`abonnements` (`user_id` nullable, `email`, `stripe_customer_id`,
`stripe_subscription_id`, `subscription_status`, `price_id`) avec RLS
lecture seule pour le propriétaire — les écritures passent uniquement par
les endpoints serverless (clé `service_role`, contourne RLS).

- `api/stripe-checkout.js` : vérifie le token Supabase (`Authorization:
  Bearer`), retrouve ou crée le `stripe_customer_id` (par `user_id` puis
  par `email` en repli — cas beta testeur déjà lié), crée la session
  Checkout, retourne l'URL à ouvrir dans le navigateur externe.
  Redirection `yoria.run/?stripe=succes|annule`.
- `api/stripe-webhook.js` : `bodyParser` désactivé (body brut requis pour
  la vérification de signature HMAC-SHA256, faite nativement via Web
  Crypto, sans dépendance npm `stripe`). Écoute
  `checkout.session.completed`, `customer.subscription.created/updated`,
  `customer.subscription.deleted` — met à jour `subscription_status`
  (mapping des statuts Stripe vers `active`/`past_due`/`canceled`/`none`).
- Routes `/api/stripe-checkout` et `/api/stripe-webhook` déclarées
  explicitement dans `vercel.json` (routing en whitelist — toute nouvelle
  route API doit y être ajoutée, sinon 404 silencieux vers `public/`).
- Bouton "S'abonner" dans Paramètres (section "💳 Abonnement", en fin de
  page) : lecture du statut via `window.__abonnementStatutCache__`
  (initialisé une seule fois par session pour éviter un fetch + `render()`
  en boucle infinie — bug rencontré et corrigé le 21/07/2026). Invalidé
  une fois au retour `?stripe=succes` pour refléter immédiatement le
  nouveau statut sans F5 manuel.
- **Abonnements gratuits (beta testeurs et au-delà)** : bon de réduction
  Stripe 100% répétitif (jamais nommé "beta" dans Stripe pour rester
  réutilisable au-delà de la bêta), appliqué via `discounts[0][coupon]`
  (paramètre `coupon` seul rejeté sur les comptes en `billing_mode:
  flexible`, le défaut Stripe actuel). Déclenché depuis `beta-admin`
  (action `create_free_subscription` sur `api/beta-admin.js`) : recherche
  ou crée le client Stripe par email, crée l'abonnement avec le coupon,
  upsert `abonnements`. Liaison automatique au `user_id` dès que le
  testeur crée son compte Yoria avec le **même email** que sa
  candidature — condition impérative à communiquer au testeur.

**Signalements utilisateurs** — bouton 🐛 dans les headers de `index.html`
(`ouvrirSignalementProbleme()`) : sélecteur de type (Bug/Donnée
incorrecte/Suggestion/Autre) + description libre. Double écriture à
chaque envoi :
- **Sentry** (`Sentry.captureMessage`, best-effort, contexte technique
  brut — vue, planId, url — dans le message, jamais en second argument
  objet, cf. §15)
- **Table Supabase `signalements`** (`type`, `message`, `contexte` en
  `jsonb`, `user_id`/`email`, `statut`, `sentry_event_id` pour faire le
  lien entre les deux) — source de vérité pour le triage humain, RLS
  limitée à `insert` côté client (aucune lecture/écriture publique en
  dehors de la création).

Administration dans `beta-admin` (onglet "🐛 Signalements", `api/beta-
admin.js` action `update_signalement_statut`) : liste filtrable par type
et statut, changement de statut (`nouveau`/`en_cours`/`resolu`) via
`<select>` inline par ligne. Sentry reste l'outil de diagnostic technique
(stack traces, erreurs JS) ; `signalements` est l'outil de suivi produit
(triage humain, statut).

## 12. Authentification Supabase

Auth email/mot de passe (pas de Google/Apple sign-in). Variables
`SUPABASE_URL`/`SUPABASE_ANON_KEY` exposées via `api/config.js`
(`fetch('/api/config')` avant création du client, `supabaseReady` à
attendre). Migration douce depuis anciennes clés localStorage.

`LkSync.precharger(userId, planId)` (`sync-storage.js`) : réhydrate
`localStorage` depuis Supabase avant que `window.__AUTH_PRET__` ne se
résolve. Renvoie `{ok, echecChargementProfil}` — si la requête
`profils_coureur` échoue (réseau/RLS/timeout), `echecChargementProfil`
passe à `true` et **aucun throw** n'est levé (un throw casserait tout le
login sur une erreur transitoire). Point de vigilance critique :
`index.html` ne doit jamais déclencher l'écran de bienvenue si
`echecChargementProfil` est vrai — sinon un `localStorage` non réhydraté
(faute d'échec réseau) est pris à tort pour "profil jamais renseigné", ce
qui écrase ensuite le vrai profil Supabase avec un profil minimal une
fois l'onboarding validé. Bug réel rencontré et corrigé le 20/07/2026.

Voir aussi §3 pour la race condition `window.__AUTH_PRET__` (assignation
tardive) corrigée le 21/07/2026.

## 13. Publication Play Store (TWA Android)

- Package : `app.vercel.plan_10k_alpha.twa` (identifiant permanent,
  volontairement inchangé)
- Domaine associé : `yoria.run` (migré depuis `yoria-running.vercel.app`)
- Piste "Tests fermés - Alpha" active, Laurent testeur confirmé
- App en plein écran sans barre de navigation, confirmé
- Icône PWA Chrome bloquée via `beforeinstallprompt` + `preventDefault()`
  (évite la double-icône TWA/PWA)
- Build/signature : voir §"Build TWA Android" dans les mémoires de session
  (procédure figée, keystore critique à ne jamais perdre)

## 14. Mode Forme (v2.6)

Cycle glissant sans date de course, réutilise les briques génériques de
`plan-generator.js` (`placerSemaine`, `genererContenuEF/Longue`,
`repartirVolumeSemaine`, `computeFcMaxTanaka`, `computeZonesFC`) —
n'importe jamais `computePhases`/`ROTATION_SOUS_TYPE`/`placerSeanceTest`/
`placerSeanceCourse`. Câblé de bout en bout (wizard + index.html).

**Déclenchement du bloc suivant** — FAIT le 21/07/2026. Bandeau semi-
automatique au Dashboard ("🔁 Ton bloc de 4 semaines est terminé"),
affiché quand la dernière séance du plan est passée (détection par date,
pas par statut des séances — cohérent avec le principe transverse de
l'app). Au clic, `genererBlocSuivant()` (`plan-forme.js`) reconstruit
`profil`/`params` depuis `localStorage` + le plan courant (mêmes limites
que `changerPalierGrandDebutant` : `profilOrigine`/`paramsOrigine` non
stockés sur le plan résultant), repart du bon volume (ignore la décharge
si la dernière semaine en était une).

**Test semi-Cooper — flux "je n'ai pas de référence"** — FAIT le
21/07/2026. Pour un coureur sans temps de course récent à donner :
- Formule : `VMA (km/h) = distance parcourue en 6min (m) / 100` (protocole
  "demi-Cooper"), convertie en temps 10K équivalent via `PACE_RATIOS.I`
  (`estimerReferenceDepuisSemiCooper()`, `plan-forme.js`)
- `generatePlanFormeAvecTest()` : génère uniquement la semaine 1
  (`enAttenteTest: true` sur le plan) — le jour normalement dévolu à la
  séance qualité devient le test (6min effort max), tous les autres jours
  deviennent des footings libres sans allure chiffrée (aucune référence
  disponible à ce stade pour calculer quoi que ce soit)
- Résultat capté sur la carte du jour (`renderTestSemiCooperRow`,
  `index.html`) : détection Strava automatique via `getLapsAffichage`
  (réutilise le même mécanisme que les séances qualité classiques — la
  montre doit être programmée en 3 laps manuels), repli sur saisie
  manuelle de la distance. Stocké dans `lk_resultat_test_forme`.
- `completerBlocApresTest()` (`plan-forme.js`) génère les semaines 2 à N
  avec les vraies allures, déclenché par un bandeau semi-automatique au
  Dashboard ("🎯 Ton résultat est prêt")
- Bouton "Je n'ai pas de référence" dans le wizard (`v2/index.html`,
  étape temps de référence), désactive visuellement les champs
  temps/distance, route `genererPlanFormeUI()` vers
  `generatePlanFormeAvecTest()` au lieu du flux normal

**Sélecteur de distance de référence** — FAIT le 21/07/2026. Le champ
temps de référence du wizard Forme ne précisait jamais explicitement la
distance associée (bug : `refDistance` codé en dur à `'10K'`, faussant le
calcul si le temps donné venait d'une autre distance) — sélecteur compact
5K/10K/Semi/Marathon ajouté juste au-dessus du champ temps
(`currentDistForme`/`selectDistForme()`).

## 15. Principes transverses à retenir

- **Inventaire à jour à chaque push structurel** (pas pour un simple fix)
- **Préfixage des données de plan obligatoire** (`clePourPlan()`)
- **Une seule variable modifiée à la fois** pour la progressive overload
- **Niveau intermédiaire = valeur historique inchangée** à chaque
  différenciation par niveau (zéro régression)
- **Validation historique avant codage** pour toute nouvelle métrique
  (vérifier sur les données réelles de Laurent avant d'investir)
- **Jamais d'apostrophe dans une chaîne JS entre guillemets doubles**
  (échec silencieux du parseur) ; `node --check` systématique avant push
- **404 sur une route API** → vérifier `vercel.json` en premier
- **Toute modification d'un plan existant doit exclure les séances
  passées** — pas un garde-fou générique, à implémenter dans chaque
  nouvelle fonctionnalité qui touche `plans_actif`
- **Cache client mis à jour de façon async (fetch + `render()`) : bien
  distinguer `undefined` (jamais initialisé) de `null`/valeur connue** —
  un `if` qui réinitialise trop tôt à une valeur non-`undefined` empêche
  le déclenchement du fetch réel (bug rencontré sur le cache abonnement,
  21/07/2026)
- **Toute promesse globale attendue ailleurs (`window.__AUTH_PRET__` et
  équivalents futurs) doit être créée de façon synchrone, avant tout
  `await`** — sinon risque de race condition où le code qui l'attend la
  trouve `undefined` (cf. §3, bug corrigé le 21/07/2026 dans les deux
  fichiers principaux)
- **Toute fonction de traduction entre formats (`v1-bridge.js` et
  équivalents) doit être mise à jour à chaque nouveau champ personnalisé
  ajouté sur une séance** — sinon le champ est silencieusement perdu sans
  erreur (cf. §7, bug `estTest`/`sousType` du 21/07/2026)
- **Toute fonction qui modifie/supprime un plan doit traiter Supabase
  comme bloquant et Gist comme best-effort**, jamais l'inverse (cf. §5)
- **Ne jamais toucher** `public/beta/`, `api/beta.js`, routes `/beta*`
  sans demande explicite

## 16. État des chantiers ouverts

| Chantier | Statut |
|---|---|
| Réduction d'intervalles pour séances qualité | 🔜 Session de conception dédiée nécessaire |
| Saisie plaisir par séance (PACES-S) | 🔜 Reporté |
| Republier piste "V2" Play Console | 🔜 Pas urgent, Alpha suffit pour Laurent |
| Passage Stripe en clés live (commercialisation réelle) | 🔜 Quand prêt à lancer publiquement |
| Validation empirique de `RATIO_VMA_VERS_10K` (0.90) et `PACE_RATIOS.E` (1.225) | 🔜 Corrigés le 22/07/2026 sur base théorique (littérature demi-Cooper) faute de vraies données — à revalider avec le premier vrai test semi-Cooper couru par Laurent (pas simulé) une fois disponible. |
| Refonte swap : écrire directement dans `plan_actif` au lieu de `swappedSessions` séparé | 🔜 Discuté le 22/07/2026 (suggestion de Laurent) — éliminerait la classe de bug déjà rencontrée (oublier d'appliquer le swap à un nouvel endroit). Complexité identifiée avant de s'y lancer : annulation d'un swap (garder une trace de l'état d'origine), interaction avec les régénérations de plan (bloc suivant, adaptation, complétion post-test — risque d'écraser silencieusement un swap), séparation `plans_actif`/`plans_original`, chemin de sauvegarde (bloquant `LkSync` vs `save()` fire-and-forget actuel), interaction avec le moteur de décision (`reduire_charge` sur une séance swappée) et le jour du test semi-Cooper. Pas commencé. |
| App native (Capacitor) pour publication iOS | 🔜 Piste identifiée le 22/07/2026 (Laurent envisage la publication grand public) — Capacitor recommandé plutôt qu'un rewrite natif complet (React Native/Flutter), permettrait de réutiliser le code web existant quasi tel quel pour Android ET iOS. Pas de code, discussion uniquement. Pas urgent tant qu'aucun besoin iOS confirmé — TWA actuelle suffit pour Android grand public (Google ne pénalise pas ce mode de publication). |
| Passage du repo GitHub en privé | 🔜 Décidé le 22/07/2026 : repo reste PUBLIC pendant le développement solo/bêta (économise des tokens pour Claude — lecture directe via `raw.githubusercontent.com`), bascule en privé prévue juste avant la commercialisation/lancement public, pour protéger le code métier différenciant (moteur de décision, calibrations) sans gêner le rythme de travail actuel. Vérifié : Vercel et le connecteur MCP GitHub (déjà authentifiés) continueront de fonctionner sans changement après le passage en privé. |
| Convergence progressive et fix VDOT SEUIL — observation en conditions réelles | 🔜 Les deux chantiers du 22/07/2026 (convergence progressive du prédicteur, remplacement Riegel→VDOT pour SEUIL) sont en production mais pas encore éprouvés sur plusieurs semaines réelles — à surveiller, notamment le rythme du pas de convergence (`PAS_CONVERGENCE_BASE=0.15`, potentiellement trop lent) et la fidélité de la formule VDOT reconstruite (chapitre 5 du livre absent du fichier projet fourni, formule vérifiée par recherche web plutôt que lue directement). |

Pour l'historique des versions livrées et des correctifs, voir
`changelog.classic.js`. Pour le détail méthodologique des séances, voir
`bibliotheque-seances.md`.
