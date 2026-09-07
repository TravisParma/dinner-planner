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

  const boundAddManualItem = addManualItem.bind(null, rangeStart, rangeEnd);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Grocery List</h1>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="start" className="font-medium">
            Start date
          </label>
          <input
            id="start"
            name="start"
            type="date"
            defaultValue={rangeStart}
            className="rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="days" className="font-medium">
            Days (1-7)
          </label>
          <input
            id="days"
            name="days"
            type="number"
            min={1}
            max={7}
            defaultValue={dayCount}
            className="w-20 rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100"
        >
          View
        </button>
        <Link
          href={`/planner?start=${rangeStart}&days=${dayCount}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Edit this week&apos;s plan
        </Link>
      </form>

      {plannedMeals.length === 0 && generated.length === 0 && manualItems.length === 0 ? (
        <p className="text-zinc-500">
          No dinners planned for this range yet.{" "}
          <Link href={`/planner?start=${rangeStart}&days=${dayCount}`} className="text-blue-600 hover:underline">
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

      <form action={boundAddManualItem} className="flex flex-wrap items-end gap-2 text-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="add-name" className="font-medium">
            Add item
          </label>
          <input
            id="add-name"
            name="name"
            placeholder="e.g. paper towels"
            required
            className="rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <input
          name="quantity"
          placeholder="Qty"
          aria-label="Quantity"
          className="w-16 rounded border border-zinc-300 px-2 py-1"
        />
        <input
          name="unit"
          placeholder="Unit"
          aria-label="Unit"
          className="w-20 rounded border border-zinc-300 px-2 py-1"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700"
        >
          Add
        </button>
      </form>
    </div>
  );
}
