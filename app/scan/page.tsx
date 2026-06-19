/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useMemo, useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ScannedCard = {
  id: string;
  name: string;
  image?: string;
  confidence: number;
  quantity: number;
  price: number;
};

type FolderRow = {
  id: string;
  name: string;
};

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");

  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [status, setStatus] = useState(
    "Place une carte devant la caméra puis capture-la."
  );

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

  function captureCurrentFrame() {
    const image = webcamRef.current?.getScreenshot();

    if (!image) return;

    setIsScanning(true);

    window.setTimeout(() => {
      setScannedCards((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: "Carte capturée",
          image,
          confidence: 100,
          quantity: 1,
          price: 0,
        },
      ]);

      setStatus("Carte capturée avec succès.");
      setIsScanning(false);
    }, 300);
  }

  function removeCard(id: string) {
    setScannedCards((current) =>
      current.filter((card) => card.id !== id)
    );
  }

  async function addScannedCardsToCollection() {
    try {
      setIsAdding(true);

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setStatus("Connecte-toi pour ajouter les cartes.");
        return;
      }

      const folderId =
        folders.find((folder) => folder.name === selectedFolder)?.id || null;

      const cardsToInsert = scannedCards.map((card) => ({
        user_id: authData.user.id,
        folder_id: folderId,
        name: card.name,
        image: card.image,
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
      setStatus(`Ajout terminé dans "${selectedFolder}".`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <section className="relative mx-auto h-[100dvh] max-w-md">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "environment",
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_55%,rgba(0,0,0,0.75)_100%)]" />

        <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-4 pt-4">
          <Link
            href="/collection"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-2xl font-black"
          >
            ←
          </Link>

          <div className="rounded-full bg-black/50 px-4 py-2 text-xs font-black uppercase tracking-wider">
            Scan
          </div>

          <button
            type="button"
            onClick={() => setScannedCards([])}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xs font-black"
          >
            Reset
          </button>
        </header>

        <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 aspect-[63/88] w-[75%] max-w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem] border-2 border-white">
          <span className="absolute -left-1 -top-1 h-12 w-12 border-l-4 border-t-4 border-[#f59e0b]" />
          <span className="absolute -right-1 -top-1 h-12 w-12 border-r-4 border-t-4 border-[#f59e0b]" />
          <span className="absolute -bottom-1 -left-1 h-12 w-12 border-b-4 border-l-4 border-[#f59e0b]" />
          <span className="absolute -bottom-1 -right-1 h-12 w-12 border-b-4 border-r-4 border-[#f59e0b]" />
        </div>

        <button
          type="button"
          onClick={captureCurrentFrame}
          disabled={isScanning}
          className="absolute bottom-[220px] left-4 right-4 z-40 rounded-2xl bg-[#f59e0b] py-4 font-black text-black"
        >
          {isScanning ? "Capture..." : "Capturer"}
        </button>

        <section className="absolute bottom-0 left-0 right-0 z-40 rounded-t-[2rem] border-t border-white/10 bg-[#101116]/95 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#f59e0b]">
                Détectées
              </p>

              <h2 className="text-xl font-black">
                {scannedCards.length} carte(s)
              </h2>
            </div>

            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
            >
              {folders.map((folder) => (
                <option key={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2 text-xs text-white/60">
            {status}
          </p>

          <div className="mt-3 max-h-36 overflow-y-auto space-y-2">
            {scannedCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-2"
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="h-14 w-10 rounded object-cover"
                />

                <div className="flex-1">
                  <p className="font-black">{card.name}</p>
                </div>

                <button
                  onClick={() => removeCard(card.id)}
                  className="h-8 w-8 rounded-full bg-red-500/10 text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={scannedCards.length === 0 || isAdding}
            onClick={() => void addScannedCardsToCollection()}
            className="mt-3 w-full rounded-2xl bg-white py-3 font-black text-black disabled:opacity-40"
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