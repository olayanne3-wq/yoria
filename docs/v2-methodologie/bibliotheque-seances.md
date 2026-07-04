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

## Sources consultées

- Jack Daniels' Running Formula — zones VDOT (E/M/T/I/R, adaptées en Récup/E/C/T/I/V dans ce document ; M devient C "Allure course objectif", généralisée à toute distance et non réservée au marathon, et Récup ajoutée comme zone distincte — corrections validées sur plan réel)
- Hal Higdon — plans 5K, 10K, semi-marathon (novice à avancé)
- Runners Connect — physiologie des séances 5K (VO2max, seuil lactique)
- The Running Channel, TrainingPeaks, Marathon Handbook — structuration et taper marathon
- CorrerJuntos, HikingManual, Trainero — structuration semi-marathon en 12 semaines
