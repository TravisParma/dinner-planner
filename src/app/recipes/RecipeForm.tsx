"use client";

import { useState } from "react";

type IngredientRow = { name: string; quantity: string; unit: string };

export type RecipeFormValues = {
  title: string;
  sourceUrl: string;
  servings: string;
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  skillTags: string;
  cuisineTags: string;
  steps: string;
  ingredients: IngredientRow[];
};

const emptyRow: IngredientRow = { name: "", quantity: "", unit: "" };

export const emptyRecipeForm: RecipeFormValues = {
  title: "",
  sourceUrl: "",
  servings: "",
  prepTimeMinutes: "",
  cookTimeMinutes: "",
  skillTags: "",
  cuisineTags: "",
  steps: "",
  ingredients: [{ ...emptyRow }],
};

export default function RecipeForm({
  action,
  initial = emptyRecipeForm,
  submitLabel = "Save Recipe",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: RecipeFormValues;
  submitLabel?: string;
}) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial.ingredients.length ? initial.ingredients : [{ ...emptyRow }]
  );
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(index: number, field: keyof IngredientRow, value: string) {
    setIngredients((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addIngredient() {
    setIngredients((rows) => [...rows, { ...emptyRow }]);
  }

  function removeIngredient(index: number) {
    setIngredients((rows) => rows.filter((_, i) => i !== index));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const cleaned = ingredients.filter((row) => row.name.trim().length > 0);
    if (cleaned.length === 0) {
      setError("Add at least one ingredient with a name.");
      return;
    }
    formData.set("ingredientsJson", JSON.stringify(cleaned));
    return action(formData);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial.title}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Ingredients *</span>
        <div className="flex flex-col gap-2">
          {ingredients.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                aria-label="Ingredient name"
                placeholder="Name (e.g. onion)"
                value={row.name}
                onChange={(e) => updateIngredient(index, "name", e.target.value)}
                className="flex-1 min-w-0 rounded border border-zinc-300 px-3 py-2"
              />
              <input
                aria-label="Quantity"
                placeholder="Qty"
                value={row.quantity}
                onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                className="w-16 rounded border border-zinc-300 px-3 py-2"
              />
              <input
                aria-label="Unit"
                placeholder="Unit"
                value={row.unit}
                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                className="w-20 rounded border border-zinc-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length === 1}
                className="px-2 text-zinc-500 hover:text-red-600 disabled:opacity-30"
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="self-start text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          + Add ingredient
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="steps" className="text-sm font-medium">
          Steps
        </label>
        <textarea
          id="steps"
          name="steps"
          rows={6}
          defaultValue={initial.steps}
          placeholder={"1. Preheat grill...\n2. ..."}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="servings" className="text-sm font-medium">
            Servings
          </label>
          <input
            id="servings"
            name="servings"
            type="number"
            min={1}
            defaultValue={initial.servings}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="prepTimeMinutes" className="text-sm font-medium">
            Prep (min)
          </label>
          <input
            id="prepTimeMinutes"
            name="prepTimeMinutes"
            type="number"
            min={0}
            defaultValue={initial.prepTimeMinutes}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cookTimeMinutes" className="text-sm font-medium">
            Cook (min)
          </label>
          <input
            id="cookTimeMinutes"
            name="cookTimeMinutes"
            type="number"
            min={0}
            defaultValue={initial.cookTimeMinutes}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="skillTags" className="text-sm font-medium">
          Skill / equipment tags
        </label>
        <input
          id="skillTags"
          name="skillTags"
          defaultValue={initial.skillTags}
          placeholder="grill-friendly, one-pan, under 30 min"
          className="rounded border border-zinc-300 px-3 py-2"
        />
        <span className="text-xs text-zinc-500">Comma-separated.</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cuisineTags" className="text-sm font-medium">
          Cuisine / dietary tags
        </label>
        <input
          id="cuisineTags"
          name="cuisineTags"
          defaultValue={initial.cuisineTags}
          placeholder="mexican, vegetarian"
          className="rounded border border-zinc-300 px-3 py-2"
        />
        <span className="text-xs text-zinc-500">Comma-separated.</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sourceUrl" className="text-sm font-medium">
          Source URL
        </label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          defaultValue={initial.sourceUrl}
          placeholder="https://..."
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="self-start rounded bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
