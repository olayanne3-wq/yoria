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

### 3.1 Principe de détection

Segmentation du flux `record` (timestamp, speed, hr) par repérage de plateaux de vitesse
stable séparés par des ruptures nettes (delta de vitesse au-dessus d'un seuil, sur une
fenêtre de quelques secondes). Validé manuellement sur un cas réel : rupture détectable en
1 à 2 secondes, delta de l'ordre de 1:20 à 1:30/km entre effort et récupération sur
l'exemple testé.

La FC sert de **signal de confirmation**, pas de détection primaire — une rupture de
vitesse accompagnée d'une montée de FC cohérente renforce la confiance dans le
découpage, cohérent avec le principe déjà appliqué ailleurs dans le moteur de décision
(RPE comme repli, jamais comme source primaire quand une mesure objective existe).

### 3.2 Cas limites identifiés (non résolus à ce stade, à traiter à l'implémentation)

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

### 3.3 Calibration des seuils

Aucun seuil numérique n'est arrêté à ce stade. À calibrer sur plusieurs séances réelles
de Laurent (montre Amazfit Cheetah, plusieurs types de séances qualité — VMA courte,
seuil, spécifique — pas uniquement le cas 3×6min déjà testé), avant tout codage définitif.
Cohérent avec le principe de validation empirique déjà appliqué ailleurs dans le projet
(ex. `POIDS_LONGUE` calibré par simulation exhaustive avant adoption).

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

Besoin identifié pour la phase de calibration (section 3.3) : pouvoir supprimer le
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

### 7.2 Méthode de calibration des seuils (tranché)

Même principe que la validation empirique déjà appliquée ailleurs dans le projet (cf. §15
principes transverses, "validation historique avant codage") — appliqué ici à ce nouveau
chantier plutôt qu'inventé spécifiquement :

- Constituer un jeu de séances réelles couvrant plusieurs profils de contraste
  effort/récup, pas seulement le cas déjà testé (3×6min, contraste net ~1:20-1:30/km) :
  VMA courte (30-30, contraste fort), seuil long (contraste modéré), spécifique (contraste
  le plus faible, allure proche de l'allure course — cas le plus difficile à détecter).
- Comparer pour chaque séance le résultat de la détection automatique à la réalité connue
  (vérité terrain, comme Laurent sait ce qu'il a réellement couru) — même logique de
  comparaison "résultat généré vs attendu" que `scripts/test-plans-varies.js` pour la
  génération de plans.
- Ajuster durée minimum de plateau et delta de vitesse minimum sur ce jeu de cas avant
  tout codage définitif des seuils — pas de valeur figée à ce stade.

### 7.3 Désaccord nombre de blocs détectés ≠ nombre attendu (tranché — Option A)

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
  prévoir un repli GPX/TCX pour les cas où l'export FIT natif n'est pas disponible,
  non conçu à ce stade.
- Poids relatif du fichier brut stocké en Storage vs conservation uniquement du résultat
  structuré si le volume d'usage devait un jour poser un vrai problème de coût
  (aujourd'hui non pertinent, cf. section 4.1) — à réévaluer seulement si le contexte
  d'usage change significativement (au-delà d'un usage solo/bêta).
