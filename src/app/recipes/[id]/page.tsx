import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  deleteRecipe,
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
    include: { ingredients: { orderBy: { position: "asc" } } },
  });

  if (!recipe) notFound();

  const now = new Date();
  const weekStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const plannedThisWeek = await prisma.plannedMeal.findFirst({
    where: { recipeId: recipe.id, date: { gte: weekStart, lte: weekEnd } },
  });

  const boundRate = rateRecipe.bind(null, recipe.id);
  const boundDelete = deleteRecipe.bind(null, recipe.id);
  const boundToggleMakeAgain = toggleMakeAgain.bind(
    null,
    recipe.id,
    recipe.makeAgain ?? false
  );
  const boundMarkMade = markMadeToday.bind(null, recipe.id);

  const meta = [
    recipe.servings ? `Serves ${recipe.servings}` : null,
    recipe.prepTimeMinutes != null ? `Prep ${recipe.prepTimeMinutes} min` : null,
    recipe.cookTimeMinutes != null ? `Cook ${recipe.cookTimeMinutes} min` : null,
    recipe.lastMadeAt ? `Last made ${recipe.lastMadeAt.toLocaleDateString()}` : null,
  ].filter(Boolean) as string[];

  const stepLines = recipe.steps ? parseSteps(recipe.steps) : null;

  return (
    <div className="flex flex-col gap-[13.2px]">
      <Link href="/recipes" className="text-[13px] opacity-70 hover:opacity-100">
        ← Recipes
      </Link>

      <div
        className="grid gap-[35.2px]"
        style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}
      >
        <div className="flex flex-col gap-[26.4px]">
          <div>
            <h1 className="text-[38px]">{recipe.title}</h1>
            <p className="text-[13px] opacity-70">
              {meta.join(" · ")}
              {recipe.sourceUrl && (
                <>
                  {meta.length > 0 && " · "}
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-700 hover:underline"
                  >
                    Original source
                  </a>
                </>
              )}
            </p>
          </div>

          {(parseTags(recipe.skillTags).length > 0 || parseTags(recipe.cuisineTags).length > 0) && (
            <div className="flex flex-wrap gap-1">
              {parseTags(recipe.skillTags).map((tag) => (
                <span key={tag} className="o-tag bg-accent-2-100 text-accent-2-800">
                  {tag}
                </span>
              ))}
              {parseTags(recipe.cuisineTags).map((tag) => (
                <span key={tag} className="o-tag bg-accent-100 text-accent-800">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div>
            <h2 className="mb-3 text-[20px]">Ingredients</h2>
            <div className="grid grid-cols-1 gap-x-[26.4px] sm:grid-cols-2">
              {recipe.ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="o-rule flex items-baseline gap-3 py-[9px] text-[14px]"
                >
                  <span className="text-accent-700" style={{ minWidth: "62px" }}>
                    {ing.quantity} {ing.unit}
                  </span>
                  <span className="flex-1">{ing.name}</span>
                  {ing.prepNote && (
                    <span className="text-[13px] opacity-50">{ing.prepNote}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {recipe.steps && (
            <div>
              <h2 className="mb-3 text-[20px]">Steps</h2>
              {stepLines ? (
                <div className="flex flex-col gap-[14px]">
                  {stepLines.map((step, i) => (
                    <div key={i} className="flex items-start gap-[14px]">
                      <span
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-accent-200 text-[12px] text-accent-800"
                      >
                        {i + 1}
                      </span>
                      <p className="text-[15px] leading-[1.55]">{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{recipe.steps}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[13.2px]">
          <div className="o-card flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-wide text-accent-700">
              Your notes
            </span>
            <form action={boundRate} className="flex flex-col gap-1">
              <span className="text-sm font-medium">Rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="submit"
                    name="rating"
                    value={n}
                    className={`text-[24px] leading-none ${
                      recipe.rating && n <= recipe.rating ? "text-accent" : "opacity-30"
                    }`}
                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </form>
            <form action={boundToggleMakeAgain}>
              <button
                type="submit"
                className={`o-pill w-full ${
                  recipe.makeAgain
                    ? "bg-accent-2-200 text-accent-2-800"
                    : "border border-divider"
                }`}
              >
                {recipe.makeAgain && <Check strokeWidth={2.75} size={15} />}
                Make again
              </button>
            </form>
            <form action={boundMarkMade}>
              <button type="submit" className="o-pill w-full border border-divider">
                Mark made today
              </button>
            </form>
          </div>

          <div className="o-card flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-wide text-accent-700">
              This recipe
            </span>
            <p className="text-sm">
              {plannedThisWeek
                ? `Planned for ${plannedThisWeek.date.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}`
                : "Not planned this week"}
            </p>
            <Link href="/planner" className="o-pill bg-accent text-bg w-full">
              {plannedThisWeek ? "Add to another day" : "Add to the plan"}
            </Link>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="o-pill flex-1 border border-divider"
            >
              Edit
            </Link>
            <form action={boundDelete} className="flex-1">
              <button
                type="submit"
                className="o-pill w-full border"
                style={{ borderColor: "#8c2f11", color: "#8c2f11" }}
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
