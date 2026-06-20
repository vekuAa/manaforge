import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createImageHash,
  getHashPrefix,
  hammingDistance,
} from "@/lib/imageHash";

type FingerprintRow = {
  scryfall_id: string;
  name: string;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  image: string | null;
  price: number | null;
  hash: string;
  hash_prefix: string | null;
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
    const prefix = getHashPrefix(scannedHash);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("card_fingerprints")
      .select(
        "scryfall_id,name,set_code,set_name,collector_number,image,price,hash,hash_prefix",
      )
      .eq("hash_prefix", prefix)
      .limit(1000)
      .returns<FingerprintRow[]>();

    if (error) throw error;

    let candidates = data || [];

    if (candidates.length < 10) {
      const fallback = await supabase
        .from("card_fingerprints")
        .select(
          "scryfall_id,name,set_code,set_name,collector_number,image,price,hash,hash_prefix",
        )
        .limit(5000)
        .returns<FingerprintRow[]>();

      if (fallback.error) throw fallback.error;
      candidates = fallback.data || [];
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "Aucune carte indexée." },
        { status: 404 },
      );
    }

    const matches = candidates
      .map((card) => {
        const distance = hammingDistance(scannedHash, card.hash);
        const confidence = Math.max(
          0,
          Math.round((1 - distance / scannedHash.length) * 100),
        );

        return {
          scryfallId: card.scryfall_id,
          name: card.name,
          setCode: card.set_code,
          setName: card.set_name,
          collectorNumber: card.collector_number,
          image: card.image,
          price: Number(card.price || 0),
          distance,
          confidence,
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    return NextResponse.json({
      card: matches[0],
      matches,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur reconnaissance carte.",
      },
      { status: 500 },
    );
  }
}