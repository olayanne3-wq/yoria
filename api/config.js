// Run by Léa — api/config.js
// Route serverless Vercel exposant la config publique (clé anon Supabase,
// publique par conception) depuis de vraies variables d'environnement,
// plutôt qu'en dur dans le code client. Ajoutée le 13 juillet 2026.
//
// Variables à définir sur Vercel (Project Settings → Environment Variables) :
//   SUPABASE_URL       = https://oppwuzbcnhchtokxpzla.supabase.co
//   SUPABASE_ANON_KEY   = eyJhbGci...
//
// N'expose JAMAIS la clé service_role ici — uniquement anon (publique).

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h, ces valeurs changent rarement
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
}
