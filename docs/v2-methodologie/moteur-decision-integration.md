# Intégration du moteur de décision dans Yoria

**Statut** : Document de cadrage, complémentaire à `moteur-decision-architecture.md`. Pour l'état de code réellement livré, voir l'inventaire de l'application §8.

---

## 1. Ce que l'architecture existante de Yoria apporte déjà

Le moteur de décision est conçu comme un module indépendant (cf. §1 du document d'architecture). En le confrontant au code réel de Yoria, plusieurs points simplifient son intégration :

| Ce qu'on pourrait supposer | Ce qui existe réellement dans Yoria |
|---|---|
| Pas de backend, tout dans le navigateur | Un backend existe : Supabase, avec authentification, synchronisation temps réel, et `localStorage` comme cache local rapide |
| Code du moteur à structurer depuis zéro | Le dossier `/engine-classic-scripts/` accueille déjà des modules séparés chargés en `<script src>` — le moteur suit exactement ce pattern. Les modules moteur de décision (8 fichiers `decision-engine-*.classic.js`) n'ont jamais eu de version module ES, à la différence du reste du moteur (`plan-generator.js`, `plan-forme.js`, etc.) qui a depuis migré vers des modules ES chargés en `import()` dynamique. |
| `ActivitySample[]` à définir et remplir | `stravaActivities` contient déjà `moving_time`, `distance`, `average_speed`, `average_heartrate`, `start_date_local` — un `ActivitySample[]` au format Strava brut, pas normalisé mais déjà là |
| RPE déclaré à faire saisir | Un mécanisme de saisie RPE par séance existe (`sessionRpe[uid]`, saisi directement au niveau du statut de séance), 5 niveaux visuels mappés sur CR-10 |
| `RunnerProfile` à créer | `lk_profil_coureur` existe déjà en `localStorage`, synchronisé vers Supabase |

Concrètement : la question n'est pas "faut-il un backend pour ce moteur" (il existe déjà), mais "le moteur doit-il tourner dans le navigateur ou côté Supabase" (§2).

---

## 2. Où fait tourner le moteur : navigateur ou Supabase ?

### Choix retenu : dans le navigateur, comme les autres moteurs existants

Le moteur de décision est une famille de fichiers `/engine-classic-scripts/decision-engine-*.classic.js`, chargés en `<script src>` — il rejoint une famille de scripts qui font déjà exactement ce type de travail (calculer des choses à partir du plan et des données Strava, produire des résultats affichés dans le dashboard).

**Justification** :
- Les données dont le moteur a besoin (`stravaActivities`, `lk_profil_coureur`, `window.__PLAN_BRUT__`) sont déjà chargées dans le navigateur au moment où le dashboard s'affiche.
- Le calcul d'une décision (charge, fatigue, engagement, faisabilité d'objectif) est rapide — pas le genre de traitement lourd qui justifierait de le déporter sur un serveur.
- Cohérence totale avec l'existant : `plan-generator.js` génère déjà un plan à partir de règles, le moteur de décision fait la même chose en aval (ajuster un plan existant).
- Aucune nouvelle brique technique à héberger.

**Ce que Supabase garde comme rôle** : stocker et synchroniser les données (profil, plan, activités), et potentiellement stocker l'historique des décisions du moteur (utile pour analyser a posteriori si une décision a été suivie ou ignorée) — amélioration future, pas un prérequis.

### Option alternative, pour plus tard

Si un jour le moteur a besoin d'accéder à des données que seul Supabase détient (ex. comparer un coureur à des tendances agrégées sur tous les utilisateurs — chose qu'un moteur tournant uniquement dans un navigateur ne peut jamais faire, puisqu'il ne voit que les données d'un seul coureur), une fonction Supabase (Edge Function) hébergerait cette partie-là spécifiquement. Non nécessaire tant que le moteur n'utilise que les données d'un seul coureur à la fois.

---

## 3. Couche d'adaptation — écart entre les données réelles et le format attendu

