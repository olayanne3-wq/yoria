# Notes pratiques par type de séance — Run by Léa v2.0

Document de référence méthodologique pour le mécanisme de notes pratiques (conseils d'exécution ciblés par famille de séance), implémenté dans `public/v2/engine/plan-generator.js`. Tranché et implémenté le 6 juillet 2026 — section 2.3 du document [`convergence-v1-v2.md`](./convergence-v1-v2.md).

---

## 1. Principe

Une note pratique est un conseil court, ciblé sur **comment exécuter** une séance donnée — à distinguer des jalons narratifs (section 2.5, qui signalent un moment charnière du *plan*, pas un conseil sur la séance elle-même) et des repères qualitatifs (section 2.4, qui portent sur le *ressenti* et la *progression*, pas l'exécution).

**Origine** : v1 avait ce type de conseil ponctuel sur certains types de séance (`"Hydratation++ · Allonge selon la forme"` sur une sortie longue). Le moteur v2 n'avait aucune note de ce type.

## 2. Règle de détection

Basée sur la **famille** de la séance, pas son sous-type exact — un sous-type précis (ex. `seuil-negatif`) est rarement répété d'une occurrence à l'autre du même plan, donc grouper par famille (`seuil`, `vma`, `allure-course`, `longue`) donne une note pertinente à chaque fois plutôt que de risquer l'absence de note sur un sous-type trop spécifique.

| Sous-type v2 | Famille |
|---|---|
| `seuil-court`, `seuil`, `seuil-negatif`, `tempo-court`, `fartlek` | `seuil` |
| `i-30-30`, `i-3min`, `vitesse`, `pyramidale`, `cotes` | `vma` |
| `allure-course`, `allure-course-court` | `allure-course` |
| (type `longue`, indépendant du système de sous-types) | `longue` |

Ce mapping (`FAMILLE_SOUS_TYPE`) est **partagé** avec le mécanisme de repères qualitatifs (section 2.4) — une seule source de vérité pour la notion de "famille de séance qualité", pas dupliquée entre les deux mécanismes.

## 3. Format d'intégration

Identique au principe des jalons narratifs (section 2.5) : fusionné dans le champ `contenu` existant, par simple concaténation. `injecterNotesPratiques()` est indépendante de `injecterJalonsTransition()` — les deux peuvent s'appliquer à la même séance, auquel cas les deux notes se cumulent dans le contenu (jalon d'abord si les deux fonctions sont appelées dans cet ordre, mais l'ordre entre les deux n'a pas d'incidence fonctionnelle, seulement sur l'ordre d'affichage final).

## 4. Banque de variantes

Deux variantes par famille, tirées au sort à la génération.

| Famille | Variante 1 | Variante 2 |
|---|---|---|
| Sortie longue | "Hydrate-toi bien avant et pendant si besoin." | "Emporte de quoi boire si tu pars plus d'1h." |
| Seuil | "Effort contrôlé — tu dois pouvoir tenir une phrase courte, pas plus." | "Vise la régularité plutôt que la vitesse sur cette séance." |
| VMA | "Récupération complète entre les répétitions — pas de course contre la montre sur la récup." | "La qualité de l'effort compte plus que le nombre de répétitions." |
| Allure course | "Reste concentré sur ton allure cible, pas sur ce que tu pourrais tenir aujourd'hui." | "C'est l'occasion de sentir ton allure objectif dans les jambes." |

Ces textes correspondent exactement à `NOTES_PRATIQUES` dans `plan-generator.js` — pas de divergence entre la banque documentée ici et l'implémentation réelle.

**Absence volontaire d'une famille "test"** : la séance test (`sousType: 'test'`) n'a pas de note pratique dans ce mécanisme — cohérent avec le fait qu'elle a son propre traitement narratif complet dans le mécanisme de cohérence de la semaine test (section 2.6), qui couvre déjà largement ce moment.

## 5. Hypothèses non tranchées / pistes non explorées

Contrairement à la section 2.5 (où l'écart entre intention et implémentation était le point principal à documenter), ce mécanisme n'a pas d'écart connu — mais quelques pistes ont été évoquées sans être approfondies :

- **Étoffer la banque** : le document de convergence notait explicitement *"première proposition de banque, à étoffer"* — seulement 2 variantes par famille à ce stade, jamais élargi depuis l'implémentation initiale. Un candidat naturel pour une prochaine session si la répétitivité des notes devient perceptible en usage réel (avec un plan de plusieurs mois, la même paire de variantes finira par se répéter souvent).
- **Notes contextualisées par phase** : actuellement, la note "seuil" est la même que ce soit en Construction ou en phase Spécifique — une variante qui tiendrait compte de la progression (ex. une note différente pour la toute première séance seuil du plan vs une séance seuil en fin de programme) n'a jamais été envisagée concrètement, seulement une idée en passant.
- **Lien avec la météo (2.2)** : les notes pratiques et la note de chaleur (météo) peuvent toutes deux apparaître sur la même séance (ex. une sortie longue avec à la fois "Emporte de quoi boire" et la note de chaleur). Pas de vérification faite sur la redondance potentielle du message dans ce cas précis (les deux notes évoquent l'hydratation par la chaleur, sans se contredire, mais sans non plus être fusionnées intelligemment) — accepté tel quel, pas identifié comme un vrai problème mais jamais formellement vérifié en conditions réelles.

## 6. Fichiers concernés

- `public/v2/engine/plan-generator.js` — `FAMILLE_SOUS_TYPE` (mapping partagé avec 2.4), `NOTES_PRATIQUES` (banque), `injecterNotesPratiques()` (détection + injection)
- `public/v2/engine/test-notes-pratiques.mjs` — tests de non-régression

## 7. Statut

**Implémenté et testé** (commit `bf96c60`, tôt dans la session du 6 juillet 2026). Fait partie des 6 chantiers de contenu du document de convergence, tous complétés le même jour.
