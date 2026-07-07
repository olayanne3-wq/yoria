# Convergence v1 → v2 — Run by Léa

Document de suivi du chantier : faire produire par le moteur générique v2 (`plan-generator.js`) un plan aussi riche que le plan v1 actuel de Laurent (`const PLAN` codé en dur dans `public/index.html`), affiché via l'interface v1 (design conservé).

**Contexte et décision de calendrier** (posée le 6 juillet 2026) : ce chantier est un investissement produit pour l'app finale commercialisée — le moteur v2 doit devenir l'unique source de vérité, quel que soit le profil/objectif de l'utilisateur, pas seulement celui de Laurent. **v1 reste l'outil de suivi quotidien réel jusqu'à Gem'Aubagne (6 septembre 2026)** ; ce chantier se construit en parallèle, sans urgence, et ne remplace v1 qu'après validation post-course.

---

## 1. Principe directeur

Pour chaque écart identifié entre v1 et v2, une décision est prise : **combler** (ajouter au moteur v2), **abandonner** (garder l'approche v2 plus simple), ou **reporter** (décision à prendre plus tard, dépend d'un autre chantier).

Le moteur reste générique : rien de ce qui est ajouté ne doit être spécifique à Laurent ou à Gem'Aubagne — les exemples ci-dessous s'appuient sur son plan actuel mais toute règle ajoutée doit s'exprimer en fonction de paramètres (distance, phase, conditions), pas de valeurs codées en dur.

## 2. Écarts identifiés

### 2.1 Structure warmup / session / cooldown séparés

- **v1** : 3 champs distincts (`warmup`, `session`, `cooldown`) par séance, ex. `"10' footing + éducatifs"` / `"38 min @ 6:20/km"` / `"10' marche + étirements"`
- **v2** : un seul champ `contenu` fusionné, ex. `"20min à allure EF (6:10/km) — 3.2km"`
- **Décision : ABANDONNÉ.** Laurent valide l'approche v2 (bloc unique) comme référence pour le produit final — pas de perte jugée significative sur ce point. *(décidé le 6 juillet 2026)*

### 2.2 Notes contextuelles dynamiques (météo)

- **v1** : notes conditionnelles liées aux conditions du jour, ex. `"Chaleur > 28°C → 6:40/km"` sur une séance EF
- **v2** : aucun mécanisme de note contextuelle ; le moteur ne reçoit aucune donnée externe (météo ou autre)
- **Décision : À COMBLER — avec une vraie donnée météo (pas une note générique).**

**Décision technique — décidée le 6 juillet 2026 :**

Contrainte de fond actée d'emblée : une prévision météo n'a de sens que proche de la date réelle de la séance — impossible de connaître la météo à J+60 au moment de la génération du plan. Ce n'est donc pas une note injectée une fois pour toutes à la génération (contrairement à 2.3/2.5), mais un **second passage**, déclenché plus près du jour J, qui enrichit une séance déjà générée.

