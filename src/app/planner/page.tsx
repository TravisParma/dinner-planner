import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Plus, ShoppingBasket, SlidersHorizontal, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";
import { setPlannedMeal, clearPlannedMeal } from "./actions";

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parseStartParam(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return todayUTC();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

const shortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

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
  const todayStr = toDateStr(todayUTC());

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
  const nextEmpty = dateList.find((d) => !mealByDate.has(toDateStr(d)));

  const prevStart = toDateStr(addDays(startDate, -7));
  const nextStart = toDateStr(addDays(startDate, 7));
  const isCurrentWeek = rangeStart === todayStr;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PageHeader
        title={`Week of ${shortDate(startDate)}`}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="flex gap-0.5" aria-hidden>
              {dateList.map((d) => (
                <span
                  key={toDateStr(d)}
                  className={`h-1.5 w-4 rounded-full ${
                    mealByDate.has(toDateStr(d)) ? "bg-accent" : "bg-surface"
                  }`}
                />
              ))}
            </span>
            {assignedCount} of {dayCount} dinners planned
          </span>
        }
        actions={
          <>
            <div className="flex items-center rounded-full border border-divider bg-surface/60 p-1">
              <Link
                href={`/planner?start=${prevStart}&days=${dayCount}`}
                className="o-icon-btn h-9 w-9"
                aria-label="Previous week"
              >
                <ChevronLeft strokeWidth={2.75} size={18} />
              </Link>
              {isCurrentWeek ? (
                <span className="hidden whitespace-nowrap px-2 text-sm sm:inline">
                  {shortDate(startDate)} – {shortDate(endDate)}
                </span>
              ) : (
                <Link
                  href={`/planner?days=${dayCount}`}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-accent-700 hover:bg-surface"
                >
                  Today
                </Link>
              )}
              <Link
                href={`/planner?start=${nextStart}&days=${dayCount}`}
                className="o-icon-btn h-9 w-9"
                aria-label="Next week"
              >
                <ChevronRight strokeWidth={2.75} size={18} />
              </Link>
            </div>
            <Link
              href={`/grocery-list?start=${rangeStart}&days=${dayCount}`}
              className="o-pill o-primary"
            >
              <ShoppingBasket strokeWidth={2.5} size={16} />
              Grocery list
            </Link>
          </>
        }
      />

      <details className="group text-sm">
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

      {recipes.length === 0 && (
        <p className="o-card text-sm">
          Your library is empty.{" "}
          <Link href="/recipes/new" className="text-accent-700 hover:underline">
            Add a recipe
          </Link>{" "}
          before planning dinners.
        </p>
      )}

      <div
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
          dayCount === 7 ? "xl:grid-cols-7" : "xl:grid-cols-4"
        }`}
      >
        {dateList.map((date) => {
          const dateStr = toDateStr(date);
          const meal = mealByDate.get(dateStr);
          const isToday = dateStr === todayStr;
          const boundSet = setPlannedMeal.bind(null, dateStr);
          const boundClear = clearPlannedMeal.bind(null, dateStr);

          return (
            <div
              key={dateStr}
              className={`flex gap-3 rounded-[24px] p-3 xl:flex-col xl:gap-2 ${
                meal ? "bg-surface shadow-sm" : "border border-dashed border-divider"
              } ${isToday ? "ring-2 ring-accent/70" : ""}`}
            >
              {/* Date badge: vertical column on phones, inline header at xl. */}
              <div
                className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-[18px] py-2 xl:w-auto xl:flex-row xl:items-baseline xl:justify-start xl:gap-1.5 xl:bg-transparent xl:px-1 xl:py-0 ${
                  isToday ? "bg-accent text-on-accent xl:text-accent-700" : "bg-bg"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80 xl:text-[13px] xl:font-heading xl:normal-case xl:tracking-normal xl:opacity-100">
                  {date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                </span>
                <span className="font-heading text-[22px] leading-none xl:hidden">
                  {date.getUTCDate()}
                </span>
                <span className="hidden text-[11px] opacity-60 xl:inline">
                  {shortDate(date)}
                  {isToday && " · today"}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 xl:min-h-[120px]">
                {meal ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/recipes/${meal.recipeId}`}
                          className="font-heading text-[16px] leading-[1.2] hover:underline xl:text-[15px]"
                        >
                          {meal.recipe.title}
                        </Link>
                        {meal.recipe.cookTimeMinutes != null && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11.5px] opacity-60">
                            <Clock strokeWidth={2.5} size={11} />
                            {meal.recipe.cookTimeMinutes} min
                          </span>
                        )}
                      </div>
                      <form action={boundClear}>
                        <SubmitButton
                          className="o-icon-btn -mr-1 -mt-1 h-8 w-8 opacity-50 hover:opacity-100"
                          aria-label={`Remove ${meal.recipe.title}`}
                          pendingLabel={null}
                        >
                          <X strokeWidth={2.75} size={15} />
                        </SubmitButton>
                      </form>
                    </div>
                    <form action={boundSet} className="mt-auto flex items-center gap-1.5 xl:flex-col xl:items-stretch">
                      <select
                        name="recipeId"
                        defaultValue={meal.recipeId}
                        aria-label="Swap recipe"
                        className="o-input min-h-[36px] w-full flex-1 bg-bg py-1 pl-3 pr-1 text-xs"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">
                        Swap
                      </SubmitButton>
                    </form>
                  </>
                ) : recipes.length === 0 ? (
                  <span className="text-xs opacity-40">No recipes available</span>
                ) : (
                  <form action={boundSet} className="flex items-center gap-1.5 xl:flex-col xl:items-stretch">
                    <select
                      name="recipeId"
                      defaultValue=""
                      required
                      aria-label={`Choose a dinner for ${shortDate(date)}`}
                      className="o-input min-h-[36px] w-full flex-1 bg-bg py-1 pl-3 pr-1 text-xs"
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
                    <SubmitButton className="flex shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">
                      <Plus strokeWidth={2.75} size={13} />
                      Add
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {recipes.length > 0 && (
        <section className="o-card flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px]">Quick add</h2>
            <span className="text-xs opacity-60">
              {nextEmpty
                ? `Tap a recipe to put it on ${nextEmpty.toLocaleDateString(undefined, {
                    weekday: "long",
                    timeZone: "UTC",
                  })}`
                : "Every night is planned"}
            </span>
          </div>
          <div className="o-scroll-x -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
              {recipes.map((r) => {
                const boundAssign = nextEmpty
                  ? setPlannedMeal.bind(null, toDateStr(nextEmpty))
                  : null;
                return (
                  <form key={r.id} action={boundAssign ?? undefined}>
                    <input type="hidden" name="recipeId" value={r.id} />
                    <SubmitButton
                      disabled={!boundAssign}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-divider bg-bg px-3.5 py-2 text-sm transition-colors hover:border-accent hover:bg-accent-100 disabled:opacity-40 disabled:hover:bg-bg"
                    >
                      {r.title}
                      {r.cookTimeMinutes != null && (
                        <span className="opacity-55">· {r.cookTimeMinutes} min</span>
                      )}
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
