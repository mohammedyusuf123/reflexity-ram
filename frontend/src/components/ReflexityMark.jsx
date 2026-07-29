/**
 * Reflexity brand mark — two interlocking rings.
 * Geometry recovered from the reflexity.io favicon: two 324° arcs,
 * centre-line radius 46.5, stroke 10, centres 55 apart.
 */
export default function ReflexityMark({ size = 28, color = "#FFCF24", className = "" }) {
  const ratio = 160 / 104;
  return (
    <svg
      width={size * ratio}
      height={size}
      viewBox="0 0 160 104"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-testid="reflexity-mark"
      aria-hidden="true"
    >
      <g fill="none" stroke={color} strokeWidth="10" strokeLinecap="round">
        <path d="M 98.05 45.03 A 46.5 46.5 0 1 1 86.01 19.79" />
        <path d="M 61.07 58.77 A 46.5 46.5 0 1 1 74.12 84.38" />
      </g>
    </svg>
  );
}
