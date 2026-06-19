/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useEffect, useMemo, useState } from "react";
import { Dices, RefreshCw, Search, Sparkles, Star, Zap } from "lucide-react";

type Combo = {
  id: string;
  status: string;
  identity: string;
  uses: string[];
  produces: string[];
  cards: string[];
  url?: string;
};

type ComboApiResponse = {
  combos?: Combo[];
  error?: string;
};

function getScryfallImageUrl(cardName: string) {
  return `/api/scryfall/image?name=${encodeURIComponent(cardName)}`;
}

function getComboTitle(combo: Combo) {
  if (combo.cards.length === 0) return `Combo ${combo.id}`;
  return combo.cards.join(" + ");
}

export default function ComboPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboIndex, setComboIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mana" | "draw" | "damage">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCombos() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/combo", { cache: "no-store" });
      const data = (await response.json()) as ComboApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger les combos.");
      }

      const nextCombos = Array.isArray(data.combos) ? data.combos : [];

      setCombos(nextCombos);
      setComboIndex(0);

      if (nextCombos.length === 0) {
        setError("Aucune combo reçue depuis Commander Spellbook.");
      }
    } catch (err) {
      setCombos([]);
      setComboIndex(0);
      setError(err instanceof Error ? err.message : "Erreur pendant le chargement des combos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCombos();
    }, 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCombos = useMemo(() => {
    return combos.filter((combo) => {
      const haystack = [
        ...combo.cards,
        ...combo.uses,
        ...combo.produces,
        combo.identity,
        combo.status,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search.trim() || haystack.includes(search.trim().toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "mana" && haystack.includes("mana")) ||
        (filter === "draw" && haystack.includes("draw")) ||
        (filter === "damage" &&
          (haystack.includes("damage") ||
            haystack.includes("life") ||
            haystack.includes("lifegain") ||
            haystack.includes("lifeloss")));

      return matchesSearch && matchesFilter;
    });
  }, [combos, filter, search]);

  const safeComboIndex = filteredCombos.length === 0 ? 0 : comboIndex % filteredCombos.length;
  const activeCombo = filteredCombos[safeComboIndex];

  function nextCombo() {
    setComboIndex((current) => {
      if (filteredCombos.length <= 1) return 0;
      return (current + 1) % filteredCombos.length;
    });
  }

  function changeFilter(nextFilter: typeof filter) {
    setFilter(nextFilter);
    setComboIndex(0);
  }

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black transition hover:bg-white/[0.1]"
        >
          ←
        </Link>

        <header className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f59e0b]">
                ManaForge Combo Lab
              </p>

              <h1 className="mt-3 text-4xl font-black md:text-5xl">
                Combo Center
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-white/55">
                Explore des combos Commander depuis Commander Spellbook, avec visuels Scryfall.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadCombos()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f59e0b] px-5 py-3 font-black text-black disabled:opacity-50"
            >
              <RefreshCw size={18} />
              {isLoading ? "Chargement..." : "Recharger"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <Search size={18} className="text-white/40" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setComboIndex(0);
                }}
                placeholder="Rechercher une carte, mana, draw, life..."
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-white/35"
              />
            </label>

            <div className="flex gap-2 overflow-x-auto">
              <FilterButton active={filter === "all"} onClick={() => changeFilter("all")}>Tout</FilterButton>
              <FilterButton active={filter === "mana"} onClick={() => changeFilter("mana")}>Mana</FilterButton>
              <FilterButton active={filter === "draw"} onClick={() => changeFilter("draw")}>Pioche</FilterButton>
              <FilterButton active={filter === "damage"} onClick={() => changeFilter("damage")}>Damage/Life</FilterButton>
            </div>
          </div>
        </header>

        {error && (
          <section className="mt-6 rounded-[2rem] border border-red-400/20 bg-red-500/10 p-5 text-red-200">
            <p className="font-black">Erreur</p>
            <p className="mt-2 text-sm font-bold">{error}</p>
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <ComboStat icon={<Zap size={22} />} label="Chargées" value={combos.length} />
          <ComboStat icon={<Sparkles size={22} />} label="Filtrées" value={filteredCombos.length} />
          <ComboStat icon={<Star size={22} />} label="Favoris" value="Bientôt" />
          <ComboStat icon={<Dices size={22} />} label="Mode deck" value="V2" />
        </section>

        {isLoading && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
            <p className="text-4xl">⚡</p>
            <p className="mt-3 font-black">Chargement des combos...</p>
          </section>
        )}

        {!isLoading && activeCombo && (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl">
            <div className="border-b border-white/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                    Combo #{activeCombo.id}
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {getComboTitle(activeCombo)}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-white/45">
                    Identité : {activeCombo.identity || "N/A"} · Statut : {activeCombo.status}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={nextCombo}
                  disabled={filteredCombos.length <= 1}
                  className="rounded-2xl bg-[#f59e0b] px-5 py-3 font-black text-black disabled:opacity-40"
                >
                  🎲 Combo suivante
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white/40">
                  Cartes nécessaires
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {activeCombo.cards.length > 0 ? (
                    activeCombo.cards.map((cardName) => (
                      <div
                        key={cardName}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2"
                      >
                        <img
                          src={getScryfallImageUrl(cardName)}
                          alt={cardName}
                          className="aspect-[63/88] w-full rounded-xl object-cover"
                        />
                        <p className="mt-2 truncate text-xs font-black">{cardName}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full rounded-2xl bg-black/25 p-5 text-sm font-bold text-white/45">
                      Aucune carte retournée pour cette combo.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <InfoPanel title="Utilise / nécessite" items={activeCombo.uses} empty="Non précisé." />
                <InfoPanel title="Produit" items={activeCombo.produces} empty="Non précisé." />

                {activeCombo.url && (
                  <a
                    href={activeCombo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-black text-[#f59e0b]"
                  >
                    Ouvrir sur Commander Spellbook →
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {!isLoading && !activeCombo && !error && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
            <p className="text-5xl">⚡</p>
            <h2 className="mt-4 text-2xl font-black">Aucune combo trouvée</h2>
            <p className="mt-2 font-bold text-white/45">
              Modifie les filtres ou clique sur Recharger.
            </p>
          </section>
        )}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-black/25 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
            Source
          </p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-white/55">
            Données combos issues de Commander Spellbook. Images récupérées via Scryfall.
          </p>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black ${
        active ? "bg-[#f59e0b] text-black" : "bg-black/25 text-white/60"
      }`}
    >
      {children}
    </button>
  );
}

function ComboStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
      <div className="text-[#f59e0b]">{icon}</div>
      <p className="mt-3 text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/45">
        {label}
      </p>
    </div>
  );
}

function InfoPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-[#f59e0b]">
        {title}
      </p>

      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/70"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-bold text-white/45">{empty}</p>
      )}
    </div>
  );
}
