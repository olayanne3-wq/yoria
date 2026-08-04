// help-content.js
// ----------------------------------------------------------------------------
// Contenu de l'aide (renderHelp(), public/index.html) — extrait le 30/07/2026
// à la demande de Laurent : index.html est un gros fichier (~600K), coûteux
// à re-fetch/patcher pour Claude à chaque simple ajout de texte d'aide. Ce
// module ne contient QUE des données (aucun DOM, aucune dépendance) —
// index.html reste le seul endroit qui sait comment les AFFICHER
// (accordéon, recherche, cf. renderHelp()), mais n'a plus besoin d'être
// touché pour éditer/ajouter du contenu.
//
// Chaque section a un id stable (utilisé pour l'ancre du sommaire et l'état
// replié/déplié) et un tableau d'items { title, text }. Le texte supporte
// des apostrophes échappées classiques (\') — pas de HTML, converti en
// noeud texte brut par l'appelant (jamais de innerHTML sur du contenu
// utilisateur ou de tiers, ce contenu est le nôtre mais autant garder la
// même discipline que le reste de l'app).
// ----------------------------------------------------------------------------

export const introText =
  "Chaque jour, ton dashboard affiche la séance prévue. Une fois faite, tape sur le statut correspondant (✅ réussie, ⚠️ adaptée, ❌ ratée) pour l'enregistrer — c'est ce qui permet à Yoria d'ajuster la suite.";

