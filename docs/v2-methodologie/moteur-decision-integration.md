# Intégration du moteur de décision dans Yoria — état des lieux et options

**Statut** : Document de cadrage, complémentaire à `moteur-decision-yoria-architecture.md` — v1.7, ajout du §10 (maintenabilité à long terme, garde-fous contre les adaptations brutales)
**Basé sur** : lecture de `index.html` (dashboard) et `index__1_.html` (wizard v2) fournis le 16 juillet 2026
**Dernière mise à jour** : 2026-07-16

---

## 1. Ce qui a changé depuis la conception du moteur — et qui simplifie tout

Le moteur de décision a été conçu comme un module indépendant (cf. §1 du document d'architecture). Bonne nouvelle en le confrontant au code réel de Yoria : **l'architecture actuelle est déjà prête à l'accueillir**, sur plusieurs points qu'on ne connaissait pas au moment de la conception :

| Ce qu'on supposait | Ce qui existe réellement dans Yoria aujourd'hui |
|---|---|
| Pas de backend, tout dans le navigateur | **Un backend existe : Supabase**, avec authentification (`window.__UTILISATEUR__`), synchronisation temps réel (`LkSync.activerRealtime`), et `localStorage` comme cache local rapide |
| Code du moteur à structurer depuis zéro | Un dossier `/engine-classic-scripts/` existe déjà, avec des modules séparés chargés en `<script src>` (`plan-generator.classic.js`, `plan-forme.classic.js`, `weather.classic.js`, etc.) — le moteur peut suivre exactement ce pattern |
| `ActivitySample[]` à définir et remplir | `stravaActivities` existe déjà et contient `moving_time`, `distance`, `average_speed`, `average_heartrate`, `start_date_local` — c'est un `ActivitySample[]` au format Strava brut, pas normalisé mais déjà là |
| RPE déclaré à faire saisir | Un mécanisme de saisie RPE par séance existe déjà (`{uid: {average_speed, distance, average_heartrate, rpe}}`), référencé dans `seances.md` |
| `RunnerProfile` à créer | `lk_profil_coureur` existe déjà en `localStorage`, synchronisé vers Supabase |

Concrètement : la question n'est plus "faut-il un backend pour ce moteur" (réponse : il existe déjà), mais **"le moteur doit-il tourner dans le navigateur (comme les autres scripts `engine-classic-scripts`) ou côté Supabase"**. C'est une question plus simple, et elle a une réponse assez nette (§2).

---

## 2. Où fait tourner le moteur : navigateur ou Supabase ?

### Option recommandée : dans le navigateur, comme les autres moteurs existants

Le moteur de décision devient un nouveau fichier `/engine-classic-scripts/decision-engine.classic.js`, chargé en `<script src>` juste après `plan-generator.classic.js` et `plan-forme.classic.js` — il rejoint une famille de scripts qui font déjà exactement ce type de travail (calculer des choses à partir du plan et des données Strava, produire des résultats affichés dans le dashboard).

**Pourquoi c'est le bon choix ici, concrètement** :
- Les données dont le moteur a besoin (`stravaActivities`, `lk_profil_coureur`, `window.__PLAN_BRUT__`) sont **déjà chargées dans le navigateur** au moment où le dashboard s'affiche — le moteur n'a besoin d'aller chercher aucune donnée supplémentaire ailleurs.
- Le calcul d'une décision (charge, fatigue, engagement, faisabilité d'objectif) est rapide — pas le genre de traitement lourd qui justifierait de le déporter sur un serveur.
- Ça garde une cohérence totale avec l'existant : `plan-generator.classic.js` génère déjà un plan à partir de règles, le moteur de décision ferait la même chose en aval (ajuster un plan existant).
- Aucune nouvelle brique technique à apprendre ou héberger.

**Ce que Supabase garde comme rôle** : rien ne change à son usage actuel. Il continue de stocker et synchroniser les données (profil, plan, activités), et pourrait en plus stocker **l'historique des décisions du moteur** (utile pour analyser a posteriori si une décision a été suivie ou ignorée) — mais ça reste une amélioration future, pas un prérequis.

### Option alternative, à garder en tête pour plus tard

Si un jour le moteur a besoin d'accéder à des données que Supabase seul détient (par exemple, comparer un coureur à des tendances agrégées sur tous les utilisateurs de Yoria — chose qu'un moteur tournant uniquement dans un navigateur ne pourrait jamais faire, puisqu'il ne voit que les données d'un seul coureur), il faudrait alors une fonction Supabase (Edge Function) qui héberge cette partie-là spécifiquement. Ce n'est pas nécessaire pour la V1 du moteur telle que conçue dans le document d'architecture (qui n'utilise que les données d'un seul coureur à la fois).

---

## 3. Ce qu'il faut construire — écart entre les données réelles et le format attendu par le moteur

Le moteur attend des structures précises (`ActivitySample`, `RunnerProfile`, etc., cf. §3 du document d'architecture). Les données réelles de Yoria existent mais dans un format différent (format brut de l'API Strava). Il faut donc une **couche d'adaptation**, pas une réécriture des données existantes.

### 3.1 Adaptateur Strava → `ActivitySample`

```javascript
// Nouveau fichier : /engine-classic-scripts/decision-engine-adapter.classic.js
function adapterActiviteStrava(activiteStrava, provenanceDeclaree) {
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
    ressentiRPE: recupererRpeSaisi(activiteStrava.id), // via le mécanisme déjà existant {uid: {...rpe}}
    provenance: provenanceDeclaree, // 'strava_gratuit' | 'strava_premium', selon ce que le compte utilisateur a
  };
}
```

