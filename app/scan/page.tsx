/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useMemo, useRef, useState } from "react";
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

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [isScanning, setIsScanning] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState("");

  function simulateScan() {
    setIsScanning(true);
    setStatus("");

    window.setTimeout(() => {
      setScannedCards((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: "Carte détectée",
          confidence: 0.91,
          quantity: 1,
          price: 0,
        },
      ]);

      setIsScanning(false);
    }, 700);
  }

  function removeCard(id: string) {
    setScannedCards((current) => current.filter((card) => card.id !== id));
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

      const { data: folders } = await supabase
        .from("folders")
        .select("id,name")
        .eq("user_id", authData.user.id);

      const folderId =
        folders?.find((folder) => folder.name === selectedFolder)?.id || null;

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
      setStatus(`Carte(s) ajoutée(s) au dossier ${selectedFolder}.`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <section className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden">
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

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_52%,rgba(0,0,0,0.72)_100%)]" />

        <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link
            href="/collection"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-2xl font-black backdrop-blur"
          >
            ←
          </Link>

          <div className="rounded-full bg-black/55 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            Scan live
          </div>

          <button
            type="button"
            onClick={() => {
              setScannedCards([]);
              setStatus("");
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xs font-black backdrop-blur"
          >
            Reset
          </button>
        </header>

        <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 aspect-[63/88] w-[74%] max-w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem] border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.22)]">
          <span className="absolute -left-1 -top-1 h-12 w-12 rounded-tl-[1.6rem] border-l-4 border-t-4 border-[#f59e0b]" />
          <span className="absolute -right-1 -top-1 h-12 w-12 rounded-tr-[1.6rem] border-r-4 border-t-4 border-[#f59e0b]" />
          <span className="absolute -bottom-1 -left-1 h-12 w-12 rounded-bl-[1.6rem] border-b-4 border-l-4 border-[#f59e0b]" />
          <span className="absolute -bottom-1 -right-1 h-12 w-12 rounded-br-[1.6rem] border-b-4 border-r-4 border-[#f59e0b]" />
        </div>

        <button
          type="button"
          onClick={simulateScan}
          disabled={isScanning}
          className="absolute bottom-[205px] left-4 right-4 z-40 rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black shadow-2xl disabled:opacity-50"
        >
          {isScanning ? "Détection..." : "Scanner la carte"}
        </button>

        <section className="absolute bottom-0 left-0 right-0 z-40 rounded-t-[2rem] border-t border-white/10 bg-[#101116]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                Détectées
              </p>
              <h2 className="mt-1 text-xl font-black">
                {scannedCards.length} carte(s)
              </h2>
            </div>

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="max-w-[145px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black outline-none"
            >
              <option>Non classé</option>
              <option>Commander</option>
              <option>Trade</option>
              <option>Staples</option>
            </select>
          </div>

          <div className="mt-3 max-h-28 overflow-y-auto">
            {scannedCards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center text-sm font-bold text-white/45">
                Place une carte dans le cadre puis scanne.
              </div>
            ) : (
              <div className="grid gap-2">
                {scannedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-2"
                  >
                    <div className="flex h-12 w-9 items-center justify-center rounded-lg bg-black/35 text-lg">
                      🎴
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{card.name}</p>
                      <p className="text-xs font-bold text-white/45">
                        Confiance {Math.round(card.confidence * 100)}%
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 font-black text-red-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status && (
            <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-center text-xs font-bold text-white/60">
              {status}
            </p>
          )}

          <button
            type="button"
            disabled={scannedCards.length === 0 || isAdding}
            onClick={() => void addScannedCardsToCollection()}
            className="mt-3 w-full rounded-2xl bg-white px-4 py-3 font-black text-black disabled:opacity-30"
          >
            {isAdding
              ? "Ajout..."
              : `Ajouter au dossier ${selectedFolder}`}
          </button>
        </section>
      </section>
    </main>
  );
}