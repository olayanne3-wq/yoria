# Import de fichiers .fit bruts et reconstruction d'intervalles — Yoria

Document de conception du chantier permettant à un utilisateur sans Strava (ou avec une
montre non programmée en "entraînement structuré") d'importer directement le fichier
`.fit` de sa montre pour que Yoria analyse le détail d'une séance qualité — prolongement
direct de `source-donnees-seances.md` (option `montre`/`gpx` du réglage `dataSource`,
posée le 13/07/2026 mais non implémentée). Discussion tenue le 02/08/2026, pas encore
codé.

---

## 1. Constat de départ

Deux limites distinctes aujourd'hui, documentées séparément dans l'inventaire et dans
`source-donnees-seances.md` :

- **Strava seul, sans montre programmée en "entraînement structuré"**, ne permet pas
  d'analyser le détail d'une séance qualité (cf. inventaire §12, page 5 de l'onboarding) —
  `getLapsAffichage()` (`session-analysis.js`) suppose des `activity.laps` déjà segmentés
  par la montre (un lap distinct par phase effort/récup/récup-longue). Sans cette
  segmentation native, aucun découpage n'est possible côté Strava.
- **La saisie manuelle** (`source-donnees-seances.md`, format "lap virtuel" unique par
  séance) est volontairement simplifiée — un seul couple allure/FC pour toute la séance,
  sans détail par répétition. Suffisant pour valider une séance et alimenter le
  prédicteur, mais ne permet aucune analyse de répétitions (`analyserRepetitions`,
  Module 2 du moteur de décision reste hors périmètre pour ce cas).

**Test réalisé le 02/08/2026** sur un fichier `.fit` réel (montre Amazfit Cheetah,
export Zepp, séance 3×6min) : le fichier contient un flux `record` seconde par seconde
(timestamp, `speed`, `heart_rate`, `cadence`, position), malgré des `lap` fixes tous les
1km sans rapport avec la structure réelle de la séance (déjà documenté comme limite
connue des fichiers Amazfit/Zepp, cf. inventaire §10). Une détection par rupture de
vitesse sur ce flux brut a permis de reconstruire les 3 blocs de 6 minutes avec une
précision à la seconde près sur les timestamps de début/fin, et des allures moyennes par
bloc cohérentes avec deux méthodes de calcul indépendantes (moyenne des vitesses
instantanées vs distance/durée).

**Conclusion : il est possible d'obtenir, à partir d'un fichier `.fit` brut sans montre
programmée en structuré, un niveau de détail par répétition comparable à ce que Strava
fournit nativement pour une montre bien programmée** — à condition de reconstruire les
intervalles nous-mêmes plutôt que de s'appuyer sur les `laps` du fichier.

---

## 2. Principe retenu : produire une sortie compatible avec le pipeline existant

**Décision de conception centrale** : ne pas créer de nouvelle logique de comparaison
séance prévue/réalisée. `DecisionEngineSessionAnalysis.analyser()` (Module 2 du moteur
de décision) est déjà agnostique de la source — il attend un objet `seanceRealisee` avec
`allureMoyenneSec`, `fcMoyenne`, `lapsEffort` (tableau de `{allureSec}`), sans jamais
référencer Strava directement.

Le nouveau module d'import FIT doit donc se limiter à produire, à partir du flux brut,
une sortie **shape-compatible avec ce que `getLapsAffichage()` retourne aujourd'hui pour
Strava** : un tableau de "laps" au format `{average_speed, average_heartrate, distance}`
— mêmes clés qu'un lap Strava natif. Tout le reste du pipeline en aval (isolement des
laps d'effort, calcul des moyennes pondérées, comparaison aux cibles `SESSION_TARGETS`,
scoring `SessionAnalyzer`) reste inchangé et réutilisé tel quel.

**Conséquence directe** : pas de nouveau format de "résultat d'analyse" à stocker. Comme
pour Strava (qui ne persiste aucun résultat d'analyse — tout est recalculé à la volée à
chaque affichage à partir de `stravaActivities` en cache), le résultat de la détection FIT
peut suivre le même principe : une structure d'activité en cache, retraitée à la demande.

