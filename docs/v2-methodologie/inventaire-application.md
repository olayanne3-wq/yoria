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
- `renderHelp` — aide (refonte du contenu le 24/07/2026, cf. plus bas)
- `renderSettings` — profil coureur, records personnels, tokens, notifications, abonnement
- `render` — orchestrateur principal
- `ouvrirSignalementProbleme` — modale accessible via le bouton 💬 des
  headers (icône changée le 24/07/2026, ex-🐛 jugé peu clair pour un
  usage englobant bug/donnée incorrecte/suggestion, pas seulement les
  bugs techniques)
- `renderTestSemiCooperRow` — carte du jour, cf. §14 (Mode Forme sans
  référence)

**Aide (24/07/2026)** — `renderHelp()` réorganisé par intention plutôt que
par écran : Démarrer / Comprendre les écrans / Comprendre le moteur Yoria
(estimation, IE, cadence, RPE, readiness, carte d'ajustement, allures
dynamiques) / Types de plan (Course, Mode Forme, Grand débutant) / Sources
de données / FAQ. Accès factorisé via `boutonAide()` (réutilisé sur le
dashboard et ajouté au header générique `hdr` des vues secondaires) —
visible sur chaque onglet désormais, plus seulement depuis le dashboard.

**Barre de navigation — conteneur séparé (24/07/2026)** — `nav` est montée
dans `#nav-root`, un conteneur HTML distinct de `#app`, via
`document.getElementById("nav-root").replaceChildren(nav)`. Avant, `nav`
était un enfant de `#app`, donc détruite par `app.innerHTML=""` en début de
`render()` puis reconstruite quelques lignes plus loin — le navigateur
pouvait peindre une frame sans barre de navigation entre les deux,
provoquant un flash visible à chaque changement d'onglet. `replaceChildren()`
sur un conteneur jamais vidé par ailleurs élimine cette frame intermédiaire.
Correctif lié : `setView()` appelle désormais `window.scrollTo(0,0)`
**avant** `render()` (pas après), pour éviter un léger saut de position de
la barre pendant l'instant où le nouveau contenu est affiché avec l'ancien
scroll encore actif.

**Swipe horizontal entre onglets (24/07/2026)** — actif uniquement sur les
vues présentes dans `NAV` (pas `weekDetail`, pas `help`), attaché sur
l'élément `content` à chaque `render()` (jamais accumulé, `content` est
recréé à chaque appel). Détection par direction dominante du geste
(comparaison deltaX/deltaY dès le déclenchement, pas de zone d'écran
dédiée) pour ne jamais interférer avec le scroll vertical. Seuil 50px.
Périmètre volontairement limité aux onglets principaux — pas de swipe
entre semaines dans `weekDetail`, pour éviter toute ambiguïté de geste
avec une future navigation propre à cet écran.

**`predict10K()` calculé à la demande (24/07/2026)** — auparavant appelé à
CHAQUE `render()` quelle que soit la vue, y compris Semaines/Paramètres/
Aide qui ne l'affichent jamais. Désormais calculé uniquement pour
`dashboard`/`stats`/`course` (`VUES_AVEC_PRED`). Chaque appelant garde son
repli `currentPred || predict10K()` existant, donc aucun risque si un
usage futur en dépendait ailleurs.

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

**Refus si volume incompatible avec le nombre de jours (24/07/2026)** —
constat fait en générant plusieurs plans de test variés (script
`scripts/test-plans-varies.js`, cf. plus bas dans cette section) :
certaines combinaisons
jours disponibles / volume de départ produisaient des séances EF ou une
sortie longue sans substance réelle (ex. EF à 0,7km, une longue à moins
de 5km) — le warning `VOLUME_HEBDO_TROP_FAIBLE_POUR_REPARTITION`
existait déjà pour détecter ce cas au niveau d'une semaine, mais restait
purement informatif : le plan était généré tel quel malgré l'alerte.
`generatePlan()` bloque désormais la génération plutôt que de produire un
plan de ce type : si plus de la moitié des semaines de la phase
Construction ont un EF sous `VOLUME_MIN_EF_KM` (3km) ou une longue sous
`VOLUME_MIN_LONGUE_KM` (5km), la fonction retourne `{ planInvalide: true,
code: 'VOLUME_JOURS_INCOMPATIBLE', message }` au lieu du plan habituel —
jamais une exception JS (romprait tout appelant sans message
exploitable), cohérent avec le pattern `warnings` déjà en place dans tout
ce fichier. Seuil volontairement à "majorité de la phase Construction" et
non "une seule semaine" : un creux ponctuel en tout début de progression
(montée en charge qui démarre bas) est normal et ne doit pas bloquer un
plan par ailleurs viable — seule une incompatibilité structurelle
(persistante sur toute la phase) doit empêcher la génération. Les 3
points d'appel de `generatePlan()` (`public/v2/index.html` : création,
régénération propre, modification d'objectif ; `public/index.html` : plan
de repli par défaut) gèrent explicitement ce nouveau retour et affichent
le message à l'utilisateur plutôt que de continuer avec un plan cassé. — jusqu'ici, les allures E/T/I
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

