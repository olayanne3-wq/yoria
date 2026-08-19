# Inventaire de l'application "Yoria" — vue d'ensemble

> Point d'entrée de référence — à lire en premier en début de session.
> Ce fichier reste volontairement court : il donne le contexte général,
> les principes transverses et l'état des chantiers ouverts. Le détail
> technique par domaine vit dans des fichiers séparés (cf. table des
> matières ci-dessous) — ne charger que celui pertinent à la tâche en
> cours, pas tout le corpus à chaque session.
>
> **L'historique des correctifs, bugs et versions livrées vit uniquement
> dans `changelog.classic.js`** — ne pas le dupliquer ici ni ailleurs.
>
> ⚠️ **Mettre à jour le fichier détaillé concerné à chaque changement
> structurel** (nouvel écran, nouvelle clé de stockage, nouvelle
> intégration, pipeline modifié). Un simple correctif de bug va dans le
> changelog, pas dans la doc. Rester concis partout : état actuel +
> pièges connus, jamais le récit du diagnostic, jamais de date.

## Vue d'ensemble

**Yoria** — PWA + Android TWA de coaching à la course à pied, génère des
plans d'entraînement adaptatifs. Développeur solo : Laurent, objectif
personnel semi-marathon le 6 septembre 2026.

- Repo GitHub : `olayanne3-wq/yoria` (branche `main`), **public**
- Déployé sur Vercel (plan **Hobby** — plafond strict de 12 fonctions
  serverless par déploiement, cf. `architecture-generale.md` sur `lib/`
  vs `api/`), domaine `yoria.run`
- Stack : vanilla HTML/CSS/JS (modules ES), hosting statique Vercel, API
  serverless dans `/api/`
- Backend Supabase (auth + données), intégration Strava
- Éditeur : Laurent, en nom propre / micro-entreprise (SIRET pas encore
  attribué — bloquant pour l'activation des clés Stripe
  live, cf. chantier "Lancement public" plus bas)

## Table des matières — fichiers détaillés

Tous dans `docs/v2-methodologie/` :

| Fichier | Contenu |
|---|---|
| `architecture-generale.md` | Arborescence du repo, les deux interfaces (app principale / wizard), écrans de l'app principale, échange de séances (swap) |
| `persistance-donnees.md` | localStorage, Supabase (tables, RLS), profil coureur |
| `moteur-plan.md` | Moteur de génération de plan, prédicteur d'estimation 10K |
| `moteur-decision.md` | Les 5 modules du moteur de décision (état coureur, analyse séance/semaine/tendance, moteur de règles) |
| `saisie-et-integrations.md` | Saisie manuelle, RPE, statuts de séance, import FIT, intégrations externes (Strava, météo, coach, Stripe) |
| `auth-et-publication.md` | Authentification Supabase, onboarding, publication Play Store, Mode Forme, jour de course |
| `site-beta-admin.md` | Site public de candidature bêta, administration bêta, modules partagés `lib/` |
| `securite.md` | Audit et durcissement sécurité : traité / reste à faire |
| `bibliotheque-seances.md` | Méthodologie des types de séances qualité *(fichier déjà existant, inchangé)* |
| `import-fit-intervalles.md` | Détail conception/implémentation de l'import .fit *(fichier déjà existant, inchangé)* |
| `moteur-decision-architecture.md` | Conception détaillée du moteur de décision *(fichier déjà existant, inchangé)* |
| `moteur-decision-integration.md` | Plan d'intégration du moteur de décision *(fichier déjà existant, inchangé)* |
| `source-donnees-seances.md` | Saisie manuelle vs Strava : aucune hiérarchie entre sources, réglage `dataSource`, format des laps synthétiques *(complète `saisie-et-integrations.md`)* |
| `vision-coach-adaptatif.md` | Vision détaillée du coach à mémoire par coureur (résumé en fin de fichier chapeau, détail complet ici) *(complète `moteur-decision.md`)* |
| `daniels-running-formula-synthese.md` | Synthèse des principes Daniels' Running Formula pertinents pour le moteur (justification théorique de mécanismes déjà codés) |
| `jalons-narratifs.md`, `notes-pratiques.md`, `reperes-qualitatifs.md`, `coherence-semaine-test.md`, `jour-de-course.md`, `pourquoi-seance.md` | Les 6 chantiers de contenu narratif du plan (jalons de transition, conseils d'exécution, ressenti/progression, semaine test, jour de course + semaine d'approche, explication du rôle de chaque séance) *(complètent `moteur-plan.md`)* |

## Principes transverses à retenir

