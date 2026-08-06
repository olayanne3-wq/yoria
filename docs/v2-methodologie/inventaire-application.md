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
│   ├── delete-account.js         # Suppression définitive d'un compte (cascade)
│   ├── backup.js                 # Export global / ciblé utilisateur / réinjection / diagnostic cascades (cf. §5, §16)
│   ├── beta.js                   # Candidature bêta (public)
│   └── beta-admin.js             # Administration bêta (invitations, abonnements gratuits,
│                                  # signalements)
├── docs/
│   ├── legal/                    # Confidentialité, CGU/CGV, RGPD, Play Store data safety
│   └── v2-methodologie/
│       ├── inventaire-application.md   # CE FICHIER
│       ├── bibliotheque-seances.md     # Méthodologie des types de séances qualité
│       ├── import-fit-intervalles.md   # Conception + implémentation import .fit (cf. §10)
│       ├── diagnostic-cascades-user-id.sql  # Fonctions RPC pour l'onglet Cascades (beta-admin, cf. §16)
│       └── (autres docs de contexte : jour-de-course, notes-meteo, etc.)
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
│           ├── badges.js          # Système de badges (récompenses), extrait le 31/07/2026
│           ├── predictor.js       # Prédicteur 10K, extrait le 31/07/2026
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
classiques uniques sans équivalent module ES.

**`window.__AUTH_PRET__` doit être créée de façon synchrone**, en tout
début de script, avant tout `await import(...)` — un pattern différé
laisse une fenêtre où `if (window.__AUTH_PRET__)` échoue silencieusement
(JS résout immédiatement une valeur non-promise). Piège déjà rencontré
dans les deux fichiers principaux : toujours vérifier ce point avant
d'introduire une nouvelle promesse globale équivalente. **Même règle
appliquée le 04/08/2026** à `_renderDiffereTimer` (cf. §4, mécanisme de
regroupement des rendus automatiques) — une simple variable `let`, pas
une promesse, mais soumise au même risque de zone morte temporelle (TDZ)
si elle est lue avant sa ligne de déclaration depuis du code exécuté tôt
dans le script. **Piège identique rencontré le 05/08/2026** sur un
correctif de la synchro Strava (cf. §11) : un bloc de relecture de
`stravaToken`/`stravaRefresh`/`stravaExpires`/`stravaActivities`, destiné
à s'exécuter juste après `await window.__AUTH_PRET__`, avait été placé
AVANT la déclaration `let stravaToken` elle-même (plus loin dans le même
script) — a cassé toute la page en écran blanc
(`ReferenceError: Cannot access 'stravaToken' before initialization`).
Toute variable `let`/`const` lue par du code exécuté tôt doit être
positionnée APRÈS sa propre déclaration, jamais avant, même si la
déclaration se trouve techniquement "plus loin dans le fichier" — un
`typeof` ne protège pas non plus de ce cas (cf. §9 pour la règle
équivalente déjà documentée sur `statutEffectif`).

**Écran "Consulter un plan" — accordéon "Modifier mon plan"
(`public/v2/index.html`)** — 4 leviers de simulation d'un plan actif
(Objectif, Jours, Volume, Date de course), un seul ouvert à la fois.
Simulation LIVE de l'impact avant validation, jamais appliqué sans clic
explicite sur "Appliquer". Application à partir de la SEMAINE SUIVANTE
uniquement — la semaine en cours et les précédentes gardent leur contenu
original. **Levier Jours (conçu et livré le 26/07/2026)** : réutilise le
composant `.days-grid` existant (`daysGridSimulation`), permet aussi de
déplacer uniquement la sortie longue (reclic sur un jour déjà
sélectionné) ; simulation live via `simulerImpactJours()`,
`Engine.nbQualiteFor(nbJours, niveau)` fait varier le rythme de
progression proportionnellement au nombre de séances QUALITÉ ;
application via `appliquerChangementJours()`, même coupure nette à la
semaine suivante que les 3 autres leviers. Règle de pouce pour
Jours/Volume (pas de modèle scientifique rigoureux) : rythme de
progression proportionnel au nombre de séances QUALITÉ/semaine
(`Engine.nbQualiteFor`), avec avertissement de fiabilité limitée. Levier
Objectif : garde-fou de faisabilité en direct
(`verifierFaisabiliteNouvelObjectif`), avertit seulement — change QUE
l'allure course (`allures.C`), jamais VMA/SEUIL/EF (dépendent uniquement
de la forme réellement mesurée, cf. §7 allures dynamiques). Levier Date
de course : régénération complète via `Engine.generatePlan()`, avec règles
de phase (`appliquerReglesPhase()`) — Spécifique en cours ne repasse
jamais en Construction ; Affûtage + décalage ≤1 semaine ne recalcule pas
(juste la date change) ; décalage ≥8 semaines avertit de créer un nouveau
plan plutôt que de prolonger.

