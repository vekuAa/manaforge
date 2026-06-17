import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  is_public: boolean | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes.");
  return createClient(url, key);
}

export default async function CommunityPage() {
  const supabase = getSupabase();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,username,display_name,is_public")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Profile[]>();

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl pb-24">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black">←</Link>
        <h1 className="mt-8 text-4xl font-black">Communauté</h1>
        <p className="mt-2 font-bold text-white/55">Retrouve les profils publics de tes potes.</p>

        <div className="mt-6 grid gap-3">
          {(profiles || []).map((profile) => (
            <Link key={profile.id} href={`/u/${profile.username}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.08]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f59e0b] font-black text-black">
                {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-black">{profile.display_name || profile.username}</p>
                <p className="text-sm font-bold text-white/45">@{profile.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
