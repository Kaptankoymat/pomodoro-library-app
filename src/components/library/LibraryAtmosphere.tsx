import { useId } from "react";

type OrnamentProps = { className?: string };

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
          <stop stopColor="#89924a" />
          <stop offset="0.4" stopColor="#4b6431" />
          <stop offset="1" stopColor="#203522" />
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
            <path
              d="M0 12C-20 3-19-15-3-25 11-10 16 3 0 12Z"
              fill={`url(#${id}-leaf)`}
              stroke="#192b1d"
              strokeWidth="1.2"
            />
            <path
              d="M-3-21 0 10M-1-4-10-11M0 1 7-6"
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
      <defs>
        <radialGradient id={`${id}-light`}>
          <stop stopColor="#ffcf73" stopOpacity="0.46" />
          <stop offset="1" stopColor="#d88a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${id}-shade`}
          x1="70"
          y1="30"
          x2="70"
          y2="105"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e7a942" />
          <stop offset="0.58" stopColor="#ffe3a0" />
          <stop offset="1" stopColor="#aa651c" />
        </linearGradient>
        <linearGradient id={`${id}-brass`}>
          <stop stopColor="#563017" />
          <stop offset="0.45" stopColor="#e0ad50" />
          <stop offset="0.6" stopColor="#966024" />
          <stop offset="1" stopColor="#482615" />
        </linearGradient>
      </defs>
      <ellipse
        className="library-lamplight"
        cx="70"
        cy="84"
        rx="70"
        ry="81"
        fill={`url(#${id}-light)`}
      />
      <path
        d="M59 29q11-12 22 0l5 8H54Z"
        fill={`url(#${id}-brass)`}
        stroke="#3e2716"
      />
      <path
        d="M54 36C48 63 36 65 32 93q10 9 19 0 10 11 19 0 9 11 19 0 10 10 19 0C104 65 92 61 86 36Z"
        fill={`url(#${id}-shade)`}
        stroke="#8f5d29"
        strokeWidth="2"
      />
      <path
        d="M55 38C53 58 48 78 51 93M65 37C61 60 59 76 70 94M76 37C72 62 81 77 89 93M85 38C88 61 98 77 106 91"
        stroke="#a36426"
        strokeWidth="1.5"
      />
      <path d="m63 52 7-7 7 7-7 8Z" fill="#fff2be" opacity="0.75" />
      <path
        d="M63 103h14l-4 8v35l11 7H56l11-7v-35Z"
        fill={`url(#${id}-brass)`}
        stroke="#4c2c16"
      />
      <ellipse
        cx="70"
        cy="156"
        rx="27"
        ry="7"
        fill={`url(#${id}-brass)`}
        stroke="#492916"
        strokeWidth="2"
      />
      <path d="M96 95v29" stroke="#c79745" />
      <circle cx="96" cy="126" r="2" fill="#d2a253" />
      <path d="M47 160h46" stroke="#ecbd69" opacity="0.6" />
    </svg>
  );
}

