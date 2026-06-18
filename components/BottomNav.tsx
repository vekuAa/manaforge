"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FolderOpen,
  Home,
  Library,
  Menu,
  User,
  Users,
  Zap,
  Dices,
} from "lucide-react";

const mainItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/collection", icon: FolderOpen, label: "Collection" },
  { href: "/deck", icon: Library, label: "Decks" },
  { href: "/commander", icon: Dices, label: "Random" },
];

const moreItems = [
  { href: "/combo", icon: Zap, label: "Combos" },
  { href: "/community", icon: Users, label: "Communauté" },
  { href: "/account", icon: User, label: "Profil" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {isMoreOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
        />
      )}

      {isMoreOpen && (
        <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#151515]/95 p-3 text-white shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f59e0b]">
              Plus
            </p>

            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-black"
            >
              ×
            </button>
          </div>

          <div className="grid gap-2">
            {moreItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                    active
                      ? "bg-[#f59e0b] text-black"
                      : "bg-white/[0.055] text-white hover:bg-white/[0.09]"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      active ? "bg-black/10" : "bg-black/25"
                    }`}
                  >
                    <Icon size={22} strokeWidth={2.4} />
                  </span>

                  <div>
                    <p className="font-black">{item.label}</p>
                    <p
                      className={`text-xs font-bold ${
                        active ? "text-black/55" : "text-white/40"
                      }`}
                    >
                      {item.href}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#101116]/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 text-white shadow-2xl backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mainItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition active:scale-95 ${
                  active
                    ? "bg-[#f59e0b] text-black shadow-lg shadow-orange-500/20"
                    : "text-white/55 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon size={22} strokeWidth={2.4} />
                <span className="mt-1 text-[10px] font-black">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen((current) => !current)}
            className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition active:scale-95 ${
              moreActive || isMoreOpen
                ? "bg-[#f59e0b] text-black shadow-lg shadow-orange-500/20"
                : "text-white/55 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Menu size={22} strokeWidth={2.4} />
            <span className="mt-1 text-[10px] font-black">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}