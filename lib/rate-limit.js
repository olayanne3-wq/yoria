// Module partagé — rate limiting générique par IP, basé sur une table
// Supabase dédiée. Factorisé pour être réutilisé par api/beta.js
// (soumission de candidature) et api/beta-admin.js (connexion admin),
// deux contextes différents mais la même mécanique — plutôt que de
// dupliquer la logique deux fois (cf. leçon du module d'email
// d'invitation, déjà factorisé pour la même raison).
//
// Chaque appelant doit avoir sa propre table Supabase dédiée (schéma
// identique : ip text primary key, nombre_tentatives integer,
// premiere_tentative_le timestamptz, derniere_tentative_le timestamptz),
// passée en paramètre — pas de table partagée entre plusieurs politiques
// de rate limiting distinctes, pour rester simple à faire évoluer
// indépendamment.

// Extrait l'IP réelle du visiteur — Vercel transmet la vraie IP via
// x-forwarded-for (peut contenir plusieurs IP séparées par une virgule si
// plusieurs proxys intermédiaires, la première est celle du client
// d'origine). Repli sur une valeur fixe si l'en-tête est absent — cas
// très improbable derrière Vercel, mais un repli sûr par défaut plutôt
// que de planter.
export function extraireIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "ip-inconnue";
}

// Vérifie et incrémente le compteur de tentatives pour une IP donnée, sur
// la table et avec la politique (fenêtre, max) passées en paramètres.
// Retourne { autorise: true } si la tentative peut continuer, ou
// { autorise: false, reessayerDansMs } si la limite est atteinte. En cas
// d'erreur Supabase (table absente, réseau, etc.), autorise=true par
// défaut — un rate limiting qui échoue ne doit jamais bloquer l'accès
// légitime, seulement le protéger quand il fonctionne.
export async function verifierEtIncrementerTentative(config, table, ip, fenetreMs, maxTentatives) {
  try {
    const maintenant = Date.now();

    const lectureRes = await fetch(
      `${config.supabaseUrl}/rest/v1/${table}?ip=eq.${encodeURIComponent(ip)}&select=*`,
      {
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
        },
      },
    );

    if (!lectureRes.ok) {
      console.warn(`Lecture rate limit (${table}) échouée, tentative autorisée par défaut.`);
      return { autorise: true };
    }

    const lignes = await lectureRes.json();
    const ligne = Array.isArray(lignes) ? lignes[0] : null;

    if (!ligne) {
      await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          ip,
          nombre_tentatives: 1,
          premiere_tentative_le: new Date(maintenant).toISOString(),
          derniere_tentative_le: new Date(maintenant).toISOString(),
        }),
      });
      return { autorise: true };
    }

    const premiereTentativeMs = new Date(ligne.premiere_tentative_le).getTime();
    const fenetreExpiree = maintenant - premiereTentativeMs > fenetreMs;

    if (fenetreExpiree) {
      await fetch(
        `${config.supabaseUrl}/rest/v1/${table}?ip=eq.${encodeURIComponent(ip)}`,
        {
          method: "PATCH",
          headers: {
            apikey: config.supabaseKey,
            Authorization: `Bearer ${config.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            nombre_tentatives: 1,
            premiere_tentative_le: new Date(maintenant).toISOString(),
            derniere_tentative_le: new Date(maintenant).toISOString(),
          }),
        },
      );
      return { autorise: true };
    }

    if (ligne.nombre_tentatives >= maxTentatives) {
      const reessayerDansMs = fenetreMs - (maintenant - premiereTentativeMs);
      return { autorise: false, reessayerDansMs };
    }

    await fetch(
      `${config.supabaseUrl}/rest/v1/${table}?ip=eq.${encodeURIComponent(ip)}`,
      {
        method: "PATCH",
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          nombre_tentatives: ligne.nombre_tentatives + 1,
          derniere_tentative_le: new Date(maintenant).toISOString(),
        }),
      },
    );

    return { autorise: true };
  } catch (erreur) {
    console.warn(`Erreur rate limiting (${table}), tentative autorisée par défaut :`, erreur.message);
    return { autorise: true };
  }
}

// Réinitialise le compteur pour une IP — utile par exemple après une
// connexion admin réussie (évite de pénaliser des tentatives futures
// après une erreur de frappe initiale). Pas utilisé côté formulaire
// public (une candidature réussie ne justifie pas de remettre le
// compteur à zéro, contrairement à une connexion — le but ici est de
// limiter le NOMBRE de candidatures par IP, réussies ou non).
export async function reinitialiserTentatives(config, table, ip) {
  try {
    await fetch(
      `${config.supabaseUrl}/rest/v1/${table}?ip=eq.${encodeURIComponent(ip)}`,
      {
        method: "DELETE",
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          Prefer: "return=minimal",
        },
      },
    );
  } catch (erreur) {
    console.warn(`Réinitialisation rate limit (${table}) échouée (non bloquant) :`, erreur.message);
  }
}