**Script de test de génération de plans variés (24/07/2026)** —
`scripts/test-plans-varies.js`, exécuté avec `node
scripts/test-plans-varies.js` depuis la racine du repo (fonctions pures du
moteur, pas de DOM/réseau, donc testables directement en Node sans
navigateur). 10 profils prédéfinis couvrant des cas connus comme
sensibles : grand débutant (Mode Forme marche-course), débutant profil
minimal, intermédiaire/confirmé profil complet, Mode Forme via test
semi-Cooper, plan course date proche/lointaine, changement de niveau en
cours, profil incomplet extrême, contraintes ponctuelles + reprise après
coupure. Vérifie deux niveaux : (1) absence de plantage/valeurs `NaN` —
objectif et sans ambiguïté ; (2) quelques règles structurelles objectives
(pas de qualité consécutive, allures cohérentes E>M>T>I>R, dernière
semaine contient la course, semaines non vides). Ne vérifie jamais la
qualité pédagogique d'un plan — jugement d'expert qui reste celui de
Laurent, volontairement hors de portée d'un test automatisé (décision
actée le 24/07/2026, pour éviter de figer une règle discutable en dur).
Statut de sortie à trois valeurs par profil : OK (généré et conforme),
REFUSÉ (le moteur a lui-même refusé de générer, cf.
`VOLUME_JOURS_INCOMPATIBLE` plus haut — comportement attendu, pas un
échec), FAIL (plantage ou règle violée — à corriger). `generatePlanForme`
(Mode Forme, y compris grand-débutant) vit dans `plan-forme.js`, jamais
dans `plan-generator.js` — erreur de conception initiale du script
corrigée en cours de route (un profil grand-débutant ne peut déclencher
que le flux Mode Forme, jamais `generatePlan()` classique avec
`dateCourse`, cf. `public/v2/index.html` §17.9).

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
     R-050 (ACWR élevé), R-060 (tendance fatigue sur 3 mesures), R-070
     (séances ratées consécutives, priorité 70)
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

**R-070 devient `reduire_charge`** (23/07/2026, comble un manque identifié :
aucune règle n'ajustait le plan face à un comportement réel, seules les
données physiologiques — TRIMP/ACWR — le faisaient). Ampleur fixe −15%
(signal binaire ≥2 séances ratées, pas de palier gradué). Cible directement
la prochaine séance QUALITÉ (pas EF/LONGUE en priorité comme R-024s/R-050)
via le flag `cibleQualitePrioritaire` sur `trouverProchaineSeanceCible`,
avec repli sur EF/LONGUE si aucune qualité n'a de marge. Priorité 70 : reste
sous R-006/R-024s/R-050 (charge mesurée toujours prioritaire sur
comportement déclaré), au-dessus de R-080/R-040 (informatives). R-080 reste
volontairement informative. Hors scope actée : aucune gestion du "rebond"
après l'allègement (accélération si succès répétés, lissage de la remontée
après une réduction) — chantier futur séparé.

**Readiness pré-séance qualité** (23/07/2026) : sélecteur 3 boutons (🪫Fatigué
/😐Normal/🔋En forme), distinct du RPE (rétrospectif). Affiché uniquement le
jour même d'une séance qualité (VMA/SEUIL/SPEC), et seulement tant que cette
séance n'a pas déjà un statut renseigné (masqué après validation — la
question "comment tu te sens POUR cette séance" n'a plus de sens une fois
la séance faite/ratée/adaptée). "Normal" est une vraie valeur par défaut,
enregistrée dès l'affichage si rien n'est encore choisi (pas juste un
repère visuel) — sans risque concret, "normal"/"forme" n'ont de toute façon
aucun effet sur la modulation. Stockage simple sans historique
(`sessionReadiness`, clé par uid, même pattern que `sessionRpe`).

