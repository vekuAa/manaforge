import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createImageHash, hammingDistance } from "@/lib/imageHash";

type FingerprintRow = {
  scryfall_id: string;
  name: string;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  image: string | null;
  price: number | null;
  hash: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Variables Supabase admin manquantes.");
  }

  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image manquante." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const scannedHash = await createImageHash(buffer);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("card_fingerprints")
      .select(
        "scryfall_id,name,set_code,set_name,collector_number,image,price,hash",
      )
      .limit(5000)
      .returns<FingerprintRow[]>();

    if (error) throw error;

    const candidates = data || [];

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "Aucune carte indexée. Indexe d’abord un set." },
        { status: 404 },
      );
    }

    const ranked = candidates
      .map((card) => ({
        ...card,
        distance: hammingDistance(scannedHash, card.hash),
      }))
      .sort((a, b) => a.distance - b.distance);

    const best = ranked[0];

    const confidence = Math.max(
      0,
      Math.round((1 - best.distance / scannedHash.length) * 100),
    );

    return NextResponse.json({
      card: {
        scryfallId: best.scryfall_id,
        name: best.name,
        setCode: best.set_code,
        setName: best.set_name,
        collectorNumber: best.collector_number,
        image: best.image,
        price: Number(best.price || 0),
        confidence,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur reconnaissance carte.",
      },
      { status: 500 },
    );
  }
}