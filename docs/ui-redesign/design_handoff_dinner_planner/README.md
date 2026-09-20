# Handoff: Dinner Planner redesign

## Overview

A visual redesign of the Family Dinner Planner (Next.js App Router + Tailwind v4 +
Prisma/SQLite). Six screens: recipe library, recipe detail, add/edit recipe, weekly
planner, grocery list, ingredient library.

**Scope agreed with the designer: restyle only.** Routes, server actions, Prisma
queries and data flow stay exactly as they are today. Nothing in this handoff
requires a schema change or a new API route. If a change below seems to require new
data, use the fallback noted for it rather than adding a migration.

## About the design files

`Dinner Planner - Redesign.dc.html` in this bundle is a **design reference written
in HTML** — a prototype of the intended look, not production code to paste in. It
renders all six screens stacked on one canvas. Recreate it inside the existing
Next.js app using the app's own components, server actions and Tailwind setup.

`Dinner Planner - Current.dc.html` is a recreation of the app **as it looks today**,
included as a before/after reference.

Open either file in a browser directly.

## Fidelity

**High fidelity.** Colors, type, spacing, radii and shadows are final and come from
the Organic design system (tokens listed below). Match them. Copy is illustrative —
use the app's real data.

---

## 1. Global setup

### Fonts

Replace Geist with Caprasimo (display) + Figtree (body) in `src/app/layout.tsx`:

```ts
import { Caprasimo, Figtree } from "next/font/google";

const heading = Caprasimo({ weight: "400", subsets: ["latin"], variable: "--font-heading" });
const body = Figtree({ weight: ["400","600","700"], subsets: ["latin"], variable: "--font-body" });
```

Put `${heading.variable} ${body.variable}` on `<html>` and drop the Geist imports.

### Tokens

Replace `src/app/globals.css` with the contents of `globals.css` in this bundle. It
declares the Organic tokens on `:root` and maps them into Tailwind v4's `@theme` so
you can write `bg-surface`, `text-accent-700`, `rounded-lg`, `shadow-md` etc. and get
system values.

### Utility classes

Also in `globals.css`: `.o-pill`, `.o-input`, `.o-card`, `.o-tag`. These cover the
four shapes that repeat on every screen. Prefer them over re-typing long Tailwind
strings; everything else is plain Tailwind.

Every interactive element needs a themed focus ring —
`focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`.
The stylesheet sets this globally; don't override it per component.

### Shell (`src/app/layout.tsx`)

The current nav is an inline row inside a `max-w-3xl` wrapper. Change to:

- Nav bar: `bg-neutral-100`, `border-b border-divider`, padding `13.2px 26.4px`.
- Brand "Dinner Planner" in `font-heading`, 19px, then nav links as pills:
  active = `bg-accent-200 text-accent-800`, inactive = `opacity-70`, both
  `rounded-full px-3.5 py-1.5 text-sm`.
- Link order changes: Recipes · Planner · Grocery list · Ingredients.
- **Page container widens from `max-w-3xl` to `max-w-[1200px]`** with `p-6`
  (26.4px). This is the single biggest change — every screen below assumes the
  wider canvas.
- Drop the 🍽️ emoji from the brand.

---

## 2. Screens

### Recipe library — `src/app/recipes/page.tsx`

Today: four labelled text inputs in a filter form, then a bordered `<ul>` of rows.

**Header row.** `<h1>` "Recipes" at 32px `font-heading`, with a 13px 60%-opacity
subline: "6 saved · 4 rated · 3 grill-friendly" (derive from the same query). Right
side: "Add recipe" — solid `bg-accent text-bg rounded-full px-5 py-2.5`, with a
Lucide `plus` icon at stroke-width 2.75, 15px.

**Search.** One pill input, `flex-1 min-w-[260px]`, Lucide `search` icon absolutely
positioned at left 16px. Keeps the existing `q` searchParam.

