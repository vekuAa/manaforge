import { NextResponse } from "next/server";

type SpellbookResponse = {
  results?: unknown[];
};

export async function GET() {
  try {
    const response = await fetch(
      "https://backend.commanderspellbook.com/variants/?limit=100",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ManaForge/1.0",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Commander Spellbook erreur ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as SpellbookResponse;
    const combos = Array.isArray(data.results) ? data.results : [];

    if (combos.length === 0) {
      return NextResponse.json(
        { error: "Aucune combo trouvée." },
        { status: 404 },
      );
    }

    const randomCombo = combos[Math.floor(Math.random() * combos.length)];

    return NextResponse.json(randomCombo);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur serveur Commander Spellbook.",
      },
      { status: 500 },
    );
  }
}