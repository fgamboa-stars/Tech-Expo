/**
 * ============================================================================
 * File:        src/components/layout/Header.tsx
 * Purpose:     Site header: wordmark, page navigation, theme toggle, and a
 *              collapsible menu on small screens.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - 2026-10-31  Added "Lost America" navigation item
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

/** Navigation entries: [route page, label]. */
export const NAV_ITEMS: [string, string][] = [
  ["", "Home"],
  ["lost", "Lost America"],
  ["map", "Interactive map"],
  ["explore", "State Explorer"],
  ["dashboard", "Findings"],
  ["data", "About the data"],
  ["about", "About the project"],
];

/** Sun/moon icon for the theme toggle. */
function ThemeIcon({ dark }: { dark: boolean }) {
  return dark ? (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </g>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Renders the header.
 * @param props.currentPage The active route page, for aria-current.
 */
export default function Header({ currentPage }: { currentPage: string }) {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [currentPage]);

  return (
    <header className="site-header">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Skip to content
      </a>
      <a className="wordmark" href="#/" aria-label="Heritage at Risk, home">
        <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
          <path d="M12 28 L32 14 L52 28 Z" fill="currentColor" />
          <rect x="17" y="30" width="5" height="14" fill="currentColor" />
          <rect x="29.5" y="30" width="5" height="14" fill="currentColor" />
          <rect x="42" y="30" width="5" height="14" fill="currentColor" />
          <path d="M8 50 q6 -5 12 0 t12 0 t12 0 t12 0 v6 H8 Z" className="wordmark__water" />
        </svg>
        <span>Heritage at Risk</span>
      </a>
      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        Menu
      </button>
      <nav id="site-nav" className={`site-nav ${open ? "site-nav--open" : ""}`} aria-label="Main">
        <ul>
          {NAV_ITEMS.map(([page, label]) => (
            <li key={page}>
              <a href={`#/${page}`} aria-current={currentPage === page ? "page" : undefined}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        <ThemeIcon dark={theme === "dark"} />
      </button>
    </header>
  );
}
