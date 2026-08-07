# Source de données des séances (Strava / manuel) — Run by Léa

Document de conception du chantier permettant à un utilisateur de suivre son plan et d'alimenter l'estimation 10K **sans dépendre de Strava** — posé avant la mise en ligne sur le Play Store, où les utilisateurs n'auront pas tous un compte Strava. Décisions tranchées le 13 juillet 2026.

---

## 1. Constat de départ

Audit du code existant (`public/index.html`) avant d'ajouter quoi que ce soit :

- Le suivi du plan (validation d'une séance, calcul du taux de complétion, export PDF, adaptation du plan) repose sur `statuses[uid]` (`✅`/`⚠️`/`❌`/`—`), stocké indépendamment de Strava. **Ce mécanisme fonctionne déjà sans Strava** — un bouton de validation manuelle (`renderStatusRow`) existe pour chaque séance.
- Strava (`stravaActivities`) n'intervient que pour **enrichir** l'affichage d'une séance déjà validée (distance/allure/FC réelles, lien vers l'activité) et pour **alimenter le prédicteur 10K** (`predict10K`, `predict10KAtDate`), qui calcule une vitesse moyenne pondérée à partir des laps Strava des séances SPEC et VMA.
- **Sans Strava, le prédicteur reste bloqué sur `BASE_TIME_REFERENCE`** (estimation statique de référence), jamais affiné par la performance réelle. C'est la vraie fonctionnalité qui se dégrade sans Strava — pas le suivi du plan lui-même.

Conclusion : le chantier ne consiste pas à rendre l'app "utilisable sans Strava" (elle l'est déjà pour le suivi), mais à permettre à la **saisie manuelle d'alimenter le prédicteur 10K et l'adaptation du plan** au même titre que Strava.

---

## 2. Principe retenu : pas de hiérarchie entre les sources

Plusieurs pistes explorées et écartées avant de converger sur le principe final :