- **Fenêtre de rafraîchissement** : la veille de la séance (pas de rafraîchissement continu dans une fenêtre J-7) — suffisant en pratique, plus simple à implémenter qu'un système qui réévalue à chaque ouverture de l'app
- **Source de localisation** : géolocalisation de l'utilisateur (GPS), pas une ville renseignée manuellement au profil
- **Seuil de déclenchement** : 28°C, repris tel quel de v1, fixe (pas de variation par profil pour l'instant — un seuil adaptatif à la tolérance individuelle à la chaleur est une amélioration possible mais non retenue à ce stade, faute de donnée fiable pour le calibrer)

**Implication technique** : nécessite une API météo externe et un mécanisme applicatif qui tourne à un moment différent de la génération du plan (ex: notification/vérification quotidienne plutôt qu'un calcul unique). C'est le seul écart de ce document qui a une dépendance externe (API tierce) en plus du travail sur le moteur lui-même.

**Choix de l'API météo — tranché le 6 juillet 2026 :** [Open-Meteo](https://open-meteo.com/), retenu pour l'absence totale de friction (pas de clé API, pas d'inscription, endpoint HTTP GET simple, JSON) et un volume gratuit large (10 000 appels/jour en usage non commercial) — largement suffisant pour l'usage prévu ici (un appel par utilisateur actif la veille de sa séance). Limite explicitement actée : la gratuité d'Open-Meteo est conditionnée à un usage non commercial ; **choix assumé de migrer plus tard si besoin** une fois la v2.5 (commercialisation) engagée, plutôt que de sur-anticiper maintenant un fournisseur payant (ex. OpenWeatherMap) pour un besoin qui n'existe pas encore.

- **Statut : non commencé** (mécanisme de déclenchement quotidien reste à faire — le choix d'API est tranché).

### 2.3 Notes pratiques par type de séance (hors météo)

- **v1** : conseils pratiques ponctuels sur certains types de séance, ex. sortie longue → `"Hydratation++ · Allonge selon la forme"`
- **v2** : aucune note de ce type actuellement
- **Décision : À COMBLER.**

**Décision technique — décidée le 6 juillet 2026 :** même mécanisme que 2.5 (banque de variantes pré-écrites par type de séance, tirée au sort à la génération, fusionnée dans le champ `contenu`), déclenché par type de séance plutôt que par transition de phase. Première proposition de banque, à étoffer :

| Type de séance | Variantes proposées (à tirer au sort) |
|---|---|
| Sortie longue | "Hydrate-toi bien avant et pendant si besoin." / "Emporte de quoi boire si tu pars plus d'1h." |
| Seuil | "Effort contrôlé — tu dois pouvoir tenir une phrase courte, pas plus." |
| VMA / Vitesse | "Récupération complète entre les répétitions — pas de course contre la montre sur la récup." |

- **Statut : non commencé** (implémentation de la banque de variantes dans le moteur).

### 2.4 Repères qualitatifs sur séances dures (ressenti, progression relative)

- **v1** : notes variables sur les séances Seuil/VMA, jamais génériques — deux natures observées :
  - Repère de ressenti/allure d'effort (test de la parole), ex. Seuil semaine 1 → `"Effort contrôlé, 3–4 mots max"`
  - Repère de progression relative (comparaison à une séance antérieure similaire), ex. VMA semaine 5 → `"Volume VMA identique S1, fatigue cumulée"`
- **v2** : le contenu technique (allures, répétitions, structure) est déjà solide et progresse correctement d'une semaine à l'autre (vérifié : 3×6' semaine 1 → 4×6' semaine 5 sur le Seuil, structure cohérente), mais **aucune note d'accompagnement** de ce type n'est produite
- **Décision : À COMBLER.** Distinct du point 2.2/2.3 (météo/pratique) : celui-ci concerne spécifiquement le repère qualitatif sur l'effort lui-même et sa place dans la progression. Pour la note de progression relative en particulier, le moteur devrait pouvoir comparer une séance à son équivalent d'une semaine antérieure (même sous-type de séance qualité) — nécessite un mécanisme de lookup dans l'historique du plan déjà généré, pas juste un calcul local à la semaine courante.

**Décision technique — décidée le 6 juillet 2026 :**

Les deux natures de note se traitent différemment :

- **Repère de ressenti** (ex. "Effort contrôlé, 3-4 mots max") : même mécanisme que 2.3/2.5 — banque de variantes pré-écrites par famille de séance qualité (Seuil / VMA / Vitesse), tirée au sort à la génération.
- **Repère de progression relative** (ex. "Volume VMA identique S1, fatigue cumulée") : nécessite un mécanisme de comparaison. Retenu : comparer par **famille de séance** (Seuil vs Seuil, VMA vs VMA), pas par sous-type exact (`seuil-court` vs `seuil-long`) — un sous-type exact identique est peu probable d'une occurrence à l'autre vu que le contenu varie naturellement au fil du plan, la comparaison ne se déclencherait quasiment jamais. La famille se déduit du `sousType` existant (regroupement simple, ex. tout `seuil-*` → famille "seuil").

*Format d'intégration* : fusionné dans le champ `contenu`, comme les autres notes de ce document (2.1, 2.3, 2.5).

- **Statut : non commencé** (banque de variantes ressenti + mécanisme de comparaison par famille à implémenter).

### 2.5 Jalons narratifs aux moments de transition du plan

- **v1** : notes signalant un moment charnière du plan plutôt qu'un conseil de contenu — vérifié systématiquement sur tous les jours de repos du plan (la grande majorité n'ont aucune note ; les seules qui en ont coïncident avec une transition de phase) :
  - `"Dernière longue avant affûtage · Allonge selon la forme"` (dernière sortie longue avant la coupure de volume)
  - `"Début affûtage"` (première séance de la phase `affutage`)
  - `"Début pic de forme"` (première séance de la phase `pic`)
  - `"Fin affûtage ✨ · Très tranquille"` (dernières séances avant course)
- **v2** : aucun mécanisme de ce type — les phases existent dans la donnée (`plan.semaines[].phase`) mais rien n'accompagne le passage d'une phase à l'autre pour l'utilisateur
- **Décision : À COMBLER.** Contrairement aux points précédents (conseils techniques), celui-ci relève de l'accompagnement de l'expérience utilisateur aux moments clés — vaut le coup indépendamment du reste, relativement simple à détecter techniquement (première/dernière semaine d'une phase, ou changement de phase par rapport à la semaine précédente).

**Décision technique — décidée le 6 juillet 2026 :**

*Règle de détection*, générique (pas de date/phase codée en dur pour Laurent) :
- **Début de phase** : `semaine.phase !== semainePrecedente.phase` → première semaine d'une nouvelle phase
- **Fin de phase** : `semaine.phase !== semaineSuivante.phase` → dernière semaine avant un changement de phase
- **Dernière sortie longue avant Affûtage** : cas particulier — dernière séance de type `longue` dans la dernière semaine où `phase !== 'Affutage'`

*Format d'intégration* : fusionné dans le champ `contenu` existant (pas un champ séparé type `noteTransition`) — cohérent avec la décision 2.1 (champ unique plutôt que warmup/session/cooldown/notes séparés).

*Variété des messages* : banque de variantes pré-écrites par jalon, tirée au sort à la génération du plan (pas d'appel API pour ce cas — enjeu trop faible par rapport au coût/latence/dépendance réseau ajoutés ; un appel API aurait plus de sens pour du coaching réactif à la progression réelle, cf. `lea-coach.js` dans la roadmap, pas pour une phrase d'encouragement ponctuelle). Première proposition de banque, à étoffer :

| Jalon | Variantes proposées (à tirer au sort) |
|---|---|
| Dernière longue avant Affûtage | "Dernière sortie longue avant l'affûtage — allonge un peu si la forme le permet." / "C'est la dernière grosse sortie avant de lever le pied. Profites-en." |
| Début Affûtage | "Entrée en affûtage : le volume baisse, l'intensité reste." / "Le gros du travail est fait — place à la récupération active avant le jour J." |
| Début phase Spécifique | "Début de la phase spécifique : place aux séances à allure course." / "On rentre dans le dur — les séances vont maintenant coller à ton allure objectif." |
| Dernières séances avant course | "Dernières séances avant le jour J — reste tranquille." / "Presque prêt. Ces derniers jours ne servent qu'à arriver frais." |

- **Statut : non commencé** (implémentation de la détection + banque de variantes dans le moteur).

### 2.6 Cohérence narrative de la semaine entière autour de la séance test

- **v1** : la semaine contenant la séance test (semaine 4 dans le plan actuel) est construite comme un tout cohérent autour de cet objectif, pas seulement la séance elle-même :
  - Note du lundi : `"Semaine test"` (annonce dès le début de semaine)
  - Veille du test : `"Jambes fraîches pour le test demain — très facile"`
  - Jour du test : `"🎯 SÉANCE TEST CLEF ! Si ça passe → viser sub-48'"`
  - Lendemain : `"Très facile · Récupération après le test"`
- **v2** : la séance test elle-même est déjà bien marquée (`sousType: "test"`, `estTest: true`) et son contenu technique est bon (comparable à v1 — "sert à confirmer/recalibrer ton allure objectif"), **mais** les séances EF qui l'entourent (veille, lendemain) restent génériques, sans lien narratif explicite avec le test à venir/passé
- **Décision : À COMBLER.** Le plus structurant des écarts identifiés à ce jour : contrairement aux points 2.4/2.5 (une note isolée sur une séance), celui-ci demande que le moteur *sache*, au moment de générer les séances EF adjacentes à la séance test, qu'elles sont adjacentes à un moment clé — pas juste ajouter une note indépendante à chaque séance individuellement. Nécessite que la génération de contenu EF puisse recevoir un contexte du type "veille de test" / "lendemain de test", pas seulement son propre type/rôle actuel (`standard`/`recuperation`).

**Décision technique — décidée le 6 juillet 2026 :**

Réduit à deux mécanismes, dont un seul vraiment nouveau par rapport aux autres points de ce document :

1. **Détection du contexte (nouveau)** : le moteur construit déjà toute la semaine (`assignment` avec les 7 jours) avant de la finaliser. Une fois la séance test placée, regarder le jour juste avant et juste après et leur assigner un rôle supplémentaire (`role: 'veille-test'` / `role: 'lendemain-test'`), en plus du rôle existant (`standard`/`recuperation`).

2. **Banque de variantes pour ces deux rôles (réutilise le mécanisme déjà tranché en 2.3/2.4/2.5)** :
   - Veille de test : "Jambes fraîches pour demain — reste facile." / "Rien à prouver aujourd'hui, garde de l'énergie pour demain."
   - Lendemain de test : "Récupération après l'effort d'hier." / "Jambes qui tournent tranquillement après le test."

3. **La note "Semaine test" en tête de semaine ne demande pas de mécanisme séparé** : c'est en fait un jalon de transition au sens large (entrée dans une semaine à enjeu particulier), qui rejoint le mécanisme déjà tranché en 2.5 — à ajouter comme jalon supplémentaire dans sa banque de variantes plutôt qu'un système à part.

Cette réduction simplifie beaucoup l'ampleur de ce qui semblait être le plus complexe des écarts : seule la détection du contexte veille/lendemain (point 1) est réellement nouvelle, le reste réutilise des mécanismes déjà actés dans ce document.

- **Statut : non commencé** (détection du contexte veille/lendemain-test + banques de variantes associées).

### 2.7 Traitement du jour de course et de la semaine d'approche (écart majeur)

- **v1** : la dernière semaine (semaine 11) est extrêmement détaillée à trois niveaux :
  - **Repères J-X explicites** par rapport à la course : `"J–3 : footing léger uniquement"` (jeudi)
  - **Consignes logistiques/nutritionnelles jour par jour**, indépendantes du contenu d'entraînement : `"Hydratation, sommeil"` (J-2), `"Pâtes le soir, coucher tôt"` (veille)
  - **Stratégie de course fractionnée par segment** sur la séance du jour J elle-même : `"Km 1-3 prudent · Km 4-7 : 4:51/km · Km 8-10 : tout donner !"`, avec un type de séance dédié (`type: "RACE"`)
- **v2** : **`dateCourse` n'est utilisée que pour calculer la durée des phases** (`computePhases`) — le moteur ne traite jamais le jour de la course comme un cas particulier. Vérifié concrètement : la dernière semaine générée produit un dimanche `"longue"` générique (37min EF, 6km), pas une séance de course avec stratégie de segments. Il n'existe aucun type de séance `race`/`course` dans le moteur actuel.
- **Décision : À COMBLER — priorité haute.** Contrairement aux écarts précédents (notes d'accompagnement manquantes sur un contenu déjà correct), celui-ci est une vraie fonctionnalité manquante : le moteur ne sait pas produire de séance de course, ni de semaine d'approche structurée avec repères J-X. À traiter avant les autres points de ce document si l'ordre de traitement doit suivre un critère d'impact plutôt que d'ordre chronologique de découverte.

**Stratégie de pacing par distance — décidée le 6 juillet 2026, à partir de la littérature (voir sources en fin de section), explicitement pour un public amateur/intermédiaire (l'app ne s'adresse pas à un public élite ; les données élite citées ci-dessous servent de contraste, pas de référence à appliquer telle quelle) :**

| Distance | Structure recommandée | Rationnel |
|---|---|---|
| 5K | Quasi-plat, très légère progression. 1er km 3-5s/km plus lent que l'allure cible, accélération km 3-4, dernier km à fond. | Distance assez courte pour qu'un léger positive split n'ait pas d'impact catastrophique, mais fenêtre d'erreur étroite — pas de marge pour un départ trop prudent non plus. |
| 10K | 2 segments nets (pas 3) : les 5 premiers km à 5-8s/km plus lent que l'allure moyenne visée, les 2 derniers km à l'allure maximale soutenable. | Les erreurs de pacing ont un effet cumulatif plus marqué que sur 5K. Simplifie le pattern à 3 segments de v1 (Km1-3/4-7/8-10) en 2 blocs, plus proche de ce que la littérature valide concrètement. |
| Semi / Marathon | Allure cible stable avec marge de sécurité au départ (pas de paliers progressifs marqués comme le 10K) — départ prudent, ajustement au ressenti en fin de course plutôt que schéma de segments rigide. | Pour un coureur amateur/intermédiaire (contrairement à un profil élite, où les données montrent des splits pairs voire légèrement positifs sans risque, le taux de combustion glycogène étant déjà élevé à allure élite), démarrer 5-10% trop vite épuise les réserves de glycogène jusqu'à 30% plus tôt et déclenche une baisse de régime forcée — le "mur". La marge de sécurité au départ reste donc justifiée pour ce public, même si elle l'est moins pour un profil élite. |

*Sources : revue "The physiology and psychology of negative splits" (Frontiers/PMC, 2025) ; Data Driven Athlete, "How to Run a Negative Split" ; RunnersConnect, "Marathon Pacing Strategy: The 10-10-10 Method".*

**Implication pour le moteur** : le type de séance `race` (à créer, cf. ci-dessus) doit générer un contenu de segments différent selon `distance`, pas un pattern unique généralisé à toutes les distances — contrairement à ce qu'on envisageait au départ (généraliser aveuglément le schéma à 3 segments du 10K v1).

- **Statut : non commencé** (implémentation du type `race` avec cette logique de segments par distance).

## 3. Point sur la structure des phases (écart structurel, pas seulement de contenu)

En vérifiant les décharges/affûtage, un écart plus profond que le contenu texte est apparu : **v1 et v2 ne découpent pas les phases de la même façon** — du moins en apparence, cf. décision ci-dessous.

- **v1** : 3 phases seulement — `construction` (semaines 1-5, avec une semaine 4 de décharge implicite non étiquetée comme telle, organisée autour de la séance test), `affutage` (semaines 6-9, qui est en réalité une phase de maintien avec séances qualité complètes, pas une vraie réduction de volume), `pic` (semaines 10-11, la vraie réduction de volume avant course, avec jours de repos supplémentaires)
- **v2** : phases `Construction` / `Specifique` / `Affutage`, avec des semaines de décharge explicitement marquées et régulières (tous les 3-4 semaines, cf. principe des 10% dans `bibliotheque-seances.md`), et un `Affutage` qui correspond à la vraie réduction de volume finale (ce que v1 appelle `pic`)
- **Implication** : le nom `affutage` en v1 ne désigne pas la même chose que `Affutage` en v2 — la note de terminologie déjà présente dans `bibliotheque-seances.md` (section 0) sur ce point s'applique : *"Affûtage" désigne la réduction finale de volume avant course, pas la phase de développement du seuil qui la précède, nommée "Spécifique"*. v1 n'a pas cette distinction Spécifique/Affûtage, il fusionne les deux dans sa phase `affutage`.

**Décision — tranchée le 6 juillet 2026, à partir d'une comparaison chiffrée du volume semaine par semaine :**

Volume estimé de v1 (à partir du texte des séances, approximatif mais suffisant pour la tendance) comparé au volume calculé par v2 (mêmes paramètres : 10K, réf 50'21, objectif 48'30, départ 30km/semaine) :

| Semaine | v1 (estimé) | Phase v1 | v2 (calculé) | Phase v2 |
|---|---|---|---|---|
| 1 | ~34 km | construction | 30 km | Construction |
| 2 | ~37 km | construction | 33 km | Construction |
| 3 | ~31 km | construction | 36 km | Construction |
| 4 | ~31 km | construction | 27 km (décharge) | Construction |
| 5 | ~37 km | construction | 36 km | Construction |
| 6 | ~29 km | **affutage** | 36 km | **Specifique** |
| 7 | ~31 km | **affutage** | 36 km | **Specifique** |
| 8 | ~32 km | **affutage** | 27 km (décharge) | **Specifique** |
| 9 | ~25 km | **affutage** | 36 km | **Specifique** |
| 10 | ~10 km* | pic | 28.8 km | **Affutage** |
| 11 | ~6 km* | pic | 21.6 km | **Affutage** |

*\*Sous-estimé : l'extraction ne compte pas certaines séances qualité de fin de plan (formats non reconnus par le script d'extraction), le vrai volume v1 de ces 2 semaines est probablement plus proche de ce que produit v2.*

**Conclusion : ce n'est qu'un problème de nom, pas de structure réelle.** Les semaines 6-9 de v1 (`affutage`) correspondent en volume aux semaines 6-9 de v2 (`Specifique`) — même ordre de grandeur, pas de vraie réduction dans les deux cas. Les semaines 10-11 de v1 (`pic`) correspondent en fonction (vraie chute de volume) à l'`Affutage` de v2. Correspondance retenue pour la suite du chantier :
- v1 `construction` → v2 `Construction`
- v1 `affutage` → v2 `Specifique`
- v1 `pic` → v2 `Affutage`

Pas de renommage à faire dans le moteur v2 lui-même (sa terminologie, déjà clarifiée dans `bibliotheque-seances.md`, reste la référence pour le produit final) — cette correspondance sert uniquement de repère pour la suite du chantier de convergence (étape 1 de la section 5 : générer par v2 un plan proche du plan v1 actuel).

## 4. Statut de la comparaison

Premier passage de comparaison terminé le 6 juillet 2026 : séances EF, sortie longue, séances qualité Seuil/VMA (plusieurs phases), semaine de décharge implicite/séance test, structure globale des phases, dernière semaine et jour de course, ainsi que la vérification systématique de toutes les notes sur jours de repos (confirmé : uniquement aux transitions de phase, aucune autre catégorie de note manquante trouvée).

7 écarts documentés au total (2.1 à 2.7) : 2 tranchés en faveur de l'approche v2 (2.1), 5 à combler (2.2 à 2.7), plus l'écart structurel sur le découpage des phases (section 3, décision reportée). Prochaine étape suggérée si ce chantier reprend : prioriser 2.7 (traitement du jour de course), identifié comme le plus structurant.

## 5. Étapes du chantier (rappel, une fois le contenu du moteur jugé suffisant)

1. Faire générer par le moteur v2 un plan aussi proche que possible du plan v1 actuel (mêmes dates, zones d'allure cohérentes) — comparaison côte à côte pour validation
2. Adapter l'affichage de v1 pour lire ce plan généré au lieu du tableau `PLAN` statique, en conservant le design/CSS actuel
3. Migrer les statuts de séances existants (`lk_statuses`, `hiddenSessions`, `swappedSessions`) vers le système `plan.statuses` de v2, pour ne pas perdre l'historique de suivi déjà enregistré
4. Brancher le bouton d'adaptation (`analyserAdaptations`/`appliquerAdaptations`) dans l'interface v1

Aucune de ces étapes n'est commencée à ce jour (6 juillet 2026) — ce document liste le travail de contenu (section 2) à faire avant de s'y attaquer.

## 6. Avancement réel de l'étape 2 (mise à jour du 6 juillet 2026)

Contrairement à la note ci-dessus, l'étape 2 a en fait été commencée le jour même :

- **Étape 1** (générer un plan proche de l'actuel) : validée sur les grandes masses (11 semaines, volumes cohérents) — décision explicite de ne pas viser une fidélité littérale jour par jour, le moteur restant générique
- **Étape 2** (adapter l'affichage) : `public/index-v2-preview.html` créé comme copie de travail (pas `index.html` directement). Module `v1-bridge.js` écrit pour traduire un plan v2 vers le format `PLAN`/`ALL_SESSIONS` attendu. Moteur chargé en scripts classiques (pas modules ES) pour éviter un risque de timing sur un fichier où presque tout dépend de `PLAN` dès le chargement

**Découverte importante en testant avec Laurent** : la fonction de prédiction de performance (`predict10K`/`weightedAvgByEffortDuration`) sélectionnait les activités Strava à analyser par correspondance stricte de date+type avec le plan affiché — cassée dès que le plan généré diffère du déroulé réel (ce qui est le cas, cf. étape 1). Corrigée en détectant le type d'effort directement depuis l'allure réelle des laps (déjà générique dans `SESSION_TARGETS`), indépendamment de toute correspondance de date. Ce défaut existait structurellement dans v1 aussi, pas seulement lié au chantier v2.

**Limite non résolue, à traiter avec le chantier v2.0 streams (detection d'intervalles par streams Strava, jamais commencé)** : les séances VMA très fractionnées (ex. "2×8×30″-30″") ne se segmentent pas correctement en laps Strava classiques — une activité avec seulement 7 laps pour 16 répétitions attendues produit des laps qui mélangent phases rapides et lentes, donnant une vitesse moyenne diluée sans rapport avec l'effort réel (observé : 5'33/km calculé sur une vraie séance VMA, alors que l'allure réelle des répétitions est ~4'15/km). Ce n'est pas un bug corrigible par ajustement de seuil — c'est la même limite structurelle qui motivait le chantier v2.0 streams dès l'origine (analyse seconde par seconde via `get_activity_streams`, indépendante de la segmentation en laps de la montre). Décision actée : ne pas contourner par un patch, traiter avec le vrai chantier streams le moment venu.

**Garde-fou de prédiction ajouté (contournement temporaire de la limite VMA ci-dessus)** : `predict10K()` compare maintenant chaque source (SPEC/SEUIL/VMA) individuellement à `BASE_TIME` (référence connue) et exclut celle dont l'écart dépasse 20%, avant la pondération finale. Validé en conditions réelles avec Laurent : l'estimation est passée de 53'38" (VMA mal détectée incluse) à 49'16" (VMA écartée), proche de la v1 réelle (48'35"). Un premier essai comparant chaque source à la médiane des autres avait été tenté et écarté : avec seulement 2 sources, la médiane de 2 valeurs est leur moyenne, donc aucune n'est jamais détectée comme aberrante par cette méthode — d'où le choix de comparer à `BASE_TIME` (référence stable, indépendante du nombre de sources).

## 7. Sélection/génération du plan depuis l'interface v1 (nouveau chantier, non commencé)

Actuellement, `index-v2-preview.html` génère le plan avec des paramètres codés en dur dans le script (10K, réf 50'21, objectif 48'30, dates fixes) — aucune saisie utilisateur possible. Laurent souhaite pouvoir choisir/générer un nouveau plan (distance, objectif, dates) directement depuis cette interface.

**Décision d'architecture proposée (discutée le 6 juillet 2026, pas encore implémentée)** : ne pas dupliquer un formulaire de saisie dans l'interface v1 — réutiliser le wizard v2 existant (`/v2`), cohérent avec le principe déjà suivi tout le long de ce chantier (une seule source de vérité, `v1-bridge.js` comme couche de traduction plutôt que réécriture). Le wizard v2 a déjà toute la logique de validation, les options de distance, les calculs de durée par défaut — pas de raison de la recréer.

**Flux envisagé, à affiner avant implémentation** :
1. Un bouton "Nouveau plan" sur l'interface v1 redirige vers le wizard v2 (`/v2`), avec un paramètre signalant l'intention de revenir vers v1 après génération (même principe que `state=v2` déjà utilisé pour le retour OAuth Strava)
2. Une fois le plan généré dans le wizard v2, il est sauvegardé (mécanisme Gist déjà existant), puis redirection vers `index-v2-preview.html`
3. `index-v2-preview.html` doit changer de comportement : au lieu de toujours générer un nouveau plan avec des paramètres fixes à chaque chargement, elle doit **charger le plan déjà sauvegardé** (Gist ou localStorage) et ne générer un nouveau plan que si l'utilisateur revient explicitement du wizard avec cette intention

**Non tranché à ce stade** : le mécanisme exact de passage d'intention entre les deux pages, la gestion du cas où aucun plan n'a encore été généré/sauvegardé (première utilisation), et si la sauvegarde doit utiliser le même Gist que v2 ou un espace dédié à cette version pont v1/v2.

**Statut : réflexion posée, implémentation non commencée.**
