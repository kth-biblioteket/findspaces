/**
 * Auto-crop, resize and convert a user-supplied image (JPG/PNG/WebP)
 * to a WebP blob at 1600×1067 (3:2) that stays under ~250 kB.
 *
 * Center-crops to 3:2 aspect ratio, then encodes with adaptive quality.
 * Runs entirely in the browser.
 */

const TARGET_W = 1600;
const TARGET_H = 1067;
const MAX_BYTES = 250 * 1024;

export type ProcessedImage = {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  size: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunde inte läsa bildfilen"));
    };
    img.src = url;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("WebP-konvertering misslyckades"))),
      "image/webp",
      quality,
    );
  });
}

export async function processImageToWebp(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Filen är inte en bild");
  }

  const img = await loadImage(file);

  // Center-crop to 3:2 aspect ratio.
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = TARGET_W / TARGET_H;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (srcRatio > targetRatio) {
    // Source is wider — crop sides.
    sw = Math.round(img.naturalHeight * targetRatio);
    sx = Math.round((img.naturalWidth - sw) / 2);
  } else if (srcRatio < targetRatio) {
    // Source is taller — crop top/bottom.
    sh = Math.round(img.naturalWidth / targetRatio);
    sy = Math.round((img.naturalHeight - sh) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunde inte skapa canvas-kontext");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

  // Adaptive quality: start at 0.85, step down until under budget.
  const qualities = [0.85, 0.78, 0.72, 0.66, 0.6, 0.55, 0.5];
  let blob: Blob | null = null;
  for (const q of qualities) {
    const b = await canvasToWebp(canvas, q);
    if (b.size <= MAX_BYTES) {
      blob = b;
      break;
    }
    blob = b;
  }
  if (!blob) throw new Error("Kunde inte skapa WebP-blob");

  const baseName = file.name.replace(/\.[^.]+$/, "") || "bild";
  const outFile = new File([blob], `${baseName}.webp`, { type: "image/webp" });

  return {
    blob,
    file: outFile,
    width: TARGET_W,
    height: TARGET_H,
    size: blob.size,
  };
}
