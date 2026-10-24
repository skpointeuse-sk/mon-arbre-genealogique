import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { TREE, mockTree } from "./mock";

/* Gestes tactiles réels (Chrome DevTools Protocol) : le navigateur en tire des pointeurs
   « touch », comme sur un téléphone, et applique touch-action. */
test.skip(({ isMobile }) => !isMobile, "gestes au doigt, sur téléphone seulement");

type Pt = { x: number; y: number };
const touch = (c: CDPSession, type: string, pts: Pt[]) =>
  c.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: pts.map((p, id) => ({ x: p.x, y: p.y, id, radiusX: 4, radiusY: 4, force: 1 })),
  });
async function drag(c: CDPSession, page: Page, from: Pt, to: Pt, steps = 12) {
  await touch(c, "touchStart", [from]);
  for (let i = 1; i <= steps; i++) {
    await touch(c, "touchMove", [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }]);
    await page.waitForTimeout(16);
  }
  await touch(c, "touchEnd", []);
}
async function pinch(c: CDPSession, page: Page, at: Pt, from: number, to: number) {
  const pts = (d: number) => [
    { x: at.x - d / 2, y: at.y },
    { x: at.x + d / 2, y: at.y },
  ];
  await touch(c, "touchStart", pts(from));
  for (let i = 1; i <= 10; i++) {
    await touch(c, "touchMove", pts(from + ((to - from) * i) / 10));
    await page.waitForTimeout(16);
  }
  await touch(c, "touchEnd", []);
}
// Cartes dont un morceau se trouve dans le canevas visible.
const cardsInView = (page: Page) =>
  page.evaluate(() => {
    const s = document.querySelector(".stage")!.getBoundingClientRect();
    return [...document.querySelectorAll(".plane .card")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > s.left && r.left < s.right && r.bottom > s.top && r.top < s.bottom;
    }).length;
  });
const plane = (page: Page) => page.locator(".plane").evaluate((el) => (el as HTMLElement).style.transform);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTree(page, "prairie");
  await page.goto(`/partage/${TREE}`);
  await expect(page.getByRole("button", { name: /^Lucas Martin, Vous/ })).toBeVisible();
});

test("glisser puis pincer au doigt garde l'arbre à l'écran", async ({ page }) => {
  const c = await page.context().newCDPSession(page);
  const s = (await page.locator(".stage").boundingBox())!;
  const at = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
  const start = await plane(page);

  await drag(c, page, at, { x: at.x - 60, y: at.y + 40 });
  expect(await plane(page)).not.toBe(start);
  expect(await cardsInView(page)).toBeGreaterThan(0);

  const level = page.locator(".zoom-level");
  const before = await level.textContent();
  await pinch(c, page, at, 80, 220);
  await expect(level).not.toHaveText(before ?? "");
  expect(await cardsInView(page)).toBeGreaterThan(0);
  await pinch(c, page, at, 240, 60);
  expect(await cardsInView(page)).toBeGreaterThan(0);

  // Un grand coup de doigt vers le bord : l'arbre bute au lieu de disparaître.
  await drag(c, page, { x: s.x + 20, y: s.y + 20 }, { x: s.x + s.width - 10, y: s.y + s.height - 10 }, 4);
  await drag(c, page, { x: s.x + 20, y: s.y + 20 }, { x: s.x + s.width - 10, y: s.y + s.height - 10 }, 4);
  expect(await cardsInView(page)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(await plane(page)).not.toContain("NaN");
  await page.screenshot({ path: "test-results/doigt-mobile.png" });
});

test("toucher une carte ouvre la fiche, glisser depuis une carte ne l'ouvre pas", async ({ page }) => {
  const c = await page.context().newCDPSession(page);
  const card = (await page.getByRole("button", { name: /^Claire Martin/ }).boundingBox())!;
  const at = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
  await drag(c, page, at, { x: at.x + 70, y: at.y + 50 });
  await expect(page.getByRole("heading", { name: /Claire/ })).toBeHidden();
  expect(await cardsInView(page)).toBeGreaterThan(0);

  const moved = (await page.getByRole("button", { name: /^Claire Martin/ }).boundingBox())!;
  const tap = { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2 };
  await touch(c, "touchStart", [tap]);
  await touch(c, "touchEnd", []);
  await expect(page.getByRole("heading", { name: /Claire/ })).toBeVisible();
});
