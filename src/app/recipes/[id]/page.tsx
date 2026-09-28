import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  NotebookPen,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";
import LocalTime from "@/components/LocalTime";
import { setPlannedMeal } from "../../planner/actions";
import {
  addRecipeNote,
  deleteRecipe,
  deleteRecipeNote,
  markMadeToday,
  rateRecipe,
  toggleMakeAgain,
} from "../actions";

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseSteps(steps: string): string[] | null {
  const lines = steps
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return null;
  return lines.map((l) => l.replace(/^\d+[.)]\s*/, ""));
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { position: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!recipe) notFound();

  const now = new Date();
  const weekStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  // The whole coming week (not just this recipe's days) so the day picker can
  // show which nights are free vs. already taken by another dinner.
  const weekMeals = await prisma.plannedMeal.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    include: { recipe: { select: { title: true } } },
  });
  const mealByDate = new Map(weekMeals.map((m) => [m.date.toISOString().slice(0, 10), m]));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  const plannedThisWeek = weekMeals
    .filter((m) => m.recipeId === recipe.id)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const boundRate = rateRecipe.bind(null, recipe.id);
  const boundDelete = deleteRecipe.bind(null, recipe.id);
  const boundToggleMakeAgain = toggleMakeAgain.bind(
    null,
    recipe.id,
    recipe.makeAgain ?? false
  );
  const boundMarkMade = markMadeToday.bind(null, recipe.id);
  const boundAddNote = addRecipeNote.bind(null, recipe.id);

  const skillList = parseTags(recipe.skillTags);
  const cuisineList = parseTags(recipe.cuisineTags);
  const stepLines = recipe.steps ? parseSteps(recipe.steps) : null;

  const stats = [
    recipe.servings ? { icon: Users, label: "Serves", value: `${recipe.servings}` } : null,
    recipe.prepTimeMinutes != null
      ? { icon: Clock, label: "Prep", value: `${recipe.prepTimeMinutes} min` }
      : null,
    recipe.cookTimeMinutes != null
      ? { icon: Clock, label: "Cook", value: `${recipe.cookTimeMinutes} min` }
      : null,
    recipe.lastMadeAt
      ? {
          icon: CalendarDays,
          label: "Last made",
          value: recipe.lastMadeAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        }
      : null,
  ].filter((s) => s !== null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:gap-x-9">
      {/* Header — row 1, left column on desktop */}
      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <PageHeader
          back={{ href: "/recipes", label: "Recipes" }}
          title={recipe.title}
          inlineActions
          actions={
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="o-icon-btn o-quiet lg:hidden"
              aria-label="Edit recipe"
            >
              <Pencil strokeWidth={2.5} size={16} />
            </Link>
          }
        />

        {stats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-divider px-3.5 py-1.5 text-[13px]"
              >
                <Icon strokeWidth={2.5} size={14} className="text-accent-700" />
                <span className="opacity-60">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}

        {(skillList.length > 0 || cuisineList.length > 0 || recipe.sourceUrl) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {skillList.map((tag) => (
              <span key={`s-${tag}`} className="o-tag bg-accent-2-100 text-accent-2-800">
                {tag}
              </span>
            ))}
            {cuisineList.map((tag) => (
              <span key={`c-${tag}`} className="o-tag bg-accent-100 text-accent-800">
                {tag}
              </span>
            ))}
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 flex items-center gap-1 text-[13px] text-accent-700 hover:underline"
              >
                Original source
                <ExternalLink strokeWidth={2.5} size={12} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Rail — right column spanning both rows on desktop; sits between header
          and body on phones so rating/planning are reachable without scrolling
          past the whole recipe. */}
      <aside className="grid gap-3 sm:grid-cols-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid-cols-1 lg:self-start">
        <div className="o-card flex flex-col gap-3">
          <span className="o-kicker">Your take</span>
          <form action={boundRate} className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Rating</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="submit"
                  name="rating"
                  value={n}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[24px] leading-none transition-transform hover:scale-110 ${
                    recipe.rating && n <= recipe.rating ? "text-accent" : "opacity-25"
                  }`}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  aria-pressed={recipe.rating === n}
                >
                  ★
                </button>
              ))}
            </div>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <form action={boundToggleMakeAgain}>
              <SubmitButton
                aria-pressed={recipe.makeAgain ?? false}
                className={`o-pill w-full px-3 ${
                  recipe.makeAgain ? "bg-accent-2-200 text-accent-2-800" : "o-quiet"
                }`}
              >
                {recipe.makeAgain && <Check strokeWidth={2.75} size={15} />}
                Make again
              </SubmitButton>
            </form>
            <form action={boundMarkMade}>
              <SubmitButton className="o-pill o-quiet w-full px-3">Made today</SubmitButton>
            </form>
          </div>
        </div>

        <div className="o-card flex flex-col gap-3 sm:order-last sm:col-span-2 lg:order-none lg:col-span-1">
          <div className="flex items-baseline justify-between">
            <span className="o-kicker">Notes</span>
            {recipe.notes.length > 0 && (
              <span className="text-[12px] opacity-55">{recipe.notes.length}</span>
            )}
          </div>

          {recipe.notes.length > 0 && (
            <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
              {recipe.notes.map((note) => (
                <li key={note.id} className="group flex items-start gap-2 rounded-[16px] bg-bg px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">{note.body}</p>
                    <p className="mt-1 text-[11px] opacity-55">
                      <LocalTime iso={note.createdAt.toISOString()} />
                    </p>
                  </div>
                  <form action={deleteRecipeNote.bind(null, recipe.id, note.id)}>
                    <SubmitButton
                      confirm="Delete this note?"
                      pendingLabel={null}
                      className="o-icon-btn -mr-2 -mt-1.5 h-8 w-8 opacity-40 hover:opacity-100"
                      aria-label="Delete note"
                    >
                      <X strokeWidth={2.75} size={14} />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={boundAddNote} className="flex flex-col gap-2">
            <textarea
              name="body"
              required
              rows={2}
              maxLength={1000}
              placeholder={recipe.notes.length ? "Add another note…" : "e.g. Rose and Jake don't eat drumsticks"}
              aria-label="New note"
              className="w-full resize-y rounded-[16px] border border-divider bg-bg px-3.5 py-2.5 text-[14px] leading-[1.45] placeholder:opacity-50 focus:border-accent"
            />
            <SubmitButton pendingLabel="Saving…" className="o-pill o-quiet self-end px-4 py-2 text-[13px]">
              <NotebookPen strokeWidth={2.5} size={14} />
              Add note
            </SubmitButton>
          </form>
        </div>

        <div className="o-card flex flex-col gap-3">
          <span className="o-kicker">Plan it</span>
          <p className="text-sm">
            {plannedThisWeek
              ? `On the menu ${plannedThisWeek.date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}`
              : "Not planned this week — tap a night to add it."}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const dateStr = d.toISOString().slice(0, 10);
              const meal = mealByDate.get(dateStr);
              const isThis = meal?.recipeId === recipe.id;
              const boundSet = setPlannedMeal.bind(null, dateStr);
              const dayLabel = d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
              return (
                <form key={dateStr} action={boundSet}>
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <button
                    type="submit"
                    disabled={isThis}
                    title={
                      isThis
                        ? "Already planned"
                        : meal
                          ? `Replace ${meal.recipe.title}`
                          : `Plan for ${dayLabel}`
                    }
                    aria-label={
                      isThis
                        ? `${dayLabel}: planned`
                        : meal
                          ? `${dayLabel}: replace ${meal.recipe.title}`
                          : `${dayLabel}: plan this recipe`
                    }
                    className={`flex w-full flex-col items-center gap-0.5 rounded-[14px] py-2 text-[11px] transition-colors ${
                      isThis
                        ? "bg-accent text-on-accent"
                        : meal
                          ? "bg-bg opacity-60 hover:opacity-100"
                          : "border border-dashed border-divider hover:bg-accent-100"
                    }`}
                  >
                    <span>{dayLabel.slice(0, 2)}</span>
                    <span className="font-heading text-[14px]">{d.getUTCDate()}</span>
                    <span
                      className={`h-1 w-1 rounded-full ${
                        meal ? (isThis ? "bg-on-accent" : "bg-text") : "bg-transparent"
                      }`}
                    />
                  </button>
                </form>
              );
            })}
          </div>
          <Link href="/planner" className="text-[13px] text-accent-700 hover:underline">
            Open the planner →
          </Link>
        </div>

        <div className="hidden gap-2 sm:col-span-2 lg:col-span-1 lg:flex">
          <Link href={`/recipes/${recipe.id}/edit`} className="o-pill o-quiet flex-1">
            <Pencil strokeWidth={2.5} size={14} />
            Edit
          </Link>
          <form action={boundDelete} className="flex-1">
            <SubmitButton
              confirm={`Delete “${recipe.title}”? This can't be undone.`}
              className="o-pill o-danger w-full"
            >
              <Trash2 strokeWidth={2.5} size={14} />
              Delete
            </SubmitButton>
          </form>
        </div>
      </aside>

      {/* Body — row 2, left column on desktop */}
      <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[21px]">Ingredients</h2>
            <span className="text-[13px] opacity-55">{recipe.ingredients.length} {recipe.ingredients.length === 1 ? "item" : "items"}</span>
          </div>
          <div className="o-card grid grid-cols-1 gap-x-7 py-2 sm:grid-cols-2">
            {recipe.ingredients.map((ing) => (
              <div
                key={ing.id}
                className="o-rule flex items-baseline gap-3 py-2.5 text-[15px] last:border-b-0"
              >
                <span className="min-w-[64px] font-semibold text-accent-700">
                  {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
                </span>
                <span className="flex-1">{ing.name}</span>
                {ing.prepNote && <span className="text-[13px] opacity-50">{ing.prepNote}</span>}
              </div>
            ))}
          </div>
        </section>

        {recipe.steps && (
          <section>
            <h2 className="mb-3 text-[21px]">Steps</h2>
            {stepLines ? (
              <ol className="flex flex-col gap-4">
                {stepLines.map((step, i) => (
                  <li key={i} className="flex items-start gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-200 font-heading text-[13px] text-accent-800">
                      {i + 1}
                    </span>
                    <p className="pt-0.5 text-[15.5px] leading-[1.6]">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="whitespace-pre-wrap text-[15.5px] leading-[1.6]">{recipe.steps}</p>
            )}
          </section>
        )}

        {/* Phone/tablet: destructive action lives at the end of the page. */}
        <form action={boundDelete} className="lg:hidden">
          <SubmitButton
            confirm={`Delete “${recipe.title}”? This can't be undone.`}
            className="o-pill o-danger w-full"
          >
            <Trash2 strokeWidth={2.5} size={14} />
            Delete recipe
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
