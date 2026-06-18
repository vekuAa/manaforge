/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
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
};

type Profile = {
  username: string | null;
  display_name: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function HomePage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [collectionCards, setCollectionCards] = useState<CollectionCard[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [homeError, setHomeError] = useState("");

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

        const [decksResponse, collectionResponse, profileResponse] = await Promise.all([
          supabase
            .from("decks")
            .select("id,name,commander,commander_image,colors,cards,price,wins,losses,decklist,created_at")
            .eq("user_id", authData.user.id)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("collection_cards")
            .select("id,name,image,set_name,set_code,collector_number,quantity,price,foil,language,created_at")
            .eq("user_id", authData.user.id)
            .order("created_at", { ascending: false })
            .range(0, 9999),
          supabase
            .from("profiles")
            .select("username,display_name")
            .eq("id", authData.user.id)
            .single(),
        ]);

        if (decksResponse.error) throw decksResponse.error;
        if (collectionResponse.error) throw collectionResponse.error;

        if (!cancelled) {
          setDecks(
            (decksResponse.data || []).map((deck) => ({
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

          setCollectionCards((collectionResponse.data || []) as CollectionCard[]);
          setProfile((profileResponse.data as Profile) || null);
        }
      } catch (error) {
        if (!cancelled) {
          setHomeError(error instanceof Error ? error.message : "Impossible de charger l’accueil.");
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
    const totalDecks = decks.length;
    const wins = decks.reduce((total, deck) => total + (deck.wins || 0), 0);
    const losses = decks.reduce((total, deck) => total + (deck.losses || 0), 0);
    const games = wins + losses;
    const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;

    const collectionTotalCards = collectionCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
    const collectionValue = collectionCards.reduce((sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0), 0);
    const missingImages = collectionCards.filter((card) => !card.image).length;

    const bestDeck = [...decks].sort((a, b) => {
      const aGames = (a.wins || 0) + (a.losses || 0);
      const bGames = (b.wins || 0) + (b.losses || 0);
      const aWr = aGames > 0 ? a.wins / aGames : 0;
      const bWr = bGames > 0 ? b.wins / bGames : 0;
      return bWr - aWr;
    })[0];

    const deckValue = decks.reduce((sum, deck) => sum + Number(deck.price || 0), 0);

    return {
      totalDecks,
      wins,
      losses,
      games,
      winrate,
      collectionTotalCards,
      collectionUniqueCards: collectionCards.length,
      collectionValue: Math.round(collectionValue * 100) / 100,
      deckValue: Math.round(deckValue * 100) / 100,
      missingImages,
      bestDeck,
    };
  }, [decks, collectionCards]);

  const firstName = profile?.display_name || profile?.username || "ManaForger";
  const recentCards = collectionCards.slice(0, 8);
  const recentDecks = decks.slice(0, 4);

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
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f59e0b]">ManaForge cockpit</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
            Bonjour, {firstName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-white/55">
            Vue rapide de ta collection, tes decks Commander et les actions utiles pour garder ManaForge propre.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <HeroStat label="Cartes" value={stats.collectionTotalCards} helper={`${stats.collectionUniqueCards} uniques`} />
            <HeroStat label="Collection" value={formatCurrency(stats.collectionValue)} helper="valeur totale" />
            <HeroStat label="Decks" value={stats.totalDecks} helper={formatCurrency(stats.deckValue)} />
            <HeroStat label="Winrate" value={`${stats.winrate}%`} helper={`${stats.games} parties`} />
          </div>
        </header>

        {homeError && (
          <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">
            {homeError}
          </p>
        )}

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Deck principal</p>
                <h2 className="mt-1 text-2xl font-black">Ton meilleur deck</h2>
              </div>
              <Link href="/deck" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/70">
                Voir decks
              </Link>
            </div>

            {stats.bestDeck ? (
              <div className="mt-5 grid gap-4 md:grid-cols-[120px_1fr]">
                {stats.bestDeck.commanderImage ? (
                  <img src={stats.bestDeck.commanderImage} alt={stats.bestDeck.commander} className="mx-auto aspect-[63/88] w-full max-w-[120px] rounded-3xl object-cover shadow-2xl" />
                ) : (
                  <div className="mx-auto flex aspect-[63/88] w-full max-w-[120px] items-center justify-center rounded-3xl bg-black/30 text-4xl">🎴</div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-3xl font-black">{stats.bestDeck.name}</h3>
                  <p className="mt-1 truncate font-black text-accent">{stats.bestDeck.commander}</p>
                  <p className="mt-2 text-sm font-bold text-white/50">{stats.bestDeck.colors}</p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniBox label="Cartes" value={stats.bestDeck.cards || stats.bestDeck.decklist?.length || 0} />
                    <MiniBox label="V/D" value={`${stats.bestDeck.wins}/${stats.bestDeck.losses}`} />
                    <MiniBox label="Valeur" value={formatCurrency(stats.bestDeck.price)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-6 text-center">
                <p className="text-4xl">📚</p>
                <p className="mt-3 font-black">Aucun deck importé</p>
                <p className="mt-1 text-sm font-bold text-white/45">Importe un deck Archidekt pour activer l’analyse.</p>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Actions rapides</p>
            <h2 className="mt-1 text-2xl font-black">Que veux-tu faire ?</h2>

            <div className="mt-5 grid gap-3">
              <QuickAction href="/collection" icon="➕" title="Ajouter une carte" text="Recherche, impression, langue, foil." />
              <QuickAction href="/collection" icon="📷" title="Scanner une carte" text="OCR et ajout collection." />
              <QuickAction href="/deck" icon="📚" title="Importer un deck" text="Archidekt ou création manuelle." />
              <QuickAction href="/collection" icon="🎯" title="Suivre un fullset" text="Cartes possédées et manquantes." />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">À corriger</p>
                <h2 className="mt-1 text-2xl font-black">Santé de la base</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${stats.missingImages > 0 ? "bg-orange-400/15 text-orange-300" : "bg-emerald-400/15 text-emerald-300"}`}>
                {stats.missingImages > 0 ? "Action utile" : "OK"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <HealthRow label="Images manquantes" value={stats.missingImages} good={stats.missingImages === 0} />
              <HealthRow label="Decks suivis" value={stats.totalDecks} good={stats.totalDecks > 0} />
              <HealthRow label="Parties enregistrées" value={stats.games} good={stats.games > 0} />
            </div>

            {stats.missingImages > 0 && (
              <p className="mt-4 rounded-2xl bg-orange-400/10 p-3 text-sm font-bold text-orange-200">
                Ouvre la Collection pour lancer la réparation automatique des images.
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Collection</p>
                <h2 className="mt-1 text-2xl font-black">Dernières cartes ajoutées</h2>
              </div>
              <Link href="/collection" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/70">
                Voir collection
              </Link>
            </div>

            {recentCards.length > 0 ? (
              <div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-8">
                {recentCards.map((card) => (
                  <div key={card.id} className="rounded-2xl border border-white/10 bg-black/25 p-1.5">
                    {card.image ? (
                      <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-xl object-cover" />
                    ) : (
                      <div className="flex aspect-[63/88] items-center justify-center rounded-xl bg-white/10 text-2xl">🎴</div>
                    )}
                    <p className="mt-1 truncate text-[10px] font-black">{card.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-6 text-center font-bold text-white/45">
                Aucune carte dans la collection pour le moment.
              </p>
            )}
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Decks</p>
                <h2 className="mt-1 text-2xl font-black">Decks récents</h2>
              </div>
              <Link href="/deck" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/70">
                Gérer
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {recentDecks.length > 0 ? (
                recentDecks.map((deck) => (
                  <Link key={deck.id} href="/deck" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 transition hover:bg-white/[0.08]">
                    {deck.commanderImage ? (
                      <img src={deck.commanderImage} alt={deck.commander} className="h-16 w-11 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-11 items-center justify-center rounded-xl bg-white/10">🎴</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{deck.name}</p>
                      <p className="truncate text-sm font-bold text-[#f59e0b]">{deck.commander}</p>
                    </div>
                    <p className="text-sm font-black text-white/45">{formatCurrency(deck.price)}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-3xl border border-white/10 bg-black/25 p-6 text-center font-bold text-white/45">Aucun deck récent.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_35%),rgba(255,255,255,0.055)] p-4 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Inspiration Commander</p>
            <h2 className="mt-1 text-2xl font-black">Améliorer tes decks</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-white/55">
              Zone d’inspiration : 
            </p>

            <div className="mt-5 grid gap-3">
              <ExternalResource href="https://edhrec.com/" title="EDHREC" text="Idées de cartes populaires par commandant." />
              <ExternalResource href="https://commanderspellbook.com/" title="Commander Spellbook" text="Chercher des combos Commander." />
              <ExternalResource href="https://archidekt.com/" title="Archidekt" text="Comparer et importer des listes." />
            </div>
          </div>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function HeroStat({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <p className="text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white/35">{helper}</p>
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-black/25 p-3 text-center">
      <p className="truncate text-lg font-black text-[#f59e0b]">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 transition hover:bg-white/[0.08]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f59e0b] text-xl text-black">{icon}</span>
      <span className="min-w-0">
        <span className="block font-black">{title}</span>
        <span className="block truncate text-xs font-bold text-white/45">{text}</span>
      </span>
    </Link>
  );
}

function HealthRow({ label, value, good }: { label: string; value: number; good: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-3">
      <span className="font-bold text-white/70">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${good ? "bg-emerald-400/15 text-emerald-300" : "bg-orange-400/15 text-orange-300"}`}>
        {value}
      </span>
    </div>
  );
}

function ExternalResource({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:bg-white/[0.08]">
      <p className="font-black text-white">{title} ↗</p>
      <p className="mt-1 text-sm font-bold text-white/45">{text}</p>
    </a>
  );
}