export const HELP_SECTIONS = [
  {
    id: "tutos",
    icon: "🛠️",
    title: "Tutos par action",
    items: [
      { id: "carte-aujourdhui", title: "Comprendre la carte \"Aujourd'hui\"",
        text: "C'est la carte principale du dashboard : elle affiche la séance prévue pour le jour même, avec ses allures et sa FC cibles. Le crayon ✏️ permet de saisir manuellement ou d'importer un .fit. Une fois validée, un bloc Réalisé remplace les cibles avec le résumé chiffré.",
        blocks: [
          { type: "p", text: "Voilà à quoi ressemble ta carte du jour avant d'avoir couru — c'est la première chose que tu vois en ouvrant l'app :" },
          { type: "img", src: "/help-assets/carte-aujourdhui.png", alt: "Carte Aujourd'hui avant validation", caption: "Séance EF du jour, non encore validée" },
          { type: "p", text: "En haut à gauche, le badge \"EF\" te dit tout de suite le type de séance, et le titre juste à côté résume l'essentiel en un coup d'œil : 34 min, allure 6:10/km, 5,5 km. Le crayon ✏️ tout à droite, c'est ton outil pour saisir ou importer la séance — j'y reviens juste après. La météo s'affiche automatiquement à côté, et sur cette capture le petit 🔥 te prévient qu'il fait 30°C : ton allure EF a été ajustée en conséquence." },
          { type: "p", text: "Le message en bleu (\"Début de la phase spécifique...\") n'apparaît que ponctuellement, quand il y a quelque chose d'utile à savoir sur où tu en es dans ton plan. En dessous, le bloc FC cible te donne la fourchette à viser — ici 118-136 bpm, soit 65-75% de ta FC max." },
          { type: "p", text: "Les cinq boutons — tiret, ✅, ❌, ⚠️, 😴 — c'est là que tu dis comment ça s'est passé une fois la séance faite : réussie, ratée, adaptée, ou carrément sautée. Et tout en bas, le message du coach commente ta forme du moment ; le petit 🔄 à côté te permet d'en demander un autre s'il ne te parle pas." },
          { type: "h", text: "Le crayon ✏️ : saisir ou importer" },
          { type: "p", text: "Un tap dessus ouvre un petit panneau. Si tu es en mode \"montre/fichier\" et que rien n'est encore enregistré pour ce jour, tu verras d'abord un bouton pour importer directement le .fit de ta séance. Sinon, tu peux tout saisir à la main : l'allure (par petits pas de 5 sec/km), la durée réelle si la séance avait des intervalles, et la FC moyenne si tu l'as sous la main — avec la cible du plan toujours affichée à côté pour comparer. Enregistrer valide ta saisie, qui prend le pas sur une éventuelle donnée Strava du même jour ; Annuler remet tout à zéro." },
          { type: "h", text: "Et une fois la séance validée ?" },
          { type: "p", text: "Le crayon reste là pour corriger si besoin, mais l'icône montre ⌚ s'efface. À la place des cibles, un bloc \"Réalisé\" prend le relais avec ce que tu as vraiment fait — distance, durée, allure, FC — et une petite pastille qui indique la source (🟠 Strava ou 📁 FIT). S'il y avait des intervalles, une flèche te permet de dérouler le détail rep par rep. Et si l'import ne te convient pas, tu peux toujours le supprimer avec 🗑️ et recommencer." },
        ]
      },
      { id: "creer-plan", title: "Créer un plan",
        text: "Depuis le configurateur, choisis ton objectif (Objectif course, Mode forme ou Reprise en douceur). Le plan Objectif course se construit en 8 étapes (distance, point de départ, objectif, dates, contraintes, jours disponibles, récapitulatif). Le Mode forme tient en 4 étapes.",
        blocks: [
          { type: "p", text: "Depuis le dashboard, le bouton \"🏁 Configurer un plan\" t'amène au configurateur. Trois options s'offrent à toi : 🏁 Objectif course si tu prépares une date précise (5K, 10K, semi, marathon), 💓 Mode forme si tu veux simplement entretenir ta forme sans échéance, ou 🌱 Reprise en douceur si tu repars après une pause ou une blessure — ce dernier fonctionne indépendamment de ton niveau habituel." },
          { type: "h", text: "Pour un objectif course" },
          { type: "p", text: "Le configurateur te guide en 8 étapes : la distance visée, ton chrono actuel (ou un temps équivalent sur une autre distance si tu n'as pas couru celle-là récemment), le chrono que tu vises, puis les dates — début du plan et jour de la course, avec la possibilité d'ajouter le nom, le lieu et le lien de l'épreuve. Vient ensuite une étape sur tes éventuelles contraintes (blessure en cours, douleur chronique, reprise après une longue pause), qui permet d'adapter la prudence du plan dès le départ. Tu précises enfin tes jours disponibles dans la semaine, puis un récapitulatif complet s'affiche avant de générer le plan." },
          { type: "p", text: "Si tu n'as pas de référence chronométrée récente, un test semi-Cooper (6 minutes à allure maximale soutenable) peut t'être proposé pour estimer ton niveau avant de continuer." },
          { type: "h", text: "Pour le mode forme" },
          { type: "p", text: "Le parcours est plus court : ton niveau, le volume hebdomadaire souhaité, tes jours disponibles, et l'accent que tu veux mettre (le type d'effort à privilégier). Ce plan se renouvelle ensuite par blocs de 4 semaines." },
          { type: "p", text: "Une fois ton plan généré, tu peux revenir au configurateur à tout moment pour consulter tes plans sauvegardés ou en créer un nouveau." },
        ]
      },
      { id: "import-fit", title: "Importer un fichier .fit",
        text: "Depuis la carte Aujourd'hui, ouvre le bouton ✏️ puis choisis ton fichier .fit exporté de ta montre. Allure, distance et FC sont toujours bien récupérées ; le détail effort/récupération d'une séance qualité dépend du modèle de montre.",
        blocks: [
          { type: "p", text: "Tout se passe depuis la carte \"Aujourd'hui\" du dashboard : ouvre le crayon ✏️ de la séance du jour. Si ta source de données est réglée sur \"montre/fichier\" et qu'aucune activité n'est encore enregistrée pour cette date, un bouton \"📁 Importer le fichier .fit de cette séance\" apparaît en haut du panneau — il ne reste plus qu'à exporter ce fichier depuis ta montre ou son application (Garmin Connect, Coros, Suunto app...) puis à le choisir." },
          { type: "p", text: "Petite précision si tu es sur Apple Watch : Apple Fitness natif ne génère pas de .fit, il faut passer par une app tierce comme Watchletic." },
          { type: "p", text: "Côté fiabilité, l'allure, la distance et la FC remontent toujours correctement, ce qui suffit largement pour une sortie EF ou une longue. C'est sur les séances qualité, avec des intervalles, que ça se complique un peu : certaines montres — Zepp/Amazfit en particulier — n'enregistrent pas la structure effort/récupération dans le fichier exporté, même quand la séance a été suivie à la lettre. Si le découpage te semble faux après import, ce n'est donc pas forcément un bug de notre côté : ça vaut le coup de vérifier la séance à la main si un doute persiste." },
          { type: "p", text: "Une fois l'activité importée, elle est protégée : une synchronisation ultérieure ne viendra pas l'écraser sans que tu t'en rendes compte. Si tu veux la remplacer, il faut d'abord la supprimer via le 🗑️ du bloc \"Réalisé\"." },
        ]
      },
      { id: "test-cooper", title: "Faire le test semi-Cooper (pas de référence chronométrée)",
        text: "Si tu n'as pas de chrono récent, le configurateur te propose de faire un test de 6 minutes en semaine 1 pour calibrer tes allures. Cours 6 minutes à l'allure maximale que tu peux tenir, puis indique la distance parcourue — ou laisse Yoria la détecter depuis Strava.",
        blocks: [
          { type: "p", text: "Si tu n'as pas de temps récent sur une distance officielle, pas de panique : au moment de renseigner ton point de départ dans le configurateur, un lien \"Je n'ai pas de référence\" te permet de sauter cette étape. Tes allures ne seront pas encore fixées, mais un test de 6 minutes te sera proposé dès le premier jour disponible de ta première semaine — c'est lui qui va servir de base à tout le reste." },
          { type: "p", text: "Le jour venu, la carte \"Aujourd'hui\" affiche ce test à la place d'une séance classique. Le principe est simple : cours 6 minutes à l'allure la plus rapide que tu peux tenir sur cette durée — un effort proche du maximum, pas un footing. Si tu as programmé ta montre avec 3 laps manuels (échauffement / effort / retour au calme), Yoria détecte automatiquement la distance parcourue pendant le lap d'effort et te propose juste de confirmer. Sinon, tu la saisis toi-même — la distance en mètres, quelque part entre 200 et 3000m en général." },
          { type: "p", text: "À partir de cette distance, Yoria calcule tes toutes premières allures d'entraînement. Rien de définitif : elles se resserreront ensuite au fil de tes séances, comme pour n'importe quel plan." },
        ]
      },
      { id: "source-donnees", title: "Choisir sa source de données",
        text: "Dans Réglages, choisis comment tes séances sont enregistrées : Strava (synchro auto), Import FIT (fichier de ta montre à importer un par un), ou Saisie manuelle. Ce choix détermine juste ce qui est proposé en priorité sur la carte du jour — tu peux toujours corriger à la main quelle que soit l'option retenue.",
        blocks: [
          { type: "p", text: "Dans Réglages, la section \"Source de données\" te permet de choisir comment tu comptes enregistrer tes séances au quotidien. Ce n'est pas un mode exclusif et définitif : c'est surtout une préférence qui détermine ce qui t'est proposé en premier sur la carte \"Aujourd'hui\" — tu gardes toujours la main pour corriger manuellement, quelle que soit l'option choisie." },
          { type: "p", text: "Strava est la plus simple si tu es déjà connecté : tes activités remontent automatiquement, avec allures et FC détaillées. L'Import FIT convient à toutes les autres montres (Garmin, Coros, Suunto...) — il faut juste exporter puis importer le fichier .fit de chaque séance, une par une, depuis la carte du jour. Et la Saisie manuelle te laisse tout entrer toi-même après l'effort, si tu préfères garder le contrôle total ou si tu n'as pas de montre GPS." },
          { type: "p", text: "Bonne nouvelle si tu changes d'appareil en cours de route : tes données sont liées à ton compte, pas à ton téléphone. Connecte-toi avec le même compte ailleurs, et tout est toujours là." },
        ]
      },
      { id: "ajustement", title: "Répondre à une proposition d'ajustement",
        text: "Quand Yoria détecte fatigue, charge élevée ou séances ratées, une carte apparaît sur le dashboard : \"Yoria te propose un ajustement\" (action concrète, avec un bouton Appliquer) ou \"Yoria a repéré un signal à surveiller\" (juste une alerte, sans action). Rien n'est jamais modifié sans ton accord.",
        blocks: [
          { type: "p", text: "Yoria garde un œil sur ta fatigue, ta charge d'entraînement et ta régularité. Quand quelque chose mérite ton attention, une carte apparaît en haut du dashboard — et son titre te dit tout de suite à quoi t'attendre." },
          { type: "p", text: "\"Yoria te propose un ajustement\" veut dire qu'une action concrète est prête à être appliquée, avec un bouton Appliquer et un bouton Ignorer. Le plus souvent, ça touche une séance facile — EF ou sortie longue. Si tu as raté plusieurs séances qualité d'affilée, Yoria peut aussi alléger directement la prochaine, mais toujours en réduisant le nombre de répétitions ou de blocs — jamais l'allure, jamais la récupération entre les efforts." },
          { type: "p", text: "\"Yoria a repéré un signal à surveiller\" est plus léger : c'est une simple alerte, sans bouton Appliquer, juste pour te tenir informé de quelque chose à garder en tête." },
          { type: "p", text: "Dans les deux cas, rien ne change dans ton plan sans que tu appuies sur Appliquer. Et si tu préfères ignorer la proposition, elle disparaît simplement — tu peux continuer ton plan comme prévu." },
        ]
      },
      { id: "programmer-montre", title: "Programmer une séance structurée sur ta montre",
        text: "Pour une séance avec intervalles, une icône ⌚ apparaît sur la carte Aujourd'hui : elle détaille échauffement, répétitions (durée/allure/récup) et retour au calme, à recopier dans l'entraînement libre ou fractionné de ta montre avant de partir courir.",
        blocks: [
          { type: "p", text: "Dès qu'une séance du jour comporte des intervalles (VMA, seuil en cruise, etc.), une petite icône ⌚ apparaît à côté du titre sur la carte \"Aujourd'hui\". Un tap dessus ouvre un encart qui détaille précisément la structure à reproduire : la durée et l'allure de l'échauffement, chaque répétition avec sa durée (ou distance) et son allure, le temps de récupération entre elles, et enfin le retour au calme." },
          { type: "p", text: "L'idée est de recopier cette structure dans le mode entraînement fractionné (ou \"intervalles\") de ta montre avant de partir courir, plutôt que de improviser en cours de route. La plupart des montres GPS (Garmin, Coros, Polar...) permettent de créer ce type de séance structurée directement depuis l'app du fabricant." },
          { type: "p", text: "Ce même détail est aussi accessible depuis l'écran Semaines, sur la fiche de la séance concernée, via le bouton \"📱 À programmer sur ta montre\" — pratique si tu préfères t'organiser la veille plutôt que le matin même." },
          { type: "p", text: "Petit rappel utile : c'est justement cette structure programmée sur la montre (avec de vrais laps manuels pour échauffement / effort / récupération) qui permet à Yoria de bien découper ta séance après coup, que ce soit via Strava ou un import .fit." },
        ]
      },
      { id: "readiness-rpe", title: "Dire comment tu te sens (readiness et RPE)",
        text: "Avant une séance qualité, indique ton état du jour (🪫🔗😐🔋). Après avoir validé une séance, note ton ressenti (🙂 à 🥵). Les deux affinent la façon dont Yoria ajuste ton plan, sans jamais rien modifier automatiquement sans ton accord.",
        blocks: [
          { type: "p", text: "Deux moments différents, deux questions différentes — l'une avant l'effort, l'autre après." },
          { type: "h", text: "Avant : comment tu te sens" },
          { type: "p", text: "Le jour d'une séance qualité (VMA, seuil, allure spécifique), un encart \"Comment te sens-tu avant la séance d'aujourd'hui ?\" apparaît sur la carte, avec trois choix : 🪫 Fatigué, 😐 Normal, 🔋 En forme. \"Normal\" est déjà sélectionné par défaut si tu ne touches à rien. Si tu indiques \"Fatigué\" alors qu'un allègement est déjà en cours sur ta séance, il peut être renforcé un cran de plus. S'il n'y a pas d'allègement en cours, tu reçois simplement une invitation à la prudence — rien n'est modifié tout seul dans le plan." },
          { type: "h", text: "Après : ton ressenti (RPE)" },
          { type: "p", text: "Une fois que tu as marqué une séance ✅, ⚠️ ou ❌, un second sélecteur apparaît pour noter comment tu l'as vécue, sur une échelle à 5 niveaux : 🙂 Facile, 😐 Modéré, 😓 Difficile, 😣 Très difficile, 🥵 Maximal. Ce ressenti complète ce que ta montre mesure objectivement (allure, FC) par ce que ton corps a vraiment ressenti pendant l'effort — deux séances à la même allure peuvent être vécues très différemment selon la fatigue accumulée, et Yoria en tient compte." },
        ]
      },
      { id: "echanger-seance", title: "Échanger deux séances",
        text: "Depuis l'écran Semaines, un appui long (~0,6 sec) sur une séance ouvre un menu avec l'option \"Déplacer cette séance\" — qui propose en réalité un échange avec un autre jour de la semaine, jamais un vrai déplacement vers du vide.",
        blocks: [
          { type: "p", text: "Sur l'écran Semaines, un appui un peu long sur une carte de séance (environ une demi-seconde) ouvre un menu en bas de l'écran. Si la séance n'a pas encore été faite ni notée d'une façon ou d'une autre, tu y trouves \"Déplacer cette séance\"." },
          { type: "p", text: "En réalité, il s'agit toujours d'un échange : Yoria te propose la liste des autres jours de la semaine (repos ou séances actives), et en choisir un permet aux deux contenus de permuter — ta séance prend la place du jour choisi, et inversement. Rien ne disparaît jamais dans le vide : le plan garde toujours le même nombre de séances." },
          { type: "p", text: "Si tu changes d'avis, ouvre à nouveau le menu sur l'une des deux séances échangées : l'option devient \"Annuler le déplacement\", et tout revient à sa place d'origine." },
          { type: "p", text: "Une séance déjà validée, notée, ou dont le jour est passé sans saisie ne peut plus être échangée — logique, puisqu'un effort réel y est déjà associé." },
        ]
      },
      { id: "modifier-plan", title: "Modifier son plan (objectif, jours, volume, date)",
        text: "Sur l'écran de résumé de ton plan, la section \"Modifier mon plan\" propose 4 leviers indépendants (Objectif, Jours, Volume, Date de course), chacun avec une simulation en direct de l'impact avant de cliquer sur Appliquer.",
        blocks: [
          { type: "p", text: "Sur l'écran de résumé de ton plan (accessible depuis le configurateur), une section \"Modifier mon plan\" regroupe 4 leviers en accordéon : 🎯 Objectif de temps, les jours d'entraînement, le volume hebdomadaire, et la date de course. Un seul levier s'ouvre à la fois." },
          { type: "p", text: "Chacun fonctionne sur le même principe : tu ajustes la valeur, une simulation s'affiche immédiatement pour te montrer l'impact estimé sur ton objectif — et rien n'est appliqué au plan tant que tu n'as pas cliqué sur le bouton Appliquer dédié à ce levier. Tu peux donc essayer plusieurs valeurs sans risque avant de valider." },
          { type: "p", text: "Le choix de garder les leviers séparés plutôt que combinés est volontaire : cumuler plusieurs simulations en même temps aurait rendu l'estimation encore moins fiable que chacune prise isolément." },
          { type: "p", text: "À côté, le bouton \"🔄 Analyser les résultats et adapter le plan\" fait autre chose : il regarde tes séances réellement faites récemment et propose une réduction automatique de la semaine suivante si plusieurs séances dures ont été ratées ou adaptées d'affilée — jamais sur une séance isolée, jamais un changement d'objectif." },
        ]
      },
      { id: "estimation-performance", title: "Lire ton estimation de temps",
        text: "Yoria affiche une estimation de ton temps probable sur ta distance visée, calculée à partir de tes séances VMA, seuil et allure spécifique. Elle se resserre au fil des semaines à mesure que tu accumules des séances de qualité.",
        blocks: [
          { type: "p", text: "Sur le dashboard et sur l'écran Stats, Yoria affiche une estimation de ton temps probable le jour de la course. Elle n'est jamais figée : elle se recalcule à partir de tes séances de qualité réellement faites — VMA, seuil, allure spécifique — en particulier celles où tu as tenu les allures demandées." },
          { type: "p", text: "En tout début de plan, cette estimation reste assez large : peu de données, donc peu de certitude. Plus tu avances et plus tu accumules de séances qualité validées, plus la fourchette se resserre autour d'une valeur qui reflète ta forme réelle plutôt qu'une simple extrapolation théorique." },
          { type: "p", text: "Ce n'est pas un jugement sur ta progression : une estimation qui stagne ou recule temporairement après une semaine difficile (fatigue, séance ratée) est normal et fait partie du calcul — elle reflète ton état du moment, pas une note définitive." },
        ]
      },
      { id: "lire-stats", title: "Naviguer l'écran Stats",
        text: "L'écran Stats regroupe ta progression vers l'objectif, tes badges débloqués, et des graphiques par séance pour l'Indice d'Économie et la cadence — pratique pour repérer une tendance sur plusieurs semaines plutôt qu'une seule séance isolée.",
        blocks: [
          { type: "p", text: "En haut de l'écran Stats, une carte \"Mes badges\" affiche ta progression globale (un cercle qui se remplit à mesure que tu débloques des badges) — un tap dessus t'amène au détail de tous les badges disponibles et de ceux déjà obtenus." },
          { type: "p", text: "En dessous, tu retrouves ta progression vers l'objectif de temps, puis deux graphiques qui tracent l'évolution séance par séance : l'Indice d'Économie (IE) et ta cadence. L'intérêt de ces courbes est de repérer une tendance sur plusieurs semaines — une séance isolée peut toujours être un mauvais jour, mais une courbe qui progresse (ou stagne) sur la durée est un signal plus fiable." },
          { type: "p", text: "Un référentiel complet de tes allures d'entraînement et de tes zones de FC est aussi disponible sur cet écran, pratique si tu veux vérifier une valeur sans attendre la prochaine séance qui l'utilise." },
        ]
      },
      { id: "jour-course", title: "Préparer ton jour de course",
        text: "L'écran Course regroupe deux accordéons : Préparation pratique (horaires, checklist équipement, parcours) et Stratégie (allures de passage, conseil du coach). Absent en Mode Forme, qui n'a pas de date de course.",
        blocks: [
          { type: "p", text: "L'écran Course rassemble tout ce dont tu as besoin pour le jour J, organisé en deux blocs repliables." },
          { type: "h", text: "Préparation pratique" },
          { type: "p", text: "Tu peux renseigner tes horaires personnels (retrait des dossards, départ, etc.), cocher au fur et à mesure ta checklist d'équipement, et consulter les infos de parcours si tu les as ajoutées en créant ton plan." },
          { type: "h", text: "Stratégie" },
          { type: "p", text: "Cette section te donne les allures de passage à viser selon ton objectif, ainsi qu'un conseil du coach pensé spécifiquement pour l'approche de course — gestion du stress, logistique des derniers jours, ou point sur l'écart entre ton estimation actuelle et ton objectif." },
          { type: "p", text: "En haut de l'écran, un compte à rebours et un résumé (objectif, allure cible) restent toujours visibles, quel que soit le bloc que tu consultes. Cet écran n'existe que pour un plan Objectif course : en Mode Forme, il n'y a pas de date de course à préparer." },
        ]
      },
      { id: "gerer-strava", title: "Connecter ou reconnecter Strava",
        text: "Dans Réglages, section Intégrations, connecte Strava pour une synchro automatique de tes séances. Si le bandeau \"Strava déconnecté\" apparaît (token expiré ou absent), un bouton \"Reconnecter Strava\" règle le problème en un tap.",
        blocks: [
          { type: "p", text: "Dans Réglages, la section Intégrations propose un bouton \"🔗 Connecter Strava\" si ce n'est pas encore fait. Une fois connecté, tes activités se synchronisent automatiquement et alimentent directement tes séances sur la carte \"Aujourd'hui\"." },
          { type: "p", text: "Si la connexion expire ou se rompt (ça arrive, notamment après un certain temps sans ouvrir l'app), un bandeau \"Strava déconnecté\" peut apparaître sur le dashboard, avec un bouton \"🔄 Reconnecter Strava\" — un tap suffit à relancer l'autorisation. Depuis Réglages, tu as aussi un bouton \"🔄 Synchroniser avec Strava\" pour forcer une resynchronisation manuelle à tout moment." },
          { type: "p", text: "Et si tu veux couper le lien complètement, \"🔓 Déconnecter Strava\" est disponible tout en bas de cette section." },
        ]
      },
      { id: "gerer-pps", title: "Gérer ton Pass Prévention Santé (PPS)",
        text: "Le bouton 🩺 PPS en haut de l'écran ouvre une fenêtre pour importer ton document (PDF ou photo) et sa date d'expiration. Une alerte apparaît automatiquement dans le mois qui précède l'échéance.",
        blocks: [
          { type: "p", text: "Le Pass Prévention Santé se gère depuis le bouton 🩺 en haut de l'écran, accessible depuis n'importe quel onglet. Un tap dessus ouvre une fenêtre dédiée." },
          { type: "p", text: "Si tu n'as encore rien enregistré, tu peux importer ton document — PDF ou simple photo — et indiquer sa date d'expiration. Une fois fait, la fenêtre affiche un aperçu de ton PPS et sa date d'échéance à chaque ouverture. Réglages garde aussi un rappel discret de cet état (enregistré ou non, expire quand)." },
          { type: "p", text: "Dans le mois qui précède l'expiration, cette date s'affiche en orange pour attirer ton attention — et si elle est dépassée, un message d'alerte explicite le signale. Tu peux remplacer le document existant ou le supprimer complètement à tout moment depuis cette même fenêtre." },
        ]
      },
      { id: "gerer-abonnement", title: "Gérer ton abonnement",
        text: "Dans Réglages, section Compte et abonnement, souscris à Yoria pour 7€/mois (ou moins cher à l'année). Le statut de ton abonnement (Actif, Paiement en retard, Annulé) s'affiche directement dans cette section.",
        blocks: [
          { type: "p", text: "Dans Réglages, la section Compte et abonnement affiche ton statut actuel — soit \"✅ Actif\", \"⚠️ Paiement en retard\", \"Abonnement annulé\", soit \"Aucun abonnement actif\" si tu n'as encore rien souscrit." },
          { type: "p", text: "Si tu n'es pas encore abonné, un bouton te propose de t'abonner au tarif mensuel (7€/mois), avec un lien juste en dessous pour basculer sur le tarif annuel, moins cher sur la durée. Le paiement passe par une page Stripe sécurisée, ouverte dans ton navigateur." },
          { type: "p", text: "Une fois abonné, cette section se limite à l'affichage de ton statut — pas d'action supplémentaire nécessaire tant que tout est en ordre." },
        ]
      },
    ]
  },
  {
    id: "ecrans",
    icon: "📱",
    title: "Comprendre les écrans",
    items: [
      { title: "⚡ Dashboard",
        text: "Ta séance du jour, ton estimation de temps mise à jour automatiquement, et les conseils personnalisés de Yoria selon ta progression." },
      { title: "📅 Semaines",
        text: "Le détail de chaque semaine. Tape sur une séance pour la valider. Appui long (~1 sec) pour l'échanger avec une autre séance de la semaine — une séance ne peut pas être supprimée du plan, seul un statut la caractérise." },
      { title: "📊 Stats",
        text: "Ta progression vers l'objectif, ton Indice d'Économie (IE), ta cadence, et un référentiel complet des allures et zones FC." },
      { title: "🏁 Course",
        text: "Horaires, checklist équipement, stratégie et allures de passage le jour J. Absent en Mode Forme, qui n'a pas de date de course." },
      { title: "⚙️ Paramètres",
        text: "Ton profil, ton objectif, ta source de données, ta connexion Strava. Sauvegarde automatique dans le cloud." },
    ]
  },
  {
    id: "seances",
    icon: "🏃",
    title: "Comprendre les séances",
    items: [
      { title: "EF — Endurance fondamentale",
        text: "Le socle du plan, courue à allure facile (conversation possible). Elle renforce le cœur, développe les capillaires qui irriguent les muscles, et prépare le corps à encaisser les séances plus dures — sans elle, rien d'autre ne tient. C'est normalement le type de séance le plus fréquent dans une semaine." },
      { title: "Sortie longue",
        text: "Une EF prolongée, en général le plus gros volume de la semaine. Elle développe l'endurance profonde (réserves énergétiques, résistance à la fatigue) et prépare mentalement à tenir la distance de course." },
      { title: "Seuil",
        text: "Un effort \"confortablement dur\" — soutenu mais tenable 20 à 60 minutes. Il entraîne le corps à mieux éliminer l'acide lactique produit à l'effort, repoussant le moment où les jambes \"brûlent\"." },
      { title: "VMA (intervalles courts)",
        text: "Des efforts brefs et rapides, entrecoupés de récupération. Ils développent la puissance aérobie maximale — ta capacité à consommer beaucoup d'oxygène rapidement — et la vitesse de pointe." },
      { title: "Allure spécifique",
        text: "Courue précisément à l'allure visée le jour de la course. Elle habitue le corps ET la tête à ce rythme précis, pour qu'il devienne familier plutôt que découvert le jour J." },
      { title: "Repos",
        text: "Fait partie intégrante de l'entraînement, pas une pause en dehors : c'est pendant le repos que le corps encaisse et se renforce suite à l'effort. Sauter un repos prévu n'accélère rien, ça retarde la récupération." },
    ]
  },
  {
    id: "regles",
    icon: "📐",
    title: "Pour aller plus loin — les règles du plan",
    items: [
      { title: "Jamais deux séances dures collées",
        text: "Yoria espace toujours d'au moins 48h deux séances exigeantes (qualité ou longue) — le corps a besoin de ce temps pour récupérer avant le prochain effort intense. Entre deux, uniquement de l'EF ou du repos." },
      { title: "Le volume progresse par paliers, jamais d'un coup",
        text: "La charge d'entraînement augmente d'au plus 10% par semaine (7% en cas de contrainte physique signalée), avec une semaine plus légère (\"décharge\") tous les 4 blocs environ — le corps a besoin de temps pour s'adapter à un nouveau niveau d'effort avant d'en encaisser encore plus." },
      { title: "La sortie longue reste toujours la plus longue séance",
        text: "Même à faible volume hebdomadaire, la sortie longue est structurellement calibrée pour ne jamais être dépassée par une séance de qualité — c'est elle qui porte le travail d'endurance de fond." },
      { title: "Le plan suit des phases distinctes",
        text: "Construction (bâtir la base), Spécifique (se rapprocher de l'allure et des conditions de course), Affûtage (réduire le volume pour arriver frais) — l'intensité et le type de séances qualité évoluent d'une phase à l'autre." },
      { title: "Un allègement réduit le nombre de répétitions, jamais l'allure",
        text: "Si Yoria propose d'alléger une séance de qualité (fatigue, séances ratées), c'est toujours le nombre de répétitions ou de blocs qui diminue — jamais la vitesse à laquelle tu les coures, ni le temps de récupération entre elles." },
    ]
  },
  {
    id: "moteur",
    icon: "🧠",
    title: "Comprendre le moteur Yoria",
    items: [
      { title: "Estimation de temps",
        text: "Combine tes séances VMA, SPEC et SEUIL pour estimer ton temps probable, avec une fourchette qui se resserre au fil des semaines." },
      { title: "Indice d'Économie (IE)",
        text: "Compare ta FC réelle à ta FC théorique pour une allure donnée. Au-dessus de 100 : tu cours plus économiquement qu'attendu." },
      { title: "Cadence",
        text: "Nombre de pas par minute, un indicateur de technique de course. Idéalement entre 170 et 180 spm : une cadence trop basse allonge le temps passé en l'air à chaque foulée, donc l'impact au sol. Une cadence stable ou en légère hausse au fil du plan est un bon signe." },
      { title: "Ressenti (RPE)",
        text: "Après une séance, indique comment tu l'as vécue (🙂 Facile → 🥵 Maximal, échelle CR-10 de Borg). Complète ce que ta montre mesure par ce que ton corps a vraiment ressenti." },
      { title: "Comment tu te sens avant la séance (readiness)",
        text: "Le jour d'une séance qualité, indique ton état (🪫 Fatigué, 😐 Normal, 🔋 En forme). Si tu es fatigué et qu'un allègement est déjà proposé, il peut être renforcé. Sans allègement en cours, tu reçois juste une invitation à la prudence — rien n'est modifié automatiquement." },
      { title: "Carte d'ajustement",
        text: "Yoria surveille ta fatigue, ta charge et ta régularité. \"Yoria te propose un ajustement\" = une action concrète t'est proposée — le plus souvent sur une séance facile (EF/longue), sauf si tu as raté plusieurs séances qualité d'affilée, où Yoria peut alors alléger directement la prochaine (moins de répétitions, jamais l'allure ni la récupération). \"Yoria a repéré un signal à surveiller\" = simple alerte, sans action à ce stade. Rien n'est appliqué sans ton accord." },
      { title: "Allures qui évoluent",
        text: "Tes allures d'entraînement se resserrent progressivement vers ton objectif à mesure que tes séances confirment ta progression, sans attendre la fin du plan." },
    ]
  },
  {
    id: "types-plan",
    icon: "🗂️",
    title: "Types de plan",
    items: [
      { title: "Plan Course",
        text: "Vers une date d'objectif précise (5K, 10K, semi, marathon)." },
      { title: "Mode Forme",
        text: "Sans date de course, un cycle d'entraînement continu qui se renouvelle par blocs de 4 semaines." },
      { title: "Grand débutant",
        text: "Si tu choisis ce niveau, ton plan démarre en alternance course/marche, avec une progression jusqu'à atteindre 30 minutes de course continue." },
    ]
  },
  {
    id: "sources",
    icon: "🔗",
    title: "Sources de données",
    items: [
      { title: "Strava",
        text: "La plus simple si tu es déjà connecté (synchro automatique)." },
      { title: "Import FIT",
        text: "Pour les autres montres. Allure, distance et FC bien récupérées ; le détail effort/récupération d'une séance qualité dépend du modèle." },
      { title: "Saisie manuelle",
        text: "Contrôle total, la plus fiable si tu préfères saisir toi-même." },
      { title: "Multi-appareils",
        text: "Tes données sont liées à ton compte (email + mot de passe), synchronisées automatiquement. Connecte-toi avec le même compte sur un nouvel appareil." },
    ]
  },
  {
    id: "faq",
    icon: "❓",
    title: "Questions fréquentes",
    items: [
      { title: "Comment saisir mes records personnels ?",
        text: "Dans Paramètres, renseigne un temps par distance (5K, 10K, Semi, Marathon). Une seule suffit pour démarrer (Yoria estime les autres), mais renseigner un record par distance donne des estimations plus fiables — chaque distance sollicite des qualités différentes, et Yoria n'a plus besoin d'extrapoler." },
      { title: "Pourquoi mes données ont disparu sur un nouvel appareil ?",
        text: "Tes données sont liées à ton compte (email + mot de passe) et synchronisées automatiquement dans le cloud. Connecte-toi avec le même compte sur ton nouvel appareil et tout réapparaît — plans, statuts, profil." },
      { title: "À quoi sert le bouton 💬 en haut de l'écran ?",
        text: "Il permet de signaler un bug, une donnée qui te semble incorrecte, ou de proposer une suggestion — directement depuis n'importe quel écran de l'app." },
    ]
  },
];

