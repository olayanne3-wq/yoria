# Authentification, onboarding et publication — Yoria

> Authentification Supabase, écran d'onboarding, publication Play Store
> (TWA Android), Mode Forme, jour de course. Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et les principes
> transverses.

## Authentification Supabase

Auth email/mot de passe (pas de Google/Apple). Variables exposées via
`api/config.js`. `LkSync.precharger(userId, planId)` réhydrate
`localStorage` depuis Supabase avant que `window.__AUTH_PRET__` ne se
résolve — retourne `{ok, echecChargementProfil}`, jamais de throw.
**Point de vigilance critique** : `index.html` ne doit jamais déclencher
l'écran de bienvenue si `echecChargementProfil` est vrai — sinon un
`localStorage` non réhydraté est pris à tort pour "profil jamais
renseigné" et écrase le vrai profil Supabase.

**`monterEcranAuth()`** — vérification de session AVANT construction du
HTML : si un utilisateur valide est trouvé (hors cas retour "mot de
passe oublié", identifié via
`window.location.hash.includes('type=recovery')`, qui force toujours la
construction de l'écran), la fonction résout directement sans jamais
insérer le moindre élément de formulaire dans le DOM — évite le flash
visible du formulaire de connexion sur une session déjà valide.

**Écran d'onboarding (`monterEcranOnboarding`, `auth.js`) — 5 pages** —
collecte l'intégralité du profil coureur, réparti en 5 pages successives
navigables (swipe horizontal + boutons Précédent/Suivant, même principe
que `ECRANS_WIZARD`/`attacherSwipeEtapes` dans `v2/index.html`, porté
indépendamment ici) :
1. Toi (prénom*, nom, date de naissance*)
2. Ta forme (poids, taille, FC max/repos, sexe, 🩺 PPS — module d'import
   compact, cf. `architecture-generale.md`/ci-dessus)
3. Records personnels
4. Ton niveau*
5. **Source de données*** — Strava ou Saisie manuelle

(* = obligatoire, bloque le passage à la page suivante/la validation
finale — prénom, date de naissance, niveau et source de données).

**Page 5 (Source de données)** — choix explicite entre Strava (icône 🔗)
et Saisie manuelle (icône ✏️), obligatoire. Si Strava est choisi, un
encart d'avertissement apparaît : Strava seul ne suffit pas pour que
Yoria analyse le détail d'une séance qualité (fractionné, seuil) —
nécessité de programmer les intervalles sur la montre (mode
"entraînement structuré") avant chaque séance qualité. Le bouton final
devient "Connecter Strava →" plutôt que "Valider" dans ce cas. **Flux de
connexion** : le profil complet (prénom, records, PPS, niveau...) est
d'abord sauvegardé en `localStorage` + synchronisé vers Supabase, PUIS
seulement la redirection vers `/api/strava/auth` est déclenchée — la
redirection OAuth recharge entièrement la page, donc rien n'est perdu au
retour puisque tout est déjà persisté avant ce point. **Cas grand
débutant** : traité EN PRIORITÉ, avant toute redirection Strava directe
— redirige toujours vers l'écran dédié `/v2?onboarding=grand-debutant`,
qui a son propre bouton "Connecter Strava" avec un mécanisme de retour
d'OAuth plus robuste (`sessionStorage`, cf. ci-dessous) ; un grand débutant
ayant choisi Strava à la page 5 ne doit jamais partir en OAuth
directement, ce qui court-circuiterait cet écran dédié. `dataSource`
écrit en `localStorage` avec la clé non préfixée (`clePourPlan()` n'est
pas encore disponible à ce stade du chargement).

Records personnels saisis via le même composant roulette que Réglages
(boutons +/-, viewport réduit, positionnement initial par condition
réelle — cf. `architecture-generale.md`). Champ date ajouté par record — nécessaire pour tout
départage de cohérence entre records via `verifierCoherenceRecord()`.
`terminer()` lit les valeurs directement depuis l'API de chaque roulette
(`colApi.valeur()`) plutôt que les inputs cachés potentiellement pas
encore synchronisés par le debounce du scroll (120ms). Porté
intégralement en local dans `auth.js`, jamais importé depuis
`index.html` (contrainte d'indépendance : ce module ne doit jamais
dépendre de l'ordre de chargement d'`index.html`). Garde-fou record du
monde appliqué à la validation finale (`terminer()`), avant de résoudre
la promesse. `index.html` dérive `anneeNaissance` depuis `dateNaissance`
au retour de l'onboarding (même logique que Réglages).

## Publication Play Store (TWA Android)

- Package : `app.vercel.plan_10k_alpha.twa` (identifiant permanent)
- Domaine : `yoria.run`
- Piste "Tests fermés - Alpha" active, Laurent testeur confirmé
- Icône PWA Chrome bloquée via `beforeinstallprompt` + `preventDefault()`
- Build/signature : procédure figée dans les mémoires de session
  (keystore critique à ne jamais perdre)
- **HyperOS (Xiaomi)** : open-intent non résolu, irritant connu, pas
  bloquant pour le public visé actuellement
- **iOS** : cf. `architecture-generale.md` (support PWA) — pas de publication App Store à ce
  jour, installation via Safari uniquement. Un passage par un wrapper
  type Capacitor serait nécessaire pour l'App Store (guideline 4.2 Apple
  à anticiper : app perçue comme "juste un site web" risque le rejet
  sans ajout de valeur native), non entamé.

