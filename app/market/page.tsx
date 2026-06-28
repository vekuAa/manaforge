/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function toNumber(value: number | string | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getQuantity(card: MarketCard) {
  return Math.max(1, Number(card.quantity || 1));
}

function getMarketPrice(card: MarketCard) {
  return toNumber(card.market_price || card.price);
}

function statusLabel(status: MarketStatus | null) {
  if (status === "sell") return "À vendre";
  if (status === "trade") return "Échange";
  if (status === "want") return "Recherche";
  return "Market";
}

function statusEmoji(status: MarketStatus | null) {
  if (status === "sell") return "💰";
  if (status === "trade") return "🔁";
  if (status === "want") return "🔎";
  return "🎴";
}

function priceLabel(card: MarketCard) {
  const price = getMarketPrice(card);

  if (card.market_status === "want" && price <= 0) return "Prix à discuter";
  if (card.market_status === "trade" && price <= 0) return "Échange";
  if (price <= 0) return "Prix libre";

  return formatCurrency(price);
}

function getProfileName(profile?: Profile) {
  return profile?.display_name || profile?.username || "Joueur";
}

function getProfileInitial(profile?: Profile) {
  return getProfileName(profile).charAt(0).toUpperCase();
}

export default function MarketPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [cards, setCards] = useState<MarketCard[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"all" | MarketStatus>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMarket() {
      setIsLoading(true);

      const { data: marketCards, error } = await supabase
        .from("collection_cards")
        .select(
          "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
        )
        .in("market_status", ["sell", "trade", "want"])
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<MarketCard[]>();

      if (error) {
        console.error("Erreur chargement market:", error);
        setCards([]);
        setProfiles({});
        setIsLoading(false);
        return;
      }

      const safeCards = marketCards || [];
      setCards(safeCards);

      const userIds = Array.from(
        new Set(safeCards.map((card) => card.user_id).filter(Boolean)),
      );

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
      } else {
        setProfiles({});
      }

      setIsLoading(false);
    }

    void loadMarket();
  }, [supabase]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesFilter = filter === "all" || card.market_status === filter;

      const haystack = [
        card.name,
        card.set_name,
        card.set_code,
        card.collector_number,
        card.language,
        card.market_condition,
        card.market_note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const cleanSearch = search.trim().toLowerCase();
      const matchesSearch = !cleanSearch || haystack.includes(cleanSearch);

      return matchesFilter && matchesSearch;
    });
  }, [cards, filter, search]);

  const counters = useMemo(() => {
    return {
      all: cards.length,
      sell: cards.filter((card) => card.market_status === "sell").length,
      trade: cards.filter((card) => card.market_status === "trade").length,
      want: cards.filter((card) => card.market_status === "want").length,
    };
  }, [cards]);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-6 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-5 shadow-2xl md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">
            ManaForge Market
          </p>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">
                Market
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-white/50">
                Cartes à vendre, à échanger ou recherchées par la communauté.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-[#f59e0b]">
              {filteredCards.length} résultat
              {filteredCards.length > 1 ? "s" : ""}
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une carte, une extension, une note..."
            className="mt-5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35 focus:border-[#f59e0b]/60"
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              Tout · {counters.all}
            </FilterButton>

            <FilterButton active={filter === "sell"} onClick={() => setFilter("sell")}>
              À vendre · {counters.sell}
            </FilterButton>

            <FilterButton active={filter === "trade"} onClick={() => setFilter("trade")}>
              Échange · {counters.trade}
            </FilterButton>

            <FilterButton active={filter === "want"} onClick={() => setFilter("want")}>
              Recherche · {counters.want}
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => {
              const profile = profiles[card.user_id];
              const quantity = getQuantity(card);

              return (
                <article
                  key={card.id}
                  onClick={() => router.push(`/card/${card.id}`)}
                  className="cursor-pointer rounded-[1.7rem] border border-white/10 bg-white/[0.055] p-3 shadow-xl transition active:scale-[0.98] hover:bg-white/[0.08]"
                >
                  <div className="flex gap-3">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-32 w-24 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-2xl bg-black/30 text-3xl">
                        🎴
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className="inline-flex rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-black uppercase text-black">
                        {statusEmoji(card.market_status)}{" "}
                        {statusLabel(card.market_status)}
                      </span>

                      <h2 className="mt-3 line-clamp-2 text-base font-black leading-tight">
                        {card.name}
                      </h2>

                      <p className="mt-1 truncate text-xs font-bold text-white/45">
                        {card.set_code?.toUpperCase() || "SET"}{" "}
                        {card.collector_number ? `#${card.collector_number}` : ""}
                      </p>

                      {card.set_name && (
                        <p className="mt-1 line-clamp-1 text-xs font-bold text-white/35">
                          {card.set_name}
                        </p>
                      )}

                      <p className="mt-2 text-lg font-black text-[#f59e0b]">
                        {priceLabel(card)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-white/40">
                        Quantité : x{quantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={getProfileName(profile)}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-black text-black">
                          {getProfileInitial(profile)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">
                          {getProfileName(profile)}
                        </p>

                        <p className="truncate text-xs font-bold text-white/40">
                          {card.market_condition || "NM"} ·{" "}
                          {card.language?.toUpperCase() || "FR"}
                          {card.foil ? " · FOIL" : ""}
                        </p>
                      </div>
                    </div>

                    {card.market_note && (
                      <p className="mt-3 line-clamp-3 rounded-2xl bg-black/25 p-3 text-xs font-bold leading-relaxed text-white/55">
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
      className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-[#f59e0b] text-black"
          : "bg-black/25 text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}