**Workflow de développement**
- Inventaire à jour à chaque push structurel (pas pour un simple fix, qui va dans le changelog) ; `node --check` systématique avant push ; vérifier `head -c 100`/`tail -c 100` du fichier final avant tout push (un message de statut d'outil peut rester collé en tête sans qu'aucune vérification syntaxique ne le détecte, hors balises `<script>`).
- Avant tout changement dans `plan-generator.js`/`plan-forme.js`, relancer `scripts/test-plans-varies.js`.
- Jamais d'apostrophe dans une chaîne JS entre guillemets doubles (échec silencieux du parseur). 404 sur une route API → vérifier `vercel.json` en premier.
- Sur le plan Vercel Hobby, tout fichier `.js` dans `api/` compte comme une fonction serverless distincte (plafond 12/déploiement) — toute logique partagée entre endpoints doit vivre dans `lib/`, jamais dans `api/`, même si jamais appelée en HTTP direct.
- Avant de conclure qu'un bug vient du code applicatif, consulter les vrais logs runtime Vercel (`get_runtime_errors`/`get_runtime_logs`) plutôt que d'enchaîner des hypothèses non vérifiées — la cause exacte (erreur Postgres, code d'erreur Vercel) est souvent immédiatement disponible.
- Avant de croire qu'un mécanisme existe déjà dans le code (auto-ouverture, callback), vérifier positivement sa présence plutôt que de se fier à un commentaire qui décrit une intention jamais implémentée ou retirée depuis.
- En cas de bug d'affichage résistant à plusieurs correctifs, diagnostiquer par tests directs en console (`getElementById`, `getBoundingClientRect()`, valeurs réelles des variables globales) plutôt que par relecture répétée du code — épuiser l'hypothèse "erreur dans le code qu'on vient d'écrire" avant d'accuser un mécanisme externe (cache, CDN).
- Face à un bug rapporté comme "toujours pas résolu" après un correctif technique validé, ne pas empiler des correctifs supplémentaires sur la même hypothèse non confirmée — obtenir un fait concret (donnée réelle, capture d'écran, log exact, vidéo frame par frame) avant de continuer, quitte à demander explicitement à l'utilisateur de le fournir. Un correctif qui "semble juste" en isolation peut rester sans effet si le vrai problème est ailleurs (ex. écart entre l'intention métier de l'utilisateur et le comportement techniquement correct du code, ou une hypothèse de diagnostic simplement fausse — cf. VMA en rotation légitime de phase Spécifique, confondu un temps avec le symptôme d'un vrai bug de charnière). Un bug de timing/ordre d'exécution (ex. fermeture d'une fenêtre d'état avant qu'un `setTimeout` planifié par la même source n'ait eu lieu) peut nécessiter plusieurs itérations même avec un diagnostic correct à chaque étape — se méfier d'un fix qui déplace le symptôme plutôt que de l'éliminer.
- Une fonction commune appelée par plusieurs points d'entrée (ex. `finaliserRegenerationLevier`, cf. `architecture-generale.md`) doit recevoir tout correctif transversal EN SON SEIN, jamais dans un seul appelant particulier — un correctif ajouté après coup dans UN SEUL appelant (parce que c'est celui qui a révélé le bug) laisse les autres appelants exposés au même risque, silencieusement, jusqu'au prochain signalement.
- Un mécanisme basé sur un compteur de sources asynchrones (fermeture d'état après N signaux) est fragile si l'ordre réel de résolution diffère de l'ordre supposé — préférer un filet de sécurité basé sur le temps écoulé (ex. délai fixe depuis un timestamp de départ) en complément, pas en remplacement, pour absorber les cas où le compteur seul ne suffit pas.
- Un déploiement Vercel qui reste bloqué en `QUEUED` sans jamais démarrer de build (pas de logs) n'est pas un problème de code — souvent causé par une rafale de commits/push rapprochés (quelques secondes d'écart, ex. plusieurs delete/rename manuels d'affilée) qui embouteille la file de déploiement. Un redeploy manuel depuis le dashboard Vercel une fois la rafale terminée débloque la situation ; inutile de chercher une cause applicative.
- Avant de concevoir un nouveau chantier touchant à la structure d'un plan (nouvelle séance spéciale, nouveau paramètre affectant plusieurs semaines), clarifier explicitement si le paramètre doit vivre côté génération (`generatePlan()`, régénération complète via wizard/leviers) ou côté patch a posteriori sur un plan déjà figé — les deux approches changent radicalement l'implémentation, à trancher AVANT de coder, pas après un premier essai (cf. revirement course intermédiaire, `moteur-plan.md`).
- Deux plans régénérés INDÉPENDAMMENT puis recollés à une charnière (ancien avant, nouveau après) n'ont AUCUNE garantie de s'aligner parfaitement à la jointure — frontières de phase, position dans une rotation de séances, tout ce qui dépend d'un compteur qui redémarre à zéro dans le nouveau plan (`semaineDansPhase`, `semaineGlobale`...) peut diverger de ce que l'ancien plan avait établi au même point calendaire. Un correctif qui renomme/répare seulement l'ÉTIQUETTE (ex. la phase affichée) sans régénérer le VRAI contenu sous-jacent laisse une incohérence visible (ex. contenu de type Construction affiché sous une étiquette Spécifique) — cf. `appliquerReglesPhaseApp`, `architecture-generale.md`.
- La semaine EN COURS (potentiellement déjà entamée, avec des séances réalisées) ne doit JAMAIS être régénérée par un mécanisme de modification de plan — la charnière de toute régénération doit systématiquement être `semaine actuelle + 1`, sans exception d'un point d'entrée à l'autre (cf. bug du levier Objectif sans le `+1`, hérité d'un raisonnement propre à un contexte différent — `architecture-generale.md`).
- Un mécanisme de réparation ponctuelle (correctif manuel d'un état déjà cassé) doit recalculer sa référence de vérité depuis les données les plus fondamentales possibles (ex. `computePhases()` recalculée depuis `dateDebut`/`dateCourse`, pas `plan.phases` déjà stocké) — une structure dérivée stockée peut elle-même être restée incohérente suite à un bug antérieur, la relire telle quelle comme référence de comparaison fait rater exactement le cas qu'on cherche à détecter.
- Un mécanisme de réparation ponctuelle, une fois le bug source corrigé, n'a plus vocation à rester visible dans le flux d'usage courant — le déplacer vers un espace de maintenance dédié (Réglages, groupe accordéon séparé) plutôt que de le laisser dans l'écran où le bug s'est manifesté, ou le retirer entièrement s'il n'a plus d'utilité prévisible.
- Un appel `async` avec des `await` internes déclenché tôt dans un script (avant la fin de la section synchrone de déclarations `let`/`const` de niveau module) peut lever une ReferenceError de zone morte temporelle (TDZ) même après plusieurs correctifs successifs qui remontent les variables une à une — si la fonction déclenche elle-même une chaîne d'appels large (ex. un `render()` global qui référence des dizaines de variables), le vrai correctif est de déplacer l'APPEL vers la fin du flux synchrone principal (après le premier point où tout le script est garanti initialisé), pas de continuer à chasser chaque variable individuellement (cf. `verifierMeteoSeanceDemain()`, déplacée après le premier `render()`). Pour une fonction utilitaire appelée en cascade tôt (ex. `sourceSwap()` via `recalculerAllSessions()`), un simple `try/catch` autour de la lecture de la variable concernée est un filet de sécurité valable en alternative, avec repli sûr sur une valeur neutre.
- Après un `str_replace` qui remplace un `old_str` court (ex. juste `function xxx() {`) par un bloc long, toujours revérifier que la ligne de déclaration d'origine est bien réincluse dans le `new_str` — un remplacement qui "avale" l'en-tête de fonction sans le reproduire casse silencieusement la fonction suivante en JS (pas d'erreur avant l'exécution du fichier entier). La vérification syntaxique de TOUS les blocs `<script>` (pas seulement le plus gros) avant chaque push est ce qui a intercepté ce genre d'erreur (cf. incident `ouvrirPpsModale()`, corrigé avant déploiement).
- Un modèle de données qui a déjà nécessité plusieurs correctifs successifs sur le même mécanisme est un signal qu'il faut réévaluer l'architecture elle-même plutôt que d'empiler un énième patch — un commentaire affirmant qu'un modèle "n'a jamais telle forme d'incohérence par construction" doit être vérifié par une simulation reproductible avant d'être cru, pas simplement recopié d'un précédent commentaire. Le remplacement du modèle de swap par paires (mathématiquement correct mais structurellement ambigu dès 3+ échanges superposés) par une table d'assignation directe (`swapTable`, cf. `architecture-generale.md`) en est l'exemple concret : deux correctifs successifs sur le modèle par paires, chacun validé par simulation exhaustive, n'ont pas suffi — seul un changement de modèle a éliminé le problème par construction.
- Avant de condenser ou réécrire des commentaires volumineux dans un gros fichier (`index.html`), valider par un diff automatisé strict (lignes de CODE réel identiques avant/après, commentaires exclus) que zéro ligne exécutable n'a changé — un nettoyage éditorial ne doit jamais être confondu avec un changement fonctionnel, et cette preuve permet d'écarter rapidement le nettoyage comme cause d'une régression signalée ensuite.
- Une interaction tactile (glissement, geste personnalisé) qui fonctionne sur desktop (souris) n'est pas automatiquement fonctionnelle sur mobile — HTML5 Drag & Drop n'a pas de support tactile fiable par construction ; les Pointer Events (`pointerdown`/`pointermove`/`pointerup`) sont l'API à privilégier d'emblée pour tout geste devant fonctionner identiquement à la souris et au doigt. Un geste de glissement personnalisé sur toute une carte/zone large entre en conflit avec le scroll natif de la page (`touch-action` doit être restreint à une poignée dédiée, pas la zone entière) — et sur mobile, un appui long déclenche NATIVEMENT `contextmenu` en plus du timer JS éventuel : retirer un mécanisme d'appui long nécessite de retirer aussi ce listener, pas seulement le `setTimeout`.

**Persistance et données**
- Préfixage des données de plan obligatoire (`clePourPlan()`) — une clé globale non préfixée est un risque de contamination inter-plans.
- Toute fonction qui modifie/supprime un plan doit traiter Supabase comme bloquant et Gist comme best-effort. Toute fonction de traduction entre formats (`v1-bridge.js`) doit être mise à jour à chaque nouveau champ personnalisé, sinon silencieusement perdu.
- Toute date "métier" doit être calculée en fuseau LOCAL du navigateur (`getFullYear()`/`getMonth()`/`getDate()`), jamais via `toISOString().slice(0,10)` (UTC). Exception : les calculs de plage basés sur `dateDebut` du plan restent en UTC explicite.
- Toute donnée binaire volumineuse (image, PDF converti) doit être compressée côté client avant sauvegarde — un fichier brut fait exploser le payload JSONB, qui échoue en fire-and-forget sans jamais remonter d'erreur.
- Cache client async : bien distinguer `undefined` (jamais initialisé) de `null` (valeur connue).
- Toute variable dérivée de `window.__PLAN_BRUT__` et lue à plusieurs endroits de l'app (dates, allures, noms, cibles de validation, structure de phases...) doit être RECALCULÉE à chaque `render()`, jamais figée en `const` calculée une seule fois au chargement du script — sinon elle ne reflète jamais un changement de plan appliqué en cours de session (cf. `DATE_COURSE_REFERENCE` et les 9 autres variables du même type, `architecture-generale.md`). Exception légitime : une préférence explicite de l'utilisateur stockée en `localStorage` (ex. `raceGoalTime`) ne doit PAS être recalculée automatiquement au risque d'écraser un choix manuel — seul le mécanisme qui change la donnée SOURCE correspondante (ex. le levier qui change l'objectif du plan) doit la resynchroniser explicitement, au moment précis où il agit.

**Sécurité**
- Aucun outil admin ne doit jamais lire ou utiliser les tokens Strava d'un testeur. Toute nouvelle table sensible (tokens, secrets) doit être ajoutée explicitement à la liste noire d'exclusion de `api/backup.js` (`TABLES_EXCLUES`) — la découverte y est automatique par défaut, l'oubli expose la table plutôt que de la protéger.
- RLS Supabase : toujours vérifier la condition réelle via le SQL Editor (`select policyname, cmd, qual, with_check from pg_policies where tablename = '...'`) plutôt que l'aperçu replié du dashboard, qui peut tronquer une condition longue. `qual` = USING (SELECT/UPDATE/DELETE), `with_check` = WITH CHECK (INSERT).
- Diagnostic des cascades ON DELETE (`beta-admin`, onglet Cascades) à lancer occasionnellement (avant une mise en production), pas à chaque table ajoutée.
- Ne jamais toucher `public/beta/`, `api/beta.js`, routes `/beta*` sans demande explicite.
- Toute évolution de la Content-Security-Policy doit d'abord passer par un mode non bloquant de test (Report-Only) avant de devenir bloquante — détail de la méthode dans `securite.md`.

**Génération de plan et calculs**
- Une seule variable modifiée à la fois pour la progressive overload. Niveau intermédiaire = valeur historique inchangée à chaque différenciation par niveau (zéro régression). Validation historique avant codage pour toute nouvelle métrique.
- Toute modification d'un plan existant doit exclure les séances déjà passées.
- Une contrainte de calcul ajoutée pour corriger un cas peut devenir la priorité dominante dans les cas serrés et écraser un autre besoin légitime si les deux ne sont pas équilibrés dès la conception — préférer un partage proportionnel garanti par construction (poids relatif) à une cascade de contraintes empiriques (cf. `repartirVolumeSemaine`, dans `moteur-plan.md`).
- Une fonction utilitaire générique appelée par plusieurs points d'appel doit être corrigée UNE SEULE FOIS à la source, jamais patchée individuellement à chaque site d'appel — un correctif dispersé sur chaque appelant est fragile et duplique la logique.
- Une fonction qui construit une progression semaine par semaine à partir d'un point de départ paramétrable (`semaineDepart`) doit produire une entrée pour TOUTE semaine du plan, y compris celles avant ce point de départ (comblées avec une valeur plate par défaut) — un repli implicite sur une valeur nulle/zéro en aval (`?? 0`) pour les semaines absentes peut produire des séances vides (0 minutes) si un appelant s'attend à une entrée pour chaque semaine sans le vérifier explicitement (cf. `computeVolumeProgression`/le trou avant `semaineDepart`, `moteur-plan.md`).
- Tout point qui pose/retire un statut de séance ou une saisie de performance doit être audité contre la liste complète des effets de bord attendus (cumul km, recalcul d'estimation) — un `grep` exhaustif du motif d'écriture reste plus fiable qu'une liste mentale.
- Une donnée de performance ponctuelle et rare (ex. course intermédiaire) ne doit jamais être injectée dans un pipeline pondéré conçu pour des mesures répétées (ex. moyenne SPEC/SEUIL/VMA du prédicteur) — un mélange one-shot dédié, avec ses propres garde-fous, est plus sûr qu'une 4e source dans un système calibré pour un usage différent (cf. `calculerNouvelleReferenceCourseIntermediaire`, `moteur-plan.md`).
- Une fonction de placement qui cherche une entrée existante pour une date/jour donné (`assignment[jourISO]`) doit créer cette entrée si elle est absente plutôt que de replier silencieusement vers une autre position arbitraire — un jour choisi par l'utilisateur qui ne correspond à aucun jour d'entraînement habituel doit rester respecté tel quel, jamais déplacé sans qu'il en soit informé (cf. `placerSeanceCourse`, `moteur-plan.md`).

**UI et composants**
- Toute promesse globale attendue ailleurs, et toute variable `let`/`const` lue par du code exécuté tôt, doit être déclarée de façon synchrone AVANT toute lecture possible (piège TDZ, détaillé dans `architecture-generale.md`) — vérifier chaque variable individuellement, pas seulement la première trouvée. Si un même appel `async` déclenche une TDZ sur plusieurs variables successives à chaque correctif, voir le principe dédié dans "Workflow de développement" ci-dessus (déplacer l'appel plutôt que chasser chaque variable, ou protéger la lecture par `try/catch` pour une fonction utilitaire simple).
- Un registre d'état de composant (accordéon, toggle) qui doit survivre à un `render()` complet doit être déclaré au niveau module, jamais à l'intérieur de la fonction qui construit l'écran.
- Le positionnement initial d'un élément scrollable ne doit jamais dépendre d'un délai arbitraire — vérifier une condition réelle via polling léger. Tout composant niché dans un groupe accordéon fermé doit prévoir un callback `onOuverture`.
- Avant de paralléliser des `<script src>` avec `defer`, vérifier tout script INLINE placé entre eux — un script inline s'exécute toujours immédiatement, contrairement aux scripts `src` avec `defer`.
- Le rendu PDF via `<iframe>`/`<embed>` sur un blob URL n'est pas fiable sur mobile/TWA Android — convertir en image (canvas + pdf.js) pour tout affichage in-app fiable cross-plateforme.
- Un groupe `renderGroupeAccordeonStats` qui ne contient jamais qu'un seul élément est un signe qu'il ne devrait pas être un groupe du tout — répète inutilement le même libellé/icône (titre du groupe + titre de son unique contenu) et ajoute un clic de dépliage superflu avant d'atteindre le vrai contenu. Insérer l'élément directement dans l'assemblage final, avec `marginTop` reproduisant l'espacement qu'aurait donné le groupe, pour rester visuellement cohérent (cf. `recommandationsSanteSection`, Réglages).
- Un bandeau destiné à n'être vu qu'une fois (pas un message éphémère qui expire de lui-même comme l'anniversaire) doit utiliser un flag `localStorage` GLOBAL non préfixé par plan (état de CET appareil, pas une donnée de plan à synchroniser Supabase — même famille que `yoria_bandeau_ios_ferme`), avec un bouton fermer explicite qui pose le flag et déclenche `render()`.
- Un élément dont le contenu ne devient disponible qu'après le chargement initial (ex. donnée météo asynchrone) et qui partage une rangée flex avec d'autres éléments stables (boutons) peut provoquer un décalage de mise en page visible à son apparition (wrap tardif) — deux leviers combinables selon le besoin : `flexWrap:"nowrap"` sur la rangée pour qu'elle ne bascule jamais sur 2 lignes (les enfants se compressent alors, prévoir `minWidth:"0"`/`flexShrink` adapté pour permettre au texte des boutons de wrapper en interne plutôt qu'à la rangée entière de déborder), et/ou ne construire l'élément qu'une fois toutes les sources de chargement résolues plutôt que dès sa donnée individuellement prête (évite une réapparition en plein milieu du chargement). Un badge/texte qui ne doit jamais se comprimer doit porter `flexShrink:"0"` explicitement.
- Le fondu CSS par défaut (`fadeIn`) appliqué à tout nouvel enfant inséré via `replaceChildren()` peut se réactiver sur un `render()` de fin de chargement si la fenêtre d'état qui le désactive (`_fenetreChargementInitialActive`) se ferme avant que tous les renders programmés (via `setTimeout`) n'aient eu lieu — un flash de délavage plein écran en résulte, visible même sans changement de contenu majeur. Diagnostiqué de façon fiable par extraction frame-par-frame d'une vidéo de l'écran (`ffmpeg -vf fps=N`) autour du moment signalé, pas par relecture du code seul.
- Un geste de glissement personnalisé (Pointer Events) sur une zone large (carte entière) rend le scroll vertical natif difficile si `touch-action:none` doit couvrir toute cette zone — une poignée dédiée, plus petite, isole cette contrainte et rend le reste de la zone à nouveau scrollable normalement.
- `position:sticky` ne fonctionne pas si un ANCÊTRE direct de l'élément porte `overflow:hidden`/`auto`/`scroll` (même utilisé uniquement pour arrondir des coins proprement) — reporter cet `overflow` sur un wrapper interne dédié (ex. autour du contenu déplié d'un accordéon), jamais sur le conteneur direct de l'élément sticky. `position:sticky` reste de toute façon limité à "coller pendant que SON PROPRE conteneur défile" — pour un élément qui doit rester visible EN PERMANENCE, y compris tout en bas d'une longue liste, `position:fixed` (monté dans un conteneur DOM séparé, jamais détruit par le cycle de `render()` — même pattern que la barre de navigation, cf. `architecture-generale.md`) est le bon outil, pas sticky. Toute valeur `top`/hauteur utilisée pour caler un élément fixe/sticky sous un autre élément doit être MESURÉE dynamiquement (`getBoundingClientRect().height`, exposée via une variable CSS) plutôt que devinée en pixels — une estimation manuelle se révèle presque toujours fausse en pratique et cache l'élément sous celui auquel il devait se juxtaposer plutôt que de provoquer une erreur visible.

**Installation PWA / mobile**
- Une redirection vers un lien PWA classique ouverte depuis la WebView intégrée d'une app tierce (Gmail, WhatsApp) ne peut jamais déclencher `beforeinstallprompt` — limitation universelle des WebViews, pas un bug applicatif. Pour Android, rediriger vers la fiche Play Store dans ce contexte (installation native fiable peu importe le navigateur d'origine).
- Un nouveau flux d'entrée (ex. connexion Strava avant tout plan) peut révéler un bug latent dans du code existant qui supposait silencieusement un contexte toujours présent — vérifier les suppositions implicites du code traversé, pas seulement le nouveau code.
- L'inscription à un test fermé Google Play (Play Store) n'ajoute JAMAIS automatiquement un candidat à la liste de testeurs autorisés — cette étape reste manuelle côté Play Console (ou nécessite un Google Group + API dédiée avec un compte Workspace, non disponible avec un compte développeur Gmail personnel). Un candidat Android peut recevoir l'email d'invitation et pourtant ne pas pouvoir installer l'app tant que son adresse n'a pas été ajoutée manuellement.
- La bêta Android en test fermé (Play Store) exige que l'adresse email du testeur soit associée à un compte Google — une adresse hors Gmail (ou non liée à un compte Google) ne permettra jamais l'installation, même avec une candidature acceptée. Validé côté formulaire ET côté serveur (`api/beta.js`), cf. `site-beta-admin.md`.

**Échange de séances (swap)**
- Modèle en TABLE d'assignation directe (`swapTable = {uid: uidSource}`),
  pas un dictionnaire à chaîne ni des paires — détail complet et
  historique des deux modèles précédents abandonnés dans
  `architecture-generale.md`. Toute nouvelle logique touchant aux séances
  swappées doit passer par `getEffectiveSession()`, jamais lire
  `week.sessions[i]` ou `PLAN` directement.
- Un jour PASSÉ sans aucune trace d'activité (statut/note/RPE/saisie) est
  déplaçable uniquement s'il appartient à la semaine EN COURS
  (`currentWeek()`) — bloqué pour toute semaine antérieure. Toute vraie
  trace d'activité bloque toujours, peu importe la semaine.
- Glissement (poignée dédiée, Pointer Events) disponible uniquement dans
  `renderWeekDetail` — retiré du dashboard après plusieurs tentatives
  infructueuses. Double tap (pas appui long) déclenche le menu tap
  alternatif, sur toute séance sauf RACE.

## État des chantiers ouverts

**Modifier mon plan — app principale**

- 5 leviers (Objectif/Jours/Volume/Date de course/Course intermédiaire)
  portés depuis le wizard vers un accordéon en tête de l'onglet Semaines
  (`public/index.html`), en-tête `position:fixed` en permanence, fermeture
  automatique au scroll vers le bas, ouverture centrée en haut d'écran.
  Détail technique complet dans `architecture-generale.md`.
- Plusieurs bugs de fond identifiés et corrigés en cours de route : 9
  variables dérivées du plan qui ne se recalculaient jamais après un
  levier (dates, allures, cibles) ; trou dans `computeVolumeProgression`
  produisant des séances EF/longue à 0 minutes ; `placerSeanceCourse` qui
  ignorait le vrai jour choisi pour la course finale ; charnière du levier
  Objectif qui régénérait à tort la semaine en cours ; rebascule de phase
  (Construction/Spécifique) mal réparée à la jointure de deux plans
  fusionnés ; continuité de rotation qualité à la charnière garantie par
  construction (`extraireEtatCharniereRotation`), plutôt qu'un recollage
  a posteriori de deux plans régénérés indépendamment.
- Source unique : les 5 leviers ne vivent plus que dans l'app principale.
  Le wizard (`public/v2/index.html`) ne conserve plus sa propre copie —
  un plan ouvert depuis le wizard renvoie vers l'app principale pour
  toute modification.
- Outils de réparation ponctuelle (cohérence des phases, correction
  manuelle de séance) déplacés dans Réglages > Maintenance une fois le
  bug source corrigé — restent disponibles en cas de nouvelle
  incohérence, sans encombrer l'écran principal.

**Conformité — CGU/CGV et mentions légales**

- Page `public/cgu.html` créée (même style visuel que `privacy.html`) :
  objet du service, statut d'outil d'aide (pas d'avis médical ni garantie
  de résultat), création de compte, abonnement/résiliation/remboursement
  (droit de rétractation 14 jours), suppression de compte, propriété
  intellectuelle, disponibilité, limitation de responsabilité, droit
  applicable (France).
- **SIRET et adresse encore en `[À COMPLÉTER]`** dans le document —
  auto-entreprise pas encore immatriculée. Le document précise
  explicitement qu'aucun abonnement payant ne peut être activé tant que
  ces champs ne sont pas renseignés (cohérent avec le chantier Stripe
  live ci-dessous).
- Liée depuis l'app (Réglages) via modale interne, avec Politique de
  confidentialité et Recommandations santé (mêmes tailles de police
  unifiées) — plus de `window.open` en nouvel onglet. Mêmes 3 documents
  également accessibles en pages statiques (`/cgu.html`, `/privacy.html`,
  `/sante.html`) et depuis le footer du site bêta (`public/beta/`) via
  une modale JS vanilla dédiée à ce site.
- ⚠️ Rédaction non validée juridiquement — une relecture professionnelle
  reste recommandée avant tout lancement public payant, en particulier
  sur le droit de rétractation et la limitation de responsabilité.

**Recommandations santé**

- Mention courte sur l'écran `choix-mode-contenu` du wizard (avant choix
  du type de plan).
- Modale complète (`ouvrirRecommandationsSanteModale()`, index.html) :
  avis médical avant de démarrer, signaux d'alerte à l'effort, limites de
  l'app. Accessible depuis Réglages (ligne autonome tout en bas, hors
  accordéon — cf. principe UI ci-dessus) et depuis un bandeau dashboard
  affiché une seule fois (`localStorage: yoria_bandeau_sante_ferme`).
  Même contenu dupliqué en page statique `/sante.html`, créée
  pour permettre un lien depuis le site bêta, qui n'a pas
  accès au système de modales de l'app principale.

