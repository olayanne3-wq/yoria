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
- **Décision : À COMBLER, en deux temps.**
  1. D'abord des notes statiques utiles par type de séance (rapide à construire, déjà un vrai gain)
  2. Puis des notes conditionnelles réellement dynamiques (ex. ajustement allure si chaleur prévue), qui demandent de brancher une source météo au moteur — chantier dépendant d'une intégration externe (API météo), pas juste du moteur seul
- **Statut : non commencé.**

### 2.3 Notes pratiques par type de séance (hors météo)

- **v1** : conseils pratiques ponctuels sur certains types de séance, ex. sortie longue → `"Hydratation++ · Allonge selon la forme"`
- **v2** : aucune note de ce type actuellement
- **Décision : À COMBLER.** Rejoint le point 2.2 (notes statiques par type), à traiter dans le même chantier.
- **Statut : non commencé.**

### 2.4 Repères qualitatifs sur séances dures (ressenti, progression relative)

- **v1** : notes variables sur les séances Seuil/VMA, jamais génériques — deux natures observées :
  - Repère de ressenti/allure d'effort (test de la parole), ex. Seuil semaine 1 → `"Effort contrôlé, 3–4 mots max"`
  - Repère de progression relative (comparaison à une séance antérieure similaire), ex. VMA semaine 5 → `"Volume VMA identique S1, fatigue cumulée"`
- **v2** : le contenu technique (allures, répétitions, structure) est déjà solide et progresse correctement d'une semaine à l'autre (vérifié : 3×6' semaine 1 → 4×6' semaine 5 sur le Seuil, structure cohérente), mais **aucune note d'accompagnement** de ce type n'est produite
- **Décision : À COMBLER.** Distinct du point 2.2/2.3 (météo/pratique) : celui-ci concerne spécifiquement le repère qualitatif sur l'effort lui-même et sa place dans la progression. Pour la note de progression relative en particulier, le moteur devrait pouvoir comparer une séance à son équivalent d'une semaine antérieure (même sous-type de séance qualité) — nécessite un mécanisme de lookup dans l'historique du plan déjà généré, pas juste un calcul local à la semaine courante.
- **Statut : non commencé.**

### 2.5 Jalons narratifs aux moments de transition du plan

- **v1** : notes signalant un moment charnière du plan plutôt qu'un conseil de contenu — vérifié systématiquement sur tous les jours de repos du plan (la grande majorité n'ont aucune note ; les seules qui en ont coïncident avec une transition de phase) :
  - `"Dernière longue avant affûtage · Allonge selon la forme"` (dernière sortie longue avant la coupure de volume)
  - `"Début affûtage"` (première séance de la phase `affutage`)
  - `"Début pic de forme"` (première séance de la phase `pic`)
  - `"Fin affûtage ✨ · Très tranquille"` (dernières séances avant course)