**Sort.** Replace the `<select>` with a segmented control: one `rounded-full` bordered
row, four options (Title / Rating / Last made / Cuisine), active option
`bg-accent text-bg`, dividers `border-l border-divider`. Each option is a `<Link>`
setting `?sort=`. Every option needs `white-space: nowrap`.

**Tag filters.** Replace the two free-text tag inputs with chip rows: skill tags
first, a `w-px h-[18px] bg-divider` separator, then cuisine tags. Selected chip
`bg-accent-200 text-accent-800`; unselected `border border-divider`. Each is a
`<Link>` toggling the existing `tag`/`cuisine` searchParams. Chips are
`text-xs px-3 py-1 rounded-full whitespace-nowrap`. Build the chip list from the
distinct tags already in the DB — no new query shape needed, just `distinct`.

**Results.** `<ul>` of rows becomes a **3-column grid**, `gap: 13.2px`. Each card:

| | |
| --- | --- |
| container | `bg-surface`, `rounded-[26px]`, `p-4` (17.6px), `shadow-sm`, flex-col gap 8.8px |
| title | `font-heading` 18px, line-height 1.2 |
| rating | 13px `text-accent-700`, `★★★★☆`; unrated renders the literal "Not rated" |
| tags | 11px pills, `px-2.5 py-[3px]`; skill = `bg-accent-2-100 text-accent-2-800`, cuisine = `bg-accent-100 text-accent-800` |
| meta | 11px, 55% opacity: "8 ingredients · 45 min · Last made Sep 7" |

Title and rating sit on one row, `justify-between`, rating `whitespace-nowrap`.
Whole card is the link to `/recipes/[id]`.

### Recipe detail — `src/app/recipes/[id]/page.tsx`

Two columns: `grid-template-columns: minmax(0,1fr) 340px`, gap 35.2px. A
"← Recipes" 13px back link sits above the grid.

**Left column** (gap 26.4px):
- `<h1>` 38px `font-heading`. Meta below it on one 13px 70%-opacity row, dot-separated:
  Serves · Prep · Cook · Last made, with the "Original source" link inline at the end.
- Tag pills below that (same 11px treatment as the cards).
- **Ingredients** — `<h2>` 20px, then a **2-column grid** (gap 0 / 26.4px). Each row:
  quantity in `text-accent-700` with `min-width: 62px`, then the name, then prep
  notes pushed right at 13px / 50% opacity. Row separator
  `border-b` at `color-mix(in srgb, var(--color-text) 8%, transparent)`, padding 9px 0.
- **Steps** — the `steps` field is a single text column in the DB. Split it on
  newlines and strip any leading `N.`; render each as a row with a 26px accent-200
  circle holding the index, 14px gap, 15px text at line-height 1.55. If a recipe's
  steps don't parse into lines, fall back to today's `whitespace-pre-wrap` block.

**Right rail** (340px, gap 13.2px) — three stacked cards, each
`bg-surface rounded-[26px] p-4 shadow-sm`:
1. *Your notes* — 10px uppercase accent-700 kicker; "Rating" label then five 24px
   `★` glyphs in `text-accent` (click sets the rating — same server action as the
   current `<select>`); "Make again" button `bg-accent-2-200 text-accent-2-800` with
   a Lucide `check`; "Mark made today" outlined below it.
