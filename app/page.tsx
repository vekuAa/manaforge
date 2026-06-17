/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import ProfileButton from "@/components/ProfileButton";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DeckCard = {
  name: string;
  quantity: number;
  price?: number;
};

type Deck = {
  id: string | number;
  name: string;
  commander: string;
  commanderImage?: string;
  colors: string;
  cards: number;
  price: number;
  wins: number;
  losses: number;
  decklist?: DeckCard[];
};

const dailyCommanders = [
  "Atraxa, Praetors' Voice",
  "Ghave, Guru of Spores",
  "Nekusar, the Mindrazer",
  "Yuriko, the Tiger's Shadow",
  "Muldrotha, the Gravetide",
  "Edgar Markov",
  "Korvold, Fae-Cursed King",
];

export default function HomePage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [commanderOfTheDay, setCommanderOfTheDay] = useState(
    dailyCommanders[0]
  );

useEffect(() => {
  let cancelled = false;

  async function loadHome() {
    const supabase = createClient();

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("decks")
      .select("id,name,commander,commander_image,colors,cards,price,wins,losses,decklist")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    const dayIndex =
      Math.floor(new Date().getTime() / 86400000) % dailyCommanders.length;

    if (!cancelled) {
      if (error) {
        console.error(error);
        setDecks([]);
      } else {
        setDecks(
          (data || []).map((deck) => ({
            id: deck.id,
            name: deck.name,
            commander: deck.commander || "Commandant inconnu",
            commanderImage: deck.commander_image || undefined,
            colors: deck.colors || "Incolore",
            cards: Number(deck.cards || 0),
            price: Number(deck.price || 0),
            wins: Number(deck.wins || 0),
            losses: Number(deck.losses || 0),
            decklist: Array.isArray(deck.decklist) ? deck.decklist : [],
          }))
        );
      }

      setCommanderOfTheDay(dailyCommanders[dayIndex]);
      setHasLoaded(true);
    }
  }

  void loadHome();

  return () => {
    cancelled = true;
  };
}, [router]);

  const stats = useMemo(() => {
    const totalDecks = decks.length;
    const wins = decks.reduce((total, deck) => total + (deck.wins || 0), 0);
    const losses = decks.reduce((total, deck) => total + (deck.losses || 0), 0);
    const games = wins + losses;
    const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;

    const collectionCards = decks.reduce(
      (total, deck) =>
        total +
        (deck.decklist?.reduce(
          (sum, card) => sum + Number(card.quantity || 1),
          0
        ) || 0),
      0
    );

    const collectionValue = decks.reduce(
      (total, deck) =>
        total +
        (deck.decklist?.reduce(
          (sum, card) => sum + Number(card.price || 0) * Number(card.quantity || 1),
          0
        ) || 0),
      0
    );

    const bestDeck = [...decks].sort((a, b) => {
      const aGames = (a.wins || 0) + (a.losses || 0);
      const bGames = (b.wins || 0) + (b.losses || 0);

      const aWr = aGames > 0 ? a.wins / aGames : 0;
      const bWr = bGames > 0 ? b.wins / bGames : 0;

      return bWr - aWr;
    })[0];

    return {
      totalDecks,
      wins,
      losses,
      games,
      winrate,
      collectionCards,
      collectionValue: Math.round(collectionValue * 100) / 100,
      bestDeck,
    };
  }, [decks]);


  const bestDeckGames =
    stats.bestDeck ? stats.bestDeck.wins + stats.bestDeck.losses : 0;

  const bestDeckWinrate =
    stats.bestDeck && bestDeckGames > 0
      ? Math.round((stats.bestDeck.wins / bestDeckGames) * 100)
      : 0;

  if (!hasLoaded) {
    return (
      <main className="page">
        <section className="container-app pb-24">
          <p className="text-muted">Chargement...</p>
        </section>
      </main>
    );
  }

return (
  <main className="page">
    <ProfileButton />

    <section className="container-app pb-28">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
            Commander / EDH
          </p>

          <h1 className="mt-2 text-5xl font-black text-accent">ManaForge</h1>

          <p className="mt-3 text-muted">
            Ton dashboard Magic : decks, parties, collection et progression.
          </p>
        </header>

        <div className="mt-8 card-premium p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">
                Vue globale
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Statistiques joueur
              </h2>
            </div>

            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-center">
              <p className="text-2xl font-black text-accent">
                {stats.winrate}%
              </p>
              <p className="text-xs font-bold text-muted">WR</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard label="Decks" value={stats.totalDecks} />
            <StatCard label="Parties" value={stats.games} />
            <StatCard label="Victoires" value={stats.wins} />
            <StatCard label="Défaites" value={stats.losses} />
          </div>
        </div>

        <div className="mt-5 card-soft p-5">
          <h2 className="text-xl font-black">🏆 Deck principal</h2>

          {stats.bestDeck ? (
            <div className="mt-4 flex items-center gap-4">
              {stats.bestDeck.commanderImage ? (
                <img
                  src={stats.bestDeck.commanderImage}
                  alt={stats.bestDeck.commander}
                  className="h-24 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-24 w-16 items-center justify-center rounded-xl bg-black/30 text-2xl">
                  🎴
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-2xl font-black">{stats.bestDeck.name}</h3>
                <p className="text-sm font-bold text-accent">
                  {stats.bestDeck.commander}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {stats.bestDeck.wins}V - {stats.bestDeck.losses}D ·{" "}
                  {bestDeckWinrate}% WR
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-muted">
              Aucun deck joué pour le moment.
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="card-soft p-5">
            <p className="text-3xl">📦</p>
            <h2 className="mt-3 text-xl font-black">Collection</h2>
            <p className="mt-2 text-3xl font-black text-accent">
              {stats.collectionCards}
            </p>
            <p className="text-sm text-muted">cartes référencées</p>
            <p className="mt-2 text-sm font-bold text-muted">
              {stats.collectionValue}€
            </p>
          </div>

          <div className="card-soft p-5">
            <p className="text-3xl">🎲</p>
            <h2 className="mt-3 text-xl font-black">Commandant du jour</h2>
            <p className="mt-2 text-sm font-bold text-accent">
              {commanderOfTheDay}
            </p>

            <Link
              href="/randomCommander"
              className="mt-4 block rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-black"
            >
              Voir
            </Link>
          </div>
        </div>

        <div className="mt-5 card-soft p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">📈 Progression WR</h2>
            <span className="text-sm font-bold text-accent">
              {stats.winrate}%
            </span>
          </div>

          <div className="mt-5 h-28 rounded-2xl bg-black/20 p-4">
            <svg viewBox="0 0 300 100" className="h-full w-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                points="0,75 50,60 100,65 150,42 200,50 250,30 300,35"
              />
            </svg>
          </div>

          <p className="mt-3 text-sm text-muted">
            Courbe exemple pour le moment. On la branchera sur l’historique réel
            des parties ensuite.
          </p>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-black/25 p-4 text-center">
      <p className="text-3xl font-black text-accent">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}