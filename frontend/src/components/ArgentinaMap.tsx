/**
 * Simplified SVG silhouette of Argentina for decorative use.
 * ViewBox: 0 0 160 340
 */
interface Props {
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export function ArgentinaMap({
  className = '',
  fill = 'currentColor',
  stroke = 'none',
  strokeWidth = 1,
}: Props) {
  return (
    <svg
      viewBox="0 0 160 340"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      {/* Mainland Argentina */}
      <path d="
        M 40,5
        L 58,3 L 80,2 L 100,5 L 115,8
        L 128,13 L 137,22 L 142,33
        L 136,42 L 132,50
        L 146,63 L 151,79 L 154,97
        L 153,115 L 150,131 L 148,147 L 146,161
        C 141,174 137,183 133,191
        L 139,205
        C 141,217 139,229 134,242
        L 124,260 L 110,278 L 94,296
        L 77,312 L 62,325 L 52,332
        L 43,328 L 32,313 L 21,293
        L 13,270 L 7,246 L 4,222
        L 4,198 L 6,174 L 9,151
        L 13,128 L 17,105 L 21,82
        L 26,61 L 31,43 L 36,26
        Z
      " />
      {/* Tierra del Fuego (simplified island) */}
      <path d="
        M 48,336
        L 58,334 L 66,337 L 70,342
        L 64,346 L 54,344
        Z
      " />
    </svg>
  );
}
