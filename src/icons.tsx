/* Pictogrammes au trait, dessinés pour l'application (aucun emoji). */
const P: Record<string, string> = {
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  target: "M12 3v3M12 18v3M3 12h3M18 12h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  redo: "m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3",
  calendar: "M4 7h16v13H4zM4 11h16M8 3v4M16 3v4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  share: "M8 12h8M15 7l5 5-5 5M4 5v14",
  logout: "M10 4H5v16h5M14 8l4 4-4 4M18 12H9",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  camera: "M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  root: "M12 21V11M12 11c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 11c3 0 5-2 5-5-3 0-5 2-5 5ZM8 21h8",
  link: "M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1",
  back: "M15 5l-7 7 7 7",
  chevron: "m9 5 7 7-7 7",
  layers: "M12 4 3 9l9 5 9-5-9-5ZM3 14l9 5 9-5",
  upload: "M12 15V4M7 9l5-5 5 5M5 20h14",
  check: "M4 12.5 9 17.5 20 6.5",
};

export function Icon({ name, size = 20, label }: { name: keyof typeof P | string; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={P[name] ?? ""} />
    </svg>
  );
}

/* Empreinte pour les animaux, en aplat. */
export function Paw({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="6" cy="10" rx="2" ry="2.6" />
      <ellipse cx="10" cy="6" rx="2" ry="2.6" />
      <ellipse cx="14.5" cy="6" rx="2" ry="2.6" />
      <ellipse cx="18.5" cy="10" rx="2" ry="2.6" />
      <path d="M12.2 11c-2.7 0-5.7 3.6-5.7 6.1 0 1.6 1.2 2.4 2.6 2.4 1.3 0 2-.6 3.1-.6s1.8.6 3.1.6c1.4 0 2.6-.8 2.6-2.4 0-2.5-3-6.1-5.7-6.1Z" />
    </svg>
  );
}

/* Marque : un arbre en trois générations, deux parents, un trait, trois enfants. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="6" y="3" width="8" height="6" rx="1.5" fill="currentColor" />
      <rect x="18" y="3" width="8" height="6" rx="1.5" fill="currentColor" opacity=".55" />
      <path d="M14 6h4M16 6v10M7 16h18M7 16v5M16 16v5M25 16v5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="21" width="8" height="6" rx="1.5" fill="currentColor" opacity=".55" />
      <rect x="12" y="21" width="8" height="6" rx="1.5" fill="currentColor" />
      <rect x="21" y="21" width="8" height="6" rx="1.5" fill="currentColor" opacity=".55" />
    </svg>
  );
}
