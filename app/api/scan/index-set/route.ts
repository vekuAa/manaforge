import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createImageHash, getHashPrefix } from "@/lib/imageHash";


type ScryfallCard = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_uris?: {
    normal?: string;
  };
  card_faces?: {
    image_uris?: {
      normal?: string;
    };
  }[];
  prices?: {
    eur?: string | null;
    usd?: string | null;
  };
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
  try {
    const { searchParams } = new URL(request.url);

    const setCode = searchParams
      .get("set")
      ?.trim()
      .toLowerCase();

    if (!setCode) {
      return NextResponse.json(
        { error: "Code set manquant." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
      `e:${setCode}`
    )}&unique=prints&order=set`;

    let indexed = 0;
    const errors: string[] = [];

    while (url) {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ManaForge/1.0",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        return NextResponse.json(
          {
            error: "Set introuvable sur Scryfall.",
            details: errorText,
            url,
          },
          { status: 404 }
        );
      }

      const data = await response.json();
      const cards = (data.data || []) as ScryfallCard[];

      for (const card of cards) {
        try {
          const image = getImage(card);

          if (!image) continue;

          const imageResponse = await fetch(image);

          if (!imageResponse.ok) {
            errors.push(`Image introuvable : ${card.name}`);
            continue;
          }

          const buffer = Buffer.from(
            await imageResponse.arrayBuffer()
          );

          const hash = await createImageHash(buffer);

          const price = Number(
            card.prices?.eur ||
              card.prices?.usd ||
              0
          );

          const { error } = await supabase
            .from("card_fingerprints")
            .upsert(
              {
                scryfall_id: card.id,
                name: card.name,
                set_code: card.set,
                set_name: card.set_name,
                collector_number:
                  card.collector_number,
                image,
                price,
                hash,
                hash_prefix: getHashPrefix(hash),
              },
              {
                onConflict: "scryfall_id",
              }
            );

          if (error) {
            errors.push(
              `${card.name}: ${error.message}`
            );
          } else {
            indexed += 1;
          }
        } catch (error) {
          errors.push(
            `${card.name}: ${
              error instanceof Error
                ? error.message
                : "Erreur inconnue"
            }`
          );
        }
      }

      url =
        data.has_more && data.next_page
          ? data.next_page
          : "";
    }

    return NextResponse.json({
      success: true,
      set: setCode,
      indexed,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur indexation.",
      },
      { status: 500 }
    );
  }
}