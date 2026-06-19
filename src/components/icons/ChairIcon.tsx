import type { SVGProps } from "react";

export function ChairIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Backrest — tall rounded rectangle */}
      <path d="M8 11V6a2.5 2.5 0 0 1 2.5-2.5h3A2.5 2.5 0 0 1 16 6v5" />
      {/* Seat — horizontal bar with rounded ends */}
      <path d="M6 11.5h12a1.5 1.5 0 0 1 0 3H6a1.5 1.5 0 0 1 0-3z" />
      {/* Front legs */}
      <path d="M8 14.5v6" />
      <path d="M16 14.5v6" />
      {/* Back legs (slightly visible behind) */}
      <path d="M10 14.5v5" />
      <path d="M14 14.5v5" />
    </svg>
  );
}
