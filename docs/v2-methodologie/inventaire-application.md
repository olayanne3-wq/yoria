# Inventaire de l'application "Yoria"

> Vue d'ensemble de référence — état ACTUEL du système, à relire en début de
> session. Organisé par thème, pas par session. **L'historique des correctifs,
> bugs et versions livrées vit uniquement dans `changelog.classic.js`** — ne
> pas le dupliquer ici.
>
> ⚠️ **Mettre à jour ce fichier à chaque changement structurel** (nouvel
> écran, nouvelle clé de stockage, nouvelle intégration, pipeline modifié,
> chantier ouvert/fermé). Un simple correctif de bug va dans le changelog,
> pas ici. Rester concis : état actuel + pièges connus, pas le récit du
> diagnostic.

## 1. Vue d'ensemble

**Yoria** — PWA + Android TWA de coaching à la course à pied, génère des
plans d'entraînement adaptatifs. Développeur solo : Laurent, objectif
personnel semi-marathon le 6 septembre 2026.

- Repo GitHub : `olayanne3-wq/yoria` (branche `main`)
- Déployé sur Vercel, domaine `yoria.run`
- Stack : vanilla HTML/CSS/JS (modules ES), hosting statique Vercel, API
  serverless dans `/api/`
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
│   ├── help-content.js            # Contenu de l'aide (données pures, cf. §4)
│   ├── privacy.html
│   ├── beta/                      # Page candidature bêta publique
│   ├── beta-admin/                # Interface admin bêta (index.html, script.js, styles.css)
│   │                              # Onglets : Candidatures, Sélectionnés, Invités,
│   │                              # Signalements, Comptes, Statistiques
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
| Type de script | `<script type="module">` | Module ES natif |

**Architecture duale (contrainte permanente)** : tout changement dans
`public/v2/engine/*.js` doit être dupliqué dans
`public/engine-classic-scripts/*.classic.js` (suppression des `export` via
sed) — **sauf** les 8 fichiers `decision-engine-*.classic.js`, scripts
classiques uniques sans équivalent module ES.

**`window.__AUTH_PRET__` doit être créée de façon synchrone**, en tout
début de script, avant tout `await import(...)` — un pattern différé
laisse une fenêtre où `if (window.__AUTH_PRET__)` échoue silencieusement
(JS résout immédiatement une valeur non-promise). Piège déjà rencontré
dans les deux fichiers principaux : toujours vérifier ce point avant
d'introduire une nouvelle promesse globale équivalente.

**Écran "Consulter un plan" — accordéon "Modifier mon plan"
(`public/v2/index.html`)** — 4 leviers de simulation d'un plan actif
(Objectif, Jours, Volume, Date de course), un seul ouvert à la fois.
Simulation LIVE de l'impact avant validation, jamais appliqué sans clic
explicite sur "Appliquer". Application à partir de la SEMAINE SUIVANTE
uniquement — la semaine en cours et les précédentes gardent leur contenu
original. Règle de pouce pour Jours/Volume (pas de modèle scientifique
rigoureux) : rythme de progression proportionnel au nombre de séances
QUALITÉ/semaine (`Engine.nbQualiteFor`), avec avertissement de fiabilité
limitée. Levier Objectif : garde-fou de faisabilité en direct
(`verifierFaisabiliteNouvelObjectif`), avertit seulement — change QUE
l'allure course (`allures.C`), jamais VMA/SEUIL/EF (dépendent uniquement
de la forme réellement mesurée, cf. §7 allures dynamiques). Levier Date
de course : régénération complète via `Engine.generatePlan()`, avec règles
de phase (`appliquerReglesPhase()`) — Spécifique en cours ne repasse
jamais en Construction ; Affûtage + décalage ≤1 semaine ne recalcule pas
(juste la date change) ; décalage ≥8 semaines avertit de créer un nouveau
plan plutôt que de prolonger.

**Navigation du wizard** — `ECRANS_WIZARD` (registre centralisé) +
`afficherEcranWizard(id)` masque tous les écrans puis affiche seulement
celui demandé, garantit par construction qu'un seul écran est visible à
la fois. Swipe horizontal entre étapes d'un même flux (`attacherSwipeEtapes()`,
détection deltaX/deltaY, seuil 50px) — jamais entre écrans de haut niveau.
Validations bloquantes avant de passer à l'étape suivante : temps de
référence, objectif, volume hebdomadaire (plus de repli silencieux à
30km/semaine), jour de sortie longue. sessionStorage nettoyé au retour
volontaire à l'app.

**Non fait** : audit no-scroll systématique du wizard — nécessite un rendu
réel en navigateur, approche retenue = tests réels de Laurent au cas par
cas plutôt qu'estimation.

## 4. Écrans de l'app principale (`index.html`)

Fonctions de rendu (`render*`) :
- `renderSelecteurPlan` — sélection entre plusieurs plans actifs
- `renderDashboard` — écran d'accueil, résumé de la semaine
- `renderWeeks` / `renderWeekDetail` — vue calendrier et détail semaine
- `renderStatusRow`, `showSessionMenu`, `showMoveMenu`, `showRestoreMenu` — gestion des séances
- `renderStats` — statistiques (ACWR, monotonie de charge, etc.)
- `renderCourse` — page jour de course (horaires, parcours, résultat, stratégie)
- `renderHelp` — aide (cf. plus bas)
- `renderSettings` — profil coureur, records personnels, tokens, notifications, abonnement
- `render` — orchestrateur principal
- `ouvrirSignalementProbleme` — modale accessible via le bouton 💬 des headers
- `renderTestSemiCooperRow` — carte du jour, cf. §14 (Mode Forme sans référence)

