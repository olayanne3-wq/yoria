# Jalons narratifs de transition — Yoria v2.0

Document de référence méthodologique pour le mécanisme de jalons narratifs (accompagnement de l'expérience utilisateur aux moments charnière du plan), implémenté dans `public/v2/engine/plan-generator.js`.

---

## 1. Principe

Un jalon narratif est une phrase courte, insérée dans le contenu d'une séance, qui signale à l'utilisateur qu'il traverse un **moment charnière du plan** — pas un conseil technique sur la séance elle-même (ça, c'est le rôle des notes pratiques par type de séance, section 2.3), mais un repère d'orientation dans la progression globale.

**Origine** : la v1 avait ce type de note codé en dur pour un plan spécifique. Le moteur v2, générique, ne connaît que la structure objective du plan (`plan.semaines[].phase`) — rien n'accompagnait le passage d'une phase à l'autre avant l'implémentation de ce mécanisme.

**Décision de fond** : ce mécanisme est jugé pertinent indépendamment du profil — l'accompagnement narratif aux moments clés est une vraie valeur ajoutée pour n'importe quel coureur, pas une spécificité d'un plan particulier.

## 2. Règles de détection

Toutes génériques — aucune date, aucune phase nommée codée en dur pour un profil précis. Se basent uniquement sur la structure du plan déjà généré (`semaines[].phase`, `semaines[].assignment`).

| Jalon | Règle de détection |
|---|---|
| **Début de phase** | `semaine.phase !== semainePrécédente.phase` — première semaine d'une nouvelle phase |
| **Fin de phase avant Affûtage** | Dernière semaine où `phase !== 'Affutage'` — juste avant la coupure de volume |
| **Dernière longue avant Affûtage** | Dernière séance de type `longue` de cette même semaine de transition (cas particulier de la règle précédente, ciblé sur une séance précise plutôt que la semaine entière) |
| **Dernière semaine avant course** | Dernière semaine du plan entier |

Ces 4 jalons sont détectés et traités par une seule fonction, `injecterJalonsTransition(semaines)` — appelée une fois, après que toutes les séances du plan aient leur contenu final (texte + notes pratiques déjà injectées, section 2.3).

## 3. Format d'intégration

Fusionné dans le champ `contenu` existant de la séance concernée, pas un champ séparé (`noteTransition` ou équivalent) — cohérent avec le principe d'un bloc de contenu unique plutôt que warmup/session/cooldown/notes distincts (approche v2 retenue).

Concrètement : le texte du jalon est **ajouté à la suite** du contenu déjà généré pour la séance (via `ajouterNote()`, simple concaténation avec un espace). Une séance peut donc accumuler plusieurs notes au fil des différents mécanismes (jalon de transition + note pratique de type + repère qualitatif), toutes dans le même champ texte.

## 4. Banque de variantes

Deux variantes par jalon, tirées au sort à la génération du plan (`Math.random()`, pas de logique de non-répétition entre deux générations successives). Choix assumé : pas d'appel API pour ce cas — l'enjeu est trop faible par rapport au coût/latence/dépendance réseau que ça ajouterait. Un appel API aurait plus de sens pour du coaching réactif à la progression réelle de l'utilisateur (chantier futur), pas pour une phrase d'encouragement ponctuelle et prévisible.

| Jalon | Variante 1 | Variante 2 |
|---|---|---|
| Dernière longue avant Affûtage | "Dernière sortie longue avant l'affûtage — allonge un peu si la forme le permet." | "C'est la dernière grosse sortie avant de lever le pied. Profites-en." |
| Début Affûtage | "Entrée en affûtage : le volume baisse, l'intensité reste." | "Le gros du travail est fait — place à la récupération active avant le jour J." |
| Début phase Spécifique | "Début de la phase spécifique : place aux séances à allure course." | "On rentre dans le dur — les séances vont maintenant coller à ton allure objectif." |
| Dernières séances avant course | "Dernières séances avant le jour J — reste tranquille." | "Presque prêt. Ces derniers jours ne servent qu'à arriver frais." |

Ces textes correspondent exactement à `JALONS_TRANSITION` dans `plan-generator.js` — pas de divergence entre la banque documentée ici et l'implémentation réelle.

## 5. Écart avec l'intention initiale : la semaine test n'a pas rejoint ce mécanisme

L'intention initiale prévoyait que la note d'annonce en tête de la semaine test rejoigne cette banque de jalons.

**Ce n'est pas ce qui a été implémenté.** `injecterCoherenceSemaineTest()` utilise sa propre banque séparée (`NOTES_SEMAINE_TEST`), pas `JALONS_TRANSITION`. Raison technique documentée dans le code : `injecterCoherenceSemaineTest()` doit s'exécuter **après** `placerSeanceTest()` (qui a lieu en toute fin de `generatePlan()`, une fois l'objet `plan` complet construit) — alors qu'`injecterJalonsTransition()` s'exécute bien plus tôt, avant même que la séance test n'existe. Techniquement, il aurait fallu soit retarder tout l'appel de `injecterJalonsTransition()`, soit dupliquer une partie de sa logique pour ce cas précis — la banque séparée a été le choix le plus simple sur le moment.

**Conséquence pratique, mineure** : deux banques de variantes distinctes à maintenir pour des notes de nature très proche (annonce d'un moment clé du plan), plutôt qu'une seule. Pas un vrai problème fonctionnel, juste un léger écart de cohérence architecturale par rapport à l'intention initiale — noté ici pour que ce ne soit pas redécouvert par surprise en relisant le code plus tard.

## 6. Fichiers concernés

- `public/v2/engine/plan-generator.js` — `JALONS_TRANSITION` (banque) et `injecterJalonsTransition()` (détection + injection), `NOTES_SEMAINE_TEST` et `injecterCoherenceSemaineTest()` (mécanisme séparé, cf. section 5 ci-dessus)
- `public/v2/engine/test-jalons-transition.mjs` — tests de non-régression
- `public/v2/engine/test-coherence-semaine-test.mjs` — tests de non-régression pour le mécanisme séparé de la semaine test

## 7. Statut

Implémenté et testé. Fait partie d'un ensemble de 5 chantiers de contenu narratif, tous livrés ensemble (cf. `jour-de-course.md`, `notes-pratiques.md`, `reperes-qualitatifs.md`, `coherence-semaine-test.md`).
