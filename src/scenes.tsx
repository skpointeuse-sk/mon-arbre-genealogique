import { AMBIANCES, ambianceOf, reliefPaths } from "./themes";

/* Paysage animé en couches. dx/dy suivent le déplacement de l'arbre : les plans lointains
   bougent moins que les plans proches, ce qui donne la profondeur. Les animations
   s'arrêtent si l'utilisateur a demandé moins de mouvements (voir styles.css). */
const COUNT = { petales: 14, feuilles: 12, nuages: 6, etoiles: 40 };

export function Scene({ id, dx = 0, dy = 0, className = "" }: { id: string; dx?: number; dy?: number; className?: string }) {
  const key = ambianceOf(id);
  const fx = AMBIANCES[key].fx;
  const ridges = reliefPaths(key);
  // Limite le décalage : au-delà, les collines sortiraient de l'écran.
  const px = Math.max(-600, Math.min(600, dx));
  const py = Math.max(-300, Math.min(300, dy));
  return (
    <div className={"scene " + className} data-fx={fx} aria-hidden="true">
      <div className="scene-astre" style={{ translate: `${px * 0.01}px ${py * 0.01}px` }} />
      <div className="scene-fx">
        {Array.from({ length: COUNT[fx] }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37 + (i % 3) * 11) % 100}%`,
              top: fx === "petales" || fx === "feuilles" ? undefined : `${(i * 23) % (fx === "nuages" ? 38 : 62)}%`,
              animationDelay: `${-i * (fx === "nuages" ? 11 : 1.9)}s`,
              animationDuration: `${fx === "nuages" ? 70 + (i % 4) * 22 : fx === "etoiles" ? 3 + (i % 5) : 15 + (i % 5) * 3}s`,
              scale: `${0.7 + (i % 4) * 0.2}`,
            }}
          />
        ))}
      </div>
      {ridges.map((d, i) => (
        <svg
          key={i}
          className={"scene-hill scene-hill-" + (i + 1)}
          viewBox="0 0 1600 400"
          preserveAspectRatio="none"
          style={{ translate: `${px * (0.02 + i * 0.03)}px 0` }}
        >
          <path d={d} />
        </svg>
      ))}
    </div>
  );
}
