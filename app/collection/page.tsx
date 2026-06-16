/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";

type CollectionCard = {
  id: number;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  typeLine?: string;
};

type ScryfallCard = {
  name: string;
  type_line?: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { eur?: string | null; usd?: string | null };
};

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [cardName, setCardName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("manaforge-collection");
      setCards(saved ? (JSON.parse(saved) as CollectionCard[]) : []);
    } catch {
      setCards([]);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem("manaforge-collection", JSON.stringify(cards));
  }, [cards, hasLoaded]);

  const stats = useMemo(() => {
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = cards.length;
    const totalValue = cards.reduce(
      (sum, card) => sum + card.quantity * card.price,
      0
    );

    return {
      totalCards,
      uniqueCards,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }, [cards]);

  const filteredCards = cards.filter((card) =>
    card.name.toLowerCase().includes(search.toLowerCase())
  );

  async function addCard() {
    const cleanName = cardName.trim();

    if (!cleanName) {
      setError("Entre le nom d’une carte.");
      return;
    }

    try {
      setIsAdding(true);
      setError("");

      const response = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
          cleanName
        )}`
      );

      if (!response.ok) {
        throw new Error("Carte introuvable sur Scryfall.");
      }

      const data = (await response.json()) as ScryfallCard;

      const image =
        data.image_uris?.normal ||
        data.card_faces?.[0]?.image_uris?.normal ||
        "";

      const price = Number(data.prices?.eur || data.prices?.usd || 0);

      setCards((current) => {
        const existing = current.find(
          (card) => card.name.toLowerCase() === data.name.toLowerCase()
        );

        if (existing) {
          return current.map((card) =>
            card.id === existing.id
              ? { ...card, quantity: card.quantity + quantity }
              : card
          );
        }

        return [
          ...current,
          {
            id: Date.now(),
            name: data.name,
            image,
            quantity,
            price,
            typeLine: data.type_line || "",
          },
        ];
      });

      setCardName("");
      setQuantity(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur pendant l’ajout."
      );
    } finally {
      setIsAdding(false);
    }
  }

  function updateQuantity(id: number, amount: number) {
    setCards((current) =>
      current
        .map((card) =>
          card.id === id
            ? { ...card, quantity: Math.max(0, card.quantity + amount) }
            : card
        )
        .filter((card) => card.quantity > 0)
    );
  }

  function deleteCard(id: number) {
    setCards((current) => current.filter((card) => card.id !== id));
  }

  if (!hasLoaded) {
    return (
      <main className="page">
        <section className="container-app pb-24">
          <p className="text-muted">Chargement...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container-app pb-28">
        <header>
          <Link href="/" className="text-3xl font-black">
            ←
          </Link>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
              ManaForge
            </p>

            <h1 className="mt-2 text-4xl font-black text-accent">
              Collection
            </h1>

            <p className="mt-2 text-muted">
              Suis tes cartes, quantités et valeur estimée.
            </p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <StatCard label="Cartes" value={stats.totalCards} />
          <StatCard label="Uniques" value={stats.uniqueCards} />
          <StatCard label="Valeur" value={`${stats.totalValue}€`} />
        </div>

        <div className="mt-6 card-premium p-5">
          <h2 className="text-xl font-black">Ajouter une carte</h2>

          <div className="mt-5 space-y-3">
            <input
              value={cardName}
              onChange={(event) => setCardName(event.target.value)}
              placeholder="Sol Ring, Atraxa, Cyclonic Rift..."
              className="input-premium"
            />

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.target.value)))
                }
                className="input-premium"
              />

              <button
                onClick={addCard}
                disabled={isAdding}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {isAdding ? "..." : "Ajouter"}
              </button>
            </div>

            {error && (
              <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher dans la collection"
            className="input-premium"
          />
        </div>

        <div className="mt-5 grid gap-3">
          {filteredCards.length === 0 ? (
            <div className="card-soft p-5 text-center text-muted">
              Aucune carte dans ta collection.
            </div>
          ) : (
            filteredCards.map((card) => (
              <div key={card.id} className="card-soft p-4">
                <div className="flex gap-4">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="h-24 w-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-16 items-center justify-center rounded-xl bg-black/30 text-2xl">
                      🎴
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black">
                      {card.name}
                    </h3>

                    <p className="mt-1 line-clamp-1 text-xs text-muted">
                      {card.typeLine}
                    </p>

                    <p className="mt-2 text-sm font-bold text-accent">
                      {card.price}€ / carte ·{" "}
                      {Math.round(card.price * card.quantity * 100) / 100}€
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(card.id, -1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl font-black"
                        >
                          −
                        </button>

                        <span className="text-xl font-black">
                          x{card.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(card.id, 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-xl font-black text-accent"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => deleteCard(card.id)}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-black text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center">
      <p className="text-2xl font-black text-accent">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}