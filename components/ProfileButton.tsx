"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileButton() {
  const [initial, setInitial] = useState("?");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setIsConnected(false);
        return;
      }

      setIsConnected(true);

      const displayName =
        data.user.user_metadata?.display_name ||
        data.user.email ||
        "?";

      setInitial(displayName.charAt(0).toUpperCase());
    }

    void loadUser();
  }, []);

  return (
    <Link
      href={isConnected ? "/account" : "/login"}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-[#f59e0b] text-lg font-black text-black shadow-xl ring-1 ring-white/20"
      aria-label={isConnected ? "Mon profil" : "Connexion"}
    >
      {isConnected ? initial : "👤"}
    </Link>
  );
}