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
  const rangeStart = toDateStr(startDate);

  const [recipes, plannedMeals] = await Promise.all([
    prisma.recipe.findMany({ orderBy: { title: "asc" } }),
    prisma.plannedMeal.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { recipe: true },
    }),
  ]);

  const mealByDate = new Map(plannedMeals.map((m) => [toDateStr(m.date), m]));
  const dateList = Array.from({ length: dayCount }, (_, i) => addDays(startDate, i));
  const assignedCount = dateList.filter((d) => mealByDate.has(toDateStr(d))).length;

  const prevStart = toDateStr(addDays(startDate, -7));
  const nextStart = toDateStr(addDays(startDate, 7));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px]">
            Week of{" "}
            {startDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </h1>
          <p className="text-[13px] opacity-60">
            {assignedCount} of {dayCount} dinners assigned
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="o-pill gap-2 border border-divider bg-surface px-2 py-1">
            <Link
              href={`/planner?start=${prevStart}&days=${dayCount}`}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-divider"
              aria-label="Previous week"
            >
              ‹
            </Link>
            <span className="px-2 text-sm">
              {startDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} –{" "}
              {endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
            </span>
            <Link
              href={`/planner?start=${nextStart}&days=${dayCount}`}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-divider"
              aria-label="Next week"
            >
              ›
            </Link>
          </div>
          <Link
            href={`/grocery-list?start=${rangeStart}&days=${dayCount}`}
            className="o-pill bg-accent text-bg"
          >
            Open grocery list
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

      {recipes.length === 0 && (
        <p className="opacity-60">
          Your library is empty.{" "}
          <Link href="/recipes/new" className="text-accent-700 hover:underline">
            Add a recipe
          </Link>{" "}
          before planning dinners.
        </p>
      )}

      <div className="grid grid-cols-1 gap-[13.2px] sm:grid-cols-2 lg:grid-cols-7">
        {dateList.map((date) => {
          const dateStr = toDateStr(date);
          const meal = mealByDate.get(dateStr);
          const boundSet = setPlannedMeal.bind(null, dateStr);
          const boundClear = clearPlannedMeal.bind(null, dateStr);

          return (
            <div key={dateStr} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-[14px]">
                  {date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                </span>
                <span className="text-[11px] opacity-50">
                  {date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
              </div>

              {meal ? (
                <div
                  className="o-card flex flex-col gap-1 shadow-sm"
                  style={{ borderRadius: "22px", padding: "14px", minHeight: "132px" }}
                >
                  <Link
                    href={`/recipes/${meal.recipeId}`}
                    className="font-heading text-[15px] leading-[1.2] hover:underline"
                  >
                    {meal.recipe.title}
                  </Link>
                  <span className="text-[11px] opacity-55">
                    {[
                      meal.recipe.cookTimeMinutes != null ? `${meal.recipe.cookTimeMinutes} min` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                    <form action={boundSet} className="flex items-center gap-1">
                      <select
                        name="recipeId"
                        defaultValue={meal.recipeId}
                        className="o-input bg-bg py-1 text-xs"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="text-xs text-accent-700 hover:underline">
                        Swap
                      </button>
                    </form>
                    <form action={boundClear}>
                      <button type="submit" className="text-xs hover:underline" style={{ color: "#8c2f11" }}>
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 border border-dashed"
                  style={{
                    borderRadius: "22px",
                    padding: "14px",
                    minHeight: "132px",
                    borderColor: "color-mix(in srgb, var(--color-text) 28%, transparent)",
                  }}
                >
                  {recipes.length === 0 ? (
                    <span className="text-xs opacity-40">No recipes available</span>
                  ) : (
                    <form action={boundSet} className="flex flex-col items-center gap-2">
                      <select
                        name="recipeId"
                        defaultValue=""
                        required
                        className="o-input bg-bg text-xs"
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
                      <button type="submit" className="text-[13px] text-accent-700">
                        + Assign a dinner
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {recipes.length > 0 && (
        <div className="o-card flex flex-col gap-3">
          <span className="font-heading text-[15px]">Drag in from your library</span>
          <div className="flex flex-wrap gap-2">
            {recipes.map((r) => {
              const nextEmpty = dateList.find((d) => !mealByDate.has(toDateStr(d)));
              const boundAssign = nextEmpty
                ? setPlannedMeal.bind(null, toDateStr(nextEmpty))
                : null;
              return (
                <form key={r.id} action={boundAssign ?? undefined}>
                  <input type="hidden" name="recipeId" value={r.id} />
                  <button
                    type="submit"
                    disabled={!boundAssign}
                    className="rounded-full border border-divider bg-bg px-3.5 py-1.5 text-sm cursor-grab disabled:cursor-default disabled:opacity-40"
                  >
                    {r.title}
                    {r.cookTimeMinutes != null && (
                      <span className="ml-1.5 opacity-55">· {r.cookTimeMinutes} min</span>
                    )}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
