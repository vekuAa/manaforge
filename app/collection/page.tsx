/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";
type CollectionCard = {
  id: string | number;
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
  language?: string;
  foil?: boolean;
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
  lang?: string;
  foil?: boolean;
  nonfoil?: boolean;
  prices?: { eur?: string | null; eur_foil?: string | null; usd?: string | null; usd_foil?: string | null };
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


type FolderRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at?: string;
};

type CollectionCardRow = {
  id: string;
  user_id: string;
  folder_id: string | null;
  scryfall_id: string | null;
  name: string;
  image: string | null;
  set_name: string | null;
  set_code: string | null;
  collector_number: string | null;
  language: string | null;
  foil: boolean | null;
  quantity: number | null;
  price: number | string | null;
  created_at?: string;
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

const CARD_LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "de", label: "Allemand" },
  { value: "es", label: "Espagnol" },
  { value: "it", label: "Italien" },
  { value: "pt", label: "Portugais" },
  { value: "ja", label: "Japonais" },
  { value: "ko", label: "Coréen" },
  { value: "zhs", label: "Chinois simplifié" },
  { value: "zht", label: "Chinois traditionnel" },
];

function getLanguageLabel(language?: string) {
  return CARD_LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || (language || "Langue inconnue").toUpperCase();
}

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

