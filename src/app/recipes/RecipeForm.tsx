"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

type IngredientRow = { name: string; quantity: string; unit: string; prepNote: string };

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

const emptyRow: IngredientRow = { name: "", quantity: "", unit: "", prepNote: "" };

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

export type LibraryIngredient = { id: string; name: string; defaultUnit: string | null };

function parseTagString(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function TagPicker({
  label,
  name,
  initial,
}: {
  label: string;
  name: string;
  initial: string;
}) {
  const [tags, setTags] = useState<string[]>(parseTagString(initial));
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  function addTag() {
    const value = draft.trim();
    if (value && !tags.includes(value)) {
      setTags((t) => [...t, value]);
    }
    setDraft("");
    setAdding(false);
  }

  function removeTag(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={tags.join(", ")} />
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="o-tag flex items-center gap-1 border border-divider bg-surface"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={addTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            className="o-input w-28 py-1 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-divider px-3 py-1 text-xs opacity-70 hover:opacity-100"
          >
            + tag
          </button>
        )}
      </div>
    </div>
  );
}

export default function RecipeForm({
  action,
  initial = emptyRecipeForm,
  submitLabel = "Save Recipe",
  libraryItems = [],
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: RecipeFormValues;
  submitLabel?: string;
  libraryItems?: LibraryIngredient[];
}) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial.ingredients.length ? initial.ingredients : [{ ...emptyRow }]
  );
  const [error, setError] = useState<string | null>(null);
  const [libraryPick, setLibraryPick] = useState("");

  function updateIngredient(index: number, field: keyof IngredientRow, value: string) {
    setIngredients((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addIngredient() {
    setIngredients((rows) => [...rows, { ...emptyRow }]);
  }

  function addFromLibrary(name: string) {
    const item = libraryItems.find((i) => i.name === name);
    if (!item) return;
    setIngredients((rows) => {
      const base = rows.length === 1 && rows[0].name === "" ? [] : rows;
      return [
        ...base,
        { name: item.name, quantity: "", unit: item.defaultUnit ?? "", prepNote: "" },
      ];
    });
    setLibraryPick("");
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
    <form action={handleSubmit} className="grid gap-[35.2px]" style={{ gridTemplateColumns: "minmax(0,1fr) 320px" }}>
      <div className="flex flex-col gap-6">
        {error && (
          <p className="rounded bg-accent-100 px-3 py-2 text-sm text-accent-800">{error}</p>
        )}

        <input
          id="title"
          name="title"
          required
          defaultValue={initial.title}
          placeholder="Recipe title"
          aria-label="Title"
          className="o-input w-full text-base"
        />

        <div className="o-card flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading text-[17px]">Ingredients</span>
            {libraryItems.length > 0 && (
              <div className="flex gap-2">
                <input
                  id="libraryPick"
                  list="ingredient-library-options"
                  value={libraryPick}
                  onChange={(e) => setLibraryPick(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFromLibrary(libraryPick);
                    }
                  }}
                  placeholder="From library..."
                  className="o-input w-[200px] bg-bg text-[13px]"
                />
                <datalist id="ingredient-library-options">
                  {libraryItems.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => addFromLibrary(libraryPick)}
                  disabled={!libraryItems.some((i) => i.name === libraryPick)}
                  className="o-pill border border-divider px-3 py-1.5 text-[13px] disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div
            className="grid gap-x-2 text-[10px] uppercase tracking-wide opacity-55"
            style={{ gridTemplateColumns: "70px 70px minmax(0,1fr) 150px 28px" }}
          >
            <span>Qty</span>
            <span>Unit</span>
            <span>Ingredient</span>
            <span>Prep</span>
            <span></span>
          </div>

          <div className="flex flex-col gap-2">
            {ingredients.map((row, index) => (
              <div
                key={index}
                className="grid items-center gap-x-2"
                style={{ gridTemplateColumns: "70px 70px minmax(0,1fr) 150px 28px" }}
              >
                <input
                  aria-label="Quantity"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                  className="o-input w-full bg-bg"
                />
                <input
                  aria-label="Unit"
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                  className="o-input w-full bg-bg"
                />
                <input
                  aria-label="Ingredient name"
                  placeholder="Name (e.g. onion)"
                  value={row.name}
                  onChange={(e) => updateIngredient(index, "name", e.target.value)}
                  className="o-input w-full bg-bg"
                />
                <input
                  aria-label="Prep"
                  placeholder="Prep (e.g. chopped)"
                  value={row.prepNote}
                  onChange={(e) => updateIngredient(index, "prepNote", e.target.value)}
                  className="o-input w-full bg-bg"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full opacity-60 hover:opacity-100 disabled:opacity-20"
                  aria-label="Remove ingredient"
                >
                  <X strokeWidth={2.75} size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="flex w-fit items-center gap-1 font-heading text-sm text-accent-700"
          >
            <Plus strokeWidth={2.75} size={14} />
            Add ingredient
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="steps" className="text-sm font-medium">
            Steps
          </label>
          <textarea
            id="steps"
            name="steps"
            rows={7}
            defaultValue={initial.steps}
            placeholder={"1. Preheat grill...\n2. ..."}
            className="rounded-[22px] border border-divider bg-surface px-[18px] py-[10px] text-[15px] leading-[1.55]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[13.2px]">
        <div className="o-card flex flex-col gap-4">
          <span className="font-heading text-[17px]">Details</span>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="servings" className="text-xs opacity-70">
                Serves
              </label>
              <input
                id="servings"
                name="servings"
                type="number"
                min={1}
                defaultValue={initial.servings}
                className="o-input w-full bg-bg"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="prepTimeMinutes" className="text-xs opacity-70">
                Prep
              </label>
              <input
                id="prepTimeMinutes"
                name="prepTimeMinutes"
                type="number"
                min={0}
                defaultValue={initial.prepTimeMinutes}
                className="o-input w-full bg-bg"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cookTimeMinutes" className="text-xs opacity-70">
                Cook
              </label>
              <input
                id="cookTimeMinutes"
                name="cookTimeMinutes"
                type="number"
                min={0}
                defaultValue={initial.cookTimeMinutes}
                className="o-input w-full bg-bg"
              />
            </div>
          </div>

          <TagPicker label="Skill / equipment tags" name="skillTags" initial={initial.skillTags} />
          <TagPicker label="Cuisine / dietary tags" name="cuisineTags" initial={initial.cuisineTags} />

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
              className="o-input w-full bg-bg"
            />
          </div>
        </div>

        <button type="submit" className="o-pill w-full bg-accent text-bg py-[10px] text-[15px]">
          {submitLabel}
        </button>
        <Link href="/recipes" className="o-pill w-full border border-divider py-[10px] text-[15px]">
          Cancel
        </Link>
      </div>
    </form>
  );
}