**Levier Volume — démarrage de la progression à la semaine charnière
(02/08/2026)** — jusque-là, régénérer le plan avec un nouveau
`volumeActuel` recalculait toute une nouvelle progression depuis la
SEMAINE 1 du plan (comportement historique de `generatePlan()`), puis ne
conservait que les semaines à partir de la charnière (semaine en cours +
1). Comme `computeVolumeProgression()` fait progresser le volume de
+10%/semaine vers un plafond quasi fixe, cette nouvelle courbe avait
largement le temps de remonter près du plafond avant d'atteindre la
charnière — un coureur qui baissait son volume ne voyait quasiment aucun
effet réel sur ses semaines à venir (bug signalé par Laurent : "je ne
vois pas d'effet"). `appliquerChangementVolume()` (`v2/index.html`)
calcule désormais `semaineCharniere` AVANT l'appel à `generatePlan()` et
la transmet via le nouveau paramètre `semaineDepartVolume` — cf. §7 pour
le détail complet du fonctionnement côté moteur.

**Bug "semaineDepartVolume résiduel" — EF/longue à 0km, y compris sur la
semaine en cours (06/08/2026, signalé par Laurent)** — `semaineDepartVolume`
transmis à `generatePlan()` restait "collé" dans `paramsOrigine` du plan
sauvegardé après l'appel du levier Volume : tout autre levier réutilisant
ensuite `paramsOrigine` tel quel (Objectif, Jours, Date de course, ainsi
que le bouton "Analyser et adapter") héritait silencieusement de cette
charnière obsolète, faisant retomber `volumeCibleKm` à `null`/0 pour
toutes les semaines antérieures — y compris la semaine EN COURS si elle
se trouvait avant cette ancienne charnière. `repartirVolumeSemaine()`
donnait alors 0km à l'EF et à la longue (jamais à la qualité, qui ne
dépend pas de ce calcul). Double correctif :
1. **`semaineDepartVolume` ne doit plus jamais être persisté dans
   `paramsOrigine`** — retiré par destructuring avant toute sauvegarde,
   dans les 4 leviers ET le bouton "Analyser et adapter" (les 5 points
   d'appel de `Engine.generatePlan()` dans `v2/index.html`).
2. **`plan.volumeCourant: { km, semaineNum }`** (nouveau champ, séparé de
   `paramsOrigine`) — préserve la DERNIÈRE intention réelle de volume
   exprimée via le levier Volume, distincte de
   `paramsOrigine.volumeActuel` qui reste le volume de départ HISTORIQUE
   du plan (jamais modifié après coup, simple trace d'origine). Écrit
   uniquement par `appliquerChangementVolume()`. Les 4 autres points de
   régénération complète (Objectif, Jours, Date de course, "Analyser et
   adapter") le lisent en priorité s'il existe
   (`volumeActuel: volumeCourant.km, semaineDepartVolume:
   volumeCourant.semaineNum` transmis à `generatePlan()` pour CET appel
   seulement, jamais persisté) et le propagent tel quel vers le plan
   résultant — sans ce mécanisme, toute régénération complète "oubliait"
   silencieusement un ajustement de volume fait via le levier et
   recalculait depuis le volume de départ d'origine (cas réel : Laurent
   avait réglé 33km via le levier, une réparation automatique du bug
   ci-dessus avait recalculé 39km en ignorant cette intention).

Réparation rétroactive des plans déjà cassés par ce bug avant le
correctif : `index.html`, au chargement du plan, détecte directement le
symptôme (EF ou longue à `kmEstime === 0`) plutôt que la présence de
`semaineDepartVolume` (qui peut avoir déjà disparu suite à un usage
ultérieur du levier après le correctif — un premier essai de réparation
basé sur cette seule condition ne se déclenchait donc jamais sur un
plan dans cet état). Réparation semaine par semaine (jamais une
régénération globale) : seuls les jours EF/longue à 0 de chaque semaine
cassée sont remplacés, jamais la qualité (jamais affectée par ce bug).
**Garde-fou de sécurité** : une semaine STRICTEMENT PASSÉE (tous ses
jours avant aujourd'hui) n'est jamais réparée automatiquement, même
cassée — un avertissement (`SEMAINE_PASSEE_NON_REPAREE`) le signale
plutôt que de risquer de réécrire le texte d'une séance déjà vécue par
le coureur (un premier jet de ce correctif régénérait tout sans cette
protection — corrigé après que Laurent a soulevé le risque). Semaine en
cours et futures : réparées (risque accepté explicitement par Laurent
pour la semaine en cours, le texte peut varier légèrement mais
statuts/RPE/saisies manuelles restent préservés).

**Navigation du wizard** — `ECRANS_WIZARD` (registre centralisé) +
`afficherEcranWizard(id)` masque tous les écrans puis affiche seulement
celui demandé, garantit par construction qu'un seul écran est visible à
la fois. Swipe horizontal entre étapes d'un même flux (`attacherSwipeEtapes()`,
détection deltaX/deltaY, seuil 50px) — jamais entre écrans de haut niveau.
Validations bloquantes avant de passer à l'étape suivante : temps de
référence, objectif, volume hebdomadaire (plus de repli silencieux à
30km/semaine), jour de sortie longue. sessionStorage nettoyé au retour
volontaire à l'app.

**Roulettes de saisie de temps/volume (temps de référence, objectif,
estimation alternative, volume hebdomadaire manuel)** — composant partagé
(`creerColonneRoulette`), boutons +/- au-dessus/en-dessous de chaque
colonne en complément du geste de défilement tactile (jamais un
remplacement), seul le chiffre actif reste visible pendant le défilement.
Positionnement initial vérifié par condition réelle (élément visible,
`offsetParent !== null`, polling 16ms) plutôt que par délai arbitraire —
un simple `setTimeout`/`requestAnimationFrame` s'est révélé insuffisant
pour garantir un positionnement fiable au tout premier rendu d'un écran
(mais fonctionnait aux rendus suivants), cause exacte non identifiée avec
certitude. Voir §4 pour le même composant côté Réglages (records
personnels) et son historique de mise au point complet.

**Non fait** : audit no-scroll systématique du wizard — nécessite un rendu
réel en navigateur, approche retenue = tests réels de Laurent au cas par
cas plutôt qu'estimation.

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
- `renderBadges` — écran détaillé des badges (cf. §16)
- `render` — orchestrateur principal
- `ouvrirSignalementProbleme` — modale accessible via le bouton 💬 des headers
- `ouvrirPpsModale` — modale PPS (cf. plus bas)
- `renderTestSemiCooperRow` — carte du jour, cf. §14 (Mode Forme sans référence)

**Refonte carte "Aujourd'hui" (todayEl, 26/07/2026)** — conçue et livrée
le même jour, principe "rien à ouvrir". Header carte : icône ⌚
(`renderIconeStructureMontre`, structure à programmer sur montre)
affichée uniquement si la séance n'est pas encore validée ; icône ✏️
(`renderIconeSaisieManuelle`) toujours visible, avant et après validation
(cf. plus bas, icône unifiée). Allures cibles (`PACE_REFS`) et FC cibles
(`FC_ZONES`) affichées directement sous la séance, sans repli, seulement
si la séance n'est pas encore validée. Dès qu'un statut ✅/⚠️/❌ est posé,
le bloc "Réalisé" (`renderBlocRealise`) prend le relais : résumé chiffré
+ ligne "X répétitions · Y/Z dans la cible · ▼ détail" qui déplie les
laps individuels au clic, + lien "✏️ Corriger" qui rouvre le formulaire
manuel. Stylo ✏️ coloré (fond `var(--accent)` plein, texte blanc) quand
une saisie manuelle existe (`manualPerf[uid]`), gris neutre sinon —
condition sur l'existence de la saisie, pas sur la validation. Cas sans
Strava ET sans saisie manuelle existante : le clic sur ✅/⚠️/❌ ouvre
automatiquement le formulaire de saisie manuelle une seule fois
(`uidAOuvrirPopoverSaisie`, variable transitoire de scope module). Idée
explorée puis écartée le même jour : signal visuel warn sur "Corriger" si
le score réel est incohérent avec le statut cliqué — pas de critère
validé, non codée.

**Aide — tutos par action en tuiles, en coexistence avec les sections
thématiques (04/08/2026)** — nouvelle section "🛠️ Tutos par action" dans
`HELP_SECTIONS`, distincte des 7 sections thématiques existantes
(Démarrer / Comprendre les écrans / Comprendre les séances / Pour aller
plus loin / Comprendre le moteur Yoria / Types de plan / Sources de
données / FAQ), qui gardent leur rendu en accordéon inchangé. Un
sélecteur à deux onglets segmentés ("Aide" / "Tutos", style pilule) est
affiché en haut de l'écran — l'onglet Tutos affiche une grille de tuiles
(2 colonnes, hauteur fixe 112px, icône + titre) regroupées par thème
(`TUTOS_GROUPES` : Démarrer / Au quotidien / Gérer son plan / Suivi /
Compte), un clic ouvre le tuto en vue détail (titre affiché dans le
header sticky de l'app, bouton retour ‹ qui ramène à la grille plutôt
qu'au dashboard). 16 tutos rédigés au 04/08/2026 : Créer un plan, Test
semi-Cooper, Choisir sa source de données, Carte "Aujourd'hui", Import
.fit, Programmer sur montre, Readiness/RPE, Répondre à une proposition
d'ajustement, Échanger deux séances, Modifier son plan, Estimation de
performance, Lire les Stats, Jour de course, Strava, PPS, Abonnement.
Chaque tuto porte `id`/`icon`/`title`/`text` (résumé pour la recherche)
et `blocks` (paragraphes/titres/liste/image) pour un rendu riche —
`text` reste le seul champ utilisé par les 7 sections thématiques
classiques (fallback texte brut si `blocks` absent, zéro régression). La
recherche (`_helpRecherche`) reste transversale aux deux onglets :
pendant une recherche active, les onglets sont masqués et les résultats
des tutos + sections classiques s'affichent ensemble en liste plate,
comme avant l'ajout des tuiles. `renderDiffere()`/`_helpTutoOuvert`/
`_helpOngletActif` réinitialisés à chaque montage de l'écran (`setView("help")`).
**Remplace le chantier "mini-tuto import FIT" du 03/08/2026**, testé
puis explicitement retiré le même jour (jugé insuffisant — visible
seulement en mode FIT, structure thématique inadaptée à l'usage voulu).
Reste ouvert : 0 des 16 tutos n'a encore d'image (le premier jet du tuto
"Carte Aujourd'hui" avait une capture légendée intégrée au texte, retirée
lors d'une réécriture du ton — Laurent prévoit de fournir des captures au
fil de l'eau, le format `blocks` supporte déjà `{type:"img", src, alt,
caption}` sans changement de code nécessaire).

**Architecture** : contenu extrait dans `public/help-content.js` (module
de données pur, aucun DOM), importé dynamiquement au premier affichage,
mis en cache (`_helpContentCache`) — éditer un texte d'aide ne touche
plus jamais `index.html`, SAUF pour ajouter un nouveau type de bloc au
renderer `rendreBlocsItem()` (cf. ci-dessus, tutos). Accordéon replié par
défaut sur les sections classiques (`_helpSectionsOuvertes`, réinitialisé
à chaque ouverture de l'écran). Recherche texte qui filtre en direct et
déplie automatiquement les sections/tutos matchés.

**Barre de navigation** — montée dans `#nav-root`, conteneur distinct de
`#app` (via `replaceChildren`), pour éviter le flash de la barre à chaque
render. `setView()` scrolle en haut AVANT `render()`.

**`render()` — remplacement atomique du contenu (04/08/2026)** —
`app.innerHTML=""` n'est plus exécuté en tout début de fonction (avant
même que le nouveau contenu ne soit construit) : le nouveau
header/contenu est entièrement construit d'abord, puis substitué à
l'ancien en une seule opération (`app.replaceChildren(...)`) à la toute
fin de la fonction — plus aucune frame intermédiaire avec `#app` vide
n'est peinte par le navigateur. Même principe que le correctif déjà
appliqué à `#nav-root` le 24/07/2026 (cf. ci-dessus), étendu au
conteneur principal. Voir le chantier "clignotement au chargement" (§16)
pour le contexte complet de cette recherche et ses limites.

**`renderDiffere()` — regroupement des rendus automatiques (04/08/2026)**
— plusieurs mises à jour asynchrones se produisent automatiquement après
le premier rendu (badges débloqués, message du coach, météo actuelle,
notes météo J+1, reconstruction de l'historique de prédiction) : chacune
appelait `render()` séparément, produisant un flash distinct à chaque
fois. `renderDiffere()` (debounce 50ms, `_renderDiffereTimer` déclarée
tout en tête du script principal — cf. §3) regroupe ces mises à jour
automatiques en un seul rendu si elles arrivent à moins de 50ms d'écart.
Réservé aux mises à jour SANS retour utilisateur immédiat attendu — toute
action explicite (clic, saisie) continue d'appeler `render()` directement.
`render()` annule systématiquement tout timer `renderDiffere()` en
attente à chaque exécution (immédiate ou différée), pour ne jamais
produire un rendu redondant. N'a pas éliminé la perception du
clignotement au chargement observée par Laurent — cf. §16.

**Swipe horizontal entre onglets** — actif sur les vues de `NAV` (pas
`weekDetail`/`help`), détection par direction dominante du geste, seuil
50px.

**`predict10K()` calculé à la demande** — seulement pour
`dashboard`/`stats`/`course` (`VUES_AVEC_PRED`), pas à chaque `render()`.

**Carte du jour et vue Semaine** — principe "rien à ouvrir" : icône ⌚
affichée uniquement tant que la séance n'est pas encore validée, allures/
FC cibles directement visibles. Une fois validée, résumé chiffré
automatique + lien "Corriger", seules les répétitions individuelles
restent repliées derrière "▼ détail". Statut futur : rangée de boutons
masquée complètement (pas juste désactivée).

**Icône ✏️ unifiée (saisie manuelle + import FIT)** — regroupe la saisie
allure/FC et l'import `.fit` derrière une seule icône
(`renderIconeSaisieManuelle()`), dans le header de la carte, juste avant
le badge de statut — identique sur la carte "Aujourd'hui" et le détail
Semaine. Visible avant ET après validation (contrairement à l'icône ⌚
voisine). Le popover contient le bouton d'import `.fit` (si
`dataSource === "fit"` et aucune activité déjà présente) puis la saisie
manuelle, repliée par défaut. Auto-ouverture du popover (jamais du
sous-formulaire) après un clic manuel sur ✅/⚠️/❌ sans activité
existante — jamais sur validation automatique via synchro. Implémenté
via une variable transitoire de scope module
(`uidAOuvrirPopoverSaisie`), consommée au montage. **Doublon visuel du
crayon corrigé le 04/08/2026** : le popover affichait un second crayon
(✏️) en résumé de sa propre ligne "Saisir ou corriger manuellement",
redondant avec le crayon du header qui vient d'être cliqué pour ouvrir ce
même popover — retiré.

**Lien "✏️ Corriger" retiré du bloc "Réalisé" (06/08/2026)** — signalé par
Laurent : deux crayons visibles simultanément une fois une séance
validée, dans la vue Semaine (icône ✏️ du header, toujours visible avant
ET après validation, cf. ci-dessus + lien texte "✏️ Corriger" dans le
bloc "Réalisé", cf. §16 pour la refonte carte "Aujourd'hui"). Les deux
ouvraient exactement le même formulaire (`renderManualPerfRow`) — le
lien texte du bloc "Réalisé" était donc strictement redondant avec
l'icône header, qui seule suffit désormais. `correctionSlot`/`liensDroite`
conservés vides dans `renderBlocRealise` plutôt qu'une restructuration
plus large du bloc — limite l'ampleur du changement, aucune perte
fonctionnelle (le badge source, le lien Strava et le bouton supprimer
restent inchangés dans `liensDroite`).

**Saisie manuelle — détail des intervalles réussi/raté (05/08/2026)** —
pour toute séance avec `structureIntervalles` (VMA/SEUIL/SPEC), le
formulaire de saisie manuelle affiche une grille de boutons ✓/✕, un par
répétition attendue (calculée depuis `blocs[].repetitions × nbSeries`),
pré-cochée "réussi" par défaut. Volontairement réussi/raté seul, pas
d'allure par intervalle (charge de saisie disproportionnée, et
`analyserSeanceQualite()` n'exploite de toute façon ce niveau de détail
que sous cette forme). Stocké dans `manualPerf[uid].intervalles` (tableau
de booléens). Affiché dans le bloc "Réalisé" sous forme d'un résumé "N
répétitions · X/N réussies", même pattern visuel que le résumé
Strava/FIT existant (sans détail dépliable — pas de laps réels à
afficher pour une saisie manuelle). N'entre PAS dans le calcul du
prédicteur (cf. §7bis) — seule l'allure moyenne globale saisie compte.

**Badge de statut carte (haut à droite, vue Semaine) — vrai emoji au lieu
du symbole compressé (06/08/2026)** — signalé par Laurent : "je veux
avoir les mêmes symboles en haut à droite que ceux qu'on choisit pour le
statut de la séance". Avant ce correctif, le badge compressait ⚠️ et ❌
en un simple `"!"` générique sur fond orange (`var(--warn)`), perdant la
distinction visuelle entre les deux qui existe pourtant sur les boutons
de sélection de statut plus bas dans la carte (`SOPTS`). Corrigé en deux
temps : d'abord affichage du vrai emoji (`statutEffectif`) dans un rond
de fond coloré conservé par cohérence visuelle, puis — suite à une
remarque immédiate de Laurent sur la redondance du rond avec les
couleurs propres de chaque emoji — **rond de fond entièrement retiré**,
traitement unifié avec 😴 (qui n'en avait jamais eu), taille augmentée à
20px pour la lisibilité. Le badge est désormais un simple
`el("span", {fontSize:"20px"}, statutEffectif)`.

**Mini-frise semaine (vue Semaine, `L M M J V S D`) — couleur du type
TEST manquante, corrigée le 04/08/2026** — cette mini-frise utilise deux
dictionnaires locaux dupliqués (`TYPE_SEANCE_COULEUR`, `TYPE_SEANCE_LABEL`),
distincts du dictionnaire global `STYPES` utilisé partout ailleurs dans
l'app — ni l'un ni l'autre ne couvraient le type `TEST` (ajouté plus tard
pour le test semi-Cooper, cf. §7/§14), affichant la séance test sans
couleur de fond. Les deux dictionnaires locaux ont été complétés
(`TEST: "var(--warn)"`, libellé "Test") plutôt que remplacés par
`STYPES` — pas de refactorisation plus large entreprise.

**Bandeau "Strava déconnecté" sur le dashboard (02/08/2026)** — le signal
de déconnexion (`stravaAuthInvalide` : token présent mais invalide/expiré
; ou `!stravaToken` : aucun token du tout, jamais connecté ou révoqué au
point d'être supprimé) n'était visible auparavant que dans Réglages
(bouton "🔄 Reconnecter Strava") ou via un texte discret en bas du
dashboard — signalé par Laurent : "si on ne va pas dans les paramètres on
ne le voit pas". Bandeau `stravaDeconnecteEl` ajouté en haut du dashboard
(juste après `dashHeaderEl`), affiché seulement si `dataSource ===
"strava"` ET (`stravaAuthInvalide` OU `!stravaToken`) — lien direct vers
`/api/strava/auth`, même route que Réglages. Le texte redondant du bas de
dashboard (nombre d'activités/dernière synchro, `stravaSection` locale à
`renderDashboard`) a été retiré à la demande de Laurent ("inutile si
bandeau") — ces infos restent consultables dans Réglages si besoin.

**Onglets Stats et Course — accordéons thématiques (31/07/2026)** —
`renderGroupeAccordeonStats()` (composant générique malgré son nom,
réutilisé tel quel pour Course via `renderGroupeAccordeonCourse()`),
repliés par défaut. État ouvert/fermé persistant entre les `render()`
successifs via un registre au niveau module (`etatGroupesAccordeon`,
indexé par titre de groupe — les titres doivent rester uniques tous
onglets confondus pour éviter une collision dans ce registre partagé).
Stats : 6 groupes (Objectif et progression / Charge et récupération /
Performance technique / Référence / **Mes courses** / Tests). Course : 2
groupes (Préparation pratique / Stratégie) — Météo et Résumé de
préparation restent hors accordéon (une seule carte chacun). Accepte un
callback optionnel `onOuverture`, appelé à chaque ouverture du groupe
(ajouté le 01/08/2026 — cf. plus bas, records personnels) : utile pour
tout contenu construit alors que le groupe est fermé et qui a besoin
d'un traitement différé une fois réellement visible.

**"🏅 Mes courses" (Stats, 05/08/2026)** — nouveau groupe accordéon,
liste l'historique des résultats de course saisis sur TOUS les plans du
compte (pas seulement le plan actif chargé en mémoire), triés du plus
récent au plus ancien : date, distance/nom de course, temps, ressenti,
classements général/catégorie, commentaire. Chargement ASYNCHRONE à la
première ouverture du groupe (`onOuverture`), résultat mis en cache pour
le reste de la session (`mesCoursesCache`, module-level) — contrairement
aux autres groupes de Stats qui lisent des données déjà en mémoire de
façon synchrone, celui-ci nécessite une lecture Supabase multi-plans
(`LkSync.chargerResultatsCoursesSupabase`, cf. §5/§11).

**Bouton "🩺 PPS" (Pass Prévention Santé FFA) — header, toutes vues où
`appHeaderEl` est rendu (02/08/2026)** — toujours visible, ouvre
`ouvrirPpsModale()` : import, aperçu, suppression réunis en un seul
endroit (plus de formulaire séparé dans Réglages, cf. §6). Tout document
importé (PDF ou photo) est stocké comme une image JPEG compressée
(`profilCoureur.ppsDocument = {data, type:"image/jpeg", nomFichier}`,
`profilCoureur.ppsExpiration`), synchronisé via `sauvegarderProfilCoureur()`
comme le reste du profil. **PDF converti en image dès l'import** (jamais
stocké tel quel) : rendu de la première page via pdf.js
(`chargerPdfJs()`, import dynamique jsDelivr, même pattern que
`chargerFitParser()` pour le FIT) en canvas puis JPEG qualité 0.85,
échelle jusqu'à 2x plafonnée à 1600px — corrige un rendu PDF non fiable
via `<iframe>`/`<embed>` sur mobile/TWA Android (pas de lecteur PDF
intégré contrairement à desktop, testé et confirmé en conditions réelles
: "PDF grisé + bouton Ouvrir qui ne fait rien"). Compromis assumé : seule
la première page est conservée (suffisant, le gabarit PPS FFA observé
tient sur une page). Photo importée : compression identique aux autres
images de l'app (redimensionnement max 1600px, JPEG 0.82). **Extraction
automatique de la date d'expiration tentée puis RETIRÉE** (regex `EXPIRE
LE JJ/MM/AAAA` sur le texte de la page pdf.js) : non fiable en pratique
sur le gabarit FFA observé (généré via Figma, texte probablement
vectorisé en tracés plutôt qu'en couche texte réelle) — saisie manuelle
de la date reste le seul chemin, simple et fiable. Alerte visuelle si
expiration ≤30 jours.

**Onglet Réglages — 6 groupes accordéon (31/07/2026)** — Compte et
abonnement / Profil coureur / Records personnels / Intégrations / Export /
Version, même mécanisme de persistance d'état que Stats/Course. Deux
sections restent hors accordéon, toujours visibles : la clôture de plan
Forme (action irréversible) et le thème clair/sombre (bouton icône
discret, intégré à l'en-tête de l'app plutôt qu'une carte séparée — fond
blanc fixe derrière ☀️, fond noir fixe derrière 🌙, indépendant du thème
actif pour un contraste constant). Le groupe "Profil coureur" affiche
désormais un simple rappel PPS en lecture seule (statut + date
d'expiration) — l'import/affichage/suppression du document passent
exclusivement par le bouton header (cf. ci-dessus), plus de formulaire
dupliqué ici.

**Records personnels — grille compacte avec validation explicite
(31/07/2026)** — chaque distance (5K/10K/Semi/Marathon) affiche
directement sa roulette (h/m/s) et son champ date, sans étape de clic
intermédiaire. Bouton **✓ Valider** (au-dessus du bouton ✕ Effacer,
regroupés verticalement) — seul déclencheur de sauvegarde
(`sauvegarderUnRecord(dist)`), plus aucune sauvegarde automatique
pendant la saisie (un mécanisme d'auto-sauvegarde par debounce a été
essayé puis abandonné, jugé trop capricieux). Roulette : seul le chiffre
actif reste visible pendant le défilement (chiffres voisins masqués en
opacité), boutons +/- au-dessus/en-dessous de chaque colonne en
complément du geste de défilement tactile. Positionnement initial vérifié
par condition réelle (élément visible) plutôt que délai arbitraire — cf.
§3 pour le détail complet de cette mise au point (plusieurs itérations de
délai infructueuses avant de trouver ce qui fonctionne de façon fiable).
Bouton Effacer : remet la roulette à 0 et marque l'état "effacé"
(`dataset.recordEfface`), mais ne sauvegarde pas non plus tout seul — il
faut valider avec ✓ pour que la suppression soit persistée. Même
composant déployé sur les roulettes du wizard (temps de référence,
objectif, estimation alternative, volume manuel — cf. §3) et de
l'onboarding (cf. §12). **Le badge "record_battu" ne se déclenche PLUS
depuis cette saisie manuelle** (retiré le 02/08/2026, cf. §16) — une
simple correction de record dans Réglages n'est plus considérée comme un
événement "célébrable".

**Roulette invisible dans un groupe accordéon fermé au chargement
(corrigé le 01/08/2026)** — si "Records personnels" est fermé au premier
`render()`, `attendreEtInitialiser()` abandonne après ~2s (le conteneur
n'est jamais visible pendant cette fenêtre) et la roulette n'est **jamais
construite** (0 item DOM, pas juste mal positionnée) — diagnostiqué par
tests directs en console (`getBoundingClientRect().width`, nombre
d'items, classe `.actif`), pas par relecture de code. Le callback
`onOuverture` du groupe accordéon construit désormais la roulette à la
demande (`window.initRouletteHMS`) si elle n'existe pas encore dans
`roulettesActivesReglages` au moment de l'ouverture, plutôt que de
supposer qu'elle existe déjà et se contenter de la repositionner. Piste
secondaire explorée en cours de route (`offsetParent` renvoyant `null`
malgré un élément visible et correctement dimensionné selon
`getBoundingClientRect`, cause exacte non identifiée) : ajout de
`getBoundingClientRect().width > 0` comme critère complémentaire dans
`attendreEtInitialiser` — n'était pas la vraie cause du bug signalé par
Laurent mais reste un vrai correctif utile en soi.

## 5. Persistance

**localStorage (préfixe `lk_`)** — clés globales (profil/config) :
`lk_profil_coureur`, `lk_strava_token`, `lk_strava_refresh`,
`lk_strava_expires`, `lk_strava_activities`, `lk_last_sync`,
`lk_data_source` (préfixée par plan via `clePourPlan()` une fois un plan
disponible, repli sur la clé brute avant — cf. §12 pour son écriture
depuis l'onboarding).

Clés préfixées par plan (via `clePourPlan()`) : `lk_statuses`,
`lk_hidden_sessions`, `lk_swapped_sessions`, `lk_session_notes`, `lk_notes`,
`lk_checklist`, `lk_adaptations_ignorees`, `lk_last_rebuild`,
`lk_pred_history`, `lk_race_goal`, `lk_race_horaires`, `lk_race_parcours`,
`lk_race_result`, `lk_race_result_details`, `lk_weather_cache`,
`lk_coach_msg`, `lk_coach_date`, `lk_coach_race_msg`,
`lk_resultat_test_forme`, `lk_manual_perf`, `lk_km_comptes_par_uid`.

**`lk_race_result_details`** (05/08/2026) — détail enrichi du résultat de
course : `{rpe, commentaire, classementGeneral:{place,total},
classementCategorie:{place,total}}`. Volontairement une clé SÉPARÉE de
`lk_race_result` (qui reste un simple nombre de secondes) plutôt qu'un
changement de format de cette dernière — 4 points d'appel existants
(bandeau dashboard, export PDF, check `hasRes` Réglages) font des calculs
arithmétiques directs sur `lk_race_result`, changer son format les aurait
tous cassés silencieusement. Un résultat saisi avant ce chantier reste
valide, ses détails sont simplement absents (`null`).

**`lk_manual_perf`** — objet `{uid: {average_speed, distance,
average_heartrate, dureeSaisieMin, intervalles}}`. `distance` est la
distance TOTALE de la séance (échauffement + effort + récup + retour au
calme si une durée totale a été saisie, cf. `distanceTotaleAvecRecup()`)
— **jamais** utilisée telle quelle par le prédicteur (cf. §7bis, qui
recalcule une distance d'effort seul). `intervalles` : tableau de
booléens réussi/raté par répétition (cf. §4, saisie manuelle).

**`lk_km_comptes_par_uid`** (05/08/2026) — registre `{uid:
kmDejaComptes}`, sert exclusivement à rendre idempotent l'ajustement du
cumul global `profilCoureur.kmCumulesTotal` (badge "km cumulés", cf.
§16) : mémorise, par séance, combien de km ont déjà été ajoutés au total
global, pour ajuster la différence à chaque changement de statut sans
jamais compter deux fois la même séance. Local au plan (comme le reste),
contrairement à `kmCumulesTotal` lui-même qui est un champ GLOBAL du
profil coureur (cumul total tous plans confondus).

**Principe** : toute donnée propre à un plan doit être préfixée — une clé
globale non préfixée est un risque de contamination inter-plans.

**Convention `statuses[uid]`** : peut valoir `'—'` explicitement, pas
seulement `undefined`/absent — tout code qui teste "cette séance a-t-elle
déjà un statut" doit vérifier `statuses[uid] && statuses[uid] !== '—'`.

**Tout point qui écrit ou efface un statut (`statuses[uid]`) ou une
saisie manuelle (`manualPerf[uid]`) doit répercuter le changement sur le
cumul km (`recalculerKmComptesPourUid`) et, si le type de séance est
SEUIL/VMA/SPEC, sur l'historique de prédiction (`rebuildPredHistory()`)**
— principe explicité le 05/08/2026 après plusieurs trous trouvés un par
un (clic manuel de statut, auto-validation en masse après synchro,
choix d'activité ambiguë, test semi-Cooper, saisie manuelle
Enregistrer/Annuler, suppression d'une activité). Tout NOUVEAU point
d'écriture de ces deux structures doit être vérifié contre cette liste
avant d'être considéré complet — cf. §16 pour le détail de chaque trou
corrigé.

**Supabase** — tables `plans_original` (copie figée), `plans_actif`
(version vivante), `plan_donnees`, `integrations` (colonne `v2_gist_id`
en brut), `abonnements`, `beta_testers`, `signalements`, `badges_debloques`
(cf. §11, §16). Sync Realtime activée sur `plan_donnees` (anti-écho 3s) —
**établissement du canal WebSocket non-bloquant depuis le 04/08/2026**
(cf. §16, chantier clignotement au chargement) : `activerRealtime()`
n'est plus `await`-é avant le premier `render()`, le canal continue de
s'établir en arrière-plan (fire-and-forget). File d'attente de sync en
cas d'échec réseau (`lk_file_attente_sync`, 5 min, abandon après 10
essais).

**Sauvegarde de plan — Supabase est l'unique mécanisme de persistance.**
Le système Gist v2 (`gist-sync.js`) a été entièrement retiré des écritures
— reste dans le repo uniquement pour `trouverPlanEnConflit` (garde-fou
anti-chevauchement de dates, fonction pure indépendante de la persistance).
Un plan Forme clôturé (`dateCloture` posée) ne peut plus être écrasé via
`mettreAJourPlanSupabase()`.

**`chargerResultatsCoursesSupabase(userId)` (`sync-storage.js`,
05/08/2026)** — liste les résultats de course déjà saisis sur TOUS les
plans course d'un utilisateur (mode ≠ 'forme'), pour la section "🏅 Mes
courses" (cf. §4). Requête en N+1 (une lecture `plan_donnees` par plan
via `chargerPlansSupabase()` puis une lecture par plan trouvé) plutôt
qu'un `IN(...)` groupé — volume attendu faible, pas justifié d'optimiser
davantage pour l'instant. Ne retourne que les plans ayant réellement un
`lk_race_result` enregistré ; `lk_race_result_details` est optionnelle
et peut être absente sans erreur (résultat saisi avant l'ajout de ces
champs enrichis).

**Sauvegarde/restauration de la base (`api/backup.js`, cf. §16)** — le
projet Supabase est en plan **Free**, qui n'inclut ni Daily Backups ni
PITR (les deux démarrent au plan Pro). `api/backup.js`, accessible depuis
`beta-admin` (onglet Sauvegarde), comble ce manque : export global
(découverte automatique des tables via introspection PostgREST — jamais
de liste blanche codée en dur, toute nouvelle table est incluse au
prochain export sans modification de code), export ciblé par utilisateur
(email, réutilise la recherche du module Comptes), et réinjection en
upsert. `decision_events`/`decision_outcomes` traités via la chaîne
indirecte (`decision_event_id`, pas de `user_id` direct sur la seconde
table). Réinjection d'un utilisateur dont le compte Auth a été supprimé :
recréation automatique avec le même `id` (nécessaire pour que les clés
étrangères de l'export pointent vers le bon utilisateur) avant réinjection
des données. Réinjection depuis un export **global** : champ e-mail
optionnel pour isoler un seul utilisateur (filtrage côté serveur du JSON
déjà chargé, réutilise la même logique de rattachement que l'export
ciblé) — bloque explicitement si aucune ligne ne correspond à cet e-mail
dans l'export fourni, plutôt qu'un upsert silencieux de 0 ligne. Retrouver
l'`id` de cet utilisateur pour le filtrage suit une cascade (le compte
peut déjà avoir été supprimé, cas réel rencontré lors des premiers tests
du 01/08/2026) : **un `user_id` fourni manuellement a toujours priorité
absolue** quand il est renseigné (corrigé le 01/08/2026 — un ordre
précédent laissait un compte Auth déjà recréé, potentiellement à un
mauvais id lors d'une tentative ratée, court-circuiter silencieusement le
champ manuel), sinon API Admin Auth, sinon table `abonnements` de l'export
(a un champ `email`, mais pas garanti d'avoir un `user_id` renseigné —
peut rester vide si l'abonnement a été créé par email avant toute
connexion du compte). Sans objet sur un export déjà ciblé (déjà scoped à
une seule personne).

**Garde-fou de cohérence id/données avant recréation d'un compte
(01/08/2026)** — un `id` et un `email` ne sont pas la même clé (`user_id`
est la clé de vérité pour les données applicatives, `email` sert
seulement à la recherche humaine) ; rien ne garantissait qu'ils forment
la bonne paire une fois reconstitués manuellement. Incident réel : un
`user_id` incorrect (mal recopié) a permis de recréer un compte Auth
fantôme, vide de toute donnée, donnant l'illusion trompeuse d'une
réinjection réussie. `recreerUtilisateurSiAbsent` exige désormais qu'au
moins une ligne des données à réinjecter porte réellement cet `id` avant
de créer le compte — sinon refuse explicitement (statut 409) plutôt que
de laisser deviner silencieusement. N'empêche pas une faute de frappe
sur un id qui correspondrait par coïncidence à un autre vrai utilisateur
— seule la vérification manuelle du couple email/id dans une donnée déjà
connue (ex. `plans_actif`) reste fiable à 100%.

Portée strictement limitée à la réparation d'une perte accidentelle —
jamais un contournement d'une suppression de compte volontaire au titre
du droit à l'effacement (RGPD art. 17).

**Diagnostic des cascades ON DELETE (`api/backup.js`, onglet Cascades de
`beta-admin`, ajouté le 01/08/2026)** — vérifie proactivement que toute
table applicative avec une colonne `user_id`/`id_utilisateur` a bien
`ON DELETE CASCADE` vers `auth.users`, avant qu'une suppression de compte
n'échoue en prod (cf. incident `decision_events`/`badges_debloques`
ci-dessous). Repose sur deux fonctions RPC Postgres
(`diagnostiquer_cascades_user_id`, `diagnostiquer_colonnes_user_id_sans_fk`
— cf. `docs/v2-methodologie/diagnostic-cascades-user-id.sql`, à exécuter
une fois dans le SQL Editor, accès restreint au `service_role`) : aucune
lecture directe possible sur `information_schema` via PostgREST, seule
une fonction RPC exécutant du SQL côté serveur peut interroger le
catalogue système. Génère le SQL de correction prêt à copier-coller pour
chaque table à risque — cet onglet ne modifie **jamais** le schéma
lui-même, uniquement en lecture ; toute correction reste un geste manuel
de Laurent dans le SQL Editor. À lancer occasionnellement (ex. avant une
mise en production), pas à chaque table ajoutée — la vérification
systématique au moment de créer une table reste la responsabilité
principale (cf. §15).

**`decision_events`/`decision_outcomes`** — étape 1 du chantier de vision
"coach adaptatif à mémoire par coureur" (cf. §16). Écriture best-effort
uniquement, aucune lecture n'exploite encore cette donnée.
`decision_events` journalise chaque décision du `RuleEngine`
(proposée/appliquée/ignorée, contexte complet). `decision_outcomes` lie
une décision à la première séance ultérieure avec un statut connu
(référence `decision_event_id`, pas `user_id` directement — n'a pas cette
colonne). RLS strictement par propriétaire. Schéma SQL dans
`schema-decision-memory.sql`.

**Suppression de compte — toutes les tables applicatives liées à
`user_id` doivent être en `ON DELETE CASCADE`** (corrigé le 31/07/2026,
signalé par Laurent : "je suis sur un compte... je ne peux pas me
déconnecter" puis "Échec de la suppression côté Supabase" une fois le
premier bug réglé). Deux tables étaient sans cascade et bloquaient
`api/delete-account.js` avec une violation de contrainte (erreur
PostgreSQL 23503) : `decision_events` (`delete_rule=NO ACTION` à
l'origine) et `badges_debloques` (idem, découverte séparément lors d'une
seconde tentative de suppression — la première erreur masquait la
seconde tant qu'elle n'était pas résolue). Les deux référencent
maintenant `auth.users(id)` en `CASCADE`. `decision_outcomes` cascade
indirectement via `decision_event_id` → `decision_events.id`, pas de
lien direct à `user_id`. **`plans_actif` a été corrigé le 01/08/2026** —
n'avait auparavant aucune contrainte de clé étrangère du tout (découvert
par le diagnostic ci-dessus), donc une suppression de compte laissait ses
plans orphelins silencieusement sans jamais échouer ni les nettoyer ;
`ON DELETE CASCADE` ajouté vers `auth.users(id)`, aucune ligne orpheline
préexistante trouvée au moment de l'ajout. `api/delete-account.js`
nettoie en plus `decision_events` explicitement en filet de sécurité
(`TABLES_A_NETTOYER`), avant l'appel à l'Admin API — **toute nouvelle
table applicative liée à `user_id` doit être vérifiée en cascade** au
moment de sa création (diagnostic disponible dans `beta-admin`, onglet
Cascades, cf. ci-dessus), pas seulement au moment où quelqu'un tente de
supprimer son compte.

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
- `pps` : champ texte (numéro de licence/PPS) — **retiré de l'onboarding
  le 02/08/2026** (remplacé par le module d'import `ppsDocument`, cf. §4).
  Reste dans la structure pour compatibilité, éditable nulle part dans
  l'UI actuelle.
- `ppsDocument`/`ppsExpiration` : gérés exclusivement via la modale du
  bouton "🩺 PPS" du header (cf. §4) — Réglages n'affiche qu'un rappel en
  lecture seule (statut + date), aucun formulaire d'import ici.
- `kmCumulesTotal` (05/08/2026) : cumul de km sur toutes les séances
  validées (✅/⚠️/❌), tous plans confondus — alimente le badge "km
  cumulés" (cf. §16). Champ GLOBAL (contrairement à la quasi-totalité du
  reste de ce profil, qui est aussi global par nature — mais à
  distinguer explicitement de `lk_km_comptes_par_uid`, lui local au
  plan, cf. §5). Ajusté de façon idempotente à chaque changement de
  statut via `recalculerKmComptesPourUid()`. Un script de rattrapage
  ponctuel (non versionné dans le repo, fourni une fois à Laurent) permet
  d'initialiser ce total depuis l'historique déjà validé avant la mise en
  place de ce champ.
- Wizard : `preremplirDepuisProfilCoureur()` auto-remplit à partir du
  profil (record le plus pertinent, repli Riegel sinon).
  `verifierCoherenceRecord()` écarte un record si écart >10% à
  l'estimation Riegel des autres.
- **Sauvegarde** : plus de bouton "Enregistrer" global (retiré le
  31/07/2026, cf. §4) — chaque champ du profil coureur (identité,
  poids/taille/FC, objectif) s'auto-sauvegarde individuellement à la
  sortie du champ (`sauvegarderProfilCoureur()`), les records personnels
  passent par validation explicite (cf. §4). Les sélecteurs Niveau/Sexe
  ne doivent JAMAIS appeler `sauvegarderProfilCoureur()` directement au
  clic — seulement mettre à jour l'état local puis `render()`, sinon un
  profil incomplet écrase Supabase.
- **Toute donnée binaire volumineuse** (image, PDF converti) doit être
  compressée côté client avant sauvegarde — cf. §15 pour le principe
  général et l'incident qui l'a fait acter (PPS).
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
`enAttenteTest`. **Validation du test (`renderTestSemiCooperRow`,
05/08/2026)** : compte désormais aussi pour le badge "km cumulés" (cf.
§16) — pose une entrée `manualPerf[uid]` minimale (distance connue,
allure/FC absentes) puisque ce point d'écriture de statut ne passait pas
par les mécanismes habituels (cf. §5, principe transverse sur les points
d'écriture de statut).

**Refus si volume incompatible avec le nombre de jours** — si plus de la
moitié des semaines de Construction ont un EF sous `VOLUME_MIN_EF_KM`
(3km) ou une longue sous `VOLUME_MIN_LONGUE_KM` (5km),
`generatePlan()` retourne `{ planInvalide: true, code:
'VOLUME_JOURS_INCOMPATIBLE', message }` plutôt qu'un plan cassé. Les 3
points d'appel (`v2/index.html` création/régénération/modif objectif,
`index.html` plan de repli) gèrent ce retour et affichent le message.
**Correction du 02/08/2026** : les semaines de Construction antérieures à
`semaineDepart` (cf. paragraphe `computeVolumeProgression` ci-dessous,
présentes uniquement quand `semaineDepart > 1`) sont désormais exclues
des statistiques de ce garde-fou (`semaineHorsProgression`) — avant ce
correctif, elles retombaient systématiquement à volume cible nul,
déclenchant `VOLUME_JOURS_INCOMPATIBLE` avec un message IDENTIQUE quel
que soit le volume réellement saisi (bug signalé par Laurent, reproduit
jusqu'à 100km/semaine).

`VOLUME_MIN_PAR_JOURS` est une table à trois niveaux
(`[distance][niveau][nbJours]`), recalibrée par niveau le 06/08/2026 —
remplace l'ancienne table à deux niveaux (`[distance][nbJours]`, calée
uniquement sur "intermédiaire" à sa création). Calibration par simulation
exhaustive du moteur réel (pire cas sur allure/objectif/placement des
jours/durée du plan, hors contraintes ponctuelles qui cassent localement
la monotonie inter-distance), planchers ensuite forcés monotones sur les
4 axes (jours croissants, distance 5K≤10K≤Semi≤Marathon, niveau
debutant≤intermediaire≤confirme) et majorés de 15% comme marge de
confort au-dessus du strict minimum structurel :

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
génération standard) ou non reconnu. Vérifié sans régression contre
`scripts/test-plans-varies.js` (mêmes 4 profils refusés qu'avec
l'ancienne table, aucun nouveau refus). Les contraintes ponctuelles
(blessure-active, douleur-chronique, reprise) restent hors de cette
calibration — un coureur proche de ce plancher avec l'une de ces
contraintes reste protégé par le second garde-fou
`VOLUME_JOURS_INCOMPATIBLE` (calculé après génération réelle du plan) et
par les warnings dédiés (`BLESSURE_ACTIVE`, etc.).

**`computeVolumeProgression` — paramètre `semaineDepart` (02/08/2026)** —
par défaut à 1 (comportement historique, génération initiale d'un plan).
Permet de faire démarrer la progression du volume (+10%/semaine,
décharge tous les 4 semaines) à une semaine ultérieure du plan plutôt que
depuis la semaine 1 — la progression REPART réellement de ce niveau, au
lieu de recalculer toute la courbe depuis zéro puis n'en garder que la
fin (cf. §3, levier Volume, pour le bug que ce paramètre corrige). Les
semaines avant `semaineDepart` ne sont pas produites par cette fonction —
sans impact, l'appelant ne conserve de toute façon que les semaines
≥ charnière. Le rythme des décharges reste calculé sur le numéro de
semaine RÉEL du plan, pas réindexé à 1, pour ne pas se désynchroniser du
rythme déjà en cours dans les semaines conservées avant la charnière.

**`repartirVolumeSemaine` — partage proportionnel longue/EF par poids
(02/08/2026, remplace `RATIO_LONGUE_PAR_JOURS` et
`MARGE_LONGUE_VS_QUALITE_KM`)** — signalé par Laurent après le correctif
du levier Volume ci-dessus : "on a des EF ridicules". Diagnostic en deux
temps :
1. L'ancien système calculait la longue EN PREMIER (ratio par nombre de
   jours, ou "au moins `kmQualiteTotal + 1km`" si plus grand), les EF
   récupérant seulement ce qu'il restait, sans plancher symétrique. À
   volume juste au-dessus du seuil minimum, cette contrainte pouvait à
   elle seule absorber presque tout le budget restant, laissant des EF à
   0.4-2km (mesuré en simulation directe, 10K/Semi, 5j, niveau confirmé).
2. `kmQualiteTotal` utilisé pour cette contrainte incluait à tort
   l'échauffement/retour au calme des séances qualité (souvent 40-50% du
   volume affiché de la séance, ~25min fixes à allure EF) — ce "faux
   volume qualité" gonflait artificiellement la longue sans rapport avec
   l'intensité réelle du travail effectué.

Nouvelle logique : la longue et chaque EF sont traités comme des "parts"
d'un même budget (`kmRestant = volumeCibleKm - kmQualiteTotal`, calculé
sur le volume RÉEL des séances qualité, échauffement inclus — sinon le
volume hebdo total dépasserait la cible), avec la longue pondérée à
`POIDS_LONGUE = 1.6` fois un EF individuel :
`kmLongue = kmRestant × POIDS_LONGUE / (POIDS_LONGUE + nbEF)`,
`kmParEF = kmRestant / (POIDS_LONGUE + nbEF)`. Garantit PAR CONSTRUCTION
que `kmLongue >= POIDS_LONGUE × kmParEF`, sans avoir besoin d'un ratio
empirique par palier ni d'une contrainte séparée sur le cumul qualité (qui
créait par ailleurs des sauts de ratio incohérents à certains volumes
précis, ex. un ratio de x3.2 au lieu de x1.6 observé à 7 jours/40km avant
correction). Valeur 1.6 retenue après simulation exhaustive (4 distances
× 3 niveaux × 5-6 nombres de jours, au seuil minimum exact de chaque
combinaison — le point le plus tendu) : aucune violation observée (EF
toujours ≥ ~3.4km), ratio stable et cohérent partout. Cas particulier à
**2 jours/semaine** (1 qualité + 1 longue, aucun EF) : tout le budget
restant va mécaniquement à la longue (`nbEF === 0`), pouvant produire des
longues déraisonnables à fort volume (jusqu'à 50+ km observé en
simulation) — `genererContenuLongue()` plafonne déjà la DURÉE affichée
(`DUREE_MAX_LONGUE_MIN`), mais le kilométrage excédentaire disparaissait
silencieusement du plan sans que le coureur en soit informé. Nouveau
warning informatif `VOLUME_LONGUE_EXCESSIVE_2J` (pas un refus, contrairement
à `VOLUME_JOURS_INCOMPATIBLE`) : détecte ce cas en amont et invite à
passer à 3 jours ou plus, sans bloquer la génération du plan.

**Records du monde — plancher absolu de temps saisissable** —
`RECORDS_MONDE_SECONDES` (5K/10K/Semi/Marathon, hommes route), bloque
toute saisie de temps plus rapide, partout où un temps de référence/
objectif/record est saisi (wizard, Réglages, onboarding). Table dupliquée
en local dans `auth.js` (onboarding) — ce module ne doit jamais dépendre
de l'ordre de chargement d'`index.html`/`plan-generator.js`, à garder
synchronisée manuellement si les records évoluent.

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

**`distanceEffortStructure(structureIntervalles, allureReplixSecParKm)`
(`index.html`) — repli sur une allure fournie par l'appelant
(05/08/2026)** — calcule la distance d'EFFORT SEUL d'une structure
d'intervalles (jamais l'échauffement/récup/retour au calme, distinct de
`distanceTotaleAvecRecup()`). Second paramètre optionnel ajouté : quand
un bloc n'a NI `distanceM` NI `allure` prédéfinie dans le plan (blocs
définis uniquement en durée, ex. "4×3min"), et qu'aucune durée totale
n'a été saisie en repli côté saisie manuelle, la fonction retournait
`null` pour ce bloc — la séance manuelle entière se retrouvait alors
sans distance calculable du tout, invisible pour le prédicteur (cf.
§7bis) malgré un statut ✅/⚠️ bien posé. `allureReplixSecParKm` (l'allure
que le coureur vient de saisir dans le formulaire) sert de repli dans ce
cas précis. N'affecte aucun appelant existant sans ce second paramètre
(comportement inchangé, `undefined` par défaut).

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
quelques secondes) — reste à 5/10 OK + 5/10 REFUSÉ après les correctifs
du 02/08/2026 (levier Volume, répartition EF/longue), aucune régression.

## 7bis. Prédicteur d'estimation 10K (`v2/engine/predictor.js`)

Extrait de `index.html` le 31/07/2026 dans un module ES dédié — fonctions
pures, aucune ne mute directement l'état global ni n'appelle Supabase
(sauf `predict10K()` qui mute `predHistory` EN PLACE et déclenche sa
sauvegarde via `saveFn`, reçu en paramètre). Distinct des 5 modules du
moteur de décision (§8) mais lit les mêmes données.

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
localement PAR RAPPORT À `dateStr` (pas un champ figé) — nécessaire pour
la reconstruction rétroactive.

**`weightedAvgByEffortDuration()` — distance d'effort seul pour les
saisies manuelles, jamais la distance totale (corrigé le 05/08/2026,
bug signalé par Laurent : "modifier la durée totale de la séance change
l'estimation, alors que seule l'allure des intervalles devrait
compter")** — avant ce correctif, le "lap virtuel" construit pour chaque
séance saisie manuellement utilisait `manualPerf[uid].distance` en
priorité, qui est la distance TOTALE de la séance (échauffement compris)
quand une durée totale a été saisie côté formulaire. Le calcul prétendait
alors que TOUTE cette distance avait été courue à l'allure des
INTERVALLES — gonflant artificiellement le poids de cette séance dans la
moyenne pondérée proportionnellement à la durée d'échauffement/récup
saisie, sans aucun rapport avec la performance réelle. Utilise désormais
systématiquement `distanceEffortStructureFn` (distance d'effort seul,
cf. §7), avec l'allure de la séance en repli si le plan n'a pas prédéfini
d'allure de bloc (cf. §7, second paramètre de `distanceEffortStructure`).

**Historique rejoué rétroactivement** : `rebuildPredHistorySequentielle()`
applique la convergence jour par jour depuis le début du plan.
`PREDICTOR_VERSION` (actuellement 12) déclenche la reconstruction si
incrémentée — geste manuel requis à chaque changement de formule.
**Premier rendu différé depuis le 04/08/2026** (cf. §4/§16) : quand une
reconstruction est nécessaire au chargement, `rebuildPredHistory()`
(wrapper resté dans `index.html`, cf. en-tête de `predictor.js`) affiche
un état intermédiaire "recalcul en cours" via `renderDiffere()` plutôt
que `render()` immédiat.

**`rebuildPredHistory()` doit être appelée à chaque point qui pose ou
retire un statut de séance SEUIL/VMA/SPEC, pas seulement au clic manuel
(05/08/2026)** — plusieurs points d'écriture de statut posaient un
✅/⚠️/❌ sans jamais redéclencher ce recalcul, laissant l'estimation
affichée figée sur une ancienne valeur de convergence qui ne
correspondait plus à l'état réel du plan : l'auto-validation en masse
après synchro Strava/import FIT (`matchActivitiesToPlan()` — le chemin
le PLUS FRÉQUENT en usage réel, pas un cas marginal), le choix explicite
d'une activité ambiguë, et la suppression d'une activité déjà validée
(bouton 🗑️). Corrigés en ajoutant l'appel à ces 3 points, en plus des
points déjà couverts (clic manuel `renderStatusRow`, saisie manuelle
Enregistrer/Annuler). Cf. §5 pour le principe transverse qui en découle.

Formule Daniels-Gilbert (VDOT) pour SEUIL — remplace Riegel,
structurellement pessimiste sur un effort sous-maximal (chapitre 5 du
livre Daniels absent du fichier projet, formule reconstruite par
recherche web, cohérente avec les % VO2max confirmés au chapitre 4).
Filtres d'activités : `a.type === "Run" || a.sport_type === "Run"`
(repli sport_type pour montres tierces). Convergence n'avance que sur
nouvelle donnée de qualité du JOUR (`aDesNouvellesDonneesQualite`), pas à
chaque simple chargement.

**Contextualisation du verdict "❌ À risque" (Stats, projection au jour J,
26/07/2026)** — livrée le même jour que sa conception. Écart chiffré vs
objectif toujours affiché ("−Xs d'avance"/"+Xs vs objectif"), message
contextuel affiché uniquement sous verdict "❌ À risque" précisant le
nombre de semaines de données disponibles sur la durée totale du plan et
rappelant que le rythme évolue souvent en phase Spécifique/Affûtage —
purement informatif, ne change rien au calcul. Piste alternative
(pondérer différemment les phases à venir plutôt que d'extrapoler
uniformément) reste NON codée et NON conçue en détail — nécessite de
définir combien Spécifique/Affûtage apportent en plus, donnée non
disponible actuellement.

**Non couvert / reporté** : PACES-S (plaisir par séance) ;
R-062/R-070/R-080 jamais observées sur données réelles de Laurent —
surveiller ; rythme de convergence (`PAS_CONVERGENCE_BASE=0.15`) à
éprouver sur plusieurs semaines ; formule VDOT reconstruite par recherche
web, pas garantie identique aux tables publiées ; aucune variable interne
(`ALL_SESSIONS`, `statuses`, `PLAN`...) exposée sur `window` pour debug —
seuls `__PLAN_BRUT__`/`__PLAN_GENERE__`/`stravaActivities`/`localStorage`
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

## 9. Saisie manuelle, RPE et statuts de séance

**Saisie manuelle** : bouton "Annuler" (réinitialise + relance sync
Strava), champ "durée totale" pour séances de qualité, exclusion Strava
complète quand saisie manuelle existe, grille réussi/raté par intervalle
pour les séances qualité (cf. §4). Accessible via l'icône ✏️ unifiée
(cf. §4) — regroupe saisie manuelle et import FIT dans un seul popover.

**RPE** : source unique `sessionRpe[uid]`, sélecteur 5 niveaux
(🙂😐😓😣🥵) mappés CR-10, visible dès qu'un statut est posé, pondération
TRIMP +12% si RPE ≥ 8. Même échelle réutilisée pour le ressenti du
résultat de course (cf. §14bis).

**Statuts de séance** (`SOPTS`) : `—`/`✅`/`❌`/`⚠️`/`😴`, indexés par
`uid`. Une séance ne peut plus être supprimée du plan — seul un statut
la caractérise. Un statut est automatiquement remis à `—` si l'activité
(Strava ou FIT) qui lui était associée est supprimée manuellement (cf.
§10) — évite un badge orphelin faisant référence à une donnée effacée.

**`statutEffectif`** — calculé centralement dans `recalculerAllSessions()`,
disponible sur chaque objet `ALL_SESSIONS` : égal au vrai statut saisi
s'il existe, sinon `"😴"` automatiquement pour tout jour DÉJÀ PASSÉ
(jamais le jour même) sans saisie. Jamais écrit dans `statuses[uid]`
lui-même — purement un calcul d'affichage. Accès protégé par try/catch
(pas `typeof`, ne protège pas la temporal dead zone — cf. §3 pour un cas
similaire rencontré sur une variable `let` plutôt qu'un accès à un objet).

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
indépendamment du matching). **Point d'auto-validation également couvert
par le cumul km et le recalcul d'estimation** (cf. §5/§7bis) depuis le
05/08/2026.

**Protection des activités importées** — la première activité sur une
date (Strava ou FIT) ne peut plus être écrasée silencieusement par une
resynchronisation ; distinct de l'ambiguïté Strava ci-dessus (gérée
avant qu'une activité soit retenue). Détail complet en §10.

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
séance programmée en entraînement structuré. Repli sur
`fit-detection.js` (`public/v2/engine/`) : reconstruction par
reconnaissance de signal sur le flux `record` brut (segments continus
au-dessus d'un seuil de vitesse, deux profils de paramètres selon le
type de séance). Calibré sur 4 séances réelles — nombre de répétitions
fiable, précision de l'allure ±1-2s sur efforts longs, ±10-15s au pire
sur efforts courts (limite structurelle acceptée). Détail complet :
`docs/v2-methodologie/import-fit-intervalles.md`.

Un flag `lapsSontDejaEffortSeul` (posé par `adapterFitVersFormatActivite()`)
court-circuite le curseur de `getLapsAffichage()` (suppose une
alternance effort/récup native, absente pour cette source) — corrigé une
seule fois dans le wrapper, pas dans chacun de ses 9+ appelants.

**Protection des activités importées — "premier arrivé, reste"** — la
première activité sur une date (Strava ou FIT) ne peut plus être écrasée
silencieusement par une resynchronisation ; seule une suppression
manuelle explicite (badge de source + bouton 🗑️ sur la carte de séance)
libère la date. `syncStrava()` merge plutôt qu'écrase, `importerFichierFit()`
bloque l'import si une activité existe déjà. Effet de bord assumé : une
activité Strava corrigée a posteriori sur Strava.com n'est plus
re-synchronisée tant que l'ancienne n'est pas supprimée. `matchActivitiesToPlan()`
étant appelée par les 3 chemins d'entrée (synchro Strava, import FIT,
choix d'activité ambiguë), un correctif appliqué à cette fonction (cf.
§5/§7bis, cumul km et estimation) bénéficie automatiquement aux 3 sans
duplication.

**Pas de stockage du fichier `.fit` brut** — seul le résultat de la
détection est conservé (dans `stravaActivities`, `_source: "fit"`) ; pas
de re-parsing rétroactif possible si l'algorithme évolue.

**Point de vigilance non spécifique au FIT** : `fit-file-parser@3.0.2`
dépend de `buffer`, non polyfillé par le fichier ESM brut jsDelivr —
bloquait tout import FIT. Corrigé via import map (polyfill minimal,
`TextDecoder` natif) en tête du `<head>` d'`index.html`.

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
plan, synchronisés via Supabase). Cohérent avec le principe "aucun outil
admin ne doit jamais lire ou utiliser les tokens Strava d'un testeur"
(cf. §15) — les tokens restent volontairement locaux, jamais centralisés
côté serveur au-delà de l'échange OAuth initial. **Ne remplace plus
jamais silencieusement une activité déjà présente sur une date** (cf.
§10, principe "premier arrivé, reste" — s'applique aussi bien à une
resynchro Strava face à une activité FIT qu'entre deux resynchros
Strava successives).

**`syncStrava()` — robustesse sans plan existant (02/08/2026)** — le
calcul de `planStart` (date la plus ancienne entre le début du plan
actuel et 8 semaines en arrière, pour l'historique ACWR) supposait
toujours qu'un plan existe (`PLAN[0].sessions[0].date`), ce qui n'avait
jamais posé problème tant que la connexion Strava se faisait
nécessairement APRÈS la création d'un premier plan. Le nouveau flux
d'onboarding (cf. §12) permet de connecter Strava AVANT tout plan — le
retour d'OAuth sur `/` déclenche `syncStrava(true)` automatiquement
(`lk_strava_sync_apres_reload`), avec `PLAN` vide/undefined à ce
stade. `PLAN[0]` levait une `TypeError` qui tombait silencieusement dans
le `catch` générique de la fonction, affichant à tort "❌ Erreur réseau —
activités précédentes conservées" alors qu'aucune requête réseau n'avait
même été tentée. Corrigé par un accès sécurisé
(`PLAN?.[0]?.sessions?.[0]?.date`) avec repli sur 8 semaines seules si
aucun plan n'est disponible.

**Relecture de `stravaToken`/`stravaRefresh`/`stravaExpires`/
`stravaActivities` après le préchargement Supabase (05/08/2026, bug
signalé par Laurent : synchro absente à l'ouverture, "perdue" après un
F5)** — ces 4 variables sont lues UNE SEULE FOIS à leur déclaration
(`let x = load("lk_...", défaut)`), sur un appareil où le token n'était
pas encore en `localStorage` à cet instant précis (rechargement complet,
nouvel appareil), elles restaient figées à `null`/vide pour tout le
reste de l'exécution — même après que le préchargement Supabase ait fini
d'écrire le vrai token en `localStorage` un instant plus tard.
`autoSync()` testait alors `if (stravaToken && ...)` sur une variable qui
ne reflétait jamais la réalité fraîchement rechargée, et ne déclenchait
donc jamais la synchro automatique attendue. Corrigé par une relecture
explicite (`if (!stravaToken) { stravaToken = load(...); ... }`), placée
**après** la déclaration `let stravaToken` elle-même (cf. §3 pour
l'erreur de TDZ commise puis corrigée lors de la première tentative de ce
correctif — la relecture avait d'abord été placée trop tôt dans le
fichier, avant la déclaration).

**Météo** — proxy Open-Meteo (`api/weather.js`), gratuit, sans clé.
`type=forecast|current|historical`. Géolocalisation : dernière activité
Strava GPS pour actuelle/passée, position navigateur pour prévision J+1.
Heure réelle de séance extraite de `start_date_local` pour la météo
passée (repli 18h si absente) — **livré le 24/07/2026**, `handleHistorical`
(`api/weather.js`) accepte un paramètre `hour` optionnel transmis par
`fetchHistoricalWeather()` depuis la vue Semaine, extrait via découpage de
chaîne (jamais `new Date().getHours()`, qui donnait un décalage de +2h en
été à cause du suffixe "Z" mal interprété). `timezone` transmis
dynamiquement depuis `Intl.DateTimeFormat().resolvedOptions().timeZone`
(fuseau du navigateur) — `TIMEZONE_DEFAUT="Europe/Paris"` ne sert que de
repli si le navigateur ne fournit rien, plus un point bloquant. **`fetchWeather()`/
`verifierMeteoSeanceDemain()` en rendu différé depuis le 04/08/2026**
(cf. §4/§16) : ces deux fonctions s'exécutent immédiatement au
chargement (fire-and-forget, jamais `await`-ées), leur `render()` de fin
pointe désormais vers `renderDiffere()` plutôt qu'un rendu immédiat.

**Coach (messages courts)** — `api/coach.js`, proxy Claude Haiku 4.5.
**`fetchCoachMsg()` accepte un paramètre `differe`** (04/08/2026, cf.
§16) : `true` uniquement pour l'appel de démarrage
(`setTimeout(() => fetchCoachMsg(true), 2000)`), pour se regrouper avec
d'autres mises à jour automatiques proches — les autres appels (après
validation d'une séance, etc.) gardent `differe=false` par défaut, rendu
immédiat.

**Sync multi-device** — Supabase (auth email/mot de passe), seul
mécanisme. Aucune action au-delà de se connecter avec le même compte.
Ne couvre PAS Strava (cf. ci-dessus).

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

**Module "Sauvegarde"** (`beta-admin`, cf. §5, §16) — export global,
export ciblé utilisateur (réutilise la recherche par email du module
Comptes), réinjection depuis un fichier JSON. Même règle stricte :
jamais de lecture des tokens Strava d'un testeur.

**Module "Cascades"** (`beta-admin`, cf. §5, §16) — diagnostic proactif
des tables sans `ON DELETE CASCADE` vers `auth.users`, avec SQL de
correction généré automatiquement. Lecture seule, aucune modification du
schéma déclenchée depuis l'interface.

## 12. Authentification Supabase

Auth email/mot de passe (pas de Google/Apple). Variables exposées via
`api/config.js`. `LkSync.precharger(userId, planId)` réhydrate
`localStorage` depuis Supabase avant que `window.__AUTH_PRET__` ne se
résolve — retourne `{ok, echecChargementProfil}`, jamais de throw.
**Point de vigilance critique** : `index.html` ne doit jamais déclencher
l'écran de bienvenue si `echecChargementProfil` est vrai — sinon un
`localStorage` non réhydraté est pris à tort pour "profil jamais
renseigné" et écrase le vrai profil Supabase.

**`monterEcranAuth()` — vérification de session AVANT construction du
HTML (04/08/2026)** — jusqu'ici, le formulaire de connexion était
TOUJOURS inséré dans le DOM en premier, puis masqué (`display:none`) une
fois `getUser()` résolu positivement : sur une session déjà valide, ça
produisait un flash visible du formulaire le temps de l'aller-retour
réseau réel que fait Supabase pour valider la session (`getUser()` n'est
pas une simple lecture de cache local, même avec une session déjà
"connue" côté client). Corrigé en sortant la vérification de session
dans une étape préalable, AVANT toute construction du HTML : si un
utilisateur valide est trouvé (hors cas retour "mot de passe oublié",
identifié via `window.location.hash.includes('type=recovery')`, qui
force toujours la construction de l'écran), la fonction résout
directement sans jamais insérer le moindre élément de formulaire dans le
DOM.

**Écran d'onboarding (`monterEcranOnboarding`, `auth.js`) — 5 pages
(refonte du 01/08/2026, page Source de données ajoutée le 02/08/2026)** —
collecte l'intégralité du profil coureur, réparti en 5 pages successives
navigables (swipe horizontal + boutons Précédent/Suivant, même principe
que `ECRANS_WIZARD`/`attacherSwipeEtapes` dans `v2/index.html`, porté
indépendamment ici) :
1. Toi (prénom*, nom, date de naissance*)
2. Ta forme (poids, taille, FC max/repos, sexe, 🩺 PPS — module d'import
   compact, cf. §4/§6)
3. Records personnels
4. Ton niveau*
5. **Source de données*** — Strava ou Saisie manuelle (02/08/2026,
   demande de Laurent : l'onboarding ne demandait jamais comment les
   séances seraient suivies, `dataSource` valait `"strava"` par défaut
   silencieusement)

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
retour puisque tout est déjà persisté avant ce point. Ce choix
("dernière étape uniquement", pas de sauvegarde/restauration temporaire
d'un état d'onboarding en cours) a été retenu pour éviter un couplage
fragile entre `auth.js` (qui ne doit jamais dépendre d'`index.html`) et
la logique de reprise après un rechargement complet. **Cas grand
débutant** : traité EN PRIORITÉ, avant toute redirection Strava directe
— redirige toujours vers l'écran dédié `/v2?onboarding=grand-debutant`,
qui a son propre bouton "Connecter Strava" avec un mécanisme de retour
d'OAuth plus robuste (`sessionStorage`, cf. §14) ; un grand débutant
ayant choisi Strava à la page 5 ne doit jamais partir en OAuth
directement, ce qui court-circuiterait cet écran dédié. `dataSource`
écrit en `localStorage` avec la clé non préfixée (`clePourPlan()` n'est
pas encore disponible à ce stade du chargement, comme pour
`profilCoureur` — cohérent avec son repli sur la clé brute en l'absence
de plan). **Bug corrigé le même jour** : ce nouveau flux a révélé un bug
latent dans `syncStrava()` (cf. §11) — la fonction ne gérait pas
l'absence de plan lors du tout premier retour d'OAuth.

Records personnels saisis via le même composant roulette que Réglages
(boutons +/-, viewport réduit, positionnement initial par condition
réelle — cf. §4 pour le détail complet de ce composant, y compris son
cas particulier accordéon). Champ date ajouté par record (manquait avant
le 01/08/2026, empêchait tout départage de cohérence entre records via
`verifierCoherenceRecord`). `terminer()` lit les valeurs directement
depuis l'API de chaque roulette (`colApi.valeur()`) plutôt que les inputs
cachés potentiellement pas encore synchronisés par le debounce du scroll
(120ms) — corrige un bug réel où un record scrollé juste avant de
cliquer Valider n'était jamais enregistré. Porté intégralement en local
dans `auth.js`, jamais importé depuis `index.html` (contrainte
d'indépendance : ce module ne doit jamais dépendre de l'ordre de
chargement d'`index.html`). Garde-fou record du monde appliqué à la
validation finale (`terminer()`), avant de résoudre la promesse — laisse
corriger sans quitter l'écran. `index.html` dérive `anneeNaissance`
depuis `dateNaissance` au retour de l'onboarding (même logique que
Réglages) — nécessaire depuis que l'onboarding résout `dateNaissance`
mais plus `anneeNaissance` directement.

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

**Écran dédié grand débutant (`/v2?onboarding=grand-debutant`)** — accès
direct au wizard (jours + Strava), sans passer par le dashboard ni le
choix course/forme. Bouton "Connecter Strava" avec mécanisme de retour
d'OAuth robuste : `history.replaceState()` + `window.location.reload()`
au retour du flow Strava (contournement d'un bug de rendu viewport en
TWA/PWA Android), avec un marqueur `sessionStorage` (survit au reload,
contrairement à un paramètre d'URL une fois nettoyé) retiré seulement une
fois le plan généré — évite de re-déclencher indéfiniment. Priorité
absolue sur toute autre redirection Strava (cf. §12, page Source de
données de l'onboarding) : un grand débutant ne doit jamais partir en
OAuth directement, seulement via cet écran.

## 14bis. Jour de course (`renderCourse`)

Écran dédié : météo, horaires, parcours, stratégie de course (cf. §7),
et résultat officiel une fois la course passée (`resultatCard`,
`DATE_COURSE_REFERENCE`).

**`resultatCard` — résultat enrichi (05/08/2026, demande de Laurent)** —
au-delà du temps chrono (`lk_race_result`, seul champ historique), le
formulaire propose désormais : ressenti (RPE, échelle réutilisée telle
quelle, cf. §9), commentaire libre, classement général (place/total) et
classement catégorie (place/total). Stockés dans `lk_race_result_details`
(cf. §5) — clé séparée, `lk_race_result` reste inchangée pour ne pas
casser les 4 usages existants qui en dépendent (bandeau dashboard, export
PDF, check `hasRes`). Le badge "record_battu" (cf. §16) reste déclenché
uniquement par la sauvegarde du temps chrono, indépendamment des champs
enrichis. Consultable a posteriori depuis la section "🏅 Mes courses" de
Stats (cf. §4/§5, tous plans confondus).

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
  synchrone, avant tout `await`** — même règle pour une simple variable
  `let` lue par une fonction hoisted appelable tôt dans l'exécution du
  script (cf. §3, `_renderDiffereTimer`), ou par tout code placé après le
  `await` mais AVANT la déclaration `let` elle-même si celle-ci se trouve
  plus loin dans le fichier (cf. §3/§11, relecture `stravaToken`).
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
  tout état précédent. Erreur déjà commise deux fois de suite le
  31/07/2026 (groupes accordéon, puis cartes de records) avant d'être
  généralisée en principe explicite.
- **Le positionnement initial d'un élément scrollable (roulette,
  carrousel...) construit dans un écran qui vient d'être affiché ne doit
  jamais dépendre d'un délai arbitraire** (`setTimeout`, même
  `requestAnimationFrame` double) — vérifier une condition réelle
  (élément attaché et visible) via polling léger. Un délai peut
  fonctionner au clic normal tout en échouant silencieusement au tout
  premier rendu d'un écran. **Cas particulier découvert le 01/08/2026** :
  un composant construit alors que son conteneur parent est dans un
  groupe accordéon FERMÉ peut voir sa condition de visibilité échouer
  indéfiniment (le conteneur n'est jamais visible pendant la fenêtre
  d'attente) et abandonner avant que l'utilisateur n'ouvre le groupe —
  l'élément n'est alors jamais construit du tout, pas seulement mal
  positionné. Tout composant de ce type niché dans un groupe accordéon
  doit prévoir un callback `onOuverture` qui le construit à la demande
  s'il n'existe pas encore, en plus de la tentative au chargement.
- **En cas de bug d'affichage résistant à plusieurs correctifs
  successifs, diagnostiquer par tests directs en console** (`getElementById`,
  `getBoundingClientRect()`, `querySelectorAll(...).length`,
  `document.body.contains(...)`, valeurs réelles des variables globales
  exposées) plutôt que par relecture répétée du code — plusieurs
  correctifs pertinents mais non prouvés ont été poussés avant qu'un
  diagnostic en direct ne confirme la vraie cause (01/08/2026,
  roulette de records invisible dans un groupe accordéon). **Même
  principe rappelé le 04/08/2026** sur le chantier "clignotement au
  chargement" (cf. §16) : plusieurs corrections structurellement
  correctes (thème, police, replaceChildren, defer, WebSocket non
  bloquant) ont été poussées sans confirmation visuelle préalable,
  avant qu'un test DevTools Performance + Screenshots (filmstrip) ne
  révèle la vraie nature du symptôme (page blanche prolongée, pas un
  double-rendu) — un outil de mesure réel (Network, Performance,
  Console) aurait dû être mobilisé dès le premier signalement plutôt
  qu'après plusieurs itérations de correctifs non concluants. **Rappel
  du 05/08/2026** : une hypothèse plausible mais non vérifiée
  (accusation portée à tort sur un cache CDN/navigateur) a fait perdre
  du temps sur le diagnostic d'un badge cassé — la vraie cause était une
  simple omission de code (`km_cumules` absent de `DEFINITIONS_BADGES`,
  ajouté partout ailleurs sauf à cet endroit précis), révélée seulement
  en relisant attentivement le fichier local plutôt qu'en cherchant une
  explication externe. Toujours épuiser l'hypothèse "erreur dans le code
  qu'on vient d'écrire" avant d'accuser un mécanisme externe (cache,
  déploiement, CDN).
- **Toute nouvelle table sensible (tokens, secrets) doit être ajoutée
  explicitement à la liste noire d'exclusion de `api/backup.js`
  (`TABLES_EXCLUES`)** — la découverte des tables y est automatique par
  défaut (liste noire, pas liste blanche), donc l'oubli expose la table
  par défaut plutôt que de la protéger par défaut.
- **Diagnostic des cascades ON DELETE (`beta-admin`, onglet Cascades) à
  lancer occasionnellement (ex. avant une mise en production), pas à
  chaque table ajoutée** — filet de rattrapage, pas remplacement de la
  vérification systématique au moment de créer une table.
- **Toute donnée binaire volumineuse (image, PDF converti) stockée dans
  `profilCoureur` doit être compressée côté client avant sauvegarde** —
  un fichier brut (photo téléphone plusieurs Mo, PDF non converti) fait
  exploser le payload JSONB envoyé par `sauvegarderProfilCoureur()`, qui
  échoue en fire-and-forget sans jamais remonter d'erreur ni bloquer
  l'écriture locale (le document semble "enregistré" en apparence mais
  n'atteint jamais Supabase). Cf. §4 pour l'implémentation retenue pour
  le PPS (image plafonnée 1600px, JPEG 0.82-0.85).
- **Le rendu PDF via `<iframe>`/`<embed>` sur un blob URL n'est pas
  fiable sur mobile/TWA Android** (pas de lecteur PDF intégré, contrairement
  à desktop) — pour tout document PDF destiné à un affichage in-app fiable
  cross-plateforme, convertir en image (canvas + pdf.js) plutôt que
  tenter un rendu PDF natif. Cf. §4.
- **Un nouveau flux (ex. connexion Strava depuis l'onboarding, avant tout
  plan) peut révéler un bug latent dans du code existant qui supposait
  silencieusement un contexte toujours présent** (ex. `PLAN[0]` sans
  vérifier que `PLAN` existe) — un changement de flux d'entrée mérite de
  vérifier les suppositions implicites du code qu'il traverse
  nouvellement, pas seulement le nouveau code lui-même. Cf. §11,
  `syncStrava()`.
- **Une contrainte de calcul ajoutée pour corriger un cas (ex. "la longue
  doit être ≥ cumul qualité") peut devenir la priorité DOMINANTE dans les
  cas serrés et écraser un autre besoin tout aussi légitime** (ici, un EF
  substantiel) si les deux ne sont pas équilibrés dès la conception —
  préférer un partage proportionnel garanti par construction (poids
  relatif) à une cascade de contraintes empiriques appliquées dans un
  ordre fixe. Cf. §7, `repartirVolumeSemaine`.
- **Une fonction utilitaire générique appelée par de nombreux points
  d'appel dans un même fichier (ex. `getLapsAffichage()`, 9+ appelants,
  ou `matchActivitiesToPlan()`, 3 chemins d'entrée) doit être corrigée
  UNE SEULE FOIS, à la source, plutôt que patchée individuellement à
  chaque site d'appel** — un correctif dispersé sur chaque appelant est
  fragile (facile d'en oublier un) et duplique la logique. Cf. §10,
  correctif `lapsSontDejaEffortSeul` ; cf. §7bis pour le même principe
  appliqué au correctif de distance d'effort dans le prédicteur.
- **Avant de croire qu'un mécanisme existe déjà dans le code (ex. une
  auto-ouverture, un callback), vérifier positivement sa présence
  (recherche du déclenchement réel) plutôt que de se fier à un
  commentaire qui décrit une intention** — un commentaire peut décrire
  un comportement jamais complètement implémenté, ou retiré depuis sans
  mise à jour du commentaire. Cf. §4/§10, mécanisme d'auto-ouverture du
  popover ✏️, dont le déclenchement réel n'existait pas malgré un
  commentaire l'affirmant. **Cas similaire rencontré le 04/08/2026** :
  un commentaire affirmant que `VERSIONS[0].ver` était utilisée dans le
  header du dashboard (`dashHeaderEl`) s'est révélé faux à la
  vérification — seule `renderSettings()`/`buildVersionSection()` l'utilise
  réellement, ce qui a évité à tort d'écarter un changement (`defer` sur
  `changelog.classic.js`) qui semblait risqué sur la base de ce
  commentaire seul. **Cas similaire rencontré le 06/08/2026** : la
  refonte carte "Aujourd'hui" (26/07/2026) était notée comme "conçue,
  pas encore codée" en mémoire de session, alors qu'une vérification
  directe du code d'`index.html` a confirmé qu'elle était intégralement
  livrée le jour même de sa conception — l'inventaire et le changelog
  n'en gardaient simplement pas trace explicite. Une mémoire de session
  qui affirme un statut "non codé" doit être revérifiée sur le code réel
  avant d'être répétée, surtout après plusieurs jours.
- **Avant de conclure qu'un enchaînement de `<script src>` bloquants est
  sûr à paralléliser (`defer`), vérifier explicitement tout script INLINE
  placé entre eux et leur premier point de consommation réelle** — `defer`
  change l'ordre d'exécution relatif entre les scripts `src` qui le
  portent et tout script inline classique placé après eux dans le
  document (un script inline s'exécute toujours immédiatement au
  parsing, jamais différé, contrairement aux scripts `src` avec `defer`)
  — un simple grep d'usage direct du global exporté ne suffit pas à
  écarter ce risque, il faut vérifier l'ordre relatif réel. Cf. §16,
  chantier clignotement au chargement (script `type="module"` non
  concerné, déjà différé nativement par la spec).
- **Tout point qui pose ou retire un statut de séance, ou une saisie de
  performance, doit être audité contre la liste complète des effets de
  bord attendus (cumul km, recalcul d'estimation)** — un nouveau point
  d'écriture de `statuses[uid]`/`manualPerf[uid]` (ex. le test
  semi-Cooper, une fonctionnalité indépendante des flux habituels) est
  facile à oublier lors d'un audit ciblé sur "les points connus" plutôt
  que sur "toute occurrence du motif d'écriture" — un `grep` exhaustif
  du motif d'écriture reste plus fiable qu'une liste mentale de points
  déjà identifiés. Cf. §5/§7bis/§9, chantier badge km cumulés + fix
  estimation du 05/08/2026.

## 16. État des chantiers ouverts

| Chantier | Statut |
|---|---|
| Import `.fit` avec détail par répétition (détection sans marqueurs natifs, protection des activités importées, icône ✏️ unifiée) | ✅ Codé, poussé et testé en conditions réelles le 03/08/2026. Détail en §4/§9/§10 et `docs/v2-methodologie/import-fit-intervalles.md`. |
| Refonte carte "Aujourd'hui" (rien à ouvrir, icônes conditionnelles, bloc "Réalisé" dépliable, stylo coloré) | ✅ Conçue et livrée le 26/07/2026, absence de trace dans ce tableau corrigée le 06/08/2026 après vérification directe du code. Détail complet en §4. |
| Vraie météo à l'heure de la séance (jamais 18h fixe) | ✅ Livrée le 24/07/2026, absence de trace dans ce tableau corrigée le 06/08/2026. `handleHistorical` accepte `hour`, `timezone` transmis dynamiquement depuis le navigateur. Détail complet en §11. |
| Contextualiser le verdict "❌ À risque" (projection au jour J, Stats) | ✅ Livrée le 26/07/2026, absence de trace dans ce tableau corrigée le 06/08/2026. Écart chiffré + message contextuel sous le verdict, purement informatif. Détail en §7bis. Piste alternative (repondérer les phases Spécifique/Affûtage dans le calcul lui-même) reste non conçue en détail — chantier de conception séparé si besoin un jour. |
| Simuler changement de jours d'entraînement (wizard, accordéon "Modifier mon plan") | ✅ Conçue et livrée le 26/07/2026, absence de trace dans ce tableau corrigée le 06/08/2026. 2e levier de l'accordéon, simulation live via `Engine.nbQualiteFor()`. Détail complet en §3. |
| Système de badges (récompenses) | ✅ Livré, extrait dans `badges.js` le 31/07/2026. 15 badges en 4 catégories (dont "Km cumulés", ajouté le 05/08/2026, cf. ligne dédiée ci-dessous), consultables depuis Stats (`renderBadges()`) — jamais rien en permanence sur le dashboard, seul un bandeau ponctuel dismissible. Badges à paliers (record historique jamais perdu si la série casse) : séances validées d'affilée, semaines complètes d'affilée, FC EF/LONGUE maîtrisée d'affilée, semaines parfaites (badge CUMULÉ, pas une série), km cumulés (idem, cumulé). Badges événementiels : nouvelle estimation, record battu, test semi-Cooper, repos écouté, semaine équilibrée, premier plan, mi-parcours, entrée Affûtage, course terminée, retour réussi. Stockage `badges_debloques` (best-effort), cache `window.__badgesCache__`. **Corrections du 02/08/2026** (signalées par Laurent) : (1) libellés de palier ambigus reformulés avec un verbe d'action explicite ; (2) légende "série active / record X" retirée pour `semaine_parfaite` (badge cumulé) ; (3) badge `record_battu` déplacé vers le seul déclencheur légitime (validation d'un résultat de course, cf. `resultatCard`) ; (4) recalcul forcé au clic sur "Mes badges", plus de cache indéfini. |
| **Badge "Km cumulés" (nouveau, 05/08/2026)** | ✅ Codé et poussé. 7 paliers (50/100/250/500/1000/1500/2000 km), catégorie progression. Cumul TOTAL tous plans confondus (pas seulement le plan actif), sur toute séance validée ✅/⚠️/❌ — décision explicite de Laurent d'inclure ❌ (une séance ratée/non conforme a quand même été courue). Alimenté par `profilCoureur.kmCumulesTotal` (cf. §6), ajusté de façon idempotente à chaque changement de statut via `recalculerKmComptesPourUid()` (cf. §5, registre `lk_km_comptes_par_uid`). **6 points d'écriture de statut audités et corrigés** pour appeler ce recalcul : clic manuel (`renderStatusRow`), saisie manuelle Enregistrer/Annuler, suppression d'une activité, auto-validation en masse après synchro (le chemin le plus fréquent), choix d'activité ambiguë, test semi-Cooper. Rattrapage de l'historique déjà validé avant ce chantier : script ponctuel fourni une fois à Laurent (non versionné dans le repo), à relancer si besoin (idempotent, recalcule depuis zéro à chaque exécution). |
| **Résultat de course enrichi + section "Mes courses" (nouveau, 05/08/2026)** | ✅ Codé et poussé. `resultatCard` (jour de course) accepte désormais ressenti (RPE), commentaire, classement général et classement catégorie (place/total chacun) — stockés dans `lk_race_result_details` (cf. §5/§14bis), séparée de `lk_race_result` pour zéro impact sur les usages existants. Nouvelle fonction `chargerResultatsCoursesSupabase()` (`sync-storage.js`, cf. §5) pour lire ces résultats sur tous les plans du compte. Nouveau groupe accordéon "🏅 Mes courses" dans Stats (cf. §4), chargement asynchrone à la première ouverture. |
| **Détail des intervalles réussi/raté en saisie manuelle (nouveau, 05/08/2026)** | ✅ Codé et poussé. Pour toute séance avec `structureIntervalles`, grille de boutons ✓/✕ par répétition dans le formulaire de saisie manuelle — cf. §4/§9. Volontairement réussi/raté seul (pas d'allure par intervalle). N'entre pas dans le calcul du prédicteur. |
| **Fix estimation 10K faussée par la durée totale saisie manuellement (05/08/2026)** | ✅ Corrigé. `weightedAvgByEffortDuration()` (`predictor.js`) utilisait la distance TOTALE de la séance manuelle (échauffement/récup compris) au lieu de la distance d'effort seul pour calculer le poids d'une séance dans l'estimation — modifier la durée d'échauffement saisie faisait bouger l'estimation, sans rapport avec la performance réelle. Corrigé en utilisant systématiquement `distanceEffortStructure()` (avec repli sur l'allure saisie si le plan n'a pas d'allure de bloc prédéfinie, cf. §7). Détail complet en §7bis. |
| **Fix "premier arrivé" hors saisie manuelle — estimation figée après retrait/ajout automatique d'un statut qualité (05/08/2026)** | ✅ Corrigé. `rebuildPredHistory()` n'était appelée qu'au clic manuel de statut et à la saisie manuelle — pas à l'auto-validation en masse après synchro Strava/FIT (le chemin le plus fréquent), ni au choix d'activité ambiguë, ni à la suppression d'une activité. Une séance SEUIL/VMA/SPEC auto-validée sans clic manuel restait invisible pour l'estimation affichée. 3 points corrigés, cf. §7bis. |
| Permettre de changer la date de course d'un plan actif | ✅ Livré. 4e levier de l'accordéon "Modifier mon plan" (cf. §3), régénération complète avec règles de phase. Cycle de décharge peut se désynchroniser légèrement après un changement de date — limite mineure acceptée. Non testé en conditions réelles au-delà des cas simulés. |
| Réorganiser Réglages/Stats/Course en sections repliables + améliorer les roulettes de saisie | ✅ Livré le 31/07/2026. Détail complet en §4 (Réglages, Stats, Course, records personnels) et §3 (roulettes du wizard). |
| Sauvegarde/réinjection de données (plan Supabase Free, aucune sauvegarde automatique incluse) | ✅ Codé et testé en conditions réelles le 01/08/2026 (`api/backup.js` + onglet Sauvegarde de `beta-admin`), détail complet en §5. |
| Onboarding refondu en 4 puis 5 pages avec profil complet | ✅ Livré et testé en conditions réelles. Détail complet en §12. Page 5 (Source de données, 02/08/2026) ajoutée le même jour que le PPS dans l'onboarding — cf. lignes suivantes. |
| Diagnostic des tables applicatives sans `ON DELETE CASCADE` vers `auth.users` | ✅ Codé et lancé en conditions réelles le 01/08/2026. Détail complet en §5. |
| Pass Prévention Santé (PPS) — import/affichage/suppression centralisés | ✅ Codé, poussé et testé en conditions réelles le 02/08/2026. Détail complet en §4/§6. Bouton "🩺 PPS" toujours visible dans le header, modale unique (import + aperçu + suppression), PDF converti en image dès l'import (pdf.js, corrige un rendu non fiable sur mobile/TWA — confirmé en test réel). Extraction automatique de la date d'expiration tentée puis retirée (non fiable en pratique) — saisie manuelle reste le repli normal. |
| Intégrer la collecte du PPS à l'onboarding | ✅ Livré le 02/08/2026 — module d'import compact intégré à la page 2 ("Ta forme"), remplace l'ancien champ texte `pps`. |
| Demander la source de collecte des données (Strava/manuel) à l'onboarding | ✅ Livré le 02/08/2026 — nouvelle page 5, cf. §12. Explication de la nécessité de programmer les intervalles sur la montre pour Strava. A révélé et corrigé un bug latent dans `syncStrava()` (absence de gestion du cas "aucun plan encore créé", cf. §11). |
| Levier Volume (accordéon "Modifier mon plan") sans effet réel | ✅ Corrigé le 02/08/2026 — `semaineDepartVolume` transmis à `generatePlan()`, la progression démarre réellement à la semaine charnière. Détail complet en §3/§7. |
| EF trop courts par rapport à la sortie longue (répartition du volume hebdo) | ✅ Corrigé le 02/08/2026 — nouveau système de partage par poids relatif (`POIDS_LONGUE=1.6`) dans `repartirVolumeSemaine()`. Détail complet en §7. Cas 2 jours/semaine (longue potentiellement excessive à fort volume) traité par un warning informatif, pas un plafond dur — Laurent : "certains coureurs n'ont pas la possibilité de courir autant de jours par semaine". |
| Signal de déconnexion Strava peu visible (uniquement dans Réglages) | ✅ Corrigé le 02/08/2026 — bandeau sur le dashboard, cf. §4. Couvre les deux cas de déconnexion (token invalide ET token absent). |
| Refondre l'aide en tutos d'action par fonctionnalité | ✅ Livré le 04/08/2026 — section "Tutos par action" en tuiles, sélecteur d'onglets Aide/Tutos, 16 tutos rédigés couvrant Démarrer/Au quotidien/Gérer son plan/Suivi/Compte. Détail complet en §4. Reste ouvert : aucune image intégrée pour l'instant (Laurent prévoit de fournir des captures au fil de l'eau, le format le supporte déjà). |
| Couleur manquante pour le type de séance TEST dans la mini-frise semaine + crayon affiché en double dans le popover de saisie | ✅ Corrigés le 04/08/2026, dans la même session que le chantier Aide ci-dessus. Détail en §4. |
| Clignotement de l'écran au chargement de l'app | 🔶 Investigation approfondie menée le 04/08/2026, PARTIELLEMENT résolue — plusieurs correctifs structurellement corrects ont été appliqués (remplacement atomique du DOM via `replaceChildren` au lieu d'un `innerHTML=""` prématuré, regroupement des rendus automatiques différés via `renderDiffere()`, connexion WebSocket Realtime non-bloquante, chargement `defer` de 9 scripts classic bloquants, correction d'une balise `<meta name="theme-color">` invalide), mais Laurent rapporte que le clignotement persiste après chacun d'eux. Un test DevTools Performance + Screenshots (filmstrip) a confirmé la vraie nature du symptôme : une page BLANCHE réelle d'environ 750ms à 1.85s avant le premier affichage (pas un double-rendu répété comme supposé initialement) — probablement causée par un enchaînement structurel d'au moins 2-3 allers-retours réseau séquentiels et nécessaires vers Supabase (`getUser()` → `migrerDonneesExistantes()` → `precharger()`) avant que la donnée ne soit prête pour le premier rendu, chacun avec sa propre latence de connexion. Écarté comme non concluant : différer l'écriture concurrente de `migrerDonneesExistantes()`/`precharger()` (ordre nécessaire, la seconde lit ce que la première vient d'écrire). Piste non engagée par prudence : afficher un premier rendu depuis le cache localStorage local avant confirmation serveur, avec re-render silencieux une fois confirmé — chantier plus large sur un flux d'authentification déjà marqué par plusieurs bugs sensibles, nécessiterait une session dédiée avec validation explicite avant de s'y engager. |
| **Bug "semaineDepartVolume résiduel" — EF/longue à 0km, y compris semaine en cours (06/08/2026)** | ✅ Corrigé et poussé. `semaineDepartVolume` (levier Volume) ne pollue plus jamais `paramsOrigine` — retiré avant toute sauvegarde dans les 4 leviers + le bouton "Analyser et adapter". Nouveau champ `plan.volumeCourant: {km, semaineNum}` (séparé de `paramsOrigine`) préserve la dernière intention réelle de volume, lu en priorité par toute régénération complète future. Réparation rétroactive ajoutée dans `index.html` (détection directe du symptôme EF/longue à 0km, jamais de la cause supposée) pour les plans déjà cassés avant ce correctif — protège les semaines strictement passées (jamais réécrites), répare semaine en cours et futures. Détail complet en §3. |
| **Recalibration de `VOLUME_MIN_PAR_JOURS` par niveau (06/08/2026)** | ✅ Codé et poussé. Table 3D `[distance][niveau][jours]` par simulation exhaustive du moteur réel, monotone sur 4 axes, marge de confort 15% au-dessus du plancher structurel réel. Détail complet en §7. |
| **Centraliser sur le dashboard le signal `analyserAdaptations()`** | ✅ Déjà livré (vérifié le 06/08/2026 directement sur le code réel, l'état "PARTIELLEMENT comblé" précédemment noté ici était périmé). `adaptationEl` (`index.html`) est une vraie carte UI Appliquer/Ignorer, même pattern que `moteurDecisionEl` (RunnerStateCalculator) : bouton Appliquer → `appliquerAdaptations()`, bouton Ignorer → persistance par semaine (`lk_adaptations_ignorees`). Garde-fou anti-collision déjà en place : si `moteurDecisionEl` (physio, prioritaire) cible la même semaine le même jour, `adaptationEl` se tait sur cette semaine plutôt que de proposer une action concurrente — collision journalisée dans `signalements` (`type: 'collision_moteur'`) pour observer si ça arrive réellement en usage réel. **Décision actée le 06/08/2026** : les deux cartes restent séparées (jamais fusionnées) — l'ordre d'affichage (`adaptationEl` avant `moteurDecisionEl` dans le DOM) permet aux deux d'apparaître simultanément l'une sous l'autre si elles ciblent des semaines différentes le même jour, ce qui reste un doublon visuel possible mais non résolu activement : **suivi passif** via la table `signalements`, fusion reconsidérée seulement si les collisions s'avèrent fréquentes en pratique. |
| **Unifier les saisies manuelles avec le format Strava/FIT (`stravaActivities`)** | 🔶 Discuté avec Laurent le 05/08/2026, PAS engagé — jugé techniquement possible mais structurellement plus lourd qu'un ajustement ponctuel. Points à trancher avant de coder : représentation de l'absence de laps réels (piste retenue à discuter : un lap synthétique unique couvrant toute la distance/durée saisie, cohérent avec le détail réussi/raté par intervalle ajouté le même jour, cf. ligne ci-dessus) ; principe actuel de priorité manuelle (`getStravaRunSiPasManuel` retourne `null` si une saisie manuelle existe) à repenser en un tableau unifié avec un marqueur de priorité, répercuté sur plusieurs dizaines de points d'usage de `stravaActivities.find(...)` ; indexation différente (`manualPerf` par `uid` de séance, `stravaActivities` par date) ; portée de persistance différente (`manualPerf` préfixé par plan, `stravaActivities` global au compte). Nécessiterait une session dédiée avec audit exhaustif des points d'usage avant tout codage. |

Pour l'historique des versions livrées et des correctifs, voir
`changelog.classic.js`. Pour le détail méthodologique des séances, voir
`bibliotheque-seances.md`. Pour le détail de la conception et de
l'implémentation de l'import FIT, voir `import-fit-intervalles.md`.
