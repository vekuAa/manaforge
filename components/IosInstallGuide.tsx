"use client";

import { useEffect, useMemo, useState } from "react";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isIosDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (platform === "macintel" && window.navigator.maxTouchPoints > 1)
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getInitialState() {
  if (typeof window === "undefined") {
    return {
      shouldShow: false,
    };
  }

  const dismissed =
    localStorage.getItem("manaforge-ios-install-dismissed") === "true";

  return {
    shouldShow: isIosDevice() && !isStandaloneMode() && !dismissed,
  };
}

export default function IosInstallGuide() {
  const initialState = useMemo(() => getInitialState(), []);
  const [shouldShow, setShouldShow] = useState(initialState.shouldShow);

  useEffect(() => {
    function handleVisibilityChange() {
      if (isStandaloneMode()) {
        setShouldShow(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function dismiss() {
    localStorage.setItem("manaforge-ios-install-dismissed", "true");
    setShouldShow(false);
  }

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[95] mx-auto max-w-md rounded-[1.6rem] border border-white/10 bg-[#151515]/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b] text-2xl">
          🍎
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-black">Installer ManaForge sur iPhone</p>

          <ol className="mt-2 space-y-1 text-sm font-bold text-white/55">
            <li>1. Appuie sur le bouton Partager</li>
            <li>2. Choisis “Ajouter à l’écran d’accueil”</li>
            <li>3. Valide avec “Ajouter”</li>
          </ol>

          <button
            onClick={dismiss}
            className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white/70"
          >
            J’ai compris
          </button>
        </div>
      </div>
    </div>
  );
}