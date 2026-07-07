/**
 * Rewrite a Supabase Storage public URL to use the on-the-fly image
 * transformer, which returns a resized WebP variant. Non-Supabase URLs
 * (or already-transformed URLs) pass through unchanged.
 *
 * See: https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export function optimizedImageUrl(
  url: string | null | undefined,
  width: number,
  opts?: { quality?: number; resize?: "cover" | "contain" | "fill" },
): string {
  if (!url) return "";
  // Only rewrite Supabase Storage public URLs; leave everything else alone.
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  if (url.includes("/storage/v1/render/image/")) return url;

  const base = url.slice(0, i) + "/storage/v1/render/image/public/" + url.slice(i + marker.length);
  const params = new URLSearchParams();
  params.set("width", String(Math.round(width)));
  params.set("resize", opts?.resize ?? "cover");
  params.set("quality", String(opts?.quality ?? 75));
  const sep = base.includes("?") ? "&" : "?";
  return base + sep + params.toString();
}

/**
 * Build a `srcset` string for responsive images. Widths are typical card
 * sizes on mobile and desktop DPR=2 screens.
 */
export function optimizedImageSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 640, 960, 1280],
): string {
  if (!url) return "";
  return widths
    .map((w) => `${optimizedImageUrl(url, w)} ${w}w`)
    .join(", ");
}
