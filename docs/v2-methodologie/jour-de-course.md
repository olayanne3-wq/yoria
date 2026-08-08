# Jour de course et semaine d'approche — Yoria v2.0

Document de référence méthodologique pour le mécanisme de traitement du jour de course et de la semaine qui le précède, implémenté dans `public/v2/engine/plan-generator.js`.

---

## 1. Principe

Le mécanisme le plus dense des chantiers de contenu narratif, en deux parties distinctes :

1. **Jour de course** : remplace la sortie longue générique du dernier jour du plan par une vraie séance de course, avec une stratégie de segments (pacing) qui varie selon la distance
2. **Semaine d'approche** : repères J-3/J-2/veille et consignes logistiques sur les 3 derniers jours avant course, plus un garde-fou sportif qui empêche toute séance qualité dans les 2 derniers jours

**Origine** : la v1 avait ce traitement codé en dur pour une course spécifique à date fixe. Le moteur v2 générait bien des semaines cohérentes en durée, mais le dernier jour restait une sortie longue générique — pas de vraie séance de course, pas de semaine d'approche différenciée.

## 2. Stratégie de pacing par distance

Décision méthodologique de fond : **pas un pattern unique généralisé** à toutes les distances — chaque distance a une vraie logique de course différente, basée sur la littérature.

| Distance | Stratégie | Détail des segments |
|---|---|---|
| **5K** | Quasi-plat, progression légère | Km 1 : +4s/km vs allure cible · Km 2 : allure cible · Km 3-4 : accélération progressive vers -3s/km · Dernier km : tout donner |
| **10K** | 2 segments nets | 1ère moitié (~5 premiers km) : +6.5s/km vs allure cible (prudent) · 2e moitié : allure maximale soutenable, vise l'allure cible |
| **Semi / Marathon** | Allure stable, marge de sécurité | Premiers km : +5s/km vs allure cible (pas de paliers marqués) · Corps de course : allure cible · Derniers km : ajustement au ressenti, pas d'accélération programmée |

Semi et Marathon partagent la même logique (`else` générique dans le code, pas de branche séparée) — le raisonnement méthodologique (départ prudent, ajustement au ressenti en fin de course plutôt que paliers marqués) a été jugé identique pour les deux distances, à la différence du 5K et du 10K qui ont chacun leur propre traitement.

## 3. Garde-fou sportif — pas de qualité dans les 2 derniers jours

**Découverte en cours d'implémentation, pas prévue initialement.** En testant un plan complet généré, un vrai problème est apparu : la rotation de la phase Affûtage du moteur peut placer une séance qualité (ex. allure-course) à J-2 avant la course, sans tenir compte de la proximité de l'échéance — contredisant à la fois la logique sportive (pas d'intensité juste avant course) et, une fois les notes logistiques ajoutées, produisant une incohérence textuelle absurde ("Repos total, priorité à l'hydratation" collé sur une vraie séance d'intensité).

**Correction** : `injecterApprocheCourse()` convertit toute séance de type `qualite` trouvée à J-2 ou J-1 en EF très léger (`kmEstime` réduit à 40% de sa valeur d'origine), **avant** d'injecter les notes logistiques — pour que le texte reste cohérent avec le contenu réel de la séance.

**Bug de robustesse trouvé en testant ce garde-fou** : la première implémentation localisait le jour de course via `Object.values(assignment).findIndex(j => j.estCourse)` — ce qui suppose que l'objet `assignment` a ses 7 clés (0 à 6) contiguës pour que la position dans le tableau corresponde au bon jour de la semaine. Vrai pour un plan généré normalement, mais pas garanti dans tous les cas (par exemple un `assignment` partiel utilisé dans un test). Corrigé en utilisant directement la **clé numérique** du jour (`Number(cleCourse)`), pas sa position dans un tableau dérivé — plus robuste, indépendant de la complétude de l'objet source.

## 4. Repères J-3/J-2/veille

### Banque de variantes

| Jour | Variante 1 | Variante 2 |
|---|---|---|
| J-3 | "J-3 : footing léger uniquement, rien de plus." | "Encore 3 jours. Cette séance reste volontairement courte et facile." |
| J-2 | "Hydratation et sommeil : les deux leviers qui comptent le plus maintenant." | "Repos total aujourd'hui — priorité à l'hydratation et à un bon sommeil." |
| Veille | "Pâtes le soir, coucher tôt. Prépare ce dont tu as besoin pour demain." | "Repos complet, repas riche en glucides ce soir, et au lit tôt." |

### Cas limite corrigé : le garde-fou J-2/veille pouvait laisser le texte non séparé

Deuxième bug trouvé, distinct du bug de robustesse ci-dessus : le module `v1-bridge.js` (traduction vers le format v1) parse le contenu texte des séances pour en extraire warmup/session/cooldown/notes. Le pattern de parsing pour les séances EF/longue cherchait une distance chiffrée (`"— X.Xkm"`), absente du format spécifique produit par le garde-fou J-2 ("Footing très léger, aucune intensité à N jour(s) de la course."). Résultat : la note logistique ajoutée ensuite (ex. "Hydratation et sommeil...") se retrouvait **fusionnée dans le même champ** que le contenu principal, sans séparation.

Corrigé côté `v1-bridge.js` (pas dans ce fichier) avec un pattern de repli : coupure à la première phrase terminée par un point, qui couvre ce format sans distance chiffrée. Documenté ici parce que le bug était directement causé par l'interaction entre ce mécanisme et le module de traduction — un exemple concret de la nécessité de tester l'intégration bout en bout, pas seulement chaque mécanisme isolément.

## 5. Hypothèses non tranchées

- **Valeurs des décalages de pace (+4s, +6.5s, +5s) non re-vérifiées empiriquement sur de vraies courses** : dérivées de la littérature, mais jamais confrontées à un vrai résultat de course pour validation.
- **Réduction à 40% du `kmEstime`** pour le garde-fou J-2/veille : valeur choisie sans calcul précis (juste "fortement réduit"), pas dérivée d'une vraie distance de footing léger typique. Pourrait mériter un calcul plus rigoureux (ex. une durée fixe de 15-20min convertie en distance à l'allure EF, plutôt qu'un pourcentage de l'ancien volume qualité).
- **Le garde-fou ne couvre que J-2 et J-1** : rien n'empêche une séance qualité à J-3, qui reste couverte seulement par la note "footing léger uniquement" (texte informatif) sans conversion automatique du contenu — contrairement à J-2/J-1 où le contenu lui-même est modifié. Choix implicite non discuté explicitement : J-3 est jugé suffisamment loin de la course pour qu'une séance qualité normale reste acceptable, mais ce n'est pas un principe sportif formellement justifié, juste une limite pragmatique du garde-fou tel qu'implémenté.

## 6. Fichiers concernés

- `public/v2/engine/plan-generator.js` — `genererContenuRace()`, `placerSeanceCourse()`, `NOTES_APPROCHE_COURSE`, `injecterApprocheCourse()`
- `public/v2/engine/test-jour-course.mjs` — tests de non-régression pour le contenu de course par distance
- `public/v2/engine/test-approche-course.mjs` — tests de non-régression pour les repères J-X et le garde-fou sportif, incluant la reproduction explicite du bug de robustesse (section 3)

## 7. Statut

Implémenté et testé. Fait partie d'un ensemble de 6 chantiers de contenu narratif, tous livrés ensemble (cf. `jalons-narratifs.md`, `notes-pratiques.md`, `reperes-qualitatifs.md`, `coherence-semaine-test.md`, `notes-meteo.md`).
