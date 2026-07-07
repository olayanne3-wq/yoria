# Repères qualitatifs sur séances dures — Run by Léa v2.0

Document de référence méthodologique pour le mécanisme de repères qualitatifs (ressenti + progression relative), implémenté dans `public/v2/engine/plan-generator.js`. Tranché et implémenté le 6 juillet 2026 — section 2.4 du document [`convergence-v1-v2.md`](./convergence-v1-v2.md).

---

## 1. Principe

Deux natures de repère distinctes, regroupées dans une même section du document de convergence parce qu'elles portent toutes deux sur le **ressenti attendu** d'une séance dure (seuil/VMA), pas sur son exécution technique (ça, c'est le rôle des notes pratiques, section 2.3) :

- **Repère de ressenti** : décrit l'intensité subjective attendue de l'effort, indépendamment de tout historique (ex. "Effort contrôlé, 3-4 mots max si tu devais parler").
- **Progression relative** : compare la séance actuelle à une occurrence antérieure similaire de la même famille, pour signaler que la fatigue accumulée depuis peut se faire sentir malgré un volume comparable.

**Origine** : v1 avait ces deux types de note codés en dur pour des séances spécifiques du plan de Laurent. Le moteur v2 n'avait ni l'un ni l'autre.

## 2. Repère de ressenti

### Règle de détection

Basée sur la même famille que les notes pratiques (`FAMILLE_SOUS_TYPE`, partagé avec la section 2.3) — mais **seulement pour `seuil` et `vma`**, pas pour `allure-course` ni `longue`. Choix assumé : le ressenti d'une allure course ou d'une sortie longue est déjà largement couvert ailleurs (repère d'allure cible pour allure-course, note pratique hydratation pour la longue) — ajouter un repère de ressenti spécifique à ces deux-là n'a pas été jugé nécessaire.

### Banque de variantes

| Famille | Variante 1 | Variante 2 |
|---|---|---|
| Seuil | "Effort contrôlé, 3-4 mots max si tu devais parler." | "Ça doit rester soutenu mais pas explosif." |
| VMA | "Effort proche du maximum sur chaque répétition, récup complète entre les deux." | "L'intensité prime — mieux vaut une répétition de moins mais bien exécutée." |

## 3. Progression relative

### Principe et paramètres

Compare chaque séance qualité à l'occurrence antérieure la plus récente de même famille, **si et seulement si** deux conditions sont réunies simultanément :
- **Écart minimum de 3 semaines** (`ECART_MIN_SEMAINES = 3`) — pas la semaine juste précédente
- **Seuil de similarité de volume de 10%** (`SEUIL_SIMILARITE = 0.10`) — le `kmEstime` des deux séances comparées doit être proche à 10% près

Ces deux garde-fous sont volontairement stricts : l'intention est un repère **ponctuel et remarquable**, pas une routine qui se déclenche à chaque semaine. Les deux valeurs ont été ajustées empiriquement en testant sur un vrai plan généré (voir section 4, bug 1).

### Format du message

`"Volume similaire à S{numéro} (il y a {N} semaines) — la fatigue accumulée depuis peut se faire sentir."` — pas de banque de variantes ici (contrairement au reste des mécanismes de contenu de ce document), le message est généré dynamiquement avec le numéro de semaine et l'écart réels, donc intrinsèquement variable d'une occurrence à l'autre sans besoin de plusieurs formulations pré-écrites.

## 4. Deux bugs réels trouvés en implémentant ce mécanisme

Cette section documente deux vrais bugs (pas des hypothèses) découverts en testant l'implémentation avant de la committer — utile pour comprendre pourquoi les paramètres actuels sont ce qu'ils sont, et pour éviter de réintroduire les mêmes erreurs si ce code est retouché plus tard.

### Bug 1 — Seuil de similarité trop permissif puis trop strict

Première version : seuil à 15% de similarité, sans écart minimum de semaines. Résultat en testant sur un vrai plan généré : la note se déclenchait **presque à chaque semaine consécutive** (le moteur progresse le volume par petits paliers réguliers, donc deux semaines successives de même famille tombaient presque toujours dans une tolérance de 15%). Pas du tout l'esprit voulu (repère ponctuel).

Deuxième tentative : resserrement à 5% + ajout d'un écart minimum de 3 semaines. Résultat inverse : **zéro occurrence sur un plan de 35 semaines testé** — 5% était structurellement trop strict pour la façon dont le moteur fait varier le nombre de répétitions/durées d'une semaine à l'autre.

Valeur finalement retenue : 10%, entre les deux extrêmes testés — donne un résultat qualitativement satisfaisant (2 occurrences sur un plan de 11 semaines testé), sans garantie que ce soit la valeur optimale, seulement la première qui a donné un résultat raisonnable en test manuel.

### Bug 2 — Le pointeur d'historique "glissait" au lieu de rester fixé

Une fois le seuil ajusté, un deuxième bug est apparu : même avec des séances de volume **strictement identique** d'une semaine à l'autre (cas le plus favorable à un match), la note ne se déclenchait toujours jamais.

Cause : la première implémentation ne gardait que la **dernière** occurrence vue par famille (`derniereSemaineParFamille[famille] = {...}`, réécrit à chaque semaine), pas un historique complet. Donc à la semaine S3, la comparaison se faisait contre S2 (la dernière vue), jamais contre S1 — l'écart entre S3 et "la dernière vue" restait toujours de 1 semaine, jamais suffisant pour atteindre le seuil de 3.

Corrigé en gardant un **tableau complet** de l'historique par famille (`historiqueParFamille[famille] = [...]`), et en cherchant dans ce tableau la comparaison la plus pertinente (la plus récente qui respecte à la fois l'écart et le seuil), pas seulement la dernière occurrence.

Ce bug précis est reproduit explicitement dans `test-reperes-qualitatifs.mjs` (5 semaines de volume identique, vérifie que S4 matche S1 et S5 matche S2, pas la semaine immédiatement précédente à chaque fois) — un filet de sécurité contre une régression future sur cette même erreur.

## 5. Hypothèses non tranchées

- **Valeur définitive du seuil de similarité (10%)** : choisie empiriquement, pas dérivée d'un principe méthodologique documenté. Pourrait mériter un ajustement une fois observée sur plusieurs plans réels de profils différents (pas seulement celui de Laurent utilisé pour les tests).
- **Pas de repère de progression pour `allure-course`** : `injecterRepereRessenti()` filtre par `seance.type === 'qualite'` puis vérifie l'existence d'une banque pour la famille (`NOTES_RESSENTI[famille]`) — `allure-course` passe le premier filtre mais est naturellement exclue faute de banque dédiée. `injecterProgressionRelative()`, elle, n'a pas cette deuxième vérification : elle s'applique à **toute** séance qualité, y compris `allure-course`. Cette différence entre les deux fonctions n'a jamais été explicitement discutée — possiblement un oubli, possiblement un choix implicite non documenté au moment de l'écriture.

## 6. Fichiers concernés

- `public/v2/engine/plan-generator.js` — `NOTES_RESSENTI`, `injecterRepereRessenti()`, `injecterProgressionRelative()`
- `public/v2/engine/test-reperes-qualitatifs.mjs` — tests de non-régression, incluant la reproduction explicite du bug 2

## 7. Statut

**Implémenté et testé** (commit `bcc013e`, tôt dans la session du 6 juillet 2026). Fait partie des 6 chantiers de contenu du document de convergence, tous complétés le même jour.
