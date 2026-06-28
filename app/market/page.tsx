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
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: MarketStatus | null) {
  if (status === "sell") return "À vendre";
  if (status === "trade") return "Échange";
  if (status === "want") return "Recherche";
  return "Market";
}

function priceLabel(card: MarketCard) {
  const price = toNumber(card.market_price || card.price);
  if (card.market_status === "want" && price <= 0) return "Prix à discuter";
  if (card.market_status === "trade" && price <= 0) return "Échange";
  if (price <= 0) return "Prix libre";
  return formatCurrency(price);
}

export default function MarketPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [cards, setCards] = useState<MarketCard[]>([]);
  const [myCards, setMyCards] = useState<MarketCard[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"all" | MarketStatus>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("sell");
  const [marketPrice, setMarketPrice] = useState("");
  const [marketCondition, setMarketCondition] = useState("NM");
  const [marketNote, setMarketNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

      const map: Record<string, Profile> = {};
      (profileRows || []).forEach((profile) => {
        map[profile.id] = profile;
      });

      setProfiles(map);
    }

    setIsLoading(false);
  }

  async function loadMyCards() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) return;

    const { data } = await supabase
      .from("collection_cards")
      .select(
        "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
      )
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .limit(300)
      .returns<MarketCard[]>();

    setMyCards(data || []);
  }

useEffect(() => {
  const init = async () => {
    await Promise.all([
      loadMarket(),
      loadMyCards(),
    ]);
  };

  init();
}, []);

  async function publishCard() {
    if (!selectedCardId) return;

    setIsSaving(true);

    const cleanPrice = marketPrice.trim()
      ? Number(marketPrice.replace(",", "."))
      : null;

    const { error } = await supabase
      .from("collection_cards")
      .update({
        market_status: marketStatus,
        market_price: Number.isFinite(cleanPrice) ? cleanPrice : null,
        market_condition: marketCondition,
        market_note: marketNote.trim() || null,
      })
      .eq("id", selectedCardId);

    setIsSaving(false);

    if (error) {
      alert("Erreur pendant la publication.");
      return;
    }

    setIsModalOpen(false);
    setSelectedCardId("");
    setMarketPrice("");
    setMarketCondition("NM");
    setMarketNote("");

    await loadMarket();
    await loadMyCards();
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesFilter = filter === "all" || card.market_status === filter;
      const haystack = `${card.name} ${card.set_name || ""} ${card.set_code || ""}`.toLowerCase();
      const matchesSearch =
        !search.trim() || haystack.includes(search.trim().toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [cards, filter, search]);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-6 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">
            ManaForge Market
          </p>

          <h1 className="mt-3 text-3xl font-black">Market</h1>

          <p className="mt-2 text-sm font-bold text-white/50">
            Cartes à vendre, à échanger ou recherchées par la communauté.
          </p>

          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 w-full rounded-2xl bg-[#f59e0b] px-4 py-4 text-sm font-black text-black"
          >
            + Publier une carte
          </button>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une carte..."
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              Tout · {cards.length}
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
          <EmptyBox text="Chargement du market..." />
        ) : filteredCards.length === 0 ? (
          <EmptyBox text="Aucune carte trouvée" />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => {
              const profile = profiles[card.user_id];

              return (
                <article
                  key={card.id}
                  onClick={() => router.push(`/card/${card.id}`)}
                  className="cursor-pointer rounded-[1.7rem] border border-white/10 bg-white/[0.055] p-3 shadow-xl"
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
                      <span className="rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-black uppercase text-black">
                        {statusLabel(card.market_status)}
                      </span>

                      <h2 className="mt-3 line-clamp-2 text-base font-black">
                        {card.name}
                      </h2>

                      <p className="mt-1 text-xs font-bold text-white/45">
                        {card.set_code?.toUpperCase()} #{card.collector_number}
                      </p>

                      <p className="mt-2 text-lg font-black text-[#f59e0b]">
                        {priceLabel(card)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-white/40">
                        Quantité : x{card.quantity || 1}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="truncate text-sm font-black">
                      {profile?.display_name || profile?.username || "Joueur"}
                    </p>
                    <p className="text-xs font-bold text-white/40">
                      {card.market_condition || "NM"} ·{" "}
                      {card.language?.toUpperCase() || "FR"}
                      {card.foil ? " · FOIL" : ""}
                    </p>

                    {card.market_note && (
                      <p className="mt-3 line-clamp-3 rounded-2xl bg-black/25 p-3 text-xs font-bold text-white/55">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 md:items-center md:justify-center">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#18191f] p-5 text-white shadow-2xl">
            <h2 className="text-2xl font-black">Publier une carte</h2>

            <select
              value={selectedCardId}
              onChange={(event) => setSelectedCardId(event.target.value)}
              className="mt-5 w-full rounded-2xl bg-black/30 px-4 py-4 text-sm font-bold outline-none"
            >
              <option value="">Choisir une carte</option>
              {myCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} {card.set_code ? `(${card.set_code.toUpperCase()})` : ""}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ModalButton active={marketStatus === "sell"} onClick={() => setMarketStatus("sell")}>
                Vente
              </ModalButton>
              <ModalButton active={marketStatus === "trade"} onClick={() => setMarketStatus("trade")}>
                Échange
              </ModalButton>
              <ModalButton active={marketStatus === "want"} onClick={() => setMarketStatus("want")}>
                Recherche
              </ModalButton>
            </div>

            <input
              value={marketPrice}
              onChange={(event) => setMarketPrice(event.target.value)}
              placeholder="Prix demandé, ex: 12.50"
              inputMode="decimal"
              className="mt-4 w-full rounded-2xl bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
            />

            <select
              value={marketCondition}
              onChange={(event) => setMarketCondition(event.target.value)}
              className="mt-4 w-full rounded-2xl bg-black/30 px-4 py-4 text-sm font-bold outline-none"
            >
              <option value="NM">NM</option>
              <option value="EX">EX</option>
              <option value="GD">GD</option>
              <option value="LP">LP</option>
              <option value="PL">PL</option>
              <option value="PO">PO</option>
            </select>

            <textarea
              value={marketNote}
              onChange={(event) => setMarketNote(event.target.value)}
              placeholder="Note optionnelle..."
              className="mt-4 h-24 w-full resize-none rounded-2xl bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
              >
                Annuler
              </button>

              <button
                onClick={publishCard}
                disabled={!selectedCardId || isSaving}
                className="rounded-2xl bg-[#f59e0b] px-4 py-4 text-sm font-black text-black disabled:opacity-50"
              >
                {isSaving ? "Publication..." : "Publier"}
              </button>
            </div>
          </div>
        </div>
      )}

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

function ModalButton({
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
      className={`rounded-2xl px-3 py-3 text-xs font-black ${
        active ? "bg-[#f59e0b] text-black" : "bg-black/30 text-white/60"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
      <p className="text-5xl">💰</p>
      <h2 className="mt-4 text-2xl font-black">{text}</h2>
    </div>
  );
}