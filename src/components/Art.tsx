export function WheelMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" />
      <path
        d="M20 4v9m0 14v9M4 20h9m14 0h9M9 9l7 7m8 8 7 7M9 31l7-7m8-8 7-7"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="20" cy="20" r="5" fill="currentColor" />
    </svg>
  );
}
export function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "lock"
    | "check"
    | "eye"
    | "history"
    | "help"
    | "close"
    | "download"
    | "copy"
    | "play"
    | "shield"
    | "refresh"
    | "bolt";
  size?: number;
}) {
  const paths = {
    arrow: "M5 12h14m-5-5 5 5-5 5",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12v11H6zm6 5v2",
    check: "m5 12 4 4L19 6",
    eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    history: "M3 10a9 9 0 1 1 2 8M3 4v6h6m3-3v6l4 2",
    help: "M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4v.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
    close: "m6 6 12 12M6 18 18 6",
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    copy: "M9 9h12v12H9zM15 5V3H3v12h2",
    play: "m8 4 13 8-13 8z",
    shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Zm-5 9 3 3 6-6",
    refresh: "M20 7a9 9 0 1 0 1 8M20 2v6h-6",
    bolt: "m13 2-9 12h7l-1 8 10-12h-7z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function BrainAvatar({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M50 15c-9-9-24-2-24 10-14-1-21 14-14 24-9 12-2 27 10 29 1 12 18 17 28 8 10 9 27 4 28-8 12-2 19-17 10-29 7-10 0-25-14-24 0-12-15-19-24-10Z"
        fill="currentColor"
      />
      <path
        d="M50 22v20m0 27v15M27 30l7 8m-14 9h12m40-17-7 8m14 9H67M25 70l9-7m41 7-9-7"
        stroke="#343e29"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="26" y="42" width="49" height="23" rx="9" fill="#20271c" />
      <path
        d="M35 51v5m12-5v5m12-5v5m8-5v5"
        stroke="#d6f59b"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M44 75h13"
        stroke="#343e29"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function HumanAvatar() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="22" fill="#f39f8b" />
      <path d="M17 29a15 15 0 0 1 30 0v8a15 15 0 0 1-30 0z" fill="#342823" />
      <path
        d="M25 32v4m14-4v4m-12 7c3 3 7 3 10 0"
        stroke="#f8d4c9"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="m17 24 10-7 12 6 8-1"
        stroke="#342823"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function WheelStage({
  locked = false,
  finished = false,
}: {
  locked?: boolean;
  finished?: boolean;
}) {
  return (
    <div
      className={`wheel-stage ${locked ? "is-locked" : ""} ${finished ? "is-finished" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 560 270" fill="none">
        <path d="M73 238h414" stroke="#34383f" strokeWidth="1" />
        <ellipse cx="280" cy="240" rx="118" ry="7" fill="#111317" />
        <path
          d="m265 196-27 42h84l-27-42"
          stroke="#626953"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <circle
          cx="280"
          cy="126"
          r="108"
          fill="#20251d"
          stroke="#333b2c"
          strokeWidth="2"
        />
        <g className="wheel-rim">
          <circle cx="280" cy="126" r="98" stroke="#c6ef86" strokeWidth="5" />
          <circle cx="280" cy="126" r="86" stroke="#6d8151" strokeWidth="1" />
          {Array.from({ length: 24 }, (_, i) => (
            <path
              key={i}
              d="M280 23v12"
              stroke="#c6ef86"
              strokeWidth="3"
              transform={`rotate(${i * 15} 280 126)`}
            />
          ))}
          {[0, 60, 120].map((n) => (
            <path
              key={n}
              d="M280 39v174"
              stroke="#3f4d32"
              strokeWidth="2"
              transform={`rotate(${n} 280 126)`}
            />
          ))}
        </g>
        <circle cx="280" cy="126" r="9" fill="#7b9560" />
        <path
          d="M235 194c-22-5-31-20-20-31"
          stroke="#dcad91"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <ellipse cx="279" cy="177" rx="47" ry="35" fill="#e9bd9e" />
        <path
          d="M257 151c-10-20-1-33 12-25l12 16m9 0c-1-21 13-29 22-16l-2 27"
          fill="#e9bd9e"
        />
        <path
          d="M262 143c-3-7-2-11 3-10l9 11m23-1c2-9 7-13 9-9l-2 12"
          stroke="#bb7e79"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M258 185c8-14 30-14 39 0v15c-12 7-26 8-40 0z" fill="#f7ddbd" />
        <rect x="254" y="151" width="59" height="24" rx="10" fill="#242b21" />
        <path
          d="M263 160h12m10 0h17"
          stroke="#c6ef86"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="m276 180 4 2 4-2m-4 3v4m-5 1 5 2 5-2"
          stroke="#795950"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="253" cy="209" rx="12" ry="5" fill="#dcad91" />
        <ellipse
          cx="305"
          cy="206"
          rx="12"
          ry="5"
          transform="rotate(-18 305 206)"
          fill="#dcad91"
        />
        <path
          d="M140 96v14m-7-7h14M414 148v10m-5-5h10M389 48v8m-4-4h8"
          stroke="#626953"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="m167 172-14 5m246-78 13-6M171 49l8 7"
          stroke="#626953"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="122" cy="163" r="3" fill="#464e3e" />
        <circle cx="426" cy="80" r="3" fill="#464e3e" />
      </svg>
      <span className="stage-caption">
        {finished
          ? "Tiny legs. Big mind games."
          : locked
            ? "Calls locked. The hamster decides."
            : "One wheel. Two minds. Your call."}
      </span>
    </div>
  );
}
