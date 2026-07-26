import { useEffect, useRef, useState } from "react";

export type FilterViewport = { top: number; height: number };

/**
 * Measures both the sticky top offset and the height available inside the
 * browser viewport for a sticky desktop panel, even when the app is embedded
 * in an iframe that extends beyond the visible area of the host page.
 *
 * Uses an invisible fixed probe observed with IntersectionObserver so that
 * `intersectionRect` reveals which vertical slice of the iframe is currently
 * on screen (rootBounds is unreliable across origins).
 */
export function useIframeVisibleHeight(
  panelRef: React.RefObject<HTMLElement | null>,
  minHeight = 240,
  gap = 16,
) {
  const [viewport, setViewport] = useState<FilterViewport | null>(null);
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
      if (!rect) return;

      // Expose the iframe's visible slice as CSS variables on <html> so that
      // portalled content (Radix Sheet) and fixed overlays can position
      // themselves against the *visible* part of the iframe.
      const hiddenBottom = Math.max(0, window.innerHeight - rect.bottom);
      const visibleHeight = Math.max(0, rect.bottom - rect.top);
      const root = document.documentElement;
      root.style.setProperty("--iframe-hidden-bottom", `${hiddenBottom}px`);
      root.style.setProperty("--iframe-visible-height", `${visibleHeight}px`);

      const panel = panelRef.current;
      if (!panel) return;

      // Read the panel's normal (non-sticky) layout position from the
      // enclosing <aside>. Using the panel itself would fold its own sticky
      // top back into the calculation and cause feedback.
      const aside = panel.closest("aside");
      const normalPanelTop =
        aside?.getBoundingClientRect().top ??
        panel.getBoundingClientRect().top ??
        0;

      const stickyTop = Math.floor(rect.top + gap);
      const effectivePanelTop = Math.max(normalPanelTop, stickyTop);
      const panelHeight = Math.max(
        minHeight,
        Math.floor(rect.bottom - effectivePanelTop - gap),
      );

      setViewport((prev) =>
        prev && prev.top === stickyTop && prev.height === panelHeight
          ? prev
          : { top: stickyTop, height: panelHeight },
      );
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
  }, [panelRef, minHeight, gap]);

  return viewport;
}