Ce fichier ne fait qu'un travail de traduction — il ne contient aucune règle métier, il rend juste les données existantes lisibles par le moteur tel que conçu.

### 3.2 Ce qui manque encore côté données

D'après la lecture du code, deux champs du `RunnerProfile` attendu par le moteur (§3.1 du document d'architecture) ne semblent pas encore capturés dans `lk_profil_coureur` :

- `fcMaxReference` et `fcReposReference` — nécessaires au calcul TRIMP (§5.1 du document d'architecture). Sans eux, le moteur bascule automatiquement sur le sRPE (dégradation déjà prévue, cf. §4.3), donc **ce n'est pas bloquant pour démarrer**, mais les ajouter à l'onboarding améliorerait la précision.
- Un moyen de déclarer `DataProfile` (`manuel_seul` / `strava_gratuit` / `strava_premium` / `montre_connectee`) — actuellement Yoria semble savoir si Strava est connecté (`stravaToken`), mais pas distinguer gratuit/premium. À voir si c'est même détectable via l'API Strava, ou si ça doit rester une question posée une fois à l'utilisateur.

Aucun de ces deux manques n'empêche de démarrer une première intégration — le moteur est conçu pour se dégrader proprement (§4 du document d'architecture) quand ces données sont absentes.

---

## 4. Par où commencer concrètement — proposition de séquencement

Plutôt que d'intégrer tout le moteur d'un coup, voici un ordre qui permettrait de voir des résultats tôt et de valider l'approche avant d'investir plus :

1. **Adaptateur seul** (§3.1 ci-dessus) — traduire `stravaActivities` en `ActivitySample[]`, sans encore rien décider. Vérifiable en console : on doit obtenir une liste propre et correcte.
2. **Module 1 seul (`RunnerStateCalculator`)** — brancher le calcul de charge/fatigue/ACWR sur les vraies données, afficher le résultat quelque part de discret dans le dashboard (par exemple dans un futur panneau de debug), sans encore l'exposer au coureur ni déclencher de décision. Ça permet de vérifier que les chiffres produits ont du sens sur de vraies données avant de leur faire dire quoi que ce soit.
3. **Module 5 (moteur de règles) avec un tout petit catalogue** — le catalogue de démarrage est tranché en §7.2 : pic de séance unique, fatigue élevée basique, désengagement précoce, et rien d'autre pour l'instant.
4. **Affichage de la décision au coureur** — dernière étape, une fois que tu as pu observer plusieurs décisions produites sur ton propre historique et que ça te semble cohérent avec ce qu'un vrai coach dirait.

Cette séquence évite le risque principal d'un moteur de règles : livrer d'un coup 20 règles non testées ensemble et découvrir des conflits inattendus une fois en face de vraies données.

---

## 5. Ce qui reste à trancher avant de coder

Ces points ne bloquent pas le démarrage (étape 1 ci-dessus peut commencer sans y répondre), mais mériteront une réponse avant l'étape 4 :

- **Où et comment la décision du moteur s'affiche** dans le dashboard actuel — nouveau bloc dédié ? Intégré à une section existante ?
- **Fréquence de calcul** — à chaque ouverture du dashboard ? À chaque nouvelle séance synchronisée depuis Strava ? Les deux ?
- **Historisation des décisions** — si on veut un jour analyser si le coureur a suivi une recommandation, il faut décider de stocker ça quelque part (Supabase serait l'endroit naturel, cf. §2).

---

## 6. Comment le moteur se concrétise sur les plans générés

Deux moments distincts (cf. échange précédent) : influencer la génération initiale d'un plan quand un historique existe, et faire vivre des décisions du moteur sur un plan déjà en cours.

### 6.1 Génération initiale — utiliser l'historique quand il existe

**Ce qui existe déjà et sur quoi s'appuyer** : `collectParamsFromWizard()` lit déjà `profilStocke` (`lk_profil_coureur`) pour préremplir `fcMaxConnue` et `anneeNaissance`, et déduit `volumeActuel` soit depuis Strava (`stravaKm`) soit depuis une saisie manuelle. Il y a donc déjà un principe de "point de départ informé par l'historique" — mais limité au volume brut, sans lecture de fatigue, tendance, ou régularité récente.

**Où le moteur s'insère** : entre `collectParamsFromWizard()` et `Engine.generatePlan(profil, params)`, un nouveau maillon vient enrichir `profil`/`params` avec une évaluation issue du moteur — mais **en lecture seule sur les entrées du wizard**, jamais en réécriture silencieuse des choix du coureur (même principe que `GoalFeasibility` ne modifie jamais `ObjectifCourant`, cf. §6/§5.8 du document d'architecture).

