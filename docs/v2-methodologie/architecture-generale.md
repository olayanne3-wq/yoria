# Architecture générale — Yoria

> Détail de l'arborescence du repo, des deux interfaces (app principale
> et wizard), et des écrans de l'app principale. Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et les principes
> transverses.

## Arborescence du repo

```
yoria/
├── api/                          # Endpoints serverless (Vercel/Node) —
│                                  # PLAFOND STRICT 12 fonctions max (plan
│                                  # Hobby) : tout fichier .js ici compte
│                                  # comme une fonction, y compris un module
│                                  # jamais appelé en HTTP direct. Toute
│                                  # logique partagée entre plusieurs
│                                  # endpoints doit vivre dans lib/, jamais
│                                  # dans api/ (cf. incident déjà rencontré :
│                                  # errorCode exceeded_serverless_functions_
│                                  # per_deployment).
│   ├── coach.js                  # Proxy Claude Haiku (messages coach courts)
│   ├── strava.js                 # OAuth Strava (auth, callback, refresh, activities)
│   ├── weather.js                # Proxy Open-Meteo (prévision + alerte chaleur >28°C)
│   ├── config.js                 # Expose SUPABASE_URL/SUPABASE_ANON_KEY au client
│   ├── stripe-checkout.js        # Création session Stripe Checkout
│   ├── stripe-webhook.js         # Réception événements Stripe (statut abonnement)
│   ├── delete-account.js         # Suppression définitive d'un compte (cascade)
│   ├── backup.js                 # Export global / ciblé utilisateur / réinjection / diagnostic cascades (cf. §5)
│   ├── beta.js                   # Candidature bêta (public, cf. §16bis)
│   └── beta-admin.js             # Administration bêta (invitations, abonnements gratuits, signalements, cf. §16bis)
├── lib/                          # Modules serveur PARTAGÉS entre plusieurs
│                                  # fichiers api/*.js — jamais compilés en
│                                  # fonction serverless (hors du dossier
│                                  # api/), jamais appelés en HTTP direct.
│   ├── beta-invitation-email.js   # Génération + envoi email d'invitation bêta (iOS/Android, cf. §16bis)
│   └── rate-limit.js              # Rate limiting générique par IP (cf. §16bis)
├── docs/
│   ├── legal/                    # Confidentialité, CGU/CGV, RGPD, Play Store data safety
│   └── v2-methodologie/
│       ├── inventaire-application.md   # CE FICHIER
│       ├── bibliotheque-seances.md     # Méthodologie des types de séances qualité
│       ├── import-fit-intervalles.md   # Conception + implémentation import .fit (cf. §10)
│       ├── diagnostic-cascades-user-id.sql  # Fonctions RPC pour l'onglet Cascades (beta-admin)
│       ├── table-rate-limiting-admin.sql    # Schéma table tentatives_connexion_admin (cf. §16bis)
│       ├── table-rate-limiting-beta.sql     # Schéma table tentatives_soumission_beta (cf. §16bis)
│       └── (autres docs de contexte : jour-de-course, source-donnees-seances, etc.)
├── public/
│   ├── index.html                 # App principale (dashboard, ~15000 lignes)
│   ├── help-content.js            # Contenu de l'aide (données pures, cf. §4)
│   ├── privacy.html
│   ├── cgu.html                   # Conditions générales d'utilisation et de vente
│   │                              # (SIRET/adresse en attente, cf. inventaire
│   │                              # chantier "Conformité — CGU/CGV")
│   ├── sante.html                 # Recommandations santé (page statique, même
│   │                              # contenu que ouvrirRecommandationsSanteModale())
│   ├── beta/                      # Site candidature bêta publique (cf. §16bis)
│   │   ├── index.html             # Page d'inscription (navigation par onglets)
│   │   ├── script.js
│   │   ├── styles.css
│   │   ├── merci.html             # Page de remerciement dédiée
│   │   ├── merci.js
│   │   └── assets/                # Screenshots + logo SVG (PNG mort supprimé), image Open Graph dédiée
│   ├── beta-admin/                # Interface admin bêta (index.html, script.js, styles.css)
│   │                              # Onglets : Candidatures, Invités, Signalements,
│   │                              # Comptes, Sauvegarde, Cascades, Statistiques
│   │                              # (statuts simplifiés à pending/invited/rejected —
│   │                              # "Sélectionnés"/"Actifs" retirés)
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
│           ├── badges.js          # Système de badges (récompenses)
│           ├── predictor.js       # Prédicteur 10K
│           ├── session-analysis.js
│           ├── age-category.js    # Catégorie d'âge FFA (calcul pur, extrait
│           │                      # d'index.html) — exposé en
│           │                      # global via Object.assign(window, ...),
│           │                      # comme v1-bridge.js, pas via window._xxxModule
│           ├── fit-detection.js   # Détection d'intervalles depuis un .fit sans marqueurs natifs (cf. §10)
│           ├── v1-bridge.js       # Traduction plan brut v2 -> format v1 (index.html)
│           ├── strava.js, weather.js, gist-sync.js
│           └── auth.js, sync-storage.js
└── vercel.json                    # Routing explicite en whitelist (toute route API
                                    # doit y être déclarée, sinon 404 silencieux) +
                                    # headers de sécurité globaux (HSTS,
                                    # X-Content-Type-Options, CSP) sur la route
                                    # catch-all, cf. inventaire chantier Sécurité
```

## Les deux interfaces

| | `public/index.html` | `public/v2/index.html` |
|---|---|---|
| Rôle | App principale : dashboard, suivi, réglages | Wizard : création/paramétrage d'un plan |
| Route | `/` | `/v2` |
| Type de script | `<script type="module">` | Module ES natif |

**Architecture duale (contrainte permanente)** : tout changement dans
`public/v2/engine/*.js` doit être dupliqué dans
`public/engine-classic-scripts/*.classic.js` (suppression des `export` via
sed) — **sauf** les 8 fichiers `decision-engine-*.classic.js`, scripts
classiques uniques sans équivalent module ES. **Exception** :
`plan-generator.js` n'a pas de `.classic.js` — `index.html` le charge via
dynamic `import()` (`window._planGeneratorModule`, séparé de la copie
`chargerPlanGeneratorApp()`/`_planGeneratorModuleApp` utilisée par
l'accordéon "Modifier mon plan" ci-dessous — deux imports dynamiques
distincts du même fichier, le navigateur met en cache le module donc pas
de double téléchargement/exécution).

