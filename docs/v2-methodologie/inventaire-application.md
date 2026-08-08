# Inventaire de l'application "Yoria"

> Vue d'ensemble de référence — état ACTUEL du système, à relire en début de
> session. Organisé par thème, pas par session. **L'historique des correctifs,
> bugs et versions livrées vit uniquement dans `changelog.classic.js`** — ne
> pas le dupliquer ici.
>
> ⚠️ **Mettre à jour ce fichier à chaque changement structurel** (nouvel
> écran, nouvelle clé de stockage, nouvelle intégration, pipeline modifié,
> chantier ouvert/fermé). Un simple correctif de bug va dans le changelog,
> pas ici. Rester concis : état actuel + pièges connus, jamais le récit du
> diagnostic, jamais de date.

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
│   ├── delete-account.js         # Suppression définitive d'un compte (cascade)
│   ├── backup.js                 # Export global / ciblé utilisateur / réinjection / diagnostic cascades (cf. §5)
│   ├── beta.js                   # Candidature bêta (public)
│   └── beta-admin.js             # Administration bêta (invitations, abonnements gratuits, signalements)
├── docs/
│   ├── legal/                    # Confidentialité, CGU/CGV, RGPD, Play Store data safety
│   └── v2-methodologie/
│       ├── inventaire-application.md   # CE FICHIER
│       ├── bibliotheque-seances.md     # Méthodologie des types de séances qualité
│       ├── import-fit-intervalles.md   # Conception + implémentation import .fit (cf. §10)
│       ├── diagnostic-cascades-user-id.sql  # Fonctions RPC pour l'onglet Cascades (beta-admin)
│       └── (autres docs de contexte : jour-de-course, source-donnees-seances, etc.)
├── public/
│   ├── index.html                 # App principale (dashboard, ~11700 lignes)
│   ├── help-content.js            # Contenu de l'aide (données pures, cf. §4)
│   ├── privacy.html
│   ├── beta/                      # Page candidature bêta publique
│   ├── beta-admin/                # Interface admin bêta (index.html, script.js, styles.css)
│   │                              # Onglets : Candidatures, Sélectionnés, Invités,
│   │                              # Signalements, Comptes, Sauvegarde, Cascades, Statistiques
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
│           ├── fit-detection.js   # Détection d'intervalles depuis un .fit sans marqueurs natifs (cf. §10)
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
classiques uniques sans équivalent module ES. **Exception** :
`plan-generator.js` n'a pas de `.classic.js` — `index.html` le charge via
dynamic `import()` (`window._planGeneratorModule`).

**Règle TDZ (temporal dead zone)** : toute promesse globale attendue
ailleurs (`window.__AUTH_PRET__`), ou toute variable `let`/`const` lue par
du code exécuté tôt (`_renderDiffereTimer`, `stravaToken`,
`swappedSessions`...), doit être déclarée de façon synchrone, AVANT tout
code qui pourrait la lire — y compris du code placé après un `await` mais
techniquement situé avant la déclaration dans le fichier. Un `typeof` ne
protège pas de ce piège. Toute variable lue par une même fonction
(`recalculerAllSessions()`/`getEffectiveSession()`) doit être vérifiée
individuellement, pas seulement la première trouvée.

**Toute mutation d'un état source de `ALL_SESSIONS`** (`statuses`,
`swappedSessions`) doit être suivie d'un `ALL_SESSIONS =
recalculerAllSessions()` explicite avant tout `render()`, jamais implicite.

**Écran "Consulter un plan" — accordéon "Modifier mon plan"
(`public/v2/index.html`)** — 4 leviers de simulation d'un plan actif
(Objectif, Jours, Volume, Date de course), un seul ouvert à la fois.
Simulation LIVE de l'impact avant validation, jamais appliqué sans clic
explicite sur "Appliquer". Application à partir de la SEMAINE SUIVANTE
uniquement — la semaine en cours et les précédentes gardent leur contenu
original.
- **Levier Jours** : réutilise `.days-grid` (`daysGridSimulation`), permet
  aussi de déplacer uniquement la sortie longue. `Engine.nbQualiteFor(nbJours,
  niveau)` fait varier le rythme de progression proportionnellement au
  nombre de séances QUALITÉ.
- **Levier Objectif** : garde-fou de faisabilité en direct
  (`verifierFaisabiliteNouvelObjectif`), avertit seulement — change QUE
  l'allure course (`allures.C`), jamais VMA/SEUIL/EF (dépendent uniquement
  de la forme réellement mesurée, cf. §7 allures dynamiques).
- **Levier Volume** : `appliquerChangementVolume()` calcule
  `semaineCharniere` AVANT l'appel à `generatePlan()` et la transmet via le
  paramètre `semaineDepartVolume` (cf. §7) — la progression redémarre
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
personnels, cf. §4) et onboarding (cf. §12).

**Non fait** : audit no-scroll systématique du wizard — nécessite un rendu
réel en navigateur, approche retenue = tests réels au cas par cas plutôt
qu'estimation.

## 4. Écrans de l'app principale (`index.html`)

Fonctions de rendu (`render*`) :
- `renderSelecteurPlan` — sélection entre plusieurs plans actifs
- `renderDashboard` — écran d'accueil, résumé de la semaine
- `renderWeeks` / `renderWeekDetail` — vue calendrier et détail semaine
- `renderStatusRow`, `showSessionMenu`, `showMoveMenu`, `showRestoreMenu` — gestion des séances
- `renderStats` — statistiques (ACWR, monotonie de charge, section "Mes courses", etc.)
- `renderCourse` — page jour de course (horaires, parcours, résultat enrichi, stratégie)
- `renderHelp` — aide (cf. plus bas)
- `renderSettings` — profil coureur, records personnels, tokens, notifications, abonnement
- `renderBadges` — écran détaillé des badges
- `render` — orchestrateur principal
- `ouvrirSignalementProbleme` — modale accessible via le bouton 💬 des headers
- `ouvrirPpsModale` — modale PPS (cf. plus bas)
- `renderTestSemiCooperRow` — carte du jour, cf. §14 (Mode Forme sans référence)

**Carte "Aujourd'hui" (todayEl)** — principe "rien à ouvrir". Header
carte : icône ⌚ (`renderIconeStructureMontre`, structure à programmer sur
montre) affichée uniquement si la séance n'est pas encore validée ; icône
✏️ (`renderIconeSaisieManuelle`) toujours visible, avant et après
validation (cf. icône unifiée plus bas). Allures cibles (`PACE_REFS`) et
FC cibles (`FC_ZONES`) affichées directement sous la séance, sans repli,
seulement si non encore validée. Dès qu'un statut ✅/⚠️/❌ est posé, le
bloc "Réalisé" (`renderBlocRealise`) prend le relais : résumé chiffré +
ligne "X répétitions · Y/Z dans la cible · ▼ détail" qui déplie les laps
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
Gérer son plan / Suivi / Compte), un clic ouvre le tuto en vue détail. 16
tutos couvrant : créer un plan, test semi-Cooper, choisir sa source de
données, carte "Aujourd'hui", import .fit, programmer sur montre,
readiness/RPE, répondre à une proposition d'ajustement, échanger deux
séances, modifier son plan, estimation de performance, lire les Stats,
jour de course, Strava, PPS, abonnement. Chaque tuto porte
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
render. `setView()` scrolle en haut AVANT `render()`.

**`render()`** — remplacement atomique du contenu : le nouveau
header/contenu est entièrement construit d'abord, puis substitué à
l'ancien en une seule opération (`app.replaceChildren(...)`) à la toute
fin de la fonction — aucune frame intermédiaire avec `#app` vide n'est
peinte.

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

**Icône ✏️ unifiée (saisie manuelle + import FIT)** — regroupe la saisie
allure/FC et l'import `.fit` derrière une seule icône
(`renderIconeSaisieManuelle()`), dans le header de la carte, juste avant
le badge de statut — identique sur la carte "Aujourd'hui" et le détail
Semaine. Visible avant ET après validation. Le popover contient le bouton
d'import `.fit` (si `dataSource === "fit"` et aucune activité déjà
présente) puis la saisie manuelle, repliée par défaut. Auto-ouverture du
popover après un clic manuel sur ✅/⚠️/❌ sans activité existante — jamais
sur validation automatique via synchro (`uidAOuvrirPopoverSaisie`).

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
cf. §7bis). Si TOUS les intervalles d'une séance sont ✕, aucun lap n'est
retenu pour l'estimation. Toute saisie manuelle antérieure à ce champ
(sans `.laps`) reste couverte par un repli complet sur l'ancien "lap
virtuel unique agrégé" (cf. §7bis).