```javascript
// Nouveau maillon dans generateAndShowResults(), avant l'appel à Engine.generatePlan
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

**Point important sur la UX, pas seulement la technique** : si `avisHistorique` contredit ce que le coureur a saisi (ex : il déclare vouloir repartir fort alors que son dernier plan s'est terminé en fatigue élevée), le bon réflexe n'est pas de modifier ses paramètres à sa place, mais d'afficher l'écart et de le laisser choisir — un écran intermédiaire du type "on a remarqué que..." avant l'étape finale du wizard, plutôt qu'une correction automatique. C'est la même logique que `alerter_objectif_a_risque` (§5.8/§7 du document d'architecture) : informer, jamais décider à la place du coureur.

**Cas où ce chantier ne s'applique pas** : première utilisation de Yoria (aucun plan précédent), ou grand-débutant (`estGrandDebutant()`) qui n'a par définition aucun historique de course exploitable — dans ces cas, `enrichirParamsAvecHistorique` retourne `avisHistorique: null` et le wizard fonctionne exactement comme aujourd'hui, sans changement.

### 6.2 Plan en cours — comment une `EngineDecision` modifie réellement une séance affichée

C'est le cœur de la question. Une décision du moteur (§3.4/§7 du document d'architecture) n'est qu'une donnée structurée (`{ decision: 'reduire_charge', ampleurPourcent: -10, cible: 'volume', ... }`) — il faut un mécanisme qui la traduise en modification réelle de ce que le coureur voit.

**Le point de passage existant à exploiter** : `window.__PLAN_BRUT__` → `traduirePlanVersFormatV1()` → `window.__PLAN_GENERE__`/`PLAN`. Toute décision du moteur doit s'appliquer **sur `__PLAN_BRUT__`, avant la traduction**, jamais directement sur `PLAN` (le format d'affichage) — sinon la modification se perdrait à la prochaine traduction et deviendrait un correctif fantôme invisible pour tout le reste du code qui lit `__PLAN_BRUT__`.

```javascript
// Nouveau maillon : applique une EngineDecision au plan brut, AVANT traduirePlanVersFormatV1
// Corrigé au 16/07 pour utiliser les vrais noms de champs de window.__PLAN_BRUT__ (kmEstime, pas volumePrevuKm ;
// types réels EF/LONGUE/VMA/SEUIL/SPEC/TEST/REPOS, pas 'repos' en minuscule)
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
      // cf. §7 du doc archi, règle R-051 — réduction ciblée en fenêtre critique
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

