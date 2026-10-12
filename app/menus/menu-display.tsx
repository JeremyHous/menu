import styles from "./menus.module.css";

// Presentation helpers shared by the list and recipe pages.

// Rough per-serving bands: under 1 kg is a light dish, over 3 kg a heavy one.
export function carbonClass(kg: number) {
  if (kg < 1) return styles.low;
  if (kg <= 3) return styles.mid;
  return styles.high;
}

export function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className={styles.stars} aria-hidden="true">
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}
