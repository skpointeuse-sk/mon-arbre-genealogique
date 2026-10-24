import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as RPE, type RefObject } from "react";

export type View = { x: number; y: number; k: number };
export const KMIN = 0.15,
  KMAX = 2;

/* Déplacement et zoom du canevas : souris, molette, un ou deux doigts.
   gesture.moved permet aux clics de distinguer un vrai clic d'un glissement. */
export function useView(box: RefObject<HTMLElement | null>) {
  const [v, setV] = useState<View>({ x: 0, y: 0, k: 0.9 });
  const [anim, setAnim] = useState(false);
  const vRef = useRef(v);
  vRef.current = v;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, dist: 0 });

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
    const k = Math.min(KMAX, Math.max(KMIN, o.k * f)),
      r = k / o.k;
    const nv = { k, x: px - (px - o.x) * r, y: py - (py - o.y) * r };
    if (smooth) animate(nv);
    else setV(nv);
  };
  const pan = (dx: number, dy: number) => animate({ ...vRef.current, x: vRef.current.x + dx, y: vRef.current.y + dy });

  // Molette : zoom autour du curseur (écouteur non passif pour bloquer le défilement de la page)
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
    b.addEventListener("wheel", wheel, { passive: false });
    return () => b.removeEventListener("wheel", wheel);
  }, [box]);

  // Un pointeur déplace, deux pointeurs zooment
  const onPointerDown = (e: RPE) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current.moved = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: RPE) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 1) {
      const dx = cur.x - prev.x,
        dy = cur.y - prev.y;
      if (!gesture.current.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      gesture.current.moved = true;
      if (!box.current!.hasPointerCapture(e.pointerId)) box.current!.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, cur);
      setV((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
    } else if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, cur);
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = box.current!.getBoundingClientRect();
      if (gesture.current.dist) zoomAt(d / gesture.current.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      gesture.current.dist = d;
      gesture.current.moved = true;
    }
  };
  const onPointerUp = (e: RPE) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.dist = 0;
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
