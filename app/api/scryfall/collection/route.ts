import { NextResponse } from "next/server";

type RequestCard = {
  name: string;
};

const SCRYFALL_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "ManaForge/1.0 (+https://manaforge-five.vercel.app)",
  Accept: "application/json",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cards = Array.isArray(body.cards) ? (body.cards as RequestCard[]) : [];

    if (cards.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Scryfall limite l'endpoint /cards/collection à 75 identifiants par requête.
    // Cette route accepte plus de cartes et les découpe automatiquement.
    const chunks: RequestCard[][] = [];
    for (let index = 0; index < cards.length; index += 75) {
      chunks.push(cards.slice(index, index + 75));
    }

    const data: unknown[] = [];
    const notFound: unknown[] = [];

    for (const chunk of chunks) {
      const identifiers = chunk.map((card) => ({ name: card.name }));

      const response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: SCRYFALL_HEADERS,
        body: JSON.stringify({ identifiers }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Erreur Scryfall collection." },
          { status: response.status },
        );
      }

      const result = await response.json();
      if (Array.isArray(result.data)) data.push(...result.data);
      if (Array.isArray(result.not_found)) notFound.push(...result.not_found);
    }

    return NextResponse.json({ data, not_found: notFound });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur Scryfall." },
      { status: 500 },
    );
  }
}
