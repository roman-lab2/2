export function Icon({
  name = "arrow",
  size = 22,
  className = "",
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M4 12h15M13 5l7 7-7 7" />,
    diagonal: <path d="M6 18 18 6M6 6h12v12" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    phone: (
      <path d="m5 3 4 1 1 5-3 2c2 4 3 5 7 7l2-3 5 1 1 4c-1 3-7 2-12-2S1 6 5 3Z" />
    ),
    scan: (
      <path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M5 12h14M8 8v8m4-10v12m4-10v8" />
    ),
    oil: (
      <>
        <path d="M7 8h9l3 7H5L3 10h4V5h6v3m6 2 3-2M8 18h9" />
        <path d="M20 14s-2 2-2 4a2 2 0 0 0 4 0c0-2-2-4-2-4Z" />
      </>
    ),
    disc: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="m6 6 2 2m8-2-2 2m-8 8 2-2m8 2-2-2" />
      </>
    ),
    suspension: <path d="M9 2h6M12 2v3M8 5h8l-8 4 8 4-8 4h8M12 17v5M9 22h6" />,
    snow: (
      <path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1M4 14l4 1-1 4m10-14-1 4 4 1" />
    ),
    engine: (
      <path d="M5 8h11l3 3h3v7h-4l-2 2H6l-3-4V9h2ZM9 4h6m-3 0v4M1 10v6M7 12h5l-2 4h5" />
    ),
    shield: (
      <>
        <path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    car: (
      <path d="m5 7 2-4h10l2 4 3 3v8H2v-8ZM3 10h18M5 14h2m10 0h2M5 18v3m14-3v3" />
    ),
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 2v6m10-6v6M3 11h18m-12 4h2m3 0h2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
