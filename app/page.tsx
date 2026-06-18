/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ProfileButton from "@/components/ProfileButton";
import { createClient } from "@/lib/supabase/client";

type DeckCard = {
  name: string;
  quantity: number;
  price?: number;
  typeLine?: string;
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

type CollectionCard = {
  id: string;
  name: string;
  image: string | null;
  set_name: string | null;
  set_code: string | null;
  collector_number: string | null;
  quantity: number | null;
  price: number | string | null;
  foil: boolean | null;
  language: string | null;
  created_at?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getWinrate(wins: number, losses: number) {
  const games = wins + losses;
  return games > 0 ? Math.round((wins / games) * 100) : 0;
}

function getDeckRoleCounts(decklist?: DeckCard[]) {
  const cards = decklist || [];
  const lands = cards.reduce((sum, card) => {
    const type = (card.typeLine || "").toLowerCase();
    const name = card.name.toLowerCase();
    const isLand = type.includes("land") || ["plains", "island", "swamp", "mountain", "forest"].includes(name);
    return isLand ? sum + Number(card.quantity || 1) : sum;
  }, 0);

  const total = cards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  return { total, lands };
}

export default function HomePage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [collectionCards, setCollectionCards] = useState<CollectionCard[]>([]);
  const [folderCount, setFolderCount] = useState(0);
  const [displayName, setDisplayName] = useState("Planeswalker");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          router.replace("/login");
          return;
        }

        const user = authData.user;
        const fallbackName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Planeswalker";

        const [decksResult, cardsResult, foldersResult] = await Promise.all([
          supabase
            .from("decks")
            .select("id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("collection_cards")
            .select("id,name,image,set_name,set_code,collector_number,quantity,price,foil,language,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(250),
          supabase
            .from("folders")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (cancelled) return;

        if (decksResult.error) throw decksResult.error;
        if (cardsResult.error) throw cardsResult.error;

        setDisplayName(fallbackName);
        setDecks(
          (decksResult.data || []).map((deck) => ({
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
          })),
        );
        setCollectionCards((cardsResult.data || []) as CollectionCard[]);
        setFolderCount(foldersResult.count || 0);
      } catch (error) {
        if (!cancelled) {
          setSyncError(error instanceof Error ? error.message : "Chargement impossible.");
          setDecks([]);
          setCollectionCards([]);
        }
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    }

    void loadHome();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const stats = useMemo(() => {
    const wins = decks.reduce((total, deck) => total + Number(deck.wins || 0), 0);
    const losses = decks.reduce((total, deck) => total + Number(deck.losses || 0), 0);
    const games = wins + losses;
    const winrate = getWinrate(wins, losses);

    const collectionQuantity = collectionCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
    const collectionValue = collectionCards.reduce(
      (sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0),
      0,
    );
    const missingImages = collectionCards.filter((card) => !card.image).length;
    const foilCards = collectionCards.reduce((sum, card) => sum + (card.foil ? Number(card.quantity || 1) : 0), 0);

    const bestDeck = [...decks]
      .filter((deck) => deck.wins + deck.losses > 0)
      .sort((a, b) => getWinrate(b.wins, b.losses) - getWinrate(a.wins, a.losses))[0];

    const recentDecks = decks.slice(0, 3);
    const recentCards = collectionCards.slice(0, 6);

    return {
      wins,
      losses,
      games,
      winrate,
      collectionQuantity,
      collectionValue: Math.round(collectionValue * 100) / 100,
      missingImages,
      foilCards,
      bestDeck,
      recentDecks,
      recentCards,
    };
  }, [decks, collectionCards]);

  const suggestedActions = useMemo(() => {
    const actions: { title: string; text: string; href: string; icon: string; cta: string }[] = [];

    if (collectionCards.length === 0) {
      actions.push({
        title: "Construis ta collection",
        text: "Ajoute tes premières cartes, crée tes dossiers et commence ton suivi de valeur.",
        href: "/collection",
        icon: "📦",
        cta: "Ajouter des cartes",
      });
    }

    if (decks.length === 0) {
      actions.push({
        title: "Ajoute ton premier deck",
        text: "Crée un deck Commander ou importe une liste Archidekt.",
        href: "/deck",
        icon: "📚",
        cta: "Créer un deck",
      });
    }

    if (stats.missingImages > 0) {
      actions.push({
        title: "Réparer les visuels",
        text: `${stats.missingImages} carte${stats.missingImages > 1 ? "s" : ""} sans image dans ta collection.`,
        href: "/collection",
        icon: "🖼️",
        cta: "Mettre à jour",
      });
    }

    if (stats.games === 0 && decks.length > 0) {
      actions.push({
        title: "Suis tes parties",
        text: "Ajoute tes victoires et défaites pour voir tes decks les plus efficaces.",
        href: "/deck",
        icon: "🏆",
        cta: "Voir mes decks",
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: "Optimise tes decks",
        text: "Analyse tes terrains, ta curve et les cartes clés de tes listes Commander.",
        href: "/deck",
        icon: "⚙️",
        cta: "Analyser",
      });
    }

    return actions.slice(0, 2);
  }, [collectionCards.length, decks.length, stats.games, stats.missingImages]);

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

      <section className="container-app pb-32 pt-2">
        <header className="pr-14">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-muted">ManaForge cockpit</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-accent">Salut, {displayName}</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            Vue rapide de ta collection, tes decks et tes prochaines actions Commander.
          </p>
        </header>

        {syncError && <p className="mt-5 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{syncError}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/collection" className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] p-5 shadow-xl transition active:scale-[0.98]">
            <p className="text-3xl">📦</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/40">Collection</p>
            <p className="mt-1 text-3xl font-black text-accent">{stats.collectionQuantity}</p>
            <p className="mt-1 text-sm font-bold text-white/50">cartes · {formatCurrency(stats.collectionValue)}</p>
          </Link>

          <Link href="/deck" className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] p-5 shadow-xl transition active:scale-[0.98]">
            <p className="text-3xl">📚</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/40">Decks</p>
            <p className="mt-1 text-3xl font-black text-accent">{decks.length}</p>
            <p className="mt-1 text-sm font-bold text-white/50">{stats.games} parties · {stats.winrate}% WR</p>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <MiniStat label="Dossiers" value={folderCount} />
          <MiniStat label="Uniques" value={collectionCards.length} />
          <MiniStat label="Foil" value={stats.foilCards} />
          <MiniStat label="Images KO" value={stats.missingImages} danger={stats.missingImages > 0} />
        </div>

        <section className="mt-6 rounded-[2rem] border border-accent/20 bg-accent/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">À faire maintenant</p>
              <h2 className="mt-2 text-2xl font-black">Actions utiles</h2>
            </div>
            <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black text-accent">Priorité</span>
          </div>

          <div className="mt-4 grid gap-3">
            {suggestedActions.map((action) => (
              <Link key={action.title} href={action.href} className="flex items-center gap-3 rounded-2xl bg-black/25 p-4 transition hover:bg-black/35">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">{action.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-black">{action.title}</p>
                  <p className="mt-1 text-sm font-bold text-white/50">{action.text}</p>
                </div>
                <span className="hidden rounded-xl bg-accent px-3 py-2 text-xs font-black text-black sm:block">{action.cta}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Decks récents</h2>
            <Link href="/deck" className="text-sm font-black text-accent">Tout voir</Link>
          </div>

          <div className="grid gap-3">
            {stats.recentDecks.length > 0 ? (
              stats.recentDecks.map((deck) => {
                const deckGames = deck.wins + deck.losses;
                const deckWinrate = getWinrate(deck.wins, deck.losses);
                const roleCounts = getDeckRoleCounts(deck.decklist);
                return (
                  <Link key={deck.id} href="/deck" className="flex gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.08]">
                    {deck.commanderImage ? (
                      <img src={deck.commanderImage} alt={deck.commander} className="h-28 w-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-28 w-20 items-center justify-center rounded-2xl bg-black/30 text-3xl">🎴</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black">{deck.name}</p>
                      <p className="truncate text-sm font-bold text-accent">{deck.commander}</p>
                      <p className="mt-2 text-sm font-bold text-white/45">{roleCounts.total || deck.cards} cartes · {roleCounts.lands} terrains</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full bg-black/25 px-3 py-1 text-white/60">{deckGames} parties</span>
                        <span className="rounded-full bg-black/25 px-3 py-1 text-white/60">{deckWinrate}% WR</span>
                        <span className="rounded-full bg-black/25 px-3 py-1 text-white/60">{formatCurrency(deck.price)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyCard title="Aucun deck" text="Importe une liste Archidekt ou crée ton premier deck Commander." href="/deck" cta="Créer un deck" />
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Dernières cartes ajoutées</h2>
            <Link href="/collection" className="text-sm font-black text-accent">Collection</Link>
          </div>

          {stats.recentCards.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {stats.recentCards.map((card) => (
                <Link key={card.id} href="/collection" className="rounded-2xl border border-white/10 bg-white/[0.055] p-1.5 transition active:scale-[0.98]">
                  {card.image ? (
                    <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex aspect-[63/88] items-center justify-center rounded-xl bg-black/30 text-3xl">🎴</div>
                  )}
                  <p className="mt-1 truncate text-xs font-black">{card.name}</p>
                  <p className="text-[10px] font-bold text-white/45">x{card.quantity || 1}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyCard title="Collection vide" text="Ajoute tes cartes, tes foils, tes extensions et tes dossiers." href="/collection" cta="Ouvrir la collection" />
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Veille Commander</p>
              <h2 className="mt-2 text-xl font-black">Inspiration deckbuilding</h2>
              <p className="mt-2 text-sm font-bold text-white/50">
                Plutôt qu’un faux “commandant du jour”, mieux vaut mettre des accès rapides vers des ressources utiles.
              </p>
            </div>
            <p className="text-3xl">🧠</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <ExternalResource href="https://edhrec.com/commanders" title="Top commandants" text="Tendances EDHREC" />
            <ExternalResource href="https://edhrec.com/themes" title="Thèmes EDH" text="Aristocrats, Lifegain..." />
            <ExternalResource href="https://edhrec.com/top" title="Cartes jouées" text="Staples Commander" />
          </div>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${danger ? "border-red-400/20 bg-red-500/10" : "border-white/10 bg-white/[0.045]"}`}>
      <p className={`text-xl font-black ${danger ? "text-red-200" : "text-accent"}`}>{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function EmptyCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
      <p className="text-xl font-black">{title}</p>
      <p className="mt-2 text-sm font-bold text-white/50">{text}</p>
      <Link href={href} className="mt-4 inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-black text-black">
        {cta}
      </Link>
    </div>
  );
}

function ExternalResource({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="rounded-2xl bg-black/25 p-4 transition hover:bg-black/35">
      <p className="font-black text-accent">{title}</p>
      <p className="mt-1 text-xs font-bold text-white/45">{text}</p>
    </a>
  );
}
