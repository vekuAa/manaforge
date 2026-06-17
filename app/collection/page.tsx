/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  image_uris?: { normal?: string; art_crop?: string };
  card_faces?: { image_uris?: { normal?: string; art_crop?: string } }[];
  prices?: { eur?: string | null; usd?: string | null };
};

type ScryfallSearchResponse = { data: ScryfallCard[]; has_more?: boolean; next_page?: string };
type ScryfallAutocompleteResponse = { data?: string[] };
type FolderSummary = {
  name: string;
  uniqueCards: number;
  totalQuantity: number;
  totalValue: number;
  color: string;
  cover?: string;
};

type TesseractWorker = {
  recognize: (file: File | Blob) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};

type TesseractApi = {
  createWorker: (language?: string) => Promise<TesseractWorker>;
};

const FOLDER_COLOR_PALETTE = [
  "#22d3ee",
  "#ef4444",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#eab308",
  "#ec4899",
  "#94a3b8",
];

const DEFAULT_FOLDER_COLORS: Record<string, string> = {
  "Non classé": "#22d3ee",
  Commander: "#f97316",
  Trade: "#a855f7",
  Staples: "#22c55e",
};

function getFallbackFolderColor(folder: string) {
  let hash = 0;
  for (let index = 0; index < folder.length; index += 1) {
    hash = folder.charCodeAt(index) + ((hash << 5) - hash);
  }
  return FOLDER_COLOR_PALETTE[Math.abs(hash) % FOLDER_COLOR_PALETTE.length];
}

function formatCurrency(value: number, maxDigits = 2) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function getCardImage(card: ScryfallCard) {
  return card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || "";
}

function getCardArt(card: ScryfallCard) {
  return card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop || getCardImage(card);
}