- **v2** : aucun mécanisme de ce type — les phases existent dans la donnée (`plan.semaines[].phase`) mais rien n'accompagne le passage d'une phase à l'autre pour l'utilisateur
- **Décision : À COMBLER.** Contrairement aux points précédents (conseils techniques), celui-ci relève de l'accompagnement de l'expérience utilisateur aux moments clés — vaut le coup indépendamment du reste, relativement simple à détecter techniquement (première/dernière semaine d'une phase, ou changement de phase par rapport à la semaine précédente).
- **Statut : non commencé.**

### 2.6 Cohérence narrative de la semaine entière autour de la séance test

- **v1** : la semaine contenant la séance test (semaine 4 dans le plan actuel) est construite comme un tout cohérent autour de cet objectif, pas seulement la séance elle-même :
  - Note du lundi : `"Semaine test"` (annonce dès le début de semaine)
  - Veille du test : `"Jambes fraîches pour le test demain — très facile"`
  - Jour du test : `"🎯 SÉANCE TEST CLEF ! Si ça passe → viser sub-48'"`
  - Lendemain : `"Très facile · Récupération après le test"`
- **v2** : la séance test elle-même est déjà bien marquée (`sousType: "test"`, `estTest: true`) et son contenu technique est bon (comparable à v1 — "sert à confirmer/recalibrer ton allure objectif"), **mais** les séances EF qui l'entourent (veille, lendemain) restent génériques, sans lien narratif explicite avec le test à venir/passé
- **Décision : À COMBLER.** Le plus structurant des écarts identifiés à ce jour : contrairement aux points 2.4/2.5 (une note isolée sur une séance), celui-ci demande que le moteur *sache*, au moment de générer les séances EF adjacentes à la séance test, qu'elles sont adjacentes à un moment clé — pas juste ajouter une note indépendante à chaque séance individuellement. Nécessite que la génération de contenu EF puisse recevoir un contexte du type "veille de test" / "lendemain de test", pas seulement son propre type/rôle actuel (`standard`/`recuperation`).
- **Statut : non commencé.**

## 3. Point sur la structure des phases (écart structurel, pas seulement de contenu)

En vérifiant les décharges/affûtage, un écart plus profond que le contenu texte est apparu : **v1 et v2 ne découpent pas les phases de la même façon.**

- **v1** : 3 phases seulement — `construction` (semaines 1-5, avec une semaine 4 de décharge implicite non étiquetée comme telle, organisée autour de la séance test), `affutage` (semaines 6-9, qui est en réalité une phase de maintien avec séances qualité complètes, pas une vraie réduction de volume), `pic` (semaines 10-11, la vraie réduction de volume avant course, avec jours de repos supplémentaires)
- **v2** : phases `Construction` / `Specifique` / `Affutage`, avec des semaines de décharge explicitement marquées et régulières (tous les 3-4 semaines, cf. principe des 10% dans `bibliotheque-seances.md`), et un `Affutage` qui correspond à la vraie réduction de volume finale (ce que v1 appelle `pic`)
- **Implication** : le nom `affutage` en v1 ne désigne pas la même chose que `Affutage` en v2 — la note de terminologie déjà présente dans `bibliotheque-seances.md` (section 0) sur ce point s'applique : *"Affûtage" désigne la réduction finale de volume avant course, pas la phase de développement du seuil qui la précède, nommée "Spécifique"*. v1 n'a pas cette distinction Spécifique/Affûtage, il fusionne les deux dans sa phase `affutage`.
- **Décision : à trancher plus tard**, une fois qu'on comparera plus finement la progression de volume semaine par semaine entre les deux — pas grave en soi tant qu'on garde la terminologie v2 (déjà clarifiée) comme référence pour le produit final, mais ça confirme qu'une simple "traduction" phase par phase entre v1 et v2 ne sera pas directe.

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

## 4. Statut de la comparaison

Premier passage de comparaison terminé le 6 juillet 2026 : séances EF, sortie longue, séances qualité Seuil/VMA (plusieurs phases), semaine de décharge implicite/séance test, structure globale des phases, dernière semaine et jour de course, ainsi que la vérification systématique de toutes les notes sur jours de repos (confirmé : uniquement aux transitions de phase, aucune autre catégorie de note manquante trouvée).

7 écarts documentés au total (2.1 à 2.7) : 2 tranchés en faveur de l'approche v2 (2.1), 5 à combler (2.2 à 2.7), plus l'écart structurel sur le découpage des phases (section 3, décision reportée). Prochaine étape suggérée si ce chantier reprend : prioriser 2.7 (traitement du jour de course), identifié comme le plus structurant.

## 5. Étapes du chantier (rappel, une fois le contenu du moteur jugé suffisant)

1. Faire générer par le moteur v2 un plan aussi proche que possible du plan v1 actuel (mêmes dates, zones d'allure cohérentes) — comparaison côte à côte pour validation
2. Adapter l'affichage de v1 pour lire ce plan généré au lieu du tableau `PLAN` statique, en conservant le design/CSS actuel
3. Migrer les statuts de séances existants (`lk_statuses`, `hiddenSessions`, `swappedSessions`) vers le système `plan.statuses` de v2, pour ne pas perdre l'historique de suivi déjà enregistré
4. Brancher le bouton d'adaptation (`analyserAdaptations`/`appliquerAdaptations`) dans l'interface v1

Aucune de ces étapes n'est commencée à ce jour (6 juillet 2026) — ce document liste le travail de contenu (section 2) à faire avant de s'y attaquer.
