"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username: slugify(displayName || email.split("@")[0]),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: slugify(displayName || email.split("@")[0]) || data.user.id.slice(0, 8),
        display_name: displayName || email.split("@")[0],
        is_public: true,
      });

      const existingFolders = [
        { user_id: data.user.id, name: "Non classé", color: "#22d3ee" },
        { user_id: data.user.id, name: "Commander", color: "#f97316" },
        { user_id: data.user.id, name: "Trade", color: "#a855f7" },
        { user_id: data.user.id, name: "Staples", color: "#22c55e" },
      ];
      await supabase.from("folders").insert(existingFolders);
    }

    setIsLoading(false);

    if (!data.session) {
      setMessage("Compte créé. Vérifie ton email si Supabase demande une confirmation, puis connecte-toi.");
      return;
    }

    router.replace("/account");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xl font-black">←</Link>
        <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f59e0b]">ManaForge</p>
          <h1 className="mt-2 text-3xl font-black">Créer un compte</h1>
          <p className="mt-2 text-sm font-bold text-white/55">Email + mot de passe. Google viendra plus tard si besoin.</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Pseudo / nom affiché" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
            <input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-bold outline-none" />
            {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
            {message && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{message}</p>}
            <button disabled={isLoading} className="mt-2 rounded-xl bg-[#f59e0b] py-3 font-black text-black disabled:opacity-50">{isLoading ? "Création..." : "Créer mon compte"}</button>
          </form>

          <p className="mt-5 text-center text-sm font-bold text-white/55">Déjà inscrit ? <Link href="/login" className="text-[#f59e0b]">Se connecter</Link></p>
        </div>
      </section>
    </main>
  );
}
