/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";

type ScannedCard = {
  id: string;
  name: string;
  image?: string;
  confidence: number;
};

const demoCards: ScannedCard[] = [
  {
    id: "1",
    name: "Carte détectée",
    confidence: 0.91,
  },
];

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [isScanning, setIsScanning] = useState(false);

  function simulateScan() {
    setIsScanning(true);

    window.setTimeout(() => {
      setScannedCards((current) => [
        ...current,
        {
          ...demoCards[0],
          id: crypto.randomUUID(),
        },
      ]);

      setIsScanning(false);
    }, 800);
  }

  function removeCard(id: string) {
    setScannedCards((current) => current.filter((card) => card.id !== id));
  }

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <section className="mx-auto flex min-h-screen max-w-md flex-col pb-28">
        <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex max-w-md items-center justify-between px-4 pt-4">
          <Link
            href="/collection"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-2xl font-black backdrop-blur"
          >
            ←
          </Link>

          <div className="rounded-full bg-black/50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur">
            Scan live
          </div>

          <button
            type="button"
            onClick={() => setScannedCards([])}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-sm font-black backdrop-blur"
          >
            Reset
          </button>
        </header>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
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

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_55%,rgba(0,0,0,0.65)_100%)]" />

          <div className="pointer-events-none absolute aspect-[63/88] w-[76%] max-w-[330px] rounded-[1.6rem] border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.24)]">
            <span className="absolute -left-1 -top-1 h-12 w-12 rounded-tl-[1.6rem] border-l-4 border-t-4 border-[#f59e0b]" />
            <span className="absolute -right-1 -top-1 h-12 w-12 rounded-tr-[1.6rem] border-r-4 border-t-4 border-[#f59e0b]" />
            <span className="absolute -bottom-1 -left-1 h-12 w-12 rounded-bl-[1.6rem] border-b-4 border-l-4 border-[#f59e0b]" />
            <span className="absolute -bottom-1 -right-1 h-12 w-12 rounded-br-[1.6rem] border-b-4 border-r-4 border-[#f59e0b]" />

            <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </div>

          <div className="absolute bottom-5 left-4 right-4">
            <button
              type="button"
              onClick={simulateScan}
              disabled={isScanning}
              className="w-full rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black shadow-2xl disabled:opacity-50"
            >
              {isScanning ? "Détection..." : "Scanner la carte"}
            </button>
          </div>
        </div>

        <section className="rounded-t-[2rem] border-t border-white/10 bg-[#101116] p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                Cartes détectées
              </p>
              <h2 className="mt-1 text-xl font-black">
                {scannedCards.length} carte(s)
              </h2>
            </div>

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-black outline-none"
            >
              <option>Non classé</option>
              <option>Commander</option>
              <option>Trade</option>
              <option>Staples</option>
            </select>
          </div>

          <div className="mt-4 max-h-44 overflow-y-auto">
            {scannedCards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center text-sm font-bold text-white/45">
                Aucune carte détectée pour le moment.
              </div>
            ) : (
              <div className="grid gap-2">
                {scannedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3"
                  >
                    <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-black/35 text-xl">
                      🎴
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{card.name}</p>
                      <p className="text-xs font-bold text-white/45">
                        Confiance {Math.round(card.confidence * 100)}%
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 font-black text-red-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={scannedCards.length === 0}
            className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black disabled:opacity-30"
          >
            Ajouter au dossier {selectedFolder}
          </button>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}