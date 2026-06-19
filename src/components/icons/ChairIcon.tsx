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
      {/* Backrest */}
      <path d="M6 10V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
      {/* Seat */}
      <path d="M5 10v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
      {/* Legs */}
      <path d="M7 15v4" />
      <path d="M17 15v4" />
    </svg>
  );
}

