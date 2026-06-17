import Link from "next/link";

const items = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/deck", icon: "📚", label: "Decks" },
  { href: "/collection", icon: "📦", label: "Collection" },
  { href: "/community", icon: "👥", label: "Communauté" },
  { href: "/commander", icon: "🎲", label: "Random" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#151515]/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs text-slate-300 hover:bg-white/10"
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}