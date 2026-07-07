# Convergence v1 → v2 — Run by Léa

Document de suivi du chantier : faire produire par le moteur générique v2 (`plan-generator.js`) un plan aussi riche que le plan v1 actuel de Laurent (`const PLAN` codé en dur dans `public/index.html`), affiché via l'interface v1 (design conservé).

**Contexte et décision de calendrier** (posée le 6 juillet 2026) : ce chantier est un investissement produit pour l'app finale commercialisée — le moteur v2 doit devenir l'unique source de vérité, quel que soit le profil/objectif de l'utilisateur, pas seulement celui de Laurent. **v1 reste l'outil de suivi quotidien réel jusqu'à Gem'Aubagne (6 septembre 2026)** ; ce chantier se construit en parallèle, sans urgence, et ne remplace v1 qu'après validation post-course.

---

## État d'avancement (synthèse, mise à jour du 6 juillet 2026)

| Chantier | Statut | Détail |
|---|---|---|
| Écarts de contenu (2.1 à 2.7) | ✅ Tous implémentés et testés | Jalons de transition, notes pratiques, repères qualitatifs, cohérence semaine test, jour de course, météo — voir section 2 |
| Désalignement des phases (section 3) | ✅ Tranché | v1 `affutage`→v2 `Specifique`, v1 `pic`→v2 `Affutage` ; pas de renommage du moteur, juste un repère de correspondance |
| Étape 1 (générer un plan proche) | ✅ Validée sur les grandes masses | Pas de fidélité littérale jour par jour — décision assumée |
| Étape 2 (adapter l'affichage v1) | 🔶 Bien avancée, sur copie de travail | `index-v2-preview.html` + `v1-bridge.js` fonctionnels ; prédiction de performance corrigée en plusieurs itérations (voir section 6) ; `index.html` réel non touché |
| Étape 3 (migrer les statuts existants) | ⬜ Non commencée | `lk_statuses`/`hiddenSessions`/`swappedSessions` → `plan.statuses` |
| Étape 4 (brancher l'adaptation) | ⬜ Non commencée | `analyserAdaptations`/`appliquerAdaptations` dans l'interface v1 |
| Sélection/génération de plan depuis v1 (section 7) | ⬜ Réflexion posée, rien codé | Réutiliser le wizard + le mécanisme multi-plans déjà existants en v2 (Gist), plutôt que dupliquer |
| Variables non indexées sur le plan (section 7bis) | ✅ Implémenté | `RACE_NAME`, `PHASES`, `FC_MAX`, `BASE_TIME` lues depuis le plan chargé, avec repli sur les valeurs historiques |
| Non-chevauchement des dates entre plans (section 7ter) | ✅ Implémenté | Intersection stricte, comportement bloquant — dans `gist-sync.js`, appliqué à toute nouvelle sauvegarde de plan |
| localStorage partagé entre plans (section 7quater) | ✅ Implémenté | Les 13 clés `lk_*` liées au plan sont préfixées par `plan.id` via `clePourPlan()` |
| Limite VMA très fractionnées | ⬜ Contournée (garde-fou), pas résolue | Vraie solution = chantier v2.0 streams (jamais commencé) |

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

- **Statut : implémenté et validé en conditions réelles.** Documentation détaillée (architecture, incidents de déploiement, décisions) dans un document dédié : [`notes-meteo.md`](./notes-meteo.md).

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

- **Statut : implémenté et testé (commit `bf96c60`).** Documentation détaillée (règles de détection, banque complète, hypothèses non tranchées) dans un document dédié : [`notes-pratiques.md`](./notes-pratiques.md).

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

- **Statut : implémenté et testé (commit `bcc013e`).** Documentation détaillée (deux bugs réels trouvés en implémentant, ajustement empirique des seuils) dans un document dédié : [`reperes-qualitatifs.md`](./reperes-qualitatifs.md).

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

- **Statut : implémenté et testé (commit `dd42011`).** Documentation détaillée (règles de détection, banque complète, écart avec l'intention initiale sur la semaine test) dans un document dédié : [`jalons-narratifs.md`](./jalons-narratifs.md).

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

- **Statut : implémenté et testé (commit `d098f1a`).** Documentation détaillée (contrainte d'ordonnancement, banque dupliquée avec les jalons de transition) dans un document dédié : [`coherence-semaine-test.md`](./coherence-semaine-test.md).

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

- **Statut : implémenté et testé (commit `f56f1a9`).** Documentation détaillée (stratégie de pacing par distance, garde-fou sportif, 2 bugs réels trouvés) dans un document dédié : [`jour-de-course.md`](./jour-de-course.md).

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

**Infrastructure déjà existante côté v2, à réutiliser (pas à recréer)** — vérifiée dans `public/v2/index.html` :
- **Plusieurs plans peuvent déjà coexister**, pas un seul : chaque plan a un `id` propre, stocké dans une liste au sein d'un même Gist GitHub (`plan10k_v2_plans.json`, via `gist-sync.js`)
- **`sauvegarderPlan(plan)`** : écrit/met à jour un plan dans cette liste (remplace par `id` si déjà existant, sinon ajoute)
- **`chargerPlanExistant(id)`** : sélectionne un plan par son `id` depuis `window.__plansSauvegardes` et l'affiche (`renderResults(plan)`) — c'est le mécanisme de "sélection" déjà fonctionnel en v2, juste jamais relié à v1
- **`renommerPlanUI(id)` / `supprimerPlanUI(id)`** : gestion complète (renommage libre, suppression individuelle sans affecter les autres plans sauvegardés)
- L'utilisateur peut nommer chaque plan librement (`nomPlanInput`), ce qui permettrait par exemple d'avoir "10K Gem'Aubagne" et "Semi octobre" comme deux plans distincts sélectionnables

**Conséquence sur le chantier** : la section 7 n'est donc pas seulement "brancher un formulaire de génération" — c'est aussi, potentiellement, "permettre de choisir parmi plusieurs plans déjà sauvegardés" (pas juste le dernier généré). Le mécanisme `chargerPlanExistant`/liste de plans existe déjà côté v2 ; il resterait à l'exposer côté v1 (ex: un sélecteur "Mes plans" sur l'interface v1, listant les mêmes plans que ceux visibles dans le wizard v2, via le même Gist).

**Demande explicite de Laurent (6 juillet 2026)** : pouvoir sélectionner sur v1 le plan à afficher, parmi tous les plans déjà générés dans le wizard v2 — confirme que la dimension multi-plans identifiée ci-dessus n'est pas une simple possibilité technique, c'est une exigence du chantier, pas une option secondaire.

**Décision d'emplacement — tranchée le 6 juillet 2026** : le sélecteur de plan (menu déroulant) doit apparaître **en haut du dashboard, toujours visible** — pas dans un menu/paramètres séparé. L'utilisateur doit savoir/choisir quel plan il regarde avant de voir quoi que ce soit sur ce plan, cohérent avec le fait que `renderDashboard()` (point d'entrée principal de l'affichage) doit désormais dépendre du plan sélectionné dès le début de son rendu.

**Découverte annexe en explorant `renderDashboard()`** : la bannière post-course (affichée après le jour de course) contient elle aussi des valeurs codées en dur non couvertes par la résolution de 7bis — la date `"2026-09-06"` (ligne ~1021, condition d'affichage de la bannière) et `3021` (ligne ~1028, calcul du gain vs référence de départ). À traiter en même temps que l'implémentation du sélecteur, sous peine de laisser un nouvel angle mort du même type que 7bis.

**Flux envisagé, à affiner avant implémentation** :
1. Un bouton "Nouveau plan" sur l'interface v1 redirige vers le wizard v2 (`/v2`), avec un paramètre signalant l'intention de revenir vers v1 après génération (même principe que `state=v2` déjà utilisé pour le retour OAuth Strava)
2. Une fois le plan généré dans le wizard v2, il est sauvegardé (mécanisme Gist déjà existant, cf. ci-dessus), puis redirection vers `index-v2-preview.html`
3. `index-v2-preview.html` doit changer de comportement : au lieu de toujours générer un nouveau plan avec des paramètres fixes à chaque chargement, elle doit **charger un plan depuis le Gist** (via `chargerPlans()`/`chargerPlanExistant`, déjà écrits dans `gist-sync.js`/`v2/index.html`) et ne générer un nouveau plan que si l'utilisateur revient explicitement du wizard avec cette intention
4. **(Exigence confirmée, pas une option)** Si plusieurs plans existent dans le Gist, `index-v2-preview.html` doit permettre d'en choisir un — pas juste charger "le dernier" par défaut. Probablement un sélecteur simple (menu déroulant ou liste), réutilisant la même liste que celle affichée dans le wizard v2 (`afficherPlansSauvegardes`)

**Non tranché à ce stade** : le mécanisme exact de passage d'intention entre les deux pages ; la gestion du cas où aucun plan n'a encore été généré/sauvegardé (première utilisation) ; si `index-v2-preview.html` doit toujours utiliser le même token GitHub/Gist que le wizard v2 (probable, pour que les deux interfaces voient les mêmes plans) ou un espace dédié ; comment présenter visuellement le sélecteur de plans dans le style/design de l'interface v1 (différent de celui de v2).

**Statut : réflexion posée, implémentation non commencée.**

## 7bis. Variables non indexées sur le plan sélectionné (écart critique découvert le 6 juillet 2026)

Question posée par Laurent en réfléchissant à la section 7 : est-ce que toutes les variables de `index-v2-preview.html` seront bien indexées sur le plan choisi, une fois la sélection multi-plans implémentée ? Réponse après vérification systématique : **non, pas du tout** — seule `PLAN` elle-même est en `let` (rechargeable). Tout le reste ci-dessous est soit calculé une seule fois au chargement, soit codé en dur, indépendamment de tout plan sélectionné.

**Variables figées au chargement (calculées depuis `PLAN` une seule fois, ne se recalculent pas si `PLAN` change ensuite)** :
- `ALL_SESSIONS` (`const`, ligne ~92) — si un autre plan est chargé après coup, cette liste resterait sur l'ancien plan

**Constantes codées en dur, spécifiques au profil/plan de Laurent (Gem'Aubagne, 10K)** :
- `RACE_NAME`, `RACE_URL`, `RACE_LOCATION` — nom/lien/lieu de la course, afficheraient toujours "10 km Gem'Aubagne" même avec un plan chargé pour une autre course/distance
- `PHASES` — numéros de semaine codés en dur par phase (`weeks:[1,2,3,4,5]` etc.), suppose un plan de 11 semaines découpé exactement comme celui de Laurent ; un plan de durée différente casserait cet affichage
- `FC_MAX = 181` — fréquence cardiaque maximale personnelle de Laurent, utilisée pour `FC_ZONES` ; devrait dépendre du profil de l'utilisateur, pas être une constante globale
- `BASE_TIME` (dans `predict10K()`, 3021s = 50'21") — référence de performance connue de Laurent, utilisée comme ancre du garde-fou de prédiction (section 6) ; un plan pour un autre profil/objectif aurait besoin de sa propre référence

**Ce que ça implique pour le chantier de la section 7** : la sélection de plan n'est pas seulement "recharger `PLAN` et `ALL_SESSIONS`" — c'est potentiellement faire dépendre du plan choisi (ou du profil associé) : les infos de course affichées, le découpage des phases par semaine, la FC max de référence, et la performance de référence pour la prédiction. Tant que l'app ne gère qu'un seul profil (Laurent) et une seule course cible à la fois, ce n'est pas bloquant en pratique — mais dès que la sélection multi-plans permettra de basculer entre deux plans réellement différents (ex: le "Semi octobre" évoqué en exemple section 7), ces variables figées produiraient un affichage incohérent (nom de course, zones FC, phases) sans qu'aucune erreur ne se déclenche — un bug silencieux, pas un crash visible.

**Non tranché à ce stade** : si ces informations (course, FC max, référence de performance) doivent être stockées **dans** chaque plan sauvegardé (probable, le plus cohérent avec l'esprit multi-profil du produit final), ou si l'app doit rester mono-profil pour l'instant (un seul FC max, une seule course active à la fois) et seulement le contenu du plan change. Cette question rejoint la réflexion plus large sur l'authentification/les comptes utilisateurs (v2.5) — un vrai système multi-utilisateur suppose de toute façon que ces données deviennent des attributs du profil, pas des constantes de fichier.

**Statut : implémenté le 6 juillet 2026 (commit 76dfeb7).** RACE_NAME/RACE_URL/RACE_LOCATION lues depuis `paramsOrigine` (3 nouveaux champs ajoutés au wizard v2, étape date) ; FC_MAX depuis `zoneFC.fcMax` (FC_ZONES reconstruite dynamiquement en pourcentages, plus des bornes bpm codées en dur) ; BASE_TIME_REFERENCE depuis `paramsOrigine.tempsReference` ; PHASES reconstruite depuis `plan.phases`. `ALL_SESSIONS` passée de `const` à `let` + fonction `recalculerAllSessions()`, préparatoire pour la section 7 (pas encore rappelée dynamiquement, la sélection de plan n'étant pas encore implémentée). Toutes les reconstructions vérifiées identiques à l'ancien codage en dur sur le plan actuel (11 semaines, FC_MAX=181).

**Mise à jour du 7 juillet 2026 — cette première passe n'était pas exhaustive.** Laurent crée un vrai plan Semi et découvre, sur trois passes successives de tests, plus de 20 résidus supplémentaires de valeurs codées en dur pour le profil 10K de Laurent, jamais couverts par la correction initiale : objectif affiché (bug de temporal dead zone — `OBJECTIF_REFERENCE` référencée avant sa déclaration), format d'affichage du temps ne gérant pas les heures (`fmtTime`/`fmtTimeShort`), allure fausse dans les allures de course (division par 10km codée en dur, cassait tout calcul sur une distance différente), la carte "Allures de passage" entièrement câblée pour un 10K (5 segments fixes 0-10km), `SESSION_TARGETS` (cibles VMA/SEUIL/SPEC pour la détection d'effort — un mécanisme sensible, corrigé avec prudence en dérivant des vraies allures du plan plutôt que des ratios), prénom "Laurent" codé en dur à plusieurs endroits, "11 semaines" codé en dur, dates de course répétées dans les exports PDF et plusieurs titres de carte. Corrigé sur 3 commits (`c72602b`, `1aff5be`, `66b894c`).

**Leçon retenue** : une correction "complète" sur la base d'une recherche par mots-clés ponctuelle (comme celle du 6 juillet) reste vulnérable à des oublis massifs — les résidus n'apparaissent souvent qu'en testant un vrai cas d'usage différent (ici, un plan Semi plutôt que 10K), pas en relisant le code a priori. Une checklist de test explicite ("créer un plan sur chaque distance disponible, vérifier que rien ne mentionne 10K/Gem'Aubagne/Laurent/48'30 quelque part") serait plus fiable qu'une relecture, pour toute future vérification de ce type.

## 7ter. Contrainte : empêcher le chevauchement de dates entre plans d'un même utilisateur (règle posée le 6 juillet 2026)

Demande de Laurent : pour un même utilisateur, deux plans sauvegardés ne doivent pas pouvoir avoir des dates qui se chevauchent (ex: un 10K du 22/06 au 06/09 et un Semi du 01/08 au 15/10 se chevaucheraient sur août-septembre).

**Pourquoi c'est nécessaire, pas juste une préférence** : sans cette contrainte, dès qu'on aura une sélection multi-plans (section 7), rien n'empêcherait un utilisateur d'avoir deux plans actifs sur une même période — et le dashboard ("séance du jour", `currentWeek()`, etc.) ne saurait pas lequel des deux plans utiliser pour une date donnée qui existerait dans les deux. Un problème d'intégrité des données, pas seulement d'expérience utilisateur.

**Ce que ça implique techniquement** :
- Une vérification devrait exister au moment de **sauvegarder** un plan (que ce soit un nouveau plan généré depuis le wizard, ou un plan renommé/modifié) : comparer sa plage de dates (`dateDebut` → `dateCourse`) à celle de tous les autres plans déjà sauvegardés pour ce même utilisateur, et refuser/avertir en cas de chevauchement
- Cette vérification devrait vivre dans `gist-sync.js` (à côté de `sauvegarderPlan`), pas seulement côté UI — pour que la contrainte soit appliquée peu importe l'interface qui déclenche la sauvegarde (wizard v2, ou éventuellement une future v1 si elle sauvegarde aussi des plans)
- Cas limite à trancher : que faire si l'utilisateur veut légitimement remplacer un plan par un autre sur la même période (ex: abandonner un objectif 10K pour un objectif Semi à la même date) ? Probablement autoriser le remplacement explicite d'un plan existant (déjà couvert par `renommerPlanUI`/`sauvegarderPlan` qui met à jour par `id`), mais refuser la création d'un **nouveau** plan distinct qui chevaucherait un plan déjà actif

**Non tranché à ce stade** : la définition exacte de "chevauchement" (dates strictement inclusives, ou une marge de tolérance ?), le message d'erreur/avertissement à afficher à l'utilisateur, et si cette contrainte doit bloquer complètement la sauvegarde ou seulement avertir (l'utilisateur pourrait avoir une bonne raison de vouloir deux plans qui se chevauchent, ex: un plan de fond et un plan de course ponctuelle en parallèle — à valider si ce cas d'usage existe réellement avant de bloquer trop strictement).

**Statut : implémenté le 6 juillet 2026 (commit de6e5fc).** Décisions tranchées : intersection stricte (bornes incluses, pas de tolérance), comportement bloquant (erreur explicite, pas un avertissement contournable). `datesChevauchent()`/`trouverPlanEnConflit()` ajoutées à `gist-sync.js`, intégrées dans `sauvegarderPlan()` — ne s'applique qu'à la création d'un nouveau plan distinct, jamais à la mise à jour d'un plan existant par son `id`. Message d'erreur mentionne le nom et les dates du plan en conflit. Cas d'usage "deux plans volontairement en parallèle" non validé à ce stade — à assouplir si ce besoin se confirme en usage réel.

## 7quater. localStorage partagé entre plans (écart critique découvert le 6 juillet 2026, en testant le sélecteur de plan)

Symptôme remonté par Laurent en testant le sélecteur de plan (section 7, implémenté commits 1bf939a/23d70d8) : après avoir changé de plan, les semaines 1-2 affichaient des séances marquées comme validées alors qu'elles n'ont pas eu lieu — résidu du plan précédemment affiché. Cause : `statuses` (et d'autres données similaires) est chargé depuis `localStorage` sous une clé **fixe** (`"lk_statuses"`), partagée entre tous les plans, jamais indexée par `plan.id`. Même nature de problème que 7bis (variables non indexées sur le plan), mais côté `localStorage` plutôt que constantes de fichier — pas repéré lors de la recherche initiale de 7bis, qui ne cherchait que des `const`/valeurs codées en dur.

**Inventaire complet des 25 clés `lk_*` utilisées dans `index-v2-preview.html`, classées** :

*Liées au plan affiché (devraient être indexées par `plan.id`, actuellement partagées à tort)* :
- `lk_statuses` — statuts ✅/⚠️/❌ par séance (uid)
- `lk_hidden_sessions` — séances masquées par l'utilisateur
- `lk_swapped_sessions` — swaps de séances (échange de deux jours)
- `lk_session_notes` — notes libres par séance (uid)
- `lk_notes` — liste de notes générales (pas encore vérifié si liée à une séance précise ou au plan dans son ensemble)
- `lk_race_result` — résultat final de la course (temps réel)
- `lk_race_goal` — objectif de temps (recoupe `paramsOrigine.objectif`, potentiellement redondant une fois indexé par plan)
- `lk_race_horaires` — horaires dossard/départ, spécifiques à une course précise
- `lk_race_parcours` — lien vers le parcours, spécifique à une course précise
- `lk_pred_history` — historique des prédictions de performance (a du sens seulement dans le contexte d'un plan/objectif donné)
- `lk_checklist` — checklist (probablement liée à la course/au plan, à vérifier)
- `lk_last_rebuild` — date de dernière reconstruction de `predHistory`, liée à `lk_pred_history`
- `lk_coach_msg` / `lk_coach_date` — message de coaching affiché, potentiellement contextualisé au plan

*Profil utilisateur (à raison globales, indépendantes du plan)* :
- `lk_weight`, `lk_height`, `lk_fc_max`, `lk_pps` — données physiologiques de la personne, pas du plan
- `lk_github_token`, `lk_gist_id` — authentification, une seule par utilisateur

*Strava/technique (à raison globales)* :
- `lk_strava_token`, `lk_strava_refresh`, `lk_strava_expires`, `lk_strava_activities`, `lk_last_sync` — connexion et cache Strava, un seul compte Strava lié à l'utilisateur, pas au plan
- `lk_weather_cache` — cache météo par date, indépendant du plan

**Ce que ça implique** : contrairement à 7bis (résolu en modifiant des constantes de lecture), ce problème touche à la **persistance** — il faudrait soit préfixer chaque clé du premier groupe par l'id du plan actif (ex: `lk_statuses_${plan.id}`), soit restructurer le stockage en un seul objet par plan. Le deuxième groupe (profil) et troisième groupe (Strava/technique) ne doivent PAS être touchés — les indexer par erreur casserait leur fonction (ex: si `lk_strava_token` était indexé par plan, il faudrait se reconnecter à Strava à chaque changement de plan, ce qui n'a pas de sens).

**Non tranché à ce stade** : le mécanisme exact de migration pour les utilisateurs ayant déjà des données sous les anciennes clés non préfixées (ne pas perdre l'historique existant de Laurent au moment de la bascule) ; si `lk_notes` et `lk_checklist` appartiennent vraiment au premier groupe (à vérifier plus précisément avant de les déplacer) ; si `lk_race_goal` devient réellement redondant avec `paramsOrigine.objectif` une fois indexé, ou s'il faut le garder comme donnée éditable séparée (l'utilisateur peut vouloir ajuster son objectif sans regénérer tout le plan).

**Statut : implémenté le 6 juillet 2026 (commits 7a89149 puis b2be148).** Toutes les 13 clés du groupe "lié au plan" sont préfixées via `clePourPlan(cle)`, qui ajoute `_${plan.id}` si un plan actif existe (repli sur la clé non préfixée sinon). Validé en conditions réelles par Laurent sur `lk_statuses` avant de généraliser aux 12 autres. Les 12 clés du groupe "profil utilisateur/Strava/technique" n'ont volontairement pas été touchées, vérifié explicitement après coup.

**Non traité, nouvel angle mort découvert en marge de ce travail** : la bannière post-course contient encore une date (`"2026-09-06"`) et une référence (`3021`) codées en dur, non couvertes ni par 7bis ni par 7quater — à traiter séparément, probablement en même temps qu'une éventuelle prochaine passe sur la section 7 (sélecteur de plan).

**Non traité, limite de conception assumée pour l'instant** : la migration des anciennes clés non préfixées (données de Laurent avant ce commit) n'a pas été faite — elles restent accessibles sous leur ancien nom, mais un nouveau plan par défaut ne les récupère plus (comportement observé et validé par Laurent : "propre" plutôt que par migration automatique).

Repère pour reprendre le travail sans avoir à fouiller l'historique git.

**Moteur v2 (modules ES, source de vérité)** — `public/v2/engine/` :
- `plan-generator.js` — génération du plan, tous les écarts 2.1-2.7 y sont implémentés
- `strava.js`, `gist-sync.js`, `pdf-export.js`, `weather.js` — modules annexes (OAuth/tokens, persistence, export PDF, météo)
- `v1-bridge.js` — traduction plan v2 → format `PLAN`/`ALL_SESSIONS` attendu par v1 (section 5-6)
- `test-*.mjs` (12 fichiers) — un fichier de test par module/fonctionnalité, tous exécutables directement (`node test-xxx.mjs`)

**Copie de travail v1 + preview** :
- `public/index-v2-preview.html` — copie de `index.html` branchée sur le moteur v2 via `v1-bridge.js`. **`index.html` (l'outil réel de Laurent) n'est pas touché.**
- `public/v2-preview-scripts/plan-generator.classic.js` et `v1-bridge.classic.js` — copies dérivées des modules ES ci-dessus, `export` retirés, pour un chargement en scripts classiques (cf. section 6, décision technique sur le timing). **Pas une source de vérité : à régénérer depuis les fichiers `engine/` si le moteur évolue**, ex. `sed 's/^export //' public/v2/engine/plan-generator.js > public/v2-preview-scripts/plan-generator.classic.js`

**API météo** :
- `api/weather.js` — endpoint serverless, proxy vers Open-Meteo (route déclarée dans `vercel.json`, ne pas oublier en cas de nouvel endpoint : cf. bug déjà rencontré sur ce point précis dans la session)

**Documentation** :
- `docs/v2-methodologie/convergence-v1-v2.md` — ce document
- `docs/v2-methodologie/bibliotheque-seances.md` — référence méthodologique antérieure, toujours valide (terminologie Spécifique/Affûtage, principe des décharges)
- `docs/v2-methodologie/notes-meteo.md` — document dédié à la section 2.2 (le seul des 6 chantiers de contenu avec une dépendance API externe, et le seul ayant nécessité un vrai débogage en production — 5 incidents documentés)
- `docs/v2-methodologie/notes-pratiques.md` — document dédié à la section 2.3
- `docs/v2-methodologie/reperes-qualitatifs.md` — document dédié à la section 2.4 (2 bugs réels trouvés en implémentant, documentés en détail)
- `docs/v2-methodologie/jalons-narratifs.md` — document dédié à la section 2.5
- `docs/v2-methodologie/coherence-semaine-test.md` — document dédié à la section 2.6
- `docs/v2-methodologie/jour-de-course.md` — document dédié à la section 2.7 (le plus dense des 6, garde-fou sportif découvert en cours d'implémentation)

## 9. Décisions techniques clés à ne pas re-questionner sans relire le contexte

Ces choix ont déjà été débattus et tranchés avec de bonnes raisons — les reprendre à zéro sans ce contexte risquerait de refaire le même chemin :

- **Scripts classiques, pas modules ES, dans `index-v2-preview.html`** : presque tout le script existant lit `PLAN` dès le chargement (pas seulement sur clic), contrairement à v2/index.html. Un chargement en modules ES (asynchrone) aurait un risque de timing bien plus large — potentiellement tout le dashboard cassé, pas juste une fonctionnalité isolée. D'où la duplication assumée en `v2-preview-scripts/`.
- **Fidélité du plan v2 aux "grandes masses", pas jour par jour** : le moteur reste générique, ne doit pas recoder les spécificités du plan personnel de Laurent. Conséquence acceptée : la prédiction de performance ne doit plus dépendre d'une correspondance stricte de date avec le plan (cf. section 6).
- **Détection du type d'effort par allure réelle, pas par correspondance au plan** : à la fois pour la prédiction (section 6) et implicitement pour tout futur usage similaire — un plan affiché n'est jamais une garantie de ce qui a été réellement couru ce jour-là.
- **Garde-fou par comparaison à `BASE_TIME`, pas à la médiane des autres sources** : avec seulement 2 sources, la médiane ne peut jamais détecter d'aberration (elle vaut leur moyenne, chaque valeur en est mécaniquement à égale distance).

## 10. Comment tester

**Tests automatisés (modules moteur)** :
```bash
cd public/v2/engine
for f in test-*.mjs; do node "$f"; done
```
Tous doivent passer sans "ÉCHEC" dans la sortie. Si un test échoue après une modification du moteur, ne pas committer avant d'avoir compris pourquoi (plusieurs bugs réels ont été trouvés cette session grâce à ces tests, cf. sections 6 notamment).

**Test visuel du wizard/génération v2** : `https://plan-10k-alpha.vercel.app/v2`

**Test visuel de la preview v1 branchée sur v2** : `https://plan-10k-alpha.vercel.app/preview/index.html` — vérifier notamment que la section "Sources" de la prédiction affiche des projections cohérentes entre elles (une allure plus rapide doit donner une meilleure projection, jamais l'inverse — sinon, symptôme du bug de détection VMA documenté en section 6).

**Ne jamais tester sur** `https://plan-10k-alpha.vercel.app/` (= `index.html`, l'outil réel de Laurent, non concerné par ce chantier tant qu'il n'est pas explicitement validé et basculé).
