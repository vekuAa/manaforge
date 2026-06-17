import { NextResponse } from "next/server";

type RequestCard = {
  name: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cards = Array.isArray(body.cards) ? (body.cards as RequestCard[]) : [];

    if (cards.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const identifiers = cards.slice(0, 75).map((card) => ({
      name: card.name,
    }));

    const response = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ManaForge/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify({
        identifiers,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erreur Scryfall collection." },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur Scryfall." },
      { status: 500 }
    );
  }
}