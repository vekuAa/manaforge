"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getInitialInstallState() {
  if (typeof window === "undefined") {
    return {
      isInstalled: false,
      isDismissed: false,
    };
  }

  return {
    isInstalled: isStandaloneMode(),
    isDismissed:
      localStorage.getItem("manaforge-install-dismissed") === "true",
  };
}

export default function PwaInstallPrompt() {
  const initialState = useMemo(() => getInitialInstallState(), []);

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState(initialState.isInstalled);
  const [isDismissed, setIsDismissed] = useState(initialState.isDismissed);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      localStorage.setItem("manaforge-installed", "true");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
      localStorage.setItem("manaforge-installed", "true");
    } else {
      setIsDismissed(true);
      localStorage.setItem("manaforge-install-dismissed", "true");
    }
  }

  function dismiss() {
    setIsDismissed(true);
    localStorage.setItem("manaforge-install-dismissed", "true");
  }

  if (isInstalled || isDismissed || !installPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[90] mx-auto max-w-md rounded-[1.6rem] border border-white/10 bg-[#151515]/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b] text-2xl">
          📱
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-black">Installer ManaForge</p>

          <p className="mt-1 text-sm font-bold text-white/50">
            Ajoute l’app sur ton écran d’accueil pour l’ouvrir comme une vraie
            appli.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={installApp}
              className="rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-black text-black"
            >
              Installer
            </button>

            <button
              onClick={dismiss}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white/70"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}