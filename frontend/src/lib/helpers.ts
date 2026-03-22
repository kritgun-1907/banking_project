/**
 * @file helpers.ts
 * @description Pure utility functions used across multiple components.
 *              No side effects, no React imports — just logic.
 */

/**
 * Generate a UUID v4 idempotency key.
 * Used by the transfer form to guarantee each transaction attempt
 * has a unique key (prevents double-charges on network retries).
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Return a time-appropriate greeting for the dashboard header.
 * @param name - User's display name
 */
export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

/**
 * Format a number as Indian Rupees (₹).
 * @param amount - Numeric value
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Truncate a MongoDB ObjectId for display (first 4 + last 4 characters).
 * @param id - Full 24-char hex string
 */
export function truncateId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
