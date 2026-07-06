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

- **v1** : notes signalant un moment charnière du plan plutôt qu'un conseil de contenu, toutes concentrées autour de la bascule vers l'affûtage :
  - `"Dernière longue avant affûtage · Allonge selon la forme"` (dernière sortie longue avant la coupure de volume)
  - `"Début affûtage"` (première séance de la phase)
  - `"Fin affûtage ✨ · Très tranquille"` (dernières séances avant course)
- **v2** : aucun mécanisme de ce type — les phases existent dans la donnée (`plan.semaines[].phase`) mais rien n'accompagne le passage d'une phase à l'autre pour l'utilisateur
- **Décision : À COMBLER.** Contrairement aux points précédents (conseils techniques), celui-ci relève de l'accompagnement de l'expérience utilisateur aux moments clés — vaut le coup indépendamment du reste, relativement simple à détecter techniquement (première/dernière semaine d'une phase, ou changement de phase par rapport à la semaine précédente).
- **Statut : non commencé.**

## 3. Écarts restant à vérifier

Cette liste sera complétée au fur et à mesure. Comparé au 6 juillet 2026 : séances EF, sortie longue (semaine 1), séances qualité Seuil/VMA (semaines 1, 5, 8 — plusieurs phases). Reste à comparer :
- Contenu détaillé des semaines de décharge classiques (hors affûtage) — v1 en a-t-il un traitement de contenu différent, ou seulement un volume réduit ?
- Contenu de la semaine de course elle-même
- Les autres notes de type "Repos" ou jours sans séance dure, si elles existent ailleurs dans v1

## 4. Étapes du chantier (rappel, une fois le contenu du moteur jugé suffisant)

1. Faire générer par le moteur v2 un plan aussi proche que possible du plan v1 actuel (mêmes dates, zones d'allure cohérentes) — comparaison côte à côte pour validation
2. Adapter l'affichage de v1 pour lire ce plan généré au lieu du tableau `PLAN` statique, en conservant le design/CSS actuel
3. Migrer les statuts de séances existants (`lk_statuses`, `hiddenSessions`, `swappedSessions`) vers le système `plan.statuses` de v2, pour ne pas perdre l'historique de suivi déjà enregistré
4. Brancher le bouton d'adaptation (`analyserAdaptations`/`appliquerAdaptations`) dans l'interface v1

Aucune de ces étapes n'est commencée à ce jour (6 juillet 2026) — ce document liste le travail de contenu (section 2) à faire avant de s'y attaquer.
