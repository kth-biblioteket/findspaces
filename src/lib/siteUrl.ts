/**
 * Public base URL for the site, without a trailing slash.
 *
 * Set VITE_SITE_URL (e.g. https://spacefinder.lib.kth.se) when the service
 * moves to its own domain — every canonical/og:url/og:image/hreflang value is
 * derived from this single constant.
 */
const FALLBACK_SITE_URL = "https://hitta-studieplats-demo.lovable.app";

const raw =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) || FALLBACK_SITE_URL;

export const SITE_URL = String(raw).replace(/\/+$/, "");

/** Absolute URL for a path on this site. */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
