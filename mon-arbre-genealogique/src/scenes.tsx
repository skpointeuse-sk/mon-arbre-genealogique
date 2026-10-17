type Scene = { name: string; icon: string; sky: [string, string]; sun: string; hills: [string, string, string]; peaks?: boolean; fx: string; mode: "fall" | "twinkle" | "cloud"; preset: string };

export const SCENES: Record<string, Scene> = {
  prairie: { name: "Prairie fleurie", icon: "🌸", sky: ["#bfe3f5", "#f6fbee"], sun: "#fff7c2", hills: ["#cfe8b4", "#9fd08a", "#6aa860"], fx: "🌸", mode: "fall", preset: "nature" },
  foret: { name: "Forêt d'automne", icon: "🍂", sky: ["#f4c98f", "#fcefd6"], sun: "#fff0c9", hills: ["#d9a15f", "#b8693a", "#7a4126"], fx: "🍂", mode: "fall", preset: "heritage" },
  aube: { name: "Montagnes à l'aube", icon: "🏔️", sky: ["#f7b8b0", "#fdf0e4"], sun: "#ffe3c4", hills: ["#d3c4e0", "#a597c6", "#6e6597"], peaks: true, fx: "☁️", mode: "cloud", preset: "douceur" },
  mer: { name: "Coucher de soleil", icon: "🌅", sky: ["#ff9d6e", "#ffe2b0"], sun: "#fff4d0", hills: ["#f5b383", "#d98084", "#7b567f"], fx: "☁️", mode: "cloud", preset: "douceur" },
  nuit: { name: "Nuit étoilée", icon: "🌌", sky: ["#0b1626", "#2a4768"], sun: "#c9d8ff", hills: ["#223a57", "#172b44", "#0d1a2c"], peaks: true, fx: "✦", mode: "twinkle", preset: "elegance" },
};

const PATHS = [
  ["M0,200 C200,120 400,260 700,180 C1000,100 1200,240 1600,150 V400 H0Z", "M0,260 C250,180 450,320 800,240 C1100,170 1350,300 1600,230 V400 H0Z", "M0,320 C300,260 500,360 850,310 C1150,270 1400,350 1600,300 V400 H0Z"],
  ["M0,220 L180,90 L300,170 L470,40 L650,190 L820,80 L1000,200 L1200,60 L1400,180 L1600,100 V400 H0Z", "M0,290 L150,200 L320,270 L520,160 L720,280 L930,190 L1130,285 L1350,185 L1600,270 V400 H0Z", "M0,345 L200,300 L420,340 L650,290 L900,345 L1150,305 L1400,345 L1600,310 V400 H0Z"],
];

// Décor animé en couches avec effet de profondeur quand on déplace l'arbre
export function Scene({ id, dx = 0, dy = 0, className = "absolute inset-0" }: { id: string; dx?: number; dy?: number; className?: string }) {
  const s = SCENES[id] ?? SCENES.prairie;
  return (
    <div className={`pointer-events-none overflow-hidden ${className}`} style={{ background: `linear-gradient(${s.sky[0]}, ${s.sky[1]})` }}>
      <div className="absolute right-[14%] top-[8%] h-56 w-56 rounded-full blur-2xl" style={{ background: s.sun, translate: `${dx * 0.01}px ${dy * 0.01}px` }} />
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className={`fx fx-${s.mode}`} style={{ left: `${(i * 37) % 100}%`, top: s.mode === "fall" ? 0 : `${(i * 23) % (s.mode === "cloud" ? 40 : 65)}%`, animationDelay: `${-i * 1.9}s`, animationDuration: `${s.mode === "cloud" ? 60 + (i % 4) * 20 : 14 + (i % 5) * 3}s`, fontSize: 12 + (i % 4) * (s.mode === "cloud" ? 14 : 5) }}>{s.fx}</span>
      ))}
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 1600 400" preserveAspectRatio="none" className="absolute bottom-0 left-[-5%] w-[110%]" style={{ height: `${[48, 38, 26][i]}%`, translate: `${dx * (0.02 + i * 0.03)}px 0` }}>
          <path d={PATHS[s.peaks ? 1 : 0][i]} fill={s.hills[i]} />
        </svg>
      ))}
    </div>
  );
}
