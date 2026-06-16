import Link from "next/link";
import BottomNav from "@/components/BottomNav";

const modules = [
  {
    title: "Mes Decks",
    description: "Analyse, scores, stats et cartes.",
    href: "/deck",
    icon: "📚",
  },
  {
    title: "Game Tracker",
    description: "Lance une partie Commander.",
    href: "/game",
    icon: "🎮",
  },
  {
    title: "Random Commander",
    description: "Trouve une idée de commandant.",
    href: "/commander",
    icon: "🎲",
  },
  {
    title: "Profil joueur",
    description: "Stats, victoires et historique.",
    href: "/profile",
    icon: "👤",
  },
  {
    title: "Collection",
    description: "Cartes, prix et valeur totale.",
    href: "/collection",
    icon: "📦",
  },
  {
    title: "Combos",
    description: "Recherche de combos infinis.",
    href: "/combos",
    icon: "♾️",
  },
];

export default function Home() {
  return (
    <main className="page">
      <section className="container-app">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
            Commander / EDH
          </p>

          <h1 className="mt-3 text-5xl font-black text-accent">
            ManaForge
          </h1>

          <p className="mt-3 text-muted">
            Ton hub premium pour gérer tes decks, tes parties, tes stats et ta
            collection Magic.
          </p>
        </div>

        <div className="mt-8 card-premium overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted">Deck principal</p>
              <h2 className="mt-1 text-2xl font-black">
                Commander Hub
              </h2>
            </div>

            <div className="rounded-2xl border border-orange-400/40 bg-black px-4 py-3 text-center">
              <p className="text-2xl font-black text-accent">[2]</p>
              <p className="text-[10px] font-bold text-muted">CORE</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3">
            {[
              ["64", "Global"],
              ["50", "Power"],
              ["68", "Mana"],
              ["86", "Health"],
            ].map(([score, label]) => (
              <div
                key={label}
                className="rounded-2xl bg-black/30 p-3 text-center"
              >
                <p className="text-xl font-black text-accent">{score}</p>
                <p className="text-[11px] font-bold text-muted">{label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/deck"
            className="mt-5 block rounded-2xl bg-white/10 px-4 py-3 text-center font-black hover:bg-white/15"
          >
            Ouvrir mes decks
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {modules.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="card-soft p-4 transition hover:-translate-y-1 hover:bg-white/10"
            >
              <div className="text-3xl">{item.icon}</div>
              <h2 className="mt-4 text-lg font-black">{item.title}</h2>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}