// @Architecture(descriptionShort="SVG chevron for group collapse/expand toggles")
interface ChevronIconProps {
  direction: "down" | "right";
  size: number;
  color: string;
}

/** Crisp chevron — unicode ▾/▸ render as specks next to emoji icons. */
export function ChevronIcon({ direction, size, color }: ChevronIconProps) {
  const path = direction === "down" ? "M3 6 L8 11 L13 6" : "M6 3 L11 8 L6 13";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d={path}
        stroke={color}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