**Badge de statut carte (haut à droite, vue Semaine)** — vrai emoji
(`statutEffectif`) affiché tel quel, sans rond de fond, taille 20px pour
la lisibilité (`el("span", {fontSize:"20px"}, statutEffectif)`).

**Mini-frise semaine** (`L M M J V S D`) — deux dictionnaires locaux
(`TYPE_SEANCE_COULEUR`, `TYPE_SEANCE_LABEL`), distincts du dictionnaire
global `STYPES`, couvrent tous les types de séance dont `TEST`.

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
réellement visible.

**"🏅 Mes courses" (Stats)** — groupe accordéon listant l'historique des
résultats de course saisis sur TOUS les plans du compte (pas seulement le
plan actif), triés du plus récent au plus ancien : date, distance/nom de
course, temps, ressenti, classements général/catégorie, commentaire.
Chargement ASYNCHRONE à la première ouverture du groupe (`onOuverture`),
résultat mis en cache pour le reste de la session (`mesCoursesCache`,
module-level) — lecture Supabase multi-plans
(`LkSync.chargerResultatsCoursesSupabase`, cf. §5/§11).

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

**Onglet Réglages — 6 groupes accordéon** — Compte et abonnement / Profil
coureur / Records personnels / Intégrations / Export / Version, même
mécanisme de persistance d'état que Stats/Course. Deux sections restent
hors accordéon, toujours visibles : la clôture de plan Forme (action
irréversible) et le thème clair/sombre (bouton icône discret, intégré à
l'en-tête de l'app — fond blanc fixe derrière ☀️, fond noir fixe derrière
🌙, indépendant du thème actif pour un contraste constant). Le groupe
"Profil coureur" affiche un simple rappel PPS en lecture seule (statut +
date d'expiration).

**Records personnels — grille compacte avec validation explicite** —
chaque distance (5K/10K/Semi/Marathon) affiche directement sa roulette
(h/m/s) et son champ date, sans étape de clic intermédiaire. Bouton **✓
Valider** (au-dessus du bouton ✕ Effacer, regroupés verticalement) — seul
déclencheur de sauvegarde (`sauvegarderUnRecord(dist)`), plus aucune
sauvegarde automatique pendant la saisie. Bouton Effacer : remet la
roulette à 0 et marque l'état "effacé" (`dataset.recordEfface`), mais ne
sauvegarde pas non plus tout seul — il faut valider avec ✓. Même
composant déployé sur les roulettes du wizard (cf. §3) et de l'onboarding
(cf. §12). Le badge "record_battu" ne se déclenche PAS depuis cette saisie
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

## 5. Persistance

**localStorage (préfixe `lk_`)** — clés globales (profil/config) :
`lk_profil_coureur`, `lk_strava_token`, `lk_strava_refresh`,
`lk_strava_expires`, `lk_strava_activities`, `lk_last_sync`,
`lk_data_source` (préfixée par plan via `clePourPlan()` une fois un plan
disponible, repli sur la clé brute avant — cf. §12).

Clés préfixées par plan (via `clePourPlan()`) : `lk_statuses`,
`lk_hidden_sessions`, `lk_swapped_sessions`, `lk_session_notes`, `lk_notes`,
`lk_checklist`, `lk_adaptations_ignorees`, `lk_last_rebuild`,
`lk_pred_history`, `lk_race_goal`, `lk_race_horaires`, `lk_race_parcours`,
`lk_race_result`, `lk_race_result_details`, `lk_weather_cache`,
`lk_coach_msg`, `lk_coach_date`, `lk_coach_race_msg`,
`lk_resultat_test_forme`, `lk_manual_perf`, `lk_km_comptes_par_uid`.

**`lk_race_result_details`** — détail enrichi du résultat de course :
`{rpe, commentaire, classementGeneral:{place,total},
classementCategorie:{place,total}}`. Clé SÉPARÉE de `lk_race_result` (qui
reste un simple nombre de secondes, utilisé par 4 points d'appel
existants) — un résultat saisi avant l'ajout de ce champ reste valide,
ses détails sont simplement absents (`null`).

**`lk_manual_perf`** — objet `{uid: {average_speed, distance,
average_heartrate, dureeSaisieMin, intervalles, laps}}`. `distance` est
la distance TOTALE de la séance (échauffement + effort + récup + retour
au calme, cf. `distanceTotaleAvecRecup()`) — **jamais** utilisée telle
quelle par le prédicteur (cf. §7bis, qui recalcule une distance d'effort
seul). `intervalles` : tableau de booléens réussi/raté par répétition.
`laps` : tableau de laps SYNTHÉTIQUES au format Strava, un par répétition
attendue, construit à la sauvegarde par `construireLapsManuels()` (cf.
§4/§7bis). Optionnel (absent pour toute saisie antérieure à ce champ).

**`lk_km_comptes_par_uid`** — registre `{uid: kmDejaComptes}`, sert
exclusivement à rendre idempotent l'ajustement du cumul global
`profilCoureur.kmCumulesTotal` (badge "km cumulés", cf. §16) : mémorise,
par séance, combien de km ont déjà été ajoutés au total global, pour
ajuster la différence à chaque changement de statut sans jamais compter
deux fois la même séance. Local au plan (contrairement à `kmCumulesTotal`
lui-même, champ GLOBAL du profil coureur).

**Principe** : toute donnée propre à un plan doit être préfixée — une clé
globale non préfixée est un risque de contamination inter-plans.

**Convention `statuses[uid]`** : peut valoir `'—'` explicitement, pas
seulement `undefined`/absent — tout code qui teste "cette séance a-t-elle
déjà un statut" doit vérifier `statuses[uid] && statuses[uid] !== '—'`.

**Tout point qui écrit ou efface un statut (`statuses[uid]`) ou une
saisie manuelle (`manualPerf[uid]`) doit répercuter le changement sur le
cumul km (`recalculerKmComptesPourUid`) et, si le type de séance est
SEUIL/VMA/SPEC, sur l'historique de prédiction (`rebuildPredHistory()`)**.
Les points d'écriture concernés : clic manuel de statut
(`renderStatusRow`), saisie manuelle Enregistrer/Annuler, suppression
d'une activité, auto-validation en masse après synchro
(`matchActivitiesToPlan()`, le chemin le plus fréquent), choix d'une
activité ambiguë, test semi-Cooper. Tout NOUVEAU point d'écriture de ces
deux structures doit être audité contre cette liste — un `grep` exhaustif
du motif d'écriture reste plus fiable qu'une liste mentale de points déjà
identifiés.

**Supabase** — tables `plans_original` (copie figée), `plans_actif`
(version vivante), `plan_donnees`, `integrations` (colonne `v2_gist_id` en
brut), `abonnements`, `beta_testers`, `signalements`, `badges_debloques`
(cf. §11, §16). Sync Realtime activée sur `plan_donnees` (anti-écho 3s) —
établissement du canal WebSocket non-bloquant (`activerRealtime()` n'est
pas `await`-é avant le premier `render()`, le canal continue de s'établir
en arrière-plan). File d'attente de sync en cas d'échec réseau
(`lk_file_attente_sync`, 5 min, abandon après 10 essais).

**`synchroniserVersSupabase()` (`sync-storage.js`)** — merge atomique via
RPC Postgres `merger_plan_donnees(p_plan_id, p_user_id, p_cle, p_valeur)`
(`security definer`) qui fait le merge côté serveur via `data ||
jsonb_build_object(...)` en un seul `UPDATE` — élimine toute fenêtre de
lecture séparée entre deux écritures concurrentes sur des clés
différentes du même `plan_donnees.data` (jsonb). `rejouerEntreeFile()`
(file de retry réseau) utilise le même RPC — un seul chemin d'écriture
vers `plan_donnees` dans tout le fichier.

**Sauvegarde de plan — Supabase est l'unique mécanisme de persistance.**
Le système Gist v2 (`gist-sync.js`) a été entièrement retiré des écritures
— reste dans le repo uniquement pour `trouverPlanEnConflit` (garde-fou
anti-chevauchement de dates, fonction pure indépendante de la
persistance). Un plan Forme clôturé (`dateCloture` posée) ne peut plus
être écrasé via `mettreAJourPlanSupabase()`.

**`chargerResultatsCoursesSupabase(userId)` (`sync-storage.js`)** — liste
les résultats de course déjà saisis sur TOUS les plans course d'un
utilisateur (mode ≠ 'forme'), pour la section "🏅 Mes courses" (cf. §4).
Requête en N+1 (une lecture `plan_donnees` par plan) plutôt qu'un
`IN(...)` groupé — volume attendu faible.

**Sauvegarde/restauration de la base (`api/backup.js`)** — le projet
Supabase est en plan **Free**, sans Daily Backups ni PITR.
`api/backup.js`, accessible depuis `beta-admin` (onglet Sauvegarde),
comble ce manque : export global (découverte automatique des tables via
introspection PostgREST — jamais de liste blanche codée en dur), export
ciblé par utilisateur (email), et réinjection en upsert.
`decision_events`/`decision_outcomes` traités via la chaîne indirecte
(`decision_event_id`, pas de `user_id` direct sur la seconde table).
Réinjection d'un utilisateur dont le compte Auth a été supprimé :
recréation automatique avec le même `id`. Réinjection depuis un export
global : champ e-mail optionnel pour isoler un seul utilisateur — bloque
explicitement si aucune ligne ne correspond, plutôt qu'un upsert
silencieux de 0 ligne. Priorité de résolution de l'`id` : `user_id` fourni
manuellement (priorité absolue), sinon API Admin Auth, sinon table
`abonnements` de l'export.

**Garde-fou de cohérence id/données avant recréation d'un compte** — un
`id` et un `email` ne sont pas la même clé (`user_id` est la clé de
vérité pour les données applicatives). `recreerUtilisateurSiAbsent` exige
qu'au moins une ligne des données à réinjecter porte réellement cet `id`
avant de créer le compte — sinon refuse explicitement (statut 409).
Portée strictement limitée à la réparation d'une perte accidentelle —
jamais un contournement d'une suppression de compte volontaire au titre
du droit à l'effacement (RGPD art. 17).

**Diagnostic des cascades ON DELETE (`api/backup.js`, onglet Cascades de
`beta-admin`)** — vérifie proactivement que toute table applicative avec
une colonne `user_id`/`id_utilisateur` a bien `ON DELETE CASCADE` vers
`auth.users`. Repose sur deux fonctions RPC Postgres
(`diagnostiquer_cascades_user_id`, `diagnostiquer_colonnes_user_id_sans_fk`
— cf. `docs/v2-methodologie/diagnostic-cascades-user-id.sql`, accès
restreint au `service_role`). Génère le SQL de correction prêt à
copier-coller — cet onglet ne modifie **jamais** le schéma lui-même,
uniquement en lecture. À lancer occasionnellement (ex. avant une mise en
production), pas à chaque table ajoutée.

**`decision_events`/`decision_outcomes`** — étape 1 du chantier de vision
"coach adaptatif à mémoire par coureur". Écriture best-effort uniquement,
aucune lecture n'exploite encore cette donnée. `decision_events`
journalise chaque décision du `RuleEngine` (proposée/appliquée/ignorée,
contexte complet). `decision_outcomes` lie une décision à la première
séance ultérieure avec un statut connu (référence `decision_event_id`,
pas `user_id` directement). RLS strictement par propriétaire. Schéma SQL
dans `schema-decision-memory.sql`.

**Suppression de compte — toutes les tables applicatives liées à
`user_id` doivent être en `ON DELETE CASCADE`** vers `auth.users(id)` —
`decision_events`, `badges_debloques`, `plans_actif` en font partie.
`decision_outcomes` cascade indirectement via `decision_event_id` →
`decision_events.id`. `api/delete-account.js` nettoie en plus
`decision_events` explicitement en filet de sécurité
(`TABLES_A_NETTOYER`), avant l'appel à l'Admin API — toute nouvelle table
applicative liée à `user_id` doit être vérifiée en cascade au moment de
sa création.

## 6. Profil coureur (`lk_profil_coureur`)

```
{
  prenom, nom, dateNaissance, anneeNaissance (dérivée), poids, taille,
  fcMax, fcRepos, sexe, pps,
  ppsDocument: {data (JPEG base64), type:"image/jpeg", nomFichier} | null,
  ppsExpiration: "YYYY-MM-DD" | null,
  records: { "5K": {temps, date?}, "10K": {...}, "Semi": {...}, "Marathon": {...} },
  kmCumulesTotal: nombre (cumul GLOBAL, tous plans confondus)
}
```

- `dateNaissance` : catégorie d'âge FFA calculée (`calculerCategorieAgeFFA()`,
  bascule au 1er septembre), message anniversaire.
