/**
 * Security & Input Sanitization Utilities for SiteTracker CMD
 */

export function sanitizeText(input?: string | null): string {
  if (!input) return "";

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

export function validateInputLength(input: string, minLength: number = 3, maxLength: number = 2000): { isValid: boolean; error?: string } {
  const sanitized = sanitizeText(input);
  if (sanitized.length < minLength) {
    return { isValid: false, error: `Teks minimal ${minLength} karakter.` };
  }
  if (sanitized.length > maxLength) {
    return { isValid: false, error: `Teks maksimal ${maxLength} karakter.` };
  }
  return { isValid: true };
}