---

## 3. Détection des intervalles — principe et limites

### 3.0 Découverte majeure (03/08/2026) : détection de marqueurs natifs en amont

**Avant toute détection par reconnaissance de signal, le module doit vérifier si le
fichier `.fit` contient déjà des marqueurs structurés exploitables.** Le format FIT
supporte nativement les workouts structurés (messages `workout`/`workout_step`, et un
champ `lap_trigger` qui peut valoir autre chose que `'distance'` — ex. `'manual'` ou un
trigger lié à un segment programmé). Quand ces marqueurs sont présents, les vraies bornes
de chaque répétition sont connues avec certitude (posées par la montre elle-même en temps
réel), sans avoir besoin de la détection par signal.

**Constat empirique (calibration du 03/08/2026)** : un fichier `.fit` exporté depuis Zepp
(montre Amazfit Cheetah), pour une séance **confirmée programmée en entraînement
structuré sur la montre**, ne contient **aucun marqueur structuré exploitable** —
`lap_trigger: 'distance'` sur tous les laps (laps fixes tous les 1000m, comme documenté
ailleurs pour cette marque), `type: 'manual'` sur l'activité, aucun message `workout_step`,
aucun champ développeur lié à un programme d'entraînement (vérifié : les champs
développeur présents concernent des métriques de course — SpO2, Leg Spring Stiffness,
Form Power — rien lié à la structure de la séance). La montre a bien exécuté le programme
(pilotage en temps réel, bips/affichage des phases), mais **cette information n'est pas
écrite dans le fichier `.fit` exportable** — limite de l'implémentation Zepp/Amazfit à
l'export, pas une contrainte du format FIT lui-même.

**Hypothèse à vérifier plus tard, non confirmée à ce stade** : Garmin et Coros, dont
l'export FIT natif est déjà documenté comme fiable pour l'usage Strava existant (cf.
inventaire §10-§12, "programmer les intervalles sur la montre" fonctionne avec Strava
pour ces marques), produisent très probablement des fichiers `.fit` avec de vrais
marqueurs structurés — cohérent avec le fait que Strava parvient à segmenter précisément
ces activités (`getLapsAffichage()`, laps distincts par phase). Pas testé directement
faute d'un fichier `.fit` Garmin/Coros réel disponible à ce stade.

**Conséquence pour la conception** : le module d'import FIT doit suivre une logique en
deux temps, pas une détection par signal systématique :
1. **Vérifier la présence de marqueurs structurés natifs** (`lap_trigger` ≠ `'distance'`,
   messages `workout_step` présents). Si présents : découpage direct et fiable, pas de
   détection heuristique nécessaire — précision équivalente à ce que Strava obtient
   aujourd'hui pour une montre bien programmée.
2. **Repli sur la détection par reconnaissance de signal** (section 3.1 et suivantes) si
   aucun marqueur natif n'est exploitable — cas déjà rencontré et calibré pour Zepp/
   Amazfit dans cette phase de test.

---

### 3.1 Principe de détection (repli sans marqueurs natifs)

Segmentation du flux `record` (timestamp, speed, hr) par repérage de plateaux de vitesse
stable séparés par des ruptures nettes (delta de vitesse au-dessus d'un seuil, sur une
fenêtre de quelques secondes). Validé manuellement sur un cas réel : rupture détectable en
1 à 2 secondes, delta de l'ordre de 1:20 à 1:30/km entre effort et récupération sur
l'exemple testé.

La FC sert de **signal de confirmation**, pas de détection primaire — une rupture de
vitesse accompagnée d'une montée de FC cohérente renforce la confiance dans le
découpage, cohérent avec le principe déjà appliqué ailleurs dans le moteur de décision
(RPE comme repli, jamais comme source primaire quand une mesure objective existe).

### 3.2 Résultats de calibration sur séances réelles (03/08/2026)

