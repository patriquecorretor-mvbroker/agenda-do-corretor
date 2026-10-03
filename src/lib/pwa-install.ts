import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallState = "available" | "installed" | "unavailable";

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function initializePwaInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function usePwaInstall() {
  const [, refresh] = useState(0);

  useEffect(() => {
    const listener = () => refresh((value) => value + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const state: InstallState = isStandalone() ? "installed" : deferredPrompt ? "available" : "unavailable";

  async function install() {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") deferredPrompt = null;
    notify();
    return choice.outcome === "accepted";
  }

  return { state, install };
}
