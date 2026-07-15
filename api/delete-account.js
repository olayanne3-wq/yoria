// Yoria — api/delete-account.js
// Route serverless : supprime définitivement un compte Supabase (auth +
// toutes ses données via cascade sur user_id, cf. schéma des tables
// profiles/plans/integrations). Ajoutée le 14/07/2026 pour permettre à
// Laurent de retester le flow d'inscription/onboarding sans accumuler de
// comptes de test.
//
// Nécessite une variable d'environnement supplémentaire sur Vercel
// (Project Settings → Environment Variables), EN PLUS de SUPABASE_URL déjà
// présente pour api/config.js :
//   SUPABASE_SERVICE_ROLE_KEY = eyJhbGci... (clé "service_role", PAS "anon")
//
// Cette clé donne un accès total à la base — ne JAMAIS l'exposer côté
// client (contrairement à SUPABASE_ANON_KEY dans api/config.js). Elle
// n'est utilisée qu'ici, côté serveur, jamais renvoyée dans une réponse.
//
// Sécurité : le endpoint exige le token d'accès de l'utilisateur lui-même
// (Authorization: Bearer <access_token>) plutôt qu'un simple userId dans le
// corps de la requête — sans ça, n'importe qui connaissant un UUID pourrait
// supprimer le compte de quelqu'un d'autre. Le token est d'abord vérifié
// via l'API Supabase (récupère l'utilisateur qu'il représente réellement),
// puis SEUL cet utilisateur authentifié est supprimé — jamais un userId
// fourni séparément dans le corps.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée, utiliser POST.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[delete-account] Variables d\'environnement manquantes (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!accessToken) {
    return res.status(401).json({ error: 'Token d\'authentification manquant.' });
  }

  try {
    // 1. Vérifie le token et récupère l'utilisateur qu'il représente
    //    réellement — jamais confiance dans un userId fourni par le client.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SERVICE_ROLE_KEY
      }
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
    const user = await userRes.json();
    if (!user?.id) {
      return res.status(401).json({ error: 'Impossible de déterminer l\'utilisateur.' });
    }

    // 2. Supprime le compte via l'Admin API (clé service_role uniquement).
    //    Les données applicatives (profiles/plans/integrations) sont
    //    supprimées en cascade si les clés étrangères sont configurées
    //    avec ON DELETE CASCADE côté schéma Supabase — sinon elles
    //    resteraient orphelines (non vérifié dans cette route, à contrôler
    //    séparément si des données persistent après suppression).
    const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error('[delete-account] Échec suppression Supabase:', deleteRes.status, errText);
      return res.status(502).json({ error: 'Échec de la suppression côté Supabase.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-account] Erreur inattendue:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
