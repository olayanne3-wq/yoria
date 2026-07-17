# Synthèse — Daniels' Running Formula (Jack Daniels, 4e édition)

**Source** : extrait fourni en contexte (préface + chapitres 1 à 4, jusqu'au
tableau des séances T pace inclus — le document s'arrête avant le détail
des séances I/R et avant le chapitre 5 VDOT). Cette synthèse ne couvre que
ce qui a été réellement lu, pas le reste du livre.

**Objectif de ce document** : extraire les principes directement
exploitables pour Yoria (moteur de décision, calcul de charge, structure
des séances, allures), pas un résumé exhaustif du livre.

---

## 1. Principes de fond — pertinents pour la philosophie du moteur

### 1.1 "Quel est le but de cette séance ?"
Question that l'auteur répète comme fil rouge de tout le livre. Chaque
séance doit avoir une justification physiologique claire. Directement
aligné avec le principe déjà posé dans `moteur-decision-architecture.md`
§1 : chaque décision du moteur doit être **explicable**, jamais une
justification inventée a posteriori.

### 1.2 Loi de la réaction au stress (Principe 1) et de la spécificité (Principe 2)
Le corps réagit à un stress spécifique de façon prévisible, et se renforce
pendant le **repos**, pas pendant l'effort lui-même. C'est le fondement
théorique de toute la logique ACWR/charge chronique-aiguë déjà implémentée
dans `DecisionEngineRunnerState`.

### 1.3 Principe de surstress (overstress) — pertinent pour les garde-fous
> "Quand vous hésitez entre deux séances, choisissez la moins stressante."

C'est un principe directement transposable en règle de moteur : en cas
d'ambiguïté ou de doute sur l'état du coureur, le biais par défaut doit
être conservateur. Cohérent avec le principe déjà acté "sécurité avant
performance" (doc archi §1) et avec les garde-fous §10.2 déjà codés (borne
dure -30%, plafond cumulé -25%/14j).

### 1.4 Principe de réponse à l'entraînement (Principe 4) et loi des rendements décroissants (Principe 6)
- Un nouveau palier de stress produit un gain de fitness qui plafonne après
  6 à 8 semaines environ — au-delà, il faut un nouveau palier de stress
  pour progresser encore.
- Plus le coureur est déjà performant, moins un effort supplémentaire
  rapporte (rendements décroissants) — et inversement, un coureur peu
  entraîné progresse vite avec un effort modéré.

**Piste d'exploitation pour Yoria** : ce principe suggère qu'une **règle de
palier** (rester sur le même niveau de stress 6-8 semaines avant
d'augmenter) pourrait informer `TrendAnalyzer` (Module 4) ou une future
règle `progression` — actuellement le catalogue de règles ne modélise pas
explicitement cette temporalité de 6-8 semaines.

### 1.5 Principe des limites personnelles et courbe accélérée des blessures (Principes 5 et 7)
Deux courbes qui se croisent : au-delà d'un certain niveau de stress
d'entraînement, le risque de blessure/désengagement augmente plus vite que
le bénéfice de fitness. La zone d'entraînement idéale se situe **avant**
ce point de croisement — pas au maximum de bénéfice théorique.

**Lien direct avec le moteur existant** : c'est la justification théorique
de l'ACWR (§5.2 doc archi, seuils 1.3/1.5 déjà codés en R-050) et de la
borne dure -30% déjà en place — le livre légitime scientifiquement des
mécanismes déjà implémentés, sans en suggérer de nouveaux à ce stade.

### 1.6 Principe de maintien (Principe 8)
Il est plus facile de **maintenir** un niveau de fitness acquis que de
l'atteindre — physiologiquement documenté (taper, alternance
interval/threshold). Pertinent pour toute future règle de type
`demarrer_taper` (mentionnée dans le catalogue théorique mais pas encore
codée) : réduire le volume avant une course n'implique pas nécessairement
une perte de forme si le stimulus est maintenu à plus faible dose.

---

## 2. Classification E / M / T (et I / R non détaillés dans cet extrait)

Le livre découpe l'entraînement en 5 intensités : **E**asy, **M**arathon,
**T**hreshold, **I**nterval, **R**epetition. Cet extrait couvre en détail
E, M et T ; I et R ne sont pas encore lus (coupure du document).

