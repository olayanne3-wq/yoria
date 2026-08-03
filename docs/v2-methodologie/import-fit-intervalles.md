# Import de fichiers .fit bruts et reconstruction d'intervalles — Yoria

Permet à un utilisateur sans Strava (ou avec une montre non programmée en "entraînement
structuré") d'importer directement le fichier `.fit` de sa montre pour que Yoria analyse
le détail d'une séance qualité. Codé et déployé le 03/08/2026.

---

## 1. Contexte

Deux limites préexistantes :
- **Strava sans montre structurée** ne permet pas d'analyser le détail d'une séance
  qualité — `getLapsAffichage()` suppose des `activity.laps` déjà segmentés par la montre.
- **La saisie manuelle** ne fournit qu'un couple allure/FC global par séance, sans détail
  par répétition (hors périmètre de `analyserRepetitions`, Module 2 du moteur).

De nombreuses montres (Amazfit/Zepp, Suunto confirmés) n'écrivent aucun marqueur de
segment structuré dans le fichier `.fit` exporté, même pour une séance programmée en
entraînement structuré sur la montre — `lap_trigger: 'distance'` partout (laps fixes tous
les 1000m), aucun message `workout_step`. La montre exécute bien le programme (bips,
phases affichées) mais cette info n'est pas écrite dans le fichier exportable. Garmin/
Coros produisent probablement de vrais marqueurs (cohérent avec le fonctionnement Strava
déjà établi pour ces marques) — non testé directement.

Le fichier `.fit` contient en revanche un flux `record` seconde par seconde (speed,
heart_rate, cadence) exploitable pour reconstruire les répétitions par reconnaissance de
signal.

---

## 2. Principe : sortie compatible avec le pipeline existant

`DecisionEngineSessionAnalysis.analyser()` (Module 2) est agnostique de la source — il
attend `seanceRealisee` (`allureMoyenneSec`, `fcMoyenne`, `lapsEffort: [{allureSec}]`),
sans jamais référencer Strava. Le module FIT produit donc une sortie shape-compatible
avec un lap Strava natif (`average_speed`, `average_heartrate`, `distance`), pour
traverser le pipeline existant (`getLapsAffichage()` → `SessionAnalyzer`) sans nouvelle
logique de comparaison.

---

## 3. Détection des marqueurs natifs (préalable)

Avant toute détection par signal, `possedeMarqueursNatifs(lapsFit)` vérifie si le fichier
contient déjà des marqueurs structurés (`lap_trigger` ≠ `'distance'`, hors
`'session_end'` sur le dernier lap qui est normal et sans rapport). Si présents : laps
traduits directement (précision native, comme pour Strava). Sinon : repli sur
`fit-detection.js` (section 4).

---

## 4. Détection par signal — `public/v2/engine/fit-detection.js`

**Principe** : segments continus où la vitesse lissée reste au-dessus d'un seuil, avec
tolérance de courtes chutes (bruit GPS ou vrai ralentissement bref) sans interrompre le
segment. Une détection par pics locaux, testée d'abord, échoue sur les plateaux longs et
plats (un seul point de maximum local par plateau, pas toute la zone).

Deux profils de paramètres selon `structureAttendue.dureeEffortSec` (connu du plan avant
lecture du fichier) — un seul jeu unique ne convient pas aux deux régimes :

| Profil | Seuil vitesse | Tolérance creux | Durée min bloc |
|---|---|---|---|
| VMA courte (≤90s) | 3.5 m/s | 4s | 10s |
| Seuil long / défaut | 3.05 m/s | 10s | 20s |

La FC sert de confirmation, jamais de détection primaire.

### Calibration (4 séances réelles, montre Amazfit Cheetah, comparées à Strava natif)

| Séance | Reps attendues | Reps détectées | Précision allure | Précision FC |
|---|---|---|---|---|
| Seuil 3×6min (test 1) | 3 | 3/3 ✓ | non comparé | — |
| Seuil 3×6min (test 2) | 3 | 3/3 ✓ | **±1-2s** | **±0-1 bpm** |
| VMA 30-30 (propre) | 5 | 5/5 ✓ | ±5-9s | ±1-2 bpm |
| VMA 30-30 (irrégulière) | 6 | 6/6 ✓ | ±10-15s max | ±0-3 bpm |

**Nombre de répétitions** : fiable dans tous les cas testés — signal le plus important
pour `SessionAnalyzer` (poids 0.35).

**Précision de l'allure par répétition** : limite structurelle sur les efforts courts.
Six méthodes de découpage de bornes testées (bloc complet, 60% central, ≥95% du pic,
fenêtre centrée, fenêtre régulière 60s, point d'accélération max) sans amélioration
cohérente ; recalcul depuis GPS brut (haversine) encore pire (bruit amplifié). Écart
probablement dû à un traitement propriétaire Strava non réplicable. **Accepté comme
limite** : ±1-2s sur efforts longs, jusqu'à ±10-15s sur efforts courts (≤40s) — pas
bloquant pour cette version.

### Cas limites non résolus
- Récup trop courte → risque de fusion de deux répétitions. Investigué le 03/08/2026 :
  une tolérance dérivée de la récup prescrite (`dureeRecupSec`) a été testée puis
  retirée — aucune valeur du moteur (`plan-generator.js`) n'est jamais sous 30s, et les
  récups réellement observées dans les séances de calibration restent ≥20s, largement
  au-dessus de la tolérance actuelle (4s). Pas de signe concret de ce problème dans les
  données disponibles — à recalibrer si un vrai cas est un jour rencontré (nouvelle
  séance à récup courte, ou coureur qui récupère plus vite que prescrit), pas par
  anticipation.
- Intervalle raté au point de ne plus se distinguer de la récup → indétectable, angle
  mort de la méthode (contrairement à un marqueur natif).
- Nombre détecté ≠ attendu : traité nativement par `analyserRepetitions()` en aval (le
  score baisse mécaniquement), aucun traitement spécifique ajouté — cohérent avec
  `obtenirActivitesAmbigues` côté Strava (pas de tranchage automatique en cas
  d'ambiguïté).

### Non couvert
Allure spécifique/allure course (contraste effort/récup le plus faible, cas le plus à
risque) et VMA longue type i-3min — pas de séance réelle disponible pour tester à ce
stade.

---

## 5. Intégration dans `index.html`

`adapterFitVersFormatActivite()` (asynchrone) bascule vers `fit-detection.js` (chargé à
la demande via `chargerFitDetection()`, même pattern que `chargerFitParser()`) quand
`possedeMarqueursNatifs()` est faux, avec `structureAttendue` dérivée de
`ALL_SESSIONS.find(s => s.date === dateActivite)` (date en heure locale, jamais
`toISOString()`).

`construireLapsDepuisFit()` retourne uniquement des laps d'EFFORT (jamais de récup entre
eux). `getLapsAffichage()` (`session-analysis.js`) fait avancer un curseur dans
`activity.laps` en supposant une alternance effort/récup native — désynchronisé avec des
laps effort-seuls (2 répétitions retrouvées sur 6 réellement détectées en test réel).
Corrigé une seule fois, dans le wrapper `getLapsAffichage()` d'`index.html` (pas dans
chacun de ses 9+ appelants) : un flag `lapsSontDejaEffortSeul`, posé par
`adapterFitVersFormatActivite()`, fait retourner `activity.laps` tel quel.

**Dépendance `buffer` non polyfillée** — `fit-file-parser@3.0.2` déclare une vraie
dépendance npm vers `buffer` (`dist/binary.js` : `import { Buffer } from 'buffer'`), non
résolue par le fichier ESM brut servi par jsDelivr, bloquant tout import FIT (natif comme
détecté) avec *"Failed to resolve module specifier 'buffer'"*. Seul usage réel :
`Buffer.from(temp).toString('utf-8')` — remplacé par `TextDecoder` natif via une **import
map** en tête du `<head>` d'`index.html`, avant le premier `<script type="module">`
(contrainte : une import map doit être présente dans le DOM avant tout script module).

---

## 6. Stockage

**Pas de stockage du fichier `.fit` brut** — `sync-storage.js` n'utilise aucun mécanisme
Storage dans le projet ; en introduire un pour ce cas d'usage encore expérimental a été
jugé prématuré. Le résultat de la détection (tableau de laps) est injecté directement
dans `stravaActivities` (`_source: "fit"` comme marqueur), suit le même mécanisme de sync
que Strava — pas de nouvelle table.

**Conséquence** : pas de re-parsing rétroactif si l'algorithme évolue — réimport
nécessaire (après suppression explicite de l'activité existante).

`seanceId` = `uid` de séance existant, matching par date (cohérent avec
`matchActivitiesToPlan()`).

---

## 7. Protection des activités importées — "premier arrivé, reste"

La première activité importée sur une date (Strava, FIT, ou future source) reste en
place — aucune resynchronisation ne peut l'écraser silencieusement. Seule une
suppression manuelle explicite libère la date.

- `syncStrava()` : merge au lieu d'écrasement total (`stravaActivities = runs`) — seules
  les nouvelles activités Strava sur des dates encore libres sont ajoutées.
- `importerFichierFit()` : bloque l'import (message explicite) si une activité existe
  déjà à la date visée, quelle que soit sa source.
- Badge de source (📁 FIT / 🟠 Strava) + bouton 🗑️ Supprimer dans la carte de séance
  (`renderBlocRealise()`) — la suppression retire aussi `statuses[uid]` pour éviter un
  badge orphelin.

**Effet de bord assumé** : une activité Strava corrigée a posteriori sur Strava.com n'est
plus jamais re-synchronisée tant que l'ancienne n'est pas supprimée manuellement (décision
explicite : en cas de modification, supprimer et réimporter).

Aucune hiérarchie entre sources — un fichier `.fit` a le même poids qu'une activité
Strava ou une saisie manuelle dans le prédicteur 10K et le moteur de décision.

---

## 8. Ergonomie — icône ✏️ unifiée

Bouton d'import FIT et saisie manuelle regroupés dans un seul popover
(`renderIconeSaisieManuelle()`), positionné dans le header de la carte de séance, juste
avant le badge de statut — visible avant ET après validation, identique sur la carte
"Aujourd'hui" et le détail Semaine.

**Auto-ouverture du popover** (jamais du sous-formulaire de saisie) après un clic manuel
sur ✅/⚠️/❌, uniquement si aucune activité Strava/FIT n'existe déjà — jamais sur une
validation automatique via synchro. Implémenté via une variable transitoire de scope
module (`uidAOuvrirPopoverSaisie`, non persistée), nécessaire car `render()` reconstruit
le DOM après le clic (délai de 2.5s sur ✅/⚠️).

---

## 9. Points ouverts

- Repli GPX/TCX pour montres sans export FIT fiable (Polar : conversion JSON→FIT
  nécessaire ; Suunto : fiabilité variable) — mis de côté.
- Calibration sur allure spécifique/allure course — pas de séance réelle disponible.
- Cas limites de la section 4 (récup trop courte, intervalle raté indétectable) — non
  résolus, acceptés comme limite de la méthode.
- Re-parsing rétroactif impossible sans fichier brut stocké — à reconsidérer si besoin de
  recalibration en masse.

Module livré : `public/v2/engine/fit-detection.js`, test associé
`public/v2/engine/test-fit-detection.mjs` (Node, pattern des autres `test-*.mjs`).
