"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean | null;
  collection_public: boolean | null;
  decks_public: boolean | null;
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

export default function AccountPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [isPublic, setIsPublic] = useState(true);
  const [collectionPublic, setCollectionPublic] = useState(true);
  const [decksPublic, setDecksPublic] = useState(true);

  const [cardsCount, setCardsCount] = useState(0);
  const [foldersCount, setFoldersCount] = useState(0);
  const [decksCount, setDecksCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      setUserId(userData.user.id);
      setEmail(userData.user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "username, display_name, bio, avatar_url, is_public, collection_public, decks_public"
        )
        .eq("id", userData.user.id)
        .single();

      const { count: folderCount } = await supabase
        .from("folders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id);

      const { count: cardCount } = await supabase
        .from("collection_cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id);

      const { count: deckCount } = await supabase
        .from("decks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id);

      const { count: listingCount } = await supabase
        .from("trade_listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id)
        .eq("status", "available");

      const nextProfile: Profile = {
        username: profileData?.username || null,
        display_name: profileData?.display_name || null,
        bio: profileData?.bio || null,
        avatar_url: profileData?.avatar_url || null,
        is_public: profileData?.is_public ?? true,
        collection_public: profileData?.collection_public ?? true,
        decks_public: profileData?.decks_public ?? true,
      };

      setProfile(nextProfile);
      setDisplayName(nextProfile.display_name || "");
      setUsername(nextProfile.username || "");
      setBio(nextProfile.bio || "");
      setAvatarUrl(nextProfile.avatar_url || "");
      setIsPublic(Boolean(nextProfile.is_public));
      setCollectionPublic(Boolean(nextProfile.collection_public));
      setDecksPublic(Boolean(nextProfile.decks_public));

      setFoldersCount(folderCount || 0);
      setCardsCount(cardCount || 0);
      setDecksCount(deckCount || 0);
      setTradeCount(listingCount || 0);
      setIsLoading(false);
    }

    void loadAccount();
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    const supabase = createClient();
    const cleanUsername = slugify(username || displayName || email.split("@")[0]);

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      username: cleanUsername,
      display_name: displayName || cleanUsername,
      bio,
      avatar_url: avatarUrl,
      is_public: isPublic,
      collection_public: collectionPublic,
      decks_public: decksPublic,
    });

    setIsSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setProfile({
      username: cleanUsername,
      display_name: displayName || cleanUsername,
      bio,
      avatar_url: avatarUrl,
      is_public: isPublic,
      collection_public: collectionPublic,
      decks_public: decksPublic,
    });

    setUsername(cleanUsername);
    setMessage("Profil sauvegardé.");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const initial = (profile?.display_name || email || "M")
    .slice(0, 1)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl pb-28">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black"
          >
            ←
          </Link>

          <h1 className="text-lg font-black">Mon compte</h1>

          <button
            onClick={signOut}
            className="rounded-full bg-red-500/15 px-4 py-2 text-sm font-black text-red-200"
          >
            Déconnexion
          </button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-white/60">Chargement...</p>
        ) : (
          <>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.055] p-6">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f59e0b] text-2xl font-black text-black">
                    {initial}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-2xl font-black">
                    {profile?.display_name || "Utilisateur ManaForge"}
                  </p>
                  <p className="truncate text-sm font-bold text-white/55">
                    @{profile?.username || "pseudo"}
                  </p>
                  <p className="mt-1 text-xs font-black text-emerald-300">
                    Profil {profile?.is_public ? "public" : "privé"}
                  </p>
                </div>
              </div>

              {profile?.username && (
                <Link
                  href={`/u/${profile.username}`}
                  className="mt-5 block rounded-xl bg-[#f59e0b] px-4 py-3 text-center font-black text-black"
                >
                  Voir mon profil public
                </Link>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Dossiers cloud" value={foldersCount} />
              <Stat label="Cartes cloud" value={cardsCount} />
              <Stat label="Decks cloud" value={decksCount} />
              <Stat label="Cartes en trade" value={tradeCount} />
            </div>

            <form
              onSubmit={saveProfile}
              className="mt-5 rounded-3xl border border-white/10 bg-white/[0.055] p-5"
            >
              <h2 className="text-xl font-black">Profil social</h2>
              <p className="mt-1 text-sm font-bold text-white/50">
                Ces infos seront visibles si ton profil est public.
              </p>

              <div className="mt-5 grid gap-3">
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nom affiché"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
                />

                <input
                  value={username}
                  onChange={(event) => setUsername(slugify(event.target.value))}
                  placeholder="pseudo-public"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
                />

                <input
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="URL image de profil"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
                />

                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Petite bio : decks préférés, style de jeu, cartes recherchées..."
                  rows={4}
                  className="resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none"
                />
              </div>

              <div className="mt-5 grid gap-3">
                <Toggle
                  label="Profil visible dans la communauté"
                  checked={isPublic}
                  onChange={setIsPublic}
                />
                <Toggle
                  label="Collection visible"
                  checked={collectionPublic}
                  onChange={setCollectionPublic}
                />
                <Toggle
                  label="Decks visibles"
                  checked={decksPublic}
                  onChange={setDecksPublic}
                />
              </div>

              {error && (
                <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-200">
                  {error}
                </p>
              )}

              {message && (
                <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">
                  {message}
                </p>
              )}

              <button
                disabled={isSaving}
                className="mt-5 w-full rounded-xl bg-[#f59e0b] py-3 font-black text-black disabled:opacity-50"
              >
                {isSaving ? "Sauvegarde..." : "Sauvegarder mon profil"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center">
      <p className="text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/50">
        {label}
      </p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-left"
    >
      <span className="text-sm font-bold text-white/80">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          checked ? "bg-emerald-400 text-black" : "bg-white/10 text-white/60"
        }`}
      >
        {checked ? "Oui" : "Non"}
      </span>
    </button>
  );
}