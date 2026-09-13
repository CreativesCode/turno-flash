/**
 * Downscales a photo before uploading it.
 *
 * A photo taken with a phone is 4-8 MB and 4000px wide; what the booking page
 * shows is a card-sized image. Sending the original would hit the bucket's
 * 5 MB limit and cost the customer their data plan for nothing.
 */
export async function downscaleImage(
  file: File,
  maxSize = 1600,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  // Already small enough and in a format the bucket accepts: leave it alone.
  if (scale === 1 && file.size <= 1_000_000 && file.type === "image/jpeg") {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}
