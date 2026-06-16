"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useEffect, useState } from "react";

type PlayerProfile = {
  username: string;
  favoriteCommander: string;
  avatar: string;
  wins: number;
  losses: number;
};

const defaultProfile: PlayerProfile = {
  username: "",
  favoriteCommander: "",
  avatar: "🧙‍♂️",
  wins: 0,
  losses: 0,
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    if (typeof window === "undefined") return defaultProfile;

    const savedProfile = localStorage.getItem("manaforge-profile");

    if (!savedProfile) return defaultProfile;

    try {
      return JSON.parse(savedProfile);
    } catch {
      return defaultProfile;
    }
  });

  useEffect(() => {
    localStorage.setItem("manaforge-profile", JSON.stringify(profile));
  }, [profile]);

  const gamesPlayed = profile.wins + profile.losses;
  const winrate =
    gamesPlayed === 0 ? 0 : Math.round((profile.wins / gamesPlayed) * 100);

  function updateProfile(field: keyof PlayerProfile, value: string | number) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="page">
      <section className="container-app">
        <header>
          <Link href="/" className="text-3xl font-black">
            ←
          </Link>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
              Player Area
            </p>

            <h1 className="mt-2 text-4xl font-black text-accent">
              Profil joueur
            </h1>

            <p className="mt-2 text-muted">
              Gère ton identité Commander et suis tes performances.
            </p>
          </div>
        </header>

        <div className="mt-8 card-premium overflow-hidden p-6 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-black/40 text-6xl">
            {profile.avatar}
          </div>

          <h2 className="mt-5 text-3xl font-black">
            {profile.username || "Nouveau joueur"}
          </h2>

          <p className="mt-2 font-bold text-accent">
            {profile.favoriteCommander || "Aucun commandant favori"}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-2xl font-black text-accent">{gamesPlayed}</p>
              <p className="text-[11px] font-bold text-muted">Parties</p>
            </div>

            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-2xl font-black text-accent">{profile.wins}</p>
              <p className="text-[11px] font-bold text-muted">Wins</p>
            </div>

            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-2xl font-black text-accent">{winrate}%</p>
              <p className="text-[11px] font-bold text-muted">Winrate</p>
            </div>
          </div>
        </div>

        <div className="mt-6 card-soft p-5">
          <h2 className="text-xl font-black">Informations</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-muted">
                Avatar
              </label>
              <select
                value={profile.avatar}
                onChange={(e) => updateProfile("avatar", e.target.value)}
                className="input-premium"
              >
                <option value="🧙‍♂️">🧙‍♂️ Mage</option>
                <option value="🐉">🐉 Dragon</option>
                <option value="🧛">🧛 Vampire</option>
                <option value="🧝">🧝 Elfe</option>
                <option value="☠️">☠️ Poison</option>
                <option value="🔥">🔥 Aggro</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-muted">
                Pseudo
              </label>
              <input
                value={profile.username}
                onChange={(e) => updateProfile("username", e.target.value)}
                placeholder="Ex : Greg"
                className="input-premium"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-muted">
                Commandant favori
              </label>
              <input
                value={profile.favoriteCommander}
                onChange={(e) =>
                  updateProfile("favoriteCommander", e.target.value)
                }
                placeholder="Ex : Atraxa, Praetors' Voice"
                className="input-premium"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => updateProfile("wins", profile.wins + 1)}
            className="rounded-2xl bg-green-500/20 px-4 py-4 font-black text-green-300"
          >
            + Victoire
          </button>

          <button
            onClick={() => updateProfile("losses", profile.losses + 1)}
            className="rounded-2xl bg-red-500/20 px-4 py-4 font-black text-red-300"
          >
            + Défaite
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}