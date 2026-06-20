import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createImageHash } from "@/lib/imageHash";

type ScryfallCard = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { eur?: string | null; usd?: string | null };
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Variables Supabase admin manquantes.");
  }

  return createClient(url, key);
}

function getImage(card: ScryfallCard) {
  return (
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    ""
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setCode = searchParams.get("set")?.trim().toLowerCase();

  if (!setCode) {
    return NextResponse.json({ error: "Code set manquant." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let url = `https://api.scryfall.com/cards/search?q=e:${encodeURIComponent(
    setCode,
  )}&unique=prints&order=set`;

  const indexed = [];

  while (url) {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Set introuvable sur Scryfall." },
        { status: 404 },
      );
    }

    const data = await response.json();
    const cards = (data.data || []) as ScryfallCard[];

    for (const card of cards) {
      const image = getImage(card);
      if (!image) continue;

      try {
        const imageResponse = await fetch(image);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const hash = await createImageHash(buffer);

        const price = Number(card.prices?.eur || card.prices?.usd || 0);

        const { error } = await supabase.from("card_fingerprints").upsert(
          {
            scryfall_id: card.id,
            name: card.name,
            set_code: card.set,
            set_name: card.set_name,
            collector_number: card.collector_number,
            image,
            price,
            hash,
          },
          { onConflict: "scryfall_id" },
        );

        if (!error) indexed.push(card.name);
      } catch {
        // ignore carte ratée
      }
    }

    url = data.has_more && data.next_page ? data.next_page : "";
  }

  return NextResponse.json({
    success: true,
    set: setCode,
    indexed: indexed.length,
  });
}