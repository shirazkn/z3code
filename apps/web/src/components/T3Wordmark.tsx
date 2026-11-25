import type { SVGProps } from "react";

// z3: draws the Z3 mark of assets/z3/app-icon.svg; the name stays for upstream merges.
export function T3Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 89 56" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 0H44V11L14.55 45H44V56H0V45L29.45 11H0ZM49 0H89V11H49ZM89 11L71.68 31H57.13L74.45 11ZM66.65 20H68A22 18 0 0 1 68 56H44V45H68A11 7 0 0 0 68 31H66.65Z"
        fill="currentColor"
      />
    </svg>
  );
}
