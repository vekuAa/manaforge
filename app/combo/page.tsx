"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

type ComboCard = {
  card?: {
    name?: string;
  };
};

type Combo = {
  id?: string | number;
  description?: string;
  uses?: string;
  status?: string;
  produces?: string[];
  card_count?: number;
  cards?: ComboCard[];
};

export default function ComboPage() {
  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getRandomCombo() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/combo/random", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger une combo.");
      }

      setCombo(data as Combo);
    } catch (err) {
      setCombo(null);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur inconnue pendant le chargement.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void getRandomCombo();
    }, 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = combo?.cards || [];

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-4xl pb-28">
        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.2),transparent_40%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f59e0b]">
            ManaForge Combo Lab
          </p>

          <h1 className="mt-3 text-4xl font-black">Random Combo</h1>

          <p className="mt-2 text-white/50">
            Découvre une combo Commander aléatoire.
          </p>

          <button
            onClick={() => void getRandomCombo()}
            disabled={loading}
            className="mt-5 rounded-2xl bg-[#f59e0b] px-5 py-3 font-black text-black disabled:opacity-50"
          >
            {loading ? "Chargement..." : "🎲 Nouvelle combo"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
            <p className="font-black">Erreur</p>
            <p className="mt-2 text-sm font-bold">{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            Chargement...
          </div>
        )}

        {!loading && combo && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">Combo #{combo.id || "?"}</h2>

            <div className="mt-5">
              <p className="text-sm font-black uppercase tracking-wider text-[#f59e0b]">
                Cartes
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {cards.length > 0 ? (
                  cards.map((item, index) => (
                    <span
                      key={`${item.card?.name || "card"}-${index}`}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
                    >
                      {item.card?.name || "Carte inconnue"}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-bold text-white/45">
                    Aucune carte retournée par l’API.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-black uppercase tracking-wider text-[#f59e0b]">
                Résultat
              </p>

              <p className="mt-2 whitespace-pre-line text-white/80">
                {combo.description || combo.uses || "Description indisponible."}
              </p>
            </div>

            {combo.produces && combo.produces.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-black uppercase tracking-wider text-[#f59e0b]">
                  Produit
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {combo.produces.map((effect, index) => (
                    <span
                      key={`${effect}-${index}`}
                      className="rounded-full bg-[#f59e0b]/20 px-4 py-2 text-sm font-bold text-[#f59e0b]"
                    >
                      {effect}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}