**Aide** — contenu réorganisé par intention : Démarrer / Comprendre les
écrans / Comprendre les séances / Pour aller plus loin (règles du plan) /
Comprendre le moteur Yoria / Types de plan / Sources de données / FAQ.
Accès via `boutonAide()`, visible sur chaque onglet.

**Architecture** : contenu extrait dans `public/help-content.js` (module
de données pur, aucun DOM), importé dynamiquement au premier affichage,
mis en cache (`_helpContentCache`) — éditer un texte d'aide ne touche
plus jamais `index.html`. Accordéon replié par défaut
(`_helpSectionsOuvertes`, réinitialisé à chaque ouverture de l'écran).
Recherche texte (`_helpRecherche`) qui filtre en direct et déplie
automatiquement les sections matchées — combine accordéon (parcours
calme) et recherche (accès direct).

**Barre de navigation** — montée dans `#nav-root`, conteneur distinct de
`#app` (via `replaceChildren`), pour éviter le flash de la barre à chaque
render. `setView()` scrolle en haut AVANT `render()`.

**Swipe horizontal entre onglets** — actif sur les vues de `NAV` (pas
`weekDetail`/`help`), détection par direction dominante du geste, seuil
50px.

**`predict10K()` calculé à la demande** — seulement pour
`dashboard`/`stats`/`course` (`VUES_AVEC_PRED`), pas à chaque `render()`.

**Carte du jour et vue Semaine** — principe "rien à ouvrir" : icônes ⌚/✏️
affichées uniquement tant que non validée, allures/FC cibles directement
visibles. Une fois validée, résumé chiffré automatique + lien "Corriger",
seules les répétitions individuelles restent repliées derrière "▼ détail".
Sans Strava ni saisie manuelle, le clic sur un statut ouvre automatiquement
le formulaire de saisie. Statut futur : rangée de boutons masquée
complètement (pas juste désactivée).

## 5. Persistance

**localStorage (préfixe `lk_`)** — clés globales (profil/config) :
`lk_profil_coureur`, `lk_strava_token`, `lk_strava_refresh`,
`lk_strava_expires`, `lk_strava_activities`, `lk_last_sync`.

Clés préfixées par plan (via `clePourPlan()`) : `lk_statuses`,
`lk_hidden_sessions`, `lk_swapped_sessions`, `lk_session_notes`, `lk_notes`,
`lk_checklist`, `lk_adaptations_ignorees`, `lk_last_rebuild`,
`lk_pred_history`, `lk_race_goal`, `lk_race_horaires`, `lk_race_parcours`,
`lk_race_result`, `lk_weather_cache`, `lk_coach_msg`, `lk_coach_date`,
`lk_coach_race_msg`, `lk_resultat_test_forme`.

**Principe** : toute donnée propre à un plan doit être préfixée — une clé
globale non préfixée est un risque de contamination inter-plans.

**Convention `statuses[uid]`** : peut valoir `'—'` explicitement, pas
seulement `undefined`/absent — tout code qui teste "cette séance a-t-elle
déjà un statut" doit vérifier `statuses[uid] && statuses[uid] !== '—'`.

**Supabase** — tables `plans_original` (copie figée), `plans_actif`
(version vivante), `plan_donnees`, `integrations` (colonne `v2_gist_id`
en brut), `abonnements`, `beta_testers`, `signalements` (cf. §11). Sync
Realtime activée sur `plan_donnees` (anti-écho 3s). File d'attente de
sync en cas d'échec réseau (`lk_file_attente_sync`, 5 min, abandon après
10 essais).

**Sauvegarde de plan — Supabase est l'unique mécanisme de persistance.**
Le système Gist v2 (`gist-sync.js`) a été entièrement retiré des écritures
— reste dans le repo uniquement pour `trouverPlanEnConflit` (garde-fou
anti-chevauchement de dates, fonction pure indépendante de la persistance).
Un plan Forme clôturé (`dateCloture` posée) ne peut plus être écrasé via
`mettreAJourPlanSupabase()`.

**`decision_events`/`decision_outcomes`** — étape 1 du chantier de vision
"coach adaptatif à mémoire par coureur" (cf. §16). Écriture best-effort
uniquement, aucune lecture n'exploite encore cette donnée.
`decision_events` journalise chaque décision du `RuleEngine`
(proposée/appliquée/ignorée, contexte complet). `decision_outcomes` lie
une décision à la première séance ultérieure avec un statut connu. RLS
strictement par propriétaire. Schéma SQL dans `schema-decision-memory.sql`.

## 6. Profil coureur (`lk_profil_coureur`)

```
{
  prenom, nom, dateNaissance, anneeNaissance (dérivée), poids, taille,
  fcMax, fcRepos, sexe, pps,
  records: { "5K": {temps, date?}, "10K": {...}, "Semi": {...}, "Marathon": {...} }
}
```