## Mode Forme (v2.6)

Cycle glissant sans date de course, réutilise les briques génériques de
`plan-generator.js` — n'importe jamais `computePhases`/
`ROTATION_SOUS_TYPE`/`placerSeanceTest`/`placerSeanceCourse`. Câblé de
bout en bout.

**Déclenchement du bloc suivant** — bandeau semi-automatique ("🔁 Ton
bloc de 4 semaines est terminé"), détection par date.
`genererBlocSuivant()` reconstruit `profil`/`params` depuis
`localStorage` + le plan courant (`profilOrigine`/`paramsOrigine` non
stockés sur le résultat).

**Test semi-Cooper — "je n'ai pas de référence"** — même formule que §7,
via `estimerReferenceDepuisSemiCooper()`. `generatePlanFormeAvecTest()`
génère uniquement la semaine 1 (`enAttenteTest: true`), footings libres
sans allure. Résultat capté sur la carte du jour, détection Strava
automatique (montre programmée en 3 laps manuels), repli saisie manuelle.
`completerBlocApresTest()` génère les semaines 2 à N avec les vraies
allures.

**Sélecteur de distance de référence** — 5K/10K/Semi/Marathon.

**Parcours "Reprise en douceur"** — 3ème option sur l'écran de choix de
mode, réutilise le flux marche-course existant. Niveau `'grand-debutant'`
posé uniquement en LOCAL sur ce plan (`plan.profilOrigine.niveau`),
jamais sur le profil général du compte. Écran d'introduction dédié avant
la sélection des jours. 13 paliers en 2 phases : 6 paliers d'ALTERNANCE
marche/course puis 7 de CONTINU croissant (5→30min) — structure inspirée
du "White Plan" de Daniels.

**Écran dédié grand débutant (`/v2?onboarding=grand-debutant`)** — accès
direct au wizard (jours + Strava), sans passer par le dashboard ni le
choix course/forme. Bouton "Connecter Strava" avec mécanisme de retour
d'OAuth robuste : `history.replaceState()` + `window.location.reload()`
au retour du flow Strava (contournement d'un bug de rendu viewport en
TWA/PWA Android), avec un marqueur `sessionStorage` (survit au reload,
contrairement à un paramètre d'URL une fois nettoyé) retiré seulement une
fois le plan généré. Priorité absolue sur toute autre redirection Strava
(cf. ci-dessus) : un grand débutant ne doit jamais partir en OAuth directement,
seulement via cet écran.

## Jour de course (`renderCourse`)

Écran dédié : météo, horaires, parcours, stratégie de course (cf. `moteur-plan.md`), et
résultat officiel une fois la course passée (`resultatCard`,
`DATE_COURSE_REFERENCE`).

**`resultatCard` — résultat enrichi** — au-delà du temps chrono
(`lk_race_result`, seul champ historique), le formulaire propose : ressenti
(RPE, échelle réutilisée telle quelle, cf. `saisie-et-integrations.md`), commentaire libre,
classement général (place/total) et classement catégorie (place/total).
Stockés dans `lk_race_result_details` (cf. `persistance-donnees.md`) — clé séparée,
`lk_race_result` reste inchangée pour ne pas casser les 4 usages
existants qui en dépendent (bandeau dashboard, export PDF, check
`hasRes`). Le badge "record_battu" reste déclenché uniquement par la
sauvegarde du temps chrono, indépendamment des champs enrichis.
Consultable a posteriori depuis la section "🏅 Mes courses" de Stats (cf.
`architecture-generale.md`/`persistance-donnees.md`, tous plans confondus).