export function GlassJar({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-glass-jar ${className}`}
      viewBox="0 0 100 150"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#f5c865" stopOpacity="0.6" />
          <stop offset="1" stopColor="#d88a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glass`}>
          <stop stopColor="#fff1cf" stopOpacity="0.17" />
          <stop offset="0.35" stopColor="#fff1cf" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff1cf" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <ellipse
        className="library-lamplight"
        cx="50"
        cy="87"
        rx="50"
        ry="60"
        fill={`url(#${id}-glow)`}
      />
      <path
        d="M35 24v12C19 39 17 45 17 60v63q0 13 14 13h38q14 0 14-13V60c0-15-2-21-18-24V24"
        fill={`url(#${id}-glass)`}
        stroke="#d5c7a3"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <path
        d="M28 55q-4 10-4 33M26 98v17"
        stroke="#fff3d5"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.42"
      />
      <rect
        x="30"
        y="19"
        width="40"
        height="9"
        rx="3"
        fill="#976632"
        stroke="#dda958"
      />
      <rect
        x="34"
        y="13"
        width="32"
        height="8"
        rx="2"
        fill="#6a482b"
        stroke="#a47f43"
      />
      <path
        d="m51 75 4 11 12 1-10 7 3 11-9-7-9 7 3-11-10-7 12-1Z"
        fill="#ffe7a0"
        className="library-sparkle"
      />
      <path
        d="m34 109 3 6 7 1-5 4 1 7-6-4-6 4 2-7-5-4 7-1Zm33-60 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z"
        fill="#ffd379"
      />
      <path d="m60 114 6-4 6 6-5 6ZM34 63l3-5 3 5-3 4Z" fill="#ffe2a0" />
      <g fill="#ffe5a5">
        <circle cx="35" cy="90" r="1.5" />
        <circle cx="64" cy="75" r="1.5" />
        <circle cx="49" cy="47" r="1" />
        <circle cx="72" cy="99" r="1" />
        <circle cx="51" cy="123" r="1.5" />
      </g>
      <ellipse cx="50" cy="134" rx="30" ry="3" fill="#9b6c2f" opacity="0.6" />
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
      <defs>
        <radialGradient id={`${id}-sky`} cx="35%" cy="32%">
          <stop stopColor="#39415a" />
          <stop offset="0.65" stopColor="#1e2739" />
          <stop offset="1" stopColor="#0f1625" />
        </radialGradient>
      </defs>
      <path
        d="M40 14C1 37 5 97 43 121q23 13 49 0"
        stroke="#a77836"
        strokeWidth="5"
      />
      <path d="M41 14C4 36 9 95 44 117" stroke="#efca7a" strokeWidth="1" />
      <circle
        cx="73"
        cy="66"
        r="49"
        fill={`url(#${id}-sky)`}
        stroke="#bd9553"
        strokeWidth="1.4"
      />
      <g stroke="#bd995a" strokeWidth="0.65" opacity="0.5">
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
          rx="46"
          ry="19"
          transform="rotate(-22 73 66)"
        />
        <path d="M28 83 118 49M54 20 91 111" />
      </g>
      <path
        d="m42 54 21-12 13 23 21-7 8 25-20 9-24-20Z"
        stroke="#daa34f"
        strokeWidth="1.2"
      />
      <g fill="#f8d886">
        <circle className="library-sparkle" cx="42" cy="54" r="2.3" />
        <circle cx="63" cy="42" r="1.9" />
        <circle cx="76" cy="65" r="2.6" />
        <circle cx="97" cy="58" r="1.5" />
        <circle cx="105" cy="83" r="2" />
        <circle cx="85" cy="92" r="1.8" />
        <circle cx="61" cy="72" r="1.5" />
        <circle cx="84" cy="33" r="1" />
        <circle cx="45" cy="83" r="1.1" />
        <circle cx="60" cy="100" r="1" />
      </g>
      <path
        d="m66 116-1 17-10 10h39l-15-10-1-16"
        fill="#8e5d2e"
        stroke="#c39950"
      />
      <ellipse
        cx="73"
        cy="145"
        rx="30"
        ry="5"
        fill="#66401f"
        stroke="#c89949"
      />
      <path
        d="m39 18-3-7m8 3-3-7m50 112 5 8"
        stroke="#cba15d"
        strokeWidth="4"
      />
    </svg>
  );
}