**Règle TDZ (temporal dead zone)** : toute promesse globale attendue
ailleurs (`window.__AUTH_PRET__`), ou toute variable `let`/`const` lue par
du code exécuté tôt (`_renderDiffereTimer`, `stravaToken`,
`swapTable`...), doit être déclarée de façon synchrone, AVANT tout
code qui pourrait la lire — y compris du code placé après un `await` mais
techniquement situé avant la déclaration dans le fichier. Un `typeof` ne
protège pas de ce piège, mais un `try/catch` autour de la lecture reste un
filet de sécurité valable pour une fonction appelée en cascade tôt dans le
chargement (cf. `sourceSwap()`, protégée ainsi car appelée via
`recalculerAllSessions()` avant que `swapTable` ne soit déclarée). Toute
variable lue par une même fonction (`recalculerAllSessions()`/
`getEffectiveSession()`) doit être vérifiée individuellement, pas
seulement la première trouvée. Si une même fonction `async` (appelée tôt,
avec des `await` internes) déclenche une TDZ sur plusieurs variables
successives à chaque correctif isolé (`PLAN` puis `ALL_SESSIONS` puis
`_renderDiffereChargementTimer`), le vrai correctif est de déplacer
l'APPEL vers la fin du flux synchrone principal (après le premier
`render()`, point où toutes les déclarations `let`/`const` de niveau
module sont garanties exécutées) plutôt que de continuer à chasser chaque
variable une à une — cf. `verifierMeteoSeanceDemain()`, désormais appelée
juste après le premier `render()` plutôt qu'au tout début du script.

**Dérivées du plan recalculées à chaque `render()`, pas seulement au
chargement** — `DATE_COURSE_REFERENCE`, `RACE_NAME`, `RACE_URL`,
`RACE_LOCATION`, `BASE_TIME_REFERENCE`, `OBJECTIF_REFERENCE`,
`DISTANCE_M_REFERENCE`, `FC_MAX`, `PHASES`, `SESSION_TARGETS` — toutes en
`let` (pas `const`), réassignées en tête de `render()` depuis
`window.__PLAN_BRUT__` à chaque exécution. Nécessaire depuis l'ajout de
l'accordéon "Modifier mon plan" (cf. section dédiée ci-dessous) : ces
variables étaient auparavant calculées UNE SEULE FOIS au chargement de la
page, donc ne reflétaient jamais un changement de plan appliqué en cours
de session (countdown, allures, stratégie de course, cibles de validation
VMA/SEUIL/SPEC restaient figés sur l'état du tout premier chargement).
`raceGoalTime` reste volontairement exclue de ce recalcul automatique :
c'est une préférence utilisateur chargée depuis `localStorage`
(`lk_race_goal`), la retoucher automatiquement écraserait un objectif
manuel déjà choisi dans Réglages — seul le levier Objectif (ci-dessous) la
resynchronise explicitement, au moment précis où IL change l'objectif du
plan.

**Toute mutation d'un état source de `ALL_SESSIONS`** (`statuses`,
`swapTable`) doit être suivie d'un `ALL_SESSIONS =
recalculerAllSessions()` explicite avant tout `render()`, jamais implicite.

**Support PWA iOS** — `apple-mobile-web-app-status-bar-style` (valeur
`black-translucent`, contenu de l'app passe sous la barre de statut
système plutôt qu'une bande fixe imposée par iOS) et
`apple-mobile-web-app-title` ajoutés dans le `<head>`, en complément de
`apple-mobile-web-app-capable` déjà présent. Bandeau d'onboarding
"Ajouter à l'écran d'accueil" injecté en JS (détection `Safari` iOS
spécifiquement, hors Chrome/Firefox iOS qui partagent le même moteur
WebKit imposé par Apple mais pas le même geste fiable ; hors mode déjà
standalone via `navigator.standalone`), fermable définitivement
(mémorisé dans `localStorage`, clé `yoria_bandeau_ios_ferme`, **non
préfixée par plan** — décrit un état de l'appareil, pas une donnée à
synchroniser). Même pattern réutilisé pour le bandeau "Recommandations
santé" du dashboard (`yoria_bandeau_sante_ferme`, cf.
`saisie-et-integrations.md` / inventaire chantier "Recommandations
santé"). Contrairement à Android (TWA Play Store), **aucun équivalent
officiel Apple n'existe** pour faire passer une PWA vers l'App Store sans
review — installation manuelle via Safari (Partager → Sur l'écran
d'accueil) reste la seule voie. Une app native iOS via wrapper Capacitor
est mentionnée comme "à l'étude" côté communication bêta (page
d'inscription, mail d'invitation) — aucun développement entamé.

**Accordéon "Modifier mon plan" — app principale (`public/index.html`,
onglet Semaines)** — 5 leviers portés depuis le wizard (Objectif, Jours,
Volume, Date de course, Course intermédiaire), même principe que la
version wizard ci-dessous (simulation live, application à partir de la
semaine suivante uniquement) mais avec une présentation et un cycle de
vie propres à l'app principale :
- **En-tête TOUJOURS visible, `position:fixed`** (pas `sticky`) — reste
  ancré sous le header de l'écran en permanence, y compris tout en bas de
  la liste des semaines. Montée dans un conteneur DOM séparé
  (`#accordeon-plan-root`, en dehors de `#app`), même pattern que la nav
  fixe du bas (`#nav-root`) — jamais détruite/recréée par le cycle de
  `render()`, seulement vidée/remontée quand on change d'onglet. `top`
  calé sur `--hauteur-header-sticky`, une variable CSS **mesurée
  dynamiquement** (`getBoundingClientRect().height`) à chaque `render()`
  plutôt qu'une valeur en pixels devinée — un premier correctif en dur
  (52px) s'était révélé faux, cachant l'en-tête sous le vrai header
  (z-index supérieur) plutôt que de l'afficher juste en dessous. Le
  contenu déplié d'un levier, lui, reste dans le flux normal de la page
  (`renderContenuAccordeonPlan()`, appelée dans `renderWeeks()`), jamais
  fixe — sinon un levier ouvert avec plusieurs champs resterait figé en
  haut d'écran, hors de proportion sur mobile. Un `padding-top`
  compensatoire (`--hauteur-accordeon-plan-ferme`, également mesurée
  dynamiquement) est appliqué au contenu de `renderWeeks()` pour ne
  jamais passer sous l'en-tête fixe.
- **Ouverture** : scroll de la page tout en haut (`window.scrollTo`,
  instantané) au clic sur l'en-tête — sinon le contenu déplié, juste sous
  l'en-tête fixe, apparaîtrait hors champ si l'utilisateur était déjà
  scrollé bas dans la liste des semaines.
- **Fermeture automatique au scroll vers le bas** — écouteur `scroll`
  global sur `window`, ajouté UNE SEULE FOIS au chargement (jamais à
  chaque `render()`, qui provoquerait une accumulation de listeners
  identiques), actif uniquement sur l'onglet Semaines. Petit seuil
  anti-bruit (4px) pour ignorer le tremblement tactile.
