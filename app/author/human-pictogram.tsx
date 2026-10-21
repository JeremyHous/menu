// A standing human figure in the style of a signage pictogram: round head,
// body, arms and legs as rounded bars. Purely decorative, so it is hidden
// from assistive technology. It draws in currentColor, so the caller's CSS
// sets its color and it follows the light and dark palettes.
export function HumanPictogram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <circle cx="50" cy="20" r="17" />
        <rect x="29" y="42" width="42" height="70" rx="12" />
        <rect x="12" y="44" width="13" height="66" rx="6.5" />
        <rect x="75" y="44" width="13" height="66" rx="6.5" />
        <rect x="31" y="100" width="17" height="94" rx="8.5" />
        <rect x="52" y="100" width="17" height="94" rx="8.5" />
      </g>
    </svg>
  );
}