**Sécurité — audit et durcissement**

Détail complet (traité / reste à faire) dans `securite.md`. En bref :
headers HTTP globaux (HSTS, CSP, nosniff) posés et calibrés, RLS
auditée table par table, CORS/rate limiting/signature webhook en place.
Reste : validation d'intégrité `plan_donnees.data`, 2FA sur `beta-admin`
à évaluer.

**Lancement public**
- **Immatriculation de l'auto-entreprise** (SIRET) — bloquant légal
  avant tout abonnement payant réel, indépendamment de l'état technique
  de Stripe.
- **Passer Stripe en clés live** — actuellement en mode test. Ne doit
  être fait qu'une fois le SIRET obtenu et `public/cgu.html` complétée
  (cf. `saisie-et-integrations.md`).

**Publication mobile**
- **HyperOS (Xiaomi)** — open-intent non résolu, irritant connu, pas
  bloquant pour le public visé actuellement (cf. `auth-et-publication.md`).
- **iOS App Store** — pas de publication à ce jour, installation via
  Safari uniquement. Passage par un wrapper type Capacitor nécessaire
  (guideline 4.2 Apple à anticiper), non entamé (cf.
  `auth-et-publication.md`). Mentionné comme "à l'étude pour une
  prochaine version" côté page d'inscription bêta et mail d'invitation
  iOS — communication uniquement, aucun développement
  entamé.
