/**
 * Register the Halo service worker for PWA installability.
 * Call this once from the root layout or a client component.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // eslint-disable-next-line no-console
        console.log("[halo] SW registered, scope:", reg.scope);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[halo] SW registration failed:", err);
      });
  });
}
