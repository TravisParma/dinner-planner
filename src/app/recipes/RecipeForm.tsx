"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

// Single-line ingredient row at md+: qty · unit · name · prep · remove.
// Below md each row stacks (name first, then qty/unit/prep) instead.
const INGREDIENT_GRID_MD = "72px 84px minmax(0,1fr) 160px 40px";

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
      <span className="text-sm font-semibold">{label}</span>
      <input type="hidden" name={name} value={tags.join(", ")} />
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="o-tag gap-1 border border-divider bg-bg py-1 pl-3 pr-1 text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="flex h-5 w-5 items-center justify-center rounded-full opacity-60 hover:bg-surface hover:opacity-100"
            >
              <X strokeWidth={2.75} size={11} />
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
            aria-label={`New ${label.toLowerCase()}`}
            className="o-input w-32 bg-bg py-1 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-divider px-3.5 py-1.5 text-xs opacity-70 hover:opacity-100"
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
  cancelHref = "/recipes",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: RecipeFormValues;
  submitLabel?: string;
  libraryItems?: LibraryIngredient[];
  cancelHref?: string;
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
    <form
      action={handleSubmit}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-x-9"
    >
      <div className="flex flex-col gap-6 lg:row-span-2">
        {error && (
          <p role="alert" className="rounded-[16px] bg-accent-100 px-4 py-3 text-sm text-accent-800">
            {error}
          </p>
        )}

        <input
          id="title"
          name="title"
          required
          defaultValue={initial.title}
          placeholder="Recipe title"
          aria-label="Title"
          className="o-input w-full font-heading text-[18px]"
        />

        <div className="o-card flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-heading text-[18px]">Ingredients</span>
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
                  aria-label="Add from ingredient library"
                  className="o-input w-full bg-bg text-[13px] sm:w-[200px]"
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
                  className="o-pill o-quiet shrink-0 px-4 py-1.5 text-[13px] disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Column labels only make sense for the single-line desktop row. */}
          <div
            className="hidden gap-x-2 px-1 text-[10px] uppercase tracking-wide opacity-55 md:grid"
            style={{ gridTemplateColumns: INGREDIENT_GRID_MD }}
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
                className="grid grid-cols-[72px_84px_minmax(0,1fr)_40px] items-center gap-2 rounded-[20px] border border-divider bg-bg/60 p-2 md:grid-cols-[var(--ing-grid)] md:rounded-none md:border-0 md:bg-transparent md:p-0"
                style={{ "--ing-grid": INGREDIENT_GRID_MD } as React.CSSProperties}
              >
                <input
                  aria-label="Quantity"
                  placeholder="Qty"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                  className="o-input order-3 w-full bg-bg md:order-none"
                />
                <input
                  aria-label="Unit"
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                  className="o-input order-4 w-full bg-bg md:order-none"
                />
                <input
                  aria-label="Ingredient name"
                  placeholder="Name (e.g. onion)"
                  value={row.name}
                  onChange={(e) => updateIngredient(index, "name", e.target.value)}
                  className="o-input order-1 col-span-3 w-full bg-bg md:order-none md:col-span-1"
                />
                <input
                  aria-label="Prep"
                  placeholder="Prep (e.g. chopped)"
                  value={row.prepNote}
                  onChange={(e) => updateIngredient(index, "prepNote", e.target.value)}
                  className="o-input order-5 col-span-2 w-full bg-bg md:order-none md:col-span-1"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                  className="o-icon-btn order-2 opacity-60 hover:opacity-100 disabled:opacity-20 md:order-none"
                  aria-label="Remove ingredient"
                >
                  <X strokeWidth={2.75} size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="flex w-fit items-center gap-1.5 rounded-full px-2 py-2 font-heading text-sm text-accent-700 hover:bg-accent-100"
          >
            <Plus strokeWidth={2.75} size={15} />
            Add ingredient
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="steps" className="font-heading text-[18px]">
            Steps
          </label>
          <textarea
            id="steps"
            name="steps"
            rows={8}
            defaultValue={initial.steps}
            placeholder={"1. Preheat grill...\n2. ..."}
            className="rounded-[22px] border border-divider bg-surface px-[18px] py-3 text-[15px] leading-[1.6]"
          />
          <span className="text-xs opacity-55">One step per line — they&apos;ll be numbered for you.</span>
        </div>
      </div>

      <div className="o-card flex flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:self-start">
        <span className="font-heading text-[18px]">Details</span>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="servings" className="text-xs opacity-70">
              Serves
            </label>
            <input
              id="servings"
              name="servings"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={initial.servings}
              className="o-input w-full bg-bg px-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="prepTimeMinutes" className="text-xs opacity-70">
              Prep (min)
            </label>
            <input
              id="prepTimeMinutes"
              name="prepTimeMinutes"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={initial.prepTimeMinutes}
              className="o-input w-full bg-bg px-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cookTimeMinutes" className="text-xs opacity-70">
              Cook (min)
            </label>
            <input
              id="cookTimeMinutes"
              name="cookTimeMinutes"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={initial.cookTimeMinutes}
              className="o-input w-full bg-bg px-3"
            />
          </div>
        </div>

        <TagPicker label="Skill / equipment tags" name="skillTags" initial={initial.skillTags} />
        <TagPicker label="Cuisine / dietary tags" name="cuisineTags" initial={initial.cuisineTags} />

        <div className="flex flex-col gap-1">
          <label htmlFor="sourceUrl" className="text-sm font-semibold">
            Source URL
          </label>
          <input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            inputMode="url"
            defaultValue={initial.sourceUrl}
            placeholder="https://..."
            className="o-input w-full bg-bg"
          />
        </div>
      </div>

      {/* Save/Cancel: a frosted bar pinned above the tab bar on phones, plain
          stacked buttons under the Details card on desktop. */}
      <div
        className="o-glass bottom-above-tabbar sticky z-30 -mx-4 flex gap-2 border-t border-divider px-4 py-3 lg:static lg:col-start-2 lg:row-start-2 lg:mx-0 lg:flex-col lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      >
        <Link href={cancelHref} className="o-pill o-quiet flex-1 py-[11px] text-[15px] lg:order-2">
          Cancel
        </Link>
        <SubmitButton
          pendingLabel="Saving…"
          className="o-pill o-primary flex-[2] py-[11px] text-[15px] lg:order-1"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
