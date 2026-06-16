/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";

type ScryfallCard = {
  name: string;
  mana_cost?: string;
  oracle_text?: string;
  printed_text?: string;
  printed_name?: string;
  scryfall_uri: string;
  image_uris?: {
    normal?: string;
  };
  card_faces?: {
    oracle_text?: string;
    printed_text?: string;
    image_uris?: {
      normal?: string;
    };
  }[];
};

const colors = [
  { id: "W", icon: "⚪", label: "Blanc" },
  { id: "U", icon: "🔵", label: "Bleu" },
  { id: "B", icon: "⚫", label: "Noir" },
  { id: "R", icon: "🔴", label: "Rouge" },
  { id: "G", icon: "🟢", label: "Vert" },
];

export default function CommanderPage() {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleColor(color: string) {
    setSelectedColors((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : [...current, color]
    );
  }

  async function getRandomCommander() {
    try {
      setIsLoading(true);
      setError("");

      const colorQuery =
        selectedColors.length > 0
          ? ` id=${selectedColors.sort().join("")}`
          : "";

      const query = `type:legendary type:creature legal:commander lang:fr${colorQuery}`;

      const response = await fetch(
        `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent": "ManaForge/1.0",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Aucun commandant trouvé avec ces couleurs.");
      }

      const data = (await response.json()) as ScryfallCard;
      setCard(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de récupérer un commandant."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const image =
    card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.normal;

  const name = card ? card.printed_name || card.name : "Aucun commandant";

  const text =
    card?.printed_text ||
    card?.oracle_text ||
    card?.card_faces?.[0]?.printed_text ||
    card?.card_faces?.[0]?.oracle_text ||
    "Choisis tes couleurs puis génère un commandant.";

  return (
    <main className="page h-[100dvh] overflow-hidden">
      <section className="container-app flex h-full flex-col pb-24">
        <header className="shrink-0">
          <Link href="/" className="text-3xl font-black">
            ←
          </Link>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted">
              Commander / EDH
            </p>

            <h1 className="mt-1 text-3xl font-black text-accent">
              Random Commander
            </h1>
          </div>
        </header>

        <div className="mt-4 shrink-0 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted">
            Filtre couleurs
          </p>

          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => {
              const selected = selectedColors.includes(color.id);

              return (
                <button
                  key={color.id}
                  onClick={() => toggleColor(color.id)}
                  className={`rounded-2xl py-3 text-xl font-black transition ${
                    selected
                      ? "border-2 border-accent bg-accent text-white shadow-[0_0_20px_rgba(255,170,80,0.45)]"
                      : "border border-white/10 bg-white/10 text-white"
                  }`}
                  title={color.label}
                >
                  {color.icon}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-[2rem] border border-white/10 bg-black/25 p-4">
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="w-[44%] shrink-0">
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className="h-full max-h-[46vh] w-full rounded-2xl object-contain shadow-2xl"
                />
              ) : (
                <div className="flex h-full max-h-[46vh] items-center justify-center rounded-2xl bg-white/10 text-5xl">
                  🎴
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Commandant
              </p>

              <h2 className="mt-1 text-xl font-black leading-tight text-accent">
                {name}
              </h2>

              {card?.mana_cost && (
                <p className="mt-1 text-sm font-bold text-white">
                  {card.mana_cost}
                </p>
              )}

              <p className="mt-3 max-h-[30vh] overflow-y-auto whitespace-pre-line text-xs leading-5 text-slate-300">
                {text}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 shrink-0 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 grid shrink-0 grid-cols-2 gap-3">
          <button
            onClick={getRandomCommander}
            disabled={isLoading}
            className="btn-primary text-center disabled:opacity-50"
          >
            {isLoading ? "Recherche..." : "🎲 Générer"}
          </button>

          {card ? (
            <a
              href={card.scryfall_uri}
              target="_blank"
              rel="noreferrer"
              className="btn-soft text-center"
            >
              Scryfall ↗
            </a>
          ) : (
            <button className="btn-soft text-center opacity-50" disabled>
              Scryfall ↗
            </button>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}