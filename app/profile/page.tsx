/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean | null;
};

type DeckRow = {
  id: string;
  wins: number | null;
  losses: number | null;
  price: number | string | null;
};

type CollectionRow = {
  quantity: number | null;
  price: number | string | null;
  image: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [collectionCards, setCollectionCards] = useState<CollectionRow[]>([]);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          router.replace("/login?redirect=/account");
          return;
        }

        const fallbackUsername = slugify(
          user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split("@")[0] || user.id.slice(0, 8),
        );
        const fallbackDisplayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "ManaForger";

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url,is_public")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError) throw profileError;

        let nextProfile = profileData;

        if (!nextProfile) {
          const { data: insertedProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              username: fallbackUsername || user.id.slice(0, 8),
              display_name: fallbackDisplayName,
              avatar_url: null,
              is_public: true,
            })
            .select("id,username,display_name,avatar_url,is_public")
            .single<Profile>();

          if (insertError) throw insertError;
          nextProfile = insertedProfile;
        }

        const [{ data: cardRows }, { data: deckRows }] = await Promise.all([
          supabase
            .from("collection_cards")
            .select("quantity,price,image")
            .eq("user_id", user.id)
            .limit(10000)
            .returns<CollectionRow[]>(),
          supabase
            .from("decks")
            .select("id,wins,losses,price")
            .eq("user_id", user.id)
            .returns<DeckRow[]>(),
        ]);

        if (!cancelled) {
          setUserId(user.id);
          setEmail(user.email || "");
          setProfile(nextProfile);
          setDisplayName(nextProfile?.display_name || fallbackDisplayName);
          setUsername(nextProfile?.username || fallbackUsername || user.id.slice(0, 8));
          setAvatarUrl(nextProfile?.avatar_url || "");
          setIsPublic(Boolean(nextProfile?.is_public ?? true));
          setCollectionCards(cardRows || []);
          setDecks(deckRows || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger le profil.");
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const stats = useMemo(() => {
    const totalCards = collectionCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
    const totalValue = collectionCards.reduce((sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0), 0);
    const cardsWithoutImage = collectionCards.filter((card) => !card.image).length;
    const wins = decks.reduce((sum, deck) => sum + Number(deck.wins || 0), 0);
    const losses = decks.reduce((sum, deck) => sum + Number(deck.losses || 0), 0);
    const games = wins + losses;
    const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;

    return {
      totalCards,
      uniqueCards: collectionCards.length,
      totalValue: Math.round(totalValue * 100) / 100,
      cardsWithoutImage,
      totalDecks: decks.length,
      games,
      wins,
      losses,
      winrate,
    };
  }, [collectionCards, decks]);

  async function saveProfile() {
    if (!userId) return;

    const cleanDisplayName = displayName.trim() || "ManaForger";
    const cleanUsername = slugify(username || cleanDisplayName);

    if (!cleanUsername) {
      setError("Choisis un pseudo public valide.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setStatus("");

      const { data, error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          display_name: cleanDisplayName,
          username: cleanUsername,
          avatar_url: avatarUrl.trim() || null,
          is_public: isPublic,
        })
        .select("id,username,display_name,avatar_url,is_public")
        .single<Profile>();

      if (updateError) throw updateError;

      setProfile(data);
      setUsername(data.username || cleanUsername);
      setDisplayName(data.display_name || cleanDisplayName);
      setAvatarUrl(data.avatar_url || "");
      setIsPublic(Boolean(data.is_public));
      setStatus("Profil sauvegardé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder le profil.");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const initial = (displayName || username || email || "?").charAt(0).toUpperCase();
  const publicUrl = profile?.username ? `/u/${profile.username}` : "";

  if (!hasLoaded) {
    return (
      <main className="page">
        <section className="container-app pb-28">
          <p className="text-muted">Chargement du profil...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container-app pb-28">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-2xl font-black">
            ←
          </Link>
          <button
            onClick={() => void signOut()}
            disabled={isSigningOut}
            className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-200 disabled:opacity-50"
          >
            {isSigningOut ? "Déconnexion..." : "Déconnexion"}
          </button>
        </header>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.035] shadow-2xl">
          <div className="relative min-h-[190px] p-5">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#f59e0b]/30 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
            </div>

            <div className="relative flex items-start gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName || username} className="h-24 w-24 rounded-[2rem] object-cover ring-2 ring-white/10" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#f59e0b] text-4xl font-black text-black shadow-2xl">
                  {initial}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f59e0b]">Profil ManaForge</p>
                <h1 className="mt-2 truncate text-4xl font-black leading-tight">{displayName || "ManaForger"}</h1>
                <p className="mt-1 truncate text-sm font-bold text-white/55">@{username || "pseudo"} · {email}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${isPublic ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/55"}`}>
                    {isPublic ? "🌍 Profil public" : "🔒 Profil privé"}
                  </span>
                  {publicUrl && (
                    <Link href={publicUrl} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">
                      Voir public
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {(status || error) && (
          <div className="mt-4">
            {status && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{status}</p>}
            {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
          </div>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <ProfileStat label="Collection" value={stats.totalCards} helper={`${stats.uniqueCards} uniques`} />
          <ProfileStat label="Valeur" value={formatCurrency(stats.totalValue)} helper="collection" />
          <ProfileStat label="Decks" value={stats.totalDecks} helper={`${stats.games} parties`} />
          <ProfileStat label="Winrate" value={`${stats.winrate}%`} helper={`${stats.wins}V / ${stats.losses}D`} />
        </section>

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Informations publiques</h2>
              <p className="mt-1 text-sm font-bold text-white/45">Ces infos servent à ta page communauté.</p>
            </div>
            <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-black text-[#f59e0b]">Éditable</span>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Nom affiché</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="input-premium" placeholder="Ex : Greg" />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Pseudo public</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="input-premium" placeholder="ex : greg" />
              <span className="text-xs font-bold text-white/35">URL : /u/{slugify(username || displayName || "pseudo")}</span>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Avatar URL</span>
              <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="input-premium" placeholder="https://..." />
            </label>

            <button
              type="button"
              onClick={() => setIsPublic((current) => !current)}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-left"
            >
              <div>
                <p className="font-black">Profil visible dans la communauté</p>
                <p className="mt-1 text-sm font-bold text-white/45">Active si tu veux partager ta collection et tes decks publics.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isPublic ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/45"}`}>
                {isPublic ? "ON" : "OFF"}
              </span>
            </button>

            <button onClick={() => void saveProfile()} disabled={isSaving} className="rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black shadow-xl shadow-orange-500/10 disabled:opacity-50">
              {isSaving ? "Sauvegarde..." : "Sauvegarder le profil"}
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-xl font-black">Santé du compte</h2>
          <div className="mt-4 grid gap-3">
            <HealthRow label="Images manquantes" value={stats.cardsWithoutImage} helper="À réparer depuis la page Collection" bad={stats.cardsWithoutImage > 0} />
            <HealthRow label="Profil public" value={isPublic ? "Actif" : "Inactif"} helper="Visible dans Communauté" bad={!isPublic} />
            <HealthRow label="Decks enregistrés" value={stats.totalDecks} helper="Synchronisés avec Supabase" bad={false} />
          </div>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function ProfileStat({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <p className="truncate text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white/35">{helper}</p>
    </div>
  );
}

function HealthRow({ label, value, helper, bad }: { label: string; value: number | string; helper: string; bad: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/25 p-4">
      <div>
        <p className="font-black">{label}</p>
        <p className="mt-1 text-xs font-bold text-white/40">{helper}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${bad ? "bg-orange-400/15 text-orange-300" : "bg-emerald-400/15 text-emerald-300"}`}>
        {value}
      </span>
    </div>
  );
}