- ❌ **Décote systématique du poids des séances manuelles** (facteur réduit sur la durée d'effort). Écarté : pénalise un utilisateur 100% manuel sans aucune justification, puisqu'il n'y a rien à comparer dans son cas — la décote n'a de sens qu'en présence d'un conflit entre deux sources sur une même séance, pas comme pénalité globale du mode.
- ❌ **Hiérarchie automatique Strava > manuel en cas de conflit**. Écarté : Strava n'est pas intrinsèquement plus fiable qu'une saisie manuelle (cas d'une montre qui bug — GPS perdu, arrêt prématuré, oubli — Strava enregistre alors une donnée fausse).
- ❌ **Détection automatique d'écart anormal** (seuil sur distance/allure) déclenchant un signal de confirmation. Écarté : ce n'est pas à l'app de deviner si un écart vient d'un bug technique ou d'une vraie variation de performance — c'est au coureur de le savoir et de trancher.

**Décision finale : aucune hiérarchie, aucune décote, aucune détection automatique.**

- Strava et saisie manuelle sont **deux sources à poids strictement égal** dans le prédicteur — le poids d'une séance dépend uniquement de sa durée d'effort (mécanique déjà en place dans `weightedAvgByEffortDuration`), jamais de sa provenance.
- Le bouton de correction/saisie manuelle est **toujours accessible** sur la carte du jour, quel que soit le réglage de source par défaut — pas réservé à un "mode manuel" exclusif.
- **Dès qu'une saisie manuelle existe pour une séance donnée, elle prime automatiquement sur Strava pour cette séance**, sans confirmation ni comparateur. C'est un acte volontaire du coureur (il ne saisit manuellement que s'il a une raison de le faire, typiquement un bug de montre) — l'app n'a pas à le questionner sur son propre choix.
- Le prédicteur agrège l'historique complet sans distinction de source. Aucune rupture ni recalcul spécial lors d'un changement de réglage en cours de plan — les séances déjà validées gardent leurs données telles quelles.

---

## 3. Réglage `dataSource`

Nouveau réglage dans Réglages, **préférence d'affichage par défaut sur la carte du jour — pas un mode exclusif**.

| Valeur | Statut | Comportement |
|---|---|---|
| `strava` | Disponible | Active aujourd'hui (comportement par défaut, rétrocompatible) |
| `manuel` | Disponible | Le formulaire de saisie manuelle s'affiche en premier sur la carte du jour |
| `fit` | Disponible (ajouté après ce document, cf. §10 de l'inventaire) | Import d'un fichier `.fit` exporté depuis la montre |
| `montre` (Garmin, Coros, Polar…) | Prévu, non implémenté | Option visible mais désactivée dans Réglages, pour poser le cap produit |
| `gpx` | Prévu, non implémenté | Idem |

Le réglage ne conditionne que l'affichage par défaut : même en mode `strava`, la correction manuelle reste possible ; même en mode `manuel`, une activité Strava détectée reste affichée si aucune saisie manuelle n'existe pour cette date.

---

## 4. Format de la saisie manuelle

**Mis à jour le 07/08/2026** — remplace le format "lap virtuel unique par séance" initialement retenu (cf. archive ci-dessous), après une conception dédiée à l'unification avec le format Strava/FIT (cf. inventaire §4/§5/§7bis pour le détail complet).

Les laps Strava sont détaillés par répétition (`getLapsAffichage`). Reproduire ce niveau de détail EN SAISIE (une allure par répétition) resterait trop lourd pour un usage sans montre connectée — ce principe reste inchangé. Ce qui a changé, c'est la **représentation stockée** : plutôt qu'un lap unique agrégeant toute la séance, chaque répétition attendue de `structureIntervalles` produit désormais son propre lap synthétique, à partir de la même allure globale saisie une seule fois, combinée à une grille réussi/raté (✓/✕) par répétition (déjà en place depuis le 05/08/2026, cf. section suivante).

```js
// manualPerf[uid].laps — un lap PAR RÉPÉTITION, même format qu'un lap Strava
[
  { distance, average_speed, average_heartrate: null, _source: "manuel", _reussi: true },
  { distance, average_speed, average_heartrate: null, _source: "manuel", _reussi: false },
  // ...
]
```

Un lap marqué `_reussi: false` est exclu du calcul de vitesse pondérée du prédicteur (une seule allure globale est saisie à la main — l'attribuer telle quelle à une répétition ratée gonflerait artificiellement l'estimation), mais reste présent pour l'affichage/comptage km. Construit par `construireLapsManuels()` au moment de la sauvegarde (`index.html`), consommé par `weightedAvgByEffortDuration()` (`predictor.js`) exactement comme des laps Strava. Repli complet sur l'ancien format ci-dessous pour toute saisie manuelle antérieure à ce champ — pas de migration rétroactive.

Champs du formulaire (tous optionnels sauf le statut ✅/⚠️/❌, qui seul suffit à valider la séance) — inchangés par cette évolution :
- **Allure moyenne de l'effort** (pas l'allure totale de la sortie)
- **FC moyenne** (optionnel)
- **Ressenti (RPE, échelle simple)**
- **Réussite par répétition** (✓/✕, ajouté le 05/08/2026) — sert désormais aussi à construire les laps individuels ci-dessus, en plus de son rôle d'origine (affichage du taux de réussite)

### Archive — format d'origine (13/07/2026 → 07/08/2026)

Conservé pour référence historique. Un "lap virtuel" unique par séance, injecté dans le même pipeline de calcul que les laps Strava, sans distinction de répétition :

```js
{ average_speed: distanceEffort / tempsEffort, distance: distanceEffort }
```

Distance d'effort déductible de `structureIntervalles` si non précisée par l'utilisateur. Ce format reste le repli utilisé par `weightedAvgByEffortDuration()` pour toute saisie manuelle antérieure au nouveau champ `laps` (pas de migration rétroactive, cf. ci-dessus).

---

## 5. Stockage

Suit la convention existante (`statuses`, `hiddenSessions`, etc.) :

```js
let manualPerf = load(clePourPlan("lk_manual_perf"), {}); // {uid: {average_speed, distance, average_heartrate, dureeSaisieMin, intervalles, laps}}
```

Persisté et synchronisé via Supabase au même titre que `statuses` (`LkSync`, cf. section 6 ci-dessous, confirmé et depuis renforcé par le correctif de race condition du 07/08/2026 — merge atomique via RPC, cf. inventaire §5).

---

## 6. Points ouverts / à vérifier à l'implémentation

**Section close le 07/08/2026** — les trois points ci-dessous, ouverts depuis la conception initiale, sont maintenant tranchés :

- ~~Confirmer que `manualPerf` suit le même chemin de synchronisation Supabase que `statuses`~~ — confirmé, `manualPerf` est synchronisé exactement comme toute autre clé préfixée par plan via `synchroniserVersSupabase()`/`plan_donnees`. Le mécanisme de synchronisation lui-même a été rendu plus robuste le 07/08/2026 (merge atomique via RPC `merger_plan_donnees`, corrige une race condition qui pouvait faire disparaître silencieusement une clé fraîchement sauvegardée — cf. inventaire §5).
- ~~Décider si un badge discret doit signaler qu'une saisie manuelle écrase une activité Strava existante~~ — tranché : le bloc "Réalisé" affiche déjà la source de la donnée retenue (badge Strava/FIT/manuel, cf. inventaire §4), suffisant pour la transparence recherchée ; pas de badge dédié supplémentaire jugé nécessaire.
- ~~Les options `montre` et `gpx` sont volontairement non fonctionnelles~~ — `fit` est passée de "non implémentée" à disponible entre-temps (cf. tableau §3 ci-dessus, chantier livré le 03/08/2026, cf. inventaire §10). `montre` et `gpx` restent non implémentées à ce jour, aucun changement de statut.