function getCardPrice(card: ScryfallCard, foil = false) {
  if (foil) return Number(card.prices?.eur_foil || card.prices?.usd_foil || card.prices?.eur || card.prices?.usd || 0);
  return Number(card.prices?.eur || card.prices?.usd || card.prices?.eur_foil || card.prices?.usd_foil || 0);
}

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [folders, setFolders] = useState<string[]>(["Toutes", "Non classé", "Commander", "Trade", "Staples"]);
  const [folderColors, setFolderColors] = useState<Record<string, string>>(DEFAULT_FOLDER_COLORS);
  const [folderRows, setFolderRows] = useState<FolderRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [folderSyncStatus, setFolderSyncStatus] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [setFilter, setSetFilter] = useState("Toutes");
  const [activeHomeTab, setActiveHomeTab] = useState<"collection" | "fullset">("collection");
  const [fullsetViewMode, setFullsetViewMode] = useState<"grid" | "list">("list");
  const [pendingFullsetCard, setPendingFullsetCard] = useState<ScryfallCard | null>(null);
  const [pendingFullsetFolder, setPendingFullsetFolder] = useState("Non classé");
  const [pendingFullsetQuantity, setPendingFullsetQuantity] = useState(1);
  const [pendingFullsetLanguage, setPendingFullsetLanguage] = useState("fr");
  const [pendingFullsetFoil, setPendingFullsetFoil] = useState(false);

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
  const [selectedLanguage, setSelectedLanguage] = useState("fr");
  const [selectedFoil, setSelectedFoil] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [printOptions, setPrintOptions] = useState<ScryfallCard[]>([]);
  const [selectedPrintId, setSelectedPrintId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [showScanModal, setShowScanModal] = useState(false);
  const [scanFolder, setScanFolder] = useState("Non classé");
  const [scanQuantity, setScanQuantity] = useState(1);
  const [scanLanguage, setScanLanguage] = useState("fr");
  const [scanFoil, setScanFoil] = useState(false);
  const [scanPreview, setScanPreview] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [scanResult, setScanResult] = useState<ScryfallCard | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = useMemo(() => createClient(), []);

  function getFolderIdByName(folderName: string) {
    const cleanName = folderName === "Toutes" ? "Non classé" : folderName;
    return folderRows.find((folder) => folder.name === cleanName)?.id ?? null;
  }

  function mapCloudCard(row: CollectionCardRow, rows: FolderRow[]): CollectionCard {
    const folderName = rows.find((folder) => folder.id === row.folder_id)?.name || "Non classé";
    return {
      id: row.id,
      name: row.name,
      image: row.image || undefined,
      quantity: Number(row.quantity || 1),
      price: Number(row.price || 0),
      setName: row.set_name || undefined,
      setCode: row.set_code || undefined,
      collectorNumber: row.collector_number || undefined,
      folder: folderName,
      language: row.language || "fr",
      foil: Boolean(row.foil),
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const savedCards = localStorage.getItem("manaforge-collection");
        const savedFolders = localStorage.getItem("manaforge-folders");
        const savedFolderColors = localStorage.getItem("manaforge-folder-colors");

        const parsedCards = savedCards ? (JSON.parse(savedCards) as CollectionCard[]) : [];
        const localFolders = savedFolders ? (JSON.parse(savedFolders) as string[]) : ["Toutes", "Non classé", "Commander", "Trade", "Staples"];
        const localColors = savedFolderColors ? (JSON.parse(savedFolderColors) as Record<string, string>) : DEFAULT_FOLDER_COLORS;

        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData.user;

        if (!currentUser) {
          if (!cancelled) {
            setCards(parsedCards.map((card) => ({ ...card, folder: card.folder || "Non classé", language: card.language || "fr", foil: Boolean(card.foil) })));
            setFolders(localFolders);
            setFolderColors({ ...DEFAULT_FOLDER_COLORS, ...localColors });
            setFolderRows([]);
            setFolderSyncStatus("Connecte-toi pour synchroniser ta collection.");
          }
          return;
        }

        if (!cancelled) setUserId(currentUser.id);

        const migrationFlagKey = `manaforge-cloud-migrated-${currentUser.id}`;
        const alreadyMigrated = localStorage.getItem(migrationFlagKey) === "true";
        const localFolderNames = Array.from(new Set(localFolders.filter((folder) => folder !== "Toutes")));
        const foldersToEnsure = localFolderNames.length > 0 ? localFolderNames : ["Non classé", "Commander", "Trade", "Staples"];

        const { data: remoteFolders, error: remoteError } = await supabase
          .from("folders")
          .select("id,user_id,name,color,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: true });

        if (remoteError) throw remoteError;

        const existingNames = new Set((remoteFolders || []).map((folder) => folder.name));
        const shouldImportLocalFolders = !alreadyMigrated && existingNames.size === 0;
        const foldersSource = shouldImportLocalFolders ? foldersToEnsure : ["Non classé"];
        const missingFolders = foldersSource
          .filter((folder) => !existingNames.has(folder))
          .map((folder) => ({
            user_id: currentUser.id,
            name: folder,
            color: localColors[folder] || DEFAULT_FOLDER_COLORS[folder] || getFallbackFolderColor(folder),
          }));

        if (missingFolders.length > 0) {
          const { error: insertError } = await supabase.from("folders").insert(missingFolders);
          if (insertError) throw insertError;
        }

        const { data: syncedFolders, error: syncedError } = await supabase
          .from("folders")
          .select("id,user_id,name,color,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: true });

        if (syncedError) throw syncedError;

        const rows = (syncedFolders || []) as FolderRow[];
        const nextFolders = ["Toutes", ...rows.map((folder) => folder.name)];
        const nextColors = rows.reduce<Record<string, string>>((acc, folder) => {
          acc[folder.name] = folder.color || getFallbackFolderColor(folder.name);
          return acc;
        }, { ...DEFAULT_FOLDER_COLORS });

        const { data: remoteCards, error: cardsError } = await supabase
          .from("collection_cards")
          .select("id,user_id,folder_id,scryfall_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: true });

        if (cardsError) throw cardsError;

        let cloudCards = ((remoteCards || []) as CollectionCardRow[]).map((row) => mapCloudCard(row, rows));

        if (cloudCards.length === 0 && parsedCards.length > 0) {
          const rowsByName = new Map(rows.map((folder) => [folder.name, folder.id]));
          const cardsToImport = parsedCards.map((card) => {
            const folderName = card.folder && card.folder !== "Toutes" ? card.folder : "Non classé";
            return {
              user_id: currentUser.id,
              folder_id: rowsByName.get(folderName) || rowsByName.get("Non classé") || null,
              scryfall_id: null,
              name: card.name,
              image: card.image || null,
              set_name: card.setName || null,
              set_code: card.setCode || null,
              collector_number: card.collectorNumber || null,
              language: card.language || "fr",
              foil: Boolean(card.foil),
              quantity: Number(card.quantity || 1),
              price: Number(card.price || 0),
            };
          });

          const { data: importedCards, error: importError } = await supabase
            .from("collection_cards")
            .insert(cardsToImport)
            .select("id,user_id,folder_id,scryfall_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,created_at");

          if (importError) throw importError;
          cloudCards = ((importedCards || []) as CollectionCardRow[]).map((row) => mapCloudCard(row, rows));
          localStorage.removeItem("manaforge-collection");
          localStorage.removeItem("manaforge-folders");
          localStorage.removeItem("manaforge-folder-colors");
        }

        localStorage.setItem(migrationFlagKey, "true");
        localStorage.removeItem("manaforge-folders");
        localStorage.removeItem("manaforge-folder-colors");

        if (!cancelled) {
          setCards(cloudCards);
          setFolders(nextFolders.includes("Non classé") ? nextFolders : ["Toutes", "Non classé", ...nextFolders.filter((folder) => folder !== "Toutes")]);
          setFolderRows(rows);
          setFolderColors(nextColors);
          setFolderSyncStatus(cloudCards.length > 0 ? "Collection synchronisée avec ton compte." : "Dossiers synchronisés avec ton compte.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur de synchronisation de la collection.");
          setFolderSyncStatus("Synchronisation impossible pour le moment.");
        }
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!hasLoaded || userId) return;
    localStorage.setItem("manaforge-collection", JSON.stringify(cards));
    localStorage.setItem("manaforge-folders", JSON.stringify(folders));
    localStorage.setItem("manaforge-folder-colors", JSON.stringify(folderColors));
  }, [cards, folders, folderColors, hasLoaded, userId]);

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

  async function createFolder() {
    const cleanFolder = newFolder.trim();
    if (!cleanFolder || folders.includes(cleanFolder)) {
      setNewFolder("");
      return;
    }

    const previousFolders = folders;
    const previousColors = folderColors;

    setFolders((current) => [...current, cleanFolder]);
    setFolderColors((current) => ({ ...current, [cleanFolder]: newFolderColor }));
    setSelectedFolder(cleanFolder);
    setScanFolder(cleanFolder);

    if (userId) {
      const { data: insertedFolder, error: insertError } = await supabase
        .from("folders")
        .insert({ user_id: userId, name: cleanFolder, color: newFolderColor })
        .select("id,user_id,name,color,created_at")
        .single();
      if (insertError) {
        setFolders(previousFolders);
        setFolderColors(previousColors);
        setError(insertError.message);
        return;
      }
      if (insertedFolder) setFolderRows((current) => [...current, insertedFolder as FolderRow]);
      setFolderSyncStatus("Dossier sauvegardé dans Supabase.");
    }

    setNewFolder("");
    setNewFolderColor(FOLDER_COLOR_PALETTE[0]);
  }

  async function deleteFolder(folder: string) {
    if (["Toutes", "Non classé"].includes(folder)) return;
    const confirmed = window.confirm(`Supprimer le dossier "${folder}" ? Les cartes seront déplacées dans Non classé.`);
    if (!confirmed) return;

    const previousCards = cards;
    const previousFolders = folders;
    const previousColors = folderColors;

    setCards((current) => current.map((card) => (card.folder === folder ? { ...card, folder: "Non classé" } : card)));
    setFolders((current) => current.filter((item) => item !== folder));
    setFolderColors((current) => {
      const next = { ...current };
      delete next[folder];
      return next;
    });
    if (openedFolder === folder) setOpenedFolder(null);

    if (userId) {
      const folderId = getFolderIdByName(folder);
      const nonClassedId = getFolderIdByName("Non classé");

      if (folderId) {
        const { error: moveError } = await supabase
          .from("collection_cards")
          .update({ folder_id: nonClassedId })
          .eq("user_id", userId)
          .eq("folder_id", folderId);
        if (moveError) {
          setCards(previousCards);
          setFolders(previousFolders);
          setFolderColors(previousColors);
          setError(moveError.message);
          return;
        }
      }

      const { error: deleteError } = await supabase.from("folders").delete().eq("user_id", userId).eq("name", folder);
      if (deleteError) {
        setCards(previousCards);
        setFolders(previousFolders);
        setFolderColors(previousColors);
        setError(deleteError.message);
        return;
      }
      setFolderRows((current) => current.filter((item) => item.name !== folder));
      setFolderSyncStatus("Dossier supprimé de Supabase.");
    }
  }

  async function updateFolderColor(folder: string, color: string) {
    const previousColors = folderColors;
    setFolderColors((current) => ({ ...current, [folder]: color }));

    if (!userId || folder === "Toutes") return;

    const { error: updateError } = await supabase.from("folders").update({ color }).eq("user_id", userId).eq("name", folder);
    if (updateError) {
      setFolderColors(previousColors);
      setError(updateError.message);
      return;
    }
    setFolderSyncStatus("Couleur du dossier sauvegardée.");
  }

  async function addCardToCollection(card: ScryfallCard, folder: string, amount: number, language = card.lang || "fr", foil = false) {
    const cleanFolder = folder === "Toutes" ? "Non classé" : folder;
    const cleanLanguage = language || card.lang || "fr";
    const price = getCardPrice(card, foil);
    const image = getCardImage(card);

    const existing = cards.find(
      (item) =>
        item.setCode?.toLowerCase() === card.set?.toLowerCase() &&
        item.collectorNumber === card.collector_number &&
        (item.folder || "Non classé") === cleanFolder &&
        (item.language || "fr") === cleanLanguage &&
        Boolean(item.foil) === foil,
    );

    if (existing) {
      const nextQuantity = existing.quantity + amount;
      setCards((current) => current.map((item) => (item.id === existing.id ? { ...item, quantity: nextQuantity } : item)));

      if (userId && typeof existing.id === "string") {
        const { error: updateError } = await supabase
          .from("collection_cards")
          .update({ quantity: nextQuantity, price })
          .eq("user_id", userId)
          .eq("id", existing.id);
        if (updateError) setError(updateError.message);
      }
      return;
    }

    const optimisticId = Date.now();
    const optimisticCard: CollectionCard = {
      id: optimisticId,
      name: card.name,
      image,
      quantity: amount,
      price,
      typeLine: card.type_line || "",
      setName: card.set_name || "Extension inconnue",
      setCode: card.set || "",
      collectorNumber: card.collector_number || "",
      rarity: card.rarity || "unknown",
      folder: cleanFolder,
      language: cleanLanguage,
      foil,
    };

    setCards((current) => [...current, optimisticCard]);

    if (!userId) return;

    const { data: insertedCard, error: insertError } = await supabase
      .from("collection_cards")
      .insert({
        user_id: userId,
        folder_id: getFolderIdByName(cleanFolder),
        scryfall_id: card.id,
        name: card.name,
        image: image || null,
        set_name: card.set_name || null,
        set_code: card.set || null,
        collector_number: card.collector_number || null,
        language: cleanLanguage,
        foil,
        quantity: amount,
        price,
      })
      .select("id,user_id,folder_id,scryfall_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,created_at")
      .single();

    if (insertError) {
      setCards((current) => current.filter((item) => item.id !== optimisticId));
      setError(insertError.message);
      return;
    }

    if (insertedCard) {
      setCards((current) => current.map((item) => (item.id === optimisticId ? mapCloudCard(insertedCard as CollectionCardRow, folderRows) : item)));
      setFolderSyncStatus("Carte sauvegardée dans Supabase.");
    }
  }

  async function searchPrints() {
    const cleanName = cardName.trim();
    if (!cleanName) return setError("Entre le nom d’une carte.");

    try {
      setIsSearching(true);
      setError("");
      setPrintOptions([]);

      let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!\"${cleanName}\" unique:prints`)}&order=released`;
      const allPrints: ScryfallCard[] = [];

      while (url && allPrints.length < 300) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Carte introuvable sur Scryfall.");
        const data = (await response.json()) as ScryfallSearchResponse;
        allPrints.push(...data.data);
        url = data.has_more && data.next_page ? data.next_page : "";
      }

      setPrintOptions(allPrints);
      setSelectedPrintId(allPrints[0]?.id ?? "");
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
    await addCardToCollection(selectedPrint, selectedFolder, quantity, selectedLanguage, selectedFoil);
    setIsAdding(false);
    setCardName("");
    setQuantity(1);
    setSelectedLanguage("fr");
    setSelectedFoil(false);
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

  async function moveCardToFolder(id: string | number, nextFolder: string) {
    const cleanFolder = nextFolder === "Toutes" ? "Non classé" : nextFolder;
    const target = cards.find((card) => card.id === id);
    if (!target || (target.folder || "Non classé") === cleanFolder) return;

    const previousCards = cards;
    const previousSelectedCard = selectedCard;

    setCards((current) =>
      current.map((card) =>
        card.id === id ? { ...card, folder: cleanFolder } : card,
      ),
    );

    setSelectedCard((current) =>
      current && current.id === id ? { ...current, folder: cleanFolder } : current,
    );

    if (!userId || typeof id !== "string") return;

    const { error: updateError } = await supabase
      .from("collection_cards")
      .update({ folder_id: getFolderIdByName(cleanFolder) })
      .eq("user_id", userId)
      .eq("id", id);

    if (updateError) {
      setCards(previousCards);
      setSelectedCard(previousSelectedCard);
      setError(updateError.message);
      return;
    }

    setFolderSyncStatus(`Carte déplacée vers ${cleanFolder}.`);
  }

  async function updateQuantity(id: string | number, amount: number) {
    const target = cards.find((card) => card.id === id);
    if (!target) return;

    const nextQuantity = Math.max(0, target.quantity + amount);
    setCards((current) =>
      current.map((card) => (card.id === id ? { ...card, quantity: nextQuantity } : card)).filter((card) => card.quantity > 0),
    );

    if (!userId || typeof id !== "string") return;

    if (nextQuantity <= 0) {
      const { error: deleteError } = await supabase.from("collection_cards").delete().eq("user_id", userId).eq("id", id);
      if (deleteError) setError(deleteError.message);
      return;
    }

    const { error: updateError } = await supabase.from("collection_cards").update({ quantity: nextQuantity }).eq("user_id", userId).eq("id", id);
    if (updateError) setError(updateError.message);
  }

  async function deleteCard(id: string | number) {
    const previousCards = cards;
    setCards((current) => current.filter((card) => card.id !== id));

    if (!userId || typeof id !== "string") return;

    const { error: deleteError } = await supabase.from("collection_cards").delete().eq("user_id", userId).eq("id", id);
    if (deleteError) {
      setCards(previousCards);
      setError(deleteError.message);
    }
  }

  async function loadTesseract() {
    // Scanner local : nécessite `npm install tesseract.js`.
    // On évite le CDN pour avoir une version plus stable dans l’app.
    const tesseract = (await import("tesseract.js")) as unknown as TesseractApi;
    if (!tesseract?.createWorker) throw new Error("Moteur OCR indisponible. Installe tesseract.js avec npm install tesseract.js.");
    return tesseract;
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

  async function prepareImageForOcr(file: File | Blob, mode: "full" | "title" | "bottom" = "full") {
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

  async function scanImage(file: File | Blob) {
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
    void addCardToCollection(scanResult, scanFolder, scanQuantity, scanLanguage, scanFoil);
    setShowScanModal(false);
    setScanPreview("");
    setScanStatus("");
    setScanResult(null);
    setScanQuantity(1);
    setScanLanguage("fr");
    setScanFoil(false);
  }

  function openFullsetAdd(card: ScryfallCard) {
    setPendingFullsetCard(card);
    setPendingFullsetFolder(openedFolder && openedFolder !== "__ALL__" ? openedFolder : "Non classé");
    setPendingFullsetQuantity(1);
    setPendingFullsetLanguage("fr");
    setPendingFullsetFoil(false);
  }

  function confirmFullsetAdd() {
    if (!pendingFullsetCard) return;
    void addCardToCollection(pendingFullsetCard, pendingFullsetFolder, pendingFullsetQuantity, pendingFullsetLanguage, pendingFullsetFoil);
    setPendingFullsetCard(null);
    setPendingFullsetQuantity(1);
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
    <main className="min-h-screen overflow-x-hidden bg-[#101116] text-white">
      <section className="mx-auto w-full max-w-md px-3 pb-28 pt-4 md:max-w-5xl md:px-4 md:pt-8">
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
            fullsetViewMode={fullsetViewMode}
            setFullsetViewMode={setFullsetViewMode}
            ownedCards={cards}
            onAddFullsetCard={openFullsetAdd}
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
            onColorChange={(folder, color) => void updateFolderColor(folder, color)}
            folderSyncStatus={folderSyncStatus}
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
            onMinus={(id) => void updateQuantity(id, -1)}
            onPlus={(id) => void updateQuantity(id, 1)}
            onDelete={(id) => void deleteCard(id)}
            onOpenCard={setSelectedCard}
          />
        )}
      </section>

      <div className="fixed bottom-24 right-3 z-40 flex flex-col gap-2">
        {!openedFolder && activeHomeTab === "collection" && (
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f59e0b]/45 text-base shadow-xl shadow-orange-500/10 ring-1 ring-white/10 backdrop-blur-md transition active:scale-95"
            aria-label="Créer un dossier"
          >
            📁
          </button>
        )}
        {!openedFolder && activeHomeTab === "collection" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-base shadow-xl ring-1 ring-white/10 backdrop-blur-md transition active:scale-95"
            aria-label="Ajouter une carte"
          >
            🎴
          </button>
        )}
        {(openedFolder || activeHomeTab === "collection") && (
          <button
            onClick={() => {
              setScanFolder(openedFolder && openedFolder !== "__ALL__" ? openedFolder : "Non classé");
              setShowScanModal(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/25 text-base shadow-xl backdrop-blur-md transition active:scale-95"
            aria-label="Scanner une carte"
          >
            ⛶
          </button>
        )}
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
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          selectedFoil={selectedFoil}
          setSelectedFoil={setSelectedFoil}
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
          scanLanguage={scanLanguage}
          setScanLanguage={setScanLanguage}
          scanFoil={scanFoil}
          setScanFoil={setScanFoil}
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

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          folders={folders}
          onMove={(folder) => void moveCardToFolder(selectedCard.id, folder)}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {pendingFullsetCard && (
        <FullsetAddModal
          card={pendingFullsetCard}
          folders={folders}
          selectedFolder={pendingFullsetFolder}
          setSelectedFolder={setPendingFullsetFolder}
          quantity={pendingFullsetQuantity}
          setQuantity={setPendingFullsetQuantity}
          selectedLanguage={pendingFullsetLanguage}
          setSelectedLanguage={setPendingFullsetLanguage}
          selectedFoil={pendingFullsetFoil}
          setSelectedFoil={setPendingFullsetFoil}
          onClose={() => setPendingFullsetCard(null)}
          onConfirm={confirmFullsetAdd}
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
  fullsetViewMode,
  setFullsetViewMode,
  ownedCards,
  onAddFullsetCard,
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
  folderSyncStatus,
}: {
  globalStats: { totalCards: number; uniqueCards: number; totalValue: number };
  folderSummaries: FolderSummary[];
  activeHomeTab: "collection" | "fullset";
  setActiveHomeTab: (tab: "collection" | "fullset") => void;
  fullsetCode: string;
  setFullsetCode: (value: string) => void;
  fullsetCards: ScryfallCard[];
  fullsetProgress: { owned: number; total: number; percent: number; missing: ScryfallCard[] };
  fullsetViewMode: "grid" | "list";
  setFullsetViewMode: (mode: "grid" | "list") => void;
  ownedCards: CollectionCard[];
  onAddFullsetCard: (card: ScryfallCard) => void;
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
  folderSyncStatus: string;
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

        <div className="mt-3 flex justify-center md:mt-5">
          <CircularValue value={globalStats.totalValue} caption={`${globalStats.totalCards} cartes`} segments={folderSummaries} />
        </div>

        <div className="mt-4 grid grid-cols-2 border-b border-white/10 text-sm font-black">
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

      {folderSyncStatus && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-center text-xs font-bold text-white/55">
          {folderSyncStatus}
        </p>
      )}

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

          <div className={viewMode === "grid" ? "mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3" : "mt-3 grid gap-3"}>
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
          viewMode={fullsetViewMode}
          setViewMode={setFullsetViewMode}
          ownedCards={ownedCards}
          onAddCard={onAddFullsetCard}
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
  viewMode,
  setViewMode,
  ownedCards,
  onAddCard,
  onLoad,
}: {
  fullsetCode: string;
  setFullsetCode: (value: string) => void;
  fullsetCards: ScryfallCard[];
  progress: { owned: number; total: number; percent: number; missing: ScryfallCard[] };
  isLoading: boolean;
  error: string;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  ownedCards: CollectionCard[];
  onAddCard: (card: ScryfallCard) => void;
  onLoad: () => void;
}) {
  const cleanSet = fullsetCode.trim().toLowerCase();
  const ownedNumbers = new Set(
    ownedCards
      .filter((card) => card.setCode?.toLowerCase() === cleanSet)
      .map((card) => card.collectorNumber),
  );

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-3 md:mt-5 md:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Full set interactif</h2>
          <p className="mt-1 text-sm font-bold text-white/55">Tape un code comme MH3 : ManaForge charge toutes les cartes du set.</p>
        </div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={fullsetCode}
          onChange={(event) => setFullsetCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onLoad();
          }}
          placeholder="mh3"
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-black uppercase outline-none"
        />
        <button onClick={onLoad} disabled={isLoading} className="rounded-xl bg-[#f59e0b] px-5 py-3 font-black text-black disabled:opacity-50">
          {isLoading ? "..." : "Charger"}
        </button>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

      {fullsetCards.length > 0 && (
        <div className="mt-5">
          <div className="rounded-2xl bg-black/25 p-4">
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
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">Toutes les cartes du set</p>
            <p className="text-xs font-bold text-white/50">Clique pour ajouter</p>
          </div>

          <div className={viewMode === "grid" ? "mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" : "mt-3 grid gap-2"}>
            {fullsetCards.map((card) => {
              const owned = ownedNumbers.has(card.collector_number || "");
              return viewMode === "grid" ? (
                <button
                  key={card.id}
                  onClick={() => onAddCard(card)}
                  className={`relative rounded-xl border p-1.5 text-left transition active:scale-[0.98] ${owned ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.05]"}`}
                >
                  {getCardImage(card) ? <img src={getCardImage(card)} alt={card.name} className="aspect-[63/88] w-full rounded-lg object-cover" /> : <div className="aspect-[63/88] rounded-lg bg-black/30" />}
                  {owned && <span className="absolute right-2 top-2 rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-black">OK</span>}
                  <p className="mt-1 truncate text-[11px] font-bold">{card.name}</p>
                  <p className="text-[10px] text-white/55">#{card.collector_number} · {formatCurrency(getCardPrice(card), 2)}</p>
                </button>
              ) : (
                <button
                  key={card.id}
                  onClick={() => onAddCard(card)}
                  className={`flex w-full max-w-full items-center gap-2 rounded-xl border p-2 text-left transition active:scale-[0.99] md:gap-3 md:p-3 ${owned ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.055]"}`}
                >
                  {getCardArt(card) ? <img src={getCardArt(card)} alt={card.name} className="h-12 w-12 shrink-0 rounded-xl object-cover md:h-14 md:w-14" /> : <div className="h-12 w-12 shrink-0 rounded-xl bg-black/30 md:h-14 md:w-14" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black md:text-base">{card.name}</p>
                    <p className="truncate text-[11px] text-white/60 md:text-xs">{card.set?.toUpperCase()} #{card.collector_number} · {card.rarity}</p>
                  </div>
                  <div className="w-[72px] shrink-0 text-right md:w-auto">
                    <p className="text-sm font-black md:text-base">{formatCurrency(getCardPrice(card), 2)}</p>
                    <p className={owned ? "text-xs font-black text-emerald-300" : "text-xs font-bold text-white/45"}>{owned ? "Possédée" : "Ajouter"}</p>
                  </div>
                </button>
              );
            })}
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
          <button onClick={() => { if (window.confirm(`Supprimer le dossier "${folder.name}" ? Les cartes seront déplacées dans Non classé.`)) onDelete(); }} className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs font-black text-red-300 ring-1 ring-white/10">
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
        <button onClick={() => { if (window.confirm(`Supprimer le dossier "${folder.name}" ? Les cartes seront déplacées dans Non classé.`)) onDelete(); }} className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs font-black text-red-300 ring-1 ring-white/10">
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
  onOpenCard,
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
  onMinus: (id: string | number) => void;
  onPlus: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onOpenCard: (card: CollectionCard) => void;
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
          <CardTile key={card.id} card={card} onOpen={() => onOpenCard(card)} onMinus={() => onMinus(card.id)} onPlus={() => onPlus(card.id)} onDelete={() => onDelete(card.id)} />
        ) : (
          <CardRow key={card.id} card={card} onOpen={() => onOpenCard(card)} onMinus={() => onMinus(card.id)} onPlus={() => onPlus(card.id)} onDelete={() => onDelete(card.id)} />
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

function CardTile({
  card,
  onOpen,
  onMinus,
  onPlus,
  onDelete,
}: {
  card: CollectionCard;
  onOpen: () => void;
  onMinus: () => void;
  onPlus: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white/[0.05] p-1.5">
      <button type="button" onClick={onOpen} className="w-full text-left transition active:scale-[0.98]">
        {card.image ? (
          <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-lg object-cover shadow-lg" />
        ) : (
          <div className="flex aspect-[63/88] items-center justify-center rounded-lg bg-black/30 text-3xl">🎴</div>
        )}
        <p className="mt-1 truncate text-[11px] font-bold">{card.name}</p>
        <p className="text-[10px] text-white/60">{formatCurrency(card.price * card.quantity, 2)} · x{card.quantity}</p>
        <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-black uppercase tracking-wide">
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">{(card.language || "fr").toUpperCase()}</span>
          {card.foil && <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-yellow-200">FOIL</span>}
        </div>
      </button>

      <div className="mt-2 grid grid-cols-3 gap-1">
        <button onClick={onMinus} className="rounded-lg bg-black/70 py-1 text-sm font-black">−</button>
        <button onClick={onPlus} className="rounded-lg bg-[#f59e0b] py-1 text-sm font-black text-black">+</button>
        <button onClick={() => { if (window.confirm(`Supprimer "${card.name}" de la collection ?`)) onDelete(); }} className="rounded-lg bg-red-500/80 py-1 text-sm font-black">×</button>
      </div>
    </div>
  );
}

function CardRow({
  card,
  onOpen,
  onMinus,
  onPlus,
  onDelete,
}: {
  card: CollectionCard;
  onOpen: () => void;
  onMinus: () => void;
  onPlus: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex w-full min-w-0 gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3">
      <button type="button" onClick={onOpen} className="shrink-0 transition active:scale-95">
        {card.image ? <img src={card.image} alt={card.name} className="h-20 w-14 rounded-lg object-cover" /> : <div className="flex h-20 w-14 items-center justify-center rounded-lg bg-black/30 text-2xl">🎴</div>}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <p className="truncate font-black">{card.name}</p>
          <p className="text-xs text-white/60">{card.setCode?.toUpperCase()} #{card.collectorNumber}</p>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-black uppercase tracking-wide">
            <span className="rounded bg-white/10 px-2 py-0.5 text-white/70">{getLanguageLabel(card.language)}</span>
            {card.foil && <span className="rounded bg-yellow-400/20 px-2 py-0.5 text-yellow-200">FOIL</span>}
          </div>
          <p className="mt-1 text-sm font-black">{formatCurrency(card.price * card.quantity, 2)} · x{card.quantity}</p>
        </button>
        <div className="mt-2 flex gap-2">
          <button onClick={onMinus} className="rounded-lg bg-black/30 px-3 py-1">−</button>
          <button onClick={onPlus} className="rounded-lg bg-[#f59e0b] px-3 py-1 text-black">+</button>
          <button onClick={() => { if (window.confirm(`Supprimer "${card.name}" de la collection ?`)) onDelete(); }} className="rounded-lg bg-red-500/20 px-3 py-1 text-red-200">×</button>
        </div>
      </div>
    </div>
  );
}

function CardDetailModal({
  card,
  folders,
  onMove,
  onClose,
}: {
  card: CollectionCard;
  folders: string[];
  onMove: (folder: string) => void;
  onClose: () => void;
}) {
  const totalPrice = Number(card.price || 0) * Number(card.quantity || 1);

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 px-4 py-5 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-md flex-col">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white ring-1 ring-white/10"
            aria-label="Fermer"
          >
            ×
          </button>

          <div className="rounded-full bg-[#f59e0b] px-4 py-2 text-xs font-black text-black">x{card.quantity}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-2xl">
          {card.image ? (
            <img
              src={card.image}
              alt={card.name}
              className="mx-auto max-h-[58vh] rounded-2xl object-contain shadow-2xl"
            />
          ) : (
            <div className="flex aspect-[63/88] items-center justify-center rounded-2xl bg-black/30 text-5xl">🎴</div>
          )}

          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Carte collection</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white">{card.name}</h2>

            {card.typeLine && <p className="mt-2 text-sm font-bold text-white/55">{card.typeLine}</p>}

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/35">
                Déplacer vers
              </label>
              <select
                value={card.folder || "Non classé"}
                onChange={(event) => onMove(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#101116] px-3 py-3 text-sm font-black text-white outline-none focus:border-[#f59e0b]/60"
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

            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoBox label="Prix unité" value={formatCurrency(card.price || 0, 2)} />
              <InfoBox label="Total" value={formatCurrency(totalPrice, 2)} />
              <InfoBox label="Extension" value={card.setName || card.setCode?.toUpperCase() || "N/A"} />
              <InfoBox label="Numéro" value={card.collectorNumber || "N/A"} />
              <InfoBox label="Rareté" value={card.rarity || "N/A"} />
              <InfoBox label="Langue" value={getLanguageLabel(card.language)} />
              <InfoBox label="Dossier" value={card.folder || "Non classé"} />
              <InfoBox label="Foil" value={card.foil ? "Oui" : "Non"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/30 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
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

function CardVariantControls({
  language,
  setLanguage,
  foil,
  setFoil,
}: {
  language: string;
  setLanguage: (value: string) => void;
  foil: boolean;
  setFoil: (value: boolean) => void;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
      <label className="block">
        <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-white/45">Langue</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold text-white outline-none"
        >
          {CARD_LANGUAGE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-end">
        <button
          type="button"
          onClick={() => setFoil(!foil)}
          className={`h-[46px] w-full rounded-xl border px-4 font-black transition sm:w-28 ${
            foil ? "border-yellow-300/50 bg-yellow-400 text-black" : "border-white/10 bg-black/30 text-white/70"
          }`}
        >
          {foil ? "FOIL" : "Non foil"}
        </button>
      </label>
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
  selectedLanguage,
  setSelectedLanguage,
  selectedFoil,
  setSelectedFoil,
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
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  selectedFoil: boolean;
  setSelectedFoil: (value: boolean) => void;
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
        <CardVariantControls
          language={selectedLanguage}
          setLanguage={setSelectedLanguage}
          foil={selectedFoil}
          setFoil={setSelectedFoil}
        />
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
  scanLanguage,
  setScanLanguage,
  scanFoil,
  setScanFoil,
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
  scanLanguage: string;
  setScanLanguage: (value: string) => void;
  scanFoil: boolean;
  setScanFoil: (value: boolean) => void;
  scanPreview: string;
  scanStatus: string;
  scanResult: ScryfallCard | null;
  isScanning: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | Blob) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState("Ouverture de la caméra...");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraStatus("Caméra live indisponible sur ce navigateur. Utilise le bouton photo en secours.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1440 },
            height: { ideal: 1920 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
        setCameraStatus("Place la carte dans le cadre, puis appuie sur Scanner.");
      } catch {
        setCameraStatus("Caméra refusée ou indisponible. Utilise le bouton photo en secours.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onFile(blob);
    }, "image/jpeg", 0.95);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#101116] text-white">
      <div className="mx-auto flex h-full max-w-md flex-col px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl">✕</button>
          <h2 className="font-black">Scanner une carte</h2>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-white/80">Photo</button>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-3 text-xs font-bold leading-relaxed text-orange-100">
          Scanner web v1 : caméra live + OCR local + Scryfall. Ce n’est pas encore une reconnaissance image entraînée comme ManaBox, donc la lumière, le cadrage et la netteté restent importants.
        </div>

        <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-black/25 p-3">
          <div className="relative mx-auto aspect-[63/88] w-full max-w-[310px] overflow-hidden rounded-3xl bg-black/70 shadow-2xl ring-1 ring-white/10">
            {scanPreview ? (
              <img src={scanPreview} alt="Carte scannée" className="h-full w-full object-contain opacity-95" />
            ) : (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            )}

            <div className="pointer-events-none absolute inset-[7%] rounded-2xl border-2 border-white/85 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
            <span className="pointer-events-none absolute left-6 top-6 h-12 w-12 rounded-tl-2xl border-l-4 border-t-4 border-[#f59e0b]" />
            <span className="pointer-events-none absolute right-6 top-6 h-12 w-12 rounded-tr-2xl border-r-4 border-t-4 border-[#f59e0b]" />
            <span className="pointer-events-none absolute bottom-6 left-6 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-[#f59e0b]" />
            <span className="pointer-events-none absolute bottom-6 right-6 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-[#f59e0b]" />

            {!cameraReady && !scanPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-8 text-center text-sm font-bold text-white/70">
                {cameraStatus}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
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
            type="button"
            disabled={!cameraReady || isScanning}
            onClick={captureFrame}
            className="mt-4 w-full rounded-2xl bg-[#f59e0b] py-4 font-black text-black disabled:opacity-40"
          >
            {isScanning ? "Analyse en cours..." : "Scanner la carte"}
          </button>

          <p className="mt-3 min-h-10 text-center text-sm font-bold text-white/60">
            {isScanning ? "Lecture du nom et du numéro..." : scanStatus || cameraStatus}
          </p>

          {scanResult && (
            <div className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
              {getCardArt(scanResult) && <img src={getCardArt(scanResult)} alt={scanResult.name} className="h-16 w-16 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{scanResult.name}</p>
                <p className="text-xs text-white/60">{scanResult.set_name} · #{scanResult.collector_number}</p>
                <p className="text-sm font-black">{formatCurrency(getCardPrice(scanResult, scanFoil), 2)}</p>
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
        <CardVariantControls
          language={scanLanguage}
          setLanguage={setScanLanguage}
          foil={scanFoil}
          setFoil={setScanFoil}
        />

        <button
          disabled={!scanResult || isScanning}
          onClick={onConfirm}
          className="mt-3 w-full rounded-2xl bg-white py-4 font-black text-black disabled:opacity-40"
        >
          Ajouter la carte au dossier
        </button>
      </div>
    </div>
  );
}

function FullsetAddModal({
  card,
  folders,
  selectedFolder,
  setSelectedFolder,
  quantity,
  setQuantity,
  selectedLanguage,
  setSelectedLanguage,
  selectedFoil,
  setSelectedFoil,
  onClose,
  onConfirm,
}: {
  card: ScryfallCard;
  folders: string[];
  selectedFolder: string;
  setSelectedFolder: (value: string) => void;
  quantity: number;
  setQuantity: (value: number) => void;
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  selectedFoil: boolean;
  setSelectedFoil: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cardImage = getCardImage(card);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-3">
      <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#17181f] p-4 pb-6 text-white shadow-2xl sm:rounded-3xl md:max-w-3xl md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Aperçu de la carte</h2>
            <p className="text-sm font-bold text-white/50">Choisis le dossier puis ajoute-la à ta collection.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-black">✕</button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr] md:items-start">
          <div className="mx-auto w-full max-w-[230px] sm:max-w-[260px] md:max-w-[280px]">
            {cardImage ? (
              <img
                src={cardImage}
                alt={card.name}
                className="aspect-[63/88] max-h-[46vh] w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div className="flex aspect-[63/88] w-full items-center justify-center rounded-2xl bg-black/40 text-center text-sm font-bold text-white/50">
                Image indisponible
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/[0.055] p-4">
            <p className="text-2xl font-black leading-tight">{card.name}</p>
            <p className="mt-2 text-sm font-bold text-white/60">{card.type_line || "Type inconnu"}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/40">Set</p>
                <p className="mt-1 font-black">{card.set?.toUpperCase()} · {card.set_name}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/40">Numéro</p>
                <p className="mt-1 font-black">#{card.collector_number || "—"}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/40">Rareté</p>
                <p className="mt-1 font-black capitalize">{card.rarity || "—"}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/40">Prix</p>
                <p className="mt-1 font-black text-[#f59e0b]">{formatCurrency(getCardPrice(card, selectedFoil), 2)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[.7fr_1.3fr] gap-2">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
              />
              <select
                value={selectedFolder}
                onChange={(event) => setSelectedFolder(event.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
              >
                {folders.filter((folder) => folder !== "Toutes").map((folder) => <option key={folder} value={folder}>{folder}</option>)}
              </select>
            </div>
            <CardVariantControls
              language={selectedLanguage}
              setLanguage={setSelectedLanguage}
              foil={selectedFoil}
              setFoil={setSelectedFoil}
            />

            <button onClick={onConfirm} className="mt-5 w-full rounded-xl bg-[#f59e0b] py-3 font-black text-black">Ajouter au dossier</button>
          </div>
        </div>
      </div>
    </div>
  );
}
