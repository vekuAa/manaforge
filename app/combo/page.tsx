"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

const starterCombos = [
  {
    name: "Exquisite Blood + Sanguine Bond",
    cards: ["Exquisite Blood", "Sanguine Bond"],
    result:
      "Gain ou perte de vie en boucle. Dès qu’un adversaire perd des points de vie, tu gagnes autant de vie, puis Sanguine Bond fait reperdre autant de vie.",
    produces: ["Drain infini", "Gain de vie infini"],
  },
  {
    name: "Kiki-Jiki + Zealous Conscripts",
    cards: ["Kiki-Jiki, Mirror Breaker", "Zealous Conscripts"],
    result:
      "Kiki-Jiki copie Zealous Conscripts. La copie dégage Kiki-Jiki. Tu peux répéter pour créer une infinité de créatures avec la célérité.",
    produces: ["Créatures infinies", "Attaque létale"],
  },
  {
    name: "Isochron Scepter + Dramatic Reversal",
    cards: ["Isochron Scepter", "Dramatic Reversal"],
    result:
      "Avec assez de permanents produisant du mana, Dramatic Reversal dégage tout et permet de générer du mana en boucle.",
    produces: ["Mana infini"],
  },
];

export default function ComboPage() {
  const [comboIndex, setComboIndex] = useState(0);
  const combo = starterCombos[comboIndex];

function getNewCombo() {
  setComboIndex((current) => {
    return (current + 1) % starterCombos.length;
  });
}

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl pb-28">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black"
        >
          ←
        </Link>

        <header className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f59e0b]">
            ManaForge Combo Lab
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Combo Center
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-white/55">
            Découvre, analyse et bientôt détecte automatiquement les combos
            présentes dans tes decks Commander.
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon="🎲"
            title="Random Combo"
            text="Découvre une combo Commander aléatoire."
          />
          <FeatureCard
            icon="🧠"
            title="Détection deck"
            text="Bientôt : ManaForge cherchera les combos dans tes decks."
          />
          <FeatureCard
            icon="⭐"
            title="Favoris"
            text="Bientôt : sauvegarde tes combos préférées."
          />
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                Combo exemple
              </p>
              <h2 className="mt-2 text-2xl font-black">{combo.name}</h2>
            </div>

            <span className="rounded-full bg-[#f59e0b] px-3 py-2 text-xs font-black text-black">
              EDH
            </span>
          </div>

          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-wider text-white/40">
              Cartes
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {combo.cards.map((card) => (
                <span
                  key={card}
                  className="rounded-full bg-black/30 px-4 py-2 text-sm font-black text-white"
                >
                  {card}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-wider text-white/40">
              Résultat
            </p>

            <p className="mt-2 text-sm font-bold leading-relaxed text-white/70">
              {combo.result}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {combo.produces.map((effect) => (
              <span
                key={effect}
                className="rounded-full bg-[#f59e0b]/15 px-4 py-2 text-sm font-black text-[#f59e0b]"
              >
                {effect}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={getNewCombo}
            className="mt-6 w-full rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black"
          >
            🎲 Nouvelle combo
          </button>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-black/25 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
            Source combos
          </p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-white/55">
            La V2 pourra utiliser Commander Spellbook, moteur de recherche de
            combos Commander/EDH, pour enrichir cette page.
          </p>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-5">
      <p className="text-3xl">{icon}</p>
      <h2 className="mt-3 text-lg font-black">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-relaxed text-white/45">
        {text}
      </p>
    </div>
  );
}