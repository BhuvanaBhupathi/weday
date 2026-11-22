import {
  SIGNATURE_COLOR_PALETTE,
  hslToHex,
  nextSignatureColor,
  fallbackSignatureColor,
} from '@friday/types';

export { SIGNATURE_COLOR_PALETTE, hslToHex, nextSignatureColor, fallbackSignatureColor };

/**
 * Prisma user select that also fetches the user's band-scoped signature
 * color, so responses can flatten it onto the author object.
 */
export function bandUserSelect(bandId: string) {
  return {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bandMemberships: {
        where: { bandId },
        select: { signatureColor: true },
      },
    },
  };
}

/**
 * Flattens a user object (from `bandUserSelect`) by lifting
 * `bandMemberships[0].signatureColor` onto `signatureColor`.
 */
export function flattenAuthor(raw: any) {
  if (!raw) return null;
  const { bandMemberships, ...user } = raw;
  return { ...user, signatureColor: bandMemberships?.[0]?.signatureColor ?? null };
}
