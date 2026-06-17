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

const FOLDER_COLOR_PALETTE = [
  "#facc15",
  "#60a5fa",
  "#a78bfa",
  "#fb7185",
  "#34d399",
  "#f97316",
  "#22d3ee",
  "#f472b6",
];

const DEFAULT_FOLDER_COLORS: Record<string, string> = {
  "Non classé": "#facc15",
  Commander: "#60a5fa",
  Trade: "#a78bfa",
  Staples: "#34d399",
};

function getFallbackFolderColor(folder: string) {
  let hash = 0;

  for (let index = 0; index < folder.length; index += 1) {
    hash = folder.charCodeAt(index) + ((hash << 5) - hash);
  }

  return FOLDER_COLOR_PALETTE[Math.abs(hash) % FOLDER_COLOR_PALETTE.length];
}

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
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLOR_PALETTE[0]);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [printOptions, setPrintOptions] = useState<ScryfallCard[]>([]);
  const [selectedPrintId, setSelectedPrintId] = useState("");

  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("Toutes");
  const [setFilter, setSetFilter] = useState("Toutes");
  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderColors, setFolderColors] = useState<Record<string, string>>(DEFAULT_FOLDER_COLORS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanSetCode, setScanSetCode] = useState("");
  const [scanCollectorNumber, setScanCollectorNumber] = useState("");
  const [scanFolder, setScanFolder] = useState("Non classé");
  const [scanQuantity, setScanQuantity] = useState(1);
  const [scanPreview, setScanPreview] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [isScanAdding, setIsScanAdding] = useState(false);
  const [isRecognizingScan, setIsRecognizingScan] = useState(false);

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
      const savedFolderColors = localStorage.getItem("manaforge-folder-colors");

      const parsedCards = savedCards ? (JSON.parse(savedCards) as CollectionCard[]) : [];
      setCards(
        parsedCards.map((card) => ({
          ...card,
          folder: card.folder || "Non classé",
        })),
      );

      if (savedFolders) {
        setFolders(JSON.parse(savedFolders) as string[]);
      }

      if (savedFolderColors) {
        setFolderColors({
          ...DEFAULT_FOLDER_COLORS,
          ...(JSON.parse(savedFolderColors) as Record<string, string>),
        });
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
    localStorage.setItem("manaforge-folder-colors", JSON.stringify(folderColors));
  }, [cards, folders, folderColors, hasLoaded]);

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
            query,
          )}`,
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
      0,
    );

    const totalValue = filteredCards.reduce(
      (sum, card) => sum + card.quantity * card.price,
      0,
    );

    return {
      totalCards,
      uniqueCards: filteredCards.length,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }, [filteredCards]);

  const globalStats = useMemo(() => {
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const totalValue = cards.reduce(
      (sum, card) => sum + card.quantity * card.price,
      0,
    );

    return {
      totalCards,
      uniqueCards: cards.length,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }, [cards]);

  const folderSummaries = useMemo(() => {
    return folders
      .filter((folder) => folder !== "Toutes")
      .map((folder) => {
        const folderCards = cards.filter((card) => (card.folder || "Non classé") === folder);
        const totalQuantity = folderCards.reduce(
          (sum, card) => sum + card.quantity,
          0,
        );
        const totalValue = folderCards.reduce(
          (sum, card) => sum + card.price * card.quantity,
          0,
        );

        return {
          name: folder,
          uniqueCards: folderCards.length,
          totalQuantity,
          totalValue: Math.round(totalValue * 100) / 100,
          color: folderColors[folder] || getFallbackFolderColor(folder),
        };
      });
  }, [cards, folders, folderColors]);

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
            card.setCode?.toLowerCase() === fullsetCode.trim().toLowerCase(),
        )
        .map((card) => `${card.setCode}-${card.collectorNumber}`),
    );

    const missing = fullsetCards.filter(
      (card) => !ownedKeys.has(`${card.set}-${card.collector_number}`),
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

  const visibleCards = useMemo(() => {
    if (!openedFolder) return filteredCards;

    return cards.filter((card) => {
      const matchesFolder = (card.folder || "Non classé") === openedFolder;
      const matchesSearch = card.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesSet = setFilter === "Toutes" || card.setName === setFilter;

      return matchesFolder && matchesSearch && matchesSet;
    });
  }, [cards, filteredCards, openedFolder, search, setFilter]);

  function getCardImage(card: ScryfallCard) {
    return (
      card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || ""
    );
  }

  function getCardPrice(card: ScryfallCard) {
    return Number(card.prices?.eur || card.prices?.usd || 0);
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function createFolder() {
    const cleanFolder = newFolder.trim();

    if (!cleanFolder || folders.includes(cleanFolder)) {
      setNewFolder("");
      return;
    }

    setFolders((current) => [...current, cleanFolder]);
    setFolderColors((current) => ({
      ...current,
      [cleanFolder]: newFolderColor,
    }));
    setSelectedFolder(cleanFolder);
    setNewFolder("");
    setNewFolderColor(FOLDER_COLOR_PALETTE[0]);
  }

  function deleteFolder(folder: string) {
    if (["Toutes", "Non classé"].includes(folder)) return;

    setCards((current) =>
      current.map((card) =>
        card.folder === folder ? { ...card, folder: "Non classé" } : card,
      ),
    );

    setFolders((current) => current.filter((item) => item !== folder));
    setFolderColors((current) => {
      const next = { ...current };
      delete next[folder];
      return next;
    });

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
          `!"${cleanName}" unique:prints`,
        )}&order=released`,
      );

      if (!response.ok) {
        throw new Error("Carte introuvable sur Scryfall.");
      }

      const data = (await response.json()) as ScryfallSearchResponse;

      setPrintOptions(data.data.slice(0, 30));
      setSelectedPrintId(data.data[0]?.id ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur pendant la recherche.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function addSelectedPrint() {
    const selectedPrint = printOptions.find(
      (card) => card.id === selectedPrintId,
    );

    if (!selectedPrint) {
      setError("Choisis une impression de carte.");
      return;
    }

    try {
      setIsAdding(true);
      setError("");

      const folder =
        selectedFolder === "Toutes" ? "Non classé" : selectedFolder;

      setCards((current) => {
        const existing = current.find(
          (card) =>
            card.name.toLowerCase() === selectedPrint.name.toLowerCase() &&
            card.setCode === selectedPrint.set &&
            card.collectorNumber === selectedPrint.collector_number &&
            card.folder === folder,
        );

        if (existing) {
          return current.map((card) =>
            card.id === existing.id
              ? { ...card, quantity: card.quantity + quantity }
              : card,
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

  async function recognizeCardTextFromImage(file: File) {
    type DetectedText = { rawValue?: string };
    type TextDetectorConstructor = new () => {
      detect: (source: ImageBitmap) => Promise<DetectedText[]>;
    };

    const textDetector = (window as unknown as {
      TextDetector?: TextDetectorConstructor;
    }).TextDetector;

    if (!textDetector) {
      setScanStatus(
        "Reconnaissance auto indisponible sur ce navigateur. Entre le code extension et le numéro manuellement.",
      );
      return;
    }

    try {
      setIsRecognizingScan(true);
      setScanStatus("Analyse de la photo...");

      const bitmap = await createImageBitmap(file);
      const detector = new textDetector();
      const detections = await detector.detect(bitmap);
      const detectedText = detections
        .map((item) => item.rawValue || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const collectorMatch = detectedText.match(/(?:^|\s)(\d{1,4})(?:\s*\/\s*\d{1,4})?(?:\s|$)/);
      const setMatch = detectedText.match(/\b[A-Z0-9]{2,5}\b/g);
      const ignoredTokens = new Set(["EN", "FR", "JP", "DE", "ES", "IT", "PT"]);
      const cleanSet = setMatch
        ?.find((token) => ignoredTokens.has(token) === false)
        ?.toLowerCase();

      if (collectorMatch?.[1]) setScanCollectorNumber(collectorMatch[1]);
      if (cleanSet) setScanSetCode(cleanSet);

      if (collectorMatch?.[1] || cleanSet) {
        setScanStatus(
          "Lecture partielle détectée. Vérifie le code et le numéro avant ajout.",
        );
      } else {
        setScanStatus(
          "Je n’ai pas réussi à lire la carte. Remplis le code extension et le numéro manuellement.",
        );
      }
    } catch {
      setScanStatus("Erreur pendant la reconnaissance. Remplissage manuel nécessaire.");
    } finally {
      setIsRecognizingScan(false);
    }
  }

  async function addScannedCard() {
    const cleanSet = scanSetCode.trim().toLowerCase();
    const cleanNumber = scanCollectorNumber.trim();

    if (!cleanSet || !cleanNumber) {
      setError("Entre le code d’extension et le numéro de collection.");
      return;
    }

    try {
      setIsScanAdding(true);
      setError("");

      const response = await fetch(
        `https://api.scryfall.com/cards/${encodeURIComponent(cleanSet)}/${encodeURIComponent(cleanNumber)}`,
      );

      if (!response.ok) {
        throw new Error("Carte introuvable avec ce code et ce numéro.");
      }

      const card = (await response.json()) as ScryfallCard;
      const folder = scanFolder === "Toutes" ? "Non classé" : scanFolder;

      setCards((current) => {
        const existing = current.find(
          (item) =>
            item.setCode?.toLowerCase() === card.set?.toLowerCase() &&
            item.collectorNumber === card.collector_number &&
            (item.folder || "Non classé") === folder,
        );

        if (existing) {
          return current.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + scanQuantity }
              : item,
          );
        }

        return [
          ...current,
          {
            id: Date.now(),
            name: card.name,
            image: getCardImage(card),
            quantity: scanQuantity,
            price: getCardPrice(card),
            typeLine: card.type_line || "",
            setName: card.set_name || "Extension inconnue",
            setCode: card.set || "",
            collectorNumber: card.collector_number || "",
            rarity: card.rarity || "unknown",
            folder,
          },
        ];
      });

      setScanSetCode("");
      setScanCollectorNumber("");
      setScanQuantity(1);
      setScanPreview("");
      setScanStatus("");
      setShowScanModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant le scan.");
    } finally {
      setIsScanAdding(false);
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
        `e:${cleanSet}`,
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
        err instanceof Error ? err.message : "Erreur pendant le fullset.",
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
            : card,
        )
        .filter((card) => card.quantity > 0),
    );
  }

  function updateCardFolder(id: number, folder: string) {
    setCards((current) =>
      current.map((card) => (card.id === id ? { ...card, folder } : card)),
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

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-black/30 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
                  ManaForge
                </p>

                <h1 className="mt-2 text-4xl font-black text-accent">
                  Collection
                </h1>

                <p className="mt-2 text-sm text-muted">
                  Tes cartes, tes dossiers, ta valeur totale et ton suivi
                  fullset.
                </p>
              </div>

              <CircularValue
                value={globalStats.totalValue}
                label="Valeur totale"
                caption={`${globalStats.totalCards} cartes`}
                segments={folderSummaries}
              />
            </div>
          </div>
        </header>

        {!openedFolder && (
          <section className="mt-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
                  Bibliothèque
                </p>
                <h2 className="mt-1 text-2xl font-black">Mes dossiers</h2>
                <p className="mt-1 text-sm text-muted">
                  Une vue façon classeur : valeur, quantité et aperçu des
                  cartes.
                </p>
              </div>

              <button
                onClick={() => setShowFolderModal(true)}
                className="hidden items-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-400 px-4 py-3 text-sm font-black text-black shadow-xl shadow-yellow-500/10 transition hover:scale-[1.02] sm:flex"
              >
                <span aria-hidden="true">📁</span>
                Nouveau
              </button>
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                  : "grid gap-3"
              }
            >
              {folderSummaries.map((folder) => (
                <FolderCard
                  key={folder.name}
                  folder={folder}
                  viewMode={viewMode}
                  formatCurrency={formatCurrency}
                  onColorChange={(color) =>
                    setFolderColors((current) => ({
                      ...current,
                      [folder.name]: color,
                    }))
                  }
                  onOpen={() => {
                    setOpenedFolder(folder.name);
                    setFolderFilter(folder.name);
                  }}
                  onDelete={() => deleteFolder(folder.name)}
                />
              ))}
            </div>
          </section>
        )}

        {openedFolder && (
          <section className="mt-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4">
              <button
                onClick={() => {
                  setOpenedFolder(null);
                  setFolderFilter("Toutes");
                  setSearch("");
                  setSetFilter("Toutes");
                }}
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15"
              >
                ← Retour aux dossiers
              </button>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-muted">
                    Dossier ouvert
                  </p>
                  <h2 className="mt-1 truncate text-3xl font-black text-accent">
                    {openedFolder}
                  </h2>
                </div>

                <button
                  onClick={() => {
                    setScanFolder(openedFolder);
                    setShowScanModal(true);
                  }}
                  className="rounded-2xl border border-yellow-300/30 bg-yellow-400 px-4 py-3 text-sm font-black text-black shadow-lg shadow-yellow-500/10"
                >
                  📷 Scanner
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard label="Cartes" value={stats.totalCards} />
              <StatCard label="Uniques" value={stats.uniqueCards} />
              <StatCard label="Valeur" value={formatCurrency(stats.totalValue)} />
            </div>

            <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher dans ce dossier"
                className="input-premium"
              />

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

              <div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                    viewMode === "grid"
                      ? "border border-accent/50 bg-accent/20 !text-white shadow-lg"
                      : "!text-white/70 hover:bg-white/10 hover:!text-white"
                  }`}
                >
                  ⊞
                </button>

                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                    viewMode === "list"
                      ? "border border-accent/50 bg-accent/20 !text-white shadow-lg"
                      : "!text-white/70 hover:bg-white/10 hover:!text-white"
                  }`}
                >
                  ☰
                </button>
              </div>
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
                  : "mt-5 grid gap-3"
              }
            >
              {visibleCards.length === 0 ? (
                <div className="card-soft col-span-2 p-5 text-center text-muted">
                  Ce dossier est vide.
                </div>
              ) : (
                visibleCards.map((card) =>
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
                  ),
                )
              )}
            </div>
          </section>
        )}

        {!openedFolder && (
          <>
        <div className="mt-8 grid grid-cols-3 gap-3">
          <StatCard label="Cartes" value={stats.totalCards} />
          <StatCard label="Uniques" value={stats.uniqueCards} />
          <StatCard label="Valeur" value={formatCurrency(stats.totalValue)} />
        </div>

        <div className="mt-4 inline-flex rounded-2xl border border-white/10 bg-white/[0.05] p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              viewMode === "grid"
                ? "border border-accent/50 bg-accent/20 !text-white shadow-lg"
                : "!text-white/70 hover:bg-white/10 hover:!text-white"
            }`}
          >
            ⊞ Grille
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              viewMode === "list"
                ? "border border-accent/50 bg-accent/20 !text-white shadow-lg"
                : "!text-white/70 hover:bg-white/10 hover:!text-white"
            }`}
          >
            ☰ Liste
          </button>
        </div>

        <div className="mt-6 card-premium p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Ajouter une carte</h2>
            <button
              onClick={() => setShowScanModal(true)}
              className="rounded-2xl border border-yellow-300/30 bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-500/10"
            >
              📷 Scanner
            </button>
          </div>

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
                      {card.set_name} · #{card.collector_number} · {card.rarity}
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

        </>
        )}
      </section>

      {!openedFolder && (
      <button
        onClick={() => setShowFolderModal(true)}
        className="fixed bottom-24 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-200/60 bg-yellow-400 text-3xl shadow-2xl shadow-yellow-500/20 ring-4 ring-yellow-400/10 transition hover:scale-105 active:scale-95"
        aria-label="Créer un dossier"
      >
        <span aria-hidden="true">📁</span>
      </button>
      )}

      {showScanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f0f15] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
                  Scan carte
                </p>
                <h2 className="mt-1 text-2xl font-black">Ajouter par numéro</h2>
                <p className="mt-2 text-sm text-muted">
                  Prends la carte en photo, puis renseigne le code d’extension et le numéro en bas de carte.
                </p>
              </div>

              <button
                onClick={() => setShowScanModal(false)}
                className="rounded-2xl bg-white/10 px-3 py-2 font-black"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20 p-5 text-center transition hover:bg-white/[0.06]">
              {scanPreview ? (
                <img src={scanPreview} alt="Carte scannée" className="max-h-64 rounded-2xl object-contain" />
              ) : (
                <>
                  <span className="text-4xl">📷</span>
                  <span className="mt-2 text-sm font-bold text-muted">Ouvrir la caméra</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setScanPreview(URL.createObjectURL(file));
                  void recognizeCardTextFromImage(file);
                }}
              />
            </label>

            {scanStatus && (
              <p className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-xs font-bold text-muted">
                {isRecognizingScan ? "⏳ " : ""}{scanStatus}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <input
                value={scanSetCode}
                onChange={(event) => setScanSetCode(event.target.value)}
                placeholder="Code : mh3"
                className="input-premium uppercase"
              />
              <input
                value={scanCollectorNumber}
                onChange={(event) => setScanCollectorNumber(event.target.value)}
                placeholder="N° : 123"
                className="input-premium"
              />
            </div>

            <div className="mt-3 grid grid-cols-[0.7fr_1.3fr] gap-3">
              <input
                type="number"
                min={1}
                value={scanQuantity}
                onChange={(event) => setScanQuantity(Math.max(1, Number(event.target.value)))}
                className="input-premium"
              />
              <select
                value={scanFolder}
                onChange={(event) => setScanFolder(event.target.value)}
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
            </div>

            <button
              onClick={addScannedCard}
              disabled={isScanAdding}
              className="btn-primary mt-4 w-full disabled:opacity-50"
            >
              {isScanAdding ? "Ajout..." : "Ajouter la carte scannée"}
            </button>
          </div>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f0f15] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-2xl shadow-lg shadow-yellow-500/10">
                    📁
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
                      Collection
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      Nouveau dossier
                    </h2>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowFolderModal(false)}
                className="rounded-2xl bg-white/10 px-3 py-2 font-black"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <input
              value={newFolder}
              onChange={(event) => setNewFolder(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  createFolder();
                  setShowFolderModal(false);
                }
              }}
              placeholder="Nom du dossier"
              className="input-premium mt-5"
              autoFocus
            />

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-muted">
                Couleur du dossier
              </p>
              <div className="mt-3 grid grid-cols-8 gap-2">
                {FOLDER_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewFolderColor(color)}
                    className={`h-8 rounded-full border-2 transition ${
                      newFolderColor === color
                        ? "scale-110 border-white"
                        : "border-white/10"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Choisir la couleur ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setNewFolder("");
                  setShowFolderModal(false);
                }}
                className="btn-soft"
              >
                Annuler
              </button>

              <button
                onClick={() => {
                  createFolder();
                  setShowFolderModal(false);
                }}
                className="btn-primary"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function CircularValue({
  value,
  label,
  caption,
  segments,
}: {
  value: number;
  label: string;
  caption: string;
  segments: {
    name: string;
    totalValue: number;
    color: string;
  }[];
}) {
  const displayValue = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

  const positiveSegments = segments.filter((segment) => segment.totalValue > 0);

  const conicParts = positiveSegments.map((segment, index) => {
    const start = positiveSegments
      .slice(0, index)
      .reduce(
        (sum, currentSegment) =>
          sum + (value > 0 ? (currentSegment.totalValue / value) * 360 : 0),
        0,
      );
    const end = start + (value > 0 ? (segment.totalValue / value) * 360 : 0);

    return `${segment.color} ${start}deg ${end}deg`;
  });

  const conicGradient =
    conicParts.length > 0
      ? `conic-gradient(${conicParts.join(", ")})`
      : "conic-gradient(#facc15 0 360deg)";

  const topSegments = positiveSegments
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 3);

  return (
    <div className="relative shrink-0">
      <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl" />
      <div
        className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/15 bg-black/50 p-3 text-center shadow-2xl"
        style={{
          background: `radial-gradient(circle at center, rgba(9,9,13,0.96) 0 58%, transparent 59%), ${conicGradient}`,
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
          {label}
        </p>
        <p className="mt-1 max-w-[96px] truncate text-xl font-black text-white">
          {displayValue}
        </p>
        <p className="mt-1 text-[10px] font-bold text-muted">{caption}</p>
      </div>

      {topSegments.length > 0 && (
        <div className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-black/25 p-2">
          {topSegments.map((segment) => (
            <div key={segment.name} className="flex items-center gap-2 text-[10px] font-bold text-muted">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="max-w-[72px] truncate">{segment.name}</span>
              <span className="ml-auto text-white">
                {Math.round((segment.totalValue / value) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function FolderCard({
  folder,
  viewMode,
  formatCurrency,
  onColorChange,
  onOpen,
  onDelete,
}: {
  folder: {
    name: string;
    uniqueCards: number;
    totalQuantity: number;
    totalValue: number;
    color: string;
  };
  viewMode: "grid" | "list";
  formatCurrency: (value: number) => string;
  onColorChange: (color: string) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isDefaultFolder = folder.name === "Non classé";

  if (viewMode === "list") {
    return (
      <div className="group relative rounded-3xl border border-white/10 bg-white/[0.055] p-3 transition hover:border-yellow-300/40 hover:bg-white/[0.08]">
        <button onClick={onOpen} className="flex w-full items-center gap-3 text-left">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg"
            style={{ backgroundColor: folder.color }}
          >
            📁
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black">{folder.name}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              {folder.totalQuantity} cartes · {folder.uniqueCards} uniques
            </p>
          </div>

          <p className="shrink-0 text-sm font-black text-accent">
            {formatCurrency(folder.totalValue)}
          </p>
        </button>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex gap-1.5">
            {FOLDER_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColorChange(color)}
                className={`h-4 w-4 rounded-full border transition ${
                  folder.color === color ? "scale-110 border-white" : "border-white/10"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>

          {!isDefaultFolder && (
            <button
              onClick={onDelete}
              className="rounded-xl bg-red-500/10 px-2.5 py-1.5 text-xs font-black text-red-300"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-3xl border border-white/10 bg-white/[0.055] p-3 transition hover:-translate-y-0.5 hover:border-yellow-300/40 hover:bg-white/[0.08]">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg ring-2 ring-white/10"
            style={{ backgroundColor: folder.color }}
          >
            📁
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black">{folder.name}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              {folder.totalQuantity} cartes
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-lg font-black text-accent">
            {formatCurrency(folder.totalValue)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {folder.uniqueCards} uniques
          </p>
        </div>
      </button>

      <div className="mt-3 flex gap-1.5 overflow-hidden border-t border-white/10 pt-3">
        {FOLDER_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className={`h-3.5 w-3.5 shrink-0 rounded-full border transition ${
              folder.color === color ? "scale-110 border-white" : "border-white/10"
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Couleur ${color}`}
          />
        ))}
      </div>

      {!isDefaultFolder && (
        <button
          onClick={onDelete}
          className="absolute right-2 top-2 rounded-xl bg-black/40 px-2 py-1 text-xs font-black text-red-300 opacity-0 transition group-hover:opacity-100"
          title="Supprimer le dossier"
        >
          ✕
        </button>
      )}
    </div>
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center">
      <p className="text-2xl font-black text-accent">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}
