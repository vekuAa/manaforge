"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";
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
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black">←</Link>
        <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f59e0b]">ManaForge</p>
          <h1 className="mt-2 text-3xl font-black">Connexion</h1>
          <p className="mt-2 text-sm font-bold text-white/55">Connecte-toi pour sauvegarder ta collection dans le cloud.</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
            <input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
            {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
            <button disabled={isLoading} className="mt-2 rounded-xl bg-[#f59e0b] py-3 font-black text-black disabled:opacity-50">{isLoading ? "Connexion..." : "Se connecter"}</button>
          </form>

          <p className="mt-5 text-center text-sm font-bold text-white/55">Pas encore de compte ? <Link href="/register" className="text-[#f59e0b]">Créer un compte</Link></p>
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
