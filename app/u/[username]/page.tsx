import Link from "next/link";
import BottomNav from "@/components/BottomNav";
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

type PublicDeck = {
  id: string;
  name: string;
  commander: string | null;
  commander_image: string | null;
  colors: string | null;
  cards: number | null;
  price: number | string | null;
  wins: number | null;
  losses: number | null;
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

  if (!url || !key) {
    throw new Error("Variables Supabase manquantes.");
  }

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

  const [cardsResponse, decksResponse] = await Promise.all([
    supabase
      .from("collection_cards")
      .select("id,name,image,set_name,set_code,collector_number,language,foil,quantity,price")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(120)
      .returns<PublicCard[]>(),
    supabase
      .from("decks")
      .select("id,name,commander,commander_image,colors,cards,price,wins,losses")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<PublicDeck[]>(),
  ]);

  const safeCards = cardsResponse.data || [];
  const safeDecks = decksResponse.data || [];
  const totalQuantity = safeCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  const totalValue = safeCards.reduce((sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0), 0);
  const totalDeckValue = safeDecks.reduce((sum, deck) => sum + Number(deck.price || 0), 0);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <Link href="/community" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black transition hover:bg-white/[0.1]">
          ←
        </Link>

        <header className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-2xl">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || profile.username || "Profil"} className="h-28 w-28 rounded-[2rem] object-cover shadow-2xl" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[#f59e0b] text-5xl font-black text-black shadow-2xl">
                {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">Profil public</p>
              <h1 className="mt-2 truncate text-4xl font-black md:text-5xl">{profile.display_name || profile.username}</h1>
              <p className="mt-1 text-sm font-bold text-white/50">@{profile.username}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <ProfileStat label="Cartes" value={totalQuantity} />
            <ProfileStat label="Uniques" value={safeCards.length} />
            <ProfileStat label="Decks publics" value={safeDecks.length} />
            <ProfileStat label="Valeur visible" value={formatCurrency(totalValue + totalDeckValue)} />
          </div>
        </header>

        {safeDecks.length > 0 && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Decks</p>
                <h2 className="mt-1 text-2xl font-black">Decks publics</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/60">{safeDecks.length}</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {safeDecks.map((deck) => {
                const games = Number(deck.wins || 0) + Number(deck.losses || 0);
                const winrate = games > 0 ? Math.round((Number(deck.wins || 0) / games) * 100) : 0;

                return (
                  <div key={deck.id} className="rounded-[1.6rem] border border-white/10 bg-black/25 p-3">
                    <div className="flex items-center gap-3">
                      {deck.commander_image ? (
                        <img src={deck.commander_image} alt={deck.commander || deck.name} className="h-20 w-14 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-20 w-14 items-center justify-center rounded-xl bg-white/10 text-xl">🎴</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black">{deck.name}</p>
                        <p className="truncate text-sm font-bold text-[#f59e0b]">{deck.commander || "Commandant inconnu"}</p>
                        <p className="mt-1 text-xs font-bold text-white/45">{deck.colors || "Incolore"}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Cartes" value={Number(deck.cards || 0)} />
                      <MiniStat label="WR" value={`${winrate}%`} />
                      <MiniStat label="Prix" value={formatCurrency(Number(deck.price || 0))} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Collection visible</h2>
              <p className="mt-1 text-sm font-bold text-white/45">120 dernières cartes publiques.</p>
            </div>
          </div>

          {safeCards.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {safeCards.map((card) => (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.055] p-1.5 shadow-xl">
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
          ) : (
            <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
              <p className="text-5xl">🎴</p>
              <h2 className="mt-4 text-2xl font-black">Aucune carte visible</h2>
              <p className="mt-2 font-bold text-white/45">Ce joueur n’a pas encore de collection publique.</p>
            </div>
          )}
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function ProfileStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-center">
      <p className="truncate text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-black/25 p-2">
      <p className="truncate text-sm font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
