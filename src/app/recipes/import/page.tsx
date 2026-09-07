"use client";

import { useEffect, useState, useTransition } from "react";
import RecipeForm, { type LibraryIngredient, type RecipeFormValues } from "../RecipeForm";
import { createRecipe, extractRecipeFromUrl, getIngredientLibrary } from "../actions";

export default function ImportRecipePage() {
  const [url, setUrl] = useState("");
  const [imported, setImported] = useState<RecipeFormValues | null>(null);
  const [importKey, setImportKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [libraryItems, setLibraryItems] = useState<LibraryIngredient[]>([]);

  useEffect(() => {
    getIngredientLibrary().then(setLibraryItems);
  }, []);

  function handleFetch() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await extractRecipeFromUrl(url);
        setImported({
          title: result.title,
          sourceUrl: result.sourceUrl,
          servings: result.servings,
          prepTimeMinutes: result.prepTimeMinutes,
          cookTimeMinutes: result.cookTimeMinutes,
          skillTags: "",
          cuisineTags: result.cuisineTags,
          steps: result.steps,
          ingredients: result.ingredients,
        });
        setImportKey((k) => k + 1);
      } catch (e) {
        setImported(null);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Import Recipe from URL</h1>

      <div className="flex flex-col gap-2">
        <label htmlFor="import-url" className="text-sm font-medium">
          Recipe URL
        </label>
        <div className="flex gap-2">
          <input
            id="import-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={!url || isPending}
            className="shrink-0 rounded bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Fetching..." : "Fetch"}
          </button>
        </div>
        <span className="text-xs text-zinc-500">
          Works on sites that publish structured recipe data (most recipe blogs and
          major cooking sites). If it fails, use manual entry instead.
        </span>
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>

      {imported && (
        <>
          <p className="text-sm text-zinc-500">
            Review the extracted details below before saving — auto-extraction isn&apos;t
            always perfect.
          </p>
          <RecipeForm
            key={importKey}
            action={createRecipe}
            initial={imported}
            submitLabel="Save Recipe"
            libraryItems={libraryItems}
          />
        </>
      )}
    </div>
  );
}