| Type | % VO2max | % FCmax | Rôle principal |
|---|---|---|---|
| E (Easy) | 59–74% | 65–79% | Base aérobie, résistance blessure, renforcement cardiaque |
| M (Marathon) | 75–84% | 80–89% | Adaptation à l'allure course, confiance, gestion glucidique |
| T (Threshold) | 85–88% (bien entraînés) / 80–86% (moins entraînés) | 88–92% | Clairance du lactate, endurance à allure soutenue |
| I (Interval) | *non détaillé dans cet extrait* | | |
| R (Repetition) | *non détaillé dans cet extrait* | | |

### 2.1 Allure E — déjà cohérent avec l'implémentation Yoria
`__PLAN_BRUT__.allures.E` existe déjà dans le code et est utilisé pour les
séances EF/LONGUE. Le livre confirme l'usage de cette allure aussi pour
l'échauffement et le retour au calme des séances qualité — cohérent avec
la décision prise le 17/07/2026 d'utiliser cette même allure pour dériver
la distance de récup/échauffement/RAC dans `distanceTotaleAvecRecup()`
(cf. inventaire §34.2).

### 2.2 Durées limites — utile pour valider les bornes déjà en place
- Course longue (L) : jamais plus de 150 min (2h30), même pour un
  marathon — limite en **temps**, pas en distance.
- Volume L max : 30% du volume hebdo si <40 mi/sem, sinon min(25%, 150min).
- M pace en une session : jamais plus de 110 min ou 18 mi (le plus petit).
- T pace en une session continue : max ~20 min ; en cruise intervals,
  jusqu'à 30 min cumulés.

**Piste d'exploitation** : ces bornes pourraient servir de référence pour
une future règle de validation de plan (le `plan-generator` respecte-t-il
déjà ces limites ? à vérifier séparément, hors périmètre de cette
synthèse).

### 2.3 Règle des 10% de progression — le livre la nuance
Le livre **critique explicitement** la règle classique "+10% de volume par
semaine" comme trop agressive dès le début, et lui préfère : rester sur un
palier 3-4 semaines, puis augmenter d'un bloc plus généreux (ex. +5 mi
d'un coup après un palier à 10 mi, plutôt que +1 mi chaque semaine).

**Tension à noter avec la littérature déjà citée dans le moteur** : le
doc archi §11 cite déjà une revue systématique sur "la règle des 10%"
(23 047 coureurs) — cette synthèse Daniels apporte un avis de coach
expérimenté qui nuance/complète la littérature académique déjà citée,
sans la contredire frontalement (les deux s'accordent sur le risque d'une
progression trop linéaire).

---

## 3. Formule de séance M-pace (Table 4.1) — structures réutilisables

Le livre propose des combinaisons E+M+T dans une même séance (ex. "60 min
E + 30 min M + 10 min E"), avec l'idée que **revenir à l'allure M après un
passage à T est plus dur que l'inverse** — utile pour préparer un coureur
aux changements de rythme d'une vraie course.

**Pertinence pour Yoria** : le moteur ne génère actuellement (via
`plan-generator`) que des séances à une seule intensité dominante par
créneau qualité (VMA/SPEC/SEUIL/TEST) — les séances mixtes E+M+T ne sont
pas dans la bibliothèque actuelle (`bibliotheque-seances.md`, à vérifier
séparément). Piste future, hors périmètre de cette synthèse.

---

## 4. Ce qui reste à lire (non couvert par cet extrait)

Pour aller plus loin utilement, la suite du livre couvrirait notamment :
- **Chapitre 4 (fin)** : détail des séances I (interval) et R (repetition)
- **Chapitre 5** : système VDOT — méthode déjà partiellement présente dans
  le code Yoria (`vmaSec`, `specSec`, `seuilSec` dans `SESSION_TARGETS`),
  utile de comparer la vraie formule VDOT du livre à l'implémentation
  actuelle pour vérifier la cohérence
- **Chapitre 3** : profils physiologiques (VO2max, économie de course,
  lactate) — potentiellement pertinent pour affiner le calcul de charge
  au-delà du TRIMP/sRPE actuel
- **Chapitres 11-18** : entraînement par distance de course (dont chapitre
  16, marathon — directement pertinent vu l'objectif actuel de Laurent,
  semi-marathon le 1er novembre 2026)

Si tu ajoutes la suite du livre en contexte dans une prochaine session,
cette synthèse peut être complétée section par section plutôt que refaite
depuis zéro.