function getCardPrice(card: ScryfallCard) {
  return Number(card.prices?.eur || card.prices?.usd || 0);
}

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [folders, setFolders] = useState<string[]>(["Toutes", "Non classé", "Commander", "Trade", "Staples"]);
  const [folderColors, setFolderColors] = useState<Record<string, string>>(DEFAULT_FOLDER_COLORS);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [setFilter, setSetFilter] = useState("Toutes");
  const [activeHomeTab, setActiveHomeTab] = useState<"collection" | "fullset">("collection");

  const [fullsetCode, setFullsetCode] = useState("");
  const [fullsetCards, setFullsetCards] = useState<ScryfallCard[]>([]);
  const [isLoadingFullset, setIsLoadingFullset] = useState(false);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLOR_PALETTE[0]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [cardName, setCardName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [printOptions, setPrintOptions] = useState<ScryfallCard[]>([]);
  const [selectedPrintId, setSelectedPrintId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [showScanModal, setShowScanModal] = useState(false);
  const [scanFolder, setScanFolder] = useState("Non classé");
  const [scanQuantity, setScanQuantity] = useState(1);
  const [scanPreview, setScanPreview] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [scanResult, setScanResult] = useState<ScryfallCard | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const savedCards = localStorage.getItem("manaforge-collection");
      const savedFolders = localStorage.getItem("manaforge-folders");
      const savedFolderColors = localStorage.getItem("manaforge-folder-colors");

      const parsedCards = savedCards ? (JSON.parse(savedCards) as CollectionCard[]) : [];
      setCards(parsedCards.map((card) => ({ ...card, folder: card.folder || "Non classé" })));
      if (savedFolders) setFolders(JSON.parse(savedFolders) as string[]);
      if (savedFolderColors) {
        setFolderColors({ ...DEFAULT_FOLDER_COLORS, ...(JSON.parse(savedFolderColors) as Record<string, string>) });
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
        const response = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
        if (!response.ok) return setSuggestions([]);
        const data = (await response.json()) as ScryfallAutocompleteResponse;
        setSuggestions(data.data?.slice(0, 8) ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [cardName]);

  const globalStats = useMemo(() => {
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const totalValue = cards.reduce((sum, card) => sum + card.quantity * card.price, 0);
    return { totalCards, uniqueCards: cards.length, totalValue: Math.round(totalValue * 100) / 100 };
  }, [cards]);

  const folderSummaries = useMemo<FolderSummary[]>(() => {
    return folders
      .filter((folder) => folder !== "Toutes")
      .map((folder) => {
        const folderCards = cards.filter((card) => (card.folder || "Non classé") === folder);
        const totalQuantity = folderCards.reduce((sum, card) => sum + card.quantity, 0);
        const totalValue = folderCards.reduce((sum, card) => sum + card.price * card.quantity, 0);
        return {
          name: folder,
          uniqueCards: folderCards.length,
          totalQuantity,
          totalValue: Math.round(totalValue * 100) / 100,
          color: folderColors[folder] || getFallbackFolderColor(folder),
          cover: folderCards.find((card) => card.image)?.image,
        };
      });
  }, [cards, folders, folderColors]);

  const extensions = useMemo(() => {
    const values = cards.map((card) => card.setName).filter((value): value is string => Boolean(value));
    return ["Toutes", ...Array.from(new Set(values)).sort()];
  }, [cards]);

  const openedFolderSummary = openedFolder === "__ALL__" ? undefined : folderSummaries.find((folder) => folder.name === openedFolder);

  const visibleCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesFolder = !openedFolder || openedFolder === "__ALL__" || (card.folder || "Non classé") === openedFolder;
      const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
      const matchesSet = setFilter === "Toutes" || card.setName === setFilter;
      return matchesFolder && matchesSearch && matchesSet;
    });
  }, [cards, openedFolder, search, setFilter]);

  const openedStats = useMemo(() => {
    const totalCards = visibleCards.reduce((sum, card) => sum + card.quantity, 0);
    const totalValue = visibleCards.reduce((sum, card) => sum + card.quantity * card.price, 0);
    return { totalCards, uniqueCards: visibleCards.length, totalValue: Math.round(totalValue * 100) / 100 };
  }, [visibleCards]);

  const fullsetProgress = useMemo(() => {
    if (fullsetCards.length === 0) {
      return { owned: 0, total: 0, percent: 0, missing: [] as ScryfallCard[] };
    }

    const cleanSetCode = fullsetCode.trim().toLowerCase();
    const ownedKeys = new Set(
      cards
        .filter((card) => card.setCode?.toLowerCase() === cleanSetCode)
        .map((card) => `${card.setCode?.toLowerCase()}-${card.collectorNumber}`),
    );

    const missing = fullsetCards.filter((card) => !ownedKeys.has(`${card.set?.toLowerCase()}-${card.collector_number}`));
    const owned = fullsetCards.length - missing.length;

    return {
      owned,
      total: fullsetCards.length,
      percent: fullsetCards.length > 0 ? Math.round((owned / fullsetCards.length) * 100) : 0,
      missing,
    };
  }, [cards, fullsetCards, fullsetCode]);

  function createFolder() {
    const cleanFolder = newFolder.trim();
    if (!cleanFolder || folders.includes(cleanFolder)) {
      setNewFolder("");
      return;
    }
    setFolders((current) => [...current, cleanFolder]);
    setFolderColors((current) => ({ ...current, [cleanFolder]: newFolderColor }));
    setSelectedFolder(cleanFolder);
    setScanFolder(cleanFolder);
    setNewFolder("");
    setNewFolderColor(FOLDER_COLOR_PALETTE[0]);
  }

  function deleteFolder(folder: string) {
    if (["Toutes", "Non classé"].includes(folder)) return;
    setCards((current) => current.map((card) => (card.folder === folder ? { ...card, folder: "Non classé" } : card)));
    setFolders((current) => current.filter((item) => item !== folder));
    setFolderColors((current) => {
      const next = { ...current };
      delete next[folder];
      return next;
    });
    if (openedFolder === folder) setOpenedFolder(null);
  }

  function addCardToCollection(card: ScryfallCard, folder: string, amount: number) {
    const cleanFolder = folder === "Toutes" ? "Non classé" : folder;
    setCards((current) => {
      const existing = current.find(
        (item) =>
          item.setCode?.toLowerCase() === card.set?.toLowerCase() &&
          item.collectorNumber === card.collector_number &&
          (item.folder || "Non classé") === cleanFolder,
      );
      if (existing) {
        return current.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + amount } : item));
      }
      return [
        ...current,
        {
          id: Date.now(),
          name: card.name,
          image: getCardImage(card),
          quantity: amount,
          price: getCardPrice(card),
          typeLine: card.type_line || "",
          setName: card.set_name || "Extension inconnue",
          setCode: card.set || "",
          collectorNumber: card.collector_number || "",
          rarity: card.rarity || "unknown",
          folder: cleanFolder,
        },
      ];
    });
  }

  async function searchPrints() {
    const cleanName = cardName.trim();
    if (!cleanName) return setError("Entre le nom d’une carte.");
    try {
      setIsSearching(true);
      setError("");
      setPrintOptions([]);
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!\"${cleanName}\" unique:prints`)}&order=released`,
      );
      if (!response.ok) throw new Error("Carte introuvable sur Scryfall.");
      const data = (await response.json()) as ScryfallSearchResponse;
      setPrintOptions(data.data.slice(0, 30));
      setSelectedPrintId(data.data[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant la recherche.");
    } finally {
      setIsSearching(false);
    }
  }

  async function addSelectedPrint() {
    const selectedPrint = printOptions.find((card) => card.id === selectedPrintId);
    if (!selectedPrint) return setError("Choisis une impression de carte.");
    setIsAdding(true);
    addCardToCollection(selectedPrint, selectedFolder, quantity);
    setIsAdding(false);
    setCardName("");
    setQuantity(1);
    setSuggestions([]);
    setPrintOptions([]);
    setSelectedPrintId("");
    setShowAddModal(false);
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
      let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`e:${cleanSet}`)}&unique=prints&order=set`;
      const allCards: ScryfallCard[] = [];

      while (url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Extension introuvable sur Scryfall.");
        const data = (await response.json()) as ScryfallSearchResponse;
        allCards.push(...data.data);
        url = data.has_more && data.next_page ? data.next_page : "";
      }

      setFullsetCards(allCards);
      setActiveHomeTab("fullset");
    } catch (err) {
      setFullsetCards([]);
      setError(err instanceof Error ? err.message : "Erreur pendant le fullset.");
    } finally {
      setIsLoadingFullset(false);
    }
  }

  function updateQuantity(id: number, amount: number) {
    setCards((current) =>
      current.map((card) => (card.id === id ? { ...card, quantity: Math.max(0, card.quantity + amount) } : card)).filter((card) => card.quantity > 0),
    );
  }

  function deleteCard(id: number) {
    setCards((current) => current.filter((card) => card.id !== id));
  }

  async function loadTesseract() {
    const existing = (window as unknown as { Tesseract?: TesseractApi }).Tesseract;
    if (existing) return existing;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Impossible de charger le moteur OCR."));
      document.body.appendChild(script);
    });

    const loaded = (window as unknown as { Tesseract?: TesseractApi }).Tesseract;
    if (!loaded) throw new Error("Moteur OCR indisponible.");
    return loaded;
  }

  function extractPossibleCardName(text: string) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 2);

    const badWords = ["instant", "sorcery", "creature", "artifact", "enchantment", "land", "planeswalker", "basic", "legendary"];
    return lines.find((line) => !badWords.some((word) => line.toLowerCase().includes(word))) || lines[0] || "";
  }

  function extractSetAndNumber(text: string) {
    const normalized = text.replace(/\s+/g, " ");
    const numberMatch = normalized.match(/(?:^|\s)(\d{1,4})(?:\s*\/\s*\d{1,4})?(?:\s|$)/);
    const tokens = normalized.match(/\b[A-Z0-9]{2,5}\b/g) || [];
    const ignored = new Set(["EN", "FR", "DE", "ES", "IT", "PT", "JP", "USA", "TM", "MTG"]);
    const setCode = tokens.find((token) => !ignored.has(token) && /[A-Z]/.test(token));
    return { setCode: setCode?.toLowerCase(), collectorNumber: numberMatch?.[1] };
  }

  async function prepareImageForOcr(file: File, mode: "full" | "title" | "bottom" = "full") {
    const bitmap = await createImageBitmap(file);
    const sourceY = mode === "title" ? 0 : mode === "bottom" ? Math.floor(bitmap.height * 0.62) : 0;
    const sourceHeight = mode === "title" ? Math.floor(bitmap.height * 0.28) : mode === "bottom" ? Math.floor(bitmap.height * 0.38) : bitmap.height;
    const maxWidth = mode === "full" ? 1600 : 1900;
    const ratio = Math.min(maxWidth / bitmap.width, 1.8);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(sourceHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, sourceY, bitmap.width, sourceHeight, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let index = 0; index < data.length; index += 4) {
      const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const contrasted = gray > 145 ? 255 : gray < 95 ? 0 : gray * 1.25;
      data[index] = contrasted;
      data[index + 1] = contrasted;
      data[index + 2] = contrasted;
    }
    context.putImageData(image, 0, 0);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.95);
    });
  }

  function uniqueOcrLines(text: string) {
    return Array.from(new Set(text.split("\n").map((line) => line.trim()).filter(Boolean))).join("\n");
  }

  async function findCardFromOcr(text: string) {
    const { setCode, collectorNumber } = extractSetAndNumber(text);

    if (setCode && collectorNumber) {
      const response = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(collectorNumber)}`);
      if (response.ok) return (await response.json()) as ScryfallCard;
    }

    const possibleName = extractPossibleCardName(text);
    if (possibleName) {
      const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(possibleName)}`);
      if (response.ok) return (await response.json()) as ScryfallCard;
    }

    throw new Error("Carte non reconnue. Reprends la photo plus près, bien droite et avec le nom de la carte visible.");
  }

  async function scanImage(file: File) {
    try {
      setIsScanning(true);
      setScanResult(null);
      setError("");
      setScanStatus("Photo reçue. Je lis le nom et le numéro de la carte...");
      setScanPreview(URL.createObjectURL(file));

      const tesseract = await loadTesseract();
      const worker = await tesseract.createWorker("eng");

      const titleImage = await prepareImageForOcr(file, "title");
      const bottomImage = await prepareImageForOcr(file, "bottom");
      const fullImage = await prepareImageForOcr(file, "full");

      const titleResult = await worker.recognize(titleImage);
      const bottomResult = await worker.recognize(bottomImage);
      const fullResult = await worker.recognize(fullImage);
      await worker.terminate();

      const ocrText = uniqueOcrLines(`${titleResult.data.text}\n${bottomResult.data.text}\n${fullResult.data.text}`);
      const card = await findCardFromOcr(ocrText);
      setScanResult(card);
      setScanStatus(`Carte reconnue : ${card.name}`);
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : "Carte non reconnue. Reprends une photo bien nette, droite, avec le nom visible en haut.");
    } finally {
      setIsScanning(false);
    }
  }

  function confirmScannedCard() {
    if (!scanResult) return;
    addCardToCollection(scanResult, scanFolder, scanQuantity);
    setShowScanModal(false);
    setScanPreview("");
    setScanStatus("");
    setScanResult(null);
    setScanQuantity(1);
  }

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-[#101116] text-white">
        <section className="mx-auto max-w-5xl px-4 py-10 pb-28">
          <p className="text-white/60">Chargement...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101116] text-white">
      <section className="mx-auto max-w-5xl px-4 pb-28 pt-8">
        {!openedFolder ? (
          <CollectionHome
            globalStats={globalStats}
            folderSummaries={folderSummaries}
            activeHomeTab={activeHomeTab}
            setActiveHomeTab={setActiveHomeTab}
            fullsetCode={fullsetCode}
            setFullsetCode={setFullsetCode}
            fullsetCards={fullsetCards}
            fullsetProgress={fullsetProgress}
            isLoadingFullset={isLoadingFullset}
            fullsetError={error}
            onLoadFullset={loadFullset}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onOpenAll={() => {
              setOpenedFolder("__ALL__");
              setSearch("");
              setSetFilter("Toutes");
            }}
            onOpenFolder={(folder) => {
              setOpenedFolder(folder);
              setSearch("");
              setSetFilter("Toutes");
            }}
            onCreateFolder={() => setShowFolderModal(true)}
            onDeleteFolder={deleteFolder}
            onColorChange={(folder, color) => setFolderColors((current) => ({ ...current, [folder]: color }))}
          />
        ) : (
          <FolderView
            folder={openedFolder === "__ALL__" ? "Toutes les collections" : openedFolder}
            summary={openedFolderSummary}
            cards={visibleCards}
            stats={openedStats}
            search={search}
            setSearch={setSearch}
            extensions={extensions}
            setFilter={setFilter}
            setSetFilter={setSetFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onBack={() => setOpenedFolder(null)}
            onScan={() => {
              setScanFolder(openedFolder === "__ALL__" ? "Non classé" : openedFolder);
              setShowScanModal(true);
            }}
            onAdd={() => {
              setSelectedFolder(openedFolder === "__ALL__" ? "Non classé" : openedFolder);
              setShowAddModal(true);
            }}
            onMinus={(id) => updateQuantity(id, -1)}
            onPlus={(id) => updateQuantity(id, 1)}
            onDelete={deleteCard}
          />
        )}
      </section>

      <div className="fixed bottom-24 right-3 z-40 flex flex-col gap-2">
        {!openedFolder && (
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f59e0b] text-lg shadow-xl shadow-orange-500/20 ring-2 ring-white/10 transition active:scale-95"
            aria-label="Créer un dossier"
          >
            📁
          </button>
        )}
        {!openedFolder && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.12] text-lg shadow-xl ring-1 ring-white/10 backdrop-blur transition active:scale-95"
            aria-label="Ajouter une carte"
          >
            🎴
          </button>
        )}
        <button
          onClick={() => {
            setScanFolder(openedFolder && openedFolder !== "__ALL__" ? openedFolder : "Non classé");
            setShowScanModal(true);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-lg shadow-xl backdrop-blur transition active:scale-95"
          aria-label="Scanner une carte"
        >
          ⛶
        </button>
      </div>

      {showFolderModal && (
        <FolderModal
          newFolder={newFolder}
          setNewFolder={setNewFolder}
          newFolderColor={newFolderColor}
          setNewFolderColor={setNewFolderColor}
          onClose={() => setShowFolderModal(false)}
          onCreate={() => {
            createFolder();
            setShowFolderModal(false);
          }}
        />
      )}

      {showAddModal && (
        <AddCardModal
          folders={folders}
          cardName={cardName}
          setCardName={setCardName}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          printOptions={printOptions}
          selectedPrintId={selectedPrintId}
          setSelectedPrintId={setSelectedPrintId}
          isSearching={isSearching}
          isAdding={isAdding}
          error={error}
          onSearch={searchPrints}
          onAdd={addSelectedPrint}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showScanModal && (
        <ScanModal
          folders={folders}
          scanFolder={scanFolder}
          setScanFolder={setScanFolder}
          scanQuantity={scanQuantity}
          setScanQuantity={setScanQuantity}
          scanPreview={scanPreview}
          scanStatus={scanStatus}
          scanResult={scanResult}
          isScanning={isScanning}
          fileInputRef={fileInputRef}
          onFile={(file) => void scanImage(file)}
          onConfirm={confirmScannedCard}
          onClose={() => setShowScanModal(false)}
        />
      )}

      <BottomNav />
    </main>
  );
}

function CollectionHome({
  globalStats,
  folderSummaries,
  activeHomeTab,
  setActiveHomeTab,
  fullsetCode,
  setFullsetCode,
  fullsetCards,
  fullsetProgress,
  isLoadingFullset,
  fullsetError,
  onLoadFullset,
  viewMode,
  setViewMode,
  onOpenAll,
  onOpenFolder,
  onCreateFolder,
  onDeleteFolder,
  onColorChange,
}: {
  globalStats: { totalCards: number; uniqueCards: number; totalValue: number };
  folderSummaries: FolderSummary[];
  activeHomeTab: "collection" | "fullset";
  setActiveHomeTab: (tab: "collection" | "fullset") => void;
  fullsetCode: string;
  setFullsetCode: (value: string) => void;
  fullsetCards: ScryfallCard[];
  fullsetProgress: { owned: number; total: number; percent: number; missing: ScryfallCard[] };
  isLoadingFullset: boolean;
  fullsetError: string;
  onLoadFullset: () => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  onOpenAll: () => void;
  onOpenFolder: (folder: string) => void;
  onCreateFolder: () => void;
  onDeleteFolder: (folder: string) => void;
  onColorChange: (folder: string, color: string) => void;
}) {
  return (
    <>
      <header className="relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-xl font-black">
            ←
          </Link>
          <h1 className="text-lg font-black">Collection</h1>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-xl font-black">...</button>
        </div>

        <div className="mt-5 flex justify-center">
          <CircularValue value={globalStats.totalValue} caption={`${globalStats.totalCards} cartes`} segments={folderSummaries} />
        </div>

        <div className="mt-6 grid grid-cols-2 border-b border-white/10 text-sm font-black">
          <button
            onClick={() => setActiveHomeTab("collection")}
            className={`pb-3 ${activeHomeTab === "collection" ? "border-b-2 border-[#f59e0b] text-[#f59e0b]" : "text-white/70"}`}
          >
            ▣ Collection
          </button>
          <button
            onClick={() => setActiveHomeTab("fullset")}
            className={`pb-3 ${activeHomeTab === "fullset" ? "border-b-2 border-[#f59e0b] text-[#f59e0b]" : "text-white/70"}`}
          >
            ◎ Full set
          </button>
        </div>
      </header>

      {activeHomeTab === "collection" ? (
        <>
          <div className="mt-4 grid gap-2">
            <button onClick={onOpenAll} className="flex items-center justify-between rounded-xl bg-white/[0.08] px-4 py-3 font-black active:scale-[0.99]">
              <span>🗃️ Toutes les collections</span>
              <span className="text-white/50">›</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">Mes dossiers</p>
            <div className="flex items-center gap-2">
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
              <button onClick={onCreateFolder} className="rounded-xl bg-[#f59e0b] px-3 py-2 text-xs font-black text-black">＋ Dossier</button>
            </div>
          </div>

          <div className={viewMode === "grid" ? "mt-3 grid grid-cols-2 gap-3 md:grid-cols-3" : "mt-3 grid gap-3"}>
            {folderSummaries.map((folder) => (
              <BinderCard
                key={folder.name}
                folder={folder}
                compact={viewMode === "grid"}
                onOpen={() => onOpenFolder(folder.name)}
                onDelete={() => onDeleteFolder(folder.name)}
                onColorChange={(color) => onColorChange(folder.name, color)}
              />
            ))}
          </div>
        </>
      ) : (
        <FullsetPanel
          fullsetCode={fullsetCode}
          setFullsetCode={setFullsetCode}
          fullsetCards={fullsetCards}
          progress={fullsetProgress}
          isLoading={isLoadingFullset}
          error={fullsetError}
          onLoad={onLoadFullset}
        />
      )}
    </>
  );
}

function FullsetPanel({
  fullsetCode,
  setFullsetCode,
  fullsetCards,
  progress,
  isLoading,
  error,
  onLoad,
}: {
  fullsetCode: string;
  setFullsetCode: (value: string) => void;
  fullsetCards: ScryfallCard[];
  progress: { owned: number; total: number; percent: number; missing: ScryfallCard[] };
  isLoading: boolean;
  error: string;
  onLoad: () => void;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <h2 className="text-xl font-black">Suivi Full set</h2>
      <p className="mt-1 text-sm font-bold text-white/55">Entre un code d’extension : MH3, LTR, FIN, DFT...</p>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <input
          value={fullsetCode}
          onChange={(event) => setFullsetCode(event.target.value)}
          placeholder="mh3"
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-black uppercase outline-none"
        />
        <button onClick={onLoad} disabled={isLoading} className="rounded-xl bg-[#f59e0b] px-5 py-3 font-black text-black disabled:opacity-50">
          {isLoading ? "..." : "Analyser"}
        </button>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

      {fullsetCards.length > 0 && (
        <div className="mt-5 rounded-2xl bg-black/25 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white/55">Progression</p>
              <p className="text-2xl font-black">{progress.owned}/{progress.total}</p>
            </div>
            <p className="text-2xl font-black text-[#f59e0b]">{progress.percent}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${progress.percent}%` }} />
          </div>

          <h3 className="mt-5 font-black">Cartes manquantes</h3>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {progress.missing.slice(0, 120).map((card) => (
              <div key={card.id} className="flex items-center justify-between rounded-xl bg-white/[0.06] p-3 text-sm">
                <span className="truncate font-bold">{card.name}</span>
                <span className="ml-3 shrink-0 text-white/55">#{card.collector_number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CircularValue({ value, caption, segments }: { value: number; caption: string; segments: FolderSummary[] }) {
  const positiveSegments = segments.filter((segment) => segment.totalValue > 0);
  const conicParts = positiveSegments.map((segment, index) => {
    const start = positiveSegments.slice(0, index).reduce((sum, current) => sum + (value > 0 ? (current.totalValue / value) * 360 : 0), 0);
    const end = start + (value > 0 ? (segment.totalValue / value) * 360 : 0);
    return `${segment.color} ${start}deg ${end}deg`;
  });
  const conicGradient = conicParts.length > 0 ? `conic-gradient(${conicParts.join(", ")})` : "conic-gradient(#f59e0b 0 360deg)";

  return (
    <div
      className="flex h-40 w-40 flex-col items-center justify-center rounded-full text-center shadow-2xl"
      style={{ background: `radial-gradient(circle at center, #101116 0 58%, transparent 59%), ${conicGradient}` }}
    >
      <p className="text-xs font-black text-emerald-400">+0,00 €</p>
      <p className="mt-1 text-2xl font-black">{formatCurrency(value, 2)}</p>
      <p className="text-xs font-bold text-white/60">{caption}</p>
    </div>
  );
}

function BinderCard({
  folder,
  compact,
  onOpen,
  onDelete,
  onColorChange,
}: {
  folder: FolderSummary;
  compact: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
}) {
  const isDefaultFolder = folder.name === "Non classé";
  const background = `linear-gradient(90deg, ${folder.color}33, rgba(255,255,255,.05))`;

  if (compact) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-3">
        <button onClick={onOpen} className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: folder.color }}>
              📁
            </div>
            <span className="text-white/60">...</span>
          </div>
          <p className="mt-3 truncate font-black">{folder.name}</p>
          <p className="text-xs font-bold text-white/70">{folder.totalQuantity} cartes</p>
          <p className="mt-1 text-sm font-black">{formatCurrency(folder.totalValue, 2)}</p>
        </button>
        <ColorDots color={folder.color} onColorChange={onColorChange} />
        {!isDefaultFolder && (
          <button onClick={onDelete} className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-red-300 opacity-0 group-hover:opacity-100">
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-cover bg-center" style={{ backgroundImage: background }}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: folder.color }} />
      <button onClick={onOpen} className="flex min-h-20 w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div>
          <p className="font-black">{folder.name}</p>
          <p className="text-xs font-bold text-white/70">{folder.totalQuantity} cartes · {folder.uniqueCards} uniques</p>
        </div>
        <div className="text-right">
          <p className="font-black">{formatCurrency(folder.totalValue, 2)}</p>
          <p className="text-xs text-emerald-400">+0,00 €</p>
        </div>
      </button>
      <div className="px-4 pb-2"><ColorDots color={folder.color} onColorChange={onColorChange} /></div>
      {!isDefaultFolder && (
        <button onClick={onDelete} className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-red-300 opacity-0 group-hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}

function ColorDots({ color, onColorChange }: { color: string; onColorChange: (color: string) => void }) {
  return (
    <div className="mt-2 flex gap-1.5">
      {FOLDER_COLOR_PALETTE.map((item) => (
        <button
          key={item}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onColorChange(item);
          }}
          className={`h-3 w-3 rounded-full border ${color === item ? "border-white" : "border-white/10"}`}
          style={{ backgroundColor: item }}
          aria-label={`Couleur ${item}`}
        />
      ))}
    </div>
  );
}

function FolderView({
  folder,
  summary,
  cards,
  stats,
  search,
  setSearch,
  extensions,
  setFilter,
  setSetFilter,
  viewMode,
  setViewMode,
  onBack,
  onScan,
  onAdd,
  onMinus,
  onPlus,
  onDelete,
}: {
  folder: string;
  summary?: FolderSummary;
  cards: CollectionCard[];
  stats: { totalCards: number; uniqueCards: number; totalValue: number };
  search: string;
  setSearch: (value: string) => void;
  extensions: string[];
  setFilter: string;
  setSetFilter: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  onBack: () => void;
  onScan: () => void;
  onAdd: () => void;
  onMinus: (id: number) => void;
  onPlus: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <>
      <header>
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-xl font-black">←</button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-xl font-black">...</button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: summary?.color || "#f59e0b" }}>📁</div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{folder}</h1>
            <p className="text-sm font-bold text-white/60">{stats.totalCards} cartes · {formatCurrency(stats.totalValue, 2)}</p>
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2 text-white/60">
          <span>⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Rechercher dans ${folder}`} className="w-full bg-transparent text-sm outline-none placeholder:text-white/40" />
        </div>
        <button className="rounded-xl bg-black/25 px-4 text-white/80">≡</button>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <select value={setFilter} onChange={(event) => setSetFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-white outline-none">
          {extensions.map((extension) => <option key={extension} value={extension}>{extension}</option>)}
        </select>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Cartes" value={stats.totalCards} />
        <MiniStat label="Uniques" value={stats.uniqueCards} />
        <MiniStat label="Valeur" value={formatCurrency(stats.totalValue, 2)} />
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={onAdd} className="flex-1 rounded-xl bg-white/[0.08] px-4 py-3 font-black">＋ Ajouter</button>
        <button onClick={onScan} className="flex-1 rounded-xl bg-[#f59e0b] px-4 py-3 font-black text-black">⛶ Scanner</button>
      </div>

      <div className={viewMode === "grid" ? "mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" : "mt-5 grid gap-3"}>
        {cards.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.05] p-6 text-center text-white/60">Ce dossier est vide.</div>
        ) : cards.map((card) => viewMode === "grid" ? (
          <CardTile key={card.id} card={card} onMinus={() => onMinus(card.id)} onPlus={() => onPlus(card.id)} onDelete={() => onDelete(card.id)} />
        ) : (
          <CardRow key={card.id} card={card} onMinus={() => onMinus(card.id)} onPlus={() => onPlus(card.id)} onDelete={() => onDelete(card.id)} />
        ))}
      </div>
    </>
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

function CardTile({ card, onMinus, onPlus, onDelete }: { card: CollectionCard; onMinus: () => void; onPlus: () => void; onDelete: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white/[0.05] p-1.5">
      {card.image ? <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-lg object-cover" /> : <div className="aspect-[63/88] rounded-lg bg-black/30" />}
      <p className="mt-1 truncate text-[11px] font-bold">{card.name}</p>
      <p className="text-[10px] text-white/60">{formatCurrency(card.price * card.quantity, 2)} · x{card.quantity}</p>
      <div className="absolute inset-x-1 bottom-8 hidden grid-cols-3 gap-1 group-hover:grid">
        <button onClick={onMinus} className="rounded bg-black/70 py-1">−</button>
        <button onClick={onPlus} className="rounded bg-[#f59e0b] py-1 text-black">+</button>
        <button onClick={onDelete} className="rounded bg-red-500/80 py-1">×</button>
      </div>
    </div>
  );
}

function CardRow({ card, onMinus, onPlus, onDelete }: { card: CollectionCard; onMinus: () => void; onPlus: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3">
      {card.image ? <img src={card.image} alt={card.name} className="h-20 w-14 rounded-lg object-cover" /> : <div className="h-20 w-14 rounded-lg bg-black/30" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-black">{card.name}</p>
        <p className="text-xs text-white/60">{card.setCode?.toUpperCase()} #{card.collectorNumber}</p>
        <p className="mt-1 text-sm font-black">{formatCurrency(card.price * card.quantity, 2)} · x{card.quantity}</p>
        <div className="mt-2 flex gap-2">
          <button onClick={onMinus} className="rounded-lg bg-black/30 px-3 py-1">−</button>
          <button onClick={onPlus} className="rounded-lg bg-[#f59e0b] px-3 py-1 text-black">+</button>
          <button onClick={onDelete} className="rounded-lg bg-red-500/20 px-3 py-1 text-red-200">×</button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3 text-center">
      <p className="font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );
}

function FolderModal({
  newFolder,
  setNewFolder,
  newFolderColor,
  setNewFolderColor,
  onClose,
  onCreate,
}: {
  newFolder: string;
  setNewFolder: (value: string) => void;
  newFolderColor: string;
  setNewFolderColor: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#17181f] p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Nouveau dossier</h2><button onClick={onClose}>✕</button></div>
        <input value={newFolder} onChange={(event) => setNewFolder(event.target.value)} placeholder="Nom du dossier" className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" autoFocus />
        <div className="mt-4 flex gap-2">{FOLDER_COLOR_PALETTE.map((color) => <button key={color} onClick={() => setNewFolderColor(color)} className={`h-8 w-8 rounded-full border-2 ${newFolderColor === color ? "border-white" : "border-transparent"}`} style={{ backgroundColor: color }} />)}</div>
        <button onClick={onCreate} className="mt-5 w-full rounded-xl bg-[#f59e0b] py-3 font-black text-black">Créer</button>
      </div>
    </div>
  );
}

function AddCardModal({
  folders,
  cardName,
  setCardName,
  quantity,
  setQuantity,
  selectedFolder,
  setSelectedFolder,
  suggestions,
  setSuggestions,
  printOptions,
  selectedPrintId,
  setSelectedPrintId,
  isSearching,
  isAdding,
  error,
  onSearch,
  onAdd,
  onClose,
}: {
  folders: string[];
  cardName: string;
  setCardName: (value: string) => void;
  quantity: number;
  setQuantity: (value: number) => void;
  selectedFolder: string;
  setSelectedFolder: (value: string) => void;
  suggestions: string[];
  setSuggestions: (value: string[]) => void;
  printOptions: ScryfallCard[];
  selectedPrintId: string;
  setSelectedPrintId: (value: string) => void;
  isSearching: boolean;
  isAdding: boolean;
  error: string;
  onSearch: () => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17181f] p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Ajouter une carte</h2><button onClick={onClose}>✕</button></div>
        <div className="relative mt-4">
          <input value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="Nom de la carte" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
          {suggestions.length > 0 && <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl bg-[#0f1015] shadow-xl">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setCardName(suggestion); setSuggestions([]); }} className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm font-bold hover:bg-white/10">{suggestion}</button>)}</div>}
        </div>
        <div className="mt-3 grid grid-cols-[.7fr_1.3fr] gap-2">
          <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
          <select value={selectedFolder} onChange={(event) => setSelectedFolder(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none">{folders.filter((folder) => folder !== "Toutes").map((folder) => <option key={folder} value={folder}>{folder}</option>)}</select>
        </div>
        <button onClick={onSearch} disabled={isSearching} className="mt-3 w-full rounded-xl bg-white/[0.08] py-3 font-black disabled:opacity-50">{isSearching ? "Recherche..." : "Chercher les éditions"}</button>
        {printOptions.length > 0 && <div className="mt-3 rounded-xl bg-black/25 p-3"><select value={selectedPrintId} onChange={(event) => setSelectedPrintId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none">{printOptions.map((card) => <option key={card.id} value={card.id}>{card.set_name} · #{card.collector_number} · {card.rarity}</option>)}</select><button onClick={onAdd} disabled={isAdding} className="mt-3 w-full rounded-xl bg-[#f59e0b] py-3 font-black text-black disabled:opacity-50">Ajouter</button></div>}
        {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
      </div>
    </div>
  );
}

function ScanModal({
  folders,
  scanFolder,
  setScanFolder,
  scanQuantity,
  setScanQuantity,
  scanPreview,
  scanStatus,
  scanResult,
  isScanning,
  fileInputRef,
  onFile,
  onConfirm,
  onClose,
}: {
  folders: string[];
  scanFolder: string;
  setScanFolder: (value: string) => void;
  scanQuantity: number;
  setScanQuantity: (value: number) => void;
  scanPreview: string;
  scanStatus: string;
  scanResult: ScryfallCard | null;
  isScanning: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#101116] text-white">
      <div className="mx-auto flex h-full max-w-md flex-col px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl">✕</button>
          <h2 className="font-black">Scanner une carte</h2>
          <span className="w-10" />
        </div>

        <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-black/25 p-4">
          <div className="relative mx-auto flex aspect-[63/88] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40">
            {scanPreview ? (
              <img src={scanPreview} alt="Carte scannée" className="h-full w-full object-contain" />
            ) : (
              <div className="px-8 text-center">
                <p className="text-lg font-black">Cadre la carte</p>
                <p className="mt-2 text-sm font-bold text-white/55">Nom visible en haut, carte droite, lumière propre.</p>
              </div>
            )}
            <span className="absolute left-4 top-4 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-white" />
            <span className="absolute right-4 top-4 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-white" />
            <span className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-white" />
            <span className="absolute bottom-4 right-4 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-white" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="mx-auto mt-4 w-full max-w-[280px] rounded-2xl bg-white py-3 text-base font-black text-black disabled:opacity-50"
          >
            {scanPreview ? "Reprendre une photo" : "Prendre la photo"}
          </button>

          <p className="mt-3 min-h-10 text-center text-sm font-bold text-white/60">
            {isScanning ? "Reconnaissance en cours..." : scanStatus || "Après la photo, ManaForge cherche automatiquement la carte."}
          </p>

          {scanResult && (
            <div className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
              {getCardArt(scanResult) && <img src={getCardArt(scanResult)} alt={scanResult.name} className="h-16 w-16 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{scanResult.name}</p>
                <p className="text-xs text-white/60">{scanResult.set_name} · #{scanResult.collector_number}</p>
                <p className="text-sm font-black">{formatCurrency(getCardPrice(scanResult), 2)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-[.7fr_1.3fr] gap-2">
          <input
            type="number"
            min={1}
            value={scanQuantity}
            onChange={(event) => setScanQuantity(Math.max(1, Number(event.target.value)))}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
          />
          <select
            value={scanFolder}
            onChange={(event) => setScanFolder(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
          >
            {folders.filter((folder) => folder !== "Toutes").map((folder) => <option key={folder} value={folder}>{folder}</option>)}
          </select>
        </div>

        <button
          disabled={!scanResult || isScanning}
          onClick={onConfirm}
          className="mt-3 w-full rounded-2xl bg-[#f59e0b] py-4 font-black text-black disabled:opacity-40"
        >
          Ajouter la carte au dossier
        </button>
      </div>
    </div>
  );
}
