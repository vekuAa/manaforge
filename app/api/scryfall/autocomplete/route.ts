import { NextResponse } from "next/server";

const SCRYFALL_HEADERS = {
  "User-Agent": "ManaForge/1.0 (+https://manaforge-five.vercel.app)",
  Accept: "application/json",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`,
      {
        headers: SCRYFALL_HEADERS,
        next: { revalidate: 60 * 60 },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