Trois séances réelles (montre Amazfit Cheetah, export Zepp, sans marqueurs structurés
natifs — cf. section 3.0) comparées au détail affiché par Yoria/Strava pour la même
séance (montre programmée en entraînement structuré côté Strava, donc laps natifs
fiables côté Strava — référence "vérité terrain" pour cette comparaison) :

| Séance | Répétitions attendues | Répétitions détectées | Précision allure | Précision FC |
|---|---|---|---|---|
| Seuil 3×6min (test 1) | 3 | 3/3 ✓ | non comparé à Strava | — |
| Seuil 3×6min (test 2) | 3 | 3/3 ✓ | **±1-2s** | **±0-1 bpm** |
| VMA 30-30 (test 1, séance propre) | 5 | 5/5 ✓ | ±5-9s | ±1-2 bpm |
| VMA 30-30 (test 2, séance irrégulière) | 6 | 6/6 ✓ (une répétition faible détectée après ajustement manuel du seuil) | ±10-15s (max observé) | ±0-3 bpm |

**Constat principal : le nombre de répétitions détecté est fiable dans tous les cas
testés** (5/5 dans un cas simple, 6/6 dans un cas où une répétition était nettement plus
faible que les autres et n'a été retrouvée qu'après ajustement manuel du seuil de
détection — cf. section 3.3 ci-dessous pour la limite associée). C'est le signal le plus
important pour `SessionAnalyzer` (`analyserRepetitions`, poids 0.35 dans le score de
réussite, cf. section 2).

