"use client";

import { useEffect, useRef, useState } from "react";
import { type IngredientRow, UNITS } from "./ingredients";
import styles from "./menus.module.css";

// Empty rows shown for a new recipe. Rows left empty are ignored on save,
// and without JavaScript these are the rows the user can fill in.
const NEW_RECIPE_ROWS = 3;

const EMPTY_ROW: IngredientRow = { name: "", amount: "", unit: "" };

// key identifies a row while rows are added and removed. The starting rows
// are keyed 0, 1, 2…, the same on the server and in the browser, so the ids
// built from keys match when the page hydrates.
type KeyedRow = IngredientRow & { key: number };

type IngredientFieldsProps = {
  // The rows to start from: the saved ingredients, or what the user just
  // submitted when the save failed. Empty for a new recipe. They are only
  // read on mount; the form remounts this component to start again.
  initialRows: IngredientRow[];
  // One message, or null, per initial row.
  rowErrors?: (string | null)[];
  // A message about the ingredients as a whole.
  error?: string;
};

// The ingredients part of the recipe form: one row per ingredient, each with
// its quantity and unit for one adult portion. Each input is sent as
// ingredient_name, ingredient_amount or ingredient_unit, in row order.
export function IngredientFields({
  initialRows,
  rowErrors = [],
  error,
}: IngredientFieldsProps) {
  const [rows, setRows] = useState<KeyedRow[]>(() =>
    (initialRows.length > 0
      ? initialRows
      : Array<IngredientRow>(NEW_RECIPE_ROWS).fill(EMPTY_ROW)
    ).map((row, index) => ({ ...row, key: index })),
  );
  // Added rows get keys after the starting ones; keys are never reused, so
  // a starting row's message (rowErrors[key]) stays with that row.
  const [nextKey, setNextKey] = useState(rows.length);
  const errorFor = (key: number) => rowErrors[key] ?? null;

  // Where focus goes once a row is added or removed: a row's ingredient
  // input, or the "Add an ingredient" button.
  const focusTarget = useRef<number | "add" | null>(null);
  const nameInputs = useRef(new Map<number, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const target = focusTarget.current;
    if (target === null) return;
    focusTarget.current = null;
    if (target === "add") addButton.current?.focus();
    else nameInputs.current.get(target)?.focus();
  });

  function addRow() {
    setRows([...rows, { ...EMPTY_ROW, key: nextKey }]);
    setNextKey(nextKey + 1);
    focusTarget.current = nextKey;
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    // The row that moved into this place, or the add button at the end.
    focusTarget.current = next[index]?.key ?? "add";
  }

  return (
    <fieldset
      className={styles.ingredientFields}
      aria-describedby={`ingredients-hint${error ? " ingredients-error" : ""}`}
    >
      <legend className={styles.label}>Ingredients</legend>
      <p id="ingredients-hint" className={styles.hint}>
        Add each ingredient on its own row, with its quantity{" "}
        <strong>for one adult portion</strong>. At least one ingredient is
        required.
      </p>
      {error && (
        <p id="ingredients-error" className={styles.fieldError}>
          {error}
        </p>
      )}

      {/* Column headings for sighted users; each input has its own label. */}
      <div className={styles.ingredientHead} aria-hidden="true">
        <span>Ingredient</span>
        <span>Quantity per adult portion</span>
        <span>Unit</span>
      </div>
      <ol className={styles.ingredientRows}>
        {rows.map((row, index) => {
          const n = index + 1;
          const id = `ingredient-${row.key}`;
          const rowError = errorFor(row.key);
          const describedBy = rowError ? `${id}-error` : undefined;
          return (
            <li key={row.key} className={styles.ingredientRow}>
              <label htmlFor={`${id}-name`} className={styles.srOnly}>
                Ingredient {n}
              </label>
              <input
                ref={(input) => {
                  if (input) nameInputs.current.set(row.key, input);
                  else nameInputs.current.delete(row.key);
                }}
                id={`${id}-name`}
                name="ingredient_name"
                type="text"
                maxLength={100}
                placeholder="e.g. basmati rice"
                defaultValue={row.name}
                aria-invalid={rowError ? true : undefined}
                aria-describedby={describedBy}
                className={styles.input}
              />
              <label htmlFor={`${id}-amount`} className={styles.srOnly}>
                Quantity of ingredient {n}, for one adult portion
              </label>
              <input
                id={`${id}-amount`}
                name="ingredient_amount"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 80"
                defaultValue={row.amount}
                aria-invalid={rowError ? true : undefined}
                aria-describedby={describedBy}
                className={styles.input}
              />
              <label htmlFor={`${id}-unit`} className={styles.srOnly}>
                Unit of ingredient {n}
              </label>
              <select
                id={`${id}-unit`}
                name="ingredient_unit"
                defaultValue={row.unit}
                aria-invalid={rowError ? true : undefined}
                aria-describedby={describedBy}
                className={styles.input}
              >
                <option value="">Unit</option>
                {UNITS.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.tagRemove}
                aria-label={`Remove ingredient ${n}`}
                disabled={rows.length === 1}
                onClick={() => removeRow(index)}
              >
                ×
              </button>
              {rowError && (
                <p id={`${id}-error`} className={styles.ingredientError}>
                  {rowError}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div>
        <button
          ref={addButton}
          type="button"
          className={styles.linkButton}
          onClick={addRow}
        >
          + Add an ingredient
        </button>
      </div>
    </fieldset>
  );
}
