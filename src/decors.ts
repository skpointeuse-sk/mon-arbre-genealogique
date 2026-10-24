/* Décors photo. Chaque photo emprunte la palette d'un paysage animé (couleurs des cartes et
   de la barre), choisie pour aller avec ses tons. Fichiers dans public/decors/, sources dans CREDITS.md. */
export type Decor = { id: string; name: string; palette: string };

export const DECORS: Decor[] = [
  { id: "lavande", name: "Lavande en Provence", palette: "aube" },
  { id: "verger", name: "Verger au printemps", palette: "prairie" },
  { id: "cerisier", name: "Cerisier en fleurs", palette: "aube" },
  { id: "ble", name: "Blé d'été", palette: "prairie" },
  { id: "vignes", name: "Vignes et collines", palette: "foret" },
  { id: "parc-automne", name: "Parc en automne", palette: "foret" },
  { id: "foret-brume", name: "Forêt dans la brume", palette: "foret" },
  { id: "lac-aube", name: "Lac à l'aube", palette: "aube" },
  { id: "mer-couchant", name: "Mer au couchant", palette: "mer" },
  { id: "dunes", name: "Dunes et océan", palette: "mer" },
  { id: "village-neige", name: "Village sous la neige", palette: "prairie" },
  { id: "voie-lactee", name: "Voie lactée", palette: "nuit" },
];

export const decorOf = (id?: string | null) => DECORS.find((d) => d.id === id) ?? null;
export const decorSrc = (id: string, w: 480 | 1280 | 1920) => `/decors/${id}-${w}.webp`;
export const decorSrcSet = (id: string) => `${decorSrc(id, 1280)} 1280w, ${decorSrc(id, 1920)} 1920w`;

/* Le décor essayé sur l'accueil devient celui du premier arbre (comme l'ambiance). */
const KEY = "decor-choisi";
export const savedDecor = () => {
  try {
    return decorOf(localStorage.getItem(KEY))?.id ?? null;
  } catch {
    return null;
  }
};
export const saveDecor = (id: string | null) => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : sans conséquence */
  }
};
