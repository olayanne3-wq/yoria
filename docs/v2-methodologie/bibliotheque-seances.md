# Bibliothèque de séances — Run by Léa v2.0

Document de référence méthodologique. Objectif : servir de base au moteur de génération de plans (chantier v2.0), décliné par distance (5K / 10K / Semi / Marathon) et par phase (Construction / Spécifique / Affûtage).

> **Note de terminologie** : "Affûtage" désigne ici la réduction finale de volume avant course (le "taper" au sens strict), pas la phase de développement du seuil qui la précède. La phase intermédiaire — volume encore soutenu, intensité spécifique à la course — est nommée "Spécifique". Ça évite l'ambiguïté qu'on avait avec "Affûtage" utilisé à deux sens différents.

---

## 1. Principes transversaux (toutes distances)

Ces règles s'appliquent quel que soit le profil et alimentent les garde-fous du moteur.

- **Zones d'allure (méthode Daniels/VDOT)** — 5 zones dérivées d'une performance récente :
  - **Récup (Récupération)** : en dessous de E, pour les jours qui suivent un effort très intense (test allure, course) — plus lent que l'EF habituelle, jamais chronométré comme un objectif
  - **E (Endurance fondamentale)** : 59-74% VDOT, conversationnel, 70-80% du volume hebdo
  - **C (Allure course objectif)** : allure spécifique à la distance visée — validé sur plan réel comme zone à part entière, toujours renseignée quelle que soit la distance (pas seulement pour le marathon, contrairement au "M" d'origine chez Daniels)
  - **T (Seuil/Tempo)** : 83-88% VDOT, "confortablement difficile", efforts continus de 20-40 min ou fractionné cruise
  - **I (Intervalle/VMA)** : 95-100% VDOT, répétitions de 3-5 min, développe la VO2max
  - **V (Vitesse)** : >100% VDOT, répétitions courtes (200-400m) récupération complète, vitesse pure et économie de course, pas de charge aérobie — *nommée "Vitesse" plutôt que "Répétition" (terme Daniels d'origine) pour éviter toute confusion avec "répétitions" qui désigne déjà, dans l'app, le nombre de fractions d'une séance (ex. "6 répétitions de 400m")*
- **Règle des 10%** : ne pas augmenter le volume hebdomadaire de plus de 10% d'une semaine à l'autre, sauf lors des semaines de décharge.
- **Répartition 80/20** : environ 80% du volume en endurance fondamentale, 20% en qualité (seuil/VMA/répétition).
- **Semaines de décharge** : tous les 3-4 semaines, réduction de volume pour permettre l'assimilation — à ne pas confondre avec du surentraînement raté.
- **Affûtage (taper)** : réduction de volume de 40-60% en conservant un peu d'intensité, pour arriver frais le jour J. La durée dépend de la distance (voir ci-dessous).

## 2. Structure par distance

### 5K — dominante VMA / vitesse

| Phase | Contenu dominant |
|---|---|
| Construction | Base aérobie, côtes courtes (renforcement musculaire, "strong before long"), intervalles légers à faible fatigue, sortie longue 60-90 min en EF |
| Spécifique | Intervalles VO2max (400m à l'allure 5K ou plus rapide, fractionné 30/30, répétitions 3-5 min), tempo runs 20-30 min pour relever le seuil |
| Affûtage | Réduction de volume, répétitions courtes et rapides (allure mile) pour rester affûté, simulation de course — court, environ 5-7 jours |

### 10K — dominante seuil (cohérent avec ton plan actuel)

| Phase | Contenu dominant |
|---|---|
| Construction | Base aérobie, sortie longue modérée (60-90 min), premiers tempo runs courts |
| Spécifique | Fractionné VMA (1000m), tempo runs à l'allure 10K, cruise intervals |
| Affûtage | Réduction progressive du volume, dernières séances de rappel à allure course — environ 5-7 jours |

### Semi-marathon — dominante seuil + endurance spécifique

| Phase | Contenu dominant |
|---|---|
| Construction | Montée de volume 10-15%/semaine, sortie longue progressive, une séance qualité légère (tempo court ou fartlek) |
| Spécifique (première partie) | Tempo runs plus longs, fractionné VMA, sortie longue avec segments à allure semi |
| Spécifique (fin de phase, pic de volume) | Volume hebdo maximal, sortie longue au plus haut (18-19 km), pratique de l'allure course |
| Affûtage | Réduction de volume 30-50%, quelques séances qualité raccourcies |

### Marathon — dominante fondamentale + sorties longues

| Phase | Contenu dominant |
|---|---|
| Construction | Construction de l'habitude, tout en aérobie, sortie longue progressive |
| Spécifique (première partie) | Développement du seuil, sortie longue avec segments à allure marathon, volume hebdo qui grimpe |
| Spécifique (fin de phase, pic de volume) | Sortie longue au maximum (28-32 km, jusqu'à 32-35 km pour profils confirmés — ne pas dépasser ~35 km, le gain n'en vaut pas le risque), plus haut volume hebdo |
| Affûtage (durée fixe, ~2-3 semaines — cf. section 4bis) | Semaine -3 : réduction 20-25%. Semaine -2 : réduction 40-50%. Semaine de course : réduction 60-70% avec un dernier tempo court |

**Plafonds de volume hebdo au pic, par distance et par niveau** (indicatifs, à ajuster au profil réel) :

| Niveau | 5K | 10K | Semi | Marathon |
|---|---|---|---|---|
| Débutant | ~20-25 km | ~25-35 km | ~35-45 km | ~35-40 km |
| Intermédiaire | ~25-35 km | ~35-50 km | ~45-60 km | ~45-55 km |
| Confirmé | ~35-45 km | ~50-65 km | ~60-80 km | ~55-70+ km |

La progression logique (5K < 10K < Semi < Marathon, à niveau égal) sert de repère de cohérence : si le moteur calcule un plafond qui casse cet ordre pour un même profil, c'est le signe d'une erreur de calcul en amont.

## 3. Ce que ça implique pour le moteur

- La bibliothèque de séances doit être indexée par **distance × phase × niveau**, pas juste par phase — c'est un axe de plus que dans le plan actuel (qui est mono-distance).
- Les **paces Récup/E/C/T/I/V** peuvent se calculer une fois pour toutes à partir du temps de référence (VDOT ou Riegel), puis s'appliquer à n'importe quel type de séance de la bibliothèque — c'est un module de calcul transversal, pas répété par distance.
- Le **taper** a une durée variable selon la distance (5-7j pour 5K/10K, 7-14j pour semi, 2-3 semaines pour marathon) — ça doit être un paramètre dérivé de la distance choisie, pas une durée fixe. Dans la nomenclature du plan, cette phase s'appelle **Affûtage** — la phase intermédiaire à volume soutenu s'appelle **Spécifique**, pour éviter toute confusion entre les deux.
- Les **volumes hebdo indicatifs par niveau** (marathon notamment) donnent une base pour les garde-fous — utile pour détecter un objectif ou une charge irréaliste.

## 4. Priorité des séances selon le nombre de créneaux disponibles

Le nombre de séances/semaine choisi dans le wizard (2 à 7) doit déterminer *quelles* séances de la bibliothèque sont retenues, pas juste leur durée. Trois niveaux de priorité :

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
Plusieurs sources le recommandent comme réducteur de risque de blessure, mais tout le monde n'a pas envie ou le temps d'en faire. Plutôt que de l'ajouter automatiquement au niveau 3, ce doit être un choix explicite : une case dans le wizard ("Je veux inclure du renforcement musculaire dans mon plan"), activable/désactivable à tout moment depuis les Paramètres — pas verrouillé à la création du plan. Si activé, le moteur l'insère sur le **jour de repos** (lendemain de la sortie longue), pas accolé à une séance qualité — validé sur un plan réel : le renforcement combiné à la récupération a plus de sens que d'ajouter de la fatigue un jour d'intensité.

**Règle de dégradation** : quand le nombre de séances diminue, on retire toujours en partant du niveau le plus haut (niveau 3 en premier), jamais la sortie longue ni la séance qualité — ce sont les deux séances qui "portent" la progression, comme le confirment plusieurs plans de référence à faible fréquence hebdomadaire.

## 4bis. Durée variable du plan — répartition proportionnelle des phases

Depuis que la durée se calcule entre date de début et date de course (au lieu d'être fixe), les tableaux ci-dessus utilisent des repères relatifs ("première partie", "fin de phase") plutôt que des numéros de semaine fixes. Le moteur doit calculer les bornes réelles de chaque phase à partir de la durée du plan, avec une règle importante :

**L'Affûtage n'est pas proportionnel.** Sa durée dépend de la distance (physiologie de récupération), pas de la longueur totale du plan :
- 5K : ~1 semaine
- 10K : ~10 jours (validé sur plan réel)
- Semi : ~1-2 semaines
- Marathon : ~2-3 semaines

**Construction et Spécifique se partagent le temps restant**, selon un ratio qui dépend du niveau :

| Niveau | Construction | Spécifique |
|---|---|---|
| Débutant | ~55% du temps restant | ~45% |
| Intermédiaire | ~40% | ~60% |
| Confirmé | ~30% | ~70% |

**Tranché** : l'ampleur du gain visé module bien le ratio, en plus du niveau. Catégorisation à partir de l'écart relatif entre temps de référence et objectif :

| Ampleur du gain | Écart | Ajustement du ratio Construction |
|---|---|---|
| Faible | < 5% | +15% vers Construction (validé : ramène le cas réel de 40/60 à 55/45, cohérent avec le 56/44 observé) |
| Modérée | 5-10% | Aucun ajustement — ratio de base par niveau |
| Ambitieuse | > 10% | −5% vers Construction (plus de temps en Spécifique) |

Le plafond de volume visé doit aussi s'ajuster pour un objectif faible : viser le plafond de population (section 2) n'a pas de sens si le coureur est déjà proche de sa forme cible — le plafond effectif devient `min(plafond population, volume de départ × 1,20)`. Sans cet ajustement, le garde-fou #5 (écart volume/plafond trop grand) se déclenche en faux positif, comme observé en testant le moteur contre le profil réel.

**Garde-fou de durée minimale** : si (durée totale − affûtage) est inférieur à ~3 semaines, le plan n'a pas assez de temps pour une vraie Construction + Spécifique. Le moteur doit alerter l'utilisateur plutôt que de générer un plan dégradé silencieusement (ex. "3 semaines avant course, ce plan sera essentiellement un maintien, pas une vraie progression").

**Cas des plans très longs** (20+ semaines, ex. marathon en 24 semaines pour un débutant) : au-delà d'un certain point, ajouter des semaines de Construction supplémentaires n'apporte plus grand-chose sans varier le contenu — il faut alors introduire un palier de base aérobie pure avant même la Construction (cf. sources : 8-12 semaines de base avant un plan marathon pour un vrai débutant), plutôt que d'étirer artificiellement les phases existantes.

## 5. Placement des séances dans la semaine

Une fois qu'on sait *combien* de séances de chaque type (qualité / EF / longue) une semaine contient, il faut décider *quel jour* reçoit quoi. Logique en deux temps :

**1. Placer les ancres fixes d'abord**
- Sortie longue → un jour de week-end (Samedi/Dimanche en priorité), le jour où le créneau est le plus large
- Séance(s) qualité → au moins 48h d'écart avec la sortie longue et entre elles si il y en a deux
- Renforcement (si activé) → jour de repos, typiquement le lendemain de la sortie longue — pas accolé à une séance qualité (validé sur plan réel)

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

**Cas limite non résolu** : si les jours cochés dans le wizard sont "collés" (ex. Lun/Mar/Mer), l'algorithme ne peut pas respecter l'écart de 48h. À trancher : alerter l'utilisateur dès l'étape Disponibilité du wizard, ou laisser le moteur dégrader silencieusement (qualité suivie d'une EF légère plutôt que d'une vraie récupération) avec un signalement a posteriori dans le plan généré.

## 6. Progression du volume semaine par semaine

**Volume de départ** : demandé explicitement dans le wizard (km/semaine actuels), pré-rempli automatiquement à partir de la **médiane des 8 dernières semaines** d'activités Strava si le compte est connecté et dispose d'un historique suffisant — sinon saisie manuelle. La médiane sur une fenêtre plus large (plutôt qu'une moyenne sur 4 semaines) évite qu'une période d'affûtage ou de coupure récente dans l'historique Strava ne fausse l'estimation à la baisse (ou une semaine de pic de course à la hausse). Dans tous les cas, l'utilisateur peut corriger la valeur proposée.

**Progression** :
- Augmentation maximale de 10% du volume hebdomadaire d'une semaine à l'autre (règle transversale, section 1), appliquée à partir du volume de départ déclaré
- Semaine de décharge toutes les 3-4 semaines : réduction de 20-30% du volume de la semaine précédente, pas d'augmentation ce jour-là
- Le volume cible en fin de phase Spécifique (juste avant l'Affûtage) sert de plafond — dérivé des repères par distance et par niveau donnés en section 2

**Garde-fou** : si le volume de départ déclaré est déjà proche ou au-dessus du plafond visé pour la distance/niveau, la marge de progression est faible — le moteur doit le signaler plutôt que de forcer une hausse artificielle. À l'inverse, si l'écart entre volume de départ et plafond est trop grand pour la durée du plan (même en respectant la règle des 10%), c'est un signal de plan trop court ou d'objectif trop ambitieux — à croiser avec le garde-fou de faisabilité déjà prévu à l'étape Objectif du wizard.

## 7. Modulation par contraintes

Le champ "Contraintes" du wizard (section 6 du wizard, choix multiple) module le plan généré. Rappel : ce ne sont pas des règles médicales, l'app ne diagnostique rien — elle adapte la prudence et renvoie vers un avis professionnel quand c'est pertinent.

**Blessure en cours ou récente**
- Progression du volume ralentie : 5-8%/semaine au lieu de 10%, pendant les 2-3 premières semaines du plan
- Aucune séance V (Vitesse) ni I (VMA) pendant cette période — EF et Seuil léger uniquement
- Plafond de volume visé réduit d'environ 10-15% par rapport au repère standard du profil (section 2)
- Message systématique recommandant un avis professionnel avant de reprendre l'intensité

**Douleur ou fragilité chronique**
- Cap à 1 seule séance qualité/semaine, même si la règle normale (niveau + nb séances, section 5) en autoriserait 2
- Pas de séance V — le travail Seuil est préféré, moins impactant à volume de qualité égal
- **Cas particulier du 5K** : la bibliothèque 5K (section 2) repose largement sur le V en Spécifique et Affûtage — c'est ce qui distingue un plan 5K d'un 10K. Retirer le V sans compensation viderait le plan de sa spécificité. Repli : remplacer par du travail **I (VMA)** un peu plus soutenu que la normale (répétitions un peu plus longues, allure I haute plutôt que basse), pour garder un stimulus de vitesse sans le risque d'impact répété du V

**Reprise après une longue pause**
- Le wizard demande désormais la durée approximative de la pause (tranches : 2-4 semaines / 1-3 mois / 3-6 mois / 6 mois ou plus), ce qui permet de dimensionner la réacclimatation plutôt que d'appliquer une durée fixe arbitraire :

| Durée de la pause | Réacclimatation avant Construction |
|---|---|
| 2-4 semaines | Pas de phase dédiée — juste une reprise de volume plus prudente dès la Construction |
| 1-3 mois | 1 semaine d'EF uniquement, pas de qualité |
| 3-6 mois | 2 semaines d'EF uniquement |
| 6 mois ou plus | 3-4 semaines d'EF uniquement, plus proche d'une reconstruction de base que d'une réacclimatation — le garde-fou de durée minimale (section 4bis) doit en tenir compte si le plan est court |

- Cette contrainte doit aussi **désactiver la pré-estimation Strava du volume de départ** (section 6) au-delà de la tranche "2-4 semaines" : une médiane sur 8 semaines capterait en partie l'activité d'avant la pause et surestimerait le point de départ réel. Basculer automatiquement en saisie manuelle plutôt que de proposer une valeur biaisée.

**Cumul de contraintes** : si plusieurs cases sont cochées, les modulations les plus prudentes s'appliquent (pas d'addition des réductions — ex. blessure + reprise ne double pas la réduction de volume, c'est la règle la plus stricte des deux qui prime).

## 8. Profil coureur vs paramètres du plan

Distinction structurante pour le schéma de données (chantier suivant) : tout ce que le wizard collecte n'a pas la même durée de vie. Séparer les deux évite de redemander à chaque nouveau plan des infos qui ne changent pas.

**Profil coureur — persistant, modifiable depuis les Paramètres, pré-rempli dans le wizard**
- Niveau (débutant / intermédiaire / confirmé)
- Âge ou date de naissance — sert à calculer une zone FC par défaut (ex. formule de Tanaka, 208 − 0,7×âge, plus fiable que 220−âge) en complément des zones d'allure Récup/E/C/T/I/V déjà définies
- Jours disponibles habituels
- Préférence renforcement musculaire (inclus ou non)
- Contraintes chroniques (douleur/fragilité récurrente — distinct d'une blessure ponctuelle, voir ci-dessous)

**Paramètres du plan — redemandés (ou pré-remplis puis validés) à chaque nouvelle course**
- Distance visée
- Temps de référence (spécifique à la distance choisie)
- Objectif
- Date de début et date de course
- Volume actuel (recalculé à chaque génération via la médiane Strava, jamais mémorisé tel quel — il évolue en permanence)
- Contraintes ponctuelles (blessure en cours/récente, reprise après pause — propres au moment de la génération, pas au coureur en général)

**Flux attendu** : première utilisation de l'app → le wizard sert à la fois à créer le Profil et le premier Plan (un seul passage). Plans suivants → le wizard ne redemande que les paramètres du plan, avec les champs du Profil déjà pré-remplis et modifiables si besoin (ex. le niveau a progressé, un nouveau jour est devenu disponible).

## 9. Schéma de données JSON

Trois niveaux d'objets, cohérents avec la distinction Profil/Plan de la section 8. Exemple instancié avec ton propre profil (10K, 50'21" → 48'30", 11 semaines) — sert aussi de cas de test pour la validation du moteur.

### Profil coureur (persistant)

```json
{
  "profilId": "laurent-001",
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
  "planId": "plan-2026-gemaubagne",
  "profilId": "laurent-001",
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

**Points d'attention pour l'implémentation** :
- `warnings` est un tableau vide par défaut, peuplé par les garde-fous (48h insuffisant, volume trop proche du plafond, plan trop court, etc.) — ne jamais faire échouer la génération, toujours produire un plan avec ses avertissements attachés
- `phases[].ratioNiveau` et `dureeFixe` reflètent directement la règle de la section 4bis (Affûtage fixe, reste proportionnel au niveau)
- `contraintesPonctuelles` et `contraintesChroniques` sont séparées entre Plan et Profil, cohérent avec la section 8
- `volumeActuel.source` trace explicitement d'où vient la valeur (Strava médiane, manuel, ou surchargé suite à une contrainte "reprise") — utile pour debug et pour ne jamais perdre la traçabilité d'une estimation biaisée

## 10. Checklist consolidée des garde-fous

Tous les garde-fous évoqués au fil du document, rassemblés ici pour l'implémentation. Principe commun : **un garde-fou avertit, il ne bloque jamais silencieusement la génération** — le plan sort toujours, avec ses avertissements attachés (`warnings[]`, section 9).

| # | Garde-fou | Où il se déclenche | Comportement attendu |
|---|---|---|---|
| 1 | Objectif irréaliste | Étape Objectif du wizard, dès que temps de référence + objectif + durée sont connus | Message de faisabilité en direct (✅/⚠️), avant même de lancer la génération |
| 2 | Date de course avant date de début | Étape Date du wizard | Bloquer le bouton Continuer — seul garde-fou qui empêche réellement d'avancer, car il n'y a pas de plan possible à générer |
| 3 | Durée de plan trop courte | Calcul des phases (section 4bis) — (durée totale − affûtage) < ~3 semaines | Alerter explicitement que le plan sera un maintien, pas une progression, plutôt que générer un plan dégradé sans le dire |
| 4 | Volume de départ trop proche du plafond | Génération de la progression (section 6) | Signaler une marge de progression faible plutôt que forcer une hausse artificielle |
| 5 | Écart volume de départ / plafond trop grand pour la durée | Génération de la progression (section 6) | Signaler un plan trop court ou un objectif trop ambitieux — ne s'applique pas si l'ampleur de l'objectif est "faible" (le plafond effectif est déjà réduit, section 6) |
| 6 | Jours disponibles trop rapprochés (< 48h entre séances dures) | Placement dans la semaine (section 5) | Placer quand même en dernier recours, mais avec un avertissement explicite et distinct du cas normal |
| 7 | Qualité juste avant/après la sortie longue, faute d'alternative | Placement dans la semaine (section 5) | Idem — repli accepté uniquement si aucun autre jour disponible, avec avertissement dédié |
| 8 | Incohérence de plafond entre distances | Calcul des plafonds de volume (section 2) — si l'ordre 5K < 10K < Semi < Marathon est cassé pour un même profil | Garde-fou interne au moteur (pas visible utilisateur) : signale une erreur de calcul en amont, pas un vrai cas limite du coureur |
| 9 | Cumul de contraintes | Modulation par contraintes (section 7) | Pas d'addition des réductions — la règle la plus prudente parmi les contraintes cochées prime, jamais un cumul |
| 10 | Reprise après pause + estimation Strava | Modulation par contraintes (section 7) | Au-delà de la tranche "2-4 semaines", désactiver la pré-estimation automatique plutôt que risquer une valeur biaisée |

## 11. Décision d'architecture : moteur de règles

Tranché : le moteur v2.0 est un **moteur de règles**, pas des templates paramétrés pré-écrits.

**Pourquoi** : la durée du plan est variable (section 4bis, calculée depuis les dates), ce qui rend impossible un template par durée fixe — la combinatoire distance × niveau × durée × nombre de séances × contraintes explose trop vite pour être pré-écrite et maintenue à la main, incompatible avec l'objectif de commercialisation à ~500 abonnés.

**Nuance importante** : ce n'est pas "moteur pur" au sens où tout serait généré de zéro. C'est un moteur de règles **au niveau du plan** (quelles séances, quand, combien — sections 4bis, 5, 6, 7) qui pioche dans une **bibliothèque de templates au niveau de la séance** (section 2 — ex. "VMA : 2×8×30″-30″" est un template de contenu de séance, pas de plan entier). Le moteur choisit, dose et séquence ; il n'invente pas le contenu des séances individuelles à partir de rien.

Cette décision valide rétroactivement toute la logique déjà posée dans les sections 4bis, 5, 6 et 7 — elles étaient déjà écrites comme des règles calculées, pas comme des templates à choisir dans une liste.

## 12. Contenu concret des séances (implémenté)

Le moteur ne se contente plus de dire "qualité"/"EF"/"longue" — il génère la structure affichable (ex. "3×8min @ 4:59/km (Seuil), récup 2min"), validée en la comparant au format réel de ton plan Excel.

- **Rotation par distance/phase** : chaque distance a sa propre liste de sous-types de séance qualité par phase (ex. 10K Spécifique alterne VMA/Seuil), qui cycle semaine après semaine et selon l'index de la séance qualité dans la semaine (1ère vs 2ème)
- **Progression intra-phase** : le nombre de répétitions ou la durée augmente tous les ~3 semaines dans une phase donnée, avec un plafond par sous-type
- **Repli sur restriction** : si une contrainte interdit V ou I (section 7), le sous-type prévu par la rotation est automatiquement remplacé par un cran moins intense (V → I → Seuil), y compris quand la rotation naturelle serait tombée sur le sous-type interdit — testé et confirmé sur plusieurs semaines consécutives
- **EF et sortie longue** : contenu simplifié (durée fixe par repère, pas encore dérivée du volume hebdo exact — simplification assumée, à réconcilier plus tard) ; sortie longue enrichie d'un segment à allure course pour Semi/Marathon en phase Spécifique/Affûtage, cohérent avec la pratique réelle validée en section 7 de l'app existante

## 13. Réconciliation volume ↔ durée de séance (implémenté)

La simplification notée en section 12 est résolue : EF et sortie longue ont maintenant une durée dérivée du volume hebdo cible, pas un repère fixe.

- **Répartition** : le volume hebdo cible moins le kilométrage des séances qualité (estimé à partir de leur structure — reps × durée/distance × allure) donne le kilométrage restant. La sortie longue reçoit ~40% de ce reste, les EF se partagent le reste à parts égales
- **Somme exacte** : la somme des séances égale toujours le volume cible de la semaine — pas de plancher artificiel qui la dépasserait
- **Garde-fou découvert par cette réconciliation** : avec peu de séances/semaine et un volume cible élevé, une séance EF ou longue peut devenir déraisonnable (100+ minutes). Plafonds ajoutés : **75min pour l'EF**, **90-150min pour la longue selon la distance** (5K/10K : 90min, Semi : 120min, Marathon : 150min). Au-delà, la séance est plafonnée et un avertissement le signale explicitement plutôt que de produire une séance disproportionnée en silence
- **Garde-fou symétrique** (volume hebdo trop faible pour le nombre de séances) : si le kilométrage restant après les séances qualité est trop faible pour donner des séances substantielles (< 3km), un avertissement le signale aussi — pertinent en tout début de reprise ou avec un volume de départ très bas

Ces deux garde-fous s'ajoutent à la checklist de la section 10.

## 14. Corrections trouvées par validation sur d'autres profils

La validation sur 4 profils fictifs (marathon débutant 20 semaines, semi confirmé 9 semaines, 5K débutant 3 séances/sem, 10K confirmé avec contraintes cumulées) a révélé deux bugs sérieux dans le calcul du volume, invisibles sur le seul profil réel testé jusque-là :

**Bug 1 — La décharge annulait quasiment toute progression.** La formule initiale (+10%/semaine, -25% toutes les 4 semaines) s'auto-annule presque mathématiquement : 1,1³ × 0,75 ≈ 0,998. Concrètement, le volume ne progressait quasiment jamais sur la durée du plan, peu importe le nombre de semaines disponibles. Corrigé : la décharge est maintenant un creux temporaire qui ne remet pas à zéro le niveau atteint — la progression reprend depuis le pic précédent, pas depuis la valeur réduite de la décharge.

**Bug 2 — Le garde-fou de progression insuffisante comparait au mauvais repère.** Il comparait le plafond visé à la **dernière semaine du plan** (en plein Affûtage, donc délibérément réduite par le taper) plutôt qu'au **pic de volume** (fin de Spécifique, juste avant l'Affûtage). Résultat : le garde-fou se déclenchait en faux positif sur presque tous les profils. Corrigé, et un vrai taper d'Affûtage a été ajouté au passage (réduction progressive de 75% à 35% du pic selon le nombre de semaines d'Affûtage — jusque-là, l'Affûtage n'avait aucune réduction de volume réelle dans le calcul, contrairement à ce que section 1 et 2 décrivent).

**Ajustement mineur** : le garde-fou "volume hebdo trop faible pour la répartition" (section 13) ne se déclenche plus pendant l'Affûtage — des séances courtes en fin de taper sont voulues, pas un défaut.

Ces deux bugs auraient été très difficiles à détecter sur un seul profil dont l'objectif est modeste (ampleur "faible", qui désactive justement ce garde-fou) — la validation sur des profils aux objectifs plus ambitieux était donc nécessaire pour les révéler.

## 15. Bug de circularité de la semaine (trouvé par validation, 7 jours/semaine)

Un profil à 7 jours/semaine disponibles a révélé que le placement traitait la semaine comme une ligne (Lundi=0 → Dimanche=6), pas comme un cycle. Avec la sortie longue sur Dimanche, l'algorithme choisissait Lundi pour une séance qualité — "le plus loin" sur cette ligne (distance 6) — sans réaliser que Lundi suit directement Dimanche dans un vrai calendrier, violant silencieusement la règle "jamais de qualité au lendemain de la longue".

Corrigé par une distance circulaire (Dimanche↔Lundi = 1 jour d'écart, pas 6), appliquée à la fois à l'espacement des séances qualité entre elles, à l'écart avec la longue, et au garde-fou des 48h de récupération (qui vérifie maintenant aussi le bouclage fin de semaine → début de la semaine suivante, pas seulement les jours consécutifs à l'intérieur d'une même semaine).

Ce bug ne se manifestait qu'avec un nombre de jours disponibles élevé (6-7) où l'algorithme a la place de choisir un jour "loin" au sens linéaire — invisible sur les profils à moins de jours disponibles testés jusque-là.

## 16. Nettoyage — date invalide ne remonte plus de faux avertissement secondaire

Validation supplémentaire (2 séances/semaine minimum, date de course avant date de début testée via l'orchestrateur complet, contraintes cumulées sur Semi, débutant à objectif modeste) : pas de nouveau bug de fond, mais un défaut de propreté trouvé — quand la date est invalide (`DATE_INVALIDE`), le calcul de progression du volume tournait quand même sur une durée nulle et remontait un second avertissement `PROGRESSION_INSUFFISANTE` sans valeur ajoutée. Corrigé : le calcul de volume court-circuite proprement dès que la durée est nulle.

Le cas 2 séances/semaine confirme que la règle "Qualité + Longue uniquement, pas d'EF" (section 4/5) fonctionne bien en pratique, y compris avec le plafonnement de durée de la section 13.

## 17. Correction — rotation à un seul type pour Marathon/Semi en Construction

Dernière vague de validation (blessure active sur marathon, plan de 5 semaines, renforcement pendant réacclimatation) : deux points confirmés sains (renforcement toujours bien placé même sans qualité cette semaine-là ; garde-fous cohérents sur un plan très court), et un trou de contenu trouvé.

**Le trou** : Marathon et Semi n'avaient qu'un seul sous-type de séance qualité en Construction (`tempo-court` seul). Pour un profil à 2 séances qualité/semaine (ex. confirmé à 6 jours/semaine), les deux séances qualité de la semaine devenaient identiques — même durée, même allure, aucune variété — alors que 5K/10K en avaient toujours deux qui alternaient.

**Corrigé** : ajout d'un 2e sous-type pour chaque distance — **fartlek** pour le Semi (mentionné dans la section 2 comme alternative au tempo court, jamais implémenté jusqu'ici), **seuil-court** pour le Marathon (déjà existant, réutilisé). Les deux séances qualité alternent maintenant correctement, semaine après semaine.

## 18. Affinage — ratio de la sortie longue calé sur une référence sourcée

Le ratio de répartition longue/EF (section 13) était fixé à 40% du volume restant, sans justification particulière. Correction : **25-30% du volume hebdo total**, d'après Jack Daniels — cette règle est volontairement universelle (il précise explicitement "que ce soit pour un 5K ou un marathon"), donc pas de variation par distance ici, contrairement à une première tentative de complexification qui n'aurait pas été mieux sourcée. Vérifié sur le profil réel : la longue tombe maintenant à 28% du volume hebdo, pile dans la fourchette.

## 19. Différenciation des séances EF

Jusqu'ici, toutes les EF d'une même semaine recevaient un kilométrage identique. Corrigé : une EF qui suit directement (circulairement) une séance dure — qualité ou longue — devient une **EF de récupération** plus courte (poids 0,75 contre 1,0 pour une EF standard), le reste du budget EF se redistribuant sur les autres EF de la semaine. Le total reste toujours égal au budget calculé par `repartirVolumeSemaine` — pas de nouvelle incohérence avec le volume cible.

## 20. Correction — les séances qualité rétrécissent aussi pendant l'Affûtage

Trouvé en testant l'affichage du plan complet (section précédente) : les séances qualité gardaient presque leur volume de Spécifique pendant l'Affûtage, alors que le volume hebdo total chutait (taper). Résultat, sur la dernière semaine avant course : des EF de 5-7 minutes, dérisoires.

Corrigé : les répétitions/durée des séances qualité se réduisent maintenant proportionnellement à la même fraction que le volume hebdo (section 6/18), avec un plancher minimum par sous-type pour garder un vrai stimulus (ex. 2 répétitions minimum pour Seuil/allure course, pas de descente en dessous). Résultat sur la dernière semaine testée : EF à 9-11min plutôt que 5-7min — une "sortie découverte" courte à 2 jours de la course, ce qui est en fait une pratique normale, pas un signe de calcul cassé.

## 21. Correction — profondeur du taper calibrée par distance, pas générique

Retour terrain sur la section 20 : même après le plancher sur les répétitions qualité, la dernière semaine restait perçue comme trop faible. En creusant les sources, la formule générique (75%→35% du pic, quelle que soit la distance) était trop agressive — jusqu'à -65% en semaine de course, alors que même un marathon ne descend qu'à -40/-50% en pratique courante. Corrigé avec des fractions propres à chaque distance :

| Distance | Début Affûtage | Fin Affûtage (semaine de course) |
|---|---|---|
| 5K | 80% du pic | 65% du pic (réduction ~30-40%) |
| 10K | 80% du pic | 60% du pic (réduction ~35-45%) |
| Semi | 75% du pic | 55% du pic |
| Marathon | 75% du pic | 50% du pic (réduction ~40-50%) |

Sur le profil réel (10K), la dernière semaine passe de 35% à 60% du pic — des EF à 21-27min et une longue de 37min, bien plus proche de ce qu'on observerait en pratique qu'un quasi-arrêt.

## 22. Échauffement et retour au calme pour les séances qualité

Trouvé en usage réel : le moteur ne générait que le corps des séances qualité, sans échauffement ni retour au calme — contrairement à l'app v1.9.3 qui a une feuille dédiée. Corrigé :

- **EF et sortie longue** n'ont pas besoin d'échauffement séparé (l'allure facile *est* déjà l'échauffement) — seules les **séances qualité** en reçoivent un, puisqu'elles démarrent directement sur un effort proche du seuil/VMA
- Échauffement 15min + retour au calme 10min à allure EF, ajoutés au kilométrage de la séance qualité — comptés dans le volume hebdo, donc `repartirVolumeSemaine` (section 13) s'ajuste automatiquement pour compenser, sans logique supplémentaire nécessaire
- **Réduction proportionnelle pendant décharge et Affûtage** (planchers 8min échauffement / 5min RAC) : sans ça, ce coût fixe prenait une part disproportionnée du budget sur les semaines déjà réduites, écrasant les EF (7-9min sur les décharges avant correction, 11-14min après)

Le symbole "″" (secondes) utilisé pour le VMA 30-30 a aussi été remplacé par "s" — non supporté par les polices standards de jsPDF (export PDF), il s'affichait comme des caractères aléatoires. La récupération entre les séries (distincte de la récup intra-série) a été précisée dans le contenu généré.

## 23. Correction — le plafond ne descend plus sous le volume de départ réel

Signalé via un vrai export PDF (10K, volume de départ 50km/sem) : la semaine 1 affichait fidèlement le volume déclaré (50km), mais la semaine 2 chutait brutalement à 42,5km — le plafond de population pour ce profil (intermédiaire, 10K). Le volume de départ dépassait déjà le plafond visé, et la formule de croissance écrêtait sans transition, donnant l'impression d'un recul plutôt qu'une progression.

Corrigé : **le plafond ne descend jamais sous le volume de départ réel** (`plafond = max(plafond de population/ampleur, volumeDepart)`). Si quelqu'un court déjà à un volume supérieur aux repères habituels pour son profil, il n'y a aucune raison méthodologique de le faire régresser — le plafond est relevé en conséquence, et un message clair l'explique (distinct du cas "juste proche du plafond").

## 24. Décision — échauffement/RAC restent fixes, EF et longue restent sans échauffement

Comparaison avec le vrai code v1 (`index.html` de production) : v1 fait varier la durée d'échauffement selon l'intensité de la séance qualité (20min pour VMA/Test, 15min pour Seuil/Allure course), et donne même à l'EF et à la sortie longue un petit rituel d'ouverture/fermeture (footing+éducatifs, marche+étirements) — avec une distinction entre EF standard et EF récupération.

**Décision** : le moteur v2 reste plus simple, délibérément :
- **EF et sortie longue n'ont pas d'échauffement structuré** — l'allure facile fait déjà office d'échauffement, pas besoin d'ajouter un bloc distinct
- **Échauffement/RAC des séances qualité restent fixes** (15min / 10min, section 22), pas différenciés par intensité (V/I vs T/C) comme le fait v1

Choisi pour la simplicité de maintenance plutôt que pour coller exactement à v1 — un compromis assumé, pas un oubli.

## 25. Zones FC par type de séance (ajouté, validé contre v1 réel)

Ajouté au moteur : une zone FC (en % de FC max) par type de séance, dérivée de `fcMax` — jusque-là, le moteur ne calculait qu'une seule valeur (la FC max), jamais les zones par type.

| Zone | % FC max | Comparaison v1 (FC max 181) |
|---|---|---|
| Récup | 55-65% | — |
| E (EF/Longue) | 65-75% | v1 : 118-136 bpm ✅ identique |
| C (Allure course) | 85-90% | v1 : 154-163 bpm ✅ identique |
| T (Seuil) | 90-95% | v1 : 163-172 bpm ✅ identique |
| I (VMA) | 90-100% | v1 : 163-181 bpm ✅ identique |
| V (Vitesse) | 95-100% | — (pas de type équivalent dans v1) |

Les 4 zones comparables donnent des bornes en bpm **identiques** au vrai code v1 sur le profil de Laurent (FC max 181), ce qui valide au passage que les pourcentages choisis sont corrects — pas seulement une estimation plausible.

## 26. Correction — décharge classique et seuil du garde-fou trop sensible

Trouvé en usage réel (deux fois de suite sur le même problème) :

**1. Les semaines de décharge classiques (pas seulement l'Affûtage) souffraient du même trou que la section 22** : le corps des séances qualité ne rétrécissait pas pendant une décharge, seul le volume hebdo total baissait (-25%), écrasant les EF. Corrigé en étendant la réduction proportionnelle des répétitions (déjà appliquée à l'Affûtage) aux semaines de décharge — même logique, même planchers.

**2. Le garde-fou "volume trop faible pour la répartition" était devenu trop sensible** une fois l'échauffement/RAC réaliste pris en compte (section 22) : il se déclenchait dès qu'une EF de récupération (~15min, ~2,4km — parfaitement normale) tombait sous son seuil de 3km. Seuil abaissé à 2km, qui laisse passer les EF de récupération légitimes tout en continuant à détecter les vrais cas dégénérés (contraintes cumulées + volume faible, testé et confirmé).

Semaines de décharge désormais exclues de ce garde-fou (même raison que l'Affûtage, section 21) — un volume réduit avec des EF plus courtes y est voulu, pas un défaut.

## 27. Première brique de persistance — sauvegarde cloud via GitHub Gist

Premier pas vers le suivi dans le temps (nécessaire avant toute adaptation du plan selon la réalisation des séances). Implémenté :

- **Porte d'entrée unique** vers le stockage (`sauvegarderPlan()`, `chargerPlans()`) — le reste du code (wizard, PDF, affichage) ne sait pas d'où viennent les données. Objectif : pouvoir migrer vers Supabase (v2.5) en ne réécrivant que l'intérieur de ces fonctions, sans toucher au reste.
- **Implémentation actuelle : GitHub Gist**, même pattern que v1 (token GitHub personnel saisi côté client, pas de serveur intermédiaire) — réutilise la même clé de stockage local pour le token (`lk_github_token`) que v1, mais un Gist séparé et dédié au schéma de données v2 (`plan10k_v2_plans.json`), pour ne pas interférer avec la sauvegarde existante de v1
- Bouton "Sauvegarder ce plan dans le cloud" sur l'écran de résultats, avec messages d'erreur explicites (token manquant, scope insuffisant, etc.)

**Ce qui reste à faire** (chantiers suivants, pas encore commencés) :
- Suivi de complétion des séances (✅/⚠️/❌ comme v1)
- Interface pour charger/consulter les plans précédemment sauvegardés
- Règles d'adaptation du plan selon les résultats réels — le vrai chantier méthodologique, pas encore abordé

## 28. Suivi de complétion des séances (✅/⚠️/❌)

Deuxième brique du chantier "adaptation du plan" (après la persistance, section 27). Chaque séance qualité/EF/longue affichée dans le plan complet a maintenant une icône cliquable (⬜ par défaut) qui cycle entre réussie (✅) / adaptée (⚠️) / ratée (❌) / non marquée, au clic — même principe que v1.

Détails techniques :
- Chaque plan généré reçoit un **identifiant stable** (`plan.id`, UUID) dès la génération, pour que la sauvegarde mette à jour le plan existant dans le Gist plutôt que d'en créer un doublon à chaque fois qu'un statut change
- Les statuts sont stockés dans `plan.statuses` (clé `"semaine-jour"` → statut), inclus automatiquement dans la sauvegarde cloud

Bug trouvé et corrigé pendant l'implémentation : les fonctions de rendu (`renderSemaineHtml`, `rafraichirPlanComplet`) étaient imbriquées dans `renderResults`, invisibles depuis `cycleStatutSeance` (portée JS) — sorties au niveau global.

**Toujours pas fait** : les vraies règles d'adaptation (comment le plan devrait réagir aux statuts accumulés) — c'est le morceau le plus important, encore entièrement à faire.

## 29. Interface de rappel des plans sauvegardés

Troisième brique du chantier persistance/suivi. Au chargement de `/v2`, si un token GitHub est déjà connu (stocké dans le navigateur), un bloc "Plans sauvegardés" apparaît sur le tout premier écran du wizard — liste triée du plus récent au plus ancien, avec le nombre de séances déjà marquées visible en un coup d'œil. Cliquer sur un plan le recharge directement à l'écran de résultats (allures, plan complet, statuts déjà cochés inclus), sans repasser par le wizard.

**Limite connue** : si c'est la toute première visite sur cet appareil/navigateur (token pas encore renseigné), la liste ne s'affiche qu'après avoir sauvegardé un premier plan — pas de vérification automatique après la saisie du token sur l'écran de résultats. Suffisant pour l'usage réel (le token, une fois entré, reste stocké), mais à améliorer si besoin plus tard.

Avec cette brique, les trois fondations du chantier "adaptation du plan" sont posées : persistance (27), suivi de complétion (28), rappel (29). **La partie la plus intéressante — les vraies règles d'adaptation selon les résultats — reste entièrement à faire.**

## 30. Renommage et suppression des plans sauvegardés

Complète la brique de rappel (section 29) : chaque plan peut maintenant être **nommé** (champ optionnel au moment de la sauvegarde, ou icône ✏️ pour renommer après coup) et **supprimé** (icône 🗑️, avec confirmation).

Point important sur l'implémentation : les trois opérations (sauvegarder, renommer, supprimer) partagent désormais une seule fonction d'écriture (`ecrireListePlans`), qui fait toujours un **PATCH** sur le Gist existant — jamais un DELETE du Gist lui-même. Supprimer un plan retire seulement son entrée de la liste stockée dans le Gist ; le Gist continue d'exister avec les autres plans dedans. Les identifications se font par `id` (pas par index de tableau), pour rester correctes même après une suppression qui décale les positions.

## 31. Correctif — migration automatique des plans sauvegardés sans id

Un plan sauvegardé avant l'ajout de l'identifiant (section 28) n'en avait pas, rendant renommer/supprimer impossibles pour lui spécifiquement (rien à quoi les boutons puissent s'accrocher). Corrigé par une migration automatique : au chargement (`chargerPlans`), tout plan sans `id` en reçoit un immédiatement, et la liste complète est réécrite dans le Gist — transparent, pas d'action manuelle nécessaire.

## 32. Modification d'objectif sur un plan existant

Ajouté : un plan chargé (généré, ou rappelé depuis la sauvegarde) peut maintenant voir son objectif modifié directement sur l'écran de résultats, sans repasser par tout le wizard. Régénère le plan avec le même id (mise à jour en place si sauvegardé), et repart d'un suivi de complétion vierge (les statuts de l'ancien objectif n'ont plus de sens si les séances ont changé).

**Prérequis découvert en le construisant** : le plan sauvegardé ne conservait jusqu'ici que le résultat généré, pas les paramètres d'origine (profil, dates, contraintes) — impossible de régénérer sans ça. Corrigé en conservant `profilOrigine`/`paramsOrigine` dans chaque plan généré. Les plans sauvegardés avant ce correctif ne peuvent pas être régénérés directement (message clair à la place d'un crash) — il faut repasser par le wizard pour ceux-là.

## 33. Règles d'adaptation du plan — définies mais pas encore implémentées

Sourcé via une recherche combinant littérature sportive générale (ACWR — acute:chronic workload ratio, Gabbett 2016 et méta-analyses ultérieures) et retours de coachs de course à pied spécifiquement (Jason Koop/CTS Ultrarunning en particulier). Règles retenues :

- **Seuil de déclenchement** : pas une séance isolée, mais un pattern — score cumulé ≥ 2 sur les séances dures (qualité + longue) de la semaine en cours, avec ratée = 1 point, adaptée = 0,5 point, réussie = 0. Les EF ne comptent pas dans ce score (cohérent avec la priorité "rattraper les séances clés" de la littérature).
- **Action** : la semaine suivante est traitée comme une décharge supplémentaire — réutilise le mécanisme de décharge déjà construit et validé (sections 22/26 : réduction ~25% du volume et des répétitions qualité, mêmes planchers), plutôt qu'un nouveau système parallèle.
- **Non-cumul** : si la semaine suivante était déjà une décharge programmée, une seule réduction s'applique (la décharge programmée absorbe l'adaptation) — pas de double réduction.
- **Pas de décalage en cascade** : le calendrier des phases (Construction/Spécifique/Affûtage) et le cycle des décharges normales restent fixes, même après une décharge d'adaptation hors cycle — plus simple, et cohérent avec l'esprit "redémarrer prudemment" de la recherche.
- **Garde-fou sur la répétition** : si l'adaptation se déclenche 3 semaines de suite, avertissement explicite à la personne (le plan semble trop ambitieux compte tenu de sa disponibilité réelle) — jamais d'action automatique sur l'objectif ou le plafond, cette décision reste humaine.

**Toujours pas implémenté dans le code** — ce sont les règles convenues, la prochaine étape est de les traduire en logique dans le moteur (calcul du score par semaine à partir de `plan.statuses`, déclenchement de la décharge d'adaptation).

## 34. Règles d'adaptation — implémentées

Les règles définies en section 33 sont maintenant codées et testées (4 scénarios validés : rien à adapter, adaptation simple, non-cumul avec décharge programmée, garde-fou 3 adaptations consécutives).

**Fonctions ajoutées au moteur** :
- `calculerScoreSemaine(semaine, statuses)` — score d'une semaine à partir des statuts des séances dures (qualité + longue uniquement), retourne `null` si la semaine n'a aucun statut enregistré (pas encore vécue)
- `analyserAdaptations(plan)` — détermine quelles semaines doivent être adaptées, et compte les déclenchements consécutifs
- `appliquerAdaptations(plan)` — régénère le contenu des semaines concernées en réutilisant telles quelles les fonctions existantes (`genererContenuQualite` avec `estDechargeSemaine: true`, `repartirVolumeSemaine`, `differencierEF`, `genererContenuEF`, `genererContenuLongue`) — aucune nouvelle mécanique de réduction, juste la décharge classique appliquée hors cycle

**Interface** : bouton "🔄 Analyser les résultats et adapter le plan" sur l'écran de résultats — mute le plan en mémoire, l'affiche immédiatement, et le re-sauvegarde automatiquement si un token est déjà connu.

**Limite assumée** : comme pour la modification d'objectif (section 32), l'adaptation automatique nécessite `profilOrigine`/`paramsOrigine` — les plans sauvegardés avant cet ajout ne peuvent pas être adaptés (message clair plutôt qu'un crash).

**Ce qui reste hors scope pour l'instant** (documenté comme piste future, pas commencé) : la comparaison allure/FC réelles (via Strava) contre les zones attendues, pour détecter qu'une séance était trop facile et suggérer — jamais imposer — une hausse du plafond de volume. Nécessiterait une vraie intégration Strava dans v2, qui n'existe pas aujourd'hui.

## 35. Correctif — les adaptations peuvent maintenant être annulées

Trouvé en usage réel : le bouton "Analyser et adapter" modifiait le plan **en place, de façon cumulative** — une fois une semaine marquée "adaptée", rien ne pouvait revenir en arrière si on corrigeait un statut mal saisi par erreur (ex. une séance notée "ratée" par erreur, remise en "réussie" après coup).

Corrigé : chaque analyse repart maintenant d'une **régénération propre** du plan à partir de `profilOrigine`/`paramsOrigine`, puis ré-applique les adaptations selon les statuts *actuels* — plutôt que d'empiler des modifications sur un état déjà modifié. Concrètement, si les statuts qui avaient déclenché une adaptation sont corrigés, la prochaine analyse "oublie" cette adaptation qui ne se justifie plus. Testé et confirmé sur le scénario exact (2 séances marquées ratées par erreur → adaptation appliquée → corrigées en réussies → nouvelle analyse → adaptation bien annulée).

## 36. Séance de confirmation d'allure — ajoutée, placée vers la fin de Spécifique

Trouvé en comparant avec v1 (qui a un vrai type `"TEST"` lié à un système de prédiction) : le moteur v2 ne recalibrait jamais les allures en cours de plan — calculées une fois à la génération, figées jusqu'à la fin. Ajouté : une séance unique par plan.

**Deux principes existent et sont tous deux sourcés — retenu celui qui correspond à la pratique réelle de l'utilisateur** :
- Time trial (distance courte, effort maximal, "jauge" de forme extrapolée via Riegel) — première version implémentée, écartée ensuite
- **Confirmation d'allure (retenu)** : courir une portion de la distance de course **à l'allure objectif** (pas à fond) — principe "goal pace confirmation workout" (McMillan, Hal Higdon), qui vérifie que l'allure visée est *tenable dans la durée*, pas la forme maximale. Correspond à la pratique réelle de l'utilisateur sur ses préparations précédentes (5-6km à allure course pour un 10K).

**% de la distance de course à l'allure objectif, par distance** :

| Distance | % à l'allure course | Tampon avant l'Affûtage |
|---|---|---|
| 5K | ~60% | 1 semaine |
| 10K | ~55% (5,5km pour un 10K — correspond à la pratique réelle) | 1 semaine |
| Semi | ~35% | 2 semaines |
| Marathon | ~25% (cohérent avec le segment allure course déjà en fin de sortie longue) | 2 semaines |

**Découverte notable** : le moteur fait déjà ce genre de segment à l'allure course en fin de sortie longue pour Semi/Marathon (`avecSegmentCourse`, 25% de la longue) — la séance de confirmation d'allure réutilise le même principe, pas un nouveau mécanisme.

**Durée calculée, pas fixe** : la durée en minutes découle de la distance calculée × l'allure course réelle de la personne (comme le reste du moteur), pas un chiffre universel — un coureur plus rapide ou plus lent aura une durée différente pour la même distance.

Placement (tampon avant Affûtage, plancher si Spécifique trop courte) et implémentation technique (recalcule EF/longue de la semaine, réutilise `repartirVolumeSemaine`/`differencierEF`) inchangés par rapport à la version time trial.

## 37. Correction — même bug de rotation à un seul type, mais en Affûtage cette fois

En repassant systématiquement la table de rotation à la recherche d'autres trous (même bug que la section 17, mais jamais vérifié pour l'Affûtage) : Semi et Marathon n'avaient qu'**un seul type de contenu qualité en Affûtage** (`allure-course-court` seul, `tempo-court` seul). Pour un profil à 2 séances qualité/semaine, les deux devenaient identiques — confirmé concrètement sur un profil confirmé 6j/semaine avant correction.

Corrigé : ajout d'un 2e type par distance — `seuil-court` pour Semi (alterne avec `allure-course-court`), `allure-course-court` pour Marathon (alterne avec `tempo-court`) — réutilise des sous-types déjà implémentés, pas de nouveau contenu à créer.

## 38. Deux nouveaux types de séance — pyramidale et seuil négatif

Ajoutés en phase Spécifique (5K/10K/Semi pour la pyramidale, 10K/Semi/Marathon pour le seuil négatif) pour varier davantage les plans longs, tout en gardant les séances de base largement majoritaires :

- **Pyramidale** : montée-descente 2-3-4-3-2min à allure VMA, récup égale au temps de l'effort — fréquence **1/12** des séances qualité
- **Seuil négatif** : deux blocs de seuil enchaînés sans récup, le second nettement plus rapide (interpolation 30% vers l'allure VMA) — fréquence **2/12**

Vérifié sur un plan long (10K confirmé, ~9 mois) : fréquences réelles observées ~7% (pyramidale) et ~15% (seuil négatif), cohérentes avec les cibles 1/12 (8,3%) et 2/12 (16,7%).

**Corrigé au passage** : `pyramidale` utilise l'allure VMA (I) mais n'était pas reconnue par le mécanisme de repli existant (section 7, contraintes interdisant certaines allures) — ajoutée à la détection, sinon une contrainte "sans VMA" n'aurait pas déclenché de repli pour cette séance spécifiquement.

Le Marathon n'a volontairement pas reçu la pyramidale (moins pertinente pour cette distance, phase Spécifique plus orientée seuil/allure course qu'intervalles VMA).

## 39. Nettoyage — factorisation du recalcul EF/longue (dupliqué 3 fois)

Le bloc "répartir le volume entre EF et longue puis régénérer leur contenu" était dupliqué à l'identique à trois endroits (génération initiale, `appliquerAdaptations`, `placerSeanceTest`) — même code copié-collé avec de petites variations. Factorisé en une seule fonction `recalculerRepartitionEFLongue`, appelée aux trois endroits.

**Bug secondaire trouvé et corrigé au passage** : les avertissements de plafonnement (`SEANCE_EF_PLAFONNEE`, `SEANCE_LONGUE_PLAFONNEE`) n'étaient remontés que par la génération initiale — `appliquerAdaptations` et `placerSeanceTest` les calculaient bien en interne mais les jetaient silencieusement, sans jamais les ajouter aux avertissements du plan. La factorisation corrige ça naturellement : les trois appelants remontent maintenant les mêmes avertissements de la même façon.

Testé et confirmé : les trois usages (génération, adaptation, séance test) produisent des résultats identiques à avant, et un vrai cas de plafonnement (3 jours/semaine, volume élevé) remonte bien 9 avertissements.

## 40. Intégration Strava — pré-remplissage du volume de départ

Première étape concrète du chantier "intégrer les bons morceaux de v1 dans v2" (décidé après Gem'Aubagne, mais commencée dès maintenant pour ce morceau précis). Le champ "volume actuel" du wizard (étape 3), jusqu'ici un placeholder statique à 32km, se remplit maintenant automatiquement depuis Strava.

**Réutilise le point d'entrée serverless existant de v1** (`api/strava.js`) plutôt que d'en créer un nouveau — une seule modification a minima : le `/callback` redirige maintenant vers `/v2` si un paramètre `state=v2` a été transmis à `/auth`, sinon vers `/` comme avant (comportement de v1 inchangé par défaut, aucun risque de régression).

**Côté wizard** :
- Bouton "📡 Connecter Strava" si pas encore connecté, sinon calcul automatique
- Tokens stockés sous des clés distinctes de v1 (`v2_strava_*`), pas de conflit entre les deux sessions Strava
- Rafraîchissement automatique du token si expiré, avant chaque requête
- Médiane (pas moyenne, cohérent avec la doc existante) du volume hebdomadaire sur les 8 dernières semaines glissantes
- Si pas assez d'historique ou erreur : bascule automatique en saisie manuelle avec message explicite

Testé (mock) : calcul de médiane exact sur 8 semaines simulées, affichage correct connecté/non connecté, capture et nettoyage des tokens depuis l'URL de retour OAuth.

**Déploiement** : remplacer `api/strava.js` (même chemin qu'avant) — aucune nouvelle variable d'environnement nécessaire, réutilise `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` déjà configurées pour v1 sur Vercel.

**Reste à faire** (chantier suivant) : comparer allure/FC réelles des séances aux zones attendues — nécessite de résoudre l'appariement activité Strava ↔ séance prévue du plan.

## 41. Strides sur les EF de Construction — variété du stimulus, pas du volume

Suite à un audit de la variété perçue en phase Construction (17/07/2026) : chaque distance n'a que **2 sous-types de séance qualité** en Construction (contre 5-6 en Spécifique, cf. `ROTATION_SOUS_TYPE`), ce qui donne l'impression d'une répétition mécanique sur plusieurs semaines — seule la charge (répétitions, durée) progresse, pas la nature de l'effort.

**Recherche complémentaire à Daniels** (littérature convergente, tradition Lydiard/base aérobique moderne, Runners Connect, Coach Saltmarsh) : les **strides** (accélérations courtes et contrôlées, ~15-20s à ~95% de la vitesse maximale, récupération complète) sont le stimulus le mieux adapté à la phase de base — risque quasi nul, distinct du travail VMA déjà présent (`i-30-30`/`i-3min`), entretient l'économie de course et l'efficacité neuromusculaire sans faire progresser le VO2max ni ajouter de charge significative.

**Différence structurelle avec toutes les séances qualité existantes** : pas d'allure chiffrée. Contrairement à `seuil`/`i-3min`/`vitesse`/`allure-course` qui calculent tous une allure précise (T/I/V/C) dans `structureIntervalles.allure`, les strides se pilotent au ressenti — une allure fixe en min/km n'aurait pas de sens pour ce type d'effort. Le champ `allure` est donc une chaîne descriptive ("accélération progressive jusqu'à un effort vif mais contrôlé"), pas un pace formaté.

**Décision de ciblage** (délibérément restrictive, pour ne jamais entrer en conflit avec les limites déjà validées) :
- **Uniquement en phase Construction** — Spécifique a déjà une rotation riche (section 38), Affûtage doit éviter tout stimulus superflu avant course
- **Uniquement sur les EF `role: "standard"`** — jamais sur les EF `role: "recuperation"` (jour de vraie récupération, pas d'ajout d'intensité)
- **Fréquence cyclique** : 1 EF standard sur 2 (compteur sur les occurrences d'EF standard rencontrées, pas un jour fixe dans la semaine) — s'adapte automatiquement au nombre réel d'EF standard du plan, quel que soit le niveau/mode, sans cas particulier à coder par mode

**Implémentation** : nouvelle fonction `injecterStrides(semaines, alluresSec)`, même pattern que `injecterNotesPratiques`/`injecterJalonsTransition` (mute `semaines` en place, s'exécute après que les séances aient leur contenu final). Ajoute le texte des strides à la suite du contenu EF existant, incrémente légèrement `kmEstime` (~0,3km pour 4×20s, estimé à partir de l'allure V) — pour que le moteur de décision (ACWR, charge) ne traite pas une EF+strides comme une EF pure, même si l'écart de charge réel est marginal. Un nouveau champ structuré `seance.strides` (repetitions, dureeEffortSec, allure descriptive) est aussi posé, cohérent avec le principe déjà en place que `structureIntervalles` ne doit jamais être reparsée depuis le texte (section 22).

**Audit de non-conflit avec les limites déjà validées** (17/07/2026, sur GEM'AUBAGNE) : le volume ajouté par les strides (~0,3km/semaine sur un plan à 40-42,5km) est trop marginal pour affecter la limite Daniels sur le seuil (≤10% du volume hebdo en T) ou la distribution 80/20 (Seiler) déjà vérifiées conformes sur ce plan — pas de nouveau garde-fou nécessaire.

## Sources consultées

- Jack Daniels' Running Formula — zones VDOT (E/M/T/I/R, adaptées en Récup/E/C/T/I/V dans ce document ; M devient C "Allure course objectif", généralisée à toute distance et non réservée au marathon, et Récup ajoutée comme zone distincte — corrections validées sur plan réel)
- Hal Higdon — plans 5K, 10K, semi-marathon (novice à avancé)
- Runners Connect — physiologie des séances 5K (VO2max, seuil lactique)
- The Running Channel, TrainingPeaks, Marathon Handbook — structuration et taper marathon
- CorrerJuntos, HikingManual, Trainero — structuration semi-marathon en 12 semaines
- Tradition Lydiard (base aérobique moderne), Runners Connect, Coach Saltmarsh — strides comme stimulus neuromusculaire de phase de base (section 41)