**Distinction essentielle** : toutes les `TypeDecision` du catalogue (§3.4 du document d'architecture) ne modifient pas le plan. Certaines (`reduire_charge`, `repos_complet`, `demarrer_taper`, `adapter_plan`) réécrivent des séances. D'autres (`alerter_risque_decrochage`, `alerter_objectif_a_risque`, `suggerer_objectif_alternatif`, `proposer_objectif_social`) sont **purement informatives** — elles doivent alimenter une notification ou un message affiché au coureur, jamais toucher à `__PLAN_BRUT__`. Coder ça comme deux familles de décisions bien séparées dès le départ évite un bug classique : une alerte qui finirait par silencieusement modifier une séance parce que le code n'a pas fait la distinction.

**Traçabilité** : le champ `origineModification` ajouté à la semaine (dans l'exemple ci-dessus) permet d'afficher au coureur *pourquoi* sa séance a changé ("réduite car fatigue élevée détectée, règle R-024") — c'est la traduction concrète du principe d'explicabilité du moteur (§1 du document d'architecture) au niveau de l'UI, pas seulement dans les logs.

**Quand cette modification doit-elle s'appliquer ?** Tranché (cf. §7 ci-dessous) : **rien n'est automatique en V1**, y compris les décisions de sécurité de haute confiance. Toute `EngineDecision` qui modifierait le plan (`reduire_charge`, `repos_complet`, `demarrer_taper`, `adapter_plan`) est **proposée au coureur avec un bouton "Appliquer"**, jamais appliquée silencieusement — voir §7 pour la justification.

---

## 7. Décisions actées (16 juillet 2026)

Deux arbitrages tranchés en conversation, à respecter dans toute implémentation à venir — ils priment sur les formulations plus ouvertes ("à trancher", "pas mutuellement exclusif") qui subsisteraient ailleurs dans ce document ou dans le document d'architecture.

### 7.1 Aucune application automatique en V1

Même les décisions de sécurité à haute confiance (`R-024` fatigue élevée, `R-006` pic de séance unique) ne modifient jamais `__PLAN_BRUT__` sans validation explicite du coureur en V1. Toute `EngineDecision` de type `reduire_charge` / `repos_complet` / `demarrer_taper` / `adapter_plan` est présentée avec sa justification et un bouton "Appliquer" — `appliquerDecisionAuPlan()` (§6.2) n'est donc jamais appelée en tâche de fond, seulement en réponse à une action explicite du coureur.

**Raison** : le moteur n'a pas encore d'historique de fiabilité face à de vrais coureurs imprévisibles. Un plan qui change tout seul, la première fois qu'une règle est mal calibrée, risque de casser durablement la confiance dans l'app — un coût largement supérieur à la commodité d'une automatisation précoce. Ce choix est révisable une fois qu'une règle donnée aura fait ses preuves sur un usage réel prolongé (proposition : au moins un mois ou deux), règle par règle plutôt que globalement.

### 7.2 Catalogue de démarrage réduit à 3 règles

Contrairement au catalogue complet du document d'architecture (§7 de ce document, une quinzaine de règles à travers sécurité/engagement/adaptation/progression/objectif), la première implémentation réelle du moteur (étape 3 du séquencement, §4) se limite à :

1. **Pic de séance unique** (sécurité, R-006 dans la numérotation du doc archi) — le signal le mieux soutenu par la littérature (§5.5 du doc archi).
2. **Fatigue élevée basique** (sécurité, version simplifiée de R-024, sans les signaux combinés de surentraînement de R-030 pour commencer).
3. **Désengagement précoce** (engagement, R-040) — seule règle hors sécurité retenue au démarrage, car son signal ne dépend d'aucune donnée physiologique et est donc le plus simple à valider sur de vraies données dès le départ.

Le reste du catalogue (surentraînement combiné, progression, taper irrégulier, objectif à risque, plaisir déclaré, isolement social) attend explicitement d'avoir observé ces trois premières règles tourner sur un historique réel avant d'être implémenté — pas parce que ces règles seraient moins valables, mais parce que valider 3 règles à la fois est faisable, valider 15 à la fois ne l'est pas.

### 7.3 Résolution des conflits avec l'existant (§9)

Trois arbitrages, en réponse directe aux conflits identifiés en §9 :

- **Statut ⚠️ renommé "Partiel"** (au lieu de "Adaptée") — libère sans ambiguïté le mot "Ajusté"/"Adapté" pour le badge du moteur (§8.2, §9.2). Changement de libellé uniquement, le sens du statut coureur ne change pas.
- **Le moteur devient l'unique source de vérité sur la charge/ACWR** (§9.3) — `calculerACWR(stravaActivities)` est retiré au profit de `RunnerStateCalculator` une fois ce dernier implémenté ; le graphique ACWR existant et le coach IA pointeront tous deux vers ce même calcul.
- **Le coach IA devient un habillage du moteur, jamais un second décideur** (§9.1) — rôle assumé : rendre l'app plus vivante par le langage naturel, sans jamais recalculer ou réinterpréter un signal que le moteur a déjà tranché. Détail de la mise en œuvre en §9.1.

---

## 8. Exemple pas-à-pas, écran proposé, et effet en cascade

### 8.1 Exemple concret : fatigue élevée un lundi

Situation : un coureur a une séance `VMA` (fractionné) planifiée mardi. Lundi soir, le moteur tourne (au chargement du dashboard, cf. §5) et la règle de fatigue élevée (§7.2, version simplifiée de R-024) se déclenche.

**Ce qui se passe, étape par étape :**

1. **Le moteur calcule** : `RunnerStateCalculator` lit `stravaActivities` des 7-28 derniers jours (adaptées via `adapterActiviteStrava`, §3.1), calcule charge/ACWR/fatigue (§5.1 du doc archi). Résultat : `fatigue: 78`, `charge.ratio: 1.4`.
2. **La règle s'évalue** : `EngineInput` est construit avec ce `RunnerState` + la séance de mardi comme `sessionAnalysis` à venir. La règle matche (`fatigue >= 75`), produit un `DecisionCandidate` : `{ type: 'reduire_charge', ampleur: -15, cible: 'volume' }`.
3. **La décision est formatée** : `DecisionFormatter` (Module 6, doc archi) produit un `EngineDecision` avec justification : *"Fatigue élevée détectée (78/100), ratio de charge de 1.4 — réduction du volume de la prochaine séance recommandée."*
4. **Rien n'est appliqué automatiquement** (§7.1) — la décision est stockée en mémoire, pas encore écrite sur `__PLAN_BRUT__`.
5. **L'UI l'affiche** (cf. §8.2 ci-dessous) : le coureur voit une carte de proposition avant sa séance de mardi.
6. **S'il clique "Appliquer"** : `appliquerDecisionAuPlan(planBrut, decision, semaineCible)` (§6.2) modifie `kmEstime` de la séance `VMA` de mardi uniquement (`-15%`, donc par exemple 8km → 6.8km), ajoute `origineModification` à la semaine, puis `traduirePlanVersFormatV1()` retraduit et `renderWeeks()`/`renderWeekDetail()` (fonctions déjà existantes) réaffichent la semaine avec la nouvelle valeur.
7. **S'il ignore ou ferme la proposition** : rien ne change, la séance de mardi reste telle quelle. Le moteur pourra re-proposer la même décision (ou une variante) au prochain calcul si la fatigue reste élevée — il ne "insiste" pas activement, il réévalue simplement à chaque nouveau calcul.

### 8.2 À quoi ressemble l'écran

Deux idées, en réutilisant des patterns déjà présents dans le dashboard plutôt qu'en inventant un nouveau composant :

**Option retenue : une carte au-dessus du plan de la semaine**, dans le même esprit que le badge "Décharge" déjà existant (`.pill`, cf. ligne 2946 du dashboard actuel) mais plus visible puisqu'elle appelle une action :

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

**Réponse courte : aucun, par défaut.** En inspectant le code actuel, chaque semaine du plan (`window.__PLAN_BRUT__.semaines`) stocke ses propres valeurs (`kmEstime` par séance) de façon indépendante — les semaines suivantes ne sont pas recalculées dynamiquement à partir des semaines précédentes. `prevWeek` n'est utilisé aujourd'hui qu'en **lecture** (rapports, comparaisons de forme), jamais pour dériver les valeurs d'une semaine à partir d'une autre.

Concrètement : si le moteur réduit la séance VMA de mardi (semaine 6), les semaines 7, 8, 9 restent inchangées, telles que générées initialement par `Engine.generatePlan()`.

**Est-ce satisfaisant ?** Pas toujours — deux cas où l'absence de cascade devient un problème réel :
- Une **réduction ponctuelle isolée** (comme l'exemple ci-dessus) : pas de souci, la semaine suivante reprend le plan initial normalement.
- Une **tendance qui persiste sur plusieurs semaines** (ex: fatigue toujours élevée 3 semaines de suite) : sans cascade, le moteur devrait proposer la même réduction chaque semaine indépendamment, ce qui fonctionne mais n'ajuste jamais la trajectoire de fond du plan (ex: la progression continue de viser un pic de volume que le coureur n'atteindra jamais dans cet état).

**Recommandation, cohérente avec §7.1 (rien d'automatique en V1)** : ne pas construire de cascade automatique multi-semaines maintenant. La règle `adapter_plan` (catégorie `adaptation`, doc archi §7) est précisément prévue pour ce cas — mais elle reste hors du catalogue de démarrage (§7.2 ci-dessus). Le bon moment pour l'implémenter est après avoir observé, sur un usage réel, si les 3 règles de démarrage se redéclenchent effectivement plusieurs semaines de suite pour un même coureur — ce qui validerait le besoin avant d'investir dans la complexité d'une replanification en cascade.

---

## 9. Conflits réels avec l'existant — identifiés en relisant le code, pas hypothétiques

En cherchant spécifiquement ce qui, dans le dashboard actuel, ferait doublon ou friction avec le moteur, trois conflits concrets ressortent — plus sérieux que ce qu'on avait anticipé jusqu'ici.

### 9.1 Le coach IA existant — désormais un habillage du moteur, pas un second décideur

`fetchCoachMsg()` (dashboard actuel) appelle `/api/coach`, qui fait tourner un LLM (Claude) pour générer un message de coaching en langage libre, affiché quotidiennement au coureur ("Yoria" comme personnage). Ce coach **lit déjà l'ACWR** (`calculerACWR(stravaActivities)`) pour moduler son ton — prudence si charge élevée, encouragement si charge basse.

C'est un problème de fond, pas de détail technique : le document d'architecture pose en §1 que *"les modèles d'IA ne doivent jamais prendre les décisions d'entraînement"* — elles ne doivent qu'expliquer ou aider à la décision, jamais décider. Le coach actuel ne "décide" pas formellement un ajustement de plan, mais il **influence déjà le ton et le contenu du message reçu par le coureur à partir d'un signal de charge**, sans passer par aucune règle explicite, traçable, ou testable — exactement ce que le moteur est censé remplacer.

**Décision actée (16 juillet 2026, cf. §7.3)** : le coach IA devient un **habillage du moteur**, jamais un second décideur — son rôle assumé est de rendre l'app plus vivante par le langage naturel, pas de produire un avis parallèle. Concrètement, ça change `fetchCoachMsg()` de deux façons :

1. **`consigneChargeInterne` (calcul ACWR informel actuel, lignes ~1086-1099) est supprimé**, remplacé par une lecture directe de la dernière `EngineDecision` disponible (§3.4 du doc archi) et du `RunnerState.fatigue`/`risque` associés. Le prompt reçoit une instruction du type *"Le moteur a détecté une fatigue élevée (78/100), la séance de demain a été réduite de 15% — adapte ton ton en conséquence sans mentionner de chiffre"*, plutôt que de recalculer un ratio ACWR séparément.
2. **Si une `EngineDecision` du jour existe et modifie une séance** (`reduire_charge`, `repos_complet`, `demarrer_taper`), le prompt du coach en est informé explicitement, pour que le message ne contredise jamais ce que la carte de proposition (§8.2) affiche déjà au même moment. Le coach peut *commenter* la décision du moteur ("j'ai vu que ta séance de demain a été allégée, écoute ton corps"), jamais en produire une différente à partir de son propre calcul.

**Ce qui ne change pas** : le ton, la personnalité, le style conversationnel de Yoria-coach restent identiques — cette décision ne touche que la source du signal de charge/fatigue consommé par le prompt, pas l'expérience de lecture du message par le coureur. L'instruction existante *"Ne mentionne jamais le terme ACWR"* (ligne ~1141) reste valable et s'applique de la même façon à `EngineDecision`.

### 9.2 Le statut "⚠️ adaptée" existe déjà, avec un sens différent de celui du moteur

Le dashboard actuel a un mécanisme où le coureur marque **lui-même**, après coup, une séance comme "adaptée" (`statuses[uid] = '⚠️'`, posé manuellement via un menu, cf. ligne ~3176). C'est un jugement rétrospectif et humain sur une séance déjà réalisée — "je n'ai pas suivi le plan exactement, mais j'ai fait quelque chose".

Le moteur, lui, produit des décisions **prospectives** sur des séances à venir (§8.1) — et le badge proposé en §8.2 ("Ajusté par Yoria") désigne une tout autre chose : une séance dont les *paramètres prévus* ont changé avant qu'elle n'ait lieu, pas le jugement du coureur après l'avoir faite.

**Le risque concret** : si les deux badges se ressemblent visuellement (tous deux liés au concept flou d'"adaptation"), le coureur pourrait confondre "cette séance a été automatiquement modifiée par le moteur" et "j'ai signalé moi-même ne pas avoir suivi le plan". Ce sont deux informations différentes qui devraient rester visuellement et sémantiquement distinctes.

**Décision actée (16 juillet 2026, cf. §7.3)** : le statut existant ⚠️ est renommé de "Adaptée" à "**Partiel**" (le sens reste identique — séance non suivie exactement, mais en partie réalisée — seul le libellé change). Cela libère le mot "Adapté"/"Ajusté" pour le badge du moteur sans aucune ambiguïté lexicale entre les deux mécanismes. Le badge du moteur (§8.2) garde son libellé "Ajusté par Yoria". Les deux mécanismes continuent de coexister dans le temps (le moteur agit avant une séance, le coureur juge après via ✅/**Partiel**/❌) sans se substituer l'un à l'autre.

### 9.3 Conflit mineur, mais à corriger : le graphique ACWR existant devient une deuxième source de vérité

Le dashboard affiche déjà un graphique ACWR au coureur (avec ses seuils, sa couleur, son texte explicatif — "L'ACWR compare ta charge des 7 derniers jours à ta moyenne des 4 dernières semaines..."). Une fois le moteur branché, il existera **deux calculs d'ACWR séparés dans le même dashboard** : celui affiché dans ce graphique, et celui utilisé en interne par `RunnerStateCalculator` (§6 du doc archi) pour les décisions.

Si les fenêtres de calcul ou les formules divergent même légèrement (cf. §5.1 du doc archi sur les nuances TRIMP vs proxy), le coureur pourrait voir un graphique affichant "charge stable" pendant que le moteur, sur le même jour, propose une réduction de charge — apparence d'incohérence, même si chaque calcul est individuellement correct dans sa propre logique.

**Décision actée (16 juillet 2026, cf. §7.3)** : `calculerACWR(stravaActivities)` (fonction existante, utilisée par le graphique et par `consigneChargeInterne` du coach) est **retiré** une fois `RunnerStateCalculator` implémenté (§4, étape 2) — le graphique ACWR existant et le coach pointent tous deux vers le calcul du moteur. Un seul calcul de charge dans toute l'app, jamais deux qui pourraient diverger silencieusement. Cette bascule n'est pas immédiate (elle suppose que le moteur soit déjà implémenté) mais elle est actée comme direction cible, pas comme option parmi d'autres.

### 9.4 Ce qui, à l'inverse, ne pose pas de conflit

Pour être complet : le système de statuts ✅/❌ (réussie/ratée), le rapport hebdomadaire (`weeklyReport`), la détection de semaine de décharge (`estSemaineDecharge`), et la prédiction de performance (VMA/SEUIL) sont des mécanismes de **lecture et d'affichage** de ce qui s'est passé — ils ne prennent aucune décision et n'ont donc rien à négocier avec le moteur. Le moteur peut les consommer comme signaux d'entrée (§3.1) sans les remplacer ni entrer en friction avec eux.

---

## 10. Maintenabilité à long terme et garde-fous contre les adaptations brutales

### 10.1 Le moteur est modifiable par construction — mais "modifiable" et "modifiable en confiance" sont deux choses différentes

La conception du moteur (registre de règles séparé de `RuleEngine`, cf. §7 doc archi et §1 principe "évolutif sans rupture") rend techniquement facile de changer un seuil, une ampleur, ou d'ajouter une règle — une modification typique touche une poignée de lignes dans un seul fichier de règles, jamais le moteur d'exécution lui-même.

Mais un moteur "en perpétuelle amélioration" (terme juste) a besoin de plus que de la facilité d'édition : il a besoin d'un moyen de savoir si un changement améliore ou dégrade les décisions produites, avant de le déployer sur de vrais coureurs. Deux manques identifiés, à corriger avant que le catalogue ne grossisse au-delà des 3 règles de démarrage (§7.2) :

- **Versionnage exploité, pas juste présent** : `EngineDecision.metadata.versionMoteur` existe déjà dans les structures (§3.4 doc archi) mais rien n'est prévu pour l'utiliser. Recommandation : à chaque modification de règle, incrémenter cette version, et conserver un historique des décisions passées avec la version qui les a produites (Supabase, cf. §2, est l'endroit naturel). Sans ça, il devient impossible de répondre à la question "cette décision bizarre vient-elle de l'ancienne ou de la nouvelle version de la règle ?" une fois plusieurs itérations passées.
- **Rejeu sur historique avant déploiement** : avant de changer un seuil ou d'ajouter une règle, la rejouer sur l'historique réel déjà accumulé (le tien en premier, puisque tu seras probablement le premier vrai utilisateur, cf. §4 étape 2 "afficher en mode debug") plutôt que de la déployer directement et observer en production. Concrètement : une petite fonction qui prend un historique de `EngineInput` déjà vécus et retourne la liste des `EngineDecision` que la nouvelle version aurait produites, à comparer visuellement à ce qui s'était réellement passé.

### 10.2 Les adaptations peuvent être brutales — deux causes identifiées, deux garde-fous à ajouter

**Cause 1 — cumul non borné de règles successives.** Rien dans l'architecture actuelle (module 5, doc archi §6) n'empêche deux décisions de réduction de charge de s'appliquer coup sur coup sur des jours rapprochés. Exemple concret : `R-006` (pic de séance) réduit une séance de 20% un lundi, puis `R-024` (fatigue) se déclenche le mercredi suivant et réduit encore de 15% — chaque règle est individuellement raisonnable, mais l'effet cumulé (plan réduit de plus d'un tiers en trois jours) ne l'est pas forcément, et aucune règle actuelle ne "voit" ce cumul.

**Garde-fou proposé** : un plafond de réduction cumulée sur une fenêtre glissante (proposition : pas plus de 25% de réduction cumulée sur 14 jours glissants, chiffre à valider avec un regard coach plutôt qu'arbitraire), vérifié **avant** d'appliquer une nouvelle décision de type `reduire_charge`. Techniquement, ça prend la forme d'une vérification supplémentaire dans `appliquerDecisionAuPlan` (§6.2) — pas une nouvelle règle du catalogue, mais un garde-fou structurel qui s'applique après que le moteur de règles a décidé, juste avant l'écriture réelle sur `__PLAN_BRUT__`.

**Cause 2 — aucune limite sur l'ampleur d'une décision individuelle prise isolément de son contexte.** Une règle mal calibrée (ex: un seuil de fatigue mal réglé après une modification, cf. §10.1) pourrait en théorie produire un `ampleurPourcent` disproportionné si elle est mal écrite (ex: -80% au lieu de -8% par erreur de frappe dans une constante).

**Garde-fou proposé** : une borne dure au niveau du moteur lui-même (pas d'une règle individuelle), qui rejette ou plafonne toute `DecisionCandidate` dont `ampleurPourcent` dépasserait un seuil absolu (proposition : jamais plus de -30% sur une seule décision, jamais de `repos_complet` sur plus d'une semaine consécutive sans validation explicite). C'est une sécurité de dernier recours — elle ne remplace pas la vérification "la règle a-t-elle raison de se déclencher", elle protège contre le cas où même une règle censée être raisonnable produirait, par bug ou mauvais calibrage, un résultat absurde.

**Lien avec la décision déjà actée en §7.1** ("rien n'est automatique en V1") : ces deux garde-fous restent utiles même si rien n'est appliqué automatiquement, parce que la carte de proposition (§8.2) elle-même pourrait afficher une réduction cumulée choquante au coureur, même si en théorie il garde la main pour refuser. Le principe "sécurité avant performance" (§1 doc archi) s'applique autant à la protection contre les bugs du moteur qu'à la protection contre la fatigue physique du coureur.

## 11. État d'implémentation réel (16 juillet 2026)

Cette section documente ce qui a été **effectivement codé, testé et déployé** lors de la session du 16 juillet 2026 — par opposition aux sections précédentes qui restent le plan de conception d'origine. En cas d'écart entre cette section et les précédentes, cette section fait foi pour ce qui concerne le code existant ; les sections précédentes restent la référence pour ce qui n'est pas encore construit.

### 11.1 Ce qui est livré et déployé

Quatre fichiers, tous dans `public/engine-classic-scripts/`, chargés dans cet ordre dans `index.html` (après `decision-engine-adapter.classic.js`, déjà en place avant cette session) :

1. **`decision-engine-runner-state.classic.js`** — `RunnerStateCalculator` (Module 1 partiel, cf. §11.2)
2. **`decision-engine-engagement.classic.js`** — `EngagementCalculator` (sous-module du Module 1, cf. §11.2)
3. **`decision-engine-rules.classic.js`** — `RuleEngine` (Module 5, catalogue à 3 règles conforme à §7.2)
4. **`decision-engine-apply.classic.js`** — traduction d'une `EngineDecision` en modification réelle de `__PLAN_BRUT__`

Plus une modification dans `index.html` : le bloc `moteurDecisionEl` (inséré dans `renderDashboard`, juste après `adaptationEl`), qui orchestre les quatre modules ci-dessus à chaque rendu du dashboard et affiche la carte de proposition décrite en §8.2.

**Étapes 1 à 4 du séquencement (§4) sont donc franchies** : calcul isolé → validation sur données réelles → règles → affichage UI, dans cet ordre, chacune validée avant de passer à la suivante — exactement la méthode prescrite en §4.

### 11.2 Écart assumé avec le document d'architecture : Module 1 partiel

Le document d'architecture (§6) prévoit un Module 1 composé de trois sous-calculateurs : `RunnerStateCalculator`, `EngagementCalculator`, `GoalFeasibilityCalculator`. Seuls les deux premiers sont codés. `GoalFeasibilityCalculator` n'existe pas encore — aucune règle du catalogue de démarrage (§7.2) n'en a besoin, donc ce n'est pas bloquant à ce stade.

À l'intérieur même de `RunnerStateCalculator`, la version codée est plus étroite que le contrat complet du doc archi :

| Champ prévu (doc archi §3.3) | Codé ? |
|---|---|
| `fatigue`, `charge` (aigue/chronique/ratio), `confiance`, `risque` | Oui |
| `fraicheur`, `recuperation`, `disponibilite` | Non |
| `dataAvailability` détaillé champ par champ | Non (juste une `confiance` agrégée) |
| Plafond de confiance à 65 si ACWR isolé (§5.2) | Non appliqué tel quel (logique de plafonnement différente, cf. code) |

De même pour `EngagementCalculator` : seule la régularité comportementale est calculée. `plaisirDeclare` (échelle PACES-S, §5.7) n'est pas implémenté — aucune saisie de ce type n'existe dans Yoria. Le champ reste présent dans la structure de sortie (`plaisirDeclare: undefined`) pour ne pas casser un futur branchement, mais n'est jamais rempli. Décision explicite de Laurent (16/07/2026) : reporté à plus tard.

**Ce choix a été discuté et acté en cours de session** ("on avance vite et on itère") plutôt que découvert après coup — il est cohérent avec l'esprit du §4 de ce document, mais il faut garder en tête que le Module 1 réel est moins riche que celui décrit au doc archi tant que ces champs manquants n'auront pas été ajoutés.

### 11.3 Bug structurel trouvé et corrigé : la vraie forme de `__PLAN_BRUT__`

**Ceci corrige une erreur de ce document.** Le §6.2 (et par extension toute hypothèse de structure sous-jacente ailleurs dans ce document) suppose implicitement que `window.__PLAN_BRUT__.semaines` a la même forme que `PLAN`/`window.__PLAN_GENERE__` — c'est-à-dire un tableau `sessions[]` avec un champ `date` explicite et des types en MAJUSCULES (`EF`, `LONGUE`, `VMA`...).

**Ce n'est pas le cas.** Vérifié en console sur les vraies données de Laurent le 16/07/2026 : la vraie structure est

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

Le format `sessions[]`/majuscules/`date` explicite n'existe que dans `PLAN` — c'est-à-dire **après** passage par `traduirePlanVersFormatV1()` (`v1-bridge.classic.js`), qui est le seul endroit du code qui connaît la correspondance exacte entre `assignment[jourIndex]` et une date calendaire réelle (reconstruite à partir de `dateDebut` et `semaineNum`).

**Conséquence pour toute implémentation future qui touche à `__PLAN_BRUT__` directement** (pas seulement `decision-engine-apply.classic.js`) : ne jamais supposer un format `sessions[]`/date/majuscules sans l'avoir vérifié en console au préalable. La bonne pratique, adoptée dans le correctif, est de reproduire le même calcul de date que `v1-bridge.classic.js` (lundi de `dateDebut`, décalage de `(semaineNum - 1) * 7` jours, puis `+ jourIndex` jours) plutôt que de dupliquer une hypothèse non vérifiée.

Ce bug a été détecté uniquement parce que la validation en conditions réelles (§4, étape 2) a été faite avant le déploiement définitif — s'il n'avait pas été trouvé, la première vraie décision de type `reduire_charge` aurait échoué silencieusement en production (aucune cible jamais trouvée, la carte ne serait simplement jamais apparue pour ce type de décision, sans erreur visible).

### 11.4 Limite actée : séances de qualité non modifiables automatiquement

Directement lié à §11.3 : une fois la vraie structure comprise, une question de fond s'est posée — quand `reduire_charge` cible la prochaine séance mais que celle-ci est une séance de qualité (`type: "qualite"`, avec `structureIntervalles` : blocs, répétitions, pyramides), une réduction linéaire de `kmEstime` casserait la cohérence de la séance (ex: couper une série de fractionné en plein milieu).

**Décision actée (16/07/2026)** : `decision-engine-apply.classic.js` ne cible que les séances de type `'ef'` et `'longue'` pour `reduire_charge`. Si la prochaine séance à venir est de type `'qualite'`, le module cherche la prochaine séance `'ef'`/`'longue'` **dans la même semaine uniquement** (jamais de débordement sur la semaine suivante). Si aucune n'existe, `trouverProchaineSeanceCible()` retourne `null` et la carte de proposition ne s'affiche pas du tout — plutôt que d'afficher un bouton "Appliquer" qui échouerait silencieusement.

**Chantier futur, non conçu** : réduire le *nombre d'intervalles* d'une séance de qualité plutôt que son volume brut, pour permettre au moteur d'agir aussi sur ces séances. Nécessite un vrai algorithme dédié (gestion de blocs multiples, pyramides type `[2,3,4,3,2]`, cohérence de progression) — pas une règle de moteur simple. Reporté à une session de conception à part entière.

### 11.5 Garde-fous du §10.2 — pas encore codés

Point de vigilance à ne pas perdre : les deux garde-fous décrits en §10.2 de ce document (plafond de réduction cumulée sur fenêtre glissante, borne dure sur l'ampleur d'une décision individuelle) **ne sont pas implémentés**. Avec seulement 2 règles capables de modifier le plan (`R-006`, `R-024s`) et une seule décision retournée à la fois par `evaluerRegles()` (jamais une liste), le risque de cumul brutal décrit en §10.2 reste théorique pour l'instant — mais il cessera de l'être dès que le catalogue grossira. À coder avant d'ajouter de nouvelles règles de type `reduire_charge`, pas après.

### 11.6 Validé sur données réelles (Laurent, 16/07/2026)

- `RunnerStateCalculator` : `{ fatigue: 35, charge: { aigue: 437.2, chronique: 515.9, ratio: 0.85 }, confiance: 85, risque: "faible" }` sur 22 séances/28j.
- `EngagementCalculator` : `{ regulariteRecente: 65, tendanceEngagement: "signal_faible", confiance: 33 }` — tendance "signal_faible" normale en premier calcul (aucun historique de points antérieurs).
- `RuleEngine` sur état réel (pas de fatigue/désengagement) : `decision: null` — le moteur reste muet à raison, aucune fausse alerte.
- Pipeline complet bout en bout, testé via un patch de fatigue forcée temporaire (`fatigue: 78`, retiré après test) : carte affichée avec la bonne séance ciblée et le bon calcul d'ampleur, clic "Appliquer" fonctionnel (modification réelle vérifiée par re-calcul immédiat), aucune donnée réelle jamais corrompue.

### 11.7 Prochaines étapes logiques

Par ordre de dépendance, pas nécessairement de priorité :

1. **§9.3 — unifier la source de vérité sur la charge** : retirer `calculerACWR(stravaActivities)` existant au profit de `RunnerStateCalculator`, pour que le graphique ACWR du dashboard et le moteur ne puissent jamais diverger.
2. **§9.1 — brancher le coach IA** sur `RunnerState`/`EngagementState`/`EngineDecision` plutôt que son calcul ACWR informel actuel.
3. **§10.2 — coder les deux garde-fous** avant tout ajout de règle supplémentaire au catalogue.
4. **Champs profil manquants** : `fcRepos` et `sexe` n'existent pas encore dans `profilCoureur` — actuellement contournés (valeur d'exemple 55 pour `fcRepos`, repli sur `'autre'` — moyenne des constantes — pour `sexe`). Ajout formel du champ profil + saisie utilisateur, pas urgent mais nécessaire avant toute mise en avant publique du moteur.
5. **§11.4 — algorithme de réduction d'intervalles** pour les séances de qualité, à concevoir à part.
6. Modules non commencés du catalogue complet (§7 doc archi) : surentraînement combiné, progression, taper irrégulier, objectif à risque — à reprendre seulement une fois les 3 règles actuelles éprouvées sur un usage réel prolongé (cf. §7.2).
