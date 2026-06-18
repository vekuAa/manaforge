import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean | null;
  created_at?: string | null;
};

type CommunityProfile = Profile & {
  cardCount: number;
  uniqueCount: number;
  deckCount: number;
  collectionValue: number;
  previewCards: { id: string; name: string; image: string | null }[];
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Variables Supabase manquantes.");
  }

  return createClient(url, key);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getInitial(profile: Profile) {
  return (profile.display_name || profile.username || "?").charAt(0).toUpperCase();
}

export default async function CommunityPage() {
  const supabase = getSupabase();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,is_public,created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<Profile[]>();

  const safeProfiles = profiles || [];

  const enrichedProfiles: CommunityProfile[] = await Promise.all(
    safeProfiles.map(async (profile) => {
      const [cardsResponse, decksResponse] = await Promise.all([
        supabase
          .from("collection_cards")
          .select("id,name,image,quantity,price")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("decks")
          .select("id")
          .eq("user_id", profile.id)
          .eq("is_public", true),
      ]);

      const cards = cardsResponse.data || [];
      const cardCount = cards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
      const collectionValue = cards.reduce(
        (sum, card) => sum + Number(card.quantity || 1) * Number(card.price || 0),
        0,
      );

      return {
        ...profile,
        cardCount,
        uniqueCount: cards.length,
        deckCount: decksResponse.data?.length || 0,
        collectionValue: Math.round(collectionValue * 100) / 100,
        previewCards: cards
          .filter((card) => card.image)
          .slice(0, 4)
          .map((card) => ({ id: String(card.id), name: String(card.name), image: card.image })),
      };
    }),
  );

  const totalPlayers = enrichedProfiles.length;
  const totalCards = enrichedProfiles.reduce((sum, profile) => sum + profile.cardCount, 0);
  const totalDecks = enrichedProfiles.reduce((sum, profile) => sum + profile.deckCount, 0);
  const topCollectors = [...enrichedProfiles].sort((a, b) => b.cardCount - a.cardCount).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl pb-28">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black transition hover:bg-white/[0.1]">
          ←
        </Link>

        <header className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#f59e0b]">ManaForge social</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-black leading-tight md:text-5xl">Communauté</h1>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-white/55">
                Découvre les profils publics, les collections visibles et les decks partagés par les joueurs ManaForge.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <CommunityStat label="Joueurs" value={totalPlayers} />
              <CommunityStat label="Cartes" value={totalCards} />
              <CommunityStat label="Decks" value={totalDecks} />
            </div>
          </div>
        </header>

        {topCollectors.length > 0 && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">Top collectionneurs</p>
                <h2 className="mt-1 text-2xl font-black">Les profils actifs</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/60">Public</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {topCollectors.map((profile, index) => (
                <Link key={profile.id} href={`/u/${profile.username}`} className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/25 p-4 transition hover:bg-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b] text-xl font-black text-black shadow-xl">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black">{profile.display_name || profile.username}</p>
                      <p className="truncate text-sm font-bold text-white/45">@{profile.username}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Cartes" value={profile.cardCount} />
                    <MiniStat label="Decks" value={profile.deckCount} />
                    <MiniStat label="Valeur" value={formatCurrency(profile.collectionValue)} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Profils publics</h2>
              <p className="mt-1 text-sm font-bold text-white/45">Cartes récentes, decks publics et collection visible.</p>
            </div>
          </div>

          {enrichedProfiles.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enrichedProfiles.map((profile) => (
                <Link key={profile.id} href={`/u/${profile.username}`} className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-4 shadow-xl transition hover:bg-white/[0.08]">
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.display_name || profile.username || "Profil"} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b] text-xl font-black text-black">
                        {getInitial(profile)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black">{profile.display_name || profile.username}</p>
                      <p className="truncate text-sm font-bold text-white/45">@{profile.username}</p>
                    </div>

                    <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black text-[#f59e0b]">Voir</span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Cartes" value={profile.cardCount} />
                    <MiniStat label="Uniques" value={profile.uniqueCount} />
                    <MiniStat label="Decks" value={profile.deckCount} />
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {profile.previewCards.length > 0 ? (
                      profile.previewCards.map((card) => (
                        <div key={card.id} className="rounded-xl bg-black/25 p-1">
                          {card.image ? (
                            <img src={card.image} alt={card.name} className="aspect-[63/88] w-full rounded-lg object-cover" />
                          ) : (
                            <div className="flex aspect-[63/88] items-center justify-center rounded-lg bg-white/10 text-xl">🎴</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-center text-sm font-bold text-white/40">
                        Aucune carte visible
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center">
              <p className="text-5xl">👥</p>
              <h2 className="mt-4 text-2xl font-black">Aucun profil public</h2>
              <p className="mt-2 font-bold text-white/45">Les profils apparaîtront ici quand les joueurs activeront leur visibilité publique.</p>
            </div>
          )}
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function CommunityStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-center">
      <p className="text-2xl font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-black/25 p-3">
      <p className="truncate text-sm font-black text-[#f59e0b]">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

