# Site bêta et administration — Yoria

> Site public de candidature bêta, administration bêta, modules
> partagés `lib/` (email d'invitation, rate limiting). Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et les principes
> transverses.

## Site beta et administration bêta

**Site public (`public/beta/`)** — navigation par onglets (4 sections :
Accueil / Pourquoi Yoria / Fonctionnalités / Inscription), affichées une
à la fois plutôt qu'un scroll continu — l'URL reflète l'onglet actif
(`#accueil`, `#difference`, `#fonctionnalites`, `#inscription`),
permettant un lien direct partageable et un bouton retour navigateur
fonctionnel entre onglets. Screenshots compressés (redimensionnés à
l'échelle d'affichage réelle, ~740px large plutôt que la résolution
native du téléphone) et un le contenant une donnée personnelle (prénom
dans un message de coach) flouté avant publication. Meta Open Graph/
Twitter Card avec image dédiée composée (1200×630, pas un simple
screenshot étiré). QR code vers la fiche Play Store affiché en
permanence dans la colonne latérale de l'onglet Inscription (utile une
fois la candidature acceptée), même URL que `PLAY_STORE_URL` (cf.
`lib/beta-invitation-email.js`, à garder synchronisée si le package
Android change. Modale légale (CGU/Confidentialité/Recommandations
santé) en surimpression depuis le footer, plutôt qu'un nouvel onglet.

**Encarts conditionnels par plateforme (fieldset "Votre téléphone")** —
affichés uniquement selon le choix radio sélectionné, jamais les deux à
la fois :
- **iPhone** : installation via Safari (pas d'App Store), instructions
  détaillées avant même l'envoi du formulaire.
- **Android** : précise que l'installation se fait via le Play Store en
  test fermé, qui exige un compte Google — recommande une adresse
  **Gmail** (`@gmail.com`). Ce n'est pas une contrainte de Yoria (le
  reste du formulaire n'a aucune restriction de domaine) mais une règle
  Google : la fiche Play Store en test fermé n'est installable que pour
  les comptes explicitement ajoutés comme testeurs, qui doivent être des
  comptes Google.

**Validation Gmail obligatoire pour Android** — si la plateforme
sélectionnée est Android et que l'email ne se termine pas en
`@gmail.com`, l'envoi est bloqué avec un message explicatif, **côté
client** (`public/beta/script.js`, avant tout appel réseau) **et côté
serveur** (`api/beta.js`, filet de sécurité si le JS est contourné —
code d'erreur dédié `GMAIL_REQUIS_ANDROID`). Les deux messages précisent
qu'il s'agit d'une règle Google (test fermé Play Store), pas d'une
contrainte Yoria. Sans cette validation, un candidat Android pouvait
recevoir l'email d'invitation et pourtant ne jamais pouvoir installer
l'app (adresse non liée à un compte Google), sans que rien ne le
prévienne en amont.

**Auto-validation des candidatures** (`api/beta.js`) — les 20 premières
candidatures avec statut `invited` (comptées tous statuts confondus,
main ou automatique) passent automatiquement en `invited` à la
soumission, avec email d'invitation envoyé immédiatement (best-effort,
un échec d'envoi ne bloque jamais l'inscription déjà enregistrée).
Au-delà du seuil, repli sur le circuit `pending` classique (validation
manuelle depuis `beta-admin`). Répartition du lien d'installation dans
l'email selon la plateforme : URL Play Store directe pour Android
(installation native fiable même depuis la WebView d'une app tierce
comme Gmail — cf. principe dans `inventaire-application.md`), URL web +
instructions Safari détaillées pour iPhone (aucun équivalent Play Store
côté Apple).

**Notification admin pour les candidatures `pending`** (`api/beta.js` +
`lib/beta-invitation-email.js`) — envoie un email à Laurent
(`BETA_INVITATION_FROM_EMAIL`, même adresse que l'envoi des invitations
candidat, envoyée depuis cette même adresse) **uniquement** pour les
candidatures qui tombent en `pending` (seuil des 20 auto-validées
dépassé) — jamais pour les auto-validées, déjà traitées automatiquement,
qui produiraient une notification sans action à faire. Contenu :
prénom, email, plateforme, niveau, sorties/semaine, distance favorite,
usage Strava, message éventuel. Best-effort strict, comme tout envoi
email de ce fichier : un échec n'affecte jamais l'enregistrement de la
candidature déjà en base, ni le code retour envoyé au candidat.

**Page de remerciement dédiée** (`public/beta/merci.html` +
`merci.js`) — remplace l'ancien message texte discret en bas du
formulaire. Contenu déterminé par deux paramètres URL transmis à la
redirection (`?statut=invited|pending&plateforme=android|iphone`), lus
côté client. Repli sûr strict : seul `statut=invited` explicite affiche
le bloc "bienvenue + instructions d'installation" — tout le reste
(paramètre absent, `pending`, valeur inattendue) reste sur le bloc "en
attente", pour ne jamais annoncer par erreur un accès qui n'est pas
réellement actif.

**Statuts simplifiés (`pending` / `invited` / `rejected`)** — les
anciens statuts `selected` et `active` ont été retirés entièrement :
`selected` faisait doublon avec `invited` sans rôle distinct dans le
code (aucun effet différent, ni email, ni action automatique), et
`active` n'avait aucun déclencheur automatique (jamais mis à jour tout
seul). `STATUSES` (`api/beta-admin.js`) rejette désormais toute tentative
de PATCH avec `status="selected"`/`"active"` (400). Les candidatures
déjà en base avec l'un de ces deux anciens statuts ont été migrées vers
`invited` par une requête SQL ponctuelle (pas de code de migration dans
l'app — action ponctuelle, pas un besoin récurrent). Côté UI
(`beta-admin`), l'onglet "Sélectionnés" et la case "Actifs" du dashboard
ont été retirés ; les boutons "Sélectionner"/"Marquer actif" de la
modale de détail candidature ont disparu (restent : "Envoyer
l'invitation", "Créer abonnement gratuit", "Refuser", "Supprimer
définitivement").

**Suppression de candidature/compte depuis `beta-admin`** — bouton
"🗑️ Supprimer définitivement" dans la modale de détail d'une candidature :
supprime la ligne `beta_testers`, puis tente silencieusement de
supprimer un compte Yoria associé à la même adresse email s'il en existe
un (cas le plus fréquent : aucun, la candidature de test ne va jamais
jusqu'à l'onboarding complet — pas traité comme une erreur). Bouton
séparé "🗑️ Supprimer ce compte" dans les résultats du module Comptes,
pour le cas d'un compte créé sans jamais avoir candidaté à la bêta
(recherche par email, indépendante de `beta_testers`). Les deux
réutilisent la même fonction de nettoyage complet (cf. `persistance-donnees.md`, extension au-
delà de `decision_events` seul).

**Ajout manuel des testeurs Android au Play Store — étape hors app,
non automatisée** — une invitation Yoria acceptée (statut `invited`,
email envoyé) ne suffit pas à permettre l'installation Android : le
candidat doit aussi être ajouté manuellement à la liste de testeurs du
test fermé, dans la Google Play Console. Aucune automatisation possible
avec la configuration actuelle (compte développeur Gmail personnel, pas
de Google Workspace) — l'API Google Play Developer n'accepte que des
Google Groups pour l'ajout par email en test fermé, ce qui nécessite un
compte Workspace pour gérer un groupe via l'Admin SDK. Alternative
existante mais écartée : basculer sur le track "Test interne" (où l'API
gère nativement les emails individuels), mais ce track ne compte PAS
pour l'exigence Google des 12 testeurs sur 14 jours en test fermé,
prérequis obligatoire pour tout accès à la production — y basculer
entièrement bloquerait la sortie publique future. Décision : rester en
test fermé, accepter l'ajout manuel comme étape du processus
d'invitation.

**Module "Maintenance" (`beta-admin`, onglet dédié, `api/beta-admin-
maintenance.js`)** — 3 outils de réparation ponctuelle sur les données
d'un plan, portés depuis l'app principale (accordéon Réglages > 🔧
Maintenance) le 20/08/2026 : ce n'était pas des réglages d'usage
courant justifiant une place accessible à tout compte — retirés de
l'app principale, réservés à un compte ciblé par email (même pattern
que le module "Comptes"). Fichier serveur séparé de `api/beta-admin.js`
(déjà volumineux) plutôt qu'ajouté dedans, pour garder chaque fichier
lisible — les deux partagent le même mécanisme d'auth par cookie,
dupliqué volontairement (peu de code commun réel).

Contrairement aux fonctions client d'origine (qui agissaient sur l'état
en mémoire du navigateur — donc uniquement sur le compte de la personne
connectée), ces versions serveur résolvent l'utilisateur par email puis
lisent/écrivent directement les tables Supabase concernées. Réutilise
le moteur de génération (`plan-generator.js`) tel quel, déjà importé
côté serveur pour `v1-bridge.js` dans `api/beta-admin.js` — module pur,
aucune dépendance DOM, donc directement importable côté Node.

Un compte peut avoir plusieurs plans (ex. plan Forme + plan course en
parallèle, cf. garde-fou anti-chevauchement) — un bouton "Lister les
plans de ce compte" (action `lister_plans`) affiche un sélecteur pour
choisir explicitement le plan ciblé par les deux outils suivants,
plutôt que de deviner (le plan le plus RÉCEMMENT CRÉÉ n'est pas
forcément celui réellement SUIVI, cause d'un bug réel rencontré à la
mise en service de ces outils).

- **Recalculer le badge km cumulés** (action `recalculer_km`) — parcourt
  TOUS les plans du compte (pas de notion de "plan actuel en mémoire"
  côté serveur), reconstruit le total à partir des séances réellement
  validées (✅/⚠️/❌). Point de vigilance corrigé en cours de route :
  les activités Strava (`lk_strava_activities`) ne sont PAS stockées
  dans `plan_donnees.data` comme les statuts/saisies manuelles — c'est
  une donnée globale au compte, dans la table `integrations` (colonne
  `strava_activities_cache`). Le premier portage cherchait cette donnée
  au mauvais endroit, produisant systématiquement un total de 0 km dès
  qu'une distance provenait de Strava plutôt que d'une saisie manuelle.
- **Vérifier la cohérence des phases** (action `reparer_phases`) —
  recalcule les vraies frontières de phase via `Engine.computePhases()`
  (jamais en se fiant à `plan.phases` stocké, potentiellement déjà
  incohérent) et régénère le contenu de toute semaine divergente, y
  compris passées. Même logique que `reparerCoherencePhasesApp` côté
  client, portée fidèlement — garde-fou plan Forme clôturé (`dateCloture`
  posée) ajouté après coup, absent du premier portage (présent côté
  client dans `mettreAJourPlanSupabase`).
- **Corriger une séance qualité** (action `changer_sous_type_seance`) —
  force le sous-type ET son contenu détaillé (répétitions, durée
  d'effort, récupération) d'UNE séance qualité précise, en **saisie
  manuelle directe** plutôt que calculée par le moteur. Réécriture
  suite à un bug réel : `Engine.genererContenuQualite()` ne permet pas
  de demander "génère le contenu pour CE sous-type précis" — elle
  détermine toujours elle-même le sous-type à partir de sa position
  dans `ROTATION_SOUS_TYPE`. La première version contournait ça en
  calculant une position artificielle dans la rotation pour forcer le
  bon sous-type, mais ce même paramètre pilote aussi le nombre de
  répétitions générées — le nombre de reps produit n'avait alors plus
  de rapport avec la vraie progression du coureur à cette semaine.
  Corriger le calcul pour qu'il soit réaliste aurait alors cassé le
  forçage du sous-type (la rotation retombe sur le sous-type "naturel",
  pas celui demandé) — les deux ne peuvent pas être corrects
  simultanément en passant par cette fonction. Solution retenue : sortir
  complètement de `genererContenuQualite()` pour cette action, l'admin
  saisit directement sous-type/répétitions/durée/récupération, la
  séance est construite manuellement avec le même format texte que le
  moteur produit normalement (compatible avec `parserContenuQualite` de
  `v1-bridge.js`) — seuls l'échauffement et le retour au calme restent
  calculés automatiquement selon la phase du plan.
- **Résolution position affichée → physique (`resoudrePositionAffichee`)**
  — les deux outils ci-dessus acceptent une position "semaine + jour"
  telle que VUE dans l'app, pas nécessairement la position PHYSIQUE
  réelle dans `plan_brut.semaines[].assignment` : une séance déplacée
  via la fonction d'échange (glisser-déposer, cf. `architecture-
  generale.md` section swap) ne réécrit jamais `assignment` lui-même,
  seulement une table séparée (`lk_swap_table`, dans `plan_donnees.data`).
  Cette fonction traduit la position communiquée vers la position
  physique réelle avant toute lecture — sans elle, une position pourtant
  visible dans l'app pouvait produire "Séance introuvable" côté serveur
  (bug réel rencontré et corrigé).
- **Diagnostic temporaire conservé** — le message d'erreur "Séance
  introuvable" a été enrichi (semaines disponibles, jours présents dans
  `assignment`, type réel trouvé) plutôt que remplacé par un message
  générique, pour qu'un futur cas similaire reste diagnosticable
  directement depuis le message affiché, sans repasser par une session
  de debug complète.

**Modules partagés (`lib/`, cf. `architecture-generale.md`)** :
- `beta-invitation-email.js` — génération HTML de l'email d'invitation
  (blocs Android/iOS conditionnels) + envoi Brevo. Génère aussi l'email
  de notification admin (candidatures `pending`, cf. ci-dessus). Un seul
  point de génération par type d'email, utilisé par `api/beta.js`
  (auto-validation + notification pending) et `api/beta-admin.js`
  (invitation manuelle) — jamais deux implémentations susceptibles de
  diverger.
- `rate-limit.js` — logique générique de comptage de tentatives par IP
  sur une table Supabase dédiée (fenêtre glissante, seuil configurables
  par appelant). Utilisé par `api/beta-admin.js` (connexion admin, table
  `tentatives_connexion_admin`, 5 tentatives/15min, réinitialisé après
  connexion réussie) et `api/beta.js` (soumission de candidature, table
  `tentatives_soumission_beta`, 5/15min, jamais réinitialisé — le but
  est de limiter le nombre de soumissions par IP, réussies ou non).
  Repli sûr systématique : toute erreur de lecture/écriture Supabase
  autorise la tentative par défaut plutôt que de bloquer un accès
  légitime.
