// KyzenDay — assistant IA (Google Gemini, tier gratuit).
//
// Reçoit une question + un résumé DÉJÀ CALCULÉ des données de l'utilisateur,
// et demande à Gemini de formuler une réponse en langage naturel. L'IA ne
// recalcule jamais les chiffres (c'est l'app qui les fournit) : consigne
// explicite dans le system prompt.
//
// La clé Gemini reste côté serveur (secret GEMINI_API_KEY), jamais dans le
// navigateur. Le JWT de l'appelant est vérifié pour ne pas laisser n'importe
// qui consommer le quota.
//
// Déploiement : Supabase → Edge Functions → New function → nom "assistant"
// → coller ce fichier → Deploy. Puis Settings → Secrets → ajouter
// GEMINI_API_KEY = (ta clé créée sur https://aistudio.google.com/apikey).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

// Liste de modèles par ordre de préférence. On met le modèle « lite » en
// premier : c'est le plus rapide et le moins sollicité (donc le moins
// souvent saturé), et il suffit largement pour lire des chiffres déjà
// calculés et répondre. Si un modèle est saturé/indisponible, on bascule
// automatiquement sur le suivant.
const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

// generateContent (réponse complète, sans streaming) : le mode « flux » du
// tier gratuit est très bridé et renvoie des 503 en boucle ; le mode normal
// a bien plus de capacité. On perd l'affichage mot à mot mais l'assistant
// répond de façon fiable (et le modèle « lite » est rapide).
function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

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

const SYSTEM_PROMPT = `Tu es l'assistant personnel de KyzenDay, une application de suivi de travail
pour une aide à domicile (auxiliaire de santé) intérimaire. Tu réponds en français, de façon
concise, chaleureuse et directe, comme un collègue efficace.

RÈGLES ABSOLUES :
- Utilise UNIQUEMENT les données JSON fournies dans le message. Elles sont déjà calculées
  par l'application (heures, jours travaillés, km, budget) : NE RECALCULE JAMAIS un total
  toi-même, réutilise les chiffres tels quels.
- Si l'information demandée n'est pas dans les données, dis-le clairement plutôt que d'inventer.
  Ne devine jamais un chiffre, surtout pour le salaire ou l'argent.
- Les montants ont une devise (EUR, CHF…) : précise-la toujours.
- "jours_travailles" compte les journées distinctes (un jour avec plusieurs services = 1 jour).
- Sois bref : réponds à la question posée, sans rappeler toutes les données.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    // Vérifie que l'appelant est bien connecté (protège le quota Gemini).
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await asUser.auth.getUser();
    if (userError || !userData.user) return json({ error: "Non authentifié." }, 401);

    if (!GEMINI_API_KEY) {
      return json({ error: "L'assistant n'est pas encore configuré (clé Gemini manquante)." }, 503);
    }

    const { question, context, history } = await req.json();
    if (!question || typeof question !== "string") {
      return json({ error: "Question manquante." }, 400);
    }

    // Historique de conversation (quelques échanges précédents) pour le suivi.
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn?.role === "user" && typeof turn.text === "string") {
          contents.push({ role: "user", parts: [{ text: turn.text }] });
        } else if (turn?.role === "assistant" && typeof turn.text === "string") {
          contents.push({ role: "model", parts: [{ text: turn.text }] });
        }
      }
    }

    // Le dernier tour : la question + les données calculées de l'app.
    contents.push({
      role: "user",
      parts: [
        {
          text:
            `Données actuelles de l'utilisateur (déjà calculées, ne les recalcule pas) :\n` +
            `${JSON.stringify(context ?? {}, null, 0)}\n\n` +
            `Question : ${question}`,
        },
      ],
    });

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    });

    // On essaie chaque modèle dans l'ordre, avec un réessai en cas de 503/500
    // passager (« modèle très demandé »). Dès qu'un modèle répond, on prend sa
    // réponse. On s'arrête net sur une erreur de clé (401/403) ou de requête
    // (400) : changer de modèle n'y changerait rien.
    let answer = "";
    let lastStatus = 0;
    let lastDetail = "";
    outer:
    for (const model of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fetch(geminiUrl(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
          body: requestBody,
        });
        if (res.ok) {
          const data = await res.json();
          answer = data?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("") ?? "";
          if (answer.trim()) break outer;
          lastStatus = 200;
          lastDetail = "réponse vide";
          break; // modèle suivant
        }
        lastStatus = res.status;
        lastDetail = await res.text();
        if (res.status === 400 || res.status === 401 || res.status === 403) break outer;
        const retryable = res.status === 503 || res.status === 500;
        if (retryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
          continue; // on retente le même modèle une fois
        }
        break; // modèle suivant
      }
    }

    if (!answer.trim()) {
      // 429 = quota du tier gratuit atteint ; 503 = modèles momentanément saturés.
      if (lastStatus === 429) {
        return json({ error: "Trop de questions d'un coup — réessaie dans une minute." }, 429);
      }
      if (lastStatus === 503) {
        return json(
          { error: "Les modèles IA gratuits sont très demandés là — réessaie dans un instant.", detail: lastDetail },
          503,
        );
      }
      return json({ error: `Erreur de l'assistant (${lastStatus}).`, detail: lastDetail }, 502);
    }

    // Réponse complète renvoyée en texte brut (le client l'affiche telle quelle).
    return new Response(answer, {
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur." }, 500);
  }
});
