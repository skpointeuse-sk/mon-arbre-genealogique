/* Ambiances de l'arbre. Les clés sont celles déjà enregistrées dans trees.settings.preset :
   un arbre réglé sur « foret » dans l'ancienne version garde son ambiance.
   Les couleurs vivent dans styles.css (jetons --sky-*, --hill-*, --astre) : ici, seulement la forme. */
export type Ambiance = {
  name: string;
  relief: "collines" | "sommets";
  fx: "petales" | "feuilles" | "nuages" | "etoiles";
};

export const AMBIANCES: Record<string, Ambiance> = {
  prairie: { name: "Prairie fleurie", relief: "collines", fx: "petales" },
  foret: { name: "Forêt d'automne", relief: "collines", fx: "feuilles" },
  aube: { name: "Montagnes à l'aube", relief: "sommets", fx: "nuages" },
  mer: { name: "Coucher de soleil", relief: "collines", fx: "nuages" },
  nuit: { name: "Nuit étoilée", relief: "sommets", fx: "etoiles" },
};
export const ambianceOf = (preset?: string | null) => (preset && AMBIANCES[preset] ? preset : "prairie");

/* L'ambiance essayée sur l'accueil devient celle du premier arbre. Simple confort :
   si le navigateur refuse le stockage, on retombe sur la prairie. */
const KEY = "ambiance-choisie";
export const savedAmbiance = () => {
  try {
    return ambianceOf(localStorage.getItem(KEY));
  } catch {
    return "prairie";
  }
};
export const saveAmbiance = (k: string) => {
  try {
    localStorage.setItem(KEY, k);
  } catch {
    /* stockage indisponible : sans conséquence */
  }
};

/* Trois plans de relief, du plus lointain au plus proche (viewBox 1600 × 400). */
const RELIEF = {
  collines: [
    "M0,200 C200,120 400,260 700,180 C1000,100 1200,240 1600,150 V400 H0Z",
    "M0,260 C250,180 450,320 800,240 C1100,170 1350,300 1600,230 V400 H0Z",
    "M0,320 C300,260 500,360 850,310 C1150,270 1400,350 1600,300 V400 H0Z",
  ],
  sommets: [
    "M0,220 L180,90 L300,170 L470,40 L650,190 L820,80 L1000,200 L1200,60 L1400,180 L1600,100 V400 H0Z",
    "M0,290 L150,200 L320,270 L520,160 L720,280 L930,190 L1130,285 L1350,185 L1600,270 V400 H0Z",
    "M0,345 L200,300 L420,340 L650,290 L900,345 L1150,305 L1400,345 L1600,310 V400 H0Z",
  ],
};

export function reliefPaths(key: string) {
  return RELIEF[AMBIANCES[ambianceOf(key)].relief];
}
