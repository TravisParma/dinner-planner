export type AggregatedItem = {
  itemKey: string;
  name: string;
  unit: string;
  quantity: string;
};

type IngredientLike = {
  name: string;
  quantity: string | null;
  unit: string | null;
};

function parseQuantity(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);

  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);

  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

  return null;
}

function formatQuantity(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

export function itemKeyFor(name: string, unit: string): string {
  return `${unit.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
}

/**
 * Naive combination: groups by (unit, name) and sums parseable quantities.
 * No unit conversion — "1 cup" and "200 g" of the same ingredient stay separate
 * groups, per the product decision to keep this flat/naive for v1.
 */
export function aggregateIngredients(ingredients: IngredientLike[]): AggregatedItem[] {
  const groups = new Map<
    string,
    { name: string; unit: string; numericSum: number; hasNumeric: boolean; extras: string[] }
  >();

  for (const ing of ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const unit = (ing.unit ?? "").trim();
    const key = itemKeyFor(name, unit);

    if (!groups.has(key)) {
      groups.set(key, { name, unit, numericSum: 0, hasNumeric: false, extras: [] });
    }
    const group = groups.get(key)!;

    const qtyRaw = (ing.quantity ?? "").trim();
    if (qtyRaw) {
      const parsed = parseQuantity(qtyRaw);
      if (parsed != null) {
        group.numericSum += parsed;
        group.hasNumeric = true;
      } else if (!group.extras.includes(qtyRaw)) {
        group.extras.push(qtyRaw);
      }
    }
  }

  return [...groups.entries()]
    .map(([itemKey, g]) => {
      const parts: string[] = [];
      if (g.hasNumeric) parts.push(formatQuantity(g.numericSum));
      parts.push(...g.extras);
      return { itemKey, name: g.name, unit: g.unit, quantity: parts.join(" + ") };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
