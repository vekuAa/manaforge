import { NextResponse } from "next/server";

const SCRYFALL_HEADERS = {
  "User-Agent": "ManaForge/1.0 (+https://manaforge-five.vercel.app)",
  Accept: "application/json",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Nom de carte manquant." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
      {
        headers: SCRYFALL_HEADERS,
        next: { revalidate: 60 * 60 * 24 },
      },
    );

    if (!response.ok) {
      const status = response.status;
      const message =
        status === 429
          ? "Scryfall limite temporairement les requêtes. Réessaie dans une minute."
          : "Carte introuvable sur Scryfall.";

      return NextResponse.json({ error: message }, { status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur Scryfall." }, { status: 500 });
  }
}
