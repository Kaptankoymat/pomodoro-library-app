import { useId } from "react";

type OrnamentProps = { className?: string };

/** Small repeatable SVG materials give the objects depth without raster textures. */
function AntiqueMaterials({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-brass`}>
        <stop stopColor="#39230f" />
        <stop offset=".18" stopColor="#a57231" />
        <stop offset=".34" stopColor="#f3d493" />
        <stop offset=".49" stopColor="#99632b" />
        <stop offset=".66" stopColor="#cca154" />
        <stop offset="1" stopColor="#493018" />
      </linearGradient>
      <linearGradient id={`${id}-pages`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#815b35" />
        <stop offset=".2" stopColor="#ddc596" />
        <stop offset=".55" stopColor="#c5ac7d" />
        <stop offset=".88" stopColor="#b18e5c" />
        <stop offset="1" stopColor="#684a2d" />
      </linearGradient>
      <linearGradient id={`${id}-patina`} x1="0" y1="0" x2=".85" y2="1">
        <stop stopColor="#ffe3a2" stopOpacity=".18" />
        <stop offset=".3" stopColor="#fff1bf" stopOpacity=".025" />
        <stop offset=".7" stopColor="#130d0b" stopOpacity=".12" />
        <stop offset="1" stopColor="#080605" stopOpacity=".62" />
      </linearGradient>
      <linearGradient id={`${id}-binding`}>
        <stop stopColor="#080605" stopOpacity=".65" />
        <stop offset=".13" stopColor="#ffe6b2" stopOpacity=".2" />
        <stop offset=".28" stopColor="#f7cd8f" stopOpacity=".03" />
        <stop offset=".7" stopColor="#130b0b" stopOpacity=".08" />
        <stop offset=".92" stopColor="#080605" stopOpacity=".62" />
        <stop offset="1" stopColor="#d7b16e" stopOpacity=".12" />
      </linearGradient>
      <linearGradient id={`${id}-glass`}>
        <stop stopColor="#f8e5b6" stopOpacity=".32" />
        <stop offset=".12" stopColor="#abbea8" stopOpacity=".09" />
        <stop offset=".35" stopColor="#e3ddba" stopOpacity=".015" />
        <stop offset=".8" stopColor="#180e0a" stopOpacity=".12" />
        <stop offset=".94" stopColor="#ffdb8d" stopOpacity=".19" />
        <stop offset="1" stopColor="#efd7a8" stopOpacity=".4" />
      </linearGradient>
      <radialGradient id={`${id}-glow`}>
        <stop stopColor="#ffe4a1" stopOpacity=".63" />
        <stop offset=".3" stopColor="#f4bd5d" stopOpacity=".31" />
        <stop offset=".68" stopColor="#dc8d2c" stopOpacity=".1" />
        <stop offset="1" stopColor="#d88a2a" stopOpacity="0" />
      </radialGradient>
      <pattern
        id={`${id}-leather-grain`}
        width="11"
        height="13"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="m1 2 2-1m4 5 2 1m-7 4 2-1M8 1l1 2M4 6l1 1"
          stroke="#efc480"
          strokeWidth=".45"
          opacity=".18"
        />
        <path
          d="m2 4 1 1m4 4 2-1m-3 4 1-1"
          stroke="#0d0806"
          strokeWidth=".7"
          opacity=".3"
        />
      </pattern>
      <pattern
        id={`${id}-page-lines`}
        width="18"
        height="3.4"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M0 .5h11m2 0h5M1 2h17"
          stroke="#74512f"
          strokeWidth=".45"
          opacity=".56"
        />
        <path d="M3 1.2h9" stroke="#f4dfb1" strokeWidth=".4" opacity=".45" />
      </pattern>
      <pattern
        id={`${id}-metal-etching`}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="m4 1 2 3-2 3-2-3ZM0 4h2m4 0h2"
          stroke="#f3d493"
          strokeWidth=".4"
          opacity=".25"
        />
      </pattern>
    </defs>
  );
}

const leafPositions = [
  [47, 6, -45],
  [69, 21, 38],
  [48, 40, -43],
  [78, 56, 34],
  [65, 78, -46],
  [91, 97, 38],
  [77, 121, -48],
  [96, 144, 32],
  [70, 163, -65],
  [78, 187, 20],
  [51, 207, -70],
  [55, 230, 18],
  [31, 247, -61],
  [36, 269, 12],
];

/** Noninteractive ornaments deliberately stay separate from the library inventory. */
export function LibraryVine({
  className = "",
  flipped = false,
}: OrnamentProps & { flipped?: boolean }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-vine ${className}`}
      viewBox="0 0 135 300"
      fill="none"
    >
      <defs>
        <linearGradient
          id={`${id}-leaf`}
          x1="-12"
          y1="-20"
          x2="8"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#97914b" />
          <stop offset="0.4" stopColor="#526632" />
          <stop offset="1" stopColor="#1f3520" />
        </linearGradient>
      </defs>
      <g transform={flipped ? "translate(135 0) scale(-1 1)" : undefined}>
        <path
          d="M50-8C22 35 84 62 84 100s24 46 0 69S72 216 47 235s-7 36-22 59"
          stroke="#1d291a"
          strokeWidth="5"
        />
        <path
          d="M50-8C22 35 84 62 84 100s24 46 0 69S72 216 47 235s-7 36-22 59"
          stroke="#71804a"
          strokeWidth="1.4"
        />
        {leafPositions.map(([x, y, rotation], index) => (
          <g key={index} transform={`translate(${x} ${y}) rotate(${rotation})`}>
            {index % 2 === 0 ? (
              <g transform="translate(-3 10) rotate(60) scale(.72)">
                <path
                  d="M0 12C-20 3-19-15-3-25 11-10 16 3 0 12Z"
                  fill={`url(#${id}-leaf)`}
                  stroke="#1c2c1c"
                />
                <path
                  d="M-3-21 0 10m-1-8-7-8m7 3 6-8"
                  stroke="#a8a05c"
                  strokeWidth=".7"
                  opacity=".5"
                />
              </g>
            ) : null}
            <path
              d="M0 12C-20 3-19-15-3-25 11-10 16 3 0 12Z"
              fill={`url(#${id}-leaf)`}
              stroke="#192b1d"
              strokeWidth="1.2"
            />
            <path
              d="M-3-21 0 10M-1-4-10-11M0 1 7-6M-2-10l-6-6m7 10 5-7M0 5l-7-5"
              stroke="#afad60"
              strokeWidth="0.8"
              opacity="0.45"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function MagicLamp({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-magic-lamp ${className}`}
      viewBox="0 0 140 180"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <radialGradient id={`${id}-shade`} cx="50%" cy="75%" r="76%">
          <stop stopColor="#fff0ba" />
          <stop offset=".35" stopColor="#f9d483" />
          <stop offset=".7" stopColor="#ce923e" />
          <stop offset="1" stopColor="#845021" />
        </radialGradient>
      </defs>
      <ellipse
        className="library-lamplight"
        cx="70"
        cy="90"
        rx="86"
        ry="94"
        fill={`url(#${id}-glow)`}
      />
      <ellipse cx="70" cy="164" rx="38" ry="5" fill="#130b06" opacity=".6" />
      <path
        d="M52 32q18-13 36 0l2 8H50Z"
        fill={`url(#${id}-brass)`}
        stroke="#3f2814"
        strokeWidth="1.5"
      />
      <path
        d="M64 28v-4q-6-8 0-13 7-6 13 0 6 5 0 13v4"
        fill={`url(#${id}-brass)`}
        stroke="#8e652e"
      />
      <ellipse cx="70" cy="28" rx="10" ry="3" fill="#d2aa61" stroke="#5f3c1c" />
      <path
        d="M53 36C50 59 33 67 28 94q7 9 14 1 7 11 15 3 13 11 26 0 8 8 15-3 7 8 14-1C107 68 90 59 87 36Z"
        fill={`url(#${id}-shade)`}
        stroke="#7e4c1d"
        strokeWidth="1.8"
      />
      <path
        d="M54 37C55 58 44 72 42 95M64 36C67 60 55 74 57 98M77 36C75 60 85 74 83 98M86 37C87 60 97 74 98 95"
        stroke="#ad762c"
        strokeWidth="1.3"
      />
      <path
        d="M30 92q6 6 12-1 7 10 15 3 13 8 26 0 8 7 15-3 6 7 12 1M55 41q15 7 30 0"
        stroke="#ffdf94"
        strokeWidth="1.2"
      />
      <g stroke="#a66925" strokeWidth=".9" opacity=".9">
        <path d="M70 48c-10 10-9 20 0 30 9-10 10-20 0-30ZM70 49v27m0-7-7-7m7 2 7-8" />
        <path d="M48 63c-7 5-10 14-5 20 7-4 9-14 5-20Zm43 0c7 5 10 14 5 20-7-4-9-14-5-20Z" />
      </g>
      <g fill="#fff0b1">
        <path d="m70 80 2 4-2 5-2-5Z" />
        <circle cx="52" cy="51" r="1.2" />
        <circle cx="88" cy="51" r="1.2" />
      </g>
      <ellipse
        cx="70"
        cy="102"
        rx="12"
        ry="4"
        fill="#e6bc6b"
        stroke="#805021"
      />
      <path
        d="M65 103h10q-5 9 2 15l-3 4v21q1 7 13 11H53q12-4 13-11v-21l-3-4q7-6 2-15Z"
        fill={`url(#${id}-brass)`}
        stroke="#4e3117"
        strokeWidth="1.4"
      />
      <path
        d="M66 121h8m-8 20h8M67 109v7m1 8v15"
        stroke="#f4d795"
        strokeWidth=".8"
      />
      <path
        d="M53 152q17-7 34 0l7 7q-24 10-48 0Z"
        fill={`url(#${id}-brass)`}
        stroke="#4c2e13"
        strokeWidth="1.4"
      />
      <ellipse
        cx="70"
        cy="161"
        rx="27"
        ry="4"
        fill={`url(#${id}-brass)`}
        stroke="#af813e"
      />
      <path
        d="M48 159q22 5 44 0m-36-4q14 3 28 0"
        stroke="#e7c37c"
        strokeWidth=".8"
      />
      <path
        d="M100 98v28"
        stroke="#d7ae61"
        strokeWidth=".8"
        strokeDasharray="1.5 1"
      />
      <path d="m100 125 2 4-2 5-2-5Z" fill="#e7be6f" stroke="#8e5f28" />
    </svg>
  );
}

export function GlassJar({ className = "" }: OrnamentProps) {
  const id = useId();
  const glass =
    "M34 26v11C20 41 17 48 17 61v60q0 13 13 15h40q13-2 13-15V61c0-13-3-20-17-24V26";
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-glass-jar ${className}`}
      viewBox="0 0 100 150"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <ellipse
        className="library-lamplight"
        cx="50"
        cy="94"
        rx="61"
        ry="65"
        fill={`url(#${id}-glow)`}
      />
      <ellipse cx="50" cy="139" rx="36" ry="4" fill="#160d08" opacity=".6" />
      <path
        d={glass}
        fill={`url(#${id}-glass)`}
        stroke="#b7b29a"
        strokeWidth="1.4"
        strokeOpacity=".65"
      />
      <path d="M20 121q30 9 60 0v7q-30 11-60 0Z" fill="#a0783d" opacity=".4" />
      <ellipse cx="50" cy="127" rx="26" ry="5" fill="#e6b34f" opacity=".32" />
      <path
        d="M26 117c18 3 8-20 24-19s7-20 15-28M34 125c3-13 23-7 32-20"
        stroke="#efc368"
        strokeWidth=".7"
        strokeDasharray="1 4"
      />
      <g
        className="library-enchanted-star"
        fill="#fff0b3"
        stroke="#e1a84e"
        strokeWidth=".5"
      >
        <path d="m49 71 4 13 13 1-10 8 3 13-10-8-11 8 4-13-11-8 14-1Z" />
        <path d="m31 105 3 7 8 1-6 5 2 8-7-5-6 5 2-8-6-5 8-1Z" />
        <path d="m66 45 2 6 7 1-5 4 1 6-5-4-5 4 2-6-5-4 6-1Z" />
        <path d="m63 106 3 6 7 1-5 4 1 6-6-3-5 3 1-6-4-4 6-1Z" />
      </g>
      <g fill="#fff0bf">
        {[
          [32, 63, 1.4],
          [50, 52, 1],
          [70, 85, 1.7],
          [34, 93, 1],
          [54, 118, 1.4],
          [24, 81, 0.8],
          [71, 116, 0.8],
          [59, 66, 0.7],
          [43, 111, 0.7],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <path
        d="M34 39q16 4 32 0M22 128q28 12 56 0"
        stroke="#f7dfa9"
        strokeWidth="1"
        opacity=".5"
      />
      <path
        d="M28 49c-6 8-5 19-5 34m1 9v15"
        stroke="#fff5d7"
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity=".48"
      />
      <path
        d="M33 46q6-5 13-4M77 55v49"
        stroke="#ffedbf"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity=".5"
      />
      <rect
        x="29"
        y="23"
        width="42"
        height="7"
        rx="2"
        fill={`url(#${id}-brass)`}
        stroke="#806133"
      />
      <path d="M33 23v-9q17-5 34 0v9Z" fill="#745334" stroke="#a17d48" />
      <path
        d="M34 16h31M37 19h4m4-2h5m7 3h5"
        stroke="#b2945f"
        strokeWidth=".7"
      />
      <ellipse cx="50" cy="14" rx="17" ry="3" fill="#a58350" stroke="#5e4127" />
      <path d="M33 28h34" stroke="#f0d18e" strokeWidth=".65" />
    </svg>
  );
}

export function ConstellationGlobe({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-globe ${className}`}
      viewBox="0 0 140 160"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <radialGradient id={`${id}-sky`} cx="29%" cy="29%" r="76%">
          <stop stopColor="#535269" />
          <stop offset=".35" stopColor="#303749" />
          <stop offset=".75" stopColor="#151c2b" />
          <stop offset="1" stopColor="#080f19" />
        </radialGradient>
        <clipPath id={`${id}-sphere`}>
          <circle cx="73" cy="66" r="49" />
        </clipPath>
      </defs>
      <ellipse cx="72" cy="148" rx="36" ry="5" fill="#100b08" opacity=".7" />
      <path
        d="M45 13C1 31 3 103 44 121q24 13 50-1"
        stroke="#332310"
        strokeWidth="7"
      />
      <path
        d="M45 13C1 31 3 103 44 121q24 13 50-1"
        stroke={`url(#${id}-brass)`}
        strokeWidth="4.5"
      />
      <path d="M43 16C7 36 10 95 46 117" stroke="#edc77d" strokeWidth=".8" />
      <circle
        cx="73"
        cy="66"
        r="49"
        fill={`url(#${id}-sky)`}
        stroke="#9c7b44"
        strokeWidth="1.4"
      />
      <g clipPath={`url(#${id}-sphere)`}>
        <circle
          cx="73"
          cy="66"
          r="49"
          fill={`url(#${id}-leather-grain)`}
          opacity=".48"
        />
        <g stroke="#b5975e" strokeWidth=".55" opacity=".5">
          <ellipse
            cx="73"
            cy="66"
            rx="24"
            ry="49"
            transform="rotate(-22 73 66)"
          />
          <ellipse
            cx="73"
            cy="66"
            rx="41"
            ry="49"
            transform="rotate(-22 73 66)"
          />
          <ellipse
            cx="73"
            cy="66"
            rx="48"
            ry="18"
            transform="rotate(-22 73 66)"
          />
          <ellipse
            cx="66"
            cy="48"
            rx="40"
            ry="13"
            transform="rotate(-22 66 48)"
          />
          <ellipse
            cx="80"
            cy="83"
            rx="40"
            ry="13"
            transform="rotate(-22 80 83)"
          />
          <path d="M28 83 118 49M54 20 91 111" />
        </g>
        <path
          d="m42 54 21-12 13 23 21-7 8 25-20 9-24-20Zm21-12 12-13 20 8 2 21M42 54l-9 25 14 12 14-19m24 20-9 15"
          stroke="#d6a753"
          strokeWidth=".8"
        />
        <g fill="#fbe3a4">
          {[
            [42, 54, 2],
            [63, 42, 1.6],
            [76, 65, 2.1],
            [97, 58, 1.5],
            [105, 83, 1.4],
            [85, 92, 1.7],
            [61, 72, 1.2],
            [75, 29, 1.2],
            [95, 37, 1],
            [33, 79, 1],
            [47, 91, 1],
            [76, 107, 0.8],
            [43, 35, 0.7],
            [88, 77, 0.7],
            [63, 96, 0.8],
            [59, 26, 0.7],
            [109, 46, 0.7],
            [51, 61, 0.7],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
        <path
          className="library-enchanted-star"
          d="m42 48 1.5 4.5L48 54l-4.5 1.5L42 60l-1.5-4.5L36 54l4.5-1.5Zm34 12 1.2 3.8L81 65l-3.8 1.2L76 70l-1.2-3.8L71 65l3.8-1.2Z"
          fill="#ffe5a5"
        />
        <path
          d="M35 47q5-18 23-24"
          stroke="#b9b9bd"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity=".24"
        />
        <ellipse
          cx="43"
          cy="47"
          rx="15"
          ry="27"
          fill={`url(#${id}-glow)`}
          opacity=".32"
          transform="rotate(35 43 47)"
        />
      </g>
      <path
        d="m66 119 1 12-9 10h31l-11-10 1-14"
        fill={`url(#${id}-brass)`}
        stroke="#523a1c"
      />
      <ellipse
        cx="73"
        cy="143"
        rx="27"
        ry="5"
        fill={`url(#${id}-brass)`}
        stroke="#5c3c1d"
      />
      <path d="M49 143q24 5 48 0" stroke="#d4b16b" strokeWidth=".8" />
      <path
        d="M66 124h13m-13 3h13m-40-110-4-8m12 4-4-8m49 114 5 8"
        stroke={`url(#${id}-brass)`}
        strokeWidth="3"
      />
      <circle cx="39" cy="13" r="2.4" fill="#e0bd78" />
    </svg>
  );
}

export function BookStack({ className = "" }: OrnamentProps) {
  const id = useId();
  const books = [
    { x: 13, y: 95, width: 153, height: 24, angle: -1, color: "#5e2a32" },
    { x: 25, y: 70, width: 139, height: 24, angle: 2, color: "#24483a" },
    { x: 11, y: 40, width: 145, height: 28, angle: -4, color: "#20344c" },
    { x: 62, y: 21, width: 86, height: 17, angle: 1, color: "#644530" },
  ];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-book-stack ${className}`}
      viewBox="0 0 180 125"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <ellipse cx="92" cy="120" rx="79" ry="4" fill="#100b08" opacity=".55" />
      {books.map(({ x, y, width: w, height: h, angle, color }, index) => {
        const cover = `M${x} ${y}q-7 ${h / 2} 0 ${h}h${w}v-${h}Z`;
        const pages = `M${x + 35} ${y + 4}h${w - 41}l-1 ${h - 8}H${x + 35}q4-${(h - 8) / 2} 0-${h - 8}Z`;
        return (
          <g key={y} transform={`rotate(${angle} 90 ${y + h / 2})`}>
            <path
              d={`M${x} ${y}l8-5h${w - 1}l-7 5Z`}
              fill={color}
              stroke="#c29859"
              strokeWidth=".6"
            />
            <path
              d={`M${x} ${y}l8-5h${w - 1}l-7 5Z`}
              fill={`url(#${id}-patina)`}
            />
            <path d={cover} fill={color} stroke="#352417" strokeWidth="1.5" />
            <path d={cover} fill={`url(#${id}-patina)`} />
            <path d={cover} fill={`url(#${id}-leather-grain)`} />
            <path
              d={pages}
              fill={`url(#${id}-pages)`}
              stroke="#6c4d2f"
              strokeWidth=".5"
            />
            <path d={pages} fill={`url(#${id}-page-lines)`} />
            <path
              d={`M${x + 40} ${y + 5}q-2 ${h / 2 - 5} 0 ${h - 10}M${x + w - 11} ${y + 4}v${h - 8}`}
              stroke="#765432"
              strokeWidth=".65"
              opacity=".75"
            />
            <path
              d={`M${x + 1} ${y + 1}h${w - 2}M${x + 1} ${y + h - 1}h${w - 2}`}
              stroke="#c79d58"
              strokeWidth=".85"
            />
            <path
              d={`M${x + 1} ${y + 3}h${w - 2}M${x + 1} ${y + h - 3}h${w - 2}`}
              stroke="#110c08"
              strokeWidth="1.2"
              opacity=".65"
            />
            {[6, 12, 29].map((offset) => (
              <g key={offset}>
                <path
                  d={`M${x + offset} ${y + 3}v${h - 6}`}
                  stroke="#2b1c11"
                  strokeWidth="3.5"
                />
                <path
                  d={`M${x + offset - 0.7} ${y + 3}v${h - 6}`}
                  stroke={`url(#${id}-brass)`}
                  strokeWidth="1.7"
                />
              </g>
            ))}
            <g
              transform={`translate(${x + 21} ${y + h / 2})`}
              stroke="#cfa964"
              strokeWidth=".7"
            >
              <path d="M0-5C-7-6-5 6 0 5c5 1 7-11 0-10ZM0-5v10M-3 0h6" />
              {index !== 3 ? <path d="m-4-7 4-2 4 2M-4 7l4 2 4-2" /> : null}
            </g>
          </g>
        );
      })}
      <path
        d="M120 36v18l5-3 5 4V35"
        fill="#90613c"
        opacity=".9"
        stroke="#be9660"
        strokeWidth=".5"
      />
    </svg>
  );
}

export function UprightBooks({ className = "" }: OrnamentProps) {
  const id = useId();
  const books = [
    { x: 6, y: 16, width: 25, height: 119, color: "#163b52" },
    { x: 34, y: 6, width: 24, height: 129, color: "#493153" },
    { x: 61, y: 21, width: 29, height: 114, color: "#204c3b" },
    { x: 93, y: 11, width: 23, height: 124, color: "#652b35" },
    { x: 120, y: 24, width: 31, height: 111, color: "#3c3a2e" },
  ];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-upright-books ${className}`}
      viewBox="0 0 175 140"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      {books.map(({ x, y, width: w, height: h, color }, index) => (
        <g key={x} transform={index === 4 ? "rotate(-6 122 135)" : undefined}>
          <path
            d={`M${x + 1} ${y}l4-3h${w - 1}v${h}l-4 3Z`}
            fill="#1b1711"
            stroke="#8f754b"
            strokeWidth=".7"
          />
          <path
            d={`M${x + 4} ${y - 1}h${w - 4}`}
            stroke="#c4ad80"
            strokeWidth="1.2"
          />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="2"
            fill={color}
            stroke="#342416"
          />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="2"
            fill={`url(#${id}-binding)`}
          />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="2"
            fill={`url(#${id}-leather-grain)`}
          />
          <path
            d={`M${x + 4} ${y + 7}q4 0 4-4h${w - 16}q0 4 4 4v${h - 14}q-4 0-4 4H${x + 8}q0-4-4-4Z`}
            stroke="#c7a264"
            strokeWidth=".55"
            opacity=".9"
          />
          {[10, h - 12].map((offset) => (
            <g key={offset}>
              <rect
                x={x + 2}
                y={y + offset}
                width={w - 4}
                height="4"
                rx=".8"
                fill="#16100c"
                opacity=".55"
              />
              <path
                d={`M${x + 3} ${y + offset}h${w - 6}m${6 - w} 3h${w - 6}`}
                stroke="#c59c56"
                strokeWidth=".8"
              />
            </g>
          ))}
          <g
            transform={`translate(${x + w / 2} ${y + h / 2})`}
            stroke="#d3b275"
            strokeWidth=".65"
          >
            <path d="M0-25v10m0 20v13M-4-5l4-7 4 7-4 7Z" />
            <path d="M-6-7c-8-5-8 8 0 8M6-7c8-5 8 8 0 8M-3-20l3-3 3 3M-3 18l3 3 3-3" />
            <circle cy="-5" r="10" strokeDasharray=".7 2.3" opacity=".65" />
            <path d="M-5 33q-4 0-3-4t5 2q3-3 3-7 0 4 3 7t5-2-3 4M0 30v7" />
          </g>
          <path
            d={`M${x + 4} ${y + 2}h${w - 8}M${x + 4} ${y + h - 2}h${w - 8}`}
            stroke="#ead095"
            strokeWidth=".6"
            opacity=".65"
          />
          <path
            d={`M${x + w - 3} ${y + 15}v${h - 30}`}
            stroke="#050606"
            strokeWidth="1"
            opacity=".55"
          />
        </g>
      ))}
    </svg>
  );
}

export function Hourglass({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-hourglass ${className}`}
      viewBox="0 0 90 145"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <ellipse
        className="library-lamplight"
        cx="45"
        cy="108"
        rx="46"
        ry="40"
        fill={`url(#${id}-glow)`}
      />
      <ellipse cx="45" cy="135" rx="33" ry="4" fill="#150d07" opacity=".6" />
      <path
        d="M26 25c-2 32 10 36 15 44v7c-5 8-17 13-15 45h38c2-32-10-37-15-45v-7c5-8 17-12 15-44Z"
        fill={`url(#${id}-glass)`}
        stroke="#c7b998"
        strokeWidth="1.2"
      />
      <path d="M30 43q2 15 15 24 13-9 15-24Z" fill="#d39b42" />
      <ellipse cx="45" cy="43" rx="15" ry="2.5" fill="#efcf86" />
      <path d="M29 117q8-8 16-16 8 8 16 16Z" fill="#f6d088" />
      <path d="M31 118q14 3 28 0" stroke="#fff0be" />
      <path
        className="library-enchanted-star"
        d="M45 70v34"
        stroke="#ffe1a0"
        strokeWidth=".85"
      />
      <path
        d="M31 30c-1 18 3 25 8 30M30 110q2-17 10-25"
        stroke="#fff3d2"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".7"
      />
      <path
        d="M58 32q2 18-8 30m10 48q-3-18-9-24"
        stroke="#d6b982"
        strokeWidth=".8"
        opacity=".7"
      />
      {[18, 65].map((x) => (
        <g key={x}>
          <path
            d={`M${x} 22h7l-1 17-1 5v57l1 5 1 17h-7l1-17 1-5V44l-1-5Z`}
            fill={`url(#${id}-brass)`}
            stroke="#553817"
            strokeWidth=".9"
          />
          <path
            d={`M${x} 38h7m-7 4h7m-7 60h7m-7 5h7`}
            stroke="#d3ae66"
            strokeWidth=".7"
          />
        </g>
      ))}
      <path
        d="M13 13q32-5 64 0v10q-32 5-64 0Z"
        fill={`url(#${id}-brass)`}
        stroke="#63401e"
        strokeWidth="1.2"
      />
      <ellipse cx="45" cy="13" rx="32" ry="4" fill="#7e572a" stroke="#d0aa60" />
      <path
        d="M13 121q32-4 64 0v10q-32 6-64 0Z"
        fill={`url(#${id}-brass)`}
        stroke="#63401e"
        strokeWidth="1.2"
      />
      <path
        d="M15 16q30 5 60 0m-60 5q30 5 60 0m-60 103q30 5 60 0m-60 5q30 5 60 0"
        stroke="#f2ce87"
        strokeWidth=".7"
      />
      <path
        d="M20 18h50M20 126h50"
        stroke={`url(#${id}-metal-etching)`}
        strokeWidth="3"
      />
    </svg>
  );
}

export function CrystalCluster({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-crystals ${className}`}
      viewBox="0 0 120 115"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop stopColor="#d9abd3" stopOpacity=".38" />
          <stop offset=".55" stopColor="#a775b0" stopOpacity=".12" />
          <stop offset="1" stopColor="#684478" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-amethyst`} x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#24162f" />
          <stop offset=".3" stopColor="#6f467f" />
          <stop offset=".57" stopColor="#d5afd3" />
          <stop offset=".7" stopColor="#80518c" />
          <stop offset="1" stopColor="#37223e" />
        </linearGradient>
        <linearGradient id={`${id}-facet`} x1="1" y1="0" x2="0" y2="1">
          <stop stopColor="#f6dbe8" stopOpacity=".95" />
          <stop offset=".37" stopColor="#c69acb" stopOpacity=".28" />
          <stop offset="1" stopColor="#251330" stopOpacity=".88" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="73" rx="63" ry="47" fill={`url(#${id}-aura)`} />
      <g stroke="#b28eb9" strokeWidth=".7">
        <path d="m47 42 15-28 14 28-2 54-25 2Z" fill={`url(#${id}-amethyst)`} />
        <path d="m62 14 3 38-16 46-2-56Z" fill={`url(#${id}-facet)`} />
        <path d="m62 14 14 28-11 10-3 42" stroke="#edcceb" />
        <path d="m47 42 18 10 9 44" stroke="#c3a0cf" />
        <path d="m24 66 4-29 21 25 11 39-28-4Z" fill={`url(#${id}-amethyst)`} />
        <path d="m28 37 11 33 21 31-11-39Z" fill={`url(#${id}-facet)`} />
        <path d="m24 66 15 4 10-8m-10 8-7 27" stroke="#dec0df" />
        <path d="m79 59 22-15-2 34-18 24-16-8Z" fill={`url(#${id}-amethyst)`} />
        <path d="m101 44-17 28-19 22 16 8 18-24Z" fill={`url(#${id}-facet)`} />
        <path d="m79 59 5 13 15 6m-15-6-3 30" stroke="#bda4d0" />
        <path d="m10 85 5-17 18 15 17 21-26-2Z" fill={`url(#${id}-amethyst)`} />
        <path d="m15 68 9 19 26 17-17-21Z" fill={`url(#${id}-facet)`} />
        <path d="m88 87 19-12-1 25-16 7-13-6Z" fill={`url(#${id}-amethyst)`} />
        <path d="m107 75-13 18-17 8 13 6 16-7Z" fill={`url(#${id}-facet)`} />
        <path
          d="m44 97 7-19 12 16 12-14 8 19-17 8Z"
          fill={`url(#${id}-amethyst)`}
        />
      </g>
      <path
        d="M17 102q43-8 87-1l-3 9H20Z"
        fill={`url(#${id}-brass)`}
        stroke="#6b4520"
      />
      <path d="M22 106q37-2 78-1" stroke="#d9b16a" strokeWidth=".8" />
      <g fill="#efd7b5">
        <circle cx="26" cy="105" r=".8" />
        <circle cx="42" cy="104" r=".8" />
        <circle cx="61" cy="104" r=".8" />
        <circle cx="80" cy="105" r=".8" />
        <circle cx="96" cy="105" r=".8" />
      </g>
      <path
        className="library-sparkle"
        d="m64 23 1 4 4 1-4 1-1 4-1-4-4-1 4-1Zm-30 56 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"
        fill="#ffe3f2"
      />
    </svg>
  );
}

export function QuillDecoration({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-quill ${className}`}
      viewBox="0 0 90 155"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <linearGradient id={`${id}-feather`}>
          <stop stopColor="#786e65" />
          <stop offset=".43" stopColor="#c6baa4" />
          <stop offset=".55" stopColor="#e6dac2" />
          <stop offset="1" stopColor="#8a7b6e" />
        </linearGradient>
        <linearGradient id={`${id}-ink`}>
          <stop stopColor="#080b0c" />
          <stop offset=".3" stopColor="#3b3b35" />
          <stop offset=".55" stopColor="#121919" />
          <stop offset="1" stopColor="#080b0b" />
        </linearGradient>
      </defs>
      <path
        d="M34 110C34 84 36 61 50 39l-1 9c10-17 20-31 34-42-1 13-2 24-5 34l-4 4 2 3c-3 13-8 22-16 31l-6 3 2 3c-7 7-12 9-16 14Z"
        fill={`url(#${id}-feather)`}
        stroke="#65594d"
        strokeWidth=".7"
      />
      <path d="M33 123C44 84 62 41 81 11" stroke="#4e4233" strokeWidth="1.5" />
      <path d="M36 111C47 78 63 41 78 17" stroke="#e6d7b8" strokeWidth=".7" />
      <g stroke="#706459" strokeWidth=".55" opacity=".7">
        <path d="m45 89 14-9m-11 1 16-10m-13 2 18-13m-14 5 17-14m-13 5 17-17m-13 7 15-18m-11 10 13-21M43 92l-5-14m9 4-6-15m10 6-5-16m9 8-5-18m9 9-3-18m7 8-2-18m6 10-1-17" />
      </g>
      <ellipse cx="33" cy="147" rx="24" ry="4" fill="#0b0805" opacity=".65" />
      <path
        d="m24 117-8 8 1 18q15 9 33-1l-1-17-9-8"
        fill={`url(#${id}-ink)`}
        stroke="#876330"
        strokeWidth="1.4"
      />
      <path
        d="m18 126 6 5 2 13m19-18-5 6-1 13"
        stroke="#aa986b"
        strokeWidth=".6"
        opacity=".6"
      />
      <ellipse
        cx="32"
        cy="119"
        rx="13"
        ry="4"
        fill={`url(#${id}-brass)`}
        stroke="#664419"
      />
      <ellipse
        cx="32"
        cy="118"
        rx="9"
        ry="2.5"
        fill="#080b09"
        stroke="#d0a85c"
        strokeWidth=".6"
      />
      <path
        d="M21 139q11 5 23 0M25 122v5"
        stroke="#e0cc97"
        strokeWidth=".9"
        opacity=".65"
      />
      <path d="m28 130 4-4 4 4-4 6Z" stroke="#9d814a" strokeWidth=".6" />
    </svg>
  );
}

export function SleepingCat({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-sleeping-cat ${className}`}
      viewBox="0 0 170 100"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <radialGradient id={`${id}-fur`} cx="37%" cy="24%" r="85%">
          <stop stopColor="#e1d1b7" />
          <stop offset=".48" stopColor="#c5b296" />
          <stop offset="1" stopColor="#8b765f" />
        </radialGradient>
        <linearGradient id={`${id}-velvet`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#754235" />
          <stop offset=".5" stopColor="#452430" />
          <stop offset="1" stopColor="#27161e" />
        </linearGradient>
      </defs>
      <path
        d="M18 80q64-20 130 0l-12 14H27Z"
        fill={`url(#${id}-velvet)`}
        stroke="#ae8147"
      />
      <path d="M22 83q62-14 121 0l-9 8H30Z" stroke="#c39857" strokeWidth=".8" />
      <path
        d="m33 82 7 7 7-9 8 8 8-9 8 8 8-9 8 9 8-8 8 9 8-8 9 7 8-6"
        stroke="#b08142"
        strokeWidth=".7"
        opacity=".65"
      />
      <path
        d="M46 73c-5-24 18-46 51-47l-2 3 11-2-1 3c24 1 43 19 40 38-3 18-75 22-99 5Z"
        fill={`url(#${id}-fur)`}
        stroke="#8f7a60"
        strokeWidth=".8"
      />
      <path
        d="M88 74c26 5 47-5 46-18-1-14-18-19-33-12"
        stroke="#9b866b"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M89 71c23 5 42-5 40-16"
        stroke="#ceba9a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="m37 50-3-18 16 9q9-4 18-1l14-13 3 23 4 6-3 1 2 5c-3 17-36 24-50 8l-5-7 4-1-3-7Z"
        fill={`url(#${id}-fur)`}
        stroke="#9b8366"
        strokeWidth=".8"
      />
      <path d="m38 38 8 6-7 6Zm41-4-9 10 10 5Z" fill="#b48e7a" />
      <path
        d="M44 59q6 5 11 0m12-1q6 5 11 0"
        stroke="#62513e"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="m58 65 5-1-2 4Z" fill="#936b58" />
      <path d="M61 67q-1 4-5 3m5-3q2 3 5 2" stroke="#856b51" strokeWidth=".6" />
      <path
        d="m31 65 17 2m-17 4 17-1m24-5 17-4m-17 7 18 1"
        stroke="#d6c7a8"
        strokeWidth=".8"
      />
      <g stroke="#a78e70" strokeWidth=".7" opacity=".7">
        <path d="m55 42 2 6m4-6 1 5m11 26 6 1m-32 0 5 2m40-44 3 4m4-5 2 5m8-2 1 6m9-2-1 5m9 0-2 5m-45-7 2 5m-5 0 2 5m39 12-3 3" />
      </g>
      <path
        d="M53 78q10 3 17-1"
        stroke="#ead8b8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PottedFern({ className = "" }: OrnamentProps) {
  const id = useId();
  const leaves = [
    [49, 80, -38, 1],
    [50, 95, -68, 1.1],
    [53, 59, -22, 0.85],
    [56, 36, 15, 0.7],
    [60, 85, 65, 1],
    [62, 63, 28, 1.1],
    [40, 107, -85, 0.8],
    [57, 108, 90, 0.95],
    [47, 61, -57, 0.7],
    [74, 77, 63, 0.75],
    [32, 91, -84, 0.75],
  ];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-potted-fern ${className}`}
      viewBox="0 0 100 160"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <linearGradient id={`${id}-pot`}>
          <stop stopColor="#4c3526" />
          <stop offset=".26" stopColor="#a78457" />
          <stop offset=".45" stopColor="#c2a474" />
          <stop offset=".72" stopColor="#8c6b45" />
          <stop offset="1" stopColor="#513924" />
        </linearGradient>
        <linearGradient
          id={`${id}-leaf`}
          x1="-13"
          y1="-32"
          x2="10"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#90914b" />
          <stop offset=".4" stopColor="#516c36" />
          <stop offset="1" stopColor="#233d27" />
        </linearGradient>
      </defs>
      <path
        d="M50 116C45 77 41 42 56 15M52 110C66 77 77 60 82 41M49 105C39 77 22 68 15 43"
        stroke="#2b3520"
        strokeWidth="3"
      />
      <path
        d="M50 114C46 77 42 42 56 15M53 108C66 77 77 60 82 41M49 105C39 77 22 68 15 43"
        stroke="#89914b"
        strokeWidth="1"
      />
      {leaves.map(([x, y, rotation, scale], index) => (
        <g
          key={index}
          transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
        >
          <path
            d="M0 6C-16-1-16-20-5-32 7-22 13-7 0 6Z"
            fill={`url(#${id}-leaf)`}
            stroke="#23371f"
            strokeWidth=".8"
          />
          <path
            d="M-5-29 0 4m-2-14-8-7m8 4 6-8m-4 19-8-7m8 4 6-6"
            stroke="#a8a55e"
            strokeWidth=".55"
            opacity=".55"
          />
        </g>
      ))}
      <ellipse cx="51" cy="150" rx="24" ry="4" fill="#170f09" opacity=".6" />
      <path
        d="M29 112h45l-6 34q-2 7-17 7t-17-7Z"
        fill={`url(#${id}-pot)`}
        stroke="#4d3523"
        strokeWidth="1.3"
      />
      <path
        d="M29 112h45l-6 34q-2 7-17 7t-17-7Z"
        fill={`url(#${id}-leather-grain)`}
      />
      <ellipse
        cx="51"
        cy="111"
        rx="25"
        ry="5"
        fill="#3f3320"
        stroke="#c2a170"
        strokeWidth="1.1"
      />
      <path
        d="M26 109v7q25 10 50 0v-7q-25 8-50 0Z"
        fill={`url(#${id}-pot)`}
        stroke="#7b5836"
      />
      <path
        d="M28 111q23 7 46 0m-38 34q15 6 30 0"
        stroke="#d4b783"
        strokeWidth=".8"
      />
      <g stroke="#d8c398" strokeWidth=".65" opacity=".8">
        <path d="M39 125q-7-6-5 3t9 6q-1-7 8-11 9 4 8 11 7 3 9-6t-5-3M51 122v21m-4-9q4 4 8 0m-4-6-4 5 4 5 4-5Z" />
      </g>
      <path d="M37 121v15" stroke="#e4d1a1" strokeWidth="1.1" opacity=".35" />
    </svg>
  );
}

export function BotanicalCloche({ className = "" }: OrnamentProps) {
  const id = useId();
  const dome = "M24 139V67C24 10 96 10 96 67v72Z";
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-botanical-cloche ${className}`}
      viewBox="0 0 120 165"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <ellipse
        className="library-lamplight"
        cx="60"
        cy="96"
        rx="67"
        ry="63"
        fill={`url(#${id}-glow)`}
        opacity=".62"
      />
      <path
        d={dome}
        fill={`url(#${id}-glass)`}
        stroke="#c2b999"
        strokeWidth="1.3"
      />
      <ellipse
        cx="60"
        cy="139"
        rx="35"
        ry="6"
        fill="#32361d"
        stroke="#7c7c40"
      />
      <path
        d="M57 141c8-28-7-37-2-65m7 61c6-18 18-32 15-47m-19 40c-4-16-13-22-15-34"
        stroke="#738344"
        strokeWidth="1.7"
      />
      <g fill="#496433" stroke="#9b9a53" strokeWidth=".6">
        <path d="M57 126c-18-1-24-10-22-19 16 2 21 10 22 19Zm4-13c2-16 11-23 22-22-2 15-11 21-22 22Zm0 25c8-17 20-20 29-17-6 14-17 18-29 17Zm-4-3c-15-13-21-10-27-7 5 11 16 15 27 7Z" />
      </g>
      <g fill="#fff1ba" className="library-enchanted-star">
        <g transform="translate(55 74)">
          <ellipse cy="-7" rx="3" ry="6" />
          <ellipse cy="7" rx="3" ry="6" />
          <ellipse cx="-7" rx="6" ry="3" />
          <ellipse cx="7" rx="6" ry="3" />
          <circle r="3" fill="#d9a445" />
        </g>
        <g transform="translate(78 88) scale(.72)">
          <ellipse cy="-7" rx="3" ry="6" />
          <ellipse cy="7" rx="3" ry="6" />
          <ellipse cx="-7" rx="6" ry="3" />
          <ellipse cx="7" rx="6" ry="3" />
          <circle r="3" fill="#d9a445" />
        </g>
        <g transform="translate(42 95) scale(.58)">
          <ellipse cy="-7" rx="3" ry="6" />
          <ellipse cy="7" rx="3" ry="6" />
          <ellipse cx="-7" rx="6" ry="3" />
          <ellipse cx="7" rx="6" ry="3" />
          <circle r="3" fill="#d9a445" />
        </g>
      </g>
      <g fill="#ffe1a0">
        <circle cx="37" cy="68" r="1" />
        <circle cx="77" cy="57" r="1.4" />
        <circle cx="84" cy="113" r=".9" />
        <path d="m69 42 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" />
      </g>
      <path
        d="M32 104V72q0-27 17-32m-17 74v13"
        stroke="#fff0c8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".45"
      />
      <path
        d="M79 43q9 10 10 26"
        stroke="#fff0c8"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity=".5"
      />
      <path
        d="M22 138q38-7 76 0v12q-38 6-76 0Z"
        fill={`url(#${id}-brass)`}
        stroke="#5f3c1b"
        strokeWidth="1.3"
      />
      <path
        d="M23 143q37-6 74 0m-72 7q35 4 70 0"
        stroke="#e3bf76"
        strokeWidth=".7"
      />
      <path
        d="M28 145h64"
        stroke={`url(#${id}-metal-etching)`}
        strokeWidth="7"
      />
      <path
        d="M29 152v5h9v-5m45 0v5h9v-5"
        fill="#664421"
        stroke="#b78c48"
        strokeWidth=".7"
      />
      <ellipse cx="60" cy="27" rx="7" ry="3" fill={`url(#${id}-brass)`} />
      <path d="M60 24v-9m-5 5h10" stroke="#efc776" strokeWidth="1.3" />
    </svg>
  );
}

export function AntiqueLantern({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-antique-lantern ${className}`}
      viewBox="0 0 120 180"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <linearGradient id={`${id}-lantern-glass`}>
          <stop stopColor="#99622b" stopOpacity=".55" />
          <stop offset=".4" stopColor="#efb95f" stopOpacity=".28" />
          <stop offset=".6" stopColor="#ffdc86" stopOpacity=".35" />
          <stop offset="1" stopColor="#835125" stopOpacity=".5" />
        </linearGradient>
      </defs>
      <ellipse
        className="library-lamplight"
        cx="60"
        cy="115"
        rx="78"
        ry="75"
        fill={`url(#${id}-glow)`}
      />
      <path d="M50 31c-13-24 34-27 20 0" stroke="#4d361e" strokeWidth="4" />
      <path d="M50 29c-10-20 29-23 21-1" stroke="#c39b52" strokeWidth="1.2" />
      <path
        d="M52 31h16l3 7-3 5H52l-3-5Z"
        fill={`url(#${id}-brass)`}
        stroke="#573c1d"
      />
      <path
        d="M50 42C44 60 25 60 24 72h72C95 60 76 60 70 42Z"
        fill={`url(#${id}-brass)`}
        stroke="#392711"
        strokeWidth="1.4"
      />
      <path
        d="M52 46q-1 15-15 24m24-26v26m7-24q1 15 15 24"
        stroke="#e4bc72"
        strokeWidth=".8"
      />
      <path
        d="M30 74h60l-5 78H35Z"
        fill={`url(#${id}-lantern-glass)`}
        stroke="#dfb875"
      />
      <path d="M38 78h11l-2 68h-8Z" fill="#ffdd96" opacity=".17" />
      <path
        d="M54 111h13v37H54Z"
        fill="#e3c38c"
        stroke="#b98a43"
        strokeWidth=".7"
      />
      <path
        d="M54 110q7 5 13 0m-10 3v12m7-11v7"
        stroke="#fff0bd"
        strokeWidth="1.2"
      />
      <path
        className="library-enchanted-star"
        d="M60 111c-15-9-6-16 1-28 0 12 11 20-1 28Z"
        fill="#ffd57e"
      />
      <path d="M60 110c-6-5-2-10 2-14 0 6 3 11-2 14Z" fill="#fff3bd" />
      <path d="M60 114v-5" stroke="#59401d" />
      <path
        d="M31 72h6l3 80h-6Zm52 0h6l-3 80h-6ZM58 72h4v80h-4Z"
        fill={`url(#${id}-brass)`}
        stroke="#5e3d1b"
        strokeWidth=".7"
      />
      <path
        d="m38 83 20 22-19 31m43-53-20 22 19 31"
        stroke="#69451e"
        strokeWidth="2.1"
      />
      <path
        d="m39 84 18 21-17 30m41-51-18 21 17 30"
        stroke="#ddb477"
        strokeWidth=".6"
      />
      <rect
        x="24"
        y="69"
        width="72"
        height="7"
        rx="2"
        fill={`url(#${id}-brass)`}
        stroke="#684621"
      />
      <path
        d="M31 151h57l7 9q-34 10-70 0Z"
        fill={`url(#${id}-brass)`}
        stroke="#65421e"
      />
      <path d="M29 158q31 5 62 0m-64-85h66" stroke="#ebc987" strokeWidth=".8" />
      <circle
        cx="73"
        cy="117"
        r="2.5"
        fill="#bd924c"
        stroke="#f0cf90"
        strokeWidth=".6"
      />
    </svg>
  );
}

function NightWindow({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-night-window ${className}`}
      viewBox="0 0 220 780"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <AntiqueMaterials id={id} />
      <defs>
        <linearGradient id={`${id}-night`} x2="0" y2="1">
          <stop stopColor="#111b35" />
          <stop offset=".36" stopColor="#272c4e" />
          <stop offset=".73" stopColor="#30334d" />
          <stop offset="1" stopColor="#1b202e" />
        </linearGradient>
        <linearGradient id={`${id}-distance-fade`} x2="0" y2="1">
          <stop stopColor="var(--library-wood-dark)" stopOpacity="0" />
          <stop
            offset=".5"
            stopColor="var(--library-wood-dark)"
            stopOpacity=".32"
          />
          <stop
            offset="1"
            stopColor="var(--library-wood-dark)"
            stopOpacity=".88"
          />
        </linearGradient>
        <linearGradient id={`${id}-wood`}>
          <stop stopColor="#27160e" />
          <stop offset=".22" stopColor="#684326" />
          <stop offset=".48" stopColor="#472919" />
          <stop offset=".74" stopColor="#774b27" />
          <stop offset="1" stopColor="#26160f" />
        </linearGradient>
        <radialGradient id={`${id}-haze`}>
          <stop stopColor="#9f8da2" stopOpacity=".19" />
          <stop offset="1" stopColor="#6e6793" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-arch`}>
          <path d="M12 780V171Q12 67 110 12q98 55 98 159v609Z" />
        </clipPath>
        <pattern
          id={`${id}-wood-grain`}
          width="18"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M2 0q5 30 1 60t2 60M10 0q-5 40 0 70t1 50M16 0q-6 30-1 60t-2 60"
            stroke="#b08147"
            strokeWidth=".5"
            opacity=".2"
          />
          <path d="M5 0q6 35 0 80t0 40" stroke="#1e100a" opacity=".4" />
        </pattern>
      </defs>
      <g clipPath={`url(#${id}-arch)`}>
        <path d="M0 0h220v780H0Z" fill={`url(#${id}-night)`} />
        <ellipse cx="64" cy="415" rx="135" ry="275" fill={`url(#${id}-haze)`} />
        <ellipse
          cx="155"
          cy="188"
          rx="80"
          ry="167"
          fill={`url(#${id}-haze)`}
          transform="rotate(-22 155 188)"
        />
        <g fill="#eed7a9">
          {Array.from({ length: 39 }, (_, index) => (
            <circle
              key={index}
              cx={19 + ((index * 73) % 182)}
              cy={37 + ((index * 97) % 657)}
              r={index % 7 === 0 ? 1.35 : 0.65}
              opacity={index % 3 === 0 ? 0.9 : 0.5}
            />
          ))}
        </g>
        <g className="library-window-moon">
          <ellipse
            cx="78"
            cy="222"
            rx="59"
            ry="58"
            fill={`url(#${id}-glow)`}
            opacity=".3"
          />
          <path d="M82 202a19 19 0 1 0 9 31 18 18 0 0 1-9-31Z" fill="#e9d2a0" />
        </g>
        <path d="M0 679q48-34 99-14t121-10v125H0Z" fill="#262a3e" />
        <path d="M0 714q59-27 106-7t114-11v84H0Z" fill="#1b2132" />
        <g fill="#171d2d" stroke="#4b4760" strokeWidth=".4">
          <path d="M52 693v-52l8-13 8 13v52Zm24 2v-64l8-28 8 28v64Zm20 0v-38l8-13 8 13v38Z" />
          <path
            d="M56 646h8v47h-8Zm24-11h8v60h-8Zm20 25h8v35h-8Z"
            fill="#20263a"
          />
          <path d="M68 689v-18h9v18m15 0v-21h6v21" />
          <path d="M153 718v-52l6-20 6 20v52m6 0v-35l7-16 7 16v35" />
        </g>
        <g fill="#c7a36a" opacity=".52">
          <path d="M59 654h2v5h-2Zm24-13h2v6h-2Zm0 16h2v5h-2Zm20 10h2v4h-2Zm55 9h2v5h-2Zm20 14h2v4h-2Z" />
        </g>
        <path d="M0 756q80-28 141-6t79-5v35H0Z" fill="#101921" />
        <path d="M0 605h220v175H0Z" fill={`url(#${id}-distance-fade)`} />
        <g stroke={`url(#${id}-wood)`} strokeWidth="12">
          <path d="M110 22v758M0 367q110-54 220 0M0 560q110-48 220 0" />
          <path d="M6 113q22 119 104 131 82-13 104-131" strokeWidth="6" />
        </g>
        <g stroke="#b0884c" strokeWidth="1" opacity=".6">
          <path d="M105 28v752M0 362q110-54 220 0M0 555q110-48 220 0M9 112q22 115 101 127 79-13 101-127" />
        </g>
        <g stroke="#170e0b" strokeWidth="2" opacity=".7">
          <path d="M115 30v750M0 372q110-54 220 0M0 565q110-48 220 0" />
        </g>
        <g className="library-window-hanging-stars">
          <path
            d="M47 97v67m116-46v102m-123 203v58"
            stroke="#b98a48"
            strokeWidth=".7"
          />
          <g className="library-enchanted-star" fill="#ffdd8c">
            <path d="m47 161 3 8 6 3-6 3-3 8-3-8-6-3 6-3Zm116 56 3 8 6 3-6 3-3 8-3-8-6-3 6-3ZM40 478l3 8 6 3-6 3-3 8-3-8-6-3 6-3Z" />
          </g>
        </g>
      </g>
      <path
        d="M12 780V171Q12 67 110 12q98 55 98 159v609"
        stroke="#1e120d"
        strokeWidth="26"
      />
      <path
        d="M12 780V171Q12 67 110 12q98 55 98 159v609"
        stroke={`url(#${id}-wood)`}
        strokeWidth="21"
      />
      <path
        d="M12 780V171Q12 67 110 12q98 55 98 159v609"
        stroke={`url(#${id}-wood-grain)`}
        strokeWidth="19"
      />
      <path
        d="M24 780V172Q24 80 110 28q86 52 86 144v608"
        stroke="#b68d50"
        strokeWidth="1.1"
        opacity=".75"
      />
      <path
        d="M5 780V170Q5 62 110 3q105 59 105 167v610"
        stroke="#866039"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LibraryAtmosphere({ className = "" }: OrnamentProps) {
  return (
    <div aria-hidden="true" className={`library-atmosphere ${className}`}>
      <NightWindow className="library-night-window--left" />
      <NightWindow className="library-night-window--right" />
      <div className="library-ambient-light library-ambient-light--left" />
      <div className="library-ambient-light library-ambient-light--right" />
      <span className="library-dust library-dust--one" />
      <span className="library-dust library-dust--two" />
      <span className="library-dust library-dust--three" />
    </div>
  );
}
