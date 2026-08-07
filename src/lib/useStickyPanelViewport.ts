import { useEffect, useState } from "react";

export type StickyPanelViewport = { top: number; height: number };

/**
 * Keeps a sticky desktop panel inside the standalone browser viewport.
 *
 * The panel can initially sit far below the top of the viewport because the
 * page header and editable introduction precede it. Measuring the containing
 * aside's current position avoids giving the panel a viewport-height box whose
 * lower edge is off-screen. As the document scrolls and the panel becomes
 * sticky, the available height grows automatically.
 */
export function useStickyPanelViewport(panelRef: React.RefObject<HTMLElement | null>, gap = 16) {
  const [viewport, setViewport] = useState<StickyPanelViewport | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let animationFrame = 0;

    const recompute = () => {
      animationFrame = 0;
      const panel = panelRef.current;
      if (!panel) return;

      const aside = panel.closest("aside");
      const normalPanelTop =
        aside?.getBoundingClientRect().top ?? panel.getBoundingClientRect().top;
      const effectivePanelTop = Math.max(normalPanelTop, gap);
      const height = Math.max(0, Math.floor(window.innerHeight - effectivePanelTop - gap));

      setViewport((previous) =>
        previous?.top === gap && previous.height === height ? previous : { top: gap, height },
      );
    };

    const scheduleRecompute = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(recompute);
    };

    const resizeObserver = new ResizeObserver(scheduleRecompute);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", scheduleRecompute);
    window.addEventListener("scroll", scheduleRecompute, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleRecompute);
    window.visualViewport?.addEventListener("scroll", scheduleRecompute);
    void document.fonts?.ready.then(scheduleRecompute);
    scheduleRecompute();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleRecompute);
      window.removeEventListener("scroll", scheduleRecompute);
      window.visualViewport?.removeEventListener("resize", scheduleRecompute);
      window.visualViewport?.removeEventListener("scroll", scheduleRecompute);
    };
  }, [panelRef, gap]);

  return viewport;
}