- `fcRepos`/`sexe` : consommés par le moteur de décision (pondération
  TRIMP). Repli sur 'autre' si non renseigné.
- `pps` : champ texte (numéro de licence/PPS), remplacé par le module
  d'import `ppsDocument`. Reste dans la structure pour compatibilité,
  éditable nulle part dans l'UI actuelle.
- `ppsDocument`/`ppsExpiration` : gérés exclusivement via la modale du
  bouton "🩺 PPS" du header (cf. §4) — Réglages n'affiche qu'un rappel en
  lecture seule.
- `kmCumulesTotal` : cumul de km sur toutes les séances validées
  (✅/⚠️/❌), tous plans confondus — alimente le badge "km cumulés" (cf.
  §16). Champ GLOBAL, à distinguer explicitement de
  `lk_km_comptes_par_uid` (local au plan, cf. §5). Ajusté de façon
  idempotente à chaque changement de statut via
  `recalculerKmComptesPourUid()`.
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit à partir du
  profil (record le plus pertinent, repli Riegel sinon).
  `verifierCoherenceRecord()` écarte un record si écart >10% à
  l'estimation Riegel des autres.
- **Sauvegarde** : chaque champ du profil coureur (identité,
  poids/taille/FC, objectif) s'auto-sauvegarde individuellement à la
  sortie du champ (`sauvegarderProfilCoureur()`), les records personnels
  passent par validation explicite (cf. §4). Les sélecteurs Niveau/Sexe
  ne doivent JAMAIS appeler `sauvegarderProfilCoureur()` directement au
  clic — seulement mettre à jour l'état local puis `render()`, sinon un
  profil incomplet écrase Supabase.
- **Toute donnée binaire volumineuse** (image, PDF converti) doit être
  compressée côté client avant sauvegarde — un fichier brut fait exploser
  le payload JSONB envoyé par `sauvegarderProfilCoureur()`, qui échoue en
  fire-and-forget sans jamais remonter d'erreur ni bloquer l'écriture
  locale.
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
pour 5K/10K. Détail complet du pacing par distance et de la semaine
d'approche (garde-fous J-2/J-1, repères J-3/veille) dans
`docs/v2-methodologie/jour-de-course.md`.

**v1-bridge.js (`traduirePlanVersFormatV1`)** — couche de traduction entre
le plan brut (v2) et le format `index.html`. Tout nouveau champ
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
`PACE_RATIOS.I` (calibré sur du VMA classique, pas un effort continu). Le
test est placé sur le premier jour *utile* de la semaine (date réelle ≥
`dateDebut`). Jour "🏁 Jour J" ne doit jamais s'afficher tant que
`enAttenteTest`. Validation du test (`renderTestSemiCooperRow`) : compte
aussi pour le badge "km cumulés" (cf. §16) — pose une entrée
`manualPerf[uid]` minimale (distance connue, allure/FC absentes).

