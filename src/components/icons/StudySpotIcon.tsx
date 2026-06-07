import type { SVGProps } from "react";

export function StudySpotIcon({
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
      {/* Desk top */}
      <path d="M3 12h18" />
      {/* Desk legs */}
      <path d="M5 12v7" />
      <path d="M19 12v7" />
      {/* Book on desk */}
      <path d="M9 12v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      {/* Chair backrest */}
      <path d="M7.5 19v-3.5" />
      <path d="M7.5 15.5h-2" />
      {/* Chair seat & leg */}
      <path d="M5.5 19v-3.5" />
    </svg>
  );
}
