import { NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (isRecord(item)) return asString(item.name) || asString(item.label);
      return "";
    })
    .filter(Boolean);
}

function getCardName(item: unknown) {
  if (!isRecord(item)) return "";

  const card = item.card;
  if (isRecord(card)) {
    return asString(card.name);
  }

  return asString(item.name);
}

function normalizeCombo(combo: unknown) {
  if (!isRecord(combo)) return null;

  const id = asString(combo.id) || String(combo.id ?? "");
  const includes = Array.isArray(combo.includes) ? combo.includes : [];
  const cards = includes.map(getCardName).filter(Boolean);

  const uses =
    asStringArray(combo.uses).length > 0
      ? asStringArray(combo.uses)
      : asStringArray(combo.requires);

  const produces =
    asStringArray(combo.produces).length > 0
      ? asStringArray(combo.produces)
      : asStringArray(combo.results);

  return {
    id,
    status: asString(combo.status) || "unknown",
    identity: asString(combo.identity),
    uses,
    produces,
    cards,
    url: id ? `https://commanderspellbook.com/combo/${id}/` : undefined,
  };
}

export async function GET() {
  try {
    const page = Math.floor(Date.now() / 1000) % 25;

    const response = await fetch(
      `https://backend.commanderspellbook.com/variants/?limit=24&offset=${page * 24}`,
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

    const data = (await response.json()) as UnknownRecord;
    const results = Array.isArray(data.results) ? data.results : [];

    const combos = results
      .map(normalizeCombo)
      .filter((combo): combo is NonNullable<typeof combo> => Boolean(combo))
      .filter((combo) => combo.cards.length > 0);

    return NextResponse.json({ combos });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les combos.",
      },
      { status: 500 },
    );
  }
}
