# Family Dinner Planner — Product Vision & Requirements

## 1. Overview

A single-user, mobile-friendly web app that helps a home cook (limited experience, primarily grills) plan family dinners for the week. The core loop: **find or add recipes → save and rate them → plan which days to cook them → auto-generate a grocery list.**

## 2. Problem Statement

The user needs to cook more often for their family but has limited cooking experience beyond grilling. They need help discovering recipes they can realistically make, keeping track of the ones that work, planning a week of dinners around them, and turning that plan into a shopping list — without manually re-deriving ingredients every time.

## 3. Goals (v1)

- Make it easy to find recipes matched to skill level and equipment (not just cuisine/diet).
- Build a personal, rated library of recipes that grows over time.
- Let the user plan 1–7 dinners per week from that library.
- Auto-generate a combined grocery list from the week's plan.

## 4. Non-Goals (v1 — explicitly deferred)

- **Recipe Generator** (AI-created novel recipes) — deferred until skill-tagging taxonomy exists and generator input mode is decided.
- **Standalone Ingredient Library** — ingredients live as structured data on recipes, not a separate managed entity, for v1.
- **Family Profiles / multi-user access** — single user only for v1; no logins for other family members, no per-person preference filtering.
- **Pantry tracking / smart grocery consolidation** — grocery list uses naive quantity summing, no unit conversion, no "you already have this" awareness.

## 5. User & Context

- Single user, no authentication complexity beyond basic account/login for the user's own data.
- Primary device: mobile (must be responsive/mobile-friendly); also usable on desktop web.
- User is not a confident cook; most existing experience is grilling. Recipe discovery should account for this rather than assuming general kitchen competency.

---

## 6. Features & Requirements

### 6.1 Recipe Finder
**Purpose:** Discover recipes matched to the user's skill level, not just taste.

Requirements:
- Search/browse recipes by keyword, cuisine, and dietary tags.
- Filter by skill/equipment tags: e.g. *grill-friendly, one-pan, oven-only, under 30 min, minimal prep*.
- Results distinguish between recipes already in the user's Library vs. new discoveries.
- Ability to save a found recipe directly into the Recipe Library.

**Open question:** Source of "find" results — a recipe database/API integration, or does the Finder only search what's already been imported by the user? This affects scope significantly and needs a decision before build.

### 6.2 Recipe Library
**Purpose:** Central store of the user's saved recipes, with personal rating and structured data for downstream features.

Requirements:
- **Add recipe via manual entry:** form with title, ingredients (structured: name, quantity, unit), steps, tags, skill/equipment level, prep/cook time, servings.
- **Add recipe via URL import:** paste a URL; system attempts to auto-extract title, ingredients, steps, and servings. User can review/edit extracted data before saving (auto-extraction won't always be perfect).
- **Rating:** user rates each recipe (e.g. 1–5 stars, or thumbs up/down + "make again" flag).
- **Edit/delete** any saved recipe.
- **Sort/filter library** by rating, skill tag, last-made date, or cuisine.
- Each recipe's ingredient list is structured data (not free text) so it can feed the Grocery List feature.

**Open questions:**
- What fields are required vs. optional when manually adding a recipe?
- For URL import — any specific recipe sites to prioritize, or general-purpose extraction?

### 6.3 Dinner Planner
**Purpose:** Assign Library recipes to specific days for a 1–7 day span.

Requirements:
- User selects a date range (1 to 7 days).
- For each day, assign one recipe from the Library (search/browse within the planner).
- View the week at a glance (day → recipe assigned).
- Ability to swap/remove a recipe from a planned day.
- Days without an assigned recipe are left open (not required to fill all 7).

**Open question:** Should past weeks' plans be saved/viewable as history (useful for "what did we eat last month" or re-planning), or is the planner transient/current-week-only for v1?

### 6.4 Grocery List
**Purpose:** Auto-generate a shopping list from the current week's planned recipes.

Requirements:
- Pulls structured ingredients from every recipe assigned in the current plan.
- Combines ingredients by name, summing quantities naively (e.g. 2 recipes each needing "1 onion" → list shows "2 onion(s)"). No unit conversion (e.g. won't merge "1 cup" + "200g").
- List is viewable and editable (user can check off items, add extra items manually, remove items).
- Regenerates/updates when the plan changes.

**Open questions:**
- Should the list group by grocery store section (produce, dairy, etc.), or just flat/alphabetical for v1?
- Any need to mark items as "already have" to exclude from the list, or is that pantry-tracking scope explicitly deferred?

---

## 7. Platform & Technical Notes

- **Platform:** Responsive web app — must work well on mobile browsers as well as desktop.
- **Users:** Single-user; needs basic account/auth so data persists across sessions and devices, but no multi-user permission model.
- **Data model dependency:** Recipe ingredient data must be structured (not free text) from the start, since both the Grocery List and any future Ingredient Library/pantry features depend on it.

## 8. Suggested Build Order

1. Recipe Library (manual entry) — establishes the data model for recipes/ingredients.
2. Recipe Library (URL import) — adds the second entry path.
3. Rating system on Library recipes.
4. Recipe Finder — search/filter/discovery layer on top of the Library (and any external source, pending the open question in 6.1).
5. Dinner Planner — assign Library recipes to days.
6. Grocery List — derive from the Planner's current week.

## 9. Open Questions Summary (need answers before/during build)

1. Does the Recipe Finder search an external recipe database/API, or only the user's own imported/saved recipes?
2. What recipe fields are required vs. optional on manual entry?
3. Any priority recipe sites for URL import, or general-purpose extraction?
4. Should planner history (past weeks) be saved, or is it current-week-only?
5. Should the grocery list group by store section, or stay flat/alphabetical?
6. Should there be a way to exclude "already have" items from the grocery list, or is that fully out of scope for v1?

## 10. Deferred for Later Versions

- Recipe Generator (AI-created recipes) — input mode (on-hand ingredients / craving / skill-constrained) still to be decided.
- Standalone Ingredient Library as its own managed entity.
- Family Profiles — multi-user access, per-person preferences/allergies, favorites by family member.
- Pantry tracking and smart grocery list consolidation (unit conversion, "already have" awareness).
