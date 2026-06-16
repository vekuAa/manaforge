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
  setName?: string;
  setCode?: string;
  rarity?: string;
  folder?: string;
};

type ScryfallCard = {
  name: string;
  type_line?: string;
  set_name?: string;
  set?: string;
  rarity?: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { eur?: string | null; usd?: string | null };
};

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [folders, setFolders] = useState<string[]>(["Toutes", "Commander", "Trade", "Staples"]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [cardName, setCardName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState("Toutes");
  const [newFolder, setNewFolder] = useState("");
const [viewMode, setViewMode] =
  useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("Toutes");
  const [setFilter, setSetFilter] = useState("Toutes");

  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
const [isSearching, setIsSearching] = useState(false);

useEffect(() => {
  const query = cardName.trim();

  if (query.length < 2) {
    setSuggestions([]);
    return;
  }

  const timeout = setTimeout(async () => {
    try {
      setIsSearching(true);

      const response = await fetch(
        `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        setSuggestions([]);
        return;
      }

      const data = await response.json();

      setSuggestions(data.data ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, 250);

  return () => clearTimeout(timeout);
}, [cardName]);

  useEffect(() => {
    try {
      const savedCards = localStorage.getItem("manaforge-collection");
      const savedFolders = localStorage.getItem("manaforge-folders");

      setCards(savedCards ? (JSON.parse(savedCards) as CollectionCard[]) : []);

      if (savedFolders) {
        setFolders(JSON.parse(savedFolders) as string[]);
      }
    } catch {
      setCards([]);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;

    localStorage.setItem("manaforge-collection", JSON.stringify(cards));
    localStorage.setItem("manaforge-folders", JSON.stringify(folders));
  }, [cards, folders, hasLoaded]);

  const extensions = useMemo(() => {
    const values = cards
      .map((card) => card.setName)
      .filter((value): value is string => Boolean(value));

    return ["Toutes", ...Array.from(new Set(values)).sort()];
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
      const matchesFolder = folderFilter === "Toutes" || card.folder === folderFilter;
      const matchesSet = setFilter === "Toutes" || card.setName === setFilter;

      return matchesSearch && matchesFolder && matchesSet;
    });
  }, [cards, search, folderFilter, setFilter]);

  const stats = useMemo(() => {
    const totalCards = filteredCards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = filteredCards.length;
    const totalValue = filteredCards.reduce(
      (sum, card) => sum + card.quantity * card.price,
      0
    );

    return {
      totalCards,
      uniqueCards,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }, [filteredCards]);

  function createFolder() {
    const cleanFolder = newFolder.trim();

    if (!cleanFolder) return;
    if (folders.includes(cleanFolder)) {
      setNewFolder("");
      return;
    }

    setFolders((current) => [...current, cleanFolder]);
    setSelectedFolder(cleanFolder);
    setNewFolder("");
  }

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
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleanName)}`
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
      const folder = selectedFolder === "Toutes" ? "Non classé" : selectedFolder;

      setCards((current) => {
        const existing = current.find(
          (card) =>
            card.name.toLowerCase() === data.name.toLowerCase() &&
            card.setCode === data.set &&
            card.folder === folder
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
            setName: data.set_name || "Extension inconnue",
            setCode: data.set || "",
            rarity: data.rarity || "unknown",
            folder,
          },
        ];
      });

      setCardName("");
      setQuantity(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l’ajout.");
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

  function updateCardFolder(id: number, folder: string) {
    setCards((current) =>
      current.map((card) => (card.id === id ? { ...card, folder } : card))
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

            <div className="mt-6 grid grid-cols-2 gap-3">
  {folders
    .filter((folder) => folder !== "Toutes")
    .map((folder) => {
      const folderCards = cards.filter(
        (card) => card.folder === folder
      );

      const folderValue = folderCards.reduce(
        (sum, card) => sum + card.price * card.quantity,
        0
      );

      return (
        <button
          key={folder}
          onClick={() => setFolderFilter(folder)}
          className="card-soft p-4 text-left"
        >
          <div className="text-3xl">📁</div>

          <p className="mt-2 font-black">{folder}</p>

          <p className="text-sm text-muted">
            {folderCards.length} cartes
          </p>

          <p className="text-sm font-bold text-accent">
            {folderValue.toFixed(2)}€
          </p>
        </button>
      );
    })}
</div>

            <p className="mt-2 text-muted">
              Cartes, dossiers, extensions et valeur estimée.
            </p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <StatCard label="Cartes" value={stats.totalCards} />
          <StatCard label="Uniques" value={stats.uniqueCards} />
          <StatCard label="Valeur" value={`${stats.totalValue}€`} />
        </div>
<div className="mt-4 flex gap-2">
  <button
    onClick={() => setViewMode("grid")}
    className={`btn-soft ${
      viewMode === "grid" ? "border-accent bg-accent/10" : ""
    }`}
  >
    🖼️ Grille
  </button>

  <button
    onClick={() => setViewMode("list")}
    className={`btn-soft ${
      viewMode === "list" ? "border-accent bg-accent/10" : ""
    }`}
  >
    📋 Liste
  </button>
</div>
        <div className="mt-6 card-premium p-5">
          <h2 className="text-xl font-black">Ajouter une carte</h2>

          <div className="mt-5 space-y-3">
<div className="relative">
  <input
    value={cardName}
    onChange={(event) => setCardName(event.target.value)}
    placeholder="Sol Ring, Atraxa..."
    className="input-premium"
  />

  {(suggestions.length > 0 || isSearching) && (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#09090d] shadow-2xl">
      {suggestions.map((suggestion: string) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => {
            setCardName(suggestion);
            setSuggestions([]);
          }}
          className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm font-bold hover:bg-white/10"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )}
</div>

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

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="input-premium"
            >
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                value={newFolder}
                onChange={(event) => setNewFolder(event.target.value)}
                placeholder="Créer un dossier"
                className="input-premium"
              />

              <button onClick={createFolder} className="btn-soft px-5">
                +
              </button>
            </div>

            {error && (
              <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 card-soft p-4">
          <div className="space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une carte"
              className="input-premium"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={folderFilter}
                onChange={(event) => setFolderFilter(event.target.value)}
                className="input-premium"
              >
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>

              <select
                value={setFilter}
                onChange={(event) => setSetFilter(event.target.value)}
                className="input-premium"
              >
                {extensions.map((extension) => (
                  <option key={extension} value={extension}>
                    {extension}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
  className={
    viewMode === "grid"
      ? "mt-5 grid grid-cols-2 gap-3"
      : "mt-5 grid gap-3"
  }
>
          {filteredCards.length === 0 ? (
            <div className="card-soft p-5 text-center text-muted">
              Aucune carte trouvée.
            </div>
          ) : (
            filteredCards.map((card) => (
              <div key={card.id} className="card-soft p-4">
                <div className="flex gap-4">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="h-28 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-20 items-center justify-center rounded-xl bg-black/30 text-2xl">
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

                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {card.setName}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {card.rarity}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {card.folder}
                      </span>
                    </div>

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

                    <select
                      value={card.folder || "Non classé"}
                      onChange={(event) =>
                        updateCardFolder(card.id, event.target.value)
                      }
                      className="input-premium mt-3"
                    >
                      {folders
                        .filter((folder) => folder !== "Toutes")
                        .map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                    </select>
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