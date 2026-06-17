"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  display_name: string | null;
  is_public: boolean | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cardsCount, setCardsCount] = useState(0);
  const [foldersCount, setFoldersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      setEmail(userData.user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, display_name, is_public")
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

      setProfile(profileData);
      setFoldersCount(folderCount || 0);
      setCardsCount(cardCount || 0);
      setIsLoading(false);
    }

    void loadAccount();
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl pb-28">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black">←</Link>
          <h1 className="text-lg font-black">Mon compte</h1>
          <button onClick={signOut} className="rounded-full bg-red-500/15 px-4 py-2 text-sm font-black text-red-200">Déconnexion</button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-white/60">Chargement...</p>
        ) : (
          <>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.055] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f59e0b] text-2xl font-black text-black">
                  {(profile?.display_name || email || "M").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-black">{profile?.display_name || "Utilisateur ManaForge"}</p>
                  <p className="truncate text-sm font-bold text-white/55">{email}</p>
                  <p className="mt-1 text-xs font-black text-emerald-300">Profil {profile?.is_public ? "public" : "privé"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center">
                <p className="text-2xl font-black text-[#f59e0b]">{foldersCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/50">Dossiers cloud</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center">
                <p className="text-2xl font-black text-[#f59e0b]">{cardsCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/50">Cartes cloud</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm font-bold leading-relaxed text-orange-100">
              Auth OK. Prochaine étape : brancher la page Collection sur Supabase, puis migrer tes données localStorage vers ton compte.
            </div>
          </>
        )}
      </section>
    </main>
  );
}