// ----------------------------------------------------------------------------
// TUTOS_GROUPES — regroupement par thème des tutos de la section "tutos"
// (HELP_SECTIONS[0].items), affichés en tuiles plutôt qu'en accordéon plat
// (04/08/2026, demande de Laurent : 16 tutos à la suite est illisible).
// Chaque entrée réfère un id d'item existant — ne PAS dupliquer le contenu
// ici. Un id présent dans un groupe mais absent de HELP_SECTIONS[0].items
// est silencieusement ignoré par le renderer (permet d'ajouter un groupe
// avant que tous ses tutos soient rédigés, sans lien mort).
// ----------------------------------------------------------------------------
export const TUTOS_GROUPES = [
  { label: "Démarrer", icon: "🚀", itemIds: ["creer-plan", "test-cooper", "source-donnees"] },
  { label: "Au quotidien", icon: "🏃", itemIds: ["carte-aujourdhui", "import-fit", "programmer-montre", "readiness-rpe"] },
  { label: "Gérer son plan", icon: "🗂️", itemIds: ["ajustement", "echanger-seance", "modifier-plan"] },
  { label: "Suivi", icon: "📈", itemIds: ["estimation-performance", "lire-stats", "jour-course"] },
  { label: "Compte", icon: "⚙️", itemIds: ["gerer-strava", "gerer-pps", "gerer-abonnement"] },
];
