// KyzenDay — suppression définitive du compte de l'utilisateur connecté.
//
// Supprimer un compte Supabase Auth requiert la clé service_role (un
// client normal ne peut pas s'auto-supprimer) : c'est pourquoi ça passe
// par une fonction Edge, jamais directement depuis le navigateur.
// Toutes les données (journées, budget, planning, logos…) sont
// automatiquement effacées par les contraintes "on delete cascade" des
// tables vers auth.users — rien d'autre à faire ici.
//
// Déploiement : Supabase → Edge Functions → New function → nom
// "delete-account" → coller ce fichier → Deploy.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await asUser.auth.getUser();
    if (userError || !userData.user) return json({ error: "Non authentifié." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur." }, 500);
  }
});
