const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export function resizedDimensions(width: number, height: number, maxDimension = MAX_DIMENSION) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function jpegName(name: string) {
  return `${name.replace(/\.[^./\\]+$/, "") || "bukti"}.jpg`;
}

/**
 * Shrinks a JPG/PNG photo so its longest side is at most 1600px and re-encodes
 * it as JPEG. Other files, and images the browser cannot decode, are returned
 * unchanged, as is any image whose re-encoded copy would not be smaller.
 */
export async function resizeImageForUpload(file: File, maxDimension = MAX_DIMENSION): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const { width, height } = resizedDimensions(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG has no alpha channel; paint transparent PNG areas white instead of black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
