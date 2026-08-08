# Architecture — Moteur de décision Yoria

**Statut** : Document de conception, référence des principes, contrats de données et fondements scientifiques du moteur de décision. Pour l'état de code réellement livré, voir l'inventaire de l'application (§8).

---

## 1. Philosophie et principes directeurs

Le moteur de décision est un **moteur de règles métier**, pas un système d'IA générative. Il simule le raisonnement d'un entraîneur running expérimenté à partir de règles explicites, testables et documentées.

### Principes non négociables

| Principe | Ce que ça implique concrètement |
|---|---|
| **Déterministe** | Mêmes entrées → toujours la même sortie. Aucun appel LLM, aucun aléatoire dans le chemin de décision. |
| **Explicable** | Chaque décision référence l'identifiant de la ou des règles qui l'ont produite, avec une justification en langage naturel générée à partir de données structurées (pas de texte libre inventé). |
| **Modulaire** | Chaque module a une responsabilité unique, une interface stable, et peut être testé/remplacé isolément. |
| **Indépendant** | Aucune dépendance à Strava, à un framework UI, ou à un système de stockage particulier. Le moteur reçoit des objets, retourne des objets. |
| **Sécurité avant performance** | En cas de conflit entre deux règles, la règle qui protège le coureur (réduction de charge, repos) est toujours prioritaire sur celle qui progresse le plan. |
| **Engagement pris au sérieux** | Le risque qu'un coureur décroche par lassitude ou perte de plaisir est traité comme un risque à part entière, pas comme un supplément d'âme — un coureur qui abandonne l'app est un échec du moteur, même si toutes ses métriques physiques étaient bonnes (cf. §5.7 et §7). |
| **Évolutif sans rupture** | Ajouter/retirer une règle ne doit jamais nécessiter de modifier le moteur d'exécution. Les futurs modules (ML, prédiction) se branchent en *fournisseurs de signaux*, jamais en décideurs. |

### Ce que le moteur n'est pas

- Ce n'est pas un chatbot. Il ne génère pas de texte libre : il produit des objets structurés que l'UI ou un LLM pourront ensuite mettre en forme.
- Ce n'est pas un modèle prédictif. Il n'apprend pas, il applique des règles écrites par des humains (coachs / dev).
- Ce n'est pas couplé à Yoria. Il pourrait fonctionner en CLI avec des fixtures JSON, sans jamais toucher le front.

---

## 2. Vue d'ensemble de l'architecture

```
                         ┌─────────────────────┐
   Profil ──────────────▶│                      │
   Plan ─────────────────▶│   Module 1           │
   Historique ────────────▶│   État du coureur    │──┐
   Données Strava ────────▶│   (RunnerState)      │  │
                         └─────────────────────┘  │
                                                    ▼
                         ┌─────────────────────┐
   Séance prévue ────────▶│   Module 2           │
   Séance réalisée ───────▶│   Analyse de séance  │──┐
                         │   (SessionAnalysis)  │  │
                         └─────────────────────┘  │
                                                    │
                         ┌─────────────────────┐  │
   Semaine courante ─────▶│   Module 3           │  │
                         │   Analyse hebdo       │──┤
                         │   (WeekAnalysis)      │  │
                         └─────────────────────┘  │
                                                    ├──▶  RunnerState enrichi
                         ┌─────────────────────┐  │      (input unique du
   Historique N semaines▶│   Module 4           │  │       Module 5)
                         │   Analyse de tendance │──┘
                         │   (TrendAnalysis)     │
                         └─────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Module 5            │
                         │   Moteur de règles     │
                         │   (RuleEngine)         │
                         └─────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Module 6            │
                         │   Décision finale      │
                         │   (EngineDecision)     │
                         └─────────────────────┘
```

**Flux général** : les modules 1 à 4 sont des *pipelines de calcul purs* (données → données dérivées). Le module 5 est le seul point de décision. Le module 6 formate la sortie.

---

## 3. Structures de données (contrats)

Toutes les interfaces sont en TypeScript. Elles constituent le **contrat public** du moteur — c'est ce que le front (ou tout autre consommateur) doit fournir et recevoir.

### 3.1 Entrées brutes

```typescript
// --- Profil coureur ---
interface RunnerProfile {
  age: number;
  sexe: 'homme' | 'femme' | 'autre';
  poidsKg: number;
  tailleCm: number;
  niveau: 'debutant' | 'intermediaire' | 'avance' | 'expert';
  experienceAnnees: number;
  frequenceEntrainementHebdo: number; // séances/semaine habituelles
  objectif: ObjectifCourant;
  historiqueObjectifs: ObjectifCourant[];
  fcMaxReference?: number;     // mesurée si disponible, sinon estimée (ex: 220-âge) — nécessaire au calcul TRIMP, cf. §5.1
  fcReposReference?: number;   // idéalement mesurée au réveil ; cf. §5.4 sur son rôle de marqueur de surentraînement
}

interface ObjectifCourant {
  type: '5km' | '10km' | 'semi' | 'marathon' | 'trail' | 'forme_generale';
  dateEvenement?: string; // ISO date
  tempsCible?: string;    // "HH:MM:SS" — objectif principal déclaré par le coureur (traité comme le "B goal", cf. §5.8)
  tempsCibleAmbitieux?: string;   // optionnel — "A goal", objectif si tout se passe parfaitement
  tempsCibleSecurise?: string;    // optionnel — "C goal", objectif quasi garanti compte tenu du niveau actuel
  origineTempsCible: 'saisie_manuelle' | 'calculee_par_yoria'; // pour savoir si le coureur a fixé le chiffre ou si Yoria l'a suggéré
}

// --- Fenêtre temporelle jusqu'à l'objectif (cf. §5.8) ---
// Calculée, pas saisie : dérivée de ObjectifCourant.dateEvenement à chaque évaluation.
interface DelaiObjectif {
  joursRestants: number;
  semainesRestantes: number;
  phaseAttendueSelonDelai: PlanContext['phase']; // ce que la périodisation standard prescrirait à ce stade, indépendamment du plan réel suivi
  fenetreCritique: boolean; // true si on entre dans les 2-4 dernières semaines avant l'événement (cf. §5.8 — le taper devient la priorité)
}

// --- Plan d'entraînement ---
interface PlanContext {
  semaine: number;
  phase: 'developpement' | 'specifique' | 'affutage' | 'decharge' | 'recuperation';
  seancePrevue: SeancePrevue;
  volumeHebdoPrevu: number; // km
  chargePrevue: number;     // score interne (TSS-like ou équivalent maison)
}

interface SeancePrevue {
  id: string;
  type: 'endurance' | 'fractionne' | 'tempo' | 'cotes' | 'recuperation' | 'longue' | 'repos';
  allureCibleMinKm?: string; // "5:30"
  fcCibleMin?: number;
  fcCibleMax?: number;
  volumePrevuKm: number;
  chargePrevue: number;
}

// --- Historique ---
interface RunnerHistory {
  seancesRealisees: SeanceRealisee[];
  seancesManquees: number;         // sur la période analysée
  seancesReportees: number;
  tauxReussite: number;            // 0-1
  assiduite: number;               // 0-1, sur 4-8 dernières semaines
  volumeHebdoMoyen: number;        // km, glissant
}

interface SeanceRealisee {
  seanceId: string;               // référence à la séance prévue liée
  date: string;
  distanceKm: number;
  dureeMin: number;
  allureMoyenneMinKm: string;
  fcMoyenne?: number;
  fcMax?: number;
  cadence?: number;
  denivelePositifM?: number;
  temperatureC?: number;
  puissanceMoyenneW?: number;
  ressentiRPE?: number;            // 1-10, si saisi par le coureur
}

// --- Échantillon d'activité, quelle que soit la source ---
// Le moteur ne doit jamais coder en dur une dépendance à Strava (cf. §4, principe d'indépendance aux sources).
interface ActivitySample {
  activityId: string;
  date: string;
  distanceKm: number;
  dureeMin: number;
  allureMoyenneMinKm: string;
  fcMoyenne?: number;
  fcMax?: number;
  cadence?: number;
  denivelePositifM?: number;
  temperatureC?: number;
  puissanceMoyenneW?: number;
  ressentiRPE?: number;              // saisie manuelle possible même sur activité connectée
  provenance: DataProvenance;         // traçabilité champ-agnostique : d'où vient CET échantillon
}

// D'où vient l'activité elle-même (pas champ par champ — voir DataAvailability pour ça)
type DataProvenance = 'manuel' | 'strava_gratuit' | 'strava_premium' | 'montre_connectee' | 'fichier_importe';
```

### 3.2 Profil de complétude des données

Avant de calculer quoi que ce soit, le moteur doit savoir **ce qu'il a réellement à disposition** pour ce coureur, à cet instant. C'est un objet à part entière, calculé en amont du Module 1, et transmis à tous les modules qui en ont besoin.

```typescript
// Profil indicatif — donne une vue d'ensemble, sert à l'UI et au calcul de confiance de base.
// NE DOIT JAMAIS être utilisé seul pour activer/désactiver une règle : voir DataAvailability ci-dessous.
type DataProfile = 'manuel_seul' | 'strava_gratuit' | 'strava_premium' | 'montre_connectee';

// Vérité terrain, calculée à partir des données RÉELLEMENT présentes pour CE coureur,
// pas déduite du DataProfile. C'est CET objet que les règles interrogent.
interface DataAvailability {
  profilIndicatif: DataProfile;
  champsDisponibles: {
    frequenceCardiaque: boolean;
    cadence: boolean;
    puissance: boolean;
    denivele: boolean;
    temperature: boolean;
    rpeDeclare: boolean;             // ressenti saisi manuellement par le coureur
    allurePrecise: boolean;          // GPS fiable vs estimation manuelle grossière
  };
  profondeurHistorique: {
    nombreSemainesDisponibles: number;
    nombreSeancesTotal: number;
  };
  fraicheurDonnees: {
    derniereSyncISO?: string;        // pertinent si source connectée (sync qui peut être en retard)
    saisieManuelleAJour: boolean;
  };
}
```

**Règle de calcul** : `champsDisponibles` est déterminé en inspectant réellement les derniers `ActivitySample` du coureur (ex : `fcMoyenne` est présent sur > 80% des séances récentes → `frequenceCardiaque: true`), **pas** en supposant que "Strava Premium implique la FC". Un utilisateur Strava Premium sans ceinture cardio n'a pas de FC, un utilisateur en saisie manuelle rigoureuse peut très bien renseigner son RPE à chaque séance.

