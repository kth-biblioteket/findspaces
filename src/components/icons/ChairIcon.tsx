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
      {/* Backrest — straight sides, rounded top */}
      <path d="M7.5 11.5V5a2.5 2.5 0 0 1 2.5-2.5h4A2.5 2.5 0 0 1 16.5 5v6.5" />
      {/* Seat */}
      <path d="M5.5 12.5h13" />
      {/* Front legs */}
      <path d="M6.5 13.5v9" />
      <path d="M17.5 13.5v9" />
      {/* Back legs */}
      <path d="M10 13.5v6" />
      <path d="M14 13.5v6" />
    </svg>
  );
}


