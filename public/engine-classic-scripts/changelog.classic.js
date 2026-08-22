/**
 * changelog.classic.js
 * Historique des versions affiché dans Paramètres (Yoria)
 *
 * Extrait de index.html le 13 juillet 2026 (était un tableau const VERSIONS
 * en dur au milieu de renderSettings()) — séparé pour alléger index.html
 * (~250 lignes de contenu texte pur, sans rapport avec la logique de
 * rendu environrante) et pour éditer une entrée de changelog sans risquer
 * de casser du JS ailleurs dans ce même fichier massif.
 *
 * Script classique (pas de module ES) — même pattern que les autres
 * engine-classic-scripts/*.classic.js : charge et attache VERSIONS
 * directement en portée globale. Doit être chargé AVANT le script
 * principal d'index.html (qui lit VERSIONS dans renderSettings()).
 *
 * Format de chaque entrée :
 *   { ver: "vX.Y", title: "Résumé court", current: bool, notes: ["..."] }
 * Un seul élément current:true à la fois (la version affichée en tête,
 * mise en avant visuellement) — mettre à jour l'ancienne entrée current
 * en false au moment d'ajouter une nouvelle version.
 *
 * Simplifié le 31/07/2026 : les correctifs purs (🐛) sont retirés — ce
 * fichier ne garde que les notes fonctionnelles visibles pour
 * l'utilisateur. Les versions purement correctives (v2.14, v2.22) ont été
 * supprimées ; v2.0 à v2.3 fusionnées. L'historique complet (bugs inclus)
 * reste consultable dans l'historique git de ce fichier.
 */

