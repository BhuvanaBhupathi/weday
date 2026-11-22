import {
  SIGNATURE_COLOR_PALETTE,
  fallbackSignatureColor,
} from '@friday/types';

export { SIGNATURE_COLOR_PALETTE, fallbackSignatureColor };

/**
 * Resolves the display color for a user's action in a Band: prefers the
 * band-scoped signature color returned by the API, falling back to a
 * deterministic color derived from the user's identity.
 */
export function signatureColorFor(
  author:
    | {
        signatureColor?: string | null;
        id?: string | null;
        username?: string | null;
      }
    | null
    | undefined,
): string {
  if (author?.signatureColor) return author.signatureColor;
  return fallbackSignatureColor(author?.id || author?.username || 'unknown');
}

/**
 * Builds a userId → signature color map from a band members list
 * (as returned by GET /bands/:bandId/members).
 */
export function colorMapFromMembers(
  members: Array<{ user?: { id?: string | null }; signatureColor?: string | null }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of members ?? []) {
    const id = m.user?.id;
    if (id) map[id] = m.signatureColor || fallbackSignatureColor(id);
  }
  return map;
}