Modulation (post-traitement dans `DecisionEngineApply`, jamais une nouvelle
règle du `RuleEngine`) : si une décision `reduire_charge` existe déjà ET
readiness=Fatigué, l'ampleur est poussée au palier suivant déjà connu du
système (−15→−25), jamais au-delà, jamais si déjà à −25, jamais si
readiness=Normal/En forme (ne module jamais à la baisse). Si aucune décision
`reduire_charge` n'existe (RuleEngine muet) ET readiness=Fatigué : jamais de
réduction automatique du plan, affichage d'un message d'invitation à la
prudence à la place ("Écoute ton corps aujourd'hui", pas de bouton
Appliquer). Validé en conditions réelles le 24/07/2026 (vraie séance VMA).

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

**Choix manuel si plusieurs activités Strava le même jour (24/07/2026)** —
`matchActivitiesToPlan()` associait auparavant systématiquement la
PREMIÈRE activité Strava trouvée pour une date donnée (`runs.find()`),
sans aucun critère de choix. Un critère automatique par proximité de durée
avec la cible de la séance a été testé puis écarté (jugé insuffisamment
discriminant quand deux activités ont des durées proches — décision de
Laurent) : plutôt que deviner, le moteur ne valide plus automatiquement
dès qu'il y a ambiguïté, et laisse le coureur choisir.
- `obtenirActivitesAmbigues(uid, dateSeance)` — fonction utilitaire
  partagée, retourne `{ambigu, candidats}`. Un seul candidat le jour J =
  comportement automatique historique inchangé. Plusieurs candidats =
  aucune validation automatique tant qu'aucun choix n'est mémorisé.