- **Pont v2→v1** : chaque levier régénère via `Engine.generatePlan()`
  (import dynamique, cf. ci-dessus), retraduit en v1 via
  `traduirePlanVersFormatV1()`, persiste via
  `LkSync.mettreAJourPlanSupabase()`, recalcule `ALL_SESSIONS` — même
  pont déjà éprouvé ailleurs dans le fichier pour les allures dynamiques
  (cf. `moteur-plan.md`).
- **`finaliserRegenerationLevier(planBrut, nouveauxParams,
  profilPourGeneration, semaineCharniere)`** — fonction commune aux 5
  leviers : régénère, fusionne (garde les semaines `< semaineCharniere`
  de l'ancien plan telles quelles, prend le reste du nouveau), gère
  id/nom/statuses/profilOrigine/paramsOrigine, purge
  `semaineDepartVolume` de `paramsOrigine` avant sauvegarde (jamais
  persisté durablement, cf. `moteur-plan.md`), persiste, met à jour
  `PLAN`/`ALL_SESSIONS`. Corrige aussi une éventuelle rebascule de phase
  (cf. `appliquerReglesPhaseApp` ci-dessous) et refuse explicitement si
  le plan régénéré compte moins de semaines que `semaineCharniere` (cas
  d'un recul important qui raccourcirait le plan sous la charnière —
  aurait sinon produit un plan tronqué silencieusement, la course
  elle-même pouvant disparaître).
- **`semaineCharniere` — toujours `semaine actuelle + 1` sur les 5
  leviers**, sans exception : la semaine en cours (potentiellement déjà
  entamée, avec des séances réalisées) ne doit JAMAIS être régénérée. Un
  bug a existé sur le levier Objectif (charnière sans le `+1`, hérité
  d'un raisonnement propre au wizard où ce risque n'existait pas) —
  corrigé, `semaineActuelleOuProchaineApp(planBrut) + 1` partout.
- **`appliquerReglesPhaseApp(planPropre, phaseActuelle,
  semaineCharniere)`** — appelée DEPUIS `finaliserRegenerationLevier`
  (point commun aux 5 leviers, pas seulement Date de course où elle avait
  d'abord été ajoutée par erreur). Corrige un retour de phase
  (Spécifique/Affûtage → Construction) introduit par la fusion quand le
  nouveau plan régénéré a une frontière de phase différente de l'ancien
  (ex. un gros décalage de date de course change `totalSemaines`, donc la
  position de chaque phase) — ne se contente pas de renommer l'étiquette
  de phase, régénère aussi le VRAI contenu qualité (`genererContenuQualite`
  avec la bonne phase) et recalcule EF/longue en conséquence, sinon
  l'étiquette de phase affichée serait incohérente avec le contenu réel
  de la séance (ex. VMA affiché sous une étiquette "Spécifique"). Limite
  connue : corrige le cas le plus visible, mais la cause structurelle de
  fond (deux plans régénérés indépendamment, recollés à une charnière,
  n'ont aucune garantie de s'aligner parfaitement — rotation qualité
  incluse) n'est pas traitée pour toutes les combinaisons possibles de
  leviers.
- **Outils de réparation ponctuelle — déplacés dans Réglages >
  Maintenance** (pas dans l'accordéon lui-même, retirés de là après un
  premier essai) : "Vérifier la cohérence des phases"
  (`reparerCoherencePhasesApp`, recalcule les vraies frontières de phase
  via `Engine.computePhases()` — jamais en se fiant à `plan.phases`
  stocké, qui peut lui-même être resté incohérent après une régénération
  antérieure — et régénère le contenu de toute semaine divergente, y
  compris la semaine actuelle et les semaines passées, contrairement aux
  5 leviers normaux) et "Séance qualité de la semaine en cours"
  (`changerSousTypeSeanceApp`, sélecteur manuel du sous-type d'UNE séance
  qualité précise, pour restaurer un contenu connu quand la rotation
  automatique ne le retrouverait pas forcément).

**Écran "Consulter un plan" — accordéon "Modifier mon plan" (WIZARD,
`public/v2/index.html`)** — 4 leviers de simulation d'un plan actif
(Objectif, Jours, Volume, Date de course), un seul ouvert à la fois.
Simulation LIVE de l'impact avant validation, jamais appliqué sans clic
explicite sur "Appliquer". Application à partir de la SEMAINE SUIVANTE
uniquement — la semaine en cours et les précédentes gardent leur contenu
original. **Ce mécanisme wizard reste séparé et distinct de l'accordéon
app principale ci-dessus** — deux implémentations parallèles du même
principe, pas encore unifiées (cf. inventaire, chantier "Modifier mon
plan").
- **Levier Jours** : réutilise `.days-grid` (`daysGridSimulation`), permet
  aussi de déplacer uniquement la sortie longue. `Engine.nbQualiteFor(nbJours,
  niveau)` fait varier le rythme de progression proportionnellement au
  nombre de séances QUALITÉ.
- **Levier Objectif** : garde-fou de faisabilité en direct
  (`verifierFaisabiliteNouvelObjectif`), avertit seulement — change QUE
  l'allure course (`allures.C`), jamais VMA/SEUIL/EF (dépendent uniquement
  de la forme réellement mesurée, cf. `moteur-plan.md` allures dynamiques).
- **Levier Volume** : `appliquerChangementVolume()` calcule
  `semaineCharniere` AVANT l'appel à `generatePlan()` et la transmet via le
  paramètre `semaineDepartVolume` (cf. `moteur-plan.md`) — la progression redémarre
  réellement depuis ce niveau plutôt que de recalculer toute la courbe
  depuis la semaine 1. `semaineDepartVolume` ne doit **jamais** être
  persisté dans `paramsOrigine` (retiré par destructuring avant toute
  sauvegarde, dans les 4 leviers et le bouton "Analyser et adapter") — la
  dernière intention réelle de volume vit dans `plan.volumeCourant: {km,
  semaineNum}`, champ séparé, lu en priorité par toute régénération
  complète future.
- **Levier Date de course** : régénération complète via
  `Engine.generatePlan()`, avec règles de phase (`appliquerReglesPhase()`)
  — Spécifique en cours ne repasse jamais en Construction ; Affûtage +
  décalage ≤1 semaine ne recalcule pas (juste la date change) ; décalage
  ≥8 semaines avertit de créer un nouveau plan plutôt que de prolonger.
  Cycle de décharge peut se désynchroniser légèrement après un changement
  de date — limite mineure acceptée.
- **Écran résultat (step 10)** — bloc "Plan complet" (semaine par
  semaine, `renderSemaineHtml`) RETIRÉ : dupliquait un second système de
  visualisation du plan, différent de celui de l'app principale
  (`renderWeekDetail`/cartes), créant une rupture visuelle juste après la
  génération. Le bouton "Terminer" (déjà présent, sauvegarde puis
  redirige vers l'app) reste le seul point de consultation réelle du
  plan une fois généré.

**Écran "Choix du type de plan" (`choix-mode-contenu`,
`public/v2/index.html`)** — tout premier écran du wizard : Objectif
course / Mode forme / Reprise en douceur. Mention santé courte affichée
sous les options ("⚕️ Consulte un médecin avant de démarrer
un programme d'entraînement...") — texte complet accessible ensuite via
Réglages ou le bandeau dashboard, cf. inventaire chantier "Recommandations
santé".

**Navigation du wizard** — `ECRANS_WIZARD` (registre centralisé) +
`afficherEcranWizard(id)` masque tous les écrans puis affiche seulement
celui demandé. Swipe horizontal entre étapes d'un même flux
(`attacherSwipeEtapes()`, détection deltaX/deltaY, seuil 50px) — jamais
entre écrans de haut niveau. Validations bloquantes avant l'étape suivante
: temps de référence, objectif, volume hebdomadaire, jour de sortie
longue. sessionStorage nettoyé au retour volontaire à l'app.

**Roulettes de saisie de temps/volume** (temps de référence, objectif,
estimation alternative, volume hebdomadaire manuel) — composant partagé
(`creerColonneRoulette`), boutons +/- en complément du geste de
défilement tactile, seul le chiffre actif reste visible pendant le
défilement. Positionnement initial vérifié par condition réelle (élément
visible, `offsetParent !== null`, polling 16ms) plutôt que par délai
arbitraire — un `setTimeout`/`requestAnimationFrame` seul est insuffisant
au tout premier rendu d'un écran. Même composant côté Réglages (records
personnels, cf. ci-dessus) et onboarding (cf. `auth-et-publication.md`).

**Non fait** : audit no-scroll systématique du wizard — nécessite un rendu
réel en navigateur, approche retenue = tests réels au cas par cas plutôt
qu'estimation. Padding bas résiduel de l'ancien footer (retiré en v17.6)
nettoyé dans `.content` (130px → 32px).

## Écrans de l'app principale (`index.html`)

Fonctions de rendu (`render*`) :
- `renderSelecteurPlan` — sélection entre plusieurs plans actifs, condensé
  sur la même ligne que le bouton "Configurer plan" (`display:flex`, plus
  d'empilement pleine largeur)
- `renderDashboard` — écran d'accueil, résumé de la semaine. Deux
  bandeaux en tête (après le sélecteur de plan) : anniversaire
  (`estAnniversaireAujourdhui()`, éphémère, disparaît de lui-même le
  lendemain, pas de bouton fermer) et recommandations santé (persiste
  jusqu'à fermeture explicite, cf. bandeaux iOS/santé plus haut). Ne
  propose PAS le glissement de séance (cf. section swap ci-dessous,
  "Où le glissement est disponible") — cartes "Aujourd'hui" et "⚡ Demain"
  restent de simples liens de navigation vers `weekDetail` sur cet écran.
- `renderWeeks` / `renderWeekDetail` — vue calendrier et détail semaine.
  `renderWeeks` porte l'accordéon "Modifier mon plan" (cf. section dédiée
  ci-dessus). `renderWeekDetail` est le SEUL écran où le glissement de
  séance (poignée dédiée) est disponible, cf. section swap ci-dessous.
- `renderStatusRow`, `showSessionMenu`, `showMoveMenu`, `showRestoreMenu` — gestion des séances (cf. section swap ci-dessous pour le modèle de données)
- `renderStats` — statistiques (ACWR, monotonie de charge, section "Mes courses", etc.)
- `renderCourse` — page jour de course (horaires, parcours, résultat enrichi, stratégie)
- `renderHelp` — aide (cf. plus bas)
- `renderSettings` — profil coureur, records personnels, tokens, notifications, abonnement, recommandations santé (ligne autonome tout en bas, hors accordéon), groupe accordéon Maintenance (recalcul km cumulés + les deux outils de réparation ponctuelle de l'accordéon "Modifier mon plan", cf. section dédiée ci-dessus)
- `renderBadges` — écran détaillé des badges
- `render` — orchestrateur principal
- `ouvrirSignalementProbleme` — modale accessible via le bouton 💬 des headers
- `ouvrirPpsModale` — modale PPS (cf. plus bas)
- `ouvrirModaleTexte` — factory générique de modale texte lecture seule
  (titre + sections), utilisée par les 3 modales suivantes : tailles
  unifiées (titre 18px/800, sous-titre 15px/700, corps 14px/lineHeight
  1.6), même pattern d'overlay plein écran que `ouvrirPpsModale()`.
- `ouvrirRecommandationsSanteModale` — texte complet : avis médical,
  signaux d'alerte à l'effort, limites de l'app.
- `ouvrirCguModale` / `ouvrirPrivacyModale` — texte des Conditions
  générales d'utilisation / Politique de confidentialité, dupliqué depuis
  `public/cgu.html`/`public/privacy.html` (SOURCE DE VÉRITÉ = ces fichiers
  statiques, toute mise à jour de texte doit être répercutée aux deux
  endroits). Réglages : lien CGU/Confidentialité ouvre ces modales
  (remplace l'ancien `window.open("_blank")`).
- `renderTestSemiCooperRow` — carte du jour (Mode Forme sans référence, cf. `auth-et-publication.md`)

**Carte "Aujourd'hui" (todayEl)** — principe "rien à ouvrir". Header de
séance en 2 lignes empilées (retour utilisateur : le descriptif complet
de la séance, potentiellement long, était comprimé/tronqué quand il
partageait une seule ligne flex avec les icônes) : ligne 1 = badge +
descriptif complet (`s.session`, jamais tronqué, wrap normal) ; ligne 2 =
distance (calculée depuis `kmEstime`, jamais reparsée depuis le texte) et
icônes groupées ensemble à la fin de la ligne (`justifyContent:
"flex-end"`), dans le même conteneur flex-wrap que badge+texte pour que
le groupe suive naturellement la fin du texte plutôt que d'être
systématiquement rejeté sur une 3e ligne visuelle. Icône ⌚
(`renderIconeStructureMontre`, structure à programmer sur montre, agrandie
avec libellé "Détail séance" sur cette carte via le paramètre
`avecLibelle`) affichée uniquement si la séance n'est pas encore validée ;
icône ✏️ (`renderIconeSaisieManuelle`, également agrandie avec libellé sur
cette carte) toujours visible, avant et après validation. Popover des deux
icônes en `position:fixed` avec calcul dynamique de la position au clic
(borné au viewport, jamais hors écran) plutôt qu'`absolute` ancré sur
l'icône elle-même. Bloc "🎯 Pourquoi cette séance" (`renderPourquoiToggle`,
cf. `pourquoi-seance.md`) sous le texte de la séance, repli/dépli au clic
— retourne `null` si la séance n'a pas de `pourquoi` (séance de course, ou
plan généré avant l'ajout du mécanisme, non rattrapé rétroactivement).
Bloc "⚡ Allures cibles" (Effort/Récupération) RETIRÉ (retour utilisateur :
redondant avec l'allure déjà présente dans le texte principal de la
séance). Bloc échauffement/retour au calme en clair (▶/◀) également
RETIRÉ — cette info ne vit plus que dans le popover ⌚, volontairement
laissé redondant avec la montre selon Laurent ("c'est tout de même
important"). Dès qu'un statut ✅/⚠️/❌ est posé, le bloc "Réalisé"
(`renderBlocRealise`) prend le relais : résumé chiffré + ligne "X
répétitions · Y/Z dans la cible · ▼ détail" qui déplie les laps
individuels au clic. Stylo ✏️ coloré (fond `var(--accent)` plein, texte
blanc) quand une saisie manuelle existe (`manualPerf[uid]`), gris neutre
sinon. Cas sans Strava ET sans saisie manuelle existante : le clic sur
✅/⚠️/❌ ouvre automatiquement le formulaire de saisie manuelle une seule
fois (`uidAOuvrirPopoverSaisie`, variable transitoire de scope module).

**Aide — tutos par action en tuiles** — section "🛠️ Tutos par action" dans
`HELP_SECTIONS`, en coexistence avec 7 sections thématiques classiques
(Démarrer / Comprendre les écrans / Comprendre les séances / Pour aller
plus loin / Comprendre le moteur Yoria / Types de plan / Sources de
données / FAQ, rendu en accordéon inchangé). Sélecteur à deux onglets
segmentés ("Aide" / "Tutos", style pilule) en haut de l'écran — l'onglet
Tutos affiche une grille de tuiles (2 colonnes, hauteur fixe 112px, icône
+ titre) regroupées par thème (`TUTOS_GROUPES` : Démarrer / Au quotidien /
Gérer son plan / Suivi / Compte), un clic ouvre le tuto en vue détail. 17
tutos couvrant : créer un plan, test semi-Cooper, choisir sa source de
données, carte "Aujourd'hui", import .fit, programmer sur montre,
readiness/RPE, répondre à une proposition d'ajustement, échanger deux
séances (cf. section swap ci-dessous pour le mécanisme réel), course
intermédiaire, modifier son plan, estimation de performance, lire les
Stats, jour de course, Strava, PPS, abonnement. Chaque tuto porte
`id`/`icon`/`title`/`text` (résumé pour la recherche) et `blocks`
(paragraphes/titres/liste/image) pour un rendu riche — `text` reste le
seul champ utilisé par les 7 sections classiques (fallback texte brut si
`blocks` absent). La recherche (`_helpRecherche`) reste transversale aux
deux onglets. Reste ouvert : aucun tuto n'a encore d'image (le format
`blocks` supporte déjà `{type:"img", src, alt, caption}` sans changement
de code nécessaire).

**Architecture aide** : contenu extrait dans `public/help-content.js`
(module de données pur, aucun DOM), importé dynamiquement au premier
affichage, mis en cache (`_helpContentCache`) — éditer un texte d'aide ne
touche plus jamais `index.html`, sauf pour ajouter un nouveau type de bloc
au renderer `rendreBlocsItem()`.

**Barre de navigation** — montée dans `#nav-root`, conteneur distinct de
`#app` (via `replaceChildren`), pour éviter le flash de la barre à chaque
render. `setView()` scrolle en haut AVANT `render()`. **Même pattern
réutilisé pour l'en-tête fixe de l'accordéon "Modifier mon plan"**
(`#accordeon-plan-root`, cf. section dédiée ci-dessus).

**`render()`** — remplacement atomique du contenu : le nouveau
header/contenu est entièrement construit d'abord, puis substitué à
l'ancien en une seule opération (`app.replaceChildren(...)`) à la toute
fin de la fonction — aucune frame intermédiaire avec `#app` vide n'est
peinte. Recalcule aussi en tête de fonction toutes les dérivées du plan
(cf. section dédiée plus haut) et monte/vide l'en-tête fixe de l'accordéon
"Modifier mon plan" selon l'onglet actif.

**`renderDiffere()`** — regroupe les mises à jour asynchrones automatiques
(badges débloqués, message du coach, météo actuelle, notes météo J+1,
reconstruction de l'historique de prédiction) en un seul rendu si elles
arrivent à moins de 50ms d'écart (debounce, `_renderDiffereTimer`).
Réservé aux mises à jour SANS retour utilisateur immédiat attendu — toute
action explicite (clic, saisie) continue d'appeler `render()` directement.
`render()` annule systématiquement tout timer `renderDiffere()` en
attente à chaque exécution. `renderDiffereChargementInitial()` :
mécanisme dédié au premier chargement, compte explicitement les 3 sources
automatiques (badges, météo actuelle, météo J+1) et attend leur résolution
effective plutôt qu'un délai fixe, avec filet de sécurité à 15s. Fondu CSS
d'entrée (`fadeIn`) désactivé sur toute cette fenêtre de chargement
initial, pas seulement le tout premier `render()`, pour éviter qu'il ne
soit relancé sur un contenu déjà stable.

**Swipe horizontal entre onglets** — actif sur les vues de `NAV` (pas
`weekDetail`/`help`), détection par direction dominante du geste, seuil
50px.

**`predict10K()` calculé à la demande** — seulement pour
`dashboard`/`stats`/`course` (`VUES_AVEC_PRED`), pas à chaque `render()`.
Sur le dashboard, condensé en une jauge courbe (arc SVG, `heroPredHybride`)
avec chiffre central et repères "Départ"/"Objectif" aux extrémités —
remplace l'ancien bloc `heroPred` détaillé en affichage direct ; `heroPred`
reste utilisé mais uniquement comme panneau détail replié, ouvert au clic
sur la jauge (fourchette, stats, sources).

**Icône ✏️ unifiée (saisie manuelle + import FIT)** — regroupe la saisie
allure/FC et l'import `.fit` derrière une seule icône
(`renderIconeSaisieManuelle()`), dans le header de la carte, juste avant
le badge de statut — identique sur la carte "Aujourd'hui" et le détail
Semaine (paramètre `avecLibelle` optionnel, cf. section carte "Aujourd'hui"
ci-dessus, réservé à la carte "Aujourd'hui"). Visible avant ET après
validation. Le popover contient le bouton d'import `.fit` (si `dataSource
=== "fit"` et aucune activité déjà présente) puis la saisie manuelle,
repliée par défaut. Auto-ouverture du popover après un clic manuel sur
✅/⚠️/❌ sans activité existante — jamais sur validation automatique via
synchro (`uidAOuvrirPopoverSaisie`).

**Saisie manuelle — détail des intervalles réussi/raté** — pour toute
séance avec `structureIntervalles` (VMA/SEUIL/SPEC), grille de boutons
✓/✕, un par répétition attendue (calculée depuis `blocs[].repetitions ×
nbSeries`), pré-cochée "réussi" par défaut. Volontairement réussi/raté
seul, pas d'allure par intervalle. Stocké dans `manualPerf[uid].intervalles`
(tableau de booléens). Affiché dans le bloc "Réalisé" sous forme d'un
résumé "N répétitions · X/N réussies".

**Saisie manuelle — laps synthétiques par répétition, alignés sur le
format Strava/FIT** — `construireLapsManuels()` (locale à `index.html`,
appelée uniquement à la sauvegarde de la saisie) construit un lap
SYNTHÉTIQUE par répétition attendue de `structureIntervalles`, dans le
même format qu'un lap Strava (`{distance, average_speed,
average_heartrate:null, _source:"manuel", _reussi:bool}`), stocké dans
`manualPerf[uid].laps`. Un intervalle marqué ✕ (raté) produit quand même
un lap (pour l'affichage/comptage km), mais porte `_reussi:false` — exclu
du calcul de vitesse pondérée du prédicteur (`weightedAvgByEffortDuration()`,
cf. `saisie-et-integrations.md`). Si TOUS les intervalles d'une séance sont ✕, aucun lap n'est
retenu pour l'estimation. Toute saisie manuelle antérieure à ce champ
(sans `.laps`) reste couverte par un repli complet sur l'ancien "lap
virtuel unique agrégé" (cf. `saisie-et-integrations.md`).

**Badge de statut carte (haut à droite, vue Semaine)** — vrai emoji
(`statutEffectif`) affiché tel quel, sans rond de fond, taille 20px pour
la lisibilité (`el("span", {fontSize:"20px"}, statutEffectif)`).

**Mini-frise semaine** (`L M M J V S D`) — deux dictionnaires locaux
(`TYPE_SEANCE_COULEUR`, `TYPE_SEANCE_LABEL`), distincts du dictionnaire
global `STYPES`, couvrent tous les types de séance dont `TEST`.
`renderGrilleJoursSemaine()` passe par `getEffectiveSession()` (cf.
section swap ci-dessous) pour refléter le contenu réel après un
échange.

**Bandeau "Strava déconnecté" sur le dashboard** — affiché seulement si
`dataSource === "strava"` ET (`stravaAuthInvalide` : token présent mais
invalide/expiré, OU `!stravaToken` : aucun token du tout) — lien direct
vers `/api/strava/auth`, même route que Réglages.

**Stepper d'allure de la saisie manuelle** — boutons ±5s/km (plus rapide
avec "−", plus lent avec "+", comme un stepper numérique classique) +
boutons de réglage fin ±1s/km accolés.

**Onglets Stats et Course — accordéons thématiques** —
`renderGroupeAccordeonStats()` (composant générique, réutilisé pour Course
via `renderGroupeAccordeonCourse()`), repliés par défaut. État
ouvert/fermé persistant entre les `render()` successifs via un registre au
niveau module (`etatGroupesAccordeon`, indexé par titre de groupe — les
titres doivent rester uniques tous onglets confondus). Stats : 6 groupes
(Objectif et progression / Charge et récupération / Performance technique
/ Référence / Mes courses / Tests). Course : 2 groupes (Préparation
pratique / Stratégie) — Météo et Résumé de préparation restent hors
accordéon. Accepte un callback optionnel `onOuverture`, appelé à chaque
ouverture du groupe : utile pour tout contenu construit alors que le
groupe est fermé et qui a besoin d'un traitement différé une fois
réellement visible. Réservé aux groupes ayant réellement PLUSIEURS
éléments — un groupe à un seul élément (ex. l'ancienne section "Santé")
n'apporte rien et double le nombre de clics nécessaires ; dans ce cas,
insérer l'élément directement dans l'assemblage final (cf. inventaire,
principe UI dédié).

**"🏅 Mes courses" (Stats)** — groupe accordéon listant l'historique des
résultats de course saisis sur TOUS les plans du compte (pas seulement le
plan actif), triés du plus récent au plus ancien : date, distance/nom de
course, temps, ressenti, classements général/catégorie, commentaire.
Chargement ASYNCHRONE à la première ouverture du groupe (`onOuverture`),
résultat mis en cache pour le reste de la session (`mesCoursesCache`,
module-level) — lecture Supabase multi-plans
(`LkSync.chargerResultatsCoursesSupabase`, cf. `persistance-donnees.md`).

**Bouton "🩺 PPS" (Pass Prévention Santé FFA)** — header, toutes vues où
`appHeaderEl` est rendu, toujours visible, ouvre `ouvrirPpsModale()` :
import, aperçu, suppression réunis en un seul endroit. Tout document
importé (PDF ou photo) est stocké comme une image JPEG compressée
(`profilCoureur.ppsDocument = {data, type:"image/jpeg", nomFichier}`,
`profilCoureur.ppsExpiration`), synchronisé via `sauvegarderProfilCoureur()`.
PDF converti en image dès l'import (jamais stocké tel quel) : rendu de la
première page via pdf.js (`chargerPdfJs()`, import dynamique jsDelivr, même
pattern que `chargerFitParser()` pour le FIT) en canvas puis JPEG qualité
0.85, échelle jusqu'à 2x plafonnée à 1600px — le rendu PDF via
`<iframe>`/`<embed>` n'est pas fiable sur mobile/TWA Android (pas de
lecteur PDF intégré). Seule la première page est conservée. Photo
importée : compression identique aux autres images de l'app
(redimensionnement max 1600px, JPEG 0.82). Extraction automatique de la
date d'expiration non retenue (peu fiable sur le gabarit FFA observé) —
saisie manuelle de la date reste le seul chemin. Alerte visuelle si
expiration ≤30 jours.

**Onglet Réglages — 7 groupes accordéon + 2 lignes autonomes** — Compte
et abonnement / Profil coureur / Records personnels / Intégrations /
Export / Maintenance / Version, même mécanisme de persistance d'état que
Stats/Course. Deux sections restent hors accordéon, toujours visibles :
la clôture de plan Forme (action irréversible) et le thème clair/sombre
(bouton icône discret, intégré à l'en-tête de l'app — fond blanc fixe
derrière ☀️, fond noir fixe derrière 🌙, indépendant du thème actif pour
un contraste constant). Le groupe "Profil coureur" affiche un simple
rappel PPS en lecture seule (statut + date d'expiration). Le groupe
"Maintenance" contient le recalcul du badge km cumulés et les deux outils
de réparation ponctuelle de l'accordéon "Modifier mon plan" (cohérence
des phases, correction manuelle de séance — cf. section dédiée plus
haut). Tout en bas de l'écran, hors de tout groupe accordéon : lignes
"⚕️ Recommandations santé" et "📄 Conditions générales d'utilisation" /
"🔒 Politique de confidentialité" (`recommandationsSanteSection`,
`cguSection`), ouvrent respectivement `ouvrirRecommandationsSanteModale()`,
`ouvrirCguModale()`, `ouvrirPrivacyModale()`.

**Records personnels — grille compacte avec validation explicite** —
chaque distance (5K/10K/Semi/Marathon) affiche directement sa roulette
(h/m/s) et son champ date, sans étape de clic intermédiaire. Bouton **✓
Valider** (au-dessus du bouton ✕ Effacer, regroupés verticalement) — seul
déclencheur de sauvegarde (`sauvegarderUnRecord(dist)`), plus aucune
sauvegarde automatique pendant la saisie. Bouton Effacer : remet la
roulette à 0 et marque l'état "effacé" (`dataset.recordEfface`), mais ne
sauvegarde pas non plus tout seul — il faut valider avec ✓. Même
composant déployé sur les roulettes du wizard (cf. ci-dessus) et de l'onboarding
(cf. `auth-et-publication.md`). Le badge "record_battu" ne se déclenche PAS depuis cette saisie
manuelle — une simple correction de record dans Réglages n'est pas
considérée comme un événement "célébrable".

**Composants nichés dans un groupe accordéon fermé au chargement** — tout
composant scrollable (roulette, carrousel) construit alors que son
conteneur parent est dans un groupe accordéon fermé doit prévoir un
callback `onOuverture` qui le construit à la demande s'il n'existe pas
encore, en plus de la tentative au chargement — sinon le conteneur n'est
jamais visible pendant la fenêtre d'attente, et l'élément n'est jamais
construit du tout.

**Garde-fou de fonctions critiques** (`CRITICAL_FNS_REFS`) — vérification
affichant un warning si une fonction attendue est absente au chargement.
Ne doit lister QUE des fonctions réellement `export`ées ; une fonction
privée y figurant à tort génère un faux warning permanent.

## Échange de séances (swap) — modèle en table d'assignation directe

**Historique** — ce mécanisme a connu deux modèles de données successifs :
1. Un premier modèle en dictionnaire simple (`swappedSessions[uid] =
   uidSource`), abandonné car il pouvait perdre ou dupliquer une séance
   lors d'une annulation partielle sur une rotation à 3+ maillons.
2. Un modèle en paires atomiques (`swapPairs = [{a, b}, ...]`), résolu par
   parcours de chaîne (`sourceSwap()`). Mathématiquement correct — vérifié
   par simulation exhaustive sur des milliers de séquences aléatoires —
   mais produisait un comportement **ambigu et surprenant** dès que 3+
   positions étaient impliquées dans des échanges qui se chevauchaient :
   re-glisser une position déjà échangée vers une troisième forçait à
   trancher ce que devenait son ANCIEN partenaire, sans réponse
   universellement satisfaisante (le faire "suivre" le nouveau swap
   recréait le symptôme de décalage non désiré ; le faire revenir à
   lui-même annulait silencieusement un échange antérieur que
   l'utilisateur n'avait pas demandé à défaire). **Ce modèle a été
   entièrement abandonné** — retenir comme principe transverse que ce
   genre de comportement ambigu, découvert après plusieurs correctifs
   infructueux sur le même mécanisme, est le signal qu'il faut réévaluer
   l'architecture elle-même (cf. `inventaire-application.md`, principe
   "Workflow de développement").

**Modèle actuel — table d'assignation directe** : `swapTable = { uid:
uidSource }`. Chaque position a une valeur explicite et indépendante,
jamais déduite d'une chaîne de résolution — un swap entre A et B ne touche
QUE `swapTable[A]` et `swapTable[B]`, aucune autre entrée n'est jamais lue
ni modifiée. Cette propriété élimine l'ambiguïté du modèle précédent par
construction : la question "que devient une position tierce" ne se pose
simplement plus, puisqu'aucune position tierce n'est jamais concernée par
un swap qui ne la mentionne pas explicitement.

- **`sourceSwap(uid)`** — lecture directe : `swapTable[uid] || uid`.
  Protégée par un `try/catch` (piège TDZ, cf. section "Règle TDZ"
  ci-dessus) : `recalculerAllSessions()` l'appelle en cascade dès le tout
  premier calcul (ligne ~1118), avant que `let swapTable = ...` (ligne
  ~1486) ne soit atteinte par le fil principal du script — repli sûr sur
  `uid` pour ce cas précis, corrigé par le recalcul de rattrapage juste
  après le vrai chargement de `swapTable`.
- **`echangerSwap(uidA, uidB)`** — échange ce qui est AFFICHÉ à ces deux
  positions. Résout `sourceA`/`sourceB` (ce que chaque position affiche
  actuellement), puis écrit directement `swapTable[uidA] = sourceB` et
  `swapTable[uidB] = sourceA` (avec `delete` plutôt qu'une valeur
  identité quand une position doit revenir à afficher son propre
  contenu). Toggle : si `uidA` et `uidB` étaient déjà mutuellement
  échangés entre eux, le nouveau clic retire les deux entrées plutôt que
  d'en recréer, redonnant "chacun affiche soi-même" pour les deux.
  Vérifié par simulation sur 5000+ séquences aléatoires (bijection
  toujours maintenue, aucune source dupliquée ni perdue) et sur le
  scénario réel qui a motivé cette refonte (glisser deux jours affichant
  déjà un contenu échangé, après plusieurs swaps précédents dans la même
  semaine — confirmé sans effet sur aucune position tierce).
- **`annulerSwapSur(uid)`** — retire l'entrée de `uid` dans la table ; si
  son partenaire (`swapTable[uid]`) affichait réciproquement `uid`, retire
  aussi l'entrée de ce partenaire, pour ne jamais laisser une relation à
  moitié défaite.
- **`getEffectiveSession(week, slotIdx)`** — point d'entrée UNIQUE pour
  lire le contenu affiché d'un slot après swap éventuel. Toute nouvelle
  fonction qui calcule des statistiques ou un affichage à partir des
  séances d'une semaine DOIT passer par cette fonction, jamais lire
  `week.sessions[i]` directement.

Migration automatique et silencieuse depuis l'ancien `lk_swap_pairs` au
premier chargement (résolution de chaque position concernée via l'ancienne
logique de chaîne, UNE SEULE FOIS, figée dans `lk_swap_table`) — anciennes
clés (`lk_swap_pairs`, `lk_swapped_sessions`) conservées en storage comme
filet de sécurité temporaire.

Utilisée par `renderGrilleJoursSemaine`, `renderWeekDetail`, `weekStats`,
`weeklyReport`, `weekPct`, `recalculerAllSessions`.

**Déplacement d'un jour passé** — bloqué par défaut (traité comme "déjà
réalisé"), SAUF pour un jour de la semaine EN COURS (`currentWeek()`)
sans aucune trace d'activité (statut/note/RPE/saisie) — dans ce cas
précis, le déplacement reste possible. Toute semaine antérieure reste
bloquée sans exception.

**Où le glissement est disponible** — uniquement `renderWeekDetail` (vue
détail de semaine). Retiré du dashboard (`renderDashboard`) après
plusieurs tentatives infructueuses de le rendre fiable sur cet écran
(structure de carte partagée "aujourd'hui + demain" trop dense
visuellement pour une zone de contact tactile fiable au toucher) — les
cartes du dashboard restent de simples liens de navigation vers
`weekDetail`, où le glissement réel se fait.

**Mécanisme de glissement (Pointer Events, pas HTML5 Drag & Drop)** —
`cablerDragDropSeance(cardEl, handleEl, week, slotIdx, peutEtreSource)` :
- L'API HTML5 Drag & Drop native (`draggable`, `dragstart`/`dragover`/
  `drop`) a été essayée en premier et abandonnée : elle n'a structurellement
  pas de support tactile fiable (conçue pour la souris), ne se déclenche
  pas correctement au doigt sur la plupart des navigateurs mobiles/WebView
  Android. Remplacée entièrement par les **Pointer Events**
  (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`), qui unifient
  souris et tactile dans une seule API, un seul chemin de code pour les
  deux.
- **Poignée dédiée** (`handleEl`, icône `⠿`, ~24×24px, affichée en fin de
  la première ligne de la carte, à côté du badge de statut) — glisser
  n'importe où sur la carte entière rendait le scroll vertical de la page
  très difficile (`touch-action:none` devait couvrir toute la carte pour
  un glissement fiable, bloquant aussi le scroll normal sur cette même
  zone). Avec la poignée, seule cette petite zone porte
  `touch-action:none` — le reste de la carte reste scrollable normalement.
  `cardEl` reçoit toujours `dataset.swapUid` (cible de dépôt, même carte
  non déplaçable), seul `handleEl` reçoit `draggable`-équivalent
  (`pointerdown`).
- **Retour tactile** : vibration (`navigator.vibrate(35)`, échoue
  silencieusement sur iOS Safari) au contact avec la poignée. Le
  glissement démarre au premier mouvement franchissant
  `SEUIL_GLISSEMENT_PX` (12px) — pas de délai d'armement (existait dans
  une version intermédiaire pour distinguer un scroll d'un glissement sur
  toute la carte, devenu inutile avec la poignée dédiée qui élimine ce
  risque de confusion par construction).
- **Fantôme visuel** : clone de `cardEl` entière (`cloneNode(true)`,
  jamais juste la poignée), `position:fixed`, suit le pointeur avec un
  décalage calculé depuis le coin de la carte source (pas de la poignée).
  Effet "carte soulevée" (`scale(1.04)`, ombre renforcée). Les listeners
  d'événements ne sont jamais clonés par `cloneNode` — la poignée clonée à
  l'intérieur du fantôme n'a aucun `pointerdown` actif, aucun risque de
  double déclenchement.
- **Cible détectée** via `document.elementFromPoint()` +
  `closest("[data-swap-uid]")` — le fantôme porte `pointerEvents:"none"`
  pour ne jamais se cibler lui-même. Limitée à la même semaine que la
  source.
- **Auto-scroll** pendant le glissement (`demarrerAutoScrollSiNecessaire()`,
  boucle `requestAnimationFrame`) : zone de déclenchement 80px depuis le
  haut/bas de la fenêtre visible, vitesse proportionnelle à la proximité
  du bord — nécessaire car `touch-action:none` empêche tout scroll natif
  pendant un glissement actif.
- Toute séance (y compris REPOS) peut être source de glissement — seule
  RACE reste exclue. Les gardes de garde anti-séance-déjà-réalisée
  (`getAvailableSlots`, même logique que le menu tap) s'appliquent
  identiquement, qu'il s'agisse de source ou de cible.

**Menu tap (alternative au glissement)** — `showSessionMenu()` reste le
repli pour toute la logique déjà décrite (Déplacer via `showMoveMenu()`,
Annuler le déplacement). Déclenché par **double tap/double-clic**
(`attacherDoubleTap()`, deux `click` à moins de 350ms d'intervalle — un
`click` se déclenche nativement à la fois pour une souris et un tap
tactile, pas besoin de gérer les deux séparément). L'ancien déclencheur
(appui long, `touchstart`+`setTimeout(600ms)`, + `contextmenu` pour le
clic droit desktop) a été retiré entièrement : sur mobile, un appui long
tactile déclenche NATIVEMENT l'événement `contextmenu` du navigateur, pas
seulement le clic droit souris — retirer uniquement le timer JS ne
suffisait pas à empêcher le menu de s'ouvrir à l'appui long, il fallait
aussi retirer le listener `contextmenu` lui-même. Double tap devient donc
le seul déclencheur, desktop comme mobile, RACE exclue (comme le
glissement).

**Comportements natifs désactivés globalement (toute l'app)** — deux
règles CSS ajoutées suite au glissement de séance, mais appliquées sur
`*`/`html`/`body`, pas seulement sur les cartes :
- `overscroll-behavior-y: contain` (`html`, `body`) — empêche le
  pull-to-refresh natif du navigateur/TWA sur toute l'app.
- `user-select: none` (global) avec exception `input`/`textarea` (`user-
  select: text`) — empêche la sélection de texte native partout, sauf
  dans les vrais champs de saisie qui restent normalement
  éditables/sélectionnables.

## Écrans statiques hors JS (splash, chargement)

**Écran de chargement (logo Y, entre le splash Android natif et le
premier `render()`)** — HTML/CSS pur dans le `<body>` d'`index.html`,
visible dès le tout premier paint, avant tout script. Dimensions
calculées en JavaScript synchrone (pixels absolus, `window.innerWidth`)
plutôt qu'en CSS pur — `width:Xvw`/`aspect-ratio` peu fiables sur la
vraie WebView Android (différent du rendu Chromium desktop/Playwright).
Toute calibration future de ce type d'écran (position, taille, couleur)
doit être mesurée sur de vraies vidéos de contrôle de l'appareil cible,
jamais uniquement sur un rendu desktop. Logo Y sur fond dégradé marine,
reproduisant l'icône `icon-512.png`. Slogan "Ton coach running personnel"
sous le logo (repris du `manifest.json`), Inter italique léger. Masqué
par `render()` dès le tout premier rendu réel.
