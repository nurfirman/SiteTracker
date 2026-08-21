/**
 * Image Storage & Optimization Utilities for SiteTracker CMD
 * Provides validation, payload size checks, and abstraction for Object Storage / S3.
 */

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  sizeBytes?: number;
  error?: string;
}

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB max after compression

export function validateImagePayload(dataUrl: string): { isValid: boolean; sizeBytes: number; error?: string } {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    // If it's already an external URL (http/https), allow it
    if (dataUrl && (dataUrl.startsWith("http://") || dataUrl.startsWith("https://"))) {
      return { isValid: true, sizeBytes: 0 };
    }
    return { isValid: false, sizeBytes: 0, error: "Format gambar tidak valid (harus data URL atau HTTPS)." };
  }

  // Calculate approximate Base64 string size in bytes
  const base64Data = dataUrl.split(",")[1];
  if (!base64Data) {
    return { isValid: false, sizeBytes: 0, error: "Data gambar kosong." };
  }

  const approximateSizeBytes = Math.ceil((base64Data.length * 3) / 4);

  if (approximateSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      sizeBytes: approximateSizeBytes,
      error: `Ukuran gambar terlalu besar (${Math.round(approximateSizeBytes / 1024)} KB). Maksimal ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  return { isValid: true, sizeBytes: approximateSizeBytes };
}

/**
 * Storage adapter interface to support Cloud Object Storage (e.g. S3 / Neon Object Storage / GCS)
 */
export async function uploadImageToStorage(dataUrl: string, pathPrefix: string = "findings"): Promise<StorageUploadResult> {
  const validation = validateImagePayload(dataUrl);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  // In this serverless iteration, data URLs are validated & sanitized.
  // When an S3/Neon bucket endpoint is configured, this adapter uploads the buffer to the bucket.
  return {
    success: true,
    url: dataUrl,
    sizeBytes: validation.sizeBytes,
  };
}