- `dateNaissance` : catégorie d'âge FFA calculée (`calculerCategorieAgeFFA()`,
  bascule au 1er septembre), message anniversaire.
- `fcRepos`/`sexe` : consommés par le moteur de décision (pondération
  TRIMP). Repli sur 'autre' si non renseigné.
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit à partir du
  profil (record le plus pertinent, repli Riegel sinon).
  `verifierCoherenceRecord()` écarte un record si écart >10% à
  l'estimation Riegel des autres.
- **Sauvegarde** : un seul point d'entrée réel, `sauvegarderProfilCoureur()`.
  Les sélecteurs Niveau/Sexe ne doivent JAMAIS appeler cette fonction
  directement au clic — seulement mettre à jour l'état local puis
  `render()`, sinon un profil incomplet écrase Supabase.
- **Un seul compte Supabase Auth par email** — vérifier `Authentication →
  Users` en cas de doute, un profil orphelin peut coexister
  silencieusement avec le vrai profil actif.

## 7. Moteur de plan (`v2/engine/plan-generator.js`)

Pipeline de génération :
1. `computePhases` — découpage en phases (Construction/Spécifique/Affûtage)
2. `computeVolumeProgression` — progression du volume hebdo
3. `placerSemaine` — répartition des séances dans la semaine
4. `genererContenuQualite` — contenu détaillé séance qualité (12 sous-types,
   paramétrés par niveau — voir `bibliotheque-seances.md`)
5. `genererContenuLongue`, `genererContenuTest`, `genererContenuRace`
6. `repartirVolumeSemaine`
7. `neutraliserJoursApresCourse` — repos sur tout jour de la dernière
   semaine après le jour de course
8. `generatePlan` — orchestrateur

Adaptation dynamique : `calculerScoreSemaine`, `analyserAdaptations`,
`appliquerAdaptations`, `regenererStructuresIntervalles` — excluent
toujours les séances déjà passées.

**Stratégie de jour de course** : `calculerStrategieCourse()` (miroir
exact entre `index.html` et `plan-generator.js`) — bornes km fixes pour
Semi/Marathon (tous les 5km + palier à 35km sur marathon), proportionnel
pour 5K/10K.

**v1-bridge.js (`traduirePlanVersFormatV1`)** — couche de traduction
entre le plan brut (v2) et le format `index.html`. Tout nouveau champ
personnalisé ajouté sur une séance côté moteur doit être explicitement
propagé dans cette fonction — sinon silencieusement perdu. Mapping
`FAMILLE_VERS_TYPE_V1` doit couvrir tout nouveau `sousType`, sinon repli
vers `SEUIL`.

**Test semi-Cooper pour plan course** — même principe que Mode Forme
(`generatePlanAvecTestSemiCooper`/`completerPlanApresTestSemiCooper`),
mais la suite du plan dépend de `dateCourse` :
`completerPlanApresTestSemiCooper` ré-appelle `generatePlan()` avec
`dateDebut` décalé de 7 jours. `estimerReferenceDepuisSemiCooper` : VMA
(km/h) = distance en 6min ÷ 100, conversion vers temps 10K équivalent via
`RATIO_VMA_VERS_10K` (~90% de la VMA tenue sur 10K) — ne passe jamais par
`PACE_RATIOS.I` (calibré sur du VMA classique, pas un effort continu).
Le test est placé sur le premier jour *utile* de la semaine (date réelle
≥ `dateDebut`). Jour "🏁 Jour J" ne doit jamais s'afficher tant que
`enAttenteTest`.

**Refus si volume incompatible avec le nombre de jours** — si plus de la
moitié des semaines de Construction ont un EF sous `VOLUME_MIN_EF_KM`
(3km) ou une longue sous `VOLUME_MIN_LONGUE_KM` (5km),
`generatePlan()` retourne `{ planInvalide: true, code:
'VOLUME_JOURS_INCOMPATIBLE', message }` plutôt qu'un plan cassé. Les 3
points d'appel (`v2/index.html` création/régénération/modif objectif,
`index.html` plan de repli) gèrent ce retour et affichent le message.

