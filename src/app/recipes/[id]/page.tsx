import Link from "next/link";
import { notFound } from "next/navigation";
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

  const boundRate = rateRecipe.bind(null, recipe.id);
  const boundDelete = deleteRecipe.bind(null, recipe.id);
  const boundToggleMakeAgain = toggleMakeAgain.bind(
    null,
    recipe.id,
    recipe.makeAgain ?? false
  );
  const boundMarkMade = markMadeToday.bind(null, recipe.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{recipe.title}</h1>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Original source
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
          >
            Edit
          </Link>
          <form action={boundDelete}>
            <button
              type="submit"
              className="rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
        {recipe.servings && <span>Serves {recipe.servings}</span>}
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes} min</span>}
        {recipe.lastMadeAt && (
          <span>Last made {recipe.lastMadeAt.toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {parseTags(recipe.skillTags).map((tag) => (
          <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
            {tag}
          </span>
        ))}
        {parseTags(recipe.cuisineTags).map((tag) => (
          <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded border border-zinc-200 bg-white p-4">
        <form action={boundRate} className="flex items-center gap-2">
          <label htmlFor="rating" className="text-sm font-medium">
            Rating
          </label>
          <select
            id="rating"
            name="rating"
            defaultValue={recipe.rating ?? ""}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-2 py-1 text-sm font-medium hover:bg-zinc-100"
          >
            Update
          </button>
        </form>

        <form action={boundToggleMakeAgain}>
          <button
            type="submit"
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              recipe.makeAgain
                ? "bg-green-100 text-green-700"
                : "border border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            {recipe.makeAgain ? "✓ Make again" : "Make again?"}
          </button>
        </form>

        <form action={boundMarkMade}>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
          >
            Mark made today
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Ingredients</h2>
        <ul className="flex flex-col gap-1">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="text-sm">
              {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
              {ing.prepNote ? `, ${ing.prepNote}` : ""}
            </li>
          ))}
        </ul>
      </div>

      {recipe.steps && (
        <div>
          <h2 className="mb-2 font-semibold">Steps</h2>
          <p className="whitespace-pre-wrap text-sm">{recipe.steps}</p>
        </div>
      )}

      <Link href="/recipes" className="text-sm text-blue-600 hover:underline">
        ← Back to library
      </Link>
    </div>
  );
}
