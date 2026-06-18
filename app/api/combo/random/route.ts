import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://backend.commanderspellbook.com/variants/?limit=100"
    );

    const data = await response.json();

    const combos = data.results || [];

    if (!combos.length) {
      return NextResponse.json(
        { error: "Aucune combo trouvée" },
        { status: 404 }
      );
    }

    const random =
      combos[Math.floor(Math.random() * combos.length)];

    return NextResponse.json(random);
  } catch {
    return NextResponse.json(
      { error: "Erreur Spellbook" },
      { status: 500 }
    );
  }
}