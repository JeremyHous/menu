"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MenuFormState } from "./actions";
import type { Menu } from "@/app/lib/db";
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
    ingredients: menu?.ingredients.join("\n") ?? "",
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
  const values = { ...toValues(menu), ...state.values };
  const errors = state.errors ?? {};

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

      <div className={styles.field}>
        <label htmlFor="ingredients" className={styles.label}>
          Ingredients <span className={styles.optional}>optional</span>
        </label>
        <p className={styles.hint}>One per line, or separated by commas.</p>
        <textarea rows={5} {...fieldProps("ingredients")} />
        {fieldError("ingredients")}
      </div>

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
            Fan rating, 0 to 5{" "}
            <span className={styles.optional}>optional</span>
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
