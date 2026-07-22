import type { SVGProps } from "react";

export function TableChairIcon({
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
      {/* Table top */}
      <path d="M2.5 9.5h13" />
      {/* Table legs */}
      <path d="M3.5 9.5v11" />
      <path d="M14.5 9.5v11" />
      {/* Chair backrest */}
      <path d="M20 6.5v10" />
      {/* Chair seat */}
      <path d="M17 14.5h4" />
      {/* Chair legs */}
      <path d="M17.5 14.5v6" />
      <path d="M20.5 14.5v6" />
    </svg>
  );
}
