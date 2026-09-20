import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { aggregateIngredients } from "@/lib/groceryList";
import GroceryChecklist, { type ChecklistRow } from "./GroceryChecklist";
import { addManualItem } from "./actions";

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseStartParam(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export default async function GroceryListPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; days?: string }>;
}) {
  const { start, days } = await searchParams;
  const startDate = parseStartParam(start);
  const dayCount = Math.min(7, Math.max(1, Number.parseInt(days ?? "7", 10) || 7));
  const endDate = addDays(startDate, dayCount - 1);
  const rangeStart = toDateStr(startDate);
  const rangeEnd = toDateStr(endDate);

  const [plannedMeals, savedItems] = await Promise.all([
    prisma.plannedMeal.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { recipe: { include: { ingredients: true } } },
    }),
    prisma.groceryListItem.findMany({ where: { rangeStart, rangeEnd } }),
  ]);

  const allIngredients = plannedMeals.flatMap((m) => m.recipe.ingredients);
  const generated = aggregateIngredients(allIngredients);

  const overrideByKey = new Map(
    savedItems.filter((i) => i.itemKey).map((i) => [i.itemKey as string, i])
  );
  const manualItems = savedItems.filter((i) => !i.itemKey);

  const rows: ChecklistRow[] = [
    ...generated
      .filter((g) => !overrideByKey.get(g.itemKey)?.removed)
      .map((g) => ({
        key: `g:${g.itemKey}`,
        name: g.name,
        unit: g.unit,
        quantity: g.quantity,
        checked: overrideByKey.get(g.itemKey)?.checked ?? false,
        kind: "generated" as const,
        itemKey: g.itemKey,
      })),
    ...manualItems.map((m) => ({
      key: `m:${m.id}`,
      name: m.name,
      unit: m.unit ?? "",
      quantity: m.quantity ?? "",
      checked: m.checked,
      kind: "manual" as const,
      id: m.id,
    })),
  ];

  const gatheredCount = rows.filter((r) => r.checked).length;
  const progressPct = rows.length > 0 ? Math.round((gatheredCount / rows.length) * 100) : 0;

  const boundAddManualItem = addManualItem.bind(null, rangeStart, rangeEnd);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px]">Grocery list</h1>
          <p className="text-[13px] opacity-60">
            From {plannedMeals.length} dinners,{" "}
            {startDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} –{" "}
            {endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {gatheredCount} of {rows.length} gathered
            </span>
            <div className="h-[8px] w-[180px] rounded-full bg-surface">
              <div
                className="h-[8px] rounded-full bg-accent-2-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <Link
            href={`/planner?start=${rangeStart}&days=${dayCount}`}
            className="text-sm text-accent-700 hover:underline"
          >
            Edit this week&apos;s plan
          </Link>
        </div>
      </div>

      <details className="text-sm opacity-70">
        <summary className="cursor-pointer">Custom range</summary>
        <form className="mt-2 flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1">
            <label htmlFor="start" className="text-xs font-medium">
              Start date
            </label>
            <input
              id="start"
              name="start"
              type="date"
              defaultValue={rangeStart}
              className="o-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="days" className="text-xs font-medium">
              Days (1-7)
            </label>
            <input
              id="days"
              name="days"
              type="number"
              min={1}
              max={7}
              defaultValue={dayCount}
              className="o-input w-20"
            />
          </div>
          <button type="submit" className="o-pill border border-divider">
            View
          </button>
        </form>
      </details>

      {plannedMeals.length === 0 && generated.length === 0 && manualItems.length === 0 ? (
        <p className="opacity-60">
          No dinners planned for this range yet.{" "}
          <Link href={`/planner?start=${rangeStart}&days=${dayCount}`} className="text-accent-700 hover:underline">
            Plan some dinners
          </Link>{" "}
          to generate a list, or add items manually below.
        </p>
      ) : (
        <GroceryChecklist
          key={rows.map((r) => `${r.key}:${r.checked}`).join(",")}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          items={rows}
        />
      )}

      <form action={boundAddManualItem} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 min-w-[200px] flex-col gap-1">
          <label htmlFor="add-name" className="text-sm font-medium">
            Add item
          </label>
          <input
            id="add-name"
            name="name"
            placeholder="e.g. paper towels"
            required
            className="o-input w-full"
          />
        </div>
        <input
          name="quantity"
          placeholder="Qty"
          aria-label="Quantity"
          className="o-input"
          style={{ width: "80px" }}
        />
        <input
          name="unit"
          placeholder="Unit"
          aria-label="Unit"
          className="o-input"
          style={{ width: "90px" }}
        />
        <button type="submit" className="o-pill bg-accent text-bg">
          Add
        </button>
      </form>
    </div>
  );
}
