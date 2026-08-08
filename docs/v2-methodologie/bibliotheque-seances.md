# Bibliothèque de séances — Yoria

Document de référence méthodologique. Sert de base au moteur de génération de plans, décliné par distance (5K / 10K / Semi / Marathon) et par phase (Construction / Spécifique / Affûtage).

> **Note de terminologie** : "Affûtage" désigne la réduction finale de volume avant course (le "taper" au sens strict), pas la phase de développement du seuil qui la précède. La phase intermédiaire — volume encore soutenu, intensité spécifique à la course — est nommée "Spécifique".

---

## 1. Principes transversaux (toutes distances)

Ces règles s'appliquent quel que soit le profil et alimentent les garde-fous du moteur.

- **Zones d'allure (méthode Daniels/VDOT)** — 6 zones dérivées d'une performance récente :
  - **Récup (Récupération)** : en dessous de E, pour les jours qui suivent un effort très intense (test allure, course) — plus lent que l'EF habituelle, jamais chronométré comme un objectif
  - **E (Endurance fondamentale)** : 59-74% VDOT, conversationnel, 70-80% du volume hebdo
  - **C (Allure course objectif)** : allure spécifique à la distance visée — zone à part entière, toujours renseignée quelle que soit la distance (pas seulement pour le marathon, contrairement au "M" d'origine chez Daniels)
  - **T (Seuil/Tempo)** : 83-88% VDOT, "confortablement difficile", efforts continus de 20-40 min ou fractionné cruise
  - **I (Intervalle/VMA)** : 95-100% VDOT, répétitions de 3-5 min, développe la VO2max
  - **V (Vitesse)** : >100% VDOT, répétitions courtes (200-400m) récupération complète, vitesse pure et économie de course, pas de charge aérobie — nommée "Vitesse" plutôt que "Répétition" (terme Daniels d'origine) pour éviter toute confusion avec "répétitions" qui désigne déjà, dans l'app, le nombre de fractions d'une séance (ex. "6 répétitions de 400m")
- **Règle des 10%** : ne pas augmenter le volume hebdomadaire de plus de 10% d'une semaine à l'autre, sauf lors des semaines de décharge.
- **Répartition 80/20** : environ 80% du volume en endurance fondamentale, 20% en qualité (seuil/VMA/répétition).
- **Semaines de décharge** : tous les 3-4 semaines, réduction de volume pour permettre l'assimilation — à ne pas confondre avec du surentraînement raté.
- **Affûtage (taper)** : réduction de volume en conservant un peu d'intensité, pour arriver frais le jour J. La durée et la profondeur dépendent de la distance (voir sections 2 et 4bis).

## 2. Structure par distance

### 5K — dominante VMA / vitesse

| Phase | Contenu dominant |
|---|---|
| Construction | Base aérobie, côtes courtes (renforcement musculaire, "strong before long"), intervalles légers à faible fatigue, sortie longue 60-90 min en EF |
| Spécifique | Intervalles VO2max (400m à l'allure 5K ou plus rapide, fractionné 30/30, répétitions 3-5 min), tempo runs 20-30 min pour relever le seuil |
| Affûtage | Réduction de volume, répétitions courtes et rapides (allure mile) pour rester affûté, simulation de course — environ 1 semaine |

### 10K — dominante seuil

| Phase | Contenu dominant |
|---|---|
| Construction | Base aérobie, sortie longue modérée (60-90 min), premiers tempo runs courts |
| Spécifique | Fractionné VMA (1000m), tempo runs à l'allure 10K, cruise intervals |
| Affûtage | Réduction progressive du volume, dernières séances de rappel à allure course — environ 10 jours |

### Semi-marathon — dominante seuil + endurance spécifique

| Phase | Contenu dominant |
|---|---|
| Construction | Montée de volume 10-15%/semaine, sortie longue progressive, une séance qualité légère (tempo court ou fartlek) |
| Spécifique (première partie) | Tempo runs plus longs, fractionné VMA, sortie longue avec segments à allure semi |
| Spécifique (fin de phase, pic de volume) | Volume hebdo maximal, sortie longue au plus haut (18-19 km), pratique de l'allure course |
| Affûtage | Réduction de volume, quelques séances qualité raccourcies — environ 1-2 semaines |

### Marathon — dominante fondamentale + sorties longues

| Phase | Contenu dominant |
|---|---|
| Construction | Construction de l'habitude, tout en aérobie, sortie longue progressive |
| Spécifique (première partie) | Développement du seuil, sortie longue avec segments à allure marathon, volume hebdo qui grimpe |
| Spécifique (fin de phase, pic de volume) | Sortie longue au maximum (28-32 km, jusqu'à 32-35 km pour profils confirmés — ne pas dépasser ~35 km, le gain n'en vaut pas le risque), plus haut volume hebdo |
| Affûtage (~2-3 semaines) | Semaine -3 : réduction 20-25%. Semaine -2 : réduction 40-50%. Semaine de course : réduction 60-70% avec un dernier tempo court |

**Plafonds de volume hebdo au pic, par distance et par niveau** (indicatifs, ajustés au profil réel — voir section 6 pour le mécanisme qui empêche un plafond de descendre sous le volume déjà couru) :

| Niveau | 5K | 10K | Semi | Marathon |
|---|---|---|---|---|
| Débutant | ~20-25 km | ~25-35 km | ~35-45 km | ~35-40 km |
| Intermédiaire | ~25-35 km | ~35-50 km | ~45-60 km | ~45-55 km |
| Confirmé | ~35-45 km | ~50-65 km | ~60-80 km | ~55-70+ km |

La progression logique (5K < 10K < Semi < Marathon, à niveau égal) sert de repère de cohérence : si le moteur calcule un plafond qui casse cet ordre pour un même profil, c'est le signe d'une erreur de calcul en amont — garde-fou interne, jamais visible utilisateur.

## 3. Ce que ça implique pour le moteur

- La bibliothèque de séances est indexée par **distance × phase × niveau**, pas juste par phase.
- Les **paces Récup/E/C/T/I/V** se calculent une fois pour toutes à partir du temps de référence (VDOT ou Riegel), puis s'appliquent à n'importe quel type de séance de la bibliothèque — module de calcul transversal, pas répété par distance.
- Le **taper** a une durée variable selon la distance (~1 semaine pour 5K, ~10 jours pour 10K, 1-2 semaines pour semi, 2-3 semaines pour marathon) — paramètre dérivé de la distance choisie, pas une durée fixe. Cette phase s'appelle **Affûtage** ; la phase intermédiaire à volume soutenu s'appelle **Spécifique**.
- Les **volumes hebdo indicatifs par niveau** donnent une base pour les garde-fous — utiles pour détecter un objectif ou une charge irréaliste.

## 4. Priorité des séances selon le nombre de créneaux disponibles

Le nombre de séances/semaine choisi dans le wizard (2 à 7) détermine *quelles* séances de la bibliothèque sont retenues, pas juste leur durée. Trois niveaux de priorité :

**Niveau 1 — indispensable (présent même à 2 séances/semaine)**
- 1 séance qualité spécifique à la distance et à la phase en cours
- 1 sortie longue (sauf 5K, où elle est moins critique et peut être remplacée par une EF un peu plus longue que d'habitude)

**Niveau 2 — ajouté à partir de 3-4 séances/semaine**
- 1 EF de récupération/liaison entre les séances clés
- 2e séance qualité à partir de 5 séances/semaine, réservée aux profils intermédiaire/confirmé (un débutant à 5 séances gagne plus à ajouter du volume facile qu'à doubler l'intensité — cf. section 5 pour la règle complète de placement)

**Niveau 3 — ajouté à partir de 5-6+ séances/semaine**
- EF supplémentaires pour augmenter le volume total en douceur
- Fractionnement de la séance qualité en deux séances plus courtes plutôt qu'une seule longue

**Renforcement musculaire — option indépendante, pas liée au nombre de séances**
Réducteur de risque de blessure documenté, mais tout le monde n'a pas envie ou le temps d'en faire. Choix explicite du coureur (case dans le wizard), activable/désactivable à tout moment depuis Réglages. Si activé, le moteur l'insère sur le **jour de repos** (lendemain de la sortie longue), pas accolé à une séance qualité — le renforcement combiné à la récupération a plus de sens que d'ajouter de la fatigue un jour d'intensité.

**Règle de dégradation** : quand le nombre de séances diminue, on retire toujours en partant du niveau le plus haut (niveau 3 en premier), jamais la sortie longue ni la séance qualité — ce sont les deux séances qui "portent" la progression.

## 4bis. Durée variable du plan — répartition proportionnelle des phases

La durée se calcule entre date de début et date de course. Les repères de la section 2 sont relatifs ("première partie", "fin de phase") plutôt que numérotés par semaine fixe. Le moteur calcule les bornes réelles de chaque phase à partir de la durée du plan, avec une règle importante :

**L'Affûtage n'est pas proportionnel.** Sa durée dépend de la distance (physiologie de récupération), pas de la longueur totale du plan (cf. section 2 pour les durées par distance).

**Construction et Spécifique se partagent le temps restant**, selon un ratio qui dépend du niveau :

| Niveau | Construction | Spécifique |
|---|---|---|
| Débutant | ~55% du temps restant | ~45% |
| Intermédiaire | ~40% | ~60% |
| Confirmé | ~30% | ~70% |

**Ajustement selon l'ampleur du gain visé**, en plus du niveau. Catégorisation à partir de l'écart relatif entre temps de référence et objectif :

| Ampleur du gain | Écart | Ajustement du ratio Construction |
|---|---|---|
| Faible | < 5% | +15% vers Construction |
| Modérée | 5-10% | Aucun ajustement — ratio de base par niveau |
| Ambitieuse | > 10% | −5% vers Construction (plus de temps en Spécifique) |

Le plafond de volume visé s'ajuste aussi pour un objectif faible : viser le plafond de population (section 2) n'a pas de sens si le coureur est déjà proche de sa forme cible — le plafond effectif devient `min(plafond population, volume de départ × 1,20)`. Sans cet ajustement, le garde-fou "écart volume/plafond trop grand" se déclenche en faux positif.

**Garde-fou de durée minimale** : si (durée totale − affûtage) est inférieur à ~3 semaines, le plan n'a pas assez de temps pour une vraie Construction + Spécifique. Le moteur alerte l'utilisateur plutôt que de générer un plan dégradé silencieusement.

**Cas des plans très longs** (20+ semaines) : au-delà d'un certain point, ajouter des semaines de Construction supplémentaires n'apporte plus grand-chose sans varier le contenu — un palier de base aérobie pure avant même la Construction serait alors pertinent (cf. sources : 8-12 semaines de base avant un plan marathon pour un vrai débutant), plutôt que d'étirer artificiellement les phases existantes. Piste non implémentée.

## 5. Placement des séances dans la semaine

Logique en deux temps :

**1. Placer les ancres fixes d'abord**
- Sortie longue → un jour de week-end (Samedi/Dimanche en priorité)
- Séance(s) qualité → au moins 48h d'écart avec la sortie longue et entre elles si il y en a deux
- Renforcement (si activé) → jour de repos, typiquement le lendemain de la sortie longue

**2. Remplir les jours restants avec de l'EF**
- Jamais deux séances dures consécutives — au moins une EF ou repos entre qualité et sortie longue
- Veille et lendemain de la sortie longue → jamais de séance qualité, uniquement EF ou repos
- Répartir les EF plutôt que les regrouper, pour étaler la charge sur la semaine

**Nombre de séances qualité selon le nombre total de séances et le niveau :**

| Nb séances | Répartition |
|---|---|
| 2 | Qualité + Longue |
| 3 | Qualité + EF (liaison) + Longue |
| 4 | Qualité + EF + EF + Longue |
| 5 | 2 Qualité + EF + EF + Longue *(intermédiaire/confirmé)* — ou Qualité + EF ×3 + Longue *(débutant, plus prudent)* |
| 6+ | 2 Qualité + EF ×3 + Longue (+ renforcement si activé) |

**Distance circulaire** : la semaine est traitée comme un cycle, pas une ligne — Dimanche et Lundi sont à 1 jour d'écart, pas 6. S'applique à l'espacement des séances qualité entre elles, à l'écart avec la longue, et au garde-fou des 48h de récupération (bouclage fin de semaine → début de la semaine suivante inclus).

**Cas limite** : si les jours cochés dans le wizard sont "collés" (ex. Lun/Mar/Mer), l'algorithme ne peut pas respecter l'écart de 48h — il place quand même en dernier recours, avec un avertissement explicite plutôt qu'un blocage.

## 6. Progression du volume semaine par semaine

**Volume de départ** : demandé explicitement dans le wizard (km/semaine actuels), pré-rempli automatiquement à partir de la **médiane des 8 dernières semaines** d'activités Strava si le compte est connecté et dispose d'un historique suffisant — sinon saisie manuelle. La médiane sur une fenêtre large évite qu'une période d'affûtage ou de coupure récente ne fausse l'estimation à la baisse (ou une semaine de pic de course à la hausse). Corrigeable par l'utilisateur dans tous les cas.

**Progression** :
- Augmentation maximale de 10% du volume hebdomadaire d'une semaine à l'autre, appliquée à partir du volume de départ déclaré. La décharge (creux temporaire, tous les 3-4 semaines) ne remet pas à zéro le niveau atteint — la progression reprend depuis le pic précédent, pas depuis la valeur réduite de la décharge.
- Semaine de décharge toutes les 3-4 semaines : réduction de 20-30% du volume de la semaine précédente.
- Le volume cible en fin de phase Spécifique (juste avant l'Affûtage, le **pic** — pas la dernière semaine du plan qui est en Affûtage réduit) sert de référence — dérivé des repères par distance et par niveau donnés en section 2.
- **Le plafond ne descend jamais sous le volume de départ réel** (`plafond = max(plafond de population/ampleur, volumeDepart)`). Si quelqu'un court déjà à un volume supérieur aux repères habituels pour son profil, aucune raison méthodologique de le faire régresser — le plafond est relevé en conséquence.

**Garde-fous** : si le volume de départ déclaré est déjà proche ou au-dessus du plafond visé, la marge de progression est faible — signalé plutôt que forcer une hausse artificielle. À l'inverse, si l'écart entre volume de départ et plafond est trop grand pour la durée du plan (même en respectant la règle des 10%), c'est un signal de plan trop court ou d'objectif trop ambitieux (ne s'applique pas si l'ampleur de l'objectif est "faible", cf. section 4bis).

## 7. Modulation par contraintes

Le champ "Contraintes" du wizard module le plan généré. Ce ne sont pas des règles médicales, l'app ne diagnostique rien — elle adapte la prudence et renvoie vers un avis professionnel quand c'est pertinent.

**Blessure en cours ou récente**
- Progression du volume ralentie : 5-8%/semaine au lieu de 10%, pendant les 2-3 premières semaines du plan
- Aucune séance V (Vitesse) ni I (VMA) pendant cette période — EF et Seuil léger uniquement
- Plafond de volume visé réduit d'environ 10-15% par rapport au repère standard du profil
- Message systématique recommandant un avis professionnel avant de reprendre l'intensité

**Douleur ou fragilité chronique**
- Cap à 1 seule séance qualité/semaine, même si la règle normale (niveau + nb séances, section 5) en autoriserait 2
- Pas de séance V — le travail Seuil est préféré, moins impactant à volume de qualité égal
- **Cas particulier du 5K** : la bibliothèque 5K repose largement sur le V en Spécifique et Affûtage — retirer le V sans compensation viderait le plan de sa spécificité. Repli : remplacer par du travail **I (VMA)** un peu plus soutenu que la normale (répétitions un peu plus longues, allure I haute plutôt que basse), pour garder un stimulus de vitesse sans le risque d'impact répété du V

**Reprise après une longue pause**
Le wizard demande la durée approximative de la pause, ce qui dimensionne la réacclimatation :

| Durée de la pause | Réacclimatation avant Construction |
|---|---|
| 2-4 semaines | Pas de phase dédiée — juste une reprise de volume plus prudente dès la Construction |
| 1-3 mois | 1 semaine d'EF uniquement, pas de qualité |
| 3-6 mois | 2 semaines d'EF uniquement |
| 6 mois ou plus | 3-4 semaines d'EF uniquement, plus proche d'une reconstruction de base que d'une réacclimatation — le garde-fou de durée minimale (section 4bis) en tient compte si le plan est court |

Cette contrainte désactive aussi la **pré-estimation Strava du volume de départ** au-delà de la tranche "2-4 semaines" : une médiane sur 8 semaines capterait en partie l'activité d'avant la pause et surestimerait le point de départ réel. Bascule automatique en saisie manuelle plutôt que de proposer une valeur biaisée.

**Cumul de contraintes** : si plusieurs cases sont cochées, les modulations les plus prudentes s'appliquent — pas d'addition des réductions, c'est la règle la plus stricte des deux qui prime.

## 8. Profil coureur vs paramètres du plan

Distinction structurante pour le schéma de données : tout ce que le wizard collecte n'a pas la même durée de vie.

**Profil coureur — persistant, modifiable depuis Réglages, pré-rempli dans le wizard**
- Niveau (débutant / intermédiaire / confirmé)
- Âge ou date de naissance — sert à calculer une zone FC par défaut (formule de Tanaka, 208 − 0,7×âge) en complément des zones d'allure Récup/E/C/T/I/V
- Jours disponibles habituels
- Préférence renforcement musculaire (inclus ou non)
- Contraintes chroniques (douleur/fragilité récurrente — distinct d'une blessure ponctuelle)

**Paramètres du plan — redemandés (ou pré-remplis puis validés) à chaque nouvelle course**
- Distance visée
- Temps de référence (spécifique à la distance choisie)
- Objectif
- Date de début et date de course
- Volume actuel (recalculé à chaque génération via la médiane Strava, jamais mémorisé tel quel — il évolue en permanence)
- Contraintes ponctuelles (blessure en cours/récente, reprise après pause — propres au moment de la génération, pas au coureur en général)

**Flux attendu** : première utilisation → le wizard crée à la fois le Profil et le premier Plan. Plans suivants → le wizard ne redemande que les paramètres du plan, avec les champs du Profil déjà pré-remplis et modifiables si besoin.

## 9. Schéma de données JSON

Trois niveaux d'objets, cohérents avec la distinction Profil/Plan de la section 8.

### Profil coureur (persistant)

```json
{
  "profilId": "coureur-001",
  "niveau": "intermediaire",
  "anneeNaissance": 1990,
  "joursDisponiblesHabituels": ["mardi", "jeudi", "samedi"],
  "renforcementMusculaire": false,
  "contraintesChroniques": []
}
```

### Plan (une génération, référence un profil)

```json
{
  "planId": "plan-exemple",
  "profilId": "coureur-001",
  "distance": "10K",
  "tempsReference": { "duree": "50:21", "source": "manuel" },
  "objectif": "48:30",
  "dateDebut": "2026-06-21",
  "dateCourse": "2026-09-06",
  "dureeSemaines": 11,
  "volumeActuel": { "kmParSemaine": 32, "source": "strava_mediane_8sem" },
  "contraintesPonctuelles": [],
  "phases": [
    { "nom": "Construction", "semaines": [1,2,3,4], "ratioNiveau": 0.4 },
    { "nom": "Specifique",   "semaines": [5,6,7,8,9,10], "ratioNiveau": 0.6 },
    { "nom": "Affutage",     "semaines": [11], "dureeFixe": true }
  ],
  "allures": {
    "recup": "> 6:40/km",
    "E": "6:00-6:20/km",
    "C": "4:51/km",
    "T": "4:45/km",
    "I": "4:20/km",
    "V": "4:00/km"
  },
  "zoneFC": { "methode": "tanaka", "fcMax": 155 }
}
```

### Semaine + Séance (le contenu généré)

```json
{
  "semaineNum": 6,
  "phase": "Specifique",
  "volumeCibleKm": 38,
  "estDechargeSemaine": false,
  "seances": [
    {
      "jour": "mardi",
      "type": "qualite",
      "sousType": "seuil",
      "structure": "3x8min @ T, récup 2min",
      "renfoAccole": false,
      "warnings": []
    },
    {
      "jour": "jeudi",
      "type": "ef",
      "structure": "45min EF",
      "warnings": []
    },
    {
      "jour": "samedi",
      "type": "longue",
      "structure": "80min EF, 15min @ M en fin",
      "warnings": []
    }
  ]
}
```

**Points d'attention** :
- `warnings` est un tableau vide par défaut, peuplé par les garde-fous — ne jamais faire échouer la génération, toujours produire un plan avec ses avertissements attachés
- `phases[].ratioNiveau` et `dureeFixe` reflètent la règle de la section 4bis (Affûtage fixe, reste proportionnel au niveau)
- `contraintesPonctuelles` et `contraintesChroniques` sont séparées entre Plan et Profil, cohérent avec la section 8
- `volumeActuel.source` trace explicitement d'où vient la valeur — utile pour ne jamais perdre la traçabilité d'une estimation biaisée

## 10. Checklist consolidée des garde-fous

Principe commun : **un garde-fou avertit, il ne bloque jamais silencieusement la génération** — le plan sort toujours, avec ses avertissements attachés (`warnings[]`, section 9).

| # | Garde-fou | Où il se déclenche | Comportement attendu |
|---|---|---|---|
| 1 | Objectif irréaliste | Étape Objectif du wizard, dès que temps de référence + objectif + durée sont connus | Message de faisabilité en direct (✅/⚠️), avant même de lancer la génération |
| 2 | Date de course avant date de début | Étape Date du wizard | Bloquer le bouton Continuer — seul garde-fou qui empêche réellement d'avancer |
| 3 | Durée de plan trop courte | Calcul des phases (section 4bis) — (durée totale − affûtage) < ~3 semaines | Alerter explicitement que le plan sera un maintien, pas une progression |
| 4 | Volume de départ trop proche du plafond | Génération de la progression (section 6) | Signaler une marge de progression faible plutôt que forcer une hausse artificielle |
| 5 | Écart volume de départ / plafond trop grand pour la durée | Génération de la progression (section 6) | Signaler un plan trop court ou un objectif trop ambitieux — ne s'applique pas si l'ampleur de l'objectif est "faible" |
| 6 | Jours disponibles trop rapprochés (< 48h entre séances dures) | Placement dans la semaine (section 5) | Placer quand même en dernier recours, avec un avertissement explicite |
| 7 | Qualité juste avant/après la sortie longue, faute d'alternative | Placement dans la semaine (section 5) | Idem — repli accepté uniquement si aucun autre jour disponible |
| 8 | Incohérence de plafond entre distances | Calcul des plafonds de volume (section 2) | Garde-fou interne au moteur (pas visible utilisateur) |
| 9 | Cumul de contraintes | Modulation par contraintes (section 7) | Pas d'addition des réductions — la règle la plus prudente prime |
| 10 | Reprise après pause + estimation Strava | Modulation par contraintes (section 7) | Au-delà de "2-4 semaines", désactiver la pré-estimation automatique |
| 11 | Volume hebdo trop faible pour la répartition EF/longue | Réconciliation volume ↔ durée (section 13) | Seuil 2km — signale un cas dégénéré (contraintes cumulées + volume faible), exclu pendant Affûtage/décharge |
| 12 | Séance EF/longue disproportionnée | Réconciliation volume ↔ durée (section 13) | Plafonds : 75min EF, 90-150min longue selon distance — plafonné + avertissement |

## 11. Architecture du moteur : moteur de règles

Le moteur est un **moteur de règles**, pas des templates paramétrés pré-écrits.

**Pourquoi** : la durée du plan est variable (calculée depuis les dates), ce qui rend impossible un template par durée fixe — la combinatoire distance × niveau × durée × nombre de séances × contraintes explose trop vite pour être pré-écrite et maintenue à la main.

**Nuance** : ce n'est pas "moteur pur" au sens où tout serait généré de zéro. C'est un moteur de règles **au niveau du plan** (quelles séances, quand, combien — sections 4bis, 5, 6, 7) qui pioche dans une **bibliothèque de templates au niveau de la séance** (section 2 — ex. "VMA : 2×8×30″-30″" est un template de contenu de séance, pas de plan entier). Le moteur choisit, dose et séquence ; il n'invente pas le contenu des séances individuelles à partir de rien.

## 12. Contenu concret des séances

Le moteur génère la structure affichable (ex. "3×8min @ 4:59/km (Seuil), récup 2min"), pas juste une étiquette "qualité"/"EF"/"longue".

- **Rotation par distance/phase** : chaque distance a sa propre liste de sous-types de séance qualité par phase (`ROTATION_SOUS_TYPE`), qui cycle semaine après semaine et selon l'index de la séance qualité dans la semaine (1ère vs 2ème). Construction : 2 sous-types par distance minimum (cf. section 41 pour l'enrichissement par strides). Spécifique : rotation plus riche (5-6 sous-types selon distance, incluant pyramidale/seuil-négatif, cf. section 38). Affûtage : au moins 2 sous-types par distance pour Semi/Marathon (cf. correctif historique).
- **Progression intra-phase** : le nombre de répétitions ou la durée augmente tous les ~3 semaines dans une phase donnée, avec un plafond par sous-type (`base`/`cap` par niveau). La progression **repart à `base` à chaque nouvelle phase** (jamais continue depuis le niveau atteint en fin de phase précédente) — cohérent avec la pratique de périodisation standard : chaque mésocycle cible une adaptation différente et redémarre à un volume conservateur, même après un bloc précédent terminé plus haut.
- **Repli sur restriction** : si une contrainte interdit V ou I (section 7), le sous-type prévu par la rotation est automatiquement remplacé par un cran moins intense (V → I → Seuil), y compris quand la rotation naturelle serait tombée sur le sous-type interdit.
- **EF et sortie longue** : durée dérivée du volume hebdo cible (section 13), pas un repère fixe. Sortie longue enrichie d'un segment à allure course pour Semi/Marathon en phase Spécifique/Affûtage (`avecSegmentCourse`, ~25% de la longue).

## 13. Réconciliation volume ↔ durée de séance

EF et sortie longue ont une durée dérivée du volume hebdo cible :

- **Répartition** : le volume hebdo cible moins le kilométrage des séances qualité (estimé à partir de leur structure — reps × durée/distance × allure) donne le kilométrage restant. La sortie longue reçoit **25-30% du volume hebdo total** (repère Daniels, universel quelle que soit la distance), les EF se partagent le reste.
- **Différenciation des EF** : une EF qui suit directement (circulairement) une séance dure — qualité ou longue — devient une **EF de récupération** plus courte (poids 0,75 contre 1,0 pour une EF standard), le reste du budget EF se redistribuant sur les autres EF de la semaine.
- **Somme exacte** : la somme des séances égale toujours le volume cible de la semaine.
- **Plafonds** (garde-fou #12) : **75min pour l'EF**, **90-150min pour la longue selon la distance** (5K/10K : 90min, Semi : 120min, Marathon : 150min). Au-delà, la séance est plafonnée et un avertissement le signale.
- **Garde-fou symétrique** (#11, volume hebdo trop faible) : si le kilométrage restant après les séances qualité est trop faible pour donner des séances substantielles (< 2km), un avertissement le signale — sauf pendant Affûtage/décharge où des séances courtes sont voulues.

## 14. Échauffement et retour au calme des séances qualité

- **EF et sortie longue** n'ont pas d'échauffement structuré — l'allure facile fait déjà office d'échauffement.
- **Séances qualité** reçoivent un échauffement 15min + retour au calme 10min à allure EF (fixes, pas différenciés par intensité V/I vs T/C, choix délibéré pour la simplicité de maintenance). Comptés dans le volume hebdo — `repartirVolumeSemaine` s'ajuste automatiquement pour compenser.
- **Réduction proportionnelle pendant décharge et Affûtage** (planchers 8min échauffement / 5min RAC) : sans ça, ce coût fixe prend une part disproportionnée du budget sur les semaines déjà réduites.

## 15. Profondeur du taper par distance

Fractions du pic de volume à atteindre en début et fin d'Affûtage, calibrées par distance (pas une formule générique) :

| Distance | Début Affûtage | Fin Affûtage (semaine de course) |
|---|---|---|
| 5K | 80% du pic | 65% du pic (réduction ~30-40%) |
| 10K | 80% du pic | 60% du pic (réduction ~35-45%) |
| Semi | 75% du pic | 55% du pic |
| Marathon | 75% du pic | 50% du pic (réduction ~40-50%) |

Les séances qualité (répétitions/durée) se réduisent proportionnellement à la même fraction que le volume hebdo pendant l'Affûtage et les décharges classiques, avec un plancher minimum par sous-type pour garder un vrai stimulus (ex. 2 répétitions minimum pour Seuil/allure course).

## 16. Zones FC par type de séance

Zone FC (en % de FC max) par type de séance, dérivée de `fcMax` :

| Zone | % FC max |
|---|---|
| Récup | 55-65% |
| E (EF/Longue) | 65-75% |
| C (Allure course) | 85-90% |
| T (Seuil) | 90-95% |
| I (VMA) | 90-100% |
| V (Vitesse) | 95-100% |

## 17. Plafond de volume par séance qualité individuelle (I/T/V/C)

Distinct du plafond `base`/`cap` par niveau (section 12, qui pilote la vitesse de progression) : le volume hebdo réel autorise physiologiquement un plafond par séance individuelle, indépendant du niveau. Règle Daniels (chapitre 4, figure 4.1) — le pourcentage porte sur **une séance qualité individuelle**, pas le cumul de toutes les séances qualité de la semaine :

| Zone | Sous-types concernés | Plafond par séance |
|---|---|---|
| I (VMA) | `i-3min`, `i-30-30`, `pyramidale` | min(temps 10K, **8%** volume hebdo) |
| T (Seuil) | `seuil`, `seuil-court`, `seuil-2min`, `tempo-court`, `seuil-negatif` | min(20 min, **10%** volume hebdo) |
| V (Vitesse) | `vitesse`, `cotes` | min(5 miles, **5%** volume hebdo) |
| C (Allure course) | `allure-course`, `allure-course-court`, `test` (confirmation d'allure, section 20) | min(18 miles/29km, **20%** volume hebdo) |

Si la semaine a 2 séances qualité, **chacune est plafonnée indépendamment** à son propre pourcentage — pas de partage du budget. Distinct de la règle 80/20 (section 1), qui porte sur le cumul hebdomadaire toutes qualités confondues.

**Référence de calcul** : le volume hebdo **cible de la semaine courante** (`volumeCibleKm`), pas le volume de départ déclaré — le plafond suit l'évolution du plan (progression, décharge, affûtage).

**Cas limite non couvert** : un débutant à volume élevé pour son niveau obtiendrait un plafond haut alors que sa capacité de récupération reste débutante — angle mort assumé du principe Daniels.

**Statut d'implémentation** : règle définie et sourcée, plafonnement effectif dans `genererContenuQualite()` non encore codé à ce jour — piste retenue : plafonner `reps` (ou la durée totale du bloc pour les sous-types multi-blocs) selon `min(repère absolu, volumeHebdoCible × pourcentage de la zone)`, en plus du plafond `cap` par niveau déjà existant (la contrainte la plus stricte prévaut).

## 18. Deux sous-types additionnels de séance qualité

Ajoutés en phase Spécifique pour varier davantage les plans longs, tout en gardant les séances de base largement majoritaires :

- **Pyramidale** (5K/10K/Semi) : montée-descente 2-3-4-3-2min à allure VMA, récup égale au temps de l'effort — fréquence cible **1/12** des séances qualité
- **Seuil négatif** (10K/Semi/Marathon) : deux blocs de seuil enchaînés sans récup, le second nettement plus rapide (interpolation 30% vers l'allure VMA) — fréquence cible **2/12**

Le Marathon n'a volontairement pas reçu la pyramidale (moins pertinente pour cette distance, phase Spécifique plus orientée seuil/allure course qu'intervalles VMA). `pyramidale` utilise l'allure VMA (I), donc soumise au mécanisme de repli sur restriction (section 12) au même titre que les autres sous-types I.

## 19. Strides sur les EF de Construction

La phase Construction n'a que 2 sous-types de séance qualité (contre 5-6 en Spécifique), ce qui peut donner une impression de répétition mécanique — seule la charge progresse, pas la nature de l'effort. Les **strides** (accélérations courtes et contrôlées, ~15-20s à ~95% de la vitesse maximale, récupération complète) comblent ce manque : stimulus adapté à la phase de base (tradition Lydiard/Runners Connect/Coach Saltmarsh), risque quasi nul, distinct du travail VMA déjà présent, entretient l'économie de course sans faire progresser le VO2max ni ajouter de charge significative.

**Différence structurelle** : pas d'allure chiffrée — se pilotent au ressenti. Le champ `allure` est une chaîne descriptive, pas un pace formaté.

**Ciblage** (délibérément restrictif) :
- Uniquement en phase Construction — Spécifique a déjà une rotation riche, Affûtage doit éviter tout stimulus superflu avant course
- Uniquement sur les EF `role: "standard"` — jamais sur les EF `role: "recuperation"`
- Fréquence cyclique : 1 EF standard sur 2 (compteur sur les occurrences rencontrées, s'adapte automatiquement au nombre réel d'EF standard du plan)

**Implémentation** : `injecterStrides(semaines, alluresSec)`, même pattern que `injecterNotesPratiques`/`injecterJalonsTransition`. Incrémente légèrement `kmEstime` (~0,3km pour 4×20s) pour que le moteur de décision (ACWR, charge) ne traite pas une EF+strides comme une EF pure. Champ structuré `seance.strides` (repetitions, dureeEffortSec, allure descriptive) posé en plus du texte — cohérent avec le principe que `structureIntervalles` ne doit jamais être reparsée depuis le texte.

**Impact sur les autres garde-fous** : le volume ajouté (~0,3km/semaine) est trop marginal pour affecter la limite Daniels sur le seuil (≤10% du volume hebdo en T, section 17) ou la distribution 80/20 (section 1) — vérifié sur un plan réel.

## 20. Séance de confirmation d'allure

Séance unique par plan, placée vers la fin de la phase Spécifique, qui recalibre les allures en cours de route plutôt que de les figer à la génération initiale.

**Principe retenu : confirmation d'allure**, pas time trial — courir une portion de la distance de course **à l'allure objectif** (pas à fond). Principe "goal pace confirmation workout" (McMillan, Hal Higdon), qui vérifie que l'allure visée est *tenable dans la durée*, pas la forme maximale.

**% de la distance de course à l'allure objectif, par distance** :

| Distance | % à l'allure course | Tampon avant l'Affûtage |
|---|---|---|
| 5K | ~60% | 1 semaine |
| 10K | ~55% | 1 semaine |
| Semi | ~35% | 2 semaines |
| Marathon | ~25% (cohérent avec le segment allure course déjà en fin de sortie longue) | 2 semaines |

**Durée calculée, pas fixe** : la durée en minutes découle de la distance calculée × l'allure course réelle de la personne, pas un chiffre universel.

**Soumise au plafond C** (section 17) — vérifié : les distances de test générées par ce tableau restent sous le plafond M/Daniels (20% du volume hebdo) pour un volume hebdo suffisant, mais un débutant en tout début de progression (avant d'atteindre le pic de volume de sa phase) peut voir sa séance test dépasser ce plafond sur certaines distances — trou identifié, couvert par la même implémentation que le plafond général (section 17, non encore codé).

Placement (tampon avant Affûtage, plancher si Spécifique trop courte) et implémentation technique (recalcule EF/longue de la semaine, réutilise `repartirVolumeSemaine`/`differencierEF`) identiques au reste du moteur.

## 21. Persistance et suivi

**Sauvegarde cloud** — porte d'entrée unique vers le stockage (`sauvegarderPlan()`, `chargerPlans()`), pour permettre de faire évoluer l'implémentation sous-jacente sans toucher au reste du code. Chaque plan a un identifiant stable (`plan.id`, UUID) permettant une mise à jour en place plutôt qu'un doublon à chaque changement de statut.

**Suivi de complétion** : chaque séance qualité/EF/longue a une icône cliquable qui cycle entre réussie (✅) / adaptée (⚠️) / ratée (❌) / non marquée. Statuts stockés dans `plan.statuses` (clé `"semaine-jour"` → statut), inclus dans la sauvegarde.

**Renommage et suppression** : chaque plan peut être nommé et supprimé. Les identifications se font par `id` (pas par index de tableau), pour rester correctes même après une suppression qui décale les positions.

**Modification d'objectif sur un plan existant** : un plan chargé peut voir son objectif modifié directement, sans repasser par tout le wizard — régénère le plan avec le même id, repart d'un suivi de complétion vierge. Nécessite `profilOrigine`/`paramsOrigine` conservés dans chaque plan généré (indispensables pour toute régénération).

## 22. Règles d'adaptation du plan

Sourcé via littérature sportive générale (ACWR — acute:chronic workload ratio, Gabbett 2016 et méta-analyses ultérieures) et retours de coachs de course à pied.

- **Seuil de déclenchement** : pas une séance isolée, mais un pattern — score cumulé ≥ 2 sur les séances dures (qualité + longue) de la semaine en cours, avec ratée = 1 point, adaptée = 0,5 point, réussie = 0. Les EF ne comptent pas dans ce score.
- **Action** : la semaine suivante est traitée comme une décharge supplémentaire — réutilise le mécanisme de décharge déjà construit (réduction ~25% du volume et des répétitions qualité, mêmes planchers), plutôt qu'un nouveau système parallèle.
- **Non-cumul** : si la semaine suivante était déjà une décharge programmée, une seule réduction s'applique.
- **Pas de décalage en cascade** : le calendrier des phases et le cycle des décharges normales restent fixes, même après une décharge d'adaptation hors cycle.
- **Garde-fou sur la répétition** : si l'adaptation se déclenche 3 semaines de suite, avertissement explicite (le plan semble trop ambitieux compte tenu de la disponibilité réelle) — jamais d'action automatique sur l'objectif ou le plafond, décision humaine.

**Fonctions du moteur** :
- `calculerScoreSemaine(semaine, statuses)` — score d'une semaine à partir des statuts des séances dures, retourne `null` si la semaine n'a aucun statut enregistré
- `analyserAdaptations(plan)` — détermine quelles semaines doivent être adaptées, compte les déclenchements consécutifs
- `appliquerAdaptations(plan)` — régénère le contenu des semaines concernées en réutilisant les fonctions existantes (`genererContenuQualite` avec `estDechargeSemaine: true`, `repartirVolumeSemaine`, `differencierEF`, `genererContenuEF`, `genererContenuLongue`)

**Non-cumulatif** : chaque analyse repart d'une **régénération propre** du plan à partir de `profilOrigine`/`paramsOrigine`, puis ré-applique les adaptations selon les statuts *actuels* — jamais d'empilement de modifications sur un état déjà modifié. Si les statuts qui avaient déclenché une adaptation sont corrigés, la prochaine analyse "oublie" cette adaptation qui ne se justifie plus.

**Hors scope actuel** : comparaison allure/FC réelles (via Strava) contre les zones attendues, pour détecter qu'une séance était trop facile et suggérer — jamais imposer — une hausse du plafond de volume.

## 23. Intégration Strava — pré-remplissage du volume de départ

Le champ "volume actuel" du wizard se remplit automatiquement depuis Strava une fois connecté.

- Bouton de connexion Strava si pas encore connecté, sinon calcul automatique
- Rafraîchissement automatique du token si expiré, avant chaque requête
- Médiane (pas moyenne) du volume hebdomadaire sur les 8 dernières semaines glissantes
- Si pas assez d'historique ou erreur : bascule automatique en saisie manuelle avec message explicite

## 24. Nettoyage et factorisation

Le bloc "répartir le volume entre EF et longue puis régénérer leur contenu" est factorisé en une seule fonction `recalculerRepartitionEFLongue`, appelée à chaque point de régénération (génération initiale, `appliquerAdaptations`, `placerSeanceTest`) — élimine la duplication et garantit que les avertissements de plafonnement (`SEANCE_EF_PLAFONNEE`, `SEANCE_LONGUE_PLAFONNEE`) remontent de façon cohérente quel que soit le chemin d'appel.

## Sources consultées

- Jack Daniels' Running Formula — zones VDOT (E/M/T/I/R, adaptées en Récup/E/C/T/I/V dans ce document ; M devient C "Allure course objectif", généralisée à toute distance)
- Jack Daniels' Running Formula, chapitre 4, figure 4.1 — plafond de volume par séance qualité individuelle, zones I/T/V/C (section 17)
- Hal Higdon — plans 5K, 10K, semi-marathon (novice à avancé)
- Runners Connect — physiologie des séances 5K (VO2max, seuil lactique)
- The Running Channel, TrainingPeaks, Marathon Handbook — structuration et taper marathon
- CorrerJuntos, HikingManual, Trainero — structuration semi-marathon en 12 semaines
- Tradition Lydiard (base aérobique moderne), Runners Connect, Coach Saltmarsh — strides comme stimulus neuromusculaire de phase de base (section 19)
- TrainerRoad, TrainingPeaks, NASM, mesostrength.com — périodisation par mésocycle, redémarrage conservateur à chaque nouvelle phase (section 12)
- McMillan, Hal Higdon — goal pace confirmation workout (section 20)
