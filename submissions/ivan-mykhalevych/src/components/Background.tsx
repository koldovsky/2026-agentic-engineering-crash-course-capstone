const FRAGMENTS: { x: number; y: number; size: number; text: string }[] = [
  { x: 6, y: 14, size: 26, text: "public static void main(String[] args) {" },
  { x: 58, y: 9, size: 20, text: "List<String> names = new ArrayList<>();" },
  { x: 12, y: 36, size: 22, text: "Optional.ofNullable(value).orElse(0);" },
  { x: 52, y: 44, size: 26, text: "@Transactional" },
  { x: 8, y: 62, size: 20, text: "synchronized (lock) { counter++; }" },
  { x: 48, y: 70, size: 22, text: "stream.filter(x -> x > 0).toList();" },
  { x: 14, y: 88, size: 26, text: "record Point(int x, int y) {}" },
  { x: 60, y: 92, size: 20, text: "Thread.ofVirtual().start(task);" },
];

export default function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="glow-a" cx="20%" cy="15%" r="55%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-b" cx="85%" cy="90%" r="55%">
            <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="var(--bg)" />
        <rect width="1200" height="800" fill="url(#glow-a)" />
        <rect width="1200" height="800" fill="url(#glow-b)" />

        <g fill="var(--ink)" opacity="0.07" fontFamily="var(--font-jetbrains), monospace">
          {FRAGMENTS.map((f) => (
            <text key={f.text} x={`${f.x}%`} y={`${f.y}%`} fontSize={f.size}>
              {f.text}
            </text>
          ))}
        </g>

        <g
          className="steam"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.35"
        >
          <path d="M1010 210 C 990 180, 1040 160, 1015 125 C 995 98, 1035 82, 1020 55" />
          <path d="M1060 225 C 1040 195, 1090 175, 1065 140 C 1045 113, 1085 97, 1070 70" />
          <path d="M1110 210 C 1090 180, 1140 160, 1115 125 C 1095 98, 1135 82, 1120 55" />
        </g>
      </svg>
    </div>
  );
}
