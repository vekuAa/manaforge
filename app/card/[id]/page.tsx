/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type MarketStatus = "sell" | "trade" | "want";

type CardRow = {
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

function getDisplayName(profile: Profile | null) {
  return profile?.display_name || profile?.username || "Joueur";
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [otherListings, setOtherListings] = useState<CardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCard() {
      if (!params.id) return;

      setIsLoading(true);

      const { data: cardRow } = await supabase
        .from("collection_cards")
        .select(
          "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
        )
        .eq("id", params.id)
        .single<CardRow>();

      if (!cardRow) {
        setCard(null);
        setIsLoading(false);
        return;
      }

      setCard(cardRow);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .eq("id", cardRow.user_id)
        .single<Profile>();

      setProfile(profileRow || null);

      const { data: listings } = await supabase
        .from("collection_cards")
        .select(
          "id,user_id,name,image,set_name,set_code,collector_number,language,foil,quantity,price,market_status,market_price,market_note,market_condition",
        )
        .neq("id", cardRow.id)
        .eq("name", cardRow.name)
        .in("market_status", ["sell", "trade", "want"])
        .limit(20)
        .returns<CardRow[]>();

      setOtherListings(listings || []);
      setIsLoading(false);
    }

    void loadCard();
  }, [params.id, supabase]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center font-bold text-white/50">
          Chargement de la carte...
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!card) {
    return (
      <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
          <p className="text-5xl">🎴</p>
          <h1 className="mt-4 text-2xl font-black">Carte introuvable</h1>
          <button
            onClick={() => router.push("/market")}
            className="mt-5 rounded-2xl bg-[#f59e0b] px-5 py-3 font-black text-black"
          >
            Retour au Market
          </button>
        </div>
        <BottomNav />
      </main>
    );
  }

  const collectionPrice = toNumber(card.price);
  const marketPrice = toNumber(card.market_price || card.price);
  const quantity = Number(card.quantity || 1);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-6 text-white">
      <section className="mx-auto max-w-5xl pb-28">
        <button
          onClick={() => router.back()}
          className="mb-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white/70"
        >
          ← Retour
        </button>

        <div className="grid gap-5 md:grid-cols-[320px_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4">
            {card.image ? (
              <img
                src={card.image}
                alt={card.name}
                className="mx-auto w-full max-w-[280px] rounded-2xl"
              />
            ) : (
              <div className="flex h-[390px] items-center justify-center rounded-2xl bg-black/30 text-6xl">
                🎴
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <span className="inline-flex rounded-full bg-[#f59e0b] px-4 py-2 text-xs font-black uppercase text-black">
              {statusLabel(card.market_status)}
            </span>

            <h1 className="mt-4 text-3xl font-black leading-tight">
              {card.name}
            </h1>

            <p className="mt-2 text-sm font-bold text-white/45">
              {card.set_name || "Extension inconnue"} ·{" "}
              {card.set_code?.toUpperCase() || "SET"}{" "}
              {card.collector_number ? `#${card.collector_number}` : ""}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoBox label="Prix collection" value={formatCurrency(collectionPrice)} />
              <InfoBox
                label="Prix demandé"
                value={marketPrice > 0 ? formatCurrency(marketPrice) : "Libre"}
              />
              <InfoBox label="Quantité" value={`x${quantity}`} />
              <InfoBox label="État" value={card.market_condition || "NM"} />
              <InfoBox label="Langue" value={card.language?.toUpperCase() || "FR"} />
              <InfoBox label="Foil" value={card.foil ? "Oui" : "Non"} />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                Vendeur
              </p>

              <div className="mt-3 flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={getDisplayName(profile)}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f59e0b] font-black text-black">
                    {getDisplayName(profile).charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-black">{getDisplayName(profile)}</p>
                  <p className="text-xs font-bold text-white/40">
                    Membre ManaForge
                  </p>
                </div>
              </div>
            </div>

            {card.market_note && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  Note
                </p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-white/65">
                  {card.market_note}
                </p>
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
          <h2 className="text-xl font-black">Autres annonces pour cette carte</h2>

          {otherListings.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-white/45">
              Aucune autre annonce pour le moment.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherListings.map((listing) => {
                const price = toNumber(listing.market_price || listing.price);

                return (
                  <button
                    key={listing.id}
                    onClick={() => router.push(`/card/${listing.id}`)}
                    className="rounded-2xl border border-white/10 bg-black/25 p-3 text-left"
                  >
                    <p className="line-clamp-1 font-black">{listing.name}</p>
                    <p className="mt-1 text-xs font-bold text-white/45">
                      {statusLabel(listing.market_status)} ·{" "}
                      {listing.market_condition || "NM"} ·{" "}
                      {listing.language?.toUpperCase() || "FR"}
                    </p>
                    <p className="mt-2 font-black text-[#f59e0b]">
                      {price > 0 ? formatCurrency(price) : "Prix libre"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}