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

// Liste de modèles par ordre de préférence. Le tout dernier modèle
// (3.x) est le plus demandé, donc souvent saturé (503) sur le tier gratuit :
// on privilégie des modèles 2.5, moins sollicités et amplement suffisants
// pour lire des chiffres déjà calculés et répondre — et plus rapides. Si un
// modèle est saturé ou indisponible, on passe automatiquement au suivant.
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
];

// streamGenerateContent + alt=sse : Gemini renvoie la réponse par morceaux
// (au lieu d'attendre le texte complet), qu'on relaie au navigateur pour un
// affichage progressif « mot à mot ».
function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
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

    // On essaie chaque modèle dans l'ordre : dès qu'un répond, on l'utilise.
    // Si un modèle est saturé (503), surchargé (500), indisponible (404) ou
    // en limite de quota (429), on tente le suivant. On s'arrête net sur une
    // erreur de clé (401/403) ou de requête (400) : changer de modèle n'y
    // changerait rien.
    let geminiRes: Response | null = null;
    let lastStatus = 0;
    let lastDetail = "";
    for (const model of GEMINI_MODELS) {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: requestBody,
      });
      if (res.ok && res.body) {
        geminiRes = res;
        break;
      }
      lastStatus = res.status;
      lastDetail = res.body ? await res.text() : "";
      if (res.status === 400 || res.status === 401 || res.status === 403) break;
      // sinon (404/429/500/503) : on tente le modèle suivant
    }

    if (!geminiRes || !geminiRes.body) {
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

    // Relaie le flux SSE de Gemini au navigateur en texte brut : on extrait
    // seulement le texte de chaque morceau, morceau par morceau.
    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                const text = j?.candidates?.[0]?.content?.parts
                  ?.map((p: { text?: string }) => p.text ?? "")
                  .join("") ?? "";
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                // morceau JSON incomplet : ignoré (le suivant complètera)
              }
            }
          }
        } catch {
          // flux interrompu : on ferme proprement, le client garde ce qu'il a reçu
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur." }, 500);
  }
});
