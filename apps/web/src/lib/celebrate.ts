/**
 * Rückmeldung „Analyse fertig“ (Wunsch Marco, 22.11.2026): kurzer Fertig-Klang wie in V2,
 * Bildschirm wackelt kurz, Handy vibriert. Alles optional – fehlt etwas, passiert nichts.
 */
export function playCompletionSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [1046.5, 1568].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.5);
    });
    setTimeout(() => void ctx.close(), 700);
  } catch {
    // Web Audio nicht verfügbar → ohne Ton
  }
}

export function shakeScreen(element: HTMLElement | null = document.getElementById("app-shell")): void {
  if (!element) return;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  element.classList.remove("shake");
  void element.offsetWidth; // Animation neu starten
  element.classList.add("shake");
  window.setTimeout(() => element.classList.remove("shake"), 650);
}

export function celebrateCompletion(): void {
  playCompletionSound();
  shakeScreen();
  try {
    navigator.vibrate?.([60, 40, 90]);
  } catch {
    // kein Vibrationsmotor / nicht erlaubt
  }
}
