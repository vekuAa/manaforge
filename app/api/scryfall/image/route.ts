import { NextResponse } from "next/server";

type ScryfallCard = {
  image_uris?: {
    normal?: string;
  };
  card_faces?: {
    image_uris?: {
      normal?: string;
    };
  }[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Nom manquant." }, { status: 400 });
  }

  const response = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
    {
      headers: {
        "User-Agent": "ManaForge/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 },
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  const card = (await response.json()) as ScryfallCard;
  const image =
    card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;

  if (!image) {
    return NextResponse.json({ error: "Image indisponible." }, { status: 404 });
  }

  return NextResponse.redirect(image);
}