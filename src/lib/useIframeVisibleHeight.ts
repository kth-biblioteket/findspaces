import { useEffect, useRef, useState } from "react";

/**
 * Measures the height available inside the browser viewport for a sticky
 * desktop panel, even when the app is embedded in an iframe that extends
 * beyond the visible area of the host page.
 *
 * Uses an invisible fixed probe observed with IntersectionObserver so that
 * `intersectionRect` reveals which vertical slice of the iframe is currently
 * on screen (rootBounds is unreliable across origins).
 */
export function useIframeVisibleHeight(
  panelRef: React.RefObject<HTMLElement | null>,
  minHeight = 240,
  bottomGap = 16,
) {
  const [height, setHeight] = useState<number | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const lastRectRef = useRef<{ top: number; bottom: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;inset:0;pointer-events:none;opacity:0;z-index:-1;";
    document.body.appendChild(probe);
    probeRef.current = probe;

    const recompute = () => {
      const rect = lastRectRef.current;
      const panel = panelRef.current;
      if (!rect || !panel) return;
      const panelTop = panel.getBoundingClientRect().top;
      const available = Math.max(
        minHeight,
        Math.floor(rect.bottom - Math.max(panelTop, rect.top) - bottomGap),
      );
      setHeight((prev) => (prev === available ? prev : available));
    };

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const r = entry.intersectionRect;
        lastRectRef.current = { top: r.top, bottom: r.bottom };
        recompute();
      },
      { threshold: Array.from({ length: 101 }, (_, i) => i / 100) },
    );
    io.observe(probe);

    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onResize);

    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onResize);
      probe.remove();
      probeRef.current = null;
    };
  }, [panelRef, minHeight, bottomGap]);

  return height;
}