- **Pastille visuelle** (`renderStatusRow`) : "❓ Plusieurs activités ce
  jour — choisis la bonne dans le menu de la séance", affichée uniquement
  tant que le statut reste "—" (une séance déjà validée manuellement,
  indépendamment de Strava, n'affiche jamais la pastille).
- **Choix manuel** (`showSessionMenu`) : liste des activités candidates du
  jour (nom, distance, durée, allure), sélection au clic. Applique
  `autoValidate()` immédiatement sur l'activité choisie.
- **Mémorisation et redéclenchement** (`lk_choix_activite_ambigue`,
  `{uid: {activityId, dateChoix, nbActivitesAuChoix}}`) — un choix reste
  valide tant que le nombre de candidats du jour n'a pas changé. Si une
  NOUVELLE activité Strava apparaît ce jour-là après le choix (resynchro
  ultérieure), l'ambiguïté est redéclenchée : le contexte a changé, le
  choix précédent n'est plus fiable (décision explicite de Laurent).
- **Sans lien avec le calcul de charge/fatigue** — vérifié le 24/07/2026 :
  `RunnerStateCalculator` (`obtenirHistoriqueACWR()`) lit `stravaActivities`
  dans son intégralité, indépendamment de tout matching avec le plan.
  Une activité non choisie dans une ambiguïté (ou une sortie totalement
  hors-plan) compte donc déjà pleinement dans le calcul de fatigue/ACWR —
  ce mécanisme ne concerne que la validation du statut d'UNE séance
  précise du plan, jamais le calcul de charge globale.

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

**Météo passée — heure réelle de séance (24/07/2026)** : `handleHistorical`
(`api/weather.js`) accepte désormais un paramètre `hour` optionnel, utilisé
en priorité sur le repli fixe 18h→12h→minuit. Côté client,
`fetchHistoricalWeather()` extrait l'heure locale depuis `start_date_local`
de l'activité Strava correspondante et la transmet. `lk_weather_cache`
reste indexé par date seule (pas date+heure) — décision volontaire de ne
pas invalider les entrées déjà en cache : les séances déjà consultées une
fois avant ce correctif conservent leur ancienne valeur (calculée à 18h)
jusqu'à ce que le cache soit vidé par un autre mécanisme, seules les
nouvelles consultations bénéficient de la vraie heure. `timezone:
"Europe/Paris"` reste fixé en dur côté serveur (toujours listé en chantier
ouvert, cf. §16).

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

**Signalements utilisateurs** — bouton 💬 dans les headers de `index.html`
(`ouvrirSignalementProbleme()`) : sélecteur de type (Bug/Donnée
incorrecte/Suggestion/Autre) + description libre. Icône changée le
24/07/2026 (ex-🐛, trop spécifique "bug" pour un usage englobant aussi
suggestions et données incorrectes) — le sous-type "🐛 Bug" dans le
sélecteur interne reste inchangé, lui a du sens. Mentionné dans l'aide
(nouvelle entrée FAQ, cf. §4). Ordre des icônes désormais identique sur
toutes les vues (dashboard et header générique des vues secondaires) :
signalement → J– (compte à rebours course) → aide — corrigé le
24/07/2026, l'ordre différait auparavant entre le dashboard et les vues
secondaires. Double écriture à chaque envoi :
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
- **Avant tout changement dans `plan-generator.js`/`plan-forme.js`,
  relancer `scripts/test-plans-varies.js`** — filet de sécurité rapide
  (10 profils, quelques secondes) sur des cas connus comme sensibles,
  avant même de tester en conditions réelles dans l'app (cf. §7)
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
- **Toute date "métier" (jour courant, séance du jour, clôture) doit être
  calculée en fuseau LOCAL du navigateur, jamais via
  `toISOString().slice(0,10)`** (toujours UTC) — sinon décalage d'un jour
  entre minuit et l'heure de décalage UTC locale (ex. 00h-02h en France
  l'été). Utiliser `getFullYear()`/`getMonth()`/`getDate()`, ou `setDate()`
  pour un delta de jours (gère aussi le changement heure été/hiver, cf.
  bug `today()` corrigé le 23/07/2026). L'UTC explicite reste correct et
  volontaire pour les calculs de plage basés sur `dateDebut` du plan (déjà
  une donnée stockée, pas "aujourd'hui").

## 16. État des chantiers ouverts

| Chantier | Statut |
|---|---|
| Saisir un plaisir par séance (PACES-S) | 🔜 Reporté |
| Republier la piste "V2" sur Play Console | 🔜 Pas urgent, Alpha suffit pour Laurent |
| Passer Stripe en clés live | 🔜 Quand prêt à lancer publiquement |
| Courir un vrai test demi-Cooper pour valider la prédiction 10K | 🔜 `RATIO_VMA_VERS_10K` (0.90) et `PACE_RATIOS.E` (1.225) corrigés le 22/07/2026 sur base théorique faute de vraies données — à comparer avec la prédiction 10K du premier vrai test demi-Cooper couru par Laurent (pas simulé) |
| Réécrire le swap directement dans `plan_actif` | 🔜 Suggestion de Laurent (22/07/2026), pas commencé. Complexité identifiée : annulation d'un swap, interaction avec les régénérations de plan, séparation `plans_actif`/`plans_original`, chemin de sauvegarde, interaction avec `reduire_charge` sur une séance swappée |
| Publier une app iOS (Capacitor) | 🔜 Piste identifiée le 22/07/2026, pas de code. Pas urgent tant qu'aucun besoin iOS confirmé — TWA Android actuelle suffit |
| Passer le repo GitHub en privé | 🔜 Prévu juste avant la commercialisation, pour protéger le code différenciant (moteur de décision, calibrations). Reste public pendant le développement solo/bêta (lecture directe économise des tokens Claude) |
| Surveiller la convergence progressive et le fix VDOT SEUIL en conditions réelles | 🔜 En production depuis le 22/07/2026, pas encore éprouvés sur plusieurs semaines — vérifier le rythme du pas de convergence (`PAS_CONVERGENCE_BASE=0.15`) et la fidélité de la formule VDOT reconstruite |
| Surveiller si R-062/R-080 se déclenchent un jour | 🔜 Jamais observées sur les données réelles de Laurent |
| Rendre le fuseau horaire météo passée configurable | 🔜 `timezone:"Europe/Paris"` fixé en dur dans `handleHistorical` (`api/weather.js`), sans impact tant que Laurent est le seul utilisateur en France — à revoir si l'app accueille des utilisateurs hors zone (v2.5) |
| Concevoir la gestion du rebond après un allègement de séance qualité | 🔜 Identifié le 23/07/2026, lié à R-070 : ni accélération (progression plus rapide après succès répétés) ni lissage de la remontée (une réduction ponctuelle 4→3 reps peut être suivie d'un saut 3→5 à la prochaine séance qualité si ça tombe sur un palier de progression) — nécessiterait de faire persister la dernière ampleur appliquée entre deux séances qualité, vraie extension structurelle. Pas pire que la situation actuelle (le saut existe déjà sans réduction), pas priorisé |

Pour l'historique des versions livrées et des correctifs, voir
`changelog.classic.js`. Pour le détail méthodologique des séances, voir
`bibliotheque-seances.md`.
