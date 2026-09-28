// md+ table columns for /ingredients: name · default unit · used-in · actions.
// Below md each row collapses to name + "unit · N recipes" subline instead.
// Lives outside IngredientRow.tsx because server components can't read plain
// values exported from a "use client" module.
export const INGREDIENT_TABLE_GRID = "minmax(0,1fr) 140px 120px 88px";
