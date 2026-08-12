# Pourquoi cette séance — Yoria v2.0

Document de référence méthodologique pour le mécanisme "pourquoi cette
séance" (explication du rôle physiologique/pédagogique d'une séance),
implémenté dans `public/v2/engine/plan-generator.js` et affiché dans
`public/index.html`.

---

## 1. Principe

Chaque séance du plan (EF, longue, qualité par famille, test, repos —
tout sauf la séance de course elle-même) porte un champ `pourquoi`,
une explication courte de son rôle dans la préparation. Contrairement
aux 5 mécanismes narratifs déjà existants (jalons de transition, notes
pratiques, repères qualitatifs, cohérence semaine test, jour de course
— cf. les fichiers dédiés), ce texte n'est **jamais concaténé** au
champ `contenu` de la séance : il vit dans un champ séparé, affiché
dans un repli/dépli distinct côté interface.

**Origine** : demande explicite de Laurent — le principe "quel est le
but de cette séance ?" (cf. `daniels-running-formula-synthese.md` §1.1)
s'applique à toute séance, pas seulement aux séances qualité. Une EF
n'est pas "rien" : elle a un rôle physiologique précis (renforcement
cardiaque, vascularisation) qu'un coureur débutant ne devine pas
forcément — c'est même le public qui en a le plus besoin.

## 2. Couverture

Toutes les séances reçoivent un `pourquoi`, sauf la séance de course
elle-même (`estCourse: true`, déjà auto-explicative via
`genererContenuRace()`) :

| Famille | Clé dans `POURQUOI_SEANCE` |
|---|---|
| EF standard | `ef` |
| EF récupération (`role: 'recuperation'`) | `ef-recuperation` |
| Sortie longue | `longue` |
| Seuil (et dérivés : seuil-court, tempo-court, seuil-2min, seuil-négatif) | `seuil` |
| VMA (i-3min, i-30-30, vitesse, pyramidale, côtes) | `vma` |
| Allure course | `allure-course` |
| Séance test | `test` |
| Repos | `repos` |

La séance test reçoit la clé `test` même si son `sousType` technique
est `test` (généré par `genererContenuTest`) — jamais la clé de la
famille sous-jacente qu'elle porterait autrement. Distinct de
l'annonce/veille/lendemain de `injecterCoherenceSemaineTest`
(`coherence-semaine-test.md`), qui parle du **moment** dans la semaine,
pas du **but** de la séance elle-même — les deux mécanismes coexistent
sur la même séance test sans se substituer l'un à l'autre.

## 3. Contextualisation par phase

Contextualisé par (famille × phase) uniquement quand la distinction a
un sens pédagogique réel :

- **Seuil** et **VMA** : texte différent en Construction vs Spécifique
  (le rôle physiologique évolue réellement — base vs entretien/
  préparation aux changements de rythme d'une vraie course)
- **EF**, **longue**, **allure-course**, **test**, **repos** : un seul
  texte `default`, valable sur toute la durée du plan — leur fonction
  physiologique ne change pas structurellement d'une phase à l'autre,
  inutile de varier.

## 4. Une seule variante par clé (pas de tirage aléatoire)

Contrairement à `JALONS_TRANSITION`/`NOTES_PRATIQUES`/etc. (2 variantes
tirées au sort), `POURQUOI_SEANCE` n'a **qu'une seule formulation par
clé**. Décision assumée : le "pourquoi" est une explication stable et
pédagogique, pas une note d'ambiance — la reformuler aléatoirement
d'une semaine à l'autre n'apporterait rien et rendrait le contenu
moins mémorisable pour un coureur qui reviendrait dessus.

## 5. Pas de lien avec l'état du coureur

Décision explicite, actée avec Laurent : le texte reste statique, sans
lien avec la fatigue/ACWR/l'historique récent. Le moteur de décision a
déjà son propre mécanisme d'explication pour ses décisions réactives
(`journaliserDecisionEvent`, cf. `moteur-decision.md`) — mélanger les
deux systèmes pour un gain marginal sur des séances simplement placées
par le générateur (pas décidées dynamiquement) n'a pas été jugé
pertinent.

## 6. Propagation vers l'interface (`v1-bridge.js`)

`seance.pourquoi` est un champ direct du plan brut v2, propagé sans
reparsing (même principe que `kmEstime`/`structureIntervalles`, cf.
`moteur-plan.md`) — jamais reconstruit depuis le texte de `contenu`.
Piège déjà documenté dans `v1-bridge.js` : tout nouveau champ
personnalisé doit être explicitement propagé dans
`traduirePlanVersFormatV1()`, sinon silencieusement perdu — c'est
exactement ce qui a été fait pour ce champ dès son ajout.

## 7. Affichage (`index.html`)

`renderPourquoiToggle(pourquoi)` — repli/dépli au clic, même pattern
visuel que le détail des répétitions déjà existant
(`renderBlocRealise`) : résumé cliquable "🎯 Pourquoi cette séance /
▼ détail", qui affiche le texte complet au clic. Retourne `null` si
`pourquoi` est absent (séance de course, ou plan généré avant l'ajout
de ce mécanisme) — pas de repli vide affiché. Présent sur les deux
vues qui affichent une séance : carte "Aujourd'hui" et détail Semaine.

## 8. Rétro-compatibilité — décision de ne PAS rattraper les anciens plans

Un plan généré **avant** l'ajout de ce mécanisme n'a jamais eu de champ
`pourquoi` sur ses séances — `injecterPourquoiSeance()` ne s'exécute
que dans `generatePlan()`, jamais rappelée sur un plan déjà sauvegardé.

Un correctif de rattrapage rétroactif au chargement a été implémenté
puis **retiré sur demande explicite de Laurent** : le coût d'un bloc de
code permanent, exécuté à chaque chargement de plan pour toujours, n'a
pas été jugé justifié pour un bénéfice purement cosmétique (texte
affiché). Un plan existant affiche donc les anciennes séances sans
`pourquoi` (repli `renderPourquoiToggle` → `null`, rien affiché) jusqu'à
sa prochaine régénération naturelle (adaptation, changement de volume,
etc.) — cf. principe transverse dans `inventaire-application.md` sur le
coût des rattrapages rétroactifs.

## 9. Fichiers concernés

- `public/v2/engine/plan-generator.js` — `POURQUOI_SEANCE` (banque),
  `determinerCleFamillePourquoi()`, `injecterPourquoiSeance()` — appelée
  en tout dernier dans `generatePlan()`, après que `estTest`/`estCourse`/
  `role` soient définitivement posés sur toutes les séances
- `public/v2/engine/v1-bridge.js` — propagation du champ `pourquoi`
  dans `traduirePlanVersFormatV1()`
- `public/index.html` — `renderPourquoiToggle()`, appelée dans la carte
  "Aujourd'hui" et le détail Semaine

## 10. Statut

Implémenté, testé (couverture de toutes les familles, exclusion de la
séance de course, séance test correctement distinguée de son
`sousType`). Pas de rattrapage rétroactif sur les plans existants
(décision assumée, cf. §8).
