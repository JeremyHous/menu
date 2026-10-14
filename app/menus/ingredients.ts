// Ingredient quantities, shared by the recipe form (in the browser) and the
// server action and pages (on the server). Quantities are always for one
// adult portion.

// The units a quantity can use. The database accepts exactly these codes
// (see public.valid_ingredient_items).
export const UNITS = [
  { code: "g", label: "g (grams)" },
  { code: "kg", label: "kg (kilograms)" },
  { code: "ml", label: "ml (millilitres)" },
  { code: "l", label: "l (litres)" },
  { code: "piece", label: "piece(s)" },
  { code: "tsp", label: "tsp (teaspoon)" },
  { code: "tbsp", label: "tbsp (tablespoon)" },
] as const;

export type Unit = (typeof UNITS)[number]["code"];

export function isUnit(value: string): value is Unit {
  return UNITS.some((unit) => unit.code === value);
}

// One saved ingredient. amount and unit are null only for ingredients copied
// from the old name-only list, which have no quantity yet.
export type Ingredient = {
  name: string;
  amount: number | null;
  unit: Unit | null;
};

// One row of the form, as typed: every field is raw text.
export type IngredientRow = { name: string; amount: string; unit: string };

export function toRow(ingredient: Ingredient): IngredientRow {
  return {
    name: ingredient.name,
    amount: ingredient.amount?.toString() ?? "",
    unit: ingredient.unit ?? "",
  };
}

// "80 g", "1.5 tbsp", "2 pieces", or null when there is no quantity yet.
export function formatQuantity(ingredient: Ingredient): string | null {
  if (ingredient.amount === null || ingredient.unit === null) return null;
  const unit =
    ingredient.unit === "piece"
      ? ingredient.amount === 1
        ? "piece"
        : "pieces"
      : ingredient.unit;
  return `${ingredient.amount} ${unit}`;
}

// "basmati rice, 80 g", or just the name when there is no quantity yet.
export function formatIngredient(ingredient: Ingredient): string {
  const quantity = formatQuantity(ingredient);
  return quantity ? `${ingredient.name}, ${quantity}` : ingredient.name;
}