export function BookStack({ className = "" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-book-stack ${className}`}
      viewBox="0 0 180 125"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <g transform="rotate(-2 90 103)">
        <path
          d="M16 91H164V118H16q-9-12 0-27Z"
          fill="#502530"
          stroke="#ae8150"
        />
        <path d="M54 96h105v17H54q5-8 0-17Z" fill="#cdb58b" />
        <path
          d="M61 100h95M61 104h89M61 108h96"
          stroke="#957851"
          strokeWidth="0.7"
        />
        <path d="M15 93v22M26 94v20M43 94v20" stroke="#d9ae60" />
        <path d="m32 102 3-3 3 3-3 3Z" fill="#d9ae60" />
      </g>
      <g transform="rotate(3 90 77)">
        <path
          d="M26 65h138v26H26q-8-12 0-26Z"
          fill="#173e38"
          stroke="#8c7241"
        />
        <path d="M57 70h102v16H57q3-8 0-16Z" fill="#ddc59e" />
        <path
          d="M64 74h93M63 78h87M64 82h92"
          stroke="#ac9166"
          strokeWidth="0.7"
        />
        <path d="M27 68v21M39 68v21M49 68v21" stroke="#b59450" />
      </g>
      <g transform="rotate(-5 89 52)">
        <path
          d="M13 35h138v31H13q-10-16 0-31Z"
          fill="#1a304c"
          stroke="#a5824a"
        />
        <path d="M50 41h95v19H50q5-9 0-19Z" fill="#c5ac81" />
        <path
          d="M56 45h86M56 49h80M56 53h84M56 56h81"
          stroke="#9c8055"
          strokeWidth="0.7"
        />
        <path d="M14 39v23M25 39v23M42 39v23" stroke="#ddb465" />
        <path d="m31 50 3-4 3 4-3 4Z" fill="#ddb465" />
      </g>
      <path d="M63 17h79v20H63q-5-9 0-20Z" fill="#705035" stroke="#aa834a" />
      <path d="M82 21h57v12H82q2-6 0-12Z" fill="#d5bd96" />
      <path d="M88 25h48M88 29h45" stroke="#a08962" strokeWidth="0.7" />
      <path d="M65 20v14M74 20v14" stroke="#d1b474" />
    </svg>
  );
}

export function UprightBooks({ className = "" }: OrnamentProps) {
  const id = useId();
  const books = [
    { x: 6, y: 16, width: 25, height: 119, color: "#203a50" },
    { x: 34, y: 6, width: 24, height: 129, color: "#55394e" },
    { x: 61, y: 21, width: 29, height: 114, color: "#3b5140" },
    { x: 93, y: 11, width: 23, height: 124, color: "#632f36" },
    { x: 120, y: 24, width: 31, height: 111, color: "#4a3b2e" },
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
      <defs>
        <linearGradient id={`${id}-binding`}>
          <stop stopColor="#120b09" stopOpacity="0.7" />
          <stop offset="0.15" stopColor="#ffe6b2" stopOpacity="0.18" />
          <stop offset="0.4" stopColor="#fff0c9" stopOpacity="0.03" />
          <stop offset="1" stopColor="#0b0808" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {books.map(({ x, y, width, height, color }, index) => (
        <g key={x} transform={index === 4 ? "rotate(-6 122 135)" : undefined}>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx="2"
            fill={color}
            stroke="#a58650"
            strokeWidth="0.65"
          />
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx="2"
            fill={`url(#${id}-binding)`}
          />
          <rect
            x={x + 3}
            y={y + 5}
            width={width - 6}
            height={height - 10}
            rx="1"
            stroke="#c3a46a"
            strokeWidth="0.6"
            opacity="0.7"
          />
          <path
            d={`M${x + 3} ${y + 11}h${width - 6}m${6 - width} 3h${width - 6}M${x + 3} ${y + height - 10}h${width - 6}m${6 - width} -3h${width - 6}`}
            stroke="#d7b676"
            strokeWidth="0.75"
          />
          <g
            transform={`translate(${x + width / 2} ${y + height / 2})`}
            stroke="#c9a66b"
            strokeWidth="0.7"
          >
            <path d="M0-24v14m0 20v14M-4 0l4-7 4 7-4 7Z" />
            <circle r="10" strokeDasharray="1 3" />
            <path d="m-3-33 3-4 3 4-3 4Zm0 66 3-4 3 4-3 4Z" />
          </g>
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
      <defs>
        <linearGradient id={`${id}-gold`}>
          <stop stopColor="#604021" />
          <stop offset="0.36" stopColor="#dab46a" />
          <stop offset="0.6" stopColor="#a07337" />
          <stop offset="1" stopColor="#49301d" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#f9d481" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d88a2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx="45"
        cy="104"
        rx="42"
        ry="39"
        fill={`url(#${id}-glow)`}
        className="library-lamplight"
      />
      <path
        d="M25 23q0 31 15 45v8q-15 13-15 44h40q0-31-15-44v-8q15-14 15-45Z"
        fill="#ead8a7"
        fillOpacity="0.06"
        stroke="#d8c49a"
        strokeWidth="1.2"
      />
      <path d="M30 43q3 14 15 23 12-9 15-23Z" fill="#dcad54" />
      <path d="m30 116 15-20 15 20Z" fill="#f8d47c" />
      <path d="M45 72v26" stroke="#f9d996" strokeWidth="1" />
      <path
        d="M31 28q0 20 8 30M31 108q1-17 10-26"
        stroke="#fbefca"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M18 19h7v106h-7Zm47 0h7v106h-7Z"
        fill={`url(#${id}-gold)`}
        stroke="#735029"
      />
      <rect
        x="13"
        y="13"
        width="64"
        height="11"
        rx="2"
        fill={`url(#${id}-gold)`}
        stroke="#d6ac60"
      />
      <rect
        x="13"
        y="121"
        width="64"
        height="11"
        rx="2"
        fill={`url(#${id}-gold)`}
        stroke="#d6ac60"
      />
      <path d="M19 16h52M19 129h52" stroke="#edcb8a" opacity="0.55" />
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
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#c495d4" stopOpacity="0.3" />
          <stop offset="1" stopColor="#8a5fb4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="73" rx="57" ry="41" fill={`url(#${id}-glow)`} />
      <g stroke="#d2aec9" strokeWidth="0.75">
        <path d="m48 43 14-28 15 28-4 51-24 1Z" fill="#734f87" />
        <path d="m62 15 2 79 13-51Z" fill="#bd8eaf" />
        <path d="m48 43 16 8 13-8M64 51l-15 44" />
        <path d="m26 70 2-27 21 19 10 38-24-1Z" fill="#79587c" />
        <path d="m28 43 11 32 20 25-10-38Z" fill="#aa7da5" />
        <path d="m26 70 13 5 10-13" />
        <path d="m78 65 23-15-1 29-18 24-16-9Z" fill="#654c7e" />
        <path d="m101 50-17 24-18 20 16 9 18-24Z" fill="#96719f" />
        <path d="m78 65 6 9 16 5" />
        <path d="m13 89 2-16 17 9 17 23-23-2Z" fill="#9c7694" />
        <path d="m88 93 17-13 1 19-14 10-16-7Z" fill="#b28ca3" />
      </g>
      <path d="M19 102q43-8 84-1l-5 9H22Z" fill="#5b3c28" stroke="#ab8149" />
      <path d="M26 106h69" stroke="#d6b16a" strokeWidth="0.8" />
      <path
        className="library-sparkle"
        d="m80 21 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z"
        fill="#edced6"
      />
    </svg>
  );
}

export function QuillDecoration({ className = "" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-quill ${className}`}
      viewBox="0 0 90 155"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <path
        d="M34 109C35 63 55 34 82 8c-4 40-15 64-39 84Z"
        fill="#b9ad94"
        stroke="#7e7160"
      />
      <path d="M34 121C47 77 62 44 79 13" stroke="#5b4b39" strokeWidth="2" />
      <path
        d="m49 78 17-7m-12-5 19-7m-14-5 18-9m-13-1 15-9M50 75l-6-10m12-2-7-14m14 1-7-14m12 2-6-13"
        stroke="#776e60"
        strokeWidth="0.8"
      />
      <path
        d="m30 115-10 7-2 21q12 9 31 0l-3-21-8-7"
        fill="#151819"
        stroke="#926d37"
        strokeWidth="2"
      />
      <ellipse
        cx="34"
        cy="116"
        rx="10"
        ry="4"
        fill="#10100d"
        stroke="#b58a45"
      />
      <path d="M25 129v9m18-8v9" stroke="#b9a47b" opacity="0.5" />
      <path d="M24 145h22" stroke="#cead70" />
    </svg>
  );
}

export function SleepingCat({ className = "" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-sleeping-cat ${className}`}
      viewBox="0 0 170 100"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <path d="M18 79q63-18 131 0l-15 16H26Z" fill="#503146" stroke="#a97847" />
      <path
        d="M49 73c-5-28 25-51 59-47 24 2 43 23 38 44-3 15-78 17-97 3Z"
        fill="#c5b094"
        stroke="#7f6d58"
        strokeWidth="1.5"
      />
      <path
        d="M86 75c24 5 49-4 48-18-1-17-21-19-34-12"
        stroke="#a08a71"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="m37 48-4-22 18 12q11-5 22 1l14-15 3 27c7 13 1 30-23 31-27 2-38-16-30-34Z"
        fill="#d8c3a5"
        stroke="#8f795d"
        strokeWidth="1.4"
      />
      <path d="m38 34 10 8-8 7Zm43-1-10 10 11 5Z" fill="#b7867a" />
      <path
        d="M47 59q5 5 10 0m13 0q5 5 10 0"
        stroke="#5e4b3d"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="m61 65 5 0-2 3Z" fill="#956452" />
      <path
        d="m34 66 17 2m-17 4 17-1m26-4 16-4m-16 8 17 1"
        stroke="#806e56"
        strokeWidth="0.7"
      />
      <path
        d="m101 28 3 6 5-6m10 7 1 6 7-2m-65 0 4 8 3-8"
        stroke="#a18a6e"
        strokeWidth="2"
      />
    </svg>
  );
}

