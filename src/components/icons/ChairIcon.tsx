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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Backrest - slightly rounded top */}
      <path d="M8 4v8" />
      <path d="M16 4v8" />
      <path d="M8 4h8" />
      {/* Seat */}
      <path d="M6 12h12" />
      {/* Legs */}
      <path d="M8 12v8" />
      <path d="M16 12v8" />
      {/* Seat edge detail for depth */}
      <path d="M6 12v2" />
      <path d="M18 12v2" />
    </svg>
  );
}
