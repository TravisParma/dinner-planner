import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setPlannedMeal, clearPlannedMeal } from "./actions";

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

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; days?: string }>;
}) {
  const { start, days } = await searchParams;
  const startDate = parseStartParam(start);
  const dayCount = Math.min(7, Math.max(1, Number.parseInt(days ?? "7", 10) || 7));
  const endDate = addDays(startDate, dayCount - 1);

  const [recipes, plannedMeals] = await Promise.all([
    prisma.recipe.findMany({ orderBy: { title: "asc" } }),
    prisma.plannedMeal.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { recipe: true },
    }),
  ]);

  const mealByDate = new Map(plannedMeals.map((m) => [toDateStr(m.date), m]));
  const dateList = Array.from({ length: dayCount }, (_, i) => addDays(startDate, i));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dinner Planner</h1>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="start" className="font-medium">
            Start date
          </label>
          <input
            id="start"
            name="start"
            type="date"
            defaultValue={toDateStr(startDate)}
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
          href={`/grocery-list?start=${toDateStr(startDate)}&days=${dayCount}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Grocery list for this range
        </Link>
      </form>

      {recipes.length === 0 && (
        <p className="text-zinc-500">
          Your library is empty.{" "}
          <Link href="/recipes/new" className="text-blue-600 hover:underline">
            Add a recipe
          </Link>{" "}
          before planning dinners.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
        {dateList.map((date) => {
          const dateStr = toDateStr(date);
          const meal = mealByDate.get(dateStr);
          const boundSet = setPlannedMeal.bind(null, dateStr);
          const boundClear = clearPlannedMeal.bind(null, dateStr);

          return (
            <li
              key={dateStr}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="font-medium">
                {date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </div>

              {recipes.length === 0 ? (
                <span className="text-sm text-zinc-400">No recipes available</span>
              ) : meal ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/recipes/${meal.recipeId}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {meal.recipe.title}
                  </Link>
                  <form action={boundSet} className="flex items-center gap-1">
                    <select
                      name="recipeId"
                      defaultValue={meal.recipeId}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm"
                    >
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100"
                    >
                      Swap
                    </button>
                  </form>
                  <form action={boundClear}>
                    <button
                      type="submit"
                      className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ) : (
                <form action={boundSet} className="flex items-center gap-2">
                  <select
                    name="recipeId"
                    defaultValue=""
                    required
                    className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  >
                    <option value="" disabled>
                      Choose a recipe…
                    </option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Assign
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
