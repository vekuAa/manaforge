/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Layers, RotateCcw, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FolderRow = {
  id: string;
  name: string;
};

type RecognizedCard = {
  scryfallId: string;
  name: string;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  image: string | null;
  price: number;
  distance: number;
  confidence: number;
};

type ScannedCard = RecognizedCard & {
  localId: string;
  quantity: number;
};

type ScanResponse = {
  card?: RecognizedCard;
  matches?: RecognizedCard[];
  error?: string;
};

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [lastCard, setLastCard] = useState<ScannedCard | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState("Place une carte dans le cadre.");

  useEffect(() => {
    async function loadFolders() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setFolders([{ id: "local", name: "Non classé" }]);
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
        setFolders([{ id: "local", name: "Non classé" }]);
      }
    }

    void loadFolders();
  }, [supabase]);

  async function captureAndRecognize() {
    const image = webcamRef.current?.getScreenshot();

    if (!image) {
      setStatus("Impossible de capturer l’image.");
      return;
    }

    try {
      setIsScanning(true);
      setStatus("Analyse de la carte...");

      const blob = await fetch(image).then((response) => response.blob());
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/scan/card", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ScanResponse;

      if (!response.ok || !data.card) {
        setStatus(data.error || "Carte non reconnue.");
        return;
      }

      const scannedCard: ScannedCard = {
        ...data.card,
        localId: crypto.randomUUID(),
        quantity: 1,
      };

      setLastCard(scannedCard);
      setScannedCards((current) => [scannedCard, ...current]);
      setStatus(`${data.card.name} reconnue à ${data.card.confidence}%.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Erreur pendant la reconnaissance.",
      );
    } finally {
      setIsScanning(false);
    }
  }

  function removeCard(localId: string) {
    setScannedCards((current) =>
      current.filter((card) => card.localId !== localId),
    );

    setLastCard((current) =>
      current?.localId === localId ? null : current,
    );
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

      const folderId =
        folders.find((folder) => folder.name === selectedFolder)?.id || null;

      const cardsToInsert = scannedCards.map((card) => ({
        user_id: authData.user!.id,
        folder_id: folderId,
        scryfall_id: card.scryfallId,
        name: card.name,
        image: card.image,
        set_name: card.setName,
        set_code: card.setCode,
        collector_number: card.collectorNumber,
        quantity: card.quantity,
        price: card.price,
        foil: false,
        language: "fr",
      }));

      const { error } = await supabase
        .from("collection_cards")
        .insert(cardsToInsert);

      if (error) {
        setStatus(error.message);
        return;
      }

      setScannedCards([]);
      setLastCard(null);
      setStatus(`Ajout terminé dans "${selectedFolder}".`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <section className="relative mx-auto h-dvh max-w-md overflow-hidden bg-black">
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

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_48%,rgba(0,0,0,0.72)_82%,rgba(0,0,0,0.9)_100%)]" />

        <header className="absolute left-0 right-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-black/45 p-2 backdrop-blur-xl">
            <Link
              href="/collection"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
              aria-label="Retour"
            >
              <X size={22} strokeWidth={2.5} />
            </Link>

            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f59e0b]">
                ManaForge
              </p>
              <p className="text-sm font-black">Scan live</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setScannedCards([]);
                setLastCard(null);
                setStatus("Panier vidé.");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
              aria-label="Réinitialiser"
            >
              <RotateCcw size={19} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <div className="pointer-events-none absolute left-1/2 top-[39%] z-20 aspect-[63/88] w-[73%] max-w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-[1.8rem] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28),0_0_35px_rgba(245,158,11,0.25)]">
          <span className="absolute -left-1.5 -top-1.5 h-14 w-14 rounded-tl-[1.8rem] border-l-4 border-t-4 border-[#f59e0b]" />
          <span className="absolute -right-1.5 -top-1.5 h-14 w-14 rounded-tr-[1.8rem] border-r-4 border-t-4 border-[#f59e0b]" />
          <span className="absolute -bottom-1.5 -left-1.5 h-14 w-14 rounded-bl-[1.8rem] border-b-4 border-l-4 border-[#f59e0b]" />
          <span className="absolute -bottom-1.5 -right-1.5 h-14 w-14 rounded-br-[1.8rem] border-b-4 border-r-4 border-[#f59e0b]" />
        </div>

        {lastCard && (
          <div className="absolute bottom-[210px] left-4 right-4 z-40 rounded-3xl border border-white/10 bg-[#101116]/90 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {lastCard.image && (
                <img
                  src={lastCard.image}
                  alt={lastCard.name}
                  className="h-20 w-14 rounded-xl object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">{lastCard.name}</p>
                <p className="truncate text-xs font-bold text-white/50">
                  {lastCard.setCode?.toUpperCase()} #{lastCard.collectorNumber}
                </p>
                <p className="mt-1 text-sm font-black text-[#f59e0b]">
                  Confiance {lastCard.confidence}%
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-[126px] left-0 right-0 z-40 flex justify-center">
          <button
            type="button"
            onClick={() => void captureAndRecognize()}
            disabled={isScanning}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white/80 bg-[#f59e0b] text-black shadow-[0_0_35px_rgba(245,158,11,0.45)] transition active:scale-95 disabled:opacity-50"
            aria-label="Scanner"
          >
            {isScanning ? (
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-black/20 border-t-black" />
            ) : (
              <Camera size={30} strokeWidth={2.7} />
            )}
          </button>
        </div>

        <div className="absolute bottom-[88px] left-4 right-4 z-40 text-center">
          <p className="rounded-full bg-black/55 px-4 py-2 text-xs font-bold text-white/65 backdrop-blur">
            {status}
          </p>
        </div>

        <section className="absolute bottom-0 left-0 right-0 z-40 rounded-t-[2rem] border-t border-white/10 bg-[#101116]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl backdrop-blur-xl">
          <div className="mb-3 mx-auto h-1 w-12 rounded-full bg-white/20" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                <Layers size={14} />
                Scannées
              </p>
              <h2 className="mt-1 text-xl font-black">
                {scannedCards.length} carte(s)
              </h2>
            </div>

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

          {scannedCards.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {scannedCards.map((card) => (
                <div
                  key={card.localId}
                  className="relative h-[74px] w-[122px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055]"
                >
                  {card.image && (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="absolute inset-0 h-full w-full object-cover opacity-65"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

                  <button
                    type="button"
                    onClick={() => removeCard(card.localId)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-white"
                  >
                    <Trash2 size={13} />
                  </button>

                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="truncate text-xs font-black">{card.name}</p>
                    <p className="text-[10px] font-bold text-white/45">
                      {card.setCode?.toUpperCase()} #{card.collectorNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={scannedCards.length === 0 || isAdding}
            onClick={() => void addScannedCardsToCollection()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 font-black text-black transition active:scale-[0.99] disabled:opacity-30"
          >
            <Check size={19} strokeWidth={2.7} />
            {isAdding ? "Ajout..." : `Ajouter à ${selectedFolder}`}
          </button>
        </section>
      </section>
    </main>
  );
}