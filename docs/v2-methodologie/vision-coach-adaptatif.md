# Vision — Évolution du moteur de décision vers un coach adaptatif à mémoire

> Document de VISION, pas un plan de travail engagé. Consigné le 24/07/2026
> pour ne pas perdre la réflexion, à réactiver explicitement quand les
> conditions de déclenchement (cf. fin de document) seront réunies. Ne pas
> commencer à coder cette brique sans revalidation explicite avec Laurent.
>
> **Étape 1 démarrée le 24/07/2026** : pure collecte de données
> (`decision_events`/`decision_outcomes`), sans aucune exploitation. Ne
> constitue PAS un début d'engagement sur les étapes suivantes
> (`athlete_profiles`, `learned_parameters`, personnalisation du
> `RuleEngine`) — ces dernières restent soumises aux conditions de
> déclenchement en fin de document. Détail de l'implémentation : cf.
> `docs/v2-methodologie/inventaire-application.md` §5 et §8.
>
> **Validée en conditions réelles le 24/07/2026** : une vraie décision
> R-060 (alerter_tendance_fatigue) a déclenché la journalisation, vérifiée
> en console — `decision_events` insérée avec contexte complet, statut
> `proposee` → `ignoree` au clic. Chaîne de bout en bout fonctionnelle.

## Contexte

Le moteur de décision actuel (`docs/v2-methodologie/inventaire-application.md`
§8) est un moteur de règles expert, déterministe, explicable, stateless par
design : chaque décision est recalculée depuis l'état physiologique du
moment (TRIMP, ACWR, fatigue), avec des seuils fixes identiques pour tout
coureur.

Cette vision propose d'ajouter une couche de **mémoire par coureur**
au-dessus de ce moteur — sans jamais le remplacer. Le moteur de règles reste
seul décideur ; la mémoire ne fait qu'ajuster progressivement certains
paramètres qu'il utilise.

**Nature du changement** : pas incrémental. Ça touche le schéma Supabase
(nouvelles tables), le `RuleEngine`/`DecisionEngineApply` (seuils constants
→ lookups personnalisés), et introduit un concept qui n'existe pas
aujourd'hui : une boucle d'évaluation a posteriori (décision → résultat →
mise à jour de confiance). Rien de tel n'existe dans le moteur actuel.

## Ce qui ne change pas (garde-fous de principe)

- Le moteur de règles reste responsable de la sécurité, des décisions, de la
  priorité des règles, des limites d'adaptation, de l'explication des
  décisions.
- Aucune IA générative ne modifie directement un plan d'entraînement.
- Un paramètre appris ne doit jamais pouvoir dépasser les bornes déjà en dur
  du moteur actuel (`base`/`cap` par sous-type, plafond −30 % par décision,
  25 %/14j glissants) — point non résolu dans la version initiale de cette
  vision, à trancher explicitement avant tout code : comment un paramètre
  "appris" (ex. seuil de fatigue personnel) interagit avec un garde-fou
  actuellement codé en dur.

## Architecture cible (schéma de principe)

```
Activités (Strava, Garmin, etc.)
        → Calcul des indicateurs
        → Mémoire du coureur
        → Paramètres personnalisés
        → Moteur de règles (inchangé)
        → Décision sécurisée
        → Application au plan
        → Observation du résultat
        → Mise à jour progressive de la mémoire
```

## Trois niveaux de mémoire

1. **Mémoire courte** — éviter les oscillations du moteur (chaque décision
   mémorisée : règle déclenchée, date, raison, séance concernée, adaptation
   appliquée, durée de validité, statut). **Implémentée en étape 1
   (24/07/2026)** via `decision_events`/`decision_outcomes`, en écriture
   pure — aucune lecture ne l'exploite encore. Chevauchement avec l'existant
   (`historiqueReductionsMoteur`, `lk_regression_allures_en_attente`,
   `predHistory`) volontairement non tranché à ce stade : ces mécanismes
   continuent de fonctionner sans changement, `decision_events` est un
   journal parallèle, pas un remplacement — à trancher explicitement si/quand
   l'étape 2 (exploitation) est engagée.