Le moteur attend des structures précises (`ActivitySample`, `RunnerProfile`, etc., cf. §3 du document d'architecture). Les données réelles de Yoria existent mais dans un format différent (format brut de l'API Strava). Il faut donc une **couche d'adaptation**, pas une réécriture des données existantes.

### 3.1 Adaptateur Strava → `ActivitySample`

```javascript
// /engine-classic-scripts/decision-engine-adapter.classic.js
function adapterActiviteStrava(activiteStrava, provenanceDeclaree, rpeSaisi) {
  return {
    activityId: String(activiteStrava.id),
    date: activiteStrava.start_date_local,
    distanceKm: Math.round(activiteStrava.distance / 100) / 10,
    dureeMin: Math.round(activiteStrava.moving_time / 60),
    allureMoyenneMinKm: fmtPace(activiteStrava.average_speed), // fonction déjà existante dans index.html
    fcMoyenne: activiteStrava.average_heartrate || undefined,
    fcMax: activiteStrava.max_heartrate || undefined,
    cadence: activiteStrava.average_cadence ? activiteStrava.average_cadence * 2 : undefined, // Strava donne la cadence par jambe
    denivelePositifM: activiteStrava.total_elevation_gain || undefined,
    ressentiRPE: rpeSaisi, // résolu par l'appelant, cf. note ci-dessous
    provenance: provenanceDeclaree, // 'strava_gratuit' | 'strava_premium', selon ce que le compte utilisateur a
  };
}
```

Ce fichier ne fait qu'un travail de traduction — il ne contient aucune règle métier, il rend juste les données existantes lisibles par le moteur tel que conçu.

**Note d'implémentation** : `adapterActiviteStrava()` ne fait pas elle-même la correspondance entre une activité Strava et le RPE saisi pour la séance correspondante du plan (elle ne reçoit qu'une activité Strava brute, sans notion de séance du plan/uid). Cette correspondance est faite côté appelant (`adapterHistoriqueAvecRpe()`, `index.html`), qui croise date d'activité → uid de séance du plan → `sessionRpe[uid]` avant d'appeler `adapterActiviteStrava()` avec le RPE déjà résolu.

### 3.2 Champs profil complémentaires