**Refus si volume incompatible avec le nombre de jours** — si plus de la
moitié des semaines de Construction ont un EF sous `VOLUME_MIN_EF_KM`
(3km) ou une longue sous `VOLUME_MIN_LONGUE_KM` (5km), `generatePlan()`
retourne `{ planInvalide: true, code: 'VOLUME_JOURS_INCOMPATIBLE',
message }` plutôt qu'un plan cassé. Les 3 points d'appel (`v2/index.html`
création/régénération/modif objectif, `index.html` plan de repli) gèrent
ce retour et affichent le message. Les semaines de Construction
antérieures à `semaineDepart` (présentes uniquement quand
`semaineDepart > 1`) sont exclues des statistiques de ce garde-fou
(`semaineHorsProgression`).

`VOLUME_MIN_PAR_JOURS` est une table à trois niveaux
(`[distance][niveau][nbJours]`), calibrée par simulation exhaustive du
moteur réel (pire cas sur allure/objectif/placement des jours/durée du
plan, hors contraintes ponctuelles qui cassent localement la monotonie
inter-distance), planchers forcés monotones sur 4 axes (jours croissants,
distance 5K≤10K≤Semi≤Marathon, niveau debutant≤intermediaire≤confirme) et
majorés de 15% comme marge de confort au-dessus du strict minimum
structurel :

| Jours | 5K deb/int/conf | 10K deb/int/conf | Semi deb/int/conf | Marathon deb/int/conf |
|---|---|---|---|---|
| 2 | 11/11/14 | 12/13/15 | 12/13/15 | 12/14/17 |
| 3 | 13/14/18 | 15/17/19 | 15/17/19 | 15/18/20 |
| 4 | 17/18/20 | 19/20/21 | 19/20/21 | 19/21/23 |
| 5 | 20/25/28 | 21/27/32 | 21/28/32 | 21/29/34 |
| 6 | 29/29/32 | 29/30/35 | 29/32/36 | 29/33/36 |
| 7 | 34/36/36 | 34/36/37 | 34/36/40 | 34/36/41 |

`generatePlan()` lit `VOLUME_MIN_PAR_JOURS[params.distance][profil.niveau][nbJours]`,
repli sur `intermediaire` si le niveau est absent de la table (ex.
`grand-debutant`, qui ne passe de toute façon jamais par ce chemin de
génération standard) ou non reconnu. Les contraintes ponctuelles
(blessure-active, douleur-chronique, reprise) restent hors de cette
calibration — protégées par le garde-fou `VOLUME_JOURS_INCOMPATIBLE`
(calculé après génération réelle du plan) et les warnings dédiés
(`BLESSURE_ACTIVE`, etc.).

**`computeVolumeProgression` — paramètre `semaineDepart`** — par défaut à
1 (comportement historique, génération initiale d'un plan). Permet de
faire démarrer la progression du volume (+10%/semaine, décharge tous les
4 semaines) à une semaine ultérieure du plan plutôt que depuis la semaine
1 — la progression REPART réellement de ce niveau. Les semaines avant
`semaineDepart` ne sont pas produites par cette fonction. Le rythme des
décharges reste calculé sur le numéro de semaine RÉEL du plan, pas
réindexé à 1.

**`repartirVolumeSemaine` — partage proportionnel longue/EF par poids** —
la longue et chaque EF sont traités comme des "parts" d'un même budget
(`kmRestant = volumeCibleKm - kmQualiteTotal`, calculé sur le volume RÉEL
des séances qualité, échauffement inclus), avec la longue pondérée à
`POIDS_LONGUE = 1.6` fois un EF individuel :
`kmLongue = kmRestant × POIDS_LONGUE / (POIDS_LONGUE + nbEF)`,
`kmParEF = kmRestant / (POIDS_LONGUE + nbEF)`. Garantit PAR CONSTRUCTION
que `kmLongue >= POIDS_LONGUE × kmParEF`, sans contrainte empirique par
palier. Cas particulier à **2 jours/semaine** (1 qualité + 1 longue,
aucun EF) : tout le budget restant va mécaniquement à la longue
(`nbEF === 0`), pouvant produire des longues déraisonnables à fort volume
— `genererContenuLongue()` plafonne déjà la DURÉE affichée
(`DUREE_MAX_LONGUE_MIN`). Warning informatif `VOLUME_LONGUE_EXCESSIVE_2J`
(pas un refus) invite à passer à 3 jours ou plus, sans bloquer la
génération du plan.

**Records du monde — plancher absolu de temps saisissable** —
`RECORDS_MONDE_SECONDES` (5K/10K/Semi/Marathon, hommes route), bloque
toute saisie de temps plus rapide, partout où un temps de référence/
objectif/record est saisi (wizard, Réglages, onboarding). Table dupliquée
en local dans `auth.js` (onboarding) — ce module ne doit jamais dépendre
de l'ordre de chargement d'`index.html`/`plan-generator.js`, à garder
synchronisée manuellement si les records évoluent.

**Allures dynamiques** — les allures E/T/I restaient historiquement
calibrées sur `paramsOrigine.tempsReference` pendant toute la durée du
plan. `calculerReferenceCouranteAllures()` compare l'estimation du
prédicteur à celle de la période précédente (`predHistory`) à la fin de
chaque semaine PAIRE (S2, S4...). Progression → appliquée immédiatement.
Régression → appliquée seulement si confirmée sur 2 périodes
CONSÉCUTIVES (`lk_regression_allures_en_attente`).
`verifierEtAppliquerAlluresDynamiques()` orchestre détection, calcul,
application (régénère `allures` via `computeAllures()`), et notification
visible. Indépendant d'`appliquerAdaptations()` (réagit à des semaines
ratées, sur clic explicite).

**`distanceEffortStructure(structureIntervalles, allureReplixSecParKm)`
(`index.html`)** — calcule la distance d'EFFORT SEUL d'une structure
d'intervalles (jamais l'échauffement/récup/retour au calme, distinct de
`distanceTotaleAvecRecup()`). Second paramètre optionnel : quand un bloc
n'a NI `distanceM` NI `allure` prédéfinie dans le plan (blocs définis
uniquement en durée), `allureReplixSecParKm` (l'allure que le coureur
vient de saisir) sert de repli.

**Script de test de génération de plans variés**
(`scripts/test-plans-varies.js`, `node scripts/test-plans-varies.js`) —
10 profils prédéfinis couvrant les cas sensibles connus (grand débutant,
Mode Forme via test, changement de niveau en cours, contraintes
ponctuelles...). Vérifie absence de plantage/NaN et quelques règles
structurelles (pas de qualité consécutive, allures cohérentes E>M>T>I>R).
Ne vérifie jamais la qualité pédagogique. Trois statuts : OK, REFUSÉ
(refus volontaire du moteur, attendu), FAIL (à corriger). **À relancer
avant tout changement dans `plan-generator.js`/`plan-forme.js`**.

## 7bis. Prédicteur d'estimation 10K (`v2/engine/predictor.js`)

Module ES dédié — fonctions pures, aucune ne mute directement l'état
global ni n'appelle Supabase (sauf `predict10K()` qui mute `predHistory`
EN PLACE et déclenche sa sauvegarde via `saveFn`, reçu en paramètre).
Distinct des 5 modules du moteur de décision (§8) mais lit les mêmes
données.

Deux couches :
- **Borne brute** (`borneBrute`, `calculerBorneBruteAtDate()`) : mesure
  physio pure — moyenne pondérée SPEC (0.45), VMA (0.35, vitesse×0.87),
  SEUIL (0.10, formule Daniels-Gilbert/VDOT — contribue à partir de 3
  séances), combinée à `BASE_TIME_REFERENCE` via `lavendouWeight`
  (décroît 90%→10% sur 8 semaines, garde-fou 50% si pas de séance
  intensive récente). Source écartée si écart >20% vs référence.
- **Estimation affichée** (`predict10K()`) : converge par petits pas
  (`PAS_CONVERGENCE_BASE=0.15`, modulé par `fiabilitePlanPonderee()`)
  depuis `BASE_TIME_REFERENCE` vers `borneBrute`, jamais un saut direct —
  ne peut jamais dépasser ce que les séances mesurent réellement.

`fiabilitePlanPonderee(dateStr)` : taux de réussite sur TOUTES les
séances, pondéré par récence (demi-vie 21j). Recalcule `statutEffectif`
localement PAR RAPPORT À `dateStr` — nécessaire pour la reconstruction
rétroactive.

