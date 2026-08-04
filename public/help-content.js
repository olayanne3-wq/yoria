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
      { title: "Comprendre la carte \"Aujourd'hui\"",
        text: "C'est la carte principale du dashboard : elle affiche la séance prévue pour le jour même. Badge type de séance, titre (durée/allure/distance), icônes ✏️ et ⌚, météo, allures et FC cibles, boutons de statut, message du coach. Le bouton ✏️ permet de saisir manuellement ou d'importer un .fit. Après validation, un bloc Réalisé remplace les cibles.",
        blocks: [
          { type: "img", src: "/help-assets/carte-aujourdhui.png", alt: "Carte Aujourd'hui avant validation" },
          { type: "p", text: "C'est la carte principale du dashboard : elle affiche la séance prévue pour le jour même." },
          { type: "h", text: "Avant de faire la séance" },
          { type: "list", items: [
            "Badge coloré (ex. \"EF\") : type de séance.",
            "Titre : durée, allure cible et distance estimée.",
            "✏️ : ouvre un panneau pour saisir ou corriger la séance à la main (allure, durée, FC), ou importer un fichier .fit si tu utilises ce mode.",
            "⌚ (si la séance a une structure d'intervalles) : à programmer sur ta montre avant de courir — disparaît une fois la séance validée.",
            "Météo : température actuelle, avec 🔥 si chaleur (>28°C, l'allure EF est alors ajustée automatiquement).",
            "💡 : rappel ponctuel sur la phase d'entraînement en cours.",
            "Allures cibles / FC cible : la fourchette à viser pour cette séance.",
            "Rangée de boutons — ✅ ❌ ⚠️ 😴 — pour indiquer comment s'est passée la séance, ou qu'elle a été volontairement sautée.",
            "Message du coach 🤖, avec un bouton 🔄 pour le régénérer.",
          ]},
          { type: "h", text: "Le bouton ✏️" },
          { type: "list", ordered: true, items: [
            "Import .fit (uniquement si ta source de données est \"montre/fichier\" et qu'aucune activité n'est déjà enregistrée ce jour-là) — bouton \"📁 Importer le fichier .fit de cette séance\".",
            "Saisie manuelle : allure (par pas de 5 sec/km avec des boutons +/-), durée totale réelle si la séance a des intervalles, et FC moyenne (facultative). Un repère \"cible plan\" est affiché pour comparer.",
            "✓ Enregistrer sauvegarde la saisie ; elle prime automatiquement sur une éventuelle donnée Strava du même jour.",
            "✕ Annuler efface la saisie et remet le statut de la séance à \"—\".",
          ]},
          { type: "h", text: "Une fois la séance validée" },
          { type: "p", text: "Le bouton ✏️ reste visible (pour corriger), mais ⌚ disparaît. Un bloc \"Réalisé\" apparaît à la place des allures/FC cibles :" },
          { type: "list", items: [
            "Résumé chiffré : distance, durée, allure et FC (issus de Strava/FIT si disponible, sinon de ta saisie manuelle).",
            "Badge de source : 🟠 Strava ou 📁 FIT, avec un lien 🔗 vers Strava si pertinent.",
            "🗑️ : supprime l'activité importée (utile pour en réimporter une autre).",
            "▼ détail : déplie le détail répétition par répétition si la séance avait des intervalles, avec le nombre de répétitions dans la cible.",
            "✏️ Corriger : rouvre le formulaire de saisie manuelle pour ajuster.",
          ]},
          { type: "p", text: "Si aucune donnée n'existe du tout pour la séance, un simple lien \"✏️ Aucune donnée — saisir\" apparaît à la place." },
        ]
      },
      { title: "Créer un plan",
        text: "Depuis le configurateur, choisis ton objectif (Objectif course, Mode forme ou Reprise en douceur). Le plan Objectif course se construit en 8 étapes (distance, point de départ, objectif, dates, contraintes, jours disponibles, récapitulatif). Le Mode forme tient en 4 étapes.",
        blocks: [
          { type: "p", text: "Depuis l'écran d'accueil du configurateur (bouton \"🏁 Configurer un plan\" sur le dashboard), choisis ton objectif :" },
          { type: "list", items: [
            "🏁 Objectif course — préparer une date précise (5K, 10K, semi, marathon).",
            "💓 Mode forme — entretenir sa forme, sans date de course, par blocs de 4 semaines.",
            "🌱 Reprise en douceur — après une pause ou une blessure, indépendant de ton niveau habituel.",
          ]},
          { type: "h", text: "Objectif course — 8 étapes" },
          { type: "list", ordered: true, items: [
            "Distance visée (5K, 10K, semi, marathon).",
            "Point de départ : ton chrono actuel sur cette distance, ou un temps équivalent sur une autre distance si tu n'as pas couru celle-ci récemment.",
            "Objectif : le chrono que tu vises.",
            "C'est pour quand : date de début du plan et jour de la course (+ infos facultatives : nom, lieu, lien de la course).",
            "Contraintes à connaître : blessure en cours/récente, douleur chronique, reprise après une longue pause — pour adapter la prudence du plan.",
            "Jours disponibles pour courir dans la semaine.",
            "Récapitulatif (distance, niveau, temps actuel, objectif, durée du plan) avant validation.",
          ]},
          { type: "h", text: "Mode forme — 4 étapes" },
          { type: "p", text: "Plus court : niveau, volume, jours disponibles, accent (le type d'effort que tu veux privilégier)." },
          { type: "p", text: "Si tu n'as pas de référence chronométrée récente, un test semi-Cooper (6 minutes à allure maximale soutenable) peut être proposé pour estimer ton niveau avant de générer la suite du plan." },
          { type: "p", text: "Une fois le plan généré, tu peux revenir à tout moment sur le configurateur pour consulter tes autres plans sauvegardés ou en créer un nouveau." },
        ]
      },
      { title: "Importer un fichier .fit",
        text: "Depuis la carte Aujourd'hui, ouvre le bouton ✏️ puis choisis ton fichier .fit exporté de ta montre. Allure, distance et FC sont toujours bien récupérées ; le détail effort/récupération d'une séance qualité dépend du modèle de montre.",
        blocks: [
          { type: "p", text: "Depuis la carte \"Aujourd'hui\" du dashboard, ouvre le bouton ✏️ de la séance du jour. Si ta source de données est réglée sur \"montre/fichier\" et qu'aucune activité n'est déjà enregistrée pour cette date, un bouton \"📁 Importer le fichier .fit de cette séance\" apparaît en haut du panneau." },
          { type: "p", text: "Exporte d'abord le fichier .fit de ta séance depuis ta montre ou son application (Garmin Connect, Coros, Suunto app, etc. — une Apple Watch nécessite systématiquement une app tierce, Apple Fitness natif ne le permet pas), puis choisis ce fichier via le bouton." },
          { type: "h", text: "À savoir avant d'importer" },
          { type: "list", items: [
            "Allure, distance et FC sont toujours récupérées correctement — largement suffisant pour une sortie EF ou longue.",
            "Pour une séance qualité (fractionné), la précision du découpage effort/récupération dépend de ta montre : certaines (Zepp/Amazfit notamment) n'incluent pas cette structure dans le fichier exporté, même si la séance a été suivie fidèlement.",
            "Si le découpage semble faux après import, ce n'est pas forcément une erreur d'import — vérifie manuellement si besoin.",
          ]},
          { type: "p", text: "Une fois importée, l'activité reste protégée : une resynchronisation ne l'écrasera pas silencieusement. Pour la remplacer, supprime-la d'abord via le 🗑️ du bloc \"Réalisé\" de la carte." },
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
        text: "Le détail de chaque semaine. Tape sur une séance pour la valider. Appui long (~1 sec) pour la déplacer vers un autre jour ou l'échanger avec une autre — une séance ne peut pas être supprimée du plan, seul un statut la caractérise." },
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
