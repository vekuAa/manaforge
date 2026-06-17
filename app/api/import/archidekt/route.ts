import { NextResponse } from "next/server";

function extractArchidektId(value: string) {
  const clean = value.trim();
  const direct = clean.match(/^\d+$/);
  if (direct) return direct[0];
  const match = clean.match(/archidekt\.com\/decks\/(\d+)/i);
  return match?.[1] ?? null;
}

async function fetchArchidekt(deckId: string) {
  const endpoints = [
    `https://archidekt.com/api/decks/${deckId}/`,
    `https://archidekt.com/api/decks/${deckId}`,
  ];

  let lastStatus = 0;
  let lastText = "";

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          accept: "application/json,text/plain,*/*",
          "user-agent": "ManaForge/1.0 (+https://manaforge-five.vercel.app)",
          referer: "https://archidekt.com/",
        },
      });

      lastStatus = response.status;

      if (response.ok) {
        return await response.json();
      }

      lastText = await response.text().catch(() => "");
    } catch (error) {
      lastText = error instanceof Error ? error.message : "Fetch Archidekt failed";
    } finally {
      clearTimeout(timeout);
    }
  }

  const message =
    lastStatus === 403 || lastStatus === 404
      ? "Deck Archidekt introuvable ou privé. Vérifie que le deck est public."
      : lastStatus === 429
        ? "Archidekt limite temporairement les imports. Réessaie dans quelques minutes."
        : `Import Archidekt impossible${lastStatus ? ` (${lastStatus})` : ""}. ${lastText}`;

  throw new Error(message);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deckId?: string; url?: string };
    const deckId = extractArchidektId(body.deckId || body.url || "");

    if (!deckId) {
      return NextResponse.json({ error: "URL ou ID Archidekt invalide." }, { status: 400 });
    }

    const deck = await fetchArchidekt(deckId);
    return NextResponse.json(deck);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur pendant l'import Archidekt." },
      { status: 502 },
    );
  }
}