**Ratio longue variable selon le nombre de jours + volume minimum par
distance** — `RATIO_LONGUE_PAR_JOURS` (table 2j:0.45 → 7j:0.22) remplace
`RATIO_LONGUE=0.28` fixe dans `repartirVolumeSemaine()`, avec contrainte
`kmLongue = max(ratio × volume, kmQualiteTotal + 1km)` — la longue ne
peut jamais être plus courte que le cumul des séances qualité de la
semaine. Un ratio longue/volume élevé à faible nombre de jours est normal
(littérature Daniels + sources croisées, jusqu'à 40-50% à 2-3j/semaine),
pas une anomalie à corriger par un plafond. Paramètre `nbJours` propagé
dans les 3 points d'appel de `recalculerRepartitionEFLongue`
(`generatePlan`, `placerSeanceTest`, `appliquerAdaptations`).

`VOLUME_MIN_PAR_JOURS` est une table à deux niveaux
(`[distance][nbJours]`) — un seuil unique calé sur 10K s'est révélé
insuffisant pour Semi/Marathon (rotation Construction avec des séances
qualité plus volumineuses, jusqu'à +7km d'écart mesuré pour Marathon à
7j) :

| Jours | 5K | 10K | Semi | Marathon |
|---|---|---|---|---|
| 2 | 12 km | 16 km | 18 km | 18 km |
| 3 | 16 km | 20 km | 22 km | 22 km |
| 4 | 19 km | 23 km | 25 km | 25 km |
| 5 | 28 km | 32 km | 36 km | 40 km |
| 6 | 31 km | 35 km | 39 km | 43 km |
| 7 | 34 km | 38 km | 42 km | 46 km |

`generatePlan()` vérifie `params.volumeActuel` contre
`VOLUME_MIN_PAR_JOURS[params.distance][nbJours]` en tout premier, avant
même de calculer phases/allures — retourne `{ planInvalide: true, code:
'VOLUME_MIN_JOURS_NON_ATTEINT', message }` immédiatement si sous le
seuil. Le garde-fou `VOLUME_JOURS_INCOMPATIBLE` (après génération
complète) reste en place comme filet complémentaire. Le wizard
(`v2/index.html`) affiche déjà ce message génériquement — les 6 points
d'appel de `Engine.generatePlan()` testent tous `planInvalide` et
affichent `plan.message`, sans câblage supplémentaire nécessaire.
`decision-engine-apply.classic.js` n'a aucun lien avec
`repartirVolumeSemaine` (il réduit des séances déjà générées, jamais leur
répartition) — rien à y propager.

**Allures dynamiques** — jusqu'ici, les allures E/T/I restaient calibrées
sur `paramsOrigine.tempsReference` pendant toute la durée du plan, même
avec une vraie progression mesurée. `calculerReferenceCouranteAllures()`
compare l'estimation du prédicteur à celle de la période précédente
(`predHistory`) à la fin de chaque semaine PAIRE (S2, S4...). Progression
→ appliquée immédiatement. Régression → appliquée seulement si confirmée
sur 2 périodes CONSÉCUTIVES (`lk_regression_allures_en_attente`).
`verifierEtAppliquerAlluresDynamiques()` orchestre détection, calcul,
application (régénère `allures` via `computeAllures()`), et notification
visible ("📈 Allures mises à jour"). Indépendant d'`appliquerAdaptations()`
(réagit à des semaines ratées, sur clic explicite). **Non testé en
conditions réelles au-delà de la fin d'un premier cycle S2.**

**Script de test de génération de plans variés**
(`scripts/test-plans-varies.js`, `node scripts/test-plans-varies.js`) —
10 profils prédéfinis couvrant les cas sensibles connus (grand débutant,
Mode Forme via test, changement de niveau en cours, contraintes
ponctuelles...). Vérifie absence de plantage/NaN et quelques règles
structurelles (pas de qualité consécutive, allures cohérentes E>M>T>I>R).
Ne vérifie jamais la qualité pédagogique — jugement d'expert qui reste
celui de Laurent. Trois statuts : OK, REFUSÉ (refus volontaire du
moteur, attendu), FAIL (à corriger). **À relancer avant tout changement
dans `plan-generator.js`/`plan-forme.js`** (filet de sécurité rapide,
quelques secondes).

## 8. Moteur de décision

5 modules, tous livrés et en production
(`engine-classic-scripts/decision-engine-*.classic.js`) :

1. **RunnerStateCalculator** — TRIMP/ACWR/fatigue/confiance/risque à
   partir des vraies données Strava (charge aiguë = 7j, chronique =
   moyenne sur fenêtres couvertes si historique <28j). Repli
   `FC_REPOS_DEFAUT=60bpm` si `fcReposReference` absent — sans ce repli,
   le calcul bascule silencieusement vers sRPE (échelle très différente).
2. **SessionAnalyzer** — score de réussite d'une séance (FC, allure,
   répétitions dans zone `okPace`).
3. **WeekAnalyzer** — bilan hebdomadaire (volume, séances, charge,
   récupération estimée).
4. **TrendAnalyzer** — 5 détecteurs de signaux sur plusieurs semaines
   (`analyserTendance(fenetreSemaines)`). Exclut systématiquement la
   semaine EN COURS (non terminée) de sa fenêtre glissante — un lundi
   matin donnerait un écart proche de -100% qui fausserait la moyenne.
   `obtenirHistoriqueMonotonie()` (graphique Stats) garde volontairement
   la semaine en cours.
5. **RuleEngine** — règles actives : R-006 (pic de séance), R-024s
   (fatigue élevée), R-040 (désengagement), R-050 (ACWR élevé), R-060
   (tendance fatigue, échantillonnage 8j par moitiés, seuil écart ≥6),
   R-062 (fatigue persistante 3 semaines, priorité 82), R-070 (séances
   ratées consécutives, priorité 70), R-080 (déficit volume durable, 3
   semaines ≤−10%, priorité 52).

**R-070 (`reduire_charge`)** — comble un manque : aucune règle n'ajustait
le plan face à un comportement réel (seules TRIMP/ACWR le faisaient).
Ampleur fixe −15% (≥2 séances ratées). Cible la prochaine séance QUALITÉ
en priorité (`cibleQualitePrioritaire`), repli EF/LONGUE si aucune marge.
`obtenirSeancesPlanifieesManquees()` filtre bien sur
`["VMA","SEUIL","SPEC"]` — ne compte que les vraies séances qualité.