**`weightedAvgByEffortDuration()`** — consomme `manualPerf[uid].laps` en
priorité quand ils existent (cf. §4/§5) : traité EXACTEMENT comme des
laps Strava normaux, chaque lap `_reussi:false` (répétition ratée) est
exclu du calcul de vitesse pondérée. Si tous les laps d'une séance sont
ratés, la séance est ignorée pour l'estimation. Repli complet sur l'ancien
"lap virtuel unique agrégé" pour toute saisie manuelle antérieure à ce
champ (sans `.laps`), qui utilise `distanceEffortStructureFn` (distance
d'effort seul, cf. §7) plutôt que `manualPerf[uid].distance` (distance
totale, qui gonflerait artificiellement le poids d'une séance en
proportion de la durée d'échauffement saisie).

**Historique rejoué rétroactivement** : `rebuildPredHistorySequentielle()`
applique la convergence jour par jour depuis le début du plan.
`PREDICTOR_VERSION` déclenche la reconstruction si incrémentée — geste
manuel requis à chaque changement de formule. Quand une reconstruction
est nécessaire au chargement, `rebuildPredHistory()` (wrapper resté dans
`index.html`) affiche un état intermédiaire "recalcul en cours" via
`renderDiffere()` plutôt que `render()` immédiat.

**`rebuildPredHistory()` doit être appelée à chaque point qui pose ou
retire un statut de séance SEUIL/VMA/SPEC** : clic manuel
(`renderStatusRow`), saisie manuelle Enregistrer/Annuler,
auto-validation en masse après synchro Strava/import FIT
(`matchActivitiesToPlan()` — le chemin le PLUS FRÉQUENT en usage réel),
choix explicite d'une activité ambiguë, suppression d'une activité déjà
validée.

Formule Daniels-Gilbert (VDOT) pour SEUIL — remplace Riegel,
structurellement pessimiste sur un effort sous-maximal (formule
reconstruite par recherche web, cohérente avec les % VO2max confirmés au
chapitre 4 du livre Daniels). Filtres d'activités : `a.type === "Run" ||
a.sport_type === "Run"` (repli sport_type pour montres tierces).
Convergence n'avance que sur nouvelle donnée de qualité du JOUR
(`aDesNouvellesDonneesQualite`), pas à chaque simple chargement.

**Contextualisation du verdict "❌ À risque" (Stats, projection au jour
J)** — écart chiffré vs objectif toujours affiché ("−Xs
d'avance"/"+Xs vs objectif"), message contextuel affiché uniquement sous
verdict "❌ À risque" précisant le nombre de semaines de données
disponibles sur la durée totale du plan et rappelant que le rythme évolue
souvent en phase Spécifique/Affûtage — purement informatif, ne change
rien au calcul. Piste alternative (pondérer différemment les phases à
venir plutôt que d'extrapoler uniformément) reste non conçue en détail.

**Non couvert / reporté** : PACES-S (plaisir par séance) ; R-062/R-070/
R-080 jamais observées sur données réelles — à surveiller ; rythme de
convergence (`PAS_CONVERGENCE_BASE=0.15`) à éprouver sur plusieurs
semaines ; formule VDOT reconstruite par recherche web, pas garantie
identique aux tables publiées ; aucune variable interne (`ALL_SESSIONS`,
`statuses`, `PLAN`...) exposée sur `window` pour debug — seuls
`__PLAN_BRUT__`/`__PLAN_GENERE__`/`stravaActivities`/`localStorage`
accessibles ; instrumentation directe (logs temporaires en prod) reste la
méthode de diagnostic la plus fiable pour un bug profond.

## 8. Moteur de décision

5 modules, tous livrés et en production
(`engine-classic-scripts/decision-engine-*.classic.js`) :

1. **RunnerStateCalculator** — TRIMP/ACWR/fatigue/confiance/risque à
   partir des vraies données Strava (charge aiguë = 7j, chronique =
   moyenne sur fenêtres couvertes si historique <28j). Repli
   `FC_REPOS_DEFAUT=60bpm` si `fcReposReference` absent — sans ce repli,
   le calcul bascule silencieusement vers sRPE (échelle très différente).
2. **SessionAnalyzer** — score de réussite d'une séance (FC, allure,
   répétitions dans zone `okPace`). Agnostique de la source de la
   séance réalisée (Strava, saisie manuelle, import FIT — cf. §10) :
   attend uniquement `seanceRealisee`/`ciblesSeance`, sans jamais
   référencer Strava directement.
3. **WeekAnalyzer** — bilan hebdomadaire (volume, séances, charge,
   récupération estimée).
4. **TrendAnalyzer** — 5 détecteurs de signaux sur plusieurs semaines
   (`analyserTendance(fenetreSemaines)`). Exclut systématiquement la
   semaine EN COURS (non terminée) de sa fenêtre glissante.
   `obtenirHistoriqueMonotonie()` (graphique Stats) garde volontairement
   la semaine en cours.
5. **RuleEngine** — règles actives : R-006 (pic de séance), R-024s
   (fatigue élevée), R-040 (désengagement), R-050 (ACWR élevé), R-060
   (tendance fatigue, échantillonnage 8j par moitiés, seuil écart ≥6),
   R-062 (fatigue persistante 3 semaines, priorité 82), R-070 (séances
   ratées consécutives, priorité 70), R-080 (déficit volume durable, 3
   semaines ≤−10%, priorité 52).

**R-070 (`reduire_charge`)** — ampleur fixe −15% (≥2 séances ratées).
Cible la prochaine séance QUALITÉ en priorité (`cibleQualitePrioritaire`),
repli EF/LONGUE si aucune marge. `obtenirSeancesPlanifieesManquees()`
filtre bien sur `["VMA","SEUIL","SPEC"]` — ne compte que les vraies
séances qualité.

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
divergence, à répercuter si le générateur change une valeur `base`. Ce
fichier ne recalcule jamais `repartirVolumeSemaine`.

**Ton du coach** — bienveillant sur la FORME, honnête sur le FOND quand le
moteur a réellement détecté quelque chose (`reduire_charge`,
`alerter_blessure_potentielle`, `alerter_risque_decrochage`) — jamais
l'inverse. Deux signaux supplémentaires : `adaptationsConsecutivesMax >=
3` (3 semaines d'affilée difficiles) et FC moyenne EF/LONGUE >5bpm
au-dessus de la zone attendue (jamais les séances qualité, FC trop
variable). Coach IA lit `RunnerState`/`EngineDecision`, ne recalcule
jamais un ratio séparé, peut commenter mais jamais produire une décision
différente.

## 9. Saisie manuelle, RPE et statuts de séance

**Saisie manuelle** : bouton "Annuler" (réinitialise + relance sync
Strava), champ "durée totale" pour séances de qualité, exclusion Strava
complète quand saisie manuelle existe, grille réussi/raté par intervalle
pour les séances qualité + laps synthétiques par répétition consommés
par le prédicteur (cf. §4). Accessible via l'icône ✏️ unifiée (cf. §4) —
regroupe saisie manuelle et import FIT dans un seul popover. Stepper
d'allure ±5s/±1s (cf. §4).

**RPE** : source unique `sessionRpe[uid]`, sélecteur 5 niveaux
(🙂😐😓😣🥵) mappés CR-10, visible dès qu'un statut est posé, pondération
TRIMP +12% si RPE ≥ 8. Même échelle réutilisée pour le ressenti du
résultat de course (cf. §14bis).

**Statuts de séance** (`SOPTS`) : `—`/`✅`/`❌`/`⚠️`/`😴`, indexés par
`uid`. Une séance ne peut plus être supprimée du plan — seul un statut la
caractérise. Un statut est automatiquement remis à `—` si l'activité
(Strava ou FIT) qui lui était associée est supprimée manuellement (cf.
§10) — évite un badge orphelin faisant référence à une donnée effacée.

**`statutEffectif`** — calculé centralement dans `recalculerAllSessions()`,
disponible sur chaque objet `ALL_SESSIONS` : égal au vrai statut saisi
s'il existe, sinon `"😴"` automatiquement pour tout jour DÉJÀ PASSÉ
(jamais le jour même) sans saisie. Jamais écrit dans `statuses[uid]`
lui-même — purement un calcul d'affichage. Accès protégé par try/catch
(pas `typeof`, ne protège pas la temporal dead zone, cf. §3).

**Convention à respecter partout** : lire `statutEffectif` (pas
`statuses[uid]` brut) pour tout calcul qui doit tenir compte des séances
oubliées comme un signal de désengagement — sauf 4 catégories légitimes
qui doivent rester sur le statut brut : boutons de sélection/écriture du
statut, contexte "aujourd'hui", compteurs stricts ✅/⚠️/❌, gardes du swap.

**Échange de séances (swap)** — `getAvailableSlots()` propose tous les
jours de la semaine, bloqué dans les deux sens si statut posé, note, RPE,
saisie manuelle, ou jour passé sans saisie. Tout point qui mute
`swappedSessions` doit recalculer `ALL_SESSIONS` avant `render()` (cf.
§3/§5).

**Choix manuel si plusieurs activités Strava le même jour** —
`matchActivitiesToPlan()` ne valide plus automatiquement dès qu'il y a
ambiguïté (`obtenirActivitesAmbigues`), laisse le coureur choisir via
pastille visuelle + menu. Choix mémorisé (`lk_choix_activite_ambigue`)
tant que le nombre de candidats ne change pas — redéclenché si une
nouvelle activité apparaît après resynchro. Sans lien avec le calcul de
charge/fatigue (`RunnerStateCalculator` lit `stravaActivities` en entier,
indépendamment du matching).

**Protection des activités importées** — la première activité sur une
date (Strava ou FIT) ne peut plus être écrasée silencieusement par une
resynchronisation ; distinct de l'ambiguïté Strava ci-dessus (gérée avant
qu'une activité soit retenue). Détail complet en §10.

## 10. Import FIT

`adapterFitVersFormatActivite()` traduit le résultat de
`fit-file-parser` (`chargerFitParser()`, import ESM dynamique jsDelivr)
vers le même format qu'une activité Strava, pour traverser le même
pipeline (`getLapsAffichage()`, `SessionAnalyzer`, prédicteur).
`vitesseFiable()` calcule toujours depuis distance/temps, jamais
`avg_speed` du fichier FIT (peut être faux sur Amazfit/Zepp).

**Détection d'intervalles sans marqueurs structurés natifs** — de
nombreuses montres (Amazfit/Zepp, Suunto confirmés) n'écrivent aucun
marqueur de segment structuré dans le fichier exporté, même pour une
séance programmée en entraînement structuré. Repli sur `fit-detection.js`
(`public/v2/engine/`) : reconstruction par reconnaissance de signal sur
le flux `record` brut (segments continus au-dessus d'un seuil de vitesse,
deux profils de paramètres selon le type de séance). Calibré sur 4
séances réelles — nombre de répétitions fiable, précision de l'allure
±1-2s sur efforts longs, ±10-15s au pire sur efforts courts (limite
structurelle acceptée). Détail complet :
`docs/v2-methodologie/import-fit-intervalles.md`.

Un flag `lapsSontDejaEffortSeul` (posé par `adapterFitVersFormatActivite()`)
court-circuite le curseur de `getLapsAffichage()` (suppose une alternance
effort/récup native, absente pour cette source) — corrigé une seule fois
dans le wrapper, pas dans chacun de ses appelants.

**Protection des activités importées — "premier arrivé, reste"** — la
première activité sur une date (Strava ou FIT) ne peut plus être écrasée
silencieusement par une resynchronisation ; seule une suppression
manuelle explicite (badge de source + bouton 🗑️ sur la carte de séance)
libère la date. `syncStrava()` merge plutôt qu'écrase,
`importerFichierFit()` bloque l'import si une activité existe déjà. Effet
de bord assumé : une activité Strava corrigée a posteriori sur Strava.com
n'est plus re-synchronisée tant que l'ancienne n'est pas supprimée.
`matchActivitiesToPlan()` étant appelée par les 3 chemins d'entrée
(synchro Strava, import FIT, choix d'activité ambiguë), un correctif
appliqué à cette fonction bénéficie automatiquement aux 3 sans
duplication.

**Pas de stockage du fichier `.fit` brut** — seul le résultat de la
détection est conservé (dans `stravaActivities`, `_source: "fit"`) ; pas
de re-parsing rétroactif possible si l'algorithme évolue.

**Point de vigilance non spécifique au FIT** : `fit-file-parser@3.0.2`
dépend de `buffer`, non polyfillé par le fichier ESM brut jsDelivr —
corrigé via import map (polyfill minimal, `TextDecoder` natif) en tête du
`<head>` d'`index.html`.

**Coros / Garmin — piste explorée, non lancée** : Garmin écarté (accès
partenaire uniquement, programme actuellement en pause, aucune
inscription possible actuellement). Coros exporte un `.fit` natif (app
mobile + Training Hub desktop), potentiellement compatible sans API ni
OAuth via le pipeline ci-dessus si les marqueurs de segment natifs sont
absents comme pour Amazfit/Zepp/Suunto. Reste à faire avant tout code :
obtenir un vrai fichier `.fit` Coros pour vérifier la présence ou non de
marqueurs natifs, calibrer `fit-detection.js` si besoin. Alternative si
l'API officielle Coros s'avère nécessaire : candidature développeur OAuth
2.0.

## 11. Intégrations externes

**Strava** (Client ID `260339`) — OAuth via `api/strava.js`,
`v2/engine/strava.js`. Sync conditionnelle sur `dataSource === "strava"`.
Comparaison séance/laps filtrée par allure cible ±15%. Token
invalide/révoqué détecté explicitement — message + bouton "🔄 Reconnecter
Strava" (Réglages) + bandeau dashboard (cf. §4), affichés sans
auto-effacement tant que non résolu. **Synchro NON multi-device** — les
tokens (`lk_strava_token`/`lk_strava_refresh`/`lk_strava_expires`) sont
en `localStorage`, propres à chaque appareil ; se connecter sur un
appareil ne connecte pas Strava sur un autre (contrairement au profil/
plan, synchronisés via Supabase). Aucun outil admin ne doit jamais lire
ou utiliser les tokens Strava d'un testeur (cf. §15) — les tokens
restent volontairement locaux, jamais centralisés côté serveur au-delà
de l'échange OAuth initial. **Ne remplace plus jamais silencieusement
une activité déjà présente sur une date** (cf. §10, principe "premier
arrivé, reste").

**`syncStrava()`** — robuste sans plan existant : le calcul de
`planStart` (date la plus ancienne entre le début du plan actuel et 8
semaines en arrière, pour l'historique ACWR) utilise un accès sécurisé
(`PLAN?.[0]?.sessions?.[0]?.date`) avec repli sur 8 semaines seules si
aucun plan n'est disponible — nécessaire depuis que la connexion Strava
peut se faire AVANT tout plan (onboarding, cf. §12).

**Relecture de `stravaToken`/`stravaRefresh`/`stravaExpires`/
`stravaActivities` après le préchargement Supabase** — ces 4 variables
sont lues une première fois à leur déclaration
(`let x = load("lk_...", défaut)`), puis relues explicitement
(`if (!stravaToken) { stravaToken = load(...); ... }`) après que le
préchargement Supabase a fini d'écrire le vrai token en `localStorage` —
nécessaire sur un appareil où le token n'était pas encore présent au tout
premier chargement synchrone (rechargement complet, nouvel appareil).

**Météo** — proxy Open-Meteo (`api/weather.js`), gratuit, sans clé.
`type=forecast|current|historical`. Géolocalisation : dernière activité
Strava GPS pour actuelle/passée, position navigateur pour prévision J+1.
Heure réelle de séance extraite de `start_date_local` pour la météo
passée (repli 18h si absente) — `handleHistorical` (`api/weather.js`)
accepte un paramètre `hour` optionnel, extrait via découpage de chaîne
(jamais `new Date().getHours()`, sensible au fuseau). `timezone`
transmis dynamiquement depuis
`Intl.DateTimeFormat().resolvedOptions().timeZone` (fuseau du
navigateur) — `TIMEZONE_DEFAUT="Europe/Paris"` ne sert que de repli.
`fetchWeather()`/`verifierMeteoSeanceDemain()` en rendu différé
(fire-and-forget, `render()` de fin vers `renderDiffere()`).

**Coach (messages courts)** — `api/coach.js`, proxy Claude Haiku 4.5.
`fetchCoachMsg()` accepte un paramètre `differe` : `true` uniquement pour
l'appel de démarrage (`setTimeout(() => fetchCoachMsg(true), 2000)`),
pour se regrouper avec d'autres mises à jour automatiques proches — les
autres appels gardent `differe=false` par défaut, rendu immédiat.

**Sync multi-device** — Supabase (auth email/mot de passe), seul
mécanisme. Aucune action au-delà de se connecter avec le même compte. Ne
couvre PAS Strava (cf. ci-dessus).

**Stripe (abonnements)** — Produit "Yoria Premium" (7€/mois + tarif
annuel), Checkout hébergé (jamais de formulaire carte natif dans la TWA).
Table `abonnements` (RLS lecture seule, écritures via endpoints
serverless `service_role`). `api/stripe-checkout.js` retrouve/crée le
client par `user_id` puis `email`. `api/stripe-webhook.js` : body brut,
signature HMAC-SHA256 native. Routes déclarées explicitement dans
`vercel.json`. Statut lu via `window.__abonnementStatutCache__` (une fois
par session). Abonnements gratuits (beta testeurs) : coupon Stripe 100%
répétitif via `beta-admin`, liaison automatique au `user_id` si même
email que la candidature. **Clés live** : actuellement en mode test —
switch à faire quand le produit sera prêt pour un lancement public.

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

**Module "Sauvegarde"** (`beta-admin`, cf. §5) — export global, export
ciblé utilisateur (réutilise la recherche par email du module Comptes),
réinjection depuis un fichier JSON. Même règle stricte : jamais de
lecture des tokens Strava d'un testeur.

**Module "Cascades"** (`beta-admin`, cf. §5) — diagnostic proactif des
tables sans `ON DELETE CASCADE` vers `auth.users`, avec SQL de correction
généré automatiquement. Lecture seule, aucune modification du schéma
déclenchée depuis l'interface.

## 12. Authentification Supabase

Auth email/mot de passe (pas de Google/Apple). Variables exposées via
`api/config.js`. `LkSync.precharger(userId, planId)` réhydrate
`localStorage` depuis Supabase avant que `window.__AUTH_PRET__` ne se
résolve — retourne `{ok, echecChargementProfil}`, jamais de throw.
**Point de vigilance critique** : `index.html` ne doit jamais déclencher
l'écran de bienvenue si `echecChargementProfil` est vrai — sinon un
`localStorage` non réhydraté est pris à tort pour "profil jamais
renseigné" et écrase le vrai profil Supabase.

**`monterEcranAuth()`** — vérification de session AVANT construction du
HTML : si un utilisateur valide est trouvé (hors cas retour "mot de
passe oublié", identifié via
`window.location.hash.includes('type=recovery')`, qui force toujours la
construction de l'écran), la fonction résout directement sans jamais
insérer le moindre élément de formulaire dans le DOM — évite le flash
visible du formulaire de connexion sur une session déjà valide.

**Écran d'onboarding (`monterEcranOnboarding`, `auth.js`) — 5 pages** —
collecte l'intégralité du profil coureur, réparti en 5 pages successives
navigables (swipe horizontal + boutons Précédent/Suivant, même principe
que `ECRANS_WIZARD`/`attacherSwipeEtapes` dans `v2/index.html`, porté
indépendamment ici) :
1. Toi (prénom*, nom, date de naissance*)
2. Ta forme (poids, taille, FC max/repos, sexe, 🩺 PPS — module d'import
   compact, cf. §4/§6)
3. Records personnels
4. Ton niveau*
5. **Source de données*** — Strava ou Saisie manuelle

(* = obligatoire, bloque le passage à la page suivante/la validation
finale — prénom, date de naissance, niveau et source de données).

**Page 5 (Source de données)** — choix explicite entre Strava (icône 🔗)
et Saisie manuelle (icône ✏️), obligatoire. Si Strava est choisi, un
encart d'avertissement apparaît : Strava seul ne suffit pas pour que
Yoria analyse le détail d'une séance qualité (fractionné, seuil) —
nécessité de programmer les intervalles sur la montre (mode
"entraînement structuré") avant chaque séance qualité. Le bouton final
devient "Connecter Strava →" plutôt que "Valider" dans ce cas. **Flux de
connexion** : le profil complet (prénom, records, PPS, niveau...) est
d'abord sauvegardé en `localStorage` + synchronisé vers Supabase, PUIS
seulement la redirection vers `/api/strava/auth` est déclenchée — la
redirection OAuth recharge entièrement la page, donc rien n'est perdu au
retour puisque tout est déjà persisté avant ce point. **Cas grand
débutant** : traité EN PRIORITÉ, avant toute redirection Strava directe
— redirige toujours vers l'écran dédié `/v2?onboarding=grand-debutant`,
qui a son propre bouton "Connecter Strava" avec un mécanisme de retour
d'OAuth plus robuste (`sessionStorage`, cf. §14) ; un grand débutant
ayant choisi Strava à la page 5 ne doit jamais partir en OAuth
directement, ce qui court-circuiterait cet écran dédié. `dataSource`
écrit en `localStorage` avec la clé non préfixée (`clePourPlan()` n'est
pas encore disponible à ce stade du chargement).

Records personnels saisis via le même composant roulette que Réglages
(boutons +/-, viewport réduit, positionnement initial par condition
réelle — cf. §4). Champ date ajouté par record — nécessaire pour tout
départage de cohérence entre records via `verifierCoherenceRecord()`.
`terminer()` lit les valeurs directement depuis l'API de chaque roulette
(`colApi.valeur()`) plutôt que les inputs cachés potentiellement pas
encore synchronisés par le debounce du scroll (120ms). Porté
intégralement en local dans `auth.js`, jamais importé depuis
`index.html` (contrainte d'indépendance : ce module ne doit jamais
dépendre de l'ordre de chargement d'`index.html`). Garde-fou record du
monde appliqué à la validation finale (`terminer()`), avant de résoudre
la promesse. `index.html` dérive `anneeNaissance` depuis `dateNaissance`
au retour de l'onboarding (même logique que Réglages).

## 13. Publication Play Store (TWA Android)

- Package : `app.vercel.plan_10k_alpha.twa` (identifiant permanent)
- Domaine : `yoria.run`
- Piste "Tests fermés - Alpha" active, Laurent testeur confirmé
- Icône PWA Chrome bloquée via `beforeinstallprompt` + `preventDefault()`
- Build/signature : procédure figée dans les mémoires de session
  (keystore critique à ne jamais perdre)
- **HyperOS (Xiaomi)** : open-intent non résolu, irritant connu, pas
  bloquant pour le public visé actuellement

## 14. Mode Forme (v2.6)

Cycle glissant sans date de course, réutilise les briques génériques de
`plan-generator.js` — n'importe jamais `computePhases`/
`ROTATION_SOUS_TYPE`/`placerSeanceTest`/`placerSeanceCourse`. Câblé de
bout en bout.

**Déclenchement du bloc suivant** — bandeau semi-automatique ("🔁 Ton
bloc de 4 semaines est terminé"), détection par date.
`genererBlocSuivant()` reconstruit `profil`/`params` depuis
`localStorage` + le plan courant (`profilOrigine`/`paramsOrigine` non
stockés sur le résultat).

**Test semi-Cooper — "je n'ai pas de référence"** — même formule que §7,
via `estimerReferenceDepuisSemiCooper()`. `generatePlanFormeAvecTest()`
génère uniquement la semaine 1 (`enAttenteTest: true`), footings libres
sans allure. Résultat capté sur la carte du jour, détection Strava
automatique (montre programmée en 3 laps manuels), repli saisie manuelle.
`completerBlocApresTest()` génère les semaines 2 à N avec les vraies
allures.

**Sélecteur de distance de référence** — 5K/10K/Semi/Marathon.

**Parcours "Reprise en douceur"** — 3ème option sur l'écran de choix de
mode, réutilise le flux marche-course existant. Niveau `'grand-debutant'`
posé uniquement en LOCAL sur ce plan (`plan.profilOrigine.niveau`),
jamais sur le profil général du compte. Écran d'introduction dédié avant
la sélection des jours. 13 paliers en 2 phases : 6 paliers d'ALTERNANCE
marche/course puis 7 de CONTINU croissant (5→30min) — structure inspirée
du "White Plan" de Daniels.

**Écran dédié grand débutant (`/v2?onboarding=grand-debutant`)** — accès
direct au wizard (jours + Strava), sans passer par le dashboard ni le
choix course/forme. Bouton "Connecter Strava" avec mécanisme de retour
d'OAuth robuste : `history.replaceState()` + `window.location.reload()`
au retour du flow Strava (contournement d'un bug de rendu viewport en
TWA/PWA Android), avec un marqueur `sessionStorage` (survit au reload,
contrairement à un paramètre d'URL une fois nettoyé) retiré seulement une
fois le plan généré. Priorité absolue sur toute autre redirection Strava
(cf. §12) : un grand débutant ne doit jamais partir en OAuth directement,
seulement via cet écran.

## 14bis. Jour de course (`renderCourse`)

Écran dédié : météo, horaires, parcours, stratégie de course (cf. §7), et
résultat officiel une fois la course passée (`resultatCard`,
`DATE_COURSE_REFERENCE`).

**`resultatCard` — résultat enrichi** — au-delà du temps chrono
(`lk_race_result`, seul champ historique), le formulaire propose : ressenti
(RPE, échelle réutilisée telle quelle, cf. §9), commentaire libre,
classement général (place/total) et classement catégorie (place/total).
Stockés dans `lk_race_result_details` (cf. §5) — clé séparée,
`lk_race_result` reste inchangée pour ne pas casser les 4 usages
existants qui en dépendent (bandeau dashboard, export PDF, check
`hasRes`). Le badge "record_battu" reste déclenché uniquement par la
sauvegarde du temps chrono, indépendamment des champs enrichis.
Consultable a posteriori depuis la section "🏅 Mes courses" de Stats (cf.
§4/§5, tous plans confondus).

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
- **Toute promesse globale attendue ailleurs, et toute variable
  `let`/`const` lue par une fonction hoisted ou du code exécuté tôt,
  doit être déclarée de façon synchrone AVANT toute lecture possible**
  (cf. §3 pour le détail du piège TDZ) — toute variable lue par une même
  fonction doit être vérifiée individuellement, pas seulement la première
  trouvée.
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
- **Un registre d'état de composant (accordéon, toggle...) qui doit
  survivre à un `render()` complet doit être déclaré au niveau module,
  jamais à l'intérieur de la fonction qui construit l'écran** — sinon un
  nouvel objet vide est recréé à chaque appel, perdant silencieusement
  tout état précédent.
- **Le positionnement initial d'un élément scrollable (roulette,
  carrousel...) construit dans un écran qui vient d'être affiché ne doit
  jamais dépendre d'un délai arbitraire** — vérifier une condition réelle
  (élément attaché et visible) via polling léger. Tout composant niché
  dans un groupe accordéon doit prévoir un callback `onOuverture` qui le
  construit à la demande s'il n'existe pas encore (cf. §4).
- **En cas de bug d'affichage résistant à plusieurs correctifs
  successifs, diagnostiquer par tests directs en console**
  (`getElementById`, `getBoundingClientRect()`,
  `querySelectorAll(...).length`, `document.body.contains(...)`, valeurs
  réelles des variables globales exposées) plutôt que par relecture
  répétée du code. Un outil de mesure réel (Network, Performance,
  Console) doit être mobilisé dès le premier signalement plutôt qu'après
  plusieurs itérations de correctifs non concluants. Toujours épuiser
  l'hypothèse "erreur dans le code qu'on vient d'écrire" avant d'accuser
  un mécanisme externe (cache, déploiement, CDN).
- **Toute nouvelle table sensible (tokens, secrets) doit être ajoutée
  explicitement à la liste noire d'exclusion de `api/backup.js`
  (`TABLES_EXCLUES`)** — la découverte des tables y est automatique par
  défaut (liste noire, pas liste blanche), donc l'oubli expose la table
  par défaut plutôt que de la protéger par défaut.
- **Diagnostic des cascades ON DELETE (`beta-admin`, onglet Cascades) à
  lancer occasionnellement (ex. avant une mise en production), pas à
  chaque table ajoutée**.
- **Toute donnée binaire volumineuse (image, PDF converti) stockée dans
  `profilCoureur` doit être compressée côté client avant sauvegarde**
  (cf. §4, implémentation retenue pour le PPS : image plafonnée 1600px,
  JPEG 0.82-0.85).
- **Le rendu PDF via `<iframe>`/`<embed>` sur un blob URL n'est pas
  fiable sur mobile/TWA Android** — pour tout document PDF destiné à un
  affichage in-app fiable cross-plateforme, convertir en image (canvas +
  pdf.js) plutôt que tenter un rendu PDF natif. Cf. §4.
- **Un nouveau flux d'entrée (ex. connexion Strava avant tout plan) peut
  révéler un bug latent dans du code existant qui supposait
  silencieusement un contexte toujours présent** — un changement de flux
  d'entrée mérite de vérifier les suppositions implicites du code qu'il
  traverse nouvellement, pas seulement le nouveau code lui-même.
- **Une contrainte de calcul ajoutée pour corriger un cas peut devenir la
  priorité DOMINANTE dans les cas serrés et écraser un autre besoin tout
  aussi légitime** si les deux ne sont pas équilibrés dès la conception —
  préférer un partage proportionnel garanti par construction (poids
  relatif) à une cascade de contraintes empiriques appliquées dans un
  ordre fixe. Cf. §7, `repartirVolumeSemaine`.
- **Une fonction utilitaire générique appelée par de nombreux points
  d'appel dans un même fichier doit être corrigée UNE SEULE FOIS, à la
  source, plutôt que patchée individuellement à chaque site d'appel** —
  un correctif dispersé sur chaque appelant est fragile et duplique la
  logique. Cf. §10, `lapsSontDejaEffortSeul` ; cf. §7bis pour le principe
  appliqué au correctif de distance d'effort dans le prédicteur.
- **Avant de croire qu'un mécanisme existe déjà dans le code (ex. une
  auto-ouverture, un callback), vérifier positivement sa présence
  plutôt que de se fier à un commentaire qui décrit une intention** — un
  commentaire peut décrire un comportement jamais complètement implémenté,
  ou retiré depuis sans mise à jour du commentaire.
- **Avant de conclure qu'un enchaînement de `<script src>` bloquants est
  sûr à paralléliser (`defer`), vérifier explicitement tout script INLINE
  placé entre eux et leur premier point de consommation réelle** — un
  script inline s'exécute toujours immédiatement au parsing, jamais
  différé, contrairement aux scripts `src` avec `defer`.
- **Avant TOUT push d'un fichier vers le repo, vérifier explicitement le
  tout début et la toute fin du fichier final** (`head -c 100`/
  `tail -c 100`) — un message de statut d'un outil de lecture/extraction
  peut rester collé en tête du contenu réel sans qu'aucune vérification
  de syntaxe interne (`node --check`) ne le détecte, puisqu'il se trouve
  hors des balises `<script>`.
- **Tout point qui pose ou retire un statut de séance, ou une saisie de
  performance, doit être audité contre la liste complète des effets de
  bord attendus (cumul km, recalcul d'estimation)** — un `grep`
  exhaustif du motif d'écriture reste plus fiable qu'une liste mentale de
  points déjà identifiés. Cf. §5/§7bis/§9.

## 15bis. Écrans statiques hors JS (splash, chargement)

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

## 16. État des chantiers ouverts

Aucun chantier ouvert actuellement.

Pour l'historique des versions livrées et des correctifs, voir
`changelog.classic.js`. Pour le détail méthodologique des séances, voir
`bibliotheque-seances.md`. Pour le détail de la conception et de
l'implémentation de l'import FIT, voir `import-fit-intervalles.md`.
