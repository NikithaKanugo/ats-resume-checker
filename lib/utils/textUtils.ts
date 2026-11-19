/**
 * textUtils.ts
 *
 * Stateless utility functions used across the application.
 * No domain logic — only generic string/data helpers.
 */

/**
 * Generate a UUID v4 using the Web Crypto API (available in Node 19+ and all browsers).
 * Next.js edge and Node runtimes both support this.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Return the current UTC time as an ISO 8601 datetime string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Truncate a string to `maxLength` characters, appending `…` if cut.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
