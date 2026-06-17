import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean | null;
};

type PublicCard = {
  id: string;
  name: string;
  image: string | null;
  set_name: string | null;
  set_code: string | null;
  collector_number: string | null;
  language: string | null;
  foil: boolean | null;
  quantity: number | null;
  price: number | string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes.");
  return createClient(url, key);
}

export default async function PublicUserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = getSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,is_public")
    .eq("username", username)
    .eq("is_public", true)
    .single<Profile>();

  if (profileError || !profile) notFound();

  const { data: cards } = await supabase
    .from("collection_cards")
    .select("id,name,image,set_name,set_code,collector_number,language,foil,quantity,price")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(80)
    .returns<PublicCard[]>();

  const safeCards = cards || [];
  const totalQuantity = safeCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  const totalValue = safeCards.reduce((sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0), 0);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl pb-24">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black">←</Link>

        <header className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#f59e0b] text-3xl font-black text-black">
              {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f59e0b]">Profil public</p>
              <h1 className="mt-1 text-3xl font-black">{profile.display_name || profile.username}</h1>
              <p className="text-sm font-bold text-white/50">@{profile.username}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-black/25 p-4 text-center">
              <p className="text-2xl font-black text-[#f59e0b]">{totalQuantity}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">Cartes</p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4 text-center">
              <p className="text-2xl font-black text-[#f59e0b]">{safeCards.length}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">Uniques</p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4 text-center">
              <p className="text-2xl font-black text-[#f59e0b]">{formatCurrency(totalValue)}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">Valeur</p>
            </div>
          </div>
        </header>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-black">Collection visible</h2>
          <p className="text-sm font-bold text-white/45">80 dernières cartes</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {safeCards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.055] p-1.5">
              {card.image ? (
                <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-xl object-cover" />
              ) : (
                <div className="flex aspect-[63/88] items-center justify-center rounded-xl bg-black/30 text-2xl">🎴</div>
              )}
              <p className="mt-1 truncate text-xs font-black">{card.name}</p>
              <p className="text-[10px] font-bold text-white/45">x{card.quantity || 1} · {card.language?.toUpperCase() || "FR"}{card.foil ? " · FOIL" : ""}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
