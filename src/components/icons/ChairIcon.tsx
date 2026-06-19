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
      <path d="M8 11.5 C8 6, 9.5 3.5, 12 3.5 C14.5 3.5, 16 6, 16 11.5" />
      {/* Seat */}
      <path d="M5.5 12.5h13" />
      {/* Front legs */}
      <path d="M6.5 13.5v8" />
      <path d="M17.5 13.5v8" />
      {/* Back legs */}
      <path d="M10 13.5v4.5" />
      <path d="M14 13.5v4.5" />
    </svg>
  );
}
