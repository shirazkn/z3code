import type { SVGProps } from "react";

/** "Z3" on a 56-unit cap height, 11-unit strokes: both diagonals share one slope, and the Z's
 *  bottom bar runs into the 3's bottom stroke on one baseline band. */
export function Z3Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 90 56" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 0H44V11L14.55 45H44V56H0V45L29.45 11H0ZM49 0H89V11H49ZM89 11L71.68 31H57.13L74.45 11ZM66.65 20H68A22 18 0 0 1 68 56H44V45H68A11 7 0 0 0 68 31H66.65Z"
        fill="currentColor"
      />
    </svg>
  );
}
