/**
 * Public base URL for the site, without a trailing slash.
 *
 * Defaults to the production domain. Override with VITE_SITE_URL (e.g. the
 * demo address) — every canonical/og:url/og:image/hreflang/sitemap value is
 * derived from this single constant.
 */
const FALLBACK_SITE_URL = "https://spacefinder.lib.kth.se";

const raw =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) || FALLBACK_SITE_URL;

export const SITE_URL = String(raw).replace(/\/+$/, "");

/** Absolute URL for a path on this site. */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
