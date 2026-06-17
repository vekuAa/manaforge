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
  collectorNumber?: string;
  rarity?: string;
  folder?: string;
};

type ScryfallCard = {
  id: string;
  name: string;
  type_line?: string;
  set_name?: string;
  set?: string;
  collector_number?: string;
  rarity?: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { eur?: string | null; usd?: string | null };
};

type ScryfallSearchResponse = {
  data: ScryfallCard[];
  has_more?: boolean;
  next_page?: string;
};

type ScryfallAutocompleteResponse = {
  data?: string[];
};

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [folders, setFolders] = useState<string[]>([
    "Toutes",
    "Non classé",
    "Commander",
    "Trade",
    "Staples",
  ]);

  const [hasLoaded, setHasLoaded] = useState(false);

  const [cardName, setCardName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [newFolder, setNewFolder] = useState("");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [printOptions, setPrintOptions] = useState<ScryfallCard[]>([]);
  const [selectedPrintId, setSelectedPrintId] = useState("");

  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("Toutes");
  const [setFilter, setSetFilter] = useState("Toutes");
  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [fullsetCode, setFullsetCode] = useState("");
  const [fullsetCards, setFullsetCards] = useState<ScryfallCard[]>([]);
  const [isLoadingFullset, setIsLoadingFullset] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const query = cardName.trim();

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(
            query
          )}`
        );

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = (await response.json()) as ScryfallAutocompleteResponse;
        setSuggestions(data.data?.slice(0, 8) ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [cardName]);

  const extensions = useMemo(() => {
    const values = cards
      .map((card) => card.setName)
      .filter((value): value is string => Boolean(value));

    return ["Toutes", ...Array.from(new Set(values)).sort()];
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch = card.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFolder =
        folderFilter === "Toutes" || card.folder === folderFilter;

      const matchesSet = setFilter === "Toutes" || card.setName === setFilter;

      return matchesSearch && matchesFolder && matchesSet;
    });
  }, [cards, search, folderFilter, setFilter]);

  const stats = useMemo(() => {
    const totalCards = filteredCards.reduce(
      (sum, card) => sum + card.quantity,
      0
    );

    const totalValue = filteredCards.reduce(
      (sum, card) => sum + card.quantity * card.price,
      0
    );

    return {
      totalCards,
      uniqueCards: filteredCards.length,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }, [filteredCards]);

  const fullsetProgress = useMemo(() => {
    if (fullsetCards.length === 0) {
      return {
        owned: 0,
        total: 0,
        percent: 0,
        missing: [] as ScryfallCard[],
      };
    }

    const ownedKeys = new Set(
      cards
        .filter(
          (card) =>
            card.setCode?.toLowerCase() === fullsetCode.trim().toLowerCase()
        )
        .map((card) => `${card.setCode}-${card.collectorNumber}`)
    );

    const missing = fullsetCards.filter(
      (card) => !ownedKeys.has(`${card.set}-${card.collector_number}`)
    );

    const owned = fullsetCards.length - missing.length;

    return {
      owned,
      total: fullsetCards.length,
      percent:
        fullsetCards.length > 0
          ? Math.round((owned / fullsetCards.length) * 100)
          : 0,
      missing,
    };
  }, [cards, fullsetCards, fullsetCode]);

  function getCardImage(card: ScryfallCard) {
    return (
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      ""
    );
  }

  function getCardPrice(card: ScryfallCard) {
    return Number(card.prices?.eur || card.prices?.usd || 0);
  }

  function createFolder() {
    const cleanFolder = newFolder.trim();

    if (!cleanFolder || folders.includes(cleanFolder)) {
      setNewFolder("");
      return;
    }

    setFolders((current) => [...current, cleanFolder]);
    setSelectedFolder(cleanFolder);
    setNewFolder("");
  }

  function deleteFolder(folder: string) {
    if (["Toutes", "Non classé"].includes(folder)) return;

    setCards((current) =>
      current.map((card) =>
        card.folder === folder ? { ...card, folder: "Non classé" } : card
      )
    );

    setFolders((current) => current.filter((item) => item !== folder));

    if (openedFolder === folder) setOpenedFolder(null);
    if (folderFilter === folder) setFolderFilter("Toutes");
    if (selectedFolder === folder) setSelectedFolder("Non classé");
  }

  async function searchPrints() {
    const cleanName = cardName.trim();

    if (!cleanName) {
      setError("Entre le nom d’une carte.");
      return;
    }

    try {
      setIsSearching(true);
      setError("");
      setPrintOptions([]);
      setSelectedPrintId("");

      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
          `!"${cleanName}" unique:prints`
        )}&order=released`
      );

      if (!response.ok) {
        throw new Error("Carte introuvable sur Scryfall.");
      }

      const data = (await response.json()) as ScryfallSearchResponse;

      setPrintOptions(data.data.slice(0, 30));
      setSelectedPrintId(data.data[0]?.id ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur pendant la recherche."
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function addSelectedPrint() {
    const selectedPrint = printOptions.find(
      (card) => card.id === selectedPrintId
    );

    if (!selectedPrint) {
      setError("Choisis une impression de carte.");
      return;
    }

    try {
      setIsAdding(true);
      setError("");

      const folder = selectedFolder === "Toutes" ? "Non classé" : selectedFolder;

      setCards((current) => {
        const existing = current.find(
          (card) =>
            card.name.toLowerCase() === selectedPrint.name.toLowerCase() &&
            card.setCode === selectedPrint.set &&
            card.collectorNumber === selectedPrint.collector_number &&
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
            name: selectedPrint.name,
            image: getCardImage(selectedPrint),
            quantity,
            price: getCardPrice(selectedPrint),
            typeLine: selectedPrint.type_line || "",
            setName: selectedPrint.set_name || "Extension inconnue",
            setCode: selectedPrint.set || "",
            collectorNumber: selectedPrint.collector_number || "",
            rarity: selectedPrint.rarity || "unknown",
            folder,
          },
        ];
      });

      setCardName("");
      setQuantity(1);
      setSuggestions([]);
      setPrintOptions([]);
      setSelectedPrintId("");
    } catch {
      setError("Erreur pendant l’ajout.");
    } finally {
      setIsAdding(false);
    }
  }

  async function loadFullset() {
    const cleanSet = fullsetCode.trim().toLowerCase();

    if (!cleanSet) {
      setError("Entre un code d’extension. Exemple : mh3");
      return;
    }

    try {
      setIsLoadingFullset(true);
      setError("");

      let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
        `e:${cleanSet}`
      )}&unique=prints&order=set`;

      const allCards: ScryfallCard[] = [];

      while (url) {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Extension introuvable sur Scryfall.");
        }

        const data = (await response.json()) as ScryfallSearchResponse;

        allCards.push(...data.data);
        url = data.has_more && data.next_page ? data.next_page : "";
      }

      setFullsetCards(allCards);
    } catch (err) {
      setFullsetCards([]);
      setError(
        err instanceof Error ? err.message : "Erreur pendant le fullset."
      );
    } finally {
      setIsLoadingFullset(false);
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

            <p className="mt-2 text-muted">
              Cartes, dossiers, éditions et suivi fullset.
            </p>
          </div>
        </header>

        {!openedFolder && (
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
                  <div key={folder} className="card-soft p-4">
                    <button
                      onClick={() => {
                        setOpenedFolder(folder);
                        setFolderFilter(folder);
                      }}
                      className="w-full text-left"
                    >
                      <div className="text-4xl">📁</div>
                      <p className="mt-2 font-black">{folder}</p>
                      <p className="text-sm text-muted">
                        {folderCards.length} cartes
                      </p>
                      <p className="text-sm font-bold text-accent">
                        {folderValue.toFixed(2)}€
                      </p>
                    </button>

                    {!["Non classé"].includes(folder) && (
                      <button
                        onClick={() => deleteFolder(folder)}
                        className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {openedFolder && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/5 p-4">
            <button
              onClick={() => {
                setOpenedFolder(null);
                setFolderFilter("Toutes");
              }}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black"
            >
              ← Retour
            </button>

            <p className="font-black text-accent">{openedFolder}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-3">
          <StatCard label="Cartes" value={stats.totalCards} />
          <StatCard label="Uniques" value={stats.uniqueCards} />
          <StatCard label="Valeur" value={`${stats.totalValue}€`} />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`btn-soft ${viewMode === "grid" ? "border-accent" : ""}`}
          >
            ⊞ Grille
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`btn-soft ${viewMode === "list" ? "border-accent" : ""}`}
          >
            ☰ Liste
          </button>
        </div>

        <div className="mt-6 card-premium p-5">
          <h2 className="text-xl font-black">Ajouter une carte</h2>

          <div className="mt-5 space-y-3">
            <div className="relative">
              <input
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                placeholder="Sol Ring, Atraxa, Cyclonic Rift..."
                className="input-premium"
              />

              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#09090d] shadow-2xl">
                  {suggestions.map((suggestion) => (
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
                onClick={searchPrints}
                disabled={isSearching}
                className="btn-soft px-5 disabled:opacity-50"
              >
                {isSearching ? "..." : "Éditions"}
              </button>
            </div>

            {printOptions.length > 0 && (
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted">
                  Choisir l’édition
                </p>

                <select
                  value={selectedPrintId}
                  onChange={(event) => setSelectedPrintId(event.target.value)}
                  className="input-premium"
                >
                  {printOptions.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.set_name} · #{card.collector_number} ·{" "}
                      {card.rarity}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addSelectedPrint}
                  disabled={isAdding}
                  className="btn-primary mt-3 w-full disabled:opacity-50"
                >
                  {isAdding ? "Ajout..." : "Ajouter cette impression"}
                </button>
              </div>
            )}

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="input-premium"
            >
              {folders
                .filter((folder) => folder !== "Toutes")
                .map((folder) => (
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

        <div className="mt-6 card-premium p-5">
          <h2 className="text-xl font-black">Fullset</h2>

          <p className="mt-1 text-sm text-muted">
            Entre un code d’édition : MH3, LTR, FIN, DFT...
          </p>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
            <input
              value={fullsetCode}
              onChange={(event) => setFullsetCode(event.target.value)}
              placeholder="mh3"
              className="input-premium uppercase"
            />

            <button
              onClick={loadFullset}
              disabled={isLoadingFullset}
              className="btn-primary px-5 disabled:opacity-50"
            >
              {isLoadingFullset ? "..." : "Scan"}
            </button>
          </div>

          {fullsetCards.length > 0 && (
            <div className="mt-5 rounded-2xl bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <p className="font-black">
                  {fullsetProgress.owned}/{fullsetProgress.total}
                </p>

                <p className="font-black text-accent">
                  {fullsetProgress.percent}%
                </p>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${fullsetProgress.percent}%` }}
                />
              </div>

              <h3 className="mt-5 font-black">Cartes manquantes</h3>

              <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
                {fullsetProgress.missing.slice(0, 80).map((card) => (
                  <div
                    key={card.id}
                    className="flex justify-between rounded-xl bg-white/5 p-3 text-sm"
                  >
                    <span>{card.name}</span>
                    <span className="text-muted">#{card.collector_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <div className="card-soft col-span-2 p-5 text-center text-muted">
              Aucune carte trouvée.
            </div>
          ) : (
            filteredCards.map((card) =>
              viewMode === "grid" ? (
                <CardGridItem
                  key={card.id}
                  card={card}
                  onMinus={() => updateQuantity(card.id, -1)}
                  onPlus={() => updateQuantity(card.id, 1)}
                  onDelete={() => deleteCard(card.id)}
                />
              ) : (
                <CardListItem
                  key={card.id}
                  card={card}
                  folders={folders}
                  onMinus={() => updateQuantity(card.id, -1)}
                  onPlus={() => updateQuantity(card.id, 1)}
                  onDelete={() => deleteCard(card.id)}
                  onFolderChange={(folder) => updateCardFolder(card.id, folder)}
                />
              )
            )
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

function CardGridItem({
  card,
  onMinus,
  onPlus,
  onDelete,
}: {
  card: CollectionCard;
  onMinus: () => void;
  onPlus: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card-soft overflow-hidden p-3">
      {card.image ? (
        <img
          src={card.image}
          alt={card.name}
          className="aspect-[63/88] w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex aspect-[63/88] w-full items-center justify-center rounded-xl bg-black/30 text-4xl">
          🎴
        </div>
      )}

      <h3 className="mt-3 line-clamp-1 font-black">{card.name}</h3>

      <p className="text-xs text-muted">
        {card.setCode?.toUpperCase()} #{card.collectorNumber}
      </p>

      <p className="mt-1 text-sm font-bold text-accent">
        x{card.quantity} · {Math.round(card.price * card.quantity * 100) / 100}€
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={onMinus} className="rounded-xl bg-white/10 py-2">
          −
        </button>

        <button onClick={onPlus} className="rounded-xl bg-accent/20 py-2">
          +
        </button>

        <button onClick={onDelete} className="rounded-xl bg-red-500/10 py-2">
          ✕
        </button>
      </div>
    </div>
  );
}

function CardListItem({
  card,
  folders,
  onMinus,
  onPlus,
  onDelete,
  onFolderChange,
}: {
  card: CollectionCard;
  folders: string[];
  onMinus: () => void;
  onPlus: () => void;
  onDelete: () => void;
  onFolderChange: (folder: string) => void;
}) {
  return (
    <div className="card-soft p-4">
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
          <h3 className="truncate text-lg font-black">{card.name}</h3>

          <p className="mt-1 line-clamp-1 text-xs text-muted">
            {card.typeLine}
          </p>

          <p className="mt-2 text-xs text-muted">
            {card.setName} · #{card.collectorNumber} · {card.rarity}
          </p>

          <p className="mt-2 text-sm font-bold text-accent">
            {card.price}€ / carte ·{" "}
            {Math.round(card.price * card.quantity * 100) / 100}€
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={onMinus} className="btn-soft">
                −
              </button>

              <span className="text-xl font-black">x{card.quantity}</span>

              <button onClick={onPlus} className="btn-soft">
                +
              </button>
            </div>

            <button
              onClick={onDelete}
              className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-black text-red-300"
            >
              Supprimer
            </button>
          </div>

          <select
            value={card.folder || "Non classé"}
            onChange={(event) => onFolderChange(event.target.value)}
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