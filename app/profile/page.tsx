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
  const [isResyncing, setIsResyncing] = useState(false);

  async function loadAccount() {
    try {
      setError("");
      setStatus("");

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace("/login?redirect=/account");
        return;
      }

      const fallbackUsername = slugify(
        user.user_metadata?.username ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          user.id.slice(0, 8),
      );

      const fallbackDisplayName =
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "ManaForger";

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
          .range(0, 9999)
          .returns<CollectionRow[]>(),

        supabase
          .from("decks")
          .select("id,wins,losses,price")
          .eq("user_id", user.id)
          .returns<DeckRow[]>(),
      ]);

      setUserId(user.id);
      setEmail(user.email || "");
      setProfile(nextProfile);
      setDisplayName(nextProfile?.display_name || fallbackDisplayName);
      setUsername(nextProfile?.username || fallbackUsername || user.id.slice(0, 8));
      setAvatarUrl(nextProfile?.avatar_url || "");
      setIsPublic(Boolean(nextProfile?.is_public ?? true));
      setCollectionCards(cardRows || []);
      setDecks(deckRows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le profil.");
    } finally {
      setHasLoaded(true);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  const stats = useMemo(() => {
    const totalCards = collectionCards.reduce(
      (sum, card) => sum + Number(card.quantity || 1),
      0,
    );

    const totalValue = collectionCards.reduce(
      (sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0),
      0,
    );

    const cardsWithoutImage = collectionCards.filter((card) => !card.image).length;

    const wins = decks.reduce((sum, deck) => sum + Number(deck.wins || 0), 0);
    const losses = decks.reduce((sum, deck) => sum + Number(deck.losses || 0), 0);
    const games = wins + losses;
    const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;

    const deckValue = decks.reduce(
      (sum, deck) => sum + Number(deck.price || 0),
      0,
    );

    return {
      totalCards,
      uniqueCards: collectionCards.length,
      totalValue: Math.round(totalValue * 100) / 100,
      cardsWithoutImage,
      totalDecks: decks.length,
      deckValue: Math.round(deckValue * 100) / 100,
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

  async function forceResync() {
    try {
      setIsResyncing(true);
      setError("");
      setStatus("");

      localStorage.removeItem("manaforge-collection");
      localStorage.removeItem("manaforge-folders");
      localStorage.removeItem("manaforge-folder-colors");
      localStorage.removeItem("manaforge-decks");
      localStorage.removeItem("manaforge-profile");

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }

      await loadAccount();

      setStatus("Données resynchronisées avec Supabase.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de resynchroniser.");
    } finally {
      setIsResyncing(false);
    }
  }

  async function resetLocalAndReload() {
    localStorage.clear();

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    window.location.reload();
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
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-2xl font-black"
          >
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

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-2xl">
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || username || "Profil"}
                className="h-24 w-24 rounded-[2rem] object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#f59e0b] text-5xl font-black text-black shadow-2xl">
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">
                ManaForge Account
              </p>
              <h1 className="mt-2 truncate text-4xl font-black">
                {displayName || "ManaForger"}
              </h1>
              <p className="mt-1 truncate text-sm font-bold text-white/50">
                @{username || "profil"} · {email}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <ProfileStat label="Cartes" value={stats.totalCards} helper={`${stats.uniqueCards} uniques`} />
            <ProfileStat label="Collection" value={formatCurrency(stats.totalValue)} helper="valeur totale" />
            <ProfileStat label="Decks" value={stats.totalDecks} helper={formatCurrency(stats.deckValue)} />
            <ProfileStat label="Winrate" value={`${stats.winrate}%`} helper={`${stats.games} parties`} />
          </div>
        </section>

        {(status || error) && (
          <div className="mt-5 space-y-3">
            {status && (
              <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">
                {status}
              </p>
            )}
            {error && (
              <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                {error}
              </p>
            )}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                Identité
              </p>
              <h2 className="mt-1 text-2xl font-black">Profil joueur</h2>
            </div>

            {publicUrl && (
              <Link
                href={publicUrl}
                className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/70"
              >
                Voir public
              </Link>
            )}
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/45">
                Nom affiché
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="input-premium"
                placeholder="Ex : Greg"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/45">
                Pseudo public
              </span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input-premium"
                placeholder="ex : greg"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/45">
                URL avatar
              </span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                className="input-premium"
                placeholder="https://..."
              />
            </label>

            <button
              type="button"
              onClick={() => setIsPublic((current) => !current)}
              className={`rounded-2xl border px-4 py-4 text-left font-black ${
                isPublic
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-black/25 text-white/70"
              }`}
            >
              {isPublic ? "🌍 Profil public activé" : "🔒 Profil privé"}
              <span className="mt-1 block text-sm font-bold text-white/45">
                {isPublic
                  ? "Ton profil peut apparaître dans la communauté."
                  : "Ton profil ne sera pas visible publiquement."}
              </span>
            </button>

            <button
              onClick={() => void saveProfile()}
              disabled={isSaving}
              className="rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black disabled:opacity-50"
            >
              {isSaving ? "Sauvegarde..." : "Sauvegarder le profil"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
            Maintenance
          </p>
          <h2 className="mt-1 text-2xl font-black">Synchronisation</h2>
          <p className="mt-2 text-sm font-bold text-white/45">
            À utiliser si l’app affiche d’anciennes données après une mise à jour ou une installation PWA.
          </p>

          <div className="mt-5 grid gap-3">
            <button
              onClick={() => void forceResync()}
              disabled={isResyncing}
              className="rounded-2xl border border-white/10 bg-white/[0.075] px-4 py-4 text-left font-black text-white disabled:opacity-50"
            >
              🔄 {isResyncing ? "Resynchronisation..." : "Forcer la resynchronisation"}
              <span className="mt-1 block text-sm font-bold text-white/45">
                Recharge les données depuis Supabase et ignore l’ancien localStorage.
              </span>
            </button>

            <button
              onClick={() => void resetLocalAndReload()}
              className="rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-4 text-left font-black text-orange-200"
            >
              🧹 Nettoyer le cache local
              <span className="mt-1 block text-sm font-bold text-white/45">
                Supprime localStorage + cache PWA puis recharge l’app.
              </span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <ProfileStat label="Images manquantes" value={stats.cardsWithoutImage} />
            <ProfileStat label="Parties" value={stats.games} helper={`${stats.wins}V / ${stats.losses}D`} />
          </div>
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function ProfileStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <p className="truncate text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/45">
        {label}
      </p>
      {helper && <p className="mt-1 truncate text-sm font-bold text-white/40">{helper}</p>}
    </div>
  );
}