- **QR code Play Store** — ajouté sur la page d'inscription bêta
  (section Inscription) et dans le mail d'invitation Android
  (`lib/beta-invitation-email.js`), généré à la volée via
  `api.qrserver.com` à partir de l'URL Play Store déjà codée en dur
  (`PLAY_STORE_URL`).
- **Ajout manuel des testeurs Android au Play Store** — chaque candidat
  Android accepté doit être ajouté manuellement à la liste de testeurs
  du test fermé Play Console (aucune automatisation possible avec la
  configuration actuelle, cf. `site-beta-admin.md` et le principe dédié
  ci-dessus dans "Installation PWA / mobile").

**Intégrations montres/tracking**
- **Coros/Garmin** — piste explorée, non lancée. Garmin écarté (accès
  partenaire en pause). Coros exporte un `.fit` natif potentiellement
  compatible avec le pipeline `fit-detection.js` existant — reste à
  obtenir un vrai fichier `.fit` Coros pour vérifier la présence de
  marqueurs natifs (cf. `saisie-et-integrations.md`).
- **GPS via le téléphone** — conclu non viable en PWA pour un usage
  réel ; nécessiterait une app native au-delà du TWA actuel. L'import
  Strava reste la voie principale pour un suivi sans montre dédiée.

**Moteur de décision**
- **"Rebond post-allègement"** — accélération après plusieurs réussites
  consécutives suivant une réduction de charge. Identifié comme chantier
  futur, volontairement exclu du périmètre actuel de R-070 (cf.
  `moteur-decision.md`).