**Readiness pré-séance qualité** — sélecteur 3 boutons (🪫/😐/🔋), distinct
du RPE rétrospectif. Affiché uniquement le jour même d'une séance qualité
non encore statutée. "Normal" est une vraie valeur par défaut. Modulation
post-traitement (jamais une règle du RuleEngine) : décision
`reduire_charge` existante + readiness=Fatigué → ampleur poussée au
palier suivant connu (−15→−25), jamais au-delà. Sans décision existante
et readiness=Fatigué : message d'invitation à la prudence, jamais de
réduction automatique.

`DecisionEngineApply` + carte UI : détection automatique, application sur
clic explicite uniquement. `reduire_charge` cible EF/LONGUE/RECUP en
priorité, qualité en second recours (réduction structurelle du nombre de
répétitions/blocs, jamais l'allure ni la récup). Garde-fous anti-cumul :
−30% max par décision, plafond cumulé 25%/14j glissants
(`historiqueReductionsMoteur`, sur l'ampleur réellement appliquée). Titre
distingue "Yoria te propose un ajustement" (action possible) de "Yoria a
repéré un signal à surveiller" (informatif, Ignorer seul).

**Réduction structurelle des séances qualité** — ne touche jamais
l'allure ni la récup, seul le nombre de répétitions/blocs, jamais sous le
plancher `base(niveau, sousType)`. Bloc unique répété → retire des
répétitions ; pyramide → retire des paliers depuis la fin (plancher
`debutant` fixe) ; i-30-30 → réduit `repsParSerie` en premier. Séances à
bloc continu unique traitées comme EF/LONGUE. Tables `base`/`cap`
dupliquées depuis `plan-generator.js` dans
`decision-engine-apply.classic.js` (non exportées) — risque de
divergence documenté, à répercuter si le générateur change une valeur
`base`. Ce fichier ne recalcule jamais `repartirVolumeSemaine`.

**Ton du coach** — bienveillant sur la FORME, honnête sur le FOND quand
le moteur a réellement détecté quelque chose (`reduire_charge`,
`alerter_blessure_potentielle`, `alerter_risque_decrochage`) — jamais
l'inverse. Deux signaux supplémentaires : `adaptationsConsecutivesMax >=
3` (3 semaines d'affilée difficiles) et FC moyenne EF/LONGUE >5bpm
au-dessus de la zone attendue (jamais les séances qualité, FC trop
variable). Coach IA lit `RunnerState`/`EngineDecision`, ne recalcule
jamais un ratio séparé, peut commenter mais jamais produire une décision
différente.

**Prédicteur d'estimation 10K** (`predict10K()`, `index.html`) — distinct
des 5 modules mais lit les mêmes données. Deux couches :
- **Borne brute** (`borneBrute`) : mesure physio pure — moyenne pondérée
  SPEC (0.45), VMA (0.35, vitesse×0.87), SEUIL (0.10, formule
  Daniels-Gilbert/VDOT — contribue à partir de 3 séances), combinée à
  `BASE_TIME_REFERENCE` via `lavendouWeight` (décroît 90%→10% sur 8
  semaines, garde-fou 50% si pas de séance intensive récente). Source
  écartée si écart >20% vs référence.
- **Estimation affichée** : converge par petits pas
  (`PAS_CONVERGENCE_BASE=0.15`, modulé par `fiabilitePlanPonderee()`)
  depuis `BASE_TIME_REFERENCE` vers `borneBrute`, jamais un saut direct —
  ne peut jamais dépasser ce que les séances mesurent réellement.
- `fiabilitePlanPonderee(dateStr)` : taux de réussite sur TOUTES les
  séances, pondéré par récence (demi-vie 21j). Recalcule `statutEffectif`
  localement PAR RAPPORT À `dateStr` (pas un champ figé) — nécessaire pour
  la reconstruction rétroactive.
- **Historique rejoué rétroactivement** :
  `rebuildPredHistorySequentielle()` applique la convergence jour par
  jour depuis le début du plan. `PREDICTOR_VERSION` (actuellement 12)
  déclenche la reconstruction si incrémentée — geste manuel requis à
  chaque changement de formule.
- Formule Daniels-Gilbert (VDOT) pour SEUIL — remplace Riegel,
  structurellement pessimiste sur un effort sous-maximal (chapitre 5 du
  livre Daniels absent du fichier projet, formule reconstruite par
  recherche web, cohérente avec les % VO2max confirmés au chapitre 4).
- Filtres d'activités : `a.type === "Run" || a.sport_type === "Run"`
  (repli sport_type pour montres tierces).
- Convergence n'avance que sur nouvelle donnée de qualité du JOUR
  (`aDesNouvellesDonneesQualite`), pas à chaque simple chargement.

**Non couvert / reporté** : PACES-S (plaisir par séance) ;
R-062/R-070/R-080 jamais observées sur données réelles de Laurent —
surveiller ; rythme de convergence (`PAS_CONVERGENCE_BASE=0.15`) à
éprouver sur plusieurs semaines ; formule VDOT reconstruite par recherche
web, pas garantie identique aux tables publiées ; aucune variable interne
(`ALL_SESSIONS`, `statuses`, `PLAN`...) exposée sur `window` pour debug —
seuls `__PLAN_BRUT__`/`__PLAN_GENERE__`/`stravaActivities`/`localStorage`
accessibles ; instrumentation directe (logs temporaires en prod) reste la
méthode de diagnostic la plus fiable pour un bug profond.

## 9. Saisie manuelle, RPE et statuts de séance

**Saisie manuelle** : bouton "Annuler" (réinitialise + relance sync
Strava), champ "durée totale" pour séances de qualité, exclusion Strava
complète quand saisie manuelle existe.

**RPE** : source unique `sessionRpe[uid]`, sélecteur 5 niveaux
(🙂😐😓😣🥵) mappés CR-10, visible dès qu'un statut est posé, pondération
TRIMP +12% si RPE ≥ 8.

**Statuts de séance** (`SOPTS`) : `—`/`✅`/`❌`/`⚠️`/`😴`, indexés par
`uid`. Une séance ne peut plus être supprimée du plan — seul un statut
la caractérise.

**`statutEffectif`** — calculé centralement dans `recalculerAllSessions()`,
disponible sur chaque objet `ALL_SESSIONS` : égal au vrai statut saisi
s'il existe, sinon `"😴"` automatiquement pour tout jour DÉJÀ PASSÉ
(jamais le jour même) sans saisie. Jamais écrit dans `statuses[uid]`
lui-même — purement un calcul d'affichage. Accès protégé par try/catch
(pas `typeof`, ne protège pas la temporal dead zone).

**Convention à respecter partout** : lire `statutEffectif` (pas
`statuses[uid]` brut) pour tout calcul qui doit tenir compte des séances
oubliées comme un signal de désengagement — sauf 4 catégories légitimes
qui doivent rester sur le statut brut : boutons de sélection/écriture du
statut, contexte "aujourd'hui", compteurs stricts ✅/⚠️/❌, gardes du swap.

**Échange de séances (swap)** — `getAvailableSlots()` propose tous les
jours de la semaine, bloqué dans les deux sens si statut posé, note, RPE,
saisie manuelle, ou jour passé sans saisie.

**Choix manuel si plusieurs activités Strava le même jour** —
`matchActivitiesToPlan()` ne valide plus automatiquement dès qu'il y a
ambiguïté (`obtenirActivitesAmbigues`), laisse le coureur choisir via
pastille visuelle + menu. Choix mémorisé (`lk_choix_activite_ambigue`)
tant que le nombre de candidats ne change pas — redéclenché si une
nouvelle activité apparaît après resynchro. Sans lien avec le calcul de
charge/fatigue (`RunnerStateCalculator` lit `stravaActivities` en entier,
indépendamment du matching).

## 10. Import FIT

`adapterFitVersFormatActivite()`, `chargerFitParser()` (import ESM
dynamique jsDelivr), `importerFichierFit()`. `vitesseFiable()` calcule
toujours depuis distance/temps, jamais `avg_speed` du fichier FIT (peut
être faux sur Amazfit/Zepp).

## 11. Intégrations externes

**Strava** (Client ID `260339`) — OAuth via `api/strava.js`,
`v2/engine/strava.js`. Sync conditionnelle sur `dataSource === "strava"`.
Comparaison séance/laps filtrée par allure cible ±15%. Token
invalide/révoqué détecté explicitement — message + bouton "🔄 Reconnecter
Strava", affiché sans auto-effacement tant que non résolu.

**Météo** — proxy Open-Meteo (`api/weather.js`), gratuit, sans clé.
`type=forecast|current|historical`. Géolocalisation : dernière activité
Strava GPS pour actuelle/passée, position navigateur pour prévision J+1.
Heure réelle de séance extraite de `start_date_local` pour la météo
passée (repli 18h si absente). `timezone: "Europe/Paris"` fixe côté
serveur (chantier ouvert, cf. §16).

**Coach (messages courts)** — `api/coach.js`, proxy Claude Haiku 4.5.

**Sync multi-device** — Supabase (auth email/mot de passe), seul
mécanisme. Aucune action au-delà de se connecter avec le même compte.

**Stripe (abonnements)** — Produit "Yoria Premium" (7€/mois + tarif
annuel), Checkout hébergé (jamais de formulaire carte natif dans la TWA).
Table `abonnements` (RLS lecture seule, écritures via endpoints
serverless `service_role`). `api/stripe-checkout.js` retrouve/crée le
client par `user_id` puis `email`. `api/stripe-webhook.js` : body brut,
signature HMAC-SHA256 native. Routes déclarées explicitement dans
`vercel.json`. Statut lu via `window.__abonnementStatutCache__` (une
fois par session). Abonnements gratuits (beta testeurs) : coupon Stripe
100% répétitif via `beta-admin`, liaison automatique au `user_id` si
même email que la candidature.

**Signalements utilisateurs** — bouton 💬, sélecteur de type
(Bug/Donnée/Suggestion/Autre) + description libre. Double écriture :
Sentry (`captureMessage`, best-effort, contexte technique brut) + table
Supabase `signalements` (source de vérité pour le triage humain, RLS
insert seul côté client). Administration dans `beta-admin` (onglet
Signalements, filtrable, changement de statut).

**Module "Comptes"** (`beta-admin`) — recherche un utilisateur par email
via l'API Admin Supabase, affiche ses plans en lecture seule (contenu +
statuts/RPE/notes réels), réimporte DIRECTEMENT
`traduirePlanVersFormatV1`/`construireAllSessions` depuis
`v2/engine/v1-bridge.js` (jamais de réimplémentation serveur séparée).
Section "Décisions du moteur" : 50 dernières lignes de `decision_events`.
**Principe strict** : ce module ne doit JAMAIS lire ni utiliser les
tokens Strava d'un testeur — uniquement des données déjà stockées côté
Yoria.

## 12. Authentification Supabase

Auth email/mot de passe (pas de Google/Apple). Variables exposées via
`api/config.js`. `LkSync.precharger(userId, planId)` réhydrate
`localStorage` depuis Supabase avant que `window.__AUTH_PRET__` ne se
résolve — retourne `{ok, echecChargementProfil}`, jamais de throw.
**Point de vigilance critique** : `index.html` ne doit jamais déclencher
l'écran de bienvenue si `echecChargementProfil` est vrai — sinon un
`localStorage` non réhydraté est pris à tort pour "profil jamais
renseigné" et écrase le vrai profil Supabase.

## 13. Publication Play Store (TWA Android)

- Package : `app.vercel.plan_10k_alpha.twa` (identifiant permanent)
- Domaine : `yoria.run`
- Piste "Tests fermés - Alpha" active, Laurent testeur confirmé
- Icône PWA Chrome bloquée via `beforeinstallprompt` + `preventDefault()`
- Build/signature : procédure figée dans les mémoires de session
  (keystore critique à ne jamais perdre)

## 14. Mode Forme (v2.6)

Cycle glissant sans date de course, réutilise les briques génériques de
`plan-generator.js` — n'importe jamais `computePhases`/
`ROTATION_SOUS_TYPE`/`placerSeanceTest`/`placerSeanceCourse`. Câblé de
bout en bout.

**Déclenchement du bloc suivant** — bandeau semi-automatique ("🔁 Ton
bloc de 4 semaines est terminé"), détection par date. `genererBlocSuivant()`
reconstruit `profil`/`params` depuis `localStorage` + le plan courant
(`profilOrigine`/`paramsOrigine` non stockés sur le résultat).

**Test semi-Cooper — "je n'ai pas de référence"** — même formule que §7,
via `estimerReferenceDepuisSemiCooper()`. `generatePlanFormeAvecTest()`
génère uniquement la semaine 1 (`enAttenteTest: true`), footings libres
sans allure. Résultat capté sur la carte du jour, détection Strava
automatique (montre programmée en 3 laps manuels), repli saisie manuelle.
`completerBlocApresTest()` génère les semaines 2 à N avec les vraies
allures.

**Sélecteur de distance de référence** — 5K/10K/Semi/Marathon, corrige un
ancien `refDistance` codé en dur à '10K'.

**Parcours "Reprise en douceur"** — 3ème option sur l'écran de choix de
mode, réutilise le flux marche-course existant. Niveau `'grand-debutant'`
posé uniquement en LOCAL sur ce plan (`plan.profilOrigine.niveau`),
jamais sur le profil général du compte. Écran d'introduction dédié avant
la sélection des jours. 13 paliers en 2 phases : 6 paliers d'ALTERNANCE
marche/course puis 7 de CONTINU croissant (5→30min) — structure inspirée
du "White Plan" de Daniels (walk/run sur ses 9 premières semaines), plus
progressive que l'ancienne version à 7 paliers qui démarrait directement
à 5min de course continue.

## 15. Principes transverses à retenir

- **Inventaire à jour à chaque push structurel** (pas pour un simple fix)
- **Préfixage des données de plan obligatoire** (`clePourPlan()`)
- **Une seule variable modifiée à la fois** pour la progressive overload
- **Niveau intermédiaire = valeur historique inchangée** à chaque
  différenciation par niveau (zéro régression)
- **Validation historique avant codage** pour toute nouvelle métrique
- **Jamais d'apostrophe dans une chaîne JS entre guillemets doubles**
  (échec silencieux du parseur) ; `node --check` systématique avant push
- **404 sur une route API** → vérifier `vercel.json` en premier
- **Avant tout changement dans `plan-generator.js`/`plan-forme.js`,
  relancer `scripts/test-plans-varies.js`**
- **Toute modification d'un plan existant doit exclure les séances
  passées**
- **Cache client async : bien distinguer `undefined` (jamais initialisé)
  de `null`/valeur connue**
- **Toute promesse globale attendue ailleurs doit être créée de façon
  synchrone, avant tout `await`**
- **Toute fonction de traduction entre formats (`v1-bridge.js` et
  équivalents) doit être mise à jour à chaque nouveau champ personnalisé**
- **Toute fonction qui modifie/supprime un plan doit traiter Supabase
  comme bloquant et Gist comme best-effort**
- **Aucun outil admin ne doit jamais lire ou utiliser les tokens Strava
  d'un testeur**
- **Ne jamais toucher** `public/beta/`, `api/beta.js`, routes `/beta*`
  sans demande explicite
- **Toute date "métier" doit être calculée en fuseau LOCAL du
  navigateur, jamais via `toISOString().slice(0,10)`** (toujours UTC) —
  utiliser `getFullYear()`/`getMonth()`/`getDate()`. L'UTC explicite
  reste correct pour les calculs de plage basés sur `dateDebut` du plan.

## 16. État des chantiers ouverts

| Chantier | Statut |
|---|---|
| Volume minimum par distance/jours | ✅ Codé, poussé le 29/07/2026 (`plan-generator.js`). Détail complet en §7. Wizard déjà câblé génériquement — aucun changement nécessaire côté `v2/index.html`. |
| Système de badges (récompenses) | ✅ Livré. 14 badges en 4 catégories, consultables depuis Stats (`renderBadges()`) — jamais rien en permanence sur le dashboard, seul un bandeau ponctuel dismissible. Badges à paliers (record historique jamais perdu si la série casse, pour éviter l'effet "streak" anxiogène) : séances validées d'affilée, semaines complètes d'affilée, FC EF/LONGUE maîtrisée d'affilée, semaines parfaites (seul badge cumulé, pas une série). Badges événementiels : nouvelle estimation, record battu, test semi-Cooper, repos écouté, semaine équilibrée, premier plan, mi-parcours, entrée Affûtage, course terminée, retour réussi. Stockage `badges_debloques` (best-effort), cache `window.__badgesCache__`. Explicitement écarté : badges de volume/intensité brute, classement ou comparaison sociale. |
| Permettre de changer la date de course d'un plan actif | ✅ Livré. 4e levier de l'accordéon "Modifier mon plan" (cf. §3), régénération complète avec règles de phase. Cycle de décharge peut se désynchroniser légèrement après un changement de date — limite mineure acceptée. Non testé en conditions réelles au-delà des cas simulés. |
| Saisir un plaisir par séance (PACES-S) | 🔜 Reporté |
| Republier la piste "V2" sur Play Console | 🔜 Pas urgent, Alpha suffit pour Laurent |
| Passer Stripe en clés live | 🔜 Quand prêt à lancer publiquement |
| Courir un vrai test demi-Cooper pour valider la prédiction 10K | 🔜 `RATIO_VMA_VERS_10K` (0.90) et `PACE_RATIOS.E` (1.225) calibrés sur base théorique faute de vraies données — à comparer au premier vrai test couru par Laurent |
| Réécrire le swap directement dans `plan_actif` | 🔜 Suggestion de Laurent, pas commencé. Complexité identifiée : annulation, régénérations, séparation `plans_actif`/`plans_original`, interaction avec `reduire_charge` |
| Publier une app iOS (Capacitor) | 🔜 Piste identifiée, pas de code. Pas urgent tant qu'aucun besoin iOS confirmé |
| Passer le repo GitHub en privé | 🔜 Prévu juste avant la commercialisation. Reste public pendant le développement solo/bêta (économise des tokens Claude) |
| Surveiller la convergence progressive et le fix VDOT SEUIL en conditions réelles | 🔜 En production, pas encore éprouvés sur plusieurs semaines |
| Faire évoluer le moteur de décision vers un coach adaptatif à mémoire par coureur | 🔜 Étape 1 (collecte pure, cf. §5) codée et déployée. Reste non engagé : `athlete_profiles`, `learned_parameters`, personnalisation du `RuleEngine` — conditions de déclenchement toujours d'actualité (moteur stable sur plusieurs mois, plusieurs utilisateurs réels) — cf. `vision-coach-adaptatif.md` |
| Résoudre le chooser "Ouvrir avec Chrome" systématique sur Xiaomi/HyperOS | 🔜 Diagnostiqué sur un Xiaomi 11 Lite 5G (HyperOS) : `assetlinks.json` correct, toutes les causes standards Android éliminées. Cause probable : particularité de la surcouche Xiaomi. Migration Capacitor écartée pour l'instant (casserait le workflow de déploiement direct). À réévaluer si le problème se confirme répandu |
| Concevoir la gestion du rebond après un allègement de séance qualité | 🔜 Lié à R-070 : ni accélération après succès répétés, ni lissage de la remontée. Nécessiterait de persister la dernière ampleur appliquée entre séances qualité — pas pire que la situation actuelle, pas priorisé |
| Garde-fou d'exclusion entre la carte d'adaptation comportementale et le moteur de décision physiologique | 🔜 `analyserAdaptations()`/`appliquerAdaptations()` sont déjà branchées sur le dashboard (`adaptationEl`), mais jamais observées par Laurent car jamais déclenchées sur ses données réelles. Deux cartes restent volontairement séparées (granularités différentes). Reste à coder : garde-fou si les deux cartes ciblent la même semaine (physio prioritaire) + journalisation de collision |
| Pondérer différemment les semaines à venir dans la Projection au jour J | 🔜 Le modèle extrapole uniformément le rythme observé, alors qu'il évolue souvent en phase Spécifique/Affûtage. Chaque entrée `predHistory` porte désormais un champ `phase` (`phaseAtDate()`) pour comparer a posteriori une fois assez de données — pas encore assez de recul pour juger |
Pour l'historique des versions livrées et des correctifs, voir
`changelog.classic.js`. Pour le détail méthodologique des séances, voir
`bibliotheque-seances.md`.
