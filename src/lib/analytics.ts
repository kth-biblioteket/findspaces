import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "hsp_session_id";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export type AnalyticsEvent =
  | "page_view"
  | "filter_change"
  | "card_click"
  | "card_expand"
  | "booking_link_click"
  | "map_link_click"
  | "empty_results"
  | "space_link_click";

function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const w = window.innerWidth;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (w >= 768 && w < 1024 && /Mobi|Android/i.test(ua))) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || w < 768) return "mobile";
  return "desktop";
}

function getContextPayload(event: AnalyticsEvent): Record<string, unknown> {
  if (event !== "page_view" || typeof window === "undefined") return {};
  const out: Record<string, unknown> = { device: detectDevice() };
  try {
    const ref = document.referrer;
    if (ref) {
      const refUrl = new URL(ref);
      if (refUrl.host && refUrl.host !== window.location.host) {
        out.referrer = refUrl.host;
      }
    }
    const params = new URLSearchParams(window.location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = params.get(k);
      if (v) out[k] = v;
    }
  } catch {
    // ignore
  }
  return out;
}

export function track(
  event: AnalyticsEvent,
  payload: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  const session_id = getSessionId();
  const path = window.location.pathname;
  const merged = { ...getContextPayload(event), ...payload };
  // Fire and forget - never block UI or surface errors
  void supabase
    .from("analytics_events")
    .insert({ event_type: event, payload: merged as never, session_id, path })
    .then(({ error }) => {
      if (error) console.debug("[analytics] insert failed", error.message);
    });
}

/** Track a page_view exactly once per mount + path change. */
export function usePageView(name: string): void {
  const lastRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastRef.current === name) return;
    lastRef.current = name;
    track("page_view", { name });
  }, [name]);
}

/** Debounced tracker — useful for filter changes that fire on every keystroke. */
export function useDebouncedTrack<T>(
  event: AnalyticsEvent,
  value: T,
  toPayload: (v: T) => Record<string, unknown>,
  delayMs = 800,
): void {
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      track(event, toPayload(value));
    }, delayMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);
}
