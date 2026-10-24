import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as RPE, type RefObject } from "react";
import { H, W } from "./lib";

export type View = { x: number; y: number; k: number };
export const KMIN = 0.15,
  KMAX = 2;
// Au moins une carte reste à l'écran sur cette largeur et cette hauteur, quoi qu'on fasse du doigt.
const KEEP = { x: 96, y: 56 };
// Un doigt tremble : en dessous de ce trajet, c'est un toucher, pas un glissement.
const SLOP = { mouse: 3, touch: 8 };

type Pt = { x: number; y: number };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/* Déplacement et zoom du canevas : souris, molette, un ou deux doigts.
   cards donne le coin de chaque carte (échelle 1) : la vue n'en perd jamais la dernière hors de l'écran.
   gesture.moved permet aux clics de distinguer un vrai clic d'un glissement. */
export function useView(box: RefObject<HTMLElement | null>, cards: Pt[]) {
  const [v, setRawV] = useState<View>({ x: 0, y: 0, k: 0.9 });
  const [anim, setAnim] = useState(false);
  const vRef = useRef(v);
  vRef.current = v;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef({ moved: false, tap: { t: 0, x: 0, y: 0 } });

  /* Refuse toute valeur non finie, et si plus aucune carte n'est visible, ramène la plus proche
     juste ce qu'il faut pour qu'elle dépasse du bord : l'arbre bute au lieu de disparaître. */
  const keep = (nv: View): View => {
    const b = box.current,
      list = cardsRef.current;
    if (![nv.x, nv.y, nv.k].every(Number.isFinite)) return vRef.current;
    const k = clamp(nv.k, KMIN, KMAX);
    if (!b || !b.clientWidth || !list.length) return { ...nv, k };
    const bw = b.clientWidth,
      bh = b.clientHeight,
      mx = Math.min(KEEP.x, W * k),
      my = Math.min(KEEP.y, H * k);
    let best = { dx: 0, dy: 0, d: Infinity };
    for (const c of list) {
      const sx = nv.x + c.x * k,
        sy = nv.y + c.y * k;
      const dx = clamp(sx, mx - W * k, bw - mx) - sx,
        dy = clamp(sy, my - H * k, bh - my) - sy;
      if (!dx && !dy) return { ...nv, k };
      const d = Math.hypot(dx, dy);
      if (d < best.d) best = { dx, dy, d };
    }
    return { k, x: nv.x + best.dx, y: nv.y + best.dy };
  };
  const setV = (nv: View | ((o: View) => View)) => setRawV((o) => keep(typeof nv === "function" ? nv(o) : nv));

  const animate = (nv: View) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAnim(!reduce);
    setV(nv);
    window.setTimeout(() => setAnim(false), 380);
  };
  const zoomAt = (f: number, cx?: number, cy?: number, smooth = false) => {
    const b = box.current!,
      o = vRef.current;
    const px = cx ?? b.clientWidth / 2,
      py = cy ?? b.clientHeight / 2;
    const k = clamp(o.k * f, KMIN, KMAX),
      r = k / o.k;
    const nv = { k, x: px - (px - o.x) * r, y: py - (py - o.y) * r };
    if (smooth) animate(nv);
    else setV(nv);
  };
  const pan = (dx: number, dy: number) => animate({ ...vRef.current, x: vRef.current.x + dx, y: vRef.current.y + dy });

  // Molette : zoom autour du curseur (écouteur non passif pour bloquer le défilement de la page).
  // Safari iOS : ses événements gesture* zoomeraient la page entière, on les bloque sur le canevas.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    const r = box.current!.getBoundingClientRect();
    if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX))
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    else setV((o) => ({ ...o, x: o.x - e.deltaX }));
  });
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const wheel = (e: WheelEvent) => onWheel(e);
    const block = (e: Event) => e.preventDefault();
    // Le toucher a déjà été transmis au lever du doigt : le clic natif qui suit est de trop, où qu'il
    // tombe (la fiche vient peut-être de s'ouvrir sous le doigt).
    const twice = (e: MouseEvent) => {
      const t = gesture.current.tap;
      if (e.isTrusted && t.t && performance.now() - t.t < 600 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 12) {
        gesture.current.tap.t = 0;
        e.stopPropagation();
        e.preventDefault();
      }
    };
    b.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("click", twice, true);
    b.addEventListener("gesturestart", block);
    b.addEventListener("gesturechange", block);
    return () => {
      b.removeEventListener("wheel", wheel);
      window.removeEventListener("click", twice, true);
      b.removeEventListener("gesturestart", block);
      b.removeEventListener("gesturechange", block);
    };
  }, [box]);

  // Le canevas garde le doigt même s'il glisse sur une carte ou hors de l'écran.
  const capture = (id: number) => {
    const b = box.current!;
    try {
      if (!b.hasPointerCapture(id)) b.setPointerCapture(id);
    } catch {
      // Pointeur déjà levé : rien à capturer.
    }
  };

  // Un pointeur déplace, deux pointeurs zooment autour du milieu des doigts et suivent ce milieu.
  const onPointerDown = (e: RPE) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Premier doigt d'un nouveau geste : on oublie ceux dont la levée ne nous est jamais parvenue.
    if (e.isPrimary) pointers.current.clear();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current.moved = false;
    if (pointers.current.size === 2) {
      gesture.current.moved = true;
      pointers.current.forEach((_, id) => capture(id));
    }
    setAnim(false);
  };
  const onPointerMove = (e: RPE) => {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (!Number.isFinite(cur.x) || !Number.isFinite(cur.y)) return;
    if (map.size === 1) {
      const dx = cur.x - prev.x,
        dy = cur.y - prev.y;
      if (!gesture.current.moved) {
        if (Math.hypot(dx, dy) < (e.pointerType === "mouse" ? SLOP.mouse : SLOP.touch)) return;
        gesture.current.moved = true;
        capture(e.pointerId);
      }
      map.set(e.pointerId, cur);
      setV((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
    } else if (map.size === 2) {
      const [a0, b0] = [...map.values()];
      map.set(e.pointerId, cur);
      const [a1, b1] = [...map.values()];
      const d0 = dist(a0, b0),
        d1 = dist(a1, b1);
      if (d0 < 1 || d1 < 1) return;
      const r = box.current!.getBoundingClientRect();
      const m0 = mid(a0, b0),
        m1 = mid(a1, b1);
      setV((o) => {
        const k = clamp((o.k * d1) / d0, KMIN, KMAX),
          f = k / o.k;
        return { k, x: m1.x - r.left - (m0.x - r.left - o.x) * f, y: m1.y - r.top - (m0.y - r.top - o.y) * f };
      });
    }
  };
  /* Au doigt, Chrome avale parfois le clic du premier toucher qui suit un glissement :
     un toucher sans déplacement active donc lui-même la carte (ou le fond) sous le doigt. */
  const onPointerUp = (e: RPE) => {
    const map = pointers.current;
    if (!map.delete(e.pointerId)) return;
    if (e.type !== "pointerup" || e.pointerType === "mouse" || map.size || gesture.current.moved) return;
    const el = (e.target as Element).closest("button") ?? (e.target === box.current ? box.current : null);
    if (!el || !box.current!.contains(el)) return;
    gesture.current.tap = { t: performance.now(), x: e.clientX, y: e.clientY };
    el.click();
  };

  return {
    v,
    setV,
    vRef,
    anim,
    animate,
    zoomAt,
    pan,
    gesture,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
