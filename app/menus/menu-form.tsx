"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { MenuFormState } from "./actions";
import type { Menu } from "@/app/lib/db";
import { IngredientFields } from "./ingredient-fields";
import { toRow } from "./ingredients";
import styles from "./menus.module.css";

type MenuAction = (
  state: MenuFormState,
  formData: FormData,
) => Promise<MenuFormState>;

type MenuFormProps = {
  action: MenuAction;
  // Present when editing; the form starts empty when creating.
  menu?: Menu;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
};

const initialState: MenuFormState = {};

// Turns a saved recipe into the text the inputs expect.
function toValues(menu?: Menu) {
  return {
    title: menu?.title ?? "",
    body: menu?.body ?? "",
    carbon_footprint_kg: menu?.carbon_footprint_kg?.toString() ?? "",
    fans_appreciation: menu?.fans_appreciation?.toString() ?? "",
    supplier_name: menu?.supplier_name ?? "",
  };
}

export function MenuForm({
  action,
  menu,
  submitLabel,
  pendingLabel,
  cancelHref,
}: MenuFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  // After a failed save, React resets the form to these defaults, so they
  // must be what the user just submitted rather than the saved recipe.
  const { ingredients: submittedIngredients, ...submitted } =
    state.values ?? {};
  const values = { ...toValues(menu), ...submitted };
  const errors = state.errors ?? {};
  const ingredientRows =
    submittedIngredients ?? menu?.ingredient_items.map(toRow) ?? [];
  // Counts save attempts. The ingredient rows are keyed on it, so after a
  // failed save they start again from what the user submitted. Adjusting
  // state during render avoids an extra render with the stale rows.
  const [attempt, setAttempt] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setAttempt(attempt + 1);
  }

  function fieldProps(name: keyof typeof values) {
    const error = errors[name];
    return {
      id: name,
      name,
      defaultValue: values[name],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${name}-error` : undefined,
      className: styles.input,
    };
  }

  function fieldError(name: keyof typeof values) {
    const error = errors[name];
    return error ? (
      <p id={`${name}-error`} className={styles.fieldError}>
        {error}
      </p>
    ) : null;
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {menu && <input type="hidden" name="id" value={menu.id} />}

      {state.message && (
        <p role="alert" className={styles.formError}>
          {state.message}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>
          Title
        </label>
        <input type="text" required {...fieldProps("title")} />
        {fieldError("title")}
      </div>

      <div className={styles.field}>
        <label htmlFor="body" className={styles.label}>
          Description <span className={styles.optional}>optional</span>
        </label>
        <textarea rows={3} {...fieldProps("body")} />
        {fieldError("body")}
      </div>

      <IngredientFields
        key={attempt}
        initialRows={ingredientRows}
        rowErrors={state.ingredientErrors}
        error={errors.ingredients}
      />

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="carbon_footprint_kg" className={styles.label}>
            Carbon footprint, kg CO₂e{" "}
            <span className={styles.optional}>optional</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 1.2"
            {...fieldProps("carbon_footprint_kg")}
          />
          {fieldError("carbon_footprint_kg")}
        </div>

        <div className={styles.field}>
          <label htmlFor="fans_appreciation" className={styles.label}>
            Fan rating, 0 to 5 <span className={styles.optional}>optional</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 4.5"
            {...fieldProps("fans_appreciation")}
          />
          {fieldError("fans_appreciation")}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="supplier_name" className={styles.label}>
          Supplier <span className={styles.optional}>optional</span>
        </label>
        <input type="text" {...fieldProps("supplier_name")} />
        {fieldError("supplier_name")}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link href={cancelHref} className={styles.back}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