2. *This recipe* — shows the planned day if one exists ("Planned for Thursday,
   Sep 24"), plus a solid accent "Add to another day". Query `PlannedMeal` for this
   recipe in the current week; if there's none, the line reads "Not planned this
   week" and the button reads "Add to the plan".
3. Edit / Delete side by side, each `flex-1`, Delete outlined in `#8c2f11`.

### Add & edit recipe — `src/app/recipes/RecipeForm.tsx`

Same two-column split: form left, a "Details" rail right.

**Left:** `<h1>` "Add a recipe" 32px. Title as a full-width pill input, 16px.

Then an ingredients panel — `bg-surface rounded-[26px] p-4`, containing:
- A header row: "Ingredients" in `font-heading` 17px, and on the right the library
  autocomplete (200px pill input, 13px) + outlined "Add".
- A header strip of 10px uppercase labels on the grid
  `70px 70px minmax(0,1fr) 150px 28px` — Qty · Unit · Ingredient · Prep · (blank).
- One row per ingredient on that same grid: three pill inputs + prep + a 28px
  ghost remove button holding a Lucide `x`. **Note the column order changed**:
  qty and unit now come first, so the eye reads "2 lb italian sausage" left to right.
  The current order is name-first.
- "+ Add ingredient" as a borderless `text-accent-700` `font-heading` button with a
  `plus` icon.

Steps: a 7-row textarea, `rounded-[22px]`, 15px / 1.55.

**Right rail:** one `bg-surface` card titled "Details" holding Serves / Prep / Cook
in a 3-column grid of small pill inputs, then the two tag groups, then Source URL.
Tags render as removable pills (`× ` affordance) with a dashed "+ tag" pill to add —
but they still serialize to the same comma-separated string the server action
already parses. Below the card, "Save recipe" (solid accent, full width, 15px) and
"Cancel" (outlined).

### Weekly planner — `src/app/planner/page.tsx`

The vertical list of seven rows becomes a **7-column board**.

Header: `<h1>` "Week of Sep 21" 32px + "5 of 7 dinners assigned" subline. Right
side: a date-range stepper — one pill container holding the range label plus two
28px circular ‹ › buttons (these set the existing `start` searchParam ±7 days) —
and a solid accent "Open grocery list" that links to `/grocery-list` with the same
range params. The raw date input and the days-count number input come out of the
default view; keep them behind the stepper if you want to preserve arbitrary ranges.

Each column: weekday abbreviation in `font-heading` 14px with the date at 11px /
50% opacity on the same baseline, then the slot below.

- **Filled slot:** `bg-surface rounded-[22px] p-3.5 shadow-sm min-h-[132px]`,
  flex-col. Recipe title `font-heading` 15px / 1.2; meta "45 min · oven" at 11px /
  55%; one skill tag pinned to the bottom with `margin-top:auto`
  (`bg-accent-2-100 text-accent-2-800`, 10px).
- **Empty slot:** same box, `border-dashed` at 28% text, transparent fill, contents
  centered, single 13px `text-accent-700` line "+ Assign a dinner".

Below the board, a tray panel (`bg-surface rounded-[26px] p-4`): "Drag in from your
library" + a search input, then the recipes as grab-cursor pills showing title and
cook time.

**Drag-and-drop is not in scope for this pass** — it's the visual promise of the
tray, but the shipped behavior can stay click-to-assign: clicking a slot opens the
recipe picker, clicking a tray pill assigns it to the next empty day. Both call the
existing `setPlannedMeal` / `clearPlannedMeal` actions. Add real DnD later if you
want it.

### Grocery list — `src/app/grocery-list/page.tsx` + `GroceryChecklist.tsx`

Header: `<h1>` "Grocery list" 32px + "From 5 dinners, Sep 21 – Sep 27". Right side:
"3 of 12 gathered", a 180px × 8px progress track (`bg-surface`, fill
`bg-accent-2-500`, both `rounded-full`), and the "Edit this week's plan" link.

The list sits in one `bg-surface rounded-[26px] p-4` panel laid out as a **2-column
grid** (gap 0 / 35.2px) so a week's shopping fits without scrolling. Each row:

- A 20px **circular** check button — unchecked is a 1.5px 30%-text ring, checked is
  `bg-accent-2-500` with a `text-bg` ✓. Replaces the native checkbox.
- Quantity at 13px `text-accent-700`, `min-width: 58px`.
- Name at 14px; when checked, 40% opacity + line-through (matches today's behavior).
- Source recipe pushed right at 11px / 45% opacity — "Smash Burgers", "2 recipes",
  or "Added by you" for manual items. `aggregateIngredients` already knows which
  recipes contributed each line; surface that instead of discarding it. If it's
  easier, ship the row without this label.

Add-item form below: name (flex-1) / Qty (80px) / Unit (90px) pill inputs + a solid
accent "Add".

Keep the optimistic `useTransition` behavior in `GroceryChecklist.tsx` exactly as is;
only the markup changes.

### Ingredient library — `src/app/ingredients/page.tsx`

Today every row is its own bordered inline form. Replace with a table.

Container `max-w-[820px]`. `<h1>` 32px + "Names and default units reused when you
write a recipe."

Add row at the top: name (flex-1) / default unit (140px) / solid accent "Add".

Then one `bg-surface rounded-[26px]` panel with a header strip (11px uppercase, 55%
opacity, `border-b border-divider`) on the grid `minmax(0,1fr) 140px 150px` —
Name · Default unit · Used in. Rows on the same grid, 14px, separated by the 8%-text
rule. The third cell holds the usage count ("4 recipes") on the left and Edit /
Delete links on the right — Edit `text-accent-700`, Delete `#8c2f11`.

Edit turns the row's cells into inputs in place rather than rendering a permanent
form per row. "Used in" needs a `_count` on the recipe-ingredients relation; if that
query is awkward, drop the column and let the grid be `minmax(0,1fr) 140px 110px`.

---

## 3. Design tokens

Full values are in `globals.css`. Summary:

**Color** — bg `#f5ead8`, surface `#ebddc5`, text `#201e1d`, accent (terracotta)
`#c67139`, accent-2 (sage) `#7a8a5e`, divider `color-mix(in srgb, #201e1d 16%, transparent)`.
Each role carries a 100–900 OKLCH ramp. Use 100–300 for tinted fills, 500 as base,
700–900 for text on tints. The accent-on-ground pair is ~3:1 — fine for chrome and
large text, **not** for body copy; use `--color-accent-700` for paragraph-size accent text.

**Type** — Caprasimo 400 headings, Figtree 400/600/700 body. Sizes in use: 38 / 32 /
20 / 19 / 18 / 17 / 15 / 14 / 13 / 12 / 11 / 10px.

**Spacing** — 4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2px (the system's 1.10× density scale).

**Radius** — 8 / 16 / 28px; cards use 26px, slots 22px, every button and input
`999px`.

**Shadow** — sm `0 1px 2px`, md `0 3px 10px`, lg `0 12px 32px`, all
`color-mix(in srgb, #2e2b25 …%, transparent)`.

**Icons** — Lucide, stroke-width **2.75** (not the default 2). Used: plus, search,
check, x. `npm i lucide-react`.

## Assets

None. No images, no image generation — the design is type, color and shape only. If
you later add recipe photos, wrap them in the system's `.washed` treatment
(`filter: saturate(.6) contrast(.85) brightness(1.1) opacity(.94)`) and round the corners.

## What is deliberately unchanged

Routes, server actions (`setPlannedMeal`, `clearPlannedMeal`, `createRecipe`,
`getIngredientLibrary`, the grocery actions), the Prisma schema, `aggregateIngredients`,
searchParam names, and the optimistic-update pattern in `GroceryChecklist.tsx`.

## Suggested order

1. Fonts + `globals.css` + the layout shell. Every screen improves immediately.
2. Recipe library (grid + chips) — highest-traffic screen.
3. Grocery list (2-column sheet + circular checks) — most-used in the kitchen.
4. Planner board.
5. Recipe detail.
6. Add/edit form and the ingredient table.

## Files in this bundle

- `README.md` — this document
- `globals.css` — drop-in replacement for `src/app/globals.css`
- `Dinner Planner - Redesign.dc.html` — the design reference, all six screens
- `Dinner Planner - Current.dc.html` — the app as it looks today, for comparison