Deux champs du `RunnerProfile` attendu par le moteur (§3.1 du document d'architecture) ne sont utiles qu'au calcul TRIMP (§5.1 du document d'architecture) :

- `fcMaxReference` et `fcReposReference` — existent dans `profilCoureur` (Réglages et onboarding), lus via `optionsRunnerStateActuel()`. Optionnels : sans eux, le moteur bascule automatiquement sur le sRPE (dégradation déjà prévue, cf. §4.3 du doc archi).
- Un moyen de déclarer `DataProfile` fin (`manuel_seul` / `strava_gratuit` / `strava_premium` / `montre_connectee`) — Yoria sait si Strava est connecté (`stravaToken`), mais ne distingue pas gratuit/premium à ce jour. Non bloquant : le moteur se dégrade proprement (§4 du doc archi) quand cette donnée est absente.

---

## 4. Séquencement d'intégration

Ordre recommandé pour intégrer le moteur progressivement plutôt que d'un bloc :

1. **Adaptateur seul** (§3.1) — traduire `stravaActivities` en `ActivitySample[]`, sans encore rien décider. Vérifiable en console.
2. **Module 1 seul (`RunnerStateCalculator`)** — brancher le calcul de charge/fatigue/ACWR sur les vraies données, afficher le résultat quelque part de discret (panneau de debug), sans encore l'exposer au coureur ni déclencher de décision. Permet de vérifier que les chiffres produits ont du sens sur de vraies données.
3. **Module 5 (moteur de règles) avec un catalogue réduit** — démarrer avec un tout petit nombre de règles plutôt que le catalogue complet du document d'architecture, pour observer leur comportement sur de vraies données avant d'en ajouter d'autres.
4. **Affichage de la décision au coureur** — dernière étape, une fois que plusieurs décisions produites sur un historique réel semblent cohérentes avec ce qu'un vrai coach dirait.

Cette séquence évite le risque principal d'un moteur de règles : livrer d'un coup de nombreuses règles non testées ensemble et découvrir des conflits inattendus une fois en face de vraies données.

---

## 5. Points ouverts, à trancher au fil de l'usage

- **Fréquence de calcul** — à chaque ouverture du dashboard, à chaque nouvelle séance synchronisée depuis Strava, ou les deux.
- **Historisation des décisions** — pour analyser un jour si le coureur suit ses recommandations, stocker l'historique côté Supabase (§2).
- **Cascade multi-semaines** — si une tendance persiste sur plusieurs semaines (fatigue élevée 3 semaines de suite), le moteur reproposerait la même réduction chaque semaine indépendamment plutôt que d'ajuster la trajectoire de fond du plan. La règle `adapter_plan` (catégorie `adaptation`, doc archi §7) est prévue pour ce cas, mais son implémentation dépend d'avoir observé, sur un usage réel, si ce cas se présente effectivement plusieurs semaines de suite pour un même coureur.

---

## 6. Comment le moteur se concrétise sur les plans générés

Deux moments distincts : influencer la génération initiale d'un plan quand un historique existe, et faire vivre des décisions du moteur sur un plan déjà en cours.

### 6.1 Génération initiale — utiliser l'historique quand il existe

**Point d'appui existant** : `collectParamsFromWizard()` lit déjà `profilStocke` (`lk_profil_coureur`) pour préremplir `fcMaxConnue` et `anneeNaissance`, et déduit `volumeActuel` soit depuis Strava (`stravaKm`) soit depuis une saisie manuelle. Il existe donc déjà un principe de "point de départ informé par l'historique" — mais limité au volume brut, sans lecture de fatigue, tendance, ou régularité récente.

**Où le moteur s'insère** : entre `collectParamsFromWizard()` et `Engine.generatePlan(profil, params)`, un maillon enrichirait `profil`/`params` avec une évaluation issue du moteur — mais **en lecture seule sur les entrées du wizard**, jamais en réécriture silencieuse des choix du coureur (même principe que `GoalFeasibility` ne modifie jamais `ObjectifCourant`, cf. §6/§5.8 du document d'architecture).

```javascript
// Maillon envisagé dans generateAndShowResults(), avant l'appel à Engine.generatePlan
function enrichirParamsAvecHistorique(profil, params) {
  const historique = recupererHistoriqueRecent(); // via l'adaptateur §3.1, si un plan précédent existe
  if (!historique || historique.seancesRealisees.length < 5) {
    // Historique trop mince pour être exploité — le moteur reste muet plutôt que de deviner (cf. §4 du doc archi)
    return { profil, params, avisHistorique: null };
  }

  const runnerState = DecisionEngine.calculerRunnerState(historique, profil);
  const avisHistorique = {
    volumeRecommandeVsDeclare: comparerVolume(runnerState, params.volumeActuel),
    niveauConfirmeParDonnees: runnerState.confiance > 60,
    alerteFatigueResiduelle: runnerState.fatigue > 70, // ex: plan précédent clos en surcharge
  };

  return { profil, params, avisHistorique }; // le wizard affiche avisHistorique au coureur AVANT de générer, ne l'applique pas tout seul
}
```

**Principe UX** : si `avisHistorique` contredit ce que le coureur a saisi (ex : il déclare vouloir repartir fort alors que son dernier plan s'est terminé en fatigue élevée), le bon réflexe n'est pas de modifier ses paramètres à sa place, mais d'afficher l'écart et de le laisser choisir — un écran intermédiaire type "on a remarqué que...", jamais une correction automatique. Même logique que `alerter_objectif_a_risque` (§5.8/§7 du document d'architecture) : informer, jamais décider à la place du coureur.

**Cas non concernés** : première utilisation de Yoria (aucun plan précédent), ou grand-débutant (`estGrandDebutant()`) sans historique de course exploitable — `enrichirParamsAvecHistorique` retournerait `avisHistorique: null`, le wizard fonctionne alors sans changement.

*Ce maillon reste un plan d'intégration ; sa mise en œuvre effective est à documenter dans l'inventaire une fois codée.*

### 6.2 Plan en cours — comment une `EngineDecision` modifie une séance affichée

Une décision du moteur (§3.4/§7 du document d'architecture) n'est qu'une donnée structurée (`{ decision: 'reduire_charge', ampleurPourcent: -10, cible: 'volume', ... }`) — il faut un mécanisme qui la traduise en modification réelle de ce que le coureur voit.

**Point de passage à exploiter** : `window.__PLAN_BRUT__` → `traduirePlanVersFormatV1()` → `window.__PLAN_GENERE__`/`PLAN`. Toute décision du moteur doit s'appliquer **sur `__PLAN_BRUT__`, avant la traduction**, jamais directement sur `PLAN` (le format d'affichage) — sinon la modification se perdrait à la prochaine traduction.

**Structure réelle de `__PLAN_BRUT__`** (vérifiée en console sur données réelles, contrairement à une hypothèse initiale qui supposait à tort une forme `sessions[]` avec dates explicites et types en majuscules) :

```js
{
  dateDebut: "2026-07-06",  // au niveau du plan, pas de la semaine
  semaines: [
    {
      semaineNum: 1,
      phase: "Construction",
      assignment: {
        "1": { type: "ef", kmEstime: 7.3, role: "standard", contenu: "..." },
        "2": { type: "qualite", kmEstime: 4.6, sousType: "i-30-30", structureIntervalles: {...} },
        // clés '1' à '6' uniquement — le lundi (jourIndex ISO 0) n'a JAMAIS de
        // clé, c'est un repos implicite. '1'=mardi ... '6'=dimanche.
      }
    }
  ]
}
```

Le format `sessions[]`/majuscules/`date` explicite n'existe que dans `PLAN` — c'est-à-dire **après** passage par `traduirePlanVersFormatV1()` (`v1-bridge.js`), qui est le seul endroit du code qui connaît la correspondance exacte entre `assignment[jourIndex]` et une date calendaire réelle (reconstruite à partir de `dateDebut` et `semaineNum`). **Toute implémentation future qui touche à `__PLAN_BRUT__` directement doit reproduire ce même calcul de date (lundi de `dateDebut`, décalage de `(semaineNum - 1) * 7` jours, puis `+ jourIndex` jours) plutôt que de dupliquer une hypothèse non vérifiée.**

```javascript
// Applique une EngineDecision au plan brut, AVANT traduirePlanVersFormatV1
function appliquerDecisionAuPlan(planBrut, decision, semaineCible) {
  const semaine = planBrut.semaines.find(s => s.week === semaineCible);
  if (!semaine) return planBrut; // sécurité : semaine introuvable, aucune modification silencieuse

  switch (decision.decision) {
    case 'reduire_charge':
      semaine.sessions.forEach(s => {
        if (s.type === 'REPOS' || s.type === 'RACE') return; // rien à réduire sur ces types
        if (decision.cible === 'volume' || decision.cible === undefined) {
          s.kmEstime = Math.round(s.kmEstime * (1 + decision.ampleurPourcent / 100) * 10) / 10;
        }
      });
      semaine.origineModification = { regleId: decision.origine.regleId, appliqueLe: new Date().toISOString() };
      break;
    case 'repos_complet':
      semaine.sessions = semaine.sessions.map(s =>
        s.type === 'RACE' ? s : { ...s, type: 'REPOS', kmEstime: 0 }
      );
      break;
    case 'demarrer_taper':
      semaine.sessions.forEach(s => {
        if (s.type === 'REPOS' || s.type === 'RACE') return;
        s.kmEstime = Math.round(s.kmEstime * 0.6 * 10) / 10;
      });
      break;
    // 'alerter_*', 'suggerer_*', 'varier_le_plan', 'proposer_objectif_social' : n'écrivent PAS sur le plan brut,
    // ce sont des décisions purement informatives (cf. §7 doc archi) — elles alimentent une notification, pas une modification de séance
    default:
      break;
  }
  return planBrut;
}
```

**Distinction essentielle** : toutes les `TypeDecision` du catalogue (§3.4 du document d'architecture) ne modifient pas le plan. Certaines (`reduire_charge`, `repos_complet`, `demarrer_taper`, `adapter_plan`) réécrivent des séances. D'autres (`alerter_risque_decrochage`, `alerter_objectif_a_risque`, `suggerer_objectif_alternatif`, `proposer_objectif_social`) sont **purement informatives** — elles alimentent une notification ou un message affiché au coureur, jamais une modification de `__PLAN_BRUT__`. Coder ça comme deux familles bien séparées dès le départ évite un bug classique : une alerte qui finirait par silencieusement modifier une séance.

**Traçabilité** : le champ `origineModification` ajouté à la semaine permet d'afficher au coureur *pourquoi* sa séance a changé ("réduite car fatigue élevée détectée, règle R-024") — traduction concrète du principe d'explicabilité du moteur (§1 du document d'architecture) au niveau de l'UI, pas seulement dans les logs.

**Note sur les séances de qualité** : une réduction linéaire de `kmEstime` sur une séance structurée en intervalles (`type: "qualite"`, blocs/répétitions/pyramides) casserait la cohérence de la séance. `reduire_charge` cible en priorité les séances de type `'ef'`/`'longue'` ; réduire une séance qualité suppose un algorithme dédié (réduction du nombre de répétitions/blocs, jamais l'allure ni la récup) — voir l'inventaire §7/§8 pour l'état codé de ce mécanisme.

---

## 7. Principes d'application au coureur

Deux principes qui priment sur toute autre formulation plus ouverte pouvant subsister ailleurs dans ce document ou dans le document d'architecture.

### 7.1 Aucune application automatique

Même les décisions de sécurité à haute confiance ne modifient jamais `__PLAN_BRUT__` sans validation explicite du coureur. Toute `EngineDecision` de type `reduire_charge` / `repos_complet` / `demarrer_taper` / `adapter_plan` est présentée avec sa justification et un bouton "Appliquer" — `appliquerDecisionAuPlan()` (§6.2) n'est donc jamais appelée en tâche de fond, seulement en réponse à une action explicite du coureur.

**Raison** : le moteur n'a pas d'historique de fiabilité illimité face à de vrais coureurs imprévisibles. Un plan qui change tout seul, la première fois qu'une règle est mal calibrée, risque de casser durablement la confiance dans l'app — un coût largement supérieur à la commodité d'une automatisation précoce. Ce choix est révisable une fois qu'une règle donnée aura fait ses preuves sur un usage réel prolongé, règle par règle plutôt que globalement.

### 7.2 Catalogue de démarrage volontairement réduit

Contrairement au catalogue complet du document d'architecture (§7, une quinzaine de règles à travers sécurité/engagement/adaptation/progression/objectif), la première implémentation réelle se limite à quelques règles bien choisies :

1. **Pic de séance unique** (sécurité) — le signal le mieux soutenu par la littérature (§5.5 du doc archi).
2. **Fatigue élevée basique** (sécurité) — version simplifiée, sans les signaux combinés de surentraînement pour commencer.
3. **Désengagement précoce** (engagement) — seule règle hors sécurité retenue au démarrage, car son signal ne dépend d'aucune donnée physiologique et est donc le plus simple à valider sur de vraies données dès le départ.

Le reste du catalogue (surentraînement combiné, progression, taper irrégulier, objectif à risque, plaisir déclaré, isolement social) attend explicitement d'avoir observé ces premières règles tourner sur un historique réel avant d'être implémenté — pas parce que ces règles seraient moins valables, mais parce que valider un petit socle est faisable, valider tout le catalogue à la fois ne l'est pas.

### 7.3 Résolution des conflits avec l'existant

Trois arbitrages, en réponse directe aux conflits identifiés en §9 :

- **Statut ⚠️ renommé "Partiel"** (plutôt que "Adaptée") — libère sans ambiguïté le mot "Ajusté"/"Adapté" pour le badge du moteur (§8.2, §9.2). Changement de libellé uniquement, le sens du statut coureur ne change pas.
- **Le moteur devient l'unique source de vérité sur la charge/ACWR** (§9.3) — tout calcul ACWR informel séparé est retiré au profit de `RunnerStateCalculator` ; le graphique ACWR existant et le coach IA pointent tous deux vers ce même calcul.
- **Le coach IA devient un habillage du moteur, jamais un second décideur** (§9.1) — rôle assumé : rendre l'app plus vivante par le langage naturel, sans jamais recalculer ou réinterpréter un signal que le moteur a déjà tranché.

---

## 8. Exemple pas-à-pas, écran proposé, et effet en cascade

### 8.1 Exemple concret : fatigue élevée un lundi

Situation : un coureur a une séance `VMA` (fractionné) planifiée mardi. Lundi soir, le moteur tourne (au chargement du dashboard) et la règle de fatigue élevée se déclenche.

**Ce qui se passe, étape par étape :**

1. **Le moteur calcule** : `RunnerStateCalculator` lit `stravaActivities` des 7-28 derniers jours (adaptées via `adapterActiviteStrava`, §3.1), calcule charge/ACWR/fatigue (§5.1 du doc archi). Résultat : `fatigue: 78`, `charge.ratio: 1.4`.
2. **La règle s'évalue** : `EngineInput` est construit avec ce `RunnerState` + la séance de mardi comme `sessionAnalysis` à venir. La règle matche (`fatigue >= 75`), produit un `DecisionCandidate` : `{ type: 'reduire_charge', ampleur: -15, cible: 'volume' }`.
3. **La décision est formatée** : `DecisionFormatter` (Module 6, doc archi) produit un `EngineDecision` avec justification : *"Fatigue élevée détectée (78/100), ratio de charge de 1.4 — réduction du volume de la prochaine séance recommandée."*
4. **Rien n'est appliqué automatiquement** (§7.1) — la décision est stockée en mémoire, pas encore écrite sur `__PLAN_BRUT__`.
5. **L'UI l'affiche** (cf. §8.2) : le coureur voit une carte de proposition avant sa séance de mardi.
6. **S'il clique "Appliquer"** : `appliquerDecisionAuPlan(planBrut, decision, semaineCible)` (§6.2) modifie `kmEstime` de la séance `VMA` de mardi uniquement (`-15%`, donc par exemple 8km → 6.8km), ajoute `origineModification` à la semaine, puis `traduirePlanVersFormatV1()` retraduit et le dashboard réaffiche la semaine avec la nouvelle valeur.
7. **S'il ignore ou ferme la proposition** : rien ne change, la séance de mardi reste telle quelle. Le moteur pourra re-proposer la même décision (ou une variante) au prochain calcul si la fatigue reste élevée.

### 8.2 À quoi ressemble l'écran

**Une carte au-dessus du plan de la semaine**, dans le même esprit que le badge "Décharge" déjà existant mais plus visible puisqu'elle appelle une action :

```
┌─────────────────────────────────────────────────┐
│ 🟠 Yoria te propose un ajustement                │
│                                                    │
│ Fatigue élevée détectée cette semaine.            │
│ Réduire ta séance VMA de mardi de 15% (8→6.8km)   │
│                                                    │
│         [ Ignorer ]        [ Appliquer ]          │
└─────────────────────────────────────────────────┘
```

Une fois appliquée (ou ignorée), la carte disparaît et — si appliquée — la séance concernée porte un petit badge discret ("Ajusté", même famille visuelle que le pill "Décharge") avec un texte au survol/tap reprenant la justification (`origineModification`), pour que le coureur puisse toujours comprendre pourquoi sa séance a changé même après coup.

**Ce qui est délibérément évité** : une popup bloquante ou une notification push agressive. Cohérent avec le principe d'engagement (§5.7 du doc archi) — une proposition de réduction de charge, même bienveillante, reste une information anxiogène si elle est présentée de façon intrusive.

### 8.3 Effet en cascade sur le reste du plan

**Aucun, par défaut.** Chaque semaine du plan stocke ses propres valeurs (`kmEstime` par séance) de façon indépendante — les semaines suivantes ne sont pas recalculées dynamiquement à partir des semaines précédentes.

Concrètement : si le moteur réduit la séance VMA de mardi (semaine 6), les semaines 7, 8, 9 restent inchangées, telles que générées initialement par `Engine.generatePlan()`.

**Est-ce satisfaisant ?** Pas toujours — deux cas où l'absence de cascade devient un problème réel :
- Une **réduction ponctuelle isolée** : pas de souci, la semaine suivante reprend le plan initial normalement.
- Une **tendance qui persiste sur plusieurs semaines** (ex: fatigue toujours élevée 3 semaines de suite) : sans cascade, le moteur devrait proposer la même réduction chaque semaine indépendamment, ce qui fonctionne mais n'ajuste jamais la trajectoire de fond du plan.

**Recommandation, cohérente avec §7.1** : ne pas construire de cascade automatique multi-semaines tant qu'elle n'a pas été validée comme nécessaire. La règle `adapter_plan` (catégorie `adaptation`, doc archi §7) est précisément prévue pour ce cas — mais elle reste hors du catalogue de démarrage. Le bon moment pour l'implémenter est après avoir observé, sur un usage réel, si les règles de démarrage se redéclenchent effectivement plusieurs semaines de suite pour un même coureur.

---

## 9. Conflits identifiés avec l'existant

Trois conflits concrets identifiés en confrontant le moteur à l'existant du dashboard.

### 9.1 Le coach IA existant — un habillage du moteur, pas un second décideur

Le coach IA (`fetchCoachMsg()`, qui appelle `/api/coach` et fait tourner un LLM pour générer un message de coaching en langage libre) lisait initialement son propre calcul ACWR informel pour moduler son ton — prudence si charge élevée, encouragement si charge basse.

C'est un problème de fond : le document d'architecture pose en §1 que les modèles d'IA ne doivent jamais prendre les décisions d'entraînement — ils ne doivent qu'expliquer ou aider à la décision, jamais décider. Un coach qui influence le ton et le contenu du message reçu par le coureur à partir d'un signal de charge recalculé séparément, sans passer par aucune règle explicite, traçable, ou testable, fait exactement ce que le moteur est censé remplacer.

**Principe retenu** : le coach IA devient un **habillage du moteur**, jamais un second décideur — son rôle assumé est de rendre l'app plus vivante par le langage naturel, pas de produire un avis parallèle. Concrètement :

1. Le calcul ACWR informel séparé côté prompt du coach est supprimé, remplacé par une lecture directe de la dernière `EngineDecision` disponible (§3.4 du doc archi) et du `RunnerState.fatigue`/`risque` associés. Le prompt reçoit une instruction du type *"Le moteur a détecté une fatigue élevée (78/100), la séance de demain a été réduite de 15% — adapte ton ton en conséquence sans mentionner de chiffre"*, plutôt que de recalculer un ratio ACWR séparément.
2. Si une `EngineDecision` du jour existe et modifie une séance (`reduire_charge`, `repos_complet`, `demarrer_taper`), le prompt du coach en est informé explicitement, pour que le message ne contredise jamais ce que la carte de proposition (§8.2) affiche déjà au même moment. Le coach peut *commenter* la décision du moteur ("j'ai vu que ta séance de demain a été allégée, écoute ton corps"), jamais en produire une différente à partir de son propre calcul.

**Ce qui ne change pas** : le ton, la personnalité, le style conversationnel du coach restent identiques — cette décision ne touche que la source du signal de charge/fatigue consommé par le prompt, pas l'expérience de lecture du message par le coureur. L'instruction "ne jamais mentionner le terme ACWR" reste valable et s'applique de la même façon à `EngineDecision`.

### 9.2 Le statut "⚠️ Partiel" et le badge "Ajusté par Yoria" — deux mécanismes distincts

Le dashboard a un mécanisme où le coureur marque **lui-même**, après coup, une séance comme partiellement suivie (`statuses[uid] = '⚠️'`, posé manuellement via un menu). C'est un jugement rétrospectif et humain sur une séance déjà réalisée — "je n'ai pas suivi le plan exactement, mais j'ai fait quelque chose".

Le moteur, lui, produit des décisions **prospectives** sur des séances à venir (§8.1) — le badge "Ajusté par Yoria" désigne une tout autre chose : une séance dont les *paramètres prévus* ont changé avant qu'elle n'ait lieu, pas le jugement du coureur après l'avoir faite.

**Le risque à éviter** : si les deux badges se ressemblent visuellement, le coureur pourrait confondre "cette séance a été automatiquement modifiée par le moteur" et "j'ai signalé moi-même ne pas avoir suivi le plan". Ce sont deux informations différentes qui doivent rester visuellement et sémantiquement distinctes.

**Principe retenu** : le statut ⚠️ porte le libellé "Partiel" (le sens reste identique — séance non suivie exactement, mais en partie réalisée). Le badge du moteur (§8.2) garde son libellé "Ajusté par Yoria". Les deux mécanismes coexistent sans se substituer l'un à l'autre — le moteur agit avant une séance, le coureur juge après via ✅/Partiel/❌.

### 9.3 Une seule source de vérité sur l'ACWR

Le dashboard affiche un graphique ACWR au coureur. Si le calcul de ce graphique et celui utilisé en interne par `RunnerStateCalculator` (§6 du doc archi) pour les décisions divergent même légèrement (cf. §5.1 du doc archi sur les nuances TRIMP vs proxy), le coureur pourrait voir un graphique affichant "charge stable" pendant que le moteur, sur le même jour, propose une réduction de charge — apparence d'incohérence, même si chaque calcul est individuellement correct dans sa propre logique.

**Principe retenu** : tout calcul ACWR informel séparé est retiré une fois `RunnerStateCalculator` implémenté — le graphique ACWR du dashboard et le coach pointent tous deux vers le calcul du moteur. Un seul calcul de charge dans toute l'app, jamais deux qui pourraient diverger silencieusement.

### 9.4 Ce qui ne pose pas de conflit

Le système de statuts ✅/❌ (réussie/ratée), le rapport hebdomadaire, la détection de semaine de décharge, et la prédiction de performance (VMA/SEUIL) sont des mécanismes de **lecture et d'affichage** de ce qui s'est passé — ils ne prennent aucune décision et n'ont donc rien à négocier avec le moteur. Le moteur peut les consommer comme signaux d'entrée sans les remplacer ni entrer en friction avec eux.

---

## 10. Maintenabilité à long terme et garde-fous contre les adaptations brutales

Voir le document d'architecture §12 pour le détail complet des principes (versionnage exploité, rejeu sur historique, plafond de réduction cumulée sur fenêtre glissante, borne dure sur l'ampleur d'une décision individuelle). Pour l'état codé de ces garde-fous, voir l'inventaire de l'application §8/§15.

---

## 11. Prochaines étapes logiques

Par ordre de dépendance :

1. Étendre le catalogue de règles au-delà du socle de démarrage (§7.2), une fois celui-ci éprouvé sur un usage réel prolongé.
2. Concevoir/coder les règles qui consomment `weekAnalysis`/`trendAnalysis` (Modules 3/4) une fois ces modules disponibles — voir l'inventaire pour leur état de code actuel.
3. Concevoir un algorithme de réduction dédié aux séances de qualité (répétitions/blocs plutôt que volume linéaire) — voir l'inventaire pour son état de code actuel.
4. `GoalFeasibilityCalculator` (doc archi §6) reste à concevoir/coder en détail.

Pour la liste à jour de ce qui est réellement codé, testé et déployé, se référer systématiquement à l'inventaire de l'application §8 — ce document reste le plan d'intégration de référence, pas le suivi d'avancement.
