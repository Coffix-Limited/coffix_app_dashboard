import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadProgressCallback = (percent: number) => void;

function buildStoragePath(file: File): string {
  const safe = file.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
  return `products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;
}

export function uploadProductImage(
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type))
    return Promise.reject(new Error("Only PNG and JPEG images are accepted."));
  if (file.size > MAX_IMAGE_BYTES)
    return Promise.reject(new Error("Image must be 5 MB or smaller."));

  const task = uploadBytesResumable(ref(storage, buildStoragePath(file)), file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

export async function deleteProductImage(url: string): Promise<void> {
  if (!url?.includes("firebasestorage.googleapis.com")) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== "storage/object-not-found") throw err;
  }
}
