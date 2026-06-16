"use client";

import Link from "next/link";
import { useState } from "react";

type GameMode = "commander" | "standard";
type SheetType = "markers" | "commander" | null;
type TableTheme = "manaforge" | "fire" | "ice" | "toxic" | "royal";

type Player = {
  id: number;
  name: string;
  life: number;
  poison: number;
  radiation: number;
  energy: number;
  experience: number;
  commanderDamage: Record<number, number>;
};

function createPlayer(id: number, life: number): Player {
  return {
    id,
    name: `Joueur ${id}`,
    life,
    poison: 0,
    radiation: 0,
    energy: 0,
    experience: 0,
    commanderDamage: {},
  };
}

export default function GamePage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerCount, setPlayerCount] = useState(4);
  const [gameMode, setGameMode] = useState<GameMode>("commander");
  const [tableTheme, setTableTheme] = useState<TableTheme>("manaforge");
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  function getThemeClasses(theme: TableTheme) {
    switch (theme) {
      case "fire":
        return "from-[#2b0808] via-[#100508] to-[#050507]";
      case "ice":
        return "from-[#071827] via-[#050b12] to-[#050507]";
      case "toxic":
        return "from-[#0b2211] via-[#071108] to-[#050507]";
      case "royal":
        return "from-[#1d1230] via-[#0c0715] to-[#050507]";
      default:
        return "from-[#19131f] via-[#08080c] to-[#050507]";
    }
  }

  function getDeathMessage(playerName: string, commanderKill: boolean) {
    const messages = commanderKill
      ? [
          `${playerName} s’est fait signer le crâne par un commandant.`,
          `${playerName} a pris 21 dégâts et une leçon d’humilité.`,
          `${playerName} vient de découvrir la taxe commandant version douleur.`,
        ]
      : [
          `${playerName} a été renvoyé au cimetière.`,
          `${playerName} garde une main à 1 terrain et assume.`,
          `${playerName} vient de passer en mode spectateur.`,
          `${playerName} a pris plus de baffes qu’un token 1/1.`,
        ];

    return messages[playerName.length % messages.length];
  }

  function startGame() {
    const life = gameMode === "commander" ? 40 : 20;

    setPlayers(
      Array.from({ length: playerCount }, (_, index) =>
        createPlayer(index + 1, life)
      )
    );

    setGameStarted(true);
  }

  function openSheet(playerId: number, sheet: SheetType) {
    setActivePlayerId(playerId);
    setActiveSheet(sheet);
  }

  function closeSheet() {
    setActivePlayerId(null);
    setActiveSheet(null);
  }

  function updatePlayer(id: number, field: keyof Player, amount: number) {
    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== id) return player;

        const value = player[field];
        if (typeof value !== "number") return player;

        return {
          ...player,
          [field]:
            field === "life" ? value + amount : Math.max(0, value + amount),
        };
      })
    );
  }

  function updateCommanderDamage(
    targetPlayerId: number,
    sourcePlayerId: number,
    amount: number
  ) {
    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== targetPlayerId) return player;

        const currentDamage = player.commanderDamage[sourcePlayerId] ?? 0;
        const nextDamage = Math.max(0, currentDamage + amount);

        const lifeChange =
          amount > 0 ? -amount : currentDamage > 0 ? Math.abs(amount) : 0;

        return {
          ...player,
          life: player.life + lifeChange,
          commanderDamage: {
            ...player.commanderDamage,
            [sourcePlayerId]: nextDamage,
          },
        };
      })
    );
  }

  const gridClass =
    players.length === 2
      ? "grid h-[100dvh] grid-rows-2"
      : players.length === 3
      ? "grid h-[100dvh] grid-cols-2 grid-rows-2"
      : "grid h-[100dvh] grid-cols-2 grid-rows-2";

  if (!gameStarted) {
    return (
      <main className="page">
        <section className="container-app pb-24">
          <header>
            <Link href="/" className="text-3xl font-black">
              ←
            </Link>

            <div className="mt-6">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
                Commander Table
              </p>

              <h1 className="mt-2 text-4xl font-black text-accent">
                Game Tracker
              </h1>

              <p className="mt-2 text-muted">
                Configure ta partie puis lance le mode table.
              </p>
            </div>
          </header>

          <div className="mt-8 card-premium p-5">
            <h2 className="text-xl font-black">Configuration</h2>

            <div className="mt-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
                Joueurs
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((count) => {
                  const selected = playerCount === count;

                  return (
                    <button
                      key={count}
                      onClick={() => setPlayerCount(count)}
                      className={`relative rounded-2xl py-5 text-2xl font-black transition ${
                        selected
                          ? "border-2 border-accent bg-accent text-white shadow-[0_0_25px_rgba(255,170,80,0.5)]"
                          : "border border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 text-sm font-black text-white">
                          ✓
                        </span>
                      )}

                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
                Mode
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "commander", label: "🎴 Commander" },
                  { id: "standard", label: "⚔️ 60 cartes" },
                ].map((mode) => {
                  const selected = gameMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id as GameMode)}
                      className={`relative rounded-2xl py-5 font-black transition ${
                        selected
                          ? "border-2 border-accent bg-accent text-white shadow-[0_0_25px_rgba(255,170,80,0.5)]"
                          : "border border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 text-sm font-black text-white">
                          ✓
                        </span>
                      )}

                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
                Thème de table
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "manaforge", label: "⚡ Manaforge" },
                  { id: "fire", label: "🔥 Feu" },
                  { id: "ice", label: "❄️ Glace" },
                  { id: "toxic", label: "☠️ Toxique" },
                  { id: "royal", label: "👑 Royal" },
                ].map((theme) => {
                  const selected = tableTheme === theme.id;

                  return (
                    <button
                      key={theme.id}
                      onClick={() => setTableTheme(theme.id as TableTheme)}
                      className={`relative rounded-2xl py-4 font-black transition ${
                        selected
                          ? "border-2 border-accent bg-accent text-white shadow-[0_0_25px_rgba(255,170,80,0.5)]"
                          : "border border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 text-sm font-black text-white">
                          ✓
                        </span>
                      )}

                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={startGame} className="btn-primary mt-8 w-full">
              Lancer la partie
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#050507] text-white">
      <button
        onClick={() => {
          setGameStarted(false);
          closeSheet();
        }}
        className="fixed left-3 top-3 z-50 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-xs font-black backdrop-blur-xl"
      >
        ← Menu
      </button>

      <div className={gridClass}>
        {players.map((player, index) => {
          const isThirdFullWidth = players.length === 3 && index === 2;

          const commanderKill = Object.values(player.commanderDamage).some(
            (damage) => damage >= 21
          );

          return (
            <section
              key={player.id}
              className={`relative overflow-hidden border border-white/10 bg-gradient-to-br ${getThemeClasses(
                tableTheme
              )} p-2 ${isThirdFullWidth ? "col-span-2" : ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/50" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl backdrop-blur-sm">
                <input
                  value={player.name}
                  onChange={(event) =>
                    setPlayers((current) =>
                      current.map((item) =>
                        item.id === player.id
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                  className="absolute top-3 w-full bg-transparent px-14 text-center text-xs font-black uppercase tracking-[0.18em] text-white/70 outline-none"
                />

                <button
                  onClick={() => openSheet(player.id, "markers")}
                  className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-black"
                  aria-label="Marqueurs"
                >
                  ⋮
                </button>

                {gameMode === "commander" && (
                  <button
                    onClick={() => openSheet(player.id, "commander")}
                    className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-xl shadow-lg"
                    aria-label="Dégâts commandant"
                  >
                    🛡️
                  </button>
                )}

                <button
                  onClick={() => openSheet(player.id, "markers")}
                  className="text-center text-[5.8rem] font-black leading-none tracking-tight text-white drop-shadow-2xl"
                >
                  {player.life}
                </button>

                <div className="mt-3 flex w-full items-center justify-center gap-5 px-3">
                  <button
                    onClick={() => updatePlayer(player.id, "life", -1)}
                    className="flex h-16 min-w-[96px] items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-4xl font-black text-white"
                  >
                    −
                  </button>

                  <button
                    onClick={() => updatePlayer(player.id, "life", 1)}
                    className="flex h-16 min-w-[96px] items-center justify-center rounded-2xl border border-accent/40 bg-accent/20 text-4xl font-black text-accent"
                  >
                    +
                  </button>
                </div>
              </div>

              {(player.life <= 0 || commanderKill) && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-4 text-center text-xl font-black text-red-300 backdrop-blur-sm">
                  {getDeathMessage(player.name, commanderKill)}
                </div>
              )}

              {activePlayerId === player.id && activeSheet === "markers" && (
                <PlayerPanel>
                  <PanelHeader title="Marqueurs" onClose={closeSheet} />

                  <div className="grid grid-cols-2 gap-3">
                    <MarkerButton
                      label="Poison ☠️"
                      value={player.poison}
                      onMinus={() => updatePlayer(player.id, "poison", -1)}
                      onPlus={() => updatePlayer(player.id, "poison", 1)}
                    />

                    <MarkerButton
                      label="Radiation ☢️"
                      value={player.radiation}
                      onMinus={() => updatePlayer(player.id, "radiation", -1)}
                      onPlus={() => updatePlayer(player.id, "radiation", 1)}
                    />

                    <MarkerButton
                      label="Énergie ⚡"
                      value={player.energy}
                      onMinus={() => updatePlayer(player.id, "energy", -1)}
                      onPlus={() => updatePlayer(player.id, "energy", 1)}
                    />

                    <MarkerButton
                      label="Expérience ⭐"
                      value={player.experience}
                      onMinus={() => updatePlayer(player.id, "experience", -1)}
                      onPlus={() => updatePlayer(player.id, "experience", 1)}
                    />
                  </div>
                </PlayerPanel>
              )}

              {activePlayerId === player.id && activeSheet === "commander" && (
                <PlayerPanel>
                  <PanelHeader title="Dégâts commandant" onClose={closeSheet} />

                  <div className="space-y-3">
                    {players
                      .filter((opponent) => opponent.id !== player.id)
                      .map((opponent) => {
                        const damage =
                          player.commanderDamage[opponent.id] ?? 0;

                        return (
                          <div
                            key={opponent.id}
                            className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"
                          >
                            <p className="mb-3 text-center text-sm font-black">
                              {opponent.name}
                            </p>

                            <div className="flex items-center justify-center gap-4">
                              <button
                                onClick={() =>
                                  updateCommanderDamage(
                                    player.id,
                                    opponent.id,
                                    -1
                                  )
                                }
                                className="flex h-12 min-w-[76px] items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl font-black text-white"
                              >
                                −
                              </button>

                              <span
                                className={`min-w-[48px] text-center text-3xl font-black ${
                                  damage >= 21
                                    ? "text-red-400"
                                    : "text-white"
                                }`}
                              >
                                {damage}
                              </span>

                              <button
                                onClick={() =>
                                  updateCommanderDamage(
                                    player.id,
                                    opponent.id,
                                    1
                                  )
                                }
                                className="flex h-12 min-w-[76px] items-center justify-center rounded-2xl border border-accent/40 bg-accent/20 text-2xl font-black text-accent"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </PlayerPanel>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function PlayerPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-2 bottom-2 z-40 max-h-[92%] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#09090d]/95 p-3 shadow-2xl backdrop-blur-xl">
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/30" />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
          {title}
        </p>

        <button
          onClick={onClose}
          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black"
        >
          Fermer
        </button>
      </div>
    </>
  );
}

function MarkerButton({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="mb-3 text-center text-[10px] font-black uppercase tracking-wide text-white/50">
        {label}
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onMinus}
          className="flex h-11 min-w-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl font-black text-white"
        >
          −
        </button>

        <span className="min-w-[34px] text-center text-2xl font-black">
          {value}
        </span>

        <button
          onClick={onPlus}
          className="flex h-11 min-w-[56px] items-center justify-center rounded-2xl border border-accent/40 bg-accent/20 text-2xl font-black text-accent"
        >
          +
        </button>
      </div>
    </div>
  );
}