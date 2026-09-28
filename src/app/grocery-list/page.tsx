import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingBasket,
  SlidersHorizontal,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { aggregateIngredients } from "@/lib/groceryList";
import GroceryChecklist, { type ChecklistRow } from "./GroceryChecklist";
import { addManualItem } from "./actions";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

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

const shortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

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
  const prevStart = toDateStr(addDays(startDate, -7));
  const nextStart = toDateStr(addDays(startDate, 7));

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5 md:gap-6">
      <PageHeader
        title="Grocery list"
        subtitle={`${plannedMeals.length} ${plannedMeals.length === 1 ? "dinner" : "dinners"} · ${shortDate(startDate)} – ${shortDate(endDate)}`}
        actions={
          <>
            <div className="flex items-center rounded-full border border-divider bg-surface/60 p-1">
              <Link
                href={`/grocery-list?start=${prevStart}&days=${dayCount}`}
                className="o-icon-btn h-9 w-9"
                aria-label="Previous week"
              >
                <ChevronLeft strokeWidth={2.75} size={18} />
              </Link>
              <Link
                href={`/planner?start=${rangeStart}&days=${dayCount}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-accent-700 hover:bg-surface"
              >
                <CalendarDays strokeWidth={2.5} size={14} />
                Edit plan
              </Link>
              <Link
                href={`/grocery-list?start=${nextStart}&days=${dayCount}`}
                className="o-icon-btn h-9 w-9"
                aria-label="Next week"
              >
                <ChevronRight strokeWidth={2.75} size={18} />
              </Link>
            </div>
          </>
        }
      />

      <form
        action={boundAddManualItem}
        className="flex items-center gap-1.5 rounded-full border border-divider bg-surface p-1.5 pl-4 shadow-sm focus-within:border-accent"
      >
        <Plus strokeWidth={2.75} size={16} className="shrink-0 opacity-50" />
        <input
          id="add-name"
          name="name"
          placeholder="Add an item (e.g. paper towels)"
          aria-label="Item name"
          required
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:opacity-50"
        />
        <input
          name="quantity"
          placeholder="Qty"
          aria-label="Quantity"
          inputMode="decimal"
          autoComplete="off"
          className="w-12 min-w-0 rounded-full bg-bg px-2 py-2 text-center text-sm outline-none sm:w-16"
        />
        <input
          name="unit"
          placeholder="Unit"
          aria-label="Unit"
          autoComplete="off"
          className="w-12 min-w-0 rounded-full bg-bg px-2 py-2 text-center text-sm outline-none sm:w-20"
        />
        <SubmitButton pendingLabel={null} className="o-pill o-primary shrink-0 px-4">
          Add
        </SubmitButton>
      </form>

      {plannedMeals.length === 0 && generated.length === 0 && manualItems.length === 0 ? (
        <div className="o-card flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-2-100 text-accent-2-700">
            <ShoppingBasket strokeWidth={2.5} size={22} />
          </span>
          <p className="font-heading text-[18px]">Nothing to buy yet</p>
          <p className="max-w-sm text-sm opacity-65">
            Plan some dinners for this week and their ingredients show up here automatically — or add
            items above.
          </p>
          <Link href={`/planner?start=${rangeStart}&days=${dayCount}`} className="o-pill o-primary">
            <CalendarDays strokeWidth={2.5} size={15} />
            Plan dinners
          </Link>
        </div>
      ) : (
        <GroceryChecklist
          key={rows.map((r) => `${r.key}:${r.checked}`).join(",")}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          items={rows}
        />
      )}

      {plannedMeals.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] opacity-70">For these dinners</h2>
          <div className="o-scroll-x -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
              {[...plannedMeals]
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((m) => (
                  <Link
                    key={m.id}
                    href={`/recipes/${m.recipeId}`}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full border border-divider px-3.5 py-2 text-sm hover:bg-surface"
                  >
                    <span className="text-xs font-semibold text-accent-700">
                      {m.date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                    </span>
                    {m.recipe.title}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <details className="text-sm">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-1 py-1 opacity-70 hover:opacity-100">
          <SlidersHorizontal strokeWidth={2.5} size={14} />
          Custom range
        </summary>
        <form className="o-card mt-2 flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1">
            <label htmlFor="start" className="text-xs font-semibold">
              Start date
            </label>
            <input
              id="start"
              name="start"
              type="date"
              defaultValue={rangeStart}
              className="o-input bg-bg"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="days" className="text-xs font-semibold">
              Days (1-7)
            </label>
            <input
              id="days"
              name="days"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              defaultValue={dayCount}
              className="o-input w-24 bg-bg"
            />
          </div>
          <button type="submit" className="o-pill o-quiet">
            View
          </button>
        </form>
      </details>
    </div>
  );
}
