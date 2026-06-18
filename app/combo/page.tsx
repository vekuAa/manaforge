"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

type Combo = {
  id: string;
  description: string;
  uses?: string;
  status?: string;
  produces?: string[];
  card_count?: number;
  cards?: {
    card: {
      name: string;
    };
  }[];
};

export default function ComboPage() {
  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);

  async function getRandomCombo() {
    setLoading(true);

    try {
      const response = await fetch("/api/combo/random");

      const data = await response.json();

      setCombo(data);
    } catch {
      console.error("Erreur combo");
    }

    setLoading(false);
  }

 useEffect(() => {
  const timeout = window.setTimeout(() => {
    void getRandomCombo();
  }, 0);

  return () => window.clearTimeout(timeout);
}, []);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-4xl pb-28">
        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.2),transparent_40%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f59e0b]">
            ManaForge Combo Lab
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Random Combo
          </h1>

          <p className="mt-2 text-white/50">
            Découvre une combo Commander aléatoire.
          </p>

          <button
            onClick={getRandomCombo}
            className="mt-5 rounded-2xl bg-[#f59e0b] px-5 py-3 font-black text-black"
          >
            🎲 Nouvelle combo
          </button>
        </div>

        {loading && (
          <div className="mt-6 rounded-3xl border border-white/10 p-6">
            Chargement...
          </div>
        )}

        {!loading && combo && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">
              Combo #{combo.id}
            </h2>

            <div className="mt-5">
              <p className="text-sm uppercase tracking-wider text-[#f59e0b] font-black">
                Cartes
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {combo.cards?.map((card, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
                  >
                    {card.card.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm uppercase tracking-wider text-[#f59e0b] font-black">
                Résultat
              </p>

              <p className="mt-2 text-white/80">
                {combo.description}
              </p>
            </div>

            {combo.produces && combo.produces.length > 0 && (
              <div className="mt-6">
                <p className="text-sm uppercase tracking-wider text-[#f59e0b] font-black">
                  Produit
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {combo.produces.map((effect, index) => (
                    <span
                      key={index}
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