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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Backrest */}
      <path d="M7 4v10" />
      <path d="M17 4v10" />
      <path d="M7 7h10" />
      {/* Seat */}
      <path d="M5 14h14" />
      {/* Legs */}
      <path d="M7 14v6" />
      <path d="M17 14v6" />
    </svg>
  );
}
