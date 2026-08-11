# Moteur de décision — Yoria

> Les 5 modules du moteur de décision (état coureur, analyse séance/
> semaine/tendance, moteur de règles). Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et vers
> `moteur-decision-architecture.md`/`moteur-decision-integration.md`
> pour la conception détaillée.

## Moteur de décision

5 modules, tous livrés et en production
(`engine-classic-scripts/decision-engine-*.classic.js`) :

1. **RunnerStateCalculator** — TRIMP/ACWR/fatigue/confiance/risque à
   partir des vraies données Strava (charge aiguë = 7j, chronique =
   moyenne sur fenêtres couvertes si historique <28j). Repli
   `FC_REPOS_DEFAUT=60bpm` si `fcReposReference` absent — sans ce repli,
   le calcul bascule silencieusement vers sRPE (échelle très différente).
2. **SessionAnalyzer** — score de réussite d'une séance (FC, allure,
   répétitions dans zone `okPace`). Agnostique de la source de la
   séance réalisée (Strava, saisie manuelle, import FIT — cf. `saisie-et-integrations.md`) :
   attend uniquement `seanceRealisee`/`ciblesSeance`, sans jamais
   référencer Strava directement.
3. **WeekAnalyzer** — bilan hebdomadaire (volume, séances, charge,
   récupération estimée).
4. **TrendAnalyzer** — 5 détecteurs de signaux sur plusieurs semaines
   (`analyserTendance(fenetreSemaines)`). Exclut systématiquement la
   semaine EN COURS (non terminée) de sa fenêtre glissante.
   `obtenirHistoriqueMonotonie()` (graphique Stats) garde volontairement
   la semaine en cours.
5. **RuleEngine** — règles actives : R-006 (pic de séance), R-024s
   (fatigue élevée), R-040 (désengagement), R-050 (ACWR élevé), R-060
   (tendance fatigue, échantillonnage 8j par moitiés, seuil écart ≥6),
   R-062 (fatigue persistante 3 semaines, priorité 82), R-070 (séances
   ratées consécutives, priorité 70), R-080 (déficit volume durable, 3
   semaines ≤−10%, priorité 52).

**R-070 (`reduire_charge`)** — ampleur fixe −15% (≥2 séances ratées).
Cible la prochaine séance QUALITÉ en priorité (`cibleQualitePrioritaire`),
repli EF/LONGUE si aucune marge. `obtenirSeancesPlanifieesManquees()`
filtre bien sur `["VMA","SEUIL","SPEC"]` — ne compte que les vraies
séances qualité.

**Readiness pré-séance qualité** — sélecteur 3 boutons (🪫/😐/🔋), distinct
du RPE rétrospectif. Affiché uniquement le jour même d'une séance qualité
non encore statutée. "Normal" est une vraie valeur par défaut. Modulation
post-traitement (jamais une règle du RuleEngine) : décision
`reduire_charge` existante + readiness=Fatigué → ampleur poussée au
palier suivant connu (−15→−25), jamais au-delà. Sans décision existante
et readiness=Fatigué : message d'invitation à la prudence, jamais de
réduction automatique.

`DecisionEngineApply` + carte UI : détection automatique, application sur
clic explicite uniquement. `reduire_charge` cible EF/LONGUE/RECUP en
priorité, qualité en second recours (réduction structurelle du nombre de
répétitions/blocs, jamais l'allure ni la récup). Garde-fous anti-cumul :
−30% max par décision, plafond cumulé 25%/14j glissants
(`historiqueReductionsMoteur`, sur l'ampleur réellement appliquée). Titre
distingue "Yoria te propose un ajustement" (action possible) de "Yoria a
repéré un signal à surveiller" (informatif, Ignorer seul).

**Réduction structurelle des séances qualité** — ne touche jamais
l'allure ni la récup, seul le nombre de répétitions/blocs, jamais sous le
plancher `base(niveau, sousType)`. Bloc unique répété → retire des
répétitions ; pyramide → retire des paliers depuis la fin (plancher
`debutant` fixe) ; i-30-30 → réduit `repsParSerie` en premier. Séances à
bloc continu unique traitées comme EF/LONGUE. Tables `base`/`cap`
dupliquées depuis `plan-generator.js` dans
`decision-engine-apply.classic.js` (non exportées) — risque de
divergence, à répercuter si le générateur change une valeur `base`. Ce
fichier ne recalcule jamais `repartirVolumeSemaine`.

**Ton du coach** — bienveillant sur la FORME, honnête sur le FOND quand le
moteur a réellement détecté quelque chose (`reduire_charge`,
`alerter_blessure_potentielle`, `alerter_risque_decrochage`) — jamais
l'inverse. Deux signaux supplémentaires : `adaptationsConsecutivesMax >=
3` (3 semaines d'affilée difficiles) et FC moyenne EF/LONGUE >5bpm
au-dessus de la zone attendue (jamais les séances qualité, FC trop
variable). Coach IA lit `RunnerState`/`EngineDecision`, ne recalcule
jamais un ratio séparé, peut commenter mais jamais produire une décision
différente.

