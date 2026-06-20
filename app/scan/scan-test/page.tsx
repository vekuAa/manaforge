/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";

type ScanResult = {
  card?: {
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
  matches?: ScanResult["card"][];
  error?: string;
};

export default function ScanTestPage() {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function testScan() {
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/scan/card", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as ScanResult;
    setResult(data);
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <Link
          href="/scan"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl font-black"
        >
          ←
        </Link>

        <h1 className="mt-6 text-3xl font-black">Scan Test</h1>
        <p className="mt-2 text-sm font-bold text-white/50">
          Upload une photo d’une carte déjà indexée pour tester le moteur visuel.
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-5">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              setFile(selected);
              setResult(null);
              setPreview(selected ? URL.createObjectURL(selected) : "");
            }}
            className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-bold"
          />

          {preview && (
            <img
              src={preview}
              alt="Aperçu"
              className="mt-5 max-h-[420px] rounded-2xl object-contain"
            />
          )}

          <button
            type="button"
            onClick={testScan}
            disabled={!file || isLoading}
            className="mt-5 w-full rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black disabled:opacity-40"
          >
            {isLoading ? "Analyse..." : "Tester la reconnaissance"}
          </button>
        </div>

        {result?.error && (
          <div className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">
            <p className="font-black">Erreur</p>
            <p className="mt-2 text-sm font-bold">{result.error}</p>
          </div>
        )}

        {result?.card && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
              Meilleur résultat
            </p>

            <div className="mt-4 flex gap-4">
              {result.card.image && (
                <img
                  src={result.card.image}
                  alt={result.card.name}
                  className="h-36 w-24 rounded-xl object-cover"
                />
              )}

              <div>
                <h2 className="text-2xl font-black">{result.card.name}</h2>
                <p className="mt-1 text-sm font-bold text-white/50">
                  {result.card.setCode?.toUpperCase()} #{result.card.collectorNumber}
                </p>
                <p className="mt-3 text-xl font-black text-[#f59e0b]">
                  Confiance {result.card.confidence}%
                </p>
                <p className="mt-1 text-xs font-bold text-white/40">
                  Distance : {result.card.distance}
                </p>
              </div>
            </div>
          </div>
        )}

        {result?.matches && result.matches.length > 1 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
              Top résultats
            </p>

            <div className="mt-4 grid gap-3">
              {result.matches.map((match) => (
                <div
                  key={match?.scryfallId}
                  className="flex items-center gap-3 rounded-2xl bg-black/25 p-3"
                >
                  {match?.image && (
                    <img
                      src={match.image}
                      alt={match.name}
                      className="h-16 w-11 rounded-lg object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{match?.name}</p>
                    <p className="text-xs font-bold text-white/45">
                      {match?.setCode?.toUpperCase()} #{match?.collectorNumber}
                    </p>
                  </div>

                  <p className="text-sm font-black text-[#f59e0b]">
                    {match?.confidence}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}