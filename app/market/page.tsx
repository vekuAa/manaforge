/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type MarketStatus = "sell" | "trade" | "want";
type MarketTab = "all" | "sell" | "trade" | "want" | "mine";

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

function statusEmoji(status: MarketStatus | null) {
  if (status === "sell") return "💰";
  if (status === "trade") return "🔁";
  if (status === "want") return "🔎";
  return "🎴";
}

function priceLabel(card: MarketCard) {
  const price = toNumber(card.market_price || card.price);

  if (card.market_status === "want" && price <= 0) return "Prix à discuter";
  if (card.market_status === "trade" && price <= 0) return "Échange";
  if (price <= 0) return "Prix libre";

  return formatCurrency(price);
}

function profileName(profile?: Profile) {
  return profile?.display_name || profile?.username || "Joueur";
}

export default function MarketPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<MarketCard[]>([]);
  const [myCollection, setMyCollection] = useState<MarketCard[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [tab, setTab] = useState<MarketTab>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [publishStatus, setPublishStatus] = useState<MarketStatus>("sell");
  const [publishPrice, setPublishPrice] = useState("");
  const [publishCondition, setPublishCondition] = useState("NM");
  const [publishNote, setPublishNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || null;
    setCurrentUserId(userId);

    const { data: marketRows } = await supabase
      .from("collection_cards")
      .select(
        "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
      )
      .in("market_status", ["sell", "trade", "want"])
      .order("created_at", { ascending: false })
      .limit(300)
      .returns<MarketCard[]>();

    const safeMarketRows = marketRows || [];
    setCards(safeMarketRows);

    if (userId) {
      const { data: myRows } = await supabase
        .from("collection_cards")
        .select(
          "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
        )
        .eq("user_id", userId)
        .order("name", { ascending: true })
        .limit(500)
        .returns<MarketCard[]>();

      setMyCollection(myRows || []);
    }

    const userIds = Array.from(
      new Set(safeMarketRows.map((card) => card.user_id).filter(Boolean)),
    );

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
    } else {
      setProfiles({});
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function publishCard() {
    if (!selectedCardId) return;

    setIsSaving(true);

    const cleanPrice = publishPrice.trim()
      ? Number(publishPrice.replace(",", "."))
      : null;

    const { error } = await supabase
      .from("collection_cards")
      .update({
        market_status: publishStatus,
        market_price: Number.isFinite(cleanPrice) ? cleanPrice : null,
        market_condition: publishCondition,
        market_note: publishNote.trim() || null,
      })
      .eq("id", selectedCardId);

    setIsSaving(false);

    if (error) {
      alert("Erreur pendant la publication.");
      return;
    }

    setIsPublishOpen(false);
    setSelectedCardId("");
    setPublishPrice("");
    setPublishCondition("NM");
    setPublishNote("");

    await loadData();
  }

  async function removeFromMarket(cardId: string) {
    const { error } = await supabase
      .from("collection_cards")
      .update({
        market_status: null,
        market_price: null,
        market_condition: null,
        market_note: null,
      })
      .eq("id", cardId);

    if (error) {
      alert("Erreur pendant le retrait.");
      return;
    }

    await loadData();
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesTab =
        tab === "all" ||
        card.market_status === tab ||
        (tab === "mine" && card.user_id === currentUserId);

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

      const matchesSearch =
        !search.trim() || haystack.includes(search.trim().toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [cards, tab, search, currentUserId]);

  const counters = useMemo(() => {
    return {
      all: cards.length,
      sell: cards.filter((card) => card.market_status === "sell").length,
      trade: cards.filter((card) => card.market_status === "trade").length,
      want: cards.filter((card) => card.market_status === "want").length,
      mine: cards.filter((card) => card.user_id === currentUserId).length,
    };
  }, [cards, currentUserId]);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-6 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">
            ManaForge Market
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight">
            Le marché Commander
          </h1>

          <p className="mt-2 text-sm font-bold leading-relaxed text-white/50">
            Vends, échange ou recherche des cartes avec la communauté.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsPublishOpen(true)}
              className="rounded-2xl bg-[#f59e0b] px-4 py-4 text-sm font-black text-black"
            >
              + Publier
            </button>

            <button
              onClick={() => setTab("mine")}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-black text-white"
            >
              Mes annonces
            </button>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une carte..."
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <TabButton active={tab === "all"} onClick={() => setTab("all")}>
              Explorer · {counters.all}
            </TabButton>
            <TabButton active={tab === "sell"} onClick={() => setTab("sell")}>
              Vente · {counters.sell}
            </TabButton>
            <TabButton active={tab === "trade"} onClick={() => setTab("trade")}>
              Échange · {counters.trade}
            </TabButton>
            <TabButton active={tab === "want"} onClick={() => setTab("want")}>
              Recherche · {counters.want}
            </TabButton>
            <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
              Moi · {counters.mine}
            </TabButton>
          </div>
        </header>

        {isLoading ? (
          <EmptyState title="Chargement du market..." />
        ) : filteredCards.length === 0 ? (
          <EmptyState title="Aucune annonce trouvée" />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => {
              const profile = profiles[card.user_id];
              const isMine = card.user_id === currentUserId;

              return (
                <article
                  key={card.id}
                  className="rounded-[1.7rem] border border-white/10 bg-white/[0.055] p-3 shadow-xl"
                >
                  <div
                    onClick={() => router.push(`/card/${card.id}`)}
                    className="cursor-pointer"
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
                          {statusEmoji(card.market_status)} {statusLabel(card.market_status)}
                        </span>

                        <h2 className="mt-3 line-clamp-2 text-base font-black leading-tight">
                          {card.name}
                        </h2>

                        <p className="mt-1 truncate text-xs font-bold text-white/45">
                          {card.set_code?.toUpperCase() || "SET"}{" "}
                          {card.collector_number ? `#${card.collector_number}` : ""}
                        </p>

                        <p className="mt-2 text-lg font-black text-[#f59e0b]">
                          {priceLabel(card)}
                        </p>

                        <p className="mt-1 text-xs font-bold text-white/40">
                          x{card.quantity || 1} · {card.market_condition || "NM"} ·{" "}
                          {card.language?.toUpperCase() || "FR"}
                          {card.foil ? " · FOIL" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="truncate text-sm font-black">
                        {isMine ? "Moi" : profileName(profile)}
                      </p>

                      {card.market_note && (
                        <p className="mt-3 line-clamp-3 rounded-2xl bg-black/25 p-3 text-xs font-bold leading-relaxed text-white/55">
                          {card.market_note}
                        </p>
                      )}
                    </div>
                  </div>

                  {isMine && (
                    <button
                      onClick={() => removeFromMarket(card.id)}
                      className="mt-3 w-full rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-black text-red-300"
                    >
                      Retirer du Market
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isPublishOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/75 p-4 md:items-center md:justify-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-[#18191f] p-5 shadow-2xl">
            <h2 className="text-2xl font-black">Publier une carte</h2>

            <p className="mt-2 text-sm font-bold text-white/45">
              Choisis une carte de ta collection, puis indique le type d’annonce.
            </p>

            <select
              value={selectedCardId}
              onChange={(event) => setSelectedCardId(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none"
            >
              <option value="">Choisir une carte</option>
              {myCollection.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} {card.set_code ? `(${card.set_code.toUpperCase()})` : ""}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ModalButton
                active={publishStatus === "sell"}
                onClick={() => setPublishStatus("sell")}
              >
                Vente
              </ModalButton>
              <ModalButton
                active={publishStatus === "trade"}
                onClick={() => setPublishStatus("trade")}
              >
                Échange
              </ModalButton>
              <ModalButton
                active={publishStatus === "want"}
                onClick={() => setPublishStatus("want")}
              >
                Recherche
              </ModalButton>
            </div>

            <input
              value={publishPrice}
              onChange={(event) => setPublishPrice(event.target.value)}
              placeholder="Prix demandé, ex : 12,50"
              inputMode="decimal"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
            />

            <select
              value={publishCondition}
              onChange={(event) => setPublishCondition(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none"
            >
              <option value="NM">Near Mint</option>
              <option value="EX">Excellent</option>
              <option value="GD">Good</option>
              <option value="LP">Light Played</option>
              <option value="PL">Played</option>
              <option value="PO">Poor</option>
            </select>

            <textarea
              value={publishNote}
              onChange={(event) => setPublishNote(event.target.value)}
              placeholder="Note optionnelle : échange possible, lot, remise en main propre..."
              className="mt-4 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/35"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPublishOpen(false)}
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

function TabButton({
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

function EmptyState({ title }: { title: string }) {
  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
      <p className="text-5xl">💰</p>
      <h2 className="mt-4 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm font-bold text-white/45">
        Publie une carte ou change de filtre.
      </p>
    </div>
  );
}