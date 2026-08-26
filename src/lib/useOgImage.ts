import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/siteUrl";

const SETTINGS_KEY = "og_image_url";

/** Bundled default preview image (used when no custom image is uploaded). */
export const DEFAULT_OG_IMAGE = "/og-preview.jpg?v=2";

/**
 * Absolute URL for the share preview image. Reads the admin-uploaded image
 * from app_settings; falls back to the bundled screenshot. Safe to call during
 * SSR — crawlers only see server-rendered head tags.
 */
export async function fetchOgImageUrl(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    const v = (data?.value ?? "").trim();
    if (!v) return siteUrl(DEFAULT_OG_IMAGE);
    return /^https?:\/\//i.test(v) ? v : siteUrl(v);
  } catch {
    return siteUrl(DEFAULT_OG_IMAGE);
  }
}

export function useOgImage() {
  return useQuery({
    queryKey: ["og-image"],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      const v = (data?.value ?? "").trim();
      return v || null;
    },
  });
}

export function useSaveOgImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (url: string | null) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTINGS_KEY, value: url ?? "" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["og-image"] }),
  });
}

/** Crop/resize an uploaded image to exactly 1200×630 JPEG (max ~600 kB). */
export async function processOgImage(file: File): Promise<File> {
  const W = 1200;
  const H = 630;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => {
      URL.revokeObjectURL(url);
      resolve(i);
    };
    i.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunde inte läsa bildfilen"));
    };
    i.src = url;
  });

  const srcRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = W / H;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (srcRatio > targetRatio) {
    sw = Math.round(img.naturalHeight * targetRatio);
    sx = Math.round((img.naturalWidth - sw) / 2);
  } else if (srcRatio < targetRatio) {
    sh = Math.round(img.naturalWidth / targetRatio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunde inte skapa canvas-kontext");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Kunde inte skapa bildfil"))),
      "image/jpeg",
      0.85,
    );
  });
  return new File([blob], `og-preview-${Date.now()}.jpg`, { type: "image/jpeg" });
}
