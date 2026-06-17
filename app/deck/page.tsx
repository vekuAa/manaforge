/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DeckCard = {
  name: string;
  quantity: number;
  typeLine?: string;
  oracleText?: string;
  manaValue?: number;
  price?: number;
};

type ScryfallCard = {
  name: string;
  type_line?: string;
  oracle_text?: string;
  cmc?: number;
  prices?: {
    eur?: string | null;
    usd?: string | null;
    eur_foil?: string | null;
    usd_foil?: string | null;
  };
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
    .select("id,user_id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,created_at")
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
            setSelectedDeckId(parsedDecks[0]?.id ?? null);
            setSyncStatus("Connecte-toi pour sauvegarder tes decks dans le cloud.");
          }
          return;
        }

        if (!cancelled) setUserId(currentUser.id);

        const { data: remoteDecks, error } = await supabase
          .from("decks")
          .select("id,user_id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,created_at")
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
            .select("id,user_id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,created_at");

          if (importError) throw importError;
          cloudDecks = ((insertedDecks || []) as DeckRow[]).map(mapDeckRow);
          localStorage.removeItem("manaforge-decks");
        }

        if (!cancelled) {
          setDecks(cloudDecks);
          setSelectedDeckId(cloudDecks[0]?.id ?? null);
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

async function enrichDecklist(decklist: DeckCard[]) {
  const response = await fetch("/api/scryfall/collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cards: decklist.map((card) => ({
        name: card.name,
      })),
    }),
  });

  if (!response.ok) {
    return decklist;
  }

  const data = await response.json();

  const foundCards: ScryfallCard[] = Array.isArray(data.data)
    ? data.data
    : [];

  return decklist.map((card) => {
    const found = foundCards.find(
      (item) =>
        item.name.toLowerCase() === card.name.toLowerCase()
    );

    const price = Number(
      found?.prices?.eur ||
      found?.prices?.usd ||
      found?.prices?.eur_foil ||
      found?.prices?.usd_foil ||
      0
    );

    return {
      ...card,
      price,
      typeLine: found?.type_line || "",
      oracleText: found?.oracle_text || "",
      manaValue: Number(found?.cmc || 0),
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
      setSelectedDeckId(remainingDecks[0]?.id ?? null);
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
        </header>

        <div className="mt-8 card-soft p-5">
          <h2 className="text-xl font-black">Créer un deck</h2>
          <div className="mt-5 space-y-4">
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

          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="text-lg font-black">Importer depuis Archidekt</h3>
            <p className="mt-1 text-sm text-muted">Colle l’URL publique de ton deck Archidekt.</p>
            <input value={archidektUrl} onChange={(event) => setArchidektUrl(event.target.value)} placeholder="https://archidekt.com/decks/22768503/kudo_kudo" className="input-premium mt-4" />
            {importError && <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">{importError}</p>}
            <button onClick={importArchidektDeck} disabled={isImporting} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">
              {isImporting ? "Import en cours..." : "Importer Archidekt"}
            </button>
          </div>
        </div>

        {decks.length > 0 && (
          <div className="mt-6 grid gap-3">
            {decks.map((deck) => {
              const games = deck.wins + deck.losses;
              const winrate = games === 0 ? 0 : Math.round((deck.wins / games) * 100);
              return (
                <button key={deck.id} onClick={() => setSelectedDeckId(deck.id)} className={`card-soft p-4 text-left transition ${selectedDeckId === deck.id ? "border-accent bg-white/10" : "border-white/10"}`}>
                  <div className="flex items-center gap-4">
                    {deck.commanderImage ? <img src={deck.commanderImage} alt={deck.commander} className="h-20 w-14 rounded-xl object-cover" /> : <div className="flex h-20 w-14 items-center justify-center rounded-xl bg-black/40 text-2xl">🎴</div>}
                    <div className="flex-1">
                      <h3 className="font-black">{deck.name}</h3>
                      <p className="text-sm font-bold text-accent">{deck.commander}</p>
                      <p className="mt-1 text-xs text-muted">{deck.colors} · {deck.cards} cartes · {winrate}% WR</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedDeck && (
          <div className="mt-6 card-premium overflow-hidden p-5">
            <div className="grid gap-5 md:grid-cols-[150px_1fr]">
              {selectedDeck.commanderImage ? <img src={selectedDeck.commanderImage} alt={selectedDeck.commander} className="h-44 w-32 rounded-2xl object-cover" /> : <div className="flex h-44 w-32 items-center justify-center rounded-2xl bg-black/40 text-5xl">🎴</div>}
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">Deck sélectionné</p>
                <h2 className="mt-2 text-2xl font-black">{selectedDeck.name}</h2>
                <p className="mt-1 font-bold text-accent">{selectedDeck.commander}</p>
                <div className="mt-4 space-y-2 text-sm text-muted">
                  <p>Couleurs : {selectedDeck.colors}</p>
                  <p>Cartes : {selectedDeck.cards}</p>
                  <p>Prix commandant : {formatCurrency(selectedDeck.price)}</p>
                  <p>Prix du deck : {formatCurrency(analysis.totalPrice)}</p>
                </div>

                {selectedDeck.decklist && selectedDeck.decklist.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-muted">Decklist</h3>
                    <div className="max-h-64 overflow-y-auto rounded-2xl bg-black/20 p-3">
                      {selectedDeck.decklist.map((card, index) => (
                        <div key={`${card.name}-${index}`} className="flex justify-between gap-3 border-b border-white/5 py-2 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-bold">{card.name}</div>
                            <div className="text-xs text-muted">MV: {card.manaValue ?? "?"} • {card.price ?? "?"}€</div>
                          </div>
                          <span>x{card.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDeck.decklist && selectedDeck.decklist.length > 0 && (
                  <div className="mt-6 rounded-2xl bg-black/30 p-4">
                    <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-muted">Analyse Scryfall</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <AnalysisBox label="Terrains" value={analysis.lands} />
                      <AnalysisBox label="Créatures" value={analysis.creatures} />
                      <AnalysisBox label="Ramp" value={analysis.ramp} />
                      <AnalysisBox label="Pioche" value={analysis.draw} />
                      <AnalysisBox label="Removal" value={analysis.removal} />
                      <AnalysisBox label="Wraths" value={analysis.boardWipes} />
                      <AnalysisBox label="Prix deck" value={formatCurrency(analysis.totalPrice)} />
                      <AnalysisBox label="Note" value={`${analysis.score}/10`} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => void updateDeckStats(selectedDeck.id, "win")} className="rounded-2xl bg-green-500/20 px-4 py-4 font-black text-green-300">+ Victoire</button>
              <button onClick={() => void updateDeckStats(selectedDeck.id, "loss")} className="rounded-2xl bg-red-500/20 px-4 py-4 font-black text-red-300">+ Défaite</button>
            </div>
            <button onClick={() => { if (window.confirm(`Supprimer le deck "${selectedDeck.name}" ?`)) void deleteDeck(selectedDeck.id); }} className="mt-4 w-full rounded-2xl bg-red-500/10 px-4 py-4 font-black text-red-300">Supprimer le deck</button>
          </div>
        )}
      </section>
      <BottomNav />
    </main>
  );
}

function AnalysisBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-muted">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function analyzeDeck(decklist?: DeckCard[]) {
  if (!decklist || decklist.length === 0) {
    return {
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
      averageManaValue: 0,
      totalPrice: 0,
      score: 0,
    };
  }

  let totalManaValue = 0;
  let nonLandCount = 0;

  const analysis = decklist.reduce(
    (acc, card) => {
      const type = card.typeLine?.toLowerCase() || "";
      const text = card.oracleText?.toLowerCase() || "";
      const name = card.name.toLowerCase();
      const quantity = card.quantity || 1;
      const isLand = type.includes("land");

      if (isLand) acc.lands += quantity;
      if (type.includes("creature")) acc.creatures += quantity;
      if (type.includes("artifact")) acc.artifacts += quantity;
      if (type.includes("enchantment")) acc.enchantments += quantity;
      if (type.includes("instant")) acc.instants += quantity;
      if (type.includes("sorcery")) acc.sorceries += quantity;
      if (type.includes("planeswalker")) acc.planeswalkers += quantity;

      if (!isLand) {
        totalManaValue += (card.manaValue || 0) * quantity;
        nonLandCount += quantity;
      }

      const isRamp =
        !isLand &&
        (text.includes("add ") ||
          text.includes("search your library for a basic land") ||
          text.includes("search your library for a land") ||
          name.includes("sol ring") ||
          name.includes("arcane signet") ||
          name.includes("signet") ||
          name.includes("talisman"));

      const isDraw = text.includes("draw a card") || text.includes("draw cards") || text.includes("draw two cards") || text.includes("draw three cards");
      const isRemoval = text.includes("destroy target") || text.includes("exile target") || text.includes("return target") || text.includes("counter target");
      const isBoardWipe = text.includes("destroy all") || text.includes("exile all") || text.includes("each creature") || text.includes("all creatures get");

      if (isRamp) acc.ramp += quantity;
      if (isDraw) acc.draw += quantity;
      if (isRemoval) acc.removal += quantity;
      if (isBoardWipe) acc.boardWipes += quantity;
      acc.totalPrice += (card.price || 0) * quantity;
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

  const averageManaValue = nonLandCount > 0 ? Math.round((totalManaValue / nonLandCount) * 10) / 10 : 0;
  let score = 10;
  if (analysis.lands < 34) score -= 2;
  if (analysis.lands > 39) score -= 1;
  if (analysis.ramp < 8) score -= 1.5;
  if (analysis.draw < 8) score -= 1.5;
  if (analysis.removal < 6) score -= 1;
  if (analysis.boardWipes < 2) score -= 1;
  if (averageManaValue > 3.6) score -= 1;

  return {
    ...analysis,
    averageManaValue,
    totalPrice: Math.round(analysis.totalPrice * 100) / 100,
    score: Math.max(0, Math.round(score * 10) / 10),
  };
}
