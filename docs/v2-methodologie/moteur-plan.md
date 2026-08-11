# Moteur de plan — Yoria

> Génération et adaptation des plans d'entraînement, prédicteur
> d'estimation 10K. Renvoie vers `inventaire-application.md` pour la
> vue d'ensemble et les principes transverses.

## Moteur de plan (`v2/engine/plan-generator.js`)

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
aussi pour le badge "km cumulés" (cf. `persistance-donnees.md`) — pose une entrée
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

## Prédicteur d'estimation 10K (`v2/engine/predictor.js`)

Module ES dédié — fonctions pures, aucune ne mute directement l'état
global ni n'appelle Supabase (sauf `predict10K()` qui mute `predHistory`
EN PLACE et déclenche sa sauvegarde via `saveFn`, reçu en paramètre).
Distinct des 5 modules du moteur de décision (`moteur-decision.md`) mais lit les mêmes
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
priorité quand ils existent (cf. `architecture-generale.md`/`persistance-donnees.md`) : traité EXACTEMENT comme des
laps Strava normaux, chaque lap `_reussi:false` (répétition ratée) est
exclu du calcul de vitesse pondérée. Si tous les laps d'une séance sont
ratés, la séance est ignorée pour l'estimation. Repli complet sur l'ancien
"lap virtuel unique agrégé" pour toute saisie manuelle antérieure à ce
champ (sans `.laps`), qui utilise `distanceEffortStructureFn` (distance
d'effort seul, cf. ci-dessus) plutôt que `manualPerf[uid].distance` (distance
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

