# Cohérence narrative de la semaine test — Run by Léa v2.0

Document de référence méthodologique pour le mécanisme de cohérence narrative autour de la séance test, implémenté dans `public/v2/engine/plan-generator.js`. Tranché et implémenté le 6 juillet 2026 — section 2.6 du document [`convergence-v1-v2.md`](./convergence-v1-v2.md).

---

## 1. Principe

La séance test (confirmation/recalibrage de l'allure objectif, placée vers la fin de la phase Spécifique) est un moment clé du plan qui mérite d'être signalé et entouré, pas juste traité comme une séance qualité comme les autres. Ce mécanisme enrichit **toute la semaine** qui contient la séance test, à trois niveaux distincts :

1. **Annonce** en tête de semaine (1er jour) — prépare l'utilisateur à ce qui l'attend
2. **Veille** — encourage à rester facile, garder de l'énergie
3. **Lendemain** — cadre la récupération après l'effort

**Origine** : v1 avait ce type de cohérence narrative codée en dur autour de sa séance test spécifique. Le moteur v2 plaçait bien une séance test (mécanisme distinct, `placerSeanceTest()`), mais sans aucun habillage narratif de la semaine qui l'entoure avant l'implémentation de ce mécanisme.

## 2. Contrainte d'ordonnancement — pourquoi ce mécanisme est séparé des jalons de transition

Point technique important, déjà noté dans le code et dans le document `jalons-narratifs.md` : ce mécanisme doit s'exécuter **après** `placerSeanceTest()`, qui elle-même est appelée en toute fin de `generatePlan()`, une fois l'objet `plan` complet construit — alors que `injecterJalonsTransition()`/`injecterNotesPratiques()`/etc. (sections 2.3 et 2.5) s'exécutent bien plus tôt dans la fonction, avant même que la séance test n'existe.

Techniquement, il aurait été possible de retarder tout l'appel de `injecterJalonsTransition()` pour qu'il se produise après `placerSeanceTest()`, et d'y intégrer la note d'annonce de la semaine test comme un jalon supplémentaire (c'est d'ailleurs ce que prévoyait l'intention initiale, cf. `jalons-narratifs.md` section 5). Le choix retenu a été de créer un mécanisme séparé plutôt que de restructurer l'ordre d'exécution des autres injections — plus simple sur le moment, au prix d'une banque de variantes dupliquée (cf. section 5 ci-dessous).

## 3. Règles de détection

Basées uniquement sur `estTest: true` (flag posé par `placerSeanceTest()` sur la séance concernée) — pas de logique de date ou de position dans le plan, entièrement dérivé de ce que le placement de la séance test a déjà déterminé.

| Position | Condition |
|---|---|
| **Annonce** | 1er jour de la semaine qui contient la séance test (`jours[0]`), à condition que ce jour ne soit pas lui-même la séance test |
| **Veille** | Jour juste avant l'index de la séance test dans la semaine (`indexTest - 1`), si `indexTest > 0` |
| **Lendemain** | Jour juste après (`indexTest + 1`), si ce jour existe dans la semaine |

**Garde-fou explicite** : si la séance test tombe elle-même sur le 1er jour de sa semaine (cas limite peu probable en pratique vu comment `placerSeanceTest()` positionne la séance, mais couvert par un test dédié), elle ne reçoit pas sa propre note d'annonce — testé explicitement dans `test-coherence-semaine-test.mjs`.

## 4. Format d'intégration — particularité par rapport aux autres mécanismes

Contrairement aux jalons de transition et notes pratiques (simple concaténation dans `contenu`), ce mécanisme **modifie aussi le champ `role`** des jours veille/lendemain : `veille.role = veille.role ? \`${veille.role}+veille-test\` : 'veille-test'`. Le rôle existant (`standard`, `recuperation`) est **préservé et étendu**, pas écrasé — un jour peut donc avoir un rôle composé comme `"recuperation+veille-test"`. Cette information de rôle composite n'est actuellement utilisée par aucun autre mécanisme du moteur — c'est une préparation pour un usage futur potentiel (ex. affichage différencié), pas encore exploitée.

## 5. Banque de variantes

Trois catégories, deux variantes chacune.

| Catégorie | Variante 1 | Variante 2 |
|---|---|---|
| Annonce | "Semaine test : l'occasion de vérifier où tu en es sur ton allure objectif." | "Cette semaine contient ta séance test — vise à arriver dessus en forme." |
| Veille | "Jambes fraîches pour demain — reste facile." | "Rien à prouver aujourd'hui, garde de l'énergie pour demain." |
| Lendemain | "Récupération après l'effort d'hier." | "Jambes qui tournent tranquillement après le test." |

## 6. Hypothèses non tranchées

- **Banque dupliquée avec les jalons de transition** (cf. section 2) : la note d'annonce de ce mécanisme et les jalons de transition (section 2.5) sont conceptuellement de même nature (signaler un moment clé du plan), mais vivent dans deux banques séparées (`NOTES_SEMAINE_TEST` vs `JALONS_TRANSITION`). Une vraie fusion architecturale (retarder l'appel de `injecterJalonsTransition()` pour qu'il tourne après `placerSeanceTest()`, et y intégrer ce cas) n'a jamais été tentée après l'implémentation initiale — resterait à faire si on veut vraiment unifier les deux mécanismes.
- **Un seul plan de course couvert** : le mécanisme suppose une seule séance test par plan (`estTest: true` sur une unique séance). Rien dans le code n'empêcherait plusieurs séances test si `placerSeanceTest()` évoluait pour en placer plusieurs (par exemple sur un plan très long) — le mécanisme actuel de cohérence narrative ne traiterait alors que la première trouvée par semaine, pas testé pour ce cas puisqu'il n'existe pas encore.

## 7. Fichiers concernés

- `public/v2/engine/plan-generator.js` — `NOTES_SEMAINE_TEST`, `injecterCoherenceSemaineTest()`
- `public/v2/engine/test-coherence-semaine-test.mjs` — tests de non-régression, incluant le garde-fou sur la séance test elle-même

## 8. Statut

**Implémenté et testé** (commit `d098f1a`, tôt dans la session du 6 juillet 2026). Fait partie des 6 chantiers de contenu du document de convergence, tous complétés le même jour.
