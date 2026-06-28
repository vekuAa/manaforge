/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type MarketStatus = "sell" | "trade" | "want";

type MarketCard = {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  set_name: string | null;
  set_code: string | null;
  collector_number: string | null;
  language: string | null;
  foil: boolean | null;
  quantity: number | null;
  price: number | string | null;
  market_status: MarketStatus | null;
  market_price: number | string | null;
  market_note: string | null;
  market_condition: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: MarketStatus | null) {
  if (status === "sell") return "À vendre";
  if (status === "trade") return "Échange";
  if (status === "want") return "Recherche";
  return "Market";
}

export default function MarketPage() {
  const supabase = useMemo(() => createClient(), []);

  const [cards, setCards] = useState<MarketCard[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"all" | MarketStatus>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMarket() {
      setIsLoading(true);

      const { data: marketCards } = await supabase
        .from("collection_cards")
        .select(
          "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
        )
        .in("market_status", ["sell", "trade", "want"])
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<MarketCard[]>();

      const safeCards = marketCards || [];
      setCards(safeCards);

      const userIds = Array.from(new Set(safeCards.map((card) => card.user_id)));

      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds)
          .returns<Profile[]>();

        const profileMap: Record<string, Profile> = {};

        (profileRows || []).forEach((profile) => {
          profileMap[profile.id] = profile;
        });

        setProfiles(profileMap);
      }

      setIsLoading(false);
    }

    void loadMarket();
  }, [supabase]);

  const filteredCards = cards.filter((card) => {
    const matchesFilter = filter === "all" || card.market_status === filter;
    const haystack = `${card.name} ${card.set_name || ""} ${card.set_code || ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">
            ManaForge Market
          </p>

          <h1 className="mt-3 text-4xl font-black">Market</h1>

          <p className="mt-2 text-sm font-bold text-white/50">
            Cartes à vendre, à échanger ou recherchées par la communauté.
          </p>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une carte..."
            className="mt-5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
          />

          <div className="mt-4 flex gap-2 overflow-x-auto">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              Tout
            </FilterButton>
            <FilterButton active={filter === "sell"} onClick={() => setFilter("sell")}>
              À vendre
            </FilterButton>
            <FilterButton active={filter === "trade"} onClick={() => setFilter("trade")}>
              Échange
            </FilterButton>
            <FilterButton active={filter === "want"} onClick={() => setFilter("want")}>
              Recherche
            </FilterButton>
          </div>
        </header>

        {isLoading ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center font-bold text-white/50">
            Chargement du market...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
            <p className="text-5xl">💰</p>
            <h2 className="mt-4 text-2xl font-black">Aucune carte trouvée</h2>
            <p className="mt-2 font-bold text-white/45">
              Aucune carte ne correspond au filtre actuel.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => {
              const profile = profiles[card.user_id];
              const marketPrice = Number(card.market_price || card.price || 0);

              return (
                <article
                  key={card.id}
                  className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.055] shadow-xl"
                >
                  <div className="flex gap-3 p-3">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-32 w-23 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-23 items-center justify-center rounded-2xl bg-black/30 text-3xl">
                        🎴
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-black uppercase text-black">
                        {statusLabel(card.market_status)}
                      </span>

                      <h2 className="mt-3 line-clamp-2 text-lg font-black">
                        {card.name}
                      </h2>

                      <p className="mt-1 text-xs font-bold text-white/45">
                        {card.set_code?.toUpperCase()} #{card.collector_number}
                      </p>

                      <p className="mt-2 text-xl font-black text-[#f59e0b]">
                        {marketPrice > 0 ? formatCurrency(marketPrice) : "Prix libre"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 p-3">
                    <div className="flex items-center gap-2">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name || profile.username || "Profil"}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-black text-black">
                          {(profile?.display_name || profile?.username || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {profile?.display_name || profile?.username || "Joueur"}
                        </p>
                        <p className="text-xs font-bold text-white/40">
                          {card.market_condition || "NM"} · {card.language?.toUpperCase() || "FR"}
                          {card.foil ? " · FOIL" : ""}
                        </p>
                      </div>
                    </div>

                    {card.market_note && (
                      <p className="mt-3 rounded-2xl bg-black/25 p-3 text-xs font-bold text-white/55">
                        {card.market_note}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
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