Le `profilIndicatif` reste utile pour :
- l'UI (afficher à l'utilisateur "connecte ta montre pour des recommandations plus fines")
- une valeur de **confiance de base** avant même le calcul détaillé (un profil `manuel_seul` plafonne structurellement la confiance, même si toutes les cases sont cochées, car la fiabilité déclarative reste plus faible qu'une mesure capteur)

### 3.3 Sorties dérivées (inter-modules)

```typescript
// --- Module 1 : État du coureur ---
interface RunnerState {
  fatigue: ScoreNormalise;        // 0-100, 100 = très fatigué
  fraicheur: ScoreNormalise;      // 0-100, très frais (peut être 100-fatigue selon modèle)
  charge: {
    aigue: number;                // charge 7 derniers jours
    chronique: number;            // charge moyenne 28 derniers jours
    ratio: number;                // ACWR = aigue/chronique
  };
  recuperation: ScoreNormalise;   // 0-100
  confiance: ScoreNormalise;      // 0-100, confiance du moteur dans cet état (dépend du volume de données dispo)
  risque: NiveauRisque;
  disponibilite: 'disponible' | 'limitee' | 'indisponible'; // blessure/fatigue déclarée
  dataAvailability: DataAvailability; // propagée pour que le moteur de règles (module 5) sache sur quoi il s'appuie
  calculeLe: string;               // ISO datetime
}

type ScoreNormalise = number; // 0-100
type NiveauRisque = 'faible' | 'modere' | 'eleve' | 'critique';

// --- État d'engagement du coureur (cf. §5.7) ---
// Produit par un sous-module dédié du Module 1, au même niveau que RunnerState,
// mais volontairement séparé : mélanger physiologie et motivation dans un seul objet
// rendrait les deux plus difficiles à interpréter et à tester isolément.
interface EngagementState {
  plaisirDeclare?: ScoreNormalise;        // dérivé d'une mini-échelle type PACES-S (cf. §5.7), absent si non saisi
  regulariteRecente: ScoreNormalise;      // proxy comportemental : constance des 14 derniers jours vs habitude établie
  tendanceEngagement: 'stable' | 'en_baisse' | 'en_hausse' | 'signal_faible'; // 'signal_faible' = pas assez de données pour conclure
  signauxDetectes: EngagementSignal[];
  confiance: ScoreNormalise;               // suit la même logique que RunnerState.confiance : basse si peu de données
  calculeLe: string;
}

interface EngagementSignal {
  code: string;              // ex: "BAISSE_FREQUENCE_SAISIE", "PLAISIR_DECLARE_EN_BAISSE", "DESENGAGEMENT_PRECOCE"
  description: string;
  poids: number;
}

// --- Module 2 : Analyse de séance ---
// Le champ `repetitions` remplace un champ "volume" de conception initiale : une
// comparaison de distance totale ne détecte pas un abandon en cours de séance (la
// montre continue d'enregistrer les créneaux prévus même en cas de répétition
// ratée/marchée — la distance totale peut rester proche de la cible malgré une
// vraie répétition ratée au milieu). Le signal réellement fiable est le taux de
// répétitions dans la zone d'allure cible, pas le volume brut.
interface SessionAnalysis {
  seanceId: string;
  reussite: boolean;
  scoreReussite: ScoreNormalise;     // 0-100, pondère plusieurs critères (allure 0.4, FC 0.25, répétitions 0.35)
  difficulteRessentie: 'facile' | 'normale' | 'difficile' | 'tres_difficile' | 'inconnue';
  derive: {
    allure: EcartAnalyse;
    frequenceCardiaque: EcartAnalyse;
    repetitions: EcartAnalyse;       // nbDansLaZone/nbTotal/tauxReussite en plus des champs EcartAnalyse standards
  };
  alertes: AlerteSeance[];
}

interface EcartAnalyse {
  ecartPourcent: number;   // signé : + = au-dessus de la cible, - = en-dessous
  dansLaZone: boolean;
  commentaire: string;      // court, factuel — pas de prose libre
}

interface AlerteSeance {
  code: string;              // ex: "FC_TROP_HAUTE", "ALLURE_HORS_ZONE"
  gravite: 'info' | 'attention' | 'alerte';
}

// --- Module 3 : Analyse hebdomadaire ---
interface WeekAnalysis {
  semaine: number;
  volumeRealiseKm: number;
  volumePrevuKm: number;
  ecartVolumePourcent: number;
  seancesManquees: number;
  seancesReussies: number;
  seancesTotal: number;
  chargeTotaleSemaine: number;
  recuperationEstimee: ScoreNormalise;
  progressionVsPrecedente: 'hausse' | 'stable' | 'baisse';
}

// --- Module 4 : Analyse de tendance ---
interface TrendAnalysis {
  fenetreSemaines: number;          // ex: 4, 6, 8
  tendanceGenerale: 'progression' | 'stagnation' | 'fatigue_accumulee' | 'amelioration' | 'baisse_de_forme';
  pointsDeSuivi: {
    semaine: number;
    fatigue: ScoreNormalise;
    volumeKm: number;
    tauxReussite: number;
  }[];
  signauxDetectes: SignalTendance[];
}

interface SignalTendance {
  code: string;                     // ex: "3_SEMAINES_REUSSIES", "CHARGE_CROISSANTE_RAPIDE"
  description: string;
  poids: number;                    // contribue au score de tendance
}

// --- Faisabilité de l'objectif (cf. §5.8) ---
// Produit par un sous-module dédié du Module 1 (comme EngagementState) : ni physiologie pure,
// ni engagement pur — croise l'état réel du coureur avec le temps restant et l'objectif déclaré.
interface GoalFeasibility {
  objectifEvalue: 'ambitieux' | 'principal' | 'securise'; // quel palier de ObjectifCourant est évalué
  statut: 'en_bonne_voie' | 'incertain' | 'compromis' | 'donnees_insuffisantes';
  ecartEstime?: string;              // ex: "+3:40" — écart estimé vs tempsCible, signé, absent si statut = 'donnees_insuffisantes'
  signauxObserves: {
    consistanceSeancesClefs: ScoreNormalise;  // cf. §5.8 — meilleur prédicteur que le calcul brut de temps restant
    respectAlluresCibles: ScoreNormalise;
  };
  delai: DelaiObjectif;
  confiance: ScoreNormalise;         // basse tant que peu de séances-clés ont été réalisées, cf. §5.8
  calculeLe: string;
}
```

### 3.4 Entrée et sortie du moteur de règles (modules 5 & 6)

```typescript
// --- Entrée unique du module 5 ---
interface EngineInput {
  runnerState: RunnerState;
  engagementState: EngagementState;    // cf. §5.7 — traité au même niveau que runnerState, jamais en accessoire
  goalFeasibility: GoalFeasibility;    // cf. §5.8 — idem : ni sous-produit de la physio, ni sous-produit de l'engagement
  sessionAnalysis?: SessionAnalysis;   // absent si pas de séance récente à évaluer
  weekAnalysis: WeekAnalysis;
  trendAnalysis: TrendAnalysis;
  profile: RunnerProfile;
  planContext: PlanContext;
}

// --- Une règle ---
interface DecisionRule {
  id: string;                          // ex: "R-024"
  libelle: string;                     // court, humain
  priorite: number;                    // plus haut = évalué/gagnant en premier en cas de conflit
  categorie: 'securite' | 'progression' | 'adaptation' | 'maintien' | 'engagement';

  // --- Contrat de données de la règle (voir §4) ---
  donneesRequises: (keyof DataAvailability['champsDisponibles'])[];   // sans elles, la règle ne peut pas s'évaluer du tout
  donneesOptionnelles?: (keyof DataAvailability['champsDisponibles'])[]; // affinent le résultat si présentes, sinon fallback
  modeDegradation: 'bloquer' | 'degrader_avec_proxy';                  // sécurité → degrader_avec_proxy le plus souvent ; progression → bloquer

  conditions: (input: EngineInput) => boolean;
  decision: (input: EngineInput) => DecisionCandidate;
  justificationTemplate: (input: EngineInput) => string; // génère la justification à partir de données, jamais de texte inventé
  confianceMax?: ScoreNormalise;        // plafond de confiance propre à la règle quand elle tourne en mode dégradé
}

interface DecisionCandidate {
  type: TypeDecision;
  ampleur?: number;                    // ex: -10 pour "réduire de 10%"
  cible?: 'volume' | 'intensite' | 'frequence' | 'repos' | 'plan_complet';
}

type TypeDecision =
  | 'maintenir'
  | 'reduire_charge'
  | 'augmenter_charge'
  | 'repos_complet'
  | 'reporter_seance'
  | 'adapter_plan'
  | 'alerter_blessure_potentielle'
  | 'varier_le_plan'                    // cf. §5.7 — casser la routine pour restaurer le plaisir, sans changer la charge
  | 'proposer_objectif_social'          // cf. §5.7 — répondre au besoin de "relatedness" (SDT)
  | 'alerter_risque_decrochage'         // cf. §5.7 — signal destiné au produit/à l'UI, pas au plan d'entraînement lui-même
  | 'demarrer_taper'                    // cf. §5.8 — bascule explicite de phase, distincte d'une simple réduction de charge
  | 'alerter_objectif_a_risque'         // cf. §5.8 — informe, ne modifie jamais l'objectif du coureur (cf. principe en tête de §5.8)
  | 'suggerer_objectif_alternatif';     // cf. §5.8 — proposition explicite au coureur (ex: viser le C goal), jamais appliquée automatiquement

// --- Sortie finale du moteur ---
interface EngineDecision {
  decision: TypeDecision;
  ampleurPourcent?: number;
  cible?: 'volume' | 'intensite' | 'frequence' | 'repos' | 'plan_complet';
  justification: string;
  confiance: ScoreNormalise;           // 0-100
  origine: {
    regleId: string;
    reglesEcartees: { id: string; raisonEcartee: string }[]; // traçabilité des règles non retenues
  };
  metadata: {
    calculeLe: string;                 // ISO datetime
    versionMoteur: string;
    inputSnapshot?: EngineInput;       // optionnel, utile pour debug/audit
  };
}
```

---

## 4. Gestion des données variables selon la source

### 4.1 Le problème

Tous les coureurs n'ont pas les mêmes données disponibles :

| Profil | FC | Cadence | Puissance | Dénivelé | RPE déclaré | Fiabilité GPS |
|---|---|---|---|---|---|---|
| Saisie manuelle seule | non | non | non | rarement fiable | possible, si le coureur joue le jeu | approximative |
| Strava gratuit (via app mobile) | rarement (dépend du capteur) | parfois | non | oui | possible | bonne |
| Strava Premium | selon capteur associé | selon capteur | selon capteur (footpod) | oui | possible | bonne |
| Montre connectée (Garmin, Coros, etc.) | oui, en continu | oui | selon modèle | oui | possible + parfois auto-estimé | excellente |

**Le piège à éviter** : coder des règles qui supposent silencieusement une donnée toujours présente (ex : une règle de fatigue qui utilise `fcMoyenne` sans vérifier sa disponibilité plantera ou, pire, produira une décision silencieusement fausse avec `undefined` traité comme `0`).

### 4.2 Principe directeur : dégradation différenciée par catégorie de règle

Le mode de réaction à une donnée manquante **dépend de la criticité de la règle**, pas d'un choix binaire unique pour tout le moteur :

| Catégorie de règle | Comportement par défaut si donnée requise manque | Justification |
|---|---|---|
| **Sécurité** | `degrader_avec_proxy` — utiliser un proxy moins précis mais ne jamais rester muet | Le coût de ne pas détecter un risque dépasse largement le coût d'une fausse alerte prudente |
| **Adaptation** | `degrader_avec_proxy`, avec `confianceMax` plus bas | On adapte quand même le plan, mais on signale l'incertitude |
| **Progression** | `bloquer` | On n'augmente jamais la charge sur une supposition — au pire on stagne un peu plus longtemps que nécessaire, ce qui est sans risque |
| **Maintien** | `bloquer` (mais c'est déjà la règle par défaut, donc sans impact) | N/A |

### 4.3 Exemples de proxys de dégradation

```typescript
const R024_FatigueElevee: DecisionRule = {
  id: 'R-024',
  libelle: 'Réduction de charge sur fatigue élevée',
  priorite: 90,
  categorie: 'securite',
  donneesRequises: [],                        // aucune donnée strictement bloquante
  donneesOptionnelles: ['frequenceCardiaque', 'rpeDeclare'],
  modeDegradation: 'degrader_avec_proxy',
  confianceMax: 60,                            // si on tourne uniquement sur volume/assiduité, confiance plafonnée
  conditions: (input) => {
    const { champsDisponibles } = input.runnerState.dataAvailability;
    if (champsDisponibles.frequenceCardiaque || champsDisponibles.rpeDeclare) {
      // cas riche : FC et/ou RPE réels disponibles
      return input.runnerState.fatigue >= 75 && input.runnerState.charge.ratio >= 1.3;
    }
    // cas dégradé : proxy uniquement sur assiduité + volume + tendance
    return (
      input.weekAnalysis.ecartVolumePourcent > 20 &&
      input.trendAnalysis.signauxDetectes.some(s => s.code === 'CHARGE_CROISSANTE_RAPIDE')
    );
  },
  decision: () => ({ type: 'reduire_charge', ampleur: -10, cible: 'volume' }),
  justificationTemplate: (input) => {
    const { frequenceCardiaque, rpeDeclare } = input.runnerState.dataAvailability.champsDisponibles;
    if (frequenceCardiaque || rpeDeclare) {
      return `Fatigue élevée détectée (score ${input.runnerState.fatigue}/100), ` +
             `ratio de charge de ${input.runnerState.charge.ratio.toFixed(2)}.`;
    }
    return `Hausse rapide du volume détectée sans données physiologiques disponibles ` +
           `(estimation basée sur le volume et l'assiduité uniquement — précision limitée).`;
  },
};

const R010_ProgressionValidee: DecisionRule = {
  id: 'R-010',
  libelle: 'Augmentation progressive après séries réussies',
  priorite: 50,
  categorie: 'progression',
  donneesRequises: ['rpeDeclare'],             // on veut au moins un signal de ressenti avant d'augmenter
  modeDegradation: 'bloquer',                  // pas de proxy : on ne devine pas qu'un coureur va bien
  conditions: (input) =>
    input.trendAnalysis.signauxDetectes.some(s => s.code === '3_SEMAINES_REUSSIES') &&
    input.runnerState.risque === 'faible',
  decision: () => ({ type: 'augmenter_charge', ampleur: 8, cible: 'volume' }),
  justificationTemplate: (input) =>
    `Trois semaines consécutives réussies, ressenti coureur positif, risque faible : progression recommandée.`,
};
```

**Lecture** : `R-024` (sécurité) ne bloque jamais — elle change juste de stratégie de détection et plafonne sa confiance. `R-010` (progression) refuse purement et simplement de s'activer si le coureur ne renseigne jamais son ressenti, quelle que soit la richesse du reste des données.

### 4.4 Impact sur le calcul de confiance globale (Module 1)

`calculerConfiance` (§6, Module 1) intègre le `DataProfile` et `champsDisponibles` comme entrées de base, pas seulement le volume d'historique :

```typescript
function calculerConfiance(
  dataAvailability: DataAvailability,
  profondeurHistoriqueSemaines: number
): ScoreNormalise {
  const plafondParProfil: Record<DataProfile, number> = {
    manuel_seul: 65,
    strava_gratuit: 80,
    strava_premium: 90,
    montre_connectee: 100,
  };
  const plafond = plafondParProfil[dataAvailability.profilIndicatif];

  const scoreHistorique = Math.min(profondeurHistoriqueSemaines / 4, 1) * plafond; // < 4 semaines = confiance réduite proportionnellement
  const champsPresents = Object.values(dataAvailability.champsDisponibles).filter(Boolean).length;
  const totalChamps = Object.keys(dataAvailability.champsDisponibles).length;
  const scoreCompletude = (champsPresents / totalChamps) * plafond;

  return Math.round(Math.min(scoreHistorique, scoreCompletude, plafond));
}
```

Le `plafondParProfil` n'est **pas** une pénalité arbitraire envers les utilisateurs sans matériel connecté — c'est une honnêteté du système : une décision basée sur des données déclaratives reste structurellement moins fiable qu'une décision basée sur des mesures capteur, et le moteur doit le refléter dans sa confiance affichée, jamais le cacher.

### 4.5 Conséquence sur l'UI

Le fait que `EngineDecision.confiance` puisse être structurellement plafonné pour un utilisateur en saisie manuelle est une information utile à remonter côté produit : c'est un levier naturel et honnête pour inciter à connecter Strava/une montre, sans avoir à le formuler comme du marketing — le moteur donne juste une meilleure décision avec plus de données, ce qui est vrai.

---

## 5. Fondements scientifiques

Cette section rassemble ce que dit la littérature scientifique sur les signaux que le moteur manipule. Elle sert de référence indépendante du catalogue de règles (§7) : elle est écrite pour éviter le biais qui consisterait à chercher une étude qui confirme une règle déjà écrite plutôt que d'ajuster la règle à ce que montre la recherche.

**Principe de lecture** : la science du sport sur le running récréatif est plus jeune et plus fragmentée qu'on ne le pense généralement — beaucoup de règles "de bon sens" largement diffusées (comme la règle des 10%) n'ont en réalité jamais été validées, voire ont été explicitement infirmées par des études récentes de grande ampleur. Le moteur doit refléter cette incertitude dans ses scores de confiance plutôt que de l'ignorer.

### 5.1 Méthode de calcul de la charge d'entraînement (fondation du reste du §5)

Cette sous-section précède volontairement l'ACWR (§5.2) : l'ACWR n'est qu'un *ratio* entre deux charges — sans une méthode fiable pour calculer la charge elle-même, tout ce qui en dépend (ACWR, fatigue, `RunnerState.charge`) hérite de son imprécision.

**Ce que dit la littérature — deux méthodes complémentaires, pas concurrentes** :

- **TRIMP (Training Impulse) de Banister**, la méthode de référence quand la fréquence cardiaque est disponible : `TRIMP = durée (min) × %FCR × facteur de pondération exponentiel`, où `%FCR` (fréquence cardiaque de réserve) = `(FC moyenne séance − FC repos) / (FC max − FC repos)`, et le facteur de pondération est `0.64 × e^(1.92 × %FCR)` pour les hommes ou `0.86 × e^(1.67 × %FCR)` pour les femmes — des constantes dérivées empiriquement de la relation entre fréquence cardiaque et taux de lactate sanguin observée lors de tests incrémentaux. La pondération exponentielle est volontaire : elle traduit le fait que le coût physiologique d'un effort augmente de façon disproportionnée avec l'intensité, pas de façon linéaire.
- **sRPE (session-RPE) de Foster**, la méthode de référence en l'absence de FC (cf. §5.2 sur la validité du RPE) : `sRPE = durée (min) × RPE (échelle CR-10)`. Une étude comparant sRPE à plusieurs variantes de TRIMP basées sur la FC trouve des corrélations fortes entre les deux approches (r = 0.79 pour le TRIMP de Banister, jusqu'à r = 0.91 pour certaines variantes), ce qui **valide scientifiquement le principe de dégradation déjà posé au §4.3** : passer de la FC au RPE en cas de donnée manquante n'est pas un pis-aller arbitraire, c'est une substitution dont l'équivalence est documentée.

**Limites connues à ne pas ignorer** : le TRIMP classique utilise une FC moyenne de séance, ce qui ne distingue pas les phases d'effort et de récupération au sein d'une même séance — un fractionné et un footing continu à FC moyenne identique produiront le même score, alors que leur coût physiologique réel diffère. Des variantes plus fines existent (TRIMP par sommation d'impulsions partielles) mais demandent un traitement des données seconde par seconde. Par ailleurs, les constantes de pondération (0.64/1.92 et 0.86/1.67) reposent sur un échantillon historique restreint et une distinction binaire homme/femme qui ne capture pas toute la variabilité physiologique individuelle — à traiter comme une approximation raisonnable, pas une vérité individualisée.

**Implication pour le moteur** :
- `calculerCharge` (§6, Module 1) implémente le TRIMP de Banister quand `frequenceCardiaque` est disponible dans `DataAvailability`, et bascule sur le sRPE de Foster sinon.
- Les deux méthodes produisent des échelles de valeurs différentes (TRIMP en dizaines/centaines, sRPE en centaines selon la durée) : le moteur doit les normaliser sur une échelle commune avant tout calcul d'ACWR ou de charge chronique, pour ne jamais comparer un TRIMP et un sRPE comme s'ils étaient la même unité.
- Puisque le sexe entre dans la formule TRIMP, `RunnerProfile.sexe` doit avoir une valeur par défaut documentée pour ce calcul quand `'autre'` est déclaré : utiliser la moyenne des deux jeux de constantes plutôt que d'en choisir un arbitrairement, en le signalant explicitement dans la confiance du calcul.

### 5.2 Charge aiguë/chronique (ACWR)

**Ce qu'on pensait savoir** : le ratio charge aiguë (7 derniers jours) / charge chronique (moyenne sur 3-6 semaines) prédirait le risque de blessure, avec une zone "sûre" entre 0.8 et 1.3.

**Ce que dit la littérature récente** : une revue systématique sur l'ACWR et le risque de blessure conclut que la relation reste peu claire, avec une grande variabilité entre les points de référence, plages d'ACWR et variables testées selon les études, même si une tendance vers un risque de blessure plus faible dans la zone 0.8-1.3 ressort de plusieurs travaux. Une méta-analyse plus récente (22 études de cohorte) confirme l'intérêt de la métrique tout en soulignant l'hétérogénéité méthodologique du champ. À l'inverse, une revue systématique dédiée au football professionnel juge la relation entre ACWR et risque de blessure non concluante, avec des seuils précis difficiles à établir en l'état de la recherche.

**Implication pour le moteur** :
- L'ACWR reste un signal légitime à calculer et à utiliser (c'est un indicateur simple, continu, largement étudié), mais **le moteur ne doit jamais le traiter comme un prédicteur fiable isolé**. Il doit toujours être combiné à d'autres signaux (RPE, fréquence des séances manquées, tendance) avant de déclencher une décision de sécurité.
- La zone 0.8-1.3 reste une bonne valeur de départ pour les seuils de règles, mais la `confiance` associée à une décision reposant *uniquement* sur l'ACWR doit être structurellement plafonnée (proposition : max 65/100), reflétant l'incertitude de la littérature elle-même.

### 5.3 RPE (Rating of Perceived Exertion) et ressenti déclaré

**Ce que dit la littérature** : l'échelle de Borg (CR-10 ou 6-20) est validée et largement utilisée comme méthode fiable et peu coûteuse de suivi de charge d'entraînement. Sa validité et sa fiabilité sont meilleures chez les sportifs entraînés que chez les débutants — une étude sur des échelles RPE faciales trouve une validité et fiabilité faibles chez les sujets non entraînés, contre une validité bonne (ICC ≥ 0.80) chez les sujets entraînés. La sRPE (session-RPE, = RPE × durée de la séance) est une méthode largement acceptée pour quantifier la charge interne d'entraînement.

**Implication pour le moteur** :
- Le RPE déclaré est une donnée de bonne qualité **si le coureur est suffisamment expérimenté et rigoureux dans sa saisie**.
- La sRPE (`ressentiRPE × dureeMin`) est une bonne candidate de proxy de charge quand la FC est indisponible — c'est un calcul déjà standard dans la littérature, pas une improvisation.

**Application dans Yoria** : la difficulté de fiabilité chez un coureur non entraîné est traitée en amont, côté UI — l'échelle CR-10 (1-10) n'est jamais montrée directement au coureur, qui choisit parmi 5 niveaux visuels simples (🙂 Facile → 🥵 Maximal), mappés vers CR-10 (2/4/6/8/10) uniquement pour le calcul interne. Quand une FC est disponible, le RPE n'est pas utilisé en remplacement (le TRIMP reste la mesure principale) mais en ajustement : RPE ≥ 8 amplifie légèrement la charge calculée (+12%), jamais ne l'abaisse.

### 5.4 Surentraînement (Overtraining Syndrome) et marqueurs de détection précoce

**Ce que dit la littérature** : le consensus conjoint ECSS/ACSM (Meeusen et al., 2013) reste la référence sur le sujet. Il distingue le surmenage fonctionnel (Functional Overreaching, FOR — bénéfique, suivi d'une amélioration après récupération), le surmenage non fonctionnel (Non-Functional Overreaching, NFOR) et le syndrome de surentraînement (Overtraining Syndrome, OTS) proprement dit, la distinction entre ces états étant en pratique difficile et reposant surtout sur l'évolution clinique. Un marqueur précoce identifié comme relativement fiable est une fréquence cardiaque de repos élevée de 10 à 30 battements par minute au-dessus de la valeur normale du sportif. Plus largement, aucun marqueur biochimique ou fonctionnel isolé n'est identifié comme fiable à lui seul pour détecter précocement l'OTS ; le suivi du ressenti subjectif de bien-être reste, historiquement, l'un des outils les plus efficaces (une étude ancienne mais toujours citée montre que des indices de bien-être auto-déclarés expliquent jusqu'à 76-85% de la variance des scores de "staleness").

**Implication pour le moteur** :
- Aucune règle de détection de surentraînement ne devrait reposer sur un seul signal. La combinaison FC de repos + ressenti subjectif + tendance de performance est l'approche la mieux soutenue par la littérature, pas un score composite opaque.
- Le champ `RunnerProfile.fcReposReference` sert doublement : c'est aussi l'un des rares marqueurs simples et actionnables de surentraînement identifiés par le consensus ECSS/ACSM (une FC de repos *quotidienne*, via un futur `DailyCheckIn`, permettrait de détecter l'élévation de 10-30 bpm mentionnée plus haut — la valeur de référence seule ne suffit pas pour ce signal précis, seulement pour le calcul de charge).
- Le moteur doit rester prudent dans son vocabulaire : ne jamais afficher un diagnostic de type "syndrome de surentraînement" à l'utilisateur (ce n'est pas un outil clinique), seulement des alertes de type "signaux de fatigue accumulée" avec recommandation de consulter si les signes persistent.

### 5.5 Progression du volume d'entraînement (remplace la "règle des 10%")

**Ce que dit la littérature — et c'est le point le plus important de cette section** : la règle des 10% par semaine, bien qu'universellement enseignée, **n'a jamais été validée par un essai contrôlé et randomisé**. Une revue systématique portant sur plus de 23 000 coureurs conclut explicitement que la règle des 10% pour l'augmentation du volume hebdomadaire n'est pas justifiée par les preuves actuelles, et qu'aucune recommandation universelle sur les paramètres d'entraînement ne peut être établie en l'état de la recherche.

Plus intéressant : une étude de cohorte de grande ampleur (Garmin-RUNSAFE Running Health Study, plus de 5 200 coureurs suivis 18 mois) publiée dans le British Journal of Sports Medicine trouve que **ce n'est pas la progression du volume hebdomadaire qui prédit le mieux le risque de blessure, mais le pic ponctuel d'une séance unique** : dépasser 110% de la plus longue sortie des 30 jours précédents est associé à un risque de blessure de surcharge accru de plus de 64%. Dans cette même étude, les métriques classiques (ACWR, variation hebdomadaire de volume) montraient peu ou pas de valeur prédictive.

**Implication pour le moteur — changement de conception** :
- Aucune règle ne doit plafonner mécaniquement la progression hebdomadaire à +10% comme s'il s'agissait d'un seuil scientifiquement validé.
- Signal de suivi privilégié : **le ratio entre la séance la plus longue prévue/réalisée et la plus longue séance des 30 derniers jours**. Une règle de sécurité dédiée à ce ratio (seuil indicatif à 110%) a plus de valeur prédictive démontrée qu'une règle sur le volume hebdomadaire global.
- Ceci ne signifie pas que la progression du volume hebdomadaire est sans intérêt — elle reste pertinente pour la planification et la programmation progressive — mais elle ne doit pas être présentée comme un garde-fou de sécurité anti-blessure dans le moteur : ce rôle revient au signal de pic de séance unique.

### 5.6 Sommeil

**Ce que dit la littérature** : le sommeil est un facteur de risque de blessure musculo-squelettique indépendant, bien documenté. Dormir 7 heures ou moins de façon soutenue sur au moins 14 jours est associé à un risque de blessure musculo-squelettique 1.7 fois plus élevé. Une étude sur des coureurs récréatifs (n=339, suivi 6 mois) trouve qu'une moins bonne qualité de sommeil déclarée est associée à un risque de blessure liée à la course 36% plus élevé. Le manque de sommeil est également associé à une performance d'endurance réduite, un effet dont l'ampleur dépend de la durée de l'exercice.

**Implication pour le moteur** :
- Le sommeil est un **angle mort du catalogue actuel** — c'est l'un des facteurs de risque de blessure les mieux soutenus par la littérature parmi tous ceux examinés dans cette section, mais aucune source de données du moteur ne le capte à ce jour.
- Recommandation : prévoir un champ de saisie simple (durée de sommeil déclarée, ou qualité perçue sur une échelle courte) dans un futur `DailyCheckIn`, même optionnel/déclaratif.
- En l'absence de cette donnée, le moteur doit s'abstenir de toute règle basée sur le sommeil plutôt que de l'ignorer silencieusement dans sa documentation.

### 5.7 Plaisir et motivation — un déterminant de l'adhérence aussi important que la physiologie

**Ce que dit la littérature** : le cadre théorique dominant est la **théorie de l'autodétermination** (Self-Determination Theory, Ryan & Deci), qui identifie trois besoins psychologiques de base — compétence, autonomie, relation sociale (*competence, autonomy, relatedness*) — dont la satisfaction prédit la motivation intrinsèque. Les formes autonomes de motivation sont associées à un plus grand plaisir et à des intentions d'abandon réduites, tandis que la motivation extrinsèque et l'amotivation sont corrélées à une faible adhérence à l'activité physique. Une étude longitudinale souligne même que l'augmentation de la motivation intrinsèque était le meilleur prédicteur du changement de poids à long terme, davantage que la perte de poids initiale — signe que le plaisir n'est pas un supplément agréable mais un moteur causal de la persévérance.

Côté outils de mesure : la **PACES-S** (Physical Activity Enjoyment Scale, version courte) est une échelle validée à seulement 4 items ("j'aime ça", "je trouve ça agréable", "c'est très plaisant", "je me sens bien"), notée sur une échelle de Likert à 5 points, avec de bonnes propriétés psychométriques chez l'adulte.

Côté signal comportemental (sans dépendre de la saisie déclarative) : dans les applications de fitness, le pattern d'usage des deux premières semaines est le prédicteur le plus fort de désengagement — les utilisateurs qui complètent moins de 3 séances sur leurs 14 premiers jours décrochent à un taux 3 à 4 fois supérieur à ceux qui installent une routine hebdomadaire régulière. Ce signal est purement comportemental, déjà disponible dans `RunnerHistory`, et ne nécessite aucune saisie supplémentaire de l'utilisateur.

**Implication pour le moteur** :
- Deux sources de signal complémentaires : un **signal déclaratif léger** (mini-PACES-S, 1 à 4 questions, ponctuel) pour capter le plaisir ressenti, et un **signal comportemental silencieux** (régularité des 14 derniers jours vs habitude établie) toujours disponible, même sans aucune saisie volontaire du coureur.
- Contrairement aux signaux physiologiques du reste du §5, le signal comportemental d'engagement est disponible pour 100% des coureurs quel que soit leur `DataProfile` — c'est le seul axe du moteur qui ne dépend d'aucun capteur.
- Le cadre SDT suggère aussi une piste concrète pour la nature des décisions à produire : une intervention pertinente sur le plan motivationnel n'est pas forcément "réduire la charge" mais peut être "varier la nature des séances" (répond au besoin de compétence/nouveauté) ou "proposer un objectif social/collectif" (répond au besoin de *relatedness*) — d'où les types de décision `varier_le_plan` et `proposer_objectif_social` en §3.4, distincts des décisions de charge pure.
- Le désengagement est un phénomène qui se construit dans la durée (le §5.7 ne repose que sur des tendances, jamais un instantané) — c'est pourquoi `EngagementState.tendanceEngagement` distingue explicitement `signal_faible` de `stable`, pour ne jamais interpréter un manque de données comme un signal positif.

### 5.8 Objectifs et délai jusqu'à l'événement

**Ce que dit la littérature — périodisation et taper** : la structuration d'un plan en phases (base, développement spécifique, affûtage/taper) avant un objectif de course est une pratique largement documentée, mais **sans consensus scientifique sur l'approche "supérieure"** — les divergences dépendent fortement de l'expérience et de l'historique de l'athlète. Sur le taper spécifiquement, une étude portant sur plus de 158 000 marathoniens récréatifs (données Strava) montre qu'un **taper plus long et plus discipliné** (réduction progressive et régulière du volume dans les semaines précédant la course) est associé à une meilleure performance le jour J que les tapers irréguliers — or environ deux tiers des coureurs récréatifs interrompent leur réduction de charge par une semaine de volume en hausse, ce qui dégrade la performance de course. C'est un signal directement actionnable.

**Ce que dit la pratique du coaching sur la faisabilité d'objectif** : deux principes convergent, indépendamment de leur niveau de preuve scientifique formel (pratique professionnelle documentée plutôt que d'essais contrôlés) :
- **Objectifs à paliers (A/B/C)** : fixer un objectif ambitieux ("A goal"), un objectif réaliste ("B goal", le plus souvent la cible déclarée par le coureur), et un objectif quasi garanti ("C goal") est une pratique répandue pour éviter le sentiment d'échec total d'un objectif binaire — ce qui rejoint directement le §5.7 sur la préservation de la motivation intrinsèque.
- **La consistance des séances-clés prédit mieux la faisabilité que le simple calcul du temps restant.** Les allures réellement tenues en séance qualité (fractionné, tempo) et la régularité des sorties longues sont plus informatives qu'une projection mathématique brute — un signal déjà présent dans l'architecture (`SessionAnalysis`, `WeekAnalysis`).

**Implication pour le moteur** :
- Le moteur **évalue** la faisabilité de l'objectif (calcul factuel, basé sur la consistance des séances-clés plutôt que sur une simple règle de trois avec le temps restant), mais ne **décide jamais seul** de modifier l'objectif du coureur — cohérent avec le principe du §1 ("le moteur ne remplace jamais le choix de la personne") : `GoalFeasibility` produit un statut informatif, et les décisions qui en découlent (`alerter_objectif_a_risque`, `suggerer_objectif_alternatif`) restent des suggestions adressées au coureur, jamais des modifications automatiques et silencieuses de `ObjectifCourant`.
- `DelaiObjectif.fenetreCritique` (les 2-4 dernières semaines avant l'événement) doit pouvoir **inverser localement** certaines priorités habituelles : une règle de sécurité qui réduirait fortement la charge en temps normal doit, en fenêtre critique, privilégier une réduction plus fine respectant le pattern de taper documenté plutôt qu'une coupure brutale qui gâcherait la préparation.
- Le pattern de taper irrégulier (rebond de volume en pleine phase de réduction) est une règle de sécurité/adaptation à part entière (cf. §7), car c'est un signal comportemental directement mesurable et bien soutenu par la littérature.
- La confiance de `GoalFeasibility` doit rester délibérément basse tant que peu de séances-clés ont été réalisées — un objectif ne peut pas être jugé "compromis" ou "en bonne voie" sur la base d'une seule séance de fractionné.

### 5.9 Synthèse — principes retenus pour le catalogue de règles (§7)

| Sujet | Principe retenu |
|---|---|
| Méthode de calcul de charge | TRIMP de Banister quand la FC est disponible, sRPE de Foster sinon — les deux corrélées (r=0.79-0.91), validant le principe de dégradation du §4.3 |
| ACWR | Signal légitime, mais jamais un prédicteur fiable isolé ; confiance plafonnée quand c'est le seul signal disponible |
| RPE | Fiabilité pondérée par le niveau d'expérience du coureur (`profile.niveau`) |
| Surentraînement | Règle combinant FC de repos (si disponible) + ressenti + tendance de performance, jamais un seul signal isolé |
| Règle des "10% hebdomadaire" | Remplacée par un signal de pic de séance unique (>110% de la plus longue séance des 30 derniers jours) comme garde-fou de sécurité principal |
| Sommeil | Angle mort documenté ; aucune règle tant que la donnée n'existe pas |
| Plaisir / motivation | Catégorie de règles à part entière (`engagement`), disponible via le signal comportemental de régularité, enrichissable par une mini-échelle PACES-S facultative |
| Objectif / délai | Sous-module `GoalFeasibility` (§6) : objectifs à paliers A/B/C, détection du taper irrégulier, priorités localement inversées en fenêtre critique (2-4 dernières semaines) |

---

## 6. Détail des modules

### Module 1 — Calcul de l'état du coureur (`RunnerStateCalculator`)

**Responsabilité** : agréger profil + historique + Strava en un `RunnerState` unique, qui devient la seule porte d'entrée factuelle pour tout le reste du moteur.

```typescript
interface RunnerStateCalculator {
  calculer(input: {
    profile: RunnerProfile;
    history: RunnerHistory;
    activityData: ActivitySample[];
    planContext: PlanContext;
  }): RunnerState;
}
```

**Sous-calculs internes** (fonctions pures, testables isolément) :

- `calculerDataAvailability(activityData, history)` → **premier calcul exécuté, avant tous les autres**. Produit l'objet `DataAvailability` en inspectant réellement les champs présents sur les derniers échantillons, sans jamais présumer d'une source. Tous les sous-calculs suivants reçoivent ce résultat et l'utilisent pour choisir leur stratégie (nominale ou proxy dégradé).
- `calculerChargeSeance(sample, profile, dataAvailability)` → calcule la charge d'**une** séance individuelle, brique de base de tout le reste. Implémente le TRIMP de Banister si `frequenceCardiaque` est disponible, le sRPE de Foster sinon (cf. §5.1 pour les formules) :

```typescript
function calculerChargeSeance(
  sample: ActivitySample,
  profile: RunnerProfile  // fournit fcReposReference et fcMaxReference, cf. §3.1
): { valeur: number; methode: 'trimp' | 'srpe'; confiance: ScoreNormalise } {
  if (sample.fcMoyenne !== undefined && profile.fcMaxReference && profile.fcReposReference) {
    // TRIMP de Banister (cf. §5.1)
    const fcReserve = (sample.fcMoyenne - profile.fcReposReference) / (profile.fcMaxReference - profile.fcReposReference);
    const [a, b] = profile.sexe === 'femme' ? [0.86, 1.67] : [0.64, 1.92];
    // NB : pour sexe === 'autre', cf. §5.1 — moyenne des deux jeux de constantes, confiance signalée comme réduite
    const facteurPonderation = a * Math.exp(b * fcReserve);
    const valeur = sample.dureeMin * fcReserve * facteurPonderation;
    return { valeur, methode: 'trimp', confiance: 85 };
  }
  if (sample.ressentiRPE !== undefined) {
    // sRPE de Foster (cf. §5.1) — corrélé au TRIMP (r=0.79-0.91), dégradation documentée, pas arbitraire
    const valeur = sample.dureeMin * sample.ressentiRPE;
    return { valeur, methode: 'srpe', confiance: 65 };
  }
  // Dernier recours : proxy durée/allure seule, cf. §4.3 — confiance nettement réduite
  const valeur = sample.dureeMin; // approximation grossière, sans pondération d'intensité
  return { valeur, methode: 'srpe', confiance: 30 };
}
```

- `calculerCharge(activityData, fenetreJours, dataAvailability, profile)` → agrège `calculerChargeSeance` sur les séances de la fenêtre (7j pour la charge aiguë, 28j pour la chronique), en **normalisant TRIMP et sRPE sur une échelle commune** avant sommation (cf. §5.1) puis calcule le ratio ACWR = charge aiguë / charge chronique. Zone "sûre" généralement admise autour de 0.8–1.3 (cf. §5.2 pour les limites de ce seuil).
- `calculerFatigue(charge, recuperation, rpeRecent, dataAvailability)` → score composite, dont les poids relatifs des composantes s'ajustent selon ce qui est réellement disponible (cf. §4.3, `R-024`).
- `calculerFraicheur(fatigue, joursDepuisDerniereSeanceIntense)`.
- `calculerConfiance(dataAvailability, profondeurHistoriqueSemaines)` → voir formule détaillée en §4.4. Intègre à la fois le profil de complétude des données et la profondeur d'historique.
- `calculerRisque(charge.ratio, fatigue, historique.blessuresDeclarees)`.
- `calculerDisponibilite(declarationsManuelles, alertesRecentes)`.

**Point de vigilance** : `calculerConfiance` est un module à part entière car il conditionne tout le reste — un moteur qui décide avec assurance sur 2 séances de données serait dangereux. La confiance globale du `EngineDecision` final devrait être bornée par la confiance du `RunnerState` qui l'a nourri.

#### Sous-module — Calcul de l'engagement (`EngagementCalculator`)

Techniquement rattaché au Module 1 (même position dans le pipeline, même moment d'exécution), mais volontairement présenté à part car il répond à une question différente : pas "comment va le corps du coureur" mais "ce coureur est-il en train de décrocher". Voir §5.7 pour les fondements.

```typescript
interface EngagementCalculator {
  calculer(input: {
    history: RunnerHistory;
    planContext: PlanContext;
    plaisirDeclareRecent?: ScoreNormalise[]; // derniers relevés PACES-S si le coureur en a saisi
  }): EngagementState;
}
```

**Sous-calculs internes** :
- `calculerRegulariteRecente(history, planContext)` → compare les 14 derniers jours à l'habitude établie du coureur (ou, en tout début de plan, applique directement le seuil de désengagement précoce du §5.7 : < 3 séances sur 14 jours).
- `calculerTendanceEngagement(regulariteRecente, plaisirDeclareRecent)` → `'en_baisse'` seulement si le signal est confirmé sur au moins deux points de mesure consécutifs (jamais sur un seul point, pour éviter de réagir à du bruit normal — une semaine chargée au travail n'est pas un décrochage). `'signal_faible'` si l'historique est trop court pour trancher, distinct de `'stable'`.
- `calculerConfianceEngagement(profondeurHistorique, presenceDePlaisirDeclare)` → suit la même philosophie que `calculerConfiance` du `RunnerState` (§4.4) : la confiance ne doit jamais dépasser ce que les données permettent réellement d'affirmer.

**Point de vigilance** : contrairement aux autres sous-calculs du Module 1, celui-ci ne dépend d'aucune donnée liée à une source connectée (Strava, montre) — c'est le seul signal du moteur disponible à confiance comparable pour tous les profils de `DataAvailability`, puisqu'il repose sur des données d'usage de l'app elle-même, pas sur des capteurs.

#### Sous-module — Calcul de la faisabilité de l'objectif (`GoalFeasibilityCalculator`)

Troisième sous-module du Module 1, au même niveau que `RunnerStateCalculator` et `EngagementCalculator`. Répond à une troisième question distincte : pas "comment va le corps" ni "le coureur a-t-il encore envie", mais "l'objectif choisi reste-t-il atteignable compte tenu de ce qui précède, et où en est-on dans le compte à rebours". Voir §5.8 pour les fondements.

```typescript
interface GoalFeasibilityCalculator {
  calculer(input: {
    objectif: ObjectifCourant;
    sessionAnalysisHistorique: SessionAnalysis[];  // séances-clés (fractionné, tempo, sortie longue) des dernières semaines
    planContext: PlanContext;
    dateDuJour: string;
  }): GoalFeasibility;
}
```

**Sous-calculs internes** :
- `calculerDelaiObjectif(objectif.dateEvenement, dateDuJour, planContext)` → produit `DelaiObjectif`, y compris `fenetreCritique` (2-4 dernières semaines) et `phaseAttendueSelonDelai` déduite d'une périodisation standard (§5.8) — sert de référence, pas de contrainte rigide, car il n'existe pas de consensus sur une périodisation unique.
- `calculerConsistanceSeancesClefs(sessionAnalysisHistorique)` → isole spécifiquement les séances de type `fractionne`, `tempo`, `longue` (cf. `SeancePrevue.type`, §3.1) et calcule leur taux de réussite et le respect des allures cibles.
- `calculerStatutFaisabilite(consistanceSeancesClefs, delai, confiance)` → détermine `'en_bonne_voie' | 'incertain' | 'compromis' | 'donnees_insuffisantes'`. Retourne systématiquement `'donnees_insuffisantes'` tant que moins de 3 séances-clés n'ont été analysées, quelle que soit la tentation d'extrapoler plus tôt.
- `detecterTaperIrregulier(activityData, delai)` → détecte un rebond de volume pendant la fenêtre critique, alimente une règle de sécurité/adaptation dédiée en §7.

**Point de vigilance** : ce sous-module ne doit jamais transformer son évaluation en modification automatique de `ObjectifCourant`. `GoalFeasibilityCalculator` est en lecture seule sur l'objectif, jamais en écriture. Toute proposition de palier alternatif (`suggerer_objectif_alternatif`) reste une décision du module 5 adressée au coureur, jamais une action du module 1 sur les données du profil.

---

### Module 2 — Analyse de séance (`SessionAnalyzer`)

**Responsabilité** : comparer une séance prévue à sa réalisation.

```typescript
interface SessionAnalyzer {
  analyser(prevue: SeancePrevue, realisee: SeanceRealisee, profile: RunnerProfile): SessionAnalysis;
}
```

**Logique** :
1. Calcul des écarts (`EcartAnalyse`) pour allure, FC, répétitions — chacun avec une zone de tolérance paramétrable.
2. `scoreReussite` = moyenne pondérée des `dansLaZone` (allure 0.4, FC 0.25, répétitions 0.35).
3. `difficulteRessentie` déduit du RPE si présent, sinon estimé depuis l'écart FC/allure (proxy imparfait, `'inconnue'` si aucune donnée fiable).
4. `alertes` déclenchées par seuils simples (ex : FC moyenne > FC max cible + 10% → `"FC_TROP_HAUTE"` gravité `attention`).

**Note sur la FC** : une FC trop **basse** ne pénalise pas le score (`dansLaZone` vrai dès que `fc <= zoneFC.max`) — seule une FC trop haute reste un signal négatif. Une FC basse accompagne souvent une allure plus rapide tenue avec moins d'effort cardiaque que prévu (économie de course), pas un raté.

**Note sur l'allure** : reste symétrique (trop rapide et trop lent pénalisent à la même hauteur), faute de données réelles suffisantes pour calibrer une éventuelle asymétrie.

**Point de vigilance** : ce module ne décide de rien. Il constate. La décision d'agir sur une FC trop haute appartient au moteur de règles (module 5), qui peut la croiser avec la tendance générale avant de réagir.

**Périmètre** : restreint aux séances de qualité (VMA/SPEC/SEUIL/TEST) — EF/LONGUE/RECUP n'ont pas de cible d'allure resserrée dans Yoria, l'écart n'y a pas le même sens. Les modules 3 (WeekAnalyzer) et 4 (TrendAnalyzer) sont indépendants de ce module — un WeekAnalyzer qui en dépendrait perdrait la vue sur EF/LONGUE/repos.

---

### Module 3 — Analyse hebdomadaire (`WeekAnalyzer`)

**Responsabilité** : vue agrégée sur une semaine, en comparaison avec le plan prévu et la semaine précédente.

```typescript
interface WeekAnalyzer {
  analyser(semaine: number, seances: SeanceRealisee[], planSemaine: PlanContext, semainePrecedente?: WeekAnalysis): WeekAnalysis;
}
```

Calcule simplement des agrégats (volume réalisé vs prévu, séances manquées, charge totale) et positionne la semaine par rapport à la précédente (`hausse` / `stable` / `baisse`). Volontairement simple — la lecture "intelligente" sur plusieurs semaines est le rôle du module 4.

---

### Module 4 — Analyse de tendance (`TrendAnalyzer`)

**Responsabilité** : lire N semaines de `WeekAnalysis` pour détecter des patterns que le module 3 ne peut pas voir seul (une seule mauvaise semaine n'est pas un signal, trois qui se dégradent en sont un).

```typescript
interface TrendAnalyzer {
  analyser(historiqueSemaines: WeekAnalysis[], fenetreSemaines: number): TrendAnalysis;
}
```

**Logique** : détection de `SignalTendance` via des règles de détection simples et nommées (elles-mêmes testables indépendamment du moteur de décision) :

| Code signal | Condition |
|---|---|
| `3_SEMAINES_REUSSIES` | 3 semaines consécutives avec `tauxReussite` ≥ 0.9 |
| `CHARGE_CROISSANTE_RAPIDE` | charge hebdo en hausse > 15% sur 2 semaines consécutives |
| `SEANCES_MANQUEES_REPETEES` | ≥ 2 semaines sur les 3 dernières avec ≥ 2 séances manquées |
| `FATIGUE_CROISSANTE` | `fatigue` en hausse constante sur 3 points de suivi |
| `STAGNATION_VOLUME` | volume hebdo quasi-stable (± 5%) sur 4+ semaines malgré plan progressif |

`tendanceGenerale` est déduite de la combinaison de signaux (le mapping signaux → tendance est lui-même une table de règles simple, pas de la logique cachée).

---

### Module 5 — Moteur de règles (`RuleEngine`)

**Responsabilité** : seul point de décision du système. Reçoit un `EngineInput` complet, retourne un `DecisionCandidate` porté par une règle gagnante.

```typescript
interface RuleEngine {
  registre: DecisionRule[];              // catalogue de règles, chargé au démarrage
  evaluer(input: EngineInput): {
    regleGagnante: DecisionRule;
    candidat: DecisionCandidate;
    reglesEcartees: { regle: DecisionRule; raisonEcartee: string }[];
  };
}
```

**Algorithme d'évaluation** :
1. **Filtrage par disponibilité des données** : pour chaque règle du `registre`, vérifier que ses `donneesRequises` sont présentes dans `input.runnerState.dataAvailability.champsDisponibles`.
   - Si une donnée requise manque et `modeDegradation === 'bloquer'` → règle écartée, raison `"donnees_requises_manquantes"`.
   - Si une donnée requise manque et `modeDegradation === 'degrader_avec_proxy'` → règle reste éligible, mais sera exécutée en mode dégradé (voir étape 4).
2. Sur les règles restantes, filtrer sur celles dont `conditions(input)` retourne `true`.
3. Trier les règles retenues par `priorite` décroissante, puis par `categorie` à priorité égale, selon l'ordre fixe `securite` > `engagement` > `adaptation` > `progression` > `maintien` — traduction concrète des principes "sécurité avant performance" et "engagement pris au sérieux" du §1 (cf. note de priorité en §7).
4. La première règle de la liste triée est la règle gagnante. Si elle tourne en mode dégradé (données optionnelles manquantes ou proxy activé), sa confiance est plafonnée par `confianceMax`. Les autres règles retenues (mais non gagnantes) sont tracées dans `reglesEcartees` avec leur raison (`"priorite_inferieure"`, `"categorie_non_prioritaire"`, ou `"donnees_requises_manquantes"`).
5. Si aucune règle ne matche (toutes écartées par données manquantes ou conditions non remplies) → règle par défaut `R-000` (`maintenir`, confiance basse, justification `"Aucun signal significatif détecté"` ou `"Données insuffisantes pour évaluer la situation"` selon le cas).

**Format d'une règle — exemples concrets**

```typescript
const R024_FatigueElevee: DecisionRule = {
  id: 'R-024',
  libelle: 'Réduction de charge sur fatigue élevée',
  priorite: 90,
  categorie: 'securite',
  conditions: (input) =>
    input.runnerState.fatigue >= 75 &&
    input.runnerState.charge.ratio >= 1.3,
  decision: (input) => ({
    type: 'reduire_charge',
    ampleur: -10,
    cible: 'volume',
  }),
  justificationTemplate: (input) =>
    `Fatigue élevée détectée (score ${input.runnerState.fatigue}/100) ` +
    `avec un ratio de charge aiguë/chronique de ${input.runnerState.charge.ratio.toFixed(2)}.`,
};

const R010_ProgressionValidee: DecisionRule = {
  id: 'R-010',
  libelle: 'Augmentation progressive après séries réussies',
  priorite: 50,
  categorie: 'progression',
  conditions: (input) =>
    input.trendAnalysis.signauxDetectes.some(s => s.code === '3_SEMAINES_REUSSIES') &&
    input.runnerState.risque === 'faible',
  decision: () => ({
    type: 'augmenter_charge',
    ampleur: 8,
    cible: 'volume',
  }),
  justificationTemplate: () =>
    `Trois semaines consécutives réussies avec un niveau de risque faible : progression du volume recommandée.`,
};

const R031_SeancesManqueesRepetees: DecisionRule = {
  id: 'R-031',
  libelle: 'Adaptation du plan sur assiduité dégradée',
  priorite: 70,
  categorie: 'adaptation',
  conditions: (input) =>
    input.trendAnalysis.signauxDetectes.some(s => s.code === 'SEANCES_MANQUEES_REPETEES'),
  decision: () => ({
    type: 'adapter_plan',
    cible: 'plan_complet',
  }),
  justificationTemplate: (input) =>
    `Séances manquées de façon répétée sur les dernières semaines ` +
    `(assiduité actuelle : ${(input.runnerState.disponibilite === 'disponible' ? input.weekAnalysis.seancesReussies : 0)}/${input.weekAnalysis.seancesTotal}).`,
};
```

**Point de vigilance — gestion des conflits** : si `R-024` (sécurité, priorité 90) et `R-010` (progression, priorité 50) matchent toutes les deux sur le même input, `R-024` gagne automatiquement par tri de priorité. Ce comportement doit être couvert par un test dédié (voir §8).

---

### Module 6 — Décision finale (`DecisionFormatter`)

**Responsabilité** : transformer la sortie brute du module 5 en `EngineDecision` exploitable, avec traçabilité complète.

```typescript
interface DecisionFormatter {
  formatter(
    evaluation: ReturnType<RuleEngine['evaluer']>,
    input: EngineInput,
    versionMoteur: string
  ): EngineDecision;
}
```

**Logique** :
- `confiance` finale = `min(confiance de la règle si définie, runnerState.confiance)` — le moteur ne peut jamais être plus confiant que la qualité des données qui l'ont nourri.
- `justification` = résultat de `justificationTemplate(input)` de la règle gagnante — jamais de texte généré en dehors des templates définis par règle (garantit l'explicabilité et évite toute dérive de type "hallucination").
- `metadata.inputSnapshot` optionnel : utile en mode debug/audit, à désactiver en prod pour ne pas alourdir le payload.

---

## 7. Catalogue de règles — structure de référence

Les règles ne sont pas codées en dur dans le moteur : elles vivent dans un registre chargé au démarrage (fichier(s) séparé(s), ex. `rules/securite.rules.ts`, `rules/progression.rules.ts`, etc.). Cela permet d'ajouter/retirer une règle sans toucher à `RuleEngine`.

**Découpage par catégorie** (liste de référence, non exhaustive, à enrichir avec un regard coach). Les règles marquées 🔬 sont directement ajustées à la lumière du §5 — voir la justification associée à chacune. Pour le catalogue effectivement codé à date, voir l'inventaire de l'application §8.

**Sécurité** (priorité 80-100)
- 🔬 **Pic de séance unique** — si une séance prévue ou réalisée dépasse 110% de la plus longue séance des 30 derniers jours → réduire la séance ou alerter avant qu'elle n'ait lieu. C'est le signal le mieux soutenu par la littérature récente pour le risque de blessure de surcharge (§5.5), à privilégier sur toute logique de plafonnement du volume hebdomadaire global.
- Fatigue élevée + charge en hausse rapide → réduire (🔬 confiance plafonnée si l'ACWR est le seul signal disponible, cf. §5.2 — toujours croiser avec RPE ou assiduité)
- Risque critique (ACWR > 1.5) → repos complet (🔬 seuil à traiter comme indicatif, pas absolu — cf. §5.2 sur l'hétérogénéité des seuils dans la littérature)
- 🔬 **Signaux combinés de surentraînement** (cf. §5.4) — FC de repos élevée de 10-30 bpm au-dessus de la valeur habituelle du coureur **et** ressenti subjectif dégradé sur plusieurs jours **et** tendance de performance en baisse → alerter fatigue accumulée. Volontairement conçue pour ne jamais se déclencher sur un seul de ces trois signaux (aucun marqueur isolé n'est fiable, cf. §5.4).
- 🔬 **Taper irrégulier détecté** (cf. §5.8) — en `DelaiObjectif.fenetreCritique`, si un rebond de volume est détecté après une phase de réduction amorcée → `demarrer_taper` (ou le confirmer) avec justification explicite. S'appuie sur le pattern observé chez ~2/3 des coureurs récréatifs (§5.8), associé à une performance de course dégradée.
- FC anormalement élevée sur plusieurs séances consécutives → alerter blessure potentielle
- Douleur/blessure déclarée → indisponibilité, plan suspendu

**Adaptation** (priorité 60-79)
- Séances manquées répétées → adapter le plan (replanification, pas juste réduction)
- Séance systématiquement trop facile/trop dure vs RPE → recalibrer les allures cibles (🔬 pondérer la confiance de cette règle par le niveau d'expérience du coureur, cf. §5.3 — le RPE est moins fiable chez les débutants)
- Conditions externes défavorables (canicule) → adapter charge du jour
- 🔬 **Objectif principal compromis, hors fenêtre critique** (cf. §5.8) — si `goalFeasibility.statut === 'compromis'` et `delai.fenetreCritique === false` (donc encore du temps pour agir) → `alerter_objectif_a_risque`, en pointant les séances-clés concernées. Reste purement informatif : ne modifie jamais `ObjectifCourant`.
- 🔬 **Objectif principal compromis, en fenêtre critique** — même condition mais `fenetreCritique === true` → `suggerer_objectif_alternatif` (proposer explicitement le palier "C goal" si défini), car il est trop tard pour changer la trajectoire d'entraînement mais pas trop tard pour ajuster l'attente le jour de la course.

**Progression** (priorité 40-59)
- Plusieurs semaines réussies + risque faible → augmenter progressivement (🔬 ne pas plafonner mécaniquement à +10% : ce seuil n'est pas validé, cf. §5.5 — la contrainte de sécurité pertinente est la règle de pic de séance unique ci-dessus, pas un pourcentage hebdomadaire)
- Phase du plan (`specifique`, `affutage`) → ajuste les seuils de déclenchement d'autres règles
- 🔬 **Progression bloquée si engagement en baisse** (cf. §5.7) — même si toutes les conditions physiologiques de progression sont réunies, ne pas augmenter la charge si `engagementState.tendanceEngagement === 'en_baisse'`. Traduction directe du principe "engagement pris au sérieux" du §1 : la meilleure décision physiologique n'est pas la meilleure décision produit si le coureur est en train de décrocher.
- 🔬 **Progression suspendue en fenêtre critique** — `delai.fenetreCritique === true` bloque systématiquement toute règle de type `augmenter_charge`, quelle que soit la physiologie : ce n'est plus le moment de progresser, c'est le moment de consolider (cf. §5.8 sur le taper).

**Engagement** (priorité 55-70 — délibérément intercalée entre sécurité et progression, jamais après ; cf. note ci-dessous)
- 🔬 **Désengagement précoce détecté** (cf. §5.7) — moins de 3 séances complétées sur les 14 premiers jours d'un nouveau plan → `alerter_risque_decrochage`. Signal comportemental disponible dès la V1 sans aucune saisie déclarative.
- 🔬 **Plaisir déclaré en baisse** — si `engagementState.plaisirDeclare` est disponible et en baisse sur 2 relevés consécutifs → `varier_le_plan` (proposer un type de séance différent, un parcours différent, ou un objectif de courte durée plutôt qu'un ajustement de charge).
- 🔬 **Routine mais isolement** — assiduité élevée et stable, mais aucun signal social/collectif enregistré sur plusieurs semaines → `proposer_objectif_social`, en réponse directe au besoin de *relatedness* identifié par la théorie de l'autodétermination (§5.7). Cette règle nécessite qu'un mécanisme social existe déjà côté produit (défi collectif, partage, etc.) — sinon elle reste techniquement définie mais non activable.

```typescript
const R040_DesengagementPrecoce: DecisionRule = {
  id: 'R-040',
  libelle: 'Alerte de désengagement précoce',
  priorite: 65,
  categorie: 'engagement',
  donneesRequises: [],                     // repose uniquement sur l'historique de séances, toujours disponible
  modeDegradation: 'degrader_avec_proxy',  // jamais bloquant : le silence est la pire réponse possible ici
  confianceMax: 75,                         // signal comportemental fort, mais reste un proxy indirect du ressenti réel
  conditions: (input) =>
    input.planContext.semaine <= 2 &&
    input.weekAnalysis.seancesReussies < 3,
  decision: () => ({ type: 'alerter_risque_decrochage' }),
  justificationTemplate: (input) =>
    `Moins de 3 séances complétées durant les deux premières semaines du plan ` +
    `(${input.weekAnalysis.seancesReussies} réalisées) — signal de désengagement précoce.`,
};

const R051_TaperIrregulier: DecisionRule = {
  id: 'R-051',
  libelle: 'Correction de taper irrégulier',
  priorite: 85,
  categorie: 'securite',
  donneesRequises: [],                      // repose sur le volume, toujours disponible quel que soit le profil de données
  modeDegradation: 'degrader_avec_proxy',
  confianceMax: 80,
  conditions: (input) =>
    input.goalFeasibility.delai.fenetreCritique &&
    input.weekAnalysis.progressionVsPrecedente === 'hausse', // rebond détecté après entrée en fenêtre critique
  decision: () => ({ type: 'demarrer_taper', cible: 'volume', ampleur: -40 }),
  justificationTemplate: (input) =>
    `Hausse de volume détectée à ${input.goalFeasibility.delai.joursRestants} jours de l'objectif : ` +
    `un rebond en pleine phase de réduction est associé à une performance de course dégradée chez les coureurs récréatifs.`,
};
```

**Maintien** (priorité 0-39, règle par défaut incluse)
- Aucun signal significatif → maintenir le plan tel quel

**Note sur la priorité de la catégorie `engagement`** : elle est placée délibérément *au-dessus* de `progression` mais *en-dessous* de `securite` dans l'algorithme de tri du module 5. Un signal d'engagement en baisse doit pouvoir bloquer une augmentation de charge, mais ne doit jamais l'emporter sur une alerte de sécurité physique — un coureur en surcharge physiologique reste prioritairement protégé de la blessure, même si son plaisir déclaré est bon.

**Note sur l'objectif/délai comme dimension transversale** : contrairement à `engagement`, l'objectif et le délai ne forment pas une catégorie de règles à part — ils agissent comme **modulateur transversal** de toutes les catégories existantes. C'est pourquoi les règles ci-dessus apparaissent réparties dans `securite`, `adaptation` et `progression` plutôt que regroupées, tout en s'appuyant sur le même sous-module `GoalFeasibilityCalculator` (§6).

**Angles morts assumés** : aucune règle sur le sommeil, faute de donnée disponible dans les sources actuelles (cf. §5.6 et la recommandation de `DailyCheckIn` en évolutivité future, §10). L'engagement et l'objectif/délai, en revanche, sont couverts dès la V1 : le premier grâce au signal comportemental toujours disponible (§5.7), le second parce que la donnée (`ObjectifCourant.dateEvenement`) est déjà présente dans les sources.

---

## 8. Stratégie de tests

Le moteur doit être testable à 100% en automatisé, sans dépendance externe (pas de réseau, pas de DB).

### 8.1 Tests unitaires par module

- **Module 1** : chaque fonction de calcul (`calculerCharge`, `calculerFatigue`, etc.) testée avec des jeux de données fixes → sortie attendue exacte.
- **Module 2/3/4** : mêmes principes, avec des cas limites (aucune séance réalisée, une seule semaine d'historique, données Strava incomplètes).
- **Module 5** : le plus critique.
  - Test par règle isolée : construire un `EngineInput` minimal qui matche uniquement cette règle, vérifier `regleGagnante.id`.
  - Tests de conflit : construire des inputs qui font matcher 2+ règles de priorités différentes, vérifier que la bonne gagne.
  - Test de non-match : `EngineInput` neutre → règle par défaut `R-000`.
- **Module 6** : vérifier que `confiance` finale est bien plafonnée par `runnerState.confiance`, et que `justification` correspond exactement au template attendu.

### 8.2 Tests d'intégration (pipeline complet)

Rejouer des **scénarios coureur complets** de bout en bout (profil + N semaines d'historique simulé → décision finale attendue). Ces scénarios doivent être écrits *avec un œil coach* : ils constituent la meilleure garantie que le moteur se comporte comme un entraîneur humain le ferait. Exemples de scénarios à constituer en priorité :
1. Coureur débutant, 3 semaines parfaites → doit progresser.
2. Coureur avec ACWR > 1.5 → doit réduire, quelle que soit la phase du plan.
3. Coureur qui manque 3 séances sur 2 semaines → doit adapter, pas juste réduire.
4. Peu de données (< 3 semaines) → confiance basse même si un signal fort apparaît.

### 8.3 Non-régression

Chaque nouvelle règle ajoutée doit venir avec son test unitaire dédié + éventuellement un scénario d'intégration si elle peut entrer en conflit avec des règles existantes.

---

## 9. Structure de dossiers proposée

```
moteur-decision/
├── src/
│   ├── types/
│   │   ├── inputs.ts          # RunnerProfile, PlanContext, RunnerHistory, ActivitySample, DataAvailability
│   │   ├── derived.ts         # RunnerState, SessionAnalysis, WeekAnalysis, TrendAnalysis
│   │   └── engine.ts          # EngineInput, DecisionRule, EngineDecision
│   ├── modules/
│   │   ├── runnerState/
│   │   │   ├── calculerCharge.ts
│   │   │   ├── calculerFatigue.ts
│   │   │   ├── calculerConfiance.ts
│   │   │   ├── calculerRisque.ts
│   │   │   └── index.ts       # RunnerStateCalculator
│   │   ├── sessionAnalyzer/
│   │   ├── weekAnalyzer/
│   │   ├── trendAnalyzer/
│   │   └── ruleEngine/
│   │       ├── evaluer.ts
│   │       └── decisionFormatter.ts
│   ├── rules/
│   │   ├── securite.rules.ts
│   │   ├── adaptation.rules.ts
│   │   ├── progression.rules.ts
│   │   ├── maintien.rules.ts
│   │   └── registre.ts        # agrège toutes les règles, exporte le registre complet
│   └── index.ts                # point d'entrée public du module
├── tests/
│   ├── unit/
│   │   ├── modules/
│   │   └── rules/
│   ├── integration/
│   │   └── scenarios/
│   └── fixtures/
│       └── coureurs-types.ts   # jeux de données réutilisables (débutant, avancé, en surcharge...)
└── README.md
```

---

## 10. Évolutivité — points d'extension prévus

| Futur module | Comment il se branche | Ce qu'il NE fait PAS |
|---|---|---|
| Prédiction (ex: risque de blessure à J+7) | Ajoute un champ optionnel à `RunnerState` (ex: `risquePredit`), consommé par de nouvelles règles | Ne décide jamais directement |
| Machine learning (affinage des seuils) | Alimente les *paramètres* des règles existantes (ex: seuil ACWR personnalisé par coureur) via une couche de configuration, pas en réécrivant les règles | Ne remplace pas le `RuleEngine` |
| Apprentissage personnalisé | Fournit des `SignalTendance` additionnels au module 4 | N'a pas accès direct à `EngineDecision` |
| Assistant conversationnel (LLM) | Consomme `EngineDecision` en sortie pour le reformuler en langage naturel pour le coureur | Ne modifie jamais `justification` ni `decision` — il les habille, un point c'est tout |

Cette séparation garantit que même si un module ML plus tard est bruité, faux, ou down, **le moteur de règles continue de fonctionner seul** — c'est la propriété de robustesse la plus importante du système.

---

## 11. Sources principales citées (§5)

Cette liste n'est pas exhaustive de toute la littérature sur le sujet, mais couvre les sources qui fondent directement les ajustements du §5 et du §7. Elle mérite d'être enrichie et challengée par un coach ou un professionnel de santé sportive avant mise en production.

- **Méthode de calcul de charge (TRIMP/sRPE)** : Banister, E. W., & Hamilton, C. L., méthode originale du TRIMP (Training Impulse), 1975/1991, avec les constantes de pondération exponentielle dérivées de la relation FC/lactate sanguin. Foster, C. et al., méthode session-RPE, 2001. Sur la corrélation entre les deux approches : étude comparant session-RPE à plusieurs variantes de TRIMP (Banister, Edwards, Lucia, Stagno, Lac), trouvant des corrélations significatives (r=0.71 à 0.91 selon la variante).
- **ACWR** : Andrade et al., *Is the Acute:Chronic Workload Ratio (ACWR) Associated with Risk of Time-Loss Injury in Professional Team Sports?*, Sports Medicine, 2020. Revue systématique complémentaire : *The Relationship Between Acute:Chronic Workload Ratios and Injury Risk in Sports*, Open Access Journal of Sports Medicine.
- **RPE / sRPE** : Borg, *Borg's Perceived Exertion and Pain Scales*, Human Kinetics, 1998. Van der Zwaard et al., *Validity and Reliability of Facial Rating of Perceived Exertion Scales for Training Load Monitoring*, J Strength Cond Res, 2023.
- **Surentraînement (OTS)** : Meeusen R. et al., *Prevention, diagnosis and treatment of the overtraining syndrome: joint consensus statement of the ECSS and ACSM*, European Journal of Sport Science, 2013. Hooper et al., *Markers for monitoring overtraining and recovery*, Medicine & Science in Sports & Exercise, 1995.
- **Progression du volume / règle des 10%** : Systematic review, *The Association Between Running Injuries and Training Parameters*, PMC, portant sur 23 047 coureurs. Étude de cohorte Garmin-RUNSAFE Running Health Study (n=5 205, 18 mois), British Journal of Sports Medicine, sur le rôle prédictif du pic de séance unique (>110% de la plus longue sortie des 30 derniers jours).
- **Sommeil** : revue narrative *The Impact of Sleep on Athletes Performance and Injury Risk*, Quality in Sport, 2024, citant notamment le seuil de ≤7h de sommeil sur ≥14 jours associé à un risque de blessure 1.7× plus élevé. Étude de cohorte sur coureurs récréatifs (n=339, 6 mois) associant moindre qualité de sommeil à un risque de blessure liée à la course 36% plus élevé (Goldberg et al., 2025).
- **Plaisir / motivation** : Ryan, R. M., & Deci, E. L., *Self-Determination Theory* (théorie de l'autodétermination), cadre de référence largement utilisé en psychologie du sport pour l'adhérence à l'activité physique. Kendzierski, D., & DeCarlo, K. J., *Physical Activity Enjoyment Scale: Two Validation Studies*, Journal of Sport & Exercise Psychology, 1991, et sa version courte PACES-S (Chen et al., 2021 ; validation anglophone adulte, PLOS One, 2024). Sur le signal comportemental de désengagement précoce en app de fitness : études sectorielles convergentes sur la fenêtre des 14 premiers jours comme période prédictive la plus forte du taux d'abandon.
- **Objectifs et délai / taper** : Smyth, B., & Lawlor, A., *Longer Disciplined Tapers Improve Marathon Performance for Recreational Runners*, Frontiers in Sports and Active Living, 2021 (analyse de plus de 158 000 coureurs récréatifs via données Strava). Sur l'absence de consensus en périodisation : *Training Volume and Training Frequency Changes Associated with Boston Marathon Race Performance*, PMC. Sur la pratique des objectifs à paliers (A/B/C) et la consistance des séances-clés comme signal de faisabilité : sources de coaching professionnel convergentes (niveau de preuve : pratique documentée, pas d'essai contrôlé).

**Note méthodologique** : ces sources ont été identifiées par recherche web au moment de la rédaction et non par une revue systématique formelle. Pour un usage réel auprès d'utilisateurs à grande échelle, une validation par un professionnel qualifié (médecin du sport, kinésithérapeute du sport, ou coach certifié) reste recommandée avant de coder les seuils numériques en dur dans les règles.

---

## 12. Maintenabilité à long terme et garde-fous contre les adaptations brutales

### 12.1 Modifiable ne veut pas dire modifiable en confiance

La conception du moteur (registre de règles séparé de `RuleEngine`, cf. §7 et §1 principe "évolutif sans rupture") rend techniquement facile de changer un seuil, une ampleur, ou d'ajouter une règle — une modification typique touche une poignée de lignes dans un seul fichier de règles, jamais le moteur d'exécution lui-même.

Mais un moteur "en perpétuelle amélioration" a besoin de plus que de la facilité d'édition : il a besoin d'un moyen de savoir si un changement améliore ou dégrade les décisions produites, avant de le déployer sur de vrais coureurs. Deux principes à respecter à mesure que le catalogue grossit :

- **Versionnage exploité, pas juste présent** : `EngineDecision.metadata.versionMoteur` existe dans les structures (§3.4) — à chaque modification de règle, incrémenter cette version, et conserver un historique des décisions passées avec la version qui les a produites (Supabase est l'endroit naturel). Sans ça, il devient impossible de répondre à la question "cette décision bizarre vient-elle de l'ancienne ou de la nouvelle version de la règle ?" une fois plusieurs itérations passées.
- **Rejeu sur historique avant déploiement** : avant de changer un seuil ou d'ajouter une règle, la rejouer sur l'historique réel déjà accumulé plutôt que de la déployer directement et observer en production.

### 12.2 Deux causes d'adaptations brutales, deux garde-fous

**Cause 1 — cumul non borné de règles successives.** Rien dans l'architecture n'empêche par défaut deux décisions de réduction de charge de s'appliquer coup sur coup sur des jours rapprochés. Exemple : une règle de pic de séance réduit une séance de 20% un lundi, puis une règle de fatigue se déclenche le mercredi suivant et réduit encore de 15% — chaque règle est individuellement raisonnable, mais l'effet cumulé (plan réduit de plus d'un tiers en trois jours) ne l'est pas forcément, et aucune règle individuelle ne "voit" ce cumul.

**Garde-fou** : un plafond de réduction cumulée sur une fenêtre glissante (proposition : pas plus de 25% de réduction cumulée sur 14 jours glissants, chiffre à valider avec un regard coach plutôt qu'arbitraire), vérifié **avant** d'appliquer une nouvelle décision de type `reduire_charge`. Techniquement, ça prend la forme d'une vérification supplémentaire au moment de l'application d'une décision — pas une nouvelle règle du catalogue, mais un garde-fou structurel qui s'applique après que le moteur de règles a décidé, juste avant l'écriture réelle sur le plan.

**Cause 2 — aucune limite sur l'ampleur d'une décision individuelle prise isolément de son contexte.** Une règle mal calibrée pourrait en théorie produire un `ampleurPourcent` disproportionné si elle est mal écrite (ex: -80% au lieu de -8% par erreur de frappe dans une constante).

**Garde-fou** : une borne dure au niveau du moteur lui-même (pas d'une règle individuelle), qui rejette ou plafonne toute `DecisionCandidate` dont `ampleurPourcent` dépasserait un seuil absolu (proposition : jamais plus de -30% sur une seule décision, jamais de `repos_complet` sur plus d'une semaine consécutive sans validation explicite). C'est une sécurité de dernier recours — elle ne remplace pas la vérification "la règle a-t-elle raison de se déclencher", elle protège contre le cas où même une règle censée être raisonnable produirait, par bug ou mauvais calibrage, un résultat absurde.

**Lien avec le principe "rien n'est automatique sans validation explicite du coureur"** : ces deux garde-fous restent utiles même quand le coureur garde la main pour refuser une proposition, parce que la carte de proposition elle-même pourrait afficher une réduction cumulée choquante. Le principe "sécurité avant performance" (§1) s'applique autant à la protection contre les bugs du moteur qu'à la protection contre la fatigue physique du coureur.

---

## 13. Prochaines étapes suggérées

1. Valider ce document avec un regard "coach" (professionnel de santé sportive ou coach certifié) sur le catalogue de règles §7 et les fondements scientifiques §5.
2. Décider si `DailyCheckIn` (sommeil, ressenti du jour, FC de repos) entre au périmètre ou reste un chantier futur.
3. Étendre le catalogue de règles au-delà du socle actuellement codé (cf. inventaire §8) une fois les règles en place éprouvées sur un usage réel prolongé.

Les principes directeurs (§1), les contrats de données (§3), les fondements scientifiques (§5) et le catalogue complet de règles (§7) sont la référence de conception valide pour la suite — leur couverture par le code réel à un instant donné est documentée dans l'inventaire de l'application, pas ici.
