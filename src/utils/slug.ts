import slugifyLib from 'slugify';
import { randomBytes } from 'node:crypto';

export function makeSlug(input: string): string {
  const base = slugifyLib(input, { lower: true, strict: true, trim: true });
  return base || randomBytes(4).toString('hex');
}

/**
 * Returns a slug guaranteed unique relative to the supplied predicate.
 * Tries `base`, then `base-2`, `base-3`, …; falls back to a random suffix
 * after 50 attempts to defend against pathological collisions.
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }

  let attempts = 0;
  while (attempts < 5) {
    const candidate = `${base}-${randomBytes(3).toString('hex')}`;
    if (!(await exists(candidate))) return candidate;
    attempts++;
  }

  throw new Error(`Could not generate unique slug for "${base}"`);
}