**Constat secondaire : la précision de l'allure moyenne par répétition individuelle a une
limite structurelle sur les efforts courts.** Six méthodes de découpage des bornes ont été
testées sur le cas VMA irrégulier (bloc complet, 60% central, ≥95% du pic de vitesse local,
fenêtre fixe centrée sur le pic, fenêtre régulière recalée sur un rythme de 60s supposé
constant, point d'accélération maximale comme référence de départ) — **aucune n'a réduit
l'écart de façon cohérente sur l'ensemble des répétitions d'une même séance**, chacune
améliorant certaines répétitions et en dégradant d'autres. Une tentative de recalcul de la
vitesse depuis les positions GPS brutes (formule haversine point à point) plutôt que le
champ `speed` déjà lissé par la montre a même donné un résultat **moins bon** (bruit GPS
amplifié sur des pas de temps aussi courts). Conclusion retenue : cet écart ne vient
probablement pas d'un mauvais découpage de notre part, mais d'un traitement propriétaire
appliqué par Strava en interne (lissage ou recalcul non documenté publiquement) qu'on ne
peut pas répliquer à l'identique sans accès à sa méthode exacte.

**Décision actée** : accepter une marge d'erreur structurelle plus large sur l'allure
moyenne des répétitions courtes (VMA 30-30 et similaire, efforts ≤ ~40s) — de l'ordre de
±10-15s au pire cas observé — plutôt que de continuer à chercher une correction
algorithmique. Sur les efforts longs (seuil, 6min), la précision observée est largement
meilleure (±1-2s), cohérente avec un bruit GPS de nature à peu près constante en valeur
absolue, donc proportionnellement plus faible sur une durée longue. Ne pas fermer la porte
à une amélioration future si une meilleure méthode est identifiée, mais ne plus la
considérer comme un prérequis bloquant pour une première version fonctionnelle.

### 3.3 Cas limites identifiés (non résolus à ce stade, à traiter à l'implémentation)

- **Récupération trop courte pour laisser la vitesse redescendre franchement** : risque
  de fusion de deux répétitions distinctes en un seul bloc détecté. Nécessite un seuil de
  durée minimum de plateau + delta minimum, à calibrer sur plusieurs séances réelles —
  pas seulement le cas testé (3×6min, récups ~1min25-1min30, marge large).
- **Intervalle raté au point de ne plus se distinguer de la récupération** (allure très
  proche de l'allure de récup) : angle mort réel de cette méthode, contrairement à un
  marqueur structurel natif (Garmin/Coros en mode structuré) qui saurait toujours qu'un
  intervalle a été lancé même complètement manqué. Dans ce cas, le nombre de blocs
  détectés peut être inférieur au nombre attendu par le plan, sans que le système puisse
  trancher seul entre "séance incomplète" et "intervalle dégradé au point d'être
  invisible dans le signal".
- **Ambiguïté nombre détecté ≠ nombre attendu** : à traiter comme une incertitude
  affichée plutôt qu'un résultat tranché à tort — cohérent avec le principe déjà en place
  côté Strava (`obtenirActivitesAmbigues`, jamais de validation automatique en cas
  d'ambiguïté, choix laissé au coureur).

### 3.4 Calibration des seuils — état d'avancement

Calibration en cours sur plusieurs séances réelles (montre Amazfit Cheetah, cf. section
3.2 pour les résultats détaillés). Couvert à ce stade : seuil 3×6min (2 séances), VMA
30-30 (2 séances, dont une irrégulière). Encore à couvrir : allure spécifique/allure
course (contraste effort/récup le plus faible, cas le plus à risque, pas encore testé
faute de séance disponible), VMA plus longue type i-3min (position intermédiaire entre
30-30 et seuil). Cohérent avec le principe de validation empirique déjà appliqué ailleurs
dans le projet (ex. `POIDS_LONGUE` calibré par simulation exhaustive avant adoption).

---

## 4. Stockage

### 4.1 Fichier brut

Le fichier `.fit` original (ou son équivalent JSON `records`) est conservé en **Supabase
Storage** — décision actée le 02/08/2026, coût négligeable au vu de l'usage actuel
(fichier typique ~30-60 Ko compressé natif, largement sous la limite du plan Free même à
grande échelle). Objectif : permettre un **re-parsing rétroactif** si l'algorithme de
détection évolue, sans redemander l'upload à l'utilisateur — même philosophie que
`PREDICTOR_VERSION`/`rebuildPredHistorySequentielle()` pour le prédicteur 10K.

### 4.2 Résultat structuré

Pas de nouvelle table dédiée à un "résultat d'analyse" persistant — suit le principe déjà
en place pour Strava (recalcul à la volée). Le résultat de la détection (tableau de
"laps" reconstruits) est mis en cache côté client, de façon symétrique à `stravaActivities`,
pour être consommé par le même pipeline (`getLapsAffichage`-like) → `SessionAnalyzer`.

### 4.3 Convention de clé

`seanceId` reste le `uid` de séance existant (`${week}-${i}`), comme pour Strava et la
saisie manuelle. Le matching séance prévue / fichier importé se fait par **date**
(cohérent avec `matchActivitiesToPlan()`), pas par un identifiant d'activité — l'upload
d'un `.fit` doit donc préciser ou déduire la date de la séance concernée.

---

## 5. Suppression / réimport (outillage de test)

Besoin identifié pour la phase de calibration (section 3.4) : pouvoir supprimer le
résultat d'une analyse FIT déjà importée et relancer l'analyse sur le même fichier, sans
redemander l'upload à chaque itération.

**Décision** : geste de suppression explicite (pas un écrasement silencieux au réupload),
cohérent avec le principe déjà en place pour les statuts de séance (§9 inventaire —
"une séance ne peut plus être supprimée du plan, seul un statut la caractérise" ; ici,
c'est le résultat d'analyse FIT qui doit pouvoir être retiré explicitement, jamais le plan
ni le statut lui-même).

**Outil temporaire prévu pour la phase de test** : bouton "Réanalyser" (suppression du
résultat existant + relance de la détection sur le fichier `.fit` déjà stocké en Storage,
sans re-upload) — à retirer ou à conditionner (ex. réservé à un compte de test) une fois
les seuils de détection stabilisés. Ne pas confondre avec une fonctionnalité utilisateur
finale.

---

## 6. Principe transverse : pas de hiérarchie entre sources

Suit explicitement le principe déjà tranché dans `source-donnees-seances.md` (section 2) :
aucune décote, aucune hiérarchie automatique, aucune détection d'écart anormal
déclenchant une confirmation forcée. Un fichier `.fit` importé manuellement a le même
poids qu'une activité Strava ou qu'une saisie manuelle dans le prédicteur 10K et le
moteur de décision — seule la qualité du détail disponible diffère (potentiellement plus
riche que Strava sans montre structurée, plus riche que la saisie manuelle dans tous les
cas).

---

## 7. Décisions actées le 02/08/2026 (discussion complémentaire)

### 7.1 Parsing côté client (tranché)

Parsing et détection des intervalles se font **côté client (JS navigateur)**, pas via une
fonction API serverless dédiée. Décision motivée par :
- Cohérence avec `chargerFitParser()`, déjà utilisé côté client pour le calcul de vitesse
  fiable (cf. §10 inventaire) — même pattern, pas un nouveau silo technique.
- Alignement avec l'esprit du reste du moteur (prédicteur 10K, moteur de décision), déjà
  entièrement calculé côté client.
- Coût nul côté serveur, latence immédiate (pas d'aller-retour réseau pour le fichier).

**Limite acceptée** : pas de point de contrôle centralisé pour le re-parsing en masse (si
l'algo de détection évolue, chaque relecture doit se faire depuis le client, fichier par
fichier — cf. section 4.1, fichier brut conservé en Storage précisément pour permettre ce
re-parsing ultérieur). Si un vrai besoin de traitement en lot apparaît plus tard (ex. outil
admin `beta-admin`), réévaluer un déplacement partiel vers une fonction serverless à ce
moment — pas anticipé maintenant.

### 7.2 Méthode de calibration des seuils (tranché — méthode ; résultats en section 3.2)

Même principe que la validation empirique déjà appliquée ailleurs dans le projet (cf. §15
principes transverses, "validation historique avant codage") — appliqué ici à ce nouveau
chantier plutôt qu'inventé spécifiquement : constituer un jeu de séances réelles couvrant
plusieurs profils de contraste effort/récup (VMA courte, seuil long, spécifique — le plus
difficile), comparer chaque résultat de détection à la réalité connue (vérité terrain, même
logique de comparaison "résultat généré vs attendu" que `scripts/test-plans-varies.js`),
ajuster les paramètres de détection sur ce jeu de cas avant tout codage définitif. Premiers
résultats concrets et enseignements en section 3.2 et 3.4.

### 7.3 Stockage du brut (confirmé)

Confirmation de la décision de la section 4.1 : le fichier `.fit` brut est conservé en
Supabase Storage, pas seulement le résultat structuré — coût négligeable à l'usage actuel
(solo/bêta), permet le re-parsing rétroactif si l'algorithme de détection évolue après la
phase de calibration (section 7.2). Pas de retour en arrière envisagé sur ce point.

### 7.4 Désaccord nombre de blocs détectés ≠ nombre attendu (tranché — Option A)

**Décision : aucun traitement spécifique ajouté.** Le pipeline existant
(`analyserRepetitions()`, Module 2 du moteur de décision) gère déjà nativement ce cas —
le score de réussite se base sur `lapsEffort.length` réellement détecté comparé à
`targetReps`, avec un message explicite déjà prévu si les deux diffèrent
(`"(X/Y répétitions détectées)"`). Un nombre de blocs détecté inférieur au nombre attendu
fait mécaniquement baisser `tauxReussite`/`repRatio`, ce qui correspond à l'interprétation
la plus probable dans ce cas (abandon en cours de séance) — sans qu'il soit nécessaire de
distinguer explicitement "abandon réel" de "intervalle raté indétectable dans le signal"
(cf. section 3.2, angle mort accepté de la méthode de détection).

Aucun signalement d'incertitude supplémentaire n'est ajouté à ce stade (option B envisagée
puis écartée pour l'instant) — à reconsidérer seulement si l'usage réel montre que cette
ambiguïté pose un vrai problème de confiance pour l'utilisateur, pas par anticipation.

---

## 8. Points encore ouverts

- Export FIT non uniforme selon les marques de montre (Garmin/Coros : direct et simple ;
  Polar : nécessite une conversion JSON→FIT ; Suunto : fiabilité variable selon modèle) —
  repli GPX/TCX mis de côté pour l'instant (décision du 02/08/2026), à reprendre plus tard.
