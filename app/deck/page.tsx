/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DeckCard = {
  name: string;
  quantity: number;
  image?: string;
  setName?: string;
  setCode?: string;
  collectorNumber?: string;
  rarity?: string;
  typeLine?: string;
  oracleText?: string;
  manaValue?: number;
  price?: number;
};



type Deck = {
  id: string | number;
  name: string;
  commander: string;
  commanderImage?: string;
  colors: string;
  cards: number;
  price: number;
  wins: number;
  losses: number;
  is_public?: boolean;
  decklist?: DeckCard[];
};

type DeckRow = {
  id: string;
  user_id: string;
  name: string;
  commander: string | null;
  commander_image: string | null;
  colors: string | null;
  cards: number | null;
  price: number | string | null;
  wins: number | null;
  losses: number | null;
  decklist: DeckCard[] | null;
  created_at?: string;
  is_public?: boolean | null;
};

type ArchidektCategory = string | { name?: string };

type ArchidektCardEntry = {
  quantity?: number;
  categories?: ArchidektCategory[];
  name?: string;
  card?: {
    name?: string;
    oracleCard?: {
      name?: string;
    };
  };
};

type ArchidektResponse = {
  name?: string;
  cards?: ArchidektCardEntry[];
  error?: string;
};

type ScryfallAutocompleteResponse = {
  data?: string[];
};

type ScryfallCardResponse = {
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string }; oracle_text?: string }[];
  color_identity?: string[];
  prices?: { eur?: string | null; usd?: string | null };
  type_line?: string;
  oracle_text?: string;
  cmc?: number;
};

const colorIcons: Record<string, string> = {
  W: "⚪",
  U: "🔵",
  B: "⚫",
  R: "🔴",
  G: "🟢",
};

function mapDeckRow(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    commander: row.commander || "Commandant inconnu",
    commanderImage: row.commander_image || undefined,
    colors: row.colors || "Incolore",
    cards: Number(row.cards || 0),
    price: Number(row.price || 0),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    decklist: Array.isArray(row.decklist) ? row.decklist : [],
    is_public: Boolean(row.is_public),
  };
}

async function saveDeckToSupabase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  deck: Deck
) {
  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: userId,
      name: deck.name,
      commander: deck.commander,
      commander_image: deck.commanderImage || null,
      colors: deck.colors || "Incolore",
      cards: Number(deck.cards || 0),
      price: Number(deck.price || 0),
      wins: Number(deck.wins || 0),
      losses: Number(deck.losses || 0),
      decklist: deck.decklist || [],
    })
    .select("id,user_id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,is_public,created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapDeckRow(data as DeckRow);
}

function getCategoryNames(categories?: ArchidektCategory[]) {
  return (categories ?? []).map((category) =>
    typeof category === "string" ? category : category.name ?? "",
  );
}

