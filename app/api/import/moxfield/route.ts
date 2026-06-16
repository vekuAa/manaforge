import { NextResponse } from "next/server";

type ImportBody = {
  deckId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportBody;

    if (!body.deckId) {
      return NextResponse.json(
        { error: "deckId manquant" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api2.moxfield.com/v2/decks/all/${body.deckId}`,
      {
        headers: {
          "User-Agent": "Manaforge/1.0",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Deck Moxfield introuvable ou privé" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur pendant l'import Moxfield" },
      { status: 500 }
    );
  }
}