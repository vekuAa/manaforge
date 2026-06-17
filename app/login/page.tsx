"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace(redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto grid min-h-[86vh] w-full max-w-5xl items-center gap-6 md:grid-cols-[1fr_420px]">
        <div className="hidden md:block">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#f59e0b]">ManaForge</p>
          <h1 className="mt-4 max-w-xl text-6xl font-black leading-[0.95]">
            Ta collection Magic, sauvegardée dans le cloud.
          </h1>
          <p className="mt-5 max-w-lg text-lg font-bold text-white/55">
            Connecte-toi pour retrouver tes dossiers, tes cartes, tes full sets et bientôt les collections de tes potes.
          </p>

          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <p className="text-2xl">📁</p>
              <p className="mt-3 text-sm font-black">Dossiers cloud</p>
              <p className="mt-1 text-xs font-bold text-white/45">Synchronisés</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <p className="text-2xl">🎴</p>
              <p className="mt-3 text-sm font-black">Collection</p>
              <p className="mt-1 text-xs font-bold text-white/45">Multi-appareils</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <p className="text-2xl">👥</p>
              <p className="mt-3 text-sm font-black">Entre potes</p>
              <p className="mt-1 text-xs font-bold text-white/45">Profils publics</p>
            </div>
          </div>
        </div>

        <div>
          <Link href="/" className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black md:hidden">
            ←
          </Link>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f59e0b] text-3xl font-black text-black shadow-xl">
              M
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f59e0b]">ManaForge</p>
              <h1 className="mt-2 text-3xl font-black">Connexion</h1>
              <p className="mt-2 text-sm font-bold text-white/55">
                Accède à ton espace et synchronise ta collection.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="toi@email.com"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none focus:border-[#f59e0b]/60"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Mot de passe</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none focus:border-[#f59e0b]/60"
                />
              </label>

              {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

              <button disabled={isLoading} className="mt-2 rounded-2xl bg-[#f59e0b] py-4 font-black text-black shadow-xl shadow-orange-500/10 disabled:opacity-50">
                {isLoading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm font-bold text-white/55">
              Pas encore de compte ? <Link href="/register" className="text-[#f59e0b]">Créer un compte</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
