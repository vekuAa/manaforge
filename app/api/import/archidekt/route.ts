import { NextResponse } from "next/server";

type ImportBody = {
  deckId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportBody;

    if (!body.deckId) {
      return NextResponse.json({ error: "deckId manquant" }, { status: 400 });
    }

    const response = await fetch(
      `https://archidekt.com/api/decks/${body.deckId}/`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Manaforge/1.0",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Deck Archidekt introuvable ou inaccessible",
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur pendant l'import Archidekt" },
      { status: 500 }
    );
  }
}