const VERSIONS = [
      { ver:"v2.49", title:"Suppression Strava fiabilisée, sauvegardes automatiques réparées, ergonomie mobile", current:true, notes:[
        "🗑️ Supprimer une activité importée (Strava/.fit) est désormais définitif — elle n'est plus jamais réimportée automatiquement, réactivable en un tap depuis le badge dédié sur la carte",
        "🔄 La synchronisation automatique avec Strava passe de 1h à 30 minutes",
        "📅 Un tap sur un jour de repos dans la vue Semaine ouvre maintenant sa carte, comme n'importe quel autre jour",
        "🧭 Nouvelle frise de navigation rapide entre les semaines, fixée en haut de l'écran",
        "💬 Messages de confirmation et d'erreur repensés, plus lisibles et cohérents dans toute l'app",
        "🔧 Correctifs de fiabilité importants : suppression d'une activité Strava sans effet après un échange de séances, sauvegardes automatiques quotidiennes qui ne se déclenchaient jamais",
      ]},
      { ver:"v2.48", title:"Onglet Course pour gérer tes plans, aide à jour", current:false, notes:[
        "🏁 Le changement de plan et la création d'un nouveau plan se font maintenant depuis l'onglet Course, accessible aussi en Mode Forme",
        "📋 L'onglet Course affiche un état dédié tant qu'aucune course n'est en préparation, avec un accès direct pour en créer une",
        "❓ Nouveau tuto \"Changer de plan actif\" dans l'aide",
      ]},
      { ver:"v2.47", title:"Modifier mon plan directement depuis Semaines, toujours accessible", current:false, notes:[
        "📝 Nouveau : modifie ton objectif, tes jours, ton volume, ta date de course ou ajoute une course intermédiaire directement depuis l'onglet Semaines — plus besoin de repasser par le wizard",
        "📌 Cet accès reste visible en permanence en haut de l'écran, même en faisant défiler tes semaines",
        "🎯 Même principe que dans le wizard : simulation avant application, ta semaine en cours n'est jamais modifiée",
      ]},
      { ver:"v2.46", title:"Échange de séances par glissement, fiabilité définitive du swap", current:false, notes:[
        "🖐️ Nouveau : dans le détail d'une semaine, glisse une séance par sa poignée ⠿ jusqu'à un autre jour pour l'échanger directement — un jour de repos peut lui aussi être déplacé",
        "👆 Le menu \"Déplacer cette séance\" reste disponible via un double tap (ou double-clic), en alternative au glissement",
        "🔄 Correctif de fond : le système d'échange de séances a été repensé une seconde fois pour ne plus jamais décaler une séance que tu n'as pas touchée, même après plusieurs échanges successifs dans la même semaine",
        "📱🤖 Sur Android, la bêta précise désormais qu'une adresse Gmail est nécessaire pour installer l'app (règle du Play Store, pas de Yoria) — vérifié avant l'envoi de ta candidature",
      ]},
      { ver:"v2.45", title:"Décomposition en laps plus fiable, séance de confirmation d'allure clarifiée", current:false, notes:[
        "🏃 Le détail par répétition d'une séance de qualité s'affiche désormais même si ta montre n'a pas posé de laps manuels distincts — reconstruit automatiquement à partir de la trace complète",
        "⚠️ Un message discret l'indique quand c'est le cas, avec un rappel de comment programmer ta montre pour une décomposition encore plus précise",
        "🎯 Clarifié dans l'aide : la séance de confirmation d'allure (quelques semaines avant ta course) sert à vérifier que tu tiens ton allure objectif, pas à recalculer ton estimation de temps",
      ]},
      { ver:"v2.44", title:"Séances futures programmables sur la montre, chargement plus fluide", current:false, notes:[
        "⌚ L'icône montre est désormais disponible pour toute séance qualité à venir, pas seulement celle du jour — prépare ta montre plusieurs jours à l'avance",
        "✨ Correctif : le léger scintillement parfois visible à l'ouverture de l'app a été corrigé",
        "🗓️ Carte du jour : les boutons montre/saisie manuelle restent toujours bien alignés, sans décalage à l'arrivée de la météo",
      ]},
      { ver:"v2.43", title:"Échange de séances fiabilisé en profondeur, conditions et confidentialité accessibles partout", current:false, notes:[
        "🔄 Correctif important : le système d'échange de séances a été entièrement reconstruit pour ne plus jamais faire disparaître ou dupliquer une séance, même après plusieurs échanges d'affilée dans la même semaine",
        "📅 Une séance passée sans statut de la semaine en cours peut maintenant être déplacée, comme n'importe quelle autre séance",
        "📄🔒 Conditions générales d'utilisation et politique de confidentialité accessibles en un tap depuis Réglages, avec un vrai bouton fermer",
      ]},
      { ver:"v2.42", title:"Sécurité renforcée, recommandations santé, conditions d'utilisation", current:false, notes:[
        "🔒 Sécurité du site renforcée en profondeur (protection contre plusieurs types d'attaques web courantes)",
        "⚕️ Nouvelles recommandations santé, consultables à tout moment depuis Réglages — pense à consulter un médecin avant de démarrer un programme d'entraînement",
        "📄 Ajout des conditions générales d'utilisation",
        "🏅 L'aide explique maintenant comment ajouter une course intermédiaire à ton plan",
        "🎂 Le message d'anniversaire est désormais visible directement sur le dashboard, en plus de Réglages",
      ]},
      { ver:"v2.41", title:"Course intermédiaire dans un plan long", current:false, notes:[
        "🏃 Nouveau levier dans le wizard et l'accordéon \"Modifier mon plan\" : planifie une course intermédiaire (5K/10K/Semi) avant ton objectif final",
        "📉 Sa semaine est automatiquement allégée, avec une récupération dédiée juste après selon la distance choisie",
        "🎯 Le résultat de cette course, une fois saisi, affine légèrement ton estimation de référence",
      ]},
      { ver:"v2.40", title:"Pourquoi cette séance, dashboard clarifié, échanges de séances fiabilisés", current:false, notes:[
        "🎯 Chaque séance explique maintenant son rôle dans ta préparation, dans un nouveau repli \"Pourquoi cette séance\"",
        "📊 Estimation de temps repensée en jauge visuelle, plus lisible en un coup d'œil, avec le détail complet toujours accessible au clic",
        "🗓️ Carte du jour réorganisée : le descriptif de la séance ne se coupe plus, distance et icônes regroupées clairement",
        "⌚✏️ Icônes montre et saisie manuelle agrandies avec leur libellé, popovers qui restent toujours visibles à l'écran",
        "🔄 Correctif important : échanger plusieurs séances d'affilée dans la même semaine fonctionne maintenant de façon fiable et prévisible",
        "🧹 Bloc \"Allures cibles\" retiré (redondant avec le texte de la séance)",
      ]},
      { ver:"v2.39", title:"Installation facilitée sur iPhone, bêta plus rapide", current:false, notes:[
        "📱 Sur iPhone, un guide s'affiche pour ajouter Yoria à ton écran d'accueil comme une vraie application",
        "🚀 Le site d'inscription à la bêta valide désormais automatiquement les premières candidatures, avec un accès immédiat et les instructions d'installation adaptées à ton téléphone",
      ]},
      { ver:"v2.38", title:"Estimation 10K enrichie par la saisie manuelle, correctifs de fiabilité", current:false, notes:[
        "🎯 En saisie manuelle, chaque répétition réussie ou ratée contribue désormais à ton estimation 10K, exactement comme une vraie séance Strava",
        "🔧 Correctif important : les statuts de séance (✅⚠️❌) ne pouvaient plus disparaître silencieusement, notamment en changeant de source de données",
        "🔄 Correctif : échanger deux séances affiche maintenant fidèlement le résultat partout, y compris après avoir quitté et rouvert l'app",
        "🎚️ Boutons +/- 1s/km ajoutés en saisie manuelle, pour affiner ton allure plus précisément",
        "✏️ Correctif : les boutons +/- de l'allure en saisie manuelle fonctionnaient à l'envers",
      ]},
      { ver:"v2.37", title:"Séances de qualité mieux dosées, plafonnement du volume par séance", current:false, notes:[
        "🎯 Le volume d'une séance de qualité (VMA, seuil, fractionné, allure course, ainsi que la séance test) est désormais plafonné selon ton volume hebdomadaire — évite des séances disproportionnées par rapport à ta charge d'entraînement du moment",
        "🔧 Correctif de fiabilité important sur le levier \"Volume\" du wizard : un changement de volume est maintenant fidèlement conservé, même après avoir utilisé un autre levier (Jours, Objectif, Date de course) ou le bouton \"Analyser et adapter\"",
        "✏️ Vue Semaine : un seul crayon de saisie manuelle par séance, au lieu de deux affichés en même temps une fois la séance validée",
        "✅ Le badge de statut d'une séance affiche maintenant le vrai symbole choisi (✅❌⚠️😴), au lieu d'un symbole générique",
      ]},
      { ver:"v2.36", title:"Nouveau badge kilomètres cumulés, résultat de course enrichi, détail des intervalles en saisie manuelle", current:false, notes:[
        "🏅 Nouveau badge \"Km cumulés\" : 7 paliers de 50 à 2000 km, sur l'ensemble de tes séances validées, tous plans confondus",
        "🏁 Le résultat de course peut maintenant inclure ton ressenti, un commentaire, et tes classements général et par catégorie",
        "📖 Nouvelle section \"Mes courses\" dans Stats, pour retrouver l'historique de tous tes résultats",
        "✅ En saisie manuelle, tu peux maintenant indiquer la réussite de chaque répétition d'une séance de qualité",
        "🎯 Correctifs de fiabilité sur l'estimation 10K et le cumul de kilomètres : plusieurs cas où une séance validée automatiquement (synchro Strava, import .fit) n'était pas prise en compte ont été corrigés",
      ]},
      { ver:"v2.35", title:"Aide réorganisée en tutos par action, quelques corrections visuelles", current:false, notes:[
        "🛠️ Nouvel onglet \"Tutos\" dans l'aide : 16 guides organisés par action concrète (créer un plan, importer un .fit, échanger une séance...), affichés en tuiles par thème",
        "📋 Chaque tuto s'ouvre en vue détaillée avec un vrai bouton retour, séparé des sections d'aide classiques qui restent accessibles via l'onglet \"Aide\"",
        "🎨 La séance de test (semi-Cooper) affiche maintenant sa couleur dans la vue Semaine, comme les autres types de séance",
        "✏️ Le crayon de saisie manuelle ne s'affiche plus en double dans son propre panneau",
      ]},
      { ver:"v2.34", title:"Import .fit avec détail par répétition, protection de tes données importées", current:false, notes:[
        "📁 L'import d'un fichier .fit détecte maintenant automatiquement chaque répétition d'une séance qualité, même sur les montres qui n'enregistrent pas la structure de l'entraînement (Amazfit/Zepp notamment)",
        "✏️ Un seul crayon regroupe désormais l'import .fit et la saisie manuelle, placé à côté du statut de chaque séance — sur la carte du jour comme dans le détail de la semaine",
        "🔒 Une activité déjà importée (Strava ou .fit) n'est plus jamais écrasée par une resynchronisation — supprime-la d'abord si tu veux la remplacer",
        "🗑️ Nouveau bouton pour supprimer une activité importée, avec un badge qui indique sa provenance (Strava ou .fit)",
      ]},
      { ver:"v2.33", title:"Pass Prévention Santé, choix de la source de données à l'inscription, plans mieux équilibrés", current:false, notes:[
        "🩺 Nouveau bouton PPS dans l'en-tête : importe ton Pass Prévention Santé FFA (PDF ou photo) et retrouve-le en un tap au retrait de dossard",
        "📝 L'inscription te demande maintenant comment tu comptes suivre tes séances (Strava ou saisie manuelle), avec une explication si tu choisis Strava",
        "⚖️ Meilleur équilibre entre séances faciles et sortie longue dans le plan généré, notamment à volume plus serré",
        "🎚️ Le levier \"Volume\" du wizard applique maintenant vraiment le changement demandé sur les semaines à venir",
        "📡 Un bandeau apparaît sur le dashboard si Strava est déconnecté, avec un accès direct pour te reconnecter",
        "🏅 Libellés des badges à paliers clarifiés, badge \"Record battu\" déclenché uniquement par une vraie course validée",
      ]},
      { ver:"v2.32", title:"Profil complet dès l'inscription, outils internes de fiabilité", current:false, notes:[
        "📝 L'inscription demande maintenant ton profil complet (prénom, date de naissance, poids, taille, records...) réparti en quelques étapes simples, avec navigation par glissement",
        "🏅 Les records personnels saisis à l'inscription incluent maintenant la date, comme dans Réglages",
        "🔧 Outils internes de fiabilité renforcés (sauvegarde des données, vérification de l'intégrité de la base) — sans impact visible pour toi, mais qui protègent tes données en coulisses",
      ]},
      { ver:"v2.31", title:"Sauvegarde et réinjection de données (admin bêta)", current:false, notes:[
        "💾 Nouvel outil interne d'export/réinjection de données, accessible depuis l'administration bêta — filet de sécurité tant que le plan Supabase reste gratuit (aucune sauvegarde automatique incluse à ce niveau)",
      ]},
      { ver:"v2.30", title:"Réglages réorganisés en accordéons, roulettes de saisie améliorées", current:false, notes:[
        "📂 Réglages, Stats et Course sont désormais organisés en sections repliables, plus faciles à parcourir",
        "🏅 Records personnels : présentation plus compacte, avec validation explicite (bouton ✓) plutôt qu'un enregistrement automatique",
        "🎡 Nouveaux boutons +/- sur les roulettes de saisie de temps, en plus du geste de défilement habituel — disponibles sur les records personnels, le temps de référence, l'objectif et le volume hebdomadaire du wizard",
        "🎨 Thème clair/sombre déplacé dans l'en-tête, sous forme d'un bouton discret",
      ]},
      { ver:"v2.29", title:"Volumes minimums adaptés par distance, aide repensée", current:false, notes:[
        "📏 Le volume minimum requis pour générer un plan cohérent s'adapte maintenant à ta distance visée (5K/10K/Semi/Marathon), pas seulement au nombre de jours choisis",
        "📐 La sortie longue reste désormais garantie comme la séance la plus longue de la semaine, même à faible volume — elle ne peut plus être plus courte que le cumul de tes séances de qualité",
        "❓ L'aide est repensée : sections repliables, recherche pour trouver rapidement ce que tu cherches, et deux nouvelles rubriques — les différents types de séances et les règles qui structurent ton plan",
      ]},
      { ver:"v2.28", title:"Navigation du wizard plus fiable, reprise en douceur, swipe entre étapes", current:false, notes:[
        "🌱 Nouvelle option \"Reprise en douceur\" pour repartir pas à pas après une pause ou une blessure, indépendamment de ton niveau habituel",
        "🚶 La progression marche-course commence désormais par de l'alternance marche/course avant le premier bloc de course continue",
        "👆 Navigation par glissement (swipe) entre les étapes de création d'un plan, en plus des flèches",
        "✅ Le temps de référence, l'objectif, le volume hebdomadaire et le jour de sortie longue sont maintenant vérifiés au bon moment",
      ]},
      { ver:"v2.27", title:"Système de badges, coach plus honnête, changement de date de course", current:false, notes:[
        "🏅 Nouveau système de badges : 14 badges répartis en 4 catégories, consultables depuis Stats — jamais de classement ni de comparaison",
        "🎯 Badges pour ta première estimation confirmée, un record battu, un allègement accepté, une semaine équilibrée, le test semi-Cooper, et les grandes étapes de ton plan",
        "📆 Nouveau levier dans le wizard pour changer la date de ta course sur un plan déjà en cours",
        "🤖 Le coach est plus honnête quand un vrai signal du moteur existe — toujours bienveillant sur la forme, mais plus direct sur le fond",
        "❤️ Le coach signale désormais si ta fréquence cardiaque en endurance/sortie longue dépasse ta zone habituelle",
      ]},
      { ver:"v2.26", title:"Carte du jour et vue Semaine simplifiées, corrections de fiabilité", current:false, notes:[
        "🗓️ Carte du jour : les icônes montre/stylo n'apparaissent que si la séance n'est pas encore validée, allures et FC cibles affichées directement",
        "✅ Une fois la séance validée, le résultat s'affiche automatiquement, avec un lien discret pour corriger",
        "📅 La vue Semaine suit la même logique — impossible de saisir un statut sur une séance pas encore passée",
        "🎯 La page Stats distingue mieux \"où tu en es maintenant\" de \"où tu seras probablement le jour de la course\"",
        "🧭 Wizard : un accordéon regroupe la modification d'objectif, de jours ou de volume, avec simulation avant de valider",
      ]},
      { ver:"v2.25", title:"Choix d'activité si ambiguë, navigation plus fluide, aide sur chaque écran", current:false, notes:[
        "❓ Si Strava a enregistré plusieurs courses le même jour, un menu te permet de choisir toi-même laquelle associer",
        "🌦️ La météo affichée sur une séance passée reflète maintenant l'heure réelle à laquelle tu as couru",
        "🚫 Le moteur refuse désormais de créer un plan si le volume de départ est trop faible pour le nombre de jours choisis",
        "👆 Navigation par glissement (swipe) entre les principaux onglets de l'app",
        "❓ Le bouton d'aide est accessible depuis chaque écran, contenu entièrement réorganisé",
      ]},
      { ver:"v2.24", title:"Ajustement après séances ratées, fuseau horaire corrigé", current:false, notes:[
        "🎯 Si tu rates deux séances de qualité prévues d'affilée, Yoria peut désormais te proposer d'alléger la prochaine",
        "🔋 Le sélecteur de ressenti est plus clair (question précisée, réponse par défaut, disparaît une fois validé)",
      ]},
      { ver:"v2.23", title:"Adaptation plus fine des séances de qualité, ressenti du jour", current:false, notes:[
        "🎯 Quand ton plan doit être allégé, Yoria peut réduire le nombre de répétitions d'une séance de qualité plutôt que de se limiter aux séances faciles",
        "🔋 Un nouveau sélecteur te permet d'indiquer comment tu te sens avant une séance de qualité",
      ]},
      { ver:"v2.21", title:"Estimation plus fidèle (VDOT), allures qui suivent ta progression, sync 100% Supabase", current:false, notes:[
        "🎯 L'allure de seuil compte maintenant pour ce qu'elle est vraiment, au lieu de sous-estimer ta vitesse réelle",
        "📈 Tes allures d'entraînement se resserrent maintenant automatiquement au fil du plan à mesure que ta forme progresse",
        "☁️ La sauvegarde et la synchronisation entre appareils passent maintenant à 100% par ton compte",
      ]},
      { ver:"v2.20", title:"Estimation 10K progressive, bandes de tolérance, lisibilité des statuts", current:false, notes:[
        "🎯 L'estimation 10K ne recule plus après une séance réussie — elle progresse par petits pas vers ta forme mesurée",
        "📊 Le graphique d'évolution de l'estimation affiche une bande de tolérance autour de la courbe",
        "😴 Le nombre de séances sautées apparaît dans le bilan de la semaine sur le dashboard",
      ]},
      { ver:"v2.19", title:"Test semi-Cooper pour plan course, échange de séances, statut repos automatique", current:false, notes:[
        "🎯 Le test de 6 minutes est maintenant disponible aussi pour un plan course, pas seulement en Mode Forme",
        "⭐ Nouveau sélecteur du jour de sortie longue dans le wizard",
        "🔄 Possibilité d'échanger deux séances déjà présentes dans la semaine",
        "😴 Une séance passée sans statut saisi est désormais marquée automatiquement comme repos/sautée",
        "🚫 Une séance ne peut plus être supprimée du plan — seul un statut la caractérise",
      ]},
      { ver:"v2.18", title:"Mode Forme sans référence de temps, fiabilité du chargement de plan", current:false, notes:[
        "🏃 En Mode Forme, plus besoin d'avoir un temps de course récent — un test de 6 minutes en première semaine suffit",
        "🔁 Nouveau bouton pour enchaîner sur un nouveau bloc de 4 semaines en Mode Forme",
        "📏 Ajout d'un sélecteur de distance (5K/10K/Semi/Marathon) en Mode Forme",
      ]},
      { ver:"v2.17", title:"Abonnement Yoria Premium", current:false, notes:[
        "💳 Nouvel abonnement Yoria Premium (7€/mois ou tarif annuel), depuis Réglages",
        "🔒 Paiement sécurisé via Stripe, dans ton navigateur habituel",
      ]},
      { ver:"v2.16", title:"Fiabilité du profil et de la charge d'entraînement, premiers outils de suivi qualité", current:false, notes:[
        "🌦️ La météo passe maintenant par le même circuit technique que la météo prévisionnelle",
        "💬 Signalement d'un problème : un nouveau bouton est disponible en haut de chaque écran pour décrire un souci rencontré",
      ]},
      { ver:"v2.15", title:"Stratégie de course par km ronds, wizard simplifié & correctifs Strava/estimation", current:false, notes:[
        "🏁 Stratégie de jour de course en repères kilométriques ronds pour Semi et Marathon",
        "📝 L'étape \"Niveau\" a disparu du parcours de création de plan — c'est un réglage de ton profil",
      ]},
      { ver:"v2.13", title:"Stratégie de course cohérente, catégorie d'âge FFA & explications du ressenti", current:false, notes:[
        "🏁 La stratégie de jour de course est désormais identique partout dans l'app",
        "🎂 Nouveau champ date de naissance complète — affiche ta catégorie d'âge officielle FFA, et te souhaite ton anniversaire",
        "😓 Le ressenti (RPE) affiche maintenant clairement son niveau au moment où tu le sélectionnes",
      ]},
      { ver:"v2.12", title:"Historique de plan figé, Modules 3 & 4 du moteur, RPE unifié", current:false, notes:[
        "🗂️ Chaque plan créé garde désormais une copie figée de sa version d'origine",
        "🧠 Deux nouveaux modules du moteur de décision : bilan hebdomadaire complet et détection de tendances sur plusieurs semaines",
        "😓 Le ressenti (RPE) se note maintenant directement sur chaque séance validée, alimentant vraiment le calcul de fatigue",
        "🏷️ Le statut de séance \"Adaptée\" (⚠️) est renommé \"Partiel\"",
      ]},
      { ver:"v2.11", title:"Module 2 du moteur (analyse de séance) & garde-fous anti-régénération", current:false, notes:[
        "🧠 Nouveau module du moteur de décision : chaque séance de qualité réalisée est comparée à ce qui était prévu",
        "🎯 Catalogue de règles étoffé : ACWR élevé, tendance de fatigue en hausse, séances planifiées ratées coup sur coup",
        "🛡️ Garde-fou important : aucune régénération de plan ne peut modifier rétroactivement une séance déjà passée",
      ]},
      { ver:"v2.10", title:"Moteur de décision — unification ACWR, coach connecté, garde-fous", current:false, notes:[
        "🧠 Le coach IA lit maintenant l'état réel du moteur de décision, au lieu d'un calcul de charge séparé",
        "🛡️ Deux garde-fous ajoutés au moteur : réduction individuelle plafonnée à -30%, cumul sur 14 jours plafonné à 25%",
        "⚕️ Nouveaux champs de profil optionnels : FC repos et sexe, pour affiner le calcul de charge d'entraînement",
      ]},
      { ver:"v2.9", title:"Navigation du wizard, sécurité des comptes & Strava réparé", current:false, notes:[
        "🧭 Navigation par flèches en haut du wizard, à la place du bouton \"Continuer\" en bas",
        "🎯 Prochain palier marche-course affiché en permanence sur le dashboard",
        "🔐 Correctif de sécurité important : déconnexion nettoyant désormais toutes les données locales",
      ]},
      { ver:"v2.8", title:"Grand débutant, plans multiples & fiabilité Supabase", current:false, notes:[
        "🚶 Nouveau niveau \"Je n'ai jamais couru\" : séances marche-course progressives, rattachées au Mode Forme",
        "👤 Niveau et profil déplacés dans Réglages — plus jamais redemandés à chaque nouveau plan",
        "🔐 Option de suppression de compte, depuis l'écran de connexion",
      ]},
      { ver:"v2.7", title:"Yoria — nouvelle identité et thème clair/sombre", current:false, notes:[
        "🎨 Nouveau nom et nouvelle identité visuelle",
        "☀️🌙 Choix du thème clair ou sombre, dans Paramètres",
      ]},
      { ver:"v2.6", title:"Mode Forme, clôture de plan & fiabilité du coach", current:false, notes:[
        "💓 Mode Forme : plan d'entraînement sans date de course, pour le maintien en forme",
        "🔒 Clôture définitive d'un plan Forme, pour pouvoir planifier un objectif course à sa suite",
        "🚦 Un seul plan actif à la fois (course ou forme) — garde-fou anti-chevauchement généralisé",
      ]},
      { ver:"v2.5", title:"Authentification Supabase, multi-appareils & synchro temps réel", current:false, notes:[
        "🔐 Connexion par compte (email + mot de passe), préparation Play Store",
        "☁️ Données synchronisées sur Supabase en plus du Gist",
        "⚡ Synchronisation temps réel entre appareils",
      ]},
      { ver:"v2.0-v2.3", title:"Moteur générique multi-distances, profil coureur global", current:false, notes:[
        "🎯 Plans générés pour 5K/10K/Semi/Marathon (plus seulement 10K)",
        "👤 Profil coureur mémorisé une fois pour toutes",
        "🏁 Wizard de configuration dédié, séparé de l'app principale",
      ]},
      { ver:"v1.0-v1.9.3", title:"Fondations de l'app (lancement à mi-2026)", current:false, notes:[
        "🚀 Lancement du plan 11 semaines et du suivi de séances",
        "🔗 Connexion Strava et sauvegarde cloud",
        "🎯 Prédicteur 10K basé sur les séances validées",
        "🤖 Message quotidien du coach",
      ]},
    ];
