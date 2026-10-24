// Convertit les originaux de assets-src/ en WebP pour le site : public/images/<nom>-640.webp et -1280.webp.
// Les originaux ne sont pas versionnés ; leur source et leur licence sont dans CREDITS.md.
import { readdirSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const src = new URL("../assets-src/", import.meta.url);
const out = new URL("../public/images/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src).filter((x) => /\.(jpe?g|png|webp)$/i.test(x))) {
  const name = f.replace(/\.[^.]+$/, "");
  for (const w of [640, 1280]) {
    const info = await sharp(new URL(f, src).pathname.replace(/^\/(\w:)/, "$1"))
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(new URL(`${name}-${w}.webp`, out).pathname.replace(/^\/(\w:)/, "$1"));
    console.log(`${name}-${w}.webp`, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} Ko`);
  }
}

// Décors de fond : public/decors/<nom>-480.webp (vignette du choix), -1280 (téléphone) et -1920 (grand écran).
const dsrc = new URL("../assets-src/decors/", import.meta.url);
const dout = new URL("../public/decors/", import.meta.url);
mkdirSync(dout, { recursive: true });
for (const f of readdirSync(dsrc).filter((x) => /\.jpe?g$/i.test(x))) {
  const name = f.replace(/\.[^.]+$/, "");
  for (const w of [480, 1280, 1920]) {
    const info = await sharp(new URL(f, dsrc).pathname.replace(/^\/(\w:)/, "$1"))
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w === 480 ? 70 : 60 })
      .toFile(new URL(`${name}-${w}.webp`, dout).pathname.replace(/^\/(\w:)/, "$1"));
    console.log(`décor ${name}-${w}.webp`, `${Math.round(info.size / 1024)} Ko`);
  }
}