function extractArchidektId(url: string) {
  const clean = url.trim();
  if (/^\d+$/.test(clean)) return clean;
  const match = clean.match(/archidekt\.com\/decks\/(\d+)/i);
  return match?.[1] ?? null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DecksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [newDeckName, setNewDeckName] = useState("");
  const [newCommander, setNewCommander] = useState("");
  const [commanderSuggestions, setCommanderSuggestions] = useState<string[]>([]);
  const [isSearchingCommander, setIsSearchingCommander] = useState(false);

  const [archidektUrl, setArchidektUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [deckViewMode, setDeckViewMode] = useState<"grid" | "list">("grid");
  const [deckCategoryFilter, setDeckCategoryFilter] = useState("Toutes");
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isRefreshingDeck, setIsRefreshingDeck] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDecks() {
      try {
        const savedDecks = localStorage.getItem("manaforge-decks");
        const parsedDecks = savedDecks ? (JSON.parse(savedDecks) as Deck[]) : [];

        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData.user;

        if (!currentUser) {
          if (!cancelled) {
            setDecks(parsedDecks);
            setSelectedDeckId(null);
            setSyncStatus("Connecte-toi pour sauvegarder tes decks dans le cloud.");
          }
          return;
        }

        if (!cancelled) setUserId(currentUser.id);

        const { data: remoteDecks, error } = await supabase
          .from("decks")
          .select("id,user_id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,is_public,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        let cloudDecks = ((remoteDecks || []) as DeckRow[]).map(mapDeckRow);

        if (cloudDecks.length === 0 && parsedDecks.length > 0) {
          const decksToImport = parsedDecks.map((deck) => ({
            user_id: currentUser.id,
            name: deck.name,
            commander: deck.commander,
            commander_image: deck.commanderImage || null,
            colors: deck.colors || "Incolore",
            cards: Number(deck.cards || deck.decklist?.reduce((sum, card) => sum + Number(card.quantity || 1), 0) || 0),
            price: Number(deck.price || 0),
            wins: Number(deck.wins || 0),
            losses: Number(deck.losses || 0),
            decklist: deck.decklist || [],
          }));

          const { data: insertedDecks, error: importError } = await supabase
            .from("decks")
            .insert(decksToImport)
            .select("id,user_id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,is_public,created_at");

          if (importError) throw importError;
          cloudDecks = ((insertedDecks || []) as DeckRow[]).map(mapDeckRow);
          localStorage.removeItem("manaforge-decks");
        }

        if (!cancelled) {
          setDecks(cloudDecks);
          setSelectedDeckId(null);
          setSyncStatus(cloudDecks.length > 0 ? "Decks synchronisés avec ton compte." : "Aucun deck cloud pour le moment.");
        }
      } catch (error) {
        if (!cancelled) {
          setSyncStatus("Synchronisation decks impossible pour le moment.");
          setImportError(error instanceof Error ? error.message : "Erreur pendant le chargement des decks.");
        }
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    }

    void loadDecks();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!hasLoaded || userId) return;
    localStorage.setItem("manaforge-decks", JSON.stringify(decks));
  }, [decks, hasLoaded, userId]);

  useEffect(() => {
    const query = newCommander.trim();

    if (query.length < 2) {
      setCommanderSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsSearchingCommander(true);

        const response = await fetch(
          `/api/scryfall/autocomplete?q=${encodeURIComponent(query)}`,
        );

        if (!response.ok) {
          setCommanderSuggestions([]);
          return;
        }

        const data = (await response.json()) as ScryfallAutocompleteResponse;
        setCommanderSuggestions(data.data?.slice(0, 8) ?? []);
      } catch {
        setCommanderSuggestions([]);
      } finally {
        setIsSearchingCommander(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [newCommander]);

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);
  const analysis = analyzeDeck(selectedDeck?.decklist);

  function getDeckTotalPrice(decklist: DeckCard[]) {
    return Math.round(
      decklist.reduce(
        (total, card) => total + Number(card.price || 0) * Number(card.quantity || 1),
        0,
      ) * 100,
    ) / 100;
  }


  async function getCommanderImage(commanderName: string) {
    const response = await fetch(
      `/api/scryfall/named?name=${encodeURIComponent(commanderName)}`,
    );

    if (!response.ok) {
      return { image: "", colors: "Incolore", price: 0 };
    }

    const data = (await response.json()) as ScryfallCardResponse;
    const image = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || "";
    const colors =
      data.color_identity && data.color_identity.length > 0
        ? data.color_identity.map((color) => colorIcons[color] || color).join(" ")
        : "Incolore";
    const price = Number(data.prices?.eur || data.prices?.usd || 0);

    return { image, colors, price };
  }

type ScryfallCard = {
  name: string;
  set_name?: string;
  set?: string;
  collector_number?: string;
  rarity?: string;
  type_line?: string;
  oracle_text?: string;
  cmc?: number;
  image_uris?: {
    normal?: string;
    art_crop?: string;
  };
  card_faces?: {
    oracle_text?: string;
    image_uris?: {
      normal?: string;
      art_crop?: string;
    };
  }[];
  prices?: {
    eur?: string | null;
    usd?: string | null;
    eur_foil?: string | null;
    usd_foil?: string | null;
  };
};


  async function enrichDecklist(decklist: DeckCard[]): Promise<DeckCard[]> {
    const chunks: DeckCard[][] = [];

    for (let index = 0; index < decklist.length; index += 75) {
      chunks.push(decklist.slice(index, index + 75));
    }

    const foundCards: ScryfallCard[] = [];

    for (const chunk of chunks) {
      const response = await fetch("/api/scryfall/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: chunk.map((card) => ({ name: card.name })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Scryfall collection error:", response.status, errorText);
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data.data)) foundCards.push(...data.data);
    }

    if (foundCards.length === 0) return decklist;

    return decklist.map((card) => {
      const found = foundCards.find((item) => item.name.toLowerCase() === card.name.toLowerCase());
      const image = found?.image_uris?.normal || found?.card_faces?.[0]?.image_uris?.normal || "";
      const oracleText = found?.oracle_text || found?.card_faces?.[0]?.oracle_text || "";
      const price = Number(
        found?.prices?.eur ||
          found?.prices?.usd ||
          found?.prices?.eur_foil ||
          found?.prices?.usd_foil ||
          card.price ||
          0,
      );

      return {
        ...card,
        image: image || card.image || "",
        setName: found?.set_name || card.setName || "",
        setCode: found?.set || card.setCode || "",
        collectorNumber: found?.collector_number || card.collectorNumber || "",
        rarity: found?.rarity || card.rarity || "",
        price,
        typeLine: found?.type_line || card.typeLine || "",
        oracleText: oracleText || card.oracleText || "",
        manaValue: found?.cmc !== undefined ? Number(found.cmc) : card.manaValue,
      };
    });
  }


  async function addDeck() {
    if (!newDeckName.trim() || !newCommander.trim()) return;

    try {
      const commanderData = await getCommanderImage(newCommander);
      const optimisticId = Date.now();
      const deck: Deck = {
        id: optimisticId,
        name: newDeckName.trim(),
        commander: newCommander.trim(),
        commanderImage: commanderData.image,
        colors: commanderData.colors,
        cards: 100,
        price: commanderData.price,
        wins: 0,
        losses: 0,
        decklist: [],
      };

      setDecks((current) => [...current, deck]);
      setSelectedDeckId(deck.id);
      setNewDeckName("");
      setNewCommander("");
      setCommanderSuggestions([]);

      if (userId) {
        const savedDeck = await saveDeckToSupabase(supabase, userId, deck);
        setDecks((current) => current.map((item) => (item.id === optimisticId ? savedDeck : item)));
        setSelectedDeckId(savedDeck.id);
        setSyncStatus("Deck sauvegardé dans Supabase.");
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Erreur pendant la création du deck.");
    }
  }

  async function importArchidektDeck() {
    setImportError("");
    const cleanUrl = archidektUrl.trim();

    if (!cleanUrl) {
      setImportError("Colle une URL Archidekt.");
      return;
    }

    const deckId = extractArchidektId(cleanUrl);

    if (!deckId) {
      setImportError("URL Archidekt invalide.");
      return;
    }

    try {
      setIsImporting(true);

      const response = await fetch("/api/import/archidekt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId }),
      });

      const data = (await response.json()) as ArchidektResponse;

      if (!response.ok) {
        throw new Error(data.error || "Deck Archidekt introuvable ou inaccessible.");
      }

      const archidektCards = data.cards ?? [];
      const rawDecklist: DeckCard[] = archidektCards
        .filter((entry) => {
          const categories = getCategoryNames(entry.categories).map((category) => category.toLowerCase());
          return !categories.some((category) => ["maybeboard", "sideboard"].includes(category));
        })
        .map((entry) => ({
          name: entry.card?.oracleCard?.name || entry.card?.name || entry.name || "Carte inconnue",
          quantity: entry.quantity || 1,
        }));

      const commanderEntry = archidektCards.find((entry) =>
        getCategoryNames(entry.categories).some((category) => category.toLowerCase().includes("commander")),
      );

      const commanderName =
        commanderEntry?.card?.oracleCard?.name ||
        commanderEntry?.card?.name ||
        commanderEntry?.name ||
        rawDecklist[0]?.name ||
        "Commandant inconnu";

      const decklist = await enrichDecklist(rawDecklist);
      const commanderData = await getCommanderImage(commanderName);
      const totalPrice = decklist.reduce((total, card) => total + Number(card.price || 0) * Number(card.quantity || 1), 0);

      const optimisticId = Date.now();
      const deck: Deck = {
        id: optimisticId,
        name: data.name || "Deck Archidekt",
        commander: commanderName,
        commanderImage: commanderData.image,
        colors: commanderData.colors,
        cards: decklist.reduce((total, card) => total + card.quantity, 0),
        price: Math.round(totalPrice * 100) / 100,
        wins: 0,
        losses: 0,
        decklist,
      };

      setDecks((current) => [...current, deck]);
      setSelectedDeckId(deck.id);
      setArchidektUrl("");

      if (userId) {
        const savedDeck = await saveDeckToSupabase(supabase, userId, deck);
        setDecks((current) => current.map((item) => (item.id === optimisticId ? savedDeck : item)));
        setSelectedDeckId(savedDeck.id);
        setSyncStatus("Deck Archidekt sauvegardé dans Supabase.");
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Erreur pendant l'import Archidekt.");
    } finally {
      setIsImporting(false);
    }
  }

  async function deleteDeck(deckId: string | number) {
    const previousDecks = decks;
    const remainingDecks = decks.filter((deck) => deck.id !== deckId);
    setDecks(remainingDecks);

    if (selectedDeckId === deckId) {
      setSelectedDeckId(null);
    }

    if (!userId || typeof deckId !== "string") return;

    const { error } = await supabase.from("decks").delete().eq("user_id", userId).eq("id", deckId);
    if (error) {
      setDecks(previousDecks);
      setImportError(error.message);
    }
  }

  async function updateDeckStats(deckId: string | number, type: "win" | "loss") {
    const target = decks.find((deck) => deck.id === deckId);
    if (!target) return;

    const nextDeck = type === "win" ? { ...target, wins: target.wins + 1 } : { ...target, losses: target.losses + 1 };
    setDecks((current) => current.map((deck) => (deck.id === deckId ? nextDeck : deck)));

    if (!userId || typeof deckId !== "string") return;

    const { error } = await supabase
      .from("decks")
      .update({ wins: nextDeck.wins, losses: nextDeck.losses })
      .eq("user_id", userId)
      .eq("id", deckId);

    if (error) setImportError(error.message);
  }

  async function addDeckToCollection(deck: Deck) {
    if (!userId) {
      setImportError("Connecte-toi pour ajouter ce deck à ta collection.");
      return;
    }

    if (!deck.decklist || deck.decklist.length === 0) {
      setImportError("Ce deck ne contient aucune carte à ajouter.");
      return;
    }

    try {
      setIsAddingToCollection(true);
      setImportError("");

      const cardsToInsert = deck.decklist.map((card) => ({
        user_id: userId,
        folder_id: null,
        scryfall_id: null,
        name: card.name,
        image: card.image || null,
        set_name: card.setName || null,
        set_code: card.setCode || null,
        collector_number: card.collectorNumber || null,
        language: "fr",
        foil: false,
        quantity: Number(card.quantity || 1),
        price: Number(card.price || 0),
      }));

      const { error } = await supabase.from("collection_cards").insert(cardsToInsert);
      if (error) throw error;

      setSyncStatus("Deck ajouté à ta collection.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Impossible d’ajouter le deck à la collection.");
    } finally {
      setIsAddingToCollection(false);
    }
  }

  async function refreshDeckMetadata(deck: Deck) {
    if (!deck.decklist?.length) return;

    try {
      setIsRefreshingDeck(true);
      setImportError("");
      const nextDecklist = await enrichDecklist(deck.decklist);
      const nextCards = nextDecklist.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
      const nextPrice = getDeckTotalPrice(nextDecklist);
      const nextDeck: Deck = {
        ...deck,
        decklist: nextDecklist,
        cards: nextCards,
        price: nextPrice,
      };

      setDecks((current) => current.map((item) => (item.id === deck.id ? nextDeck : item)));

      if (userId && typeof deck.id === "string") {
        const { error } = await supabase
          .from("decks")
          .update({ decklist: nextDecklist, cards: nextCards, price: nextPrice })
          .eq("user_id", userId)
          .eq("id", deck.id);

        if (error) throw error;
      }

      setSyncStatus("Deck mis à jour avec les données Scryfall.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Impossible de mettre à jour les infos du deck.");
    } finally {
      setIsRefreshingDeck(false);
    }
  }

  async function toggleDeckPrivacy(deck: Deck) {
  const nextValue = !deck.is_public;

  setDecks((current) =>
    current.map((item) =>
      item.id === deck.id ? { ...item, is_public: nextValue } : item
    )
  );

  if (!userId || typeof deck.id !== "string") return;

  const { error } = await supabase
    .from("decks")
    .update({ is_public: nextValue })
    .eq("user_id", userId)
    .eq("id", deck.id);

  if (error) {
    setImportError(error.message);
  }
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
      <section className="container-app pb-24">
        <header>
          <Link href="/" className="text-3xl font-black">←</Link>
          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">Deck Forge</p>
            <h1 className="mt-2 text-4xl font-black text-accent">Mes decks</h1>
            <p className="mt-2 text-muted">Crée, importe et analyse tes decks Commander.</p>
          </div>
          {syncStatus && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-muted">{syncStatus}</p>
          )}
          {importError && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">{importError}</p>}
        </header>

        {selectedDeck ? (
          <DeckDetail
            deck={selectedDeck}
            analysis={analysis}
            viewMode={deckViewMode}
            setViewMode={setDeckViewMode}
            categoryFilter={deckCategoryFilter}
            setCategoryFilter={setDeckCategoryFilter}
            isAddingToCollection={isAddingToCollection}
            isRefreshingDeck={isRefreshingDeck}
            onClose={() => setSelectedDeckId(null)}
            onAddToCollection={() => void addDeckToCollection(selectedDeck)}
            onRefreshMetadata={() => void refreshDeckMetadata(selectedDeck)}
            onWin={() => void updateDeckStats(selectedDeck.id, "win")}
            onLoss={() => void updateDeckStats(selectedDeck.id, "loss")}
            onTogglePrivacy={() => void toggleDeckPrivacy(selectedDeck)}
            onDelete={() => {
              if (window.confirm(`Supprimer le deck "${selectedDeck.name}" ?`)) void deleteDeck(selectedDeck.id);
            }}
          />
        ) : (
          <>
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl">
              <h2 className="text-xl font-black">Créer ou importer</h2>
              <p className="mt-1 text-sm text-muted">Ajoute un deck à la main ou importe directement depuis Archidekt.</p>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <h3 className="font-black">Nouveau deck</h3>
                  <div className="mt-4 space-y-3">
                    <input value={newDeckName} onChange={(event) => setNewDeckName(event.target.value)} placeholder="Nom du deck" className="input-premium" />
                    <div className="relative">
                      <input value={newCommander} onChange={(event) => setNewCommander(event.target.value)} placeholder="Commandant" className="input-premium" />
                      {(commanderSuggestions.length > 0 || isSearchingCommander) && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#09090d] shadow-2xl">
                          {isSearchingCommander && <p className="p-3 text-sm text-muted">Recherche...</p>}
                          {commanderSuggestions.map((suggestion) => (
                            <button key={suggestion} type="button" onClick={() => { setNewCommander(suggestion); setCommanderSuggestions([]); }} className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm font-bold hover:bg-white/10">
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={addDeck} className="btn-primary w-full">Ajouter le deck</button>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <h3 className="font-black">Importer Archidekt</h3>
                  <p className="mt-1 text-sm text-muted">Colle l’URL publique de ton deck.</p>
                  <input value={archidektUrl} onChange={(event) => setArchidektUrl(event.target.value)} placeholder="https://archidekt.com/decks/..." className="input-premium mt-4" />
                  <button onClick={importArchidektDeck} disabled={isImporting} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">
                    {isImporting ? "Import en cours..." : "Importer Archidekt"}
                  </button>
                </div>
              </div>
            </section>

            {decks.length > 0 ? (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-black">Mes decks</h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/60">{decks.length} decks</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {decks.map((deck) => {
                    const games = deck.wins + deck.losses;
                    const winrate = games === 0 ? 0 : Math.round((deck.wins / games) * 100);
                    const deckCardCount = deck.decklist?.reduce((sum, card) => sum + Number(card.quantity || 1), 0) || deck.cards || 0;
                    return (
                      <button key={deck.id} onClick={() => { setDeckCategoryFilter("Toutes"); setSelectedDeckId(deck.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-3 text-left transition hover:bg-white/[0.08] active:scale-[0.99]">
                        <div className="flex items-center gap-4">
                          {deck.commanderImage ? <img src={deck.commanderImage} alt={deck.commander} className="h-24 w-16 rounded-2xl object-cover shadow-xl" /> : <div className="flex h-24 w-16 items-center justify-center rounded-2xl bg-black/40 text-2xl">🎴</div>}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-black">{deck.name}</h3>
                                <p className="truncate text-sm font-bold text-accent">{deck.commander}</p>
                              </div>
                              <span className="rounded-full bg-black/30 px-2 py-1 text-[10px] font-black text-white/50">Ouvrir</span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              <DeckMiniStatCompact label="Cartes" value={deckCardCount} />
                              <DeckMiniStatCompact label="WR" value={`${winrate}%`} />
                              <DeckMiniStatCompact label="Prix" value={formatCurrency(Number(deck.price || 0))} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-muted">Aucun deck pour le moment.</p>
            )}
          </>
        )}
      </section>
      <BottomNav />
    </main>
  );
}


function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isLandCard(card: DeckCard) {
  const type = normalizeText(card.typeLine || "");
  const name = normalizeText(card.name || "");
  const basicNames = [
    "plains",
    "island",
    "swamp",
    "mountain",
    "forest",
    "wastes",
    "plaine",
    "ile",
    "marais",
    "montagne",
    "foret",
    "desert",
  ];

  if (type.includes("land") || type.includes("terrain")) return true;

  return basicNames.some(
    (landName) =>
      name === landName ||
      name.startsWith(`${landName} `) ||
      name.endsWith(` ${landName}`),
  );
}

function hasReliableManaValue(card: DeckCard) {
  if (isLandCard(card)) return false;
  if (card.manaValue === undefined || card.manaValue === null) return false;

  const manaValue = Number(card.manaValue);
  if (!Number.isFinite(manaValue)) return false;

  // Si la carte n'a aucune donnée Scryfall enrichie, on évite de compter un faux 0.
  const hasMetadata = Boolean(card.typeLine || card.oracleText || card.image || card.setCode || card.collectorNumber);
  return hasMetadata || manaValue > 0;
}

function getDeckCardCategory(card: DeckCard) {
  const type = normalizeText(card.typeLine || "");
  if (isLandCard(card)) return "Terrains";
  if (type.includes("creature")) return "Créatures";
  if (type.includes("artifact") || type.includes("artefact")) return "Artefacts";
  if (type.includes("enchantment") || type.includes("enchantement")) return "Enchantements";
  if (type.includes("instant") || type.includes("ephemere")) return "Éphémères";
  if (type.includes("sorcery") || type.includes("rituel")) return "Rituels";
  if (type.includes("planeswalker")) return "Planeswalkers";
  return "Autres";
}

function getCategoryCount(decklist: DeckCard[] | undefined, category: string) {
  return (decklist || [])
    .filter((card) => category === "Toutes" || getDeckCardCategory(card) === category)
    .reduce((total, card) => total + Number(card.quantity || 1), 0);
}

function DeckDetail({
  deck,
  analysis,
  viewMode,
  setViewMode,
  categoryFilter,
  setCategoryFilter,
  isAddingToCollection,
  isRefreshingDeck,
  onClose,
  onAddToCollection,
  onRefreshMetadata,
  onWin,
  onLoss,
  onDelete,
  onTogglePrivacy,
}: {
  deck: Deck;
  analysis: ReturnType<typeof analyzeDeck>;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  isAddingToCollection: boolean;
  isRefreshingDeck: boolean;
  onClose: () => void;
  onAddToCollection: () => void;
  onRefreshMetadata: () => void;
  onWin: () => void;
  onLoss: () => void;
  onDelete: () => void;
  onTogglePrivacy: () => void;
}) {
  const categories = ["Toutes", "Terrains", "Créatures", "Artefacts", "Enchantements", "Éphémères", "Rituels", "Planeswalkers", "Autres"];
  const visibleCards = (deck.decklist || []).filter((card) => categoryFilter === "Toutes" || getDeckCardCategory(card) === categoryFilter);
  const games = deck.wins + deck.losses;
  const winrate = games > 0 ? Math.round((deck.wins / games) * 100) : 0;
  const totalCards = (deck.decklist || []).reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  const manaCurve = buildManaCurve(deck.decklist);
  const typeBreakdown = buildTypeBreakdown(deck.decklist);
  const landBreakdown = buildLandBreakdown(deck.decklist);
  const deckHealth = getDeckHealth(analysis);

  return (
    <div className="mt-5 space-y-5">
      <div className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[#101116]/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/80 transition hover:bg-white/[0.1]"
        >
          ← Retour aux decks
        </button>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4 shadow-2xl md:p-5">
        <div className="grid gap-5 md:grid-cols-[210px_1fr]">
          <div className="mx-auto w-full max-w-[210px]">
            {deck.commanderImage ? (
              <img src={deck.commanderImage} alt={deck.commander} className="aspect-[63/88] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/10" />
            ) : (
              <div className="flex aspect-[63/88] w-full items-center justify-center rounded-3xl bg-black/40 text-5xl">🎴</div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f59e0b] px-3 py-1 text-xs font-black text-black">Commander</span>
              <button onClick={onTogglePrivacy} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                {deck.is_public ? "🌍 Public" : "🔒 Privé"}
              </button>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${deckHealth.good ? "bg-emerald-400/15 text-emerald-300" : "bg-orange-400/15 text-orange-300"}`}>
                {deckHealth.label}
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{deck.name}</h2>
            <p className="mt-1 text-lg font-black text-accent">{deck.commander}</p>
            <p className="mt-2 text-sm font-bold text-muted">{deck.colors} · {totalCards || deck.cards} cartes · {deck.wins}V / {deck.losses}D · {winrate}% WR</p>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <DeckMiniStat label="Valeur" value={formatCurrency(analysis.totalPrice)} />
              <DeckMiniStat label="Terrains" value={analysis.lands} helper={`${analysis.landPercent}% du deck`} />
              <DeckMiniStat label="Sorts" value={analysis.spells} helper="hors terrains" />
              <DeckMiniStat label="MV moyen" value={analysis.averageManaValue} helper={`${analysis.knownManaCards}/${analysis.spells} sorts analysés`} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <button onClick={onWin} className="rounded-2xl bg-emerald-500/15 px-4 py-4 font-black text-emerald-300 ring-1 ring-emerald-400/20">+ Victoire</button>
              <button onClick={onLoss} className="rounded-2xl bg-red-500/15 px-4 py-4 font-black text-red-300 ring-1 ring-red-400/20">+ Défaite</button>
              <button
                onClick={onRefreshMetadata}
                disabled={isRefreshingDeck || !deck.decklist?.length}
                className="rounded-2xl border border-white/10 bg-white/[0.075] px-4 py-4 font-black text-white disabled:opacity-50"
              >
                {isRefreshingDeck ? "Mise à jour..." : "Réparer les infos"}
              </button>
              <button
                onClick={onAddToCollection}
                disabled={isAddingToCollection || !deck.decklist?.length}
                className="rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black disabled:opacity-50"
              >
                {isAddingToCollection ? "Ajout..." : "Ajouter collection"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_0.9fr]">
        <Panel title="Répartition par type" subtitle={`${totalCards} cartes au total`}>
          <div className="space-y-3">
            {typeBreakdown.map((item) => (
              <BreakdownBar key={item.label} label={item.label} value={item.count} percent={item.percent} />
            ))}
          </div>
        </Panel>

        <Panel
          title="Courbe de mana"
          subtitle={`Basée sur ${manaCurve.knownCount} sorts enrichis, terrains exclus`}
          aside={analysis.averageManaValue}
        >
          <div className="grid grid-cols-8 items-end gap-2">
            {manaCurve.buckets.map((item) => (
              <div key={item.label} className="text-center">
                <div className="flex h-32 items-end rounded-xl bg-black/25 p-1">
                  <div className="w-full rounded-lg bg-gradient-to-t from-[#f59e0b] to-[#fbbf24]" style={{ height: item.count === 0 ? "0%" : `${Math.max(8, item.percent)}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-black text-white/45">{item.label}</p>
                <p className="text-xs font-black">{item.count}</p>
              </div>
            ))}
          </div>
          {manaCurve.unknownCount > 0 && (
            <p className="mt-3 rounded-2xl bg-orange-400/10 p-3 text-xs font-bold text-orange-200">
              {manaCurve.unknownCount} sort(s) sans MV fiable ignoré(s). Clique sur “Réparer les infos” pour compléter les données Scryfall.
            </p>
          )}
        </Panel>

        <Panel title="Couleurs du deck" subtitle="Identité du commandant">
          <CommanderColors colors={deck.colors} />
          <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
            <p className="text-sm font-black text-sky-200">MV moyen</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-white/65">
              Le MV moyen ignore les terrains et les cartes non enrichies. Un deck Commander stable tourne souvent autour de 2,5 à 3,5 selon le plan de jeu.
            </p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Statistiques clés" subtitle="Repères Commander classiques">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ProMetric label="Ramp" value={analysis.ramp} target="8-12" status={analysis.ramp >= 8 ? "OK" : "Bas"} />
            <ProMetric label="Pioche" value={analysis.draw} target="8-12" status={analysis.draw >= 8 ? "OK" : "Bas"} />
            <ProMetric label="Interactions" value={analysis.removal} target="6-10" status={analysis.removal >= 6 ? "OK" : "Bas"} />
            <ProMetric label="Wraths" value={analysis.boardWipes} target="2-4" status={analysis.boardWipes >= 2 ? "OK" : "Bas"} />
          </div>
        </Panel>

        <Panel title="Conseils ManaForge" subtitle="Analyse automatique du deck">
          {analysis.recommendations.length > 0 ? (
            <div className="space-y-2">
              {analysis.recommendations.map((recommendation) => (
                <p key={recommendation} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm font-bold text-white/70">
                  {recommendation}
                </p>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 font-black text-emerald-300">
              ✅ Deck équilibré sur les repères de base.
            </p>
          )}
        </Panel>
      </section>

      {landBreakdown.length > 0 && (
        <Panel title="Répartition des terrains" subtitle={`${analysis.lands} terrains détectés`}>
          <div className="grid gap-3 md:grid-cols-5">
            {landBreakdown.map((item) => (
              <div key={item.label} className="rounded-2xl bg-black/25 p-3">
                <p className="font-black">{item.icon} {item.label}</p>
                <p className="mt-1 text-sm font-bold text-white/50">{item.count} cartes</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Decklist</h3>
            <p className="text-sm text-muted">Triée par type. Les compteurs utilisent les quantités réelles.</p>
          </div>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${categoryFilter === category ? "border-[#f59e0b] bg-[#f59e0b] text-black" : "border-white/10 bg-black/25 text-white/70"}`}
            >
              {category} {getCategoryCount(deck.decklist, category)}
            </button>
          ))}
        </div>

        <div className={viewMode === "grid" ? "mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7" : "mt-4 grid gap-3 md:grid-cols-2"}>
          {visibleCards.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-muted">Aucune carte dans cette catégorie.</p>
          ) : (
            visibleCards.map((card, index) =>
              viewMode === "grid" ? (
                <DeckCardTile key={`${card.name}-${index}`} card={card} />
              ) : (
                <DeckCardRow key={`${card.name}-${index}`} card={card} />
              ),
            )
          )}
        </div>
      </section>

      <button onClick={onDelete} className="w-full rounded-2xl bg-red-500/10 px-4 py-4 font-black text-red-300 ring-1 ring-red-400/20">Supprimer le deck</button>
    </div>
  );
}

function Panel({ title, subtitle, aside, children }: { title: string; subtitle?: string; aside?: string | number; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-4 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-sm font-bold text-white/45">{subtitle}</p>}
        </div>
        {aside !== undefined && (
          <span className="rounded-full bg-black/35 px-3 py-1 text-sm font-black text-accent">{aside}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function CommanderColors({ colors }: { colors: string }) {
  const items = [
    { key: "⚪", label: "Blanc" },
    { key: "🔵", label: "Bleu" },
    { key: "⚫", label: "Noir" },
    { key: "🔴", label: "Rouge" },
    { key: "🟢", label: "Vert" },
  ];

  const activeColors = items.filter((item) => colors.includes(item.key));

  if (activeColors.length === 0) {
    return <p className="rounded-2xl bg-black/25 p-4 font-bold text-white/55">Deck incolore ou identité couleur non récupérée.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const active = activeColors.some((color) => color.key === item.key);
        const width = active ? 100 / activeColors.length : 0;
        return (
          <div key={item.key} className="flex items-center gap-3">
            <span className="w-16 font-black">{item.key} {item.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${width}%`, opacity: active ? 1 : 0.2 }} />
            </div>
            <span className="w-10 text-right text-xs font-black text-white/45">{active ? `${Math.round(width)}%` : "0%"}</span>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownBar({ label, value, percent }: { label: string; value: number; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="text-white/45">{percent}% ({value})</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DeckMiniStat({ label, value, helper }: { label: string; value: number | string; helper?: string }) {
  return (
    <div className="rounded-2xl bg-black/25 p-4 text-center ring-1 ring-white/5">
      <p className="text-2xl font-black text-accent">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      {helper && <p className="mt-1 text-[10px] font-bold text-white/35">{helper}</p>}
    </div>
  );
}

function DeckMiniStatCompact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-black/25 px-2 py-2">
      <p className="truncate text-sm font-black text-accent">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function ViewToggle({ viewMode, setViewMode }: { viewMode: "grid" | "list"; setViewMode: (mode: "grid" | "list") => void }) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-black/25 p-1">
      <button onClick={() => setViewMode("grid")} className={`rounded-lg px-3 py-1.5 text-xs font-black ${viewMode === "grid" ? "bg-[#f59e0b] text-black" : "text-white/70"}`}>Grille</button>
      <button onClick={() => setViewMode("list")} className={`rounded-lg px-3 py-1.5 text-xs font-black ${viewMode === "list" ? "bg-[#f59e0b] text-black" : "text-white/70"}`}>Liste</button>
    </div>
  );
}

function DeckCardTile({ card }: { card: DeckCard }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.055] p-1.5 transition hover:bg-white/[0.08]">
      {card.image ? (
        <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-lg object-cover" />
      ) : (
        <div className="flex aspect-[63/88] items-center justify-center rounded-lg bg-black/30 text-2xl">🎴</div>
      )}
      <p className="mt-1 truncate text-[11px] font-bold">{card.name}</p>
      <p className="text-[10px] text-white/60">{formatCurrency(Number(card.price || 0))} · x{card.quantity}</p>
    </div>
  );
}

function DeckCardRow({ card }: { card: DeckCard }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3">
      {card.image ? (
        <img src={card.image} alt={card.name} className="h-20 w-14 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-14 items-center justify-center rounded-lg bg-black/30 text-xl">🎴</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-black">{card.name}</p>
        <p className="text-xs text-white/60">{getDeckCardCategory(card)} · MV {hasReliableManaValue(card) ? card.manaValue : "non enrichi"}</p>
        <p className="mt-1 text-sm font-black">{formatCurrency(Number(card.price || 0) * Number(card.quantity || 1))} · x{card.quantity}</p>
      </div>
    </div>
  );
}

function ProMetric({ label, value, target, status }: { label: string; value: number; target: string; status: string }) {
  const good = status === "OK";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black">{label}</p>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${good ? "bg-emerald-400/15 text-emerald-300" : "bg-orange-400/15 text-orange-300"}`}>{status}</span>
      </div>
      <p className="mt-3 text-3xl font-black text-accent">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/45">Repère EDH : {target}</p>
    </div>
  );
}

function buildManaCurve(decklist?: DeckCard[]) {
  const buckets = [
    { label: "0", count: 0 },
    { label: "1", count: 0 },
    { label: "2", count: 0 },
    { label: "3", count: 0 },
    { label: "4", count: 0 },
    { label: "5", count: 0 },
    { label: "6", count: 0 },
    { label: "7+", count: 0 },
  ];

  let unknownCount = 0;
  let knownCount = 0;

  (decklist || []).forEach((card) => {
    if (isLandCard(card)) return;

    const quantity = Number(card.quantity || 1);

    if (!hasReliableManaValue(card)) {
      unknownCount += quantity;
      return;
    }

    const manaValue = Math.max(0, Math.floor(Number(card.manaValue)));
    const index = manaValue >= 7 ? 7 : manaValue;
    buckets[index].count += quantity;
    knownCount += quantity;
  });

  const max = Math.max(1, ...buckets.map((item) => item.count));
  return {
    buckets: buckets.map((item) => ({ ...item, percent: Math.round((item.count / max) * 100) })),
    unknownCount,
    knownCount,
  };
}

function buildTypeBreakdown(decklist?: DeckCard[]) {
  const total = (decklist || []).reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  const labels = ["Créatures", "Artefacts", "Enchantements", "Éphémères", "Rituels", "Planeswalkers", "Terrains", "Autres"];

  return labels
    .map((label) => {
      const count = getCategoryCount(decklist, label);
      return {
        label,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    })
    .filter((item) => item.count > 0);
}

function buildLandBreakdown(decklist?: DeckCard[]) {
  const lands = (decklist || []).filter(isLandCard);
  const total = lands.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  const landGroups = [
    { label: "Plaines", icon: "⚪", keywords: ["plains", "plaine"] },
    { label: "Îles", icon: "🔵", keywords: ["island", "ile"] },
    { label: "Marais", icon: "⚫", keywords: ["swamp", "marais"] },
    { label: "Montagnes", icon: "🔴", keywords: ["mountain", "montagne"] },
    { label: "Forêts", icon: "🟢", keywords: ["forest", "foret"] },
  ];

  return landGroups
    .map((group) => {
      const count = lands.reduce((sum, card) => {
        const name = normalizeText(card.name);
        const matches = group.keywords.some((keyword) => name.includes(keyword));
        return matches ? sum + Number(card.quantity || 1) : sum;
      }, 0);

      return {
        ...group,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    })
    .filter((item) => item.count > 0);
}

function getDeckHealth(analysis: ReturnType<typeof analyzeDeck>) {
  const warnings = analysis.recommendations.length;
  if (warnings === 0) return { label: "Deck équilibré", good: true };
  if (warnings <= 2) return { label: "À ajuster", good: false };
  return { label: "À retravailler", good: false };
}

function analyzeDeck(decklist?: DeckCard[]) {
  if (!decklist || decklist.length === 0) {
    return {
      lands: 0,
      landPercent: 0,
      spells: 0,
      creatures: 0,
      artifacts: 0,
      enchantments: 0,
      instants: 0,
      sorceries: 0,
      planeswalkers: 0,
      ramp: 0,
      draw: 0,
      removal: 0,
      boardWipes: 0,
      averageManaValue: 0,
      knownManaCards: 0,
      unknownManaCards: 0,
      totalPrice: 0,
      recommendations: [] as string[],
    };
  }

  let totalManaValue = 0;
  let knownManaCards = 0;
  let unknownManaCards = 0;

  const totalCards = decklist.reduce((sum, card) => sum + Number(card.quantity || 1), 0);

  const analysis = decklist.reduce(
    (acc, card) => {
      const type = normalizeText(card.typeLine || "");
      const text = normalizeText(card.oracleText || "");
      const name = normalizeText(card.name || "");
      const quantity = Number(card.quantity || 1);
      const isLand = isLandCard(card);

      if (isLand) acc.lands += quantity;
      if (type.includes("creature")) acc.creatures += quantity;
      if (type.includes("artifact") || type.includes("artefact")) acc.artifacts += quantity;
      if (type.includes("enchantment") || type.includes("enchantement")) acc.enchantments += quantity;
      if (type.includes("instant") || type.includes("ephemere")) acc.instants += quantity;
      if (type.includes("sorcery") || type.includes("rituel")) acc.sorceries += quantity;
      if (type.includes("planeswalker")) acc.planeswalkers += quantity;

      if (!isLand) {
        if (hasReliableManaValue(card)) {
          totalManaValue += Number(card.manaValue) * quantity;
          knownManaCards += quantity;
        } else {
          unknownManaCards += quantity;
        }
      }

      const isRamp =
        !isLand &&
        (text.includes("add ") ||
          text.includes("ajoutez ") ||
          text.includes("search your library for a basic land") ||
          text.includes("search your library for a land") ||
          text.includes("cherchez dans votre bibliotheque une carte de terrain") ||
          name.includes("sol ring") ||
          name.includes("arcane signet") ||
          name.includes("signet") ||
          name.includes("talisman"));

      const isDraw =
        text.includes("draw a card") ||
        text.includes("draw cards") ||
        text.includes("draw two cards") ||
        text.includes("draw three cards") ||
        text.includes("piochez une carte") ||
        text.includes("piochez deux cartes") ||
        text.includes("piochez trois cartes");

      const isRemoval =
        text.includes("destroy target") ||
        text.includes("exile target") ||
        text.includes("return target") ||
        text.includes("counter target") ||
        text.includes("detruisez la cible") ||
        text.includes("exilez la cible") ||
        text.includes("renvoyez la cible") ||
        text.includes("contrez le sort cible");

      const isBoardWipe =
        text.includes("destroy all") ||
        text.includes("exile all") ||
        text.includes("each creature") ||
        text.includes("all creatures get") ||
        text.includes("detruisez toutes") ||
        text.includes("exilez toutes") ||
        text.includes("chaque creature");

      if (isRamp) acc.ramp += quantity;
      if (isDraw) acc.draw += quantity;
      if (isRemoval) acc.removal += quantity;
      if (isBoardWipe) acc.boardWipes += quantity;
      acc.totalPrice += Number(card.price || 0) * quantity;
      return acc;
    },
    {
      lands: 0,
      creatures: 0,
      artifacts: 0,
      enchantments: 0,
      instants: 0,
      sorceries: 0,
      planeswalkers: 0,
      ramp: 0,
      draw: 0,
      removal: 0,
      boardWipes: 0,
      totalPrice: 0,
    },
  );

  const spells = Math.max(0, totalCards - analysis.lands);
  const landPercent = totalCards > 0 ? Math.round((analysis.lands / totalCards) * 100) : 0;
  const averageManaValue = knownManaCards > 0 ? Math.round((totalManaValue / knownManaCards) * 10) / 10 : 0;
  const recommendations: string[] = [];

  if (analysis.lands < 34) recommendations.push("Terrains bas : beaucoup de decks Commander jouent autour de 34 à 38 terrains.");
  if (analysis.lands > 39) recommendations.push("Terrains hauts : vérifie que le deck ne manque pas d’action.");
  if (analysis.ramp < 8) recommendations.push("Ramp bas : vise souvent 8 à 12 accélérateurs.");
  if (analysis.draw < 8) recommendations.push("Pioche basse : vise souvent 8 à 12 sources d’avantage de cartes.");
  if (analysis.removal < 6) recommendations.push("Interactions basses : vise souvent 6 à 10 removals ciblés.");
  if (analysis.boardWipes < 2) recommendations.push("Wraths basses : 2 à 4 effets de nettoyage donnent plus de sécurité.");
  if (averageManaValue > 3.6) recommendations.push("Courbe haute : le deck peut être lent sans beaucoup de ramp.");
  if (unknownManaCards > 0) recommendations.push(`${unknownManaCards} sort(s) n’ont pas encore de MV fiable. Lance “Réparer les infos” pour fiabiliser l’analyse.`);

  return {
    ...analysis,
    landPercent,
    spells,
    averageManaValue,
    knownManaCards,
    unknownManaCards,
    totalPrice: Math.round(analysis.totalPrice * 100) / 100,
    recommendations,
  };
}
