# Vision — Évolution du moteur de décision vers un coach adaptatif à mémoire

> Document de VISION, pas un plan de travail engagé. Consigné le 24/07/2026
> pour ne pas perdre la réflexion, à réactiver explicitement quand les
> conditions de déclenchement (cf. fin de document) seront réunies. Ne pas
> commencer à coder cette brique sans revalidation explicite avec Laurent.

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
   appliquée, durée de validité, statut). Chevauchement à clarifier avec
   l'existant : `historiqueReductionsMoteur`, `lk_regression_allures_en_attente`,
   `predHistory` jouent déjà partiellement ce rôle de façon éparpillée —
   avant de créer `decision_events`, déterminer si ça remplace ou s'ajoute à
   ces mécanismes.
2. **Profil personnel** — valeurs propres au coureur (récupération
   habituelle, fatigue normale, sensibilité chaleur, tolérance volume,
   tolérance séances rapides, RPE moyen, dérive cardiaque habituelle,
   vitesse d'assimilation).
3. **Mémoire longue** — historique complet des décisions avec contexte,
   décision, résultat obtenu, efficacité.

## Tables proposées (Supabase)

- `athlete_profiles` — une ligne par utilisateur, paramètres personnalisés
- `decision_events` — historique complet des décisions
- `decision_outcomes` — résultat réel (séance réalisée, RPE, fatigue,
  douleur, réussite)
- `learned_parameters` — paramètres appris progressivement, chacun avec
  valeur / confiance / nombre d'observations

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

Déplacer une séance, remplacer une séance rapide, ajouter un jour de
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
individu).

## Conditions de déclenchement (avant de coder quoi que ce soit)

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
(pas un patch incrémental) — découpage suggéré : d'abord `decision_events`
en lecture/écriture simple sans notion de confiance, avant d'introduire
`learned_parameters` et la boucle d'apprentissage pondéré.
