import { Fragment } from "react";

const KEY_AT = { "↑": [6, 0], "←": [0, 6], "↓": [6, 6], "→": [12, 6] } as const;
type Arrow = keyof typeof KEY_AT;

/** The arrow-key cluster as on a keyboard; the keys not in `lit` are faint. */
function ArrowKeys({ lit }: { lit: string }) {
  return (
    <svg
      viewBox="0 0 17 11"
      role="img"
      aria-label={`arrow keys ${lit}`}
      className="inline-block h-[0.95em] w-auto align-[-0.1em]"
      fill="currentColor"
    >
      {(Object.keys(KEY_AT) as Array<Arrow>).map((key) => (
        <rect
          key={key}
          x={KEY_AT[key][0]}
          y={KEY_AT[key][1]}
          width={5}
          height={5}
          rx={1.2}
          opacity={lit.includes(key) ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

/** A key hint's text, with each run of arrow characters drawn as the arrow-key cluster. */
export function HintKeys({ keys }: { keys: string }) {
  return keys.split(/([←↓↑→]+)/).map((part, index) => (
    // oxlint-disable-next-line react/no-array-index-key -- the parts of a constant string
    <Fragment key={index}>{index % 2 === 1 ? <ArrowKeys lit={part} /> : part}</Fragment>
  ));
}
