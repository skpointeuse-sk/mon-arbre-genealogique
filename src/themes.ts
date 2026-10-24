/* Ambiances de l'arbre. Les clés sont celles déjà enregistrées dans trees.settings.preset :
   un arbre réglé sur « foret » dans l'ancienne version garde son ambiance. */
export type Ambiance = { name: string; relief: "collines" | "sommets" };

export const AMBIANCES: Record<string, Ambiance> = {
  prairie: { name: "Prairie fleurie", relief: "collines" },
  foret: { name: "Forêt d'automne", relief: "collines" },
  aube: { name: "Montagnes à l'aube", relief: "sommets" },
  mer: { name: "Coucher de soleil", relief: "collines" },
  nuit: { name: "Nuit étoilée", relief: "sommets" },
};
export const ambianceOf = (preset?: string | null) => (preset && AMBIANCES[preset] ? preset : "prairie");

const RELIEF = {
  collines: [
    "M0,120 C220,70 420,150 720,96 C1020,44 1240,130 1600,80 V200 H0Z",
    "M0,160 C300,118 520,190 860,148 C1160,112 1380,176 1600,140 V200 H0Z",
  ],
  sommets: [
    "M0,130 L170,64 L300,112 L470,30 L640,118 L820,56 L1000,124 L1210,42 L1400,110 L1600,66 V200 H0Z",
    "M0,170 L180,128 L360,160 L560,116 L760,166 L960,130 L1180,170 L1400,134 L1600,160 V200 H0Z",
  ],
};

/* Relief statique en bas du canevas : un rappel discret du paysage choisi, sans animation. */
export function reliefPaths(key: string) {
  return RELIEF[AMBIANCES[ambianceOf(key)].relief];
}