- **Vision "coach adaptatif à mémoire par coureur"** — `decision_events`
  et `decision_outcomes` créées et alimentées en écriture seule (cf.
  `persistance-donnees.md`, détail complet dans
  `vision-coach-adaptatif.md`). Exploitation en lecture conditionnée à la
  stabilité du moteur sur plusieurs mois et plusieurs utilisateurs réels.
- **Garde données suffisantes (5 séances min)** — `calculerEtatMoteurDecision()`
  force `decision: null` tant que moins de 5 séances réelles (Strava +
  manuel) existent, pour éviter au coach/à la carte de proposition de
  s'appuyer sur un `RunnerState` numériquement valide mais construit sur
  un repli `FC_REPOS_DEFAUT` sans vraie donnée (cf. `moteur-decision.md`).

**Nouvelles fonctionnalités envisagées — aucune commencée**

Proches de l'existant :
- **Badge/récap post-course** — comparer temps réel vs objectif vs
  estimation du prédicteur à la validation du jour de course.
- **Courbe de volume hebdomadaire** — graphique du volume km/semaine
  dans le temps. Distinct du graphique de progression de l'estimation
  10K déjà existant (Stats, `predHistory`, courbe + bande de tolérance +
  tooltip) : ce dernier ne couvre que l'estimation de performance, pas le
  volume d'entraînement — aucune donnée historique de volume par semaine
  n'est encore stockée/exposée pour ce graphe.
- **Partage/export** d'une séance ou du plan complet en image/texte pour
  Strava ou un ami.

Plus de travail, forte valeur perçue :
- **Notifications/rappels** — veille d'une séance qualité, ou séance non
  marquée 24h après. À vérifier ce que permet une PWA/TWA en push avant
  de s'engager.
- **Comparaison avec un ami/groupe** — leaderboard km cumulés sur la
  semaine. Touche au multi-utilisateur, portée plus large que le reste.

Plus structurant, touche le moteur de plan :
- **Plan double objectif** — gérer deux courses (ex. semi en septembre +
  10K en octobre). Le moteur ne gère qu'un objectif à la fois
  actuellement (cf. `moteur-plan.md`).

Pour l'historique des versions livrées et des correctifs, voir
`changelog.classic.js`.