export function PottedFern({ className = "" }: OrnamentProps) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`library-ornament library-potted-fern ${className}`}
      viewBox="0 0 100 160"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
    >
      <defs>
        <linearGradient id={`${id}-pot`}>
          <stop stopColor="#60412c" />
          <stop offset="0.38" stopColor="#b78554" />
          <stop offset="1" stopColor="#543726" />
        </linearGradient>
      </defs>
      <path
        d="M50 115C45 77 41 42 55 16M52 104C65 74 73 58 82 44M49 99C40 72 23 66 15 44M53 109C59 88 58 53 63 32"
        stroke="#6d7941"
        strokeWidth="2.5"
      />
      {[
        "M50 76C26 71 24 54 27 44 47 47 53 60 50 76Z",
        "M49 88C22 91 12 78 7 65 28 61 44 71 49 88Z",
        "M53 61C33 49 38 31 42 25 55 35 56 45 53 61Z",
        "M55 35C45 15 57 5 62 2 66 17 65 27 55 35Z",
        "M55 85C58 66 81 61 92 67 83 85 68 91 55 85Z",
        "M62 64C59 42 72 26 83 26 85 47 75 59 62 64Z",
        "M42 96C26 81 10 90 5 97 22 108 32 107 42 96Z",
        "M54 101C68 86 83 89 95 99 81 111 64 113 54 101Z",
      ].map((d, index) => (
        <path
          key={d}
          d={d}
          fill={index % 2 ? "#536d37" : "#344e2c"}
          stroke="#7c8949"
          strokeWidth="0.7"
        />
      ))}
      <path
        d="M29 111h44l-6 37q-16 9-31 0Z"
        fill={`url(#${id}-pot)`}
        stroke="#372918"
        strokeWidth="1.5"
      />
      <rect
        x="25"
        y="106"
        width="51"
        height="10"
        rx="3"
        fill="#9a7249"
        stroke="#d0a46c"
      />
      <path
        d="M34 124h32M36 139h28m-16-11 4-4 4 4-4 5Z"
        stroke="#dec38b"
        strokeWidth="1"
        opacity="0.55"
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
      <defs>
        <linearGradient id={`${id}-night`} x2="0" y2="1">
          <stop stopColor="#111b34" />
          <stop offset="0.65" stopColor="#2a2946" />
          <stop offset="1" stopColor="#766051" />
        </linearGradient>
        <radialGradient id={`${id}-moon`}>
          <stop stopColor="#ffdf9b" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffdf9b" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-arch`}>
          <path d="M12 780V171Q12 67 110 12q98 55 98 159v609Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-arch)`}>
        <path d="M0 0h220v780H0Z" fill={`url(#${id}-night)`} />
        <circle cx="78" cy="190" r="78" fill={`url(#${id}-moon)`} />
        <path d="M88 166a27 27 0 1 0 12 44 25 25 0 0 1-12-44Z" fill="#f4d79a" />
        <g fill="#efd5a2" opacity="0.7">
          {[
            [54, 71],
            [122, 104],
            [168, 162],
            [41, 254],
            [175, 279],
            [99, 334],
            [151, 401],
            [45, 420],
            [185, 484],
            [65, 513],
            [133, 568],
            [35, 616],
            [182, 647],
            [95, 707],
          ].map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 1.8 : 1} />
          ))}
        </g>
        <path
          d="m37 312 3-8 3 8 8 3-8 3-3 8-3-8-8-3Zm122-91 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z"
          fill="#f2c46d"
        />
        <path
          d="M0 738 12 692 25 718 42 635 63 684 81 651 98 697 121 613 148 672 165 651 182 704 201 666 220 693v87H0Z"
          fill="#18212b"
        />
        <path
          d="M0 440q110-76 220 0M0 628q110-76 220 0M110 21v759"
          stroke="#4d301f"
          strokeWidth="11"
        />
        <path
          d="M0 435q110-76 220 0M0 623q110-76 220 0M106 24v756"
          stroke="#a47b43"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>
      <path
        d="M12 780V171Q12 67 110 12q98 55 98 159v609"
        stroke="#3b2218"
        strokeWidth="23"
      />
      <path
        d="M24 780V172Q24 80 110 28q86 52 86 144v608"
        stroke="#9d7040"
        strokeWidth="2"
      />
      <path
        d="M4 780V170Q4 60 110 1q106 59 106 169v610"
        stroke="#815331"
        strokeWidth="3"
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
