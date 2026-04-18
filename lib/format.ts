export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatAmountFromPathSegment(amountSegment: string): {
  value: number;
  cents: number;
  normalized: string;
} | null {
  const normalized = amountSegment.replace(",", ".");
  const value = Number.parseFloat(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const cents = Math.round(value * 100);
  return {
    value,
    cents,
    normalized,
  };
}

export function titleFromUsername(username: string) {
  return username
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
