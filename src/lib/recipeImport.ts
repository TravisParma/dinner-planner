export type ImportedIngredient = { name: string; quantity: string; unit: string };

export type ImportedRecipe = {
  title: string;
  steps: string;
  servings: string;
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  cuisineTags: string;
  sourceUrl: string;
  ingredients: ImportedIngredient[];
};

const UNITS = [
  "cups?",
  "tablespoons?",
  "tbsp",
  "teaspoons?",
  "tsp",
  "ounces?",
  "oz",
  "pounds?",
  "lbs?",
  "grams?",
  "g",
  "kilograms?",
  "kg",
  "milliliters?",
  "ml",
  "liters?",
  "l",
  "cloves?",
  "cans?",
  "packages?",
  "pinch(?:es)?",
  "dash(?:es)?",
  "slices?",
  "sticks?",
  "bunch(?:es)?",
  "heads?",
  "sprigs?",
];

const UNIT_PATTERN = new RegExp(`^(${UNITS.join("|")})\\b\\.?`, "i");
const QUANTITY_PATTERN =
  /^(\d+\s\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)(?:\s*-\s*(\d+\s\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+))?/;

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseIngredientLine(rawLine: string): ImportedIngredient {
  const line = stripHtml(rawLine);
  let rest = line;
  let quantity = "";
  let unit = "";

  const qtyMatch = rest.match(QUANTITY_PATTERN);
  if (qtyMatch) {
    quantity = qtyMatch[0].trim();
    rest = rest.slice(qtyMatch[0].length).trim();
  }

  const unitMatch = rest.match(UNIT_PATTERN);
  if (unitMatch) {
    unit = unitMatch[0].replace(/\.$/, "").trim();
    rest = rest.slice(unitMatch[0].length).trim();
  }

  rest = rest.replace(/^of\s+/i, "").trim();

  return { name: rest || line, quantity, unit };
}

function isoDurationToMinutes(duration: unknown): string {
  if (typeof duration !== "string") return "";
  const match = duration.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return "";
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const total = hours * 60 + minutes;
  return total > 0 ? String(total) : "";
}

function flattenText(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") return [stripHtml(value)];
  if (Array.isArray(value)) return value.flatMap(flattenText);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return [stripHtml(obj.text)];
    if (Array.isArray(obj.itemListElement)) return flattenText(obj.itemListElement);
    if (typeof obj.name === "string") return [stripHtml(obj.name)];
  }
  return [];
}

function firstString(value: unknown): string {
  if (typeof value === "string") return stripHtml(value);
  if (Array.isArray(value) && typeof value[0] === "string") return stripHtml(value[0]);
  return "";
}

function extractServings(value: unknown): string {
  const text = firstString(value) || (Array.isArray(value) ? String(value[0] ?? "") : "");
  const match = text.match(/\d+/);
  return match ? match[0] : "";
}

function hasRecipeType(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as Record<string, unknown>)["@type"];
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  return false;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  if (hasRecipeType(node)) return node as Record<string, unknown>;
  const obj = node as Record<string, unknown>;
  if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  return null;
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptPattern.exec(html)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

export async function fetchAndParseRecipe(url: string): Promise<ImportedRecipe> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DinnerPlannerBot/1.0)" },
      redirect: "follow",
    });
  } catch {
    throw new Error("Could not reach that URL.");
  }

  if (!response.ok) {
    throw new Error(`That URL returned an error (HTTP ${response.status}).`);
  }

  const html = await response.text();
  const blocks = extractJsonLdBlocks(html);

  let recipeNode: Record<string, unknown> | null = null;
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.trim());
      recipeNode = findRecipeNode(parsed);
      if (recipeNode) break;
    } catch {
      // Some sites emit malformed JSON-LD; skip and keep looking.
    }
  }

  if (!recipeNode) {
    throw new Error(
      "Couldn't find structured recipe data on that page. Try manual entry instead."
    );
  }

  const ingredientLines = flattenText(
    recipeNode.recipeIngredient ?? recipeNode.ingredients
  );
  const ingredients = ingredientLines.map(parseIngredientLine);

  const stepLines = flattenText(recipeNode.recipeInstructions);

  return {
    title: firstString(recipeNode.name) || "",
    steps: stepLines.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    servings: extractServings(recipeNode.recipeYield),
    prepTimeMinutes: isoDurationToMinutes(recipeNode.prepTime),
    cookTimeMinutes: isoDurationToMinutes(recipeNode.cookTime),
    cuisineTags: firstString(recipeNode.recipeCuisine),
    sourceUrl: url,
    ingredients: ingredients.length ? ingredients : [{ name: "", quantity: "", unit: "" }],
  };
}