2. **Profil personnel** — valeurs propres au coureur (récupération
   habituelle, fatigue normale, sensibilité chaleur, tolérance volume,
   tolérance séances rapides, RPE moyen, dérive cardiaque habituelle,
   vitesse d'assimilation). **Non commencé** — décision explicite du
   24/07/2026 de ne pas créer `athlete_profiles` à ce stade : ces valeurs
   sont toutes calculables a posteriori depuis `decision_events`/
   `decision_outcomes` une fois qu'il y aura assez d'historique, donc rien
   n'est perdu à attendre. Seule exception qui justifierait une collecte
   immédiate : un champ déclaratif (ressenti du coureur, non déductible
   d'une activité) — aucun identifié pour l'instant.
3. **Mémoire longue** — historique complet des décisions avec contexte,
   décision, résultat obtenu, efficacité. Même implémentation que le point 1
   (`decision_events`/`decision_outcomes` couvrent aussi ce rôle — pas de
   distinction technique entre "mémoire courte" et "mémoire longue" dans
   l'implémentation actuelle, une seule paire de tables sert les deux
   usages).

## Tables proposées (Supabase)

- `athlete_profiles` — une ligne par utilisateur, paramètres personnalisés
  — **non créée**, cf. point 2 ci-dessus
- `decision_events` — historique complet des décisions — **créée et
  alimentée depuis le 24/07/2026**
- `decision_outcomes` — résultat réel (séance réalisée, RPE, fatigue,
  douleur, réussite) — **créée et alimentée depuis le 24/07/2026**
- `learned_parameters` — paramètres appris progressivement, chacun avec
  valeur / confiance / nombre d'observations — **non créée**

## Détail de l'implémentation étape 1 (24/07/2026)

Écriture depuis `public/index.html`, best-effort systématique (jamais
bloquant, jamais d'impact visible en cas d'échec) :

- `journaliserDecisionEvent()` — insère une ligne `decision_events` dès
  qu'une décision est produite et affichée (carte du dashboard), avec le
  contexte complet au moment T (`runnerState`, `engagementState`,
  readiness du jour, justification). Statut initial `proposee`. Anti-doublon
  par décision/jour (`lk_dernier_decision_event_id`, même logique que
  `lk_decision_moteur_ignoree` déjà existant) — capture aussi les décisions
  jamais cliquées, pas seulement celles sur lesquelles le coureur agit.
- `mettreAJourStatutDecisionEvent()` — bascule le statut à `appliquee`
  (avec l'ampleur réellement appliquée, post-arrondi), `ignoree`, ou
  `refusee` (cf. ci-dessous, 24/07/2026), aux points d'interaction
  correspondants.
- **Statut `refusee` (24/07/2026)** — distingue une décision jamais tentée
  (`proposee`/`ignoree`) d'une décision que le coureur a essayé d'appliquer
  mais que `DecisionEngineApply.appliquerDecisionAuPlan` a refusée (ex.
  plafond de réduction cumulée 25 %/14j atteint, aucune cible sûre restante
  cette semaine). Sans ce statut, ces deux cas étaient indiscernables dans
  le journal — utile plus tard pour distinguer "le coureur n'a jamais agi"
  de "le coureur a voulu agir mais le garde-fou l'en a empêché". La raison
  exacte du refus (`resultat.raison`) est stockée dans
  `contexte.raisonRefus` (jsonb existant), pas une nouvelle colonne — évite
  une migration de schéma pour un champ utilisé dans ce seul cas. Migration
  associée : `migration-statut-refusee.sql` (élargit la contrainte `check`
  sur `decision_events.statut`).
- `observerDecisionOutcomes()` — appelée une fois par chargement de page
  (pas à chaque `render()`). Pour chaque `decision_events` des 7 derniers
  jours sans `decision_outcomes` associé, cherche la première séance
  ultérieure avec un statut connu (`statutEffectif`) et enregistre le
  résultat (statut, RPE, délai en jours). Association décision→séance
  volontairement simple (première séance suivante avec statut connu) — pas
  de logique pour déterminer PRÉCISÉMENT quelle séance visait la décision,
  cette précision n'a de sens qu'au moment de l'exploitation future.
  **Non encore vérifiée en conditions réelles** (contrairement à
  `decision_events`) — nécessite qu'une séance ait lieu après une décision
  journalisée, puis un nouveau chargement de page.

Schéma SQL complet (tables, index, RLS par propriétaire) dans
`schema-decision-memory.sql`, à exécuter une fois dans Supabase (SQL
Editor) — RLS : lecture/écriture strictement limitées au propriétaire
(`decision_events.user_id = auth.uid()`, `decision_outcomes` via
sous-requête sur `decision_event_id`). Migration `migration-statut-
refusee.sql` à exécuter après (élargit `statut` à 4 valeurs).

## Principe d'apprentissage

Aucun Machine Learning nécessaire dans un premier temps — moyennes
pondérées, observations successives, niveau de confiance. Modifications
toujours lentes, jamais de changement brutal d'un profil (cohérent avec le
principe déjà appliqué dans le moteur actuel : régression d'allures
confirmée sur 2 périodes consécutives avant d'agir, cf. §7 de l'inventaire).

Exemple de généralisation d'une règle existante :
- Aujourd'hui : `fatigue > 75` → réduction 15 % (seuil fixe, universel)
- Demain : `fatigue > seuil_personnel` → réduction personnalisée (seuil
  appris par coureur)

## Nouvelles règles envisagées (le moteur actuel est essentiellement défensif)

Le moteur actuel détecte fatigue / surcharge / séances ratées / déficit de
volume. Pistes de règles de progression, jamais automatiques pour les
décisions à fort impact (ex. objectif) :
- Bonne récupération → retour progressif au plan normal
- Charge bien assimilée → maintien ou légère progression
- Progression confirmée → révision prudente des allures
- Objectif devenu trop facile → suggestion (jamais automatique)
- Séances de qualité parfaitement maîtrisées → progression des prochaines
  séances

## Adapter plus que le volume (au-delà de `reduire_charge` actuel)

D�placer une séance, remplacer une séance rapide, ajouter un jour de
récupération, réduire uniquement l'intensité, modifier la semaine suivante,
déclencher une semaine allégée, revoir l'objectif — toujours avec les mêmes
garde-fous que le moteur actuel.

## Contraintes strictes

Ne jamais : supprimer une règle de sécurité existante, modifier brutalement
un seuil, apprendre sur un nombre d'observations insuffisant, supprimer une
règle experte, laisser une IA générative décider.

## Risque principal identifié (24/07/2026)

Avec un seul utilisateur réel (Laurent, 2-4 séances/semaine), la
convergence de `learned_parameters` sera nécessairement lente — le volume
d'observations nécessaire pour qu'un paramètre appris soit statistiquement
fiable ne sera atteint qu'après plusieurs mois pour un seul profil. La
vraie valeur de cette brique n'arrivera probablement qu'avec plusieurs
utilisateurs réels (post-v2.5/commercialisation), où l'apprentissage a un
sens statistique à l'échelle de la base d'utilisateurs (pas juste par
individu). C'est précisément pourquoi l'étape 1 se limite à la collecte :
elle prépare le terrain sans dépendre du nombre d'utilisateurs.

## Conditions de déclenchement (avant de coder les étapes suivantes)

1. Le moteur de décision actuel (déterministe) est stable et éprouvé sur
   plusieurs mois de vraies données.
2. Il y a plusieurs utilisateurs réels, pour donner un sens statistique à
   l'apprentissage de paramètres.
3. Le chevauchement avec les mécanismes de mémoire déjà existants
   (`historiqueReductionsMoteur`, `predHistory`, etc.) a été explicitement
   tranché — remplacement ou coexistence.
4. L'interaction paramètre appris ↔ garde-fous en dur (bornes `base`/`cap`,
   plafonds de cumul) est spécifiée avec un exemple concret avant tout code.

Si ces conditions sont réunies, prévoir une session de conception dédiée
(pas un patch incrémental) — découpage suggéré : d'abord exploiter en
lecture simple `decision_events`/`decision_outcomes` déjà collectées
(étape 1), avant d'introduire `athlete_profiles`/`learned_parameters` et la
boucle d'apprentissage pondéré.
