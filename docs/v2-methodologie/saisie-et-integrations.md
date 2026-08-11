# Saisie manuelle et intégrations externes — Yoria

> Saisie manuelle, RPE, statuts de séance, import FIT, intégrations
> externes (Strava, météo, coach IA, Stripe). Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et les principes
> transverses.

## Saisie manuelle, RPE et statuts de séance

**Saisie manuelle** : bouton "Annuler" (réinitialise + relance sync
Strava), champ "durée totale" pour séances de qualité, exclusion Strava
complète quand saisie manuelle existe, grille réussi/raté par intervalle
pour les séances qualité + laps synthétiques par répétition consommés
par le prédicteur (cf. `architecture-generale.md`). Accessible via l'icône ✏️ unifiée (cf. `architecture-generale.md`) —
regroupe saisie manuelle et import FIT dans un seul popover. Stepper
d'allure ±5s/±1s (cf. `architecture-generale.md`).

**RPE** : source unique `sessionRpe[uid]`, sélecteur 5 niveaux
(🙂😐😓😣🥵) mappés CR-10, visible dès qu'un statut est posé, pondération
TRIMP +12% si RPE ≥ 8. Même échelle réutilisée pour le ressenti du
résultat de course (cf. `auth-et-publication.md`).

**Statuts de séance** (`SOPTS`) : `—`/`✅`/`❌`/`⚠️`/`😴`, indexés par
`uid`. Une séance ne peut plus être supprimée du plan — seul un statut la
caractérise. Un statut est automatiquement remis à `—` si l'activité
(Strava ou FIT) qui lui était associée est supprimée manuellement (cf.
cf. ci-dessous — évite un badge orphelin faisant référence à une donnée effacée.

**`statutEffectif`** — calculé centralement dans `recalculerAllSessions()`,
disponible sur chaque objet `ALL_SESSIONS` : égal au vrai statut saisi
s'il existe, sinon `"😴"` automatiquement pour tout jour DÉJÀ PASSÉ
(jamais le jour même) sans saisie. Jamais écrit dans `statuses[uid]`
lui-même — purement un calcul d'affichage. Accès protégé par try/catch
(pas `typeof`, ne protège pas la temporal dead zone, cf. `architecture-generale.md`).

**Convention à respecter partout** : lire `statutEffectif` (pas
`statuses[uid]` brut) pour tout calcul qui doit tenir compte des séances
oubliées comme un signal de désengagement — sauf 4 catégories légitimes
qui doivent rester sur le statut brut : boutons de sélection/écriture du
statut, contexte "aujourd'hui", compteurs stricts ✅/⚠️/❌, gardes du swap.

**Échange de séances (swap)** — `getAvailableSlots()` propose tous les
jours de la semaine, bloqué dans les deux sens si statut posé, note, RPE,
saisie manuelle, ou jour passé sans saisie. Tout point qui mute
`swappedSessions` doit recalculer `ALL_SESSIONS` avant `render()` (cf.
`architecture-generale.md`/`persistance-donnees.md`).

**Choix manuel si plusieurs activités Strava le même jour** —
`matchActivitiesToPlan()` ne valide plus automatiquement dès qu'il y a
ambiguïté (`obtenirActivitesAmbigues`), laisse le coureur choisir via
pastille visuelle + menu. Choix mémorisé (`lk_choix_activite_ambigue`)
tant que le nombre de candidats ne change pas — redéclenché si une
nouvelle activité apparaît après resynchro. Sans lien avec le calcul de
charge/fatigue (`RunnerStateCalculator` lit `stravaActivities` en entier,
indépendamment du matching).

**Protection des activités importées** — la première activité sur une
date (Strava ou FIT) ne peut plus être écrasée silencieusement par une
resynchronisation ; distinct de l'ambiguïté Strava ci-dessus (gérée avant
qu'une activité soit retenue). Détail complet ci-dessous.

## Import FIT

`adapterFitVersFormatActivite()` traduit le résultat de
`fit-file-parser` (`chargerFitParser()`, import ESM dynamique jsDelivr)
vers le même format qu'une activité Strava, pour traverser le même
pipeline (`getLapsAffichage()`, `SessionAnalyzer`, prédicteur).
`vitesseFiable()` calcule toujours depuis distance/temps, jamais
`avg_speed` du fichier FIT (peut être faux sur Amazfit/Zepp).

**Détection d'intervalles sans marqueurs structurés natifs** — de
nombreuses montres (Amazfit/Zepp, Suunto confirmés) n'écrivent aucun
marqueur de segment structuré dans le fichier exporté, même pour une
séance programmée en entraînement structuré. Repli sur `fit-detection.js`
(`public/v2/engine/`) : reconstruction par reconnaissance de signal sur
le flux `record` brut (segments continus au-dessus d'un seuil de vitesse,
deux profils de paramètres selon le type de séance). Calibré sur 4
séances réelles — nombre de répétitions fiable, précision de l'allure
±1-2s sur efforts longs, ±10-15s au pire sur efforts courts (limite
structurelle acceptée). Détail complet :
`docs/v2-methodologie/import-fit-intervalles.md`.

Un flag `lapsSontDejaEffortSeul` (posé par `adapterFitVersFormatActivite()`)
court-circuite le curseur de `getLapsAffichage()` (suppose une alternance
effort/récup native, absente pour cette source) — corrigé une seule fois
dans le wrapper, pas dans chacun de ses appelants.

**Protection des activités importées — "premier arrivé, reste"** — la
première activité sur une date (Strava ou FIT) ne peut plus être écrasée
silencieusement par une resynchronisation ; seule une suppression
manuelle explicite (badge de source + bouton 🗑️ sur la carte de séance)
libère la date. `syncStrava()` merge plutôt qu'écrase,
`importerFichierFit()` bloque l'import si une activité existe déjà. Effet
de bord assumé : une activité Strava corrigée a posteriori sur Strava.com
n'est plus re-synchronisée tant que l'ancienne n'est pas supprimée.
`matchActivitiesToPlan()` étant appelée par les 3 chemins d'entrée
(synchro Strava, import FIT, choix d'activité ambiguë), un correctif
appliqué à cette fonction bénéficie automatiquement aux 3 sans
duplication.

**Pas de stockage du fichier `.fit` brut** — seul le résultat de la
détection est conservé (dans `stravaActivities`, `_source: "fit"`) ; pas
de re-parsing rétroactif possible si l'algorithme évolue.

**Point de vigilance non spécifique au FIT** : `fit-file-parser@3.0.2`
dépend de `buffer`, non polyfillé par le fichier ESM brut jsDelivr —
corrigé via import map (polyfill minimal, `TextDecoder` natif) en tête du
`<head>` d'`index.html`.

**Coros / Garmin — piste explorée, non lancée** : Garmin écarté (accès
partenaire uniquement, programme actuellement en pause, aucune
inscription possible actuellement). Coros exporte un `.fit` natif (app
mobile + Training Hub desktop), potentiellement compatible sans API ni
OAuth via le pipeline ci-dessus si les marqueurs de segment natifs sont
absents comme pour Amazfit/Zepp/Suunto. Reste à faire avant tout code :
obtenir un vrai fichier `.fit` Coros pour vérifier la présence ou non de
marqueurs natifs, calibrer `fit-detection.js` si besoin. Alternative si
l'API officielle Coros s'avère nécessaire : candidature développeur OAuth
2.0.

## Intégrations externes

**Strava** (Client ID `260339`) — OAuth via `api/strava.js`,
`v2/engine/strava.js`. Sync conditionnelle sur `dataSource === "strava"`.
Comparaison séance/laps filtrée par allure cible ±15%. Token
invalide/révoqué détecté explicitement — message + bouton "🔄 Reconnecter
Strava" (Réglages) + bandeau dashboard (cf. `architecture-generale.md`), affichés sans
auto-effacement tant que non résolu. **Synchro NON multi-device** — les
tokens (`lk_strava_token`/`lk_strava_refresh`/`lk_strava_expires`) sont
en `localStorage`, propres à chaque appareil ; se connecter sur un
appareil ne connecte pas Strava sur un autre (contrairement au profil/
plan, synchronisés via Supabase). Aucun outil admin ne doit jamais lire
ou utiliser les tokens Strava d'un testeur (principe transverse, cf. `inventaire-application.md`) — les tokens
restent volontairement locaux, jamais centralisés côté serveur au-delà
de l'échange OAuth initial. **Ne remplace plus jamais silencieusement
une activité déjà présente sur une date** (cf. ci-dessus, principe "premier
arrivé, reste"). **CORS restreint** : `Access-Control-Allow-Origin`
fixé à `https://yoria.run` (plus de wildcard `*`) sur `/refresh` et
`/activities` — évite qu'un site tiers puisse appeler ces routes depuis
le navigateur d'un utilisateur. Logs du callback OAuth : présence du
code loggée (`!!code`), jamais sa valeur, même tronquée.

**`syncStrava()`** — robuste sans plan existant : le calcul de
`planStart` (date la plus ancienne entre le début du plan actuel et 8
semaines en arrière, pour l'historique ACWR) utilise un accès sécurisé
(`PLAN?.[0]?.sessions?.[0]?.date`) avec repli sur 8 semaines seules si
aucun plan n'est disponible — nécessaire depuis que la connexion Strava
peut se faire AVANT tout plan (onboarding, cf. `auth-et-publication.md`).

**Relecture de `stravaToken`/`stravaRefresh`/`stravaExpires`/
`stravaActivities` après le préchargement Supabase** — ces 4 variables
sont lues une première fois à leur déclaration
(`let x = load("lk_...", défaut)`), puis relues explicitement
(`if (!stravaToken) { stravaToken = load(...); ... }`) après que le
préchargement Supabase a fini d'écrire le vrai token en `localStorage` —
nécessaire sur un appareil où le token n'était pas encore présent au tout
premier chargement synchrone (rechargement complet, nouvel appareil).

**Météo** — proxy Open-Meteo (`api/weather.js`), gratuit, sans clé.
`type=forecast|current|historical`. Géolocalisation : dernière activité
Strava GPS pour actuelle/passée, position navigateur pour prévision J+1.
Heure réelle de séance extraite de `start_date_local` pour la météo
passée (repli 18h si absente) — `handleHistorical` (`api/weather.js`)
accepte un paramètre `hour` optionnel, extrait via découpage de chaîne
(jamais `new Date().getHours()`, sensible au fuseau). `timezone`
transmis dynamiquement depuis
`Intl.DateTimeFormat().resolvedOptions().timeZone` (fuseau du
navigateur) — `TIMEZONE_DEFAUT="Europe/Paris"` ne sert que de repli.
`fetchWeather()`/`verifierMeteoSeanceDemain()` en rendu différé
(fire-and-forget, `render()` de fin vers `renderDiffere()`).

**Coach (messages courts)** — `api/coach.js`, proxy Claude Haiku 4.5.
`fetchCoachMsg()` accepte un paramètre `differe` : `true` uniquement pour
l'appel de démarrage (`setTimeout(() => fetchCoachMsg(true), 2000)`),
pour se regrouper avec d'autres mises à jour automatiques proches — les
autres appels gardent `differe=false` par défaut, rendu immédiat.

**Sync multi-device** — Supabase (auth email/mot de passe), seul
mécanisme. Aucune action au-delà de se connecter avec le même compte. Ne
couvre PAS Strava (cf. ci-dessus).

**Stripe (abonnements)** — Produit "Yoria Premium" (7€/mois + tarif
annuel), Checkout hébergé (jamais de formulaire carte natif dans la TWA).
Table `abonnements` (RLS lecture seule par propriétaire, écritures via
endpoints serverless `service_role`, cf. `persistance-donnees.md`). `api/stripe-checkout.js`
retrouve/crée le client par `user_id` puis `email`.
`api/stripe-webhook.js` : body brut, signature HMAC-SHA256 vérifiée en
**temps constant** (comparaison XOR octet par octet, jamais `===` direct
— évite une fuite d'information par mesure de timing). Routes déclarées
explicitement dans `vercel.json`. Statut lu via
`window.__abonnementStatutCache__` (une fois par session). Abonnements
gratuits (beta testeurs) : coupon Stripe 100% répétitif via `beta-admin`,
liaison automatique au `user_id` si même email que la candidature. **Clés
live** : actuellement en mode test — switch à faire quand le produit sera
prêt pour un lancement public.

**Signalements utilisateurs** — bouton 💬, sélecteur de type
(Bug/Donnée/Suggestion/Autre) + description libre. Double écriture :
Sentry (`captureMessage`, best-effort, contexte technique brut) + table
Supabase `signalements` (source de vérité pour le triage humain, RLS
insert seul côté client). Administration dans `beta-admin` (onglet
Signalements, filtrable, changement de statut).

**Module "Comptes"** (`beta-admin`) — recherche un utilisateur par email
via l'API Admin Supabase, affiche ses plans en lecture seule (contenu +
statuts/RPE/notes réels), réimporte DIRECTEMENT
`traduirePlanVersFormatV1`/`construireAllSessions` depuis
`v2/engine/v1-bridge.js` (jamais de réimplémentation serveur séparée).
Section "Décisions du moteur" : 50 dernières lignes de `decision_events`.
Bouton "🗑️ Supprimer ce compte définitivement" (cf. `site-beta-admin.md`), avec
confirmation explicite. **Principe strict** : ce module ne doit JAMAIS
lire ni utiliser les tokens Strava d'un testeur — uniquement des données
déjà stockées côté Yoria.

**Module "Sauvegarde"** (`beta-admin`, cf. `persistance-donnees.md`) — export global, export
ciblé utilisateur (réutilise la recherche par email du module Comptes),
réinjection depuis un fichier JSON. Même règle stricte : jamais de
lecture des tokens Strava d'un testeur.

**Module "Cascades"** (`beta-admin`, cf. `persistance-donnees.md`) — diagnostic proactif des
tables sans `ON DELETE CASCADE` vers `auth.users`, avec SQL de correction
généré automatiquement. Lecture seule, aucune modification du schéma
déclenchée depuis l'interface.

