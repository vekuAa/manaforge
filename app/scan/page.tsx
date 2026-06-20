/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Layers,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ScannedCard = {
  id: string;
  name: string;
  image?: string;
  confidence: number;
  quantity: number;
  price: number;
  setName?: string;
  setCode?: string;
  collectorNumber?: string;
};

type FolderRow = {
  id: string;
  name: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [currentCard, setCurrentCard] = useState<ScannedCard | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [status, setStatus] = useState("Place une carte devant la caméra.");

  useEffect(() => {
    async function loadFolders() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        const fallback = [{ id: "local", name: "Non classé" }];
        setFolders(fallback);
        setSelectedFolder(fallback[0].name);
        return;
      }

      const { data } = await supabase
        .from("folders")
        .select("id,name")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: true });

      if (data?.length) {
        setFolders(data);
        setSelectedFolder(data[0].name);
      } else {
        const fallback = [{ id: "local", name: "Non classé" }];
        setFolders(fallback);
        setSelectedFolder(fallback[0].name);
      }
    }

    void loadFolders();
  }, [supabase]);

  function capturePreviewCard() {
    const image = webcamRef.current?.getScreenshot();

    if (!image) {
      setStatus("Caméra indisponible.");
      return;
    }

    setIsRecognizing(true);
    setStatus("Analyse en cours...");

    window.setTimeout(() => {
      const nextCard: ScannedCard = {
        id: crypto.randomUUID(),
        name: "Carte capturée",
        image,
        confidence: 0,
        quantity: 1,
        price: 0,
      };

      setCurrentCard(nextCard);
      setScannedCards((current) => [...current, nextCard]);
      setStatus("Carte capturée. Reconnaissance réelle à brancher.");
      setIsRecognizing(false);
    }, 350);
  }

  function removeCard(id: string) {
    setScannedCards((current) => current.filter((card) => card.id !== id));
    setCurrentCard((current) => (current?.id === id ? null : current));
  }

  function clearScan() {
    setScannedCards([]);
    setCurrentCard(null);
    setStatus("Scan réinitialisé.");
  }

  async function addScannedCardsToCollection() {
    try {
      setIsAdding(true);
      setStatus("");

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setStatus("Connecte-toi pour ajouter les cartes.");
        return;
      }

      if (scannedCards.length === 0) return;

      const folderId =
        folders.find((folder) => folder.name === selectedFolder)?.id || null;

      const cardsToInsert = scannedCards.map((card) => ({
        user_id: authData.user!.id,
        folder_id: folderId,
        scryfall_id: null,
        name: card.name,
        image: card.image || null,
        set_name: card.setName || null,
        set_code: card.setCode || null,
        collector_number: card.collectorNumber || null,
        language: "fr",
        foil: false,
        quantity: card.quantity,
        price: card.price,
      }));

      const { error } = await supabase
        .from("collection_cards")
        .insert(cardsToInsert);

      if (error) {
        setStatus(error.message);
        return;
      }

      setScannedCards([]);
      setCurrentCard(null);
      setShowSheet(false);
      setStatus(`Ajout terminé dans "${selectedFolder}".`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <section className="relative mx-auto h-[100dvh] max-w-md overflow-hidden bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_46%,rgba(0,0,0,0.58)_78%,rgba(0,0,0,0.88)_100%)]" />

        <header className="absolute left-0 right-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-black/45 p-2 shadow-2xl backdrop-blur-xl">
            <Link
              href="/collection"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition active:scale-95"
              aria-label="Retour"
            >
              <ArrowLeft size={22} strokeWidth={2.6} />
            </Link>

            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f59e0b]">
                ManaForge
              </p>
              <p className="text-sm font-black">Scan collection</p>
            </div>

            <button
              type="button"
              onClick={clearScan}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition active:scale-95"
              aria-label="Reset"
            >
              <RotateCcw size={19} strokeWidth={2.6} />
            </button>
          </div>
        </header>

        <div className="pointer-events-none absolute left-1/2 top-[41%] z-20 aspect-[63/88] w-[74%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-[1.7rem] border-[3px] border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.18),0_0_34px_rgba(52,211,153,0.36)]">
          <span className="absolute -left-1.5 -top-1.5 h-14 w-14 rounded-tl-[1.7rem] border-l-[5px] border-t-[5px] border-emerald-300" />
          <span className="absolute -right-1.5 -top-1.5 h-14 w-14 rounded-tr-[1.7rem] border-r-[5px] border-t-[5px] border-emerald-300" />
          <span className="absolute -bottom-1.5 -left-1.5 h-14 w-14 rounded-bl-[1.7rem] border-b-[5px] border-l-[5px] border-emerald-300" />
          <span className="absolute -bottom-1.5 -right-1.5 h-14 w-14 rounded-br-[1.7rem] border-b-[5px] border-r-[5px] border-emerald-300" />
        </div>

        <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+5.3rem)] z-40 flex flex-col overflow-hidden rounded-full border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl">
          <button className="flex h-14 w-14 items-center justify-center border-b border-white/10 text-white/80">
            <Settings size={22} />
          </button>
          <button
            onClick={() => setShowSheet(true)}
            className="relative flex h-14 w-14 items-center justify-center text-white/80"
          >
            <Layers size={22} />
            {scannedCards.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f59e0b] px-1 text-[10px] font-black text-black">
                {scannedCards.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={capturePreviewCard}
          disabled={isRecognizing}
          className="absolute bottom-[186px] left-1/2 z-40 flex h-[72px] w-[72px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white/80 bg-[#f59e0b] text-black shadow-[0_0_36px_rgba(245,158,11,0.5)] transition active:scale-95 disabled:opacity-60"
          aria-label="Scanner"
        >
          {isRecognizing ? (
            <span className="h-7 w-7 animate-spin rounded-full border-4 border-black/20 border-t-black" />
          ) : (
            <span className="text-3xl font-black">+</span>
          )}
        </button>

        <div className="absolute bottom-[118px] left-4 right-4 z-40">
          {currentCard ? (
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className="flex w-full items-center gap-3 rounded-[1.55rem] border border-white/10 bg-black/62 p-2 pr-4 text-left shadow-2xl backdrop-blur-xl transition active:scale-[0.99]"
            >
              {currentCard.image ? (
                <img
                  src={currentCard.image}
                  alt={currentCard.name}
                  className="h-16 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-12 items-center justify-center rounded-xl bg-white/10 text-xl">
                  🎴
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black">
                  {currentCard.name}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-white/45">
                  {currentCard.setCode?.toUpperCase() || "Extension à identifier"}
                </p>
                <p className="mt-1 text-sm font-black text-[#f59e0b]">
                  {formatCurrency(currentCard.price)}
                </p>
              </div>

              <ChevronRight size={22} className="text-white/50" />
            </button>
          ) : (
            <div className="rounded-full bg-black/55 px-4 py-3 text-center text-xs font-bold text-white/65 shadow-xl backdrop-blur-xl">
              {status}
            </div>
          )}
        </div>

        <section className="absolute bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#101116]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-3 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3 font-black text-white"
            >
              <Layers size={18} />
              {scannedCards.length} carte(s)
            </button>

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="max-w-[150px] rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm font-black outline-none"
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.name}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {showSheet && (
          <div className="absolute inset-0 z-[80] bg-black/45 backdrop-blur-sm">
            <button
              aria-label="Fermer"
              className="absolute inset-0"
              onClick={() => setShowSheet(false)}
            />

            <section className="absolute bottom-0 left-0 right-0 max-h-[78dvh] rounded-t-[2rem] border-t border-white/10 bg-[#101116] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20" />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f59e0b]">
                    Cartes scannées
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {scannedCards.length} carte(s)
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSheet(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 max-h-[42dvh] overflow-y-auto pr-1">
                {scannedCards.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-6 text-center text-sm font-bold text-white/40">
                    Aucune carte scannée pour le moment.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {scannedCards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-2"
                      >
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={card.name}
                            className="h-16 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-12 items-center justify-center rounded-xl bg-black/35 text-lg">
                            🎴
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black">{card.name}</p>
                          <p className="text-xs font-bold text-white/45">
                            x{card.quantity} · {formatCurrency(card.price)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCard(card.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 font-black text-red-200"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                <button
                  type="button"
                  onClick={clearScan}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  type="button"
                  disabled={scannedCards.length === 0 || isAdding}
                  onClick={() => void addScannedCardsToCollection()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 font-black text-black disabled:opacity-35"
                >
                  <Check size={19} strokeWidth={2.7} />
                  {isAdding ? "Ajout..." : `Ajouter à ${selectedFolder}`}
                </button>
              </div>

              <p className="mt-3 text-center text-xs font-bold text-white/35">
                {status}
              </p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
